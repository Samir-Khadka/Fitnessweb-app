from flask import Blueprint, request, jsonify
from utils.db import get_db
from utils.json_utils import to_json_safe
from utils.jwt_auth import jwt_required, current_user_id
from bson.objectid import ObjectId
import datetime

goals_bp = Blueprint('goals', __name__)

@goals_bp.route('', methods=['POST'])
@jwt_required
def create_goal():
    db = get_db().get_default_database()
    body = request.get_json() or {}
    doc = {
        'user_id': ObjectId(current_user_id()),
        'goal_type': body.get('goal_type'),
        'target_value': body.get('target_value'),
        'target_unit': body.get('target_unit'),
        'start_date': body.get('start_date'),
        'end_date': body.get('end_date'),
        'status': 'active',
        'created_at': datetime.datetime.utcnow()
    }
    res = db.goals.insert_one(doc)
    doc['_id'] = res.inserted_id
    return jsonify(to_json_safe(doc)), 201

@goals_bp.route('', methods=['GET'])
@jwt_required
def list_goals():
    db = get_db().get_default_database()
    uid = current_user_id()
    cur = db.goals.find({'user_id': ObjectId(uid)}).sort('created_at', -1)
    out=[]
    for g in cur:
        out.append(to_json_safe(g))
    return jsonify(out)

@goals_bp.route('/<id>', methods=['PUT'])
@jwt_required
def update_goal(id):
    db = get_db().get_default_database()
    body = request.get_json() or {}
    allowed = {'status','target_value','end_date'}
    update = {k: body[k] for k in body if k in allowed}
    if not update:
        return {'msg':'nothing to update'}, 400
    res = db.goals.update_one({'_id': ObjectId(id)}, {'$set': update})
    if res.matched_count==0:
        return {'msg':'not found'}, 404
    return {'msg':'updated'}, 200

@goals_bp.route('/<id>', methods=['DELETE'])
@jwt_required
def delete_goal(id):
    db = get_db().get_default_database()
    res = db.goals.delete_one({'_id': ObjectId(id)})
    if res.deleted_count==0:
        return {'msg':'not found'}, 404
    return '', 204
