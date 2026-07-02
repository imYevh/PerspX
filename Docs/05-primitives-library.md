# 05 — Primitives Library

## Goal
Create a library of 3D primitive shapes that users can add to the scene from a list. Each primitive is configurable (dimensions, segments) and added via the SceneManager.

---

## Primitive Types

| Primitive        | Three.js Geometry        | Default Parameters                        |
| :--------------- | :----------------------- | :---------------------------------------- |
| **Cube**         | `BoxGeometry`            | width=1, height=1, depth=1                |
| **Sphere**       | `SphereGeometry`         | radius=0.5, widthSeg=32, heightSeg=16     |
| **Cylinder**     | `CylinderGeometry`       | radiusTop=0.5, radiusBot=0.5, height=1    |
| **Cone**         | `ConeGeometry`           | radius=0.5, height=1, segments=32         |
| **Torus**        | `TorusGeometry`          | radius=0.5, tube=0.2, radialSeg=16, tubeSeg=48 |
| **Plane**        | `PlaneGeometry`          | width=2, height=2                         |
| **Capsule**      | `CapsuleGeometry`        | radius=0.3, length=1, segments=16         |
| **Torus Knot**   | `TorusKnotGeometry`      | radius=0.5, tube=0.15                     |
| **Icosahedron**  | `IcosahedronGeometry`    | radius=0.5, detail=0                      |
| **Dodecahedron** | `DodecahedronGeometry`   | radius=0.5, detail=0                      |

---

## Implementation

### `src/objects/primitives.ts`

```ts
import {
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  ConeGeometry,
  TorusGeometry,
  PlaneGeometry,
  CapsuleGeometry,
  TorusKnotGeometry,
  IcosahedronGeometry,
  DodecahedronGeometry,
  BufferGeometry,
  Mesh,
  Color,
} from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';

export type PrimitiveType =
  | 'cube'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'plane'
  | 'capsule'
  | 'torusKnot'
  | 'icosahedron'
  | 'dodecahedron';

export interface PrimitiveDefinition {
  type: PrimitiveType;
  label: string;
  icon: string;     // Emoji or icon identifier for UI
  createGeometry: (params?: Record<string, number>) => BufferGeometry;
  defaultParams: Record<string, number>;
}

// Default material color palette (visually distinct)
const PRIMITIVE_COLORS = [
  0x4a9eff, // Blue
  0xff6b6b, // Red
  0x51cf66, // Green
  0xffd43b, // Yellow
  0xcc5de8, // Purple
  0x20c997, // Teal
  0xff922b, // Orange
  0x748ffc, // Indigo
  0xf06595, // Pink
  0x868e96, // Gray
];

let colorIndex = 0;

function nextColor(): number {
  const color = PRIMITIVE_COLORS[colorIndex % PRIMITIVE_COLORS.length];
  colorIndex++;
  return color;
}

export const PRIMITIVES: Record<PrimitiveType, PrimitiveDefinition> = {
  cube: {
    type: 'cube',
    label: 'Cube',
    icon: '🟦',
    defaultParams: { width: 1, height: 1, depth: 1 },
    createGeometry: (p) =>
      new BoxGeometry(p?.width ?? 1, p?.height ?? 1, p?.depth ?? 1),
  },
  sphere: {
    type: 'sphere',
    label: 'Sphere',
    icon: '🔵',
    defaultParams: { radius: 0.5, widthSegments: 32, heightSegments: 16 },
    createGeometry: (p) =>
      new SphereGeometry(p?.radius ?? 0.5, p?.widthSegments ?? 32, p?.heightSegments ?? 16),
  },
  cylinder: {
    type: 'cylinder',
    label: 'Cylinder',
    icon: '🛢️',
    defaultParams: { radiusTop: 0.5, radiusBottom: 0.5, height: 1, segments: 32 },
    createGeometry: (p) =>
      new CylinderGeometry(p?.radiusTop ?? 0.5, p?.radiusBottom ?? 0.5, p?.height ?? 1, p?.segments ?? 32),
  },
  cone: {
    type: 'cone',
    label: 'Cone',
    icon: '🔺',
    defaultParams: { radius: 0.5, height: 1, segments: 32 },
    createGeometry: (p) =>
      new ConeGeometry(p?.radius ?? 0.5, p?.height ?? 1, p?.segments ?? 32),
  },
  torus: {
    type: 'torus',
    label: 'Torus',
    icon: '⭕',
    defaultParams: { radius: 0.5, tube: 0.2, radialSegments: 16, tubularSegments: 48 },
    createGeometry: (p) =>
      new TorusGeometry(p?.radius ?? 0.5, p?.tube ?? 0.2, p?.radialSegments ?? 16, p?.tubularSegments ?? 48),
  },
  plane: {
    type: 'plane',
    label: 'Plane',
    icon: '⬜',
    defaultParams: { width: 2, height: 2 },
    createGeometry: (p) =>
      new PlaneGeometry(p?.width ?? 2, p?.height ?? 2),
  },
  capsule: {
    type: 'capsule',
    label: 'Capsule',
    icon: '💊',
    defaultParams: { radius: 0.3, length: 1, capSegments: 10, radialSegments: 16 },
    createGeometry: (p) =>
      new CapsuleGeometry(p?.radius ?? 0.3, p?.length ?? 1, p?.capSegments ?? 10, p?.radialSegments ?? 16),
  },
  torusKnot: {
    type: 'torusKnot',
    label: 'Torus Knot',
    icon: '🔗',
    defaultParams: { radius: 0.5, tube: 0.15 },
    createGeometry: (p) =>
      new TorusKnotGeometry(p?.radius ?? 0.5, p?.tube ?? 0.15),
  },
  icosahedron: {
    type: 'icosahedron',
    label: 'Icosahedron',
    icon: '🔷',
    defaultParams: { radius: 0.5, detail: 0 },
    createGeometry: (p) =>
      new IcosahedronGeometry(p?.radius ?? 0.5, p?.detail ?? 0),
  },
  dodecahedron: {
    type: 'dodecahedron',
    label: 'Dodecahedron',
    icon: '💎',
    defaultParams: { radius: 0.5, detail: 0 },
    createGeometry: (p) =>
      new DodecahedronGeometry(p?.radius ?? 0.5, p?.detail ?? 0),
  },
};

/**
 * Create a mesh from a primitive definition
 */
export function createPrimitive(
  type: PrimitiveType,
  params?: Record<string, number>,
  color?: number
): Mesh {
  const def = PRIMITIVES[type];
  if (!def) throw new Error(`Unknown primitive type: ${type}`);

  const geometry = def.createGeometry(params);
  const material = new MeshStandardNodeMaterial({
    color: new Color(color ?? nextColor()),
    roughness: 0.4,
    metalness: 0.1,
  });

  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * Get the list of all available primitives (for UI)
 */
export function getPrimitiveList(): Array<{ type: PrimitiveType; label: string; icon: string }> {
  return Object.values(PRIMITIVES).map((def) => ({
    type: def.type,
    label: def.label,
    icon: def.icon,
  }));
}

/**
 * Reset the color cycle
 */
export function resetColorCycle(): void {
  colorIndex = 0;
}
```

