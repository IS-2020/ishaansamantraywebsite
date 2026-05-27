// gallery-app.js — photo gallery renderer for ishaansamantray.com
// Reads from gallery.js (GALLERY array) and renders a masonry grid with
// category filters and a full-screen lightbox.

(function () {
  'use strict'

  // ── State ─────────────────────────────────────────────────────────────────
  let activeCategory = 'all'
  let lightboxIndex  = -1
  let filteredPhotos = []

  // ── DOM refs (populated on DOMContentLoaded) ─────────────────────────────
  let grid, filters, countEl, emptyEl, hintEl

  // ── Helpers ───────────────────────────────────────────────────────────────
  function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  }

  function formatDate(d) {
    if (!d) return ''
    const [y, m] = d.split('-')
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
    return m ? `${months[parseInt(m,10)-1]} ${y}` : y
  }

  // ── Filter bar ────────────────────────────────────────────────────────────
  function renderFilters() {
    if (!filters) return
    const usedCats = new Set(GALLERY.map(p => p.category))
    const visible  = GALLERY_CATEGORIES.filter(c => c.id === 'all' || usedCats.has(c.id))

    filters.innerHTML = visible.map(c => `
      <button
        class="gallery-filter-btn${c.id === activeCategory ? ' active' : ''}"
        data-cat="${escapeHtml(c.id)}"
        role="tab"
        aria-selected="${c.id === activeCategory}"
      >${escapeHtml(c.label)}</button>
    `).join('')

    filters.querySelectorAll('.gallery-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat
        renderFilters()
        renderGrid()
      })
    })
  }

  // ── Masonry grid ──────────────────────────────────────────────────────────
  function renderGrid() {
    if (!grid) return

    filteredPhotos = activeCategory === 'all'
      ? [...GALLERY]
      : GALLERY.filter(p => p.category === activeCategory)

    // Featured photos first
    filteredPhotos.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))

    if (countEl) countEl.textContent = `[${filteredPhotos.length} photo${filteredPhotos.length !== 1 ? 's' : ''}]`

    if (filteredPhotos.length === 0) {
      grid.innerHTML = ''
      if (emptyEl) emptyEl.style.display = 'block'
      if (hintEl)  hintEl.style.display  = 'none'
      return
    }

    if (emptyEl) emptyEl.style.display = 'none'
    if (hintEl)  hintEl.style.display  = 'block'

    grid.innerHTML = filteredPhotos.map((photo, i) => `
      <div class="gallery-item${photo.featured ? ' gallery-item-featured' : ''}"
           data-index="${i}"
           role="button"
           tabindex="0"
           aria-label="${escapeHtml(photo.caption || 'Photo')}"
      >
        <div class="gallery-img-wrap">
          <img
            src="${escapeHtml(photo.file)}"
            alt="${escapeHtml(photo.caption || '')}"
            loading="lazy"
            decoding="async"
            class="gallery-img"
          />
          <div class="gallery-overlay">
            <div class="gallery-overlay-inner">
              <span class="gallery-cat-tag">${escapeHtml(photo.category)}/</span>
              <span class="gallery-caption">${escapeHtml(photo.caption || '')}</span>
              ${photo.date ? `<span class="gallery-date">${formatDate(photo.date)}</span>` : ''}
            </div>
            <span class="gallery-expand">⤢</span>
          </div>
        </div>
      </div>
    `).join('')

    // Click / keyboard to open lightbox
    grid.querySelectorAll('.gallery-item').forEach(item => {
      const open = () => openLightbox(parseInt(item.dataset.index, 10))
      item.addEventListener('click', open)
      item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } })
    })
  }

  // ── Lightbox ──────────────────────────────────────────────────────────────
  function buildLightbox() {
    const lb = document.createElement('div')
    lb.id        = 'galleryLightbox'
    lb.className = 'gallery-lightbox'
    lb.setAttribute('role', 'dialog')
    lb.setAttribute('aria-modal', 'true')
    lb.setAttribute('aria-label', 'Photo lightbox')
    lb.style.display = 'none'
    lb.innerHTML = `
      <button class="lb-close" id="lbClose" aria-label="Close">✕</button>
      <button class="lb-nav lb-prev" id="lbPrev" aria-label="Previous">‹</button>
      <button class="lb-nav lb-next" id="lbNext" aria-label="Next">›</button>
      <div class="lb-content">
        <div class="lb-img-wrap">
          <img id="lbImg" src="" alt="" class="lb-img" />
          <div class="lb-spinner" id="lbSpinner">// loading...</div>
        </div>
        <div class="lb-meta">
          <div class="lb-meta-left">
            <span class="lb-cat" id="lbCat"></span>
            <span class="lb-caption" id="lbCaption"></span>
          </div>
          <div class="lb-meta-right">
            <span class="lb-date" id="lbDate"></span>
            <span class="lb-counter" id="lbCounter"></span>
          </div>
        </div>
      </div>
    `
    document.body.appendChild(lb)

    lb.addEventListener('click', e => { if (e.target === lb) closeLightbox() })
    document.getElementById('lbClose').addEventListener('click', closeLightbox)
    document.getElementById('lbPrev').addEventListener('click', () => stepLightbox(-1))
    document.getElementById('lbNext').addEventListener('click', () => stepLightbox(1))

    document.addEventListener('keydown', e => {
      if (lb.style.display === 'none') return
      if (e.key === 'Escape')     closeLightbox()
      if (e.key === 'ArrowLeft')  stepLightbox(-1)
      if (e.key === 'ArrowRight') stepLightbox(1)
    })

    // Swipe support
    let touchStartX = 0
    lb.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX }, { passive: true })
    lb.addEventListener('touchend',   e => {
      const dx = e.changedTouches[0].clientX - touchStartX
      if (Math.abs(dx) > 50) stepLightbox(dx < 0 ? 1 : -1)
    })
  }

  function openLightbox(index) {
    lightboxIndex = index
    const lb = document.getElementById('galleryLightbox')
    if (!lb) return
    lb.style.display = 'flex'
    requestAnimationFrame(() => lb.classList.add('lb-visible'))
    document.body.style.overflow = 'hidden'
    populateLightbox()
  }

  function closeLightbox() {
    const lb = document.getElementById('galleryLightbox')
    if (!lb) return
    lb.classList.remove('lb-visible')
    setTimeout(() => { lb.style.display = 'none' }, 300)
    document.body.style.overflow = ''
    lightboxIndex = -1
  }

  function stepLightbox(dir) {
    lightboxIndex = (lightboxIndex + dir + filteredPhotos.length) % filteredPhotos.length
    populateLightbox()
  }

  function populateLightbox() {
    const photo = filteredPhotos[lightboxIndex]
    if (!photo) return

    const img      = document.getElementById('lbImg')
    const spinner  = document.getElementById('lbSpinner')
    const lbCat    = document.getElementById('lbCat')
    const lbCap    = document.getElementById('lbCaption')
    const lbDate   = document.getElementById('lbDate')
    const lbCount  = document.getElementById('lbCounter')
    const lbPrev   = document.getElementById('lbPrev')
    const lbNext   = document.getElementById('lbNext')

    img.style.opacity = '0'
    if (spinner) spinner.style.display = 'block'

    img.onload = () => {
      img.style.opacity = '1'
      if (spinner) spinner.style.display = 'none'
    }
    img.onerror = () => {
      if (spinner) spinner.textContent = '// image not found'
    }
    img.src = photo.file
    img.alt = photo.caption || ''

    if (lbCat)   lbCat.textContent   = `${photo.category}/`
    if (lbCap)   lbCap.textContent   = photo.caption || ''
    if (lbDate)  lbDate.textContent  = formatDate(photo.date)
    if (lbCount) lbCount.textContent = `${lightboxIndex + 1} / ${filteredPhotos.length}`

    // Hide nav arrows if only one photo
    if (lbPrev) lbPrev.style.display = filteredPhotos.length > 1 ? 'flex' : 'none'
    if (lbNext) lbNext.style.display = filteredPhotos.length > 1 ? 'flex' : 'none'
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    grid    = document.getElementById('galleryGrid')
    filters = document.getElementById('galleryFilters')
    countEl = document.getElementById('photoCount')
    emptyEl = document.getElementById('galleryEmpty')
    hintEl  = document.getElementById('galleryHint')

    if (!grid) return // photos section not on this page

    if (typeof GALLERY === 'undefined' || typeof GALLERY_CATEGORIES === 'undefined') {
      console.warn('gallery.js not loaded')
      return
    }

    buildLightbox()
    renderFilters()
    renderGrid()
  }

  document.addEventListener('DOMContentLoaded', init)
})()
