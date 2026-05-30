// space-game.js — immersive career shooter v3 · ishaansamantray.com
// personalized asteroids · click-to-aim · terminal HUD · nebula/grid bg
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js'

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = { bg:0x030508, green:0x7cf29a, amber:0xffb454, red:0xff6b6b, blue:0x6ea8ff }

// ─── Asteroid roster (Ishaan's real experience) ───────────────────────────────
const ROSTER = [
  { org:'Vaxon Space',    tag:'vleo · propulsion · darpa-backed',       col:0x6ea8ff, size:1.45, shape:'dodeca' },
  { org:'NIH · NEI',      tag:'lipid-u-net · retinal ai · publication', col:0x7cf29a, size:1.75, shape:'icosa'  },
  { org:'Aegis',          tag:'school safety ai · stealth startup',      col:0xff6b6b, size:1.55, shape:'dodeca' },
  { org:'Sanaria',        tag:'malaria vaccine · pcr genetics · pub',    col:0xffb454, size:1.35, shape:'icosa'  },
  { org:'Kids For Code',  tag:'10,000+ students · 37 states',           col:0xa78bfa, size:1.60, shape:'octa'   },
  { org:'AstraZeneca',    tag:'pharma r&d · business development',       col:0x38bdf8, size:1.25, shape:'octa'   },
  { org:'Johns Hopkins',  tag:'labcote · surgical jig · cad',            col:0xfbbf24, size:1.30, shape:'icosa'  },
  { org:'AguaClara',      tag:'uasb reactor · field deployment',         col:0x34d399, size:1.40, shape:'dodeca' },
  { org:'Map Collective', tag:'agentic ai · dod tradewinds · gsa',       col:0x7cf29a, size:1.20, shape:'octa'   },
  { org:'Medimint',       tag:'incident reports · $8m penn medicine',    col:0x38bdf8, size:1.15, shape:'dodeca' },
]

const TARGET_KILLS = 3
const BULLET_SPEED = 9

// ─── Helpers ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id)
const px = n => `${n}px`

// ─── Canvas textures ─────────────────────────────────────────────────────────
function glowTex(r, g, b) {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const ctx = c.getContext('2d')
  const gr = ctx.createRadialGradient(32,32,0,32,32,32)
  const ri=r*255|0, gi=g*255|0, bi=b*255|0
  gr.addColorStop(0,   `rgba(${ri},${gi},${bi},1)`)
  gr.addColorStop(0.3, `rgba(${ri},${gi},${bi},0.6)`)
  gr.addColorStop(0.7, `rgba(${ri},${gi},${bi},0.1)`)
  gr.addColorStop(1,   'rgba(0,0,0,0)')
  ctx.fillStyle = gr; ctx.fillRect(0,0,64,64)
  return new THREE.CanvasTexture(c)
}

function rockTex(hexColor) {
  const c = document.createElement('canvas'); c.width = c.height = 256
  const ctx = c.getContext('2d')
  const col = new THREE.Color(hexColor)
  ctx.fillStyle = `rgb(${col.r*160|0},${col.g*160|0},${col.b*160|0})`
  ctx.fillRect(0,0,256,256)
  for (let i = 0; i < 3000; i++) {
    const x=Math.random()*256, y=Math.random()*256, r=1+Math.random()*3.5
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2)
    ctx.fillStyle = Math.random() > .5
      ? `rgba(${col.r*255|0},${col.g*255|0},${col.b*255|0},0.3)`
      : 'rgba(0,0,0,0.42)'
    ctx.fill()
  }
  for (let i = 0; i < 16; i++) {
    const x=Math.random()*256, y=Math.random()*256, r=5+Math.random()*20
    const gr = ctx.createRadialGradient(x,y,0,x,y,r)
    gr.addColorStop(0,   'rgba(0,0,0,0.55)')
    gr.addColorStop(0.55,'rgba(0,0,0,0.15)')
    gr.addColorStop(1,   'rgba(0,0,0,0)')
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=gr; ctx.fill()
  }
  for (let i = 0; i < 8; i++) {
    const x=Math.random()*256, y=Math.random()*256, r=3+Math.random()*8
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2)
    ctx.fillStyle = `rgba(${Math.min(255,col.r*255+80)|0},${Math.min(255,col.g*255+80)|0},${Math.min(255,col.b*255+80)|0},0.18)`
    ctx.fill()
  }
  return new THREE.CanvasTexture(c)
}

