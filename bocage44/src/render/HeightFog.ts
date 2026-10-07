import * as THREE from 'three';

/**
 * Replaces three.js's distance fog with exponential height fog: dense near the
 * ground, thinning with altitude. Uses the scene's FogExp2 colour and density
 * (density = value at ground level). Must run before any material compiles.
 */
export const FOG_FALLOFF = 0.09; // per metre: density halves roughly every 8 m of altitude
export const FOG_BASE_HEIGHT = 0;

export function installHeightFog(): void {
  THREE.ShaderChunk.fog_pars_vertex = /* glsl */ `
#ifdef USE_FOG
  varying vec3 vFogRel;
#endif`;

  // mvPosition already includes instancing and skinning; rotate it back to world axes
  // to get the camera-to-vertex vector without a matrix inverse.
  THREE.ShaderChunk.fog_vertex = /* glsl */ `
#ifdef USE_FOG
  vFogRel = transpose(mat3(viewMatrix)) * mvPosition.xyz;
#endif`;

  THREE.ShaderChunk.fog_pars_fragment = /* glsl */ `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying vec3 vFogRel;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`;

  THREE.ShaderChunk.fog_fragment = /* glsl */ `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogDist = length(vFogRel);
    float camH = cameraPosition.y - ${FOG_BASE_HEIGHT.toFixed(2)};
    float dy = vFogRel.y;
    float k = ${FOG_FALLOFF.toFixed(4)};
    // Integral of density * exp(-k * h) along the view ray.
    float rel = abs(dy) > 0.01 ? (1.0 - exp(-k * dy)) / (k * dy) : 1.0;
    float optical = fogDensity * exp(-k * camH) * fogDist * rel;
    float fogFactor = 1.0 - exp(-optical);
  #else
    float fogFactor = smoothstep(fogNear, fogFar, length(vFogRel));
  #endif
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif`;
}
