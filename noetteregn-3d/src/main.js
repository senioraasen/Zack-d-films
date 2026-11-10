// Renderer, sky, lighting, post (depth of field, bloom, grade) and window.renderAt(t).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SHOTS, CAPTIONS, FADES, DURATION } from './shots.js';
import { mat } from './materials.js';

const W = 720, H = 1280;
const gl = document.createElement('canvas');
gl.width = W; gl.height = H;
const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ---------- Stage: sky, lights, ground ----------
function skyTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#0b56c9'); grd.addColorStop(0.6, '#2f8ae8'); grd.addColorStop(1, '#8cc6f7');
  g.fillStyle = grd; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const SKY = skyTexture();
const PMREM = new THREE.PMREMGenerator(renderer);
let ENV = null;
function envMap() {
  if (ENV) return ENV;
  const s = new THREE.Scene();
  s.background = SKY;
  const geo = new THREE.SphereGeometry(10, 32, 16);
  const m = new THREE.MeshBasicMaterial({ map: SKY, side: THREE.BackSide });
  s.add(new THREE.Mesh(geo, m));
  const ground = new THREE.Mesh(new THREE.CircleGeometry(10, 32), new THREE.MeshBasicMaterial({ color: '#8a8f96' }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5; s.add(ground);
  ENV = PMREM.fromScene(s, 0.02).texture;
  return ENV;
}

export function makeStage({ ground = 'asphalt', groundSize = 120, sun = [6, 12, 8], shadowBox = 8, fog = true } = {}) {
  const scene = new THREE.Scene();
  scene.background = SKY;
  scene.environment = envMap();
  scene.environmentIntensity = 0.3;
  if (fog) scene.fog = new THREE.Fog('#8cc6f7', 35, 140);
  scene.add(new THREE.HemisphereLight('#cfe8ff', '#6a5e52', 0.55));
  const key = new THREE.DirectionalLight('#fff1dc', 2.3);
  key.position.set(...sun);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const c = key.shadow.camera;
  c.left = c.bottom = -shadowBox; c.right = c.top = shadowBox; c.near = 0.5; c.far = 60;
  scene.add(key, key.target);
  scene.userData.key = key;
  const rim = new THREE.DirectionalLight('#cfe4ff', 0.8);
  rim.position.set(-6, 5, -8);
  scene.add(rim);
  if (ground) {
    const gm = ground === 'asphalt' ? mat.asphalt() : mat.matte(ground, 0.9);
    const plane = new THREE.Mesh(new THREE.CircleGeometry(groundSize, 64), gm);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);
    scene.userData.ground = plane;
  }
  return scene;
}

// ---------- Post ----------
const target = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, target);
const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
const bokeh = new BokehPass(new THREE.Scene(), new THREE.PerspectiveCamera(), { focus: 5, aperture: 0.002, maxblur: 0.006 });
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.35, 0.5, 0.88);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uFade: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `varying vec2 vUv; uniform sampler2D tDiffuse; uniform float uTime; uniform float uFade;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime * 17.0) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      float l = dot(col, vec3(0.299,0.587,0.114));
      col = mix(vec3(l), col, 1.12);                 // a touch more saturation
      vec2 d = vUv - 0.5; d.x *= 0.5625;
      col *= 1.0 - smoothstep(0.32, 0.75, length(d)) * 0.35;   // vignette
      col += (hash(vUv * 900.0) - 0.5) * 0.025;       // light grain
      col *= 1.0 - uFade;
      gl_FragColor = vec4(col, c.a);
    }`,
});
composer.addPass(renderPass);
composer.addPass(bokeh);
composer.addPass(bloom);
composer.addPass(new OutputPass());
composer.addPass(grade);

// ---------- Shots ----------
const built = new Map();
function getShot(i) {
  if (!built.has(i)) built.set(i, SHOTS[i].build({ makeStage }));
  return built.get(i);
}
function shotAt(t) {
  for (let i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i].start && t < SHOTS[i].end) return i;
  return SHOTS.length - 1;
}

// ---------- Captions on a 2D canvas over the 3D frame ----------
const out = document.getElementById('out');
const ctx = out.getContext('2d');
function drawCaption(t) {
  for (let i = 0; i < CAPTIONS.length; i++) {
    const [start, text, endOpt] = CAPTIONS[i];
    const next = CAPTIONS[i + 1] ? CAPTIONS[i + 1][0] : DURATION;
    const end = Math.min(endOpt ?? next, next);
    if (t < start || t >= end) continue;
    const pop = Math.min(1, (t - start) / 0.08);
    const s = 0.82 + 0.18 * pop + 0.05 * Math.sin(Math.min(1, (t - start) / 0.18) * Math.PI);
    ctx.save();
    ctx.translate(W / 2, 990);
    ctx.scale(s, s);
    let size = 66;
    ctx.font = `bold ${size}px "DejaVu Sans", sans-serif`;
    while (ctx.measureText(text).width > 620 && size > 40) {
      size -= 2;
      ctx.font = `bold ${size}px "DejaVu Sans", sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    ctx.strokeText(text, 0, 0);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
}

function fadeAt(t) {
  let f = 0;
  for (const [at, half] of FADES) f = Math.max(f, 1 - Math.min(1, Math.abs(t - at) / half));
  return f;
}

window.renderAt = (t) => {
  const i = shotAt(t);
  const shot = getShot(i);
  const local = t - SHOTS[i].start;
  const fx = shot.update(local) || {};
  renderPass.scene = bokeh.scene = shot.scene;
  renderPass.camera = bokeh.camera = shot.camera;
  bokeh.enabled = !!fx.dof;
  if (fx.dof) {
    bokeh.uniforms.focus.value = fx.dof.focus;
    bokeh.uniforms.aperture.value = fx.dof.aperture ?? 0.002;
    bokeh.uniforms.maxblur.value = fx.dof.maxblur ?? 0.006;
  }
  bloom.strength = fx.bloom ?? 0.35;
  renderer.toneMappingExposure = fx.exposure ?? 0.92;
  grade.uniforms.uTime.value = t;
  grade.uniforms.uFade.value = fadeAt(t);
  composer.render();
  ctx.drawImage(gl, 0, 0, W, H);
  drawCaption(t);
  return out.toDataURL('image/jpeg', 0.93);
};
window.DURATION = DURATION;
window.READY = true;

// Live preview: index.html?t=12.5 shows one frame; otherwise click to play with audio.m4a.
const q = new URLSearchParams(location.search);
if (q.has('t')) window.renderAt(parseFloat(q.get('t')));
else if (!navigator.webdriver) {
  window.renderAt(0);
  out.addEventListener('click', () => {
    const a = new Audio('audio.m4a');
    a.play().catch(() => {});
    const t0 = performance.now();
    const loop = () => {
      const t = a.currentTime || (performance.now() - t0) / 1000;
      if (t < DURATION) { window.renderAt(t); requestAnimationFrame(loop); }
    };
    loop();
  }, { once: true });
}