function nebulaTex(r, g, b) {
  const c = document.createElement('canvas'); c.width = c.height = 512
  const ctx = c.getContext('2d')
  for (let i = 0; i < 7; i++) {
    const x=60+Math.random()*390, y=60+Math.random()*390, rad=70+Math.random()*200
    const a=0.05+Math.random()*0.12
    const gr = ctx.createRadialGradient(x,y,0,x,y,rad)
    gr.addColorStop(0,   `rgba(${r},${g},${b},${a})`)
    gr.addColorStop(0.45,`rgba(${r},${g},${b},${a*.4})`)
    gr.addColorStop(1,   'rgba(0,0,0,0)')
    ctx.fillStyle = gr; ctx.fillRect(0,0,512,512)
  }
  return new THREE.CanvasTexture(c)
}

// ─── Ship ─────────────────────────────────────────────────────────────────────
function buildShip() {
  const g = new THREE.Group()
  const silver  = new THREE.MeshStandardMaterial({ color:0xccd8e8, metalness:.88, roughness:.16, emissive:0x1a2a3a, emissiveIntensity:.35 })
  const accent  = new THREE.MeshStandardMaterial({ color:C.green,  emissive:C.green,  emissiveIntensity:2.8 })
  const amber   = new THREE.MeshStandardMaterial({ color:C.amber,  emissive:C.amber,  emissiveIntensity:2.2 })
  const cockpit = new THREE.MeshStandardMaterial({ color:0x99ffcc, emissive:C.green,  emissiveIntensity:1.0, transparent:true, opacity:.88, roughness:.04 })
  const dark    = new THREE.MeshStandardMaterial({ color:0x4a5e6e, metalness:.75, roughness:.28 })

  const fuse = new THREE.Mesh(new THREE.CylinderGeometry(.08,.28,2.0,6), silver)
  fuse.rotation.x = Math.PI/2; g.add(fuse)
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.08,.85,6), silver)
  nose.rotation.x = Math.PI/2; nose.position.z = 1.3; g.add(nose)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.22,12,8,0,Math.PI*2,0,Math.PI*.55), cockpit)
  dome.rotation.x = -Math.PI/2; dome.position.set(0,.12,.35); g.add(dome)

  ;[-1,1].forEach(s => {
    const v = new Float32Array([0,0,.3, s*2.25,-.05,-.75, s*.22,0,.2])
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position',new THREE.BufferAttribute(v,3)); geo.computeVertexNormals()
    g.add(new THREE.Mesh(geo, dark))
    const sv = new Float32Array([s*.7,-.04,-.08, s*2.05,-.04,-.7, s*.55,-.04,.06])
    const sgeo = new THREE.BufferGeometry()
    sgeo.setAttribute('position',new THREE.BufferAttribute(sv,3)); sgeo.computeVertexNormals()
    g.add(new THREE.Mesh(sgeo, accent))
    const tip = new THREE.Mesh(new THREE.SphereGeometry(.065,6,6), amber)
    tip.position.set(s*2.22,-.05,-.73); g.add(tip)
  })

  ;[-.22,.22].forEach(ox => {
    const nac = new THREE.Mesh(new THREE.CylinderGeometry(.07,.10,.55,6), dark)
    nac.rotation.x = Math.PI/2; nac.position.set(ox*2.4,-.03,-.62); g.add(nac)
    const noz = new THREE.Mesh(new THREE.CircleGeometry(.07,8), accent)
    noz.position.set(ox*2.4,-.03,-.9); g.add(noz)
  })

  const cnac = new THREE.Mesh(new THREE.CylinderGeometry(.065,.095,.42,8), dark)
  cnac.rotation.x = Math.PI/2; cnac.position.z = -1.1; g.add(cnac)
  const cnoz = new THREE.Mesh(new THREE.CircleGeometry(.065,10), accent)
  cnoz.position.z = -1.32; g.add(cnoz)
  const cring = new THREE.Mesh(new THREE.RingGeometry(.065,.14,10),
    new THREE.MeshBasicMaterial({color:C.green,side:THREE.DoubleSide,transparent:true,opacity:.65}))
  cring.position.z = -1.31; g.add(cring)
  return g
}

