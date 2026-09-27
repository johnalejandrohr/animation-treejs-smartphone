/* ==========================================================================
   KYVEN K1 — WORLD 2: a single gate-all-around nanosheet transistor.
   Channel runs along x (source −x → drain +x), gate crosses along z.
   The gate is cut away at z = 0 to reveal the three silicon nanosheets.
   ========================================================================== */
NX.def('worldTransistor', function (THREE, A, NX) {
  'use strict';
  const U = NX.U;
  const SHEETS = [0.55, 0.95, 1.35];
  const SHEET_T = 0.18, SHEET_W = 1.6;
  const DIVE = { target: new THREE.Vector3(0, 0.95, 0.8), dir: new THREE.Vector3(0.12, 0.3, 1).normalize() };

  function epiGeometry(len) {
    const s = new THREE.Shape();
    const w = 0.95, y0 = 0.22, y1 = 1.78;
    s.moveTo(-w * 0.62, y0);
    s.lineTo(w * 0.62, y0);
    s.lineTo(w, 0.75);
    s.lineTo(w, 1.25);
    s.lineTo(w * 0.62, y1);
    s.lineTo(-w * 0.62, y1);
    s.lineTo(-w, 1.25);
    s.lineTo(-w, 0.75);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
    g.rotateY(-Math.PI / 2);
    g.computeVertexNormals();
    return g;
  }

  function create(renderer, assets, tier) {
    const scene = new THREE.Scene();
    scene.environment = assets.labEnv;
    scene.fog = new THREE.FogExp2(0x03050a, 0.02);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.005, 400);
    const backdrop = NX.sh.backdrop({ top: 0x05080d, mid: 0x08101a, bot: 0x020306, glow: 0x14223a });
    scene.add(backdrop);
    const dev = new THREE.Group();
    scene.add(dev);
    const std = (o) => new THREE.MeshStandardMaterial(o);
    const phys = (o) => new THREE.MeshPhysicalMaterial(o);

    /* substrate + isolation */
    const siMat = phys({ color: 0x28313f, metalness: 0.45, roughness: 0.46 });
    const sub = new THREE.Mesh(new THREE.BoxGeometry(16, 2.4, 11), siMat);
    sub.position.set(0, -1.2, 0);
    dev.add(sub);
    const lat = assets.tex.lattice.clone();
    lat.needsUpdate = true;
    lat.repeat.set(16 / 0.5, 11 / 0.5);
    const siTop = new THREE.Mesh(new THREE.PlaneGeometry(16, 11), std({ color: 0xffffff, map: lat, metalness: 0.3, roughness: 0.5, transparent: true, opacity: 0.32, depthWrite: false }));
    siTop.rotation.x = -Math.PI / 2;
    siTop.position.y = 0.002;
    dev.add(siTop);
    const sti = new THREE.Mesh(new THREE.BoxGeometry(16, 0.26, 11), phys({ color: 0x9fb8d6, metalness: 0, roughness: 0.15, transparent: true, opacity: 0.16, depthWrite: false }));
    sti.position.y = 0.13;
    dev.add(sti);
    const ped = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.26, SHEET_W), siMat);
    ped.position.y = 0.13;
    dev.add(ped);

    /* nanosheets */
    const sheetMat = phys({ color: 0x6c8fc4, metalness: 0.35, roughness: 0.34, emissive: 0x1d4f9a, emissiveIntensity: 0.2 });
    const sheets = SHEETS.map((y) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(5.8, SHEET_T, SHEET_W), sheetMat);
      m.position.set(0, y, 0);
      dev.add(m);
      return m;
    });
    const faceTex = assets.tex.lattice.clone();
    faceTex.needsUpdate = true;
    faceTex.repeat.set(1.2 / 0.05, SHEET_T / 0.05);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.2, SHEET_T), std({ color: 0xffffff, map: faceTex, emissive: 0x6fb6ff, emissiveMap: faceTex, emissiveIntensity: 0.5, metalness: 0.2, roughness: 0.4 }));
    face.position.set(0, SHEETS[1], SHEET_W / 2 + 0.002);
    dev.add(face);
    const hk = phys({ color: 0xffc98a, metalness: 0, roughness: 0.2, transparent: true, opacity: 0.28, depthWrite: false, emissive: 0x3a1e05 });
    for (const y of SHEETS) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, SHEET_T + 0.08, SHEET_W + 0.08), hk);
      m.position.set(0, y, 0);
      dev.add(m);
    }

    /* gate (back half — cutaway) + spacers */
    const gateMat = phys({ color: 0xd9b56a, metalness: 1, roughness: 0.48, emissive: 0xffc46b, emissiveIntensity: 0 });
    const gate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.66, 1.6), gateMat);
    gate.position.set(0, 1.1, -0.8);
    dev.add(gate);
    const secMat = std({ color: 0xe8cf98, metalness: 0.6, roughness: 0.58, emissive: 0xffc46b, emissiveIntensity: 0 });
    const section = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.36), secMat);
    section.position.set(0, 0.95, 0.001);
    dev.add(section);
    const spMat = phys({ color: 0xaebfd6, metalness: 0, roughness: 0.35, transparent: true, opacity: 0.32, depthWrite: false });
    for (const s of [-1, 1]) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.66, 3.2), spMat);
      sp.position.set(s * 0.7, 1.1, 0);
      dev.add(sp);
    }

    /* source / drain epitaxy (translucent so the carriers stay visible) */
    const epiMat = (c) => phys({ color: c, metalness: 0.1, roughness: 0.22, transparent: true, opacity: 0.5, depthWrite: false, emissive: c, emissiveIntensity: 0.04, envMapIntensity: 0.9 });
    const src = new THREE.Mesh(epiGeometry(2.1), epiMat(0x4d7fd0));
    src.position.set(-0.85, 0, 0);
    dev.add(src);
    const drn = new THREE.Mesh(epiGeometry(2.1), epiMat(0x7a6fd8));
    drn.position.set(2.95, 0, 0);
    dev.add(drn);

    /* contacts + first metal */
    const wMat = std({ color: 0xc4ccd6, metalness: 1, roughness: 0.48 });
    const cuMat = std({ color: 0xcd8a5c, metalness: 1, roughness: 0.25 });
    for (const x of [-1.9, 1.9]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 1.7, 32), wMat);
      c.position.set(x, 2.6, 0);
      dev.add(c);
      const m1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 6), cuMat);
      m1.position.set(x, 3.7, -1);
      dev.add(m1);
    }
    const gc = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 1.5, 32), wMat);
    gc.position.set(0, 2.65, -0.8);
    dev.add(gc);
    const m1g = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.45, 0.9), cuMat);
    m1g.position.set(0, 3.7, -2.4);
    dev.add(m1g);

    /* neighbouring devices fading into the fog for scale */
    const ghost = std({ color: 0x3a4658, metalness: 0.6, roughness: 0.4 });
    for (const [x, z] of [[0, -4.6], [-7, -4.6], [7, -4.6], [8.5, 0.4]]) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.66, 3.2), ghost);
      g.position.set(x, 1.1, z);
      dev.add(g);
      for (const s of [-1, 1]) {
        const e = new THREE.Mesh(epiGeometry(2.1), epiMat(0x324a70));
        e.position.set(x + (s < 0 ? -0.85 : 2.95), 0, z);
        dev.add(e);
      }
    }

    /* electrons */
    const N = tier.low ? 500 : 900;
    const pos = new Float32Array(N * 3), alpha = new Float32Array(N);
    const r = U.rng(8);
    const el = Array.from({ length: N }, () => ({ u: r(), s: r(), sheet: r.int(0, 2), z: r.range(0.08, 0.76), side: r.sign(), y: r.range(0.35, 1.65), zz: r.range(-0.75, 0.75), sp: r.range(0.8, 1.25) }));
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    eg.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const eMat = new THREE.ShaderMaterial({
      uniforms: { uViewportH: NX.sh.G.uViewportH, uColor: { value: new THREE.Color(0xa6dcff).multiplyScalar(0.55) }, uSize: { value: 0.048 }, uA: { value: 1 } },
      vertexShader: `${NX.sh.POINT_SIZE} uniform float uSize; attribute float aAlpha; varying float vA;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = worldPointSize(uSize, mv); vA = aAlpha; }`,
      fragmentShader: `${NX.sh.GLOW_FRAG} uniform vec3 uColor; uniform float uA; varying float vA;
        void main(){ gl_FragColor = vec4(uColor * glowDisc(gl_PointCoord) * vA * uA, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const electrons = new THREE.Points(eg, eMat);
    electrons.frustumCulled = false;
    dev.add(electrons);

    const key = new THREE.DirectionalLight(0xe4eeff, 0.35);
    key.position.set(-6, 10, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fc2ff, 0.25);
    rim.position.set(8, 3, -7);
    scene.add(rim);
    const warm = new THREE.PointLight(0xffb070, 2.2, 12, 2);
    warm.position.set(3, 3, 3);
    scene.add(warm);

    const fwd = new THREE.Vector3();
    let gateOn = 1;
    function update(s) {
      const t = s.time, dt = Math.min(s.dt, 0.05);
      /* gate toggles: ~3s on, ~1.6s off */
      const cyc = (t % 4.6) / 4.6;
      const target = s.gateForce ?? (cyc < 0.66 ? 1 : 0);
      gateOn = U.damp(gateOn, target, 6, dt);
      gateMat.emissiveIntensity = 0.12 + 0.35 * gateOn;
      secMat.emissiveIntensity = 0.1 + 0.5 * gateOn;
      sheetMat.emissiveIntensity = 0.08 + 0.32 * gateOn;
      const sp = 0.16;
      for (let i = 0; i < N; i++) {
        const e = el[i];
        const blocked = gateOn < 0.5 && e.u < 0.36;
        e.u += dt * sp * e.sp * (blocked ? 0.08 : 1);
        if (blocked && e.u > 0.345 - e.s * 0.22) e.u = 0.345 - e.s * 0.22;
        if (e.u >= 1) { e.u -= 1; e.y = r.range(0.35, 1.65); e.zz = r.range(-0.75, 0.75); }
        const u = e.u;
        let x, y, z;
        const sy = SHEETS[e.sheet] + e.side * (SHEET_T / 2 + 0.035);
        if (u < 0.36) {
          const k = u / 0.36;
          x = U.lerp(-2.85, -0.62, k);
          y = U.lerp(e.y, sy, U.ease.inQuad(k));
          z = U.lerp(e.zz, e.z, U.ease.inQuad(k));
        } else if (u < 0.64) {
          const k = (u - 0.36) / 0.28;
          x = U.lerp(-0.62, 0.62, k);
          y = sy;
          z = e.z;
        } else {
          const k = (u - 0.64) / 0.36;
          x = U.lerp(0.62, 2.85, k);
          y = U.lerp(sy, e.y, U.ease.outQuad(k));
          z = U.lerp(e.z, e.zz, U.ease.outQuad(k));
        }
        const jit = 0.012;
        pos[i * 3] = x + Math.sin(t * 13 + e.s * 50) * jit;
        pos[i * 3 + 1] = y + Math.cos(t * 11 + e.s * 70) * jit;
        pos[i * 3 + 2] = z;
        alpha[i] = U.sstep(0, 0.05, u) * (1 - U.sstep(0.95, 1, u)) * (u > 0.36 && u < 0.64 ? 1.25 : 0.8);
      }
      eg.attributes.position.needsUpdate = true;
      eg.attributes.aAlpha.needsUpdate = true;
      eMat.uniforms.uA.value = s.flow ?? 1;
      face.material.emissiveIntensity = 0.4 + 1.6 * (s.faceGlow ?? 0);
      scene.fog.density = (s.fog ?? 0.02);
      camera.getWorldDirection(fwd);
      backdrop.material.uniforms.uGlowDir.value.copy(fwd);
      backdrop.position.copy(camera.position);
    }

    return { scene, camera, update, DIVE, gateState: () => gateOn, SHEETS };
  }

  return { create, DIVE };
});
