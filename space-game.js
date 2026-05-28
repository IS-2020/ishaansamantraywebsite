// space-game.js — modern space shooter · ishaansamantray.com
// Shoot 3 asteroids → warp → portfolio
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js'

// ── Config ─────────────────────────────────────────────────────────────────────
const TARGET_KILLS   = 3
const ASTEROID_COUNT = 5      // fewer, less overwhelming
const BULLET_SPEED   = 7      // faster bullets — easier to hit
const SHIP_FOLLOW    = 0.12   // snappier ship tracking
const C_GREEN        = 0x7cf29a
const C_AMBER        = 0xffb454
const C_BG           = 0x030508  // deep space

// ── Helpers ────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id)
const livesBar = n => '█'.repeat(Math.max(0,n)) + '░'.repeat(Math.max(0,3-n))

function announce(text, color = 'var(--accent)', ms = 1800) {
  const el = $('sgAnnouncement')
  if (!el) return
  el.textContent = text; el.style.color = color
  el.classList.add('sg-announcement-show')
  clearTimeout(el._t)
  el._t = setTimeout(() => el.classList.remove('sg-announcement-show'), ms)
}

function updateKillBoxes(n) {
  for (let i = 0; i < TARGET_KILLS; i++) {
    const b = $(`sgKill${i}`)
    if (!b) continue
    b.textContent = i < n ? '■' : '□'
    b.classList.toggle('filled', i < n)
  }
}

// ── Circular glow sprite (stars look round, not square) ────────────────────────
function makeGlowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32,32,0,32,32,32)
  g.addColorStop(0,   'rgba(255,255,255,1)')
  g.addColorStop(0.25,'rgba(255,255,255,0.8)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.15)')
  g.addColorStop(1,   'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(0,0,64,64)
  return new THREE.CanvasTexture(c)
}

// ── Ship (visible, bright, angular fighter) ────────────────────────────────────
function buildShip() {
  const g = new THREE.Group()
  // Much lighter materials so the ship is actually visible
  const hull  = new THREE.MeshStandardMaterial({ color: 0x2a5c35, metalness: 0.7, roughness: 0.2, emissive: 0x0a2010, emissiveIntensity: 0.6 })
  const emGrn = new THREE.MeshStandardMaterial({ color: C_GREEN, emissive: C_GREEN, emissiveIntensity: 3 })
  const glass = new THREE.MeshStandardMaterial({ color: C_GREEN, transparent: true, opacity: 0.5, roughness: 0.05 })
  const dark  = new THREE.MeshStandardMaterial({ color: 0x1a3a20, metalness: 0.6, roughness: 0.3, emissive: 0x061008, emissiveIntensity: 0.4 })

  // Hull — hexagonal tapered body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.32, 2.1, 6), hull)
  body.rotation.x = Math.PI / 2; g.add(body)

  // Nose — bright accent
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.7, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a7a45, metalness: 0.8, roughness: 0.1, emissive: 0x143020, emissiveIntensity: 0.8 }))
  nose.rotation.x = Math.PI / 2; nose.position.z = 1.4; g.add(nose)

  // Cockpit dome — glowing green
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), glass)
  dome.rotation.x = -Math.PI / 2; dome.position.set(0, 0.1, 0.45); g.add(dome)

  // Wings
  ;[-1, 1].forEach(s => {
    const v = new Float32Array([0,0,0.35, s*1.9,-0.08,-0.55, s*0.28,0,0.22])
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(v, 3))
    geo.computeVertexNormals()
    g.add(new THREE.Mesh(geo, dark))
    // Bright wing tip
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 5, 5), emGrn)
    tip.position.set(s * 1.88, -0.08, -0.53); g.add(tip)
  })

  // Engine nozzle — bright
  const nozzle = new THREE.Mesh(new THREE.CircleGeometry(0.1, 10), new THREE.MeshBasicMaterial({ color: C_GREEN }))
  nozzle.position.set(0, 0, -1.07); g.add(nozzle)

  // Inner glow ring on nozzle
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.18, 10), new THREE.MeshBasicMaterial({ color: C_GREEN, side: THREE.DoubleSide }))
  ring.position.set(0, 0, -1.06); g.add(ring)

  return g
}

