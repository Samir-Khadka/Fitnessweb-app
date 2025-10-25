from flask import Blueprint, request, current_app, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, JWTManager
from utils.db import get_db

auth_bp = Blueprint('auth', __name__)
jwt = None

@auth_bp.record_once
def on_load(state):
    global jwt
    app = state.app
    jwt = JWTManager(app)

@auth_bp.route('/register', methods=['POST'])
def register():
    db = get_db()
    users = db.get_default_database().users
    body = request.get_json() or {}
    email = body.get('email')
    password = body.get('password')
    name = body.get('name')
    if not email or not password:
        return {"msg":"email and password required"}, 400
    if users.find_one({'email': email}):
        return {"msg":"user exists"}, 409
    pw_hash = generate_password_hash(password)
    doc = {"email": email, "password_hash": pw_hash, "name": name, "created_at": __import__('datetime').datetime.utcnow()}
    res = users.insert_one(doc)
    user = users.find_one({"_id": res.inserted_id}, {"password_hash":0})
    return jsonify({"user": {"id": str(res.inserted_id), "email": email, "name": name}}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    db = get_db()
    users = db.get_default_database().users
    body = request.get_json() or {}
    email = body.get('email')
    password = body.get('password')
    if not email or not password:
        return {"msg":"email and password required"}, 400
    user = users.find_one({'email': email})
    if not user or not check_password_hash(user.get('password_hash',''), password):
        return {"msg":"invalid credentials"}, 401
    access = create_access_token(identity=str(user['_id']))
    return {"access_token": access}, 200
