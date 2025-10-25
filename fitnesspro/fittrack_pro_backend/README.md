# FitTrack Pro — Backend (Flask + MongoDB)

This backend scaffold is built to satisfy the **COM661 Individual Full Stack Application Development – Back End**
assignment. It implements a Flask REST API with JWT auth, MongoDB integration, validation, automated tests,
Postman collection template, and mongoexport commands.

## What is included
- Fully implemented Flask routes for authentication, users, workouts, measurements, goals, and exercises.
- JWT authentication (flask-jwt-extended).
- Validation using marshmallow schemas.
- Example pytest tests.
- `mongoexport` commands for exporting collections as JSON.
- Postman collection template (`postman_collection.json`).
- Instructions and checklist to prepare submission package.

## How to run (local)
1. Ensure you have Python 3.10+ and MongoDB running locally (default URI: mongodb://localhost:27017).
2. Create and activate a virtualenv:
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. Start the Flask app:
   ```bash
   export FLASK_APP=app.py
   export FLASK_ENV=development
   export MONGO_URI="mongodb://localhost:27017/fittrack_db"
   export JWT_SECRET_KEY="replace-with-secure-secret"
   flask run --port 5000
   ```
4. Run tests:
   ```bash
   pytest -q
   ```

## Submission checklist (produce each):
- Zip of code (this repo)
- mongoexport JSON files for each collection: users.json, workouts.json, measurements.json, goals.json, exercises.json
- Postman collection and exported run results (collection runner) (use `postman_collection.json`)
- PDF code listing and endpoints summary (print from files / README)
- Short video (<=5 minutes): intro, Postman demo, code walkthrough
- Completed self-evaluation (template in SELF_EVAL.md)

