// The edit: shots, cut times, captions and fades.
// A shot's build({makeStage}) returns {scene, camera, update(t)}; t is time inside the shot.
// update(t) must depend only on t (a render can start in the middle of a shot).
import * as THREE from 'three';
import { LINES, CAPTIONS as CAPS, DURATION as DUR } from './timeline.js';
import { makeHuman, lerpPose, STAND, HANDS_ON_HIPS, ARMS_UP, walkPose } from './human.js';
import {
  hazelnut, walnut, nutRain, nutCarpet, wingedCar, parkedCar, broom, apple, bag, shadowBlob,
  sparks, chips, rippleOverlay, streak, oilSplat, bigWheel, townRow,
} from './props.js';
import { kf, ease, range, clamp, lerp, cam, place, shake, rand } from './anim.js';

export const CAPTIONS = CAPS;
export const DURATION = DUR;

// ---------- Cut times from the voiceover ----------
const L = (n) => LINES[n - 1];
const wordStart = (n, word) => {
  const w = L(n).words.find((x) => x.w.toLowerCase().replace(/[^a-zæøå]/g, '') === word);
  return w ? w.start : L(n).start;
};
const C = [
  0,
  L(2).start - 0.05,
  L(3).start - 0.1,
  L(4).start - 0.05,
  L(5).start - 0.05,
  wordStart(5, 'og') - 0.03,
  L(6).start - 0.05,
  L(7).start - 0.05,
  wordStart(7, 'så') - 0.03,
  L(9).start - 0.05,
  DUR,
];
export const FADES = [[L(3).start - 0.16, 0.16]]; // dip to black on the "Men" turn

// ---------- Helpers ----------
function standOn(h, x = 0, z = 0, ry = 0) {
  h.root.position.set(x, 0, z);
  h.root.rotation.y = ry;
  h.root.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return h;
}
function faceCamera(obj, camera) { obj.quaternion.copy(camera.quaternion); }
const HEAD_TOP = 1.95;

// ---------- Shot 1: the hook. Nuts start to fall; one bonks the old man. ----------
function shotHook({ makeStage }) {
  const D = C[1] - C[0];
  const scene = makeStage();
  scene.add(townRow({ z: -11, seed: 2 }));
  const man = standOn(makeHuman('oldman'));
  scene.add(man.root);
  const bagL = bag(); bagL.scale.setScalar(0.9); man.joints.rWr.add(bagL); bagL.position.set(0, -0.28, 0);
  const rain = nutRain({ count: 70, area: [9, 7], top: 7, speed: 6, size: 0.09 });
  scene.add(rain);
  const nut = hazelnut(); nut.scale.setScalar(0.12); scene.add(nut);
  const rip = rippleOverlay(0.35); scene.add(rip);
  const camera = cam(34);
  const tHit = D - 0.55;
  return {
    scene, camera,
    update(t) {
      const walking = t < tHit;
      const z = kf(t, [[0, -1.2], [tHit, 0]], ease.linear);
      man.root.position.z = z;
      const w = walkPose(t * 0.9);
      const look = range(t, 0.6, 1.2);
      let pose = lerpPose(w, { ...STAND, neck: [-0.25, 0, 0], head: [-0.25, 0, 0] }, walking ? look * 0.6 : 1);
      man.setMouth(0.15 + look * 0.25);
      man.setBrows(look * 0.6);
      man.look(0, look);
      if (t >= tHit) {
        const k = range(t, tHit, tHit + 0.25);
        pose = { ...pose, neck: [0.15 * (1 - k), 0, 0.1], head: [0.25 * (1 - k), 0, 0.05], spine: [0.1, 0, 0] };
        man.setMouth(0.7); man.setBrows(1); man.setEyes(0.25);
      } else man.setEyes(1);
      man.setPose(pose);
      rain.visible = t > 0.2;
      rain.update(t);
      // The special nut drops onto the head, then bounces off.
      const hitY = HEAD_TOP;
      if (t < tHit) {
        nut.position.set(0.02, kf(t, [[tHit - 0.9, 6], [tHit, hitY]], ease.in), z + 0.02);
        nut.rotation.set(t * 6, t * 3, 0);
      } else {
        const u = t - tHit;
        nut.position.set(0.02 + u * 1.2, hitY + u * 2.4 - 4.9 * u * u, z + 0.02 + u * 0.6);
        nut.rotation.set(t * 12, t * 5, 0);
      }
      rip.position.set(0, hitY + 0.02, z + 0.1);
      faceCamera(rip, camera);
      rip.update(range(t, tHit, tHit + 0.45));
      place(camera, [0.35, 1.55, z + 3.7], [0, 1.35, z]);
      camera.fov = kf(t, [[0, 36], [D, 31]]); camera.updateProjectionMatrix();
      shake(camera, t, tHit, 0.05, 0.4);
      return { dof: { focus: 3.7, aperture: 0.0015 } };
    },
  };
}

