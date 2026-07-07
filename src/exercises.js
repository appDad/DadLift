/* ============ built-in pose library ============
   Frame = { L:[[x1,y1,x2,y2],...], head:[x,y], db:[[x,y,ang]], ball:[[x,y,r]], floor:bool }
   viewBox 0 0 100 100, y-down, ground y=90 for standing */
const STAND_LEGS = [[50, 52, 44, 70], [44, 70, 44, 90], [50, 52, 56, 70], [56, 70, 56, 90]];
const TORSO = [[50, 20, 50, 52]];

export const POSES = {
  curl: [
    { L: [...TORSO, ...STAND_LEGS, [50, 26, 53, 40], [53, 40, 53, 50]], head: [50, 14], db: [[53, 52, 0]], floor: true },
    { L: [...TORSO, ...STAND_LEGS, [50, 26, 53, 40], [53, 40, 57, 28]], head: [50, 14], db: [[58, 26, 0]], floor: true },
  ],
  ohp: [
    { L: [...TORSO, ...STAND_LEGS, [50, 22, 39, 27], [39, 27, 39, 18], [50, 22, 61, 27], [61, 27, 61, 18]], head: [50, 14], db: [[39, 16, 0], [61, 16, 0]], floor: true },
    { L: [...TORSO, ...STAND_LEGS, [50, 22, 44, 10], [50, 22, 56, 10]], head: [50, 14], db: [[43, 8, 0], [57, 8, 0]], floor: true },
  ],
  latRaise: [
    { L: [...TORSO, ...STAND_LEGS, [50, 22, 46, 38], [46, 38, 45, 48], [50, 22, 54, 38], [54, 38, 55, 48]], head: [50, 14], db: [[45, 50, 0], [55, 50, 0]], floor: true },
    { L: [...TORSO, ...STAND_LEGS, [50, 22, 33, 22], [50, 22, 67, 22]], head: [50, 14], db: [[30, 22, 90], [70, 22, 90]], floor: true },
  ],
  frontRaise: [
    { L: [...TORSO, ...STAND_LEGS, [50, 26, 52, 42]], head: [50, 14], ball: [[54, 46, 5]], floor: true },
    { L: [...TORSO, ...STAND_LEGS, [50, 26, 66, 26]], head: [50, 14], ball: [[71, 26, 5]], floor: true },
  ],
  row: [
    { L: [[50, 52, 66, 36], [50, 52, 48, 70], [48, 70, 48, 90], [50, 52, 54, 70], [54, 70, 54, 90], [63, 38, 63, 56]], head: [69, 32], db: [[63, 58, 0]], floor: true },
    { L: [[50, 52, 66, 36], [50, 52, 48, 70], [48, 70, 48, 90], [50, 52, 54, 70], [54, 70, 54, 90], [63, 38, 61, 46]], head: [69, 32], db: [[61, 48, 0]], floor: true },
  ],
  rdl: [
    { L: [...TORSO, ...STAND_LEGS, [50, 26, 50, 44]], head: [50, 14], db: [[50, 46, 0]], floor: true },
    { L: [[50, 52, 65, 38], [50, 52, 48, 71], [48, 71, 48, 90], [50, 52, 53, 71], [53, 71, 53, 90], [61, 41, 61, 58]], head: [68, 34], db: [[61, 60, 0]], floor: true },
  ],
  revFly: [
    { L: [[50, 24, 50, 48], [50, 48, 44, 68], [44, 68, 44, 90], [50, 48, 56, 68], [56, 68, 56, 90], [50, 28, 45, 42], [50, 28, 55, 42]], head: [50, 17], db: [[44, 44, 0], [56, 44, 0]], floor: true },
    { L: [[50, 24, 50, 48], [50, 48, 44, 68], [44, 68, 44, 90], [50, 48, 56, 68], [56, 68, 56, 90], [50, 28, 33, 25], [50, 28, 67, 25]], head: [50, 17], db: [[30, 25, 90], [70, 25, 90]], floor: true },
  ],
  renegade: [
    { L: [[32, 58, 56, 68], [56, 68, 76, 84], [32, 58, 30, 84], [32, 58, 36, 84]], head: [28, 53], db: [[30, 86, 0], [37, 86, 0]], floor: true },
    { L: [[32, 58, 56, 68], [56, 68, 76, 84], [32, 58, 30, 84], [32, 58, 38, 50]], head: [28, 53], db: [[30, 86, 0], [40, 48, 0]], floor: true },
  ],
  pullover: [
    { L: [[38, 78, 58, 78], [58, 78, 64, 66], [64, 66, 70, 78], [40, 77, 27, 68]], head: [33, 74], db: [[24, 66, 45]], floor: true },
    { L: [[38, 78, 58, 78], [58, 78, 64, 66], [64, 66, 70, 78], [40, 77, 40, 60]], head: [33, 74], db: [[40, 57, 90]], floor: true },
  ],
  russianTwist: [
    { L: [[50, 80, 42, 60], [50, 80, 62, 70], [62, 70, 70, 76], [44, 62, 33, 68]], head: [40, 55], ball: [[29, 70, 5]] },
    { L: [[50, 80, 42, 60], [50, 80, 62, 70], [62, 70, 70, 76], [44, 62, 55, 66]], head: [40, 55], ball: [[59, 68, 5]] },
  ],
  slam: [
    { L: [...TORSO, ...STAND_LEGS, [50, 26, 47, 10]], head: [50, 14], ball: [[47, 5, 5]], floor: true },
    { L: [[50, 52, 61, 40], [50, 52, 46, 70], [46, 70, 46, 90], [50, 52, 55, 70], [55, 70, 55, 90], [58, 43, 58, 62]], head: [64, 36], ball: [[58, 70, 5]], floor: true },
  ],
  situp: [
    { L: [[38, 78, 58, 78], [58, 78, 64, 66], [64, 66, 70, 78], [40, 77, 44, 70]], head: [33, 74], ball: [[46, 68, 5]] },
    { L: [[58, 78, 46, 60], [58, 78, 64, 66], [64, 66, 70, 78], [47, 62, 50, 68]], head: [44, 55], ball: [[52, 68, 5]] },
  ],
  sideBend: [
    { L: [...TORSO, ...STAND_LEGS, [50, 22, 57, 40], [50, 22, 43, 30]], head: [50, 14], db: [[57, 42, 0]], floor: true },
    { L: [[50, 52, 56, 25], ...STAND_LEGS, [55, 28, 61, 44], [55, 28, 47, 33]], head: [58, 19], db: [[61, 46, 0]], floor: true },
  ],
  pullThrough: [
    { L: [[32, 58, 56, 68], [56, 68, 76, 84], [32, 58, 30, 84], [32, 58, 36, 84]], head: [28, 53], db: [[22, 86, 0]], floor: true },
    { L: [[32, 58, 56, 68], [56, 68, 76, 84], [32, 58, 36, 84], [32, 58, 44, 82]], head: [28, 53], db: [[46, 86, 0]], floor: true },
  ],
  deadBug: [
    { L: [[38, 78, 58, 78], [58, 78, 62, 64], [62, 64, 68, 72], [40, 77, 40, 62]], head: [33, 74], ball: [[40, 58, 5]] },
    { L: [[38, 78, 58, 78], [58, 78, 78, 74], [40, 77, 25, 70]], head: [33, 74], ball: [[22, 68, 5]] },
  ],
  vup: [
    { L: [[38, 78, 58, 78], [58, 78, 76, 78], [40, 77, 25, 70]], head: [33, 74], ball: [[22, 68, 5]] },
    { L: [[58, 78, 47, 60], [58, 78, 72, 62], [48, 62, 58, 54]], head: [44, 56], ball: [[61, 52, 5]] },
  ],
  ohTricep: [
    { L: [...TORSO, ...STAND_LEGS, [50, 26, 54, 13], [54, 13, 45, 15]], head: [50, 14], db: [[42, 15, 0]], floor: true },
    { L: [...TORSO, ...STAND_LEGS, [50, 26, 53, 13], [53, 13, 51, 3]], head: [50, 14], db: [[51, 2, 0]], floor: true },
  ],
  kickback: [
    { L: [[50, 52, 66, 36], [50, 52, 48, 70], [48, 70, 48, 90], [50, 52, 54, 70], [54, 70, 54, 90], [63, 38, 67, 48], [67, 48, 62, 55]], head: [69, 32], db: [[61, 57, 0]], floor: true },
    { L: [[50, 52, 66, 36], [50, 52, 48, 70], [48, 70, 48, 90], [50, 52, 54, 70], [54, 70, 54, 90], [63, 38, 67, 48], [67, 48, 76, 51]], head: [69, 32], db: [[79, 52, 0]], floor: true },
  ],
  uprightRow: [
    { L: [...TORSO, ...STAND_LEGS, [50, 22, 46, 42], [50, 22, 54, 42]], head: [50, 14], db: [[46, 44, 0], [54, 44, 0]], floor: true },
    { L: [...TORSO, ...STAND_LEGS, [50, 22, 38, 22], [38, 22, 45, 27], [50, 22, 62, 22], [62, 22, 55, 27]], head: [50, 14], db: [[45, 29, 0], [55, 29, 0]], floor: true },
  ],
  halo: [
    { L: [...TORSO, ...STAND_LEGS, [50, 24, 44, 30], [50, 24, 56, 30]], head: [50, 14], ball: [[50, 33, 5]], floor: true },
    { L: [...TORSO, ...STAND_LEGS, [50, 24, 40, 18], [50, 24, 44, 10]], head: [50, 14], ball: [[38, 11, 5]], floor: true },
  ],
  cgPushup: [
    { L: [[32, 58, 56, 68], [56, 68, 76, 84], [32, 58, 32, 78]], head: [28, 53], ball: [[32, 84, 5]], floor: true },
    { L: [[32, 66, 56, 72], [56, 72, 76, 85], [32, 66, 28, 76], [28, 76, 32, 80]], head: [28, 61], ball: [[32, 84, 5]], floor: true },
  ],
  plank: [
    { L: [[32, 60, 56, 68], [56, 68, 76, 84], [32, 60, 30, 84], [32, 60, 36, 84]], head: [28, 55], floor: true },
    { L: [[32, 59, 56, 68], [56, 68, 76, 84], [32, 59, 30, 84], [32, 59, 36, 84]], head: [28, 54], floor: true },
  ],
  /* ---- v3 additions ---- */
  shrug: [
    { L: [...TORSO, ...STAND_LEGS, [50, 26, 47, 46], [50, 26, 53, 46]], head: [50, 14], db: [[47, 48, 0], [53, 48, 0]], floor: true },
    { L: [[50, 18, 50, 52], ...STAND_LEGS, [50, 23, 47, 43], [50, 23, 53, 43]], head: [50, 12], db: [[47, 45, 0], [53, 45, 0]], floor: true },
  ],
  superman: [
    { L: [[32, 80, 68, 80], [32, 80, 21, 80], [68, 80, 79, 80]], head: [27, 77], floor: true },
    { L: [[34, 78, 66, 78], [34, 77, 20, 70], [66, 78, 79, 71]], head: [29, 73], floor: true },
  ],
  skullCrusher: [
    { L: [[38, 78, 58, 78], [58, 78, 64, 66], [64, 66, 70, 78], [40, 77, 40, 64], [40, 64, 31, 61]], head: [33, 74], db: [[29, 60, 45]], floor: true },
    { L: [[38, 78, 58, 78], [58, 78, 64, 66], [64, 66, 70, 78], [40, 77, 40, 60]], head: [33, 74], db: [[40, 57, 90]], floor: true },
  ],
  bicycle: [
    { L: [[58, 78, 45, 69], [58, 78, 50, 66], [50, 66, 45, 61], [58, 78, 76, 74]], head: [41, 65] },
    { L: [[58, 78, 45, 69], [58, 78, 64, 64], [64, 64, 58, 58], [58, 78, 78, 80]], head: [41, 65] },
  ],
  woodChop: [
    { L: [...TORSO, ...STAND_LEGS, [50, 26, 38, 14]], head: [50, 14], ball: [[35, 11, 5]], floor: true },
    { L: [...TORSO, ...STAND_LEGS, [50, 26, 62, 46]], head: [50, 14], ball: [[65, 49, 5]], floor: true },
  ],
  hollowHold: [
    { L: [[42, 72, 58, 78], [58, 78, 74, 70], [42, 72, 30, 64]], head: [39, 68] },
    { L: [[42, 73, 58, 78], [58, 78, 74, 71], [42, 73, 30, 65]], head: [39, 69] },
  ],
  mtnClimber: [
    { L: [[32, 58, 56, 68], [32, 58, 30, 84], [32, 58, 36, 84], [56, 68, 76, 84], [56, 68, 50, 78]], head: [28, 53], floor: true },
    { L: [[32, 58, 56, 68], [32, 58, 30, 84], [32, 58, 36, 84], [56, 68, 80, 82], [56, 68, 46, 76]], head: [28, 53], floor: true },
  ],
  birdDog: [
    { L: [[34, 64, 62, 64], [34, 64, 30, 84], [34, 64, 36, 84], [62, 64, 58, 84], [62, 64, 66, 84]], head: [30, 61], floor: true },
    { L: [[34, 64, 62, 64], [34, 64, 32, 84], [34, 64, 18, 58], [62, 64, 66, 84], [62, 64, 80, 58]], head: [30, 61], floor: true },
  ],
  /* ---- bodyweight / calisthenics additions ---- */
  pushup: [
    { L: [[32, 58, 56, 68], [56, 68, 76, 84], [32, 58, 32, 84]], head: [28, 53], floor: true },
    { L: [[32, 66, 56, 72], [56, 72, 76, 85], [32, 66, 27, 77], [27, 77, 32, 84]], head: [28, 61], floor: true },
  ],
  pikePushup: [
    { L: [[34, 72, 52, 56], [52, 56, 72, 84], [34, 72, 28, 84], [34, 72, 33, 84]], head: [31, 77], floor: true },
    { L: [[30, 78, 52, 56], [52, 56, 72, 84], [30, 78, 25, 84], [30, 78, 34, 84]], head: [27, 82], floor: true },
  ],
  dip: [
    { L: [[42, 56, 42, 76], [42, 76, 66, 84], [42, 60, 33, 66], [33, 66, 33, 78]], head: [42, 50], floor: true },
    { L: [[42, 62, 42, 80], [42, 80, 66, 86], [42, 64, 32, 68], [32, 68, 32, 82]], head: [42, 56], floor: true },
  ],
  legRaise: [
    { L: [[30, 84, 58, 84], [58, 84, 80, 84], [32, 83, 24, 77]], head: [26, 80], floor: true },
    { L: [[30, 84, 58, 84], [58, 84, 58, 58], [32, 83, 24, 77]], head: [26, 80], floor: true },
  ],
  shoulderTap: [
    { L: [[32, 58, 56, 68], [56, 68, 76, 84], [32, 58, 30, 84], [32, 58, 36, 84]], head: [28, 53], floor: true },
    { L: [[32, 58, 56, 68], [56, 68, 76, 84], [32, 58, 33, 84], [32, 58, 40, 62]], head: [28, 53], floor: true },
  ],
  /* ---- chest additions ---- */
  floorPress: [
    { L: [[38, 78, 58, 78], [58, 78, 64, 66], [64, 66, 70, 78], [40, 77, 32, 71]], head: [33, 74], db: [[30, 69, 45]], floor: true },
    { L: [[38, 78, 58, 78], [58, 78, 64, 66], [64, 66, 70, 78], [40, 77, 40, 60]], head: [33, 74], db: [[40, 57, 90]], floor: true },
  ],
  fly: [
    { L: [[38, 78, 58, 78], [58, 78, 64, 66], [64, 66, 70, 78], [40, 77, 26, 74]], head: [33, 74], db: [[24, 73, 90]], floor: true },
    { L: [[38, 78, 58, 78], [58, 78, 64, 66], [64, 66, 70, 78], [40, 77, 40, 60]], head: [33, 74], db: [[40, 57, 90]], floor: true },
  ],
  chestSqueeze: [
    { L: [...TORSO, ...STAND_LEGS, [50, 26, 44, 32], [50, 26, 56, 32]], head: [50, 14], ball: [[50, 34, 5]], floor: true },
    { L: [...TORSO, ...STAND_LEGS, [50, 26, 58, 30], [50, 26, 58, 34]], head: [50, 14], ball: [[63, 32, 5]], floor: true },
  ],
};

