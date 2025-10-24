from flask import Blueprint, request, jsonify
from utils.db import get_db
from utils.json_utils import to_json_safe
from utils.jwt_auth import jwt_required, current_user_id
from bson.objectid import ObjectId
import datetime

workouts_bp = Blueprint('workouts', __name__)

@workouts_bp.route('', methods=['POST'])
@jwt_required
def create_workout():
    db = get_db().get_default_database()
    body = request.get_json() or {}
    uid = current_user_id()
    doc = {
        'user_id': ObjectId(uid),
        'type': body.get('type'),
        'start_time': body.get('start_time') or datetime.datetime.utcnow().isoformat(),
        'end_time': body.get('end_time'),
        'duration_minutes': body.get('duration_minutes'),
        'distance_km': body.get('distance_km',0),
        'calories_burned': body.get('calories_burned',0),
        'route': body.get('route', []),
        'exercises': [],
        'notes': body.get('notes',''),
        'created_at': datetime.datetime.utcnow()
    }
    res = db.workouts.insert_one(doc)
    doc['_id'] = res.inserted_id
    return jsonify(to_json_safe(doc)), 201

@workouts_bp.route('', methods=['GET'])
@jwt_required
def list_workouts():
    db = get_db().get_default_database()
    uid = current_user_id()
    q = {'user_id': ObjectId(uid)}
    # filters
    t = request.args.get('type')
    if t:
        q['type'] = t
    start = request.args.get('start')
    end = request.args.get('end')
    if start or end:
        q['start_time'] = {}
        if start:
            q['start_time']['$gte'] = start
        if end:
            q['start_time']['$lte'] = end
    cur = db.workouts.find(q).sort('start_time', -1).limit(200)
    out = []
    for w in cur:
        out.append(to_json_safe(w))
    return jsonify(out)

@workouts_bp.route('/<id>', methods=['GET'])
@jwt_required
def get_workout(id):
    db = get_db().get_default_database()
    try:
        w = db.workouts.find_one({'_id': ObjectId(id)})
    except Exception:
        return {'msg':'invalid id'}, 400
    if not w:
        return {'msg':'not found'}, 404
    return jsonify(to_json_safe(w))

@workouts_bp.route('/<id>', methods=['PUT'])
@jwt_required
def update_workout(id):
    db = get_db().get_default_database()
    body = request.get_json() or {}
    allowed = {'type','start_time','end_time','duration_minutes','distance_km','calories_burned','notes'}
    update = {k: body[k] for k in body if k in allowed}
    if not update:
        return {'msg':'nothing to update'}, 400
    res = db.workouts.update_one({'_id': ObjectId(id)}, {'$set': update})
    if res.matched_count==0:
        return {'msg':'not found'}, 404
    return {'msg':'updated'}, 200

@workouts_bp.route('/<id>', methods=['DELETE'])
@jwt_required
def delete_workout(id):
    db = get_db().get_default_database()
    res = db.workouts.delete_one({'_id': ObjectId(id)})
    if res.deleted_count==0:
        return {'msg':'not found'}, 404
    return '', 204

@workouts_bp.route('/analytics/weekly_distance', methods=['GET'])
@jwt_required
def weekly_distance():
    # aggregation: total distance per day for last 7 days
    db = get_db().get_default_database()
    uid = current_user_id()
    pipeline = [
        {'$match': {'user_id': ObjectId(uid)}},
        {'$project': {'distance_km':1, 'date': {'$dateFromString': {'dateString': '$start_time'}}}},
        {'$group': {'_id': {'$dateToString': {'format':'%Y-%m-%d','date':'$date'}}, 'total': {'$sum':'$distance_km'}}},
        {'$sort': {'_id': 1}}
    ]
    res = list(db.workouts.aggregate(pipeline))
    return jsonify(res)
