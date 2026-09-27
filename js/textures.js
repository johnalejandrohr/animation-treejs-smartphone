/* ==========================================================================
   KYVEN K1 — procedural canvas textures (no external assets)
   ========================================================================== */
NX.def('tex', function (THREE, A, NX) {
  'use strict';
  const U = NX.U;
  const SANS = 'Inter, "Helvetica Neue", "Segoe UI", Arial, sans-serif';
  const MONO = '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace';
  const Q = U.mobile ? 0.5 : 1; // texture quality scale

  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.round(w);
    c.height = Math.round(h);
    return { c, g: c.getContext('2d') };
  }
  function toTex(c, srgb = true) {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }
  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function text(g, str, x, y, size, weight, color, spacing = 0, align = 'center', font = SANS) {
    g.font = `${weight} ${size}px ${font}`;
    g.fillStyle = color;
    g.textAlign = align;
    g.textBaseline = 'middle';
    if ('letterSpacing' in g) {
      g.letterSpacing = spacing + 'px';
      g.fillText(str, x, y);
      g.letterSpacing = '0px';
    } else g.fillText(str, x, y);
  }

  /* ---------------------------------------------------------------- screen */
  function screenUI() {
    const W = 1024, H = 2230;
    const { c, g } = mk(W, H);
    g.clearRect(0, 0, W, H);
    // status bar
    text(g, 'KYVEN', 70, 86, 30, 600, 'rgba(255,255,255,0.92)', 5, 'left');
    for (let i = 0; i < 4; i++) {
      g.fillStyle = 'rgba(255,255,255,0.9)';
      rr(g, 772 + i * 16, 98 - (i + 1) * 7, 10, (i + 1) * 7 + 2, 2);
      g.fill();
    }
    text(g, '6G', 872, 88, 26, 600, 'rgba(255,255,255,0.92)', 1, 'center');
    g.strokeStyle = 'rgba(255,255,255,0.75)';
    g.lineWidth = 3;
    rr(g, 902, 74, 58, 28, 8);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.92)';
    rr(g, 907, 79, 40, 18, 4);
    g.fill();
    // date + time
    text(g, 'THURSDAY  ·  14 JUNE 2035', W / 2, 380, 34, 500, 'rgba(255,255,255,0.72)', 9);
    text(g, '10:35', W / 2, 610, 290, 200, 'rgba(255,255,255,0.96)', -8);
    // subtle assistant capsule
    g.fillStyle = 'rgba(255,255,255,0.08)';
    rr(g, W / 2 - 170, 790, 340, 64, 32);
    g.fill();
    g.fillStyle = 'rgba(170,215,255,0.95)';
    g.beginPath();
    g.arc(W / 2 - 128, 822, 8, 0, U.TAU);
    g.fill();
    text(g, 'NEURAL CORE  ·  READY', W / 2 + 14, 823, 22, 600, 'rgba(255,255,255,0.8)', 4);
    // bottom quick actions
    for (const [x, icon] of [[170, 'torch'], [W - 170, 'cam']]) {
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.beginPath();
      g.arc(x, 2010, 62, 0, U.TAU);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = 4;
      g.beginPath();
      if (icon === 'torch') {
        g.moveTo(x - 12, 1985); g.lineTo(x + 12, 1985); g.lineTo(x + 8, 2005);
        g.lineTo(x + 8, 2035); g.lineTo(x - 8, 2035); g.lineTo(x - 8, 2005); g.closePath();
      } else {
        rr(g, x - 26, 1992, 52, 38, 8);
        g.moveTo(x + 9, 2011);
        g.arc(x, 2011, 9, 0, U.TAU);
      }
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.85)';
    rr(g, W / 2 - 140, 2162, 280, 11, 6);
    g.fill();
    return toTex(c);
  }

  /* --------------------------------------------------------- die floorplan */
  function dieLayout(seed = 7) {
    const r = U.rng(seed);
    const B = [
      ['gpu', 0.075, 0.075, 0.40, 0.31],
      ['npu', 0.525, 0.075, 0.40, 0.31],
      ['cpuP', 0.075, 0.42, 0.19, 0.24],
      ['cpuP', 0.285, 0.42, 0.19, 0.24],
      ['core', 0.505, 0.42, 0.14, 0.24],
      ['cpuE', 0.67, 0.42, 0.255, 0.11],
      ['sram', 0.67, 0.55, 0.255, 0.11],
      ['sram', 0.075, 0.69, 0.40, 0.09],
      ['isp', 0.075, 0.80, 0.19, 0.125],
      ['logic', 0.285, 0.80, 0.19, 0.125],
      ['modem', 0.505, 0.69, 0.23, 0.235],
      ['logic', 0.755, 0.69, 0.17, 0.10],
      ['sec', 0.755, 0.81, 0.17, 0.115],
    ];
    const blocks = B.map(([type, x, y, w, h]) => ({ type, x, y, w, h, seed: r.int(1, 1e6) }));
    const pads = [];
    const n = 34;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      pads.push([t, 0.03], [t, 0.97], [0.03, t], [0.97, t]);
    }
    return { blocks, pads };
  }

  const DIE_COL = {
    gpu: ['#1b1631', '#3b2f63'], npu: ['#0e2428', '#1f5257'], cpuP: ['#2a2012', '#6a5226'],
    core: ['#12202e', '#2c5373'], cpuE: ['#241c12', '#5a4523'], sram: ['#171c24', '#3b4556'],
    isp: ['#231423', '#5a3456'], logic: ['#131a1f', '#2b3942'], modem: ['#12211c', '#2d5646'],
    sec: ['#221716', '#5a3b36'],
  };

  function split(r, x, y, w, h, depth, out) {
    if (depth <= 0 || w * h < 0.0006) { out.push([x, y, w, h]); return; }
    const t = r.range(0.3, 0.7);
    if (w > h) { split(r, x, y, w * t, h, depth - 1, out); split(r, x + w * t, y, w * (1 - t), h, depth - 1, out); }
    else { split(r, x, y, w, h * t, depth - 1, out); split(r, x, y + h * t, w, h * (1 - t), depth - 1, out); }
  }

  function dieTextures(layout, size = 2048 * Q) {
    const S = size;
    const col = mk(S, S), emi = mk(S / 2, S / 2);
    const g = col.g, e = emi.g;
    g.fillStyle = '#07090d';
    g.fillRect(0, 0, S, S);
    e.fillStyle = '#000';
    e.fillRect(0, 0, S / 2, S / 2);
    // background standard-cell texture across die
    const r0 = U.rng(99);
    g.globalAlpha = 0.5;
    for (let y = 0; y < S; y += 3) {
      g.fillStyle = r0() < 0.5 ? '#0c1016' : '#0a0d12';
      g.fillRect(0, y, S, 2);
    }
    g.globalAlpha = 1;
    for (const b of layout.blocks) {
      const r = U.rng(b.seed);
      const [c0, c1] = DIE_COL[b.type];
      const x = b.x * S, y = b.y * S, w = b.w * S, h = b.h * S;
      g.fillStyle = c0;
      g.fillRect(x, y, w, h);
      const sub = [];
      if (b.type === 'gpu' || b.type === 'npu') {
        const nx = b.type === 'gpu' ? 4 : 8, ny = b.type === 'gpu' ? 3 : 6;
        for (let i = 0; i < nx; i++)
          for (let j = 0; j < ny; j++) sub.push([b.x + (i + 0.08) * b.w / nx, b.y + (j + 0.08) * b.h / ny, b.w / nx * 0.84, b.h / ny * 0.84]);
      } else split(r, b.x + 0.004, b.y + 0.004, b.w - 0.008, b.h - 0.008, 4, sub);
      for (const [sx, sy, sw, sh] of sub) {
        const X = sx * S, Y = sy * S, Wd = sw * S, Ht = sh * S;
        g.fillStyle = r() < 0.5 ? c1 : c0;
        g.globalAlpha = 0.55 + r() * 0.35;
        g.fillRect(X + 1, Y + 1, Wd - 2, Ht - 2);
        g.globalAlpha = 1;
        // internal pattern
        const kind = b.type === 'sram' || r() < 0.25 ? 'stripe' : b.type === 'npu' ? 'grid' : 'cells';
        g.fillStyle = 'rgba(255,255,255,0.07)';
        if (kind === 'stripe') for (let yy = Y + 3; yy < Y + Ht - 2; yy += 4) g.fillRect(X + 3, yy, Wd - 6, 1.5);
        else if (kind === 'grid') {
          for (let yy = Y + 3; yy < Y + Ht - 2; yy += 6) g.fillRect(X + 3, yy, Wd - 6, 1);
          for (let xx = X + 3; xx < X + Wd - 2; xx += 6) g.fillRect(xx, Y + 3, 1, Ht - 6);
        } else for (let yy = Y + 3; yy < Y + Ht - 3; yy += 3) {
          let xx = X + 3;
          while (xx < X + Wd - 4) { const L = 2 + r() * 14; if (r() < 0.75) g.fillRect(xx, yy, Math.min(L, X + Wd - 3 - xx), 1.6); xx += L + 1.5; }
        }
        g.strokeStyle = 'rgba(210,230,255,0.10)';
        g.lineWidth = 1;
        g.strokeRect(X + 0.5, Y + 0.5, Wd - 1, Ht - 1);
        // emissive highlights
        e.strokeStyle = `rgba(150,205,255,${0.08 + r() * 0.25})`;
        e.lineWidth = 1;
        e.strokeRect(X / 2 + 0.5, Y / 2 + 0.5, Wd / 2 - 1, Ht / 2 - 1);
        if (r() < 0.18) { e.fillStyle = `rgba(120,190,255,${0.05 + r() * 0.12})`; e.fillRect(X / 2, Y / 2, Wd / 2, Ht / 2); }
      }
      g.strokeStyle = 'rgba(230,240,255,0.28)';
      g.lineWidth = 2;
      g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      e.strokeStyle = 'rgba(190,225,255,0.55)';
      e.lineWidth = 1.5;
      e.strokeRect(x / 2 + 1, y / 2 + 1, w / 2 - 2, h / 2 - 2);
    }
    for (const [px, py] of layout.pads) {
      g.fillStyle = '#b08b4a';
      g.fillRect(px * S - 9, py * S - 9, 18, 18);
      g.fillStyle = '#e0c283';
      g.fillRect(px * S - 5, py * S - 5, 10, 10);
      e.fillStyle = 'rgba(255,200,120,0.25)';
      e.fillRect(px * S / 2 - 3, py * S / 2 - 3, 6, 6);
    }
    g.strokeStyle = 'rgba(200,215,235,0.35)';
    g.lineWidth = 6;
    g.strokeRect(3, 3, S - 6, S - 6);
    return { map: toTex(col.c), emissiveMap: toTex(emi.c) };
  }

  /* ------------------------------------------------------------------ pcb */
  function pcb(o) {
    const s = o.pxPerUnit * Q;
    const W = Math.ceil((o.x1 - o.x0) * s), H = Math.ceil((o.y1 - o.y0) * s);
    const { c, g } = mk(W, H);
    const X = (x) => (x - o.x0) * s, Y = (y) => (o.y1 - y) * s;
    g.fillStyle = '#0a111c';
    g.fillRect(0, 0, W, H);
    const r = U.rng(41);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '30,50,80' : '0,0,0'},${0.05 + r() * 0.08})`;
      g.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 3);
    }
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const tr of o.traces) {
      g.strokeStyle = tr.w > 0.02 ? '#1b2c44' : '#16263b';
      g.lineWidth = Math.max(1.5, tr.w * s);
      g.beginPath();
      tr.pts.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))));
      g.stroke();
    }
    for (const v of o.vias) {
      g.fillStyle = '#b8924e';
      g.beginPath(); g.arc(X(v[0]), Y(v[1]), 0.016 * s, 0, U.TAU); g.fill();
      g.fillStyle = '#05080d';
      g.beginPath(); g.arc(X(v[0]), Y(v[1]), 0.007 * s, 0, U.TAU); g.fill();
    }
    for (const p of o.pads) {
      const [cx, cy, w, h] = p;
      g.fillStyle = '#16263a';
      g.fillRect(X(cx - w / 2) - 5, Y(cy + h / 2) - 5, w * s + 10, h * s + 10);
      g.strokeStyle = 'rgba(205,215,225,0.45)';
      g.lineWidth = 2;
      g.strokeRect(X(cx - w / 2) - 9, Y(cy + h / 2) - 9, w * s + 18, h * s + 18);
      if (p[4]) text(g, p[4], X(cx - w / 2) - 8, Y(cy + h / 2) - 24, Math.max(12, 0.045 * s), 600, 'rgba(210,220,230,0.55)', 2, 'left', MONO);
    }
    // BGA-like gold dots around big packages
    for (const p of o.pads.filter((p) => p[2] > 0.3)) {
      const [cx, cy, w, h] = p;
      g.fillStyle = '#c29b55';
      for (let i = 0; i <= 14; i++) {
        const t = cx - w / 2 + (w * i) / 14;
        for (const yy of [cy + h / 2 + 0.05, cy - h / 2 - 0.05]) { g.beginPath(); g.arc(X(t), Y(yy), 0.011 * s, 0, U.TAU); g.fill(); }
      }
    }
    // gold edge plating
    g.strokeStyle = '#8f7340';
    g.lineWidth = 0.05 * s;
    g.strokeRect(0, 0, W, H);
    for (const l of o.labels || []) text(g, l[0], X(l[1]), Y(l[2]), l[3] * s, 600, 'rgba(210,220,232,0.5)', 3, 'left', MONO);
    const t = toTex(c);
    t.repeat.set(1 / (o.x1 - o.x0), 1 / (o.y1 - o.y0));
    t.offset.set(-o.x0 / (o.x1 - o.x0), -o.y0 / (o.y1 - o.y0));
    return t;
  }

  /* -------------------------------------------------------------- labels */
  function batteryLabel(w, h) {
    const s = 300 * Q;
    const W = w * s, H = h * s;
    const { c, g } = mk(W, H);
    const grd = g.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, '#2b2e33');
    grd.addColorStop(1, '#1d1f23');
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
    const k = s / 300;
    g.strokeStyle = 'rgba(255,255,255,0.10)';
    g.lineWidth = 2 * k;
    g.strokeRect(40 * k, 40 * k, W - 80 * k, H - 80 * k);
    text(g, 'KYVEN ENERGY', 80 * k, 140 * k, 52 * k, 300, 'rgba(235,240,245,0.92)', 10 * k, 'left');
    text(g, 'SOLID-STATE CELL  ·  NX-SSB 6200', 80 * k, 205 * k, 22 * k, 600, 'rgba(235,240,245,0.55)', 5 * k, 'left');
    g.fillStyle = 'rgba(255,190,110,0.85)';
    g.fillRect(80 * k, 250 * k, 90 * k, 4 * k);
    const rows = [['CAPACITY', '6,200 mAh'], ['ENERGY', '24.3 Wh'], ['NOMINAL', '3.92 V'], ['CHEMISTRY', 'Li-metal / ceramic']];
    rows.forEach(([a, b], i) => {
      const y = (340 + i * 70) * k;
      text(g, a, 80 * k, y, 20 * k, 600, 'rgba(235,240,245,0.4)', 4 * k, 'left', MONO);
      text(g, b, 340 * k, y, 26 * k, 400, 'rgba(235,240,245,0.85)', 1 * k, 'left', MONO);
    });
    const r = U.rng(5);
    let x = 80 * k;
    while (x < W * 0.55) { const bw = (2 + r() * 6) * k; g.fillStyle = 'rgba(235,240,245,0.55)'; g.fillRect(x, H - 230 * k, bw, 110 * k); x += bw + (2 + r() * 5) * k; }
    for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) if (r() < 0.5) { g.fillStyle = 'rgba(235,240,245,0.5)'; g.fillRect(W - 250 * k + i * 14 * k, H - 240 * k + j * 14 * k, 12 * k, 12 * k); }
    text(g, 'DESIGNED FOR 2035  ·  DO NOT PUNCTURE', 80 * k, H - 80 * k, 16 * k, 600, 'rgba(235,240,245,0.35)', 4 * k, 'left', MONO);
    return toTex(c);
  }

  function chipTop(lines, w, h, base = '#1a1c20', ink = 'rgba(220,226,235,0.55)') {
    const s = 512 * Q;
    const W = s * (w / Math.max(w, h)), H = s * (h / Math.max(w, h));
    const { c, g } = mk(W, H);
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    const k = W / 512;
    lines.forEach((l, i) => text(g, l[0], W / 2, H * l[1], l[2] * k, l[3] || 500, l[4] || ink, (l[5] || 4) * k));
    g.fillStyle = ink;
    g.beginPath();
    g.arc(26 * k, 26 * k, 7 * k, 0, U.TAU);
    g.fill();
    return toTex(c);
  }

  function lensRings() {
    const S = 512 * Q;
    const { c, g } = mk(S, S);
    g.fillStyle = '#0b0c0e';
    g.fillRect(0, 0, S, S);
    for (let r = S * 0.5; r > 0; r -= 2.2 * Q) {
      g.strokeStyle = `rgba(255,255,255,${0.03 + 0.05 * Math.abs(Math.sin(r * 0.37))})`;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(S / 2, S / 2, r, 0, U.TAU);
      g.stroke();
    }
    return toTex(c);
  }

  function touchGrid() {
    const W = 512, H = 1024;
    const { c, g } = mk(W, H);
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(160,210,255,0.55)';
    g.lineWidth = 1.2;
    for (let x = 8; x < W; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    g.strokeStyle = 'rgba(160,210,255,0.35)';
    for (let y = 8; y < H; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = 'rgba(200,230,255,0.9)';
    for (let x = 8; x < W; x += 16) for (let y = 8; y < H; y += 16) g.fillRect(x - 1.5, y - 1.5, 3, 3);
    return toTex(c);
  }

  function backGlass(w, h) {
    const s = 256 * Q;
    const W = w * s, H = h * s;
    const rough = mk(W, H);
    const g = rough.g;
    g.fillStyle = 'rgb(118,118,118)';
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgb(18,18,18)';
    text(g, 'KYVEN', W / 2, H * 0.56, 0.36 * s, 300, 'rgb(18,18,18)', 0.16 * s);
    text(g, 'X1', W / 2, H * 0.62, 0.16 * s, 500, 'rgb(40,40,40)', 0.05 * s);
    text(g, 'DESIGNED IN 2035  ·  ASSEMBLED ATOM BY ATOM', W / 2, H * 0.93, 0.07 * s, 500, 'rgb(60,60,60)', 0.02 * s);
    const t = toTex(rough.c, false);
    t.repeat.set(-1 / w, 1 / h);
    t.offset.set(0.5, 0.5);
    return t;
  }

  function latticeDots() {
    const S = 512;
    const { c, g } = mk(S, S);
    g.fillStyle = '#0a1522';
    g.fillRect(0, 0, S, S);
    const step = 32;
    for (let y = 0; y < S; y += step)
      for (let x = 0; x < S; x += step) {
        const ox = (y / step) % 2 ? step / 2 : 0;
        const grd = g.createRadialGradient(x + ox, y, 0, x + ox, y, 9);
        grd.addColorStop(0, 'rgba(180,225,255,0.9)');
        grd.addColorStop(1, 'rgba(180,225,255,0)');
        g.fillStyle = grd;
        g.beginPath(); g.arc(x + ox, y, 9, 0, U.TAU); g.fill();
        g.beginPath(); g.arc(x + ox + 8, y + 8, 9, 0, U.TAU); g.fill();
      }
    const t = toTex(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  /* sample points from rendered text (for particle formations) */
  function textPoints(str, count, weight = 300) {
    const H = 300, W = Math.max(1600, Math.ceil(str.length * 175 + 200));
    const { c, g } = mk(W, H);
    text(g, str, W / 2, H / 2, 230, weight, '#fff', 30);
    const d = g.getImageData(0, 0, W, H).data;
    const pts = [];
    const r = U.rng(3);
    let guard = 0;
    while (pts.length < count && guard++ < count * 400) {
      const x = Math.floor(r() * W), y = Math.floor(r() * H);
      if (d[(y * W + x) * 4 + 3] > 128) pts.push([(x - W / 2) / H, -(y - H / 2) / H]);
    }
    return pts;
  }

  return { mk, toTex, rr, text, screenUI, dieLayout, dieTextures, pcb, batteryLabel, chipTop, lensRings, touchGrid, backGlass, latticeDots, textPoints, SANS, MONO };
});
