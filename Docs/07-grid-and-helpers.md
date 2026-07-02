# 07 — Grid & Drawing Helpers

## Goal
Add visual helpers that aid perspective understanding: infinite grid, ground plane, axes indicator, and vanishing point visualization.

---

## Helpers Overview

| Helper               | Purpose                                              | Toggle Key |
| :------------------- | :--------------------------------------------------- | :--------- |
| **Infinite Grid**    | Reference ground plane with fade-out at distance     | `1`        |
| **Axes Helper**      | RGB XYZ axes at origin (R=X, G=Y, B=Z)              | `2`        |
| **Ground Plane**     | Solid/transparent ground that receives shadows       | `3`        |
| **Vanishing Lines**  | Lines from objects to vanishing points on horizon    | `4`        |
| **Edge Wireframe**   | Wireframe overlay on selected objects                | `5`        |

---

## Implementation

### `src/helpers/grid.ts`

```ts
import {
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  DoubleSide,
  Color,
} from 'three';

/**
 * An infinite-looking grid on the XZ plane.
 * Uses a custom shader that fades out based on distance from camera
 * and renders smoothly without Moiré patterns.
 */
export function createInfiniteGrid(options?: {
  size?: number;
  divisions?: number;
  color1?: number;
  color2?: number;
  fadeDistance?: number;
}): Mesh {
  const size = options?.size ?? 100;
  const color1 = new Color(options?.color1 ?? 0x444444);
  const color2 = new Color(options?.color2 ?? 0x222222);
  const fadeDistance = options?.fadeDistance ?? 50;

  const geometry = new PlaneGeometry(size, size, 1, 1);

  const material = new ShaderMaterial({
    side: DoubleSide,
    transparent: true,
    depthWrite: false,

    uniforms: {
      uColor1: { value: color1 },
      uColor2: { value: color2 },
      uSize1: { value: 1.0 },   // Major grid spacing
      uSize2: { value: 0.2 },   // Minor grid spacing
      uFadeDistance: { value: fadeDistance },
    },

    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,

    fragmentShader: /* glsl */ `
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uSize1;
      uniform float uSize2;
      uniform float uFadeDistance;
      varying vec3 vWorldPosition;

      float getGrid(float size) {
        vec2 r = vWorldPosition.xz / size;
        vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
        float line = min(grid.x, grid.y);
        return 1.0 - min(line, 1.0);
      }

      void main() {
        float d = length(vWorldPosition.xz);
        float fade = 1.0 - smoothstep(uFadeDistance * 0.5, uFadeDistance, d);

        float g1 = getGrid(uSize1);
        float g2 = getGrid(uSize2);

        vec3 color = mix(uColor2, uColor1, g1) + uColor1 * g2 * 0.5;
        float alpha = (g1 + g2 * 0.3) * fade;

        gl_FragColor = vec4(color, alpha * 0.8);
      }
    `,
  });

  const grid = new Mesh(geometry, material);
  grid.rotation.x = -Math.PI / 2; // Lay flat on XZ
  grid.renderOrder = -1;          // Render behind everything
  grid.name = '_PerspX_grid';

  return grid;
}
```

### `src/helpers/axes.ts`

```ts
import { AxesHelper, Group, Sprite, SpriteMaterial, CanvasTexture } from 'three';

/**
 * XYZ axes at the origin with axis labels
 */
export function createAxesHelper(size: number = 5): Group {
  const group = new Group();
  group.name = '_PerspX_axes';

  const axes = new AxesHelper(size);
  group.add(axes);

  // Add labels
  const labels = [
    { text: 'X', color: '#ff4444', pos: [size + 0.3, 0, 0] },
    { text: 'Y', color: '#44ff44', pos: [0, size + 0.3, 0] },
    { text: 'Z', color: '#4444ff', pos: [0, 0, size + 0.3] },
  ];

  for (const label of labels) {
    const sprite = createTextSprite(label.text, label.color);
    sprite.position.set(label.pos[0], label.pos[1], label.pos[2]);
    sprite.scale.set(0.5, 0.5, 0.5);
    group.add(sprite);
  }

  return group;
}

function createTextSprite(text: string, color: string): Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.font = 'Bold 80px Inter, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 64, 64);

  const texture = new CanvasTexture(canvas);
  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  return new Sprite(material);
}
```

### `src/helpers/ground-plane.ts`

```ts
import { Mesh, PlaneGeometry, ShadowMaterial } from 'three';

/**
 * A transparent ground plane that only receives shadows.
 * This gives depth cues without a visible floor.
 */
export function createGroundPlane(size: number = 50, opacity: number = 0.3): Mesh {
  const geometry = new PlaneGeometry(size, size);
  const material = new ShadowMaterial({ opacity });

  const ground = new Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.001; // Slight offset to prevent z-fighting with grid
  ground.receiveShadow = true;
  ground.name = '_PerspX_ground';

  return ground;
}
```

