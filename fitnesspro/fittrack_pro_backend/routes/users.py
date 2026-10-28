from flask import Blueprint, request, jsonify
from utils.db import get_db
from utils.json_utils import to_json_safe
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
    # to_json_safe: the raw doc carries an ObjectId _id, which Flask's
    # JSON provider cannot serialize (500). Every other route already
    # serializes this way, so /users/me now matches them.
    return jsonify(to_json_safe(user))

@users_bp.route('/<id>', methods=['GET'])
@jwt_required
def get_user(id):
    # Ownership: a user may only read their own record, never another
    # user's, even with a valid token. Checked before any DB lookup so a
    # non-owner learns nothing about whether the id exists.
    if id != current_user_id():
        return {'msg':'forbidden'}, 403
    db = get_db().get_default_database()
    try:
        user = db.users.find_one({'_id': ObjectId(id)}, {'password_hash':0})
    except Exception:
        return {'msg':'invalid id'}, 400
    if not user:
        return {'msg':'not found'}, 404
    return jsonify(to_json_safe(user))

@users_bp.route('/<id>', methods=['PUT'])
@jwt_required
def update_user(id):
    # Ownership: only the account owner may update their own record.
    if id != current_user_id():
        return {'msg':'forbidden'}, 403
    db = get_db().get_default_database()
    body = request.get_json() or {}
    allowed = {'name','height_cm','weight_kg','body_fat_pct'}
    update = {k: body[k] for k in body if k in allowed}
    if not update:
        return {'msg':'nothing to update'}, 400
    try:
        oid = ObjectId(id)
    except Exception:
        return {'msg':'invalid id'}, 400
    res = db.users.update_one({'_id': oid}, {'$set': update})
    if res.matched_count == 0:
        return {'msg':'not found'}, 404
    return {'msg':'updated'}, 200

@users_bp.route('/<id>', methods=['DELETE'])
@jwt_required
def delete_user(id):
    # Ownership: only the account owner may delete their own record.
    if id != current_user_id():
        return {'msg':'forbidden'}, 403
    db = get_db().get_default_database()
    try:
        oid = ObjectId(id)
    except Exception:
        return {'msg':'invalid id'}, 400
    res = db.users.delete_one({'_id': oid})
    if res.deleted_count == 0:
        return {'msg':'not found'}, 404
    return '', 204
