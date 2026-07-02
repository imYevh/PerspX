# 04 — Camera System

## Goal
Build a flexible camera system with orbit controls, perspective/orthographic switching, and the signature dolly zoom (Vertigo) effect that Zolly is known for.

---

## Key Concepts

### Camera Modes

| Mode            | Description                                                                 |
| :-------------- | :-------------------------------------------------------------------------- |
| **Perspective** | Standard perspective projection — objects get smaller with distance         |
| **Orthographic**| No perspective distortion — parallel lines stay parallel (technical drawing)|
| **Dolly Zoom**  | Camera moves back while FOV narrows (or vice versa) — subject stays same size but background warps dramatically |

### Dolly Zoom Explained
The "dolly zoom" (Vertigo effect) is the core feature from Zolly. The math:
- Keep the **subject** at a constant apparent size on screen
- As camera **distance** increases → **FOV** decreases (zoom in)
- As camera **distance** decreases → **FOV** increases (zoom out)
- Formula: `FOV = 2 * atan(subjectHeight / (2 * distance))`

This creates a dramatic change in perspective distortion while keeping the subject consistently framed.

---

## Implementation

### `src/camera/camera-controller.ts`

```ts
import {
  PerspectiveCamera,
  OrthographicCamera,
  Vector3,
  Spherical,
  MathUtils,
  type Camera,
} from 'three';

export type CameraMode = 'perspective' | 'orthographic';

export interface CameraControllerOptions {
  canvas: HTMLCanvasElement;
  aspect: number;
  initialPosition?: Vector3;
  target?: Vector3;
  fov?: number;
  near?: number;
  far?: number;
  // Orbit constraints
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number; // radians — prevent flipping under ground
  maxPolarAngle?: number;
  // Sensitivity
  orbitSpeed?: number;
  panSpeed?: number;
  zoomSpeed?: number;
  damping?: number; // 0 = no damping, 1 = heavy damping
}

export class CameraController {
  public perspCamera: PerspectiveCamera;
  public orthoCamera: OrthographicCamera;
  public mode: CameraMode = 'perspective';
  public target = new Vector3(0, 0, 0);

  private spherical = new Spherical();
  private sphericalTarget = new Spherical();
  private panOffset = new Vector3();

  private canvas: HTMLCanvasElement;
  private isDragging = false;
  private isRightDragging = false;
  private isPinching = false;
  private lastMouse = { x: 0, y: 0 };
  private lastPinchDist = 0;

  // Config
  private minDist: number;
  private maxDist: number;
  private minPolar: number;
  private maxPolar: number;
  private orbitSpeed: number;
  private panSpeed: number;
  private zoomSpeed: number;
  private damping: number;

  constructor(options: CameraControllerOptions) {
    this.canvas = options.canvas;
    const fov = options.fov ?? 50;
    const near = options.near ?? 0.1;
    const far = options.far ?? 2000;
    const aspect = options.aspect;

    // Perspective camera
    this.perspCamera = new PerspectiveCamera(fov, aspect, near, far);
    const pos = options.initialPosition ?? new Vector3(5, 4, 5);
    this.perspCamera.position.copy(pos);

    // Orthographic camera
    const frustum = 10;
    this.orthoCamera = new OrthographicCamera(
      -frustum * aspect, frustum * aspect,
      frustum, -frustum,
      near, far
    );
    this.orthoCamera.position.copy(pos);

    this.target = options.target?.clone() ?? new Vector3(0, 0, 0);

    // Constraints
    this.minDist = options.minDistance ?? 1;
    this.maxDist = options.maxDistance ?? 200;
    this.minPolar = options.minPolarAngle ?? 0.05;
    this.maxPolar = options.maxPolarAngle ?? Math.PI - 0.05;
    this.orbitSpeed = options.orbitSpeed ?? 0.005;
    this.panSpeed = options.panSpeed ?? 0.01;
    this.zoomSpeed = options.zoomSpeed ?? 0.1;
    this.damping = options.damping ?? 0.08;

    // Initialize spherical from position
    const offset = this.perspCamera.position.clone().sub(this.target);
    this.spherical.setFromVector3(offset);
    this.sphericalTarget.copy(this.spherical);

    this.perspCamera.lookAt(this.target);
    this.orthoCamera.lookAt(this.target);

    this.bindEvents();
  }

  get camera(): Camera {
    return this.mode === 'perspective' ? this.perspCamera : this.orthoCamera;
  }

  // --- Mode Switching ---

  setMode(mode: CameraMode): void {
    this.mode = mode;
    this.syncCameras();
  }

  toggleMode(): CameraMode {
    this.setMode(this.mode === 'perspective' ? 'orthographic' : 'perspective');
    return this.mode;
  }

  // --- FOV Control ---

  setFOV(fov: number): void {
    this.perspCamera.fov = MathUtils.clamp(fov, 1, 170);
    this.perspCamera.updateProjectionMatrix();
  }

  getFOV(): number {
    return this.perspCamera.fov;
  }

  // --- Update (call each frame) ---

  update(): void {
    // Smooth interpolation (damping)
    this.spherical.phi += (this.sphericalTarget.phi - this.spherical.phi) * this.damping;
    this.spherical.theta += (this.sphericalTarget.theta - this.spherical.theta) * this.damping;
    this.spherical.radius += (this.sphericalTarget.radius - this.spherical.radius) * this.damping;

    // Clamp
    this.spherical.phi = MathUtils.clamp(this.spherical.phi, this.minPolar, this.maxPolar);
    this.spherical.radius = MathUtils.clamp(this.spherical.radius, this.minDist, this.maxDist);

    // Apply pan offset with damping
    this.target.add(this.panOffset.multiplyScalar(this.damping));
    this.panOffset.set(0, 0, 0);

    // Update camera position from spherical
    const offset = new Vector3().setFromSpherical(this.spherical);
    const newPos = this.target.clone().add(offset);

    this.perspCamera.position.copy(newPos);
    this.perspCamera.lookAt(this.target);

    this.orthoCamera.position.copy(newPos);
    this.orthoCamera.lookAt(this.target);
  }

  handleResize(aspect: number): void {
    this.perspCamera.aspect = aspect;
    this.perspCamera.updateProjectionMatrix();

    const frustum = this.spherical.radius * 0.5;
    this.orthoCamera.left = -frustum * aspect;
    this.orthoCamera.right = frustum * aspect;
    this.orthoCamera.top = frustum;
    this.orthoCamera.bottom = -frustum;
    this.orthoCamera.updateProjectionMatrix();
  }

  // --- Private: Input Handling ---

  private bindEvents(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd);

    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button === 0) { // Left click — orbit
      this.isDragging = true;
    } else if (e.button === 2) { // Right click — pan
      this.isRightDragging = true;
    }
    this.lastMouse = { x: e.clientX, y: e.clientY };
  };

  private onPointerMove = (e: PointerEvent): void => {
    const dx = e.clientX - this.lastMouse.x;
    const dy = e.clientY - this.lastMouse.y;
    this.lastMouse = { x: e.clientX, y: e.clientY };

    if (this.isDragging) {
      // Orbit
      this.sphericalTarget.theta -= dx * this.orbitSpeed;
      this.sphericalTarget.phi -= dy * this.orbitSpeed;
      this.sphericalTarget.phi = MathUtils.clamp(
        this.sphericalTarget.phi, this.minPolar, this.maxPolar
      );
    }

    if (this.isRightDragging) {
      // Pan
      this.pan(dx, dy);
    }
  };

  private onPointerUp = (): void => {
    this.isDragging = false;
    this.isRightDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    this.sphericalTarget.radius *= 1 + delta * this.zoomSpeed;
    this.sphericalTarget.radius = MathUtils.clamp(
      this.sphericalTarget.radius, this.minDist, this.maxDist
    );
  };

  // --- Touch Support ---

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      this.isDragging = false;
      this.isPinching = true;
      this.lastPinchDist = this.getTouchDistance(e.touches);
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.lastMouse.x;
      const dy = e.touches[0].clientY - this.lastMouse.y;
      this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      this.sphericalTarget.theta -= dx * this.orbitSpeed;
      this.sphericalTarget.phi -= dy * this.orbitSpeed;
      this.sphericalTarget.phi = MathUtils.clamp(
        this.sphericalTarget.phi, this.minPolar, this.maxPolar
      );
    } else if (e.touches.length === 2 && this.isPinching) {
      const dist = this.getTouchDistance(e.touches);
      const delta = this.lastPinchDist - dist;
      this.sphericalTarget.radius *= 1 + delta * 0.005;
      this.sphericalTarget.radius = MathUtils.clamp(
        this.sphericalTarget.radius, this.minDist, this.maxDist
      );
      this.lastPinchDist = dist;
    }
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
    this.isPinching = false;
  };

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private pan(dx: number, dy: number): void {
    const camera = this.camera;
    const right = new Vector3();
    const up = new Vector3();

    camera.getWorldDirection(new Vector3());
    right.setFromMatrixColumn(camera.matrixWorld, 0); // Camera right
    up.setFromMatrixColumn(camera.matrixWorld, 1);    // Camera up

    const scale = this.spherical.radius * this.panSpeed;
    this.panOffset.add(right.multiplyScalar(-dx * scale * 0.002));
    this.panOffset.add(up.multiplyScalar(dy * scale * 0.002));
  }

  private syncCameras(): void {
    // Sync position and orientation between cameras
    const active = this.camera;
    active.position.copy(
      this.mode === 'perspective'
        ? this.orthoCamera.position
        : this.perspCamera.position
    );
    active.lookAt(this.target);
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
  }
}
```

