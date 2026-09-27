/* ==========================================================================
   KYVEN K1 — battery, liquid micro-cooling, sensors, antennas, support
   ========================================================================== */
NX.def('phoneInt2', function (THREE, A, NX) {
  'use strict';
  const U = NX.U, pp = NX.pp, M = pp.M;
  const BAT = { x: 0, y: -1.42, z: -0.035, w: 3.0, h: 3.95 };
  const COOL = { x: 0, y: 1.95, z: 0.084, w: 2.9, h: 3.1 };

  /* straight segments with softly rounded corners, returned as a smooth curve */
  function roundedCurve(pts, rad, z = 0) {
    const out = [new THREE.Vector3(pts[0][0], pts[0][1], z)];
    for (let i = 1; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], [cx, cy] = pts[i + 1];
      const l0 = Math.hypot(bx - ax, by - ay), l1 = Math.hypot(cx - bx, cy - by);
      const r0 = Math.min(rad, l0 / 2), r1 = Math.min(rad, l1 / 2);
      out.push(new THREE.Vector3(bx - ((bx - ax) / l0) * r0, by - ((by - ay) / l0) * r0, z));
      out.push(new THREE.Vector3(bx + ((cx - bx) / l1) * r1, by + ((cy - by) / l1) * r1, z));
    }
    const l = pts[pts.length - 1];
    out.push(new THREE.Vector3(l[0], l[1], z));
    return new THREE.CatmullRomCurve3(out, false, 'centripetal');
  }

  function build(ctx) {
    const { part, tex, W, H } = ctx;

    /* -------------------------------------------------------- BATTERY */
    {
      const p = part('battery');
      const g = new THREE.Group();
      g.position.set(BAT.x, BAT.y, BAT.z);
      p.group.add(g);
      p.sub = g;
      const graphite = pp.std({ color: 0x2a2d32, metalness: 0.4, roughness: 0.48 });
      pp.mesh(p, pp.slab(BAT.w, BAT.h, 0.16, 0.1, { bevel: 0.014 }), graphite, g, { pos: [0, 0, -0.035] });
      const label = tex.lib.batteryLabel(BAT.w, BAT.h);
      label.repeat.set(1 / BAT.w, 1 / BAT.h);
      label.offset.set(0.5, 0.5);
      const lid = pp.mesh(p, pp.slab(BAT.w, BAT.h, 0.16, 0.036, { bevel: 0.01 }), [M.battery(label), graphite], g, { pos: [0, 0, 0.067] });
      p.lid = lid;
      const defs = [
        ['Cu', pp.std({ color: 0xcf8a5e, metalness: 1, roughness: 0.25 })],
        ['Li', pp.std({ color: 0xb9bec6, metalness: 1, roughness: 0.34, envMapIntensity: 0.7 })],
        ['SE', pp.phys({ color: 0xc9d2da, metalness: 0, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3, emissive: 0x0b1522, envMapIntensity: 0.7 })],
        ['CA', pp.std({ color: 0x252c37, metalness: 0.5, roughness: 0.5, emissive: 0x05070a })],
        ['Al', pp.std({ color: 0xa4a9b0, metalness: 1, roughness: 0.4, envMapIntensity: 0.7 })],
      ];
      p.layers = defs.map(([id, mat], i) => {
        const m = pp.mesh(p, pp.slab(2.84, 3.78, 0.12, i === 2 ? 0.03 : 0.016, { bevel: 0.004 }), mat, g, { pos: [0, 0, 0.02] });
        m.userData.layer = id;
        m.visible = false;
        return m;
      });
      pp.mesh(p, new THREE.BoxGeometry(0.55, 0.3, 0.008), M.copper(), g, { pos: [-0.6, BAT.h / 2 + 0.13, 0.03] });
      pp.mesh(p, new THREE.BoxGeometry(0.42, 0.26, 0.012), M.gold(), g, { pos: [-0.6, BAT.h / 2 + 0.38, 0.05] });
    }

    /* -------------------------------------------------------- COOLING */
    {
      const p = part('cooling');
      const g = new THREE.Group();
      g.position.set(COOL.x, COOL.y, COOL.z);
      p.group.add(g);
      p.sub = g;
      pp.mesh(p, pp.slab(COOL.w, COOL.h, 0.18, 0.012, { bevel: 0.003 }), pp.std({ color: 0xc07a52, metalness: 1, roughness: 0.34 }), g);
      const soc = [0.32, 0.17];
      const P = [[-1.25, -1.42]];
      const lanes = [-1.25, -0.95, -0.65, -0.35];
      lanes.forEach((x, i) => { const up = i % 2 === 0; P.push([x, up ? -1.3 : 1.3], [x, up ? 1.3 : -1.3]); });
      P.push([soc[0], -1.3]);
      let r0 = 0.52;
      P.push([soc[0], soc[1] - r0]);
      for (let k = 0; k < 9; k++) {
        const r = r0 - k * 0.05;
        const c = [[soc[0] + r, soc[1] - r], [soc[0] + r, soc[1] + r], [soc[0] - r, soc[1] + r], [soc[0] - r, soc[1] - r + 0.05]];
        P.push(c[k % 4]);
      }
      P.push([soc[0], soc[1] - 0.02], [0.95, soc[1] - 0.02], [0.95, 1.3], [1.25, 1.3], [1.25, -1.3], [0.6, -1.3], [0.6, -1.42]);
      const curve = roundedCurve(P, 0.07, 0.022);
      const segs = 1400;
      const tube = pp.phys({ color: 0x9fd4ff, metalness: 0, roughness: 0.12, opacity: 0.4, envMapIntensity: 1.6, depthWrite: false });
      tube.userData.baseOpacity = 0.4;
      pp.mesh(p, new THREE.TubeGeometry(curve, segs, 0.019, 7, false), tube, g, { cast: false });
      p.coreMat = pp.std({ color: 0x0b2336, emissive: 0x2f8fff, emissiveIntensity: 0.15, metalness: 0, roughness: 0.4 });
      pp.mesh(p, new THREE.TubeGeometry(curve, segs, 0.008, 5, false), p.coreMat, g);
      pp.mesh(p, new THREE.CylinderGeometry(0.12, 0.12, 0.05, 36), M.steel(), g, { pos: [-1.25, -1.42, 0.01], rot: [Math.PI / 2, 0, 0] });
      pp.mesh(p, new THREE.CylinderGeometry(0.085, 0.085, 0.012, 36), M.gold(), g, { pos: [-1.25, -1.42, 0.034], rot: [Math.PI / 2, 0, 0] });
      p.curve = curve;
      p.soc = soc;
    }

    /* -------------------------------------------------------- SENSORS */
    {
      const p = part('sensors');
      const fp = pp.std({ color: 0x1b2633, map: tex.touch, metalness: 0.6, roughness: 0.35, emissive: 0x08131f });
      pp.mesh(p, pp.slab(0.95, 0.95, 0.12, 0.008, { bevel: 0.002 }), fp, null, { pos: [0, -2.55, 0.104] });
      pp.mesh(p, new A.RoundedBoxGeometry(1.1, 0.16, 0.06, 2, 0.02), M.darkAlu(), null, { pos: [0, 3.43, 0.08] });
      const le = M.lensElement();
      for (const x of [-0.34, 0, 0.34]) pp.mesh(p, new THREE.CircleGeometry(0.036, 32), le, null, { pos: [x, 3.43, 0.1105], cast: false });
      pp.mesh(p, new THREE.CircleGeometry(0.02, 20), pp.std({ color: 0x1a0507, emissive: 0x6a0a14, emissiveIntensity: 0.8 }), null, { pos: [0.17, 3.43, 0.1105], cast: false });
      pp.mesh(p, new THREE.BoxGeometry(0.08, 0.08, 0.02), M.black(), null, { pos: [0.55, 3.43, 0.1] });
      pp.mesh(p, new THREE.BoxGeometry(0.14, 0.7, 0.004), M.copper(), null, { pos: [0.62, 3.03, 0.09] });
      pp.mesh(p, new THREE.BoxGeometry(0.14, 0.7, 0.004), M.copper(), null, { pos: [0, -2.0, 0.1] });
    }

    /* ------------------------------------------------------- ANTENNAS */
    {
      const p = part('antennas');
      const gold = M.gold(), dark = M.darkAlu();
      const add = (geo, mat, pos, rot) => { const m = pp.mesh(p, geo, mat, null, { pos, rot }); m.userData.base = m.position.clone(); return m; };
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        add(new THREE.BoxGeometry(0.045, 0.85, 0.012), gold, [sx * (W / 2 - 0.14), sy * (H / 2 - 1.15), 0.02]);
        add(new THREE.BoxGeometry(0.85, 0.045, 0.012), gold, [sx * (W / 2 - 1.1), sy * (H / 2 - 0.14), 0.02]);
        add(new THREE.BoxGeometry(0.1, 0.1, 0.014), gold, [sx * (W / 2 - 0.42), sy * (H / 2 - 0.42), 0.02]);
      }
      const mm = (x, y, rot) => {
        add(new A.RoundedBoxGeometry(0.17, 0.64, 0.035, 2, 0.012), dark, [x, y, 0], [0, 0, rot]);
        for (let i = 0; i < 4; i++) {
          const o = (i - 1.5) * 0.14;
          add(new THREE.BoxGeometry(0.09, 0.09, 0.005), gold, [x + (rot ? o : 0), y + (rot ? 0 : o), 0.02]);
        }
      };
      mm(W / 2 - 0.22, 0.3, 0);
      mm(-W / 2 + 0.22, -0.4, 0);
      mm(-0.45, H / 2 - 0.24, Math.PI / 2);
      const sat = new THREE.TorusGeometry(0.62, 0.012, 6, 64, Math.PI);
      add(sat, M.copper(), [0, -H / 2 + 0.55, 0.02], [0, 0, Math.PI]);
    }

    /* ---------------------------------------------------------- OTHER */
    {
      const p = part('other');
      const pts = [];
      const turns = 11, N = 700;
      for (let i = 0; i <= N; i++) {
        const t = i / N, a = t * turns * U.TAU, r = 0.32 + 0.76 * t;
        pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
      }
      const coil = new THREE.CatmullRomCurve3(pts);
      const cg = new THREE.Group();
      cg.position.set(0, -1.3, -0.126);
      p.group.add(cg);
      pp.mesh(p, new THREE.TubeGeometry(coil, 1600, 0.0105, 5, false), M.copper(), cg);
      pp.mesh(p, new THREE.CylinderGeometry(1.14, 1.14, 0.006, 72), pp.std({ color: 0x131416, roughness: 0.85, metalness: 0.1 }), cg, { pos: [0, 0, -0.008], rot: [Math.PI / 2, 0, 0] });
      pp.mesh(p, new THREE.TorusGeometry(1.26, 0.022, 8, 96), M.steel(), cg);
      const dark = M.darkAlu();
      pp.mesh(p, new A.RoundedBoxGeometry(1.1, 0.42, 0.14, 3, 0.04), dark, null, { pos: [0.85, -3.3, -0.03] });
      pp.mesh(p, pp.face(0.92, 0.26, 0.05), pp.std({ color: 0xffffff, map: tex.touch, metalness: 0.7, roughness: 0.4 }), null, { pos: [0.85, -3.3, 0.041], cast: false });
      pp.mesh(p, new A.RoundedBoxGeometry(1.0, 0.38, 0.13, 3, 0.06), M.steel(), null, { pos: [-0.85, -3.3, -0.03] });
      pp.mesh(p, new THREE.TorusGeometry(0.1, 0.022, 8, 32), M.copper(), null, { pos: [-0.85, -3.3, 0.036] });
      pp.mesh(p, new A.RoundedBoxGeometry(0.7, 0.1, 0.06, 2, 0.02), dark, null, { pos: [0, 3.62, 0.05] });
    }
  }

  function update(ctx, s) {
    const P = ctx.parts;
    const b = U.ease.inOutCubic(U.clamp(s.fx?.battery || 0));
    const bat = P.battery;
    bat.lid.position.z = 0.067 + 1.55 * b;
    bat.lid.rotation.x = -0.1 * b;
    bat.layers.forEach((m, i) => {
      m.visible = b > 0.004 && bat.fade > 0.01;
      m.position.z = 0.02 + (0.22 + i * 0.25) * b;
      m.rotation.x = -0.02 * i * b;
    });
    bat.layerZ = bat.layers.map((m) => m.position.z);
    const a = P.antennas;
    const k = a.prog;
    for (const m of a.group.children) if (m.userData.base) {
      m.position.x = m.userData.base.x * (1 + 0.16 * k);
      m.position.y = m.userData.base.y * (1 + 0.07 * k);
    }
    P.cooling.coreMat.emissiveIntensity = 0.15 + 0.7 * (s.fx?.cooling || 0);
  }

  return { build, update, BAT, COOL };
});
