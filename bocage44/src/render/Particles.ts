import * as THREE from 'three';
import { Surface } from '../damage/SurfaceMaterial';

/**
 * Dust, splinters and blood mist drawn as one point cloud (one draw call).
 * Each particle grows, drifts and fades; the wind carries it slowly.
 */
const MAX = 600;

const vertex = /* glsl */ `
attribute float size;
attribute float alpha;
attribute vec3 tint;
varying float vAlpha;
varying vec3 vTint;
void main() {
  vAlpha = alpha;
  vTint = tint;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * 900.0 / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const fragment = /* glsl */ `
varying float vAlpha;
varying vec3 vTint;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  if (r > 0.5) discard;
  float soft = smoothstep(0.5, 0.0, r);
  gl_FragColor = vec4(vTint, vAlpha * soft);
  #include <colorspace_fragment>
}`;

const COLORS: Record<Surface, [number, number, number]> = {
  [Surface.Earth]: [0.13, 0.1, 0.07],
  [Surface.Stone]: [0.55, 0.52, 0.46],
  [Surface.Wood]: [0.35, 0.27, 0.18],
  [Surface.Hedge]: [0.16, 0.2, 0.1],
  [Surface.Metal]: [0.4, 0.4, 0.4],
  [Surface.Flesh]: [0.3, 0.03, 0.02],
  [Surface.Sandbag]: [0.4, 0.35, 0.25],
};

export class Particles {
  readonly points: THREE.Points;
  private readonly pos = new Float32Array(MAX * 3);
  private readonly vel = new Float32Array(MAX * 3);
  private readonly size = new Float32Array(MAX);
  private readonly grow = new Float32Array(MAX);
  private readonly alpha = new Float32Array(MAX);
  private readonly life = new Float32Array(MAX);
  private readonly maxLife = new Float32Array(MAX);
  private readonly tint = new Float32Array(MAX * 3);
  private next = 0;
  private readonly geo = new THREE.BufferGeometry();

  constructor() {
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo.setAttribute('tint', new THREE.BufferAttribute(this.tint, 3));
    const mat = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.userData.noCollision = true;
  }

  impact(point: THREE.Vector3, normal: THREE.Vector3, surface: Surface): void {
    const c = COLORS[surface];
    const n = surface === Surface.Flesh ? 5 : 7;
    for (let i = 0; i < n; i++) {
      const v = normal.clone().multiplyScalar(0.6 + Math.random() * 1.6);
      v.x += (Math.random() - 0.5) * 1.2;
      v.y += Math.random() * 0.8;
      v.z += (Math.random() - 0.5) * 1.2;
      const big = i === 0;
      this.spawn(point, v, big ? 0.05 : 0.02 + Math.random() * 0.03, big ? 0.5 : 0.25, surface === Surface.Flesh ? 0.5 : 0.85, 0.6 + Math.random() * 1.0, c);
    }
  }

  private spawn(p: THREE.Vector3, v: THREE.Vector3, size: number, grow: number, alpha: number, life: number, c: [number, number, number]): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    this.pos.set([p.x, p.y, p.z], i * 3);
    this.vel.set([v.x, v.y, v.z], i * 3);
    this.tint.set(c, i * 3);
    this.size[i] = size;
    this.grow[i] = grow;
    this.alpha[i] = alpha;
    this.life[i] = life;
    this.maxLife[i] = life;
  }

  update(dt: number, wind: THREE.Vector3): void {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) {
        this.alpha[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      const k = Math.exp(-dt * 3);
      this.vel[i * 3] = this.vel[i * 3] * k + wind.x * (1 - k);
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * k - 0.3 * dt;
      this.vel[i * 3 + 2] = this.vel[i * 3 + 2] * k + wind.z * (1 - k);
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] += this.grow[i] * dt;
      this.alpha[i] = Math.max(0, this.alpha[i] * Math.min(1, this.life[i] / (this.maxLife[i] * 0.6) + 0.2) * Math.exp(-dt * 0.8));
    }
    for (const name of ['position', 'size', 'alpha', 'tint']) (this.geo.attributes[name] as THREE.BufferAttribute).needsUpdate = true;
  }
}
