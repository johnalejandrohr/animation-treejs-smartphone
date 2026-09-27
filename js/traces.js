/* ==========================================================================
   KYVEN K1 — Manhattan/45° trace router + glowing "data pulse" ribbons
   Used by the logic board, the chip world and the data finale.
   ========================================================================== */
NX.def('traces', function (THREE, A, NX) {
  'use strict';
  const U = NX.U;
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

  /* route polylines on a grid; returns [{pts:[[x,y]...], len, w}] in world units */
  function route(o) {
    const r = o.rng || U.rng(o.seed || 1);
    const step = o.step;
    const nx = Math.floor((o.x1 - o.x0) / step), ny = Math.floor((o.y1 - o.y0) / step);
    const occ = new Uint8Array(nx * ny);
    const blocked = o.blocked || (() => false);
    const cx = (i) => o.x0 + (i + 0.5) * step, cy = (j) => o.y0 + (j + 0.5) * step;
    const free = (i, j) => i >= 0 && j >= 0 && i < nx && j < ny && !occ[j * nx + i] && !blocked(cx(i), cy(j));
    const out = [];
    let attempts = 0;
    while (out.length < o.count && attempts++ < o.count * 30) {
      let i, j, d;
      if (o.starts && o.starts.length && r() < (o.startBias ?? 0.7)) {
        const s = r.pick(o.starts);
        i = Math.floor((s[0] - o.x0) / step); j = Math.floor((s[1] - o.y0) / step); d = s[2] ?? r.int(0, 3) * 2;
      } else { i = r.int(0, nx - 1); j = r.int(0, ny - 1); d = r.int(0, 3) * 2; }
      if (!free(i, j)) continue;
      const cells = [[i, j]];
      occ[j * nx + i] = 1;
      const pts = [[cx(i), cy(j)]];
      const turns = r.int(o.minTurns ?? 1, o.maxTurns ?? 4);
      for (let t = 0; t <= turns; t++) {
        const diag = d % 2 === 1;
        const L = diag ? r.int(1, 3) : r.int(o.minSeg ?? 3, o.maxSeg ?? 12);
        let moved = 0;
        for (let k = 0; k < L; k++) {
          const ni = i + DIRS[d][0], nj = j + DIRS[d][1];
          if (!free(ni, nj)) break;
          i = ni; j = nj; occ[j * nx + i] = 1; cells.push([i, j]); moved++;
        }
        if (moved === 0) break;
        pts.push([cx(i), cy(j)]);
        // turn: 45° steps keep the classic PCB look
        if (d % 2 === 1) d = (d + r.sign() + 8) % 8;
        else d = (d + (r() < 0.65 ? r.sign() : r.sign() * 2) + 8) % 8;
      }
      let len = 0;
      for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      if (len < (o.minLen ?? step * 4)) { for (const [a, b] of cells) occ[b * nx + a] = 0; continue; }
      out.push({ pts, len, w: o.width * (r() < (o.wideChance ?? 0.1) ? 2.2 : 1) });
    }
    return out;
  }

  /* flat mitered ribbons; plane 'xy' (z = level) or 'xz' (y = level) */
  function ribbonGeometry(traces, o = {}) {
    const plane = o.plane || 'xy', level = o.level || 0;
    const P = [], D = [], L = [], S = [], SD = [], idx = [];
    const r = U.rng(o.seed || 5);
    let base = 0;
    for (const tr of traces) {
      const pts = tr.pts, n = pts.length;
      if (n < 2) continue;
      const seed = r();
      let dist = 0;
      for (let k = 0; k < n; k++) {
        if (k > 0) dist += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
        const prev = pts[Math.max(k - 1, 0)], next = pts[Math.min(k + 1, n - 1)];
        let dx0 = pts[k][0] - prev[0], dy0 = pts[k][1] - prev[1];
        let dx1 = next[0] - pts[k][0], dy1 = next[1] - pts[k][1];
        if (k === 0) { dx0 = dx1; dy0 = dy1; }
        if (k === n - 1) { dx1 = dx0; dy1 = dy0; }
        const l0 = Math.hypot(dx0, dy0) || 1, l1 = Math.hypot(dx1, dy1) || 1;
        const n0x = -dy0 / l0, n0y = dx0 / l0, n1x = -dy1 / l1, n1y = dx1 / l1;
        let mx = n0x + n1x, my = n0y + n1y;
        const ml = Math.hypot(mx, my) || 1;
        mx /= ml; my /= ml;
        const miter = (tr.w * 0.5) / Math.max(0.35, mx * n0x + my * n0y);
        for (const side of [-1, 1]) {
          const x = pts[k][0] + mx * miter * side, y = pts[k][1] + my * miter * side;
          if (plane === 'xy') P.push(x, y, level); else P.push(x, level, -y);
          D.push(dist); L.push(tr.len); S.push(side); SD.push(seed);
        }
        if (k < n - 1) {
          const a = base + k * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      base += n * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('aDist', new THREE.Float32BufferAttribute(D, 1));
    g.setAttribute('aLen', new THREE.Float32BufferAttribute(L, 1));
    g.setAttribute('aSide', new THREE.Float32BufferAttribute(S, 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(SD, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }

  function pulseMaterial(o = {}) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: NX.sh.G.uTime,
        uIntensity: { value: o.intensity ?? 1 },
        uColor: { value: new THREE.Color(o.color ?? 0x9fd6ff) },
        uBase: { value: new THREE.Color(o.base ?? 0x0c1a2a) },
        uSpeed: { value: o.speed ?? 1 },
        uPulse: { value: o.pulse ?? 0.3 },
        uGap: { value: o.gap ?? 1 },
        uFogDensity: { value: o.fog ?? 0 },
        uReveal: { value: o.reveal ?? 1 },
      },
      vertexShader: /* glsl */ `
        attribute float aDist, aLen, aSide, aSeed;
        varying float vDist, vLen, vSide, vSeed, vDepth;
        void main(){
          vDist = aDist; vLen = aLen; vSide = aSide; vSeed = aSeed;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uIntensity, uSpeed, uPulse, uGap, uFogDensity, uReveal;
        uniform vec3 uColor, uBase;
        varying float vDist, vLen, vSide, vSeed, vDepth;
        void main(){
          float speed = uSpeed * (0.55 + vSeed * 0.9);
          float span = vLen + uPulse * 3.0 + uGap * (0.5 + vSeed);
          float head = fract(uTime * speed / span + vSeed * 7.13) * span - uPulse;
          float d = head - vDist;
          float p = d > 0.0 ? exp(-d / uPulse) : exp(d / (uPulse * 0.06));
          float edge = 1.0 - smoothstep(0.45, 1.0, abs(vSide));
          float reveal = smoothstep(0.0, 0.08, uReveal * (vLen + 0.5) - vDist - 0.02 - vSeed * 0.3 * (1.0 - uReveal));
          float fog = exp(-vDepth * uFogDensity);
          vec3 c = (uBase + uColor * p * 3.0) * edge * reveal * fog * uIntensity;
          gl_FragColor = vec4(c, 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }

  /* bright pads at trace ends */
  function endpoints(traces, plane = 'xy', level = 0, size = 0.02) {
    const P = [], S = [];
    const r = U.rng(9);
    for (const tr of traces)
      for (const p of [tr.pts[0], tr.pts[tr.pts.length - 1]]) {
        if (plane === 'xy') P.push(p[0], p[1], level); else P.push(p[0], level, -p[1]);
        S.push(r());
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(S, 1));
    const m = NX.sh.glowPoints({ color: 0xbfe3ff, size, opacity: 0.8 });
    return new THREE.Points(g, m);
  }

  return { route, ribbonGeometry, pulseMaterial, endpoints };
});
