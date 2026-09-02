/* Thursday Trainer - a Plethora Bit
 * runtime: plethora-bit@2
 *
 * A seven-level gym session with an animated coach who demonstrates every
 * movement, shows the exact mistake people make, and paces your reps.
 * Everything is drawn procedurally: packaged assets are disabled (maxAssets 0)
 * and remote images are blocked, so the trainer is a keyframed 2D rig.
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Palette
   * ------------------------------------------------------------------ */

  var C = {
    bg0: '#080a1b',
    bg1: '#141a3d',
    grid: 'rgba(45,226,230,0.16)',
    glow: '#2de2e6',
    hot: '#ff2e88',
    hotSoft: '#ff7ab8',
    violet: '#7c4dff',
    skin: '#f2b78c',
    skinShade: '#cb8a63',
    hair: '#2a1b3d',
    hairLit: '#7c4dff',
    top: '#ff2e88',
    topLit: '#ff86bd',
    legs: '#241f42',
    legsLit: '#4b3f83',
    shoe: '#2de2e6',
    good: '#3ddc84',
    bad: '#ff4d5e',
    ink: '#f4f6ff',
    dim: 'rgba(244,246,255,0.62)',
    faint: 'rgba(244,246,255,0.34)',
    steel: '#8f9bc4',
    steelDark: '#414c78'
  };

  /* ------------------------------------------------------------------ *
   * Body proportions, in figure units (~1.0 = full standing height)
   * ------------------------------------------------------------------ */

  var B = {
    spine: 0.30,
    neckToHead: 0.105,
    headR: 0.072,
    upperArm: 0.155,
    foreArm: 0.15,
    thigh: 0.235,
    shank: 0.23,
    foot: 0.095,
    hipHalfSide: 0.030,
    hipHalfFront: 0.072,
    shHalfSide: 0.034,
    shHalfFront: 0.094
  };

  /* ------------------------------------------------------------------ *
   * Pose model
   *
   * Every angle is absolute, in degrees, so poses are easy to author.
   * Limb direction for angle a is (sin a, cos a): 0 points straight down,
   * +90 points right, -90 points left. The torso runs the other way from
   * the pelvis, (sin a, -cos a): 0 is upright, + leans right.
   *
   * far* = the limb on the far side of the body (drawn behind the torso)
   * near* = the limb closest to the viewer (drawn in front)
   * ------------------------------------------------------------------ */

  var REST = {
    x: 0, y: 0,
    torso: 0, curve: 0, neck: 0,
    fau: 4, faf: 6, nau: 4, naf: 6,
    flt: 0, fls: 0, flf: 90,
    nlt: 0, nls: 0, nlf: 90,
    flScale: 1, nlScale: 1,
    armScale: 1,
    heelLift: 0
  };

  var POSE_KEYS = Object.keys(REST);

  function pose(over) {
    var p = {};
    for (var i = 0; i < POSE_KEYS.length; i++) {
      var k = POSE_KEYS[i];
      p[k] = over && over[k] !== undefined ? over[k] : REST[k];
    }
    return p;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function lerpPose(a, b, t) {
    var p = {};
    for (var i = 0; i < POSE_KEYS.length; i++) {
      var k = POSE_KEYS[i];
      p[k] = lerp(a[k], b[k], t);
    }
    return p;
  }

  /* Sample a keyframe track: [{t, p}, ...] with t ascending over 0..1 */
  function sampleTrack(track, t) {
    if (t <= track[0].t) return track[0].p;
    for (var i = 1; i < track.length; i++) {
      if (t <= track[i].t) {
        var a = track[i - 1], b = track[i];
        var span = b.t - a.t || 1;
        var u = (t - a.t) / span;
        u = u * u * (3 - 2 * u); /* ease, so she never snaps between keys */
        return lerpPose(a.p, b.p, u);
      }
    }
    return track[track.length - 1].p;
  }

  /* ------------------------------------------------------------------ *
   * The Thursday session
   * ------------------------------------------------------------------ */

  var QUOTES = [
    'That one is behind you now. Shake it out.',
    'Breathe. The next set is always cleaner.',
    'Nobody is watching. Only you know if that rep was honest.',
    'Slow is strong. Slow is safe. Slow is the point.',
    'You are not tired, you are halfway.',
    'Form first. The weight can wait a week.',
    'Your future self is already thanking you for this.',
    'The set is hard because it is working.',
    'Steady breath. Steady spine. Steady you.',
    'Show up on the Thursdays you do not feel like it. That is the whole trick.',
    'Every rep you own is one you never have to repeat.',
    'Stand tall. You have earned the space you take up.'
  ];

  var WORKOUT = [
    {
      id: 'rdl',
      name: 'Romanian Deadlift',
      target: 'Hamstrings · Glutes',
      view: 'side',
      mode: 'reps',
      sets: 3,
      reps: 10,
      tempo: { down: 3000, hold: 350, up: 1600, top: 500 },
      loaded: true,
      perSide: false,
      fault: 'Back rounds, bar drifts away',
      faultCue: 'The spine curls and the bar swings out in front — that is how backs get hurt.',
      goodCue: 'Hinge at the hips, chest proud, bar shaving your thighs the whole way.',
      cues: [
        'Soft knees — this is a hinge, not a squat',
        'Push the hips back toward the wall behind you',
        'Bar stays glued to your legs',
        'Stop when you feel the hamstrings, not when you run out of back'
      ],
      beats: ['Hips back…', 'Feel the stretch', 'Drive the floor away', 'Squeeze the glutes'],
      weight: { barbell: [20, 30, 40], dumbbell: [12, 20, 28], bodyweight: 'Single-leg RDL, no weight' },
      align: 'spine'
    },
    {
      id: 'legcurl',
      name: 'Leg Curl',
      target: 'Hamstrings',
      view: 'side',
      mode: 'reps',
      sets: 3,
      reps: 12,
      tempo: { down: 2200, hold: 250, up: 1200, top: 400 },
      loaded: true,
      perSide: false,
      fault: 'Hips lift off the pad',
      faultCue: 'The hips peel off the pad and the low back arches to help. The hamstring stops working.',
      goodCue: 'Hips pinned down, heels driven to your glutes, and a slow release.',
      cues: [
        'Hips stay glued to the pad',
        'Pull your heels all the way to your glutes',
        'Pause for a beat at the top',
        'Lower slower than you lifted'
      ],
      beats: ['Curl…', 'Squeeze', 'Slow down', 'Stretch'],
      weight: { barbell: [15, 25, 35], dumbbell: [15, 25, 35], bodyweight: 'Glute bridge march instead' },
      align: 'hipline'
    },
    {
      id: 'bss',
      name: 'Bulgarian Split Squat',
      target: 'Quads · Glutes',
      view: 'side',
      mode: 'reps',
      sets: 3,
      reps: 10,
      tempo: { down: 2400, hold: 250, up: 1400, top: 450 },
      loaded: true,
      perSide: true,
      fault: 'Knee dives past the toes, chest folds',
      faultCue: 'The front knee shoots forward past the toes, the heel lifts and the chest folds over the thigh.',
      goodCue: 'Front shin close to vertical, heel planted, chest tall as you sink straight down.',
      cues: [
        'Front foot far enough forward that the shin stays near vertical',
        'Whole front foot stays down — never roll onto the toes',
        'Back foot is a kickstand, not a second leg',
        'Sink straight down, then drive through the front heel'
      ],
      beats: ['Down…', 'Shin vertical', 'Drive the heel', 'Tall again'],
      weight: { barbell: [10, 16, 24], dumbbell: [10, 16, 24], bodyweight: 'Bodyweight, hands on hips' },
      align: 'knee'
    },
    {
      id: 'sumo',
      name: 'Sumo Squat',
      target: 'Glutes · Inner thigh',
      view: 'front',
      mode: 'reps',
      sets: 3,
      reps: 12,
      tempo: { down: 2200, hold: 300, up: 1300, top: 400 },
      loaded: true,
      perSide: false,
      fault: 'Knees pinch in, heels lift',
      faultCue: 'The knees dive inward and the heels come off the floor, so the load leaves the glutes.',
      goodCue: 'Knees pushed out over the toes, heels planted, hips straight down.',
      cues: [
        'Toes turned out, stance wider than your shoulders',
        'Push the knees out as you descend',
        'Whole foot stays on the floor',
        'Stand up by squeezing the glutes, not the low back'
      ],
      beats: ['Sit down…', 'Knees out', 'Heels down', 'Squeeze up'],
      weight: { barbell: [12, 20, 28], dumbbell: [12, 20, 28], bodyweight: 'Bodyweight sumo squat' },
      align: 'knee'
    },
    {
      id: 'mtn',
      name: 'Mountain Climbers',
      target: 'Core · Conditioning',
      view: 'side',
      mode: 'time',
      sets: 3,
      seconds: 30,
      tempo: { down: 420, hold: 0, up: 420, top: 0 },
      loaded: false,
      perSide: false,
      fault: 'Hips sag or pike up',
      faultCue: 'The hips drop toward the floor (or shoot up), and the low back takes the whole load.',
      goodCue: 'One straight line from shoulders to heels — plank first, then run.',
      cues: [
        'Hands stacked under your shoulders',
        'Hips level with your shoulders the whole time',
        'Drive the knee in, do not bounce the hips',
        'Breathe in rhythm, do not hold your breath'
      ],
      beats: ['Drive…', 'Switch', 'Hips level', 'Breathe'],
      weight: null,
      align: 'plank'
    },
    {
      id: 'tap',
      name: 'Shoulder Taps',
      target: 'Core · Anti-rotation',
      view: 'side',
      mode: 'reps',
      sets: 3,
      reps: 20,
      tempo: { down: 900, hold: 200, up: 900, top: 200 },
      loaded: false,
      perSide: false,
      fault: 'Hips rock side to side',
      faultCue: 'The hips swing with every tap. The whole point of the exercise leaks out of that swing.',
      goodCue: 'Wide feet, still hips. Tap without letting anything else move.',
      cues: [
        'Feet wider than your hips for a stable base',
        'Squeeze the glutes before the first tap',
        'Move only the arm — nothing else',
        'Slow taps beat fast wobbles'
      ],
      beats: ['Tap…', 'Stay still', 'Other hand', 'Hold the line'],
      weight: null,
      align: 'plank'
    },
    {
      id: 'suitcase',
      name: 'Suitcase Hold',
      target: 'Obliques · Grip',
      view: 'front',
      mode: 'time',
      sets: 3,
      seconds: 30,
      tempo: { down: 1800, hold: 0, up: 1800, top: 0 },
      loaded: true,
      perSide: true,
      fault: 'Leaning toward the weight',
      faultCue: 'The body bends toward the load and the opposite hip juts out. Now it is a lean, not a carry.',
      goodCue: 'Stand dead vertical. Ribs down, shoulders level, let the obliques fight the weight.',
      cues: [
        'One heavy weight, one hand, arm hanging straight',
        'Shoulders level — do not let the loaded side drop',
        'Ribs down, glutes on, stand as tall as you can',
        'Switch hands when the timer flips'
      ],
      beats: ['Stand tall…', 'Ribs down', 'Shoulders level', 'Hold'],
      weight: { barbell: [10, 16, 24], dumbbell: [10, 16, 24], bodyweight: 'Hold anything heavy you own' },
      align: 'plumb'
    }
  ];

  /* ------------------------------------------------------------------ *
   * Pose tracks per exercise
   * Each returns a keyframe track for one full repetition.
   * ------------------------------------------------------------------ */

  var TRACKS = {};

  TRACKS.rdl = {
    good: [
      { t: 0.00, p: pose({ torso: 3, curve: -2, nau: 2, naf: 2, fau: 2, faf: 2, nlt: 1, nls: 1, flt: -4, fls: 5 }) },
      { t: 1.00, p: pose({ torso: 72, curve: -4, neck: -14, x: -0.035, y: 0.015, nau: 0, naf: 0, fau: 0, faf: 0, nlt: -9, nls: 7, flt: -14, fls: 11 }) }
    ],
    bad: [
      { t: 0.00, p: pose({ torso: 5, curve: 10, nau: 6, naf: 8, fau: 6, faf: 8, flt: -5, fls: 4 }) },
      { t: 1.00, p: pose({ torso: 50, curve: 34, neck: 16, y: 0.02, nau: 20, naf: 22, fau: 20, faf: 22, nlt: -1, nls: -2, flt: -6, fls: 2 }) }
    ]
  };

  TRACKS.legcurl = {
    good: [
      { t: 0.00, p: pose({ torso: -70, curve: 0, neck: 10, x: 0.08, y: 0.06, fau: -80, faf: -78, nau: -80, naf: -78, flt: 110, fls: 110, flf: 194, nlt: 110, nls: 110, nlf: 194 }) },
      { t: 1.00, p: pose({ torso: -70, curve: 0, neck: 10, x: 0.08, y: 0.06, fau: -80, faf: -78, nau: -80, naf: -78, flt: 110, fls: 200, flf: 268, nlt: 110, nls: 196, nlf: 264 }) }
    ],
    bad: [
      { t: 0.00, p: pose({ torso: -66, curve: -14, neck: 20, x: 0.08, y: 0.03, fau: -82, faf: -80, nau: -82, naf: -80, flt: 106, fls: 108, flf: 192, nlt: 106, nls: 108, nlf: 192 }) },
      { t: 1.00, p: pose({ torso: -56, curve: -28, neck: 28, x: 0.08, y: -0.04, fau: -86, faf: -84, nau: -86, naf: -84, flt: 98, fls: 184, flf: 252, nlt: 98, nls: 180, nlf: 248 }) }
    ]
  };

  TRACKS.bss = {
    good: [
      { t: 0.00, p: pose({ torso: 3, nlt: 12, nls: 4, nlf: 92, flt: -34, fls: -96, flf: -24, nau: 2, naf: 3, fau: -2, faf: -3 }) },
      { t: 1.00, p: pose({ torso: 14, neck: -6, y: 0.14, nlt: 30, nls: -4, nlf: 92, flt: -46, fls: -92, flf: -20, nau: 1, naf: 2, fau: -1, faf: -2 }) }
    ],
    bad: [
      { t: 0.00, p: pose({ torso: 6, curve: 8, nlt: 10, nls: 6, nlf: 92, flt: -34, fls: -96, flf: -24, nau: 3, naf: 5, fau: -3, faf: -5 }) },
      { t: 1.00, p: pose({ torso: 40, curve: 22, neck: 12, y: 0.15, nlt: 40, nls: 22, nlf: 74, heelLift: 1, flt: -44, fls: -96, flf: -22, nau: 4, naf: 6, fau: -4, faf: -6 }) }
    ]
  };

  TRACKS.sumo = {
    good: [
      { t: 0.00, p: pose({ nlt: 20, nls: 18, nlf: 118, flt: -20, fls: -18, flf: 62, nau: 2, naf: -6, fau: -2, faf: 6 }) },
      { t: 1.00, p: pose({ y: 0.16, nlt: 32, nls: 3, nlf: 118, flt: -32, fls: -3, flf: 62, nau: 2, naf: -5, fau: -2, faf: 5, torso: 3 }) }
    ],
    bad: [
      { t: 0.00, p: pose({ nlt: 18, nls: 14, nlf: 112, flt: -18, fls: -14, flf: 68, nau: 3, naf: -5, fau: -3, faf: 5 }) },
      { t: 1.00, p: pose({ y: 0.16, torso: 18, curve: 18, neck: 8, nlt: 16, nls: -14, nlf: 108, flt: -16, fls: 14, flf: 72, heelLift: 1, nau: 4, naf: -4, fau: -4, faf: 4 }) }
    ]
  };

  /* Plank base: torso runs up-right from the pelvis, legs down-left,
   * arms straight to the floor. Shoulders, hips and heels on one line. */
  var PLANK_GOOD = {
    torso: 74, curve: 0, neck: -26, y: 0.30,
    fau: 2, faf: 2, nau: 2, naf: 2,
    flt: -74, fls: -74, flf: -8, nlt: -74, nls: -74, nlf: -8
  };

  function plank(over) {
    var o = {};
    var k;
    for (k in PLANK_GOOD) { if (PLANK_GOOD.hasOwnProperty(k)) o[k] = PLANK_GOOD[k]; }
    if (over) { for (k in over) { if (over.hasOwnProperty(k)) o[k] = over[k]; } }
    return pose(o);
  }

  TRACKS.mtn = {
    good: [
      { t: 0.00, p: plank({ nlt: 104, nls: 32, nlf: 100 }) },
      { t: 0.25, p: plank({ nlt: 45, nls: -72, nlf: 26 }) },
      { t: 0.50, p: plank({}) },
      { t: 0.75, p: plank({ flt: 45, fls: -72, flf: 26 }) },
      { t: 1.00, p: plank({ flt: 104, fls: 32, flf: 100 }) }
    ],
    bad: [
      { t: 0.00, p: plank({ y: 0.375, torso: 68, curve: -22, neck: -12, flt: -83, fls: -83, nlt: 96, nls: 28, nlf: 96 }) },
      { t: 0.25, p: plank({ y: 0.38, torso: 67, curve: -24, neck: -11, flt: -83, fls: -83, nlt: 42, nls: -76, nlf: 22 }) },
      { t: 0.50, p: plank({ y: 0.385, torso: 67, curve: -26, neck: -10, flt: -84, fls: -84, nlt: -84, nls: -84 }) },
      { t: 0.75, p: plank({ y: 0.38, torso: 67, curve: -24, neck: -11, nlt: -83, nls: -83, flt: 42, fls: -76, flf: 22 }) },
      { t: 1.00, p: plank({ y: 0.375, torso: 68, curve: -22, neck: -12, nlt: -83, nls: -83, flt: 96, fls: 28, flf: 96 }) }
    ]
  };

  TRACKS.tap = {
    good: [
      { t: 0.00, p: plank({}) },
      { t: 0.28, p: plank({ nau: -58, naf: -132 }) },
      { t: 0.50, p: plank({}) },
      { t: 0.78, p: plank({ fau: -58, faf: -132 }) },
      { t: 1.00, p: plank({}) }
    ],
    bad: [
      { t: 0.00, p: plank({ y: 0.30 }) },
      { t: 0.28, p: plank({ nau: -62, naf: -138, y: 0.245, torso: 67, curve: 12, flt: -84, nlt: -66 }) },
      { t: 0.50, p: plank({ y: 0.30, torso: 76 }) },
      { t: 0.78, p: plank({ fau: -62, faf: -138, y: 0.355, torso: 82, curve: -14, flt: -64, nlt: -86 }) },
      { t: 1.00, p: plank({ y: 0.30 }) }
    ]
  };

  TRACKS.suitcase = {
    good: [
      { t: 0.00, p: pose({ torso: 0, nau: 3, naf: 3, fau: -5, faf: -7, nlt: 3, nls: -2, flt: -3, fls: 2 }) },
      { t: 1.00, p: pose({ torso: 0.6, neck: -0.5, nau: 3, naf: 3, fau: -6, faf: -8, nlt: 3, nls: -2, flt: -3, fls: 2 }) }
    ],
    bad: [
      { t: 0.00, p: pose({ torso: 13, curve: -10, neck: -6, x: -0.02, nau: 8, naf: 9, fau: -12, faf: -18, nlt: 6, nls: -4, flt: -1, fls: 4 }) },
      { t: 1.00, p: pose({ torso: 16, curve: -12, neck: -8, x: -0.025, nau: 9, naf: 10, fau: -14, faf: -20, nlt: 7, nls: -5, flt: -1, fls: 4 }) }
    ]
  };

  TRACKS.idle = {
    good: [
      { t: 0.00, p: pose({ torso: 1, nau: 6, naf: 9, fau: -6, faf: -9, nlt: 2, nls: -1, flt: -2, fls: 1 }) },
      { t: 0.50, p: pose({ torso: 2.5, y: 0.012, neck: -1, nau: 8, naf: 12, fau: -8, faf: -12, nlt: 3, nls: -2, flt: -3, fls: 2 }) },
      { t: 1.00, p: pose({ torso: 1, nau: 6, naf: 9, fau: -6, faf: -9, nlt: 2, nls: -1, flt: -2, fls: 1 }) }
    ]
  };

  TRACKS.cheer = {
    good: [
      { t: 0.00, p: pose({ torso: 0, y: 0.05, nlt: 16, nls: -18, flt: -16, fls: 18, nau: -150, naf: -168, fau: 150, faf: 168 }) },
      { t: 0.45, p: pose({ torso: 0, y: -0.14, neck: -6, nlt: 14, nls: 24, flt: -14, fls: -24, nau: -168, naf: -176, fau: 168, faf: 176 }) },
      { t: 1.00, p: pose({ torso: 0, y: 0.05, nlt: 16, nls: -18, flt: -16, fls: 18, nau: -150, naf: -168, fau: 150, faf: 168 }) }
    ]
  };

  /* ------------------------------------------------------------------ *
   * Rendering
   * ------------------------------------------------------------------ */

  function rad(d) { return d * Math.PI / 180; }
  function dir(a) { var r = rad(a); return { x: Math.sin(r), y: Math.cos(r) }; }
  function add(p, d, len) { return { x: p.x + d.x * len, y: p.y + d.y * len }; }

  function solve(p, view) {
    var hipHalf = view === 'front' ? B.hipHalfFront : B.hipHalfSide;
    var shHalf = view === 'front' ? B.shHalfFront : B.shHalfSide;
    var t = rad(p.torso);
    var up = { x: Math.sin(t), y: -Math.cos(t) };
    var perp = { x: -up.y, y: up.x };

    var pelvis = { x: p.x, y: p.y };
    var neck = add(pelvis, up, B.spine);
    var curveAmt = p.curve * 0.0016;
    var ctrl = {
      x: (pelvis.x + neck.x) / 2 + perp.x * curveAmt * -1 + up.x * 0.02,
      y: (pelvis.y + neck.y) / 2 + perp.y * curveAmt * -1 + up.y * 0.02
    };

    var ha = rad(p.torso + p.neck);
    var headDir = { x: Math.sin(ha), y: -Math.cos(ha) };
    var head = add(neck, headDir, B.neckToHead);

    var farSh = add(neck, perp, -shHalf);
    var nearSh = add(neck, perp, shHalf);
    var farHip = add(pelvis, perp, -hipHalf);
    var nearHip = add(pelvis, perp, hipHalf);

    function arm(sh, u, f) {
      var e = add(sh, dir(u), B.upperArm * p.armScale);
      return { shoulder: sh, elbow: e, wrist: add(e, dir(f), B.foreArm * p.armScale) };
    }
    function leg(hip, tAng, sAng, fAng, sc) {
      var k = add(hip, dir(tAng), B.thigh * sc);
      var a = add(k, dir(sAng), B.shank * sc);
      return { hip: hip, knee: k, ankle: a, toe: add(a, dir(fAng), B.foot * sc) };
    }

    return {
      pelvis: pelvis, neck: neck, ctrl: ctrl, head: head, headDir: headDir,
      up: up, perp: perp,
      farArm: arm(farSh, p.fau, p.faf),
      nearArm: arm(nearSh, p.nau, p.naf),
      farLeg: leg(farHip, p.flt, p.fls, p.flf, p.flScale),
      nearLeg: leg(nearHip, p.nlt, p.nls, p.nlf, p.nlScale)
    };
  }

  /* Screen-space transform for a figure */
  function makeTx(ox, oy, S, mir) {
    return function (pt) { return { x: ox + pt.x * S * mir, y: oy + pt.y * S }; };
  }

  function seg(g, a, b, w, col, S) {
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(5,7,18,0.9)';
    g.lineWidth = w * S + Math.max(2, S * 0.012);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    g.strokeStyle = col;
    g.lineWidth = w * S;
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  }

  function limbChain(g, pts, widths, col, S) {
    for (var i = 0; i < pts.length - 1; i++) seg(g, pts[i], pts[i + 1], widths[i], col, S);
  }

  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
    var gg = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    var b = Math.max(0, Math.min(255, (n & 255) + amt));
    return 'rgb(' + r + ',' + gg + ',' + b + ')';
  }

  function drawTorso(g, s, tx, S, tone) {
    var N = 14, i, u;
    var left = [], right = [];
    for (i = 0; i <= N; i++) {
      u = i / N;
      var a = s.pelvis, c = s.ctrl, b = s.neck;
      var pt = {
        x: (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * c.x + u * u * b.x,
        y: (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * c.y + u * u * b.y
      };
      var d = {
        x: 2 * (1 - u) * (c.x - a.x) + 2 * u * (b.x - c.x),
        y: 2 * (1 - u) * (c.y - a.y) + 2 * u * (b.y - c.y)
      };
      var m = Math.sqrt(d.x * d.x + d.y * d.y) || 1;
      var nx = -d.y / m, ny = d.x / m;
      /* hips, nipped waist, ribcage, then a narrow shoulder yoke */
      var hw = 0.070 - 0.016 * Math.sin(Math.PI * Math.min(1, u * 1.9)) + 0.020 * Math.pow(u, 2.2);
      left.push(tx({ x: pt.x + nx * hw, y: pt.y + ny * hw }));
      right.push(tx({ x: pt.x - nx * hw, y: pt.y - ny * hw }));
    }

    function bandColor(u) {
      if (u < 0.40) return tone.legs;
      if (u < 0.53) return tone.skin;
      return tone.top;
    }
    for (i = 0; i < N; i++) {
      var u0 = i / N;
      g.beginPath();
      g.moveTo(left[i].x, left[i].y);
      g.lineTo(left[i + 1].x, left[i + 1].y);
      g.lineTo(right[i + 1].x, right[i + 1].y);
      g.lineTo(right[i].x, right[i].y);
      g.closePath();
      g.fillStyle = bandColor(u0);
      g.fill();
      /* hairline overdraw kills the seams between strips */
      g.strokeStyle = bandColor(u0);
      g.lineWidth = 1;
      g.stroke();
    }

    g.beginPath();
    g.moveTo(left[0].x, left[0].y);
    for (i = 1; i < left.length; i++) g.lineTo(left[i].x, left[i].y);
    for (i = right.length - 1; i >= 0; i--) g.lineTo(right[i].x, right[i].y);
    g.closePath();
    g.strokeStyle = 'rgba(5,7,18,0.9)';
    g.lineWidth = Math.max(2, S * 0.012);
    g.lineJoin = 'round';
    g.stroke();

    g.beginPath();
    var start = Math.round(N * 0.55);
    for (i = start; i < left.length; i++) {
      if (i === start) g.moveTo(left[i].x, left[i].y); else g.lineTo(left[i].x, left[i].y);
    }
    g.strokeStyle = tone.topLit;
    g.globalAlpha = 0.6;
    g.lineWidth = Math.max(1.5, S * 0.009);
    g.stroke();
    g.globalAlpha = 1;
  }

  function drawYoke(g, s, tx, S, tone) {
    var neck = tx(s.neck), head = tx(s.head);
    g.strokeStyle = tone.skin;
    g.lineCap = 'round';
    g.lineWidth = S * 0.052;
    g.beginPath();
    g.moveTo(neck.x, neck.y);
    g.lineTo(neck.x + (head.x - neck.x) * 0.55, neck.y + (head.y - neck.y) * 0.55);
    g.stroke();
    [s.farArm.shoulder, s.nearArm.shoulder].forEach(function (pt, i) {
      var c = tx(pt);
      g.beginPath();
      g.arc(c.x, c.y, S * 0.037, 0, Math.PI * 2);
      g.fillStyle = i === 0 ? shade(tone.top, -45) : tone.top;
      g.strokeStyle = 'rgba(5,7,18,0.9)';
      g.lineWidth = Math.max(1.5, S * 0.01);
      g.fill();
      g.stroke();
    });
  }

  function drawHead(g, s, tx, S, view, mir, tone, timeMs) {
    var h = tx(s.head);
    var R = B.headR * S;
    var faceX = mir >= 0 ? 1 : -1;

    /* ponytail: sits behind the head and lags the motion */
    var sway = Math.sin(timeMs / 420) * 0.16 + Math.sin(timeMs / 190) * 0.06;
    var back = { x: h.x - faceX * R * 0.85, y: h.y - R * 0.25 };
    var tip = { x: back.x - faceX * R * (2.0 + sway * 0.7), y: back.y + R * (1.5 + sway) };
    var mid = { x: back.x - faceX * R * 1.4, y: back.y - R * 0.15 };
    g.strokeStyle = tone.hair;
    g.lineCap = 'round';
    g.lineWidth = R * 0.78;
    g.beginPath();
    g.moveTo(back.x, back.y);
    g.quadraticCurveTo(mid.x, mid.y, tip.x, tip.y);
    g.stroke();
    g.strokeStyle = 'rgba(124,77,255,0.55)';
    g.lineWidth = R * 0.2;
    g.beginPath();
    g.moveTo(back.x, back.y);
    g.quadraticCurveTo(mid.x, mid.y, tip.x, tip.y);
    g.stroke();

    /* head */
    g.beginPath();
    g.ellipse(h.x, h.y, R * 0.94, R, 0, 0, Math.PI * 2);
    g.fillStyle = tone.skin;
    g.strokeStyle = 'rgba(5,7,18,0.9)';
    g.lineWidth = Math.max(2, S * 0.012);
    g.fill(); g.stroke();

    /* hair cap */
    g.save();
    g.beginPath();
    g.ellipse(h.x, h.y, R * 0.98, R * 1.04, 0, 0, Math.PI * 2);
    g.clip();
    g.beginPath();
    g.ellipse(h.x - faceX * R * 0.36, h.y - R * 0.62, R * 1.00, R * 0.70, 0, 0, Math.PI * 2);
    g.fillStyle = tone.hair;
    g.fill();
    g.beginPath();
    g.ellipse(h.x - faceX * R * 0.66, h.y - R * 0.12, R * 0.56, R * 0.82, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();

    /* eyes */
    g.fillStyle = 'rgba(10,12,26,0.92)';
    if (view === 'front') {
      g.beginPath(); g.ellipse(h.x - R * 0.34, h.y + R * 0.12, R * 0.11, R * 0.15, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(h.x + R * 0.34, h.y + R * 0.12, R * 0.11, R * 0.15, 0, 0, Math.PI * 2); g.fill();
    } else {
      g.beginPath(); g.ellipse(h.x + faceX * R * 0.42, h.y + R * 0.08, R * 0.1, R * 0.14, 0, 0, Math.PI * 2); g.fill();
    }
  }

  function drawFoot(g, ankle, toe, S, view, tone, heelLift) {
    if (view === 'front') {
      g.save();
      g.translate(ankle.x, ankle.y + S * 0.012);
      g.rotate(0);
      g.beginPath();
      g.ellipse(0, 0, S * 0.055, S * 0.032 * (1 - heelLift * 0.35), 0, 0, Math.PI * 2);
      g.fillStyle = tone.shoe;
      g.strokeStyle = 'rgba(5,7,18,0.9)';
      g.lineWidth = Math.max(2, S * 0.011);
      g.fill(); g.stroke();
      g.restore();
    } else {
      seg(g, ankle, toe, 0.042, tone.shoe, S);
    }
  }

  function drawFigure(g, p, view, o) {
    var s = solve(p, view);
    var tx = makeTx(o.ox, o.oy, o.S, o.mir);
    var S = o.S;
    var tone = o.tone;
    var P = {};
    P.pelvis = tx(s.pelvis); P.neck = tx(s.neck); P.head = tx(s.head);
    ['farArm', 'nearArm'].forEach(function (k) {
      P[k] = { shoulder: tx(s[k].shoulder), elbow: tx(s[k].elbow), wrist: tx(s[k].wrist) };
    });
    ['farLeg', 'nearLeg'].forEach(function (k) {
      P[k] = { hip: tx(s[k].hip), knee: tx(s[k].knee), ankle: tx(s[k].ankle), toe: tx(s[k].toe) };
    });

    var farTone = { legs: shade(tone.legs, -22), skin: shade(tone.skin, -40), shoe: shade(tone.shoe, -55) };

    /* far limbs behind the torso */
    limbChain(g, [P.farLeg.hip, P.farLeg.knee, P.farLeg.ankle], [0.062, 0.05], farTone.legs, S);
    drawFoot(g, P.farLeg.ankle, P.farLeg.toe, S, view, farTone, p.heelLift);
    limbChain(g, [P.farArm.shoulder, P.farArm.elbow, P.farArm.wrist], [0.045, 0.038], farTone.skin, S);

    drawTorso(g, s, tx, S, tone);
    drawYoke(g, s, tx, S, tone);
    drawHead(g, s, tx, S, view, o.mir, tone, o.timeMs);

    limbChain(g, [P.nearLeg.hip, P.nearLeg.knee, P.nearLeg.ankle], [0.066, 0.052], tone.legs, S);
    /* a neon stripe down the near leg, for the video-game read */
    g.strokeStyle = 'rgba(124,77,255,0.75)';
    g.lineWidth = Math.max(1.5, S * 0.008);
    g.beginPath();
    g.moveTo(P.nearLeg.hip.x, P.nearLeg.hip.y);
    g.lineTo(P.nearLeg.knee.x, P.nearLeg.knee.y);
    g.lineTo(P.nearLeg.ankle.x, P.nearLeg.ankle.y);
    g.stroke();
    drawFoot(g, P.nearLeg.ankle, P.nearLeg.toe, S, view, tone, p.heelLift);
    limbChain(g, [P.nearArm.shoulder, P.nearArm.elbow, P.nearArm.wrist], [0.048, 0.04], tone.skin, S);

    [[P.farArm.wrist, farTone.skin], [P.nearArm.wrist, tone.skin]].forEach(function (h) {
      g.beginPath();
      g.arc(h[0].x, h[0].y, S * 0.026, 0, Math.PI * 2);
      g.fillStyle = h[1];
      g.strokeStyle = 'rgba(5,7,18,0.9)';
      g.lineWidth = Math.max(1.2, S * 0.008);
      g.fill(); g.stroke();
    });

    return P;
  }

  /* ---------------- equipment ---------------- */

  function plate(g, c, r, S) {
    g.beginPath(); g.arc(c.x, c.y, r, 0, Math.PI * 2);
    g.fillStyle = 'rgba(27,33,69,0.62)'; g.strokeStyle = C.steel;
    g.lineWidth = Math.max(2, S * 0.012); g.fill(); g.stroke();
    g.beginPath(); g.arc(c.x, c.y, r * 0.34, 0, Math.PI * 2);
    g.strokeStyle = C.steelDark; g.stroke();
  }

  function dumbbell(g, c, S, big) {
    var w = S * (big ? 0.105 : 0.088), h = S * (big ? 0.072 : 0.058);
    g.fillStyle = '#232a55'; g.strokeStyle = C.steel;
    g.lineWidth = Math.max(2, S * 0.011);
    [-1, 1].forEach(function (d) {
      g.beginPath();
      g.rect(c.x - w * 0.5 + d * w * 0.42, c.y - h * 0.75, w * 0.42, h * 1.5);
      g.fill(); g.stroke();
    });
    g.beginPath();
    g.rect(c.x - w * 0.22, c.y - h * 0.22, w * 0.44, h * 0.44);
    g.fillStyle = C.steelDark; g.fill(); g.stroke();
  }

  function drawProps(g, ex, P, S, view, mir, variant) {
    var floorY = null;
    if (ex.id === 'rdl') {
      var wr = P.nearArm.wrist;
      var barHalf = S * 0.17;
      g.strokeStyle = C.steel;
      g.lineWidth = Math.max(3, S * 0.018);
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(wr.x - barHalf, wr.y); g.lineTo(wr.x + barHalf, wr.y); g.stroke();
      plate(g, { x: wr.x - barHalf * 0.74, y: wr.y }, S * 0.078, S);
      plate(g, { x: wr.x + barHalf * 0.74, y: wr.y }, S * 0.078, S);
    } else if (ex.id === 'legcurl') {
      var hip = P.pelvis, hd = P.head;
      g.fillStyle = 'rgba(28,34,72,0.95)';
      g.strokeStyle = C.steelDark;
      g.lineWidth = Math.max(2, S * 0.011);
      var bx = Math.min(hd.x, hip.x) - S * 0.05;
      var bw = Math.abs(hip.x - hd.x) + S * 0.14;
      g.beginPath(); g.rect(bx, hip.y + S * 0.055, bw, S * 0.075); g.fill(); g.stroke();
      var ank = P.nearLeg.ankle;
      g.fillStyle = '#39406f';
      [0, 1].forEach(function (i) {
        g.beginPath();
        g.arc(ank.x + (i ? S * 0.055 : -S * 0.02), ank.y + (i ? S * 0.02 : -S * 0.03), S * 0.042, 0, Math.PI * 2);
        g.fill(); g.stroke();
      });
    } else if (ex.id === 'bss') {
      var far = P.farLeg.ankle;
      g.fillStyle = 'rgba(24,30,64,0.92)';
      g.strokeStyle = C.steelDark;
      g.lineWidth = Math.max(2, S * 0.011);
      g.beginPath(); g.rect(far.x - S * 0.26, far.y + S * 0.02, S * 0.34, S * 0.05); g.fill(); g.stroke();
      g.beginPath();
      g.rect(far.x - S * 0.21, far.y + S * 0.07, S * 0.045, S * 0.30);
      g.rect(far.x - S * 0.02, far.y + S * 0.07, S * 0.045, S * 0.30);
      g.fill(); g.stroke();
      dumbbell(g, P.nearArm.wrist, S, false);
      dumbbell(g, P.farArm.wrist, S, false);
    } else if (ex.id === 'sumo') {
      var c = { x: (P.nearArm.wrist.x + P.farArm.wrist.x) / 2, y: (P.nearArm.wrist.y + P.farArm.wrist.y) / 2 + S * 0.05 };
      g.strokeStyle = C.steel;
      g.lineWidth = Math.max(3, S * 0.016);
      g.beginPath();
      g.arc(c.x, c.y - S * 0.05, S * 0.045, Math.PI, Math.PI * 2);
      g.stroke();
      g.beginPath(); g.arc(c.x, c.y + S * 0.02, S * 0.062, 0, Math.PI * 2);
      g.fillStyle = '#232a55'; g.fill(); g.stroke();
    } else if (ex.id === 'suitcase') {
      dumbbell(g, P.nearArm.wrist, S, true);
    }
    return floorY;
  }

  /* ---------------- coaching annotations ---------------- */

  function dash(g, pts, col, S) {
    g.save();
    g.setLineDash([S * 0.035, S * 0.028]);
    g.strokeStyle = col;
    g.lineWidth = Math.max(2, S * 0.013);
    g.lineCap = 'butt';
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.stroke();
    g.restore();
  }

  function arrow(g, from, to, col, S) {
    g.save();
    g.strokeStyle = col; g.fillStyle = col;
    g.lineWidth = Math.max(2.5, S * 0.016);
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(from.x, from.y); g.lineTo(to.x, to.y); g.stroke();
    var a = Math.atan2(to.y - from.y, to.x - from.x);
    var hl = S * 0.05;
    g.beginPath();
    g.moveTo(to.x, to.y);
    g.lineTo(to.x - hl * Math.cos(a - 0.42), to.y - hl * Math.sin(a - 0.42));
    g.lineTo(to.x - hl * Math.cos(a + 0.42), to.y - hl * Math.sin(a + 0.42));
    g.closePath(); g.fill();
    g.restore();
  }

  function joint(g, pt, col, S, timeMs) {
    var pulse = 1 + Math.sin(timeMs / 260) * 0.18;
    g.save();
    g.beginPath();
    g.arc(pt.x, pt.y, S * 0.062 * pulse, 0, Math.PI * 2);
    g.fillStyle = col;
    g.globalAlpha = 0.22;
    g.fill();
    g.globalAlpha = 1;
    g.beginPath();
    g.arc(pt.x, pt.y, S * 0.032, 0, Math.PI * 2);
    g.strokeStyle = col;
    g.lineWidth = Math.max(2, S * 0.013);
    g.stroke();
    g.restore();
  }

  function drawAnnotation(g, ex, P, S, variant, timeMs, mir) {
    var col = variant === 'good' ? C.good : C.bad;
    var k = ex.align;
    if (k === 'plank') {
      dash(g, [P.nearArm.shoulder, P.pelvis, P.farLeg.ankle], col, S);
      if (variant === 'bad') {
        joint(g, P.pelvis, C.bad, S, timeMs);
        if (ex.id === 'mtn') {
          arrow(g, { x: P.pelvis.x, y: P.pelvis.y - S * 0.2 }, { x: P.pelvis.x, y: P.pelvis.y - S * 0.03 }, C.bad, S);
        } else {
          arrow(g, { x: P.pelvis.x - S * 0.16, y: P.pelvis.y - S * 0.14 }, { x: P.pelvis.x + S * 0.16, y: P.pelvis.y - S * 0.14 }, C.bad, S);
        }
      }
    } else if (k === 'spine') {
      dash(g, [P.pelvis, P.neck], col, S);
      if (variant === 'bad') {
        joint(g, { x: (P.pelvis.x + P.neck.x) / 2, y: (P.pelvis.y + P.neck.y) / 2 }, C.bad, S, timeMs);
        arrow(g, P.nearArm.wrist, { x: P.nearArm.wrist.x + mir * S * 0.16, y: P.nearArm.wrist.y }, C.bad, S);
      }
    } else if (k === 'knee') {
      var kn = P.nearLeg.knee, an = P.nearLeg.ankle, hp = P.nearLeg.hip;
      dash(g, [{ x: an.x, y: hp.y }, an], variant === 'good' ? C.good : 'rgba(255,255,255,0.26)', S);
      if (variant === 'good') {
        dash(g, [hp, kn, an], C.good, S);
      } else {
        joint(g, kn, C.bad, S, timeMs);
        if (ex.view === 'side') {
          /* the knee travelling forward past the toes */
          arrow(g, { x: kn.x - mir * S * 0.04, y: kn.y - S * 0.09 }, { x: kn.x + mir * S * 0.15, y: kn.y - S * 0.09 }, C.bad, S);
        } else {
          arrow(g, { x: kn.x + mir * S * 0.2, y: kn.y - S * 0.03 }, { x: kn.x + mir * S * 0.06, y: kn.y - S * 0.01 }, C.bad, S);
        }
      }
    } else if (k === 'plumb') {
      var top = { x: P.pelvis.x, y: P.head.y - S * 0.1 };
      var bot = { x: P.pelvis.x, y: P.nearLeg.ankle.y + S * 0.04 };
      dash(g, [top, bot], variant === 'good' ? C.good : 'rgba(255,255,255,0.22)', S);
      if (variant === 'bad') {
        dash(g, [P.head, P.pelvis, P.nearLeg.ankle], C.bad, S);
        joint(g, P.nearArm.shoulder, C.bad, S, timeMs);
      }
    } else if (k === 'hipline') {
      var y = P.pelvis.y;
      dash(g, [{ x: P.pelvis.x - S * 0.3, y: y }, { x: P.pelvis.x + S * 0.3, y: y }], col, S);
      if (variant === 'bad') {
        joint(g, P.pelvis, C.bad, S, timeMs);
        arrow(g, { x: P.pelvis.x, y: P.pelvis.y + S * 0.02 }, { x: P.pelvis.x, y: P.pelvis.y - S * 0.18 }, C.bad, S);
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * Scene: background, panels, figure fitting
   * ------------------------------------------------------------------ */

  var fitCache = {};

  function trackFor(id, variant) {
    var t = TRACKS[id];
    if (!t) return TRACKS.idle.good;
    return t[variant] || t.good;
  }

  function fitBox(id, view) {
    if (fitCache[id]) return fitCache[id];
    var box = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, floor: -1e9 };
    ['good', 'bad'].forEach(function (v) {
      var track = trackFor(id, v);
      for (var i = 0; i <= 16; i++) {
        var s = solve(sampleTrack(track, i / 16), view);
        var pts = [s.pelvis, s.neck, s.head,
          s.farArm.elbow, s.farArm.wrist, s.nearArm.elbow, s.nearArm.wrist,
          s.farLeg.knee, s.farLeg.ankle, s.farLeg.toe,
          s.nearLeg.knee, s.nearLeg.ankle, s.nearLeg.toe];
        for (var j = 0; j < pts.length; j++) {
          box.x0 = Math.min(box.x0, pts[j].x); box.x1 = Math.max(box.x1, pts[j].x);
          box.y0 = Math.min(box.y0, pts[j].y); box.y1 = Math.max(box.y1, pts[j].y);
        }
        if (v === 'good') {
          /* one fixed floor per exercise, set by the planted hands */
          box.floor = Math.max(box.floor, s.nearArm.wrist.y, s.farArm.wrist.y);
        }
      }
    });
    /* padding for head, props and annotations */
    box.x0 -= 0.13; box.x1 += 0.13; box.y0 -= 0.14; box.y1 += 0.07;
    fitCache[id] = box;
    return box;
  }

  function drawBackground(g, w, h, timeMs) {
    var grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, C.bg0);
    grad.addColorStop(0.55, '#0e1230');
    grad.addColorStop(1, C.bg1);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    /* soft neon bloom behind the trainer */
    var r = Math.max(w, h) * 0.55;
    var rg = g.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, r);
    rg.addColorStop(0, 'rgba(124,77,255,0.20)');
    rg.addColorStop(0.6, 'rgba(45,226,230,0.06)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, w, h);

    /* perspective grid floor */
    g.save();
    g.strokeStyle = C.grid;
    g.lineWidth = 1;
    var hor = h * 0.66;
    for (var i = -8; i <= 8; i++) {
      g.beginPath();
      g.moveTo(w * 0.5 + i * w * 0.055, hor);
      g.lineTo(w * 0.5 + i * w * 0.5, h + 10);
      g.stroke();
    }
    var scroll = (timeMs / 3400) % 1;
    for (var k = 0; k < 9; k++) {
      var u = (k + scroll) / 9;
      var y = hor + (h - hor) * u * u;
      g.globalAlpha = 0.25 + u * 0.5;
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    }
    g.restore();
  }

  function panelFrame(g, x, y, w, h, col, label, S) {
    var r = Math.min(18, w * 0.08);
    g.save();
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
    g.fillStyle = 'rgba(8,11,28,0.5)';
    g.fill();
    g.strokeStyle = col;
    g.lineWidth = 2;
    g.globalAlpha = 0.75;
    g.stroke();
    g.globalAlpha = 1;
    g.restore();

    if (label) {
      var fs = Math.max(10, Math.min(13, w * 0.075));
      g.save();
      g.font = '700 ' + fs + 'px ' + FONT_UI;
      var tw = g.measureText(label).width;
      var bw = tw + fs * 1.6, bh = fs * 1.9;
      var bx = x + w / 2 - bw / 2, by = y - bh / 2;
      g.beginPath();
      g.moveTo(bx + bh / 2, by);
      g.arcTo(bx + bw, by, bx + bw, by + bh, bh / 2);
      g.arcTo(bx + bw, by + bh, bx, by + bh, bh / 2);
      g.arcTo(bx, by + bh, bx, by, bh / 2);
      g.arcTo(bx, by, bx + bw, by, bh / 2);
      g.closePath();
      g.fillStyle = col;
      g.fill();
      g.fillStyle = '#080a1b';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.letterSpacing = '1px';
      g.fillText(label, x + w / 2, by + bh / 2 + 0.5);
      g.letterSpacing = '0px';
      g.restore();
    }
  }

  var IDLE_EX = { id: 'idle', view: 'front', align: null };
  var CHEER_EX = { id: 'cheer', view: 'front', align: null };

  var FONT_UI = 'Inter, system-ui, -apple-system, sans-serif';
  var FONT_DISPLAY = '"Bebas Neue", Inter, system-ui, sans-serif';

  function drawFigureInPanel(g, ex, variant, phase, x, y, w, h, timeMs, mir, opts) {
    var view = ex ? ex.view : 'front';
    var id = ex ? ex.id : 'idle';
    var box = fitBox(id, view);
    var bw = box.x1 - box.x0, bh = box.y1 - box.y0;
    var pad = 0.96;
    var S = Math.min(w / bw, h / bh) * pad;
    var cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
    var ox = x + w / 2 - cx * S * mir;
    var oy = y + h / 2 - cy * S;
    var p = sampleTrack(trackFor(id, variant), phase);
    g.save();
    g.beginPath(); g.rect(x - 4, y - 4, w + 8, h + 8); g.clip();
    if (ex && (ex.id === 'mtn' || ex.id === 'tap')) {
      var fy = oy + box.floor * S + S * 0.012;
      g.strokeStyle = 'rgba(45,226,230,0.42)';
      g.lineWidth = Math.max(2, S * 0.012);
      g.beginPath(); g.moveTo(x, fy); g.lineTo(x + w, fy); g.stroke();
    }
    var P = drawFigure(g, p, view, {
      ox: ox, oy: oy, S: S, mir: mir, timeMs: timeMs,
      tone: { legs: C.legs, skin: C.skin, top: C.top, topLit: C.topLit, hair: C.hair, shoe: variant === 'bad' ? '#6d7ab0' : C.shoe }
    });
    if (ex) drawProps(g, ex, P, S, view, mir, variant);
    if (ex && (!opts || opts.annotate !== false)) drawAnnotation(g, ex, P, S, variant, timeMs, mir);
    g.restore();
    return S;
  }

  /* ------------------------------------------------------------------ *
   * Bit
   * ------------------------------------------------------------------ */

  window.plethoraBit = {
    meta: { name: 'Thursday Trainer' },

    async init(ctx) {
      var canvas = ctx.createCanvas2D({ touchAction: 'manipulation' });
      var g = canvas.getContext('2d');
      var root = ctx.createRoot({ touchAction: 'manipulation' });
      var haptics = !!(ctx.capabilities && ctx.capabilities.haptics);
      var canStore = !!(ctx.capabilities && ctx.capabilities.storage);
      var canMusic = !!(ctx.capabilities && ctx.capabilities.backgroundMusic);

      /* ---------------- state ---------------- */

      var S = {
        screen: 'intro',
        ex: 0,
        set: 0,
        profile: { level: 1, kit: 'dumbbell' },
        weights: {},
        sessions: 0,
        lastSession: null,
        log: [],
        quoteBag: [],
        started: false,
        musicOn: canMusic,
        showFault: false,
        speed: 1
      };

      var engine = {
        running: false, t: 0, reps: 0, phase: 0,
        seconds: 0, done: false, lastBeat: -1
      };

      var scene = { mode: 'idle', phase: 0, ex: null, variant: 'good', mir: 1 };
      var stageRect = { x: 0, y: 0, w: ctx.width, h: ctx.height * 0.5 };
      var music = null;
      var restLeft = 0;
      var timeMs = 0;

      /* ---------------- persistence ---------------- */

      var STORE_KEY = 'thursday_v1';

      async function loadState() {
        var data = null;
        try {
          if (canStore) data = await ctx.storage.get(STORE_KEY);
        } catch (e) { data = null; }
        if (!data) {
          try {
            var m = await ctx.memory.local('thursday_state').get();
            data = m && m.value ? m.value : m;
          } catch (e2) { data = null; }
        }
        if (data && typeof data === 'object') {
          if (data.profile) S.profile = data.profile;
          if (data.weights) S.weights = data.weights;
          if (typeof data.sessions === 'number') S.sessions = data.sessions;
          if (data.lastSession) S.lastSession = data.lastSession;
        }
      }

      async function saveState() {
        var payload = {
          profile: S.profile, weights: S.weights,
          sessions: S.sessions, lastSession: S.lastSession
        };
        try { if (canStore) await ctx.storage.set(STORE_KEY, payload); } catch (e) { /* viewer-local only */ }
        try { await ctx.memory.local('thursday_state').set(payload); } catch (e2) { /* optional */ }
      }

      /* ---------------- helpers ---------------- */

      function ex() { return WORKOUT[S.ex]; }
      function setsTotal(e) { return e.perSide ? e.sets * 2 : e.sets; }
      function sideLabel(e, i) { return e.perSide ? (i % 2 === 0 ? 'Right' : 'Left') : ''; }
      function setNumber(e, i) { return e.perSide ? Math.floor(i / 2) + 1 : i + 1; }

      function nextQuote() {
        if (!S.quoteBag.length) S.quoteBag = QUOTES.slice();
        var i = Math.floor(Math.random() * S.quoteBag.length);
        return S.quoteBag.splice(i, 1)[0];
      }

      function roundKg(v) { return Math.max(0, Math.round(v / 2.5) * 2.5); }

      function suggestedWeight(e) {
        if (!e.weight) return null;
        if (S.profile.kit === 'bodyweight') return { text: e.weight.bodyweight, kg: null };
        if (S.weights[e.id] != null) return { kg: S.weights[e.id] };
        var table = e.weight[S.profile.kit] || e.weight.dumbbell;
        return { kg: table[S.profile.level] };
      }

      function weightText(e) {
        var w = suggestedWeight(e);
        if (!w) return 'Bodyweight';
        if (w.kg == null) return w.text;
        var lb = Math.round(w.kg * 2.20462 / 5) * 5;
        var per = (S.profile.kit === 'dumbbell' && (e.id === 'bss' || e.id === 'rdl')) ? ' per hand' : '';
        return w.kg + ' kg' + per + '  ·  ~' + lb + ' lb';
      }

      function applyRpe(e, verdict) {
        if (!e.weight || S.profile.kit === 'bodyweight') return;
        var cur = suggestedWeight(e).kg;
        if (cur == null) return;
        var next = cur;
        if (verdict === 'easy') next = roundKg(cur * 1.08 + 1.5);
        else if (verdict === 'stopped') next = roundKg(cur * 0.88);
        S.weights[e.id] = Math.max(2.5, next);
      }

      function cycleMs(e) {
        var t = e.tempo;
        return t.down + t.hold + t.up + t.top;
      }

      function phaseOf(e, t) {
        var m = e.tempo;
        if (e.id === 'mtn' || e.id === 'tap' || e.id === 'suitcase') return (t / cycleMs(e)) % 1;
        if (t < m.down) return t / m.down;
        if (t < m.down + m.hold) return 1;
        if (t < m.down + m.hold + m.up) return 1 - (t - m.down - m.hold) / m.up;
        return 0;
      }

      function repsPerCycle(e) { return e.id === 'tap' ? 2 : 1; }

      function beatIndex(e, t) {
        var c = cycleMs(e);
        return Math.floor((t / c) * 4) % 4;
      }

      function haptic(kind) {
        if (!haptics) return;
        try { ctx.platform.haptic(kind); } catch (e) { /* optional */ }
      }

      function sting(name) {
        if (!music || !S.musicOn) return;
        try { ctx.music.sting(name); } catch (e) { /* optional */ }
      }

      async function musicPreset(name, tempo) {
        if (!canMusic || !S.musicOn) return;
        try {
          if (!music) {
            music = await ctx.music.play({ preset: name, volume: 0.4, tempo: tempo || 100, fadeInMs: 900 });
          } else {
            ctx.music.setPreset(name, { fadeMs: 700 });
            if (tempo) ctx.music.setTempo(tempo);
          }
        } catch (e) { music = music || null; }
      }

      function progress() {
        var total = 0, done = 0;
        for (var i = 0; i < WORKOUT.length; i++) {
          var t = setsTotal(WORKOUT[i]);
          total += t;
          if (i < S.ex) done += t;
          else if (i === S.ex) done += S.set;
        }
        return total ? done / total : 0;
      }

      /* ---------------- shell ---------------- */

      var style = document.createElement('style');
      style.textContent = [
        '.tt{position:absolute;inset:0;display:flex;flex-direction:column;',
        'font-family:' + FONT_UI + ';color:' + C.ink + ';-webkit-user-select:none;user-select:none;overflow:hidden;}',
        '.tt *{box-sizing:border-box;}',
        '.hd{flex:0 0 auto;padding:10px 16px 6px;}',
        '.hdrow{display:flex;align-items:center;gap:10px;}',
        '.chip{font:700 11px/1 ' + FONT_UI + ';letter-spacing:1.4px;text-transform:uppercase;',
        'padding:6px 10px;border-radius:999px;background:rgba(255,46,136,0.18);color:' + C.hotSoft + ';border:1px solid rgba(255,46,136,0.45);white-space:nowrap;}',
        '.hdname{font:700 17px/1.15 ' + FONT_UI + ';flex:1;min-width:0;}',
        '.hdsub{font:500 11.5px/1.3 ' + FONT_UI + ';color:' + C.dim + ';margin-top:3px;}',
        '.iconbtn{flex:0 0 auto;width:34px;height:34px;border-radius:50%;border:1px solid rgba(244,246,255,0.22);',
        'background:rgba(255,255,255,0.06);color:' + C.ink + ';font:700 15px/1 ' + FONT_UI + ';display:flex;align-items:center;justify-content:center;}',
        '.bar{height:5px;border-radius:99px;background:rgba(255,255,255,0.10);margin-top:9px;overflow:hidden;}',
        '.barfill{height:100%;border-radius:99px;background:linear-gradient(90deg,' + C.hot + ',' + C.glow + ');transition:width .35s ease;}',
        '.stage{flex:1 1 auto;min-height:0;position:relative;}',
        '.panel{flex:0 0 auto;padding:2px 16px 0;max-height:66%;overflow-y:auto;-webkit-overflow-scrolling:touch;}',
        '.title{font:800 40px/0.95 ' + FONT_DISPLAY + ';letter-spacing:2px;text-transform:uppercase;}',
        '.lede{font:500 14px/1.45 ' + FONT_UI + ';color:' + C.dim + ';margin-top:10px;}',
        '.btn{display:block;width:100%;margin-top:12px;padding:16px 18px;border:0;border-radius:16px;',
        'font:800 15px/1 ' + FONT_UI + ';letter-spacing:0.4px;color:#0a0c1e;background:linear-gradient(135deg,' + C.glow + ',#7ef0d0);',
        'box-shadow:0 8px 22px rgba(45,226,230,0.28);}',
        '.btn:active{transform:translateY(1px);}',
        '.btn.alt{background:rgba(255,255,255,0.08);color:' + C.ink + ';border:1px solid rgba(244,246,255,0.22);box-shadow:none;}',
        '.btn.hot{background:linear-gradient(135deg,' + C.hot + ',#ff7ab8);color:#fff;box-shadow:0 8px 22px rgba(255,46,136,0.3);}',
        '.row{display:flex;gap:10px;}',
        '.row>*{flex:1;}',
        '.cue{display:flex;gap:9px;align-items:flex-start;padding:11px 12px;border-radius:13px;font:600 12.5px/1.4 ' + FONT_UI + ';}',
        '.cue.g{background:rgba(61,220,132,0.12);border:1px solid rgba(61,220,132,0.34);color:#c8ffe0;}',
        '.cue.b{background:rgba(255,77,94,0.12);border:1px solid rgba(255,77,94,0.34);color:#ffd2d6;margin-top:8px;}',
        '.cue b{display:block;font:800 10px/1 ' + FONT_UI + ';letter-spacing:1.3px;text-transform:uppercase;margin-bottom:5px;opacity:.85;}',
        '.card{margin-top:10px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,0.055);border:1px solid rgba(244,246,255,0.14);}',
        '.card .k{font:800 10px/1 ' + FONT_UI + ';letter-spacing:1.4px;text-transform:uppercase;color:' + C.faint + ';}',
        '.card .v{font:800 20px/1.2 ' + FONT_UI + ';margin-top:6px;}',
        '.card .n{font:500 11.5px/1.4 ' + FONT_UI + ';color:' + C.dim + ';margin-top:5px;}',
        '.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px;}',
        '.opt{flex:1 1 30%;padding:12px 8px;border-radius:13px;text-align:center;border:1px solid rgba(244,246,255,0.18);',
        'background:rgba(255,255,255,0.05);font:700 12.5px/1.2 ' + FONT_UI + ';color:' + C.ink + ';}',
        '.opt small{display:block;font:500 10.5px/1.3 ' + FONT_UI + ';color:' + C.faint + ';margin-top:4px;}',
        '.opt.on{background:rgba(45,226,230,0.16);border-color:' + C.glow + ';color:#dffcff;}',
        '.count{font:800 66px/0.9 ' + FONT_DISPLAY + ';letter-spacing:1px;text-align:center;}',
        '.countsub{text-align:center;font:700 11px/1 ' + FONT_UI + ';letter-spacing:1.6px;text-transform:uppercase;color:' + C.faint + ';margin-top:7px;}',
        '.beat{text-align:center;font:700 15px/1.3 ' + FONT_UI + ';color:' + C.glow + ';margin-top:12px;min-height:20px;}',
        '.quote{font:600 16px/1.5 ' + FONT_UI + ';text-align:center;padding:0 6px;}',
        '.speed{display:flex;align-items:center;gap:10px;margin-top:12px;}',
        '.speed span{font:700 10px/1 ' + FONT_UI + ';letter-spacing:1.2px;text-transform:uppercase;color:' + C.faint + ';}',
        'input[type=range]{flex:1;accent-color:' + C.glow + ';height:26px;}',
        '.sheet{position:absolute;inset:0;background:rgba(6,8,22,0.94);padding:22px 20px;overflow:auto;z-index:5;}',
        '.sheet h3{font:800 22px/1.1 ' + FONT_DISPLAY + ';letter-spacing:1.5px;text-transform:uppercase;margin:0 0 12px;}',
        '.sheet li{font:500 13.5px/1.55 ' + FONT_UI + ';color:' + C.dim + ';margin-bottom:9px;}',
        '.hidden{display:none;}',
        '.recap{max-height:34vh;overflow:auto;margin-top:10px;}',
        '.rline{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:11px;background:rgba(255,255,255,0.045);margin-bottom:6px;',
        'font:600 12.5px/1.2 ' + FONT_UI + ';}',
        '.rline i{font-style:normal;color:' + C.good + ';font-weight:800;}',
        '.rline u{margin-left:auto;text-decoration:none;color:' + C.faint + ';font-weight:600;}',
        '.note{font:500 10.5px/1.45 ' + FONT_UI + ';color:' + C.faint + ';margin-top:10px;}'
      ].join('');
      root.appendChild(style);

      var wrap = document.createElement('div');
      wrap.className = 'tt';
      var safe = ctx.safeArea || {};
      wrap.style.paddingTop = (safe.top || 0) + 'px';
      wrap.style.paddingBottom = ((safe.bottom || 0) + 24) + 'px';
      wrap.innerHTML =
        '<div class="hd" id="hd"></div>' +
        '<div class="stage" id="stage"></div>' +
        '<div class="panel" id="panel"></div>';
      root.appendChild(wrap);

      var sheet = document.createElement('div');
      sheet.className = 'sheet hidden';
      sheet.id = 'sheet';
      root.appendChild(sheet);

      var elHd = wrap.querySelector('#hd');
      var elStage = wrap.querySelector('#stage');
      var elPanel = wrap.querySelector('#panel');

      function measure() {
        var cr = ctx.container.getBoundingClientRect();
        var sr = elStage.getBoundingClientRect();
        stageRect = { x: sr.left - cr.left, y: sr.top - cr.top, w: sr.width, h: sr.height };
      }

      /* ---------------- screens ---------------- */

      function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

      function headerFor(e, extra) {
        var pct = Math.round(progress() * 100);
        return '' +
          '<div class="hdrow">' +
            '<div class="chip">Level ' + (S.ex + 1) + '/7</div>' +
            '<div class="hdname">' + esc(e.name) + '<div class="hdsub">' + esc(extra || e.target) + '</div></div>' +
            '<button class="iconbtn" data-act="help">?</button>' +
          '</div>' +
          '<div class="bar"><div class="barfill" style="width:' + pct + '%"></div></div>';
      }

      function show(name) {
        S.screen = name;
        engine.running = false;
        var e = WORKOUT[S.ex];

        if (name === 'intro') {
          scene.mode = 'idle'; scene.ex = null;
          elHd.innerHTML = '<div class="hdrow"><div class="chip">Thursday</div><div class="hdname"></div>' +
            '<button class="iconbtn" data-act="help">?</button></div>';
          elPanel.innerHTML =
            '<div class="title">Thursday<br>Trainer</div>' +
            '<div class="lede">Seven levels. Legs, then core. I demonstrate every rep, show you the mistake to avoid, and count you through it.' +
            (S.sessions > 0 ? ' <b style="color:' + C.glow + '">This is Thursday #' + (S.sessions + 1) + '.</b>' : '') +
            '</div>' +
            '<button class="btn" data-act="tosetup">Set up today’s session</button>' +
            '<div class="note">Not medical advice. Start lighter than you think and stop any rep that hurts.</div>';
        }

        else if (name === 'setup') {
          scene.mode = 'idle'; scene.ex = null;
          elHd.innerHTML = '<div class="hdrow"><div class="chip">Before we lift</div><div class="hdname"></div>' +
            '<button class="iconbtn" data-act="help">?</button></div>';
          var lv = S.profile.level, kit = S.profile.kit;
          elPanel.innerHTML =
            '<div class="card"><div class="k">How long have you been lifting?</div>' +
              '<div class="chips">' +
                '<div class="opt' + (lv === 0 ? ' on' : '') + '" data-act="lv" data-v="0">New<small>0–3 months</small></div>' +
                '<div class="opt' + (lv === 1 ? ' on' : '') + '" data-act="lv" data-v="1">A while<small>3–12 months</small></div>' +
                '<div class="opt' + (lv === 2 ? ' on' : '') + '" data-act="lv" data-v="2">Regular<small>1 year+</small></div>' +
              '</div></div>' +
            '<div class="card"><div class="k">What do you have today?</div>' +
              '<div class="chips">' +
                '<div class="opt' + (kit === 'barbell' ? ' on' : '') + '" data-act="kit" data-v="barbell">Full gym<small>bar + machines</small></div>' +
                '<div class="opt' + (kit === 'dumbbell' ? ' on' : '') + '" data-act="kit" data-v="dumbbell">Dumbbells<small>home setup</small></div>' +
                '<div class="opt' + (kit === 'bodyweight' ? ' on' : '') + '" data-act="kit" data-v="bodyweight">Nothing<small>bodyweight</small></div>' +
              '</div></div>' +
            '<button class="btn" data-act="begin">Start level 1</button>' +
            '<div class="note">' + (Object.keys(S.weights).length
              ? 'Loaded your weights from last Thursday. They adjust after every set.'
              : 'I will suggest a starting weight for each lift, then adjust it from how each set felt.') + '</div>';
        }

        else if (name === 'brief') {
          scene.mode = 'split'; scene.ex = e; scene.phase = 0; scene.mir = 1;
          elHd.innerHTML = headerFor(e, e.target + '  ·  ' + setsTotal(e) + ' sets of ' +
            (e.mode === 'time' ? e.seconds + 's' : e.reps));
          var w = e.weight ? '<div class="card"><div class="k">Today’s load</div><div class="v">' + esc(weightText(e)) + '</div>' +
            '<div class="n">' + (S.weights[e.id] != null ? 'Adjusted from your last set.' : 'Starting point — leave two reps in the tank.') + '</div></div>' : '';
          elPanel.innerHTML =
            '<div class="cue g"><div><b>Do this</b>' + esc(e.goodCue) + '</div></div>' +
            '<div class="cue b"><div><b>Not this — ' + esc(e.fault) + '</b>' + esc(e.faultCue) + '</div></div>' +
            w +
            '<button class="btn" data-act="startset">Start set ' + setNumber(e, S.set) + (e.perSide ? ' · ' + sideLabel(e, S.set) : '') + '</button>';
        }

        else if (name === 'set') {
          scene.mode = 'single'; scene.ex = e; scene.variant = 'good';
          scene.mir = e.perSide && S.set % 2 === 1 ? -1 : 1;
          engine.t = 0; engine.reps = 0; engine.phase = 0; engine.done = false;
          engine.seconds = e.mode === 'time' ? e.seconds : 0;
          engine.running = true;
          engine.lastBeat = -1;
          elHd.innerHTML = headerFor(e, 'Set ' + setNumber(e, S.set) + ' of ' + e.sets +
            (e.perSide ? '  ·  ' + sideLabel(e, S.set) + ' side' : '') + '  ·  follow her tempo');
          elPanel.innerHTML =
            '<div class="count" id="count">0</div>' +
            '<div class="countsub" id="countsub"></div>' +
            '<div class="beat" id="beat"></div>' +
            '<div class="speed"><span>Slower</span><input type="range" id="speed" min="60" max="150" value="' +
              Math.round(S.speed * 100) + '" data-act="speed"><span>Faster</span></div>' +
            '<div class="row">' +
              '<button class="btn alt" data-act="pause" id="pausebtn">Pause</button>' +
              (e.mode === 'time'
                ? '<button class="btn alt" data-act="fault">' + (S.showFault ? 'Hide mistake' : 'See mistake') + '</button>'
                : '<button class="btn alt" data-act="rep">Count a rep</button>') +
            '</div>' +
            (e.mode === 'time' ? '' : '<button class="btn alt" data-act="fault" style="margin-top:8px">' +
              (S.showFault ? 'Hide the mistake' : 'Show me the mistake again') + '</button>');
          refreshCounters();
        }

        else if (name === 'rpe') {
          scene.mode = 'idle'; scene.ex = null;
          elHd.innerHTML = headerFor(e, 'Set ' + setNumber(e, S.set) + ' logged');
          elPanel.innerHTML =
            '<div class="card"><div class="k">How did that set feel?</div>' +
              '<div class="n">This is how I pick your next weight.</div>' +
              '<div class="chips">' +
                '<div class="opt" data-act="rpe" data-v="easy">Easy<small>had plenty left</small></div>' +
                '<div class="opt" data-act="rpe" data-v="right">Just right<small>2 reps left</small></div>' +
                '<div class="opt" data-act="rpe" data-v="brutal">Brutal<small>barely finished</small></div>' +
                '<div class="opt" data-act="rpe" data-v="stopped">Had to stop<small>form went</small></div>' +
              '</div></div>';
        }

        else if (name === 'rest') {
          scene.mode = 'idle'; scene.ex = null;
          var nxt = nextUpText();
          elHd.innerHTML = headerFor(e, 'Rest');
          elPanel.innerHTML =
            '<div class="count" id="count">' + restLeft + '</div>' +
            '<div class="countsub">seconds rest</div>' +
            '<div class="card"><div class="quote" id="quote">' + esc(nextQuote()) + '</div></div>' +
            '<div class="card"><div class="k">Next up</div><div class="v" style="font-size:16px">' + esc(nxt) + '</div></div>' +
            '<button class="btn" data-act="skiprest">I’m ready — go now</button>';
        }

        else if (name === 'finish') {
          scene.mode = 'cheer'; scene.ex = null;
          elHd.innerHTML = '<div class="hdrow"><div class="chip">Session complete</div><div class="hdname"></div>' +
            '<button class="iconbtn" data-act="help">?</button></div>' +
            '<div class="bar"><div class="barfill" style="width:100%"></div></div>';
          var lines = S.log.map(function (l) {
            return '<div class="rline"><i>✓</i>' + esc(l.name) + '<u>' + esc(l.detail) + '</u></div>';
          }).join('');
          elPanel.innerHTML =
            '<div class="title" style="font-size:34px">You did<br>good.</div>' +
            '<div class="lede">All seven levels, done. That is the whole Thursday — hamstrings, glutes and core, every set honest.</div>' +
            '<div class="recap">' + lines + '</div>' +
            '<button class="btn hot" data-act="replay">Run Thursday again</button>';
        }

        measure();
      }

      function nextUpText() {
        var e = WORKOUT[S.ex];
        if (!e) return 'The finish line';
        return 'Level ' + (S.ex + 1) + ' — ' + e.name +
          '  ·  set ' + setNumber(e, S.set) + (e.perSide ? ' · ' + sideLabel(e, S.set) : '');
      }

      function refreshCounters() {
        var e = WORKOUT[S.ex];
        var c = elPanel.querySelector('#count');
        var sub = elPanel.querySelector('#countsub');
        if (!c) return;
        if (e.mode === 'time') {
          c.textContent = Math.max(0, Math.ceil(engine.seconds));
          if (sub) sub.textContent = 'seconds left' + (e.perSide ? '  ·  ' + sideLabel(e, S.set) + ' hand' : '');
        } else {
          c.textContent = Math.min(engine.reps, e.reps);
          if (sub) sub.textContent = 'of ' + e.reps + ' reps';
        }
      }

      /* ---------------- flow ---------------- */

      function startSet() {
        firstGesture();
        musicPreset(WORKOUT[S.ex].mode === 'time' ? 'techno' : 'arcade', 108);
        show('set');
      }

      function completeSet() {
        var e = WORKOUT[S.ex];
        engine.running = false;
        haptic('success');
        sting('success');
        try { ctx.platform.milestone('set_complete', { exercise: e.id, set: S.set + 1 }); } catch (err) { /* ignore */ }
        if (e.weight && S.profile.kit !== 'bodyweight') show('rpe');
        else afterSet();
      }

      function afterSet() {
        var e = WORKOUT[S.ex];
        var detail = e.mode === 'time'
          ? setsTotal(e) + ' × ' + e.seconds + 's'
          : setsTotal(e) + ' × ' + e.reps + (e.weight && S.profile.kit !== 'bodyweight' && suggestedWeight(e).kg != null
            ? ' @ ' + suggestedWeight(e).kg + 'kg' : '');
        S.set += 1;
        try { ctx.platform.setProgress(progress()); } catch (err) { /* ignore */ }

        if (S.set >= setsTotal(e)) {
          S.log.push({ name: e.name, detail: detail });
          haptic('heavy');
          try { ctx.platform.milestone('level_clear', { level: S.ex + 1, exercise: e.id }); } catch (err2) { /* ignore */ }
          S.ex += 1;
          S.set = 0;
          if (S.ex >= WORKOUT.length) return finishSession();
          restLeft = 60;
          musicPreset('lofi', 84);
          show('rest');
          return;
        }
        restLeft = WORKOUT[S.ex].weight ? 60 : 40;
        musicPreset('drift', 88);
        show('rest');
      }

      async function finishSession() {
        S.sessions += 1;
        S.lastSession = new Date().toISOString().slice(0, 10);
        await saveState();
        try { await ctx.memory.record('thursday_streak').submit(S.sessions, { label: S.sessions + ' Thursdays' }); } catch (e) { /* optional */ }
        musicPreset('triumph', 100);
        sting('win');
        haptic('success');
        try { ctx.platform.setProgress(1); ctx.platform.complete({ sessions: S.sessions }); } catch (e2) { /* ignore */ }
        show('finish');
      }

      function firstGesture() {
        if (S.started) return;
        S.started = true;
        try { ctx.platform.start(); } catch (e) { /* ignore */ }
        if (canMusic) {
          try { ctx.music.unlock(); } catch (e2) { /* ignore */ }
          musicPreset('lofi', 88);
        }
      }

      /* ---------------- input ---------------- */

      var INSTRUCTIONS = [
        'Seven exercises, seven levels. Clear all the sets in a level to unlock the next one.',
        'Before each level you see the movement done right (green) next to the mistake most people make (red). Tap <b>Show me the mistake</b> any time during a set to see it again.',
        'The trainer sets the tempo. Follow her — the counter ticks when she finishes a rep.',
        'Tap <b>Count a rep</b> if you are ahead of her, or drag the speed slider to match your own pace.',
        'After every weighted set, tell me how it felt. That is what picks your weight for the next set and for next Thursday.',
        'Green dashed lines are your alignment guides. Red circles mark the joint that is about to go wrong.',
        'Pause any time. Nothing expires while you rest.'
      ];

      function toggleSheet(force) {
        var open = force !== undefined ? force : sheet.classList.contains('hidden');
        if (open) {
          sheet.innerHTML = '<h3>How this works</h3><ol>' +
            INSTRUCTIONS.map(function (t) { return '<li>' + t + '</li>'; }).join('') +
            '</ol><button class="btn" data-act="closehelp">Got it</button>' +
            '<div class="note">Weight suggestions are a starting point, not coaching or medical advice. If a rep hurts, stop it.</div>';
          sheet.classList.remove('hidden');
        } else {
          sheet.classList.add('hidden');
        }
      }

      ctx.listen(root, 'click', function (ev) {
        var t = ev.target;
        while (t && t !== root && !t.getAttribute('data-act')) t = t.parentNode;
        if (!t || t === root) return;
        var act = t.getAttribute('data-act');
        var v = t.getAttribute('data-v');
        firstGesture();
        haptic('light');
        try { ctx.platform.interact({ act: act }); } catch (e) { /* ignore */ }

        if (act === 'help') { toggleSheet(true); return; }
        if (act === 'closehelp') { toggleSheet(false); return; }
        if (act === 'tosetup') { show('setup'); return; }
        if (act === 'lv') { S.profile.level = parseInt(v, 10); saveState(); show('setup'); return; }
        if (act === 'kit') { S.profile.kit = v; saveState(); show('setup'); return; }
        if (act === 'begin') { S.ex = 0; S.set = 0; S.log = []; show('brief'); return; }
        if (act === 'startset') { startSet(); return; }
        if (act === 'pause') {
          engine.running = !engine.running;
          var b = elPanel.querySelector('#pausebtn');
          if (b) b.textContent = engine.running ? 'Pause' : 'Resume';
          return;
        }
        if (act === 'rep') {
          var e = WORKOUT[S.ex];
          var per = repsPerCycle(e);
          engine.t = (engine.reps + 1) * (cycleMs(e) / per);
          return;
        }
        if (act === 'fault') {
          S.showFault = !S.showFault;
          Array.prototype.forEach.call(elPanel.querySelectorAll('[data-act="fault"]'), function (btn) {
            btn.textContent = S.showFault ? 'Hide the mistake' : 'Show me the mistake';
          });
          return;
        }
        if (act === 'rpe') {
          applyRpe(WORKOUT[S.ex], v);
          saveState();
          afterSet();
          return;
        }
        if (act === 'skiprest') { restLeft = 0; return; }
        if (act === 'replay') {
          S.ex = 0; S.set = 0; S.log = []; S.showFault = false;
          show('setup');
          return;
        }
      });

      ctx.listen(root, 'input', function (ev) {
        if (ev.target && ev.target.getAttribute('data-act') === 'speed') {
          S.speed = parseInt(ev.target.value, 10) / 100;
        }
      });

      ctx.listen(window, 'resize', measure);

      /* ---------------- frame loop ---------------- */

      function update(dt) {
        if (S.screen === 'set' && engine.running) {
          var e = WORKOUT[S.ex];
          engine.t += dt * S.speed;
          engine.phase = phaseOf(e, engine.t);
          scene.phase = engine.phase;

          var b = beatIndex(e, engine.t);
          if (b !== engine.lastBeat) {
            engine.lastBeat = b;
            var el = elPanel.querySelector('#beat');
            if (el) el.textContent = e.beats[b];
          }

          if (e.mode === 'time') {
            engine.seconds -= dt / 1000;
            refreshCounters();
            if (engine.seconds <= 0) { completeSet(); return; }
          } else {
            var reps = Math.floor(engine.t / (cycleMs(e) / repsPerCycle(e)));
            if (reps > engine.reps) {
              engine.reps = reps;
              haptic('light');
              refreshCounters();
              if (engine.reps >= e.reps) { completeSet(); return; }
            }
          }
        } else if (S.screen === 'rest') {
          restLeft -= dt / 1000;
          var c = elPanel.querySelector('#count');
          if (c) c.textContent = Math.max(0, Math.ceil(restLeft));
          if (restLeft <= 0) {
            sting('tap');
            show('brief');
          }
        } else {
          scene.phase = (timeMs / 2600) % 1;
        }
      }

      function draw() {
        var w = ctx.width, h = ctx.height;
        drawBackground(g, w, h, timeMs);
        var r = stageRect;
        if (!r.w || !r.h) return;

        if (scene.mode === 'split' && scene.ex) {
          var gap = Math.max(10, r.w * 0.03);
          var pw = (r.w - gap) / 2;
          var ph = Math.min(r.h - 18, pw * 1.45);
          var py = r.y + (r.h - ph) / 2 + 6;
          panelFrame(g, r.x, py, pw, ph, C.good, 'RIGHT', 0);
          panelFrame(g, r.x + pw + gap, py, pw, ph, C.bad, 'WRONG', 0);
          drawFigureInPanel(g, scene.ex, 'good', scene.phase, r.x, py, pw, ph, timeMs, 1);
          drawFigureInPanel(g, scene.ex, 'bad', scene.phase, r.x + pw + gap, py, pw, ph, timeMs, 1);
        } else if (scene.mode === 'single' && scene.ex) {
          drawFigureInPanel(g, scene.ex, 'good', scene.phase, r.x, r.y, r.w, r.h, timeMs, scene.mir);
          if (S.showFault) {
            var iw = Math.min(r.w * 0.34, 150);
            var ih = iw * 1.3;
            var ix = r.x + r.w - iw - 6;
            var iy = r.y + 8;
            panelFrame(g, ix, iy, iw, ih, C.bad, 'WRONG', 0);
            drawFigureInPanel(g, scene.ex, 'bad', scene.phase, ix, iy, iw, ih, timeMs, 1);
          }
        } else {
          var fh = Math.min(r.h, r.w * 1.25);
          var ghost = scene.mode === 'cheer' ? CHEER_EX : IDLE_EX;
          drawFigureInPanel(g, ghost, 'good', scene.phase, r.x, r.y + (r.h - fh) / 2, r.w, fh, timeMs, 1, { annotate: false });
        }
      }

      ctx.onFrame(function (dt, t) {
        timeMs = t;
        update(Math.min(dt, 64));
        draw();
      });

      /* ---------------- boot ---------------- */

      try {
        await ctx.loadFont('Inter', 'inter', '1.0.0', { weight: '400' });
        await ctx.loadFont('Inter', 'inter', '1.0.0', { weight: '700' });
        await ctx.loadFont('Bebas Neue', 'bebas-neue', '1.0.0', { weight: '400' });
      } catch (e) { /* system font fallback */ }

      await loadState();
      show('intro');
      measure();
      draw();
      ctx.markVisualReady('first-frame');
      ctx.platform.ready();
    }
  };
})();
