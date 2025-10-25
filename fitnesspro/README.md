# FitTrack Pro — local developer guide

This repository contains a small Flask backend for FitTrack Pro. The repo includes a smoke runner and a CI workflow.

Quick local steps (Windows PowerShell)

1. Create or activate the virtualenv (if not present):

```powershell
python -m venv venv
venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

2. Run tests

```powershell
venv\Scripts\python.exe -m pytest -q
```

3. Run the smoke runner (it will start the server, wait for /health, run API calls, then stop the server):

```powershell
#$env:PYTHONPATH='C:\project\fitnesspro\fittrack_pro_backend;C:\project\fitnesspro\fittrack_pro_backend_extra'
C:/project/fitnesspro/venv/Scripts/python.exe run_smoke_full.py --timeout 45
```

Notes
- If `git push` fails due to permissions, push from a local machine with appropriate credentials.
- CI (GitHub Actions) runs syntax checks, pytest and the smoke runner on pushes/PRs to `master`.

If you want me to push these changes to the remote, tell me and provide credentials or push from your environment.