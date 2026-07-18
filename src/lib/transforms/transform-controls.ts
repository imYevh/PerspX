import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Camera, Object3D, Matrix4, Vector3, Quaternion } from 'three';
import type { SceneManager } from '$lib/core/scene';
import type { CameraController } from '$lib/camera/camera-controller';
import { commitHistory } from '$lib/stores/history';
import { get } from 'svelte/store';
import { cameraStore } from '$lib/stores/camera';
import { uiStore } from '$lib/stores/ui';
import { matchShortcut } from '$lib/stores/shortcuts.svelte';

export type TransformMode = 'select' | 'translate' | 'rotate' | 'scale';
export type TransformSpace = 'world' | 'local';

export class TransformSystem {
  public controls: TransformControls;
  private activeObjectIds: string[] = [];
  private dummyPivot = new Object3D();
  private previousPivotMatrix = new Matrix4();
  private singleScaleData: {
    initScale: Vector3;
    initPosition: Vector3;
    initSize: Vector3;
    pivotInitScale: Vector3;
    sign?: Vector3;
  } | null = null;
  private sceneManager: SceneManager;
  private cameraController: CameraController;
  public isShiftDown: boolean = false;
  public isCtrlDown: boolean = false;

  private updateModifiers(e: KeyboardEvent | MouseEvent | PointerEvent | TouchEvent) {
    let ctrl = false;
    let shift = false;
    if ('ctrlKey' in e) {
      ctrl = e.ctrlKey || e.metaKey;
      shift = e.shiftKey;
    }
    if (ctrl !== this.isCtrlDown) {
      this.isCtrlDown = ctrl;
      if (this.isCtrlDown) this.enableGridSnap();
      else this.disableSnap();
    }
    this.isShiftDown = shift;
  }

