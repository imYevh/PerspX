# 09 — Shader & Material System

## Goal
Build a material system using Three.js's TSL (Three Shader Language) for custom shaders that work across both WebGPU and WebGL backends. Provide built-in materials useful for perspective study.

---

## Key Concepts

### TSL (Three Shader Language)
TSL is Three.js's solution for writing shaders in JavaScript/TypeScript that compile to:
- **WGSL** (WebGPU Shading Language) when using `WebGPURenderer`
- **GLSL** when falling back to `WebGLRenderer`

You write shaders as JS node graphs — no raw WGSL or GLSL needed.

### Material Types for Perspective Study

| Material         | Purpose                                                    |
| :--------------- | :--------------------------------------------------------- |
| **Standard**     | Default PBR material — realistic lighting response         |
| **Flat Color**   | Solid color with no lighting — clean silhouette study      |
| **Wireframe**    | Shows only edges — structural study                        |
| **Normal Map**   | Colors based on surface normals — reveals form direction   |
| **Depth**        | Grayscale based on camera distance — depth perception aid  |
| **Checker**      | Checkerboard pattern — reveals surface curvature/distortion|
| **X-Ray**        | Semi-transparent with visible edges — see-through study    |
| **Matcap**       | Pre-baked lighting from texture — quick stylized look      |

---

## Implementation

### `src/materials/material-system.ts`

```ts
import {
  MeshStandardNodeMaterial,
  MeshBasicNodeMaterial,
  MeshNormalNodeMaterial,
  MeshPhysicalNodeMaterial,
} from 'three/webgpu';
import {
  Color,
  DoubleSide,
  FrontSide,
  type Material,
} from 'three';

export type MaterialPresetType =
  | 'standard'
  | 'flat'
  | 'wireframe'
  | 'normal'
  | 'xray';

export interface MaterialPreset {
  type: MaterialPresetType;
  label: string;
  description: string;
  create: (color?: number) => Material;
}

export const MATERIAL_PRESETS: Record<MaterialPresetType, MaterialPreset> = {
  standard: {
    type: 'standard',
    label: 'Standard (PBR)',
    description: 'Physically-based rendering with realistic lighting',
    create: (color = 0x4a9eff) =>
      new MeshStandardNodeMaterial({
        color: new Color(color),
        roughness: 0.4,
        metalness: 0.1,
      }),
  },

  flat: {
    type: 'flat',
    label: 'Flat Color',
    description: 'Unlit solid color — clean silhouette view',
    create: (color = 0x4a9eff) =>
      new MeshBasicNodeMaterial({
        color: new Color(color),
      }),
  },

  wireframe: {
    type: 'wireframe',
    label: 'Wireframe',
    description: 'Shows geometry edges only',
    create: (color = 0xffffff) => {
      const mat = new MeshBasicNodeMaterial({
        color: new Color(color),
        wireframe: true,
      });
      return mat;
    },
  },

  normal: {
    type: 'normal',
    label: 'Normal Colors',
    description: 'Colors based on surface normal direction — reveals form',
    create: () => new MeshNormalNodeMaterial(),
  },

  xray: {
    type: 'xray',
    label: 'X-Ray',
    description: 'Semi-transparent with visible edges',
    create: (color = 0x4a9eff) =>
      new MeshPhysicalNodeMaterial({
        color: new Color(color),
        transparent: true,
        opacity: 0.15,
        side: DoubleSide,
        depthWrite: false,
        roughness: 1.0,
        metalness: 0.0,
      }),
  },
};

/**
 * Apply a material preset to a mesh or group of meshes
 */
export function applyMaterialPreset(
  objects: THREE.Object3D[],
  presetType: MaterialPresetType,
  color?: number
): void {
  const preset = MATERIAL_PRESETS[presetType];
  if (!preset) return;

  for (const obj of objects) {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // Dispose old material
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
        mesh.material = preset.create(color);
      }
    });
  }
}

/**
 * Create a material from properties (for the properties panel)
 */
export function createCustomMaterial(options: {
  color?: number;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  wireframe?: boolean;
  emissive?: number;
  emissiveIntensity?: number;
}): Material {
  const mat = new MeshStandardNodeMaterial({
    color: new Color(options.color ?? 0x888888),
    roughness: options.roughness ?? 0.5,
    metalness: options.metalness ?? 0.0,
    transparent: (options.opacity ?? 1) < 1,
    opacity: options.opacity ?? 1,
    wireframe: options.wireframe ?? false,
  });

  if (options.emissive) {
    mat.emissive = new Color(options.emissive);
    mat.emissiveIntensity = options.emissiveIntensity ?? 1;
  }

  return mat;
}
```

