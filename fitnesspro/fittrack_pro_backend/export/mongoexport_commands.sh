#!/bin/bash
# Example commands to export collections (run after populating DB)
# Adjust --uri and --db as needed
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/fittrack_db}"
mongoexport --uri="$MONGO_URI" --collection=users --out=users.json --jsonArray
mongoexport --uri="$MONGO_URI" --collection=workouts --out=workouts.json --jsonArray
mongoexport --uri="$MONGO_URI" --collection=measurements --out=measurements.json --jsonArray
mongoexport --uri="$MONGO_URI" --collection=goals --out=goals.json --jsonArray
mongoexport --uri="$MONGO_URI" --collection=exercises --out=exercises.json --jsonArray
