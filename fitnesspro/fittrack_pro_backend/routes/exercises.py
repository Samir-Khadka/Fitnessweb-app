from flask import Blueprint, request, jsonify
from utils.db import get_db
from utils.json_utils import to_json_safe
from utils.jwt_auth import jwt_required, current_user_id
from bson.objectid import ObjectId
import datetime

exercises_bp = Blueprint('exercises', __name__)

@exercises_bp.route('/<workout_id>', methods=['POST'])
@jwt_required
def add_exercise(workout_id):
    db = get_db().get_default_database()
    body = request.get_json() or {}
    doc = {
        'workout_id': ObjectId(workout_id),
        'name': body.get('name'),
        'sets': body.get('sets', []),
        'created_at': datetime.datetime.utcnow()
    }
    res = db.exercises.insert_one(doc)
    db.workouts.update_one({'_id': ObjectId(workout_id)}, {'$push': {'exercises': res.inserted_id}})
    doc['_id'] = res.inserted_id
    return jsonify(to_json_safe(doc)), 201

@exercises_bp.route('/<id>', methods=['PUT'])
@jwt_required
def update_exercise(id):
    db = get_db().get_default_database()
    body = request.get_json() or {}
    update = {}
    if 'name' in body:
        update['name'] = body['name']
    if 'sets' in body:
        update['sets'] = body['sets']
    if not update:
        return {'msg':'nothing to update'}, 400
    res = db.exercises.update_one({'_id': ObjectId(id)}, {'$set': update})
    if res.matched_count==0:
        return {'msg':'not found'}, 404
    return {'msg':'updated'}, 200

@exercises_bp.route('/<id>', methods=['DELETE'])
@jwt_required
def delete_exercise(id):
    db = get_db().get_default_database()
    ex = db.exercises.find_one({'_id': ObjectId(id)})
    if not ex:
        return {'msg':'not found'}, 404
    db.workouts.update_one({'_id': ex['workout_id']}, {'$pull': {'exercises': ex['_id']}})
    db.exercises.delete_one({'_id': ObjectId(id)})
    return '', 204
