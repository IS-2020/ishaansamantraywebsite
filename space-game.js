// space-game.js — shoot 3 asteroids → warp → portfolio
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js'

// ── Config ────────────────────────────────────────────────────────────────────
const TARGET_KILLS    = 3
const BASE_SPEED      = 0.20
const BOOST_SPEED     = 0.55
const ASTEROID_COUNT  = 14
const BULLET_SPEED    = 4.5
const GREEN           = 0x7cf29a
const AMBER           = 0xffb454

// ── Helpers ───────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id)
const livesBar = n => '█'.repeat(Math.max(0, n)) + '░'.repeat(Math.max(0, 3 - n))

function announce(text, color = 'var(--accent)', duration = 1800) {
  const el = $('sgAnnouncement')
  if (!el) return
  el.textContent = text
  el.style.color = color
  el.classList.add('sg-announcement-show')
  clearTimeout(el._t)
  el._t = setTimeout(() => el.classList.remove('sg-announcement-show'), duration)
}

function updateKillBoxes(kills) {
  for (let i = 0; i < TARGET_KILLS; i++) {
    const box = $(`sgKill${i}`)
    if (!box) continue
    if (i < kills) {
      box.textContent = '■'
      box.classList.add('filled')
    } else {
      box.textContent = '□'
      box.classList.remove('filled')
    }
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
function buildShip() {
  const g = new THREE.Group()
  const bodyMat   = new THREE.MeshStandardMaterial({ color: 0x0a120a, metalness: 0.9, roughness: 0.15 })
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x1a2a1a, metalness: 0.5, roughness: 0.3, emissive: GREEN, emissiveIntensity: 0.25 })
  const glassMat  = new THREE.MeshStandardMaterial({ color: GREEN, transparent: true, opacity: 0.45, roughness: 0.05 })
  const engineMat = new THREE.MeshStandardMaterial({ color: GREEN, emissive: GREEN, emissiveIntensity: 3 })

  const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.32, 2.0, 8), bodyMat)
  fuse.rotation.x = Math.PI / 2; g.add(fuse)

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.65, 8), accentMat)
  nose.rotation.x = Math.PI / 2; nose.position.z = 1.32; g.add(nose)

  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), glassMat,
  )
  cockpit.rotation.x = -Math.PI / 2; cockpit.position.set(0, 0.1, 0.48); g.add(cockpit)

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
    const wl = new THREE.Mesh(wlGeo, accentMat); wl.position.set(x, 0, -0.5)
    wl.rotation.z = i === 0 ? -0.25 : 0.25; g.add(wl)
  })

  const podGeo   = new THREE.CylinderGeometry(0.09, 0.13, 0.55, 8)
  const flameGeo = new THREE.CircleGeometry(0.09, 8)
  ;[-0.42, 0.42].forEach(x => {
    const pod = new THREE.Mesh(podGeo, bodyMat.clone())
    pod.rotation.x = Math.PI / 2; pod.position.set(x, 0, -0.88); g.add(pod)
    const flame = new THREE.Mesh(flameGeo, engineMat.clone())
    flame.position.set(x, 0, -1.17); g.add(flame)
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
    color: new THREE.Color().setHSL(0.33, 0.05, 0.14 + Math.random() * 0.1),
    roughness: 0.9, metalness: 0.1,
  }))
  mesh.userData.rotSpeed = new THREE.Vector3(
    (Math.random() - 0.5) * 0.04,
    (Math.random() - 0.5) * 0.04,
    (Math.random() - 0.5) * 0.04,
  )
  mesh.userData.hitRadius = size * 0.9
  mesh.userData.alive     = true
  return mesh
}

// ── Bullet ────────────────────────────────────────────────────────────────────
function buildBullet(x, y) {
  const geo = new THREE.SphereGeometry(0.06, 6, 6)
  const mat = new THREE.MeshStandardMaterial({ color: GREEN, emissive: GREEN, emissiveIntensity: 6 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, y, 0.5)
  const light = new THREE.PointLight(GREEN, 3, 2.5)
  mesh.add(light)
  return mesh
}

// ── Explosion particles ───────────────────────────────────────────────────────
function spawnExplosion(scene, position) {
  const particles = []
  const count = 10
  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.04 + Math.random() * 0.06, 4, 4)
    const mat = new THREE.MeshStandardMaterial({
      color: Math.random() > 0.5 ? GREEN : AMBER,
      emissive: Math.random() > 0.5 ? GREEN : AMBER,
      emissiveIntensity: 4,
    })
    const p = new THREE.Mesh(geo, mat)
    p.position.copy(position)
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.25,
      (Math.random() - 0.5) * 0.25,
      (Math.random() - 0.5) * 0.12,
    )
    p.userData.vel  = vel
    p.userData.life = 1.0
    scene.add(p)
    particles.push(p)
  }
  return particles
}