// ---------- Shot 2: the misconception. "Koselig" ----------
function shotCosy({ makeStage }) {
  const D = C[2] - C[1];
  const scene = makeStage();
  scene.add(townRow({ z: -10, seed: 5 }));
  const kid = standOn(makeHuman('courier'), 0, 0, -0.25);
  scene.add(kid.root);
  const rain = nutRain({ count: 90, area: [8, 6], top: 6, speed: 1.4, size: 0.08 });
  scene.add(rain);
  const camera = cam(34);
  return {
    scene, camera,
    update(t) {
      const sway = Math.sin(t * 2.2) * 0.05;
      kid.setPose({ ...HANDS_ON_HIPS, neck: [-0.15, 0, sway], head: [-0.2, 0.15, sway], spine: [-0.05, 0, 0] });
      kid.setMouth(0); kid.setBrows(0.4); kid.look(0.3, 0.6);
      kid.setEyes(t % 2.1 > 2.0 ? 0.1 : 1);
      rain.update(t);
      place(camera, [kf(t, [[0, 0.3], [D, 0.1]]), 1.5, kf(t, [[0, 4.6], [D, 3.9]])], [0, 1.35, 0]);
      return { dof: { focus: 4.2, aperture: 0.0018 }, bloom: 0.45 };
    },
  };
}

// ---------- Shot 3: ride behind a falling hazelnut ----------
function shotFall({ makeStage }) {
  const D = C[3] - C[2];
  const scene = makeStage({ shadowBox: 12 });
  scene.fog = new THREE.Fog('#bfe3ff', 40, 170);
  for (let i = 0; i < 4; i++) { const row = townRow({ z: -14 + i * 9, start: -18, count: 12, seed: 10 + i }); scene.add(row); }
  const nut = hazelnut(); nut.scale.setScalar(0.5); scene.add(nut);
  const tail = streak(4, 0.35); scene.add(tail);
  const others = nutRain({ count: 40, area: [10, 10], top: 14, bottom: -14, speed: 0, size: 0.35, ground: false });
  scene.add(others);
  const camera = cam(40);
  return {
    scene, camera,
    update(t) {
      const y = kf(t, [[0, 60], [D, 6]], ease.in);
      nut.position.set(0, y, 0);
      nut.rotation.set(t * 2.2, t * 1.3, 0.4);
      tail.position.set(0, y + 0.2, 0);
      faceCamera(tail, camera); tail.rotation.z = 0;
      tail.setAlpha(0.35 + range(t, 0, D) * 0.4);
      others.position.set(0, y, 0);
      others.update(t * 0.6);
      place(camera, [0.5, y + 1.3, 1.7], [0, y - 0.9, 0]);
      shake(camera, t, 0, 0.012 + range(t, 0, D) * 0.03, D + 1);
      return { bloom: 0.3 };
    },
  };
}

