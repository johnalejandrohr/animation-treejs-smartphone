/* ==========================================================================
   KYVEN K1 — internal components: logic board, SoC, memory, battery,
   liquid cooling, sensors, antennas, support systems
   ========================================================================== */
NX.def('phoneInt', function (THREE, A, NX) {
  'use strict';
  const U = NX.U, pp = NX.pp, M = pp.M;
  const BOARD = { cx: 0, cy: 2.25, w: 3.24, h: 2.6, z: 0.043, t: 0.026 };
  const CAMHOLE = { x: -0.98, y: 2.78 - 2.25, w: 0.98, h: 0.98 };
  const COMPS = [
    // [x, y, w, h, thick, label, kind]   (board-local coordinates)
    [0.32, -1.02 + 0.12, 0.56, 0.42, 0.022, 'NX-M6 6G', 'chip'],
    [-0.5, -0.7, 0.44, 0.44, 0.02, 'NX-PMU', 'chip'],
    [-1.25, -0.8, 0.3, 0.3, 0.018, 'RF-FEM', 'chip'],
    [-1.25, -0.23, 0.28, 0.24, 0.016, 'UWB2', 'chip'],
    [-0.45, -0.1, 0.3, 0.24, 0.016, 'AUD', 'chip'],
    [0.95, 0.75, 0.3, 0.3, 0.016, 'NFC', 'chip'],
    [0.2, 0.8, 0.4, 0.34, 0.02, 'ISP-X', 'chip'],
    [-0.1, 1.15, 0.6, 0.12, 0.03, '', 'conn'],
    [1.3, 1.1, 0.3, 0.14, 0.03, '', 'conn'],
    [-0.6, -1.2, 0.55, 0.12, 0.03, '', 'conn'],
    [0.95, 0.37, 0.14, 0.1, 0.02, '', 'xtal'],
  ];
  const SOC = { x: 0.32, y: -0.13, w: 0.66 };
  const MEM = [[1.13, -0.13, 0.46, 0.5, 'LPDDR7X', '32GB'], [1.13, -0.8, 0.46, 0.42, 'UFS 5.0', '2TB']];

  function inRect(x, y, r, pad = 0) {
    return Math.abs(x - r[0]) < r[2] / 2 + pad && Math.abs(y - r[1]) < r[3] / 2 + pad;
  }

  function buildBoard(ctx) {
    const { parts, part, tex } = ctx;
    /* ---------- layout rects used for routing + texture pads */
    const rects = COMPS.map((c) => [c[0], c[1], c[2], c[3], c[5]]);
    rects.push([SOC.x, SOC.y, SOC.w, SOC.w, 'U1 KV1']);
    for (const m of MEM) rects.push([m[0], m[1], m[2], m[3], m[4]]);
    const blocked = (x, y) =>
      rects.some((r) => inRect(x, y, r, 0.05)) || inRect(x, y, [CAMHOLE.x, CAMHOLE.y, CAMHOLE.w, CAMHOLE.h], 0.06) ||
      Math.abs(x) > BOARD.w / 2 - 0.08 || Math.abs(y) > BOARD.h / 2 - 0.08;
    const starts = [];
    const r = U.rng(21);
    for (const rc of rects) for (let i = 0; i < 10; i++) {
      const side = r.int(0, 3);
      const t = r.range(-0.45, 0.45);
      const off = 0.09;
      if (side === 0) starts.push([rc[0] + t * rc[2], rc[1] + rc[3] / 2 + off, 2]);
      if (side === 1) starts.push([rc[0] + t * rc[2], rc[1] - rc[3] / 2 - off, 6]);
      if (side === 2) starts.push([rc[0] + rc[2] / 2 + off, rc[1] + t * rc[3], 0]);
      if (side === 3) starts.push([rc[0] - rc[2] / 2 - off, rc[1] + t * rc[3], 4]);
    }
    const traces = NX.traces.route({
      seed: 33, x0: -BOARD.w / 2, y0: -BOARD.h / 2, x1: BOARD.w / 2, y1: BOARD.h / 2, step: 0.032, count: U.mobile ? 150 : 260,
      width: 0.011, minSeg: 3, maxSeg: 16, maxTurns: 5, blocked, starts, startBias: 0.85, minLen: 0.18, wideChance: 0.12,
    });
    NX.phone.lastBoardTraces = traces;
    const vias = [];
    for (const tr of traces) if (r() < 0.5) vias.push(tr.pts[tr.pts.length - 1]);
    const pcbTex = tex.lib.pcb({
      x0: -BOARD.w / 2, y0: -BOARD.h / 2, x1: BOARD.w / 2, y1: BOARD.h / 2, pxPerUnit: 620,
      traces, vias, pads: rects.map((rc) => [rc[0], rc[1], rc[2], rc[3], rc[4]]),
      labels: [['KYVEN K1 · MLB-2035 · REV C', -1.5, -1.2, 0.05]],
    });

    /* ---------- board part */
    const p = part('board');
    const sub = new THREE.Group();
    sub.position.set(BOARD.cx, BOARD.cy, BOARD.z);
    p.group.add(sub);
    p.sub = sub;
    const geo = pp.slab(BOARD.w, BOARD.h, 0.2, BOARD.t, { bevel: 0.004, holes: [pp.hole(CAMHOLE.w, CAMHOLE.h, 0.2, CAMHOLE.x, CAMHOLE.y)] });
    pp.mesh(p, geo, [M.pcb(pcbTex), M.pcbEdge()], sub);
    const top = BOARD.t / 2;
    for (const c of COMPS) {
      const [x, y, w, h, t, label, kind] = c;
      if (kind === 'chip') {
        pp.mesh(p, new A.RoundedBoxGeometry(w, h, t, 2, 0.008), M.chip(), sub, { pos: [x, y, top + t / 2] });
        const tt = tex.lib.chipTop([[label, 0.5, 64, 600, null, 6], ['NX · 2035', 0.72, 34, 500]], w, h);
        pp.mesh(p, pp.face(w * 0.94, h * 0.94, 0.01), M.chip(tt), sub, { pos: [x, y, top + t + 0.0006], cast: false });
      } else if (kind === 'conn') {
        pp.mesh(p, new THREE.BoxGeometry(w, h, t), M.plastic(), sub, { pos: [x, y, top + t / 2] });
        const pins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, h * 0.7, 0.006), M.gold(), Math.floor(w / 0.03));
        for (let i = 0; i < pins.count; i++) pins.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x - w / 2 + 0.02 + i * 0.03, y, top + t + 0.002));
        pins.userData.part = 'board';
        p.mats.push(pins.material);
        sub.add(pins);
      } else pp.mesh(p, new A.RoundedBoxGeometry(w, h, t, 2, 0.02), M.steel(), sub, { pos: [x, y, top + t / 2] });
    }
    // passive components (instanced)
    const N = U.mobile ? 160 : 300;
    const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), pp.std({ color: 0xffffff, roughness: 0.5, metalness: 0.2 }), N);
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
    const cols = [new THREE.Color(0x8a7355), new THREE.Color(0x151618), new THREE.Color(0x9aa0a6), new THREE.Color(0x6e5a44)];
    let n = 0, guard = 0;
    while (n < N && guard++ < N * 60) {
      const x = r.range(-BOARD.w / 2 + 0.08, BOARD.w / 2 - 0.08), y = r.range(-BOARD.h / 2 + 0.08, BOARD.h / 2 - 0.08);
      if (rects.some((rc) => inRect(x, y, rc, 0.03)) || inRect(x, y, [CAMHOLE.x, CAMHOLE.y, CAMHOLE.w, CAMHOLE.h], 0.04)) continue;
      const big = r() < 0.15;
      sc.set(big ? 0.07 : 0.04, big ? 0.04 : 0.022, big ? 0.03 : 0.018);
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), r() < 0.5 ? 0 : Math.PI / 2);
      ps.set(x, y, top + sc.z / 2);
      caps.setMatrixAt(n, mtx.compose(ps, q, sc));
      caps.setColorAt(n, cols[r() < 0.55 ? 0 : r() < 0.6 ? 1 : r() < 0.5 ? 2 : 3]);
      n++;
    }
    caps.count = n;
    caps.userData.part = 'board';
    caps.castShadow = true;
    sub.add(caps);
    p.mats.push(caps.material);
    // shield fence around SoC + memory
    const fence = M.steel();
    const fx0 = -0.08, fx1 = 1.44, fy0 = -0.46, fy1 = 0.26;
    for (const [x, y, w, h] of [[(fx0 + fx1) / 2, fy0, fx1 - fx0, 0.012], [(fx0 + fx1) / 2, fy1, fx1 - fx0, 0.012], [fx0, (fy0 + fy1) / 2, 0.012, fy1 - fy0], [fx1, (fy0 + fy1) / 2, 0.012, fy1 - fy0]])
      pp.mesh(p, new THREE.BoxGeometry(w, h, 0.03), fence, sub, { pos: [x, y, top + 0.015] });
    p.traces = traces;
    p.boardTop = top;

    /* ---------- SoC part */
    const s = part('soc');
    const ss = new THREE.Group();
    ss.position.copy(sub.position);
    s.group.add(ss);
    s.sub = ss;
    const subst = pp.std({ color: 0x1b2621, metalness: 0.3, roughness: 0.5 });
    pp.mesh(s, new A.RoundedBoxGeometry(SOC.w, SOC.w, 0.02, 2, 0.01), subst, ss, { pos: [SOC.x, SOC.y, top + 0.01] });
    const die = tex.die;
    s.dieMat = pp.std({ color: 0xffffff, map: die.map, emissiveMap: die.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.25, metalness: 0.55, roughness: 0.32 });
    s.dieSize = 0.44;
    s.die = pp.mesh(s, new THREE.PlaneGeometry(s.dieSize, s.dieSize), s.dieMat, ss, { pos: [SOC.x, SOC.y, top + 0.0215], cast: false });
    const dcaps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.016, 0.012), M.ceramic(), 24);
    for (let i = 0; i < 24; i++) {
      const side = i % 4, t = (Math.floor(i / 4) - 2.5) * 0.085;
      const x = side < 2 ? t : (side === 2 ? 1 : -1) * 0.285, y = side < 2 ? (side === 0 ? 1 : -1) * 0.285 : t;
      dcaps.setMatrixAt(i, new THREE.Matrix4().makeTranslation(SOC.x + x, SOC.y + y, top + 0.026));
    }
    dcaps.userData.part = 'soc';
    ss.add(dcaps);
    s.mats.push(dcaps.material);
    const lid = new THREE.Group();
    lid.position.set(SOC.x, SOC.y, top + 0.031);
    ss.add(lid);
    s.lid = lid;
    s.lidMats = [];
    const lidMat = pp.phys({ color: 0xb8bcc2, metalness: 1, roughness: 0.22, clearcoat: 0.3 });
    const lidTop = tex.lib.chipTop([['KV1', 0.42, 150, 200, 'rgba(40,44,50,0.85)', 30], ['NEURAL · 1.4 nm GAA', 0.68, 30, 600, 'rgba(40,44,50,0.7)', 8], ['KVA1-2035-A', 0.8, 24, 500, 'rgba(40,44,50,0.55)', 6]], 1, 1, '#b9bdc3');
    const lidFace = pp.phys({ color: 0xffffff, map: lidTop, metalness: 0.9, roughness: 0.25 });
    pp.mesh(s, new A.RoundedBoxGeometry(0.56, 0.56, 0.014, 2, 0.02), lidMat, lid);
    pp.mesh(s, pp.face(0.52, 0.52, 0.02), lidFace, lid, { pos: [0, 0, 0.0072], cast: false });
    s.lidMats.push(lidMat, lidFace);
    s.localCenter = new THREE.Vector3(SOC.x + BOARD.cx, SOC.y + BOARD.cy, BOARD.z + top + 0.0215);

    /* ---------- memory part */
    const m = part('memory');
    const ms = new THREE.Group();
    ms.position.copy(sub.position);
    m.group.add(ms);
    for (const [x, y, w, h, a, b] of MEM) {
      pp.mesh(m, new A.RoundedBoxGeometry(w, h, 0.03, 2, 0.008), M.chip(), ms, { pos: [x, y, top + 0.015] });
      const tt = tex.lib.chipTop([['KYVEN', 0.3, 40, 600, null, 10], [a, 0.52, 58, 300, 'rgba(230,235,242,0.8)', 4], [b, 0.74, 48, 600]], w, h);
      pp.mesh(m, pp.face(w * 0.94, h * 0.94, 0.008), M.chip(tt), ms, { pos: [x, y, top + 0.0306], cast: false });
    }
  }

  function build(ctx) {
    buildBoard(ctx);
    NX.phoneInt2.build(ctx);
  }

  function update(ctx, s) {
    const soc = ctx.parts.soc;
    const l = U.ease.inOutCubic(U.clamp(s.lid || 0));
    soc.lid.position.z = BOARD.t / 2 + 0.031 + l * 0.55;
    soc.lid.rotation.x = l * 0.25;
    const lf = (1 - U.sstep(0.3, 0.95, s.lid || 0)) * soc.fade;
    for (const mm of soc.lidMats) mm.opacity = lf;
    soc.lid.visible = lf > 0.01;
    soc.dieMat.emissiveIntensity = 0.3 + 0.5 * U.sstep(0.2, 1, s.lid || 0);
    NX.phoneInt2.update(ctx, s);
  }

  return { build, update, BOARD, SOC };
});
