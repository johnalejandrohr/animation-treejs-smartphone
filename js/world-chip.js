/* ==========================================================================
   KYVEN K1 — WORLD 1: inside the KV1 die. Floorplan + six copper
   interconnect layers carrying data pulses, and the transistor array.
   Die spans x,z ∈ [-20, 20]; y is up. The hero transistor sits at origin.
   ========================================================================== */
NX.def('worldChip', function (THREE, A, NX) {
  'use strict';
  const U = NX.U;
  const DIE = 40;
  const S2 = 0.05; // W2 (transistor) units -> W1 units

  const DITHER = /* glsl */ `float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }`;

  /* standard material + near-camera dissolve (+ optional travelling pulses) */
  function fxMaterial(params, shared, pulse, layerI = 1) {
    const m = new THREE.MeshStandardMaterial(params);
    m.userData.layerI = layerI;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uNear0 = shared.uNear0;
      sh.uniforms.uNear1 = shared.uNear1;
      sh.uniforms.uTime = NX.sh.G.uTime;
      sh.uniforms.uPulseI = shared.uPulseI;
      sh.uniforms.uPulseColor = shared.uPulseColor;
      sh.uniforms.uPulseLen = { value: pulse || 1 };
      sh.uniforms.uAppear = shared.uAppear;
      sh.uniforms.uRise = shared.uRise;
      sh.vertexShader = 'uniform float uRise;\n' + sh.vertexShader.replace('#include <project_vertex>', `
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        mvPosition.y *= uRise;
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;`);
      sh.uniforms.uLayerI = { value: m.userData.layerI ?? 1 };
      if (pulse) {
        sh.vertexShader = 'attribute vec4 aPulse;\nvarying vec4 vPulse;\nvarying float vAlong;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPulse = aPulse; vAlong = position.x;');
      }
      sh.fragmentShader =
        'uniform float uNear0, uNear1, uTime, uPulseI, uPulseLen, uAppear, uLayerI;\nuniform vec3 uPulseColor;\n' + DITHER + '\n' +
        (pulse ? 'varying vec4 vPulse;\nvarying float vAlong;\n' : '') +
        sh.fragmentShader
          .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
            { float nf = smoothstep(uNear0, uNear1, length(vViewPosition)) * uAppear; if (nf < ign(gl_FragCoord.xy)) discard; }`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
            ${pulse ? `{ float len = vPulse.z; float along = (vAlong + 0.5) * len; float span = len + uPulseLen * 4.0;
              float head = fract(uTime * vPulse.y / span + vPulse.x) * span - uPulseLen * 2.0;
              float dd = head - along;
              float p = dd > 0.0 ? exp(-dd / uPulseLen) : exp(dd / (uPulseLen * 0.05));
              totalEmissiveRadiance += uPulseColor * p * vPulse.w * uPulseI * uLayerI; }` : ''}`);
    };
    return m;
  }

  function create(renderer, assets, tier) {
    const scene = new THREE.Scene();
    scene.environment = assets.labEnv;
    scene.fog = new THREE.FogExp2(0x03060b, 0.01);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 800);
    const backdrop = NX.sh.backdrop({ top: 0x04070c, mid: 0x060a12, bot: 0x020306, glow: 0x0c1624 });
    scene.add(backdrop);
    const shared = {
      uNear0: { value: 0.01 }, uNear1: { value: 0.05 }, uPulseI: { value: 1 }, uAppear: { value: 1 }, uRise: { value: 1 },
      uPulseColor: { value: new THREE.Color(0xa6dcff).multiplyScalar(2.8) },
    };
    const r = U.rng(2035);

    /* die floor — same textures as the SoC die in world 0 */
    const floorMat = new THREE.MeshStandardMaterial({ map: assets.tex.die.map, emissiveMap: assets.tex.die.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.8, metalness: 0.55, roughness: 0.32 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(DIE, DIE), floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(DIE, 1.2, DIE), new THREE.MeshStandardMaterial({ color: 0x0b0e13, metalness: 0.6, roughness: 0.5 }));
    edge.position.y = -0.61;
    scene.add(edge);

    /* copper interconnect stack */
    const LAYERS = [
      // y, pitch, width, thickness, dir, extent, clearing radius
      [0.3, 0.1, 0.045, 0.05, 'x', 5, 0.9],
      [0.5, 0.14, 0.06, 0.06, 'z', 6.5, 1.0],
      [0.8, 0.22, 0.09, 0.08, 'x', 8.5, 1.15],
      [1.3, 0.38, 0.15, 0.12, 'z', 12, 0],
      [2.2, 0.7, 0.28, 0.2, 'x', 16, 0],
      [3.6, 1.3, 0.55, 0.34, 'z', 19.4, 0],
    ];
    const box = new THREE.BoxGeometry(1, 1, 1);
    const copperCols = [0xc27a4e, 0xbf7c52, 0xb97e57, 0xa8765a, 0x8c6a57, 0x6b5a50];
    const pulseI = [1.0, 0.95, 0.75, 0.45, 0.22, 0.1];
    const layers = [];
    const dummy = new THREE.Object3D();
    const scale = tier.low ? 0.55 : 1;
    LAYERS.forEach((L, li) => {
      const [y, pitch, w, th, dir, ext, clear] = L;
      const segs = [];
      for (let a = -ext; a <= ext; a += pitch) {
        if (r() > 0.86) continue;
        let b = -ext + r() * pitch * 4;
        while (b < ext) {
          const len = pitch * r.range(6, 40);
          const b1 = Math.min(ext, b + len);
          const mid = (b + b1) / 2;
          const px = dir === 'x' ? mid : a, pz = dir === 'x' ? a : mid;
          const inClear = clear > 0 && Math.hypot(px, pz) < clear + len * 0.5 && Math.abs(a) < clear;
          const radial = Math.hypot(px, pz) / ext;
          if (!inClear && r() < 1.08 - radial * 0.5 && r() < scale + 0.1) segs.push([px, pz, b1 - b]);
          b = b1 + pitch * r.range(1, 5);
        }
      }
      const mat = fxMaterial({ color: copperCols[li], metalness: 1, roughness: 0.3 + li * 0.04, emissive: 0x000000 }, shared, pitch * 2.2, pulseI[li]);
      const mesh = new THREE.InstancedMesh(box, mat, segs.length);
      const pulses = new Float32Array(segs.length * 4);
      segs.forEach(([px, pz, len], i) => {
        dummy.position.set(px, y, pz);
        dummy.rotation.set(0, dir === 'x' ? 0 : Math.PI / 2, 0);
        dummy.scale.set(len, th, w);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        pulses.set([r(), r.range(0.4, 1.6) * (1 + li * 0.4), len, r() < 0.32 ? r.range(0.6, 1.4) : 0], i * 4);
      });
      mesh.geometry = box.clone();
      mesh.geometry.setAttribute('aPulse', new THREE.InstancedBufferAttribute(pulses, 4));
      mesh.frustumCulled = false;
      scene.add(mesh);
      layers.push({ mesh, y, pitch, segs: segs.map(([px, pz, len]) => [px, y, pz, dir === 'x' ? len / 2 : w / 2, th / 2, dir === 'x' ? w / 2 : len / 2]) });
    });

    /* vias between neighbouring layers */
    {
      const n = tier.low ? 500 : 1400;
      const vm = fxMaterial({ color: 0xa8795a, metalness: 1, roughness: 0.35 }, shared, 0);
      const viaBoxes = [];
      const vias = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), vm, n);
      let k = 0;
      while (k < n) {
        const li = r.int(0, LAYERS.length - 2);
        const [y0, p0, w0, , , ext0] = LAYERS[li];
        const [y1] = LAYERS[li + 1];
        const x = (Math.round(r.range(-ext0, ext0) / p0)) * p0, z = (Math.round(r.range(-ext0, ext0) / p0)) * p0;
        if (Math.hypot(x, z) < 1.3 && li < 3) continue;
        dummy.position.set(x, (y0 + y1) / 2, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(w0 * 0.8, y1 - y0, w0 * 0.8);
        dummy.updateMatrix();
        vias.setMatrixAt(k, dummy.matrix);
        viaBoxes.push([x, (y0 + y1) / 2, z, w0 * 0.4, (y1 - y0) / 2, w0 * 0.4]);
        k++;
      }
      vias.frustumCulled = false;
      scene.add(vias);
      layers.push({ mesh: vias, segs: viaBoxes });
    }

    /* transistor array (each cell = a scaled-down world-2 transistor) */
    const arr = new THREE.Group();
    scene.add(arr);
    const cellX = 6.4 * S2, cellZ = 4.0 * S2, NXc = 17, NZc = 27;
    const active = new THREE.Mesh(new THREE.PlaneGeometry(NXc * cellX + 0.3, NZc * cellZ + 0.3), new THREE.MeshStandardMaterial({ color: 0x1a2533, metalness: 0.6, roughness: 0.35 }));
    active.rotation.x = -Math.PI / 2;
    active.position.y = 0.002;
    arr.add(active);
    const cnt = NXc * NZc;
    const gateM = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2 * S2, 1.7 * S2, 3.2 * S2), new THREE.MeshStandardMaterial({ color: 0xd6dce4, metalness: 1, roughness: 0.2, emissive: 0x0c1826 }), cnt);
    const epiM = new THREE.InstancedMesh(new THREE.BoxGeometry(2.3 * S2, 1.3 * S2, 1.7 * S2), new THREE.MeshStandardMaterial({ color: 0x4a6aa8, metalness: 0.45, roughness: 0.3, emissive: 0x0b1a36 }), cnt * 2);
    const conM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5 * S2, 2.1 * S2, 0.5 * S2), new THREE.MeshStandardMaterial({ color: 0xc9a07c, metalness: 1, roughness: 0.25 }), cnt * 3);
    let gi = 0, ei = 0, ci = 0;
    for (let i = 0; i < NXc; i++)
      for (let j = 0; j < NZc; j++) {
        const x = (i - (NXc - 1) / 2) * cellX, z = (j - (NZc - 1) / 2) * cellZ;
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.position.set(x, 0.85 * S2 + 0.003, z);
        dummy.updateMatrix();
        gateM.setMatrixAt(gi++, dummy.matrix);
        for (const s of [-1, 1]) {
          dummy.position.set(x + s * 2.0 * S2, 0.65 * S2 + 0.003, z);
          dummy.updateMatrix();
          epiM.setMatrixAt(ei++, dummy.matrix);
          dummy.position.set(x + s * 2.0 * S2, 2.35 * S2, z);
          dummy.updateMatrix();
          conM.setMatrixAt(ci++, dummy.matrix);
        }
        dummy.position.set(x, 2.6 * S2, z + 1.2 * S2);
        dummy.updateMatrix();
        conM.setMatrixAt(ci++, dummy.matrix);
      }
    for (const m of [gateM, epiM, conM]) arr.add(m);
    /* hero highlight: glowing gate + soft halo */
    const heroGate = new THREE.Mesh(new THREE.BoxGeometry(1.24 * S2, 1.74 * S2, 3.24 * S2), new THREE.MeshBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    heroGate.position.set(0, 0.85 * S2 + 0.003, 0);
    arr.add(heroGate);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.ShaderMaterial({
      uniforms: { uA: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uA; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(vec3(0.45, 0.7, 1.0) * exp(-d * d * 7.0) * uA, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.006;
    arr.add(halo);

    /* drifting charge carriers between the layers */
    const sparks = NX.env.dust(tier.low ? 300 : 700, [10, 2.2, 10], { color: 0xbfe2ff, size: 0.05, opacity: 0.55, drift: 0.25, seed: 5 });
    sparks.position.y = 2.2;
    scene.add(sparks);

    scene.environmentIntensity = 1.0;
    const key = new THREE.DirectionalLight(0xdfeaff, 1.25);
    key.position.set(-8, 14, 10);
    scene.add(key);
    const cool = new THREE.DirectionalLight(0x7fb2ff, 0.9);
    cool.position.set(12, 3, -10);
    scene.add(cool);
    const warm = new THREE.DirectionalLight(0xffc89a, 0.6);
    warm.position.set(10, 4, -6);
    scene.add(warm);

    /* remove every interconnect segment that would intersect the camera flight */
    function clearPath(points) {
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      let removed = 0;
      for (const L of layers) {
        L.segs.forEach((b, i) => {
          for (const p of points) {
            const dx = Math.max(Math.abs(p.x - b[0]) - b[3], 0), dy = Math.max(Math.abs(p.y - b[1]) - b[4], 0), dz = Math.max(Math.abs(p.z - b[2]) - b[5], 0);
            const r = U.clamp(p.y * 0.3, 0.1, 1.4);
            if (dx * dx + dy * dy + dz * dz < r * r) { L.mesh.setMatrixAt(i, zero); removed++; break; }
          }
        });
        L.mesh.instanceMatrix.needsUpdate = true;
      }
      return removed;
    }

    const fwd = new THREE.Vector3();
    function update(s) {
      const h = Math.max(camera.position.y, 0.02);
      scene.fog.density = U.clamp(0.1 / Math.max(h, 0.35), 0.002, 0.3) * (s.fog ?? 1);
      shared.uNear0.value = 0.005;
      shared.uNear1.value = 0.03;
      shared.uAppear.value = s.appear ?? 1;
      shared.uRise.value = Math.max(0.02, s.rise ?? 1);
      shared.uPulseI.value = s.pulse ?? 1;
      floorMat.emissiveIntensity = 0.8;
      heroGate.material.opacity = 0.9 * (s.hero ?? 0);
      halo.material.uniforms.uA.value = 0.8 * (s.hero ?? 0);
      camera.getWorldDirection(fwd);
      backdrop.material.uniforms.uGlowDir.value.copy(fwd);
      backdrop.position.copy(camera.position);
    }

    return { scene, camera, update, clearPath, S2, DIE, layers };
  }

  return { create, S2, DIE };
});
