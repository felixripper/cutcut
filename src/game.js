export function initGame(canvasEl, configData, assetsData, onGameOver, hudEl, centerEl) {
  "use strict";
  // === Config init ===
  function initConfig() {
    let config = configData;
    window.addEventListener("message", (event) => {
      if (event.data?.type === "UPDATE_CONFIG") {
        Object.assign(config, event.data.config);
        if (window.onConfigUpdate) window.onConfigUpdate(config);
      }
      if (event.data?.type === "UPDATE_ASSETS") {
        ASSETS = event.data.assets;
        reloadAssets();
      }
    });
    return config;
  }
  const CONFIG = initConfig();

  // === Assets init ===
  let ASSETS = {};
  const loadedImages = {};
  const loadedSounds = {};
  function initAssets() {
    ASSETS = assetsData;
    loadAssets();
  }
  function loadAssets() {
    // Sounds as HTMLAudio fallback; also provide procedural audio via WebAudio
    ["slice", "land", "fail"].forEach((k) => {
      const url = ASSETS?.sounds?.[k];
      if (url) loadedSounds[k] = new Audio(url);
    });
  }
  function reloadAssets() {
    ["slice", "land", "fail"].forEach((k) => {
      const url = ASSETS?.sounds?.[k];
      if (!loadedSounds[k] && url) loadedSounds[k] = new Audio(url);
      if (loadedSounds[k] && url) loadedSounds[k].src = url;
    });
  }
  initAssets();

  // === Canvas & scaling ===
  const canvas = canvasEl;
  const ctx = canvas.getContext("2d");
  let W = 400,
    H = 600,
    dpr = Math.max(1, window.devicePixelRatio || 1);
  function resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Maintain 2:3 aspect internally
    const targetAspect = 2 / 3; // 400x600
    let cw = vw,
      ch = vh;
    // We draw at logical size W,H then scale by CSS; here set internal pixels for crispness
    W = 400;
    H = 600;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  // === Game State ===
  const HUD = {
    scoreEl: hudEl.querySelector("#score"),
    levelEl: hudEl.querySelector("#level"),
    livesEl: hudEl.querySelector("#lives"),
  };
  const centerUI = centerEl;
  const startBtn = centerEl.querySelector("#startBtn");

  let gameState = "menu"; // 'menu' | 'playing' | 'levelClear' | 'gameover'
  let score = 0;
  let level = 1;
  let lives = CONFIG.player.lives;
  let isMuted = false;

  // Physics entities
  const ropes = []; // {ax, ay, x, y, vx, vy, cut:false}
  const capsules = []; // {x,y,vx,vy, radius, cut:boolean, landed:boolean, dead:boolean}
  const slices = []; // swipe lines: {x1,y1,x2,y2, tEnd}
  const particles = [];

  // Safe zone
  let safeZone = { x: W * 0.5, y: H - 80, r: 80, t: 0 };

  // Obstacles
  const spikes = { h: CONFIG.obstacle.spikeHeight };
  const movingPlatform = { x: W * 0.5 - 60, y: H * 0.7, w: 120, h: 12, t: 0 };

  // Audio (Web Audio API)
  const AudioSys = {
    ctx: null,
    init() {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    },
    playBeep(type = "slice") {
      if (isMuted || !this.ctx) return;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type === "fail" ? "sawtooth" : type === "land" ? "triangle" : "square";
      const now = this.ctx.currentTime;
      const f0 = type === "fail" ? 200 : type === "land" ? 520 : 880;
      o.frequency.setValueAtTime(f0, now);
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      o.connect(g).connect(this.ctx.destination);
      o.start(now);
      o.stop(now + 0.18);
    },
  };

  function haptic() {
    if (!CONFIG.ui.haptics) return;
    try {
      window.FarcadeSDK.singlePlayer.actions.hapticFeedback();
    } catch (e) {}
  }

  // Controls (touch-first)
  let drawing = false;
  let lastX = 0,
    lastY = 0;
  function pointerDown(e) {
    if (gameState === "menu" || gameState === "levelClear" || gameState === "gameover") return;
    drawing = true;
    const p = getPos(e);
    lastX = p.x;
    lastY = p.y;
  }
  function pointerMove(e) {
    if (!drawing) return;
    const p = getPos(e);
    addSlice(lastX, lastY, p.x, p.y);
    lastX = p.x;
    lastY = p.y;
  }

  AudioSys.startAmbient = function () {
    // Create a gentle ambient pad using detuned oscillators and slow LFO
    this.init();
    if (!this.ctx) return;
    if (this.padGain) return; // already running
    const ctx = this.ctx;
    const master = ctx.createGain();
    master.gain.value = 0.08;
    master.connect(ctx.destination);

    // Slow delay for a relaxed tail
    const delay = ctx.createDelay(2.5);
    delay.delayTime.value = 0.8;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.25;
    delay.connect(feedback).connect(delay);
    master.connect(delay);
    delay.connect(ctx.destination);

    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const gA = ctx.createGain();
    const gB = ctx.createGain();
    gA.gain.value = 0.45;
    gB.gain.value = 0.35;

    // Base frequencies (A minor chord tones)
    oscA.type = "sine";
    oscB.type = "triangle";
    oscA.frequency.value = 220; // A3
    oscB.frequency.value = 261.63; // C4

    // Gentle detune LFOs
    const lfoA = ctx.createOscillator();
    const lfoB = ctx.createOscillator();
    const lfoGainA = ctx.createGain();
    const lfoGainB = ctx.createGain();
    lfoA.frequency.value = 0.08;
    lfoB.frequency.value = 0.06;
    lfoGainA.gain.value = 3; // cents
    lfoGainB.gain.value = -2;
    lfoA.connect(lfoGainA).connect(oscA.detune);
    lfoB.connect(lfoGainB).connect(oscB.detune);

    oscA.connect(gA).connect(master);
    oscB.connect(gB).connect(master);

    const now = ctx.currentTime;
    gA.gain.setValueAtTime(0.0001, now);
    gB.gain.setValueAtTime(0.0001, now);
    gA.gain.exponentialRampToValueAtTime(0.45, now + 2.0);
    gB.gain.exponentialRampToValueAtTime(0.35, now + 2.5);

    oscA.start();
    oscB.start();
    lfoA.start();
    lfoB.start();

    this.padOscA = oscA;
    this.padOscB = oscB;
    this.padLfoA = lfoA;
    this.padLfoB = lfoB;
    this.padGain = master;
    this.padDelay = delay;
  };

  AudioSys.stopAmbient = function () {
    if (!this.ctx) return;
    if (!this.padGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    try {
      // Fade out then stop
      this.padGain.gain.setTargetAtTime(0.0001, now, 0.4);
    } catch (e) {}
    setTimeout(() => {
      try {
        this.padOscA.stop();
      } catch (e) {}
      try {
        this.padOscB.stop();
      } catch (e) {}
      try {
        this.padLfoA.stop();
      } catch (e) {}
      try {
        this.padLfoB.stop();
      } catch (e) {}
      this.padOscA = this.padOscB = this.padLfoA = this.padLfoB = null;
      this.padGain = null;
    }, 1200);
  };
  function pointerUp() {
    drawing = false;
  }
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    // Map to logical 400x600 based on CSS scale (we are stretched to viewport); compute scale
    const sx = rect.width / W;
    const sy = rect.height / H;
    return { x: x / sx, y: y / sy };
  }
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    pointerDown(e);
  });
  canvas.addEventListener("pointermove", (e) => {
    e.preventDefault();
    pointerMove(e);
  });
  window.addEventListener("pointerup", (e) => {
    e.preventDefault();
    pointerUp(e);
  });
  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      pointerDown(e);
    },
    { passive: false },
  );
  canvas.addEventListener(
    "touchmove",
    (e) => {
      e.preventDefault();
      pointerMove(e);
    },
    { passive: false },
  );
  canvas.addEventListener(
    "touchend",
    (e) => {
      e.preventDefault();
      pointerUp(e);
    },
    { passive: false },
  );

  // Slice logic
  function addSlice(x1, y1, x2, y2) {
    if (!AudioSys.ctx) AudioSys.init();
    const now = performance.now();
    slices.push({ x1, y1, x2, y2, tEnd: now + CONFIG.gameplay.sliceLifetimeMs });
    if (loadedSounds.slice && !isMuted) {
      try {
        loadedSounds.slice.currentTime = 0;
        loadedSounds.slice.play();
      } catch (e) {}
    } else AudioSys.playBeep("slice");
  }

  function lineSegIntersect(a, b, c, d) {
    // Check intersection between AB and CD segments
    const s1x = b.x - a.x,
      s1y = b.y - a.y;
    const s2x = d.x - c.x,
      s2y = d.y - c.y;
    const s = (-s1y * (a.x - c.x) + s1x * (a.y - c.y)) / (-s2x * s1y + s1x * s2y);
    const t = (s2x * (a.y - c.y) - s2y * (a.x - c.x)) / (-s2x * s1y + s1x * s2y);
    return s >= 0 && s <= 1 && t >= 0 && t <= 1;
  }

  // Level setup
  function setupLevel(n) {
    ropes.length = 0;
    capsules.length = 0;
    slices.length = 0;
    particles.length = 0;
    const count = CONFIG.leveling.capsuleCountStart + Math.floor((n - 1) / CONFIG.leveling.capsuleCountEvery);
    const spread = Math.min(120, 50 + n * 6);
    const baseX = W * 0.5;
    const baseY = 120;

    for (let i = 0; i < count; i++) {
      const ax = baseX + (i - (count - 1) / 2) * spread;
      const ay = baseY + (i % 2) * 10;
      const len = 140 + (i % 3) * 20;
      const angle = Math.random() * 0.6 - 0.3 + (i % 2 ? 0.25 : -0.25);
      const x = ax + Math.sin(angle) * len;
      const y = ay + Math.cos(angle) * len;
      const vx = 0,
        vy = 0;
      ropes.push({ ax, ay, x, y, vx, vy, len, angle, cut: false });
      capsules.push({
        x,
        y,
        vx,
        vy,
        radius: CONFIG.gameplay.capsuleRadius,
        cut: false,
        landed: false,
        dead: false,
      });
    }

    // Safe zone sizing and motion
    const baseR = CONFIG.leveling.safeZoneBase - (n - 1) * CONFIG.leveling.safeZoneShrinkPerLevel;
    safeZone.r = Math.max(36, baseR);
    safeZone.y = H - 80;
    safeZone.x = W * 0.5;
    safeZone.t = 0;

    // Moving platform slight speed up by level
    movingPlatform.t = 0;

    // Difficulty tweaks
    if (CONFIG.difficulty === "easy") {
      safeZone.r += 10;
    }
    if (CONFIG.difficulty === "hard") {
      safeZone.r -= 8;
    }
  }

  // Update
  let lastTime = performance.now();
  function update() {
    const now = performance.now();
    const dt = Math.min(1 / 30, (now - lastTime) / 1000);
    lastTime = now;

    // Remove expired slices
    for (let i = slices.length - 1; i >= 0; i--) if (now > slices[i].tEnd) slices.splice(i, 1);

    // Animate safe zone & platform
    safeZone.t += dt;
    safeZone.x = W * 0.5 + Math.sin(safeZone.t * 0.9) * 60;
    movingPlatform.t += dt;
    movingPlatform.x = W * 0.5 - 60 + Math.sin(movingPlatform.t * (CONFIG.obstacle.movingPlatformSpeed / 40)) * 80;

    // Keep landed capsules attached to the moving safe zone
    for (const c of capsules) {
      if (c.landed && !c.dead) {
        if (c.attachDX === undefined || c.attachDY === undefined) {
          c.attachDX = c.x - safeZone.x;
          c.attachDY = c.y - safeZone.y;
        }
        c.x = safeZone.x + c.attachDX;
        c.y = safeZone.y + c.attachDY;
      }
    }

    // Wind
    const wind = CONFIG.gameplay.wind;

    // Ropes pendulum
    ropes.forEach((r, i) => {
      const c = capsules[i];
      if (r.cut || c.cut) return;
      // simple pendulum: convert x,y to angle velocity
      const dx = r.x - r.ax;
      const dy = r.y - r.ay;
      const angle = Math.atan2(dx, dy);
      const g = CONFIG.gameplay.gravity;
      // angular acceleration ~ -(g/L) * sin(theta)
      const L = r.len;
      const angAcc = -(g / L) * Math.sin(angle);
      r.angle = angle + (r.vx || 0) * dt; // reuse vx as angular velocity store
      r.vx = (r.vx || 0) + angAcc * dt; // angular velocity
      // damping
      r.vx *= 1 - CONFIG.gameplay.friction;
      // update position
      r.x = r.ax + Math.sin(r.angle) * L;
      r.y = r.ay + Math.cos(r.angle) * L;
      c.x = r.x;
      c.y = r.y;
    });

    // Cutting logic
    for (let s of slices) {
      const a = { x: s.x1, y: s.y1 };
      const b = { x: s.x2, y: s.y2 };
      for (let i = 0; i < ropes.length; i++) {
        const r = ropes[i];
        const c = capsules[i];
        if (r.cut) continue;
        const segA = { x: r.ax, y: r.ay };
        const segB = { x: r.x, y: r.y };
        if (lineSegIntersect(a, b, segA, segB)) {
          r.cut = true;
          c.cut = true;
          // give initial velocity from slice direction
          const vx = (s.x2 - s.x1) * 2.0;
          const vy = (s.y2 - s.y1) * 2.0;
          c.vx = vx;
          c.vy = vy;
          spawnBurst(c.x, c.y, CONFIG.colors.slice);
          haptic();
        }
      }
    }

    // Capsules physics after cut
    capsules.forEach((c) => {
      if (!c.cut || c.landed || c.dead) return;
      c.vy += CONFIG.gameplay.gravity * dt;
      c.vx += wind * dt * 0.2;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      // Collide with moving platform
      if (
        c.y + c.radius > movingPlatform.y &&
        c.y + c.radius < movingPlatform.y + 20 &&
        c.x > movingPlatform.x &&
        c.x < movingPlatform.x + movingPlatform.w &&
        c.vy > 0
      ) {
        c.y = movingPlatform.y - c.radius;
        c.vy *= -0.45;
        c.vx *= 0.8;
        spawnBurst(c.x, c.y, CONFIG.colors.capsule);
      }
      // Land in safe zone?
      const dx = c.x - safeZone.x;
      const dy = c.y - safeZone.y;
      const dist = Math.hypot(dx, dy);
      if (dist < safeZone.r - 2 && c.vy > 0 && c.y > safeZone.y - safeZone.r * 0.9) {
        c.landed = true;
        c.vx = 0;
        c.vy = 0;
        // store attachment offset so it moves with the safe zone
        c.attachDX = c.x - safeZone.x;
        c.attachDY = c.y - safeZone.y;
        let add = 100;
        if (dist < CONFIG.player.perfectRadius) {
          add = 150;
          spawnBurst(c.x, c.y, CONFIG.colors.safeCore);
          haptic();
        }
        scoreGain(add);
        playLand();
      }
      // Dead if hits spikes (bottom)
      if (c.y + c.radius >= H - spikes.h) {
        c.dead = true;
        lifeLost();
      }
      // Walls
      if (c.x - c.radius < 0) {
        c.x = c.radius;
        c.vx *= -0.5;
      }
      if (c.x + c.radius > W) {
        c.x = W - c.radius;
        c.vx *= -0.5;
      }
    });

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vx *= 0.99;
      p.vy += 600 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Win/lose check for level
    if (gameState === "playing") {
      const allDone = capsules.every((c) => c.landed || c.dead);
      if (allDone) {
        const landedCount = capsules.filter((c) => c.landed).length;
        if (landedCount > 0) {
          // Chain bonus if multiple landed this level
          const chain = landedCount >= 2 ? 1 + (landedCount - 1) * CONFIG.player.chainMultiplier : 1;
          if (chain > 1) scoreGain(Math.round(100 * (chain - 1)));
          level++;
          showLevelClear();
        } else {
          // fail level
          lifeLost(true);
        }
      }
    }
  }

  function scoreGain(v) {
    score += v;
    HUD.scoreEl.textContent = "Score: " + score;
  }
  function lifeLost(fromFail) {
    if (fromFail) {
      playFail();
    }
    lives--;
    HUD.livesEl.textContent = "Lives: " + Math.max(0, lives);
    if (lives <= 0) {
      return endGame();
    }
    // Retry same level
    setupLevel(level); // reset level state
  }

  function playLand() {
    if (loadedSounds.land && !isMuted) {
      try {
        loadedSounds.land.currentTime = 0;
        loadedSounds.land.play();
      } catch (e) {}
    } else AudioSys.playBeep("land");
  }
  function playFail() {
    if (loadedSounds.fail && !isMuted) {
      try {
        loadedSounds.fail.currentTime = 0;
        loadedSounds.fail.play();
      } catch (e) {}
    } else AudioSys.playBeep("fail");
  }

  // Rendering
  function draw() {
    // BG
    ctx.fillStyle = CONFIG.colors.background;
    ctx.fillRect(0, 0, W, H);

    // Guide
    if (CONFIG.ui.guide && gameState !== "menu") {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      for (let y = 80; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Safe zone
    ctx.beginPath();
    ctx.arc(safeZone.x, safeZone.y, safeZone.r, 0, Math.PI * 2);
    ctx.fillStyle = hexWithAlpha(CONFIG.colors.safeZone, 0.18);
    ctx.fill();
    ctx.strokeStyle = hexWithAlpha(CONFIG.colors.safeZone, 0.5);
    ctx.lineWidth = 3;
    ctx.stroke();
    // Core
    ctx.beginPath();
    ctx.arc(safeZone.x, safeZone.y, CONFIG.player.perfectRadius, 0, Math.PI * 2);
    ctx.strokeStyle = hexWithAlpha(CONFIG.colors.safeCore, 0.6);
    ctx.lineWidth = 2;
    ctx.stroke();

    // Moving platform
    ctx.fillStyle = "#1e293b";
    roundRect(ctx, movingPlatform.x, movingPlatform.y, movingPlatform.w, movingPlatform.h, 6);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    roundRect(ctx, movingPlatform.x, movingPlatform.y + 6, movingPlatform.w, 4, 4);
    ctx.fill();

    // Spikes at bottom
    drawSpikes();

    // Ropes
    ctx.strokeStyle = CONFIG.colors.rope;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (let i = 0; i < ropes.length; i++) {
      const r = ropes[i];
      if (r.cut) continue;
      ctx.beginPath();
      ctx.moveTo(r.ax, r.ay);
      ctx.lineTo(r.x, r.y);
      ctx.stroke();
    }

    // Capsules
    for (let i = 0; i < capsules.length; i++) {
      const c = capsules[i];
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fillStyle = CONFIG.colors.capsule;
      ctx.fill();
      ctx.strokeStyle = CONFIG.colors.capsuleOutline;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Slices
    for (let s of slices) {
      ctx.strokeStyle = CONFIG.colors.slice;
      ctx.lineWidth = CONFIG.gameplay.sliceWidth;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Particles
    particles.forEach((p) => {
      ctx.fillStyle = CONFIG.colors.particles;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillRect(p.x, p.y, 2, 2);
      ctx.globalAlpha = 1;
    });
  }

  function drawSpikes() {
    const h = spikes.h;
    const baseY = H;
    const w = 20;
    ctx.fillStyle = CONFIG.colors.danger;
    for (let x = 0; x < W; x += w) {
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + w * 0.5, baseY - h);
      ctx.lineTo(x + w, baseY);
      ctx.closePath();
      ctx.fill();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function hexWithAlpha(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // Particles
  function spawnBurst(x, y, color) {
    if (!CONFIG.ui.particles) return;
    for (let i = 0; i < 14; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 180;
      particles.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 0.6, color });
    }
  }

  // UI and flow
  function showMenu() {
    centerUI.style.display = "grid";
    centerUI.innerHTML = `<div><h1 style="margin:0 0 10px; font-size:28px;">Cut and Save</h1>
<div class="subtitle">Draw a line to cut the rope</div>
<div style="height:14px"></div>
<button class="btn" id="startBtn">Start</button></div>`;
    centerUI.querySelector("#startBtn").onclick = () => {
      AudioSys.startAmbient();
      startGame();
    };
  }
  function showLevelClear() {
    gameState = "levelClear";
    centerUI.style.display = "grid";
    centerUI.innerHTML = `<div><h1 style="margin:0 0 10px; font-size:26px;">Level ${level - 1} Complete!</h1>
<div class="subtitle">Ready? Next: Level ${level}</div>
<div style="height:14px"></div>
<button class="btn" id="nextBtn">Continue</button></div>`;
    centerUI.querySelector("#nextBtn").onclick = () => {
      centerUI.style.display = "none";

      if (AudioSys.ctx && isMuted) {
        try {
          AudioSys.ctx.resume();
        } catch (e) {}
      }
      AudioSys.startAmbient();
      HUD.levelEl.textContent = "Level: " + level;
      setupLevel(level);
      gameState = "playing";
    };
  }

  function endGame() {
    gameState = "gameover";
    onGameOver();
    try {
      window.FarcadeSDK.singlePlayer.actions.gameOver({ score });
    } catch (e) {}
    centerUI.style.display = "grid";
    centerUI.innerHTML = `<div><h1 style="margin:0 0 10px; font-size:26px;">Game Over</h1>
<div class="subtitle">Your Score: ${score}</div>
<div style="height:14px"></div>
<button class="btn" id="againBtn">Play Again</button></div>`;
    centerUI.querySelector("#againBtn").onclick = () => resetGame();
  }

  function startGame() {
    gameState = "playing";
    score = 0;
    level = 1;
    lives = CONFIG.player.lives;
    HUD.scoreEl.textContent = "Score: " + score;
    HUD.levelEl.textContent = "Level: " + level;
    HUD.livesEl.textContent = "Lives: " + lives;
    centerUI.style.display = "none";
    setupLevel(level);
  }

  function resetGame() {
    score = 0;
    level = 1;
    lives = CONFIG.player.lives;
    HUD.scoreEl.textContent = "Score: " + score;
    HUD.levelEl.textContent = "Level: " + level;
    HUD.livesEl.textContent = "Lives: " + lives;
    setupLevel(level);
    gameState = "playing";
  }

  function loop() {
    if (gameState === "playing") update();
    draw();
    requestAnimationFrame(loop);
  }

  // SDK Integration
  if (window.FarcadeSDK) {
    window.FarcadeSDK.on("play_again", () => {
      resetGame();
    });
    window.FarcadeSDK.on("toggle_mute", (data) => {
      isMuted = !!data.isMuted;
      if (AudioSys.ctx) {
        if (isMuted) AudioSys.ctx.suspend();
        else AudioSys.ctx.resume();
      }
    });
  }

  // React to config updates live
  window.onConfigUpdate = (cfg) => {
    lives = cfg.player.lives; // update available
    HUD.livesEl.textContent = "Lives: " + lives;
  };

  // Initialize
  function init() {
    showMenu();
    loop();
    try {
      window.FarcadeSDK.singlePlayer.actions.ready();
    } catch (e) {}
  }
  init();

  // Accessibility keyboard (desktop)
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (gameState === "menu" || gameState === "levelClear")) {
      const btn = centerUI.querySelector("button");
      if (btn) btn.click();
    }
  });
}
      "use strict";
      // === Config init ===
      function initConfig() {
        let config = JSON.parse(document.getElementById("game-config").textContent);
        window.addEventListener("message", (event) => {
          if (event.data?.type === "UPDATE_CONFIG") {
            Object.assign(config, event.data.config);
            if (window.onConfigUpdate) window.onConfigUpdate(config);
          }
          if (event.data?.type === "UPDATE_ASSETS") {
            ASSETS = event.data.assets;
            reloadAssets();
          }
        });
        return config;
      }
      const CONFIG = initConfig();

      // === Assets init ===
      let ASSETS = {};
      const loadedImages = {};
      const loadedSounds = {};
      function initAssets() {
        ASSETS = JSON.parse(document.getElementById("game-assets").textContent);
        loadAssets();
      }
      function loadAssets() {
        // Sounds as HTMLAudio fallback; also provide procedural audio via WebAudio
        ["slice", "land", "fail"].forEach((k) => {
          const url = ASSETS?.sounds?.[k];
          if (url) loadedSounds[k] = new Audio(url);
        });
      }
      function reloadAssets() {
        ["slice", "land", "fail"].forEach((k) => {
          const url = ASSETS?.sounds?.[k];
          if (!loadedSounds[k] && url) loadedSounds[k] = new Audio(url);
          if (loadedSounds[k] && url) loadedSounds[k].src = url;
        });
      }
      initAssets();

      // === Canvas & scaling ===
      const canvas = document.getElementById("game");
      const ctx = canvas.getContext("2d");
      let W = 400,
        H = 600,
        dpr = Math.max(1, window.devicePixelRatio || 1);
      function resize() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        // Maintain 2:3 aspect internally
        const targetAspect = 2 / 3; // 400x600
        let cw = vw,
          ch = vh;
        // We draw at logical size W,H then scale by CSS; here set internal pixels for crispness
        W = 400;
        H = 600;
        canvas.width = Math.floor(W * dpr);
        canvas.height = Math.floor(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      window.addEventListener("resize", resize);
      resize();

      // === Game State ===
      const HUD = {
        scoreEl: document.getElementById("score"),
        levelEl: document.getElementById("level"),
        livesEl: document.getElementById("lives"),
      };
      const centerUI = document.getElementById("center");
      const startBtn = document.getElementById("startBtn");

      let gameState = "menu"; // 'menu' | 'playing' | 'levelClear' | 'gameover'
      let score = 0;
      let level = 1;
      let lives = CONFIG.player.lives;
      let isMuted = false;

      // Physics entities
      const ropes = []; // {ax, ay, x, y, vx, vy, cut:false}
      const capsules = []; // {x,y,vx,vy, radius, cut:boolean, landed:boolean, dead:boolean}
      const slices = []; // swipe lines: {x1,y1,x2,y2, tEnd}
      const particles = [];

      // Safe zone
      let safeZone = { x: W * 0.5, y: H - 80, r: 80, t: 0 };

      // Obstacles
      const spikes = { h: CONFIG.obstacle.spikeHeight };
      const movingPlatform = { x: W * 0.5 - 60, y: H * 0.7, w: 120, h: 12, t: 0 };

      // Audio (Web Audio API)
      const AudioSys = {
        ctx: null,
        init() {
          if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        },
        playBeep(type = "slice") {
          if (isMuted || !this.ctx) return;
          const o = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          o.type = type === "fail" ? "sawtooth" : type === "land" ? "triangle" : "square";
          const now = this.ctx.currentTime;
          const f0 = type === "fail" ? 200 : type === "land" ? 520 : 880;
          o.frequency.setValueAtTime(f0, now);
          g.gain.setValueAtTime(0.001, now);
          g.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
          o.connect(g).connect(this.ctx.destination);
          o.start(now);
          o.stop(now + 0.18);
        },
      };

      function haptic() {
        if (!CONFIG.ui.haptics) return;
        try {
          window.FarcadeSDK.singlePlayer.actions.hapticFeedback();
        } catch (e) {}
      }

      // Controls (touch-first)
      let drawing = false;
      let lastX = 0,
        lastY = 0;
      function pointerDown(e) {
        if (gameState === "menu" || gameState === "levelClear" || gameState === "gameover") return;
        drawing = true;
        const p = getPos(e);
        lastX = p.x;
        lastY = p.y;
      }
      function pointerMove(e) {
        if (!drawing) return;
        const p = getPos(e);
        addSlice(lastX, lastY, p.x, p.y);
        lastX = p.x;
        lastY = p.y;
      }

      AudioSys.startAmbient = function () {
        // Create a gentle ambient pad using detuned oscillators and slow LFO
        this.init();
        if (!this.ctx) return;
        if (this.padGain) return; // already running
        const ctx = this.ctx;
        const master = ctx.createGain();
        master.gain.value = 0.08;
        master.connect(ctx.destination);

        // Slow delay for a relaxed tail
        const delay = ctx.createDelay(2.5);
        delay.delayTime.value = 0.8;
        const feedback = ctx.createGain();
        feedback.gain.value = 0.25;
        delay.connect(feedback).connect(delay);
        master.connect(delay);
        delay.connect(ctx.destination);

        const oscA = ctx.createOscillator();
        const oscB = ctx.createOscillator();
        const gA = ctx.createGain();
        const gB = ctx.createGain();
        gA.gain.value = 0.45;
        gB.gain.value = 0.35;

        // Base frequencies (A minor chord tones)
        oscA.type = "sine";
        oscB.type = "triangle";
        oscA.frequency.value = 220; // A3
        oscB.frequency.value = 261.63; // C4

        // Gentle detune LFOs
        const lfoA = ctx.createOscillator();
        const lfoB = ctx.createOscillator();
        const lfoGainA = ctx.createGain();
        const lfoGainB = ctx.createGain();
        lfoA.frequency.value = 0.08;
        lfoB.frequency.value = 0.06;
        lfoGainA.gain.value = 3; // cents
        lfoGainB.gain.value = -2;
        lfoA.connect(lfoGainA).connect(oscA.detune);
        lfoB.connect(lfoGainB).connect(oscB.detune);

        oscA.connect(gA).connect(master);
        oscB.connect(gB).connect(master);

        const now = ctx.currentTime;
        gA.gain.setValueAtTime(0.0001, now);
        gB.gain.setValueAtTime(0.0001, now);
        gA.gain.exponentialRampToValueAtTime(0.45, now + 2.0);
        gB.gain.exponentialRampToValueAtTime(0.35, now + 2.5);

        oscA.start();
        oscB.start();
        lfoA.start();
        lfoB.start();

        this.padOscA = oscA;
        this.padOscB = oscB;
        this.padLfoA = lfoA;
        this.padLfoB = lfoB;
        this.padGain = master;
        this.padDelay = delay;
      };

      AudioSys.stopAmbient = function () {
        if (!this.ctx) return;
        if (!this.padGain) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        try {
          // Fade out then stop
          this.padGain.gain.setTargetAtTime(0.0001, now, 0.4);
        } catch (e) {}
        setTimeout(() => {
          try {
            this.padOscA.stop();
          } catch (e) {}
          try {
            this.padOscB.stop();
          } catch (e) {}
          try {
            this.padLfoA.stop();
          } catch (e) {}
          try {
            this.padLfoB.stop();
          } catch (e) {}
          this.padOscA = this.padOscB = this.padLfoA = this.padLfoB = null;
          this.padGain = null;
        }, 1200);
      };
      function pointerUp() {
        drawing = false;
      }
      function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        // Map to logical 400x600 based on CSS scale (we are stretched to viewport); compute scale
        const sx = rect.width / W;
        const sy = rect.height / H;
        return { x: x / sx, y: y / sy };
      }
      canvas.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        pointerDown(e);
      });
      canvas.addEventListener("pointermove", (e) => {
        e.preventDefault();
        pointerMove(e);
      });
      window.addEventListener("pointerup", (e) => {
        e.preventDefault();
        pointerUp(e);
      });
      canvas.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          pointerDown(e);
        },
        { passive: false },
      );
      canvas.addEventListener(
        "touchmove",
        (e) => {
          e.preventDefault();
          pointerMove(e);
        },
        { passive: false },
      );
      canvas.addEventListener(
        "touchend",
        (e) => {
          e.preventDefault();
          pointerUp(e);
        },
        { passive: false },
      );

      // Slice logic
      function addSlice(x1, y1, x2, y2) {
        if (!AudioSys.ctx) AudioSys.init();
        const now = performance.now();
        slices.push({ x1, y1, x2, y2, tEnd: now + CONFIG.gameplay.sliceLifetimeMs });
        if (loadedSounds.slice && !isMuted) {
          try {
            loadedSounds.slice.currentTime = 0;
            loadedSounds.slice.play();
          } catch (e) {}
        } else AudioSys.playBeep("slice");
      }

      function lineSegIntersect(a, b, c, d) {
        // Check intersection between AB and CD segments
        const s1x = b.x - a.x,
          s1y = b.y - a.y;
        const s2x = d.x - c.x,
          s2y = d.y - c.y;
        const s = (-s1y * (a.x - c.x) + s1x * (a.y - c.y)) / (-s2x * s1y + s1x * s2y);
        const t = (s2x * (a.y - c.y) - s2y * (a.x - c.x)) / (-s2x * s1y + s1x * s2y);
        return s >= 0 && s <= 1 && t >= 0 && t <= 1;
      }

      // Level setup
      function setupLevel(n) {
        ropes.length = 0;
        capsules.length = 0;
        slices.length = 0;
        particles.length = 0;
        const count = CONFIG.leveling.capsuleCountStart + Math.floor((n - 1) / CONFIG.leveling.capsuleCountEvery);
        const spread = Math.min(120, 50 + n * 6);
        const baseX = W * 0.5;
        const baseY = 120;

        for (let i = 0; i < count; i++) {
          const ax = baseX + (i - (count - 1) / 2) * spread;
          const ay = baseY + (i % 2) * 10;
          const len = 140 + (i % 3) * 20;
          const angle = Math.random() * 0.6 - 0.3 + (i % 2 ? 0.25 : -0.25);
          const x = ax + Math.sin(angle) * len;
          const y = ay + Math.cos(angle) * len;
          const vx = 0,
            vy = 0;
          ropes.push({ ax, ay, x, y, vx, vy, len, angle, cut: false });
          capsules.push({
            x,
            y,
            vx,
            vy,
            radius: CONFIG.gameplay.capsuleRadius,
            cut: false,
            landed: false,
            dead: false,
          });
        }

        // Safe zone sizing and motion
        const baseR = CONFIG.leveling.safeZoneBase - (n - 1) * CONFIG.leveling.safeZoneShrinkPerLevel;
        safeZone.r = Math.max(36, baseR);
        safeZone.y = H - 80;
        safeZone.x = W * 0.5;
        safeZone.t = 0;

        // Moving platform slight speed up by level
        movingPlatform.t = 0;

        // Difficulty tweaks
        if (CONFIG.difficulty === "easy") {
          safeZone.r += 10;
        }
        if (CONFIG.difficulty === "hard") {
          safeZone.r -= 8;
        }
      }

      // Update
      let lastTime = performance.now();
      function update() {
        const now = performance.now();
        const dt = Math.min(1 / 30, (now - lastTime) / 1000);
        lastTime = now;

        // Remove expired slices
        for (let i = slices.length - 1; i >= 0; i--) if (now > slices[i].tEnd) slices.splice(i, 1);

        // Animate safe zone & platform
        safeZone.t += dt;
        safeZone.x = W * 0.5 + Math.sin(safeZone.t * 0.9) * 60;
        movingPlatform.t += dt;
        movingPlatform.x = W * 0.5 - 60 + Math.sin(movingPlatform.t * (CONFIG.obstacle.movingPlatformSpeed / 40)) * 80;

        // Keep landed capsules attached to the moving safe zone
        for (const c of capsules) {
          if (c.landed && !c.dead) {
            if (c.attachDX === undefined || c.attachDY === undefined) {
              c.attachDX = c.x - safeZone.x;
              c.attachDY = c.y - safeZone.y;
            }
            c.x = safeZone.x + c.attachDX;
            c.y = safeZone.y + c.attachDY;
          }
        }

        // Wind
        const wind = CONFIG.gameplay.wind;

        // Ropes pendulum
        ropes.forEach((r, i) => {
          const c = capsules[i];
          if (r.cut || c.cut) return;
          // simple pendulum: convert x,y to angle velocity
          const dx = r.x - r.ax;
          const dy = r.y - r.ay;
          const angle = Math.atan2(dx, dy);
          const g = CONFIG.gameplay.gravity;
          // angular acceleration ~ -(g/L) * sin(theta)
          const L = r.len;
          const angAcc = -(g / L) * Math.sin(angle);
          r.angle = angle + (r.vx || 0) * dt; // reuse vx as angular velocity store
          r.vx = (r.vx || 0) + angAcc * dt; // angular velocity
          // damping
          r.vx *= 1 - CONFIG.gameplay.friction;
          // update position
          r.x = r.ax + Math.sin(r.angle) * L;
          r.y = r.ay + Math.cos(r.angle) * L;
          c.x = r.x;
          c.y = r.y;
        });

        // Cutting logic
        for (let s of slices) {
          const a = { x: s.x1, y: s.y1 };
          const b = { x: s.x2, y: s.y2 };
          for (let i = 0; i < ropes.length; i++) {
            const r = ropes[i];
            const c = capsules[i];
            if (r.cut) continue;
            const segA = { x: r.ax, y: r.ay };
            const segB = { x: r.x, y: r.y };
            if (lineSegIntersect(a, b, segA, segB)) {
              r.cut = true;
              c.cut = true;
              // give initial velocity from slice direction
              const vx = (s.x2 - s.x1) * 2.0;
              const vy = (s.y2 - s.y1) * 2.0;
              c.vx = vx;
              c.vy = vy;
              spawnBurst(c.x, c.y, CONFIG.colors.slice);
              haptic();
            }
          }
        }

        // Capsules physics after cut
        capsules.forEach((c) => {
          if (!c.cut || c.landed || c.dead) return;
          c.vy += CONFIG.gameplay.gravity * dt;
          c.vx += wind * dt * 0.2;
          c.x += c.vx * dt;
          c.y += c.vy * dt;
          // Collide with moving platform
          if (
            c.y + c.radius > movingPlatform.y &&
            c.y + c.radius < movingPlatform.y + 20 &&
            c.x > movingPlatform.x &&
            c.x < movingPlatform.x + movingPlatform.w &&
            c.vy > 0
          ) {
            c.y = movingPlatform.y - c.radius;
            c.vy *= -0.45;
            c.vx *= 0.8;
            spawnBurst(c.x, c.y, CONFIG.colors.capsule);
          }
          // Land in safe zone?
          const dx = c.x - safeZone.x;
          const dy = c.y - safeZone.y;
          const dist = Math.hypot(dx, dy);
          if (dist < safeZone.r - 2 && c.vy > 0 && c.y > safeZone.y - safeZone.r * 0.9) {
            c.landed = true;
            c.vx = 0;
            c.vy = 0;
            // store attachment offset so it moves with the safe zone
            c.attachDX = c.x - safeZone.x;
            c.attachDY = c.y - safeZone.y;
            let add = 100;
            if (dist < CONFIG.player.perfectRadius) {
              add = 150;
              spawnBurst(c.x, c.y, CONFIG.colors.safeCore);
              haptic();
            }
            scoreGain(add);
            playLand();
          }
          // Dead if hits spikes (bottom)
          if (c.y + c.radius >= H - spikes.h) {
            c.dead = true;
            lifeLost();
          }
          // Walls
          if (c.x - c.radius < 0) {
            c.x = c.radius;
            c.vx *= -0.5;
          }
          if (c.x + c.radius > W) {
            c.x = W - c.radius;
            c.vx *= -0.5;
          }
        });

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.vx *= 0.99;
          p.vy += 600 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.life <= 0) particles.splice(i, 1);
        }

        // Win/lose check for level
        if (gameState === "playing") {
          const allDone = capsules.every((c) => c.landed || c.dead);
          if (allDone) {
            const landedCount = capsules.filter((c) => c.landed).length;
            if (landedCount > 0) {
              // Chain bonus if multiple landed this level
              const chain = landedCount >= 2 ? 1 + (landedCount - 1) * CONFIG.player.chainMultiplier : 1;
              if (chain > 1) scoreGain(Math.round(100 * (chain - 1)));
              level++;
              showLevelClear();
            } else {
              // fail level
              lifeLost(true);
            }
          }
        }
      }

      function scoreGain(v) {
        score += v;
        HUD.scoreEl.textContent = "Score: " + score;
      }
      function lifeLost(fromFail) {
        if (fromFail) {
          playFail();
        }
        lives--;
        HUD.livesEl.textContent = "Lives: " + Math.max(0, lives);
        if (lives <= 0) {
          return endGame();
        }
        // Retry same level
        setupLevel(level); // reset level state
      }

      function playLand() {
        if (loadedSounds.land && !isMuted) {
          try {
            loadedSounds.land.currentTime = 0;
            loadedSounds.land.play();
          } catch (e) {}
        } else AudioSys.playBeep("land");
      }
      function playFail() {
        if (loadedSounds.fail && !isMuted) {
          try {
            loadedSounds.fail.currentTime = 0;
            loadedSounds.fail.play();
          } catch (e) {}
        } else AudioSys.playBeep("fail");
      }

      // Rendering
      function draw() {
        // BG
        ctx.fillStyle = CONFIG.colors.background;
        ctx.fillRect(0, 0, W, H);

        // Guide
        if (CONFIG.ui.guide && gameState !== "menu") {
          ctx.strokeStyle = "rgba(255,255,255,0.06)";
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 4]);
          for (let y = 80; y < H; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
          }
          ctx.setLineDash([]);
        }

        // Safe zone
        ctx.beginPath();
        ctx.arc(safeZone.x, safeZone.y, safeZone.r, 0, Math.PI * 2);
        ctx.fillStyle = hexWithAlpha(CONFIG.colors.safeZone, 0.18);
        ctx.fill();
        ctx.strokeStyle = hexWithAlpha(CONFIG.colors.safeZone, 0.5);
        ctx.lineWidth = 3;
        ctx.stroke();
        // Core
        ctx.beginPath();
        ctx.arc(safeZone.x, safeZone.y, CONFIG.player.perfectRadius, 0, Math.PI * 2);
        ctx.strokeStyle = hexWithAlpha(CONFIG.colors.safeCore, 0.6);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Moving platform
        ctx.fillStyle = "#1e293b";
        roundRect(ctx, movingPlatform.x, movingPlatform.y, movingPlatform.w, movingPlatform.h, 6);
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        roundRect(ctx, movingPlatform.x, movingPlatform.y + 6, movingPlatform.w, 4, 4);
        ctx.fill();

        // Spikes at bottom
        drawSpikes();

        // Ropes
        ctx.strokeStyle = CONFIG.colors.rope;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        for (let i = 0; i < ropes.length; i++) {
          const r = ropes[i];
          if (r.cut) continue;
          ctx.beginPath();
          ctx.moveTo(r.ax, r.ay);
          ctx.lineTo(r.x, r.y);
          ctx.stroke();
        }

        // Capsules
        for (let i = 0; i < capsules.length; i++) {
          const c = capsules[i];
          ctx.beginPath();
          ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
          ctx.fillStyle = CONFIG.colors.capsule;
          ctx.fill();
          ctx.strokeStyle = CONFIG.colors.capsuleOutline;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Slices
        for (let s of slices) {
          ctx.strokeStyle = CONFIG.colors.slice;
          ctx.lineWidth = CONFIG.gameplay.sliceWidth;
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.moveTo(s.x1, s.y1);
          ctx.lineTo(s.x2, s.y2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Particles
        particles.forEach((p) => {
          ctx.fillStyle = CONFIG.colors.particles;
          ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
          ctx.fillRect(p.x, p.y, 2, 2);
          ctx.globalAlpha = 1;
        });
      }

      function drawSpikes() {
        const h = spikes.h;
        const baseY = H;
        const w = 20;
        ctx.fillStyle = CONFIG.colors.danger;
        for (let x = 0; x < W; x += w) {
          ctx.beginPath();
          ctx.moveTo(x, baseY);
          ctx.lineTo(x + w * 0.5, baseY - h);
          ctx.lineTo(x + w, baseY);
          ctx.closePath();
          ctx.fill();
        }
      }

      function roundRect(ctx, x, y, w, h, r) {
        const rr = Math.min(r, w * 0.5, h * 0.5);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
      }

      function hexWithAlpha(hex, a) {
        const r = parseInt(hex.slice(1, 3), 16),
          g = parseInt(hex.slice(3, 5), 16),
          b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${a})`;
      }

      // Particles
      function spawnBurst(x, y, color) {
        if (!CONFIG.ui.particles) return;
        for (let i = 0; i < 14; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 80 + Math.random() * 180;
          particles.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 0.6, color });
        }
      }

      // UI and flow
      function showMenu() {
        centerUI.style.display = "grid";
        centerUI.innerHTML = `<div><h1 style="margin:0 0 10px; font-size:28px;">Cut and Save</h1>
    <div class="subtitle">Draw a line to cut the rope</div>
    <div style="height:14px"></div>
    <button class="btn" id="startBtn">Start</button></div>`;
        centerUI.querySelector("#startBtn").onclick = () => {
          AudioSys.startAmbient();
          startGame();
        };
      }
      function showLevelClear() {
        gameState = "levelClear";
        centerUI.style.display = "grid";
        centerUI.innerHTML = `<div><h1 style="margin:0 0 10px; font-size:26px;">Level ${level - 1} Complete!</h1>
    <div class="subtitle">Ready? Next: Level ${level}</div>
    <div style="height:14px"></div>
    <button class="btn" id="nextBtn">Continue</button></div>`;
        centerUI.querySelector("#nextBtn").onclick = () => {
          centerUI.style.display = "none";

          if (AudioSys.ctx && isMuted) {
            try {
              AudioSys.ctx.resume();
            } catch (e) {}
          }
          AudioSys.startAmbient();
          HUD.levelEl.textContent = "Level: " + level;
          setupLevel(level);
          gameState = "playing";
        };
      }

      function endGame() {
        gameState = "gameover";
        try {
          window.FarcadeSDK.singlePlayer.actions.gameOver({ score });
        } catch (e) {}
        centerUI.style.display = "grid";
        centerUI.innerHTML = `<div><h1 style="margin:0 0 10px; font-size:26px;">Game Over</h1>
    <div class="subtitle">Your Score: ${score}</div>
    <div style="height:14px"></div>
    <button class="btn" id="againBtn">Play Again</button></div>`;
        centerUI.querySelector("#againBtn").onclick = () => resetGame();
      }

      function startGame() {
        gameState = "playing";
        score = 0;
        level = 1;
        lives = CONFIG.player.lives;
        HUD.scoreEl.textContent = "Score: " + score;
        HUD.levelEl.textContent = "Level: " + level;
        HUD.livesEl.textContent = "Lives: " + lives;
        centerUI.style.display = "none";
        setupLevel(level);
      }

      function resetGame() {
        score = 0;
        level = 1;
        lives = CONFIG.player.lives;
        HUD.scoreEl.textContent = "Skor: " + score;
        HUD.levelEl.textContent = "Seviye: " + level;
        HUD.livesEl.textContent = "Can: " + lives;
        setupLevel(level);
        gameState = "playing";
      }

      function loop() {
        if (gameState === "playing") update();
        draw();
        requestAnimationFrame(loop);
      }

      // SDK Integration
      window.FarcadeSDK.on("play_again", () => {
        resetGame();
      });
      window.FarcadeSDK.on("toggle_mute", (data) => {
        isMuted = !!data.isMuted;
        if (AudioSys.ctx) {
          if (isMuted) AudioSys.ctx.suspend();
          else AudioSys.ctx.resume();
        }
      });

      // React to config updates live
      window.onConfigUpdate = (cfg) => {
        lives = cfg.player.lives; // update available
        HUD.livesEl.textContent = "Can: " + lives;
      };

      // Initialize
      function init() {
        showMenu();
        loop();
        try {
          window.FarcadeSDK.singlePlayer.actions.ready();
        } catch (e) {}
      }
      init();

      // Accessibility keyboard (desktop)
      window.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (gameState === "menu" || gameState === "levelClear")) {
          const btn = centerUI.querySelector("button");
          if (btn) btn.click();
        }
      });
