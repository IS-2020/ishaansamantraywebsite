// space-game.js — terminal spaceship intro for ishaansamantray.com
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js'

// ── Constants ─────────────────────────────────────────────────────────────────
const BASE_SPEED     = 0.22
const BOOST_SPEED    = 0.62
const ASTEROID_COUNT = 18
const RING_COUNT     = 3
const GREEN          = 0x7cf29a
const AMBER          = 0xffb454
const LS_KEY         = 'sg_highscore'

// ── Helpers ───────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id)
const pad = (n, len = 3) => String(n).padStart(len, '0')
const livesBar = n => '█'.repeat(Math.max(0, n)) + '░'.repeat(Math.max(0, 3 - n))

function clearanceLevel(score) {
  if (score >= 80) return { label: 'LEGEND',    color: '#ffb454' }
  if (score >= 40) return { label: 'ACE',        color: '#7cf29a' }
  if (score >= 15) return { label: 'PILOT',      color: '#7cf29a' }
  return              { label: 'TRAINEE',    color: '#9aa0a9' }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
function buildShip() {
  const g = new THREE.Group()
  const bodyMat   = new THREE.MeshStandardMaterial({ color: 0x0a120a, metalness: 0.9, roughness: 0.15 })
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x1a2a1a, metalness: 0.5, roughness: 0.3, emissive: GREEN, emissiveIntensity: 0.25 })
  const glassMat  = new THREE.MeshStandardMaterial({ color: GREEN, transparent: true, opacity: 0.45, roughness: 0.05 })
  const engineMat = new THREE.MeshStandardMaterial({ color: GREEN, emissive: GREEN, emissiveIntensity: 3 })

  const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.32, 2.0, 8), bodyMat)
  fuse.rotation.x = Math.PI / 2
  g.add(fuse)

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.65, 8), accentMat)
  nose.rotation.x = Math.PI / 2
  nose.position.z = 1.32
  g.add(nose)

  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), glassMat,
  )
  cockpit.rotation.x = -Math.PI / 2
  cockpit.position.set(0, 0.1, 0.48)
  g.add(cockpit)

  const makeWing = flip => {
    const v = new Float32Array([0, 0, -0.1, flip * 1.7, -0.04, -0.65, flip * 0.35, 0, 0.55])
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(v, 3))
    geo.computeVertexNormals()
    return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0x080f08, metalness: 0.9, roughness: 0.2, side: THREE.DoubleSide,
    }))
  }
  g.add(makeWing(-1)); g.add(makeWing(1))

  const wlGeo = new THREE.BoxGeometry(0.06, 0.2, 0.42)
  ;[-1.38, 1.38].forEach((x, i) => {
    const wl = new THREE.Mesh(wlGeo, accentMat)
    wl.position.set(x, 0, -0.5)
    wl.rotation.z = i === 0 ? -0.25 : 0.25
    g.add(wl)
  })

  const podGeo   = new THREE.CylinderGeometry(0.09, 0.13, 0.55, 8)
  const flameGeo = new THREE.CircleGeometry(0.09, 8)
  ;[-0.42, 0.42].forEach(x => {
    const pod = new THREE.Mesh(podGeo, bodyMat.clone())
    pod.rotation.x = Math.PI / 2; pod.position.set(x, 0, -0.88)
    g.add(pod)
    const flame = new THREE.Mesh(flameGeo, engineMat.clone())
    flame.position.set(x, 0, -1.17)
    g.add(flame)
  })
  const cf = new THREE.Mesh(new THREE.CircleGeometry(0.13, 8), engineMat.clone())
  cf.position.set(0, 0, -1.04); g.add(cf)
  return g
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
function buildAsteroid(size) {
  const geo = new THREE.IcosahedronGeometry(size, 1)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i,
      pos.getX(i) * (0.75 + Math.random() * 0.5),
      pos.getY(i) * (0.75 + Math.random() * 0.5),
      pos.getZ(i) * (0.75 + Math.random() * 0.5),
    )
  }
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.33, 0.05, 0.12 + Math.random() * 0.1),
    roughness: 0.95, metalness: 0.1,
  }))
  mesh.userData.rotSpeed = new THREE.Vector3(
    (Math.random() - 0.5) * 0.035,
    (Math.random() - 0.5) * 0.035,
    (Math.random() - 0.5) * 0.035,
  )
  mesh.userData.hitRadius = size * 0.85
  return mesh
}