// ── Main ──────────────────────────────────────────────────────────────────────
function initGame() {
  const canvas      = $('spaceCanvas')
  const flashEl     = $('sgFlash')
  const controlsEl  = $('sgControls')
  const skipEl      = $('sgSkip')

  let cleanupFn  = null
  let gamePhase  = 'idle' // idle → playing → respawning → warping → done

  // Show controls hint after 2s
  setTimeout(() => { if (controlsEl) controlsEl.classList.add('sg-controls-show') }, 2000)

  // ── Start immediately ──────────────────────────────────────────────────────
  startRound()

  function startRound() {
    if (cleanupFn) { cleanupFn(); cleanupFn = null }
    gamePhase = 'playing'
    updateKillBoxes(0)
    if ($('sgLives')) $('sgLives').textContent = livesBar(3)

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
    scene.add(new THREE.DirectionalLight(AMBER, 0.8)).position.set(-4, -3, -8)

    // ── Stars ──────────────────────────────────────────────────────────────
    const STAR_N = 4000
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(STAR_N * 3)
    const starBase = [] // original positions for warp reference
    for (let i = 0; i < STAR_N; i++) {
      const x = (Math.random() - 0.5) * 400
      const y = (Math.random() - 0.5) * 400
      const z = (Math.random() - 0.5) * 400
      starPos[i*3] = x; starPos[i*3+1] = y; starPos[i*3+2] = z
      starBase.push(x, y, z)
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xaaffcc, size: 0.45, sizeAttenuation: true })
    const stars   = new THREE.Points(starGeo, starMat)
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
      const a = buildAsteroid(0.28 + Math.random() * 0.55)
      a.position.set((Math.random()-.5)*14, (Math.random()-.5)*8, -40 - Math.random()*80)
      scene.add(a); asteroids.push(a)
    }

    // ── Bullets ────────────────────────────────────────────────────────────
    const bullets = []

    function fireBullet() {
      if (gamePhase !== 'playing') return
      const b = buildBullet(ship.position.x, ship.position.y)
      scene.add(b)
      bullets.push(b)
    }

    // ── Input ──────────────────────────────────────────────────────────────
    const mouse = { x:0, y:0, tx:0, ty:0 }
    const keys  = {}
    let fireCooldown = 0

    const onMove  = e => { const r = canvas.getBoundingClientRect(); mouse.tx = ((e.clientX-r.left)/r.width-.5)*12; mouse.ty = -((e.clientY-r.top)/r.height-.5)*7.5 }
    const onTouch = e => { const t=e.touches[0],r=canvas.getBoundingClientRect(); mouse.tx=((t.clientX-r.left)/r.width-.5)*12; mouse.ty=-((t.clientY-r.top)/r.height-.5)*7.5 }
    const onKD = e => {
      keys[e.code] = true
      if ((e.code === 'Space' || e.code === 'Enter') && fireCooldown <= 0) {
        fireBullet(); fireCooldown = 18
      }
    }
    const onKU    = e => { keys[e.code] = false }
    const onClick = () => { if (gamePhase === 'playing' && fireCooldown <= 0) { fireBullet(); fireCooldown = 18 } }
    const onResize = () => { camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth,window.innerHeight) }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('keydown',   onKD)
    window.addEventListener('keyup',     onKU)
    canvas.addEventListener('click',     onClick)
    window.addEventListener('resize',    onResize)

    // ── State ──────────────────────────────────────────────────────────────
    let _lives      = 3
    let _kills      = 0
    let hitCooldown = 0
    const explosionParticles = []
    let warpTime    = 0
    let last        = performance.now()
    let raf

    // ── Warp sequence ──────────────────────────────────────────────────────
    function triggerWarp() {
      gamePhase = 'warping'
      warpTime  = 0
      announce('MISSION COMPLETE — INITIATING WARP', 'var(--accent)', 99999)

      // CSS flash: first green glow, then white
      setTimeout(() => { if (flashEl) { flashEl.className = 'sg-flash sg-flash-green' } }, 1400)
      setTimeout(() => { if (flashEl) { flashEl.className = 'sg-flash sg-flash-white' } }, 2200)

      // Transition to portfolio
      setTimeout(() => {
        const section = document.getElementById('game')
        if (section) {
          section.style.transition = 'opacity 0.6s ease'
          section.style.opacity    = '0'
        }
        setTimeout(() => {
          if (section) section.style.display = 'none'
          const hero = document.getElementById('home')
          if (hero) hero.scrollIntoView({ behavior: 'smooth' })
          // Run debrief after portfolio entry
          setTimeout(() => runDebrief(_kills * 10), 800)
        }, 700)
      }, 2800)
    }

    // ── Loop ───────────────────────────────────────────────────────────────
    function loop(now) {
      raf = requestAnimationFrame(loop)
      const dt = Math.min((now - last) / 16.67, 3)
      last = now

      // ── Warp animation ──────────────────────────────────────────────────
      if (gamePhase === 'warping') {
        warpTime += dt

        // Star warp: rapidly increase star size and push them toward camera
        const warpT = Math.min(warpTime / 80, 1) // 0→1 over ~80 frames
        starMat.size = 0.45 + warpT * 18          // stars stretch into streaks
        const sBuf = starGeo.attributes.position
        for (let i = 0; i < STAR_N; i++) {
          // Pull stars toward camera (z increases)
          const z = sBuf.getZ(i) + warpT * 4 * dt
          sBuf.setZ(i, z > 15 ? -300 : z)         // wrap if they pass camera
        }
        sBuf.needsUpdate = true

        // Camera FOV widens
        camera.fov = Math.min(70 + warpT * 55, 125)
        camera.updateProjectionMatrix()

        // Ship zooms toward camera
        ship.position.z += warpT * 0.35 * dt
        ship.scale.setScalar(1 + warpT * 0.8)
        ship.rotation.x = -warpT * 0.4   // nose pitches up toward viewer

        // Engine blast during warp
        engineGlow.intensity = 2.5 + warpT * 30
        ship.children.forEach(c => {
          const m = c.material
          if (m?.emissive?.g > 0.9) m.emissiveIntensity = 3 + warpT * 20
        })

        renderer.render(scene, camera)
        return
      }

      if (gamePhase !== 'playing') { renderer.render(scene, camera); return }

      // ── Normal gameplay ─────────────────────────────────────────────────
      const isBoosting = keys['ShiftLeft'] || keys['ShiftRight']
      const speed      = isBoosting ? BOOST_SPEED : BASE_SPEED

      if (keys['KeyA']||keys['ArrowLeft'])  mouse.tx -= 0.14*dt
      if (keys['KeyD']||keys['ArrowRight']) mouse.tx += 0.14*dt
      if (keys['KeyW']||keys['ArrowUp'])    mouse.ty += 0.10*dt
      if (keys['KeyS']||keys['ArrowDown'])  mouse.ty -= 0.10*dt
      mouse.tx = Math.max(-7, Math.min(7, mouse.tx))
      mouse.ty = Math.max(-4.2, Math.min(4.2, mouse.ty))
      mouse.x += (mouse.tx - mouse.x) * 0.10*dt
      mouse.y += (mouse.ty - mouse.y) * 0.10*dt

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

      // Thruster
      const tBuf = tGeo.attributes.position
      for (let i = 0; i < tCount; i++) {
        tAge[i] += 0.042*dt*(isBoosting?1.9:1)
        if (tAge[i]>1) { tAge[i]=0; tBuf.setXYZ(i,(Math.random()-.5)*.22,(Math.random()-.5)*.14,-1.1) }
        else tBuf.setZ(i, tBuf.getZ(i)-0.09*dt)
      }
      tBuf.needsUpdate = true
      tMat.opacity = isBoosting ? 0.95 : 0.65

      stars.rotation.y += 0.00005*dt
      if (hitCooldown > 0) hitCooldown -= dt
      if (fireCooldown > 0) fireCooldown -= dt

      // ── Bullets ──────────────────────────────────────────────────────────
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]
        b.position.z -= BULLET_SPEED * dt

        // Hit asteroid?
        let hit = false
        for (const a of asteroids) {
          if (!a.userData.alive) continue
          const dist = b.position.distanceTo(a.position)
          if (dist < a.userData.hitRadius + 0.08) {
            // Kill the asteroid
            a.userData.alive = false
            const expPos = a.position.clone()
            scene.remove(a)

            // Explosion
            const parts = spawnExplosion(scene, expPos)
            explosionParticles.push(...parts)

            // Kill flash (green)
            if (flashEl) {
              flashEl.className = 'sg-flash sg-flash-kill'
              setTimeout(() => { if (flashEl) flashEl.className = 'sg-flash' }, 180)
            }

            _kills++
            updateKillBoxes(_kills)

            if (_kills >= TARGET_KILLS) {
              scene.remove(b); bullets.splice(i, 1)
              triggerWarp()
              return
            } else {
              announce(`TARGET ${_kills}/${TARGET_KILLS} DESTROYED`, 'var(--accent)', 1200)
              // Respawn asteroid far back
              setTimeout(() => {
                const newA = buildAsteroid(0.28 + Math.random() * 0.55)
                newA.position.set((Math.random()-.5)*14, (Math.random()-.5)*8, -80 - Math.random()*60)
                scene.add(newA); asteroids.push(newA)
              }, 1500)
            }

            hit = true
            break
          }
        }

        if (hit || b.position.z < -180) {
          scene.remove(b); bullets.splice(i, 1)
        }
      }

      // ── Explosion particles ───────────────────────────────────────────────
      for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const p = explosionParticles[i]
        p.userData.life -= 0.04 * dt
        p.position.add(p.userData.vel.clone().multiplyScalar(dt))
        p.material.opacity = p.userData.life
        p.material.transparent = true
        if (p.userData.life <= 0) {
          scene.remove(p); explosionParticles.splice(i, 1)
        }
      }

      // ── Asteroids ─────────────────────────────────────────────────────────
      for (const a of asteroids) {
        if (!a.userData.alive) continue
        a.position.z += speed * dt
        a.rotation.x += a.userData.rotSpeed.x * dt
        a.rotation.y += a.userData.rotSpeed.y * dt
        a.rotation.z += a.userData.rotSpeed.z * dt

        if (a.position.z > 10) {
          a.position.set((Math.random()-.5)*14,(Math.random()-.5)*8,-60-Math.random()*80)
        }

        // Ship hit
        if (hitCooldown <= 0) {
          const dist = a.position.distanceTo(ship.position)
          if (dist < a.userData.hitRadius + 0.32) {
            _lives--
            hitCooldown = 100
            if ($('sgLives')) $('sgLives').textContent = livesBar(_lives)
            a.position.set((Math.random()-.5)*14,(Math.random()-.5)*8,-60-Math.random()*50)

            // Red hit flash
            if (flashEl) {
              flashEl.className = 'sg-flash sg-flash-hit'
              setTimeout(() => { if (flashEl) flashEl.className = 'sg-flash' }, 250)
            }

            if (_lives <= 0) {
              gamePhase = 'respawning'
              announce('SHIP DESTROYED — REBOOTING...', 'var(--red)', 2000)
              setTimeout(() => startRound(), 2200)
              return
            } else {
              announce(`SHIELD HIT — ${_lives} REMAINING`, 'var(--red)', 1200)
            }
          }
        }
      }

      renderer.render(scene, camera)
    }

    raf = requestAnimationFrame(loop)

    cleanupFn = () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('keydown',   onKD)
      window.removeEventListener('keyup',     onKU)
      canvas.removeEventListener('click',     onClick)
      window.removeEventListener('resize',    onResize)
      renderer.dispose()
    }
  }
}

