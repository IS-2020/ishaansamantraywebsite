/* ============================================================
   APP: animations, nav, cursor, theme, rendering
   ============================================================ */

(() => {
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

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
  const tick = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    clockEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} EDT`;
  };
  tick(); setInterval(tick, 1000);

  /* ---------- CURSOR ---------- */
  const dot = $('#cursorDot'), ring = $('#cursorRing');
  let mx = innerWidth / 2, my = innerHeight / 2;
  let rx = mx, ry = my;
  addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`; });
  const raf = () => {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(raf);
  };
  raf();

  // cursor hover states
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest('a, button, .project-card, .contact-card, .award, .pub, [data-cursor="link"]');
    if (t) document.body.classList.add('cursor-hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget?.closest?.('a, button, .project-card, .contact-card, .award, .pub, [data-cursor="link"]')) {
      document.body.classList.remove('cursor-hover');
    }
  });

  /* ---------- RENDER EXPERIENCE ---------- */
  const tl = $('#timeline');
  window.EXPERIENCE.forEach((x, i) => {
    const logoHTML = x.logo
      ? `<div class="tl-logo"><img src="${x.logo}" alt="${x.org} logo" onerror="this.parentNode.classList.add('tl-logo-dark'); this.parentNode.textContent='${x.logoText || '•'}'"></div>`
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
    const card = document.createElement('a');
    card.className = 'project-card reveal-el';
    card.style.setProperty('--i', i);
    card.dataset.preview = JSON.stringify(p.preview || {});
    card.dataset.title = p.title;
    if (p.links[0]) card.href = p.links[0].href;
    else card.href = '#';
    if (p.links[0]) { card.target = '_blank'; card.rel = 'noopener'; }
    card.innerHTML = `
      <div class="pc-head">
        <div class="pc-index">${p.index}</div>
        <div class="pc-tags">${tags}</div>
      </div>
      <div>
        <h3 class="pc-title">${p.title}</h3>
        <div class="pc-org">${p.org}</div>
      </div>
      <p class="pc-desc">${p.desc}</p>
      <div class="pc-foot">
        <div class="pc-links">${links || '<span style="color:var(--ink-faint);font-size:11px">no public link</span>'}</div>
        <span class="pc-arrow">↗</span>
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
      hp.style.left = e.clientX + 'px';
      hp.style.top = e.clientY + 'px';
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
      el.className = 'startup reveal-el';
      el.style.setProperty('--i', i);
      el.innerHTML = `
        <div class="su-head">
          <div class="su-logo-wrap">
            <img class="su-logo" src="${s.logo}" alt="${s.name} logo (redacted)">
            <div class="su-scanline"></div>
          </div>
          <div class="su-headline">
            <div class="su-status"><span class="su-dot"></span> ${s.status}</div>
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
          <span class="su-redact">// building in stealth — contact for more</span>
        </div>
      `;
      startupsEl.appendChild(el);
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
      <h4 class="award-title">${a.title}</h4>
      <div class="award-desc">${a.desc}</div>
      ${a.link ? '<span class="award-link">read ↗</span>' : ''}
    `;
    ag.appendChild(el);
  });

  /* ---------- SCROLL REVEAL ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('reveal');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal-el').forEach(el => io.observe(el));

  /* ---------- HERO ANIMATED INTRO ---------- */
  const cmdEl = $('#heroCmd');
  const typeCmd = 'cat about.md && whoami';
  let ci = 0;
  const typeTick = () => {
    if (ci <= typeCmd.length) {
      cmdEl.textContent = typeCmd.slice(0, ci);
      ci++;
      setTimeout(typeTick, 35 + Math.random() * 40);
    } else {
      // trigger hero reveals
      $('#heroName').classList.add('reveal');
      $$('.hero-sub-line').forEach(el => el.classList.add('reveal'));
      $('.hero-cta').classList.add('reveal');
      setTimeout(() => $('.hero-stats').classList.add('reveal'), 400);
    }
  };
  setTimeout(typeTick, 400);

  /* ---------- SIDE NAV ACTIVE STATE ---------- */
  const navLinks = $$('.sidenav a');
  const sections = $$('section[id]');
  const navIo = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
      }
    });
  }, { threshold: 0.3 });
  sections.forEach(s => navIo.observe(s));

  /* smooth scroll for in-page anchors */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------- KEYBOARD ---------- */
  addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'j' || e.key === 'ArrowDown') {
      scrollBy({ top: innerHeight * 0.9, behavior: 'smooth' });
    } else if (e.key === 'k' || e.key === 'ArrowUp') {
      scrollBy({ top: -innerHeight * 0.9, behavior: 'smooth' });
    } else if (e.key === 't') {
      setTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
    } else if (e.key === 'g') {
      scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  /* ---------- VISITOR LINE ---------- */
  const visitor = $('#visitorLine');
  if (visitor) {
    const now = new Date();
    const hash = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    visitor.textContent = `session: 0x${hash} · ${now.toISOString().slice(0, 10)}`;
  }

  /* ---------- PDF RESUME RENDER (via PDF.js) ---------- */
  const resumeCanvas = document.getElementById('resumeCanvas');
  const resumeViewer = document.getElementById('resumeViewer');
  if (resumeCanvas && resumeViewer) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = async () => {
      try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const loadingTask = pdfjsLib.getDocument('assets/IshaanSamantray-Resume.pdf');
        const pdf = await loadingTask.promise;
        // render all pages
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const canvas = p === 1 ? resumeCanvas : document.createElement('canvas');
          if (p !== 1) { canvas.style.cssText = resumeCanvas.style.cssText; resumeViewer.insertBefore(canvas, document.querySelector('.resume-fallback')); }
          const vw = Math.min(resumeViewer.clientWidth - 48, 900);
          const viewport0 = page.getViewport({ scale: 1 });
          const scale = vw / viewport0.width;
          const viewport = page.getViewport({ scale: scale * 2 }); // 2x for retina
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = (viewport.width / 2) + 'px';
          canvas.style.height = (viewport.height / 2) + 'px';
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
        const fb = resumeViewer.querySelector('.resume-fallback');
        if (fb) fb.style.display = 'none';
      } catch (e) {
        console.warn('PDF render failed', e);
      }
    };
    document.head.appendChild(script);
  }
})();
