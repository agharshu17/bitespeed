  function fitBox(id, view) {
    if (fitCache[id]) return fitCache[id];
    var box = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9, floor: -1e9 };
    ['setup', 'train'].forEach(function (v) {
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
        /* one fixed floor per exercise, set by the planted hands */
        box.floor = Math.max(box.floor, s.nearArm.wrist.y, s.farArm.wrist.y);
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

  var IDLE_EX = { id: 'idle', vw: 'front', al: null, pr: null };
  var CHEER_EX = { id: 'cheer', vw: 'front', al: null, pr: null };

  var FONT_UI = 'Inter, system-ui, -apple-system, sans-serif';
  var FONT_DISPLAY = '"Bebas Neue", Inter, system-ui, sans-serif';

  function drawFigureInPanel(g, ex, variant, phase, x, y, w, h, timeMs, mir, opts) {
    var view = ex ? ex.vw : 'front';
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
    if (ex && ex.al === 'plank') {
      var fy = oy + box.floor * S + S * 0.012;
      g.strokeStyle = 'rgba(45,226,230,0.42)';
      g.lineWidth = Math.max(2, S * 0.012);
      g.beginPath(); g.moveTo(x, fy); g.lineTo(x + w, fy); g.stroke();
    }
    var P = drawFigure(g, p, view, {
      ox: ox, oy: oy, S: S, mir: mir, timeMs: timeMs,
      tone: { legs: C.legs, skin: C.skin, top: C.top, topLit: C.topLit, hair: C.hair, shoe: C.shoe }
    });
    if (ex && ex.pr) drawProps(g, ex, P, S, view, mir);
    if (ex && (!opts || opts.annotate !== false)) drawAnnotation(g, ex, P, S);
    g.restore();
    return S;
  }

