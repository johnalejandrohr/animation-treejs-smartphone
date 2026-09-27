/* ==========================================================================
   KYVEN K1 — HUD: levels, scale readout, captions, component panel,
   3D-anchored labels with leader lines.
   ========================================================================== */
NX.def('ui', function (THREE, A, NX) {
  'use strict';
  const U = NX.U;
  const $ = (s) => document.querySelector(s);
  const body = document.body;
  const el = {
    levels: [...document.querySelectorAll('.levels li')], track: $('.levels-track i'),
    scaleV: $('.scale-v'), scaleM: $('.scale-m em'), scaleBar: $('.scale-bar i'),
    caption: $('.caption p'), hero: $('.hero'), hint: $('.scroll-hint'),
    panel: $('#panel'), pk: $('.panel-k'), pt: $('.panel-t'), ps: $('.panel-s'), cta: $('.panel-cta'),
    labels: $('#labels'), leaders: $('#leaders'), loader: $('#loader'), ldBar: $('.ld-bar i'), ldStatus: $('.ld-status'),
  };
  const state = { level: -1, caption: '', panelId: null, hero: true };

  function progress(p, text) {
    el.ldBar.style.width = Math.round(p * 100) + '%';
    if (text) el.ldStatus.textContent = text;
  }

  function setLevel(idx, frac) {
    if (idx !== state.level) {
      state.level = idx;
      el.levels.forEach((li, i) => { li.classList.toggle('on', i === idx); li.classList.toggle('done', i < idx); });
    }
    el.track.style.height = U.clamp(frac) * 100 + '%';
  }

  function fmtLen(m) {
    const a = Math.abs(m);
    const u = a >= 1 ? [1, 'm'] : a >= 1e-3 ? [1e-3, 'mm'] : a >= 1e-6 ? [1e-6, 'µm'] : a >= 1e-9 ? [1e-9, 'nm'] : [1e-12, 'pm'];
    const v = m / u[0];
    return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + ' ' + u[1];
  }
  function setScale(meters) {
    el.scaleV.textContent = fmtLen(meters);
    const mag = 0.152 / meters;
    const e = Math.floor(Math.log10(Math.max(mag, 1)));
    el.scaleM.innerHTML = mag < 1000 ? '×' + Math.max(1, mag).toFixed(mag < 10 ? 1 : 0) : '×' + (mag / Math.pow(10, e)).toFixed(1) + '·10<sup>' + e + '</sup>';
    const l10 = Math.log10(meters);
    el.scaleBar.style.width = 14 + 60 * (1 - U.fract(l10)) + 'px';
  }

  let capTimer = 0;
  function setCaption(text) {
    if (text === state.caption) return;
    state.caption = text;
    clearTimeout(capTimer);
    el.caption.classList.remove('on');
    if (text) capTimer = setTimeout(() => { el.caption.textContent = text; el.caption.classList.add('on'); }, 380);
  }

  function setHero(on) {
    if (on === state.hero) return;
    state.hero = on;
    el.hero.classList.toggle('out', !on);
    el.hint.classList.toggle('out', !on);
  }

  /* component panel */
  function setPanel(info, idx, cta) {
    const id = info ? info.id : null;
    if (id === state.panelId) return;
    state.panelId = id;
    el.panel.classList.remove('on');
    clearTimeout(setPanel.t);
    if (!info) return;
    setPanel.t = setTimeout(() => {
      el.pk.textContent = String(idx).padStart(2, '0') + ' / ' + info.name;
      el.pt.textContent = info.title;
      el.ps.innerHTML = info.specs.map((s) => '<li>' + s + '</li>').join('');
      el.cta.textContent = cta || '';
      el.cta.classList.toggle('show', !!cta);
      void el.panel.offsetWidth;
      el.panel.classList.add('on');
    }, 120);
  }

  /* ---------------------------------------------------------- labels */
  const labels = new Map();
  const v = new THREE.Vector3();
  let W = innerWidth, H = innerHeight;
  function resize() { W = innerWidth; H = innerHeight; }
  function label(id, html, cls) {
    let L = labels.get(id);
    if (!L) {
      const d = document.createElement('div');
      d.className = 'lbl ' + (cls || 'r');
      d.innerHTML = html;
      el.labels.appendChild(d);
      L = { d, o: 0, html, cls };
      labels.set(id, L);
    } else if (html !== L.html) { L.d.innerHTML = html; L.html = html; }
    return L;
  }
  /* place label with id at world point p seen by camera; a = target opacity */
  function place(id, html, cls, p, camera, a) {
    const L = label(id, html, cls);
    L.seen = true;
    L.target = a;
    if (a <= 0.001 && L.o <= 0.001) { L.d.style.opacity = 0; return; }
    v.copy(p).project(camera);
    const behind = v.z > 1;
    const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
    L.x = x; L.y = y;
    const c = L.cls || 'r';
    const tx = c === 'r' ? '0' : c === 'l' ? '-100%' : '-50%';
    const ty = c === 'u' ? '-100%' : c === 'd' ? '0' : '-50%';
    L.d.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(${tx}, ${ty})`;
    if (behind) L.target = 0;
  }
  function endFrame(dt) {
    for (const [id, L] of labels) {
      const t = L.seen ? L.target : 0;
      L.o = U.damp(L.o, t, 7, dt);
      if (L.o < 0.003 && t === 0) L.o = 0;
      L.d.style.opacity = L.o.toFixed(3);
      L.d.style.visibility = L.o > 0.003 ? 'visible' : 'hidden';
      L.seen = false;
    }
  }

  /* leader line from the panel to a screen point */
  let leaderPath = null;
  function leader(x, y, a) {
    if (!leaderPath) {
      leaderPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '2.5');
      el.leaders.append(leaderPath, dot);
      leaderPath.dot = dot;
    }
    if (a <= 0.01 || x == null) { leaderPath.style.opacity = 0; leaderPath.dot.style.opacity = 0; return; }
    const r = el.panel.getBoundingClientRect();
    if (r.width < 10) return;
    const mobile = W < 760;
    const x0 = mobile ? r.left + 40 : r.right + 18, y0 = mobile ? r.top - 14 : r.top + 32;
    const mx = mobile ? x0 : x0 + Math.max(24, (x - x0) * 0.35);
    leaderPath.setAttribute('d', mobile ? `M${x0},${y0} L${x0},${Math.max(y, y0 - 60)} L${x},${y}` : `M${x0},${y0} L${mx},${y0} L${x},${y}`);
    leaderPath.style.opacity = a * 0.9;
    leaderPath.dot.setAttribute('cx', x);
    leaderPath.dot.setAttribute('cy', y);
    leaderPath.dot.style.opacity = a;
  }

  return { el, progress, setLevel, setScale, setCaption, setHero, setPanel, place, endFrame, leader, resize, fmtLen };
});
