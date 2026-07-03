# 06 — Transform Controls

## Goal
Allow users to move, rotate, and scale objects in the 3D scene using interactive gizmos (handles). Support grid snapping for precise placement.

---

## Key Concepts

### Transform Modes

| Mode        | Gizmo              | Action                  | Keyboard Shortcut |
| :---------- | :------------------ | :---------------------- | :---------------- |
| **Rotate**    | XYZ rings          | Rotate object           | `R`               |
| **Scale**     | XYZ cubes on axes  | Scale object            | `S`               |

### Coordinate Spaces

| Space     | Description                                                    | Key   |
| :-------- | :------------------------------------------------------------- | :---- |
| **World** | Gizmo axes align with world XYZ — consistent regardless of object rotation | `X`   |
| **Local** | Gizmo axes align with the object's own orientation              | `L`   |

---

## Implementation

### Using Three.js TransformControls

Three.js provides `TransformControls` which handles all the gizmo rendering and interaction. We wrap it with our own class for integration with the SceneManager.

### `src/transforms/transform-controls.ts`

```ts
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Camera, Object3D } from 'three';
import type { SceneManager } from '@/core/scene';
import type { CameraController } from '@/camera/camera-controller';

export type TransformMode = 'rotate' | 'scale';
export type TransformSpace = 'world' | 'local';

export class TransformSystem {
  public controls: TransformControls;
  private activeObjectId: string | null = null;
  private sceneManager: SceneManager;
  private cameraController: CameraController;

  constructor(
    camera: Camera,
    canvas: HTMLCanvasElement,
    sceneManager: SceneManager,
    cameraController: CameraController
  ) {
    this.sceneManager = sceneManager;
    this.cameraController = cameraController;

    this.controls = new TransformControls(camera, canvas);
    sceneManager.scene.add(this.controls.getHelper());

    // Disable orbit controls while transforming
    this.controls.addEventListener('dragging-changed', (event) => {
      // You can set a flag on cameraController to disable orbit during drag
      // This prevents camera movement while dragging a gizmo
      if (event.value) {
        this.cameraController.enabled = false;
      } else {
        this.cameraController.enabled = true;
      }
    });

    // Listen for selection changes
    sceneManager.on('selection-changed', (data) => {
      const ids: string[] = data.selectedIds;
      if (ids.length === 1) {
        this.attachToObject(ids[0]);
      } else {
        this.detach();
      }
    });

    this.bindKeyboard();
  }

  // --- Attach / Detach ---

  attachToObject(id: string): void {
    const obj = this.sceneManager.getObject(id);
    const meta = this.sceneManager.getMeta(id);
    if (!obj || !meta) return;
    if (meta.locked) return; // Don't allow transforms on locked objects

    this.controls.attach(obj);
    this.activeObjectId = id;
  }

  detach(): void {
    this.controls.detach();
    this.activeObjectId = null;
  }

  // --- Mode ---

  setMode(mode: TransformMode): void {
    this.controls.setMode(mode);
  }

  getMode(): TransformMode {
    return this.controls.mode as TransformMode;
  }

  cycleMode(): TransformMode {
    const modes: TransformMode[] = ['rotate', 'scale'];
    const currentIndex = modes.indexOf(this.getMode());
    const next = modes[(currentIndex + 1) % modes.length];
    this.setMode(next);
    return next;
  }

  // --- Space ---

  setSpace(space: TransformSpace): void {
    this.controls.setSpace(space);
  }

  toggleSpace(): TransformSpace {
    const current = this.controls.space as TransformSpace;
    const next: TransformSpace = current === 'world' ? 'local' : 'world';
    this.setSpace(next);
    return next;
  }

  // --- Snapping ---

  setTranslateSnap(value: number | null): void {
    this.controls.setTranslationSnap(value);
  }

  setRotateSnap(value: number | null): void {
    this.controls.setRotationSnap(value);
  }

  setScaleSnap(value: number | null): void {
    this.controls.setScaleSnap(value);
  }

  enableGridSnap(gridSize: number = 0.5): void {
    this.setTranslateSnap(gridSize);
    this.setRotateSnap(Math.PI / 12); // 15 degree increments
    this.setScaleSnap(0.1);
  }

  disableSnap(): void {
    this.setTranslateSnap(null);
    this.setRotateSnap(null);
    this.setScaleSnap(null);
  }

  // --- Gizmo Size ---

  setSize(size: number): void {
    this.controls.setSize(size);
  }

  // --- Keyboard Shortcuts ---

  private bindKeyboard(): void {
    window.addEventListener('keydown', this.onKeyDown);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // Don't trigger if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    switch (e.key.toLowerCase()) {
      case 'r':
        this.setMode('rotate');
        break;
      case 's':
        this.setMode('scale');
        break;
      case 'x':
        this.toggleSpace();
        break;
      case 'escape':
        this.detach();
        this.sceneManager.deselectAll();
        break;
      case 'delete':
      case 'backspace':
        if (this.activeObjectId) {
          const id = this.activeObjectId;
          this.detach();
          this.sceneManager.removeObject(id);
        }
        break;
    }
  };

  updateCamera(camera: Camera): void {
    this.controls.camera = camera;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.controls.dispose();
  }
}
```

### `src/transforms/snapping.ts`

```ts
import { MathUtils } from 'three';

export interface SnapConfig {
  translate: number; // World units
  rotate: number;    // Degrees
  scale: number;     // Scale factor
}

export const SNAP_PRESETS: Record<string, SnapConfig> = {
  none: { translate: 0, rotate: 0, scale: 0 },
  fine: { translate: 0.1, rotate: 5, scale: 0.05 },
  medium: { translate: 0.5, rotate: 15, scale: 0.1 },
  coarse: { translate: 1.0, rotate: 45, scale: 0.25 },
};

export function snapValue(value: number, snap: number): number {
  if (snap <= 0) return value;
  return Math.round(value / snap) * snap;
}

export function snapAngle(degrees: number, snap: number): number {
  if (snap <= 0) return degrees;
  return Math.round(degrees / snap) * snap;
}
```

---

## User Experience

### Desktop
- Select an object by clicking on it in the viewport
- Gizmo appears on the selected object
- Drag the gizmo axes to transform
- Press `R` for rotate, `S` for scale
- Hold `Shift` during drag for snapping (optional — can be wired in)
- Press `Delete` to remove the selected object
- Press `Escape` to deselect

### Mobile
- Tap an object to select it
- Gizmo appears — drag the handles
- Transform mode is toggled via a toolbar button (since no keyboard)

---

## Verification

- Selecting an object shows the transform gizmo
- Switching modes (R/S) changes the gizmo type
- Dragging a gizmo axis transforms the object correctly
- Orbit camera is disabled while dragging a gizmo
- Grid snapping snaps to correct increments
- Deleting an object removes it and clears the gizmo
- Locked objects cannot be transformed

---

## Output

After this phase, you have:
- [x] Interactive rotate/scale gizmos
- [x] World and local coordinate space toggle
- [x] Grid/angle/scale snapping with presets
- [x] Keyboard shortcuts (R, S, X, Delete, Escape)
- [x] Integration with SceneManager selection
- [x] Orbit camera disabled during gizmo drag
- [x] Locked object protection

---

## Next → [07-grid-and-helpers.md](./07-grid-and-helpers.md)