// ─── Asteroid ─────────────────────────────────────────────────────────────────
function buildAsteroid(entry) {
  const {col,size,shape} = entry
  let geo
  if (shape==='icosa')  geo = new THREE.IcosahedronGeometry(size,2)
  if (shape==='dodeca') geo = new THREE.DodecahedronGeometry(size,1)
  if (shape==='octa')   geo = new THREE.OctahedronGeometry(size,2)
  const pos = geo.attributes.position
  for (let i=0; i<pos.count; i++) {
    const s=.62+Math.random()*.75
    pos.setXYZ(i,pos.getX(i)*s,pos.getY(i)*s,pos.getZ(i)*s)
  }
  geo.computeVertexNormals()
  const mat = new THREE.MeshStandardMaterial({
    map:rockTex(col), color:0xffffff, roughness:.88, metalness:.06,
    emissive:new THREE.Color(col), emissiveIntensity:.04,
  })
  const mesh = new THREE.Mesh(geo,mat)
  mesh.userData = {
    entry,
    vel:    new THREE.Vector3((Math.random()-.5)*.018,(Math.random()-.5)*.013,.022+Math.random()*.028),
    rotVel: new THREE.Vector3((Math.random()-.5)*.022,(Math.random()-.5)*.020,(Math.random()-.5)*.014),
    hitR:   size*1.2,
    alive:  true,
    highlight: 0,
  }
  return mesh
}

// ─── Bullet ───────────────────────────────────────────────────────────────────
function buildBullet(pos, dir) {
  const grp = new THREE.Group()
  grp.position.copy(pos); grp.userData.dir = dir.clone().normalize()
  grp.add(new THREE.Mesh(new THREE.SphereGeometry(.09,8,8),
    new THREE.MeshBasicMaterial({color:0xffffff})))
  for (let i=1; i<=4; i++) {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(.09*(1-i*.18),6,6),
      new THREE.MeshBasicMaterial({color:C.green,transparent:true,opacity:1-i*.22}))
    orb.position.copy(dir).multiplyScalar(-i*.2); grp.add(orb)
  }
  grp.add(new THREE.PointLight(C.green,9,5.5))
  return grp
}

// ─── Explosion ────────────────────────────────────────────────────────────────
function spawnExplosion(scene, pos, col, size) {
  const count=14+(size*12)|0, parts=[]
  for (let i=0; i<count; i++) {
    const s=.05+Math.random()*.11
    const p = new THREE.Mesh(new THREE.SphereGeometry(s,4,4),
      new THREE.MeshBasicMaterial({color:Math.random()>.45?col:C.amber,transparent:true,opacity:1}))
    p.position.copy(pos)
    const spd=.07+Math.random()*.3, phi=Math.random()*Math.PI*2, tht=Math.acos(2*Math.random()-1)
    p.userData.vel  = new THREE.Vector3(Math.sin(tht)*Math.cos(phi)*spd,Math.sin(tht)*Math.sin(phi)*spd,Math.cos(tht)*spd)
    p.userData.life = 1
    scene.add(p); parts.push(p)
  }
  const fl=new THREE.PointLight(col,35,10); fl.position.copy(pos); scene.add(fl)
  let t=0; const fade=()=>{t+=.1;fl.intensity=Math.max(0,35-t*35);if(fl.intensity>0)requestAnimationFrame(fade);else scene.remove(fl)}; fade()
  return parts
}

// ─── Label manager (HTML overlays) ────────────────────────────────────────────
class LabelManager {
  constructor(con, cam, ren) { this.con=con; this.cam=cam; this.ren=ren; this.map=new Map() }
  add(mesh) {
    const div=document.createElement('div'); div.className='sg-asteroid-label'
    const e=mesh.userData.entry
    div.innerHTML=`<span class="sg-al-org">${e.org}</span><span class="sg-al-tag">${e.tag}</span>`
    div.style.setProperty('--col','#'+new THREE.Color(e.col).getHexString())
    this.con.appendChild(div); this.map.set(mesh,div)
  }
  remove(mesh){const d=this.map.get(mesh);if(d){d.remove();this.map.delete(mesh)}}
  update() {
    const w=this.ren.domElement.clientWidth, h=this.ren.domElement.clientHeight
    const v=new THREE.Vector3()
    this.map.forEach((div,mesh)=>{
      if(!mesh.userData.alive){div.style.opacity='0';return}
      v.copy(mesh.position).project(this.cam)
      const sx=(v.x*.5+.5)*w, sy=(-v.y*.5+.5)*h
      if(v.z>1){div.style.opacity='0';return}
      div.style.left=px(sx); div.style.top=px(sy-mesh.userData.hitR*78)
      div.style.opacity=String(Math.min(1,Math.max(0,(mesh.position.z+45)/35)))
    })
  }
  clear(){this.map.forEach(d=>d.remove());this.map.clear()}
}

