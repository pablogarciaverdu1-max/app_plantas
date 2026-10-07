import * as THREE from 'three';
import type { LightingState } from '../mission/TimeOfDay';

const vertexShader = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // keep the dome on the far plane
}`;

// Overcast procedural sky: gradient, heavy cloud deck, soft glow around the moon or sun,
// horizon blended into the fog colour so ground and sky meet without a seam.
const fragmentShader = /* glsl */ `
uniform vec3 skyTop;
uniform vec3 skyHorizon;
uniform vec3 fogColor;
uniform vec3 lightDir;
uniform vec3 lightColor;
uniform float lightGlow;
uniform float time;
varying vec3 vDir;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; }
  return s;
}

void main() {
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  vec3 col = mix(skyHorizon, skyTop, pow(h, 0.6));

  // Cloud deck projected on a plane; coverage is high (overcast) with thin breaks.
  vec2 uv = d.xz / max(d.y, 0.04) * 0.9 + vec2(time * 0.004, time * 0.002);
  float c = fbm(uv * 1.3);
  float cover = smoothstep(0.32, 0.62, c);
  float sunAmount = max(dot(d, lightDir), 0.0);
  vec3 cloudLit = mix(skyHorizon * 0.9, skyHorizon * 1.25 + lightColor * 0.04 * lightGlow, fbm(uv * 2.7 + 3.0));
  col = mix(col, cloudLit, cover * 0.85);

  // Diffuse glow through the clouds; no hard disc behind an overcast sky.
  col += lightColor * lightGlow * (pow(sunAmount, 8.0) * 0.25 + pow(sunAmount, 64.0) * 0.5) * (1.0 - cover * 0.6);

  // Fog swallows the horizon.
  float horizon = 1.0 - smoothstep(0.0, 0.22, d.y);
  col = mix(col, fogColor, horizon);
  if (d.y < 0.0) col = fogColor;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Sky {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor(radius = 900) {
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        skyTop: { value: new THREE.Color() },
        skyHorizon: { value: new THREE.Color() },
        fogColor: { value: new THREE.Color() },
        lightDir: { value: new THREE.Vector3(0, 1, 0) },
        lightColor: { value: new THREE.Color() },
        lightGlow: { value: 1 },
        time: { value: 0 },
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
    this.mesh.name = 'sky';
  }

  apply(state: LightingState, lightDir: THREE.Vector3): void {
    const u = this.material.uniforms;
    (u.skyTop.value as THREE.Color).setRGB(...state.skyTop);
    (u.skyHorizon.value as THREE.Color).setRGB(...state.skyHorizon);
    (u.fogColor.value as THREE.Color).setRGB(...state.fogColor);
    (u.lightColor.value as THREE.Color).setRGB(...state.lightColor);
    (u.lightDir.value as THREE.Vector3).copy(lightDir);
    u.lightGlow.value = state.lightIntensity;
  }

  update(time: number, cameraPosition: THREE.Vector3): void {
    this.material.uniforms.time.value = time;
    this.mesh.position.copy(cameraPosition);
  }
}
