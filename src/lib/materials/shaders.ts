/**
 * Procedural Shader Nodes — PerspX
 *
 * TSL (Three Shading Language) node factories for each shader type.
 * Each factory returns a TSL Node that, when evaluated per-pixel, produces
 * the final vec4 color to output.
 *
 * All shaders are screen-space post-process effects.
 * They receive the scene color texture node and UV coordinates as inputs.
 */

import {
  Fn,
  uv,
  vec2,
  vec4,
  float,
  uniform,
  mix,
  step,
  sin,
  cos,
  fract,
  dot,
  floor,
  abs,
  max,
  min,
  clamp,
  smoothstep,
  add,
  sub,
  mul,
  div,
  length,
} from 'three/tsl';

import type { ShaderType } from '$lib/stores/shader.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute luminance from an rgb vec3 or vec4 */
function luminance(colorNode: any): any {
  // BT.709 luminance coefficients
  return add(
    add(mul(colorNode.r, 0.2126), mul(colorNode.g, 0.7152)),
    mul(colorNode.b, 0.0722)
  );
}

// ---------------------------------------------------------------------------
// Manga Hatch
// ---------------------------------------------------------------------------

function buildMangaNode(
  sceneTexNode: any,
  uniformScale: any,
  uniformAngle: any,
  uniformIntensity: any,
  uniformThreshold: any,
  uvCoord: any
): any {
  return Fn(() => {
    const sceneColor = sceneTexNode.sample(uvCoord);
    const lum = luminance(sceneColor);

    // Rotate UV by angle
    const angleRad = mul(uniformAngle, Math.PI / 180);
    const cosA = cos(angleRad);
    const sinA = sin(angleRad);

    const sc = mul(uvCoord, uniformScale) as any;
    // Rotate: x' = x*cos - y*sin, y' = x*sin + y*cos
    const rx = sub(mul(sc.x, cosA), mul(sc.y, sinA));
    // Use only the rotated x-axis projection (creates diagonal lines)
    const lineCoord = fract(rx);

    // Line thickness driven by (1 - luminance): dark areas → thick hatching
    const darkness = clamp(sub(1.0, lum), 0.0, 1.0);
    const lineThickness = mul(darkness, uniformThreshold);

    const isLine = step(lineThickness, lineCoord);
    // isLine = 1 means NOT a hatch line → show scene color; 0 means IS a line → black
    const hatchColor = vec4(0.0, 0.0, 0.0, 1.0);
    const blended = mix(hatchColor, sceneColor, isLine);

    return mix(sceneColor, blended, uniformIntensity);
  })();
}

// ---------------------------------------------------------------------------
// Halftone Dots
// ---------------------------------------------------------------------------

function buildHalftoneNode(
  sceneTexNode: any,
  uniformScale: any,
  uniformIntensity: any,
  uniformSoftness: any,
  uvCoord: any
): any {
  return Fn(() => {
    const sceneColor = sceneTexNode.sample(uvCoord);
    const lum = luminance(sceneColor);

    // Snap UV to dot grid cell
    const sc = mul(uvCoord, uniformScale);
    const cellUV = sub(sc, add(floor(sc), 0.5)); // -0.5..0.5 within each cell
    const dist = length(cellUV);

    // Dot radius: large in dark areas (low luminance), small in bright areas
    const dotRadius = mul(clamp(sub(1.0, lum), 0.0, 1.0), 0.5);

    // Smooth edge of dot
    const edge = smoothstep(sub(dotRadius, uniformSoftness), add(dotRadius, uniformSoftness), dist);
    // edge=0 inside dot, edge=1 outside dot
    const halftoneColor = mix(vec4(0.0, 0.0, 0.0, 1.0), vec4(1.0, 1.0, 1.0, 1.0), edge);

    return mix(sceneColor, halftoneColor, uniformIntensity);
  })();
}

// ---------------------------------------------------------------------------
// Checkerboard
// ---------------------------------------------------------------------------