// ─── HUD helpers ──────────────────────────────────────────────────────────────
function updateShieldsHUD(n) {
  const el=$('sgShields'); if(!el)return
  el.textContent='█'.repeat(Math.max(0,n))+'░'.repeat(Math.max(0,3-n))
  el.style.color=n>=2?'var(--accent)':n===1?'var(--accent-2)':'var(--red)'
}
function updateTargetsHUD(n) {
  const el=$('sgTargets'); if(!el)return
  el.textContent='■'.repeat(n)+'□'.repeat(Math.max(0,3-n))
}
function addLog(text, color='var(--ink-dim)') {
  const log=$('sgLog'); if(!log)return
  const line=document.createElement('div'); line.className='sg-log-line'
  line.style.color=color; line.textContent='> '+text
  log.appendChild(line)
  while(log.children.length>7)log.removeChild(log.firstChild)
  log.scrollTop=log.scrollHeight
}
function announce(text, color='var(--accent)', ms=1800) {
  const el=$('sgAnnounce'); if(!el)return
  el.textContent=text; el.style.color=color
  el.classList.add('sg-announce-show')
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('sg-announce-show'),ms)
}
function flash(type='green') {
  const el=$('sgFlash'); if(!el)return
  const cls={green:'sg-flash-green',white:'sg-flash-white',kill:'sg-flash-kill',hit:'sg-flash-hit'}
  el.className='sg-flash '+(cls[type]||'sg-flash-green')
  setTimeout(()=>{if(el)el.className='sg-flash'},type==='hit'?360:230)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function initGame() {
  const canvas=$('spaceCanvas'); if(!canvas)return

  // Boot sequence
  const bootEl=$('sgBoot'), bootLines=$('sgBootLines')
  // Hard-code boot lines with inline colors (no CSS vars — always dark)
  const BOOT=[
    {t:0,    col:'#5c616c', tx:'> initializing starmap...'},
    {t:380,  col:'#5c616c', tx:'> loading career.dat ············ OK'},
    {t:820,  col:'#5c616c', tx:'> scanning experience.log ···· 10 entries found'},
    {t:1280, col:'#ffb454', tx:'> WARNING: 3 hostile asteroids inbound'},
    {t:1720, col:'#5c616c', tx:'> arming laser systems ············ OK'},
    {t:2150, col:'#7cf29a', tx:'> LAUNCH READY — mission briefing loading'},
  ]
  BOOT.forEach(({t,col,tx})=>setTimeout(()=>{
    const l=document.createElement('div'); l.className='sg-boot-line'; l.style.color=col; l.textContent=tx
    if(bootLines)bootLines.appendChild(l)
  },t))
  setTimeout(()=>{
    if(bootEl)bootEl.classList.add('sg-boot-out')
    setTimeout(()=>{
      if(bootEl)bootEl.style.display='none'
      const s=$('sgMission')
      if(s){s.style.display='flex';requestAnimationFrame(()=>s.classList.add('sg-mission-in'))}
    },480)
  },2650)

  const skipEl=$('sgSkip')
  if(skipEl)skipEl.addEventListener('click',e=>{e.preventDefault();dismissGame()})
  const launchEl=$('sgLaunch')
  if(launchEl)launchEl.addEventListener('click',()=>{
    const s=$('sgMission')
    if(s){s.classList.add('sg-mission-out');setTimeout(()=>{s.style.display='none'},400)}
    startRound()
  })

  function dismissGame() {
    document.body.classList.remove('game-active')
    const s=$('game'); if(s){s.style.transition='opacity .5s';s.style.opacity='0'}
    setTimeout(()=>{if(s)s.style.display='none';$('home')?.scrollIntoView({behavior:'smooth'})},520)
  }

  let cleanupFn=null, phase='boot'

  function startRound() {
    if(cleanupFn){cleanupFn();cleanupFn=null}
    phase='playing'
    const topBar=$('sgTopBar'),botBar=$('sgBottomBar'),labelCon=$('sgLabels')
    if(topBar)topBar.style.display='flex'
    if(botBar)botBar.style.display='block'
    if(labelCon)labelCon.style.display='block'

    const W=window.innerWidth, H=window.innerHeight

    // Scene
    const scene=new THREE.Scene()
    scene.background=new THREE.Color(C.bg)
    scene.fog=new THREE.FogExp2(C.bg,.0018)
    const camera=new THREE.PerspectiveCamera(60,W/H,.1,500)
    camera.position.set(0,.8,8); camera.lookAt(0,0,0)
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true})
    renderer.setSize(W,H); renderer.setPixelRatio(Math.min(devicePixelRatio,2))
    renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.1

    // Lights
    scene.add(new THREE.AmbientLight(0x1a3028,15))
    const key=new THREE.DirectionalLight(0xb8ffcc,5); key.position.set(5,8,6); scene.add(key)
    const fill=new THREE.DirectionalLight(0x4488ff,2.2); fill.position.set(-5,3,5); scene.add(fill)
    scene.add(Object.assign(new THREE.DirectionalLight(0xffffff,1.2),{position:new THREE.Vector3(0,-3,9)}))

    // Grid floor
    const grid=new THREE.GridHelper(320,64,0x1e2229,0x1e2229)
    grid.material.transparent=true; grid.material.opacity=.2
    grid.position.set(0,-7,-35); scene.add(grid)

    // Nebula quads
    const nbGeo=new THREE.PlaneGeometry(240,150)
    ;[
      [8,55,28,  -30, 15,-290, 0   ],
      [6, 6,50,   55,-12,-330, .4  ],
      [42,12,6,  -22,-28,-260,-.3  ],
    ].forEach(([r,g,b,x,y,z,rz])=>{
      const m=new THREE.Mesh(nbGeo,new THREE.MeshBasicMaterial({
        map:nebulaTex(r,g,b),transparent:true,opacity:.5,
        depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide
      })); m.position.set(x,y,z); m.rotation.z=rz; scene.add(m)
    })

    // Stars
    const starTex=glowTex(.86,.93,1)
    function starLayer(n,zN,zF,sz,br) {
      const pos=new Float32Array(n*3),col=new Float32Array(n*3)
      for(let i=0;i<n;i++){
        pos[i*3]=(Math.random()-.5)*420; pos[i*3+1]=(Math.random()-.5)*260; pos[i*3+2]=-zN-Math.random()*(zF-zN)
        const b=br*(.4+Math.random()*.6); col[i*3]=b*.82;col[i*3+1]=b*.9;col[i*3+2]=b
      }
      const geo=new THREE.BufferGeometry()
      geo.setAttribute('position',new THREE.BufferAttribute(pos,3))
      geo.setAttribute('color',   new THREE.BufferAttribute(col,3))
      return new THREE.Points(geo,new THREE.PointsMaterial({
        size:sz,vertexColors:true,sizeAttenuation:true,transparent:true,alphaTest:.004,map:starTex
      }))
    }
    const sF=starLayer(2400,80,420,.35,.5)
    const sM=starLayer(800,30,170,.62,.75)
    const sN=starLayer(140,10,75,1.2,1)
    const stars=new THREE.Group(); stars.add(sF,sM,sN); scene.add(stars)

    // Ship
    const ship=buildShip(); ship.scale.setScalar(1.5); scene.add(ship)
    const shipSpot=new THREE.SpotLight(0xffffff,20,14,Math.PI/3,.5)
    shipSpot.position.set(0,3,5); scene.add(shipSpot); shipSpot.target=ship
    const engGlow=new THREE.PointLight(C.green,5,8); engGlow.position.set(0,0,-1.6); ship.add(engGlow)
    const EX=60, exGeo=new THREE.BufferGeometry()
    const exPos=new Float32Array(EX*3), exAge=new Float32Array(EX)
    for(let i=0;i<EX;i++){exPos[i*3+2]=-999;exAge[i]=Math.random()}
    exGeo.setAttribute('position',new THREE.BufferAttribute(exPos,3))
    const exMat=new THREE.PointsMaterial({color:C.green,size:.08,transparent:true,opacity:.6,sizeAttenuation:true,map:starTex,alphaTest:.01})
    ship.add(new THREE.Points(exGeo,exMat))

    // Asteroids
    const shuffled=[...ROSTER].sort(()=>Math.random()-.5)
    const asteroids=[]
    for(let i=0;i<5;i++){
      const a=buildAsteroid(shuffled[i%shuffled.length])
      a.position.set((Math.random()-.5)*9,(Math.random()-.5)*5,-9-i*5-Math.random()*4)
      scene.add(a); asteroids.push(a)
    }

    const labels=new LabelManager($('sgLabels'),camera,renderer)
    asteroids.forEach(a=>labels.add(a))

    function resetAsteroid(a){
      a.position.set((Math.random()-.5)*9,(Math.random()-.5)*5,-11-Math.random()*13)
      a.userData.vel.set((Math.random()-.5)*.018,(Math.random()-.5)*.013,.022+Math.random()*.028)
      a.userData.alive=true; a.visible=true
    }

    // State
    const bullets=[],expParts=[],destroyed=[]
    let lives=3,kills=0,fireCooldown=0,hitCooldown=0,shakeAmt=0,warpTime=0
    let last=performance.now(),raf
    const mx={x:0,y:0,tx:0,ty:0},cursor={x:W/2,y:H/2},keys={}

    updateShieldsHUD(lives); updateTargetsHUD(kills)
    addLog('mission: neutralize 3 threats · navigate to portfolio','var(--ink-dim)')
    addLog('controls: mouse=aim · click/space=fire · wasd=move','var(--ink-faint)')

    // Fire — bullets travel toward cursor position, soft auto-aim
    const fire=(cx,cy)=>{
      if(phase!=='playing'||fireCooldown>0)return
      fireCooldown=6
      let dir=new THREE.Vector3(0,0,-1)
      if(cx!=null){
        const ray=new THREE.Raycaster()
        ray.setFromCamera(new THREE.Vector2((cx/W)*2-1,-(cy/H)*2+1),camera)
        dir.copy(ray.ray.direction)
      }
      // Soft auto-aim within ~18°
      let best=null,bestDot=-1
      for(const a of asteroids){
        if(!a.userData.alive)continue
        const toA=a.position.clone().sub(ship.position).normalize()
        const d=dir.dot(toA)
        if(d>.94&&d>bestDot){bestDot=d;best=a}
      }
      if(best)dir.lerp(best.position.clone().sub(ship.position).normalize(),.35).normalize()
      const b=buildBullet(ship.position.clone(),dir)
      scene.add(b); bullets.push(b)
      engGlow.intensity=12
    }

    const onKD=e=>{keys[e.code]=true;if(e.code==='Space'){e.preventDefault();fire(cursor.x,cursor.y)}}
    const onKU=e=>keys[e.code]=false
    const onMove=e=>{mx.tx=(e.clientX/W-.5)*12;mx.ty=-(e.clientY/H-.5)*7.5;cursor.x=e.clientX;cursor.y=e.clientY}
    const onTouch=e=>{if(e.touches[0]){mx.tx=(e.touches[0].clientX/W-.5)*12;mx.ty=-(e.touches[0].clientY/H-.5)*7.5;cursor.x=e.touches[0].clientX;cursor.y=e.touches[0].clientY}}
    const onClick=e=>fire(e.clientX,e.clientY)
    const onResize=()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight)}
    window.addEventListener('keydown',onKD); window.addEventListener('keyup',onKU)
    window.addEventListener('mousemove',onMove); window.addEventListener('touchmove',onTouch,{passive:true})
    canvas.addEventListener('click',onClick); window.addEventListener('resize',onResize)

    function triggerWarp(){
      phase='warping'; warpTime=0
      announce('ALL THREATS ELIMINATED — WARP DRIVE ENGAGED','var(--accent)',99999)
      addLog('all targets neutralized · warp drive engaged','var(--accent)')
      setTimeout(()=>flash('green'),1400)
      setTimeout(()=>flash('white'),2350)
      setTimeout(()=>{
        const s=$('game'); if(s){s.style.transition='opacity .65s';s.style.opacity='0'}
        setTimeout(()=>{
          document.body.classList.remove('game-active'); if(s)s.style.display='none'
          $('home')?.scrollIntoView({behavior:'smooth'})
          setTimeout(()=>runDebrief(destroyed),800)
        },700)
      },2950)
    }

    function loop(now){
      raf=requestAnimationFrame(loop)
      const dt=Math.min((now-last)/16.67,3); last=now

      if(phase==='warping'){
        warpTime+=dt; const t=Math.min(warpTime/80,1)
        sF.material.size=.35+t*18; sM.material.size=.62+t*26; sN.material.size=1.2+t*40
        ;[sF,sM,sN].forEach(l=>{const b=l.geometry.attributes.position;for(let i=0;i<b.count;i++){const z=b.getZ(i)+t*8*dt;b.setZ(i,z>30?-400:z)}b.needsUpdate=true})
        camera.fov=Math.min(60+t*72,132); camera.updateProjectionMatrix()
        ship.position.z-=t*.7*dt; ship.scale.setScalar(1.5+t*2); engGlow.intensity=5+t*65
        renderer.render(scene,camera); return
      }
      if(phase!=='playing'){renderer.render(scene,camera);return}

      const boost=keys['ShiftLeft']||keys['ShiftRight'],spd=boost?.25:.15
      if(keys['KeyA']||keys['ArrowLeft'])  mx.tx-=spd*dt
      if(keys['KeyD']||keys['ArrowRight']) mx.tx+=spd*dt
      if(keys['KeyW']||keys['ArrowUp'])    mx.ty+=spd*.7*dt
      if(keys['KeyS']||keys['ArrowDown'])  mx.ty-=spd*.7*dt
      mx.tx=Math.max(-7,Math.min(7,mx.tx)); mx.ty=Math.max(-4,Math.min(4,mx.ty))
      mx.x+=(mx.tx-mx.x)*.13*dt; mx.y+=(mx.ty-mx.y)*.13*dt
      ship.position.set(mx.x,mx.y,0)
      const dxIn=(keys['KeyA']||keys['ArrowLeft']?-1:0)+(keys['KeyD']||keys['ArrowRight']?1:0)
      ship.rotation.z+=(-dxIn*.42-ship.rotation.z)*.12*dt
      ship.rotation.y+=((mx.tx-mx.x)*.06-ship.rotation.y)*.1*dt
      ship.rotation.x+=((mx.ty-mx.y)*-.04-ship.rotation.x)*.1*dt
      camera.position.x+=(mx.x*.06-camera.position.x)*.04*dt
      camera.position.y+=(mx.y*.04+.8-camera.position.y)*.04*dt
      camera.lookAt(mx.x*.12,mx.y*.1,-2)
      if(shakeAmt>0){camera.position.x+=(Math.random()-.5)*shakeAmt;camera.position.y+=(Math.random()-.5)*shakeAmt*.7;shakeAmt*=.88;if(shakeAmt<.004)shakeAmt=0}

      const pulse=Math.sin(now*.008)*.4+(boost?6.5:3.5)
      engGlow.intensity+=(pulse-engGlow.intensity)*.15*dt
      const exBuf=exGeo.attributes.position
      for(let i=0;i<EX;i++){
        exAge[i]-=.05*dt*(boost?2:1)
        if(exAge[i]<=0){exAge[i]=.6+Math.random()*.5;exBuf.setXYZ(i,(Math.random()-.5)*.16,(Math.random()-.5)*.1,-.9-Math.random()*.5)}
        else{exBuf.setZ(i,exBuf.getZ(i)-.08*dt);exBuf.setX(i,exBuf.getX(i)*(1-.016*dt))}
      }
      exBuf.needsUpdate=true; exMat.opacity=boost?.9:.58
      if(fireCooldown>0)fireCooldown-=dt
      stars.position.x+=(-mx.x*.015-stars.position.x)*.015*dt
      stars.position.y+=(-mx.y*.012-stars.position.y)*.015*dt
      grid.position.x+=(-mx.x*.02-grid.position.x)*.02*dt

      for(let bi=bullets.length-1;bi>=0;bi--){
        const b=bullets[bi]
        b.position.addScaledVector(b.userData.dir,BULLET_SPEED*dt)
        let hit=false
        for(const a of asteroids){
          if(!a.userData.alive)continue
          const dist=b.position.distanceTo(a.position)
          if(dist<a.userData.hitR+.1){
            a.userData.alive=false; a.visible=false
            scene.remove(b); bullets.splice(bi,1)
            expParts.push(...spawnExplosion(scene,a.position.clone(),a.userData.entry.col,a.userData.entry.size))
            kills++; destroyed.push(a.userData.entry)
            updateTargetsHUD(kills); flash('kill')
            addLog(`[${a.userData.entry.org}] neutralized · ${a.userData.entry.tag}`,'var(--accent)')
            if(kills>=TARGET_KILLS){triggerWarp();return}
            announce(`${a.userData.entry.org} · NEUTRALIZED (${kills}/${TARGET_KILLS})`,'var(--accent)',1700)
            setTimeout(()=>resetAsteroid(a),1050)
            hit=true; break
          } else if(dist<a.userData.hitR*2.4){
            a.userData.highlight=9
            a.material.emissive.setHex(a.userData.entry.col)
            a.material.emissiveIntensity=.42
          }
        }
        if(!hit&&b.position.z<-190){scene.remove(b);bullets.splice(bi,1)}
      }

      for(const a of asteroids){
        if(!a.userData.alive)continue
        a.position.addScaledVector(a.userData.vel,dt)
        a.rotation.x+=a.userData.rotVel.x*dt
        a.rotation.y+=a.userData.rotVel.y*dt
        a.rotation.z+=a.userData.rotVel.z*dt
        if(a.userData.highlight>0){
          a.userData.highlight-=dt
          a.material.emissiveIntensity=Math.max(.04,(a.userData.highlight/9)*.42)
          if(a.userData.highlight<=0)a.material.emissiveIntensity=.04
        }
        if(a.position.z>10)resetAsteroid(a)
        if(hitCooldown<=0&&a.position.distanceTo(ship.position)<a.userData.hitR+.42){
          lives--; hitCooldown=90; shakeAmt=.24
          updateShieldsHUD(lives); flash('hit')
          addLog(`shield breach by [${a.userData.entry.org}] · ${lives} shield${lives!==1?'s':''} left`,'var(--red)')
          resetAsteroid(a)
          if(lives<=0){
            phase='respawning'
            announce('SHIELDS DESTROYED — REBOOTING SYSTEMS','var(--red)',2600)
            addLog('ship destroyed · rebooting...','var(--red)')
            setTimeout(()=>startRound(),2800)
          } else {
            announce(`SHIELD BREACH · ${lives} REMAINING`,'var(--red)',1500)
          }
        }
      }

      for(let i=expParts.length-1;i>=0;i--){
        const p=expParts[i]
        p.userData.life-=.032*dt
        p.position.addScaledVector(p.userData.vel,dt)
        p.userData.vel.multiplyScalar(.934)
        p.material.opacity=p.userData.life
        if(p.userData.life<=0){scene.remove(p);expParts.splice(i,1)}
      }

      labels.update()
      renderer.render(scene,camera)
    }

    raf=requestAnimationFrame(loop)
    cleanupFn=()=>{
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown',onKD); window.removeEventListener('keyup',onKU)
      window.removeEventListener('mousemove',onMove); window.removeEventListener('touchmove',onTouch)
      canvas.removeEventListener('click',onClick); window.removeEventListener('resize',onResize)
      labels.clear(); renderer.dispose()
      ;['sgTopBar','sgBottomBar','sgLabels'].forEach(id=>{const e=$(id);if(e)e.style.display='none'})
      const log=$('sgLog'); if(log)log.innerHTML=''
    }
  }
}

