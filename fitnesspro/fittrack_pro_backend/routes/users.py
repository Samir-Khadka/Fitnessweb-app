from flask import Blueprint, request, jsonify
from utils.db import get_db
from utils.jwt_auth import jwt_required, current_user_id
from bson.objectid import ObjectId

users_bp = Blueprint('users', __name__)

@users_bp.route('/me', methods=['GET'])
@jwt_required
def me():
    db = get_db().get_default_database()
    uid = current_user_id()
    user = db.users.find_one({'_id': ObjectId(uid)}, {'password_hash':0})
    if not user:
        return {'msg':'not found'}, 404
    user['id'] = str(user['_id'])
    return jsonify(user)

@users_bp.route('/<id>', methods=['GET'])
@jwt_required
def get_user(id):
    db = get_db().get_default_database()
    try:
        user = db.users.find_one({'_id': ObjectId(id)}, {'password_hash':0})
    except Exception:
        return {'msg':'invalid id'}, 400
    if not user:
        return {'msg':'not found'}, 404
    user['id'] = str(user['_id'])
    return jsonify(user)

@users_bp.route('/<id>', methods=['PUT'])
@jwt_required
def update_user(id):
    db = get_db().get_default_database()
    body = request.get_json() or {}
    allowed = {'name','height_cm','weight_kg','body_fat_pct'}
    update = {k: body[k] for k in body if k in allowed}
    if not update:
        return {'msg':'nothing to update'}, 400
    res = db.users.update_one({'_id': ObjectId(id)}, {'$set': update})
    if res.matched_count == 0:
        return {'msg':'not found'}, 404
    return {'msg':'updated'}, 200

@users_bp.route('/<id>', methods=['DELETE'])
@jwt_required
def delete_user(id):
    db = get_db().get_default_database()
    res = db.users.delete_one({'_id': ObjectId(id)})
    if res.deleted_count == 0:
        return {'msg':'not found'}, 404
    return '', 204
