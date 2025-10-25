import os
import pytest
from app import create_app
from pymongo import MongoClient

@pytest.fixture
def client(monkeypatch):
    app = create_app()
    app.config['TESTING'] = True
    test_uri = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/fittrack_test_db')
    app.config['MONGO_URI'] = test_uri
    client = app.test_client()
    # clean DB
    c = MongoClient(test_uri)
    db = c.get_default_database()
    db.users.delete_many({})
    db.workouts.delete_many({})
    db.measurements.delete_many({})
    db.goals.delete_many({})
    db.exercises.delete_many({})
    yield client

def register_and_get_token(client, email='user@example.com'):
    rv = client.post('/auth/register', json={'email': email, 'password': 'pass', 'name': 'User'})
    assert rv.status_code == 201
    rv = client.post('/auth/login', json={'email': email, 'password': 'pass'})
    assert rv.status_code == 200
    return rv.get_json()['access_token']

def test_measurements_crud(client):
    token = register_and_get_token(client, 'm@example.com')
    headers = {'Authorization': f'Bearer {token}'}
    # Create measurement
    rv = client.post('/measurements', json={'type':'weight','value':70,'unit':'kg'}, headers=headers)
    assert rv.status_code == 201
    mid = rv.get_json()['id']
    # List
    rv = client.get('/measurements', headers=headers)
    assert rv.status_code == 200
    assert any(m['id']==mid for m in rv.get_json())
    # Update
    rv = client.put(f'/measurements/{mid}', json={'value':69.5}, headers=headers)
    assert rv.status_code == 200
    # Delete
    rv = client.delete(f'/measurements/{mid}', headers=headers)
    assert rv.status_code == 204

def test_goals_and_progress(client):
    token = register_and_get_token(client, 'g@example.com')
    headers = {'Authorization': f'Bearer {token}'}
    # Create goal
    rv = client.post('/goals', json={'goal_type':'weight_loss','target_value':65,'target_unit':'kg'}, headers=headers)
    assert rv.status_code == 201
    gid = rv.get_json()['id']
    # List goals
    rv = client.get('/goals', headers=headers)
    assert rv.status_code == 200
    assert any(g['id']==gid for g in rv.get_json())
    # Update goal status
    rv = client.put(f'/goals/{gid}', json={'status':'completed'}, headers=headers)
    assert rv.status_code == 200
    # Delete
    rv = client.delete(f'/goals/{gid}', headers=headers)
    assert rv.status_code == 204

def test_exercises_crud_with_workout(client):
    token = register_and_get_token(client, 'e@example.com')
    headers = {'Authorization': f'Bearer {token}'}
    # Create workout
    rv = client.post('/workouts', json={'type':'gym'}, headers=headers)
    assert rv.status_code == 201
    wid = rv.get_json()['id']
    # Add exercise
    rv = client.post(f'/exercises/{wid}', json={'name':'Squat','sets':[{'reps':5,'weight_kg':100}]}, headers=headers)
    assert rv.status_code == 201
    eid = rv.get_json()['id']
    # Update exercise
    rv = client.put(f'/exercises/{eid}', json={'sets':[{'reps':5,'weight_kg':105}]}, headers=headers)
    assert rv.status_code == 200
    # Delete exercise
    rv = client.delete(f'/exercises/{eid}', headers=headers)
    assert rv.status_code == 204
