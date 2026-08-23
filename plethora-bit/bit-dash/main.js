window.plethoraBit = {
  async init(ctx) {
    const canvas = ctx.createCanvas2D({ touchAction: 'none' });
    const g = canvas.getContext('2d');

    const LANES = 3;
    const PLAYER_SIZE = 44;
    const OBJ_SIZE = 40;
    const COLLISION_BAND = 34;

    let state = 'start'; // 'start' | 'playing' | 'gameover'
    let playerLane = 1;
    let playerRenderX = 0;
    let score = 0;
    let bestScore = null;
    let elapsed = 0;
    let speed = 220;
    let spawnTimer = 0;
    let objects = [];
    let tier = 0;
    let flashText = null;
    let musicHandle = null;

    function laneCenters() {
      const w = ctx.width;
      return [w / 6, w / 2, (w * 5) / 6];
    }

    function playerY() {
      return ctx.height - Math.max(ctx.safeArea.bottom + 64, 96);
    }

    function safeHaptic(kind) {
      if (ctx.capabilities.haptics) {
        try { ctx.platform.haptic(kind); } catch (e) {}
      }
    }

    function safeSting(name) {
      if (musicHandle) {
        try { musicHandle.sting(name).catch(() => {}); } catch (e) {}
      }
    }

    function currentSpawnInterval() {
      return Math.max(0.9 - speed * 0.0011, 0.32);
    }

    function resetRun() {
      playerLane = 1;
      playerRenderX = laneCenters()[1];
      score = 0;
      elapsed = 0;
      speed = 220;
      spawnTimer = 0.4;
      objects = [];
      tier = 0;
      flashText = null;
    }

    function startRun() {
      resetRun();
      state = 'playing';
      ctx.platform.start({ mode: 'run' });
      ctx.platform.setScore(0);
      if (ctx.capabilities.backgroundMusic) {
        ctx.music.unlock().catch(() => {});
        try {
          musicHandle = ctx.music.play({ preset: 'chiptune', volume: 0.45, tempo: 132, scale: 'minorPentatonic' });
        } catch (e) {
          musicHandle = null;
        }
      }
    }

    async function endRun() {
      state = 'gameover';
      ctx.platform.setScore(score);
      ctx.platform.fail({ score, elapsedMs: Math.round(elapsed * 1000) });
      safeHaptic('error');
      safeSting('fail');
      if (musicHandle) {
        try { musicHandle.stop({ fadeOutMs: 350 }); } catch (e) {}
        musicHandle = null;
      }
      try {
        await ctx.memory.record('bits_collected').submit(score, { label: `${score} bits` });
      } catch (e) {
        ctx.platform.error({ message: 'record submit failed', detail: String((e && e.message) || e) });
      }
      try {
        const board = await ctx.memory.record('bits_collected').leaderboard({ scope: 'global', period: 'all_time' });
        if (board && board.entries && board.entries.length) {
          bestScore = board.entries[0].value;
        }
      } catch (e) {
        // leaderboard is a nice-to-have; ignore failures
      }
    }

    function laneFromX(x) {
      const w = ctx.width;
      if (x < w / 3) return 0;
      if (x < (2 * w) / 3) return 1;
      return 2;
    }

    function onTap(x) {
      if (state === 'start' || state === 'gameover') {
        startRun();
        return;
      }
      const lane = laneFromX(x);
      if (lane !== playerLane) {
        playerLane = lane;
        ctx.platform.interact({ action: 'move', lane });
        safeHaptic('light');
      }
    }

    ctx.listen(canvas, 'pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      onTap(e.clientX - rect.left);
    }, { passive: true });

    function spawnObject() {
      const lane = Math.floor(Math.random() * LANES);
      const isGood = Math.random() < 0.62;
      objects.push({ lane, y: -OBJ_SIZE, type: isGood ? 'good' : 'bad', size: OBJ_SIZE, hit: false });
    }

    function update(dtMs) {
      if (state !== 'playing') return;
      const dt = Math.min(dtMs, 50) / 1000;
      elapsed += dt;

      const nextTier = Math.floor(elapsed / 10);
      if (nextTier > tier) {
        tier = nextTier;
        speed = Math.min(220 + tier * 55, 780);
        flashText = { text: 'SPEED UP', until: elapsed + 0.9 };
        ctx.platform.milestone('speed_tier_' + tier, { speed });
        safeHaptic('medium');
        safeSting('powerup');
      }

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnObject();
        spawnTimer = currentSpawnInterval();
      }

      const pY = playerY();
      for (let i = objects.length - 1; i >= 0; i--) {
        const o = objects[i];
        o.y += speed * dt;
        if (!o.hit && o.lane === playerLane && Math.abs(o.y - pY) < COLLISION_BAND) {
          o.hit = true;
          if (o.type === 'good') {
            score += 1;
            ctx.platform.setScore(score);
            ctx.platform.interact({ action: 'collect', score });
            safeHaptic('light');
            safeSting('coin');
            objects.splice(i, 1);
            continue;
          }
          objects.splice(i, 1);
          endRun();
          return;
        }
        if (o.y - o.size > ctx.height + 40) {
          objects.splice(i, 1);
        }
      }

      const targetX = laneCenters()[playerLane];
      playerRenderX += (targetX - playerRenderX) * Math.min(dt * 12, 1);
    }

    function roundRect(x, y, w, h, r) {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    }

    function drawBackground() {
      const w = ctx.width, h = ctx.height;
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#050814');
      grad.addColorStop(1, '#0b1230');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);

      const lanes = laneCenters();
      g.strokeStyle = 'rgba(80, 220, 255, 0.12)';
      g.lineWidth = 2;
      for (const lx of [(lanes[0] + lanes[1]) / 2, (lanes[1] + lanes[2]) / 2]) {
        g.beginPath();
        g.moveTo(lx, 0);
        g.lineTo(lx, h);
        g.stroke();
      }
    }

    function drawBit(x, y, size, fill, glow, label) {
      g.save();
      g.translate(x, y);
      g.fillStyle = fill;
      g.shadowColor = glow;
      g.shadowBlur = 18;
      roundRect(-size / 2, -size / 2, size, size, size * 0.26);
      g.fill();
      g.shadowBlur = 0;
      g.fillStyle = '#04101a';
      g.font = `bold ${Math.round(size * 0.48)}px monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, 0, 1);
      g.restore();
    }

    function drawObjects() {
      const lanes = laneCenters();
      for (const o of objects) {
        const good = o.type === 'good';
        drawBit(
          lanes[o.lane], o.y, o.size,
          good ? 'rgba(60, 240, 170, 0.95)' : 'rgba(255, 70, 95, 0.95)',
          good ? 'rgba(60,240,170,0.7)' : 'rgba(255,70,95,0.7)',
          good ? '1' : '0'
        );
      }
    }

    function drawPlayer() {
      drawBit(playerRenderX, playerY(), PLAYER_SIZE, 'rgba(120, 200, 255, 0.97)', 'rgba(120,200,255,0.85)', '1');
    }

    function drawHud() {
      const top = ctx.safeArea.top + 28;
      g.textAlign = 'left';
      g.textBaseline = 'top';
      g.fillStyle = 'rgba(230, 245, 255, 0.92)';
      g.font = 'bold 26px monospace';
      g.fillText(String(score).padStart(3, '0'), 20, top);

      g.textAlign = 'right';
      g.font = '14px monospace';
      g.fillStyle = 'rgba(150, 200, 255, 0.7)';
      g.fillText('bitespeed x' + (1 + tier * 0.25).toFixed(2), ctx.width - 20, top + 6);

      if (flashText && elapsed < flashText.until) {
        g.textAlign = 'center';
        g.font = 'bold 22px monospace';
        g.fillStyle = 'rgba(255, 220, 90, 0.9)';
        g.fillText(flashText.text, ctx.width / 2, top + 40);
      }
    }

    function drawButton(cx, cy, label) {
      const bw = 220, bh = 56;
      g.save();
      g.fillStyle = 'rgba(120, 200, 255, 0.16)';
      g.strokeStyle = 'rgba(120, 200, 255, 0.85)';
      g.lineWidth = 2;
      roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 14);
      g.fill();
      g.stroke();
      g.fillStyle = '#e9f6ff';
      g.font = 'bold 16px monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, cx, cy + 1);
      g.restore();
    }

    function drawStartOverlay() {
      const w = ctx.width, h = ctx.height;
      g.fillStyle = 'rgba(4, 8, 20, 0.55)';
      g.fillRect(0, 0, w, h);

      g.textAlign = 'center';
      g.textBaseline = 'alphabetic';
      g.fillStyle = '#e9f6ff';
      g.font = 'bold 40px monospace';
      g.fillText('BIT DASH', w / 2, h * 0.32);

      g.font = '15px monospace';
      g.fillStyle = 'rgba(210, 230, 255, 0.85)';
      g.fillText('Tap a lane to dash there.', w / 2, h * 0.32 + 34);
      g.fillText('Grab clean 1s. Dodge corrupted 0s.', w / 2, h * 0.32 + 56);
      g.fillText('Speed climbs the longer you survive.', w / 2, h * 0.32 + 78);

      drawButton(w / 2, h * 0.62, 'TAP TO START');
    }

    function drawGameOverOverlay() {
      const w = ctx.width, h = ctx.height;
      g.fillStyle = 'rgba(4, 8, 20, 0.68)';
      g.fillRect(0, 0, w, h);

      g.textAlign = 'center';
      g.textBaseline = 'alphabetic';
      g.fillStyle = '#ff6b7a';
      g.font = 'bold 32px monospace';
      g.fillText('OVERLOAD', w / 2, h * 0.32);

      g.fillStyle = '#e9f6ff';
      g.font = 'bold 24px monospace';
      g.fillText(score + ' bits collected', w / 2, h * 0.32 + 48);

      if (bestScore !== null) {
        g.font = '14px monospace';
        g.fillStyle = 'rgba(210, 230, 255, 0.75)';
        g.fillText('Global best: ' + bestScore, w / 2, h * 0.32 + 78);
      }

      drawButton(w / 2, h * 0.62, 'TAP TO RESTART');
    }

    function draw() {
      drawBackground();
      if (state === 'playing') {
        drawObjects();
        drawPlayer();
        drawHud();
      } else if (state === 'start') {
        drawHud();
        drawStartOverlay();
      } else {
        drawObjects();
        drawPlayer();
        drawHud();
        drawGameOverOverlay();
      }
    }

    playerRenderX = laneCenters()[1];
    draw();
    ctx.platform.ready();

    ctx.onFrame((dtMs) => {
      update(dtMs);
      draw();
    });

    ctx.onDestroy(() => {
      if (musicHandle) {
        try { musicHandle.stop({ fadeOutMs: 0 }); } catch (e) {}
      }
    });
  }
};
