import * as THREE from 'three';
import { fbm, valueNoise } from '../world/Noise';

/**
 * Tileable PBR texture sets generated on a canvas at start-up, so the ground costs
 * nothing in the single-file build. Albedo stays inside the 30–240 sRGB range of the art bible.
 */
export interface PbrTextures {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  aoMap: THREE.Texture;
}

const clampByte = (v: number): number => Math.max(30, Math.min(240, Math.round(v)));

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D, ImageData] {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx, ctx.createImageData(size, size)];
}

function toTexture(canvas: HTMLCanvasElement, srgb: boolean): THREE.Texture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

/** Wet meadow grass mixed with patches of trodden mud. */
export function createMeadowTextures(size = 512): PbrTextures {
  const period = 8; // noise cells across the tile, must divide evenly for seamless tiling
  const height = new Float32Array(size * size);
  const mud = new Float32Array(size * size);

  const [cAlbedo, xAlbedo, dAlbedo] = makeCanvas(size);
  const [cRough, xRough, dRough] = makeCanvas(size);
  const [cAo, xAo, dAo] = makeCanvas(size);
  const [cNorm, xNorm, dNorm] = makeCanvas(size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * period;
      const v = (y / size) * period;
      const i = y * size + x;
      const patch = fbm(u * 0.5, v * 0.5, 4, 11, period * 0.5);
      const mudMask = Math.min(1, Math.max(0, (0.4 - patch) * 4));
      // Blades: high-frequency streaky noise, stretched to suggest fallen wet grass.
      const blades = valueNoise(u * 24, v * 7, 23, period * 24) * 0.6 + valueNoise(u * 48, v * 48, 29, period * 48) * 0.4;
      const clump = fbm(u * 2, v * 2, 3, 31, period * 2);
      const h = (1 - mudMask) * (blades * 0.7 + clump * 0.3) + mudMask * fbm(u * 6, v * 6, 3, 41, period * 6) * 0.35;
      height[i] = h;
      mud[i] = mudMask;

      // Hedge green #3F4A2A blended toward a yellowed dry tone, mud #4A3B2A.
      const g = 0.75 + blades * 0.45;
      const dry = clump * 0.35;
      const grassR = (63 + dry * 40) * g;
      const grassG = (74 + dry * 22) * g;
      const grassB = (42 + dry * 6) * g;
      const m = 0.8 + h * 0.6;
      const mudR = 74 * m;
      const mudG = 59 * m;
      const mudB = 42 * m;
      const p = i * 4;
      dAlbedo.data[p] = clampByte(grassR + (mudR - grassR) * mudMask);
      dAlbedo.data[p + 1] = clampByte(grassG + (mudG - grassG) * mudMask);
      dAlbedo.data[p + 2] = clampByte(grassB + (mudB - grassB) * mudMask);
      dAlbedo.data[p + 3] = 255;

      // Wet mud is glossy in its hollows; grass is rough.
      const rough = (0.92 - mudMask * (0.45 + (1 - h) * 0.25)) * 255;
      dRough.data[p] = dRough.data[p + 1] = dRough.data[p + 2] = rough;
      dRough.data[p + 3] = 255;

      const ao = (0.55 + h * 0.45) * 255;
      dAo.data[p] = dAo.data[p + 1] = dAo.data[p + 2] = ao;
      dAo.data[p + 3] = 255;
    }
  }

  // Normal map from the height field with wrap-around central differences.
  const strength = 2.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = height[y * size + ((x - 1 + size) % size)];
      const r = height[y * size + ((x + 1) % size)];
      const t = height[((y - 1 + size) % size) * size + x];
      const b = height[((y + 1) % size) * size + x];
      const nx = (l - r) * strength;
      const ny = (t - b) * strength;
      const len = Math.hypot(nx, ny, 1);
      const p = (y * size + x) * 4;
      dNorm.data[p] = ((nx / len) * 0.5 + 0.5) * 255;
      dNorm.data[p + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      dNorm.data[p + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      dNorm.data[p + 3] = 255;
    }
  }

  xAlbedo.putImageData(dAlbedo, 0, 0);
  xRough.putImageData(dRough, 0, 0);
  xAo.putImageData(dAo, 0, 0);
  xNorm.putImageData(dNorm, 0, 0);

  return {
    map: toTexture(cAlbedo, true),
    normalMap: toTexture(cNorm, false),
    roughnessMap: toTexture(cRough, false),
    aoMap: toTexture(cAo, false),
  };
}

/** Weathered, unvarnished grey wood (fence posts, barn planks). */
export function createWeatheredWoodTextures(size = 256): PbrTextures {
  const [cAlbedo, xAlbedo, dAlbedo] = makeCanvas(size);
  const [cRough, xRough, dRough] = makeCanvas(size);
  const [cNorm, xNorm, dNorm] = makeCanvas(size);
  const [cAo, xAo, dAo] = makeCanvas(size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 4;
      const v = (y / size) * 4;
      const grain = valueNoise(u * 16, v * 1.2, 5, 64) * 0.7 + valueNoise(u * 40, v * 3, 9, 160) * 0.3;
      const stain = fbm(u, v, 3, 13, 4);
      const base = 92 + grain * 50 - stain * 35;
      const p = (y * size + x) * 4;
      dAlbedo.data[p] = clampByte(base * 1.0);
      dAlbedo.data[p + 1] = clampByte(base * 0.95);
      dAlbedo.data[p + 2] = clampByte(base * 0.86);
      dAlbedo.data[p + 3] = 255;
      dRough.data[p] = dRough.data[p + 1] = dRough.data[p + 2] = 220 + grain * 30;
      dRough.data[p + 3] = 255;
      const n = (grain - 0.5) * 0.6;
      dNorm.data[p] = (n * 0.5 + 0.5) * 255;
      dNorm.data[p + 1] = 128;
      dNorm.data[p + 2] = 245;
      dNorm.data[p + 3] = 255;
      dAo.data[p] = dAo.data[p + 1] = dAo.data[p + 2] = 170 + grain * 85;
      dAo.data[p + 3] = 255;
    }
  }
  xAlbedo.putImageData(dAlbedo, 0, 0);
  xRough.putImageData(dRough, 0, 0);
  xNorm.putImageData(dNorm, 0, 0);
  xAo.putImageData(dAo, 0, 0);
  return {
    map: toTexture(cAlbedo, true),
    normalMap: toTexture(cNorm, false),
    roughnessMap: toTexture(cRough, false),
    aoMap: toTexture(cAo, false),
  };
}
