/* ==========================================================================
   KYVEN K1 — input: scroll storytelling, drag-to-rotate with inertia,
   pinch / ctrl-wheel zoom, hover + click picking, keyboard shortcuts.
   ========================================================================== */
NX.def('input', function (THREE, A, NX) {
  'use strict';
  const U = NX.U;

  function create(app) {
    const cv = app.canvas;
    const st = { yaw: 0, pitch: 0, zoom: 1, vy: 0, vp: 0, drag: false, idle: 10, ptrs: new Map(), pinch0: 0, zoom0: 1, down: null, mouse: new THREE.Vector2(), hoverTick: 0, hasMouse: false };
    const user = { yaw: 0, pitch: 0, zoom: 1 };

    const interact = () => { st.idle = 0; app.userActivity(); };

    cv.addEventListener('pointerdown', (e) => {
      st.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      st.down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
      if (st.ptrs.size === 2) {
        const [a, b] = [...st.ptrs.values()];
        st.pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
        st.zoom0 = st.zoom;
      }
      if (app.mode !== 'explore') { st.drag = true; st.lastX = e.clientX; st.lastY = e.clientY; }
      interact();
    });
    window.addEventListener('pointermove', (e) => {
      st.mouse.set(e.clientX, e.clientY);
      if (e.pointerType === 'mouse') st.hasMouse = true;
      const p = st.ptrs.get(e.pointerId);
      if (p) { if (st.down) st.down.moved += Math.hypot(e.clientX - p.x, e.clientY - p.y); p.x = e.clientX; p.y = e.clientY; }
      if (app.mode === 'explore') return;
      if (st.ptrs.size === 2) {
        const [a, b] = [...st.ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (st.pinch0 > 0) st.zoom = U.clamp(st.zoom0 * (st.pinch0 / d), 0.45, 1.6);
        interact();
        return;
      }
      if (st.drag && st.ptrs.size === 1) {
        const dx = e.clientX - st.lastX, dy = e.clientY - st.lastY;
        st.lastX = e.clientX; st.lastY = e.clientY;
        const k = 0.0055;
        st.yaw -= dx * k;
        st.pitch = U.clamp(st.pitch - dy * k * 0.6, -0.55, 0.55);
        st.vy = -dx * k * 60;
        st.vp = -dy * k * 36;
        interact();
      }
    });
    const up = (e) => {
      const d = st.down;
      st.ptrs.delete(e.pointerId);
      if (st.ptrs.size < 2) st.pinch0 = 0;
      if (st.ptrs.size === 0) st.drag = false;
      if (d && e.type === 'pointerup' && d.moved < 8 && performance.now() - d.t < 450) app.click(e.clientX, e.clientY);
      st.down = null;
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);

    window.addEventListener('wheel', (e) => {
      if (app.mode === 'explore') return;
      if (e.ctrlKey) { e.preventDefault(); st.zoom = U.clamp(st.zoom * Math.exp(e.deltaY * 0.01), 0.45, 1.6); }
      app.userScrollIntent();
      interact();
    }, { passive: false });
    window.addEventListener('touchstart', () => app.userScrollIntent(), { passive: true });
    window.addEventListener('scroll', () => app.onScroll(), { passive: true });

    window.addEventListener('keydown', (e) => {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      const k = e.key;
      if (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) { e.preventDefault(); app.step(1); }
      else if (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) { e.preventDefault(); app.step(-1); }
      else if (k === 'Home') { e.preventDefault(); app.jump(0); }
      else if (k === 'End') { e.preventDefault(); app.jump(1); }
      else if (k === 'd' || k === 'D') app.toggleDemo();
      else if (k === 'e' || k === 'E') app.toggleExplore();
      else if (k === 'h' || k === 'H') document.body.classList.toggle('hide-ui');
      else if (k === 'x' || k === 'X') app.toggleExplode();
      else if (k === 'Escape') app.escape();
      else return;
      interact();
    });

    function update(dt) {
      st.idle += dt;
      if (!st.drag) {
        st.yaw += st.vy * dt;
        st.pitch = U.clamp(st.pitch + st.vp * dt, -0.55, 0.55);
        st.vy = U.damp(st.vy, 0, 4, dt);
        st.vp = U.damp(st.vp, 0, 4, dt);
        if (st.idle > 1.6) {
          st.yaw = U.damp(st.yaw, 0, 1.3, dt);
          st.pitch = U.damp(st.pitch, 0, 1.3, dt);
          if (st.ptrs.size === 0) st.zoom = U.damp(st.zoom, 1, 1.3, dt);
        }
      }
      const breathe = U.reducedMotion ? 0 : 1;
      const t = app.time;
      user.yaw = st.yaw + breathe * 0.022 * Math.sin(t * 0.11);
      user.pitch = st.pitch + breathe * 0.012 * Math.sin(t * 0.153 + 1);
      user.zoom = st.zoom;
      // throttled hover picking (mouse only)
      if (st.hasMouse && !st.drag && (st.hoverTick = (st.hoverTick + 1) % 3) === 0) app.hover(st.mouse.x, st.mouse.y);
    }
    function reset() { st.yaw = st.pitch = st.vy = st.vp = 0; st.zoom = 1; }

    return { update, user, reset, st };
  }

  return { create };
});
