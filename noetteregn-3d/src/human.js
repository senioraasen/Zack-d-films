// makeHuman(outfit): a poseable cartoon person built from simple shapes.
// Faces +z, stands on y = 0, about 1.75 m tall with a big expressive head.
import * as THREE from 'three';
import { mat } from './materials.js';
import { rand, lerp } from './anim.js';

const OUTFITS = {
  oldman: {
    skin: '#e9a98a', top: '#6b4a2f', pants: '#4a3a2c', shoes: '#2e241c',
    hair: '#f1efe9', hairStyle: 'wild', beard: true, coat: true, brows: '#f1efe9', belly: 1.12,
  },
  courier: {
    skin: '#f2b48c', top: '#e8197c', pants: '#1c1c22', shoes: '#ff5aa5',
    hair: '#5a3620', hairStyle: 'tufts', cap: '#e8197c', backpack: '#e8197c', stripes: true, brows: '#4a2a18', belly: 0.95,
  },
  witch: {
    skin: '#c98f6b', top: '#3a2245', pants: '#2a1830', shoes: '#1d1715',
    hair: '#2b1a12', hairStyle: 'curly', robe: true, hat: '#2a1b33', brows: '#2b1a12', belly: 0.95,
  },
};

const capsule = (r, len, m) => {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), m);
  mesh.position.y = -len / 2;
  mesh.castShadow = true;
  return mesh;
};

const ball = (r, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), m);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  return mesh;
};

export const JOINTS = ['pelvis', 'spine', 'chest', 'neck', 'head', 'lSh', 'lEl', 'lWr', 'rSh', 'rEl', 'rWr', 'lHip', 'lKn', 'lAn', 'rHip', 'rKn', 'rAn'];

