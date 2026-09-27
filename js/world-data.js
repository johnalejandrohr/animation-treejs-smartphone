/* ==========================================================================
   KYVEN K1 — WORLD 4: the return. The atom dissolves into data particles
   that become binary, then circuits, the chip, the board and finally the
   phone. Coordinates are the phone world's (so the last formation lands
   exactly on the real phone).
   ========================================================================== */
NX.def('worldData', function (THREE, A, NX) {
  'use strict';
  const U = NX.U;
  const COLORS = [0x8fbfff, 0xdfeaff, 0x8fd8ff, 0xaec8ff, 0xf0d0a6, 0xdfe9ff];
  const ALPHA = [0.4, 0.3, 0.75, 0.62, 0.62, 0.32];

  function create(renderer, assets, tier) {
    const N = tier.low ? 12000 : 26000;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.0005, 600);
    const backdrop = NX.sh.backdrop({ top: 0x030509, mid: 0x060a12, bot: 0x010204, glow: 0x0d1830 });
    scene.add(backdrop);

    const geo = new THREE.BufferGeometry();
    const attrs = ['position', 'aS1', 'aS2', 'aS3', 'aS4', 'aS5'];
    for (const a of attrs) geo.setAttribute(a, new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const rnd = new Float32Array(N * 4);
    const r = U.rng(101);
    for (let i = 0; i < N; i++) rnd.set([r(), r(), r(), r()], i * 4);
    geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: NX.sh.G.uTime, uViewportH: NX.sh.G.uViewportH, uStage: { value: 0 }, uAmp: { value: 0.01 },
        uSize: { value: 0.002 }, uColA: { value: new THREE.Color() }, uColB: { value: new THREE.Color() }, uAlpha: { value: 1 }, uGlow: { value: 1 },
      },
      vertexShader: /* glsl */ `
        ${NX.sh.NOISE}
        ${NX.sh.POINT_SIZE}
        attribute vec3 aS1, aS2, aS3, aS4, aS5; attribute vec4 aRand;
        uniform float uStage, uAmp, uSize, uTime;
        varying float vMix; varying float vA; varying float vTw;
        vec3 pick(float k){ if (k < 0.5) return position; if (k < 1.5) return aS1; if (k < 2.5) return aS2; if (k < 3.5) return aS3; if (k < 4.5) return aS4; return aS5; }
        void main(){
          float st = clamp(uStage, 0.0, 5.0);
          float k = floor(min(st, 4.999));
          float f = st - k;
          float d = aRand.y * 0.28;
          float ff = smoothstep(d, d + 0.72, f);
          float e = ff * ff * (3.0 - 2.0 * ff);
          vec3 a = pick(k), b = pick(k + 1.0);
          vec3 p = mix(a, b, e);
          float mid = sin(3.14159 * ff);
          p += snoise3(p * (3.0 / max(uAmp, 1e-4)) + vec3(0.0, uTime * 0.3, aRand.x * 10.0)) * uAmp * mid * (0.6 + aRand.z);
          vMix = e;
          vTw = 0.65 + 0.35 * sin(uTime * (2.0 + aRand.w * 3.0) + aRand.x * 40.0);
          vA = 0.55 + 0.45 * aRand.z + mid * 0.6;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = max(worldPointSize(uSize * (0.5 + aRand.w), mv), 1.0);
        }`,
      fragmentShader: /* glsl */ `
        ${NX.sh.GLOW_FRAG}
        uniform vec3 uColA, uColB; uniform float uAlpha, uGlow; varying float vMix; varying float vA; varying float vTw;
        void main(){ vec3 c = mix(uColA, uColB, vMix); gl_FragColor = vec4(c * glowDisc(gl_PointCoord) * vA * vTw * uAlpha * uGlow, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);
    const dust = NX.env.dust(tier.low ? 200 : 500, [12, 8, 10], { color: 0x8fb4ff, size: 0.03, opacity: 0.25, drift: 0.4, seed: 44 });
    scene.add(dust);

    /* ---------------------------------------------------------- shapes */
    function setShape(name, list) {
      const arr = geo.attributes[name].array;
      const bb = new THREE.Box3().setFromPoints(list.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
      const eps = bb.getSize(new THREE.Vector3()).length() * 0.0035;
      for (let i = 0; i < N; i++) {
        const p = list[i % list.length];
        const j = i >= list.length ? eps : 0;
        arr[i * 3] = p[0] + r.gauss() * j; arr[i * 3 + 1] = p[1] + r.gauss() * j; arr[i * 3 + 2] = p[2] + r.gauss() * j;
      }
      geo.attributes[name].needsUpdate = true;
    }
    const rectPts = (out, cx, cy, w, h, n, z, jit = 0) => {
      for (let i = 0; i < n; i++) {
        const t = r() * 2 * (w + h);
        let x, y;
        if (t < w) { x = cx - w / 2 + t; y = cy - h / 2; }
        else if (t < w + h) { x = cx + w / 2; y = cy - h / 2 + (t - w); }
        else if (t < 2 * w + h) { x = cx + w / 2 - (t - w - h); y = cy + h / 2; }
        else { x = cx - w / 2; y = cy + h / 2 - (t - 2 * w - h); }
        out.push([x + r.gauss() * jit, y + r.gauss() * jit, z + r.gauss() * jit]);
      }
    };
    const rrPts = (out, w, h, rad, n, z, cx = 0, cy = 0) => {
      const shape = NX.pp.rr(w, h, rad);
      const pts = shape.getSpacedPoints(400);
      for (let i = 0; i < n; i++) { const p = pts[Math.floor(r() * pts.length)]; out.push([cx + p.x, cy + p.y, z]); }
    };
    const tracePts = (out, traces, n, z, ox = 0, oy = 0, s = 1) => {
      const segs = [];
      let total = 0;
      for (const tr of traces) for (let k = 1; k < tr.pts.length; k++) {
        const a = tr.pts[k - 1], b = tr.pts[k];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        segs.push([a, b, total, L]);
        total += L;
      }
      for (let i = 0; i < n; i++) {
        const u = r() * total;
        let lo = 0, hi = segs.length - 1;
        while (lo < hi) { const m = (lo + hi + 1) >> 1; if (segs[m][2] <= u) lo = m; else hi = m - 1; }
        const [a, b, t0, L] = segs[lo];
        const f = (u - t0) / L;
        out.push([ox + (a[0] + (b[0] - a[0]) * f) * s, oy + (a[1] + (b[1] - a[1]) * f) * s, z]);
      }
    };

    /* build every formation in phone-local space, then transform to world.
       atomPts: sampled world-3 atom already mapped into world-4 coords */
    function build(o) {
      const { rootMatrix, atomPts } = o;
      const B = NX.phoneInt.BOARD, S = NX.phoneInt.SOC;
      const soc = new THREE.Vector3(S.x + B.cx, S.y + B.cy, 0.16);
      const toWorld = (list) => list.map((p) => { const v = new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(rootMatrix); return [v.x, v.y, v.z]; });

      // S1: binary
      const bits = NX.tex.textPoints('0 1 0 1 1 0 1 0', 5000, 300).map(([x, y]) => [soc.x + x * 0.02, soc.y + y * 0.02, soc.z + r.gauss() * 0.0012]);
      // S2: circuits around the SoC
      const tr = NX.traces.route({ seed: 91, x0: -0.3, y0: -0.3, x1: 0.3, y1: 0.3, step: 0.012, count: 120, width: 0.004, minSeg: 3, maxSeg: 12, maxTurns: 5, minLen: 0.06 });
      const circ = [];
      tracePts(circ, tr, 6000, soc.z, soc.x, soc.y);
      // S3: the chip (package, die floorplan, pads)
      const chip = [];
      rectPts(chip, soc.x, soc.y, 0.66, 0.66, 900, soc.z);
      rectPts(chip, soc.x, soc.y, 0.46, 0.46, 700, soc.z);
      for (const b of assets.tex.die.layout.blocks) rectPts(chip, soc.x + (b.x + b.w / 2 - 0.5) * 0.44, soc.y - (b.y + b.h / 2 - 0.5) * 0.44, b.w * 0.44, b.h * 0.44, 260, soc.z);
      for (let i = 0; i < 14; i++) for (const s of [-1, 1]) {
        const t = (i / 13 - 0.5) * 0.58;
        chip.push([soc.x + t, soc.y + s * 0.3, soc.z], [soc.x + s * 0.3, soc.y + t, soc.z]);
      }
      // S4: the logic board
      const board = [];
      rrPts(board, B.w, B.h, 0.2, 2200, B.z + 0.05, B.cx, B.cy);
      const bt = NX.phone.lastBoardTraces || [];
      if (bt.length) tracePts(board, bt, 2600, B.z + 0.05, B.cx, B.cy);
      rectPts(board, soc.x, soc.y, 0.66, 0.66, 500, B.z + 0.05);
      for (const m of [[1.13, -0.13, 0.46, 0.5], [1.13, -0.8, 0.46, 0.42], [0.32, -0.9, 0.56, 0.42], [-0.5, -0.7, 0.44, 0.44], [0.2, 0.8, 0.4, 0.34]])
        rectPts(board, B.cx + m[0], B.cy + m[1], m[2], m[3], 220, B.z + 0.05);
      // S5: the phone
      const ph = [];
      const W = NX.phone.W, H = NX.phone.H;
      rrPts(ph, W, H, 0.56, 4200, 0.155);
      rrPts(ph, W, H, 0.56, 2200, -0.155);
      rrPts(ph, W - 0.17, H - 0.17, 0.48, 2000, 0.16);
      const clock = NX.tex.textPoints('10:35', 2600, 200);
      for (const [x, y] of clock) ph.push([x * 0.5, 2.3 + y * 0.5, 0.16]);
      for (let i = 0; i < 1400; i++) ph.push([r.range(-W / 2 + 0.15, W / 2 - 0.15), r.range(-H / 2 + 0.15, H / 2 - 0.15), 0.16]);
      rrPts(ph, 3.12, 1.24, 0.44, 900, -0.2, 0, 2.78);

      setShape('position', atomPts);
      setShape('aS1', toWorld(bits));
      setShape('aS2', toWorld(circ));
      setShape('aS3', toWorld(chip));
      setShape('aS4', toWorld(board));
      setShape('aS5', toWorld(ph));
      return { soc: soc.clone().applyMatrix4(rootMatrix) };
    }

    const fwd = new THREE.Vector3();
    const colA = new THREE.Color(), colB = new THREE.Color();
    function update(s) {
      const st = U.clamp(s.stage ?? 0, 0, 5);
      const k = Math.min(Math.floor(st), 4);
      colA.set(COLORS[k]);
      colB.set(COLORS[k + 1]);
      mat.uniforms.uColA.value.copy(colA).multiplyScalar(1.3);
      mat.uniforms.uColB.value.copy(colB).multiplyScalar(1.3);
      mat.uniforms.uStage.value = st;
      mat.uniforms.uAmp.value = s.amp ?? 0.01;
      mat.uniforms.uSize.value = s.size ?? 0.002;
      const fr = st - k;
      mat.uniforms.uAlpha.value = (s.alpha ?? 1) * U.lerp(ALPHA[k], ALPHA[k + 1], U.smooth(fr));
      mat.uniforms.uGlow.value = s.glow ?? 1;
      camera.getWorldDirection(fwd);
      backdrop.material.uniforms.uGlowDir.value.copy(fwd);
      backdrop.position.copy(camera.position);
      dust.material.uniforms.uOpacity.value = 0.25 * (s.dust ?? 1);
    }

    return { scene, camera, update, build, N };
  }

  return { create };
});
