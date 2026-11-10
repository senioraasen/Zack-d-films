// Props and effects. Each returns a THREE.Object3D (often with an update/morph helper).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, plateTex } from './materials.js';
import { rand, clamp, lerp } from './anim.js';

const shadowy = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

export function box(w, h, d, m, r = 0.04) {
  return shadowy(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m));
}

// ---------- Nuts ----------
function hazelBodyGeo() {
  const g = new THREE.SphereGeometry(0.5, 36, 28);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const k = y > 0 ? 1 - y * 0.55 : 1; // narrows to a soft point on top
    p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k);
    p.setY(i, y * 1.08 + (y > 0.42 ? (y - 0.42) * 0.6 : 0));
  }
  g.computeVertexNormals();
  return g;
}
const HAZEL = { body: null, cap: null };
function hazelGeos() {
  if (!HAZEL.body) {
    HAZEL.body = hazelBodyGeo();
    HAZEL.cap = new THREE.SphereGeometry(0.47, 28, 10, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38);
  }
  return HAZEL;
}

// A hazelnut, 1 unit tall. `flatten(k)` squashes it (0..1) for impacts.
export function hazelnut() {
  const g = new THREE.Group();
  const { body, cap } = hazelGeos();
  const b = shadowy(new THREE.Mesh(body, mat.shell()));
  const c = shadowy(new THREE.Mesh(cap, mat.shellCap()));
  c.position.y = -0.02;
  g.add(b, c);
  g.flatten = (k) => { g.scale.set(1 + k * 0.35, 1 - k * 0.45, 1 + k * 0.35); };
  return g;
}

function walnutGeo() {
  const g = new THREE.SphereGeometry(0.5, 40, 30);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 23) * Math.sin(v.y * 19 + 1) * Math.sin(v.z * 21 + 2);
    const seam = Math.exp(-Math.pow(v.x * 14, 2)) * 0.06;
    v.multiplyScalar(1 + n * 0.05 + seam);
    p.setXYZ(i, v.x, v.y * 1.08, v.z);
  }
  g.computeVertexNormals();
  return g;
}
let WALNUT = null;
export function walnut() {
  WALNUT = WALNUT || walnutGeo();
  return shadowy(new THREE.Mesh(WALNUT, mat.walnut()));
}

// Deterministic falling nut rain inside a box. update(t) moves every nut.
export function nutRain({ count = 220, area = [14, 9], top = 9, bottom = 0, size = 0.09, speed = 7, center = [0, 0, 0], ground = true } = {}) {
  const { body, cap } = hazelGeos();
  const wal = WALNUT || (WALNUT = walnutGeo());
  const nBody = new THREE.InstancedMesh(body, mat.shell(), count);
  const nCap = new THREE.InstancedMesh(cap, mat.shellCap(), count);
  const nWal = new THREE.InstancedMesh(wal, mat.walnut(), count);
  for (const m of [nBody, nCap, nWal]) { m.castShadow = true; m.frustumCulled = false; }
  const group = new THREE.Group();
  group.add(nBody, nCap, nWal);
  group.position.set(...center);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const h = top - bottom;
  group.update = (t) => {
    for (let i = 0; i < count; i++) {
      const isWal = rand(i, 7) < 0.3;
      const sz = size * (0.8 + rand(i, 8) * 0.5) * (isWal ? 1.25 : 1);
      const x = (rand(i, 1) - 0.5) * area[0];
      const z = (rand(i, 2) - 0.5) * area[1];
      let y = top - (((t * speed * (0.85 + rand(i, 3) * 0.3)) + rand(i, 4) * h) % h);
      if (ground && y < bottom + sz * 0.5) y = bottom + sz * 0.5;
      p.set(x, y, z);
      e.set(t * (2 + rand(i, 5) * 4) + i, t * 3 + i * 2, 0);
      q.setFromEuler(e);
      s.setScalar(sz);
      m4.compose(p, q, s);
      if (isWal) { nWal.setMatrixAt(i, m4); nBody.setMatrixAt(i, zero); nCap.setMatrixAt(i, zero); }
      else { nBody.setMatrixAt(i, m4); nCap.setMatrixAt(i, m4); nWal.setMatrixAt(i, zero); }
    }
    nBody.instanceMatrix.needsUpdate = nCap.instanceMatrix.needsUpdate = nWal.instanceMatrix.needsUpdate = true;
  };
  group.update(0);
  return group;
}

