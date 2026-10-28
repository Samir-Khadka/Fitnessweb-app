from flask import Flask
from flask_cors import CORS
from routes.auth import auth_bp
from routes.users import users_bp
from routes.workouts import workouts_bp
from routes.measurements import measurements_bp
from routes.goals import goals_bp
from routes.exercises import exercises_bp
from utils.db import get_db

def create_app():
    app = Flask(__name__)
    app.config.from_mapping({
        "MONGO_URI": __import__('os').environ.get("MONGO_URI", "mongodb://localhost:27017/fittrack_db"),
        "JWT_SECRET_KEY": __import__('os').environ.get("JWT_SECRET_KEY", "change-this-secret"),
        # The library default is 15 minutes, which expires mid-workout
        # (the rest timer alone outlasts it). 7 days by default, or
        # JWT_ACCESS_TOKEN_EXPIRES_DAYS to override. Existing tests log
        # in and call immediately, so they are unaffected.
        "JWT_ACCESS_TOKEN_EXPIRES": __import__('datetime').timedelta(
            days=int(__import__('os').environ.get("JWT_ACCESS_TOKEN_EXPIRES_DAYS", "7"))),
    })
    CORS(app)
    # initialize DB client inside an application context so flask.g is available
    with app.app_context():
        get_db(app)

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(users_bp, url_prefix="/users")
    app.register_blueprint(workouts_bp, url_prefix="/workouts")
    app.register_blueprint(measurements_bp, url_prefix="/measurements")
    app.register_blueprint(goals_bp, url_prefix="/goals")
    app.register_blueprint(exercises_bp, url_prefix="/exercises")

    @app.route("/")
    def index():
        return {"app":"FitTrack Pro backend","status":"ok"}

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(port=5000)