// ── Ring ──────────────────────────────────────────────────────────────────────
function buildRing() {
  return new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.065, 10, 36),
    new THREE.MeshStandardMaterial({ color: GREEN, emissive: GREEN, emissiveIntensity: 2, metalness: 0.3 }),
  )
}

// ── Debrief animation ─────────────────────────────────────────────────────────
function runDebrief(score) {
  const overlay = $('sgDebriefOverlay')
  const body    = $('sgDebriefBody')
  const footer  = $('sgDebriefFooter')

  const cl = clearanceLevel(score)
  const hi = parseInt(localStorage.getItem(LS_KEY) || '0')

  const lines = [
    { text: '> loading mission_debrief.sh...', delay: 0,    color: 'var(--ink-dim)' },
    { text: `> pilot_score: ${pad(score)} pts`,             delay: 500,  color: 'var(--accent)' },
    { text: `> high_score:  ${pad(hi)} pts`,                delay: 900,  color: score >= hi ? 'var(--accent-2)' : 'var(--ink-faint)' },
    { text: `> clearance_level: ${cl.label}`,               delay: 1350, color: cl.color },
    { text: '> ---',                                         delay: 1750, color: 'var(--line-strong)' },
    { text: '> subject: ISHAAN SAMANTRAY',                   delay: 2100, color: 'var(--ink-dim)' },
    { text: '> affiliation: CORNELL UNIVERSITY',             delay: 2450, color: 'var(--ink-dim)' },
    { text: '> research_internships: 5+',                    delay: 2800, color: 'var(--ink)' },
    { text: '> peer_reviewed_pubs: 2',                       delay: 3100, color: 'var(--ink)' },
    { text: '> students_reached: 10,000+',                   delay: 3400, color: 'var(--ink)' },
    { text: '> research_grants: $2,500',                     delay: 3700, color: 'var(--ink)' },
    { text: '> status: BUILDING AT WET-LAB × CODE INTERSECTION', delay: 4100, color: 'var(--accent)' },
  ]

  body.innerHTML = ''
  overlay.style.display = 'flex'
  requestAnimationFrame(() => overlay.classList.add('sg-debrief-visible'))

  lines.forEach(({ text, delay, color }) => {
    setTimeout(() => {
      const line = document.createElement('div')
      line.className = 'sg-debrief-line'
      line.style.color = color
      line.textContent = text
      body.appendChild(line)
      // Scroll to bottom
      body.scrollTop = body.scrollHeight
    }, delay)
  })

  // Show footer + auto-scroll to portfolio
  setTimeout(() => {
    footer.style.display = 'block'
    requestAnimationFrame(() => footer.classList.add('sg-debrief-footer-visible'))
  }, 4800)

  setTimeout(() => {
    overlay.classList.remove('sg-debrief-visible')
    setTimeout(() => {
      overlay.style.display = 'none'
      const hero = document.getElementById('home')
      if (hero) hero.scrollIntoView({ behavior: 'smooth' })
    }, 400)
  }, 6200)
}

