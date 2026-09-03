/* Gym Trainer - a Plethora Bit
 * runtime: plethora-bit@2
 *
 * A five-day training week with an animated coach. There are no rep counters
 * and no countdowns: every exercise is one continuous demonstration in two
 * parts - SETUP, which is how you stand and pick the weight up, and TRAIN,
 * which is the working posture - and you tap Done when you have finished it.
 * Reps and load live in the description, not on a timer.
 *
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
   * the pelvis, (sin a, -cos a): 0 is upright, + leans right (forward).
   *
   * fa/fb = far arm upper/fore, na/nb = near arm upper/fore.
   * ft/fs/fo = far leg thigh/shank/foot, nt/ns/no = near leg.
   * The far limbs are drawn behind the torso, the near ones in front.
   *
   * Poses are written as a short string so 33 exercises fit inside the
   * draft validator's source budget:
   *
   *   q('to45 cu-6 ne-20 nt55 ns-65 no84')
   *
   * is the same pose as { torso: 45, curve: -6, neck: -20, ... }.
   * ------------------------------------------------------------------ */

  var CODES = {
    x: 'x', y: 'y', to: 'torso', cu: 'curve', ne: 'neck',
    fa: 'fau', fb: 'faf', na: 'nau', nb: 'naf',
    ft: 'flt', fs: 'fls', fo: 'flf',
    nt: 'nlt', ns: 'nls', no: 'nlf',
    fz: 'flScale', nz: 'nlScale', az: 'armScale', hl: 'heelLift'
  };

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
  var TOKEN = /^([a-z]+)(-?[0-9.]+)$/;

  function q(s) {
    var p = {}, i;
    for (i = 0; i < POSE_KEYS.length; i++) p[POSE_KEYS[i]] = REST[POSE_KEYS[i]];
    if (!s) return p;
    var parts = s.split(' ');
    for (i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      var m = TOKEN.exec(parts[i]);
      if (!m || !CODES[m[1]]) throw new Error('bad pose token: ' + parts[i]);
      p[CODES[m[1]]] = parseFloat(m[2]);
    }
    return p;
  }

  /* 'time|pose' strings, ascending, describing one full cycle over 0..1 */
  function tr() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) {
      var bar = arguments[i].indexOf('|');
      out.push({ t: parseFloat(arguments[i].slice(0, bar)), p: q(arguments[i].slice(bar + 1)) });
    }
    return out;
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
