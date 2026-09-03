  /* ---------------- equipment rigs ---------------- */

  function bar(g, c, S, half) {
    var h = S * (half || 0.19);
    g.strokeStyle = C.steel;
    g.lineWidth = Math.max(3, S * 0.018);
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(c.x - h, c.y); g.lineTo(c.x + h, c.y); g.stroke();
    plate(g, { x: c.x - h * 0.78, y: c.y }, S * 0.078, S);
    plate(g, { x: c.x + h * 0.78, y: c.y }, S * 0.078, S);
  }

  function pad(g, x, y, w, h, S) {
    g.fillStyle = 'rgba(26,32,68,0.94)';
    g.strokeStyle = C.steelDark;
    g.lineWidth = Math.max(2, S * 0.011);
    g.beginPath(); g.rect(x, y, w, h); g.fill(); g.stroke();
  }

  function cable(g, a, b, S) {
    g.strokeStyle = 'rgba(143,155,196,0.85)';
    g.lineWidth = Math.max(1.5, S * 0.008);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  }

  function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

  function drawProps(g, ex, P, S, view, mir) {
    var pr = ex.pr, nw = P.nearArm.wrist, fw = P.farArm.wrist, c = mid(nw, fw);
    var na = P.nearLeg.ankle, fa = P.farLeg.ankle, pv = P.pelvis;

    if (pr === 'bar') {
      bar(g, nw, S, 0.19);
    } else if (pr === 'db2') {
      dumbbell(g, nw, S, false);
      dumbbell(g, fw, S, false);
    } else if (pr === 'db1') {
      dumbbell(g, nw, S, true);
    } else if (pr === 'goblet') {
      /* one dumbbell stood on its end, cupped against the chest */
      g.strokeStyle = C.steel;
      g.lineWidth = Math.max(3, S * 0.016);
      g.beginPath(); g.arc(c.x, c.y - S * 0.05, S * 0.045, Math.PI, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(c.x, c.y + S * 0.02, S * 0.062, 0, Math.PI * 2);
      g.fillStyle = '#232a55'; g.fill(); g.stroke();
    } else if (pr === 'box') {
      /* a knee-high bench standing behind her, wherever the back foot is */
      var bx = fa.x - S * 0.30, by = fa.y - S * 0.06;
      pad(g, bx, by, S * 0.44, S * 0.05, S);
      pad(g, bx + S * 0.04, by + S * 0.05, S * 0.045, S * 0.30, S);
      pad(g, bx + S * 0.33, by + S * 0.05, S * 0.045, S * 0.30, S);
      dumbbell(g, nw, S, false);
    } else if (pr === 'bench' || pr === 'incline' || pr === 'decline') {
      /* the pad runs along her back, so it follows the torso line */
      var a = P.pelvis, b = P.neck;
      var dx = b.x - a.x, dy = b.y - a.y;
      var L2 = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / L2, ny = dx / L2;
      var t = S * 0.075;
      g.fillStyle = 'rgba(26,32,68,0.94)';
      g.strokeStyle = C.steelDark;
      g.lineWidth = Math.max(2, S * 0.011);
      g.beginPath();
      g.moveTo(a.x + nx * t - dx * 0.18, a.y + ny * t - dy * 0.18);
      g.lineTo(b.x + nx * t + dx * 0.24, b.y + ny * t + dy * 0.24);
      g.lineTo(b.x + nx * t * 2.6 + dx * 0.24, b.y + ny * t * 2.6 + dy * 0.24);
      g.lineTo(a.x + nx * t * 2.6 - dx * 0.18, a.y + ny * t * 2.6 - dy * 0.18);
      g.closePath(); g.fill(); g.stroke();
      if (pr === 'bench') bar(g, nw, S, 0.20);
      else { dumbbell(g, nw, S, false); dumbbell(g, fw, S, false); }
    } else if (pr === 'legext' || pr === 'legcurl') {
      pad(g, pv.x - S * 0.30, pv.y + S * 0.05, S * 0.42, S * 0.07, S);       /* seat */
      pad(g, pv.x - S * 0.34, pv.y - S * 0.34, S * 0.07, S * 0.40, S);       /* back rest */
      g.fillStyle = '#39406f';
      g.strokeStyle = C.steelDark;
      g.beginPath();
      g.arc(na.x + S * 0.03, na.y + (pr === 'legcurl' ? -S * 0.05 : S * 0.02), S * 0.045, 0, Math.PI * 2);
      g.fill(); g.stroke();
    } else if (pr === 'cablerow') {
      pad(g, pv.x - S * 0.26, pv.y + S * 0.05, S * 0.40, S * 0.07, S);
      pad(g, na.x + S * 0.02, na.y - S * 0.10, S * 0.08, S * 0.26, S);        /* foot plate */
      cable(g, nw, { x: nw.x + S * 0.80, y: nw.y + S * 0.04 }, S);
      g.fillStyle = C.steelDark;
      g.beginPath(); g.arc(nw.x, nw.y, S * 0.035, 0, Math.PI * 2); g.fill();
    } else if (pr === 'latpull') {
      pad(g, pv.x - S * 0.26, pv.y + S * 0.05, S * 0.40, S * 0.07, S);
      pad(g, pv.x - S * 0.10, pv.y - S * 0.06, S * 0.34, S * 0.06, S);        /* thigh pad */
      bar(g, nw, S, 0.24);
      cable(g, nw, { x: nw.x, y: nw.y - S * 1.1 }, S);
    } else if (pr === 'chestmachine') {
      pad(g, pv.x - S * 0.30, pv.y + S * 0.05, S * 0.42, S * 0.07, S);
      var bb = P.neck;
      pad(g, bb.x - S * 0.30, bb.y - S * 0.14, S * 0.08, S * 0.46, S);
      g.fillStyle = C.steelDark;
      [nw, fw].forEach(function (w) {
        g.beginPath(); g.arc(w.x, w.y, S * 0.038, 0, Math.PI * 2); g.fill();
      });
    } else if (pr === 'step') {
      /* the toes sit on a step so the heel has somewhere to drop below */
      var tx = Math.min(P.nearLeg.toe.x, P.farLeg.toe.x) - S * 0.05;
      var ty = Math.max(P.nearLeg.toe.y, P.farLeg.toe.y) - S * 0.005;
      pad(g, tx, ty, S * 0.24, S * 0.055, S);
      dumbbell(g, nw, S, false);
      dumbbell(g, fw, S, false);
    } else if (pr === 'dip') {
      g.strokeStyle = C.steel;
      g.lineWidth = Math.max(3, S * 0.017);
      g.lineCap = 'round';
      [nw, fw].forEach(function (w) {
        g.beginPath();
        g.moveTo(w.x - S * 0.16, w.y); g.lineTo(w.x + S * 0.16, w.y);
        g.stroke();
      });
    }
  }

  /* ---------------- alignment guides ---------------- *
   * Correct form only. There is no wrong-form variant anywhere in this
   * Bit: the guide traces the line the body should be holding.
   * ------------------------------------------------------------------ */

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

  function drawAnnotation(g, ex, P, S) {
    var col = 'rgba(61,220,132,0.85)';
    var k = ex.al;
    if (!k) return;
    if (k === 'plank') {
      dash(g, [P.nearArm.shoulder, P.pelvis, P.farLeg.ankle], col, S);
    } else if (k === 'spine') {
      dash(g, [P.pelvis, P.neck], col, S);
    } else if (k === 'knee') {
      var kn = P.nearLeg.knee, an = P.nearLeg.ankle, hp = P.nearLeg.hip;
      dash(g, [{ x: an.x, y: hp.y }, an], 'rgba(255,255,255,0.22)', S);
      dash(g, [hp, kn, an], col, S);
    } else if (k === 'plumb') {
      dash(g, [{ x: P.pelvis.x, y: P.head.y - S * 0.1 },
        { x: P.pelvis.x, y: P.nearLeg.ankle.y + S * 0.04 }], col, S);
    } else if (k === 'hipline') {
      dash(g, [{ x: P.pelvis.x - S * 0.3, y: P.pelvis.y },
        { x: P.pelvis.x + S * 0.3, y: P.pelvis.y }], col, S);
    } else if (k === 'stack') {
      dash(g, [P.nearArm.wrist, P.nearArm.shoulder], col, S);
    } else if (k === 'elbow') {
      dash(g, [P.nearArm.shoulder, P.nearArm.elbow, P.nearArm.wrist], col, S);
    }
  }

  /* ------------------------------------------------------------------ *
   * Scene: background, panels, figure fitting
   * ------------------------------------------------------------------ */

  var fitCache = {};

  function trackFor(id, variant) {
    var e = EX[id];
    if (!e) return IDLE_TRACK;
    return variant === 'setup' ? e.st : e.tk;
  }