// ── Main ──────────────────────────────────────────────────────────────────────
function initGame() {
  let cleanupFn = null

  function startRound() {
    $('sgOverlay').style.display    = 'none'
    $('sgGameOver').style.display   = 'none'
    $('sgHud').style.display        = 'flex'
    $('sgControls').style.display   = 'flex'
    $('sgScrollHint').style.display = 'block'
    $('sgLives').textContent        = livesBar(3)
    $('sgScore').textContent        = pad(0)

    if (cleanupFn) { cleanupFn(); cleanupFn = null }

    const canvas = $('spaceCanvas')
    const W = window.innerWidth, H = window.innerHeight

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene    = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0b0d)
    const camera   = new THREE.PerspectiveCamera(70, W / H, 0.1, 800)
    camera.position.set(0, 1.6, 7.5)
    camera.lookAt(0, 0, 0)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0

    // ── Lights ─────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x0d1a0d, 4))
    const key = new THREE.DirectionalLight(0x44ff88, 3)
    key.position.set(4, 8, 5); scene.add(key)
    const rim = new THREE.DirectionalLight(AMBER, 0.8)
    rim.position.set(-4, -3, -8); scene.add(rim)

    // ── Stars ──────────────────────────────────────────────────────────────
    const starGeo = new THREE.BufferGeometry()
    const sp = new Float32Array(4000 * 3)
    for (let i = 0; i < 4000; i++) {
      sp[i*3]   = (Math.random() - 0.5) * 500
      sp[i*3+1] = (Math.random() - 0.5) * 500
      sp[i*3+2] = (Math.random() - 0.5) * 500
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3))
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xaaffcc, size: 0.45, sizeAttenuation: true }))
    scene.add(stars)

    // ── Nebula ─────────────────────────────────────────────────────────────
    const nebGeo = new THREE.BufferGeometry()
    const np = new Float32Array(700 * 3), nc = new Float32Array(700 * 3)
    const cols = [[0.02,0.18,0.04],[0.04,0.08,0.02],[0.0,0.12,0.06]]
    for (let i = 0; i < 700; i++) {
      np[i*3] = (Math.random()-.5)*250; np[i*3+1] = (Math.random()-.5)*130; np[i*3+2] = -30 - Math.random()*250
      const c = cols[i%3]; nc[i*3] = c[0]; nc[i*3+1] = c[1]; nc[i*3+2] = c[2]
    }
    nebGeo.setAttribute('position', new THREE.BufferAttribute(np, 3))
    nebGeo.setAttribute('color',    new THREE.BufferAttribute(nc, 3))
    scene.add(new THREE.Points(nebGeo, new THREE.PointsMaterial({
      size: 3, vertexColors: true, transparent: true, opacity: 0.28, sizeAttenuation: true,
    })))

    // ── Ship ───────────────────────────────────────────────────────────────
    const ship = buildShip()
    scene.add(ship)
    const engineGlow = new THREE.PointLight(GREEN, 2.5, 4.5)
    engineGlow.position.set(0, 0, -1.6); ship.add(engineGlow)

    // Thruster particles
    const tCount = 60, tGeo = new THREE.BufferGeometry()
    const tPos = new Float32Array(tCount * 3), tAge = new Float32Array(tCount)
    for (let i = 0; i < tCount; i++) {
      tPos[i*3] = (Math.random()-.5)*.22; tPos[i*3+1] = (Math.random()-.5)*.14; tPos[i*3+2] = -1.1 - Math.random()*2.2
      tAge[i] = Math.random()
    }
    tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3))
    const tMat = new THREE.PointsMaterial({ color: GREEN, size: 0.11, transparent: true, opacity: 0.7, sizeAttenuation: true })
    ship.add(new THREE.Points(tGeo, tMat))

    // ── Asteroids ──────────────────────────────────────────────────────────
    const asteroids = []
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      const a = buildAsteroid(0.22 + Math.random() * 0.55)
      a.position.set((Math.random()-.5)*18, (Math.random()-.5)*10, -55 - Math.random()*100)
      scene.add(a); asteroids.push(a)
    }

    // ── Rings ──────────────────────────────────────────────────────────────
    const rings = []
    for (let i = 0; i < RING_COUNT; i++) {
      const r = buildRing()
      r.position.set((Math.random()-.5)*10, (Math.random()-.5)*6, -90 - i*70)
      r.userData.scored = false; scene.add(r); rings.push(r)
    }

    // ── Input ──────────────────────────────────────────────────────────────
    const mouse = { x:0, y:0, tx:0, ty:0 }
    const keys  = {}
    const onMove  = e => { const r = canvas.getBoundingClientRect(); mouse.tx = ((e.clientX-r.left)/r.width-.5)*12; mouse.ty = -((e.clientY-r.top)/r.height-.5)*7.5 }
    const onTouch = e => { const t=e.touches[0],r=canvas.getBoundingClientRect(); mouse.tx=((t.clientX-r.left)/r.width-.5)*12; mouse.ty=-((t.clientY-r.top)/r.height-.5)*7.5 }
    const onKD = e => { keys[e.code] = true }
    const onKU = e => { keys[e.code] = false }
    const onResize = () => { camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth,window.innerHeight) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('keydown',   onKD)
    window.addEventListener('keyup',     onKU)
    window.addEventListener('resize',    onResize)

    // ── State ──────────────────────────────────────────────────────────────
    let _lives = 3, _score = 0, running = true, hitCooldown = 0
    let last = performance.now(), raf

    // ── Loop ───────────────────────────────────────────────────────────────
    function loop(now) {
      raf = requestAnimationFrame(loop)
      const dt = Math.min((now - last) / 16.67, 3)
      last = now
      if (!running) { renderer.render(scene, camera); return }

      const isBoosting = keys['Space'] || keys['ShiftLeft'] || keys['ShiftRight']
      const speed      = isBoosting ? BOOST_SPEED : BASE_SPEED

      if (keys['KeyA']||keys['ArrowLeft'])  mouse.tx -= 0.14*dt
      if (keys['KeyD']||keys['ArrowRight']) mouse.tx += 0.14*dt
      if (keys['KeyW']||keys['ArrowUp'])    mouse.ty += 0.10*dt
      if (keys['KeyS']||keys['ArrowDown'])  mouse.ty -= 0.10*dt
      mouse.tx = Math.max(-7, Math.min(7, mouse.tx))
      mouse.ty = Math.max(-4.2, Math.min(4.2, mouse.ty))
      mouse.x += (mouse.tx - mouse.x) * 0.10 * dt
      mouse.y += (mouse.ty - mouse.y) * 0.10 * dt

      ship.position.set(mouse.x, mouse.y, 0)
      ship.rotation.z = (mouse.x - mouse.tx) * 0.2
      ship.rotation.x = (mouse.ty - mouse.y) * 0.12

      camera.position.x += (mouse.x*0.055 - camera.position.x) * 0.04*dt
      camera.position.y += (mouse.y*0.04+1.6 - camera.position.y) * 0.04*dt
      camera.lookAt(mouse.x*0.18, mouse.y*0.15, -2)

      // Engine pulse
      const pulse = Math.sin(now*0.007)*0.5 + (isBoosting ? 5 : 2.5)
      ship.children.forEach(c => { const m = c.material; if (m?.emissive?.g > 0.9) m.emissiveIntensity = pulse })
      engineGlow.intensity = pulse
      const boostBadge = $('sgBoostBadge')
      if (boostBadge) boostBadge.style.opacity = isBoosting ? '1' : '0'

      // Thruster
      const tBuf = tGeo.attributes.position
      for (let i = 0; i < tCount; i++) {
        tAge[i] += 0.042*dt*(isBoosting?1.9:1)
        if (tAge[i]>1) { tAge[i]=0; tBuf.setXYZ(i,(Math.random()-.5)*.22,(Math.random()-.5)*.14,-1.1) }
        else tBuf.setZ(i, tBuf.getZ(i)-0.09*dt)
      }
      tBuf.needsUpdate = true
      tMat.opacity = isBoosting ? 0.95 : 0.65

      stars.rotation.y += 0.00006*dt
      if (hitCooldown > 0) hitCooldown -= dt

      // Asteroids
      for (const a of asteroids) {
        a.position.z += speed*dt
        a.rotation.x += a.userData.rotSpeed.x*dt
        a.rotation.y += a.userData.rotSpeed.y*dt
        a.rotation.z += a.userData.rotSpeed.z*dt

        if (a.position.z > 10) {
          a.position.set((Math.random()-.5)*18,(Math.random()-.5)*10,-65-Math.random()*80)
          _score++
          $('sgScore').textContent = pad(_score)
        }

        if (hitCooldown <= 0 && a.position.distanceTo(ship.position) < a.userData.hitRadius + 0.32) {
          _lives--
          hitCooldown = 90
          $('sgLives').textContent = livesBar(_lives)
          a.position.set((Math.random()-.5)*18,(Math.random()-.5)*10,-65-Math.random()*50)

          // Hit flash
          const flash = $('sgHitFlash')
          if (flash) { flash.style.opacity = '0.45'; setTimeout(() => flash.style.opacity = '0', 220) }

          if (_lives <= 0) { running = false; endRound(_score); return }
        }
      }

      // Rings
      for (const r of rings) {
        r.position.z += speed*dt
        r.rotation.z  += 0.007*dt
        if (r.position.z > 10) {
          r.position.set((Math.random()-.5)*10,(Math.random()-.5)*6,-90-Math.random()*70)
          r.userData.scored = false
        }
        if (!r.userData.scored && Math.abs(r.position.z) < 1.8) {
          const dx = Math.abs(ship.position.x-r.position.x), dy = Math.abs(ship.position.y-r.position.y)
          if (dx<1.2 && dy<1.2) {
            r.userData.scored = true; _score += 5
            $('sgScore').textContent = pad(_score)
            $('sgScore').classList.add('ring-flash')
            setTimeout(() => $('sgScore').classList.remove('ring-flash'), 500)
          }
        }
      }

      renderer.render(scene, camera)
    }

    raf = requestAnimationFrame(loop)

    cleanupFn = () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('keydown',   onKD)
      window.removeEventListener('keyup',     onKU)
      window.removeEventListener('resize',    onResize)
      renderer.dispose()
    }
  }

  // ── End round → save high score, show game over ───────────────────────────
  function endRound(score) {
    $('sgHud').style.display        = 'none'
    $('sgControls').style.display   = 'none'
    $('sgScrollHint').style.display = 'none'
    const boost = $('sgBoostBadge')
    if (boost) boost.style.opacity = '0'

    const prev = parseInt(localStorage.getItem(LS_KEY) || '0')
    const isNew = score > prev
    if (isNew) localStorage.setItem(LS_KEY, score)

    $('sgFinalScore').textContent = pad(score)
    $('sgHighScoreLabel').textContent = isNew
      ? `★ new high score! (prev: ${pad(prev)})`
      : `high score: ${pad(Math.max(prev, score))}`
    $('sgGameOver').style.display = 'flex'
  }

  // ── Debrief trigger (from "enter_portfolio" button) ───────────────────────
  function goDebrief() {
    $('sgGameOver').style.display = 'none'
    const score = parseInt($('sgFinalScore').textContent) || 0
    runDebrief(score)
  }

  // ── Wire buttons ──────────────────────────────────────────────────────────
  $('sgLaunch').addEventListener('click', () => {
    const ov = $('sgOverlay')
    ov.style.opacity = '0'; ov.style.transform = 'translateY(-8px)'
    setTimeout(() => startRound(), 350)
  })

  $('sgRetry').addEventListener('click', () => startRound())
  $('sgDebrief').addEventListener('click', goDebrief)

  // Clicking "skip" on start screen just navigates — no debrief needed
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initGame)