// ---------- Shot 4: slow-motion impact on a car roof ----------
function shotRoofHit({ makeStage }) {
  const D = C[4] - C[3];
  const scene = makeStage();
  scene.add(townRow({ z: -12, seed: 7 }));
  const car = parkedCar('#d43b2e');
  const red = new THREE.MeshStandardMaterial({ color: '#b8261d', roughness: 0.5, metalness: 0.05 });
  car.traverse((m) => { if (m.isMesh && m.material.clearcoat === 1 && m.material.color.r > 0.5) m.material = red; });
  scene.add(car);
  const P = new THREE.Vector3(0.1, 1.495, 0.15); // impact point (world)
  const nut = hazelnut(); nut.scale.setScalar(0.3); scene.add(nut);
  const rip = rippleOverlay(0.7); rip.rotation.x = -Math.PI / 2; rip.position.copy(P).add(new THREE.Vector3(0, 0.012, 0)); scene.add(rip);
  const ch = chips(22, '#6e4220', 0.9); ch.position.copy(P); scene.add(ch);
  const sp = sparks(26, '#fff1c4', 0.6, 9); sp.position.copy(P); scene.add(sp);
  const camera = cam(30);
  const tHit = 1.0;
  return {
    scene, camera,
    update(t) {
      const r = 0.3 * 0.5; // nut radius-ish after scale
      if (t < tHit) {
        nut.position.set(P.x, kf(t, [[0, P.y + 1.3], [tHit, P.y + r]], ease.linear), P.z);
        nut.flatten(0);
        nut.scale.multiplyScalar(0.3);
        nut.rotation.set(0.3, t * 1.5, 0.2);
      } else {
        const u = t - tHit;
        const squash = Math.max(0, Math.sin(Math.min(1, u / 0.35) * Math.PI)) * 0.35;
        nut.flatten(squash);
        nut.scale.multiplyScalar(0.3);
        const up = Math.max(0, u - 0.3);
        nut.position.set(P.x - up * 0.5, P.y + r * (1 - squash * 0.4) + up * 1.4 - 1.2 * up * up, P.z + up * 0.6);
        nut.rotation.set(0.3 + up * 4, 1.5 + up * 2, 0.2);
      }
      const k = range(t, tHit, tHit + 0.18);
      car.dents([[P.x + 0.15, P.z, 0.06 * ease.out(k), 0.16]]);
      rip.update(range(t, tHit, tHit + 0.9));
      ch.update(range(t, tHit, tHit + 1.1));
      sp.update(range(t, tHit, tHit + 0.5));
      const push = kf(t, [[0, 0], [D, 0.25]]);
      place(camera, [P.x + 1.25 - push, P.y + 0.55, P.z + 1.55 - push], [P.x, P.y + 0.12, P.z]);
      shake(camera, t, tHit, 0.03, 0.4);
      return { dof: { focus: 2.0 - push, aperture: 0.003, maxblur: 0.008 }, bloom: 0.22, exposure: 0.85 };
    },
  };
}

// ---------- Shot 5: "Biltak får små bulker" ----------
function shotDents({ makeStage }) {
  const D = C[5] - C[4];
  const scene = makeStage();
  scene.add(townRow({ z: -9, seed: 3 }));
  const cars = [parkedCar('#3d6fb6'), parkedCar('#c8322a'), parkedCar('#2f9e5b')];
  cars.forEach((c, i) => { c.position.set(-4.6 + i * 4.6, 0, 0); scene.add(c); });
  const rain = nutRain({ count: 260, area: [16, 8], top: 8, speed: 8, size: 0.08 });
  scene.add(rain);
  scene.add(nutCarpet({ count: 300, area: [16, 8], size: 0.07 }));
  const camera = cam(36);
  const dentList = cars.map((_, ci) => Array.from({ length: 9 }, (_, i) => [
    (rand(i, ci + 30) - 0.5) * 1.6, (rand(i, ci + 40) - 0.5) * 1.1, 0.05 + rand(i, ci + 50) * 0.03, 0.13, rand(i, ci + 60) * 1.4,
  ]));
  return {
    scene, camera,
    update(t) {
      rain.update(t + 3);
      cars.forEach((c, ci) => c.dents(dentList[ci].filter((d) => t > d[4]).map(([x, z, dep, r, at]) => [x, z, dep * ease.out(range(t, at, at + 0.15)), r])));
      place(camera, [kf(t, [[0, 1.8], [D, 0.9]]), 3.6, 5.4], [0, 1.2, 0]);
      return { dof: { focus: 6, aperture: 0.001 } };
    },
  };
}

