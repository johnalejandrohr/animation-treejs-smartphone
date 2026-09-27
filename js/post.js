/* ==========================================================================
   KYVEN K1 — post-processing pipeline
   DualScenePass renders one or two worlds and cross-fades them with a
   radial "warp" blur (the powers-of-ten transition), then bloom, tone
   mapping and a filmic grade (vignette, grain, chromatic aberration).
   ========================================================================== */
NX.def('post', function (THREE, A, NX) {
  'use strict';
  const { EffectComposer, UnrealBloomPass, OutputPass, ShaderPass, Pass, FullScreenQuad } = A;
  const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

  class DualScenePass extends Pass {
    constructor(samples) {
      super();
      const o = { type: THREE.HalfFloatType, samples };
      this.rtA = new THREE.WebGLRenderTarget(4, 4, o);
      this.rtB = new THREE.WebGLRenderTarget(4, 4, o);
      this.a = null;
      this.b = null;
      this.mix = 0;
      this.uniforms = {
        tA: { value: null }, tB: { value: null }, uMix: { value: 0 }, uBlur: { value: 0 },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uFlash: { value: 0 }, uTime: NX.sh.G.uTime,
      };
      this.quad = new FullScreenQuad(new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: VERT,
        fragmentShader: /* glsl */ `
          uniform sampler2D tA, tB; uniform float uMix, uBlur, uFlash, uTime; uniform vec2 uCenter; varying vec2 vUv;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
          // specular spikes can overflow the half-float target to Inf/NaN; bloom would smear
          // that into a huge rect and tone mapping turns it black, so clamp before anything blurs
          vec3 fetch(sampler2D t, vec2 uv){
            vec3 c = texture2D(t, uv).rgb;
            c = mix(c, vec3(0.0), vec3(isnan(c)));
            return clamp(c, 0.0, 64.0);
          }
          vec3 warp(sampler2D t, vec2 uv, float amt, float j){
            if (amt < 0.0005) return fetch(t, uv);
            vec2 d = uv - uCenter; vec3 acc = vec3(0.0); float ws = 0.0;
            for (int i = 0; i < 14; i++){
              float f = (float(i) + j) / 14.0;
              float w = 1.0 - 0.6 * f;
              acc += fetch(t, uCenter + d * (1.0 - amt * f)) * w; ws += w;
            }
            return acc / ws;
          }
          void main(){
            float j = hash(gl_FragCoord.xy + fract(uTime * 3.7) * 91.0);
            vec3 c = warp(tA, vUv, uBlur, j);
            if (uMix > 0.0) c = mix(c, warp(tB, vUv, uBlur, j), uMix);
            c += uFlash * vec3(0.85, 0.93, 1.0);
            gl_FragColor = vec4(c, 1.0);
          }`,
        depthTest: false, depthWrite: false,
      }));
    }
    setSize(w, h) { this.rtA.setSize(w, h); this.rtB.setSize(w, h); }
    render(renderer, writeBuffer) {
      const m = this.mix;
      const needA = m < 0.999 || !this.b;
      const needB = !!this.b && m > 0.001;
      if (needA) { renderer.setRenderTarget(this.rtA); renderer.clear(); renderer.render(this.a.scene, this.a.camera); }
      if (needB) { renderer.setRenderTarget(this.rtB); renderer.clear(); renderer.render(this.b.scene, this.b.camera); }
      this.uniforms.tA.value = needA ? this.rtA.texture : this.rtB.texture;
      this.uniforms.tB.value = this.rtB.texture;
      this.uniforms.uMix.value = needA && needB ? m : 0;
      renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
      this.quad.render(renderer);
    }
    dispose() { this.rtA.dispose(); this.rtB.dispose(); this.quad.dispose(); }
  }

  const GradeShader = {
    uniforms: {
      tDiffuse: { value: null }, uTime: NX.sh.G.uTime, uVignette: { value: 0.85 }, uGrain: { value: 0.035 },
      uCA: { value: 0.0025 }, uFade: { value: 0 }, uAspect: { value: 1.6 },
    },
    vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain, uCA, uFade, uAspect; varying vec2 vUv;
      float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main(){
        vec2 d = vUv - 0.5;
        vec2 da = d * vec2(uAspect, 1.0);
        float r2 = dot(da, da);
        vec2 off = d * uCA * (0.35 + 2.0 * r2);
        vec3 c = vec3(texture2D(tDiffuse, vUv - off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + off).b);
        float v = smoothstep(1.35, 0.15, length(d * vec2(uAspect * 0.72, 1.0)) * 1.25);
        c *= mix(1.0, v, uVignette);
        c += (hash(gl_FragCoord.xy + fract(uTime * 13.1) * 311.0) - 0.5) * uGrain;
        c *= 1.0 - uFade;
        gl_FragColor = vec4(c, 1.0);
      }`,
  };

  function create(renderer, o = {}) {
    const composer = new EffectComposer(renderer);
    const dual = new DualScenePass(o.samples ?? 4);
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.65, 0.82);
    const output = new OutputPass();
    const grade = new ShaderPass(GradeShader);
    composer.addPass(dual);
    composer.addPass(bloom);
    composer.addPass(output);
    composer.addPass(grade);
    return {
      composer, dual, bloom, output, grade,
      setSize(w, h, dpr) {
        composer.setPixelRatio(dpr);
        composer.setSize(w, h);
        grade.uniforms.uAspect.value = w / h;
      },
      render() { composer.render(); },
    };
  }

  return { create };
});