### `src/camera/dolly-zoom.ts`

```ts
import { MathUtils, PerspectiveCamera, Vector3 } from 'three';

/**
 * Dolly Zoom (Vertigo / Hitchcock effect)
 *
 * Moves the camera along its look direction while adjusting FOV
 * so the subject stays the same apparent size on screen.
 *
 * Formula: FOV = 2 * atan(subjectSize / (2 * distance))
 */
export class DollyZoom {
  private subjectWorldPos = new Vector3();
  private subjectApparentSize: number;
  private isActive = false;

  constructor(
    private camera: PerspectiveCamera,
    subjectPos: Vector3 = new Vector3(0, 0, 0),
    subjectHeight: number = 1
  ) {
    this.subjectWorldPos.copy(subjectPos);
    this.subjectApparentSize = subjectHeight;
  }

  /**
   * Start the dolly zoom. Locks the subject's apparent size.
   */
  activate(subjectPos?: Vector3): void {
    if (subjectPos) this.subjectWorldPos.copy(subjectPos);
    this.isActive = true;
  }

  deactivate(): void {
    this.isActive = false;
  }

  get active(): boolean {
    return this.isActive;
  }

  /**
   * Call when the camera distance changes.
   * Adjusts FOV to maintain the subject's apparent size.
   */
  update(): void {
    if (!this.isActive) return;

    const distance = this.camera.position.distanceTo(this.subjectWorldPos);
    if (distance < 0.01) return; // Avoid division by zero

    const fov = 2 * MathUtils.RAD2DEG * Math.atan(
      this.subjectApparentSize / (2 * distance)
    );

    this.camera.fov = MathUtils.clamp(fov, 1, 170);
    this.camera.updateProjectionMatrix();
  }

  /**
   * Set the distance while applying dolly zoom.
   * Moves camera along its current look direction.
   */
  setDistance(newDistance: number): void {
    const direction = new Vector3()
      .subVectors(this.camera.position, this.subjectWorldPos)
      .normalize();

    this.camera.position.copy(
      this.subjectWorldPos.clone().add(direction.multiplyScalar(newDistance))
    );

    this.update();
  }

  /**
   * Get info for UI display
   */
  getInfo(): { distance: number; fov: number; focalLength: number } {
    const distance = this.camera.position.distanceTo(this.subjectWorldPos);
    const fov = this.camera.fov;
    // Approximate focal length (35mm equivalent)
    const focalLength = (36 / 2) / Math.tan(MathUtils.DEG2RAD * fov / 2);
    return { distance, fov, focalLength };
  }

  setSubject(pos: Vector3, height?: number): void {
    this.subjectWorldPos.copy(pos);
    if (height !== undefined) this.subjectApparentSize = height;
  }
}
```

