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
];

/* icon palette for user-created custom activities — picked at creation time.
   Keys are stored on the custom activity as `icon`. */
export const CUSTOM_ICONS = {
  dumbbell: { paths: ["M7 8 V16", "M17 8 V16", "M7 12 H17", "M4 9.5 V14.5", "M20 9.5 V14.5"] },
  paw: {
    circles: [[7.5, 8, 1.7], [12, 6.2, 1.7], [16.5, 8, 1.7]],
    paths: ["M12 11 Q7.5 11.5 6.8 15.5 Q6.5 18 9.5 18.2 Q11 18.2 12 17.4 Q13 18.2 14.5 18.2 Q17.5 18 17.2 15.5 Q16.5 11.5 12 11 Z"],
  },
  heart: { paths: ["M12 20 C5.5 14.5 3.5 9.5 7 7.2 C9.5 5.7 11.5 7.5 12 9 C12.5 7.5 14.5 5.7 17 7.2 C20.5 9.5 18.5 14.5 12 20 Z"] },
  star: { paths: ["M12 3 L14.4 8.8 L20.5 9.3 L15.8 13.3 L17.3 19.5 L12 16.2 L6.7 19.5 L8.2 13.3 L3.5 9.3 L9.6 8.8 Z"] },
  ball: { circles: [[12, 12, 8]], paths: ["M4 12 H20", "M6.5 6.5 Q10 12 6.5 17.5", "M17.5 6.5 Q14 12 17.5 17.5"] },
  wave: { paths: ["M2 10 Q4 7.8 6 10 T10 10 T14 10 T18 10 T22 10", "M2 15 Q4 12.8 6 15 T10 15 T14 15 T18 15 T22 15"] },
  mountain: { paths: ["M2 20 L8.5 8 L12.5 14.5", "M10.5 17 L15 9 L22 20", "M2 20 H22"] },
  walker: {
    circles: [[12, 4.5, 2]],
    paths: ["M12 7 V13", "M12 9 L15 12", "M12 9 L9 12", "M12 13 L15 19.5", "M12 13 L9 19.5"],
  },
};

/* fallback for customs created before icons existed (a little dumbbell) */
export const CUSTOM_ACT_ICON = CUSTOM_ICONS.dumbbell;
