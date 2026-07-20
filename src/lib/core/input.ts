import { Vector2, type Camera, Object3D } from 'three';
import { SelectionBox } from 'three/addons/interactive/SelectionBox.js';
import type { SceneManager } from './scene';
import type { TransformSystem } from '../transforms/transform-controls';
import { uiStore } from '../stores/ui';
import { get } from 'svelte/store';
import { cameraStore } from '../stores/camera';

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
  private cameraController?: any;

  // Track tap-and-hold for touch selection
  private holdTimer: number | null = null;
  private isTouchSelectionMode = false;

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

  setCameraController(cc: any) {
    this.cameraController = cc;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;

    // Ignore if clicking on a transform gizmo handle
    if (this.transformSystem && this.transformSystem.controls.axis !== null) return;

    this.isPointerDown = true;
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
    this.isDragging = false;
    this.isTouchSelectionMode = false;

    // Touch selection tap-and-hold removed
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
        if (e.pointerType === 'touch') {
          // Can still trigger marquee if needed, but usually mobile users rely on taps
        } else {
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
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.button !== 0) return;

    if (this.cameraController) {
      this.cameraController.lockOrbit = false;
    }

    if (!this.isPointerDown) return;
    this.isPointerDown = false;

    // Ignore if releasing a transform gizmo handle
    if (this.transformSystem && this.transformSystem.controls.axis !== null) return;

    if (this.isMarquee) {
      this.isMarquee = false;
      uiStore.update(s => ({ ...s, marquee: { ...s.marquee, active: false } }));
      this.performBoxSelection(e, e.shiftKey || get(uiStore).multiSelectMode);
    } else if (!this.isDragging) {
      // Single tap / click selection
      this.performSelection(e, e.shiftKey || get(uiStore).multiSelectMode);
    }
  };

  private applyFisheye(x: number, y: number): { x: number, y: number } {
    const state = get(cameraStore);
    if (!state.fisheye || state.fisheyeIntensity === 0) return { x, y };

    const r2 = x * x + y * y;
    const k = state.fisheyeIntensity * 0.009;
    const maxScale = 1.0 + k * 2.0;
    const scale = (1.0 + k * r2) / maxScale;
    return { x: x * scale, y: y * scale };
  }

  private applySwirl(x: number, y: number): { x: number, y: number } {
    const state = get(cameraStore);
    if (!state.swirl || state.swirlAmount === 0) return { x, y };
    
    const uvX = (x + 1) / 2;
    const uvY = (y + 1) / 2;
    
    const pX = uvX - 0.5;
    const pY = uvY - 0.5;
    
    const r = Math.sqrt(pX * pX + pY * pY);
    const decay = r / state.swirlRadius;
    const rot = state.swirlAmount * Math.exp(-(decay * decay));
    
    const cosT = Math.cos(rot);
    const sinT = Math.sin(rot);
    
    const nx = pX * cosT - pY * sinT;
    const ny = pX * sinT + pY * cosT;
    
    const ndcX = (nx + 0.5) * 2 - 1;
    const ndcY = (ny + 0.5) * 2 - 1;
    
    return { x: ndcX, y: ndcY };
  }

  private performSelection(e: PointerEvent, additive: boolean) {
    const rect = this.canvas.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    let y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    let warped = this.applySwirl(x, y);
    warped = this.applyFisheye(warped.x, warped.y);
    this.mouse.x = warped.x;
    this.mouse.y = warped.y;

    const hit = this.sceneManager.raycastFromScreen(this.mouse, this.camera);
    if (hit) {
      this.sceneManager.select(hit.id, additive);
    } else if (!additive) {
      this.sceneManager.deselectAll();
    }
  }

  private performBoxSelection(e: PointerEvent, additive: boolean) {
    const rect = this.canvas.getBoundingClientRect();
    let startX = ((this.pointerDownPos.x - rect.left) / rect.width) * 2 - 1;
    let startY = -((this.pointerDownPos.y - rect.top) / rect.height) * 2 + 1;
    let endX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    let endY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    let warpedStart = this.applySwirl(startX, startY);
    warpedStart = this.applyFisheye(warpedStart.x, warpedStart.y);
    
    let warpedEnd = this.applySwirl(endX, endY);
    warpedEnd = this.applyFisheye(warpedEnd.x, warpedEnd.y);

    // SelectionBox expects top-left and bottom-right points
    this.selectionBox.startPoint.set(Math.min(warpedStart.x, warpedEnd.x), Math.max(warpedStart.y, warpedEnd.y), 0.5);
    this.selectionBox.endPoint.set(Math.max(warpedStart.x, warpedEnd.x), Math.min(warpedStart.y, warpedEnd.y), 0.5);

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
