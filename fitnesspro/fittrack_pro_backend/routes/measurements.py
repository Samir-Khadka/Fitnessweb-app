from flask import Blueprint, request, jsonify
from utils.db import get_db
from utils.json_utils import to_json_safe
from utils.jwt_auth import jwt_required, current_user_id
from bson.objectid import ObjectId
import datetime

measurements_bp = Blueprint('measurements', __name__)

@measurements_bp.route('', methods=['POST'])
@jwt_required
def add_measurement():
    db = get_db().get_default_database()
    body = request.get_json() or {}
    doc = {
        'user_id': ObjectId(current_user_id()),
        'type': body.get('type'),
        'value': body.get('value'),
        'unit': body.get('unit'),
        'measured_at': body.get('measured_at') or datetime.datetime.utcnow(),
        'created_at': datetime.datetime.utcnow()
    }
    res = db.measurements.insert_one(doc)
    doc['_id'] = res.inserted_id
    return jsonify(to_json_safe(doc)), 201

@measurements_bp.route('', methods=['GET'])
@jwt_required
def list_measurements():
    db = get_db().get_default_database()
    uid = current_user_id()
    q = {'user_id': ObjectId(uid)}
    t = request.args.get('type')
    if t:
        q['type'] = t
    cur = db.measurements.find(q).sort('measured_at', -1).limit(200)
    out=[]
    for m in cur:
        out.append(to_json_safe(m))
    return jsonify(out)

@measurements_bp.route('/<id>', methods=['PUT'])
@jwt_required
def update_measurement(id):
    db = get_db().get_default_database()
    body = request.get_json() or {}
    allowed = {'value','unit','measured_at'}
    update = {k: body[k] for k in body if k in allowed}
    if not update:
        return {'msg':'nothing to update'}, 400
    res = db.measurements.update_one({'_id': ObjectId(id)}, {'$set': update})
    if res.matched_count==0:
        return {'msg':'not found'}, 404
    return {'msg':'updated'}, 200

@measurements_bp.route('/<id>', methods=['DELETE'])
@jwt_required
def delete_measurement(id):
    db = get_db().get_default_database()
    res = db.measurements.delete_one({'_id': ObjectId(id)})
    if res.deleted_count==0:
        return {'msg':'not found'}, 404
    return '', 204
