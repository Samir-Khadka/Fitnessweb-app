#!/usr/bin/env python3
"""
run_smoke_full.py

Start the Flask app as a subprocess, wait for readiness, perform smoke API calls, then stop the server.

Run with the project's venv python. Example (PowerShell):
$env:PYTHONPATH='C:\project\fitnesspro\fittrack_pro_backend;C:\project\fitnesspro\fittrack_pro_backend_extra'; C:/project/fitnesspro/venv/Scripts/python.exe run_smoke_full.py

"""
import os
import sys
import time
import subprocess
import requests
import logging
import argparse
import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
HOST = os.environ.get('SMOKE_HOST', 'http://127.0.0.1:5000')
LOGFILE = os.path.join(ROOT, 'smoke_run.log')


def setup_logger():
    logger = logging.getLogger('smoke')
    logger.setLevel(logging.DEBUG)
    fmt = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
    # console
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(fmt)
    logger.addHandler(ch)
    # file
    fh = logging.FileHandler(LOGFILE, encoding='utf-8')
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(fmt)
    logger.addHandler(fh)
    return logger


def start_server(python_executable=None, logger=None):
    if python_executable is None:
        python_executable = sys.executable
    env = os.environ.copy()
    # ensure the app packages are importable
    env['PYTHONPATH'] = f"{os.path.join(ROOT,'fittrack_pro_backend')};{os.path.join(ROOT,'fittrack_pro_backend_extra')}"
    cmd = [python_executable, os.path.join(ROOT, 'fittrack_pro_backend', 'app.py')]
    if logger:
        logger.info('Starting server: %s', ' '.join(cmd))
    proc = subprocess.Popen(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return proc


def wait_ready(timeout=20, logger=None):
    url = f"{HOST}/health"
    start = time.time()
    backoff = 0.5
    while True:
        try:
            r = requests.get(url, timeout=3)
            if r.status_code == 200:
                if logger:
                    logger.info('Server ready after %.2fs', time.time() - start)
                return True, time.time() - start
        except Exception as exc:
            if logger and logger.isEnabledFor(logging.DEBUG):
                logger.debug('Health check failed: %s', exc)
        if time.time() - start > timeout:
            if logger:
                logger.error('Timeout waiting for server ready after %.2fs', time.time() - start)
            return False, time.time() - start
        time.sleep(backoff)
        backoff = min(backoff * 1.5, 3)


def smoke_calls(logger=None):
    s = requests.Session()
    # Register user (auth uses email/password)
    logger.info('Registering user...')
    try:
        reg = s.post(f'{HOST}/auth/register', json={
            'email': 'smoke_user@example.com', 'password': 'Passw0rd!', 'name': 'Smoke Tester'
        }, timeout=7)
    except Exception as exc:
        logger.error('Register request failed: %s', exc)
        return 1
    logger.info('register -> %s', reg.status_code)

    # Login
    try:
        login = s.post(f'{HOST}/auth/login', json={'email': 'smoke_user@example.com', 'password': 'Passw0rd!'}, timeout=7)
    except Exception as exc:
        logger.error('Login request failed: %s', exc)
        return 1
    logger.info('login -> %s', login.status_code)
    token = None
    if login.ok:
        try:
            token = login.json().get('access_token') or login.json().get('token')
        except Exception:
            logger.warning('Login returned non-json response')
    headers = {'Authorization': f'Bearer {token}'} if token else {}

    # Create a workout
    try:
        w = s.post(f'{HOST}/workouts', json={'name': 'smoke workout', 'exercises': []}, headers=headers, timeout=7)
        logger.info('create workout -> %s', w.status_code)
    except Exception as exc:
        logger.error('Create workout failed: %s', exc)

    # Create a measurement
    try:
        m = s.post(f'{HOST}/measurements', json={'type': 'weight', 'value': 80, 'date': datetime.datetime.utcnow().isoformat() + 'Z'}, headers=headers, timeout=7)
        logger.info('create measurement -> %s', m.status_code)
    except Exception as exc:
        logger.error('Create measurement failed: %s', exc)

    # Create a goal
    try:
        g = s.post(f'{HOST}/goals', json={'title': 'smoke goal', 'description': 'testing', 'target_date': '2025-12-31T00:00:00Z'}, headers=headers, timeout=7)
        logger.info('create goal -> %s', g.status_code)
    except Exception as exc:
        logger.error('Create goal failed: %s', exc)

    # Fetch lists
    try:
        logger.info('fetch workouts -> %s', s.get(f'{HOST}/workouts', headers=headers, timeout=7).status_code)
        logger.info('fetch measurements -> %s', s.get(f'{HOST}/measurements', headers=headers, timeout=7).status_code)
        logger.info('fetch goals -> %s', s.get(f'{HOST}/goals', headers=headers, timeout=7).status_code)
    except Exception as exc:
        logger.error('Fetch lists failed: %s', exc)
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--timeout', type=int, default=int(os.environ.get('SMOKE_TIMEOUT', '30')),
                        help='seconds to wait for server readiness')
    args = parser.parse_args()

    logger = setup_logger()

    # Prefer the venv python if available in a conventional path
    venv_py = os.path.join(ROOT, 'venv', 'Scripts', 'python.exe')
    if os.path.exists(venv_py):
        python_exe = venv_py
    else:
        python_exe = sys.executable

    proc = start_server(python_executable=python_exe, logger=logger)
    try:
        ok, elapsed = wait_ready(args.timeout, logger=logger)
        logger.debug('wait_ready returned: %s (%.2fs)', ok, elapsed)
        if not ok:
            # print server output for debugging
            out = ''
            if proc.stdout:
                try:
                    out = proc.stdout.read().decode(errors='ignore')
                except Exception:
                    out = '<failed to read stdout>'
            logger.error('Server failed to start; output:\n%s', out)
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except Exception:
                proc.kill()
            sys.exit(2)
        rc = smoke_calls(logger=logger)
        return rc
    finally:
        logger.info('Stopping server')
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()


if __name__ == '__main__':
    sys.exit(main())
