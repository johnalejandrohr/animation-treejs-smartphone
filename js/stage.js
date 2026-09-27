/* ==========================================================================
   KYVEN K1 — per-frame orchestration: world states, cameras, cross-fades,
   post settings, labels, captions and HUD.
   ========================================================================== */
NX.def('stage', function (THREE, A, NX) {
  'use strict';
  const U = NX.U, D = NX.dir;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  const ORDER = ['glass', 'touch', 'display', 'sensors', 'frame', 'antennas', 'cooling', 'board', 'soc', 'memory', 'battery', 'camera', 'other', 'back'];
  const PANELS = [['camera', 0.158, 0.2], ['battery', 0.39, 0.448], ['cooling', 0.455, 0.51], ['board', 0.518, 0.58], ['soc', 0.586, 0.628]];
  const EXA = { glass: [0, 3.8, 0.15, 'u'], display: [0, -3.75, 0.12, 'd'], frame: [0, 3.8, 0, 'u'], cooling: [0, 0.4, 0.09, 'd'], board: [0.9, 3.55, 0.05, 'u'], battery: [0, -3.4, 0, 'd'], camera: [-0.5, 3.42, -0.2, 'u'], back: [0, -3.8, -0.15, 'd'] };
  const BLOOM = [[0.5, 0.6, 0.84], [0.75, 0.55, 0.72], [0.7, 0.5, 0.72], [0.9, 0.6, 0.45], [1.1, 0.66, 0.25]];

  function create(ctx) {
    const { worlds: W, post, ui, J } = ctx;
    const w0 = W[0], phone = w0.phone;
    const poses = W.map(() => D.pose());
    const rm = U.reducedMotion;
    const tv = new THREE.Vector3(), tv2 = new THREE.Vector3(), qa = new THREE.Quaternion(), qy = new THREE.Quaternion(), qp = new THREE.Quaternion();
    const ps = {
      e: 0, foci: [{ id: 'battery', w: 0 }, { id: 'cooling', w: 0 }, { id: 'board', w: 0 }],
      fx: { battery: 0, cooling: 0, board: 0, camera: 0 }, iso: 0, lid: 0, time: 0, dt: 0, hover: null,
    };
    function story(T) {
      const pre = T < 0.7;
      ps.e = pre ? U.sstep(0.235, 0.37, T) : 0;
      ps.foci[0].w = U.bell(T, 0.382, 0.397, 0.443, 0.458);
      ps.foci[1].w = U.bell(T, 0.446, 0.461, 0.503, 0.518);
      ps.foci[2].w = pre ? U.sstep(0.506, 0.521, T) : 0;
      ps.fx.battery = U.bell(T, 0.392, 0.41, 0.438, 0.452);
      ps.fx.cooling = U.bell(T, 0.456, 0.472, 0.498, 0.512);
      ps.fx.board = pre ? U.sstep(0.515, 0.54, T) : 0;
      ps.fx.camera = U.bell(T, 0.166, 0.178, 0.19, 0.2);
      ps.iso = pre ? U.sstep(0.572, 0.6, T) : 0;
      ps.fades = { memory: 1 - U.sstep(0.582, 0.605, T) };
      ps.lid = pre ? U.sstep(0.598, 0.628, T) : 0;
      return ps;
    }

    function orbitUser(P, u) {
      if (!u || (Math.abs(u.yaw) < 1e-5 && Math.abs(u.pitch) < 1e-5 && Math.abs(u.zoom - 1) < 1e-5)) return;
      tv.copy(P.p).sub(P.tgt);
      qy.setFromAxisAngle(UP, u.yaw);
      tv2.set(1, 0, 0).applyQuaternion(P.q);
      qp.setFromAxisAngle(tv2, u.pitch);
      qa.copy(qy).multiply(qp);
      tv.applyQuaternion(qa).multiplyScalar(u.zoom);
      P.p.copy(P.tgt).add(tv);
      P.q.premultiply(qa);
    }
    const nf = (P, k, lo, hi) => { const d = P.p.distanceTo(P.tgt); return U.clamp(d * k, lo, hi); };
    /* portrait screens: widen the lens so microscopic scenes keep their composition */
    const adj = (P, w) => {
      const a = w0.camera.aspect;
      if (a >= 1 || w <= 0) return;
      const k = Math.pow(Math.max(a, 0.35), 0.7);
      const f = (2 * Math.atan(Math.tan((P.fov * Math.PI) / 360) / k) * 180) / Math.PI;
      P.fov = U.lerp(P.fov, f, w);
    };

    const qIdle = new THREE.Quaternion(), QI = new THREE.Quaternion();
    function frame(o) {
      const { T, time, dt } = o;
      const explore = o.mode === 'explore';
      const WA = explore ? { a: 0, b: -1, m: 0 } : D.worldsAt(T);
      const vis = [0, 0, 0, 0, 0];
      vis[WA.a] += 1 - WA.m;
      if (WA.b >= 0) vis[WA.b] += WA.m;
      const user = o.user;

      /* ---------------- world 0: the phone */
      if (vis[0] > 0) {
        const s = explore ? o.explore : story(T);
        if (!explore && o.eBlend && o.eBlend.w < 1) s.e = U.lerp(o.eBlend.from, s.e, U.ease.inOutCubic(o.eBlend.w));
        s.time = time; s.dt = dt; s.hover = o.hover;
        if (!explore) {
          J.phoneQuat(T, qa);
          if (o.blendFrom && o.blendW < 1 && o.blendFrom.rootQ) qa.slerpQuaternions(o.blendFrom.rootQ, qa.clone(), U.ease.inOutCubic(o.blendW));
          if (o.idle.w > 0.0005) { qIdle.setFromAxisAngle(UP, o.idle.ang).slerp(QI, 1 - o.idle.w); qa.premultiply(qIdle); }
          phone.root.quaternion.copy(qa);
        }
        s.envI = o.intro;
        s.screen = U.sstep(0.45, 0.95, o.intro);
        s.envRot = rm ? 0 : Math.sin(time * 0.07) * 0.22 + (1 - o.intro) * -1.3;
        s.shafts = explore ? 0.4 : 1 - U.sstep(0.2, 0.3, T) + U.sstep(0.97, 1, T);
        w0.update(s);
        if (!explore) {
          J.cam0(T, poses[0]);
          adj(poses[0], T < 0.7 ? U.sstep(0.58, 0.615, T) : 0);
          if (o.blendFrom && o.blendW < 1) D.lerpPose(poses[0], o.blendFrom, poses[0], U.ease.inOutCubic(o.blendW));
          orbitUser(poses[0], user);
          D.applyPose(w0.camera, poses[0], nf(poses[0], 0.02, 0.004, 0.1), 700);
        }
      }
      /* ---------------- world 1: chip */
      if (vis[1] > 0) {
        J.cam1(T, poses[1]);
        adj(poses[1], 1);
        orbitUser(poses[1], user);
        D.applyPose(W[1].camera, poses[1], nf(poses[1], 0.01, 0.001, 1), 900);
        W[1].update({ time, dt, hero: U.sstep(0.726, 0.745, T), appear: U.sstep(0.652, 0.668, T), rise: U.ease.inOutCubic(U.range(T, 0.652, 0.694)), pulse: 1 });
      }
      /* ---------------- world 2: transistor */
      if (vis[2] > 0) {
        J.cam2(T, poses[2]);
        adj(poses[2], 1);
        orbitUser(poses[2], user);
        D.applyPose(W[2].camera, poses[2], nf(poses[2], 0.01, 0.0002, 0.2), 400);
        W[2].update({ time, dt, flow: U.sstep(0.762, 0.785, T) * (1 - U.sstep(0.826, 0.838, T)), faceGlow: U.sstep(0.826, 0.852, T), fog: 0.014 * (1 - U.sstep(0.826, 0.845, T)) });
      }
      /* ---------------- world 3: atom */
      if (vis[3] > 0) {
        J.cam3(T, poses[3]);
        adj(poses[3], 1);
        orbitUser(poses[3], user);
        D.applyPose(W[3].camera, poses[3], nf(poses[3], 0.01, 0.0005, 0.05), 150);
        W[3].update({ time, dt, focus: U.sstep(0.874, 0.9, T), reveal: U.sstep(0.884, 0.912, T) });
      }
      /* ---------------- world 4: data */
      if (vis[4] > 0) {
        J.cam4(T, poses[4]);
        adj(poses[4], 1 - U.sstep(0.97, 0.9855, T));
        orbitUser(poses[4], user);
        const d = poses[4].p.distanceTo(poses[4].tgt);
        D.applyPose(W[4].camera, poses[4], U.clamp(d * 0.01, 0.0002, 0.1), 700);
        W[4].update({ time, dt, stage: J.stage4(T), size: d * 0.004, amp: d * 0.05, glow: 1 + 0.5 * U.bell(T, 0.975, 0.99, 0.99, 0.998), dust: U.sstep(0.95, 0.98, T) });
      }

      /* ---------------- composition + post */
      const dual = post.dual;
      dual.a = W[WA.a];
      dual.b = WA.b >= 0 ? W[WA.b] : null;
      dual.mix = WA.m;
      let blur = 0, flash = 0;
      if (!explore) for (const x of D.X) {
        const c = (x.t0 + x.t1) / 2, h = x.t1 - x.t0;
        blur = Math.max(blur, U.bell(T, x.t0 - h * 0.7, c, c, x.t1));
        flash = Math.max(flash, U.bell(T, c - h * 0.4, c, c, c + h * 0.5) * (x.b === 0 ? 1.5 : 1));
      }
      dual.uniforms.uBlur.value = rm ? 0 : blur * 0.22;
      dual.uniforms.uFlash.value = rm ? 0 : flash * 0.035;
      let bs = 0, br = 0, bt = 0;
      vis.forEach((v, i) => { bs += v * BLOOM[i][0]; br += v * BLOOM[i][1]; bt += v * BLOOM[i][2]; });
      post.bloom.strength = bs;
      post.bloom.radius = br;
      post.bloom.threshold = bt;
      post.grade.uniforms.uCA.value = 0.0018 + blur * 0.008;
      post.grade.uniforms.uFade.value = o.fade;

      /* ---------------- HUD */
      const lab = (id, html, cls, p, cam, a) => ui.place(id, html, cls, p, cam, a);
      if (!explore) {
        ui.setLevel(D.levelAt(T), T);
        ui.setScale(D.scaleAt(T));
        ui.setCaption(o.captions ? D.captionAt(T) : '');
        ui.setHero(T < 0.03);
        document.body.classList.toggle('at-end', T > 0.994 && !o.playing);
      } else {
        const d = w0.camera.position.distanceTo(o.target || tv.set(0, 0, 0));
        ui.setScale(2 * d * Math.tan((w0.camera.fov * Math.PI) / 360) * w0.camera.aspect * 0.02);
        ui.setCaption('');
        ui.setHero(false);
      }
      // panel
      let pid = null, pa = 0;
      if (explore) { pid = o.focusId; pa = o.focusW; }
      else for (const [id, a, b] of PANELS) { const w = U.bell(T, a, a + 0.004, b - 0.004, b); if (w > 0.01) { pid = id; pa = w; } }
      if (pid && vis[0] > 0.5) {
        const part = phone.parts[pid];
        ui.setPanel({ id: pid, name: part.name, title: part.title, specs: part.specs }, ORDER.indexOf(pid) + 1, explore && pid === 'soc' ? 'ENTER THE PROCESSOR  →' : '');
        const c = pid === 'camera' ? phone.worldPoint('camera', tv2.set(-0.98, 2.78, -0.23), tv) : phone.worldPoint(pid, pid === 'soc' ? tv2.copy(phone.parts.soc.localCenter) : tv2.copy(part.center), tv);
        c.project(w0.camera);
        ui.leader((c.x * 0.5 + 0.5) * innerWidth, (-c.y * 0.5 + 0.5) * innerHeight, pa);
      } else { ui.setPanel(null); ui.leader(null, null, 0); }

      if (vis[0] > 0 && !explore) {
        const land = J.aspect >= 0.9;
        const narrow = innerWidth < 640;
        const a0 = narrow ? 0 : U.bell(T, 0.335, 0.355, 0.376, 0.388) * vis[0];
        let i = 0;
        for (const id in EXA) {
          const [x, y, z, c] = EXA[id];
          const pnt = land ? tv2.set(x, y, z) : tv2.set(i % 2 ? -1.9 : 1.9, 0, z);
          lab('ex-' + id, phone.parts[id].name, land ? c : i % 2 ? 'l' : 'r', phone.worldPoint(id, pnt, tv), w0.camera, a0);
          i++;
        }
        const aT = narrow ? 0 : U.bell(T, 0.118, 0.128, 0.148, 0.156);
        lab('ti', 'TITANIUM UNIBODY<small>GRADE 5 · 6.4 mm PROFILE</small>', 'r', tv.set(NX.phone.W / 2 + 0.02, 0.9, 0).applyMatrix4(phone.root.matrixWorld), w0.camera, aT);
      }
      if (vis[1] > 0) {
        const c = W[1].camera;
        lab('w1a', 'KV1 DIE<small>12 × 12 mm · 42 BILLION TRANSISTORS</small>', 'r', tv.set(9, 0.2, -6), c, U.bell(T, 0.655, 0.665, 0.682, 0.69) * vis[1]);
        lab('w1b', 'CIRCUITRY<small>15 COPPER INTERCONNECT LAYERS</small>', 'r', tv.set(-1.6, 2.2, -1.2), c, U.bell(T, 0.692, 0.7, 0.714, 0.72) * vis[1]);
        lab('w1c', 'TRANSISTORS<small>GATE-ALL-AROUND · 1.4 nm NODE</small>', 'r', tv.set(0.35, 0.09, -0.25), c, U.bell(T, 0.72, 0.726, 0.74, 0.747) * vis[1]);
      }
      if (vis[2] > 0) {
        const c = W[2].camera, a = U.bell(T, 0.768, 0.778, 0.82, 0.83) * vis[2];
        const on = W[2].gateState() > 0.5;
        lab('w2s', 'SOURCE', 'l', tv.set(-2.95, 1.25, 0.9), c, a);
        lab('w2d', 'DRAIN', 'r', tv.set(2.95, 1.25, 0.9), c, a);
        lab('w2g', 'GATE<small>' + (on ? 'V<sub>G</sub> 0.7 V · ON' : 'V<sub>G</sub> 0 V · OFF') + '</small>', 'u', tv.set(0.3, 1.93, -0.1), c, a);
        lab('w2si', 'SILICON<small>CRYSTALLINE SUBSTRATE</small>', 'l', tv.set(-2.2, -0.7, 5.5), c, a);
        lab('w2e', 'ELECTRON FLOW', 'd', tv.set(0.3, 0.42, 0.8), c, a * (on ? 1 : 0.4));
      }
      if (vis[3] > 0) {
        const c = W[3].camera;
        lab('w3a', 'SILICON CRYSTAL<small>DIAMOND CUBIC · a = 0.543 nm</small>', 'r', tv.set(0.62, 0.62, 1.1), c, U.bell(T, 0.858, 0.866, 0.884, 0.892) * vis[3]);
        const a = U.bell(T, 0.9, 0.908, 0.93, 0.936) * vis[3];
        tv2.set(1, 0, 0).applyQuaternion(c.quaternion);
        lab('w3t', '<div class="tile-box"><div class="z"><span>14</span><span>28.085 u</span></div><div class="sym">Si</div><div class="nm">SILICON</div><div class="cfg">[Ne] 3s² 3p²</div></div>', 'tile', tv.set(0, 0, 0).addScaledVector(tv2, 0.44), c, a);
        lab('w3p', '14 PROTONS<small>+ 14 NEUTRONS</small>', 'l', tv.set(0, 0, 0).addScaledVector(tv2, -0.03), c, a);
        lab('w3e', '14 ELECTRONS<small>SHELLS 2 · 8 · 4</small>', 'r', tv.copy(W[3].anchors.outer), c, a);
      }
      if (vis[4] > 0) {
        lab('w4a', 'DATA', 'c', tv.copy(J.socW).addScaledVector(W[4].camera.up, -0.028), W[4].camera, 0);
      }
      if (o.hoverLabel) lab('hover', o.hoverLabel.text, 'r', o.hoverLabel.point, w0.camera, 1);
      else lab('hover', '', 'r', tv.set(0, 0, 0), w0.camera, 0);
      ui.endFrame(dt);
      return WA;
    }

    return { frame, story, poses };
  }

  return { create, ORDER };
});