// ── Asteroid (physics object) ──────────────────────────────────────────────────
function buildAsteroid(size) {
  const geo = new THREE.IcosahedronGeometry(size, 2)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const s = 0.6 + Math.random() * 0.8
    pos.setXYZ(i, pos.getX(i)*s, pos.getY(i)*s, pos.getZ(i)*s)
  }
  geo.computeVertexNormals()
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.07 + Math.random()*0.06, 0.12+Math.random()*0.1, 0.38+Math.random()*0.2),
    roughness: 0.85, metalness: 0.08,
  }))
  m.userData.vel    = new THREE.Vector3((Math.random()-.5)*.02,(Math.random()-.5)*.015, 0.025+Math.random()*.03) // very slow
  m.userData.rotVel = new THREE.Vector3((Math.random()-.5)*.02,(Math.random()-.5)*.02,(Math.random()-.5)*.012)
  m.userData.hitR   = size * 1.2  // very generous hit radius
  m.userData.size   = size
  m.userData.alive  = true
  return m
}

function resetAsteroid(a) {
  // Spawn CLOSE and in the CENTER of the screen — easy to see and shoot
  a.position.set(
    (Math.random() - 0.5) * 6,   // spread x: -3 to +3
    (Math.random() - 0.5) * 3.5, // spread y: -1.75 to +1.75
    -8 - Math.random() * 10,      // close z: -8 to -18
  )
  a.userData.vel.set(
    (Math.random()-.5)*.02,
    (Math.random()-.5)*.015,
    0.025 + Math.random()*.025,
  )
  a.userData.alive = true; a.visible = true
}

// ── Bullet ─────────────────────────────────────────────────────────────────────
function buildBullet(x, y) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 7, 7),  // larger — easier to see and hit
    new THREE.MeshBasicMaterial({ color: C_GREEN }),
  )
  m.position.set(x, y, 0.4)
  m.add(new THREE.PointLight(C_GREEN, 6, 4.5))
  return m
}

// ── Explosion ──────────────────────────────────────────────────────────────────
function spawnExplosion(scene, pos, size) {
  const count = 10 + Math.floor(size * 12), parts = []
  for (let i = 0; i < count; i++) {
    const s   = 0.04 + Math.random() * 0.08
    const col = Math.random() > 0.45 ? C_GREEN : C_AMBER
    const p   = new THREE.Mesh(
      new THREE.SphereGeometry(s, 4, 4),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1 }),
    )
    p.position.copy(pos)
    const spd = 0.06 + Math.random() * 0.22
    const phi = Math.random() * Math.PI * 2, tht = Math.acos(2*Math.random()-1)
    p.userData.vel  = new THREE.Vector3(Math.sin(tht)*Math.cos(phi)*spd, Math.sin(tht)*Math.sin(phi)*spd, Math.cos(tht)*spd)
    p.userData.life = 1
    scene.add(p); parts.push(p)
  }
  // Brief flash light
  const fl = new THREE.PointLight(C_AMBER, 20, 7); fl.position.copy(pos); scene.add(fl)
  let t = 0
  const fade = () => { t += 0.1; fl.intensity = Math.max(0, 20-t*20); if (fl.intensity>0) requestAnimationFrame(fade); else scene.remove(fl) }
  fade()
  return parts
}

