// Small, deterministic animation helpers. Everything is a pure function of time.
import * as THREE from 'three';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const range = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);

export const ease = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  elastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
};

// Keyframes: kf(t, [[t0, v0], [t1, v1], ...], easing). Values may be numbers or arrays.
export function kf(t, keys, e = ease.inOut) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, a] = keys[i - 1];
      const [t1, b] = keys[i];
      const k = e((t - t0) / (t1 - t0));
      return Array.isArray(a) ? a.map((v, j) => lerp(v, b[j], k)) : lerp(a, b, k);
    }
  }
  return keys[keys.length - 1][1];
}

export function cam(fov = 34) {
  const c = new THREE.PerspectiveCamera(fov, 720 / 1280, 0.05, 400);
  return c;
}

export function place(camera, pos, look) {
  camera.position.set(...pos);
  camera.lookAt(new THREE.Vector3(...look));
}

// Deterministic camera shake that decays after `start`.
export function shake(camera, t, start, amp = 0.06, dur = 0.5) {
  const k = range(t, start, start + dur);
  if (t < start || k >= 1) return;
  const a = amp * Math.pow(1 - k, 2);
  camera.position.x += a * Math.sin(t * 91.7);
  camera.position.y += a * Math.sin(t * 77.3 + 1.3);
  camera.rotation.z += a * 0.5 * Math.sin(t * 63.1 + 2.1);
}

// Hash-based pseudo random, stable for a given seed.
export function rand(i, salt = 0) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Two-bone arm IK in the shoulder's local frame (arm hangs along -y, forward is +z).
// Returns [shoulderEuler, elbowEuler] that put the wrist at `target` (local to shoulder).
export function ikArm(target, upper = 0.3, lower = 0.27) {
  const d = Math.min(target.length(), upper + lower - 1e-3);
  const bend = Math.PI - Math.acos(clamp((upper * upper + lower * lower - d * d) / (2 * upper * lower), -1, 1));
  const dir = target.clone().normalize();
  const base = Math.acos(clamp((upper * upper + d * d - lower * lower) / (2 * upper * d), -1, 1));
  const pitch = Math.atan2(dir.z, -dir.y);
  const yawZ = Math.asin(clamp(dir.x, -1, 1));
  return [[-(pitch + base), 0, yawZ], [-bend, 0, 0]];
}
