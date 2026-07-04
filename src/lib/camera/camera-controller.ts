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

  public enabled = true;

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
    if (!this.enabled) return;
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
    if (!this.enabled) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    this.sphericalTarget.radius *= 1 + delta * this.zoomSpeed;
    this.sphericalTarget.radius = MathUtils.clamp(
      this.sphericalTarget.radius, this.minDist, this.maxDist
    );
  };

  // --- Touch Support ---

  private onTouchStart = (e: TouchEvent): void => {
    if (!this.enabled) return;
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
    camera.updateMatrixWorld(); // Ensure matrix is current

    const right = new Vector3();
    const up = new Vector3();

    right.setFromMatrixColumn(camera.matrixWorld, 0); // Camera right
    up.setFromMatrixColumn(camera.matrixWorld, 1);    // Camera up

    const scale = this.spherical.radius * this.panSpeed;
    this.panOffset.add(right.multiplyScalar(-dx * scale));
    this.panOffset.add(up.multiplyScalar(dy * scale));
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