### `src/camera/camera-presets.ts`

```ts
import { Vector3 } from 'three';

export interface CameraPreset {
  name: string;
  position: Vector3;
  target: Vector3;
  fov: number;
}

export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  // Standard views
  front: {
    name: 'Front',
    position: new Vector3(0, 0, 10),
    target: new Vector3(0, 0, 0),
    fov: 50,
  },
  back: {
    name: 'Back',
    position: new Vector3(0, 0, -10),
    target: new Vector3(0, 0, 0),
    fov: 50,
  },
  left: {
    name: 'Left',
    position: new Vector3(-10, 0, 0),
    target: new Vector3(0, 0, 0),
    fov: 50,
  },
  right: {
    name: 'Right',
    position: new Vector3(10, 0, 0),
    target: new Vector3(0, 0, 0),
    fov: 50,
  },
  top: {
    name: 'Top',
    position: new Vector3(0, 10, 0),
    target: new Vector3(0, 0, 0),
    fov: 50,
  },
  bottom: {
    name: 'Bottom',
    position: new Vector3(0, -10, 0),
    target: new Vector3(0, 0, 0),
    fov: 50,
  },

  // Artistic perspectives
  dramatic: {
    name: 'Dramatic Low',
    position: new Vector3(3, 0.5, 3),
    target: new Vector3(0, 1, 0),
    fov: 85,
  },
  wideAngle: {
    name: 'Wide Angle',
    position: new Vector3(2, 1, 2),
    target: new Vector3(0, 0, 0),
    fov: 120,
  },
  telephoto: {
    name: 'Telephoto',
    position: new Vector3(30, 5, 30),
    target: new Vector3(0, 0, 0),
    fov: 12,
  },
  birdEye: {
    name: "Bird's Eye",
    position: new Vector3(5, 15, 5),
    target: new Vector3(0, 0, 0),
    fov: 40,
  },
  wormEye: {
    name: "Worm's Eye",
    position: new Vector3(2, -0.2, 2),
    target: new Vector3(0, 3, 0),
    fov: 90,
  },
};

// Focal length presets (35mm equivalent)
export const FOCAL_LENGTHS: Record<string, number> = {
  'Fish Eye (8mm)': 8,
  'Ultra Wide (14mm)': 14,
  'Wide (24mm)': 24,
  'Standard (35mm)': 35,
  'Normal (50mm)': 50,
  'Portrait (85mm)': 85,
  'Telephoto (135mm)': 135,
  'Super Telephoto (200mm)': 200,
};

/**
 * Convert focal length (mm) to vertical FOV (degrees).
 * Assumes 36mm sensor width (full frame).
 */
export function focalLengthToFOV(focalLength: number): number {
  return 2 * Math.atan(36 / (2 * focalLength)) * (180 / Math.PI);
}

/**
 * Convert vertical FOV (degrees) to focal length (mm).
 */
export function fovToFocalLength(fov: number): number {
  return 36 / (2 * Math.tan((fov * Math.PI) / 360));
}
```