// ---------- Shot 6: the plastic bag gives up ----------
function shotBag({ makeStage }) {
  const D = C[6] - C[5];
  const scene = makeStage();
  scene.add(townRow({ z: -10, seed: 4 }));
  const man = standOn(makeHuman('oldman'));
  scene.add(man.root);
  const b = bag(); b.scale.set(1.0, 0.9, 1.0); b.rotation.x = Math.PI; scene.add(b);
  const apples = Array.from({ length: 6 }, () => apple());
  apples.forEach((a) => scene.add(a));
  const rain = nutRain({ count: 160, area: [8, 6], top: 7, speed: 7, size: 0.085 });
  scene.add(rain);
  scene.add(nutCarpet({ count: 160, area: [8, 6], size: 0.07 }));
  const camera = cam(34);
  const tTear = D * 0.45;
  return {
    scene, camera,
    update(t) {
      man.setPose({ ...ARMS_UP, lSh: [-0.25, 0, 2.85], rSh: [-0.25, 0, -2.85], lEl: [-0.35, 0, 0], rEl: [-0.35, 0, 0], neck: [0.05, 0, 0], head: [-0.1, 0, Math.sin(t * 9) * 0.04] });
      b.position.set(0, 2.42 + Math.sin(t * 9) * 0.02, 0.08);
      b.tear(range(t, tTear, tTear + 0.1));
      const after = t > tTear;
      man.setMouth(after ? 0.55 : 0.1);
      man.setBrows(after ? -1 : 0.2);
      man.look(0, after ? -0.3 : 0.6);
      apples.forEach((a, i) => {
        const u = Math.max(0, t - tTear - i * 0.07);
        const side = i % 2 ? 1 : -1;
        const x = side * (0.25 + rand(i, 70) * 0.1 + u * (0.6 + rand(i, 71) * 0.9));
        let y = 2.2 - 4.9 * u * u;
        const z = 0.1 + u * 0.5;
        if (y < 0.07) y = 0.07 + Math.abs(Math.sin(u * 9)) * 0.15 * Math.exp(-u * 3);
        a.position.set(x, after ? y : 2.3, z);
        a.visible = after;
        a.rotation.set(u * 5, u * 3, 0);
      });
      rain.update(t + 1);
      place(camera, [0.3, 1.6, kf(t, [[0, 5.2], [D, 4.6]])], [0, 1.55, 0]);
      shake(camera, t, tTear, 0.02, 0.3);
      return { dof: { focus: 4.9, aperture: 0.0015 } };
    },
  };
}

// ---------- Shot 7: the air is dangerous too (witch and the winged car) ----------
function shotSky({ makeStage }) {
  const D = C[7] - C[6];
  const scene = makeStage({ shadowBox: 14 });
  for (let i = 0; i < 2; i++) scene.add(townRow({ z: -6 - i * 7, start: -20, count: 13, seed: 20 + i }));
  const witch = makeHuman('witch');
  const rider = new THREE.Group();
  const br = broom(); br.rotation.y = -Math.PI / 2; br.position.set(0, 0.86, 0.1);
  rider.add(witch.root, br);
  rider.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  scene.add(rider);
  const car = wingedCar(); car.scale.setScalar(1.0); scene.add(car);
  const rain = nutRain({ count: 260, area: [26, 14], top: 16, bottom: 0, speed: 9, size: 0.12 });
  scene.add(rain);
  const camera = cam(46);
  return {
    scene, camera,
    update(t) {
      const k = t / D;
      // Witch crosses left to right in front, swerving.
      rider.position.set(lerp(-4.2, 3.2, k), 7.6 + Math.sin(t * 5) * 0.25, 1.5);
      rider.rotation.set(0, Math.PI / 2 - 0.35, Math.sin(t * 5) * 0.25);
      witch.setPose({
        lHip: [-1.45, 0, 0.12], rHip: [-1.45, 0, -0.12], lKn: [1.3, 0, 0], rKn: [1.3, 0, 0],
        lSh: [-1.0, 0, 0.1], rSh: [-1.15, 0, -0.1], lEl: [-0.5, 0, 0], rEl: [-0.4, 0, 0],
        spine: [0.25, 0, 0], neck: [-0.2, 0, 0], head: [-0.15, -0.5, 0],
      });
      witch.setMouth(0.7 + Math.sin(t * 20) * 0.1); witch.setBrows(1); witch.look(-0.5, 0.5);
      // Winged car flies right to left behind her, flapping.
      car.position.set(lerp(2, -9, k), 14.6 + Math.sin(t * 3) * 0.4, -9);
      car.rotation.set(Math.sin(t * 3) * 0.08, Math.PI + 0.25, Math.sin(t * 4) * 0.1);
      car.flap(Math.sin(t * 9) * 0.55);
      rain.update(t);
      place(camera, [0, 6.0, 9.5], [0, 10.2, 0]);
      return { bloom: 0.4 };
    },
  };
}