// ── Main game ──────────────────────────────────────────────────────────────────
function initGame() {
  const canvas     = $('spaceCanvas')
  const flashEl    = $('sgFlash')
  const controlsEl = $('sgControls')
  const skipEl     = $('sgSkip')
  if (!canvas) return

  document.body.classList.add('game-active')

  let gamePhase = 'idle'
  let cleanupFn = null

  setTimeout(() => { if (controlsEl) controlsEl.classList.add('sg-controls-show') }, 2500)

  if (skipEl) {
    skipEl.addEventListener('click', e => {
      e.preventDefault(); dismissGame()
    })
  }

  function dismissGame() {
    document.body.classList.remove('game-active')
    const s = document.getElementById('game')
    if (s) { s.style.transition = 'opacity 0.5s'; s.style.opacity = '0' }
    setTimeout(() => {
      if (s) s.style.display = 'none'
      document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' })
    }, 520)
  }

  startRound()

  function startRound() {
    if (cleanupFn) { cleanupFn(); cleanupFn = null }
    gamePhase = 'playing'
    updateKillBoxes(0)
    if ($('sgLives')) $('sgLives').textContent = livesBar(3)

    const W = window.innerWidth, H = window.innerHeight

    // ── Scene setup ───────────────────────────────────────────────────────────
    const scene    = new THREE.Scene()
    scene.background = new THREE.Color(C_BG)
    scene.fog        = new THREE.FogExp2(C_BG, 0.0014)

    const camera   = new THREE.PerspectiveCamera(65, W/H, 0.1, 600)
    camera.position.set(0, 0.9, 8)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.toneMapping         = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15

    // Lights — much brighter so ship and asteroids are clearly visible
    scene.add(new THREE.AmbientLight(0x204030, 12))  // bright green-tinted ambient
    const key = new THREE.DirectionalLight(0x80ffaa, 4); key.position.set(4, 8, 5); scene.add(key)
    const fill = new THREE.DirectionalLight(0x40aaff, 1.5); fill.position.set(-4, 3, 6); scene.add(fill)
    const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(0, -3, 8); scene.add(rim)

    // ── Starfield (3 depth layers, circular sprites) ─────────────────────────
    const starTex = makeGlowTex()

    function makeStarLayer(n, zNear, zFar, size, bright) {
      const pos = new Float32Array(n*3), col = new Float32Array(n*3)
      for (let i = 0; i < n; i++) {
        pos[i*3]   = (Math.random()-.5)*360
        pos[i*3+1] = (Math.random()-.5)*220
        pos[i*3+2] = -zNear - Math.random()*(zFar-zNear)
        const b = bright * (0.5 + Math.random()*0.5)
        col[i*3] = b*0.88; col[i*3+1] = b*0.94; col[i*3+2] = b  // blue-white tint
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      geo.setAttribute('color',    new THREE.BufferAttribute(col, 3))
      return new THREE.Points(geo, new THREE.PointsMaterial({
        size, vertexColors: true, sizeAttenuation: true,
        transparent: true, alphaTest: 0.005, map: starTex,
      }))
    }

    const starFar  = makeStarLayer(2200, 80,  400, 0.38, 0.55)
    const starMid  = makeStarLayer(700,  30,  160, 0.65, 0.80)
    const starNear = makeStarLayer(120,  10,  70,  1.3,  1.00)
    const starGroup = new THREE.Group()
    starGroup.add(starFar, starMid, starNear); scene.add(starGroup)

    // ── Ship ──────────────────────────────────────────────────────────────────
    const ship = buildShip()
    ship.scale.setScalar(1.4)  // bigger — clearly visible
    scene.add(ship)
    // Front light illuminates the ship clearly from above-front
    const shipLight = new THREE.PointLight(0xaaffcc, 10, 8)
    shipLight.position.set(0, 2, 3); ship.add(shipLight)
    const engineGlow = new THREE.PointLight(C_GREEN, 4, 7)
    engineGlow.position.set(0, 0, -1.6); ship.add(engineGlow)

    // Engine exhaust particle trail
    const EX_N  = 50, exGeo = new THREE.BufferGeometry()
    const exPos = new Float32Array(EX_N*3), exAge = new Float32Array(EX_N)
    for (let i = 0; i < EX_N; i++) { exPos[i*3+2] = -999; exAge[i] = Math.random() }
    exGeo.setAttribute('position', new THREE.BufferAttribute(exPos, 3))
    const exMat = new THREE.PointsMaterial({ color: C_GREEN, size: 0.09, transparent: true, opacity: 0.65, sizeAttenuation: true, map: starTex, alphaTest: 0.01 })
    ship.add(new THREE.Points(exGeo, exMat))

    // ── Asteroids — BIG, CLOSE, CENTERED ──────────────────────────────────────
    const asteroids = []
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      const a = buildAsteroid(1.2 + Math.random() * 0.8)  // MUCH bigger: 1.2–2.0 radius
      a.position.set(
        (Math.random() - 0.5) * 7,    // centered across screen
        (Math.random() - 0.5) * 4,
        -6 - i * 4 - Math.random() * 4, // staggered close: -6 to -26
      )
      scene.add(a); asteroids.push(a)
    }

    // ── State ─────────────────────────────────────────────────────────────────
    const bullets  = [], explosionParts = []
    let _lives = 3, _kills = 0
    let fireCooldown = 0, hitCooldown = 0, warpTime = 0, shakeAmt = 0
    let last = performance.now(), raf

    // Smooth mouse target
    const mx = { x:0, y:0, tx:0, ty:0 }

    // ── Input ─────────────────────────────────────────────────────────────────
    const keys = {}
    const fire = () => {
      if (gamePhase !== 'playing' || fireCooldown > 0) return
      fireCooldown = 7  // faster fire rate
      const b = buildBullet(ship.position.x, ship.position.y)
      scene.add(b); bullets.push(b)
      engineGlow.intensity = 8
    }
    const onKD     = e => { keys[e.code] = true;  if (e.code === 'Space') { e.preventDefault(); fire() } }
    const onKU     = e => { keys[e.code] = false }
    const onMove   = e => { mx.tx = (e.clientX/window.innerWidth-.5)*11; mx.ty = -(e.clientY/window.innerHeight-.5)*7 }
    const onTouch  = e => { if (e.touches[0]) { mx.tx = (e.touches[0].clientX/window.innerWidth-.5)*11; mx.ty = -(e.touches[0].clientY/window.innerHeight-.5)*7 } }
    const onResize = () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight) }

    window.addEventListener('keydown',   onKD)
    window.addEventListener('keyup',     onKU)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onTouch, { passive: true })
    canvas.addEventListener('click',     fire)
    window.addEventListener('resize',    onResize)

    // ── Warp sequence ─────────────────────────────────────────────────────────
    function triggerWarp() {
      gamePhase = 'warping'; warpTime = 0
      announce('ALL TARGETS ELIMINATED — WARPING', 'var(--accent)', 99999)
      setTimeout(() => { if (flashEl) flashEl.className = 'sg-flash sg-flash-green' }, 1400)
      setTimeout(() => { if (flashEl) flashEl.className = 'sg-flash sg-flash-white' }, 2300)
      setTimeout(() => {
        const s = document.getElementById('game')
        if (s) { s.style.transition = 'opacity 0.65s'; s.style.opacity = '0' }
        setTimeout(() => {
          document.body.classList.remove('game-active')
          if (s) s.style.display = 'none'
          document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' })
          setTimeout(() => runDebrief(_kills * 10), 800)
        }, 700)
      }, 2900)
    }

    // ── Render loop ───────────────────────────────────────────────────────────
    function loop(now) {
      raf = requestAnimationFrame(loop)
      const dt = Math.min((now - last) / 16.67, 3); last = now

      // ── WARP animation ──────────────────────────────────────────────────────
      if (gamePhase === 'warping') {
        warpTime += dt
        const t = Math.min(warpTime / 75, 1)
        starFar.material.size  = 0.38 + t*16
        starMid.material.size  = 0.65 + t*22
        starNear.material.size = 1.3  + t*35
        ;[starFar, starMid, starNear].forEach(layer => {
          const buf = layer.geometry.attributes.position
          for (let i = 0; i < buf.count; i++) { const z = buf.getZ(i)+t*7*dt; buf.setZ(i, z>25 ? -400 : z) }
          buf.needsUpdate = true
        })
        camera.fov = Math.min(65 + t*65, 130); camera.updateProjectionMatrix()
        ship.position.z -= t*0.6*dt
        ship.scale.setScalar(1 + t*1.5)
        engineGlow.intensity = 3 + t*50
        renderer.render(scene, camera); return
      }

      if (gamePhase !== 'playing') { renderer.render(scene, camera); return }

      // ── Ship movement ───────────────────────────────────────────────────────
      const boost = keys['ShiftLeft'] || keys['ShiftRight']
      const nudge = boost ? 0.22 : 0.14
      if (keys['KeyA']||keys['ArrowLeft'])  mx.tx -= nudge*dt
      if (keys['KeyD']||keys['ArrowRight']) mx.tx += nudge*dt
      if (keys['KeyW']||keys['ArrowUp'])    mx.ty += nudge*0.7*dt
      if (keys['KeyS']||keys['ArrowDown'])  mx.ty -= nudge*0.7*dt
      mx.tx = Math.max(-6.5, Math.min(6.5, mx.tx))
      mx.ty = Math.max(-3.8, Math.min(3.8, mx.ty))
      mx.x  += (mx.tx - mx.x) * SHIP_FOLLOW * dt
      mx.y  += (mx.ty - mx.y) * SHIP_FOLLOW * dt
      ship.position.set(mx.x, mx.y, 0)

      // Bank & pitch — ship tilts with movement
      const dxIn = (keys['KeyA']||keys['ArrowLeft'] ? -1:0) + (keys['KeyD']||keys['ArrowRight'] ? 1:0)
      ship.rotation.z += (-dxIn*0.35 - ship.rotation.z) * 0.12 * dt
      ship.rotation.y += ((mx.tx-mx.x)*0.06 - ship.rotation.y) * 0.10 * dt
      ship.rotation.x += ((mx.ty-mx.y)*-0.04 - ship.rotation.x) * 0.10 * dt

      // Camera gently follows ship (parallax)
      camera.position.x += (mx.x*0.06 - camera.position.x) * 0.04*dt
      camera.position.y += (mx.y*0.04+0.9 - camera.position.y) * 0.04*dt
      camera.lookAt(mx.x*0.15, mx.y*0.12, -2)

      // Camera shake on hit
      if (shakeAmt > 0) {
        camera.position.x += (Math.random()-.5)*shakeAmt
        camera.position.y += (Math.random()-.5)*shakeAmt*0.7
        shakeAmt *= 0.88; if (shakeAmt < 0.005) shakeAmt = 0
      }

      // Engine pulse & exhaust
      const pulse = Math.sin(now*0.008)*0.4 + (boost ? 5 : 3)
      engineGlow.intensity += (pulse - engineGlow.intensity) * 0.15 * dt
      const exBuf = exGeo.attributes.position
      for (let i = 0; i < EX_N; i++) {
        exAge[i] -= 0.045*dt*(boost ? 1.8:1)
        if (exAge[i] <= 0) {
          exAge[i] = 0.7+Math.random()*0.5
          exBuf.setXYZ(i,(Math.random()-.5)*0.13,(Math.random()-.5)*0.09,-0.92-Math.random()*0.4)
        } else {
          exBuf.setZ(i, exBuf.getZ(i)-0.07*dt)
          exBuf.setX(i, exBuf.getX(i)*(1-0.015*dt))
        }
      }
      exBuf.needsUpdate = true; exMat.opacity = boost ? 0.92 : 0.62

      if (fireCooldown > 0) fireCooldown -= dt
      if (hitCooldown  > 0) hitCooldown  -= dt

      // Starfield parallax drift
      starGroup.position.x += (-mx.x*0.015 - starGroup.position.x) * 0.015*dt
      starGroup.position.y += (-mx.y*0.012 - starGroup.position.y) * 0.015*dt

      // ── Bullets ──────────────────────────────────────────────────────────────
      for (let bi = bullets.length-1; bi >= 0; bi--) {
        const b = bullets[bi]; b.position.z -= BULLET_SPEED * dt
        let hit = false
        for (const a of asteroids) {
          if (!a.userData.alive) continue
          if (b.position.distanceTo(a.position) < a.userData.hitR + 0.08) {
            a.userData.alive = false; a.visible = false
            scene.remove(b); bullets.splice(bi, 1)
            explosionParts.push(...spawnExplosion(scene, a.position.clone(), a.userData.size))
            if (flashEl) { flashEl.className='sg-flash sg-flash-kill'; setTimeout(()=>{ if(flashEl) flashEl.className='sg-flash' },200) }
            _kills++; updateKillBoxes(_kills)
            if (_kills >= TARGET_KILLS) { triggerWarp(); return }
            announce(`TARGET ${_kills}/${TARGET_KILLS} DESTROYED`, 'var(--accent)', 1400)
            setTimeout(() => resetAsteroid(a), 900)
            hit = true; break
          }
        }
        if (!hit && b.position.z < -160) { scene.remove(b); bullets.splice(bi, 1) }
      }

      // ── Asteroids (physics) ───────────────────────────────────────────────────
      for (const a of asteroids) {
        if (!a.userData.alive) continue
        a.position.addScaledVector(a.userData.vel, dt)
        a.rotation.x += a.userData.rotVel.x*dt
        a.rotation.y += a.userData.rotVel.y*dt
        a.rotation.z += a.userData.rotVel.z*dt
        if (a.position.z > 9) resetAsteroid(a)

        if (hitCooldown <= 0 && a.position.distanceTo(ship.position) < a.userData.hitR + 0.35) {  // tighter ship collision
          _lives--; hitCooldown = 90; shakeAmt = 0.18
          if ($('sgLives')) $('sgLives').textContent = livesBar(_lives)
          if (flashEl) { flashEl.className='sg-flash sg-flash-hit'; setTimeout(()=>{ if(flashEl) flashEl.className='sg-flash' },320) }
          resetAsteroid(a)
          if (_lives <= 0) {
            gamePhase = 'respawning'
            announce('SHIELDS DESTROYED — REBOOTING', 'var(--red)', 2200)
            setTimeout(() => startRound(), 2400)
          } else {
            announce(`SHIELD HIT — ${_lives} REMAINING`, 'var(--red)', 1200)
          }
        }
      }

      // ── Explosion particles ───────────────────────────────────────────────────
      for (let i = explosionParts.length-1; i >= 0; i--) {
        const p = explosionParts[i]
        p.userData.life -= 0.035*dt
        p.position.addScaledVector(p.userData.vel, dt)
        p.userData.vel.multiplyScalar(0.93)
        p.material.opacity = p.userData.life
        if (p.userData.life <= 0) { scene.remove(p); explosionParts.splice(i,1) }
      }

      renderer.render(scene, camera)
    }

    raf = requestAnimationFrame(loop)

    cleanupFn = () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown',   onKD)
      window.removeEventListener('keyup',     onKU)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onTouch)
      canvas.removeEventListener('click',     fire)
      window.removeEventListener('resize',    onResize)
      renderer.dispose()
    }
  }
}