/* ============ built-in exercise database ============ */
export const GROUPS = {
  back: { label: "Back", color: "#5B8DEF" },
  chest: { label: "Chest", color: "#9B7EDE" },
  shoulders: { label: "Shoulders", color: "#F2B134" },
  arms: { label: "Arms", color: "#E85D5D" },
  core: { label: "Core", color: "#46C98B" },
};

export const BUILTIN = [
  { id: "bor", grp: "back", name: "Bent-Over Row", type: "reps", pose: "row", cue: "Hinge at hips, flat back. Pull dumbbells to your ribs, squeeze shoulder blades, lower slow." },
  { id: "sar", grp: "back", name: "Single-Arm Row", type: "reps", pose: "row", cue: "One hand braced on a bench or knee. Row the dumbbell to your hip, elbow tight. Count is per side — do both." },
  { id: "ren", grp: "back", name: "Renegade Row", type: "reps", pose: "renegade", cue: "Plank on dumbbells. Row one up to your ribs without rotating your hips. Alternate sides." },
  { id: "pov", grp: "back", name: "Dumbbell Pullover", type: "reps", pose: "pullover", cue: "Lie on your back, one dumbbell in both hands. Lower behind your head with slightly bent arms, pull back over your chest." },
  { id: "rdl", grp: "back", name: "Romanian Deadlift", type: "reps", pose: "rdl", cue: "Dumbbells at thighs. Push hips back, flat back, slide weights down shins until hamstrings pull, stand up." },
  { id: "rfl", grp: "back", name: "Reverse Fly", type: "reps", pose: "revFly", cue: "Hinge forward, light dumbbells hanging. Raise arms out wide like wings, squeeze upper back, lower slow." },
  { id: "shg", grp: "back", name: "Dumbbell Shrug", type: "reps", pose: "shrug", cue: "Heavy dumbbells at your sides. Shrug shoulders straight up toward your ears, hold a beat, lower slow. No rolling." },
  { id: "sup", grp: "back", name: "Superman Hold", type: "time", secs: 30, pose: "superman", cue: "Face down, arms extended. Lift arms, chest, and legs off the floor. Squeeze your whole posterior chain and hold." },
  { id: "ohp", grp: "shoulders", name: "Overhead Press", type: "reps", pose: "ohp", cue: "Dumbbells at shoulders. Press straight up to lockout, lower with control. Don't arch your back." },
  { id: "arn", grp: "shoulders", name: "Arnold Press", type: "reps", pose: "ohp", cue: "Start palms facing you at chin height. Rotate palms out as you press overhead. Reverse on the way down." },
  { id: "pp", grp: "shoulders", name: "Push Press", type: "reps", pose: "ohp", cue: "Dumbbells at shoulders. Quick shallow knee dip, then drive up with your legs and punch the weights overhead. Go heavier than strict press." },
  { id: "lat", grp: "shoulders", name: "Lateral Raise", type: "reps", pose: "latRaise", cue: "Arms at sides, slight elbow bend. Raise to shoulder height, pause, lower slow. Light weight." },
  { id: "scp", grp: "shoulders", name: "Scaption Raise", type: "reps", pose: "latRaise", cue: "Like a lateral raise but arms travel 45° forward of your body, thumbs up. Easier on the rotator cuff." },
  { id: "frr", grp: "shoulders", name: "Med Ball Front Raise", type: "reps", pose: "frontRaise", cue: "Hold ball at thighs, arms straight. Raise to eye level, lower with control." },
  { id: "upr", grp: "shoulders", name: "Upright Row", type: "reps", pose: "uprightRow", cue: "Dumbbells in front of thighs. Pull up along your body to chest height, elbows leading and high." },
  { id: "hal", grp: "shoulders", name: "Med Ball Halo", type: "time", secs: 40, pose: "halo", cue: "Hold ball at chest. Circle it around your head, tight orbit, alternating direction. Core braced." },
  { id: "cur", grp: "arms", name: "Bicep Curl", type: "reps", pose: "curl", cue: "Elbows pinned to sides. Curl up, squeeze, lower on a 3-count. No swinging." },
  { id: "ham", grp: "arms", name: "Hammer Curl", type: "reps", pose: "curl", cue: "Same as a curl but palms facing each other the whole way. Hits forearms and brachialis." },
  { id: "zot", grp: "arms", name: "Zottman Curl", type: "reps", pose: "curl", cue: "Curl up palms-up, rotate to palms-down at the top, lower slow." },
  { id: "rcu", grp: "arms", name: "Reverse Curl", type: "reps", pose: "curl", cue: "Palms facing down the whole rep. Lighter than normal curls. Builds forearms and grip." },
  { id: "oht", grp: "arms", name: "Overhead Tricep Ext.", type: "reps", pose: "ohTricep", cue: "One dumbbell in both hands overhead. Bend elbows to lower behind your head, extend up. Elbows point forward." },
  { id: "skc", grp: "arms", name: "Skull Crusher", type: "reps", pose: "skullCrusher", cue: "Lying down, dumbbells pressed above your chest. Bend only at the elbows to lower toward your forehead, extend back up." },
  { id: "kb", grp: "arms", name: "Tricep Kickback", type: "reps", pose: "kickback", cue: "Hinge forward, upper arm locked parallel to floor. Extend the forearm straight back, squeeze, return." },
  { id: "cgp", grp: "arms", name: "Med Ball Push-Up", type: "reps", pose: "cgPushup", cue: "Both hands on the ball, tight plank. Lower chest to the ball, press up. Elbows close — all triceps." },
  { id: "rt", grp: "core", name: "Russian Twist", type: "time", secs: 40, pose: "russianTwist", cue: "Seated, lean back, feet up if you can. Rotate the ball side to side, touching near the floor each side." },
  { id: "slm", grp: "core", name: "Med Ball Slam", type: "reps", pose: "slam", cue: "Ball overhead on your toes, then slam it down hard using your whole core. Catch and repeat." },
  { id: "wsu", grp: "core", name: "Weighted Sit-Up", type: "reps", pose: "situp", cue: "Ball hugged to chest, knees bent. Sit all the way up, lower with control." },
  { id: "sb", grp: "core", name: "Side Bend", type: "reps", pose: "sideBend", cue: "Dumbbell in one hand, other hand behind head. Bend toward the weight, pull back up with your obliques. Count is per side." },
  { id: "ppt", grp: "core", name: "Plank Pull-Through", type: "time", secs: 40, pose: "pullThrough", cue: "Plank with a dumbbell beside one hand. Reach under with the opposite hand and drag it across. Hips stay square." },
  { id: "db", grp: "core", name: "Dead Bug", type: "time", secs: 40, pose: "deadBug", cue: "On your back, ball pressed between hands, knees up. Extend opposite arm and leg, lower back glued to the floor." },
  { id: "vup", grp: "core", name: "V-Up Ball Pass", type: "reps", pose: "vup", cue: "Lie flat, ball in hands overhead. Fold into a V and pass the ball to your feet. Lower, repeat, pass back." },
  { id: "plk", grp: "core", name: "Plank", type: "time", secs: 60, pose: "plank", cue: "Forearms down, body one straight line. Squeeze glutes, brace hard." },
  { id: "bic", grp: "core", name: "Bicycle Crunch", type: "time", secs: 40, pose: "bicycle", cue: "Shoulders off the floor, hands behind head. Opposite elbow to knee, slow and controlled, legs cycling." },
  { id: "wc", grp: "core", name: "Med Ball Wood Chop", type: "reps", pose: "woodChop", cue: "Ball high over one shoulder. Chop diagonally down past the opposite hip, rotating through your core. Count is per side." },
  { id: "hh", grp: "core", name: "Hollow Hold", type: "time", secs: 30, pose: "hollowHold", cue: "On your back, arms overhead, legs straight. Lift shoulders and legs, lower back pressed down. Banana shape, hold." },
  { id: "bdg", grp: "core", name: "Bird Dog", type: "time", secs: 40, pose: "birdDog", cue: "On all fours. Extend opposite arm and leg to a straight line, hold a beat, switch. Hips level the whole time." },
  { id: "ibd", grp: "core", name: "Ipsilateral Bird Dog", type: "time", secs: 40, pose: "birdDog", cue: "On all fours. Raise your SAME-side arm and leg together, hold a beat, switch sides. Much harder to balance — brace hard." },
  /* ---- bodyweight / calisthenics (no equipment needed) ---- */
  { id: "pu", grp: "arms", name: "Push-Up", type: "reps", pose: "pushup", cue: "Hands under shoulders, body one straight line. Chest to the floor, press up. No sagging hips." },
  { id: "dpu", grp: "arms", name: "Diamond Push-Up", type: "reps", pose: "pushup", cue: "Hands together under your chest, index fingers and thumbs forming a diamond. Elbows tight — all triceps." },
  { id: "dip", grp: "arms", name: "Chair Dip", type: "reps", pose: "dip", cue: "Hands on a sturdy chair edge behind you, legs out front. Bend elbows to 90°, press back up. Shoulders away from ears." },
  { id: "ppu", grp: "shoulders", name: "Pike Push-Up", type: "reps", pose: "pikePushup", cue: "Hips high in an inverted V. Lower the top of your head toward the floor between your hands, press back up." },
  { id: "pst", grp: "shoulders", name: "Plank Shoulder Tap", type: "time", secs: 40, pose: "shoulderTap", cue: "High plank. Tap your opposite shoulder without letting your hips rock. Alternate hands." },
  { id: "pyr", grp: "back", name: "Prone Y Raise", type: "reps", pose: "superman", cue: "Face down, arms overhead in a Y, thumbs up. Lift arms and chest, squeeze your mid-back, lower slow." },
  { id: "mc", grp: "core", name: "Mountain Climber", type: "time", secs: 40, pose: "mtnClimber", cue: "High plank. Drive your knees toward your chest in quick alternating steps. Hips stay level." },
  { id: "lr", grp: "core", name: "Leg Raise", type: "reps", pose: "legRaise", cue: "Lie flat, legs straight, hands under your hips. Raise legs to vertical, lower slow without arching your back." },
  /* ---- chest ---- */
  { id: "fp", grp: "chest", name: "Floor Press", type: "reps", pose: "floorPress", cue: "Lie on your back, knees bent, dumbbells over your chest. Lower until your triceps touch the floor, press back up." },
  { id: "fly", grp: "chest", name: "Floor Fly", type: "reps", pose: "fly", cue: "Lying down, dumbbells above your chest, slight elbow bend. Open wide until your arms rest near the floor, squeeze back together." },
  { id: "sqp", grp: "chest", name: "Squeeze Press", type: "reps", pose: "floorPress", cue: "Press the dumbbells together hard over your chest and keep squeezing as you lower and press. Constant tension." },
  { id: "wpu", grp: "chest", name: "Wide Push-Up", type: "reps", pose: "pushup", cue: "Hands wider than your shoulders. Chest to the floor, press up. Elbows about 45° from your body." },
  { id: "mbs", grp: "chest", name: "Ball Squeeze Press-Out", type: "reps", pose: "chestSqueeze", cue: "Crush the ball between your palms at chest height, press it straight out, pull it back in. Never stop crushing." },
];

