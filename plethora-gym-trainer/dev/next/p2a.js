
  /* ------------------------------------------------------------------ *
   * The exercise library
   *
   * nm name, tg target, vw view, pr prop rig, ld load line (reps + weight
   * live here, never on a timer), cu the written checklist, tk the TRAIN
   * loop, sd/ss/st the SETUP loop: duration, captions and keyframes.
   * ------------------------------------------------------------------ */

  var EX = {

  /* ---------------- Monday ---------------- */

  goblet: {
    nm: 'Goblet Squat', tg: 'Quads · Glutes', vw: 'side', pr: 'goblet',
    ld: '3 × 12–15 reps  ·  one dumbbell, 8–14 kg',
    cu: [
      'Knees track out over your second and third toe, never inward',
      'Weight over the middle of the foot — you should be able to wiggle your toes',
      'Heels stay down the whole way',
      'Depth is only worth what you can hold with a flat back'
    ],
    tk: tr(
      '0|to4 na72 nb-58 fa72 fb-58 nt2 ns1 ft-3 fs4',
      '0.5|y0.20 to16 cu-3 na70 nb-52 fa70 fb-52 nt44 ns-52 no86 ft46 fs-54 fo86',
      '1|to4 na72 nb-58 fa72 fb-58 nt2 ns1 ft-3 fs4'),
    sd: 11000,
    ss: [
      '0.24|Stand the dumbbell on its end between your feet. Feet just outside shoulder width, toes turned out about 20°.',
      '0.46|Squat down to it — do not bend over to it. Chest up, back flat.',
      '0.68|Cup both hands under the top head of the dumbbell, like holding a goblet.',
      '1|Stand up with your legs. It rides against your chest, elbows tucked underneath it.'
    ],
    st: tr(
      '0|to2 na4 nb6 fa4 fb6',
      '0.24|to2 na4 nb6 fa4 fb6',
      '0.40|y0.26 to42 ne-18 na28 nb44 fa28 fb44 nt54 ns-64 no84 ft56 fs-66 fo84',
      '0.68|y0.26 to38 ne-14 na56 nb10 fa56 fb10 nt54 ns-64 no84 ft56 fs-66 fo84',
      '1|to4 na72 nb-58 fa72 fb-58 nt2 ns1 ft-3 fs4')
  },

  legext: {
    nm: 'Leg Extension', tg: 'Quads', vw: 'side', pr: 'legext',
    ld: '3 × 12–15 reps  ·  machine, light to moderate',
    cu: [
      'Hips stay pinned to the seat — if they lift, go lighter',
      'Toes pointed up and slightly toward you',
      'Squeeze for a beat at the top, never snap the knee straight',
      'Three seconds down is worth more than an extra plate'
    ],
    tk: tr(
      '0|y0.235 to-6 na84 nb30 fa84 fb30 nt90 ns8 no86 ft90 fs6 fo86',
      '0.45|y0.235 to-6 na84 nb30 fa84 fb30 nt90 ns62 no90 ft90 fs60 fo90',
      '0.62|y0.235 to-6 na84 nb30 fa84 fb30 nt90 ns84 no92 ft90 fs82 fo92',
      '1|y0.235 to-6 na84 nb30 fa84 fb30 nt90 ns8 no86 ft90 fs6 fo86'),
    sd: 9500,
    ss: [
      '0.32|Sit right back so your hips are in the corner of the seat and your back is supported.',
      '0.62|Set the pad on the bone just above your ankle — not on your foot, not up the shin.',
      '1|Line the machine pivot up with your knee, then hold the handles lightly.'
    ],
    st: tr(
      '0|y0.235 to-4 na70 nb50 fa70 fb50 nt90 ns10 no86 ft90 fs8 fo86',
      '0.32|y0.235 to-6 na80 nb36 fa80 fb36 nt90 ns10 no86 ft90 fs8 fo86',
      '0.62|y0.235 to-6 na84 nb30 fa84 fb30 nt90 ns8 no86 ft90 fs6 fo86',
      '1|y0.235 to-6 na84 nb30 fa84 fb30 nt90 ns8 no86 ft90 fs6 fo86')
  },

  lunge: {
    nm: 'Walking Lunges', tg: 'Quads · Glutes', vw: 'side', pr: 'db2',
    ld: '3 × 12–15 reps per leg  ·  bodyweight or 2 × 5–10 kg',
    cu: [
      'Torso stays upright and stacked over your hips',
      'Front knee stays behind or just over the laces, never diving inward',
      'Step in a straight line, feet about hip width — never on a tightrope',
      'If you wobble, lengthen the step before you add weight'
    ],
    tk: tr(
      '0|to3 na2 nb3 fa2 fb3 nt2 ns1 ft-3 fs3',
      '0.45|y0.13 to5 na2 nb3 fa2 fb3 nt62 ns-8 no84 ft-14 fs-92 fo-16',
      '0.60|y0.16 to6 na2 nb3 fa2 fb3 nt70 ns-10 no84 ft-15 fs-100 fo-20',
      '1|to3 na2 nb3 fa2 fb3 nt2 ns1 ft-3 fs3'),
    sd: 9500,
    ss: [
      '0.34|Squat down to the dumbbells with a flat back and take one in each hand.',
      '0.62|Stand tall, arms hanging, shoulders pulled back. Look at a point straight ahead, not down.',
      '1|Brace your stomach, then take a long first step — long enough that both knees can reach 90°.'
    ],
    st: tr(
      '0|to2 na3 nb4 fa3 fb4',
      '0.34|y0.26 to42 ne-18 na14 nb18 fa14 fb18 nt54 ns-64 no84 ft56 fs-66 fo84',
      '0.62|to2 na3 nb4 fa3 fb4',
      '1|y0.13 to5 na2 nb3 fa2 fb3 nt62 ns-8 no84 ft-14 fs-92 fo-16')
  },

  calf: {
    nm: 'Calf Raises', tg: 'Calves', vw: 'side', pr: 'step',
    ld: '3 × 12–15 reps  ·  bodyweight, or hold 2 dumbbells',
    cu: [
      'Knees stay straight — bending them makes it a different exercise',
      'Rise through the big toe, not out over the little toe',
      'The stretch at the bottom matters more here than the weight',
      'No bouncing: bouncing loads the tendon, not the muscle'
    ],
    tk: tr(
      '0|y0.065 to2 na3 nb4 fa3 fb4 nt2 ns2 no120 ft-2 fs2 fo120',
      '0.5|y-0.09 to2 na3 nb4 fa3 fb4 nt2 ns2 no38 ft-2 fs2 fo38',
      '1|y0.065 to2 na3 nb4 fa3 fb4 nt2 ns2 no120 ft-2 fs2 fo120'),
    sd: 9000,
    ss: [
      '0.32|Squat down with a flat back and pick the dumbbells up, one in each hand.',
      '0.62|Put the balls of both feet on a step or plate, heels hanging free off the back.',
      '1|Let the heels sink below the step until the calf stretches. That is the start, not the finish.'
    ],
    st: tr(
      '0|to2 na3 nb4 fa3 fb4',
      '0.32|y0.26 to42 ne-18 na14 nb18 fa14 fb18 nt54 ns-64 no84 ft56 fs-66 fo84',
      '0.62|y-0.02 to2 na3 nb4 fa3 fb4 nt2 ns2 no86 ft-2 fs2 fo86',
      '1|y0.065 to2 na3 nb4 fa3 fb4 nt2 ns2 no120 ft-2 fs2 fo120')
  },

  ohp: {
    nm: 'Dumbbell Shoulder Press', tg: 'Shoulders', vw: 'front', pr: 'db2',
    ld: '3 × 12–15 reps  ·  2 dumbbells, 5–10 kg each',
    cu: [
      'Ribs pulled down — arching the back turns this into a bench press',
      'Wrists stay straight and stacked over the elbows',
      'Press up and slightly in, so the dumbbells travel toward each other',
      'Feet planted; do not push the floor away to help the weight up'
    ],
    tk: tr(
      '0|to0 na96 nb172 fa-96 fb-172 nt3 ns-2 ft-3 fs2',
      '0.5|to0 na152 nb176 fa-152 fb-176 nt3 ns-2 ft-3 fs2',
      '1|to0 na96 nb172 fa-96 fb-172 nt3 ns-2 ft-3 fs2'),
    sd: 10500,
    ss: [
      '0.30|Stand the dumbbells beside your feet and squat down to them with a flat back. Never bend over to pick them up.',
      '0.62|Stand up with your legs, dumbbells hanging at your sides, shoulders pulled back and down.',
      '1|Bring them to ear height, palms facing forward, elbows just in front of you — not flared straight out.'
    ],
    st: tr(
      '0|to0 na4 nb6 fa-4 fb-6',
      '0.30|y0.30 to0 na14 nb18 fa-14 fb-18 nt50 ns-42 no90 ft-50 fs42 fo-90',
      '0.62|to0 na6 nb10 fa-6 fb-10',
      '1|to0 na96 nb172 fa-96 fb-172')
  },

  lateral: {
    nm: 'Lateral Raises', tg: 'Side delts', vw: 'front', pr: 'db2',
    ld: '3 × 12–15 reps  ·  2 dumbbells, 2.5–6 kg each',
    cu: [
      'Stop at shoulder height — higher hands the work to your traps',
      'Shoulders stay pressed down; do not shrug the weight up',
      'Lead with the elbows, as if pouring water from two jugs',
      'No swinging. If you need momentum, go lighter'
    ],
    tk: tr(
      '0|to2 na8 nb12 fa-8 fb-12 nt3 ns-2 ft-3 fs2',
      '0.5|to2 na84 nb92 fa-84 fb-92 nt3 ns-2 ft-3 fs2',
      '1|to2 na8 nb12 fa-8 fb-12 nt3 ns-2 ft-3 fs2'),
    sd: 9500,
    ss: [
      '0.30|Squat down to the dumbbells with a flat back and take a light one in each hand.',
      '0.62|Stand tall, arms hanging by your sides, shoulders pulled down away from your ears.',
      '1|Lean forward the smallest amount and set a soft bend in each elbow. Keep exactly that bend all set.'
    ],
    st: tr(
      '0|to0 na4 nb6 fa-4 fb-6',
      '0.30|y0.30 to0 na14 nb18 fa-14 fb-18 nt50 ns-42 no90 ft-50 fs42 fo-90',
      '0.62|to0 na5 nb8 fa-5 fb-8',
      '1|to3 na8 nb14 fa-8 fb-14')
  },

  bbcurl: {
    nm: 'Barbell Bicep Curl', tg: 'Biceps', vw: 'side', pr: 'bar',
    ld: '3 × 12–15 reps  ·  barbell or EZ bar, 10–20 kg total',
    cu: [
      'Elbows glued to your sides — if they drift forward the delts take over',
      'No swinging at the hips; the torso is a post',
      'Wrists stay neutral and firm, never rolling back',
      'Straighten the arms fully at the bottom of every rep'
    ],
    tk: tr(
      '0|to2 na2 nb4 fa2 fb4 nt2 ns1 ft-2 fs2',
      '0.5|to2 na-4 nb148 fa-4 fb148 nt2 ns1 ft-2 fs2',
      '1|to2 na2 nb4 fa2 fb4 nt2 ns1 ft-2 fs2'),
    sd: 10000,
    ss: [
      '0.32|Squat down to the bar with a flat back — never round over to pick it up.',
      '0.64|Take an underhand grip about shoulder width, thumbs wrapped around the bar.',
      '1|Stand up by pushing the floor away. Finish tall, bar resting on your thighs.'
    ],
    st: tr(
      '0|y0.26 to42 ne-18 na22 nb38 fa22 fb38 nt54 ns-64 no84 ft56 fs-66 fo84',
      '0.32|y0.26 to42 ne-18 na22 nb38 fa22 fb38 nt54 ns-64 no84 ft56 fs-66 fo84',
      '0.64|y0.26 to40 ne-16 na10 nb14 fa10 fb14 nt54 ns-64 no84 ft56 fs-66 fo84',
      '1|to2 na2 nb4 fa2 fb4 nt2 ns1 ft-2 fs2')
  },