### `src/materials/shader-library.ts`

```ts
/**
 * Custom TSL (Three Shader Language) shaders
 *
 * TSL shaders are written as JavaScript node graphs.
 * They compile to WGSL (WebGPU) or GLSL (WebGL) automatically.
 *
 * This file provides advanced shader effects that can be
 * extended as the app grows.
 */

import { MeshStandardNodeMaterial } from 'three/webgpu';
import {
  color as colorNode,
  vec2,
  vec3,
  vec4,
  uv,
  positionWorld,
  normalWorld,
  cameraPosition,
  float,
  floor,
  mod,
  mix,
  step,
  abs,
  normalize,
  dot,
  pow,
  add,
  sub,
  mul,
  uniform,
} from 'three/tsl';
import { Color } from 'three';

/**
 * Checkerboard material — reveals surface curvature and distortion
 */
export function createCheckerMaterial(
  color1: number = 0xffffff,
  color2: number = 0x444444,
  scale: number = 4
): MeshStandardNodeMaterial {
  const mat = new MeshStandardNodeMaterial();

  const uvScaled = mul(uv(), float(scale));
  const checker = mod(add(floor(uvScaled.x), floor(uvScaled.y)), float(2));
  const c1 = colorNode(new Color(color1));
  const c2 = colorNode(new Color(color2));

  mat.colorNode = mix(c1, c2, checker);

  return mat;
}

/**
 * Depth-fade material — objects darken with distance from camera
 * Useful for studying spatial depth relationships
 */
export function createDepthMaterial(
  nearColor: number = 0xffffff,
  farColor: number = 0x000000,
  nearDist: number = 1,
  farDist: number = 30
): MeshStandardNodeMaterial {
  const mat = new MeshStandardNodeMaterial();

  const camPos = cameraPosition;
  const worldPos = positionWorld;
  const dist = sub(worldPos, camPos).length();

  const t = dist.sub(float(nearDist)).div(float(farDist - nearDist)).clamp();

  mat.colorNode = mix(
    colorNode(new Color(nearColor)),
    colorNode(new Color(farColor)),
    t
  );

  return mat;
}

/**
 * Fresnel / rim-light material — highlights edges of silhouette
 * Great for studying form contour
 */
export function createFresnelMaterial(
  baseColor: number = 0x222244,
  rimColor: number = 0x44aaff,
  power: number = 3
): MeshStandardNodeMaterial {
  const mat = new MeshStandardNodeMaterial();

  const viewDir = normalize(sub(cameraPosition, positionWorld));
  const fresnel = pow(sub(float(1), abs(dot(normalWorld, viewDir))), float(power));

  mat.colorNode = mix(
    colorNode(new Color(baseColor)),
    colorNode(new Color(rimColor)),
    fresnel
  );

  return mat;
}

/**
 * Get all custom shader names for UI
 */
export function getCustomShaderList(): Array<{ name: string; description: string }> {
  return [
    { name: 'checker', description: 'Checkerboard pattern — reveals surface curvature' },
    { name: 'depth', description: 'Depth-fade — objects darken with distance' },
    { name: 'fresnel', description: 'Rim-light — highlights silhouette edges' },
  ];
}
```

---

## Material Property Panel (Preview)

When an object is selected, the properties panel shows:

```
┌─────────────────────────┐
│  MATERIAL               │
├─────────────────────────┤
│  Preset: [Standard ▾]   │
│                         │
│  Roughness: [====●===]  │
│  Metalness: [●========]  │
│  Opacity:   [========●]  │
│                         │
│  ☐ Wireframe Overlay    │
│  ☐ Double-Sided         │
│                         │
│  --- Custom Shaders --- │
│  ▸ Checker              │
│  ▸ Depth Fade           │
│  ▸ Fresnel Rim          │
└─────────────────────────┘
```

---

## Verification

- Switch material presets on a selected object — visual changes instantly
- Normal material shows RGB normals
- X-Ray material makes objects semi-transparent
- Checker shader tiles correctly on all primitive types
- Depth shader darkens objects further from camera
- Fresnel shader highlights edges facing away from camera
- Materials work identically on WebGPU and WebGL2 fallback

---

## Output

After this phase, you have:
- [x] 5 built-in material presets (Standard, Flat, Wireframe, Normal, X-Ray)
- [x] 3 custom TSL shaders (Checker, Depth, Fresnel)
- [x] Material factory with configurable properties
- [x] `applyMaterialPreset()` for batch material changes
- [x] Cross-API compatibility via TSL (WebGPU + WebGL)
- [x] Extensible shader library architecture

---

## Next → [10-model-import.md](./10-model-import.md)