/* equipment tags: "db" dumbbells, "ball" med ball, untagged = bodyweight only */
const EQUIP_TAGS = {
  bor: "db", sar: "db", ren: "db", pov: "db", rdl: "db", rfl: "db", shg: "db",
  ohp: "db", arn: "db", pp: "db", lat: "db", scp: "db", upr: "db",
  cur: "db", ham: "db", zot: "db", rcu: "db", oht: "db", skc: "db", kb: "db",
  sb: "db", ppt: "db", fp: "db", fly: "db", sqp: "db",
  frr: "ball", hal: "ball", cgp: "ball", rt: "ball", slm: "ball", wsu: "ball",
  db: "ball", vup: "ball", wc: "ball", mbs: "ball",
};
BUILTIN.forEach((e) => { if (EQUIP_TAGS[e.id]) e.eq = EQUIP_TAGS[e.id]; });

export const EQUIPMENT = {
  db: { label: "dumbbells" },
  ball: { label: "med ball" },
};

/* ============ structured prompt for adding exercises via any LLM ============ */
const ADD_PROMPT_BASE = `Generate a JSON array of exercises for my workout app. Equipment available: __EQUIP__. Follow this schema exactly and reply with ONLY the JSON, no markdown fences:

[{
  "id": "short_unique_id",
  "name": "Exercise Name",
  "grp": "back" | "chest" | "shoulders" | "arms" | "core",
  "type": "reps" | "time",
  "secs": 40,                    // only if type is "time"
  "eq": "db" | "ball" | "<equipment name>",  // what it needs — OMIT the field entirely if bodyweight-only
  "cue": "One or two sentences of plain-language form instruction.",
  "frames": [FRAME_A, FRAME_B]   // start and end position stick figures
}]

Each FRAME draws a stick figure in a 100x100 viewBox (y increases downward, ground line is y=90):
{
  "L": [[x1,y1,x2,y2], ...],     // limb/torso line segments, stroke-linecap round
  "head": [cx, cy],              // head circle center, radius ~5
  "db": [[x, y, angleDeg]],      // optional dumbbells drawn at these points
  "ball": [[x, y, radius]],      // optional medicine ball circles
  "floor": true                  // optional, draws the ground line
}

Conventions from existing figures: standing figures have head near [50,14], torso [50,20]->[50,52], legs splayed to y=90. Lying figures use the ground near y=78-84. Frame A is the start position, frame B is the peak/end position; the app cross-fades between them to animate the movement. Keep figures side-view where possible, anatomically plausible, and make the difference between frames clearly show the movement.

Generate N exercises for muscle group(s): X.`;

