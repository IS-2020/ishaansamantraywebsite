/* space-game.js — v4 · ishaansamantray.com
   Three.js loaded as global from CDN. No ES module import needed.
   Boot → Mission Briefing (fullscreen) → Game → Debrief → Portfolio */

(function () {
  if (typeof THREE === 'undefined') {
    console.warn('[space-game] THREE not found — skipping game init');
    return;
  }

  /* ─── Palette ──────────────────────────────────────────────────────────── */
  const C = { bg: 0x030508, green: 0x7cf29a, amber: 0xffb454, red: 0xff6b6b };

  /* ─── Asteroid data (Ishaan's real experience) ─────────────────────────── */
  const ROSTER = [
    { org: 'Vaxon Space',    tag: 'vleo · propulsion · darpa',        col: 0x6ea8ff, size: 1.4, shape: 'dodeca' },
    { org: 'NIH · NEI',      tag: 'lipid-u-net · retinal ai · pub',   col: 0x7cf29a, size: 1.7, shape: 'icosa'  },
    { org: 'Aegis',          tag: 'school safety ai · stealth',        col: 0xff6b6b, size: 1.5, shape: 'dodeca' },
    { org: 'Sanaria',        tag: 'malaria vaccine · pcr genetics',    col: 0xffb454, size: 1.3, shape: 'icosa'  },
    { org: 'Kids For Code',  tag: '10,000+ students · 37 states',     col: 0xa78bfa, size: 1.6, shape: 'octa'   },
    { org: 'AstraZeneca',    tag: 'pharma r&d · business dev',         col: 0x38bdf8, size: 1.2, shape: 'octa'   },
    { org: 'Johns Hopkins',  tag: 'labcote · surgical jig · cad',      col: 0xfbbf24, size: 1.3, shape: 'icosa'  },
    { org: 'AguaClara',      tag: 'uasb reactor · field deployment',   col: 0x34d399, size: 1.4, shape: 'dodeca' },
    { org: 'Map Collective', tag: 'agentic ai · dod tradewinds',       col: 0x7cf29a, size: 1.2, shape: 'octa'   },
    { org: 'Medimint',       tag: 'incident reports · $8m deal',       col: 0x38bdf8, size: 1.1, shape: 'dodeca' },
  ];

  const TARGET_KILLS = 3;
  const BULLET_SPEED = 10;

  /* ─── Helpers ──────────────────────────────────────────────────────────── */
  const $ = id => document.getElementById(id);

  /* ─── Glow sprite texture ──────────────────────────────────────────────── */
  function glowTex() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0,   'rgba(255,255,255,1)');
    gr.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    gr.addColorStop(0.7, 'rgba(255,255,255,0.1)');
    gr.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  /* ─── Rock texture ─────────────────────────────────────────────────────── */
  function rockTex(hexCol) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const col = new THREE.Color(hexCol);
    ctx.fillStyle = `rgb(${col.r * 140 | 0},${col.g * 140 | 0},${col.b * 140 | 0})`;
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1200; i++) {
      const x = Math.random() * 128, y = Math.random() * 128, r = 1 + Math.random() * 3;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = Math.random() > .5
        ? `rgba(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0},0.3)`
        : 'rgba(0,0,0,0.4)';
      ctx.fill();
    }
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * 128, y = Math.random() * 128, r = 4 + Math.random() * 14;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = gr; ctx.fill();
    }
    return new THREE.CanvasTexture(c);
  }

  /* ─── Ship ─────────────────────────────────────────────────────────────── */
  function buildShip() {
    const g = new THREE.Group();
    // Use MeshLambertMaterial — visible with basic lighting, no PBR complexity
    const hull   = new THREE.MeshLambertMaterial({ color: 0xd0dce8 });
    const glowMat = new THREE.MeshBasicMaterial({ color: C.green });
    const amber  = new THREE.MeshBasicMaterial({ color: C.amber });
    const dark   = new THREE.MeshLambertMaterial({ color: 0x4a5e6e });
    const glass  = new THREE.MeshBasicMaterial({ color: 0x99ffcc, transparent: true, opacity: 0.8 });

    // Fuselage
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.28, 2.0, 6), hull);
    fuse.rotation.x = Math.PI / 2; g.add(fuse);
    // Nose
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.85, 6), hull);
    nose.rotation.x = Math.PI / 2; nose.position.z = 1.3; g.add(nose);
    // Cockpit
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), glass);
    dome.rotation.x = -Math.PI / 2; dome.position.set(0, 0.12, 0.35); g.add(dome);
    // Wings
    [-1, 1].forEach(s => {
      const v = new Float32Array([0, 0, 0.3, s * 2.2, -0.05, -0.75, s * 0.22, 0, 0.2]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
      geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo, dark));
      // Green stripe
      const sv = new Float32Array([s * 0.7, -0.04, -0.08, s * 2.0, -0.04, -0.7, s * 0.55, -0.04, 0.06]);
      const sgeo = new THREE.BufferGeometry();
      sgeo.setAttribute('position', new THREE.BufferAttribute(sv, 3));
      sgeo.computeVertexNormals();
      g.add(new THREE.Mesh(sgeo, glowMat));
      // Wingtip
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.065, 5, 5), amber);
      tip.position.set(s * 2.18, -0.05, -0.73); g.add(tip);
    });
    // Engine nozzle
    const noz = new THREE.Mesh(new THREE.CircleGeometry(0.07, 8), glowMat);
    noz.position.z = -1.1; g.add(noz);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.15, 10),
      new THREE.MeshBasicMaterial({ color: C.green, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
    ring.position.z = -1.09; g.add(ring);
    return g;
  }

  /* ─── Asteroid ──────────────────────────────────────────────────────────── */
  function buildAsteroid(entry) {
    const { col, size, shape } = entry;
    let geo;
    if (shape === 'icosa')  geo = new THREE.IcosahedronGeometry(size, 2);
    else if (shape === 'octa') geo = new THREE.OctahedronGeometry(size, 2);
    else                    geo = new THREE.DodecahedronGeometry(size, 1);
    // Distort
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const s = 0.65 + Math.random() * 0.7;
      pos.setXYZ(i, pos.getX(i) * s, pos.getY(i) * s, pos.getZ(i) * s);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ map: rockTex(col) });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = {
      entry,
      vel:    new THREE.Vector3((Math.random() - 0.5) * 0.018, (Math.random() - 0.5) * 0.012, 0.02 + Math.random() * 0.028),
      rotVel: new THREE.Vector3((Math.random() - 0.5) * 0.022, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.014),
      hitR:   size * 1.25,
      alive:  true,
      glow:   0,
    };
    return mesh;
  }

  /* ─── Bullet ────────────────────────────────────────────────────────────── */
  function buildBullet(pos, dir) {
    const grp = new THREE.Group();
    grp.position.copy(pos);
    grp.userData.dir = dir.clone().normalize();
    grp.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })));
    for (let i = 1; i <= 3; i++) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.1 * (1 - i * 0.25), 6, 6),
        new THREE.MeshBasicMaterial({ color: C.green, transparent: true, opacity: 1 - i * 0.3 }));
      orb.position.copy(dir).multiplyScalar(-i * 0.2);
      grp.add(orb);
    }
    grp.add(new THREE.PointLight(C.green, 10, 5));
    return grp;
  }

  /* ─── Explosion ─────────────────────────────────────────────────────────── */
  function spawnExplosion(scene, pos, col, size) {
    const count = 12 + (size * 10) | 0, parts = [];
    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.05 + Math.random() * 0.1, 4, 4),
        new THREE.MeshBasicMaterial({ color: Math.random() > 0.45 ? col : C.amber, transparent: true, opacity: 1 })
      );
      p.position.copy(pos);
      const spd = 0.06 + Math.random() * 0.28;
      const phi = Math.random() * Math.PI * 2, tht = Math.acos(2 * Math.random() - 1);
      p.userData.vel  = new THREE.Vector3(Math.sin(tht) * Math.cos(phi) * spd, Math.sin(tht) * Math.sin(phi) * spd, Math.cos(tht) * spd);
      p.userData.life = 1;
      scene.add(p); parts.push(p);
    }
    const fl = new THREE.PointLight(col, 30, 9); fl.position.copy(pos); scene.add(fl);
    let t = 0;
    const fade = () => { t += 0.1; fl.intensity = Math.max(0, 30 - t * 30); if (fl.intensity > 0) requestAnimationFrame(fade); else scene.remove(fl); };
    fade();
    return parts;
  }

  /* ─── HTML asteroid labels ──────────────────────────────────────────────── */
  class LabelManager {
    constructor(con, cam, ren) { this.con = con; this.cam = cam; this.ren = ren; this.map = new Map(); }
    add(mesh) {
      const div = document.createElement('div'); div.className = 'sg-asteroid-label';
      const e = mesh.userData.entry;
      div.innerHTML = `<span class="sg-al-org">${e.org}</span><span class="sg-al-tag">${e.tag}</span>`;
      div.style.setProperty('--col', '#' + new THREE.Color(e.col).getHexString());
      this.con.appendChild(div); this.map.set(mesh, div);
    }
    update() {
      const w = this.ren.domElement.width / devicePixelRatio;
      const h = this.ren.domElement.height / devicePixelRatio;
      const v = new THREE.Vector3();
      this.map.forEach((div, mesh) => {
        if (!mesh.userData.alive) { div.style.opacity = '0'; return; }
        v.copy(mesh.position).project(this.cam);
        if (v.z > 1) { div.style.opacity = '0'; return; }
        div.style.left = ((v.x * 0.5 + 0.5) * w) + 'px';
        div.style.top  = ((-v.y * 0.5 + 0.5) * h - mesh.userData.hitR * 80) + 'px';
        div.style.opacity = String(Math.min(1, Math.max(0, (mesh.position.z + 45) / 35)));
      });
    }
    clear() { this.map.forEach(d => d.remove()); this.map.clear(); }
  }

  /* ─── HUD ───────────────────────────────────────────────────────────────── */
  function hudShields(n) {
    const el = $('sgShields'); if (!el) return;
    el.textContent = '█'.repeat(Math.max(0, n)) + '░'.repeat(Math.max(0, 3 - n));
    el.style.color = n >= 2 ? '#7cf29a' : n === 1 ? '#ffb454' : '#ff6b6b';
  }
  function hudTargets(n) {
    const el = $('sgTargets'); if (!el) return;
    el.textContent = '■'.repeat(n) + '□'.repeat(Math.max(0, 3 - n));
  }
  function addLog(text, color) {
    const log = $('sgLog'); if (!log) return;
    const line = document.createElement('div'); line.className = 'sg-log-line';
    line.style.color = color || '#5c616c'; line.textContent = '> ' + text;
    log.appendChild(line);
    while (log.children.length > 6) log.removeChild(log.firstChild);
  }
  function announce(text, color, ms) {
    const el = $('sgAnnounce'); if (!el) return;
    el.textContent = text; el.style.color = color || '#7cf29a';
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, ms || 1800);
  }
  function flash(type) {
    const el = $('sgFlash'); if (!el) return;
    const bg = { green: 'rgba(124,242,154,.08)', white: 'rgba(255,255,255,.18)', kill: 'rgba(124,242,154,.13)', hit: 'rgba(255,107,107,.18)' };
    el.style.background = bg[type] || bg.green; el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, type === 'hit' ? 380 : 240);
  }

  /* ─── Main ──────────────────────────────────────────────────────────────── */
  function initGame() {
    const canvas = $('spaceCanvas'); if (!canvas) return;

    // Make game section fullscreen — hide nav/topbar
    document.body.classList.add('game-active');

    // ── Boot sequence ──────────────────────────────────────────────────────
    const bootEl = $('sgBoot'), bootLines = $('sgBootLines');
    const BOOT = [
      { t: 0,    col: '#5c616c', tx: '> initializing starmap...' },
      { t: 380,  col: '#5c616c', tx: '> loading career.dat ············ OK' },
      { t: 820,  col: '#5c616c', tx: '> scanning experience.log ···· 10 entries found' },
      { t: 1280, col: '#ffb454', tx: '> WARNING: 3 hostile asteroids inbound' },
      { t: 1720, col: '#5c616c', tx: '> arming laser systems ············ OK' },
      { t: 2150, col: '#7cf29a', tx: '> LAUNCH READY — mission briefing loading' },
    ];
    BOOT.forEach(({ t, col, tx }) => setTimeout(() => {
      if (!bootLines) return;
      const l = document.createElement('div'); l.className = 'sg-boot-line';
      l.style.color = col; l.textContent = tx;
      bootLines.appendChild(l);
    }, t));

    // Transition: boot → mission briefing
    setTimeout(() => {
      if (bootEl) { bootEl.style.opacity = '0'; bootEl.style.pointerEvents = 'none'; }
      setTimeout(() => {
        if (bootEl) bootEl.style.display = 'none';
        const m = $('sgMission');
        if (m) { m.style.display = 'flex'; setTimeout(() => { m.style.opacity = '1'; }, 20); }
      }, 500);
    }, 2650);

    // ── Skip & Launch ──────────────────────────────────────────────────────
    const skipEl = $('sgSkip');
    if (skipEl) skipEl.addEventListener('click', e => { e.preventDefault(); dismissGame(); });

    const launchEl = $('sgLaunch');
    if (launchEl) launchEl.addEventListener('click', () => {
      const m = $('sgMission');
      if (m) { m.style.opacity = '0'; setTimeout(() => { m.style.display = 'none'; }, 400); }
      startRound();
    });

    function dismissGame() {
      document.body.classList.remove('game-active');
      const s = $('game');
      if (s) { s.style.transition = 'opacity 0.5s'; s.style.opacity = '0'; }
      setTimeout(() => {
        if (s) s.style.display = 'none';
        document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' });
      }, 520);
    }

    let cleanupFn = null, phase = 'boot', destroyed = [];

    /* ── Game round ─────────────────────────────────────────────────────── */
    function startRound() {
      if (cleanupFn) { cleanupFn(); cleanupFn = null; }
      phase = 'playing';
      destroyed = [];

      // Show HUD
      const topBar = $('sgTopBar'), botBar = $('sgBottomBar'), labelCon = $('sgLabels');
      if (topBar)  { topBar.style.display  = 'flex'; }
      if (botBar)  { botBar.style.display  = 'block'; }
      if (labelCon){ labelCon.style.display = 'block'; }

      hudShields(3); hudTargets(0);
      addLog('mission: neutralize 3 threats to access portfolio', '#5c616c');
      addLog('click target or press SPACE to fire · WASD to move', '#3a3f48');

      const W = window.innerWidth, H = window.innerHeight;

      /* Scene */
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(C.bg);
      scene.fog = new THREE.FogExp2(C.bg, 0.0016);

      const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 500);
      camera.position.set(0, 0.8, 8); camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

      /* Lights */
      scene.add(new THREE.AmbientLight(0xffffff, 1.8));
      const key = new THREE.DirectionalLight(0xaaffcc, 2.5); key.position.set(4, 6, 5); scene.add(key);
      const fill = new THREE.DirectionalLight(0x8888ff, 1.2); fill.position.set(-5, 3, 4); scene.add(fill);

      /* Grid floor */
      const grid = new THREE.GridHelper(300, 60, 0x1e2229, 0x1e2229);
      grid.material.transparent = true; grid.material.opacity = 0.18;
      grid.position.set(0, -7, -35); scene.add(grid);

      /* Stars */
      const starTex = glowTex();
      function makeStars(n, zNear, zFar, sz, br) {
        const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          pos[i * 3]     = (Math.random() - 0.5) * 400;
          pos[i * 3 + 1] = (Math.random() - 0.5) * 260;
          pos[i * 3 + 2] = -zNear - Math.random() * (zFar - zNear);
          const b = br * (0.4 + Math.random() * 0.6);
          col[i * 3] = b * 0.82; col[i * 3 + 1] = b * 0.9; col[i * 3 + 2] = b;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
        return new THREE.Points(geo, new THREE.PointsMaterial({
          size: sz, vertexColors: true, sizeAttenuation: true,
          transparent: true, alphaTest: 0.004, map: starTex,
        }));
      }
      const sF = makeStars(2000, 80, 400, 0.35, 0.5);
      const sM = makeStars(700,  30, 170, 0.6,  0.75);
      const sN = makeStars(120,  10,  70, 1.2,  1.0);
      const stars = new THREE.Group(); stars.add(sF, sM, sN); scene.add(stars);

      /* Ship */
      const ship = buildShip(); ship.scale.setScalar(1.5); scene.add(ship);
      const engGlow = new THREE.PointLight(C.green, 5, 8); engGlow.position.set(0, 0, -1.6); ship.add(engGlow);

      /* Exhaust trail */
      const EX = 50, exGeo = new THREE.BufferGeometry();
      const exPos = new Float32Array(EX * 3), exAge = new Float32Array(EX);
      for (let i = 0; i < EX; i++) { exPos[i * 3 + 2] = -999; exAge[i] = Math.random(); }
      exGeo.setAttribute('position', new THREE.BufferAttribute(exPos, 3));
      const exMat = new THREE.PointsMaterial({ color: C.green, size: 0.09, transparent: true, opacity: 0.55, sizeAttenuation: true, map: starTex, alphaTest: 0.01 });
      ship.add(new THREE.Points(exGeo, exMat));

      /* Asteroids */
      const shuffled = [...ROSTER].sort(() => Math.random() - 0.5);
      const asteroids = [];
      for (let i = 0; i < 5; i++) {
        const a = buildAsteroid(shuffled[i % shuffled.length]);
        a.position.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 5, -9 - i * 5 - Math.random() * 4);
        scene.add(a); asteroids.push(a);
      }

      /* Labels */
      const labels = new LabelManager($('sgLabels'), camera, renderer);
      asteroids.forEach(a => labels.add(a));

      function resetAsteroid(a) {
        a.position.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 5, -11 - Math.random() * 12);
        a.userData.vel.set((Math.random() - 0.5) * 0.018, (Math.random() - 0.5) * 0.012, 0.02 + Math.random() * 0.028);
        a.userData.alive = true; a.visible = true;
      }

      /* State */
      const bullets = [], expParts = [];
      let lives = 3, kills = 0, fireCooldown = 0, hitCooldown = 0, shakeAmt = 0, warpTime = 0;
      let last = performance.now(), raf;
      const mx = { x: 0, y: 0, tx: 0, ty: 0 }, cursor = { x: W / 2, y: H / 2 }, keys = {};

      /* Fire — toward cursor + soft auto-aim */
      function fire(cx, cy) {
        if (phase !== 'playing' || fireCooldown > 0) return;
        fireCooldown = 6;
        let dir = new THREE.Vector3(0, 0, -1);
        if (cx != null) {
          const ray = new THREE.Raycaster();
          ray.setFromCamera(new THREE.Vector2((cx / W) * 2 - 1, -(cy / H) * 2 + 1), camera);
          dir.copy(ray.ray.direction);
        }
        // Auto-aim nudge within ~18°
        let best = null, bestDot = -1;
        for (const a of asteroids) {
          if (!a.userData.alive) continue;
          const toA = a.position.clone().sub(ship.position).normalize();
          const d = dir.dot(toA);
          if (d > 0.94 && d > bestDot) { bestDot = d; best = a; }
        }
        if (best) dir.lerp(best.position.clone().sub(ship.position).normalize(), 0.35).normalize();

        const b = buildBullet(ship.position.clone(), dir);
        scene.add(b); bullets.push(b);
        engGlow.intensity = 12;
      }

      const onKD = e => { keys[e.code] = true; if (e.code === 'Space') { e.preventDefault(); fire(cursor.x, cursor.y); } };
      const onKU = e => { keys[e.code] = false; };
      const onMove = e => { mx.tx = (e.clientX / W - 0.5) * 12; mx.ty = -(e.clientY / H - 0.5) * 7.5; cursor.x = e.clientX; cursor.y = e.clientY; };
      const onTouch = e => { if (e.touches[0]) { onMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }); } };
      const onClick = e => fire(e.clientX, e.clientY);
      const onResize = () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); };

      window.addEventListener('keydown',   onKD);
      window.addEventListener('keyup',     onKU);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onTouch, { passive: true });
      canvas.addEventListener('click',     onClick);
      window.addEventListener('resize',    onResize);

      /* Warp sequence */
      function triggerWarp() {
        phase = 'warping'; warpTime = 0;
        announce('ALL THREATS ELIMINATED — WARP DRIVE ENGAGED', '#7cf29a', 99999);
        addLog('warp drive engaged · entering portfolio', '#7cf29a');
        setTimeout(() => flash('green'), 1400);
        setTimeout(() => flash('white'), 2350);
        setTimeout(() => {
          const s = $('game');
          if (s) { s.style.transition = 'opacity .65s'; s.style.opacity = '0'; }
          setTimeout(() => {
            document.body.classList.remove('game-active');
            if (s) s.style.display = 'none';
            document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => runDebrief(destroyed), 800);
          }, 700);
        }, 2950);
      }

      /* Render loop */
      function loop(now) {
        raf = requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 16.67, 3); last = now;

        /* Warp animation */
        if (phase === 'warping') {
          warpTime += dt; const t = Math.min(warpTime / 80, 1);
          sF.material.size = 0.35 + t * 18; sM.material.size = 0.6 + t * 26; sN.material.size = 1.2 + t * 40;
          [sF, sM, sN].forEach(l => {
            const b = l.geometry.attributes.position;
            for (let i = 0; i < b.count; i++) { const z = b.getZ(i) + t * 8 * dt; b.setZ(i, z > 30 ? -400 : z); }
            b.needsUpdate = true;
          });
          camera.fov = Math.min(60 + t * 72, 132); camera.updateProjectionMatrix();
          ship.position.z -= t * 0.7 * dt; ship.scale.setScalar(1.5 + t * 2);
          engGlow.intensity = 5 + t * 65;
          renderer.render(scene, camera); return;
        }
        if (phase !== 'playing') { renderer.render(scene, camera); return; }

        /* Ship movement */
        const boost = keys['ShiftLeft'] || keys['ShiftRight'], spd = boost ? 0.25 : 0.15;
        if (keys['KeyA'] || keys['ArrowLeft'])  mx.tx -= spd * dt;
        if (keys['KeyD'] || keys['ArrowRight']) mx.tx += spd * dt;
        if (keys['KeyW'] || keys['ArrowUp'])    mx.ty += spd * 0.7 * dt;
        if (keys['KeyS'] || keys['ArrowDown'])  mx.ty -= spd * 0.7 * dt;
        mx.tx = Math.max(-7, Math.min(7, mx.tx)); mx.ty = Math.max(-4, Math.min(4, mx.ty));
        mx.x += (mx.tx - mx.x) * 0.13 * dt; mx.y += (mx.ty - mx.y) * 0.13 * dt;
        ship.position.set(mx.x, mx.y, 0);
        const dxIn = (keys['KeyA'] || keys['ArrowLeft'] ? -1 : 0) + (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0);
        ship.rotation.z += (-dxIn * 0.42 - ship.rotation.z) * 0.12 * dt;
        ship.rotation.y += ((mx.tx - mx.x) * 0.06 - ship.rotation.y) * 0.1 * dt;
        camera.position.x += (mx.x * 0.06 - camera.position.x) * 0.04 * dt;
        camera.position.y += (mx.y * 0.04 + 0.8 - camera.position.y) * 0.04 * dt;
        camera.lookAt(mx.x * 0.12, mx.y * 0.1, -2);
        if (shakeAmt > 0) { camera.position.x += (Math.random() - 0.5) * shakeAmt; camera.position.y += (Math.random() - 0.5) * shakeAmt * 0.7; shakeAmt *= 0.88; if (shakeAmt < 0.004) shakeAmt = 0; }

        /* Exhaust */
        const pulse = Math.sin(now * 0.008) * 0.4 + (boost ? 6.5 : 3.5);
        engGlow.intensity += (pulse - engGlow.intensity) * 0.15 * dt;
        const exBuf = exGeo.attributes.position;
        for (let i = 0; i < EX; i++) {
          exAge[i] -= 0.05 * dt * (boost ? 2 : 1);
          if (exAge[i] <= 0) { exAge[i] = 0.6 + Math.random() * 0.5; exBuf.setXYZ(i, (Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.1, -0.9 - Math.random() * 0.5); }
          else { exBuf.setZ(i, exBuf.getZ(i) - 0.08 * dt); exBuf.setX(i, exBuf.getX(i) * (1 - 0.016 * dt)); }
        }
        exBuf.needsUpdate = true; exMat.opacity = boost ? 0.9 : 0.55;
        if (fireCooldown > 0) fireCooldown -= dt;

        stars.position.x += (-mx.x * 0.015 - stars.position.x) * 0.015 * dt;
        stars.position.y += (-mx.y * 0.012 - stars.position.y) * 0.015 * dt;
        grid.position.x  += (-mx.x * 0.02  - grid.position.x)  * 0.02  * dt;

        /* Bullets */
        for (let bi = bullets.length - 1; bi >= 0; bi--) {
          const b = bullets[bi];
          b.position.addScaledVector(b.userData.dir, BULLET_SPEED * dt);
          let hit = false;
          for (const a of asteroids) {
            if (!a.userData.alive) continue;
            const dist = b.position.distanceTo(a.position);
            if (dist < a.userData.hitR + 0.12) {
              a.userData.alive = false; a.visible = false;
              scene.remove(b); bullets.splice(bi, 1);
              expParts.push(...spawnExplosion(scene, a.position.clone(), a.userData.entry.col, a.userData.entry.size));
              kills++; destroyed.push(a.userData.entry);
              hudTargets(kills); flash('kill');
              addLog('[' + a.userData.entry.org + '] neutralized · ' + a.userData.entry.tag, '#7cf29a');
              if (kills >= TARGET_KILLS) { triggerWarp(); return; }
              announce(a.userData.entry.org + ' · NEUTRALIZED (' + kills + '/' + TARGET_KILLS + ')', '#7cf29a', 1700);
              setTimeout(() => resetAsteroid(a), 1050);
              hit = true; break;
            } else if (dist < a.userData.hitR * 2.4) {
              // Near-miss glow
              a.material.emissive = new THREE.Color(a.userData.entry.col);
              a.material.emissiveIntensity = 0.5;
              setTimeout(() => { if (a.material) a.material.emissiveIntensity = 0; }, 300);
            }
          }
          if (!hit && b.position.z < -180) { scene.remove(b); bullets.splice(bi, 1); }
        }

        /* Asteroids */
        for (const a of asteroids) {
          if (!a.userData.alive) continue;
          a.position.addScaledVector(a.userData.vel, dt);
          a.rotation.x += a.userData.rotVel.x * dt;
          a.rotation.y += a.userData.rotVel.y * dt;
          a.rotation.z += a.userData.rotVel.z * dt;
          if (a.position.z > 10) resetAsteroid(a);
          if (hitCooldown <= 0 && a.position.distanceTo(ship.position) < a.userData.hitR + 0.42) {
            lives--; hitCooldown = 90; shakeAmt = 0.24;
            hudShields(lives); flash('hit');
            addLog('shield breach · ' + lives + ' shield' + (lives !== 1 ? 's' : '') + ' remaining', '#ff6b6b');
            resetAsteroid(a);
            if (lives <= 0) {
              phase = 'respawning';
              announce('SHIELDS DESTROYED — REBOOTING', '#ff6b6b', 2600);
              addLog('ship destroyed · rebooting systems...', '#ff6b6b');
              setTimeout(() => startRound(), 2800);
            } else {
              announce('SHIELD BREACH · ' + lives + ' REMAINING', '#ff6b6b', 1500);
            }
          }
        }

        /* Explosion particles */
        for (let i = expParts.length - 1; i >= 0; i--) {
          const p = expParts[i];
          p.userData.life -= 0.032 * dt;
          p.position.addScaledVector(p.userData.vel, dt);
          p.userData.vel.multiplyScalar(0.934);
          p.material.opacity = p.userData.life;
          if (p.userData.life <= 0) { scene.remove(p); expParts.splice(i, 1); }
        }

        labels.update();
        renderer.render(scene, camera);
      }

      raf = requestAnimationFrame(loop);

      cleanupFn = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('keydown',   onKD);
        window.removeEventListener('keyup',     onKU);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onTouch);
        canvas.removeEventListener('click',     onClick);
        window.removeEventListener('resize',    onResize);
        labels.clear(); renderer.dispose();
        ['sgTopBar', 'sgBottomBar', 'sgLabels'].forEach(id => { const e = $(id); if (e) e.style.display = 'none'; });
        const log = $('sgLog'); if (log) log.innerHTML = '';
      };
    }
  }

  /* ─── Mission debrief ───────────────────────────────────────────────────── */
  function runDebrief(destroyed) {
    const overlay = $('sgDebriefOverlay'), body = $('sgDebriefBody'), footer = $('sgDebriefFooter');
    if (!overlay || !body) return;
    body.innerHTML = ''; overlay.style.display = 'flex';
    setTimeout(() => { overlay.style.opacity = '1'; }, 20);

    const lines = [
      { t: 0,   col: '#3a3f48', tx: '> loading mission_debrief.sh...' },
      { t: 420, col: '#7cf29a', tx: '> mission_status: COMPLETE ✓' },
      { t: 760, col: '#5c616c', tx: '> threats_neutralized: ' + (destroyed || []).length + '/' + TARGET_KILLS },
      { t: 1060,col: '#2a2f38', tx: '> ─────────────────────────────────────' },
    ];
    (destroyed || []).forEach((e, i) => {
      lines.push({ t: 1200 + i * 340, col: '#7cf29a', tx: '> [' + e.org + ']' });
      lines.push({ t: 1360 + i * 340, col: '#5c616c', tx: '  ' + e.tag });
    });
    const end = 1200 + (destroyed || []).length * 340 + 420;
    lines.push({ t: end,     col: '#2a2f38', tx: '> ─────────────────────────────────────' });
    lines.push({ t: end+200, col: '#e6e8ec', tx: '> subject: ISHAAN SAMANTRAY' });
    lines.push({ t: end+400, col: '#e6e8ec', tx: '> affiliation: CORNELL UNIVERSITY · BIO ENG + CS' });
    lines.push({ t: end+620, col: '#7cf29a', tx: '> status: BUILDING AT WET-LAB × CODE INTERSECTION' });

    lines.forEach(({ t, col, tx }) => setTimeout(() => {
      const l = document.createElement('div'); l.className = 'sg-debrief-line';
      l.style.color = col; l.textContent = tx;
      body.appendChild(l); body.scrollTop = body.scrollHeight;
    }, t));

    setTimeout(() => {
      if (footer) { footer.style.display = 'block'; setTimeout(() => { footer.style.opacity = '1'; }, 20); }
    }, end + 960);
    setTimeout(() => { overlay.style.opacity = '0'; setTimeout(() => { overlay.style.display = 'none'; }, 420); }, end + 4400);
  }

  /* ─── Boot ──────────────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }

})();