// ── Mission debrief ────────────────────────────────────────────────────────────
function runDebrief(score) {
  const overlay = $('sgDebriefOverlay')
  const body    = $('sgDebriefBody')
  const footer  = $('sgDebriefFooter')
  if (!overlay || !body || !footer) return
  const lines = [
    { text:'> loading mission_debrief.sh...',                   delay:0,    color:'var(--ink-dim)'     },
    { text:'> mission_status: COMPLETE ✓',                      delay:400,  color:'var(--accent)'      },
    { text:'> asteroids_destroyed: 3/3',                        delay:750,  color:'var(--accent)'      },
    { text:'> ---',                                              delay:1100, color:'var(--line-strong)' },
    { text:'> subject: ISHAAN SAMANTRAY',                       delay:1400, color:'var(--ink-dim)'     },
    { text:'> affiliation: CORNELL UNIVERSITY',                 delay:1700, color:'var(--ink-dim)'     },
    { text:'> research_internships: 5+',                        delay:2000, color:'var(--ink)'         },
    { text:'> peer_reviewed_pubs: 2',                           delay:2250, color:'var(--ink)'         },
    { text:'> students_reached: 10,000+',                       delay:2500, color:'var(--ink)'         },
    { text:'> status: BUILDING AT WET-LAB × CODE INTERSECTION', delay:2800, color:'var(--accent)'      },
  ]
  body.innerHTML = ''
  overlay.style.display = 'flex'
  requestAnimationFrame(() => overlay.classList.add('sg-debrief-visible'))
  lines.forEach(({ text, delay, color }) => {
    setTimeout(() => {
      const line = document.createElement('div')
      line.className = 'sg-debrief-line'; line.style.color = color; line.textContent = text
      body.appendChild(line); body.scrollTop = body.scrollHeight
    }, delay)
  })
  setTimeout(() => { footer.style.display='block'; requestAnimationFrame(()=>footer.classList.add('sg-debrief-footer-visible')) }, 3400)
  setTimeout(() => { overlay.classList.remove('sg-debrief-visible'); setTimeout(()=>{ overlay.style.display='none' },400) }, 5200)
}

// ── Boot ───────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initGame)
