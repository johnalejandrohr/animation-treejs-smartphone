/* ==========================================================================
   KYVEN K1 — director (part 2): camera paths through the five worlds and
   the powers-of-ten hand-offs between them.
   Each dive is authored as a logarithmic zoom in the *child* world and
   mapped into the parent with the embedding matrix E (child -> parent),
   so both renders line up perfectly while they cross-fade.
   ========================================================================== */
NX.def('journey', function (THREE, A, NX) {
  'use strict';
  const U = NX.U, D = NX.dir;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const UP = V(0, 1, 0);

  function spline(keys) {
    const pc = new THREE.CatmullRomCurve3(keys.map((k) => k.p.clone()), false, 'centripetal');
    const gc = new THREE.CatmullRomCurve3(keys.map((k) => k.g.clone()), false, 'centripetal');
    const n = keys.length, t0 = keys[0].t, t1 = keys[n - 1].t;
    const p = new THREE.Vector3(), g = new THREE.Vector3(), up = new THREE.Vector3();
    return {
      keys,
      eval(T, out) {
        // global parameter from piecewise key timing
        let i = 0;
        while (i < n - 2 && T > keys[i + 1].t) i++;
        const s = U.range(T, keys[i].t, keys[i + 1].t);
        let u = (i + s) / (n - 1);
        u = U.lerp(u, U.ease.inOutSine(u), 0.6);
        const f = u * (n - 1), j = Math.min(Math.floor(f), n - 2), fs = f - j;
        pc.getPoint(u, p);
        gc.getPoint(u, g);
        up.copy(keys[j].up || UP).lerp(keys[j + 1].up || UP, U.smooth(fs)).normalize();
        return D.look(out, p, g, up, U.lerp(keys[j].fov || 35, keys[j + 1].fov || 35, fs));
      },
      t0, t1,
    };
  }

  function create(ctx) {
    const W = ctx.worlds, w0 = W[0], phone = w0.phone;
    const tA = D.pose(), tB = D.pose(), tC = D.pose();
    const qT = new THREE.Quaternion();
    const S1 = phone.parts.soc.dieSize / NX.worldChip.DIE;
    const E1 = new THREE.Matrix4();
    const E2 = new THREE.Matrix4().compose(V(0, 0.003, 0), new THREE.Quaternion(), V(0.05, 0.05, 0.05));
    const DV = NX.worldTransistor.DIVE, ENTRY = NX.worldAtom.ENTRY;
    const S3 = 0.0125;
    const E3 = new THREE.Matrix4().makeTranslation(DV.target.x, DV.target.y, DV.target.z)
      .multiply(new THREE.Matrix4().makeScale(S3, S3, S3))
      .multiply(new THREE.Matrix4().makeTranslation(-ENTRY.x, -ENTRY.y, -ENTRY.z));
    const RX90S = new THREE.Matrix4().makeRotationX(Math.PI / 2).multiply(new THREE.Matrix4().makeScale(S1, S1, S1));

    const Z1 = { tgt: V(0, 0, 0), dir: V(0, 1, 0), up: V(0, 0, -1), dA: 1.45 / S1, dB: 40, t0: 0.62, t1: 0.662, fov: 35 };
    const Z2 = { tgt: V(0, 0.9, 0), dir: V(0, 1, 0.8).normalize(), up: V(0, 1, 0), dA: 29, dB: 7, t0: 0.735, t1: 0.761, fov: 35 };
    const Z3 = { tgt: ENTRY.clone(), dir: DV.dir.clone(), up: V(0, 1, 0), dA: 2.2 / S3, dB: 4, t0: 0.826, t1: 0.855, fov: 35 };
    const zd = (Z, T) => U.logLerp(Z.dA, Z.dB, U.ease.inOutSine(U.range(T, Z.t0, Z.t1)));
    const zp = (out, Z, d) => D.zoom(out, Z.tgt, Z.dir, Z.up, d, Z.fov);

    /* ---------------------------------------------------- authored paths */
    zp(tA, Z1, Z1.dB);
    const k1 = spline([
      { t: 0.662, p: tA.p.clone(), g: V(0, 0, 0), up: V(0, 0, -1), fov: 35 },
      { t: 0.68, p: V(0.6, 15, 6.5), g: V(0, 0, -1.6), up: V(0, 0.5, -1), fov: 35 },
      { t: 0.698, p: V(1.4, 5.3, 9.2), g: V(0.2, 1.5, -3), up: UP, fov: 35 },
      { t: 0.711, p: V(0.7, 2.2, 4.4), g: V(0, 0.8, -1.4), up: UP, fov: 35 },
      { t: 0.72, p: V(0.0, 1.17, 0.95), g: V(0, 0.04, 0.01), up: UP, fov: 35 },
    ]);
    zp(tA, Z2, Z2.dB);
    D.zoom(tB, DV.target, DV.dir, UP, 2.2, 35);
    const k2 = spline([
      { t: 0.761, p: tA.p.clone(), g: Z2.tgt.clone(), fov: 35 },
      { t: 0.785, p: V(-3.4, 4.6, 7.4), g: V(0, 1.0, 0), fov: 35 },
      { t: 0.803, p: V(-6.6, 3.2, 4.4), g: V(0, 1.0, -0.2), fov: 35 },
      { t: 0.817, p: V(-2.6, 2.2, 5.0), g: V(0, 0.95, 0.5), fov: 35 },
      { t: 0.826, p: tB.p.clone(), g: DV.target.clone(), fov: 35 },
    ]);
    const orbit3 = (u, out) => {
      const th = 0.3 + u * 2.3, el = 0.27 + 0.08 * Math.sin(u * Math.PI), r = 1.36 - 0.12 * Math.sin(u * Math.PI);
      return D.look(out, V(Math.sin(th) * r * Math.cos(el), r * Math.sin(el), Math.cos(th) * r * Math.cos(el)), V(0, 0, 0), UP, 35);
    };
    zp(tA, Z3, Z3.dB);
    orbit3(0, tB);
    const k3 = spline([
      { t: 0.855, p: tA.p.clone(), g: ENTRY.clone(), fov: 35 },
      { t: 0.872, p: V(0.3, 0.55, 2.2), g: V(0.04, 0.05, 0), fov: 35 },
      { t: 0.886, p: V(0.45, 0.3, 1.5), g: V(0, 0, 0), fov: 35 },
      { t: 0.896, p: tB.p.clone(), g: V(0, 0, 0), fov: 35 },
    ]);

    /* ---------------------------------------------------- phone focus */
    const VIEW = { battery: V(1.25, 0.42, 1).normalize(), cooling: V(0.5, 0.32, 1).normalize(), board: V(0.32, 0.22, 1).normalize() };
    const RAD = { battery: 2.3, cooling: 1.85, board: 1.7 };
    function focusShot(id, out) {
      const f = phone.focusPose(id, w0.camera, { view: VIEW[id], radius: RAD[id], margin: 1.08 });
      return D.look(out, f.pos, f.target, UP, 32);
    }
    function updateE1() {
      phone.root.updateMatrixWorld(true);
      E1.copy(phone.parts.soc.die.matrixWorld).multiply(RX90S);
    }

    let aspect = 1.6, K = D.buildKeys(aspect);
    function setAspect(a) { aspect = a; K = D.buildKeys(a); }

    /* phone orientation for story time T */
    const qHero = D.qFrom(D.HERO_ROT);
    function phoneQuat(T, out) {
      if (T >= 0.7) return out.copy(qHero);
      if (T >= 0.38) return out.copy(K[K.length - 1].q);
      D.phoneKeys(K, T, aspect, tC, out);
      return out;
    }

    function cam0(T, out) {
      if (T >= 0.7) return D.phoneKeys(K, 0, aspect, out, qT);
      if (T <= 0.38) return D.phoneKeys(K, T, aspect, out, qT);
      if (T < 0.58) {
        const shot = (name, o) => (name === 'ov' ? D.phoneKeys(K, 0.38, aspect, o, qT) : focusShot(name, o));
        const seq = [[0.38, 0.395, 'ov', 'battery'], [0.395, 0.445, 'battery'], [0.445, 0.46, 'battery', 'cooling'], [0.46, 0.505, 'cooling'], [0.505, 0.52, 'cooling', 'board'], [0.52, 0.58, 'board']];
        const s = seq.find((x) => T < x[1]) || seq[seq.length - 1];
        shot(s[2], tA);
        if (s[3]) { shot(s[3], tB); return D.lerpPose(out, tA, tB, U.smoother(U.range(T, s[0], s[1]))); }
        return D.copyPose(out, tA);
      }
      updateE1();
      zp(tC, Z1, T < Z1.t0 ? Z1.dA : zd(Z1, T));
      D.mapPose(tB, tC, E1);
      if (T < 0.615) { focusShot('board', tA); return D.lerpPose(out, tA, tB, U.smoother(U.range(T, 0.58, 0.615))); }
      return D.copyPose(out, tB);
    }
    function cam1(T, out) {
      if (T < Z1.t1) return zp(out, Z1, zd(Z1, T));
      if (T < 0.72) return k1.eval(T, out);
      zp(tC, Z2, T < Z2.t0 ? Z2.dA : zd(Z2, T));
      D.mapPose(tB, tC, E2);
      if (T < Z2.t0) { k1.eval(0.72, tA); return D.lerpPose(out, tA, tB, U.smoother(U.range(T, 0.72, Z2.t0))); }
      return D.copyPose(out, tB);
    }
    function cam2(T, out) {
      if (T < Z2.t1) return zp(out, Z2, zd(Z2, T));
      if (T < Z3.t0) return k2.eval(T, out);
      zp(tC, Z3, zd(Z3, T));
      return D.mapPose(out, tC, E3);
    }
    function cam3(T, out) {
      if (T < Z3.t1) return zp(out, Z3, zd(Z3, T));
      if (T < 0.896) return k3.eval(T, out);
      return orbit3(U.range(T, 0.896, 0.94), out);
    }

    /* ------------------------------------------------ world 4 (return) */
    const heroRoot = new THREE.Matrix4().makeRotationFromQuaternion(qHero);
    const B = NX.phoneInt.BOARD, SC = NX.phoneInt.SOC;
    const socW = V(SC.x + B.cx, SC.y + B.cy, 0.16).applyMatrix4(heroRoot);
    const boardW = V(B.cx, B.cy, 0.1).applyMatrix4(heroRoot);
    const nrm = V(0, 0, 1).applyQuaternion(qHero), phUp = V(0, 1, 0).applyQuaternion(qHero);
    const W4K = [[0.924, 0.05, 0, 35], [0.936, 0.065, 0, 35], [0.945, 0.19, 0, 35], [0.952, 0.23, 0, 35], [0.958, 0.62, 0, 35], [0.962, 0.72, 0, 35], [0.967, 1.35, 0, 34], [0.97, 1.55, 0, 34], [0.975, 5.2, 1, 32], [0.978, 5.8, 1, 32], [0.9855, -1, 2, 30], [1.0, -1, 2, 30]];
    const _g = new THREE.Vector3(), _d = new THREE.Vector3(), _u = new THREE.Vector3();
    function cam4(T, out) {
      D.phoneKeys(K, 0, aspect, tC, qT);
      const dh = tC.p.distanceTo(tC.tgt);
      let i = 0;
      while (i < W4K.length - 2 && T > W4K[i + 1][0]) i++;
      const a = W4K[i], b = W4K[i + 1];
      const s = U.smooth(U.range(T, a[0], b[0]));
      const d = U.logLerp(a[1] < 0 ? dh : a[1], b[1] < 0 ? dh : b[1], s);
      const tb = U.lerp(a[2], b[2], s);
      if (tb <= 1) _g.lerpVectors(socW, boardW, tb); else _g.lerpVectors(boardW, tC.tgt, tb - 1);
      const heroDir = _d.copy(tC.p).sub(tC.tgt).normalize();
      const k = U.sstep(0.962, 0.9855, T);
      _d.copy(nrm).lerp(heroDir, k).normalize();
      _u.copy(phUp).lerp(UP, k).normalize();
      return D.zoom(out, _g, _d, _u, d, U.lerp(a[3], b[3], s));
    }
    function stage4(T) {
      const R = [[0.936, 0.945, 0, 1], [0.952, 0.958, 1, 2], [0.962, 0.967, 2, 3], [0.97, 0.975, 3, 4], [0.978, 0.9855, 4, 5]];
      let st = 0;
      for (const [t0, t1, a, b] of R) if (T >= t0) st = U.lerp(a, b, U.smooth(U.range(T, t0, t1)));
      return st;
    }
    /* atom hand-off: world-3 atom points mapped into world-4 at Tx */
    function buildReturn() {
      const Tx = 0.93;
      cam3(Tx, tA);
      cam4(Tx, tB);
      const d3 = tA.p.length(), d4 = tB.p.distanceTo(socW);
      const C3 = new THREE.Matrix4().compose(tA.p, tA.q, V(1, 1, 1));
      const C4 = new THREE.Matrix4().compose(tB.p, tB.q, V(1, 1, 1));
      const k = d4 / d3;
      const M = C4.clone().multiply(new THREE.Matrix4().makeScale(k, k, k)).multiply(C3.clone().invert());
      const pts = W[3].samplePoints(4000).map((p) => { const v = V(p[0], p[1], p[2]).applyMatrix4(M); return [v.x, v.y, v.z]; });
      W[4].build({ rootMatrix: heroRoot, atomPts: pts });
    }

    /* carve the flight corridor out of the interconnect stack */
    {
      const pts = [];
      for (let t = 0.662; t <= 0.761; t += 0.0004) { cam1(t, tA); pts.push(tA.p.clone()); }
      W[1].clearPath(pts);
    }

    return { cam0, cam1, cam2, cam3, cam4, stage4, phoneQuat, setAspect, buildReturn, updateE1, focusShot, get aspect() { return aspect; }, get keys() { return K; }, socW, qHero };
  }

  return { create, spline };
});
