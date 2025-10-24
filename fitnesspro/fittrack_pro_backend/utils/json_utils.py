from bson.objectid import ObjectId
import datetime

def to_json_safe(obj):
    """Recursively convert MongoDB documents to JSON-serializable types.

    - ObjectId -> str
    - datetime.datetime -> ISO 8601 string
    - lists and dicts are processed recursively
    """
    if obj is None:
        return None
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime.datetime):
        return obj.isoformat()
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            # convert _id to id
            if k == '_id':
                out['id'] = to_json_safe(v)
            else:
                out[k] = to_json_safe(v)
        return out
    if isinstance(obj, (list, tuple)):
        return [to_json_safe(x) for x in obj]
    return obj
