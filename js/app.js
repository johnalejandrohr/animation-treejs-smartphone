/* ==========================================================================
   KYVEN K1 — application: boot, render loop, story / explore / demo modes
   ========================================================================== */
NX.def('app', function (THREE, A, NX) {
  'use strict';
  const U = NX.U, D = NX.dir;
  const app = { mode: 'story', time: 0 };
  const body = document.body;
  let renderer, post, W, J, stage, ui, input, controls, tier;
  let T = 0, Tt = 0, last = 0, player = null, blend = null, eBlend = null;
  let fade = 0, fadeAnim = null, intro = 0, introT0 = 0, scrollFrame = 0;
  const idle = { w: 1, ang: 0 };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hover = null;
  const ex = { e: 0, eTarget: 0, focusId: null, panelId: null, focusW: 0, tween: null, overview: null, entryQ: new THREE.Quaternion(), exQ: new THREE.Quaternion(),
    state: { e: 0, foci: [{ id: 'board', w: 0 }], fx: { battery: 0, cooling: 0, board: 0, camera: 0 }, iso: 0, lid: 0 } };
  const REST = [0, 0.08, 0.135, 0.18, 0.37, 0.42, 0.485, 0.55, 0.612, 0.705, 0.795, 0.912, 1];

  /* ------------------------------------------------ demo timing */
  const CUM = [0];
  D.DEMO_SECS.forEach((s) => CUM.push(CUM[CUM.length - 1] + s));
  const TOTAL = CUM[CUM.length - 1];
  function secToT(sec) {
    for (let i = 0; i < D.DEMO_SECS.length; i++) if (sec < CUM[i + 1]) return U.lerp(D.STAGES[i], D.STAGES[i + 1], (sec - CUM[i]) / D.DEMO_SECS[i]);
    return 1;
  }
  function tToSec(t) {
    for (let i = 0; i < D.DEMO_SECS.length; i++) if (t < D.STAGES[i + 1]) return CUM[i] + ((t - D.STAGES[i]) / (D.STAGES[i + 1] - D.STAGES[i])) * D.DEMO_SECS[i];
    return TOTAL;
  }

  /* ------------------------------------------------ scroll sync */
  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const progress = () => U.clamp(scrollY / maxScroll());
  function syncScroll(t) { window.scrollTo(0, Math.round(t * maxScroll())); }
  function setT(t) { T = Tt = t; syncScroll(t); }
  app.onScroll = () => { if (!player && app.mode === 'story') Tt = progress(); };
  app.userScrollIntent = () => { if (player) stopPlayer(); };
  app.userActivity = () => {};
  app.step = (dir) => {
    if (app.mode !== 'story') return;
    if (player) stopPlayer();
    const cur = Tt;
    const next = dir > 0 ? REST.find((r) => r > cur + 0.004) : [...REST].reverse().find((r) => r < cur - 0.004);
    if (next !== undefined) app.jump(next);
  };
  app.jump = (t) => { if (app.mode === 'story') window.scrollTo({ top: t * maxScroll(), behavior: 'smooth' }); };

  function fadeThrough(fn, dur = 0.9) { fadeAnim = { t: 0, dur, fn, fired: false }; }

  /* ------------------------------------------------ player (demo / journey) */
  function startDemo() {
    if (app.mode === 'explore') leaveExplore(false);
    const go = () => { setT(0); player = { sec: 0, kind: 'demo' }; body.classList.add('demo', 'cinema'); setDemoLabel(); input.reset(); };
    if (T > 0.02) fadeThrough(go); else go();
  }
  function stopPlayer() {
    if (!player) return;
    player = null;
    body.classList.remove('demo', 'cinema');
    syncScroll(T);
    Tt = T;
    setDemoLabel();
  }
  app.toggleDemo = () => (player && player.kind === 'demo' ? stopPlayer() : startDemo());
  function setDemoLabel() { ui.el && (document.querySelector('#btn-demo .bl').textContent = player && player.kind === 'demo' ? 'STOP DEMO' : 'AUTO DEMO'); }

  /* ------------------------------------------------ explore mode */
  function capturePose() {
    const c = W[0].camera, P = D.pose();
    P.p.copy(c.position); P.q.copy(c.quaternion); P.fov = c.fov;
    P.tgt.copy(app.mode === 'explore' ? controls.target : stage.poses[0].tgt);
    P.rootQ = W[0].phone.root.quaternion.clone();
    return P;
  }
  function enterExplore(focusId) {
    if (app.mode === 'explore') { if (focusId) select(focusId); return; }
    stopPlayer();
    const go = () => {
      const s = stage.story(T);
      ex.e = s.e;
      ex.eTarget = s.e > 0.5 ? 1 : 0;
      ex.entryQ.copy(W[0].phone.root.quaternion);
      ex.exQ.copy(J.keys[J.keys.length - 1].q);
      controls.target.copy(stage.poses[0].tgt);
      app.mode = 'explore';
      body.classList.add('explore', 'locked');
      controls.enabled = true;
      controls.update();
      ex.overview = null;
      input.reset();
      if (focusId) select(focusId);
      setDisasmLabel();
    };
    if (T > 0.6) fadeThrough(() => { setT(0.37); renderOnce(); go(); }); else go();
  }
  function leaveExplore(withBlend = true) {
    if (app.mode !== 'explore') return;
    const from = capturePose();
    app.mode = 'story';
    body.classList.remove('explore', 'locked', 'hovering');
    controls.enabled = false;
    ex.tween = null;
    ex.focusId = null;
    ex.panelId = null;
    ex.focusW = 0;
    if (withBlend) { blend = { from, w: 0, dur: 1.4 }; eBlend = { from: ex.e, w: 0 }; }
    Tt = T;
    syncScroll(T);
  }
  app.toggleExplore = () => (app.mode === 'explore' ? leaveExplore() : enterExplore());
  function setDisasmLabel() { document.querySelector('#btn-disasm').textContent = ex.eTarget > 0.5 ? 'ASSEMBLE' : 'DISASSEMBLE'; }
  app.toggleExplode = () => {
    if (app.mode !== 'explore') return;
    ex.eTarget = ex.eTarget > 0.5 ? 0 : 1;
    if (ex.focusId) { ex.focusId = null; ex.overview = null; }
    const P = D.pose();
    D.phoneKeys(J.keys, ex.eTarget ? 0.37 : 0.06, J.aspect, P, new THREE.Quaternion());
    ex.tween = { from: { p: W[0].camera.position.clone(), tgt: controls.target.clone() }, t: 0, dur: 2.2, dest: { p: P.p.clone(), tgt: P.tgt.clone() } };
    controls.enabled = false;
    setDisasmLabel();
  };
  function focusDest(id) {
    if (id === 'battery' || id === 'cooling' || id === 'board') { const P = J.focusShot(id, D.pose()); return { p: P.p, tgt: P.tgt }; }
    const f = W[0].phone.focusPose(id, W[0].camera, { margin: id === 'soc' || id === 'memory' ? 1.9 : 1.3 });
    return { p: f.pos, tgt: f.target };
  }
  function select(id) {
    if (id === ex.focusId) return;
    if (!ex.focusId) ex.overview = { p: W[0].camera.position.clone(), tgt: controls.target.clone() };
    ex.focusId = id;
    ex.panelId = id;
    if (ex.eTarget < 0.5 && !['glass', 'back', 'frame'].includes(id)) { ex.eTarget = 1; setDisasmLabel(); }
    ex.tween = { from: { p: W[0].camera.position.clone(), tgt: controls.target.clone() }, t: 0, dur: 1.6, id };
    controls.enabled = false;
  }
  function unselect() {
    if (!ex.focusId) return;
    ex.focusId = null;
    const back = ex.overview || { p: W[0].camera.position.clone().multiplyScalar(1.6), tgt: new THREE.Vector3() };
    ex.tween = { from: { p: W[0].camera.position.clone(), tgt: controls.target.clone() }, t: 0, dur: 1.4, dest: back };
    ex.overview = null;
    controls.enabled = false;
  }
  function startJourney() {
    const from = capturePose();
    const e0 = ex.e;
    app.mode = 'story';
    body.classList.remove('explore', 'locked', 'hovering');
    controls.enabled = false;
    ex.tween = null; ex.focusId = null; ex.panelId = null; ex.focusW = 0;
    setT(0.575);
    blend = { from, w: 0, dur: 1.8 };
    eBlend = { from: e0, w: 0 };
    player = { sec: tToSec(0.575), kind: 'journey' };
  }
  app.escape = () => {
    if (player) return stopPlayer();
    if (app.mode === 'explore') return ex.focusId ? unselect() : leaveExplore();
    body.classList.remove('hide-ui');
  };

  function exploreUpdate(dt) {
    const dir = ex.eTarget > ex.e ? 1 : -1;
    ex.e = U.clamp(ex.e + (dir * dt) / 2.4);
    if (Math.abs(ex.e - ex.eTarget) < 0.002) ex.e = ex.eTarget;
    ex.focusW = U.damp(ex.focusW, ex.focusId ? 1 : 0, 3, dt);
    if (ex.focusId) ex.state.foci[0].id = ex.focusId;
    if (!ex.focusId && ex.focusW < 0.02) ex.panelId = null;
    const fid = ex.state.foci[0].id, fw = ex.focusW;
    ex.state.e = ex.e;
    ex.state.foci[0].w = fw * U.sstep(0.6, 1, ex.e);
    const F = ex.state.fx;
    F.battery = fid === 'battery' ? fw : 0;
    F.cooling = fid === 'cooling' ? fw : 0;
    F.board = fid === 'board' || fid === 'soc' || fid === 'memory' ? fw : 0;
    F.camera = fid === 'camera' ? fw : 0;
    ex.state.lid = fid === 'soc' ? fw : 0;
    const root = W[0].phone.root;
    root.quaternion.slerp(ex.e > 0.02 || ex.eTarget > 0.5 ? ex.exQ : ex.entryQ, 1 - Math.exp(-2.2 * dt));
    const cam = W[0].camera;
    if (ex.tween) {
      const tw = ex.tween;
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const u = U.ease.inOutCubic(tw.t);
      const d = tw.id ? focusDest(tw.id) : tw.dest;
      cam.position.lerpVectors(tw.from.p, d.p, u);
      controls.target.lerpVectors(tw.from.tgt, d.tgt, u);
      cam.lookAt(controls.target);
      if (tw.t >= 1) { ex.tween = null; controls.enabled = true; }
    } else controls.update();
    if (Math.abs(cam.fov - 32) > 0.01) { cam.fov = U.damp(cam.fov, 32, 4, dt); cam.updateProjectionMatrix(); }
  }

  /* ------------------------------------------------ picking */
  function pick(x, y) {
    const w0 = W[0];
    ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, w0.camera);
    const hits = ray.intersectObjects(w0.phone.pickables, false);
    for (const h of hits) {
      let o = h.object, ok = true;
      while (o) { if (!o.visible) { ok = false; break; } o = o.parent; }
      const part = w0.phone.parts[h.object.userData.part];
      if (ok && part && part.fade > 0.3) return { id: part.id, point: h.point };
    }
    return null;
  }
  const canPick = () => app.mode === 'explore' || (!player && T < 0.575 && T > 0.035);
  app.hover = (x, y) => {
    if (!canPick() || fadeAnim) { if (hover) { hover = null; body.classList.remove('hovering'); } return; }
    hover = pick(x, y);
    body.classList.toggle('hovering', !!hover);
  };
  app.click = (x, y) => {
    if (fadeAnim) return;
    if (!canPick()) return;
    const h = pick(x, y);
    if (app.mode === 'explore') { if (h) select(h.id); else if (ex.focusId) unselect(); return; }
    if (h) enterExplore(h.id);
  };

  /* ------------------------------------------------ sizing / quality */
  let dpr = 1, frames = 0, acc = 0, slowWin = 0, fastWin = 0, lastW = 0, lastAspect = 0;
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    post.setSize(w, h, dpr);
    for (const wd of W) { wd.camera.aspect = w / h; wd.camera.updateProjectionMatrix(); }
    NX.sh.G.uViewportH.value = h * dpr;
    ui.resize();
    // mobile address bars fire resize constantly: only re-author paths on real layout changes
    if (w !== lastW || Math.abs(w / h - lastAspect) / (lastAspect || 1) > 0.12) {
      lastW = w;
      lastAspect = w / h;
      J.setAspect(w / h);
      J.buildReturn();
      const keep = progress();
      document.getElementById('scroll-space').style.height = Math.round(h * 15) + 'px';
      if (app.mode === 'story' && !player) syncScroll(keep);
    }
  }
  function adapt(dt) {
    frames++; acc += dt;
    if (acc < 1.5) return;
    const avg = acc / frames;
    frames = 0; acc = 0;
    if (avg > 0.028 && dpr > tier.dprMin) { if (++slowWin >= 2) { dpr = Math.max(tier.dprMin, dpr - 0.2); slowWin = 0; resize(); } }
    else slowWin = 0;
    if (avg < 0.0135 && dpr < tier.dprMax) { if (++fastWin >= 3) { dpr = Math.min(tier.dprMax, dpr + 0.15); fastWin = 0; resize(); } }
    else fastWin = 0;
  }

  /* ------------------------------------------------ frame */
  function frameState(dt) {
    return {
      T, time: app.time, dt, mode: app.mode, explore: ex.state, user: app.mode === 'story' ? input.user : null, idle, intro, fade,
      blendFrom: blend ? blend.from : null, blendW: blend ? blend.w : 1, eBlend, captions: true, playing: !!player,
      hover: hover ? hover.id : null, hoverLabel: hover ? { text: W[0].phone.parts[hover.id].name, point: hover.point } : null,
      focusId: ex.panelId, focusW: ex.focusW, target: controls.target,
    };
  }
  function renderOnce() { stage.frame(frameState(0.016)); post.render(); }

  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000 || 0.016, 0.05);
    last = now;
    app.time += dt;
    NX.sh.G.uTime.value = app.time;
    input.update(dt);
    if (player) {
      player.sec += dt;
      Tt = Math.min(1, secToT(player.sec));
      if (++scrollFrame % 12 === 0) syncScroll(T);
      if (player.sec > TOTAL + 2.8) stopPlayer();
    }
    T = U.damp(T, Tt, player ? 9 : U.reducedMotion ? 10 : 3.4, dt);
    if (Math.abs(T - Tt) < 1e-6) T = Tt;
    const wantIdle = app.mode === 'story' && !U.reducedMotion && !blend && (T < 0.045 || (T > 0.997 && !player));
    idle.w = U.damp(idle.w, wantIdle ? 1 : 0, wantIdle ? 0.7 : 2.4, dt);
    idle.ang += dt * 0.26 * idle.w;
    if (idle.ang > Math.PI) idle.ang -= U.TAU;
    if (idle.w < 0.002) idle.ang = 0;
    intro = U.reducedMotion ? 1 : U.ease.inOutCubic(U.clamp((app.time - introT0) / 3.6));
    if (blend) { blend.w += dt / blend.dur; if (blend.w >= 1) blend = null; }
    if (eBlend) { eBlend.w += dt / 1.6; if (eBlend.w >= 1) eBlend = null; }
    if (fadeAnim) {
      fadeAnim.t += dt / fadeAnim.dur;
      if (fadeAnim.t >= 0.5 && !fadeAnim.fired) { fadeAnim.fired = true; fadeAnim.fn(); }
      fade = Math.sin(Math.min(fadeAnim.t, 1) * Math.PI);
      if (fadeAnim.t >= 1) { fadeAnim = null; fade = 0; }
    }
    if (app.mode === 'explore') exploreUpdate(dt);
    stage.frame(frameState(dt));
    post.render();
    adapt(dt);
  }

  /* ------------------------------------------------ boot */
  app.start = async function () {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    ui = NX.ui;
    ui.progress(0.04, 'INITIALIZING');
    const fontWait = document.fonts ? Promise.race([document.fonts.ready, U.wait(2500)]) : Promise.resolve();
    await fontWait;
    app.canvas = document.getElementById('gl');
    renderer = new THREE.WebGLRenderer({ canvas: app.canvas, antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false });
    if (!renderer.capabilities.isWebGL2) throw new Error('WebGL 2 is required');
    const low = U.mobile || (navigator.hardwareConcurrency || 8) <= 4;
    tier = { low, shadows: !low, samples: low ? 2 : 4, dprMax: low ? 1.6 : 2, dprMin: low ? 0.75 : 0.85 };
    dpr = Math.min(devicePixelRatio || 1, low ? 1.35 : 1.5);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = tier.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(dpr);
    renderer.setSize(innerWidth, innerHeight, false);
    const step = async (p, msg) => { ui.progress(p, msg); await U.nextFrame(); await U.nextFrame(); };

    await step(0.1, 'FORGING TITANIUM FRAME');
    const T0 = NX.tex, layout = T0.dieLayout();
    const tex = { lib: T0, screen: T0.screenUI(), touch: T0.touchGrid(), rings: T0.lensRings(), backRough: T0.backGlass(3.525, 7.525), lattice: T0.latticeDots(), die: Object.assign(T0.dieTextures(layout), { layout }) };
    const assets = { tex, studioEnv: NX.env.studio(renderer), labEnv: NX.env.lab(renderer) };
    await step(0.22, 'ASSEMBLING KYVEN K1');
    const w0 = NX.worldPhone.create(renderer, assets, tier);
    await step(0.4, 'ETCHING 42 BILLION TRANSISTORS');
    const w1 = NX.worldChip.create(renderer, assets, tier);
    await step(0.52, 'DOPING THE SILICON');
    const w2 = NX.worldTransistor.create(renderer, assets, tier);
    await step(0.62, 'GROWING THE CRYSTAL LATTICE');
    const w3 = NX.worldAtom.create(renderer, assets, tier);
    await step(0.7, 'ENCODING DATA');
    const w4 = NX.worldData.create(renderer, assets, tier);
    W = [w0, w1, w2, w3, w4];
    post = NX.post.create(renderer, { samples: tier.samples });
    J = NX.journey.create({ worlds: W });
    stage = NX.stage.create({ worlds: W, post, ui, J });
    controls = new A.OrbitControls(w0.camera, app.canvas);
    controls.enabled = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 2;
    controls.maxDistance = 60;
    input = NX.input.create(app);
    resize();
    window.addEventListener('resize', () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 120); });

    await step(0.8, 'CALIBRATING LIGHT');
    const warm = [0.0, 0.2, 0.37, 0.42, 0.6, 0.655, 0.7, 0.755, 0.8, 0.85, 0.9, 0.93, 0.96, 0.99];
    for (let i = 0; i < warm.length; i++) {
      T = Tt = warm[i];
      renderOnce();
      if (i % 3 === 2) await step(0.8 + (0.18 * i) / warm.length, 'COMPILING SHADERS');
    }
    T = Tt = progress();
    if (T > 0.02) T = Tt = 0, syncScroll(0);
    idle.w = U.reducedMotion ? 0 : 1;
    await step(1, 'READY');

    /* buttons */
    const on = (sel, fn) => document.querySelector(sel).addEventListener('click', (e) => { e.stopPropagation(); fn(); });
    on('#btn-demo', app.toggleDemo);
    on('#btn-explore', app.toggleExplore);
    on('#btn-disasm', app.toggleExplode);
    on('#btn-exit', () => leaveExplore());
    on('.panel-cta', startJourney);
    on('#btn-replay', startDemo);

    body.classList.remove('loading');
    introT0 = app.time;
    setTimeout(() => body.classList.add('ready'), 500);
    last = performance.now();
    requestAnimationFrame(loop);

    window.NX_DEBUG = {
      setT: (t) => { stopPlayer(); setT(t); },
      get T() { return T; },
      demo: startDemo,
      explore: enterExplore,
      select: (id) => select(id),
      toggleExplode: () => app.toggleExplode(),
      skipIntro: () => { introT0 = -10; },
      setIntro: (v) => { introT0 = app.time - v * 3.6; },
      renderOnce,
      get W() { return W; },
      get J() { return J; },
      info: () => ({ dpr, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, mode: app.mode }),
      cost: () => { renderer.info.autoReset = false; renderer.info.reset(); renderOnce(); const r = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures, progs: renderer.info.programs.length }; renderer.info.autoReset = true; return r; },
    };
  };

  return app;
});