function buildCheckerboardNode(
  sceneTexNode: any,
  uniformScale: any,
  uniformIntensity: any,
  uvCoord: any
): any {
  return Fn(() => {
    const sceneColor = sceneTexNode.sample(uvCoord);

    const sc = mul(uvCoord, uniformScale) as any;
    // For checker: parity = (floor(x) + floor(y)) mod 2
    const fx = floor(sc.x);
    const fy = floor(sc.y);
    // fract((fx+fy)*0.5) will be 0 or 0.5 depending on parity
    const parity = step(0.5, fract(mul(add(fx, fy), 0.5)));

    // Tint each cell by the scene color to preserve color info
    const brightCell = mix(sceneColor, vec4(1.0, 1.0, 1.0, 1.0), 0.4);
    const darkCell = mix(sceneColor, vec4(0.0, 0.0, 0.0, 1.0), 0.4);
    const checkerColor = mix(darkCell, brightCell, parity);

    return mix(sceneColor, checkerColor, uniformIntensity);
  })();
}

// ---------------------------------------------------------------------------
// Gradient (vertical overlay)
// ---------------------------------------------------------------------------

function buildGradientNode(
  sceneTexNode: any,
  uniformIntensity: any,
  uvCoord: any
): any {
  return Fn(() => {
    const sceneColor = sceneTexNode.sample(uvCoord);

    // Vertical gradient (1 at top, 0 at bottom)
    const gradVal = uvCoord.y;
    const gradColor = vec4(gradVal, gradVal, gradVal, sceneColor.a);

    // Multiply gradient by scene color to darken bottom
    const blended = mul(sceneColor, gradColor);

    return mix(sceneColor, blended, uniformIntensity);
  })();
}

// ---------------------------------------------------------------------------
// Hatch Gradient (vertical overlay made of hatching lines)
// ---------------------------------------------------------------------------

function buildHatchGradientNode(
  sceneTexNode: any,
  uniformScale: any,
  uniformAngle: any,
  uniformIntensity: any,
  uvCoord: any
): any {
  return Fn(() => {
    const sceneColor = sceneTexNode.sample(uvCoord);

    // Vertical gradient drives the density (darker at bottom: y=0)
    const darkness = clamp(sub(1.0, uvCoord.y), 0.0, 1.0);

    const angleRad = mul(uniformAngle, Math.PI / 180);
    const cosA = cos(angleRad);
    const sinA = sin(angleRad);

    const sc = mul(uvCoord, uniformScale) as any;
    const rx = sub(mul(sc.x, cosA), mul(sc.y, sinA));
    const lineCoord = fract(rx);

    // Density is driven by the vertical gradient
    const isLine = step(darkness, lineCoord);
    const hatchColor = vec4(0.0, 0.0, 0.0, 1.0);
    const blended = mix(hatchColor, sceneColor, isLine);

    return mix(sceneColor, blended, uniformIntensity);
  })();
}

// ---------------------------------------------------------------------------
// Cartoon (posterize / cel shading)
// ---------------------------------------------------------------------------

function buildCartoonNode(
  sceneTexNode: any,
  uniformIntensity: any,
  uniformSteps: any,
  uvCoord: any
): any {
  return Fn(() => {
    const sceneColor = sceneTexNode.sample(uvCoord);
    
    // Posterize each color channel
    const steppedR = div(floor(mul(sceneColor.r, uniformSteps)), sub(uniformSteps, 1.0));
    const steppedG = div(floor(mul(sceneColor.g, uniformSteps)), sub(uniformSteps, 1.0));
    const steppedB = div(floor(mul(sceneColor.b, uniformSteps)), sub(uniformSteps, 1.0));
    
    const cartoonColor = vec4(steppedR, steppedG, steppedB, sceneColor.a);

    return mix(sceneColor, cartoonColor, uniformIntensity);
  })();
}

// ---------------------------------------------------------------------------
// Crosshatch (two directions)
// ---------------------------------------------------------------------------