// ── Debrief (reused from before) ──────────────────────────────────────────────
function runDebrief(score) {
  const overlay = document.getElementById('sgDebriefOverlay')
  const body    = document.getElementById('sgDebriefBody')
  const footer  = document.getElementById('sgDebriefFooter')
  if (!overlay || !body || !footer) return

  const lines = [
    { text: '> loading mission_debrief.sh...', delay: 0,    color: 'var(--ink-dim)'   },
    { text: '> mission_status: COMPLETE ✓',    delay: 400,  color: 'var(--accent)'    },
    { text: '> asteroids_destroyed: 3/3',       delay: 750,  color: 'var(--accent)'    },
    { text: '> ---',                             delay: 1100, color: 'var(--line-strong)' },
    { text: '> subject: ISHAAN SAMANTRAY',       delay: 1400, color: 'var(--ink-dim)'   },
    { text: '> affiliation: CORNELL UNIVERSITY', delay: 1700, color: 'var(--ink-dim)'   },
    { text: '> research_internships: 5+',        delay: 2000, color: 'var(--ink)'       },
    { text: '> peer_reviewed_pubs: 2',           delay: 2250, color: 'var(--ink)'       },
    { text: '> students_reached: 10,000+',       delay: 2500, color: 'var(--ink)'       },
    { text: '> status: BUILDING AT WET-LAB × CODE INTERSECTION', delay: 2800, color: 'var(--accent)' },
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
      body.scrollTop = body.scrollHeight
    }, delay)
  })

  setTimeout(() => {
    footer.style.display = 'block'
    requestAnimationFrame(() => footer.classList.add('sg-debrief-footer-visible'))
  }, 3400)

  setTimeout(() => {
    overlay.classList.remove('sg-debrief-visible')
    setTimeout(() => { overlay.style.display = 'none' }, 400)
  }, 5200)
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initGame)