export function buildAddPrompt(allEx, equipNames) {
  return (
    ADD_PROMPT_BASE.replace("__EQUIP__", ["bodyweight", ...equipNames].join(", ")) +
    `\n\nAlready in the library — do NOT generate these or near-duplicates of them:\n` +
    allEx.map((e) => e.name).join(", ")
  );
}

/* ============ exercise validation ============ */
export function validateExercise(e) {
  const errs = [];
  if (!e.id || typeof e.id !== "string") errs.push("missing id");
  if (!e.name) errs.push("missing name");
  if (!GROUPS[e.grp]) errs.push(`grp must be one of: ${Object.keys(GROUPS).join(", ")}`);
  if (!["reps", "time"].includes(e.type)) errs.push("type must be reps|time");
  if (e.type === "time" && !(e.secs > 0)) errs.push("time type needs secs");
  if (e.eq != null && (typeof e.eq !== "string" || !e.eq.trim())) errs.push("eq must be an equipment name string or omitted");
  if (!e.cue) errs.push("missing cue");
  const frames = e.frames || POSES[e.pose];
  if (!Array.isArray(frames) || frames.length !== 2) errs.push("needs frames[2] (or a valid pose key)");
  else frames.forEach((f, i) => {
    if (!Array.isArray(f.L) || !f.L.every((l) => Array.isArray(l) && l.length === 4 && l.every(Number.isFinite))) errs.push(`frame ${i}: bad L`);
    if (!Array.isArray(f.head) || f.head.length !== 2) errs.push(`frame ${i}: bad head`);
  });
  return errs;
}
export const resolveFrames = (e) => e.frames || POSES[e.pose];