function buildCrosshatchNode(
  sceneTexNode: any,
  uniformScale: any,
  uniformIntensity: any,
  uniformThreshold: any,
  uvCoord: any
): any {
  return Fn(() => {
    const sceneColor = sceneTexNode.sample(uvCoord);
    const lum = luminance(sceneColor);

    const sc = mul(uvCoord, uniformScale) as any;
    const darkness = clamp(sub(1.0, lum), 0.0, 1.0);
    const lineThickness = mul(darkness, uniformThreshold);

    // Direction 1: +45 degrees (x + y)
    const d1 = fract(mul(add(sc.x, sc.y), 0.7071)); // 1/sqrt2 ≈ 0.7071
    const isLine1 = step(lineThickness, d1);

    // Direction 2: -45 degrees (x - y)
    const d2 = fract(mul(sub(sc.x, sc.y), 0.7071));
    const isLine2 = step(lineThickness, d2);

    // Combined: a pixel is "hatched" if it's a line in EITHER direction
    const isHatched = min(isLine1, isLine2); // 0 if line in either direction
    const hatchColor = vec4(0.0, 0.0, 0.0, 1.0);
    const blended = mix(hatchColor, sceneColor, isHatched);

    return mix(sceneColor, blended, uniformIntensity);
  })();
}

// ---------------------------------------------------------------------------
// Film Grain / Noise
// ---------------------------------------------------------------------------

