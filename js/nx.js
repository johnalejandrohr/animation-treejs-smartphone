/* ==========================================================================
   KYVEN K1 — core namespace, module registry and math utilities
   Classic script (works from file://). Modules register factories with
   NX.def(name, factory) and receive (THREE, addons, NX) at boot time.
   ========================================================================== */
(function () {
  'use strict';
  const NX = (window.NX = window.NX || {});
  const defs = [];

  NX.def = (name, factory) => defs.push([name, factory]);
  NX.init = (THREE, A) => {
    NX.THREE = THREE;
    NX.A = A;
    for (const [name, factory] of defs) NX[name] = factory(THREE, A, NX);
  };

  const U = {};
  U.clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.range = (x, a, b) => U.clamp((x - a) / (b - a));
  U.smooth = (t) => t * t * (3 - 2 * t);
  U.smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  U.sstep = (a, b, x) => U.smooth(U.range(x, a, b));
  U.sstep2 = (a, b, x) => U.smoother(U.range(x, a, b));
  /* rise between a→b, fall between c→d */
  U.bell = (x, a, b, c, d) => U.sstep(a, b, x) * (1 - U.sstep(c, d, x));
  U.damp = (a, b, lambda, dt) => U.lerp(a, b, 1 - Math.exp(-lambda * dt));
  U.logLerp = (a, b, t) => Math.exp(U.lerp(Math.log(a), Math.log(b), t));
  U.fract = (x) => x - Math.floor(x);
  U.TAU = Math.PI * 2;

  U.ease = {
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    inOutExpo: (t) =>
      t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
  };

  /* deterministic PRNG so procedural geometry is identical on every load */
  U.rng = (seed) => {
    let a = seed >>> 0;
    const r = () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (lo, hi) => lo + (hi - lo) * r();
    r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r());
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.sign = () => (r() < 0.5 ? -1 : 1);
    r.gauss = () => {
      let u = 0, v = 0;
      while (u === 0) u = r();
      while (v === 0) v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(U.TAU * v);
    };
    return r;
  };

  /* critically-damped spring (value + velocity) */
  U.spring = (s, target, stiffness, dt) => {
    const w = Math.sqrt(stiffness);
    const x = s.x - target;
    const k = 1 + 2 * w * dt;
    const v = (s.v - w * w * dt * x) / (k + w * w * dt * dt);
    s.v = v;
    s.x += v * dt;
    return s.x;
  };

  const mq = (q) => window.matchMedia && window.matchMedia(q).matches;
  U.coarse = mq('(pointer: coarse)');
  U.reducedMotion = mq('(prefers-reduced-motion: reduce)');
  U.mobile = U.coarse || Math.min(window.innerWidth, window.innerHeight) < 640;
  U.nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  U.wait = (ms) => new Promise((r) => setTimeout(r, ms));

  NX.U = U;
})();