// ---------- Shot 8: the mechanism. A tyre crushes a nut and oil comes out ----------
function shotCrush({ makeStage }) {
  const D = C[8] - C[7];
  const scene = makeStage({ shadowBox: 4 });
  const wheel = bigWheel(); scene.add(wheel);
  const nut = hazelnut(); nut.scale.setScalar(0.28); scene.add(nut);
  const oil = oilSplat(0.55); scene.add(oil);
  const rip = rippleOverlay(0.9); rip.rotation.x = -Math.PI / 2; rip.position.y = 0.02; scene.add(rip);
  const ch = chips(26, '#6e4220', 0.8, 11); ch.position.y = 0.06; scene.add(ch);
  const drops = sparks(30, '#f2b13a', 0.7, 21); drops.position.y = 0.05; scene.add(drops);
  scene.add(nutCarpet({ count: 50, area: [6, 3], size: 0.08, center: [-1.5, 0, -1.2] }));
  const camera = cam(30);
  const R = 0.78;
  const tHit = D * 0.3;
  return {
    scene, camera,
    update(t) {
      const x = kf(t, [[0, -2.2], [tHit, -0.15], [D, 0.9]], ease.linear);
      wheel.position.set(x, R, 0);
      wheel.rotation.z = -x / R;
      const k = range(x, -0.45, -0.05);
      nut.flatten(ease.out(k) * 0.95);
      nut.scale.multiplyScalar(0.28);
      nut.position.set(0.0, 0.14 * (1 - k * 0.8), 0);
      oil.update(ease.out(range(t, tHit, tHit + 1.2)));
      rip.update(range(t, tHit, tHit + 1.0));
      ch.update(range(t, tHit - 0.05, tHit + 0.9));
      drops.update(range(t, tHit, tHit + 0.6));
      place(camera, [kf(t, [[0, 1.0], [D, 0.7]]), 0.55, 3.2], [-0.1, 0.45, 0]);
      shake(camera, t, tHit, 0.02, 0.35);
      return { dof: { focus: 3.2, aperture: 0.004, maxblur: 0.01 }, bloom: 0.45 };
    },
  };
}

// ---------- Shot 9: the courier slips on the oily road ----------
function shotSlip({ makeStage }) {
  const D = C[9] - C[8];
  const scene = makeStage();
  scene.add(townRow({ z: -9, seed: 6 }));
  const kid = standOn(makeHuman('courier'), 0, 0, 0.9);
  scene.add(kid.root);
  const oil = oilSplat(1.6, 8); oil.update(1); scene.add(oil);
  scene.add(nutCarpet({ count: 200, area: [10, 6], size: 0.07 }));
  const camera = cam(34);
  const tSlip = 0.9, tLand = 1.45;
  const run = (t) => walkPose(t * 1.6);
  const flail = (t) => ({
    lSh: [-0.6, 0, 2.2 + Math.sin(t * 22) * 0.4], rSh: [-0.6, 0, -2.2 - Math.sin(t * 22 + 1) * 0.4],
    lEl: [-0.6, 0, 0], rEl: [-0.6, 0, 0], lHip: [-1.5, 0, 0.1], rHip: [-0.3, 0, 0], lKn: [0.1, 0, 0], rKn: [0.6, 0, 0],
    spine: [0.35, 0, 0], neck: [-0.3, 0, 0], drop: 0.15,
  });
  const sit = {
    lHip: [-1.45, 0, 0.2], rHip: [-1.45, 0, -0.2], lKn: [0.25, 0, 0], rKn: [0.35, 0, 0],
    lSh: [0.2, 0, 0.5], rSh: [0.2, 0, -0.5], lEl: [-0.3, 0, 0], rEl: [-0.3, 0, 0],
    spine: [0.25, 0, 0], neck: [-0.1, 0, 0.1], head: [0.05, 0, 0.1], drop: 0.62,
  };
  return {
    scene, camera,
    update(t) {
      let pose, x;
      if (t < tSlip) { pose = run(t); x = -1.6 + t * 1.5; }
      else if (t < tLand) { pose = lerpPose(run(tSlip), flail(t), ease.out(range(t, tSlip, tSlip + 0.2))); x = -1.6 + tSlip * 1.5 + (t - tSlip) * 1.2; }
      else { pose = lerpPose(flail(tLand), sit, ease.out(range(t, tLand, tLand + 0.15))); x = -1.6 + tSlip * 1.5 + (tLand - tSlip) * 1.2 + ease.out(range(t, tLand, tLand + 0.6)) * 0.35; }
      kid.root.position.x = x;
      kid.setPose(pose);
      const shock = t > tSlip;
      kid.setMouth(shock ? (t < tLand + 0.3 ? 0.8 : 0.35) : 0.1);
      kid.setBrows(shock ? (t < tLand + 0.3 ? 1 : -0.6) : 0);
      kid.setEyes(t > tLand && t < tLand + 0.6 ? 0.15 : 1);
      place(camera, [x + 0.6, 1.25, 4.0], [x + 0.2, 0.85, 0]);
      shake(camera, t, tLand, 0.05, 0.45);
      return { dof: { focus: 4.0, aperture: 0.0015 } };
    },
  };
}

