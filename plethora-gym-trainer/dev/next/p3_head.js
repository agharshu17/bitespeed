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
    var w = S * (big ? 0.10 : 0.085), r = S * (big ? 0.030 : 0.025);
    g.strokeStyle = C.steel;
    g.lineWidth = Math.max(2, S * 0.013);
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(c.x - w * 0.5, c.y); g.lineTo(c.x + w * 0.5, c.y); g.stroke();
    g.fillStyle = '#2b3363';
    for (var d = -1; d <= 1; d += 2) {
      g.beginPath(); g.arc(c.x + d * w * 0.5, c.y, r, 0, Math.PI * 2);
      g.fill(); g.stroke();
    }
  }