---

## Controls Summary

| Input               | Desktop           | Mobile              |
| :------------------ | :---------------- | :------------------ |
| **Orbit**           | Left-click drag   | 1-finger drag       |
| **Pan**             | Right-click drag  | 2-finger drag (*)   |
| **Zoom**            | Scroll wheel      | Pinch               |
| **Dolly Zoom**      | UI slider / key   | UI slider           |

(*) 2-finger pan can be added in a future iteration.

---

## Verification

- Orbit around the scene by left-clicking and dragging
- Pan with right-click drag
- Zoom with scroll wheel
- Switch between perspective and orthographic modes
- Activate dolly zoom and change distance — FOV adjusts automatically
- Camera presets snap to correct views
- All interactions work on mobile (touch)

---

## Output

After this phase, you have:
- [x] Smooth orbit camera with damping
- [x] Perspective / Orthographic mode toggle
- [x] Dolly zoom (Vertigo effect) — the signature Zolly feature
- [x] Camera presets (Front, Top, Dramatic, Wide Angle, etc.)
- [x] Focal length ↔ FOV conversion
- [x] Full touch support (1-finger orbit, 2-finger pinch zoom)
- [x] Configurable constraints (min/max distance, polar angles)

---

## Next → [05-primitives-library.md](./05-primitives-library.md)