### `src/helpers/vanishing-points.ts`

```ts
import {
  Vector3,
  Group,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Float32BufferAttribute,
  PerspectiveCamera,
} from 'three';

/**
 * Visualizes vanishing points by drawing lines from an object
 * extending to the vanishing points on the horizon.
 *
 * This is an advanced helper for studying perspective construction.
 */
export class VanishingPointHelper {
  public readonly group: Group;
  private lines: Line[] = [];
  private material: LineBasicMaterial;

  constructor(color: number = 0xffaa00, opacity: number = 0.4) {
    this.group = new Group();
    this.group.name = '_PerspX_vanishing';

    this.material = new LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: false,
    });
  }

  /**
   * Update vanishing lines for a given object's edges.
   * Extends edges to where they converge (vanishing points).
   */
  updateForBox(
    objectPosition: Vector3,
    objectSize: Vector3,
    camera: PerspectiveCamera
  ): void {
    this.clear();

    // The 3 principal directions (world-aligned)
    const directions = [
      new Vector3(1, 0, 0),  // X
      new Vector3(0, 1, 0),  // Y
      new Vector3(0, 0, 1),  // Z
    ];
    const colors = [0xff4444, 0x44ff44, 0x4444ff];

    for (let i = 0; i < directions.length; i++) {
      const dir = directions[i];
      const extensionLength = 100; // How far the vanishing lines extend

      const start = objectPosition.clone().sub(dir.clone().multiplyScalar(extensionLength));
      const end = objectPosition.clone().add(dir.clone().multiplyScalar(extensionLength));

      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute([
        start.x, start.y, start.z,
        end.x, end.y, end.z,
      ], 3));

      const lineMat = new LineBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.3,
        depthTest: false,
      });

      const line = new Line(geometry, lineMat);
      this.lines.push(line);
      this.group.add(line);
    }
  }

  clear(): void {
    for (const line of this.lines) {
      line.geometry.dispose();
      (line.material as LineBasicMaterial).dispose();
      this.group.remove(line);
    }
    this.lines = [];
  }

  dispose(): void {
    this.clear();
    this.material.dispose();
  }
}
```

### `src/helpers/wireframe.ts`

```ts
import { LineSegments, EdgesGeometry, LineBasicMaterial, Mesh, Object3D } from 'three';

/**
 * Add an edge wireframe overlay to a mesh.
 * This shows the underlying geometry edges — essential for studying form.
 */
export function addWireframeOverlay(
  mesh: Mesh,
  color: number = 0xffffff,
  opacity: number = 0.5
): LineSegments {
  const edges = new EdgesGeometry(mesh.geometry, 30); // 30° threshold
  const material = new LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  });

  const wireframe = new LineSegments(edges, material);
  wireframe.name = '_PerspX_wireframe';
  mesh.add(wireframe); // Attach as child so it follows transforms

  return wireframe;
}

export function removeWireframeOverlay(mesh: Mesh): void {
  const wireframe = mesh.children.find((c) => c.name === '_PerspX_wireframe');
  if (wireframe) {
    mesh.remove(wireframe);
    (wireframe as LineSegments).geometry.dispose();
    ((wireframe as LineSegments).material as LineBasicMaterial).dispose();
  }
}

export function toggleWireframeOverlay(mesh: Mesh): boolean {
  const existing = mesh.children.find((c) => c.name === '_PerspX_wireframe');
  if (existing) {
    removeWireframeOverlay(mesh);
    return false;
  } else {
    addWireframeOverlay(mesh);
    return true;
  }
}
```

---

## Keyboard Toggles

```ts
// In the main app or a dedicated helpers manager:
window.addEventListener('keydown', (e) => {
  switch (e.key) {
    case '1': grid.visible = !grid.visible; break;
    case '2': axes.visible = !axes.visible; break;
    case '3': ground.visible = !ground.visible; break;
    case '4': vanishingHelper.group.visible = !vanishingHelper.group.visible; break;
    case '5':
      const selected = sceneManager.getSelectedObjects();
      selected.forEach((obj) => {
        if (obj instanceof Mesh) toggleWireframeOverlay(obj);
      });
      break;
  }
});
```

---

## Verification

- Infinite grid renders on the XZ plane and fades with distance
- Axes helper shows RGB colored X/Y/Z with labels
- Ground plane is invisible but shows shadows from objects
- Vanishing lines extend from objects along principal axes
- Wireframe overlay toggles on/off for selected objects
- All helpers can be toggled with keyboard shortcuts
- No z-fighting between grid, ground, and objects

---

## Output

After this phase, you have:
- [x] Infinite grid with anti-aliased fade-out
- [x] XYZ axes with color-coded labels
- [x] Shadow-receiving ground plane
- [x] Vanishing point line visualization
- [x] Edge wireframe overlay on meshes
- [x] Keyboard toggle for all helpers (1-5)

---

## Next → [08-lighting-system.md](./08-lighting-system.md)