  constructor(
    camera: Camera,
    canvas: HTMLCanvasElement,
    sceneManager: SceneManager,
    cameraController: CameraController
  ) {
    this.sceneManager = sceneManager;
    this.cameraController = cameraController;

    this.controls = new TransformControls(camera, canvas);

    const originalGetPointer = (this.controls as any)._getPointer;
    let dragStartPointer: { x: number, y: number } | null = null;

    if (originalGetPointer) {
      (this.controls as any)._getPointer = (event: Event) => {
        if (event instanceof MouseEvent || event instanceof PointerEvent || typeof (event as any).ctrlKey !== 'undefined') {
          this.updateModifiers(event as any);
        }

        const pointer = originalGetPointer.call(this.controls, event);
        if (pointer) {
          const state = get(cameraStore);
          if (state.fisheye && state.fisheyeIntensity !== 0) {
            const r2 = pointer.x * pointer.x + pointer.y * pointer.y;
            const k = state.fisheyeIntensity * 0.009;
            const maxScale = 1.0 + k * 2.0;
            const scale = (1.0 + k * r2) / maxScale;
            pointer.x *= scale;
            pointer.y *= scale;
          }

          // Dampen rotation and translation sensitivity
          if (!this.controls.dragging) {
            dragStartPointer = { x: pointer.x, y: pointer.y };
          } else if (dragStartPointer) {
            let pointerSensitivity = 1.0;
            if (this._currentMode === 'rotate') {
              pointerSensitivity = 0.5; // Base rotation speed
            }
            if (this.isShiftDown && this._currentMode !== 'scale') {
              pointerSensitivity *= 0.1; // 10x slower when holding shift (except for scale, handled mathematically)
            }

            if (pointerSensitivity !== 1.0) {
              pointer.x = dragStartPointer.x + (pointer.x - dragStartPointer.x) * pointerSensitivity;
              pointer.y = dragStartPointer.y + (pointer.y - dragStartPointer.y) * pointerSensitivity;
            }
          }
        }
        return pointer;
      };
    }

    sceneManager.scene.add(this.controls.getHelper());
    sceneManager.scene.add(this.dummyPivot);

    // Apply delta matrix when transforming multiple objects or single-sided scaling
    this.controls.addEventListener('change', () => {
      if (this.controls.object === this.dummyPivot) {
        if (this.activeObjectIds.length === 1 && this._currentMode === 'scale' && this.singleScaleData) {
          const id = this.activeObjectIds[0];
          const obj = this.sceneManager.getObject(id);
          if (obj) {
            const data = this.singleScaleData;
            const Sp = this.dummyPivot.scale.clone().divide(data.pivotInitScale);
            
            const axis = (this.controls as any).axis;
            const isXYZ = axis === 'XYZ';
            const doX = axis && axis.includes('X');
            const doY = axis && axis.includes('Y');
            const doZ = axis && axis.includes('Z');
            
            const sign = data.sign || new Vector3(1, 1, 1);
            
            // Dampen scale sensitivity. Single-sided scale effectively doubled the rate of edge expansion.
            // A sensitivity of 0.5 restores the original edge movement rate and makes uniform scaling less jarring.
            const sensitivity = this.isShiftDown ? 0.05 : 0.5;
            
            const newScale = new Vector3(
              doX ? data.initScale.x * (1 + (Sp.x - 1) * sensitivity) : data.initScale.x,
              doY ? data.initScale.y * (1 + (Sp.y - 1) * sensitivity) : data.initScale.y,
              doZ ? data.initScale.z * (1 + (Sp.z - 1) * sensitivity) : data.initScale.z
            );
            
            obj.scale.copy(newScale);
            
            // Simple local translation: when scaling from one face, the center must move
            // by exactly half the change in size to keep the opposite face stationary.
            if (!isXYZ && (doX || doY || doZ)) {
              const deltaX = doX ? sign.x * (Sp.x - 1) * sensitivity * data.initSize.x * data.initScale.x / 2 : 0;
              const deltaY = doY ? sign.y * (Sp.y - 1) * sensitivity * data.initSize.y * data.initScale.y / 2 : 0;
              const deltaZ = doZ ? sign.z * (Sp.z - 1) * sensitivity * data.initSize.z * data.initScale.z / 2 : 0;

              obj.position.copy(data.initPosition);
              obj.translateX(deltaX);
              obj.translateY(deltaY);
              obj.translateZ(deltaZ);
            } else if (isXYZ) {
              obj.position.copy(data.initPosition);
            }
          }
        } else if (this.activeObjectIds.length > 1) {
          const deltaMatrix = this.dummyPivot.matrixWorld.clone().multiply(this.previousPivotMatrix.clone().invert());
          
          for (const id of this.activeObjectIds) {
            const obj = this.sceneManager.getObject(id);
            if (obj) obj.applyMatrix4(deltaMatrix);
          }
          
          this.previousPivotMatrix.copy(this.dummyPivot.matrixWorld);
        }
      }
    });

    // Disable orbit controls while transforming
    this.controls.addEventListener('dragging-changed', (event) => {
      if (event.value) {
        this.cameraController.enabled = false;
        
        if (this.activeObjectIds.length === 1 && this._currentMode === 'scale') {
          const obj = this.sceneManager.getObject(this.activeObjectIds[0]);
          if (obj) {
            let mesh: any = null;
            obj.traverse((child) => {
              if ((child as any).isMesh && !mesh) mesh = child;
            });

            if (mesh && mesh.geometry) {
              mesh.geometry.computeBoundingBox();
              const bbox = mesh.geometry.boundingBox;
              const size = new Vector3();
              if (bbox) bbox.getSize(size);
              
              // pointStart is a WORLD direction offset from the object center when dragging starts.
              // To get the local direction, apply the inverse world rotation.
              const pointStart = (this.controls as any).pointStart;
              let sign = new Vector3(1, 1, 1);
              if (pointStart) {
                const localPoint = pointStart.clone().applyQuaternion(obj.getWorldQuaternion(new Quaternion()).invert());
                sign.set(
                  localPoint.x >= 0 ? 1 : -1,
                  localPoint.y >= 0 ? 1 : -1,
                  localPoint.z >= 0 ? 1 : -1
                );
              }
              const axis = (this.controls as any).axis;
              let doX = axis && axis.includes('X') && axis !== 'XYZ';
              let doY = axis && axis.includes('Y') && axis !== 'XYZ';
              let doZ = axis && axis.includes('Z') && axis !== 'XYZ';
              
              if (axis === 'XYZ') {
                doX = false; doY = false; doZ = false;
              }

              this.singleScaleData = {
                initScale: obj.scale.clone(),
                initPosition: obj.position.clone(),
                initSize: size,
                pivotInitScale: this.dummyPivot.scale.clone(),
                sign: sign
              };
            }
          }
        }
      } else {
        this.cameraController.enabled = true;
        this.singleScaleData = null;
        
        // Re-attach to update dummy pivot position and reset scale
        if (this.activeObjectIds.length === 1 && this._currentMode === 'scale') {
          this.attachToObject(this.activeObjectIds[0]);
        }

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
    if (!this.controls.enabled) return;
    const obj = this.sceneManager.getObject(id);
    const meta = this.sceneManager.getMeta(id);
    if (!obj || !meta || meta.locked) return;

    this.activeObjectIds = [id];

    if (this._currentMode === 'scale') {
      this.dummyPivot.position.copy(obj.getWorldPosition(new Vector3()));
      this.dummyPivot.quaternion.copy(obj.getWorldQuaternion(new Quaternion()));
      this.dummyPivot.scale.set(1, 1, 1);
      this.dummyPivot.updateMatrixWorld(true);
      this.controls.attach(this.dummyPivot);
    } else {
      this.controls.attach(obj);
    }
  }

  attachToMultiple(ids: string[]): void {
    if (!this.controls.enabled) return;
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
    const oldMode = this._currentMode;
    this._currentMode = mode;
    if (mode === 'select') {
      this.controls.enabled = false;
      (this.controls as any).visible = false;
    } else {
      this.controls.enabled = true;
      (this.controls as any).visible = true;
      this.controls.setMode(mode);
    }
    
    // Sync the UI
    uiStore.update(s => ({ ...s, transformMode: mode }));
    
    // Re-attach if switching between scale and other modes for single object
    if (this.activeObjectIds.length === 1) {
      if ((mode === 'scale' && oldMode !== 'scale') || (mode !== 'scale' && oldMode === 'scale')) {
        this.attachToObject(this.activeObjectIds[0]);
      }
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
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.updateModifiers(e);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.updateModifiers(e);

    // Don't trigger if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (matchShortcut(e, 'select_all')) {
      e.preventDefault();
      const allIds = this.sceneManager.getAllObjects()
        .filter(o => !o.meta.locked)
        .map(o => o.id);
      this.sceneManager.selectMultiple(allIds, false);
    } else if (matchShortcut(e, 'mode_translate')) {
      e.preventDefault();
      this.setMode('translate');
    } else if (matchShortcut(e, 'mode_rotate')) {
      e.preventDefault();
      this.setMode('rotate');
    } else if (matchShortcut(e, 'mode_scale')) {
      e.preventDefault();
      this.setMode('scale');
    } else if (matchShortcut(e, 'toggle_space')) {
      e.preventDefault();
      this.toggleSpace();
    } else if (matchShortcut(e, 'cancel')) {
      e.preventDefault();
      this.setMode('select');
      this.detach();
      this.sceneManager.deselectAll();
    } else if (matchShortcut(e, 'delete')) {
      e.preventDefault();
      if (this.activeObjectIds.length > 0) {
        const ids = [...this.activeObjectIds];
        this.detach();
        for (const id of ids) {
          this.sceneManager.removeObject(id);
        }
      }
    }
  };

  updateCamera(camera: Camera): void {
    this.controls.camera = camera;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.controls.dispose();
  }
}