// ─── Debrief ──────────────────────────────────────────────────────────────────
function runDebrief(destroyed=[]) {
  const overlay=$('sgDebriefOverlay'),body=$('sgDebriefBody'),footer=$('sgDebriefFooter')
  if(!overlay||!body)return
  body.innerHTML=''; overlay.style.display='flex'
  requestAnimationFrame(()=>overlay.classList.add('sg-debrief-visible'))
  const lines=[
    {t:0,   c:'var(--ink-faint)',  tx:'> loading mission_debrief.sh...'},
    {t:420, c:'var(--accent)',     tx:'> mission_status: COMPLETE ✓'},
    {t:760, c:'var(--ink-dim)',    tx:'> threats_neutralized: '+destroyed.length+'/'+TARGET_KILLS},
    {t:1060,c:'var(--line-strong)',tx:'> ────────────────────────────────────'},
  ]
  destroyed.forEach((e,i)=>{
    lines.push({t:1200+i*340, c:'var(--accent)', tx:`> [${e.org}]`})
    lines.push({t:1360+i*340, c:'var(--ink-dim)',tx:`  ${e.tag}`})
  })
  const end=1200+destroyed.length*340+420
  lines.push({t:end,    c:'var(--line-strong)',tx:'> ────────────────────────────────────'})
  lines.push({t:end+200,c:'var(--ink)',        tx:'> subject: ISHAAN SAMANTRAY'})
  lines.push({t:end+400,c:'var(--ink)',        tx:'> affiliation: CORNELL UNIVERSITY · BIO ENG + CS'})
  lines.push({t:end+620,c:'var(--accent)',     tx:'> status: BUILDING AT WET-LAB × CODE INTERSECTION'})
  lines.forEach(({t,c,tx})=>setTimeout(()=>{
    const l=document.createElement('div'); l.className='sg-debrief-line'
    l.style.color=c; l.textContent=tx
    body.appendChild(l); body.scrollTop=body.scrollHeight
  },t))
  setTimeout(()=>{if(footer){footer.style.display='block';requestAnimationFrame(()=>footer.classList.add('sg-debrief-footer-visible'))}},end+960)
  setTimeout(()=>{overlay.classList.remove('sg-debrief-visible');setTimeout(()=>{overlay.style.display='none'},420)},end+4400)
}

document.addEventListener('DOMContentLoaded', initGame)