// Static pile of nuts on the ground (scattered).
export function nutCarpet({ count = 400, area = [12, 10], size = 0.09, center = [0, 0, 0], density = 1 } = {}) {
  const rain = nutRain({ count, area, top: 0.02, bottom: 0, size, speed: 0, center });
  const { children } = rain;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < count; i++) {
    const isWal = rand(i, 17) < 0.3;
    const sz = size * (0.8 + rand(i, 18) * 0.5);
    const layer = Math.floor(rand(i, 19) * 3 * density);
    p.set((rand(i, 11) - 0.5) * area[0], sz * 0.45 + layer * sz * 0.6, (rand(i, 12) - 0.5) * area[1]);
    q.setFromEuler(new THREE.Euler(Math.PI / 2 * rand(i, 13), rand(i, 14) * 6, Math.PI / 2 * rand(i, 15)));
    s.setScalar(sz);
    m4.compose(p, q, s);
    children[0].setMatrixAt(i, isWal ? zero : m4);
    children[1].setMatrixAt(i, isWal ? zero : m4);
    children[2].setMatrixAt(i, isWal ? m4 : zero);
  }
  rain.update = () => {};
  return rain;
}

// ---------- Winged yellow car ----------
function wing(side) {
  const g = new THREE.Group();
  const feather = mat.matte('#fbf7ee', 0.65);
  const rows = [[9, 1.0, 0.0], [8, 0.75, 0.12], [6, 0.5, 0.22]];
  for (const [n, len, off] of rows) {
    for (let i = 0; i < n; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 8), feather);
      const a = (i / (n - 1)) * 1.1 - 0.15;
      const L = len * (1.05 - i * 0.04) * 1.6;
      f.scale.set(L, 0.035, 0.16);
      f.position.set(side * (0.25 + Math.cos(a) * L * 0.5 + off), Math.sin(a) * L * 0.25 + off * 0.5, -i * 0.12 + 0.3);
      f.rotation.z = side * (a * 0.5);
      f.rotation.y = side * (0.2 + i * 0.05);
      f.castShadow = true;
      g.add(f);
    }
  }
  return g;
}

export function wingedCar() {
  const car = new THREE.Group();
  const paint = mat.paint('#f5c518');
  const body = box(4.2, 0.62, 1.8, paint, 0.22); body.position.y = 0.62; car.add(body);
  const cabin = box(2.3, 0.62, 1.58, paint, 0.2); cabin.position.set(-0.15, 1.18, 0); car.add(cabin);
  const glass = mat.glass();
  const ws = box(0.08, 0.5, 1.45, glass, 0.03); ws.position.set(1.0, 1.17, 0); ws.rotation.z = -0.55; car.add(ws);
  const rw = box(0.08, 0.5, 1.45, glass, 0.03); rw.position.set(-1.3, 1.17, 0); rw.rotation.z = 0.55; car.add(rw);
  for (const z of [0.8, -0.8]) { const sw = box(1.9, 0.42, 0.04, glass, 0.02); sw.position.set(-0.15, 1.2, z); car.add(sw); }
  // Roof as a subdivided plane so it can be dented.
  const roofGeo = new THREE.PlaneGeometry(1.9, 1.4, 40, 30);
  roofGeo.rotateX(-Math.PI / 2);
  const roof = shadowy(new THREE.Mesh(roofGeo, paint));
  roof.position.set(-0.15, 1.495, 0);
  car.add(roof);
  const base = roofGeo.attributes.position.array.slice();
  car.roof = roof;
  car.dents = (list) => { // list of [x, z, depth, radius] in roof-local coords
    const p = roofGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      let d = 0;
      for (const [dx, dz, depth, r] of list) d += depth * Math.exp(-((x - dx) ** 2 + (z - dz) ** 2) / (r * r));
      p.setY(i, base[i * 3 + 1] - d);
    }
    p.needsUpdate = true;
    roofGeo.computeVertexNormals();
  };
  const wheels = [];
  for (const x of [1.35, -1.35]) for (const z of [0.86, -0.86]) {
    const w = new THREE.Group();
    const tire = shadowy(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.12, 12, 24), mat.rubber()));
    const rim = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 20), mat.chrome()));
    rim.rotation.x = Math.PI / 2;
    w.add(tire, rim);
    w.position.set(x, 0.42, z);
    car.add(w); wheels.push(w);
  }
  car.wheels = wheels;
  for (const z of [0.6, -0.6]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), mat.glow('#fff6d0'));
    hl.scale.set(0.4, 0.8, 1); hl.position.set(2.1, 0.7, z); car.add(hl);
    const tl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat.glow('#ff3020'));
    tl.scale.set(0.4, 0.8, 1); tl.position.set(-2.1, 0.72, z); car.add(tl);
  }
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.155), new THREE.MeshBasicMaterial({ map: plateTex('VINGE 1') }));
  plate.position.set(2.115, 0.5, 0); plate.rotation.y = Math.PI / 2; car.add(plate);
  const plate2 = plate.clone(); plate2.position.x = -2.115; plate2.rotation.y = -Math.PI / 2; car.add(plate2);
  const grille = box(0.05, 0.16, 0.7, mat.matte('#2a2a2a', 0.5), 0.02); grille.position.set(2.1, 0.66, 0); car.add(grille);

  const wl = wing(1), wr = wing(-1);
  // Wings attach at the cabin sides and spread outward along z.
  const wingL = new THREE.Group(); wingL.add(wl); wingL.rotation.y = -Math.PI / 2; wingL.position.set(-0.2, 1.25, 0.8);
  const wingR = new THREE.Group(); wingR.add(wr); wingR.rotation.y = -Math.PI / 2; wingR.position.set(-0.2, 1.25, -0.8);
  car.add(wingL, wingR);
  car.wingsVisible = (v) => { wingL.visible = wingR.visible = v; };
  car.flap = (a) => { wingL.rotation.x = -a; wingR.rotation.x = a; };
  car.flap(0.2);
  return car;
}

