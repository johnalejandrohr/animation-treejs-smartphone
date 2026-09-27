/* ==========================================================================
   KYVEN K1 — WORLD 0: the phone in its studio (macro scale)
   ========================================================================== */
NX.def('worldPhone', function (THREE, A, NX) {
  'use strict';
  const U = NX.U;

  function create(renderer, assets, tier) {
    const scene = new THREE.Scene();
    scene.environment = assets.studioEnv;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 600);
    camera.position.set(0, 0.4, 16);

    const backdrop = NX.sh.backdrop({ top: 0x030405, mid: 0x07090c, bot: 0x010102, glow: 0x0f141c });
    scene.add(backdrop);
    const dust = NX.env.dust(tier.low ? 260 : 620, [15, 10, 11], { size: 0.04, opacity: 0.32, drift: 0.7 });
    scene.add(dust);
    const shafts = NX.env.shafts({ opacity: 0.05 });
    scene.add(shafts);

    const key = new THREE.DirectionalLight(0xfff3e8, 1.6);
    key.position.set(-6, 9, 8);
    if (tier.shadows) {
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      const c = key.shadow.camera;
      c.left = -9; c.right = 9; c.top = 9; c.bottom = -9; c.near = 1; c.far = 40;
      key.shadow.bias = -0.0004;
      key.shadow.normalBias = 0.02;
      key.shadow.radius = 4;
    }
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(0xc4d8ff, 1.2);
    rim.position.set(7, 3, -8);
    scene.add(rim);
    const hemi = new THREE.HemisphereLight(0xa9bfdc, 0x07080a, 0.25);
    scene.add(hemi);

    const phone = NX.phone.create(assets.tex);
    scene.add(phone.root);

    const fwd = new THREE.Vector3();
    function update(s) {
      phone.update(s);
      camera.getWorldDirection(fwd);
      backdrop.material.uniforms.uGlowDir.value.copy(fwd);
      backdrop.position.copy(camera.position);
      dust.position.set(0, 0, 0);
      shafts.update(camera);
      shafts.visible = (s.shafts ?? 1) > 0.01;
      shafts.userData.material.uniforms.uOpacity.value = 0.05 * (s.shafts ?? 1);
      dust.material.uniforms.uOpacity.value = 0.32 * (s.dust ?? 1);
      scene.environmentIntensity = s.envI ?? 1;
      scene.environmentRotation.set(0, s.envRot ?? 0, 0);
      key.intensity = 1.6 * (s.envI ?? 1);
      phone.parts.display.screen.uniforms.uBright.value = s.screen ?? 1;
      rim.intensity = 1.2 * (s.envI ?? 1);
    }

    return { scene, camera, phone, backdrop, dust, shafts, key, update };
  }

  return { create };
});