export function makeHuman(outfit = 'courier') {
  const o = OUTFITS[outfit];
  const skin = mat.skin(o.skin);
  const top = mat.cloth(o.top);
  const pants = mat.cloth(o.pants);
  const shoes = mat.gloss(o.shoes);
  const hairM = mat.matte(o.hair, 0.8);

  const root = new THREE.Group();
  const J = {};
  const joint = (name, parent, x, y, z) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    J[name] = g;
    return g;
  };

  const pelvis = joint('pelvis', root, 0, 0.9, 0);
  pelvis.add(ball(0.2, pants, 0, 0, 0, 1.05, 0.7, 0.8));
  const spine = joint('spine', pelvis, 0, 0.06, 0);
  spine.add(ball(0.21, top, 0, 0.1, 0.01, 1.0 * o.belly, 0.85, 0.82 * o.belly));
  const chest = joint('chest', spine, 0, 0.2, 0);
  chest.add(ball(0.22, top, 0, 0.08, 0, 1.08, 0.8, 0.78));

  if (o.stripes) {
    const stripe = mat.gloss('#d9dde2');
    for (const y of [0.0, 0.12]) {
      const s = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.012, 6, 32), stripe);
      s.rotation.x = Math.PI / 2; s.position.y = y; s.scale.set(1.06, 0.8, 1);
      chest.add(s);
    }
  }
  if (o.coat || o.robe) {
    // A flared skirt hanging from the waist: long coat or witch robe.
    const len = o.robe ? 0.86 : 0.6;
    const g = new THREE.CylinderGeometry(0.22, o.robe ? 0.42 : 0.3, len, 24, 4, true);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < -len / 2 + 0.01 && o.robe) pos.setY(i, y + (rand(i, 21) - 0.5) * 0.12); // ragged hem
    }
    const skirt = new THREE.Mesh(g, top);
    skirt.material.side = THREE.DoubleSide;
    skirt.position.y = -len / 2 + 0.05;
    skirt.castShadow = true;
    pelvis.add(skirt);
    J.skirt = skirt;
  }
  if (o.backpack) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.48, 0.3), mat.gloss(o.backpack));
    box.position.set(0, 0.06, -0.33);
    box.castShadow = true;
    chest.add(box);
    // White cloche icon on the back.
    const icon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat.matte('#ffffff', 0.5));
    icon.position.set(0, 0.06, -0.485); icon.rotation.x = -Math.PI / 2; icon.scale.set(1, 0.25, 1);
    chest.add(icon);
    for (const x of [-0.13, 0.13]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.03), mat.matte('#222', 0.6));
      strap.position.set(x, 0.06, 0.17); strap.rotation.x = -0.15;
      chest.add(strap);
    }
  }

  const neck = joint('neck', chest, 0, 0.22, 0);
  neck.add(capsule(0.065, 0.05, skin));
  const head = joint('head', neck, 0, 0.05, 0);
  const face = new THREE.Group();
  face.position.y = 0.17;
  head.add(face);
  face.add(ball(0.2, skin, 0, 0, 0, 0.95, 1.05, 0.95));
  // Ears and nose.
  face.add(ball(0.045, skin, 0.19, 0, -0.01, 0.6, 1, 0.8));
  face.add(ball(0.045, skin, -0.19, 0, -0.01, 0.6, 1, 0.8));
  face.add(ball(0.05, skin, 0, -0.02, 0.19, 0.9, 0.8, 1));

  // Big eyes with pupils and catch lights.
  const eyes = [];
  for (const s of [1, -1]) {
    const eye = new THREE.Group();
    eye.position.set(0.075 * s, 0.045, 0.155);
    eye.add(ball(0.052, mat.eyeWhite(), 0, 0, 0, 1, 1.15, 0.7));
    const pupil = ball(0.027, mat.pupil(), 0, 0, 0.032, 1, 1.15, 0.6);
    eye.add(pupil);
    const catchLight = ball(0.008, mat.glow('#ffffff'), 0.01, 0.015, 0.05);
    catchLight.castShadow = false;
    eye.add(catchLight);
    face.add(eye);
    eyes.push({ eye, pupil, side: s });
  }
  const brows = [];
  for (const s of [1, -1]) {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(o.hairStyle === 'wild' ? 0.022 : 0.013, 0.06, 4, 8), mat.matte(o.brows, 0.8));
    b.rotation.z = Math.PI / 2;
    b.position.set(0.075 * s, 0.12, 0.17);
    face.add(b);
    brows.push({ b, side: s });
  }
  // Mouth: a dark ellipse that opens, plus a smile arc.
  const mouth = ball(0.05, mat.mouth(), 0, -0.095, 0.165, 1, 0.25, 0.4);
  face.add(mouth);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 6, 16, Math.PI), mat.mouth());
  smile.rotation.z = Math.PI; smile.position.set(0, -0.075, 0.172);
  face.add(smile);

  // Hair styles.
  if (o.hairStyle === 'wild') {
    for (let i = 0; i < 34; i++) {
      const a = rand(i, 31) * Math.PI * 2;
      const up = rand(i, 32);
      const x = Math.cos(a) * 0.19, z = Math.sin(a) * 0.17 - 0.03;
      if (z > 0.02 && up < 0.8) continue; // keep the face clear
      face.add(ball(0.05 + rand(i, 33) * 0.025, hairM, x * 1.05, 0.04 + up * 0.17, z, 1, 0.9, 1));
    }
  } else if (o.hairStyle === 'curly') {
    for (let i = 0; i < 40; i++) {
      const a = rand(i, 41) * Math.PI * 2;
      const y = 0.15 - rand(i, 42) * 0.42;
      const r = 0.2 + (0.15 - y) * 0.1;
      const x = Math.cos(a) * r, z = Math.sin(a) * r - 0.03;
      if (z > 0.08 && y > -0.2) continue;
      face.add(ball(0.055 + rand(i, 43) * 0.03, hairM, x, y, z));
    }
  } else {
    for (const s of [1, -1]) for (let i = 0; i < 4; i++) face.add(ball(0.045, hairM, 0.17 * s, 0.02 - i * 0.03, -0.04 - i * 0.03));
  }
  if (o.beard) {
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * (0.12 + rand(i, 51) * 0.76);
      const x = Math.cos(a) * 0.15, z = Math.sin(a) * 0.12 + 0.02;
      face.add(ball(0.04 + rand(i, 52) * 0.02, hairM, x, -0.12 - rand(i, 53) * 0.1, z));
    }
    // Moustache over a clear mouth.
    face.add(ball(0.05, hairM, 0.04, -0.06, 0.18, 1, 0.5, 0.6));
    face.add(ball(0.05, hairM, -0.04, -0.06, 0.18, 1, 0.5, 0.6));
  }
  if (o.cap) {
    const capM = mat.gloss(o.cap);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.205, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), capM);
    dome.position.y = 0.06; dome.scale.set(1, 0.85, 1); dome.castShadow = true;
    face.add(dome);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.015, 24, 1, false, -Math.PI / 2, Math.PI), capM);
    brim.position.set(0, 0.07, 0.12); brim.rotation.x = 0.12; brim.scale.set(1, 1, 0.9); brim.castShadow = true;
    face.add(brim);
  }
  if (o.hat) {
    const hatM = mat.cloth(o.hat);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.02, 32), hatM);
    brim.position.y = 0.13; brim.castShadow = true;
    face.add(brim);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 24, 6), hatM);
    const p = cone.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.275; p.setX(i, p.getX(i) - y * y * 0.35); } // bent tip
    cone.position.y = 0.4; cone.castShadow = true;
    face.add(cone);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.02, 6, 24), mat.gloss('#6b3a8a'));
    band.rotation.x = Math.PI / 2; band.position.y = 0.17;
    face.add(band);
  }

  // Arms.
  for (const s of [1, -1]) {
    const p = s > 0 ? 'l' : 'r';
    const sh = joint(p + 'Sh', chest, 0.24 * s, 0.14, 0);
    sh.add(ball(0.08, top));
    sh.add(capsule(0.068, 0.24, top));
    const el = joint(p + 'El', sh, 0, -0.3, 0);
    el.add(capsule(0.058, 0.22, o.robe ? top : top));
    const wr = joint(p + 'Wr', el, 0, -0.27, 0);
    wr.add(ball(0.07, skin, 0, -0.04, 0.0, 0.9, 1.1, 0.8));
    wr.add(ball(0.028, skin, 0.05 * s, -0.02, 0.03)); // thumb
  }
  // Legs.
  for (const s of [1, -1]) {
    const p = s > 0 ? 'l' : 'r';
    const hip = joint(p + 'Hip', pelvis, 0.1 * s, -0.04, 0);
    hip.add(capsule(0.085, 0.3, pants));
    const kn = joint(p + 'Kn', hip, 0, -0.42, 0);
    kn.add(capsule(0.072, 0.3, pants));
    const an = joint(p + 'An', kn, 0, -0.4, 0);
    const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.12, 4, 10), shoes);
    foot.rotation.x = Math.PI / 2; foot.position.set(0, -0.03, 0.06); foot.scale.set(1.1, 1, 0.75);
    foot.castShadow = true;
    an.add(foot);
  }

  const rest = {};
  for (const k of JOINTS) rest[k] = J[k].rotation.toArray().slice(0, 3);
  const pelvisY = J.pelvis.position.y;

  const api = {
    root, joints: J, outfit,
    setPose(pose) {
      for (const k of JOINTS) {
        const v = pose[k] || rest[k];
        J[k].rotation.set(v[0], v[1], v[2]);
      }
      J.pelvis.position.y = pelvisY - (pose.drop || 0);
      if (J.skirt) J.skirt.rotation.x = -(((pose.lHip || [0])[0] + (pose.rHip || [0])[0]) / 2) * 0.5;
    },
    setMouth(v) {
      mouth.scale.set(1 - v * 0.15, 0.25 + v * 1.0, 0.4);
      mouth.position.y = -0.095 - v * 0.012;
      smile.visible = v < 0.15;
    },
    setBrows(v) { // -1 angry, 0 neutral, 1 surprised
      for (const { b, side } of brows) {
        b.position.y = 0.12 + v * 0.03;
        b.rotation.y = 0;
        b.rotation.z = Math.PI / 2 + side * (v < 0 ? v * 0.5 : -v * 0.15);
      }
    },
    look(x = 0, y = 0) {
      for (const { pupil } of eyes) pupil.position.set(x * 0.02, y * 0.02, 0.032);
    },
    setEyes(open = 1) {
      for (const { eye } of eyes) eye.scale.y = Math.max(0.08, open);
    },
  };
  api.setPose({});
  api.setMouth(0);
  api.setBrows(0);
  return api;
}

