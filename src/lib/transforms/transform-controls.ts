import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Camera, Object3D } from 'three';
import type { SceneManager } from '$lib/core/scene';
import type { CameraController } from '$lib/camera/camera-controller';

export type TransformMode = 'translate' | 'rotate' | 'scale';
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
    const modes: TransformMode[] = ['translate', 'rotate', 'scale'];
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
      case 't':
      case 'g': // Grab (Blender style)
        this.setMode('translate');
        break;
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
