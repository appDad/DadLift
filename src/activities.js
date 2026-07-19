/* Non-app activities — hiking, running, etc. Logged straight into history so
   they count as workouts (streak, weekly, totals, share page) like anything
   else. `grp` gives the muscle-split chart a loose credit; omit for none. */
export const ACTIVITIES = [
  { id: "hike", name: "Hiking", icon: "🥾", grp: "legs" },
  { id: "run", name: "Running", icon: "🏃", grp: "legs" },
  { id: "walk", name: "Walking", icon: "🚶", grp: "legs" },
  { id: "bike", name: "Cycling", icon: "🚴", grp: "legs" },
  { id: "swim", name: "Swimming", icon: "🏊", grp: "back" },
  { id: "row", name: "Rowing", icon: "🚣", grp: "back" },
  { id: "climb", name: "Climbing", icon: "🧗", grp: "back" },
  { id: "sport", name: "Sports", icon: "⚽", grp: "legs" },
  { id: "yoga", name: "Yoga", icon: "🧘", grp: "core" },
  { id: "stretch", name: "Stretching", icon: "🤸", grp: "core" },
  { id: "ski", name: "Skiing", icon: "⛷️", grp: "legs" },
  { id: "other", name: "Other", icon: "💪" },
];
