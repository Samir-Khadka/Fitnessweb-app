from pymongo import MongoClient
from flask import g

def get_db(app=None):
    if app is None:
        from flask import current_app as app
    if hasattr(g, 'mongo_client'):
        return g.mongo_client
    uri = app.config.get("MONGO_URI")
    client = MongoClient(uri)
    g.mongo_client = client
    g.db = client.get_default_database()
    return client
