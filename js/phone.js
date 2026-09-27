/* ==========================================================================
   KYVEN K1 — the phone: exterior parts, part registry, exploded-view logic
   Phone local frame: x right, y up, z out of the screen. 1 unit = 20 mm.
   ========================================================================== */
NX.def('phone', function (THREE, A, NX) {
  'use strict';
  const U = NX.U, pp = NX.pp, M = pp.M;
  const W = 3.6, H = 7.6, R = 0.56, GAP = 1.2;
  const VISOR = { w: 3.12, h: 1.24, r: 0.44, y: 2.78 };

  const INFO = {
    glass: ['GLASS', 'CERAMIC NANO-GLASS', ['Nano-crystal ceramic layer', 'Self-healing oleophobic coating', '2.5D sculpted edges']],
    touch: ['TOUCH LAYER', 'HAPTIC TOUCH MATRIX', ['1,920-channel capacitive grid', 'Pressure + hover sensing', '1 kHz touch sampling']],
    display: ['DISPLAY', 'EDGELESS OLED', ['6.9" LTPO micro-lens OLED', '1–240 Hz adaptive refresh', '4,000 nits peak brightness', 'Invisible under-display camera']],
    sensors: ['SENSORS', 'SENSOR ARRAY', ['Ultrasonic 3D fingerprint', 'Structured-light face mapping', 'Spectral ambient light sensor', 'Barometer · 9-axis IMU']],
    frame: ['FRAME', 'TITANIUM UNIBODY', ['Grade 5 titanium alloy', '6.4 mm profile · 168 g', 'Aerospace aluminum midplate']],
    antennas: ['ANTENNAS', '6G ANTENNA SYSTEM', ['Sub-THz 6G phased arrays', 'mmWave beam steering', 'Direct-to-satellite link', 'UWB 2.0 precision finding']],
    cooling: ['COOLING SYSTEM', 'LIQUID MICRO-COOLING', ['1,200 etched micro-channels', 'Two-phase dielectric coolant', 'Piezoelectric micro-pump', '18 W sustained dissipation']],
    board: ['LOGIC BOARD', 'NEURAL COMPUTING PLATFORM', ['14-layer stacked HDI substrate', 'Photonic interconnect bus', '3D-stacked unified memory', 'Neural power management']],
    soc: ['SOC', 'KV1 NEURAL SoC', ['1.4 nm gate-all-around process', '42 billion transistors', '12-core CPU · 40-core GPU', '120 TOPS neural engine']],
    memory: ['MEMORY', 'UNIFIED MEMORY', ['32 GB LPDDR7X', '2 TB UFS 5.0 storage', '256 GB/s bandwidth']],
    battery: ['BATTERY', 'SOLID STATE ENERGY CELL', ['6,200 mAh solid-state cell', '1,050 Wh/L energy density', '0–80% in 9 minutes', 'Non-flammable ceramic electrolyte']],
    camera: ['CAMERA SYSTEM', 'KYVEN VISION SYSTEM', ['200 MP computational camera', 'Periscope optical system', 'LiDAR sensor', 'AI image processor']],
    other: ['SUPPORT SYSTEMS', 'POWER · SOUND · HAPTICS', ['50 W magnetic wireless charging', 'Spatial stereo speakers', 'Linear haptic engine']],
    back: ['BACK GLASS', 'FROSTED CERAMIC BACK', ['Satin-etched ceramic glass', 'Wireless-transparent', 'Glossy inlaid wordmark']],
  };
  /* exploded z (in GAP units), stagger rank, preferred local view direction */
  const LAYOUT = {
    glass: [5.0, 0, [0.25, 0.1, 1]], back: [-4.1, 1, [0.25, 0.1, -1]], touch: [4.2, 2, [0.25, 0.15, 1]],
    other: [-3.2, 3, [0.3, 0.2, -1]], display: [3.4, 4, [0.2, 0.1, 1]], camera: [-2.3, 5, [0.35, 0.2, -1]],
    sensors: [2.5, 6, [0.25, 0.1, 1]], battery: [-1.3, 7, [0.25, -0.1, 1]], frame: [1.5, 8, [0.6, 0.2, 1]],
    antennas: [1.5, 9, [0.6, 0.2, 1]], cooling: [0.55, 10, [0.25, 0.15, 1]], board: [-0.35, 11, [0.2, 0.1, 1]],
    soc: [-0.35, 12, [0.1, 0.05, 1]], memory: [-0.35, 12, [0.2, 0.1, 1]],
  };
  const CENTER = (5.0 - 4.1) / 2;
  const CLUSTER = { board: 1, soc: 1, memory: 1 };

  function screenMaterial(ui) {
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: NX.sh.G.uTime, uUI: { value: ui }, uFade: { value: 1 }, uBright: { value: 1 } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        ${NX.sh.NOISE}
        uniform float uTime, uFade, uBright; uniform sampler2D uUI; varying vec2 vUv;
        void main(){
          vec2 p = vec2(vUv.x, vUv.y * 2.17);
          float t = uTime * 0.045;
          float n1 = snoise(vec3(p * 0.85, t));
          float n2 = snoise(vec3(p * 1.6 + n1 * 0.7, t * 1.4 + 3.0));
          float band = sin((p.y * 1.9 + p.x * 1.4 + n2 * 1.5 + t * 2.5) * 2.4);
          float silk = smoothstep(-0.2, 1.0, band);
          vec3 col = vec3(0.004, 0.006, 0.014);
          col += mix(vec3(0.05, 0.10, 0.30), vec3(0.28, 0.13, 0.46), smoothstep(-0.6, 0.8, n1)) * silk * 0.55 * (0.35 + 0.65 * smoothstep(0.0, 0.9, vUv.y));
          col += vec3(0.62, 0.72, 0.95) * pow(max(band, 0.0), 14.0) * 0.45 * smoothstep(0.1, 0.7, vUv.y + n1 * 0.2);
          col *= 0.35 + 0.65 * smoothstep(0.0, 0.35, vUv.y);
          vec4 ui = texture2D(uUI, vUv);
          col = mix(col, ui.rgb * 0.92, ui.a);
          gl_FragColor = vec4(col * uBright * uFade, uFade);
        }`,
      transparent: true,
    });
    m.userData.setFade = (f) => (m.uniforms.uFade.value = f);
    return m;
  }

  function create(tex) {
    const root = new THREE.Group();
    const parts = {}, list = [];
    const part = (id) => {
      const group = new THREE.Group();
      root.add(group);
      const [z, rank, view] = LAYOUT[id];
      const [name, title, specs] = INFO[id];
      const p = { id, group, mats: [], name, title, specs, rank, cluster: !!CLUSTER[id],
        ex: new THREE.Vector3(0, 0, (z - CENTER) * GAP), view: new THREE.Vector3(...view).normalize(),
        center: new THREE.Vector3(), radius: 1, fade: 1, prog: 0, hover: 0, fx: {} };
      parts[id] = p;
      list.push(p);
      return p;
    };
    const ctx = { THREE, root, parts, part, tex, W, H, R, VISOR };

    /* ------------------------------------------------------------ FRAME */
    {
      const p = part('frame');
      const ft = 0.085;
      pp.mesh(p, pp.slab(W, H, R, 0.3, { bevel: 0.036, bevelSeg: 5, curveSeg: 28, holes: [pp.hole(W - 2 * ft, H - 2 * ft, R - ft)] }), M.titanium());
      const mid = pp.slab(W - 2 * ft + 0.01, H - 2 * ft + 0.01, R - ft, 0.014, {
        bevel: 0.004, holes: [pp.hole(2.72, 3.5, 0.14, 0, -1.42), pp.hole(0.98, 0.98, 0.2, -0.98, VISOR.y), pp.hole(0.62, 1.2, 0.12, 0.02, 2.4)],
      });
      pp.mesh(p, mid, pp.std({ color: 0x4d5259, metalness: 0.55, roughness: 0.78 }), null, { pos: [0, 0, 0.1] });
      const btn = (w, h, d, x, y, mat) => pp.mesh(p, new A.RoundedBoxGeometry(w, h, d, 3, 0.024), mat, null, { pos: [x, y, 0] });
      const ti = M.titaniumPolish();
      btn(0.07, 0.95, 0.13, W / 2 + 0.006, 1.25, ti);
      btn(0.03, 0.72, 0.1, W / 2 + 0.004, -0.55, M.visor());
      btn(0.07, 0.5, 0.13, -W / 2 - 0.006, 1.95, ti);
      btn(0.07, 0.5, 0.13, -W / 2 - 0.006, 1.3, ti);
      btn(0.07, 0.26, 0.13, -W / 2 - 0.006, 2.62, ti);
      const plast = M.plastic();
      for (const [x, y, sx, sy] of [[W / 2, 3.05, 0.014, 0.03], [W / 2, -3.05, 0.014, 0.03], [-W / 2, 3.05, 0.014, 0.03], [-W / 2, -3.05, 0.014, 0.03], [0.95, H / 2, 0.03, 0.014], [-0.95, -H / 2, 0.03, 0.014]])
        pp.mesh(p, new THREE.BoxGeometry(sx, sy, 0.235), plast, null, { pos: [x, y, 0] });
      const blk = M.black();
      const port = pp.face(0.36, 0.11, 0.052);
      pp.mesh(p, port, blk, null, { pos: [0, -H / 2 - 0.002, 0], rot: [Math.PI / 2, 0, 0] });
      const hole = new THREE.CircleGeometry(0.02, 16);
      for (let i = 0; i < 6; i++) for (const s of [-1, 1]) pp.mesh(p, hole, blk, null, { pos: [s * (0.42 + i * 0.085), -H / 2 - 0.002, 0], rot: [Math.PI / 2, 0, 0], cast: false });
      pp.mesh(p, hole, blk, null, { pos: [0.55, H / 2 + 0.002, 0], rot: [-Math.PI / 2, 0, 0], cast: false });
    }

    /* ------------------------------------------------------------ GLASS */
    {
      const p = part('glass');
      const m = pp.mesh(p, pp.slab(W - 0.075, H - 0.075, R - 0.04, 0.03, { bevel: 0.014, bevelSeg: 4, curveSeg: 28 }), M.glass(), null, { pos: [0, 0, 0.147], cast: false });
      m.renderOrder = 5;
    }

    /* ------------------------------------------------------------ TOUCH */
    {
      const p = part('touch');
      const grid = new THREE.MeshBasicMaterial({ map: tex.touch, color: 0x5aa8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      grid.userData.baseOpacity = 0.55;
      p.gridMat = grid;
      pp.mesh(p, pp.face(W - 0.14, H - 0.14, R - 0.07), grid, null, { pos: [0, 0, 0.1318], cast: false });
      const sheet = M.glass();
      sheet.envMapIntensity = 1.2;
      pp.mesh(p, pp.slab(W - 0.14, H - 0.14, R - 0.07, 0.006, { bevel: 0.002 }), sheet, null, { pos: [0, 0, 0.1318], cast: false });
    }

    /* ---------------------------------------------------------- DISPLAY */
    {
      const p = part('display');
      pp.mesh(p, pp.slab(W - 0.14, H - 0.14, R - 0.07, 0.022, { bevel: 0.005 }), M.black(), null, { pos: [0, 0, 0.119] });
      p.screen = screenMaterial(tex.screen);
      const s = pp.mesh(p, pp.face(W - 0.165, H - 0.165, R - 0.085, 40), p.screen, null, { pos: [0, 0, 0.1305], cast: false });
      s.renderOrder = 2;
      pp.mesh(p, new THREE.BoxGeometry(0.9, 0.55, 0.006), M.copper(), null, { pos: [0, -3.1, 0.105] });
      pp.mesh(p, new THREE.BoxGeometry(0.5, 0.2, 0.012), M.gold(), null, { pos: [0, -2.75, 0.103] });
    }

    /* ------------------------------------------------------- BACK GLASS */
    {
      const p = part('back');
      const g = pp.slab(W - 0.075, H - 0.075, R - 0.04, 0.028, { bevel: 0.012, curveSeg: 28, holes: [pp.hole(VISOR.w, VISOR.h, VISOR.r, 0, VISOR.y)] });
      pp.mesh(p, g, M.backGlass(tex.backRough), null, { pos: [0, 0, -0.146] });
    }

    /* --------------------------------------------------- CAMERA SYSTEM */
    {
      const p = part('camera');
      const z0 = -0.2;
      pp.mesh(p, pp.slab(VISOR.w, VISOR.h, VISOR.r, 0.075, { bevel: 0.02, curveSeg: 28, holes: [pp.hole(VISOR.w - 0.12, VISOR.h - 0.12, VISOR.r - 0.06)] }), M.titaniumPolish(), null, { pos: [0, VISOR.y, -0.19] });
      pp.mesh(p, pp.slab(VISOR.w - 0.12, VISOR.h - 0.12, VISOR.r - 0.06, 0.05, { bevel: 0.006 }), M.visor(), null, { pos: [0, VISOR.y, z0] });
      const mount = (g, x, y) => { g.position.set(x, y, -0.2255); g.rotation.y = Math.PI; return g; };
      const lensTex = { rings: tex.rings };
      p.lenses = [];
      p.lenses.push(mount(pp.lens(p, p.group, 0.4, lensTex), -0.98, VISOR.y));
      p.lenses.push(mount(pp.lens(p, p.group, 0.27, lensTex), 0.86, VISOR.y));
      // periscope window
      const peri = new THREE.Group();
      p.group.add(peri);
      pp.mesh(p, pp.slab(0.52, 0.52, 0.12, 0.05, { bevel: 0.012, holes: [pp.hole(0.42, 0.42, 0.08)] }), M.titaniumPolish(), peri, { pos: [0, 0, 0.02] });
      pp.mesh(p, pp.face(0.42, 0.42, 0.08), M.lensElement(), peri, { pos: [0, 0, 0.008] });
      const prism = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.3, 3), M.lensElement());
      prism.rotation.set(0, 0, Math.PI / 2);
      prism.userData.part = 'camera';
      peri.add(prism);
      prism.position.z = -0.05;
      const pg = pp.mesh(p, pp.face(0.44, 0.44, 0.09), M.lensGlass(), peri, { pos: [0, 0, 0.045], cast: false });
      pg.renderOrder = 4;
      p.lenses.push(mount(peri, 0.02, VISOR.y));
      // flash + lidar + mic
      const flashMat = pp.std({ color: 0xe6dcc6, map: tex.rings, roughness: 0.3, metalness: 0, emissive: 0x0d0b07 });
      pp.mesh(p, pp.face(0.17, 0.17, 0.06), flashMat, null, { pos: [1.36, VISOR.y + 0.24, -0.2262], rot: [0, Math.PI, 0] });
      pp.mesh(p, new THREE.CircleGeometry(0.075, 40), M.lensElement(), null, { pos: [1.36, VISOR.y - 0.22, -0.2262], rot: [0, Math.PI, 0] });
      pp.mesh(p, new THREE.CircleGeometry(0.02, 16), M.black(), null, { pos: [1.36, VISOR.y, -0.2262], rot: [0, Math.PI, 0] });
      // internal modules behind the visor
      const dark = M.darkAlu();
      pp.mesh(p, new A.RoundedBoxGeometry(0.96, 0.96, 0.17, 3, 0.05), dark, null, { pos: [-0.98, VISOR.y, -0.07] });
      pp.mesh(p, new A.RoundedBoxGeometry(0.56, 1.45, 0.14, 3, 0.04), dark, null, { pos: [0.02, 2.33, -0.065] });
      pp.mesh(p, new A.RoundedBoxGeometry(0.62, 0.62, 0.12, 3, 0.04), dark, null, { pos: [0.86, VISOR.y, -0.07] });
      pp.mesh(p, new THREE.BoxGeometry(0.34, 0.9, 0.006), M.copper(), null, { pos: [-0.3, 2.0, -0.02] });
    }

    NX.phoneInt.build(ctx);
    NX.phoneFx.build(ctx);

    /* measure each part in phone space (assembled) for focus framing */
    const box = new THREE.Box3(), sph = new THREE.Sphere();
    root.updateMatrixWorld(true);
    for (const p of list) {
      box.makeEmpty();
      p.group.traverse((o) => { if (o.isMesh && !o.userData.fx) box.expandByObject(o, false); });
      box.getBoundingSphere(sph);
      p.center.copy(sph.center);
      p.radius = sph.radius;
      for (const m of p.mats) {
        m.userData.baseOpacity = m.userData.baseOpacity ?? m.opacity;
        if (m.emissive) m.userData.baseEmissive = m.emissive.clone();
      }
      p.group.traverse((o) => { if (o.isMesh || o.isPoints) { o.userData.part = o.userData.part || p.id; o.userData.cast = o.castShadow; } });
    }
    const pickables = [];
    root.traverse((o) => { if (o.isMesh && o.userData.part) pickables.push(o); });

    /* ------------------------------------------------------------ update */
    const v = new THREE.Vector3();
    const HL = new THREE.Color(0x0b1622);
    function setFade(p, f) {
      if (Math.abs(p.fade - f) < 1e-4 && p._fadeInit) return;
      p._fadeInit = true;
      p.fade = f;
      p.group.visible = f > 0.004;
      for (const m of p.mats) {
        if (m.userData.setFade) m.userData.setFade(f);
        else {
          m.opacity = (m.userData.baseOpacity ?? 1) * f;
          if (m.blending !== THREE.AdditiveBlending) m.depthWrite = f > 0.55;
        }
      }
      p.group.traverse((o) => { if (o.isMesh) o.castShadow = o.userData.cast && f > 0.5; });
    }
    function setHover(p, h) {
      if (Math.abs(p.hover - h) < 1e-3) return;
      p.hover = h;
      for (const m of p.mats) if (m.emissive && m.userData.baseEmissive) m.emissive.copy(m.userData.baseEmissive).lerp(HL, h);
    }

    /* s = { e, foci:[{id,w}], iso, fades:{}, hover, lid, fx:{}, time, dt } */
    function update(s) {
      const N = 13;
      const foci = (s.foci || []).filter((f) => f.w > 0.0005 && parts[f.id]);
      for (const p of list) {
        const t0 = (p.rank / N) * 0.54;
        const pr = U.ease.inOutCubic(U.range(s.e, t0, t0 + 0.46));
        p.prog = pr;
        v.copy(p.ex).multiplyScalar(pr);
        if (p.id === 'soc' || p.id === 'memory') v.z += GAP * (p.id === 'soc' ? 0.62 : 0.42) * U.ease.inOutCubic(U.range(s.e, 0.8, 1));
        let f = 1;
        const pz = p.cluster ? parts.board.ex.z : p.ex.z;
        for (const fc of foci) {
          const F = parts[fc.id];
          const same = p === F || (p.cluster && F.cluster);
          if (same) continue;
          const fz = F.cluster ? parts.board.ex.z : F.ex.z;
          v.z += (pz > fz ? 2.6 : -1.1) * fc.w * Math.max(s.e, 0.35);
          f *= U.lerp(1, pz > fz ? (s.dimFront ?? 0) : (s.dimBack ?? 0.2), fc.w);
        }
        p.group.position.copy(v);
        p.group.rotation.x = Math.sin(pr * Math.PI) * 0.05 * (p.rank % 2 ? 1 : -1);
        if (s.iso > 0 && !CLUSTER[p.id]) f *= 1 - s.iso;
        if (s.fades && s.fades[p.id] !== undefined) f *= s.fades[p.id];
        if (p.id === 'touch') f *= U.sstep(0.05, 0.6, pr);
        setFade(p, f);
        setHover(p, s.hover === p.id ? 1 : 0);
      }
      NX.phoneInt.update(ctx, s);
      NX.phoneFx.update(ctx, s);
    }

    /* world-space focus framing for a part (current exploded state) */
    const tmpC = new THREE.Vector3(), tmpD = new THREE.Vector3(), q = new THREE.Quaternion();
    function focusPose(id, camera, o = {}) {
      const p = parts[id];
      root.updateMatrixWorld(true);
      tmpC.copy(p.center).add(p.group.position).applyMatrix4(root.matrixWorld);
      root.getWorldQuaternion(q);
      tmpD.copy(o.view || p.view).applyQuaternion(q).normalize();
      const fov = (camera.fov * Math.PI) / 180;
      const fit = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * camera.aspect));
      const dist = ((o.radius ?? p.radius) * (o.margin ?? 1.25)) / Math.sin(fit / 2);
      return { target: tmpC.clone(), pos: tmpC.clone().addScaledVector(tmpD, dist), dir: tmpD.clone(), dist };
    }
    function worldPoint(id, local, out) {
      const p = parts[id];
      return out.copy(local).add(p.group.position).applyMatrix4(root.matrixWorld);
    }

    return { root, parts, list, pickables, update, focusPose, worldPoint, W, H, GAP, INFO, ctx };
  }

  return { create, W, H, GAP };
});
