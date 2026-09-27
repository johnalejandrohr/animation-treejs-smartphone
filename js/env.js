/* ==========================================================================
   KYVEN K1 — studio / lab lighting environments, dust, volumetric shafts
   All reflections come from procedurally built "softbox" scenes baked into
   PMREM cube maps — no HDR files needed.
   ========================================================================== */
NX.def('env', function (THREE, A, NX) {
  'use strict';
  const U = NX.U;

  function bake(renderer, panels, bg) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bg);
    const geo = new THREE.PlaneGeometry(1, 1);
    for (const p of panels) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(p.c).multiplyScalar(p.i), side: THREE.DoubleSide }));
      m.scale.set(p.w, p.h, 1);
      m.position.set(p.p[0], p.p[1], p.p[2]);
      m.lookAt(0, 0, 0);
      scene.add(m);
    }
    const pmrem = new THREE.PMREMGenerator(renderer);
    const rt = pmrem.fromScene(scene, 0.02);
    pmrem.dispose();
    return rt.texture;
  }

  /* premium product-photography studio: long strip softboxes */
  function studio(renderer) {
    return bake(renderer, [
      { w: 7, h: 4.5, c: 0xfff3e6, i: 4.2, p: [-7, 6, 7] },
      { w: 9, h: 6, c: 0xdce8ff, i: 0.9, p: [9, 2, 6] },
      { w: 0.9, h: 16, c: 0xffffff, i: 9, p: [-8, 0, -5] },
      { w: 0.9, h: 16, c: 0xe6efff, i: 7.5, p: [8.5, 0, -4] },
      { w: 13, h: 1.1, c: 0xffffff, i: 4, p: [0, 9, 1.5] },
      { w: 11, h: 0.5, c: 0xcfdcff, i: 1.6, p: [0, -4, 9] },
      { w: 0.5, h: 10, c: 0xffe2c4, i: 3.2, p: [3, 1, 9] },
      { w: 30, h: 30, c: 0x0b0c0e, i: 1, p: [0, -9, 0.01] },
      { w: 30, h: 20, c: 0x07080b, i: 1, p: [0.01, 0, -12] },
    ], 0x010102);
  }

  /* cooler "laboratory" environment for the microscopic worlds */
  function lab(renderer) {
    return bake(renderer, [
      { w: 8, h: 5, c: 0xcfe3ff, i: 3.5, p: [-6, 8, 6] },
      { w: 3, h: 3, c: 0xffd6a8, i: 2.5, p: [8, 3, -3] },
      { w: 0.7, h: 16, c: 0xbad8ff, i: 6, p: [-9, 0, -2] },
      { w: 0.7, h: 16, c: 0xe8f2ff, i: 4.5, p: [9, 0, 4] },
      { w: 14, h: 1, c: 0xffffff, i: 3, p: [0, 10, 0.5] },
      { w: 20, h: 20, c: 0x0a0f18, i: 1, p: [0, -9, 0.01] },
    ], 0x020306);
  }

  function dust(count, box, o = {}) {
    const r = U.rng(o.seed || 17);
    const P = new Float32Array(count * 3), S = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      P[i * 3] = r.range(-box[0], box[0]);
      P[i * 3 + 1] = r.range(-box[1], box[1]);
      P[i * 3 + 2] = r.range(-box[2], box[2]);
      S[i] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(S, 1));
    const pts = new THREE.Points(g, NX.sh.glowPoints({ color: o.color ?? 0x9fb2cc, size: o.size ?? 0.05, opacity: o.opacity ?? 0.35, drift: o.drift ?? 0.6 }));
    pts.frustumCulled = false;
    return pts;
  }

  /* soft volumetric light shafts (additive gradient cards, cylindrical billboards) */
  function shafts(o = {}) {
    const group = new THREE.Group();
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: NX.sh.G.uTime, uColor: { value: new THREE.Color(o.color ?? 0x8aa3c4) }, uOpacity: { value: o.opacity ?? 0.06 } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uOpacity; uniform vec3 uColor; varying vec2 vUv;
        void main(){
          float x = abs(vUv.x - 0.5) * 2.0;
          float core = exp(-x * x * 5.0);
          float v = pow(vUv.y, 1.6) * smoothstep(0.0, 0.25, vUv.y);
          float flick = 0.8 + 0.2 * sin(uTime * 0.35 + vUv.y * 5.0) * sin(uTime * 0.21 + vUv.x * 9.0);
          gl_FragColor = vec4(uColor * core * v * flick * uOpacity, 1.0);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const defs = o.defs || [[-3.5, 0.5, -7, 3.2, 30, 0.22], [1.5, 0, -9, 4.5, 34, -0.08], [5, 0.5, -6, 2.4, 28, -0.3]];
    for (const [x, y, z, w, h, tilt] of defs) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, y + h * 0.18, z);
      m.userData.tilt = tilt;
      group.add(m);
    }
    group.userData.material = mat;
    group.update = (camera) => {
      for (const m of group.children) {
        m.rotation.set(0, Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z), m.userData.tilt);
      }
    };
    return group;
  }

  return { studio, lab, dust, shafts };
});