// ---------- Shot 10: payoff. Free snacks. ----------
function shotSnacks({ makeStage }) {
  const D = C[10] - C[9];
  const scene = makeStage();
  scene.add(townRow({ z: -10, seed: 9 }));
  const man = standOn(makeHuman('oldman'), -0.45, 0, 0.35);
  const kid = standOn(makeHuman('courier'), 0.45, 0, -0.35);
  scene.add(man.root, kid.root);
  scene.add(nutCarpet({ count: 900, area: [12, 8], size: 0.09, density: 1.4 }));
  const nm = hazelnut(); nm.scale.setScalar(0.09); nm.position.set(0, -0.08, 0.06); man.joints.rWr.add(nm);
  const nk = walnut(); nk.scale.setScalar(0.1); nk.position.set(0, -0.08, 0.06); kid.joints.lWr.add(nk);
  const camera = cam(34);
  return {
    scene, camera,
    update(t) {
      const eat = (tt) => 0.5 - 0.5 * Math.cos(Math.min(1, tt) * Math.PI);
      const a = eat(t / 0.6) * (t < 1.6 ? 1 : 1 - eat((t - 1.6) / 0.5));
      man.setPose({ ...STAND, rSh: [lerp(0, -0.85, a), 0, lerp(-0.12, -0.45, a)], rEl: [lerp(-0.15, -2.15, a), 0, 0], head: [0.05, 0, 0.05] });
      kid.setPose({ ...STAND, lSh: [lerp(0, -0.85, a), 0, lerp(0.12, 0.45, a)], lEl: [lerp(-0.15, -2.15, a), 0, 0], head: [0.05, 0, -0.05] });
      const chew = t > 0.6 ? 0.15 + Math.abs(Math.sin(t * 11)) * 0.3 : 0;
      man.setMouth(chew); kid.setMouth(chew);
      man.setBrows(0.4); kid.setBrows(0.4);
      man.look(0.2, 0); kid.look(-0.2, 0);
      const happy = t > 1.4 ? 0.55 : 1;
      man.setEyes(happy); kid.setEyes(happy);
      nm.visible = t < 0.65 || t > 1.9; nk.visible = nm.visible;
      place(camera, [0, 1.5, kf(t, [[0, 6.2], [D, 5.4]])], [0, 1.2, 0]);
      return { dof: { focus: 5.8, aperture: 0.0012 }, bloom: 0.45 };
    },
  };
}

export const SHOTS = [shotHook, shotCosy, shotFall, shotRoofHit, shotDents, shotBag, shotSky, shotCrush, shotSlip, shotSnacks]
  .map((build, i) => ({ start: C[i], end: C[i + 1], build }));
