import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Camera, Object3D, Matrix4, Vector3 } from 'three';
import type { SceneManager } from '$lib/core/scene';
import type { CameraController } from '$lib/camera/camera-controller';
import { commitHistory } from '$lib/stores/history';

export type TransformMode = 'select' | 'translate' | 'rotate' | 'scale';
export type TransformSpace = 'world' | 'local';

export class TransformSystem {
  public controls: TransformControls;
  private activeObjectIds: string[] = [];
  private dummyPivot = new Object3D();
  private previousPivotMatrix = new Matrix4();
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
    sceneManager.scene.add(this.dummyPivot);

    // Apply delta matrix when transforming multiple objects
    this.controls.addEventListener('change', () => {
      if (this.activeObjectIds.length > 1 && this.controls.object === this.dummyPivot) {
        const deltaMatrix = this.dummyPivot.matrixWorld.clone().multiply(this.previousPivotMatrix.clone().invert());
        
        for (const id of this.activeObjectIds) {
          const obj = this.sceneManager.getObject(id);
          if (obj) obj.applyMatrix4(deltaMatrix);
        }
        
        this.previousPivotMatrix.copy(this.dummyPivot.matrixWorld);
      }
    });

    // Disable orbit controls while transforming
    this.controls.addEventListener('dragging-changed', (event) => {
      if (event.value) {
        this.cameraController.enabled = false;
      } else {
        this.cameraController.enabled = true;
        // Transform ended, commit to history
        if (this.activeObjectIds.length > 0) {
          commitHistory(this.sceneManager);
        }
      }
    });

    // Listen for selection changes
    sceneManager.on('selection-changed', (data) => {
      const ids: string[] = data.selectedIds;
      if (ids.length === 1) {
        this.attachToObject(ids[0]);
      } else if (ids.length > 1) {
        this.attachToMultiple(ids);
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
    if (!obj || !meta || meta.locked) return;

    this.controls.attach(obj);
    this.activeObjectIds = [id];
  }

  attachToMultiple(ids: string[]): void {
    const validIds = ids.filter(id => {
      const meta = this.sceneManager.getMeta(id);
      return meta && !meta.locked;
    });

    if (validIds.length === 0) {
      this.detach();
      return;
    }
    if (validIds.length === 1) {
      this.attachToObject(validIds[0]);
      return;
    }

    this.activeObjectIds = validIds;

    const center = new Vector3();
    for (const id of validIds) {
      const obj = this.sceneManager.getObject(id);
      if (obj) {
        const pos = new Vector3();
        obj.getWorldPosition(pos);
        center.add(pos);
      }
    }
    center.divideScalar(validIds.length);

    this.dummyPivot.position.copy(center);
    this.dummyPivot.rotation.set(0, 0, 0);
    this.dummyPivot.scale.set(1, 1, 1);
    this.dummyPivot.updateMatrixWorld(true);
    this.previousPivotMatrix.copy(this.dummyPivot.matrixWorld);

    this.controls.attach(this.dummyPivot);
  }

  detach(): void {
    this.controls.detach();
    this.activeObjectIds = [];
  }

  // --- Mode ---

  private _currentMode: TransformMode = 'translate';

  setMode(mode: TransformMode): void {
    this._currentMode = mode;
    if (mode === 'select') {
      this.controls.enabled = false;
      this.controls.visible = false;
    } else {
      this.controls.enabled = true;
      this.controls.visible = true;
      this.controls.setMode(mode);
    }
  }

  getMode(): TransformMode {
    return this._currentMode;
  }

  cycleMode(): TransformMode {
    const modes: TransformMode[] = ['select', 'translate', 'rotate', 'scale'];
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

    switch (e.code) {
      case 'KeyA':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const allIds = this.sceneManager.getAllObjects()
            .filter(o => !o.meta.locked)
            .map(o => o.id);
          this.sceneManager.selectMultiple(allIds, false);
        }
        break;
      case 'KeyT':
      case 'KeyG': // Grab (Blender style)
        this.setMode('translate');
        break;
      case 'KeyR':
        this.setMode('rotate');
        break;
      case 'KeyS':
        this.setMode('scale');
        break;
      case 'KeyX':
        this.toggleSpace();
        break;
      case 'Escape':
        this.detach();
        this.sceneManager.deselectAll();
        break;
      case 'Delete':
      case 'Backspace':
        if (this.activeObjectIds.length > 0) {
          const ids = [...this.activeObjectIds];
          this.detach();
          for (const id of ids) {
            this.sceneManager.removeObject(id);
          }
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
