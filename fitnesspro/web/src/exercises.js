// Reference exercise library — NOT user data. These are well-known lifts
// and cardio activities the user can quick-add to a workout. The label
// "Reference library" is shown in the UI so it is never mistaken for
// the user's own logged exercises. Muscle groups use plain language.

export const EXERCISE_LIBRARY = [
  { name: "Barbell Squat", muscle: "Legs", equipment: "Barbell", kind: "strength" },
  { name: "Bench Press", muscle: "Chest", equipment: "Barbell", kind: "strength" },
  { name: "Deadlift", muscle: "Back", equipment: "Barbell", kind: "strength" },
  { name: "Overhead Press", muscle: "Shoulders", equipment: "Barbell", kind: "strength" },
  { name: "Barbell Row", muscle: "Back", equipment: "Barbell", kind: "strength" },
  { name: "Pull-Up", muscle: "Back", equipment: "Bodyweight", kind: "strength" },
  { name: "Chin-Up", muscle: "Back", equipment: "Bodyweight", kind: "strength" },
  { name: "Dip", muscle: "Chest", equipment: "Bodyweight", kind: "strength" },
  { name: "Lunge", muscle: "Legs", equipment: "Dumbbell", kind: "strength" },
  { name: "Leg Press", muscle: "Legs", equipment: "Machine", kind: "strength" },
  { name: "Leg Curl", muscle: "Legs", equipment: "Machine", kind: "strength" },
  { name: "Calf Raise", muscle: "Legs", equipment: "Bodyweight", kind: "strength" },
  { name: "Bicep Curl", muscle: "Arms", equipment: "Dumbbell", kind: "strength" },
  { name: "Tricep Pushdown", muscle: "Arms", equipment: "Cable", kind: "strength" },
  { name: "Lateral Raise", muscle: "Shoulders", equipment: "Dumbbell", kind: "strength" },
  { name: "Face Pull", muscle: "Shoulders", equipment: "Cable", kind: "strength" },
  { name: "Plank", muscle: "Core", equipment: "Bodyweight", kind: "strength" },
  { name: "Crunch", muscle: "Core", equipment: "Bodyweight", kind: "strength" },
  { name: "Russian Twist", muscle: "Core", equipment: "Bodyweight", kind: "strength" },
  { name: "Hanging Leg Raise", muscle: "Core", equipment: "Bodyweight", kind: "strength" },
  { name: "Incline Dumbbell Press", muscle: "Chest", equipment: "Dumbbell", kind: "strength" },
  { name: "Dumbbell Fly", muscle: "Chest", equipment: "Dumbbell", kind: "strength" },
  { name: "Romanian Deadlift", muscle: "Legs", equipment: "Barbell", kind: "strength" },
  { name: "Hip Thrust", muscle: "Legs", equipment: "Barbell", kind: "strength" },
  { name: "Lat Pulldown", muscle: "Back", equipment: "Cable", kind: "strength" },
  { name: "Seated Cable Row", muscle: "Back", equipment: "Cable", kind: "strength" },
  { name: "Running", muscle: "Cardio", equipment: "None", kind: "cardio" },
  { name: "Cycling", muscle: "Cardio", equipment: "Bike", kind: "cardio" },
  { name: "Swimming", muscle: "Cardio", equipment: "Pool", kind: "cardio" },
  { name: "Rowing", muscle: "Cardio", equipment: "Machine", kind: "cardio" },
  { name: "Jump Rope", muscle: "Cardio", equipment: "Rope", kind: "cardio" },
  { name: "Walking", muscle: "Cardio", equipment: "None", kind: "cardio" },
];

export const MUSCLE_GROUPS = ["All", "Legs", "Chest", "Back", "Shoulders", "Arms", "Core", "Cardio"];
