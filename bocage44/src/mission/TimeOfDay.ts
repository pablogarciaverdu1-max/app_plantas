/**
 * Lighting state driven by mission progress (0 = 04:30 start, 1 = 06:15 end).
 * Pure logic: returns plain numbers that the renderer applies.
 */
export const START_HOUR = 4.5;
export const END_HOUR = 6.25;

export type RGB = [number, number, number];

export interface LightingState {
  hour: number;
  /** Elevation of the key light (moon at night, sun after dawn) in degrees. */
  lightElevation: number;
  lightAzimuth: number;
  lightIntensity: number;
  lightColor: RGB;
  ambientIntensity: number;
  skyTop: RGB;
  skyHorizon: RGB;
  fogColor: RGB;
  /** Distance in metres at which ground-level fog hides about 95 % of a scene. */
  visibility: number;
  exposure: number;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerpRGB = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const smooth = (t: number): number => t * t * (3 - 2 * t);
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));

// Night and dawn keyframes. Colours are linear, chosen to stay muted (see art bible palette).
const NIGHT = {
  skyTop: [0.006, 0.009, 0.014] as RGB,
  skyHorizon: [0.02, 0.026, 0.034] as RGB,
  fog: [0.016, 0.02, 0.026] as RGB,
  light: [0.55, 0.65, 0.85] as RGB,
};
const DAWN = {
  skyTop: [0.18, 0.21, 0.24] as RGB,
  skyHorizon: [0.3, 0.31, 0.31] as RGB,
  fog: [0.26, 0.28, 0.29] as RGB,
  light: [1.0, 0.86, 0.7] as RGB,
};

export function hourAt(progress: number): number {
  return lerp(START_HOUR, END_HOUR, clamp01(progress));
}

export function lightingAt(progress: number): LightingState {
  const p = clamp01(progress);
  const t = smooth(p);
  return {
    hour: hourAt(p),
    // Moon low in the west at night, sun rising in the east (azimuth in degrees from north).
    lightElevation: lerp(18, 6, t),
    lightAzimuth: p < 0.5 ? 250 : 80,
    lightIntensity: lerp(0.25, 1.6, t),
    lightColor: lerpRGB(NIGHT.light, DAWN.light, t),
    ambientIntensity: lerp(0.12, 0.6, t),
    skyTop: lerpRGB(NIGHT.skyTop, DAWN.skyTop, t),
    skyHorizon: lerpRGB(NIGHT.skyHorizon, DAWN.skyHorizon, t),
    fogColor: lerpRGB(NIGHT.fog, DAWN.fog, t),
    visibility: lerp(60, 200, t),
    exposure: lerp(1.6, 0.9, t),
  };
}

/** Exponential fog density giving 95 % extinction at the given visibility distance. */
export function fogDensityForVisibility(visibility: number): number {
  return -Math.log(0.05) / visibility;
}
