/* ==========================================================================
   KYVEN K1 — shared GLSL chunks, global uniforms and common materials
   ========================================================================== */
NX.def('sh', function (THREE, A, NX) {
  'use strict';

  /* global uniforms shared by reference across every custom material */
  const G = {
    uTime: { value: 0 },
    uViewportH: { value: 1000 },
    uPixelRatio: { value: 1 },
  };

  const NOISE = /* glsl */ `
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
  vec3 snoise3(vec3 p){ return vec3(snoise(p), snoise(p+vec3(31.4,-17.2,5.9)), snoise(p+vec3(-9.1,23.7,41.3))); }
  float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
  `;

  /* point sprite size in world units -> pixels */
  const POINT_SIZE = /* glsl */ `
  uniform float uViewportH;
  float worldPointSize(float s, vec4 mv){ return s * projectionMatrix[1][1] * uViewportH * 0.5 / max(-mv.z, 0.0001); }
  `;
  const GLOW_FRAG = /* glsl */ `
  float glowDisc(vec2 pc){ vec2 d=pc-0.5; float r=length(d)*2.0; return smoothstep(1.0,0.0,r)*(0.35+0.65*exp(-r*r*6.0)); }
  `;

  /* generic glow particles: attributes position, aSeed; soft twinkle */
  function glowPoints(o = {}) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: G.uTime, uViewportH: G.uViewportH,
        uColor: { value: new THREE.Color(o.color ?? 0xffffff) },
        uSize: { value: o.size ?? 0.05 },
        uOpacity: { value: o.opacity ?? 1 },
        uDrift: { value: o.drift ?? 0 },
      },
      vertexShader: /* glsl */ `
        ${POINT_SIZE}
        uniform float uTime, uSize, uDrift;
        attribute float aSeed;
        varying float vA;
        void main(){
          vec3 p = position;
          p += uDrift * vec3(sin(uTime*0.13+aSeed*40.0), sin(uTime*0.11+aSeed*17.0)*0.6, cos(uTime*0.09+aSeed*23.0));
          vec4 mv = modelViewMatrix * vec4(p,1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = worldPointSize(uSize * (0.5 + aSeed), mv);
          vA = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed) + aSeed * 60.0);
        }`,
      fragmentShader: /* glsl */ `
        ${GLOW_FRAG}
        uniform vec3 uColor; uniform float uOpacity; varying float vA;
        void main(){ float g = glowDisc(gl_PointCoord); gl_FragColor = vec4(uColor * g * vA * uOpacity, 1.0); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  /* giant inverted sphere with a soft vertical gradient + glow */
  function backdrop(o = {}) {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color(o.top ?? 0x05070a) },
        uMid: { value: new THREE.Color(o.mid ?? 0x0c0f15) },
        uBot: { value: new THREE.Color(o.bot ?? 0x020203) },
        uGlow: { value: new THREE.Color(o.glow ?? 0x1a2230) },
        uGlowDir: { value: new THREE.Vector3(0, 0.15, -1).normalize() },
        uIntensity: { value: 1 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop, uMid, uBot, uGlow, uGlowDir; uniform float uIntensity; varying vec3 vDir;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
        void main(){
          float y = vDir.y;
          vec3 c = y > 0.0 ? mix(uMid, uTop, smoothstep(0.0, 0.7, y)) : mix(uMid, uBot, smoothstep(0.0, 0.5, -y));
          float g = pow(max(dot(normalize(vDir), uGlowDir), 0.0), 6.0);
          c += uGlow * g;
          c *= uIntensity;
          c += (h(gl_FragCoord.xy) - 0.5) / 255.0;
          gl_FragColor = vec4(c, 1.0);
        }`,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const m = new THREE.Mesh(new THREE.SphereGeometry(o.radius ?? 400, 48, 24), mat);
    m.frustumCulled = false;
    m.renderOrder = -1000;
    return m;
  }

  /* fresnel glow material (supports instancing + instanceColor) */
  function rimMaterial(o = {}) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(o.color ?? 0x8fc8ff) },
        uRim: { value: new THREE.Color(o.rim ?? 0xdff1ff) },
        uPower: { value: o.power ?? 2.2 },
        uIntensity: { value: o.intensity ?? 1 },
        uOpacity: { value: o.opacity ?? 1 },
        uFocus: { value: 0 },
        uFocusR: { value: 0.35 },
        uFogDensity: { value: o.fog ?? 0 },
        uNear0: { value: 0 }, uNear1: { value: 0 }, uHero: { value: 1 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV; varying vec3 vCol; varying float vFade; varying float vDepth;
        uniform float uFocus, uFocusR, uNear0, uNear1, uHero;
        void main(){
          mat4 im = mat4(1.0);
          #ifdef USE_INSTANCING
            im = instanceMatrix;
          #endif
          vec4 wp = modelMatrix * im * vec4(position,1.0);
          vec3 center = (modelMatrix * im * vec4(0.0,0.0,0.0,1.0)).xyz;
          vN = normalize(mat3(modelMatrix) * mat3(im) * normal);
          vV = normalize(cameraPosition - wp.xyz);
          vCol = vec3(1.0);
          #ifdef USE_INSTANCING_COLOR
            vCol = instanceColor;
          #endif
          vec3 lc = (inverse(modelMatrix) * vec4(center,1.0)).xyz;
          vFade = 1.0 - uFocus * smoothstep(uFocusR, uFocusR + 0.25, length(lc));
          if (length(lc) < 0.02) vFade *= uHero;
          vec4 mv = viewMatrix * wp;
          vDepth = -mv.z;
          if (uNear1 > 0.0) vFade *= smoothstep(uNear0, uNear1, length((viewMatrix * vec4(center, 1.0)).xyz));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor, uRim; uniform float uPower, uIntensity, uOpacity, uFogDensity;
        varying vec3 vN; varying vec3 vV; varying vec3 vCol; varying float vFade; varying float vDepth;
        void main(){
          float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);
          vec3 c = (uColor * vCol * (0.35 + 0.65 * (1.0 - f)) * 0.6 + uRim * f * 1.6) * uIntensity;
          float fog = exp(-vDepth * uFogDensity);
          if (vFade < 0.02) discard;
          gl_FragColor = vec4(c * fog * (0.55 + 0.45 * vFade) * uOpacity, smoothstep(0.0, 1.0, vFade));
        }`,
      transparent: o.transparent ?? false,
      blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: !o.additive,
      alphaToCoverage: !o.additive,
    });
  }

  return { G, NOISE, POINT_SIZE, GLOW_FRAG, glowPoints, backdrop, rimMaterial };
});
