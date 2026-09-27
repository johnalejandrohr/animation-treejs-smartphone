/* ==========================================================================
   KYVEN K1 — director (part 1): pose maths, story timeline, phone shots.
   Everything visual is a pure function of the story time T ∈ [0, 1]
   (plus ambient animation), which makes scroll scrubbing, the auto demo
   and the SoC "journey" the same code path.
   ========================================================================== */
NX.def('dir', function (THREE, A, NX) {
  'use strict';
  const U = NX.U;
  const DEG = Math.PI / 180;

  /* --------------------------------------------------------------- poses */
  const pose = () => ({ p: new THREE.Vector3(), q: new THREE.Quaternion(), fov: 32, tgt: new THREE.Vector3() });
  const _m = new THREE.Matrix4(), _t = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
  function look(out, pos, tgt, up, fov) {
    out.p.copy(pos);
    out.tgt.copy(tgt);
    _m.lookAt(pos, tgt, up);
    out.q.setFromRotationMatrix(_m);
    out.fov = fov;
    return out;
  }
  function lerpPose(out, a, b, t) {
    out.p.lerpVectors(a.p, b.p, t);
    out.tgt.lerpVectors(a.tgt, b.tgt, t);
    out.q.slerpQuaternions(a.q, b.q, t);
    out.fov = U.lerp(a.fov, b.fov, t);
    return out;
  }
  /* E maps child-world coords -> parent-world coords (uniform scale) */
  function mapPose(out, a, E) {
    E.decompose(_t, _q, _s);
    out.p.copy(a.p).applyMatrix4(E);
    out.tgt.copy(a.tgt).applyMatrix4(E);
    out.q.copy(_q).multiply(a.q);
    out.fov = a.fov;
    return out;
  }
  function copyPose(out, a) { out.p.copy(a.p); out.q.copy(a.q); out.tgt.copy(a.tgt); out.fov = a.fov; return out; }
  const _dir = new THREE.Vector3();
  function zoom(out, tgt, dir, up, dist, fov) {
    _dir.copy(dir).normalize().multiplyScalar(dist).add(tgt);
    return look(out, _dir, tgt, up, fov);
  }
  function fitDist(Rv, Rw, fov, aspect) {
    const v = (fov * DEG) / 2;
    const h = Math.atan(Math.tan(v) * aspect);
    return Math.max(Rv / Math.tan(v), Rw / Math.tan(h));
  }
  function applyPose(cam, P, near, far) {
    cam.position.copy(P.p);
    cam.quaternion.copy(P.q);
    let dirty = false;
    if (Math.abs(cam.fov - P.fov) > 1e-4) { cam.fov = P.fov; dirty = true; }
    if (near && Math.abs(cam.near - near) / near > 0.05) { cam.near = near; dirty = true; }
    if (far && Math.abs(cam.far - far) / far > 0.05) { cam.far = far; dirty = true; }
    if (dirty) cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }

  /* ------------------------------------------------------------ timeline */
  const X = [
    { a: 0, b: 1, t0: 0.646, t1: 0.662 },
    { a: 1, b: 2, t0: 0.747, t1: 0.761 },
    { a: 2, b: 3, t0: 0.845, t1: 0.855 },
    { a: 3, b: 4, t0: 0.924, t1: 0.936 },
    { a: 4, b: 0, t0: 0.985, t1: 0.998 },
  ];
  function worldsAt(T) {
    for (const x of X) if (T >= x.t0 && T < x.t1) return { a: x.a, b: x.b, m: U.smoother(U.range(T, x.t0, x.t1)), x };
    const a = T < 0.646 ? 0 : T < 0.747 ? 1 : T < 0.845 ? 2 : T < 0.924 ? 3 : T < 0.985 ? 4 : 0;
    return { a, b: -1, m: 0, x: null };
  }
  const STAGES = [0, 0.06, 0.2, 0.38, 0.58, 0.66, 0.76, 0.853, 0.936, 1];
  const DEMO_SECS = [3.8, 6.6, 6.8, 9.6, 5.0, 5.4, 6.0, 5.4, 7.2];
  const CAPS = [
    [0.07, 0.125, 'This is the phone.'],
    [0.215, 0.33, 'Let’s look inside.'],
    [0.585, 0.64, 'Let’s enter the processor.'],
    [0.675, 0.735, 'Let’s see how it works.'],
    [0.772, 0.832, 'Let’s go inside a transistor.'],
    [0.862, 0.915, 'All the way down to silicon.'],
    [0.94, 0.972, 'Now, let’s go back.'],
    [0.99, 1.01, 'It all started with a smartphone.'],
  ];
  const SCALE = [[0, 0.3], [0.2, 0.2], [0.37, 0.42], [0.58, 0.09], [0.62, 0.035], [0.66, 0.012], [0.7, 3e-3], [0.72, 2e-4], [0.745, 1.5e-6], [0.761, 1.2e-7], [0.83, 8e-8], [0.853, 2.2e-9], [0.9, 1.1e-9], [0.93, 6e-10], [0.936, 6e-10], [0.95, 3e-9], [0.962, 1e-6], [0.97, 1.5e-2], [0.988, 0.3], [1, 0.3]];
  function scaleAt(T) {
    for (let i = 1; i < SCALE.length; i++) if (T <= SCALE[i][0]) {
      const [t0, a] = SCALE[i - 1], [t1, b] = SCALE[i];
      return U.logLerp(a, b, U.smooth(U.range(T, t0, t1)));
    }
    return 0.3;
  }
  function captionAt(T) { for (const c of CAPS) if (T >= c[0] && T < c[1]) return c[2]; return ''; }
  function levelAt(T) { return T < 0.2 ? 0 : T < 0.58 ? 1 : T < 0.761 ? 2 : T < 0.853 ? 3 : T < 0.975 ? 4 : 0; }

  /* ------------------------------------------------------ phone story */
  const eul = new THREE.Euler(0, 0, 0, 'YXZ');
  const qFrom = (r) => new THREE.Quaternion().setFromEuler(eul.set(r[1], r[0], r[2], 'YXZ'));
  const HERO_ROT = [0.36, -0.07, 0.035];
  function exRot(aspect) { return aspect >= 0.9 ? [-1.05, -0.18, 0.06] : [0.22, -1.2, 0.0]; }
  function exDir(aspect) { return aspect >= 0.9 ? [0.02, 0.16, 1] : [0, 0.22, 1]; }

  function buildKeys(aspect) {
    const land = aspect >= 0.9;
    const ex = exRot(aspect), ed = exDir(aspect);
    const K = [
      { t: 0.0, rot: HERO_ROT, tgt: [0, -1.3, 0], dir: [0, 0.05, 1], Rv: 6.6, Rw: 3.0, fov: 30 },
      { t: 0.06, rot: [0.5, -0.09, 0.04], tgt: [0, -0.8, 0], dir: [0.04, 0.06, 1], Rv: 5.8, Rw: 2.9, fov: 30 },
      { t: 0.1, rot: [-0.5, -0.06, -0.03], tgt: [0.1, -0.2, 0], dir: [-0.08, 0.1, 1], Rv: 5.5, Rw: 2.8, fov: 30 },
      { t: 0.135, rot: [-1.18, -0.06, 0.02], tgt: [0, 0.2, 0], dir: [0.16, 0.08, 1], Rv: 4.2, Rw: 2.6, fov: 30 },
      { t: 0.162, rot: [Math.PI - 0.5, -0.12, 0.02], tl: [0, 2.78, -0.2], dir: [0.02, 0.07, 1], Rv: 1.65, Rw: 1.9, fov: 30 },
      { t: 0.198, rot: [Math.PI - 0.28, -0.2, 0.03], tl: [0, 2.6, -0.2], dir: [0.1, 0.12, 1], Rv: 2.3, Rw: 2.6, fov: 30 },
      { t: 0.24, rot: ex, tgt: [0, 0, 0], dir: ed, Rv: 5.0, Rw: 3.4, fov: 28 },
      { t: 0.37, rot: ex, tgt: land ? [-0.35, 0.25, 0] : [0, 0.6, 0], dir: ed, Rv: land ? 6.5 : 6.8, Rw: land ? 9.3 : 3.7, fov: 26 },
    ];
    for (const k of K) { k.q = qFrom(k.rot); k.d = new THREE.Vector3(...k.dir).normalize(); }
    return K;
  }

  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  function keyTarget(k, out) { return k.tl ? out.set(...k.tl).applyQuaternion(k.q) : out.set(...k.tgt); }
  /* phone orientation + camera for T within [0, 0.38] */
  function phoneKeys(K, T, aspect, outPose, outQ) {
    let i = 0;
    while (i < K.length - 2 && T > K[i + 1].t) i++;
    const a = K[i], b = K[i + 1];
    const u = U.smoother(U.range(T, a.t, b.t));
    outQ.slerpQuaternions(a.q, b.q, u);
    keyTarget(a, _a);
    keyTarget(b, _b);
    _c.lerpVectors(_a, _b, u);
    const dir = _a.copy(a.d).lerp(b.d, u).normalize();
    const fov = U.lerp(a.fov, b.fov, u);
    const Rv = U.logLerp(a.Rv, b.Rv, u), Rw = U.logLerp(a.Rw, b.Rw, u);
    const dist = fitDist(Rv, Rw, fov, aspect);
    return zoom(outPose, _c, dir, UP, dist, fov);
  }

  return { pose, look, lerpPose, mapPose, copyPose, zoom, fitDist, applyPose, X, worldsAt, STAGES, DEMO_SECS, CAPS, captionAt, scaleAt, levelAt, qFrom, HERO_ROT, exRot, buildKeys, phoneKeys, UP };
});
