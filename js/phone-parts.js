/* ==========================================================================
   KYVEN K1 — geometry helpers + material library for the phone
   ========================================================================== */
NX.def('pp', function (THREE, A, NX) {
  'use strict';
  const U = NX.U;
  const BGU = A.BufferGeometryUtils;

  /* continuous-curvature ("squircle") rounded rectangle */
  function rr(w, h, r, o = {}) {
    const s = o.path ? new THREE.Path() : new THREE.Shape();
    const x = w / 2, y = h / 2, cx = o.cx || 0, cy = o.cy || 0;
    const k = 1.28, c = 0.3;
    const q = Math.min(r * k, x * 0.999, y * 0.999);
    const P = (a, b) => [cx + a, cy + b];
    s.moveTo(...P(-x + q, -y));
    s.lineTo(...P(x - q, -y));
    s.bezierCurveTo(...P(x - q * c, -y), ...P(x, -y + q * c), ...P(x, -y + q));
    s.lineTo(...P(x, y - q));
    s.bezierCurveTo(...P(x, y - q * c), ...P(x - q * c, y), ...P(x - q, y));
    s.lineTo(...P(-x + q, y));
    s.bezierCurveTo(...P(-x + q * c, y), ...P(-x, y - q * c), ...P(-x, y - q));
    s.lineTo(...P(-x, -y + q));
    s.bezierCurveTo(...P(-x, -y + q * c), ...P(-x + q * c, -y), ...P(-x + q, -y));
    return s;
  }
  /* hole descriptor -> function(bevel) returning an enlarged Path */
  const hole = (w, h, r, cx = 0, cy = 0) => (b) => rr(w + 2 * b, h + 2 * b, r + b, { cx, cy, path: true });

  /* bevelled extruded slab centered on z, smooth creased normals */
  function slab(w, h, r, depth, o = {}) {
    const b = o.bevel ?? Math.min(0.02, depth * 0.3);
    const shape = rr(w - 2 * b, h - 2 * b, Math.max(r - b, 0.002));
    for (const hl of o.holes || []) shape.holes.push(hl(b));
    const d = Math.max(depth - 2 * b, 0.0004);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: d, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b,
      bevelSegments: o.bevelSeg ?? 4, curveSegments: o.curveSeg ?? 18,
    });
    geo.translate(0, 0, -d / 2);
    return BGU.toCreasedNormals(geo, o.crease ?? 0.9);
  }

  /* flat rounded-rect face with 0..1 UVs */
  function face(w, h, r, seg = 24) {
    const g = new THREE.ShapeGeometry(rr(w, h, r), seg);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
    return g;
  }

  /* ------------------------------------------------------------- materials */
  const phys = (o) => new THREE.MeshPhysicalMaterial(Object.assign({ transparent: true }, o));
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ transparent: true }, o));
  const M = {
    titanium: () => phys({ color: 0x9c9fa4, metalness: 1, roughness: 0.3, envMapIntensity: 1.05 }),
    titaniumPolish: () => phys({ color: 0xc3c7cc, metalness: 1, roughness: 0.14, envMapIntensity: 1.15 }),
    darkTitanium: () => phys({ color: 0x3b3e43, metalness: 1, roughness: 0.34 }),
    aluminum: () => std({ color: 0xa9aeb5, metalness: 1, roughness: 0.38 }),
    darkAlu: () => std({ color: 0x4a4f57, metalness: 1, roughness: 0.42 }),
    gold: () => std({ color: 0xd8ae5a, metalness: 1, roughness: 0.28 }),
    copper: () => std({ color: 0xc9825a, metalness: 1, roughness: 0.26 }),
    steel: () => std({ color: 0x8d939a, metalness: 1, roughness: 0.32 }),
    plastic: () => std({ color: 0x1b1d20, metalness: 0, roughness: 0.62 }),
    black: () => std({ color: 0x060708, metalness: 0, roughness: 0.5 }),
    rubber: () => std({ color: 0x0d0e10, metalness: 0, roughness: 0.85 }),
    chip: (map) => std(map ? { color: 0xffffff, map, metalness: 0.25, roughness: 0.42 } : { color: 0x17191c, metalness: 0.25, roughness: 0.42 }),
    ceramic: () => std({ color: 0x7a6852, metalness: 0.1, roughness: 0.55 }),
    glass: () => phys({ color: 0x000000, metalness: 0, roughness: 0.03, ior: 1.5, envMapIntensity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false }),
    visor: () => phys({ color: 0x030405, metalness: 0, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4 }),
    lensGlass: () => phys({ color: 0x000000, metalness: 0, roughness: 0.02, ior: 2.0, iridescence: 1, iridescenceIOR: 1.75, iridescenceThicknessRange: [180, 520], envMapIntensity: 3, blending: THREE.AdditiveBlending, depthWrite: false }),
    lensElement: () => phys({ color: 0x07060a, metalness: 0.2, roughness: 0.08, iridescence: 1, iridescenceIOR: 1.5, iridescenceThicknessRange: [260, 700], clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.6 }),
    backGlass: (roughMap) => phys({ color: 0x1a1c20, metalness: 0, roughness: 1, roughnessMap: roughMap, envMapIntensity: 1.25, specularIntensity: 1, ior: 1.6 }),
    pcb: (map) => std({ color: 0xffffff, map, metalness: 0.2, roughness: 0.5 }),
    pcbEdge: () => std({ color: 0x1a2a3a, metalness: 0.3, roughness: 0.5 }),
    battery: (map) => std({ color: 0xffffff, map, metalness: 0.35, roughness: 0.46 }),
  };

  /* register helper: tags meshes with their part id, collects materials */
  function mesh(part, geo, mat, parent, o = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.userData.part = part.id;
    m.castShadow = o.cast ?? true;
    m.receiveShadow = o.receive ?? true;
    if (o.pos) m.position.set(o.pos[0], o.pos[1], o.pos[2]);
    if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    if (o.scale) m.scale.set(...o.scale);
    (parent || part.group).add(m);
    const mats = Array.isArray(mat) ? mat : [mat];
    for (const mm of mats) if (!part.mats.includes(mm)) part.mats.push(mm);
    return m;
  }

  /* ------------------------------------------------------------ camera lens */
  function lens(part, parent, r, tex, o = {}) {
    const g = new THREE.Group();
    const prof = [[0.8, 0], [1.0, 0], [1.05, 0.012], [1.055, 0.036], [1.03, 0.052], [0.95, 0.058], [0.87, 0.055], [0.85, 0.046]]
      .map(([x, y]) => new THREE.Vector2(x * r, y));
    const bezel = new THREE.LatheGeometry(prof, 72);
    bezel.rotateX(Math.PI / 2);
    mesh(part, bezel, o.bezelMat || M.titaniumPolish(), g);
    const ringMat = std({ color: 0xffffff, map: tex.rings, metalness: 0.4, roughness: 0.35 });
    mesh(part, new THREE.RingGeometry(r * 0.5, r * 0.85, 72), ringMat, g, { pos: [0, 0, 0.047] });
    mesh(part, new THREE.RingGeometry(r * 0.24, r * 0.52, 64), M.black(), g, { pos: [0, 0, 0.03] });
    const el = M.lensElement();
    const elements = [];
    [[0.5, 0.034], [0.38, 0.022], [0.25, 0.012]].forEach(([k, z]) => {
      const e = mesh(part, new THREE.CircleGeometry(r * k, 48), el, g, { pos: [0, 0, z] });
      e.userData.baseZ = z;
      elements.push(e);
    });
    const sensor = mesh(part, new THREE.PlaneGeometry(r * 0.3, r * 0.22), std({ color: 0x1c1430, metalness: 0.6, roughness: 0.25, emissive: 0x0a0616 }), g, { pos: [0, 0, 0.004] });
    sensor.userData.baseZ = 0.004;
    elements.push(sensor);
    const th = 0.36, R = (r * 0.86) / Math.sin(th);
    const dome = new THREE.SphereGeometry(R, 56, 10, 0, U.TAU, 0, th);
    dome.rotateX(Math.PI / 2);
    dome.translate(0, 0, 0.052 - R * Math.cos(th));
    mesh(part, dome, M.lensGlass(), g, { cast: false });
    g.userData.elements = elements;
    parent.add(g);
    return g;
  }

  return { rr, hole, slab, face, M, mesh, lens, phys, std };
});
