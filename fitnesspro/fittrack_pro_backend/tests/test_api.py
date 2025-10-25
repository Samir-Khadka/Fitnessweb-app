import os
import tempfile
import pytest
from app import create_app
from utils.db import get_db
from pymongo import MongoClient

@pytest.fixture
def client(monkeypatch):
    app = create_app()
    app.config['TESTING'] = True
    # use a temporary mongodb database name for tests (assumes local mongodb)
    test_uri = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/fittrack_test_db')
    app.config['MONGO_URI'] = test_uri
    client = app.test_client()
    # clean DB
    c = MongoClient(test_uri)
    c.get_default_database().drop_collection('users')
    c.get_default_database().drop_collection('workouts')
    c.get_default_database().drop_collection('measurements')
    c.get_default_database().drop_collection('goals')
    c.get_default_database().drop_collection('exercises')
    yield client

def test_register_login_flow(client):
    # register
    rv = client.post('/auth/register', json={'email':'test@example.com','password':'pass123','name':'Test User'})
    assert rv.status_code == 201
    # login
    rv = client.post('/auth/login', json={'email':'test@example.com','password':'pass123'})
    assert rv.status_code == 200
    token = rv.get_json().get('access_token')
    assert token

def test_workout_crud(client):
    # register & login
    client.post('/auth/register', json={'email':'t2@example.com','password':'p','name':'u'})
    rv = client.post('/auth/login', json={'email':'t2@example.com','password':'p'})
    token = rv.get_json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    # create workout
    rv = client.post('/workouts', json={'type':'running','distance_km':5}, headers=headers)
    assert rv.status_code == 201
    wid = rv.get_json()['id']
    # get workout
    rv = client.get(f'/workouts/{wid}', headers=headers)
    assert rv.status_code == 200
    # update
    rv = client.put(f'/workouts/{wid}', json={'notes':'nice run'}, headers=headers)
    assert rv.status_code == 200
    # delete
    rv = client.delete(f'/workouts/{wid}', headers=headers)
    assert rv.status_code == 204