### Usage with SceneManager

```ts
import { createPrimitive } from '@/objects/primitives';
import { SceneManager } from '@/core/scene';

// Add primitives from UI list
function addPrimitiveToScene(sceneManager: SceneManager, type: PrimitiveType): string {
  const mesh = createPrimitive(type);

  // Offset position so objects don't stack on top of each other
  const count = sceneManager.getObjectsByType('primitive').length;
  mesh.position.x = (count % 5) * 2 - 4;
  mesh.position.z = Math.floor(count / 5) * 2 - 4;

  return sceneManager.addObject(mesh, 'primitive', PRIMITIVES[type].label);
}
```

---

## UI Integration (Preview)

The primitives list will be rendered in a side panel (see `11-ui-system.md`):

```
┌─────────────────────┐
│  ADD PRIMITIVE       │
├─────────────────────┤
│  🟦  Cube           │
│  🔵  Sphere         │
│  🛢️  Cylinder       │
│  🔺  Cone           │
│  ⭕  Torus          │
│  ⬜  Plane          │
│  💊  Capsule        │
│  🔗  Torus Knot     │
│  🔷  Icosahedron    │
│  💎  Dodecahedron   │
└─────────────────────┘
```

Clicking any item instantly adds it to the scene and selects it.

---

## Verification

- Click each primitive type → it appears in the scene
- Each primitive gets a unique color from the palette
- Auto-naming works: "Cube 1", "Cube 2", "Sphere 1", etc.
- Removing a primitive disposes its geometry and material
- Adding 20+ primitives does not cause performance issues

---

## Output

After this phase, you have:
- [x] 10 primitive types with configurable parameters
- [x] Color-cycling for visual distinction
- [x] Factory function for creating primitives
- [x] Integration with SceneManager (add/remove)
- [x] UI-ready list data (`getPrimitiveList()`)
- [x] Shadow casting enabled on all primitives

---

## Next → [06-transform-controls.md](./06-transform-controls.md)
