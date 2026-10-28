"""WSGI entry point for production servers (Render/gunicorn).

Local dev still uses `python app.py`. Importing this module builds the
app via the factory, so MONGO_URI / JWT_SECRET_KEY come from the
environment at process start, exactly as in local runs.
"""

from app import create_app

app = create_app()
