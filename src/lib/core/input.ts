import { Vector2, type Camera, Object3D } from 'three';
import { SelectionBox } from 'three/addons/interactive/SelectionBox.js';
import type { SceneManager } from './scene';
import type { TransformSystem } from '../transforms/transform-controls';
import { uiStore } from '../stores/ui';

export class InputSystem {
  private mouse = new Vector2();
  private canvas: HTMLCanvasElement;
  private camera: Camera;
  private sceneManager: SceneManager;
  private selectionBox: SelectionBox;
  
  // Track pointer-down to detect a real click (not a drag)
  private pointerDownPos = { x: 0, y: 0 };
  private isDragging = false;
  private isMarquee = false;
  private isPointerDown = false;
  private transformSystem?: TransformSystem;

  constructor(canvas: HTMLCanvasElement, camera: Camera, sceneManager: SceneManager) {
    this.canvas = canvas;
    this.camera = camera;
    this.sceneManager = sceneManager;
    this.selectionBox = new SelectionBox(this.camera, this.sceneManager.scene);

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  setTransformSystem(ts: TransformSystem) {
    this.transformSystem = ts;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;

    // Ignore if clicking on a transform gizmo handle
    if (this.transformSystem && this.transformSystem.controls.axis !== null) return;

    this.isPointerDown = true;
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
    this.isDragging = false;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isPointerDown) return;

    // Ignore if transform gizmo is being interacted with
    if (this.transformSystem && this.transformSystem.controls.dragging) return;

    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > 4) {
      this.isDragging = true;
      
      // Marquee selection box
      if (e.buttons === 1) { // Left mouse button is held down
        this.isMarquee = true;
        uiStore.update(s => ({
          ...s,
          marquee: {
            active: true,
            startX: this.pointerDownPos.x,
            startY: this.pointerDownPos.y,
            currentX: e.clientX,
            currentY: e.clientY
          }
        }));
      }
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    if (!this.isPointerDown) return;
    this.isPointerDown = false;

    // Ignore if releasing a transform gizmo handle
    if (this.transformSystem && this.transformSystem.controls.axis !== null) return;

    if (this.isMarquee) {
      this.isMarquee = false;
      uiStore.update(s => ({ ...s, marquee: { ...s.marquee, active: false } }));
      this.performBoxSelection(e, e.shiftKey);
    } else if (!this.isDragging) {
      // If it was just a click, do normal selection
      this.performSelection(e, e.shiftKey);
    }
  };

  private performSelection(e: PointerEvent, additive: boolean) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const hit = this.sceneManager.raycastFromScreen(this.mouse, this.camera);
    if (hit) {
      this.sceneManager.select(hit.id, additive);
    } else if (!additive) {
      this.sceneManager.deselectAll();
    }
  }

  private performBoxSelection(e: PointerEvent, additive: boolean) {
    const rect = this.canvas.getBoundingClientRect();
    const startX = ((this.pointerDownPos.x - rect.left) / rect.width) * 2 - 1;
    const startY = -((this.pointerDownPos.y - rect.top) / rect.height) * 2 + 1;
    const endX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const endY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // SelectionBox expects top-left and bottom-right points
    this.selectionBox.startPoint.set(Math.min(startX, endX), Math.max(startY, endY), 0.5);
    this.selectionBox.endPoint.set(Math.max(startX, endX), Math.min(startY, endY), 0.5);

    const intersects = this.selectionBox.select();
    const hitIds = new Set<string>();
    
    const checkObj = (obj: Object3D) => {
      let hit: Object3D | null = obj;
      while (hit && !hit.userData.PerspXId) {
        hit = hit.parent;
      }
      if (hit?.userData.PerspXId) {
        if (hit.name !== '_PerspX_grid' && hit.name !== '_PerspX_ground') {
          hitIds.add(hit.userData.PerspXId);
        }
      }
    };
    
    for (const obj of intersects) {
      checkObj(obj as Object3D);
    }

    if (hitIds.size > 0) {
      this.sceneManager.selectMultiple(Array.from(hitIds), additive);
    } else if (!additive) {
      this.sceneManager.deselectAll();
    }
  }
  
  updateCamera(camera: Camera) {
    this.camera = camera;
    this.selectionBox.camera = camera;
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
  }
}