export function lerpPose(a, b, t) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === 'drop') { out.drop = lerp(a.drop || 0, b.drop || 0, t); continue; }
    const va = a[k] || [0, 0, 0], vb = b[k] || [0, 0, 0];
    out[k] = va.map((v, i) => lerp(v, vb[i], t));
  }
  return out;
}

// Handy poses.
export const STAND = { lSh: [0, 0, 0.12], rSh: [0, 0, -0.12], lEl: [-0.15, 0, 0], rEl: [-0.15, 0, 0] };
export function walkPose(t, speed = 1) {
  const s = Math.sin(t * Math.PI * 2 * speed);
  const c = Math.cos(t * Math.PI * 2 * speed);
  return {
    lHip: [-0.45 * s, 0, 0], rHip: [0.45 * s, 0, 0],
    lKn: [Math.max(0, 0.7 * c), 0, 0], rKn: [Math.max(0, -0.7 * c), 0, 0],
    lSh: [0.4 * s, 0, 0.1], rSh: [-0.4 * s, 0, -0.1],
    lEl: [-0.3, 0, 0], rEl: [-0.3, 0, 0],
    spine: [0.04, 0, 0], drop: Math.abs(c) * 0.025,
  };
}
export const HANDS_ON_HIPS = {
  lSh: [0.15, 0, 0.75], lEl: [-1.9, -0.3, 0], rSh: [0.15, 0, -0.75], rEl: [-1.9, 0.3, 0],
};
export const ARMS_UP = { lSh: [-0.2, 0, 2.6], rSh: [-0.2, 0, -2.6], lEl: [-0.4, 0, 0], rEl: [-0.4, 0, 0] };