// A plain parked car (no wings) for street scenes.
export function parkedCar(color = '#3d6fb6') {
  const c = wingedCar();
  c.wingsVisible(false);
  c.traverse((m) => { if (m.isMesh && m.material === mat.paint('#f5c518')) m.material = mat.paint(color); });
  return c;
}

// ---------- Small props ----------
export function broom() {
  const g = new THREE.Group();
  const stick = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.9, 10), mat.matte('#6b4423', 0.7)));
  stick.rotation.z = Math.PI / 2;
  g.add(stick);
  const bristles = shadowy(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 18, 1, true), mat.matte('#b8935a', 0.95)));
  bristles.material.side = THREE.DoubleSide;
  bristles.rotation.z = -Math.PI / 2; bristles.position.x = -1.2;
  g.add(bristles);
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 14), mat.matte('#7a5a2e', 0.6));
  tie.rotation.y = Math.PI / 2; tie.position.x = -0.92; g.add(tie);
  return g;
}

export function apple() {
  const g = new THREE.Group();
  const a = shadowy(new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), mat.gloss('#8ec641')));
  a.scale.set(1, 0.9, 1);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 6), mat.matte('#5a3a1a'));
  st.position.y = 0.075;
  g.add(a, st);
  return g;
}

// Plastic grocery bag; tear(k) opens a hole in the bottom.
export function bag() {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.2, 0.17, 0.42, 24, 6, true);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 + Math.sin(i) * 0.03));
  geo.computeVertexNormals();
  const bodyM = mat.plastic('#c9ec9e');
  const body = new THREE.Mesh(geo, bodyM);
  body.castShadow = true;
  g.add(body);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), bodyM);
  bottom.rotation.x = Math.PI / 2; bottom.position.y = -0.21; g.add(bottom);
  for (const x of [-0.1, 0.1]) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 16, Math.PI), bodyM);
    h.position.set(x, 0.21, 0); g.add(h);
  }
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), mat.matte('#2f8f3a', 0.5));
  label.position.set(0, 0, 0.2); g.add(label);
  g.tear = (k) => { bottom.visible = k < 0.3; body.scale.y = 1 - k * 0.15; };
  return g;
}

export function shadowBlob(r = 0.5, opacity = 0.35) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, `rgba(0,0,0,${opacity})`); grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 64, 64);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.005;
  return m;
}

// ---------- Effects ----------
// Glowing spark points flying out from the origin; update(k) with k in 0..1.
export function sparks(n = 40, color = '#ffd27a', spread = 1, seed = 1) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color, size: 0.05, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = new THREE.Points(geo, m);
  pts.frustumCulled = false;
  pts.update = (k) => {
    for (let i = 0; i < n; i++) {
      const a = rand(i, seed) * Math.PI * 2, el = rand(i, seed + 1) * 1.2;
      const v = (0.6 + rand(i, seed + 2)) * spread;
      pos[i * 3] = Math.cos(a) * Math.cos(el) * v * k;
      pos[i * 3 + 1] = Math.sin(el) * v * k - 1.5 * k * k * spread;
      pos[i * 3 + 2] = Math.sin(a) * Math.cos(el) * v * k;
    }
    geo.attributes.position.needsUpdate = true;
    m.opacity = k <= 0 ? 0 : clamp(1.2 - k);
  };
  pts.update(0);
  return pts;
}

// Little brown shell chips flying out (meshes, not glowing).
export function chips(n = 18, color = '#7a4a22', spread = 0.8, seed = 5) {
  const g = new THREE.Group();
  const geo = new THREE.TetrahedronGeometry(0.03);
  const m = mat.matte(color, 0.7);
  for (let i = 0; i < n; i++) { const c = new THREE.Mesh(geo, m); c.castShadow = true; g.add(c); }
  g.update = (k) => {
    g.children.forEach((c, i) => {
      const a = rand(i, seed) * Math.PI * 2, el = 0.2 + rand(i, seed + 1) * 1.0;
      const v = (0.5 + rand(i, seed + 2)) * spread;
      c.position.set(Math.cos(a) * Math.cos(el) * v * k, Math.sin(el) * v * k - 2 * k * k * spread, Math.sin(a) * Math.cos(el) * v * k);
      c.rotation.set(k * 20 + i, k * 13, i);
      c.visible = k > 0 && k < 1;
    });
  };
  g.update(0);
  return g;
}

