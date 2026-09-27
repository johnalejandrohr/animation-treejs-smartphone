/* ==========================================================================
   KYVEN K1 — component "reveal" effects: energy flow in the battery,
   coolant flow in the micro-channels, pulses on the logic board, the
   periscope light path and LiDAR structured light.
   ========================================================================== */
NX.def('phoneFx', function (THREE, A, NX) {
  'use strict';
  const U = NX.U;

  function dynPoints(part, parent, n, color, size) {
    const pos = new Float32Array(n * 3), alpha = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uViewportH: NX.sh.G.uViewportH, uColor: { value: new THREE.Color(color) }, uSize: { value: size }, uFade: { value: 1 }, uAmount: { value: 0 } },
      vertexShader: /* glsl */ `
        ${NX.sh.POINT_SIZE}
        uniform float uSize; attribute float aAlpha; varying float vA;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
          gl_PointSize = worldPointSize(uSize * (0.55 + 0.45 * aAlpha), mv); vA = aAlpha; }`,
      fragmentShader: /* glsl */ `
        ${NX.sh.GLOW_FRAG}
        uniform vec3 uColor; uniform float uFade, uAmount; varying float vA;
        void main(){ gl_FragColor = vec4(uColor * glowDisc(gl_PointCoord) * vA * uFade * uAmount, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    mat.userData.setFade = (f) => (mat.uniforms.uFade.value = f);
    part.mats.push(mat);
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    pts.userData.part = part.id;
    parent.add(pts);
    return {
      pts, pos, alpha, mat, n,
      set amount(v) { mat.uniforms.uAmount.value = v; pts.visible = v > 0.002; },
      commit() { g.attributes.position.needsUpdate = true; g.attributes.aAlpha.needsUpdate = true; },
    };
  }

  function glowTube(part, parent, pts, radius, color) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.05);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: NX.sh.G.uTime, uColor: { value: new THREE.Color(color) }, uFade: { value: 1 }, uAmount: { value: 0 } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uFade, uAmount; uniform vec3 uColor; varying vec2 vUv;
        void main(){
          float d = fract(vUv.x * 6.0 - uTime * 0.9);
          float pulse = smoothstep(0.0, 0.1, d) * smoothstep(1.0, 0.4, d);
          float grow = smoothstep(uAmount * 1.2, uAmount * 1.2 - 0.1, vUv.x);
          gl_FragColor = vec4(uColor * (0.35 + 1.6 * pulse) * grow * uFade * uAmount, 1.0);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    mat.userData.setFade = (f) => (mat.uniforms.uFade.value = f);
    part.mats.push(mat);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, radius, 8, false), mat);
    m.userData.part = part.id;
    m.userData.fx = true;
    parent.add(m);
    return m;
  }

  function build(ctx) {
    const P = ctx.parts;
    const fx = {};
    ctx.fx = fx;
    const r = U.rng(77);

    /* battery: ion flow between electrodes + current towards the tab */
    {
      const b = P.battery;
      const ions = dynPoints(b, b.sub, U.mobile ? 350 : 700, 0xffc27a, 0.05);
      const cur = dynPoints(b, b.sub, U.mobile ? 160 : 320, 0xffe3b8, 0.04);
      ions.seed = Array.from({ length: ions.n }, () => [r.range(-1.35, 1.35), r.range(-1.8, 1.8), r(), r.range(0.25, 0.6)]);
      cur.seed = Array.from({ length: cur.n }, () => [r.range(-1.35, 1.35), r.range(-1.8, 1.6), r(), r.range(0.15, 0.4)]);
      fx.battery = { ions, cur };
    }
    /* cooling: coolant particles following the micro-channel curve */
    {
      const c = P.cooling;
      const samples = c.curve.getSpacedPoints(3000);
      const flow = dynPoints(c, c.sub, U.mobile ? 420 : 900, 0xd8f4ff, 0.05);
      flow.seed = Array.from({ length: flow.n }, () => [r(), r.range(-0.006, 0.006), r.range(-0.006, 0.006), r.range(0.8, 1.2)]);
      const hot = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 1.4),
        new THREE.ShaderMaterial({
          uniforms: { uHeat: { value: 0 }, uFade: { value: 1 }, uTime: NX.sh.G.uTime },
          vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: /* glsl */ `uniform float uHeat, uFade, uTime; varying vec2 vUv;
            void main(){ float d = length(vUv - 0.5) * 2.0; float g = exp(-d * d * 5.0) * (0.85 + 0.15 * sin(uTime * 3.0));
              vec3 c = mix(vec3(1.0, 0.35, 0.08), vec3(1.0, 0.75, 0.4), g) * g; gl_FragColor = vec4(c * uHeat * uFade, 1.0); }`,
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        })
      );
      hot.material.userData.setFade = (f) => (hot.material.uniforms.uFade.value = f);
      c.mats.push(hot.material);
      hot.position.set(c.soc[0], c.soc[1], 0.009);
      hot.userData.part = 'cooling';
      hot.userData.fx = true;
      c.sub.add(hot);
      fx.cooling = { flow, samples, hot };
    }
    /* logic board: data pulses racing along the copper traces */
    {
      const b = P.board;
      const geo = NX.traces.ribbonGeometry(b.traces, { plane: 'xy', level: b.boardTop + 0.0012, seed: 3 });
      const mat = NX.traces.pulseMaterial({ color: 0xa8dcff, base: 0x10263d, speed: 0.55, pulse: 0.12, gap: 0.6, intensity: 0 });
      mat.userData.setFade = (f) => (mat.userData.fade = f);
      mat.userData.fade = 1;
      b.mats.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.part = 'board';
      mesh.userData.fx = true;
      mesh.renderOrder = 3;
      b.sub.add(mesh);
      const ends = NX.traces.endpoints(b.traces, 'xy', b.boardTop + 0.002, 0.03);
      ends.userData.part = 'board';
      ends.material.userData.setFade = (f) => (ends.material.userData.fade = f);
      b.mats.push(ends.material);
      b.sub.add(ends);
      fx.board = { mesh, mat, ends };
    }
    /* camera: periscope light path + LiDAR structured light */
    {
      const c = P.camera;
      const path = glowTube(c, c.group, [[0.02, 2.78, -1.6], [0.02, 2.78, -0.35], [0.02, 2.78, -0.07], [0.02, 2.5, -0.07], [0.02, 1.7, -0.07]], 0.012, 0xbfe6ff);
      const lidar = dynPoints(c, c.group, U.mobile ? 220 : 480, 0xd9a0ff, 0.022);
      lidar.seed = Array.from({ length: lidar.n }, (_, i) => [((i % 24) / 23 - 0.5) * 0.9, (Math.floor(i / 24) / 19 - 0.5) * 0.7, r()]);
      fx.camera = { path, lidar };
    }
  }

  function update(ctx, s) {
    const P = ctx.parts, fx = ctx.fx;
    const t = s.time || 0;
    const F = s.fx || {};

    /* battery */
    {
      const amt = U.clamp(F.battery || 0);
      const { ions, cur } = fx.battery;
      ions.amount = amt;
      cur.amount = amt;
      if (amt > 0.002) {
        const z = P.battery.layerZ || [0, 0, 0, 0, 0];
        const zc = z[3], za = z[1];
        for (let i = 0; i < ions.n; i++) {
          const [x, y, sd, sp] = ions.seed[i];
          const u = U.fract(t * sp + sd);
          ions.pos[i * 3] = x + Math.sin(t * 2 + sd * 30) * 0.02;
          ions.pos[i * 3 + 1] = y + Math.cos(t * 1.7 + sd * 20) * 0.02;
          ions.pos[i * 3 + 2] = U.lerp(zc, za, U.ease.inOutSine(u));
          ions.alpha[i] = Math.sin(Math.PI * u);
        }
        ions.commit();
        const tab = [-0.6, 2.1], zcu = z[0];
        for (let i = 0; i < cur.n; i++) {
          const [x, y, sd, sp] = cur.seed[i];
          const u = U.fract(t * sp + sd);
          const e = U.ease.inQuad(u);
          cur.pos[i * 3] = U.lerp(x, tab[0], e);
          cur.pos[i * 3 + 1] = U.lerp(y, tab[1], u);
          cur.pos[i * 3 + 2] = zcu + 0.012;
          cur.alpha[i] = Math.sin(Math.PI * u) * 0.9;
        }
        cur.commit();
      }
    }
    /* cooling */
    {
      const amt = U.clamp(F.cooling || 0);
      const { flow, samples, hot } = fx.cooling;
      flow.amount = amt;
      hot.material.uniforms.uHeat.value = (0.35 + 0.65 * (1 - amt)) * U.clamp((F.cooling || 0) * 4 + (F.heat || 0));
      hot.visible = hot.material.uniforms.uHeat.value > 0.002;
      if (amt > 0.002) {
        const n = samples.length - 1;
        for (let i = 0; i < flow.n; i++) {
          const [u0, ox, oy, sp] = flow.seed[i];
          const u = U.fract(u0 + t * 0.028 * sp) * n;
          const k = Math.floor(u), f = u - k;
          const a = samples[k], b = samples[Math.min(k + 1, n)];
          flow.pos[i * 3] = a.x + (b.x - a.x) * f + ox;
          flow.pos[i * 3 + 1] = a.y + (b.y - a.y) * f + oy;
          flow.pos[i * 3 + 2] = a.z + (b.z - a.z) * f;
          flow.alpha[i] = 0.55 + 0.45 * Math.sin(u0 * 90 + t * 3);
        }
        flow.commit();
      }
    }
    /* board */
    {
      const { mat, ends, mesh } = fx.board;
      const amt = U.clamp(F.board || 0);
      mat.uniforms.uIntensity.value = amt * mat.userData.fade;
      mat.uniforms.uReveal.value = U.clamp(amt * 1.15);
      ends.material.uniforms.uOpacity.value = 0.8 * amt * ends.material.userData.fade;
      mesh.visible = ends.visible = amt > 0.002;
    }
    /* camera */
    {
      const amt = U.clamp(F.camera || 0);
      const c = P.camera;
      const { path, lidar } = fx.camera;
      path.material.uniforms.uAmount.value = amt;
      path.visible = amt > 0.002;
      for (const L of c.lenses) {
        const els = L.userData.elements;
        if (!els) continue;
        els.forEach((e, i) => (e.position.z = e.userData.baseZ + U.ease.inOutCubic(amt) * (0.05 + (els.length - 1 - i) * 0.055)));
      }
      lidar.amount = amt;
      if (amt > 0.002) {
        const o = [1.36, 2.56, -0.24];
        for (let i = 0; i < lidar.n; i++) {
          const [x, y, sd] = lidar.seed[i];
          const u = U.fract(t * 0.35 + sd * 0.15);
          const d = 0.1 + u * 2.4;
          lidar.pos[i * 3] = o[0] + x * d * 0.9;
          lidar.pos[i * 3 + 1] = o[1] + y * d * 0.9;
          lidar.pos[i * 3 + 2] = o[2] - d;
          lidar.alpha[i] = (1 - u) * U.sstep(0, 0.1, u);
        }
        lidar.commit();
      }
    }
  }

  return { build, update };
});
