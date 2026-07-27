/* ============================================================
   APP: animations, nav, cursor, theme, rendering
   ============================================================ */

(() => {
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const motionOK = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const scrollBehavior = motionOK ? 'smooth' : 'auto';

  /* ---------- THEME ---------- */
  const themeKey = 'is-theme';
  const setTheme = (t) => {
    document.body.dataset.theme = t;
    $('#themeLabel').textContent = t.toUpperCase();
    try { localStorage.setItem(themeKey, t); } catch {}
  };
  const savedTheme = (() => { try { return localStorage.getItem(themeKey); } catch { return null; } })();
  setTheme(savedTheme || 'dark');
  $('#themeToggle').addEventListener('click', () => {
    setTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  /* ---------- CLOCK ---------- */
  const clockEl = $('#statusClock');
  // show Ithaca time (not the visitor's), with the zone abbreviation auto-switching EDT/EST
  const clockFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit',
    second: '2-digit', hour12: false, timeZoneName: 'short'
  });
  const tick = () => { clockEl.textContent = clockFmt.format(new Date()); };
  tick(); setInterval(tick, 1000);

  /* ---------- CURSOR + LIVE GRID (fine pointers only) ---------- */
  if (finePointer) {
    const dot = $('#cursorDot'), ring = $('#cursorRing');
    const root = document.documentElement;
    let mx = innerWidth / 2, my = innerHeight / 2;
    let rx = mx, ry = my;
    addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`; });
    const raf = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      // the background grid mask trails the cursor
      root.style.setProperty('--mx', (rx / innerWidth * 100) + '%');
      root.style.setProperty('--my', (ry / innerHeight * 100) + '%');
      requestAnimationFrame(raf);
    };
    raf();

    // cursor hover states
    const hoverSel = 'a, button, .project-card:not(.project-card--static), .contact-card, .award, .pub, [data-cursor="link"]';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverSel)) document.body.classList.add('cursor-hover');
    });
    document.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget?.closest?.(hoverSel)) document.body.classList.remove('cursor-hover');
    });
    // don't get stuck in hover state if the window loses focus
    addEventListener('blur', () => document.body.classList.remove('cursor-hover'));
  }

  /* ---------- RENDER NOW / NEWS PANEL ---------- */
  const nowCards = document.getElementById('nowCards');
  if (nowCards && window.NEWS) {
    window.NEWS.forEach(n => {
      const bullets = n.bullets.map(b =>
        `<li><strong>${b.strong}</strong>${b.text}</li>`
      ).join('');
      const links = n.links.map(l =>
        `<a class="${l.cls}" href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`
      ).join('');
      const tags = n.tags.map(t => `<span class="now-map-tag">${t}</span>`).join('');

      let bodyHTML = '';
      if (n.id === 'vaxon') {
        const photoHTML = n.photo
          ? `<div class="now-vaxon-photo">
               <img src="${n.photo.src}" alt="${n.photo.caption}"
                    onerror="this.src=''; this.closest('.now-vaxon-photo').style.display='none'">
               <div class="now-vaxon-photo-cap">${n.photo.caption}</div>
             </div>`
          : '';
        const diagramHTML = n.diagram
          ? `<div class="now-diagram">
               <img src="${n.diagram.src}" alt="${n.diagram.label}"
                    onerror="this.src=''; this.closest('.now-diagram').style.display='none'">
               <div class="now-diagram-label">${n.diagram.label}</div>
             </div>`
          : '';
        bodyHTML = `
          <div class="now-vaxon-body">
            <div class="now-vaxon-text">
              <h4>${n.headline}</h4>
              <p>${n.summary}</p>
              <ul class="now-bullets">${bullets}</ul>
              <div class="now-map-tags">${tags}</div>
              ${links ? `<div class="now-card-links">${links}</div>` : ''}
            </div>
            <div class="now-vaxon-photo-wrap">
              ${photoHTML}
              ${diagramHTML}
            </div>
          </div>`;
      } else {
        bodyHTML = `
          <div class="now-map-body">
            <p>${n.summary}</p>
            <ul class="now-bullets">${bullets}</ul>
            <div class="now-map-tags">${tags}</div>
            ${links ? `<div class="now-card-links">${links}</div>` : ''}
          </div>`;
      }

      const card = document.createElement('div');
      card.className = `now-card ${n.accentClass}`;
      card.innerHTML = `
        <div class="now-card-inner">
          <div class="now-card-top">
            <div>
              <div class="now-card-org">${n.org}</div>
              <div class="now-card-role">${n.role}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <span class="now-badge-new">${n.badge}</span>
              <span class="now-card-date">${n.date}</span>
            </div>
          </div>
          ${bodyHTML}
        </div>`;
      nowCards.appendChild(card);
    });
  }

  /* ---------- RENDER EXPERIENCE ---------- */
  const tl = $('#timeline');
  window.EXPERIENCE.forEach((x, i) => {
    const logoStyle = x.logoBg ? ` style="background:${x.logoBg}"` : '';
    const logoHTML = x.logo
      ? `<div class="tl-logo"${logoStyle}><img src="${x.logo}" alt="${x.org} logo" onerror="this.parentNode.classList.add('tl-logo-dark'); this.parentNode.textContent='${x.logoText || '•'}'"></div>`
      : `<div class="tl-logo tl-logo-dark" style="color:${x.logoColor || 'var(--accent)'}">${x.logoText || '•'}</div>`;
    const links = x.links.map(l => `<a href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`).join('');
    const row = document.createElement('div');
    row.className = 'tl-row reveal-el';
    row.style.setProperty('--i', i);
    row.innerHTML = `
      <div class="tl-indicator"></div>
      <div class="tl-date">${x.date}</div>
      ${logoHTML}
      <div class="tl-body">
        <h3>${x.org}</h3>
        <div class="tl-role">${x.role}</div>
        <div class="tl-desc">${x.desc}</div>
        <div class="tl-meta">${x.location}</div>
      </div>
      <div class="tl-links">${links}</div>
    `;
    tl.appendChild(row);
  });

  /* ---------- RENDER PROJECTS ---------- */
  const pg = $('#projectsGrid');
  window.PROJECTS.forEach((p, i) => {
    const tags = p.tags.map(t => `<span class="pc-tag ${t === 'featured' ? 'featured' : ''}">${t === 'featured' ? '★ featured' : t}</span>`).join('');
    const links = p.links.map(l => `<a href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`).join('');
    const hasLink = !!p.links[0];
    const card = document.createElement(hasLink ? 'a' : 'article');
    card.className = 'project-card reveal-el' + (hasLink ? '' : ' project-card--static');
    card.style.setProperty('--i', i);
    card.dataset.preview = JSON.stringify(p.preview || {});
    card.dataset.title = p.title;
    if (hasLink) { card.href = p.links[0].href; card.target = '_blank'; card.rel = 'noopener'; }
    card.innerHTML = `
      <div class="pc-head">
        <div class="pc-index">P.${String(i + 1).padStart(2, '0')}</div>
        <div class="pc-tags">${tags}</div>
      </div>
      <div>
        <h3 class="pc-title">${p.title}</h3>
        <div class="pc-org">${p.org}</div>
      </div>
      <p class="pc-desc">${p.desc}</p>
      <div class="pc-foot">
        <div class="pc-links">${links || '<span style="color:var(--ink-faint);font-size:11px">no public link</span>'}</div>
        ${hasLink ? '<span class="pc-arrow">↗</span>' : ''}
      </div>
    `;
    pg.appendChild(card);
  });
  $('#projectCount').textContent = `[${window.PROJECTS.length} entries]`;

  /* ---------- HOVER PREVIEW ---------- */
  const hp = $('#hoverPreview');
  $$('.project-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      let pv = {};
      try { pv = JSON.parse(card.dataset.preview || '{}'); } catch {}
      hp.innerHTML = `
        <div class="hp-label">[ ${pv.label || 'project'} ]</div>
        <div class="hp-title">${card.dataset.title}</div>
        <div class="hp-meta">${pv.meta || ''}</div>
        ${pv.img ? `<div class="hp-img"><img src="${pv.img}" alt=""></div>` : ''}
      `;
      hp.classList.add('visible');
    });
    card.addEventListener('mousemove', (e) => {
      // clamp so the panel never clips off the viewport at grid edges
      const w = 280, h = 200, pad = 12;
      hp.style.left = Math.min(Math.max(e.clientX, w / 2 + pad), innerWidth - w / 2 - pad) + 'px';
      hp.style.top = Math.max(e.clientY, h + 60) + 'px';
    });
    card.addEventListener('mouseleave', () => hp.classList.remove('visible'));
  });

  /* ---------- RENDER STARTUPS ---------- */
  const startupsEl = document.getElementById('startupsList');
  if (startupsEl && window.STARTUPS) {
    window.STARTUPS.forEach((s, i) => {
      const features = s.features.map(f => `
        <div class="su-feature">
          <div class="su-feat-title">${f.title}</div>
          <div class="su-feat-detail">${f.detail}</div>
        </div>
      `).join('');
      const el = document.createElement('div');
      el.className = 'startup reveal-el' + (s.status === 'live' ? ' startup--live' : '');
      el.style.setProperty('--i', i);
      const foot = s.link
        ? `<a class="su-link" href="${s.link.href}" target="_blank" rel="noopener">${s.link.label}</a>`
        : `<span class="su-redact">// building in stealth — contact for more</span>`;
      el.innerHTML = `
        <div class="su-head">
          <div class="su-logo-wrap">
            <img class="su-logo${s.logoRaw ? ' su-logo-raw' : ''}" src="${s.logo}" alt="${s.name} logo">
            <div class="su-scanline"></div>
          </div>
          <div class="su-headline">
            <div class="su-status${s.status === 'live' ? ' su-live' : ''}"><span class="su-dot"></span> ${s.status}</div>
            <h3 class="su-name">${s.name}</h3>
            <p class="su-tagline">${s.tagline}</p>
          </div>
          <div class="su-metric">
            <div class="su-metric-big">${s.metric.big}</div>
            <div class="su-metric-label">${s.metric.label}</div>
          </div>
        </div>
        <p class="su-desc">${s.desc}</p>
        <div class="su-grid">${features}</div>
        <div class="su-foot">
          <span class="su-pipeline">▸ ${s.pipeline}</span>
          ${foot}
        </div>
      `;
      startupsEl.appendChild(el);
    });
  }
  /* ---------- RENDER HACKATHONS ---------- */
  const hackEl = document.getElementById('hackathonsList');
  if (hackEl && window.HACKATHONS) {
    window.HACKATHONS.forEach((h, hi) => {
      const metrics = h.metrics.map(m => `
        <div class="hk-metric">
          <div class="hk-metric-val">${m.val}</div>
          <div class="hk-metric-label">${m.label}</div>
        </div>
      `).join('');
      const stack = h.stack.map(s => `<span class="chip">${s}</span>`).join('');
      const links = h.links.map(l => `<a class="hk-link" href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`).join('');
      const photos = h.photos.map((p, pi) => {
        const altText = (p.caption || '').replace(/<[^>]+>/g, ''); // strip any link markup for alt
        return `
        <div class="hk-photo" data-idx="${pi}" data-hackidx="${hi}" style="--pi:${pi}">
          <img src="${p.src}" alt="${altText}" loading="lazy" onerror="this.closest('.hk-photo').classList.add('hk-photo-missing')">
          <div class="hk-photo-cap">${p.caption}</div>
          <div class="hk-photo-zoom">⤢</div>
        </div>
      `;}).join('');

      const card = document.createElement('div');
      card.className = 'hackathon reveal-el';
      card.style.setProperty('--i', hi);
      card.innerHTML = `
        <div class="hk-header">
          <div class="hk-badge-wrap">
            <span class="hk-yc-badge">Y</span>
            <div class="hk-event-info">
              <div class="hk-event-name">${h.event}</div>
              <div class="hk-event-meta">
                <span class="hk-loc">⊙ ${h.location}</span>
                <span class="hk-sep">·</span>
                <span class="hk-date">${h.date}</span>
                <span class="hk-sep">·</span>
                <a class="hk-org-link" href="${h.eventHref}" target="_blank" rel="noopener">${h.organizer} ↗</a>
              </div>
            </div>
          </div>
          <div class="hk-status"><span class="hk-dot"></span> participant</div>
        </div>

        <div class="hk-project-name">${h.project}</div>
        <p class="hk-tagline">${h.tagline}</p>

        <div class="hk-metrics">${metrics}</div>

        <p class="hk-desc">${h.desc}</p>

        <div class="hk-stack">${stack}</div>

        ${h.youtubeId ? `
        <div class="hk-video-wrap">
          <iframe
            src="https://www.youtube.com/embed/${h.youtubeId}"
            title="Kairos demo"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            loading="lazy"
          ></iframe>
        </div>` : ''}

        <div class="hk-photos" id="hkPhotos${hi}">${photos}</div>

        <div class="hk-foot">
          <div class="hk-links">${links}</div>
          <span class="hk-built">// ${h.footer || 'built in 1 day'}</span>
        </div>
      `;
      hackEl.appendChild(card);
    });

    // photo lightbox
    const lb = document.createElement('div');
    lb.id = 'hkLightbox';
    lb.className = 'hk-lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Hackathon photo viewer');
    lb.innerHTML = `
      <div class="hk-lb-bg"></div>
      <button class="hk-lb-close" aria-label="Close">✕</button>
      <button class="hk-lb-prev" aria-label="Previous photo">‹</button>
      <button class="hk-lb-next" aria-label="Next photo">›</button>
      <div class="hk-lb-inner">
        <img class="hk-lb-img" src="" alt="">
        <div class="hk-lb-cap"></div>
        <div class="hk-lb-counter"></div>
      </div>
    `;
    document.body.appendChild(lb);

    let lbPhotos = [], lbIdx = 0, lbLastFocus = null;
    const openLb = (photos, idx) => {
      lbLastFocus = document.activeElement;
      lbPhotos = photos; lbIdx = idx;
      showLb();
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
      lb.querySelector('.hk-lb-close').focus();
    };
    const closeLb = () => {
      lb.classList.remove('open'); document.body.style.overflow = '';
      if (lbLastFocus && lbLastFocus.focus) lbLastFocus.focus();
    };
    const showLb = () => {
      const cap = lbPhotos[lbIdx].caption || '';
      lb.querySelector('.hk-lb-img').src = lbPhotos[lbIdx].src;
      lb.querySelector('.hk-lb-img').alt = cap.replace(/<[^>]+>/g, '');
      lb.querySelector('.hk-lb-cap').innerHTML = cap; // caption may contain a link
      lb.querySelector('.hk-lb-counter').textContent = `${lbIdx + 1} / ${lbPhotos.length}`;
    };
    lb.querySelector('.hk-lb-close').addEventListener('click', closeLb);
    lb.querySelector('.hk-lb-bg').addEventListener('click', closeLb);
    lb.querySelector('.hk-lb-prev').addEventListener('click', () => { lbIdx = (lbIdx - 1 + lbPhotos.length) % lbPhotos.length; showLb(); });
    lb.querySelector('.hk-lb-next').addEventListener('click', () => { lbIdx = (lbIdx + 1) % lbPhotos.length; showLb(); });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') { lbIdx = (lbIdx - 1 + lbPhotos.length) % lbPhotos.length; showLb(); }
      if (e.key === 'ArrowRight') { lbIdx = (lbIdx + 1) % lbPhotos.length; showLb(); }
    });

    document.querySelectorAll('.hk-photo').forEach(el => {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      const open = () => {
        const hi = parseInt(el.dataset.hackidx);
        const pi = parseInt(el.dataset.idx);
        openLb(window.HACKATHONS[hi].photos, pi);
      };
      el.addEventListener('click', (e) => { if (e.target.closest('a')) return; open(); }); // let caption links win
      el.addEventListener('keydown', (e) => { if (e.target.closest('a')) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }

  /* ---------- RENDER CONTRIBUTIONS (grouped by org) ---------- */
  const contribList = $('#contribList');
  const contribCount = $('#contribCount');
  if (contribList && window.CONTRIBUTIONS) {
    const totalPRs = window.CONTRIBUTIONS.reduce((s, o) => s + o.prs.length, 0);
    if (contribCount) contribCount.textContent = `[${totalPRs} merged PRs · ${window.CONTRIBUTIONS.length} orgs]`;

    window.CONTRIBUTIONS.forEach((o, i) => {
      const prRows = o.prs.map(p => `
        <a class="contrib-pr-row" href="https://github.com/${p.repo || o.repo}/pull/${p.num}" target="_blank" rel="noopener">
          <span class="contrib-pr-num">${p.label ? p.label : '#' + p.num}</span>
          <span class="contrib-pr-fix">${p.fix}</span>
          <span class="contrib-pr-arrow">↗</span>
        </a>
      `).join('');
      const el = document.createElement('div');
      el.className = 'contrib-card reveal-el';
      el.style.setProperty('--i', i);
      el.innerHTML = `
        <div class="contrib-org-head">
          <div class="contrib-org-left">
            <span class="contrib-org-dot"></span>
            <span class="contrib-org-name">${o.org}</span>
            ${o.stars ? `<span class="contrib-org-stars">★ ${o.stars}</span>` : ''}
            ${o.badge ? `<span class="contrib-org-badge">${o.badge}</span>` : ''}
            <span class="contrib-org-count">${o.prs.length} merged</span>
          </div>
          <a class="contrib-org-site" href="${o.site}" target="_blank" rel="noopener">${o.siteLabel} ↗</a>
        </div>
        <div class="contrib-org-desc">${o.desc}</div>
        <div class="contrib-pr-list">${prRows}</div>`;
      contribList.appendChild(el);
    });
  }


  /* ---------- DITTO LIVE STAR COUNT ---------- */
  const dittoStars = $('#dittoStars');
  if (dittoStars) {
    fetch('https://api.github.com/repos/ion-design/ditto.site')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { dittoStars.textContent = (d.stargazers_count || 0).toLocaleString(); })
      .catch(() => { dittoStars.textContent = '300+'; });
  }

  /* ---------- RENDER CAR PHOTOGRAPHY COLLAGE ---------- */
  const carsCollage = $('#carsCollage');
  if (carsCollage) {
    const carCount = $('#carCount');
    let carList = [];
    let lastFocus = null;

    // ----- centered lightbox (built once, reused for all photos) -----
    const clb = document.createElement('div');
    clb.className = 'car-lightbox';
    clb.setAttribute('role', 'dialog');
    clb.setAttribute('aria-modal', 'true');
    clb.setAttribute('aria-label', 'Car photo viewer');
    clb.innerHTML = `
      <div class="clb-bg"></div>
      <button class="clb-close" aria-label="Close">✕</button>
      <button class="clb-prev" aria-label="Previous photo">‹</button>
      <button class="clb-next" aria-label="Next photo">›</button>
      <figure class="clb-inner">
        <img class="clb-img" src="" alt="">
        <div class="clb-spinner">// loading…</div>
        <figcaption class="clb-cap"></figcaption>
        <div class="clb-counter"></div>
      </figure>`;
    document.body.appendChild(clb);
    const clbImg = clb.querySelector('.clb-img');
    const clbSpin = clb.querySelector('.clb-spinner');
    let clbIdx = 0;
    const clbShow = () => {
      const c = carList[clbIdx]; if (!c) return;
      clbImg.style.opacity = '0';
      if (clbSpin) { clbSpin.textContent = '// loading…'; clbSpin.style.display = 'block'; }
      clbImg.onload = () => { clbImg.style.opacity = '1'; if (clbSpin) clbSpin.style.display = 'none'; };
      clbImg.onerror = () => { if (clbSpin) clbSpin.textContent = '// image not found'; };
      clbImg.src = c.src;
      clbImg.alt = c.caption || `Car photo ${clbIdx + 1}`;
      const cap = clb.querySelector('.clb-cap');
      cap.textContent = c.caption || ''; cap.style.display = c.caption ? '' : 'none';
      clb.querySelector('.clb-counter').textContent = `${clbIdx + 1} / ${carList.length}`;
      // preload the neighbours so stepping feels instant
      [clbIdx - 1, clbIdx + 1].forEach(n => {
        const nb = carList[(n + carList.length) % carList.length];
        if (nb) new Image().src = nb.src;
      });
    };
    const clbOpen = i => {
      lastFocus = document.activeElement;
      clbIdx = i; clbShow();
      clb.classList.add('open'); document.body.style.overflow = 'hidden';
      clb.querySelector('.clb-close').focus();
    };
    const clbClose = () => {
      clb.classList.remove('open'); document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    const clbStep = d => { clbIdx = (clbIdx + d + carList.length) % carList.length; clbShow(); };
    clb.querySelector('.clb-bg').addEventListener('click', clbClose);
    clb.querySelector('.clb-close').addEventListener('click', clbClose);
    clb.querySelector('.clb-prev').addEventListener('click', e => { e.stopPropagation(); clbStep(-1); });
    clb.querySelector('.clb-next').addEventListener('click', e => { e.stopPropagation(); clbStep(1); });
    document.addEventListener('keydown', e => {
      if (!clb.classList.contains('open')) return;
      if (e.key === 'Escape') clbClose();
      else if (e.key === 'ArrowLeft') clbStep(-1);
      else if (e.key === 'ArrowRight') clbStep(1);
    });
    // swipe on touch
    let clbTX = 0, clbTY = 0;
    clb.addEventListener('touchstart', e => { clbTX = e.touches[0].clientX; clbTY = e.touches[0].clientY; }, { passive: true });
    clb.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - clbTX;
      const dy = e.changedTouches[0].clientY - clbTY;
      if (Math.abs(dx) > 45 && Math.abs(dy) < 60) clbStep(dx < 0 ? 1 : -1);
    });

    // ----- horizontal album (filmstrip) navigation -----
    const track = carsCollage;
    const viewer = $('#carsViewer');
    const prevBtn = $('#carsPrev');
    const nextBtn = $('#carsNext');

    const updateArrows = () => {
      const max = track.scrollWidth - track.clientWidth;
      const x = track.scrollLeft;
      const atStart = x <= 2;
      const atEnd = x >= max - 2 || max <= 0;
      const active = document.activeElement;
      if (prevBtn) prevBtn.disabled = atStart;
      if (nextBtn) nextBtn.disabled = atEnd;
      if (viewer) { viewer.classList.toggle('at-start', atStart); viewer.classList.toggle('at-end', atEnd); }
      // if the arrow the keyboard user was operating just got disabled, keep focus
      // near the album instead of letting it fall back to <body> (WCAG 2.4.3)
      if (active === nextBtn && atEnd) (prevBtn && !prevBtn.disabled ? prevBtn : track).focus();
      else if (active === prevBtn && atStart) (nextBtn && !nextBtn.disabled ? nextBtn : track).focus();
    };
    const pageScroll = dir => {
      const amount = Math.max(track.clientWidth * 0.82, 240);
      track.scrollBy({ left: dir * amount, behavior: scrollBehavior });
    };
    if (prevBtn) prevBtn.addEventListener('click', () => pageScroll(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => pageScroll(1));
    // scroll events are already frame-throttled by the browser; updateArrows is cheap
    track.addEventListener('scroll', updateArrows, { passive: true });
    addEventListener('resize', updateArrows);
    // left/right keys page the strip when it (not a lightbox) holds focus
    track.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); pageScroll(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); pageScroll(-1); }
    });

    // mouse drag-to-pan (touch already scrolls/swipes natively, so mouse only).
    // Capture is engaged ONLY after real movement — capturing on pointerdown
    // would swallow a plain click and stop a photo from opening the lightbox.
    let dragStart = null, dragMoved = false, dragCaptured = false;
    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragStart = { x: e.clientX, left: track.scrollLeft, id: e.pointerId };
      dragMoved = false;
      dragCaptured = false;
    });
    track.addEventListener('pointermove', e => {
      if (!dragStart) return;
      const dx = e.clientX - dragStart.x;
      if (!dragMoved && Math.abs(dx) > 6) {
        dragMoved = true;
        track.classList.add('dragging');
        try { track.setPointerCapture(dragStart.id); dragCaptured = true; } catch {}
      }
      if (dragMoved) track.scrollLeft = dragStart.left - dx;
    });
    const endDrag = () => {
      if (!dragStart) return;
      if (dragCaptured) { try { track.releasePointerCapture(dragStart.id); } catch {} }
      track.classList.remove('dragging');
      dragStart = null;
    };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    // swallow the click that ends a real drag so it doesn't open the lightbox
    track.addEventListener('click', e => {
      if (dragMoved) { e.stopPropagation(); e.preventDefault(); dragMoved = false; }
    }, true);

    const renderCars = (list) => {
      carList = list || [];
      track.innerHTML = '';
      const empty = $('#carsEmpty');
      if (!carList.length) {
        if (empty) empty.style.display = 'block';
        if (viewer) viewer.style.display = 'none';
        if (carCount) carCount.textContent = '[0 shots]';
        return;
      }
      if (empty) empty.style.display = 'none';
      if (viewer) viewer.style.display = '';
      if (carCount) carCount.textContent = `[${carList.length} shots]`;
      const frag = document.createDocumentFragment();
      carList.forEach((c, i) => {
        const fig = document.createElement('figure');
        fig.className = 'car-photo';
        // width/height give the true aspect ratio so the strip reserves the
        // right width per photo (no stretch, no shift) and lazy-load can defer
        const dim = (c.w && c.h) ? `width="${c.w}" height="${c.h}"` : '';
        fig.innerHTML = `
          <button type="button" class="car-photo-btn" aria-label="Open car photo ${i + 1} of ${carList.length}">
            <img src="${c.src}" alt="" ${dim} loading="lazy" decoding="async"
                 onerror="this.closest('.car-photo').classList.add('car-photo-missing')">
          </button>
          ${c.caption ? `<figcaption>${c.caption}</figcaption>` : ''}`;
        fig.querySelector('.car-photo-btn').addEventListener('click', () => clbOpen(i));
        frag.appendChild(fig);
      });
      track.appendChild(frag);
      updateArrows();
    };
    // Paint immediately from the data already in memory so the strip is never
    // empty, then revalidate against a fresh copy (GitHub Pages caches 10 min)
    // and only re-render if the manifest actually changed.
    renderCars(window.CARS || []);
    fetch(`cars-data.js?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(txt => {
        const m = txt.match(/window\.CARS\s*=\s*(\[[\s\S]*\]);\s*$/);
        if (!m) return;
        const fresh = JSON.parse(m[1]);
        if (JSON.stringify(fresh) !== JSON.stringify(carList)) renderCars(fresh);
      })
      .catch(() => {});
  }

  /* ---------- RENDER REFERENCES / TESTIMONIALS ---------- */
  const refsList = $('#refsList');
  if (refsList && window.TESTIMONIALS && window.TESTIMONIALS.length) {
    const section = document.getElementById('references');
    if (section) section.style.display = '';
    window.TESTIMONIALS.forEach((t, i) => {
      const el = document.createElement('div');
      el.className = 'ref-card reveal-el';
      el.style.setProperty('--i', i);
      el.innerHTML = `
        <div class="ref-quote">${t.quote}</div>
        <div class="ref-author">
          <span class="ref-name">${t.author}</span>
          <span class="ref-role">${t.role || ''}</span>
        </div>`;
      refsList.appendChild(el);
    });
  }

  /* ---------- RENDER PUBLICATIONS ---------- */
  const pubs = $('#pubsList');
  window.PUBLICATIONS.forEach((p, i) => {
    const el = document.createElement('a');
    el.href = p.href;
    el.target = '_blank';
    el.rel = 'noopener';
    el.className = 'pub reveal-el';
    el.style.setProperty('--i', i);
    el.innerHTML = `
      <div class="pub-top">
        <span class="pub-cite">${p.cite}</span>
        <span class="pub-link">read →</span>
      </div>
      <h3 class="pub-title">${p.title}</h3>
      <div class="pub-authors">${p.authors}</div>
      <div class="pub-venue">${p.venue}</div>
    `;
    pubs.appendChild(el);
  });

  /* ---------- RENDER AWARDS ---------- */
  const ag = $('#awardsGrid');
  window.AWARDS.forEach((a, i) => {
    const el = document.createElement(a.link ? 'a' : 'div');
    el.className = 'award reveal-el';
    el.style.setProperty('--i', i);
    if (a.link) { el.href = a.link; el.target = '_blank'; el.rel = 'noopener'; }
    el.innerHTML = `
      <div class="award-year">${a.year}</div>
      ${a.badge ? `<div class="award-badge">${a.badge}</div>` : ''}
      <h3 class="award-title">${a.title}</h3>
      <div class="award-desc">${a.desc}</div>
      ${a.link ? '<span class="award-link">read ↗</span>' : ''}
    `;
    ag.appendChild(el);
  });

  /* ---------- SCROLL REVEAL (with staggered entrance) ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const i = parseInt(getComputedStyle(e.target).getPropertyValue('--i')) || 0;
      const delay = motionOK ? Math.min(i, 8) * 55 : 0;
      setTimeout(() => e.target.classList.add('reveal'), delay);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal-el').forEach(el => io.observe(el));

  /* ---------- HERO ANIMATED INTRO ---------- */
  // The reveal cascade is DECOUPLED from typing so the name never waits on it.
  const cmdEl = $('#heroCmd');
  const typeCmd = 'cat about.md && whoami';
  const revealSeq = [
    ['#heroName', 0],
    ['.hero-sub-line', 120],
    ['.hero-avail', 220],
    ['.hero-highlights', 320],
    ['.hero-proof', 400],
    ['.hero-cta', 480],
  ];
  const runReveal = () => revealSeq.forEach(([sel, delay]) => {
    setTimeout(() => $$(sel).forEach(el => el.classList.add('reveal')), motionOK ? delay : 0);
  });

  if (motionOK) {
    // name paints almost immediately; typing runs in parallel as flavour
    setTimeout(runReveal, 150);
    let ci = 0;
    const typeTick = () => {
      if (ci <= typeCmd.length) {
        cmdEl.textContent = typeCmd.slice(0, ci);
        ci++;
        setTimeout(typeTick, 18 + Math.random() * 22);
      }
    };
    setTimeout(typeTick, 250);
  } else {
    cmdEl.textContent = typeCmd;
    runReveal();
  }

  /* ---------- SIDE NAV ACTIVE STATE ---------- */
  // Center-line detector: fires when a section crosses the viewport midline,
  // so it works regardless of section height (the old threshold:0.3 could never
  // be met by the 5000px+ contributions list).
  const navLinks = $$('.sidenav a');
  const navIds = new Set(navLinks.map(a => a.getAttribute('href').slice(1)));
  const sections = $$('section[id]').filter(s => navIds.has(s.id));
  let activeNavId = null;
  const setActiveNav = (id) => {
    if (id === activeNavId) return;
    activeNavId = id;
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
  };
  const navIo = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) setActiveNav(e.target.id); });
  }, { threshold: 0, rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => navIo.observe(s));

  /* smooth scroll for in-page anchors + shareable hash + focus move */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
    history.pushState(null, '', '#' + id);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });
  // honour a hash on load (deep links)
  if (location.hash.length > 1) {
    const t = document.getElementById(location.hash.slice(1));
    if (t) setTimeout(() => t.scrollIntoView({ behavior: 'auto', block: 'start' }), 60);
  }

  /* ---------- KEYBOARD ---------- */
  const lightboxOpen = () => document.querySelector('.car-lightbox.open, .hk-lightbox.open, #galleryLightbox.lb-visible');
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input, textarea, [contenteditable], a, button')) return;
    if (lightboxOpen()) return; // let the open lightbox own the keys
    if (e.key === 'j' || e.key === 'ArrowDown') {
      e.preventDefault(); scrollBy({ top: innerHeight * 0.9, behavior: scrollBehavior });
    } else if (e.key === 'k' || e.key === 'ArrowUp') {
      e.preventDefault(); scrollBy({ top: -innerHeight * 0.9, behavior: scrollBehavior });
    } else if (e.key === 't') {
      setTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
    } else if (e.key === 'g') {
      e.preventDefault(); scrollTo({ top: 0, behavior: scrollBehavior });
    }
  });

  /* ---------- VISITOR LINE ---------- */
  const visitor = $('#visitorLine');
  if (visitor) {
    const now = new Date();
    const hash = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    visitor.textContent = `session: 0x${hash} · ${now.toISOString().slice(0, 10)}`;
  }

  /* ---------- PDF RESUME RENDER (via PDF.js, lazy-loaded) ---------- */
  const resumeCanvas = document.getElementById('resumeCanvas');
  const resumeViewer = document.getElementById('resumeViewer');
  if (resumeCanvas && resumeViewer) {
    resumeCanvas.setAttribute('role', 'img');
    resumeCanvas.setAttribute('aria-label',
      'Resume preview — use the open or download links above to read the PDF');

    let started = false;
    const renderResume = async () => {
      try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument('assets/IshaanSamantray-Resume.pdf?v=3').promise;
        resumeViewer.querySelectorAll('canvas:not(#resumeCanvas)').forEach(c => c.remove());
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const canvas = p === 1 ? resumeCanvas : document.createElement('canvas');
          if (p !== 1) { canvas.style.cssText = resumeCanvas.style.cssText; resumeViewer.insertBefore(canvas, resumeViewer.querySelector('.resume-fallback')); }
          const vw = Math.max(280, Math.min((resumeViewer.clientWidth || 800) - 48, 900));
          const viewport0 = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (vw / viewport0.width) * 2 }); // 2x for retina
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = (viewport.width / 2) + 'px';
          canvas.style.height = (viewport.height / 2) + 'px';
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        }
        const fb = resumeViewer.querySelector('.resume-fallback');
        if (fb && resumeCanvas.width > 0) fb.style.display = 'none';
      } catch (e) {
        console.warn('PDF render failed', e);
      }
    };

    const startResume = () => {
      if (started) return; started = true;
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = renderResume;
      document.head.appendChild(script);
    };

    // only pull the 380 KB library when the resume section is near the viewport
    const resObs = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) { startResume(); resObs.disconnect(); }
    }, { rootMargin: '600px' });
    resObs.observe(resumeViewer);

    // re-rasterise on resize/rotate so it stays crisp (debounced)
    let rzT;
    addEventListener('resize', () => {
      if (!started || !window.pdfjsLib && !window['pdfjs-dist/build/pdf']) return;
      clearTimeout(rzT); rzT = setTimeout(renderResume, 250);
    });
  }
})();
