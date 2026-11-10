// Canvas-made textures and the materials built on them.
import * as THREE from 'three';
import { rand } from './anim.js';

function canvasTex(size, draw, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Soft woven noise for cloth.
export function fabricTex(hex, repeat = 3) {
  return canvasTex(128, (g, s) => {
    g.fillStyle = hex; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 1400; i++) {
      const v = rand(i, 3) > 0.5 ? 255 : 0;
      g.fillStyle = `rgba(${v},${v},${v},${0.03 + rand(i, 4) * 0.04})`;
      g.fillRect(rand(i, 1) * s, rand(i, 2) * s, 2, 1 + rand(i, 5) * 3);
    }
  }, repeat);
}

// Hazelnut shell: warm brown with fine vertical stripes.
export function shellTex() {
  return canvasTex(256, (g, s) => {
    const grd = g.createLinearGradient(0, 0, 0, s);
    grd.addColorStop(0, '#9a6332'); grd.addColorStop(1, '#6e4220');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(40,20,5,${0.15 + rand(i, 7) * 0.2})`;
      g.lineWidth = 1 + rand(i, 8) * 2;
      const x = rand(i, 9) * s;
      g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, s * 0.3, x - 6, s * 0.7, x + 3, s); g.stroke();
    }
  });
}

// Asphalt with speckles.
export function asphaltTex(repeat = 30) {
  return canvasTex(256, (g, s) => {
    g.fillStyle = '#5f646c'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 6000; i++) {
      const v = Math.floor(60 + rand(i, 11) * 90);
      g.fillStyle = `rgba(${v},${v},${v + 6},0.35)`;
      g.fillRect(rand(i, 12) * s, rand(i, 13) * s, 1.5, 1.5);
    }
  }, repeat);
}

// Number plate.
export function plateTex(text) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#1d4fb8'; g.fillRect(0, 0, 60, 128);
  g.strokeStyle = '#222'; g.lineWidth = 8; g.strokeRect(4, 4, 504, 120);
  g.fillStyle = '#111'; g.font = 'bold 84px "DejaVu Sans", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 285, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const cache = new Map();
function once(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

export const mat = {
  skin: (hex = '#f2b48c') => once('skin' + hex, () => new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color('#ff9a7a') })),
  cloth: (hex) => once('cloth' + hex, () => new THREE.MeshStandardMaterial({ color: '#ffffff', map: fabricTex(hex), roughness: 0.9 })),
  matte: (hex, rough = 0.7) => once('matte' + hex + rough, () => new THREE.MeshStandardMaterial({ color: hex, roughness: rough })),
  gloss: (hex) => once('gloss' + hex, () => new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 })),
  paint: (hex) => once('paint' + hex, () => new THREE.MeshPhysicalMaterial({ color: hex, metalness: 0.2, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 })),
  chrome: () => once('chrome', () => new THREE.MeshStandardMaterial({ color: '#d8dde3', metalness: 1, roughness: 0.18 })),
  steel: () => once('steel', () => new THREE.MeshStandardMaterial({ color: '#9aa3ad', metalness: 0.9, roughness: 0.35 })),
  rubber: () => once('rubber', () => new THREE.MeshStandardMaterial({ color: '#1b1c1f', roughness: 0.85 })),
  glass: () => once('glass', () => new THREE.MeshPhysicalMaterial({ color: '#2a3c55', metalness: 0.1, roughness: 0.05, clearcoat: 1 })),
  eyeWhite: () => once('eyeW', () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.15, clearcoat: 1 })),
  pupil: () => once('pupil', () => new THREE.MeshPhysicalMaterial({ color: '#141414', roughness: 0.1, clearcoat: 1 })),
  mouth: () => once('mouth', () => new THREE.MeshStandardMaterial({ color: '#5a1418', roughness: 0.6 })),
  shell: () => once('shell', () => new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: shellTex(), roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4 })),
  shellCap: () => once('shellCap', () => new THREE.MeshStandardMaterial({ color: '#d9b27c', roughness: 0.9 })),
  walnut: () => once('walnut', () => new THREE.MeshStandardMaterial({ color: '#b98a55', roughness: 0.8 })),
  oil: () => once('oil', () => new THREE.MeshPhysicalMaterial({ color: '#c9902a', roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.85 })),
  asphalt: () => once('asphalt', () => new THREE.MeshStandardMaterial({ color: '#ffffff', map: asphaltTex(), roughness: 0.92 })),
  plastic: (hex = '#b9e39a') => once('plastic' + hex, () => new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.25, transmission: 0.0, transparent: true, opacity: 0.72, side: THREE.DoubleSide })),
  glow: (hex) => once('glow' + hex, () => new THREE.MeshBasicMaterial({ color: hex })),
};
