/* ==========================================================================
   KYVEN K1 — WORLD 3: silicon crystal (diamond cubic, a = 1 unit) and a
   stylised silicon atom: 14 protons, 14 neutrons, 2·8·4 electron shells.
   The hero atom sits at the origin; the camera enters through the +z face.
   ========================================================================== */
NX.def('worldAtom', function (THREE, A, NX) {
  'use strict';
  const U = NX.U;
  const ENTRY = new THREE.Vector3(0, 0, 3.0);
  const SHELLS = [
    { r: 0.105, rings: 1, e: 2, speed: 2.4 },
    { r: 0.2, rings: 4, e: 8, speed: 1.5 },
    { r: 0.3, rings: 2, e: 4, speed: 1.0 },
  ];

  function create(renderer, assets, tier) {
    const scene = new THREE.Scene();
    scene.environment = assets.labEnv;
    const camera = new THREE.PerspectiveCamera(35, 1, 0.002, 200);
    const backdrop = NX.sh.backdrop({ top: 0x03050a, mid: 0x050912, bot: 0x010204, glow: 0x0c1830 });
    scene.add(backdrop);
    const r = U.rng(14);

    /* ---------------- lattice */
    const basis = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
    const atoms = [], bonds = [];
    const lo = tier.low ? -2 : -3, hi = 2;
    const inside = (p) => p.every((v) => v >= lo - 0.01 && v <= hi + 0.76);
    for (let i = lo; i <= hi; i++) for (let j = lo; j <= hi; j++) for (let k = lo; k <= hi; k++)
      for (const b of basis) {
        const A0 = [i + b[0], j + b[1], k + b[2]];
        const B0 = [A0[0] + 0.25, A0[1] + 0.25, A0[2] + 0.25];
        atoms.push(A0);
        if (inside(B0)) {
          atoms.push(B0);
          for (const d of [[-1, -1, -1], [1, 1, -1], [1, -1, 1], [-1, 1, 1]]) {
            const N = [B0[0] + d[0] * 0.25, B0[1] + d[1] * 0.25, B0[2] + d[2] * 0.25];
            if (inside(N)) bonds.push([B0, N]);
          }
        }
      }
    const lattice = new THREE.Group();
    scene.add(lattice);
    const atomMat = NX.sh.rimMaterial({ color: 0x3f74c8, rim: 0xcfe6ff, power: 2.4, intensity: 0.8, fog: 0.3 });
    atomMat.uniforms.uFocusR.value = 0.2;
    const aMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.1, tier.low ? 1 : 2), atomMat, atoms.length);
    const m4 = new THREE.Matrix4();
    atoms.forEach((p, i) => aMesh.setMatrixAt(i, m4.makeTranslation(p[0], p[1], p[2])));
    aMesh.frustumCulled = false;
    lattice.add(aMesh);
    const bondMat = NX.sh.rimMaterial({ color: 0x2f5a9e, rim: 0x86b6f0, power: 1.4, intensity: 0.45, fog: 0.3 });
    bondMat.uniforms.uFocusR.value = 0.05;
    const bMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 8, 1, true), bondMat, bonds.length);
    const up = new THREE.Vector3(0, 1, 0), va = new THREE.Vector3(), vb = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    bonds.forEach(([a, b], i) => {
      va.set(...a); vb.set(...b);
      const len = va.distanceTo(vb);
      q.setFromUnitVectors(up, vb.clone().sub(va).normalize());
      sc.set(1, len, 1);
      m4.compose(va.clone().add(vb).multiplyScalar(0.5), q, sc);
      bMesh.setMatrixAt(i, m4);
    });
    bMesh.frustumCulled = false;
    lattice.add(bMesh);
    /* soft glow sprite on every atom (bloom food) */
    const gp = new THREE.BufferGeometry();
    gp.setAttribute('position', new THREE.Float32BufferAttribute(atoms.flat(), 3));
    gp.setAttribute('aSeed', new THREE.Float32BufferAttribute(atoms.map(() => r()), 1));
    const glowMat = NX.sh.glowPoints({ color: 0x6fa8ff, size: 0.2, opacity: 0.07 });
    const glows = new THREE.Points(gp, glowMat);
    glows.frustumCulled = false;
    lattice.add(glows);

    /* ---------------- hero atom */
    const atom = new THREE.Group();
    scene.add(atom);
    const nuc = new THREE.Group();
    atom.add(nuc);
    const pMat = new THREE.MeshStandardMaterial({ color: 0xffb385, emissive: 0xff7a3a, emissiveIntensity: 0.55, metalness: 0.1, roughness: 0.35, transparent: true });
    const nMat = new THREE.MeshStandardMaterial({ color: 0xa9bed6, emissive: 0x33506e, emissiveIntensity: 0.5, metalness: 0.3, roughness: 0.3, transparent: true });
    const sg = new THREE.SphereGeometry(0.0165, 18, 12);
    const pts = [[0, 0, 0]];
    const fib = (n, rad, off) => { for (let i = 0; i < n; i++) { const y = 1 - (2 * (i + 0.5)) / n, rr = Math.sqrt(1 - y * y), th = i * 2.39996 + off; pts.push([Math.cos(th) * rr * rad, y * rad, Math.sin(th) * rr * rad]); } };
    fib(8, 0.024, 0.3);
    fib(19, 0.043, 1.1);
    pts.forEach((p, i) => {
      const m = new THREE.Mesh(sg, i % 2 ? pMat : nMat);
      m.position.set(p[0] + r.range(-0.002, 0.002), p[1], p[2]);
      nuc.add(m);
    });
    const nglow = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3)).setAttribute('aSeed', new THREE.Float32BufferAttribute([0.5], 1)), NX.sh.glowPoints({ color: 0xffa36a, size: 0.26, opacity: 0.7 }));
    atom.add(nglow);

    /* orbits: thin tori whose shader draws comet trails behind each electron */
    const rings = [];
    const dirs = [[0, 1, 0], [1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1], [1, 0.2, 0], [0, 0.3, 1]];
    let di = 0;
    const eCount = [];
    SHELLS.forEach((sh, si) => {
      for (let k = 0; k < sh.rings; k++) {
        const n = new THREE.Vector3(...dirs[di++ % dirs.length]).normalize();
        const mat = new THREE.ShaderMaterial({
          uniforms: { uPh: { value: new THREE.Vector2() }, uColor: { value: new THREE.Color(si === 2 ? 0xbfe4ff : 0x8ec5ff) }, uA: { value: 1 } },
          vertexShader: `varying float vT; void main(){ vT = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: `uniform vec2 uPh; uniform vec3 uColor; uniform float uA; varying float vT;
            float trail(float ph){ float d = fract(ph - vT); return exp(-d * 18.0) + 0.0; }
            void main(){ float b = 0.1 + 1.6 * (trail(uPh.x) + trail(uPh.y)); gl_FragColor = vec4(uColor * b * uA, 1.0); }`,
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(sh.r, 0.0016, 6, 220), mat);
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
        atom.add(ring);
        rings.push({ ring, mat, sh, off: r(), dir: r() < 0.5 ? 1 : -1 });
        eCount.push(2);
      }
    });
    const eTotal = rings.length * 2;
    const ePos = new Float32Array(eTotal * 3);
    const eGeo = new THREE.BufferGeometry();
    eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3).setUsage(THREE.DynamicDrawUsage));
    eGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(new Array(eTotal).fill(0.6), 1));
    const eMat = NX.sh.glowPoints({ color: 0xcfe9ff, size: 0.05, opacity: 1.6 });
    const electrons = new THREE.Points(eGeo, eMat);
    electrons.frustumCulled = false;
    atom.add(electrons);
    /* probability cloud */
    const CN = tier.low ? 1400 : 3200;
    const cp = new Float32Array(CN * 3), cs = new Float32Array(CN);
    for (let i = 0; i < CN; i++) {
      const sh = SHELLS[i % 3];
      const d = new THREE.Vector3(r.gauss(), r.gauss(), r.gauss()).normalize();
      const rad = sh.r * (1 + r.gauss() * 0.16);
      cp.set([d.x * rad, d.y * rad, d.z * rad], i * 3);
      cs[i] = r();
    }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.BufferAttribute(cp, 3));
    cg.setAttribute('aSeed', new THREE.BufferAttribute(cs, 1));
    const cloudMat = NX.sh.glowPoints({ color: 0x5f9cff, size: 0.012, opacity: 0.55 });
    const cloud = new THREE.Points(cg, cloudMat);
    cloud.frustumCulled = false;
    atom.add(cloud);

    const key = new THREE.DirectionalLight(0xe8f0ff, 1.4);
    key.position.set(-3, 5, 4);
    scene.add(key);
    const rim = new THREE.PointLight(0x8fb8ff, 2, 4, 2);
    rim.position.set(0.6, 0.4, -0.8);
    scene.add(rim);

    /* anchors for labels (local) */
    const anchors = { nucleus: new THREE.Vector3(0, 0, 0), outer: new THREE.Vector3(), tile: new THREE.Vector3(0.36, 0.1, 0) };

    const fwd = new THREE.Vector3(), tmp = new THREE.Vector3();
    function update(s) {
      const t = s.time;
      const focus = U.clamp(s.focus ?? 0);
      const reveal = U.clamp(s.reveal ?? 0);
      atomMat.uniforms.uFocus.value = focus;
      atomMat.uniforms.uHero.value = 1 - U.sstep(0.05, 0.6, reveal);
      bondMat.uniforms.uFocus.value = focus;
      atomMat.uniforms.uNear0.value = 0.3 * (1 - reveal);
      atomMat.uniforms.uNear1.value = 0.75 * (1 - reveal);
      bondMat.uniforms.uNear0.value = 0.04;
      bondMat.uniforms.uNear1.value = 0.2 * (1 - reveal);
      glowMat.uniforms.uOpacity.value = 0.07 * (1 - focus);
      atomMat.uniforms.uFogDensity.value = bondMat.uniforms.uFogDensity.value = U.lerp(0.3, 0.6, focus);
      // hero lattice atom shrinks away as the detailed model appears
      aMesh.visible = bMesh.visible = focus < 0.995 || reveal < 0.2;
      atom.visible = reveal > 0.002;
      const a = reveal;
      atom.scale.setScalar(U.lerp(0.55, 1, U.ease.outCubic(a)));
      pMat.opacity = nMat.opacity = U.sstep(0.1, 0.6, a);
      nuc.visible = a > 0.05;
      nglow.material.uniforms.uOpacity.value = 0.7 * a;
      cloudMat.uniforms.uOpacity.value = 0.55 * a;
      eMat.uniforms.uOpacity.value = 1.6 * a;
      nuc.rotation.y = t * 0.3;
      nuc.rotation.x = t * 0.17;
      let k = 0;
      for (const R of rings) {
        const ph = U.fract(R.off + t * R.sh.speed * 0.16 * R.dir);
        R.mat.uniforms.uPh.value.set(ph, U.fract(ph + 0.5));
        R.mat.uniforms.uA.value = a;
        for (const p of [ph, U.fract(ph + 0.5)]) {
          const ang = p * U.TAU;
          tmp.set(Math.cos(ang) * R.sh.r, Math.sin(ang) * R.sh.r, 0).applyQuaternion(R.ring.quaternion);
          ePos.set([tmp.x, tmp.y, tmp.z], k * 3);
          if (k === eTotal - 1) anchors.outer.copy(tmp);
          k++;
        }
      }
      eGeo.attributes.position.needsUpdate = true;
      atom.rotation.y = t * 0.05;
      camera.getWorldDirection(fwd);
      backdrop.material.uniforms.uGlowDir.value.copy(fwd);
      backdrop.position.copy(camera.position);
    }

    /* sample points of the atom model (for the data-world hand-off) */
    function samplePoints(n) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const u = i / n;
        if (u < 0.12) { const p = pts[i % pts.length]; out.push([p[0] + r.gauss() * 0.006, p[1] + r.gauss() * 0.006, p[2] + r.gauss() * 0.006]); }
        else if (u < 0.62) {
          const R = rings[i % rings.length];
          const ang = r() * U.TAU;
          tmp.set(Math.cos(ang) * R.sh.r, Math.sin(ang) * R.sh.r, 0).applyQuaternion(R.ring.quaternion);
          out.push([tmp.x, tmp.y, tmp.z]);
        } else { const j = i % CN; out.push([cp[j * 3], cp[j * 3 + 1], cp[j * 3 + 2]]); }
      }
      return out;
    }

    return { scene, camera, update, ENTRY, anchors, atom, samplePoints };
  }

  return { create, ENTRY };
});
