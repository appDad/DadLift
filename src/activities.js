/* Non-app activities — hiking, running, etc. Logged straight into history so
   they count as workouts (streak, weekly, totals, share page) like anything
   else. `grp` gives the muscle-split chart a loose credit; omit for none.
   Icons are monotone outlines (24x24 stroke data, rendered via ActIcon with
   stroke=currentColor so they follow the button's text color). */
export const ACTIVITIES = [
  {
    id: "hike", name: "Hiking", grp: "legs",
    paths: ["M2 20 L8.5 8 L12.5 14.5", "M10.5 17 L15 9 L22 20", "M2 20 H22"],
  },
  {
    id: "run", name: "Running", grp: "legs",
    circles: [[13.5, 4.5, 2]],
    paths: ["M13 7 L11 13", "M13 8 L16.5 10.5", "M13 8 L9.5 10.5", "M11 13 L15 15.5 L14.5 20", "M11 13 L7 19"],
  },
  {
    id: "walk", name: "Walking", grp: "legs",
    circles: [[12, 4.5, 2]],
    paths: ["M12 7 V13", "M12 9 L15 12", "M12 9 L9 12", "M12 13 L15 19.5", "M12 13 L9 19.5"],
  },
  {
    id: "bike", name: "Cycling", grp: "legs",
    circles: [[6.5, 16.5, 4], [17.5, 16.5, 4]],
    paths: ["M6.5 16.5 L10 9.5 H14.5 L17.5 16.5", "M10 9.5 L13 16.5 H6.5", "M14.5 9.5 L16 7"],
  },
  {
    id: "swim", name: "Swimming", grp: "back",
    circles: [[8.5, 8.5, 2]],
    paths: ["M10.5 9.5 L16.5 7.5", "M2 15 Q4 12.8 6 15 T10 15 T14 15 T18 15 T22 15", "M2 19 Q4 16.8 6 19 T10 19 T14 19 T18 19 T22 19"],
  },
  {
    id: "row", name: "Rowing", grp: "back",
    circles: [[11.5, 8.5, 1.8]],
    paths: ["M3 15 Q12 19 21 15", "M11.5 10.3 V15", "M6.5 7 L16.5 15"],
  },
  {
    id: "climb", name: "Climbing", grp: "back",
    paths: ["M4 20 L12 6 L20 20 Z", "M12 6 V2.5", "M12 2.5 H15.5 V5 H12"],
  },
  {
    id: "sport", name: "Sports", grp: "legs",
    circles: [[12, 12, 8]],
    paths: ["M4 12 H20", "M6.5 6.5 Q10 12 6.5 17.5", "M17.5 6.5 Q14 12 17.5 17.5"],
  },
  {
    id: "yoga", name: "Yoga", grp: "core",
    circles: [[12, 5.5, 2]],
    paths: ["M12 7.5 V13", "M12 9 L7 13.5", "M12 9 L17 13.5", "M12 13 L6 17.5 H18 Z"],
  },
  {
    id: "stretch", name: "Stretching", grp: "core",
    circles: [[11.5, 5, 2]],
    paths: ["M12 8 V14", "M12 9 Q12.5 5.5 16 4.5", "M12 9.5 L9.5 11.5", "M12 14 L9.5 20", "M12 14 L14.5 20"],
  },
  {
    id: "ski", name: "Skiing", grp: "legs",
    circles: [[13.5, 4.8, 2]],
    paths: ["M13 7 L11 12.5", "M11 12.5 L13 16.8", "M13 8 L16 10", "M16 10 L17 16.5", "M6 18.5 L20.5 16.5", "M6.5 20.5 L21 18.5"],
  },
  {
    id: "other", name: "Other", grp: null,
    paths: ["M7 8 V16", "M17 8 V16", "M7 12 H17", "M4 9.5 V14.5", "M20 9.5 V14.5"],
  },
];