// The red force ripple: expanding rings on a disc. update(k) with k in 0..1.
export function rippleOverlay(radius = 0.6, color = '#ff2a1a') {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uK: { value: 0 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float uK; uniform vec3 uColor;
      void main(){
        float r = length(vUv - 0.5) * 2.0;
        float front = uK * 1.15;
        float rings = 0.0;
        for (int i = 0; i < 3; i++) {
          float f = front - float(i) * 0.22;
          rings += smoothstep(0.09, 0.0, abs(r - f)) * step(0.0, f) * (1.0 - float(i) * 0.3);
        }
        float inside = smoothstep(front, 0.0, r) * 0.12;
        float fade = (1.0 - smoothstep(0.55, 1.0, uK)) * smoothstep(1.0, 0.85, r);
        gl_FragColor = vec4(uColor * (rings + inside) * fade * 1.6, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), m);
  mesh.renderOrder = 10;
  mesh.update = (k) => { m.uniforms.uK.value = clamp(k); mesh.visible = k > 0 && k < 1; };
  mesh.update(0);
  return mesh;
}

// Speed streak behind a moving object (along +y of its local frame).
export function streak(len = 1, width = 0.08, color = '#ffffff') {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(color) }, uA: { value: 0.6 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec2 vUv; uniform vec3 uColor; uniform float uA; void main(){ float a = vUv.y * (1.0 - abs(vUv.x - 0.5) * 2.0); gl_FragColor = vec4(uColor * a * uA, 1.0); }',
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, len), m);
  mesh.geometry.translate(0, len / 2, 0);
  mesh.setAlpha = (a) => { m.uniforms.uA.value = a; };
  return mesh;
}

// Spreading oil splat on the ground; update(k) grows it.
export function oilSplat(r = 0.5, seed = 3) {
  const shape = new THREE.Shape();
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.75 + rand(i % n, seed) * 0.45);
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat.oil());
  m.rotation.x = -Math.PI / 2; m.position.y = 0.006;
  m.receiveShadow = true;
  m.update = (k) => { const s = Math.max(0.001, k); m.scale.set(s, s, 1); m.visible = k > 0; };
  m.update(0);
  return m;
}

// A close-up tyre (wheel) for the crushing shot.
export function bigWheel() {
  const g = new THREE.Group();
  const tire = shadowy(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.17, 20, 48), mat.rubber()));
  // Tread blocks.
  const tread = new THREE.BoxGeometry(0.06, 0.05, 0.3);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const b = shadowy(new THREE.Mesh(tread, mat.rubber()));
    b.position.set(Math.cos(a) * 0.59, Math.sin(a) * 0.59, 0);
    b.rotation.z = a;
    g.add(b);
  }
  const rim = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 32), mat.chrome()));
  rim.rotation.x = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.24, 16), mat.steel());
  hub.rotation.x = Math.PI / 2;
  for (let i = 0; i < 5; i++) {
    const s = shadowy(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.05), mat.steel()));
    s.rotation.z = (i / 5) * Math.PI * 2; s.position.z = 0.1;
    s.position.x = Math.sin(-s.rotation.z) * 0.13; s.position.y = Math.cos(s.rotation.z) * 0.13;
    g.add(s);
  }
  g.add(tire, rim, hub);
  return g;
}

// Simple background buildings (Norwegian wooden houses) as a backdrop.
export function townRow({ count = 16, start = -27, gap = 3.4, z = -9, seed = 1 } = {}) {
  const g = new THREE.Group();
  z *= 2;
  const colors = ['#c0392b', '#f0c419', '#e8e2d0', '#2e86c1', '#d35400', '#7dcea0', '#f5b7b1'];
  for (let i = 0; i < count; i++) {
    const h = 3 + rand(i, seed) * 2.5;
    const w = 2.6 + rand(i, seed + 1) * 0.8;
    const house = box(w, h, 3, mat.matte(colors[Math.floor(rand(i, seed + 2) * colors.length)], 0.8), 0.06);
    house.position.set(start + i * gap, h / 2, z);
    g.add(house);
    const roof = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.01, w * 0.62, 1.4, 4, 1), mat.matte('#3b3b40', 0.7)));
    roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.95);
    roof.position.set(start + i * gap, h + 0.7, z);
    g.add(roof);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.65), mat.matte('#f7f1d6', 0.3));
      win.position.set(start + i * gap - 0.6 + c * 1.2, h * 0.35 + r * 1.3, z + 1.51);
      g.add(win);
    }
  }
  return g;
}