function buildNoiseNode(
  sceneTexNode: any,
  uniformIntensity: any,
  uniformScale: any,
  uvCoord: any
): any {
  return Fn(() => {
    const sceneColor = sceneTexNode.sample(uvCoord);

    // Simple pseudo-random hash: fract(sin(dot(uv, seed)) * large_const)
    const sc = mul(uvCoord, uniformScale) as any;
    const dotVal = add(mul(sc.x, 127.1), mul(sc.y, 311.7));
    const grain = sub(mul(fract(mul(sin(dotVal), 43758.5453123)), 2.0), 1.0);

    const grainVec = vec4(grain, grain, grain, 0.0);
    return add(sceneColor, mul(grainVec, uniformIntensity));
  })();
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Sketch / Pencil Outline
// ---------------------------------------------------------------------------

function buildSketchNode(
  sceneTexNode: any,
  uniformThickness: any,
  uniformRoughness: any,
  uniformIntensity: any,
  uniformResolution: any,
  uvCoord: any
): any {
  return Fn(() => {
    const wiggleScale = 15.0;
    const wiggleX = sin(add(mul(uvCoord.x, wiggleScale), mul(uvCoord.y, wiggleScale)));
    const wiggleY = cos(add(mul(uvCoord.x, wiggleScale), mul(uvCoord.y, wiggleScale)));

    const disp = mul(vec2(wiggleX, wiggleY), div(uniformRoughness, uniformResolution));
    const deformedUV = add(uvCoord, disp);

    const sceneColor = sceneTexNode.sample(deformedUV);

    const stepSize = div(uniformThickness, uniformResolution) as any;
    const uL = sceneTexNode.sample(add(deformedUV, vec2(sub(0.0, stepSize.x), 0.0)));
    const uR = sceneTexNode.sample(add(deformedUV, vec2(stepSize.x, 0.0)));
    const uD = sceneTexNode.sample(add(deformedUV, vec2(0.0, sub(0.0, stepSize.y))));
    const uU = sceneTexNode.sample(add(deformedUV, vec2(0.0, stepSize.y)));

    const lumL = luminance(uL);
    const lumR = luminance(uR);
    const lumD = luminance(uD);
    const lumU = luminance(uU);

    const gradX = sub(lumR, lumL);
    const gradY = sub(lumU, lumD);
    const edgeStrength = add(abs(gradX), abs(gradY));

    const isEdge = step(0.12, edgeStrength);
    const strokeColor = vec4(0.1, 0.1, 0.1, 1.0);
    const blended = mix(sceneColor, strokeColor, isEdge);

    return mix(sceneColor, blended, uniformIntensity);
  })();
}

// ---------------------------------------------------------------------------
// Modulo Helper
// ---------------------------------------------------------------------------

function tslMod(a: any, b: any) {
  return sub(a, mul(b, floor(div(a, b))));
}

// ---------------------------------------------------------------------------
// Retro Dither (Bayer 4x4)
// ---------------------------------------------------------------------------

function buildDitherNode(
  sceneTexNode: any,
  uniformScale: any,
  uniformIntensity: any,
  uniformResolution: any,
  uvCoord: any
): any {
  return Fn(() => {
    const sceneColor = sceneTexNode.sample(uvCoord);

    const scaledResolution = div(uniformResolution, uniformScale);
    const pixelUV = div(add(floor(mul(uvCoord, scaledResolution)), 0.5), scaledResolution);

    const ditherColor = sceneTexNode.sample(pixelUV);

    const gridCoords = mul(uvCoord, uniformResolution) as any;
    const x = floor(gridCoords.x);
    const y = floor(gridCoords.y);

    const x1 = tslMod(x, 2.0);
    const y1 = tslMod(y, 2.0);
    const x2 = tslMod(floor(div(x, 2.0)), 2.0);
    const y2 = tslMod(floor(div(y, 2.0)), 2.0);

    const bayerThreshold = div(
      add(
        mul(add(mul(y1, 2.0), x1), 4.0),
        add(mul(y2, 2.0), x2)
      ),
      16.0
    );

    const dr = step(bayerThreshold, ditherColor.r);
    const dg = step(bayerThreshold, ditherColor.g);
    const db = step(bayerThreshold, ditherColor.b);

    const dithered = vec4(dr, dg, db, ditherColor.a);

    return mix(sceneColor, dithered, uniformIntensity);
  })();
}

// ---------------------------------------------------------------------------
// Stipple (Jittered Cellular Dots)
// ---------------------------------------------------------------------------

function hash2(pNode: any): any {
  const dotVal1 = add(mul(pNode.x, 127.1), mul(pNode.y, 311.7));
  const dotVal2 = add(mul(pNode.x, 269.5), mul(pNode.y, 183.3));
  const hx = fract(mul(sin(dotVal1), 43758.5453123));
  const hy = fract(mul(sin(dotVal2), 28914.1523456));
  return sub(mul(vec2(hx, hy), 2.0), 1.0);
}

function buildStippleNode(
  sceneTexNode: any,
  uniformScale: any,
  uniformDensity: any,
  uniformIntensity: any,
  uvCoord: any
): any {
  return Fn(() => {
    const sceneColor = sceneTexNode.sample(uvCoord);

    const sc = mul(uvCoord, uniformScale);
    const cellCoord = floor(sc);
    const cellUV = fract(sc);

    const jitter = mul(hash2(cellCoord), 0.25);
    const dotCenter = add(vec2(0.5, 0.5), jitter);

    const dist = length(sub(cellUV, dotCenter));

    const sampleUV = div(add(cellCoord, dotCenter), uniformScale);
    const cellColor = sceneTexNode.sample(sampleUV);
    const lum = luminance(cellColor);

    const darkness = clamp(sub(1.0, lum), 0.0, 1.0);
    const dotRadius = mul(darkness, 0.5, uniformDensity);

    const isInsideDot = step(dist, dotRadius);
    const stippleColor = vec4(0.0, 0.0, 0.0, 1.0);
    const blended = mix(sceneColor, stippleColor, isInsideDot);

    return mix(sceneColor, blended, uniformIntensity);
  })();
}

// ---------------------------------------------------------------------------
// Watercolor Wash
// ---------------------------------------------------------------------------

function buildWatercolorNode(
  sceneTexNode: any,
  uniformBleed: any,
  uniformPaper: any,
  uniformIntensity: any,
  uvCoord: any
): any {
  return Fn(() => {
    const center = sceneTexNode.sample(uvCoord);

    // Color bleed: 4-tap neighbor average at a generous radius.
    // bleed=5 → step=0.03 UV → clearly visible soft smearing at color edges.
    const bleedStep = mul(uniformBleed, 0.006);
    const nR = sceneTexNode.sample(add(uvCoord, vec2(bleedStep, 0.0)));
    const nL = sceneTexNode.sample(add(uvCoord, vec2(sub(0.0, bleedStep), 0.0)));
    const nU = sceneTexNode.sample(add(uvCoord, vec2(0.0, bleedStep)));
    const nD = sceneTexNode.sample(add(uvCoord, vec2(0.0, sub(0.0, bleedStep))));
    const avgNeighbor = mul(add(add(add(nR, nL), nU), nD), 0.25);
    // 25% blend toward average → paint bleeds visibly but colors aren’t destroyed
    const bleedColor = mix(center, avgNeighbor, 0.25);

    // Paper grain: amplitude is scaled down to ×0.08 internally so the slider
    // range 0–1 maps to barely-there → subtle, never to heavy static.
    // uniformPaper=0.15 default → grain swings ±0.012 — just enough to feel like paper.
    const sc = mul(uvCoord, 700.0) as any;
    const dotVal = add(mul(floor(sc.x), 12.9898), mul(floor(sc.y), 78.233));
    const grain = sub(mul(fract(mul(sin(dotVal), 43758.5453)), 2.0), 1.0); // [−1, 1]
    const grainAmt = mul(uniformPaper, 0.08); // internal scale-down
    const grained = add(bleedColor, mul(vec4(grain, grain, grain, 0.0), grainAmt));

    // Pigment pooling: the most iconic watercolor look — pigment dries darker
    // at shape boundaries where it accumulates. We detect edges via luminance
    // deviation and darken those pixels proportionally.
    const centerLum = luminance(center);
    const avgLum = luminance(avgNeighbor);
    const edgeStrength = clamp(abs(sub(centerLum, avgLum)), 0.0, 1.0);
    const edgeMultiplier = sub(1.0, mul(edgeStrength, 0.65));
    const finalColor = mul(grained, edgeMultiplier);

    return mix(center, finalColor, uniformIntensity);
  })();
}

// ---------------------------------------------------------------------------
// Refraction (water / glass distortion)
// ---------------------------------------------------------------------------

function buildRefractionNode(
  sceneTexNode: any,
  uniformScale: any,
  uniformStrength: any,
  uniformIntensity: any,
  uvCoord: any
): any {
  return Fn(() => {
    const sceneColor = sceneTexNode.sample(uvCoord);

    // Two-scale sin/cos warp: large waves (scale * 0.4) overlaid with
    // fine ripples (scale * 1.3). Mixing them 70/30 gives natural water caustics.
    const freq1 = mul(uniformScale, 0.4);
    const freq2 = mul(uniformScale, 1.3);

    const arg1 = add(mul(uvCoord.x, freq1), mul(uvCoord.y, freq1));
    const arg2 = add(mul(uvCoord.x, freq2), mul(uvCoord.y, freq2));

    const dispX = add(mul(sin(arg1), 0.7), mul(sin(arg2), 0.3));
    const dispY = add(mul(cos(arg1), 0.7), mul(cos(arg2), 0.3));

    const warpStrength = div(uniformStrength, 800.0);
    const deformedUV = add(uvCoord, mul(vec2(dispX, dispY), warpStrength));

    const warpedColor = sceneTexNode.sample(deformedUV);

    return mix(sceneColor, warpedColor, uniformIntensity);
  })();
}

// ---------------------------------------------------------------------------
// Paper (warm cream tint + very fine grain + slight desaturation)
// ---------------------------------------------------------------------------

function buildPaperNode(
  sceneTexNode: any,
  uniformScale: any,
  uniformPaper: any,
  uniformIntensity: any,
  uvCoord: any
): any {
  return Fn(() => {
    const sceneColor = sceneTexNode.sample(uvCoord);

    // Warm cream tint: multiply scene colors by a warm paper tone.
    // This immediately shifts the whole image to feel like it’s printed
    // on aged paper — the dominant visual characteristic.
    // cream = (0.98, 0.94, 0.82) — slightly warm/yellow
    const cream = vec4(0.98, 0.94, 0.82, 1.0);
    // Tint strength: uniformPaper=0.4 default → tintAmt=0.12 (12% shift toward cream)
    const tintAmt = mul(uniformPaper, 0.30);
    const tinted = mix(sceneColor, mul(sceneColor, cream), tintAmt);

    // Very fine grain: amplitude ×0.05 so the slider range feels natural.
    // uniformPaper=0.4 → grain ±0.02 — perceptible as fine texture, not static.
    const sc = mul(uvCoord, uniformScale) as any;
    const fx = floor(sc.x);
    const fy = floor(sc.y);
    const dotVal = add(mul(fx, 12.9898), mul(fy, 78.233));
    const grain = sub(mul(fract(mul(sin(dotVal), 43758.5453)), 2.0), 1.0);
    const grainAmt = mul(uniformPaper, 0.05);
    const grainy = add(tinted, mul(vec4(grain, grain, grain, 0.0), grainAmt));

    // Slight desaturation: paper mutes colors a little, especially strong hues.
    // uniformPaper=0.4 → desatAmt=0.06 (6% toward grayscale)
    const lum = luminance(grainy);
    const lumVec = vec4(lum, lum, lum, grainy.a);
    const desatAmt = mul(uniformPaper, 0.15);
    const desaturated = mix(grainy, lumVec, desatAmt);

    return mix(sceneColor, desaturated, uniformIntensity);
  })();
}

// ---------------------------------------------------------------------------
// Public Factory
// ---------------------------------------------------------------------------

export interface ShaderNodeUniforms {
  scale: any;
  angle: any;
  intensity: any;
  threshold: any;
  softness: any;
  steps: any;
  time: any;
  resolution: any;
  thickness: any;
  roughness: any;
  density: any;
  bleed: any;
  paper: any;
}

export function buildShaderNode(
  type: ShaderType,
  sceneTexNode: any,
  uniforms: ShaderNodeUniforms,
  uvCoord: any = uv()
): any | null {
  switch (type) {
    case 'manga':
      return buildMangaNode(
        sceneTexNode,
        uniforms.scale,
        uniforms.angle,
        uniforms.intensity,
        uniforms.threshold,
        uvCoord
      );
    case 'halftone':
      return buildHalftoneNode(
        sceneTexNode,
        uniforms.scale,
        uniforms.intensity,
        uniforms.softness,
        uvCoord
      );
    case 'checkerboard':
      return buildCheckerboardNode(
        sceneTexNode,
        uniforms.scale,
        uniforms.intensity,
        uvCoord
      );
    case 'gradient':
      return buildGradientNode(
        sceneTexNode,
        uniforms.intensity,
        uvCoord
      );
    case 'hatch_gradient':
      return buildHatchGradientNode(
        sceneTexNode,
        uniforms.scale,
        uniforms.angle,
        uniforms.intensity,
        uvCoord
      );
    case 'cartoon':
      return buildCartoonNode(
        sceneTexNode,
        uniforms.intensity,
        uniforms.steps,
        uvCoord
      );
    case 'crosshatch':
      return buildCrosshatchNode(
        sceneTexNode,
        uniforms.scale,
        uniforms.intensity,
        uniforms.threshold,
        uvCoord
      );
    case 'sketch':
      return buildSketchNode(
        sceneTexNode,
        uniforms.thickness,
        uniforms.roughness,
        uniforms.intensity,
        uniforms.resolution,
        uvCoord
      );
    case 'dither':
      return buildDitherNode(
        sceneTexNode,
        uniforms.scale,
        uniforms.intensity,
        uniforms.resolution,
        uvCoord
      );
    case 'stipple':
      return buildStippleNode(
        sceneTexNode,
        uniforms.scale,
        uniforms.density,
        uniforms.intensity,
        uvCoord
      );
    case 'watercolor':
      return buildWatercolorNode(
        sceneTexNode,
        uniforms.bleed,
        uniforms.paper,
        uniforms.intensity,
        uvCoord
      );
    case 'refraction':
      return buildRefractionNode(
        sceneTexNode,
        uniforms.scale,
        uniforms.bleed,
        uniforms.intensity,
        uvCoord
      );
    case 'paper':
      return buildPaperNode(
        sceneTexNode,
        uniforms.scale,
        uniforms.paper,
        uniforms.intensity,
        uvCoord
      );
    case 'noise':
      return buildNoiseNode(
        sceneTexNode,
        uniforms.intensity,
        uniforms.scale,
        uvCoord
      );
    case 'none':
    default:
      return null;
  }
}
