import { Vector2, type Camera } from 'three';
import type { SceneManager } from './scene';

export class InputSystem {
  private mouse = new Vector2();
  private canvas: HTMLCanvasElement;
  private camera: Camera;
  private sceneManager: SceneManager;
  
  // Track pointer-down to detect a real click (not a drag)
  private pointerDownPos = { x: 0, y: 0 };
  private isDragging = false;

  constructor(canvas: HTMLCanvasElement, camera: Camera, sceneManager: SceneManager) {
    this.canvas = canvas;
    this.camera = camera;
    this.sceneManager = sceneManager;

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
    this.isDragging = false;
  };

  private onPointerMove = (e: PointerEvent): void => {
    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > 4) {
      this.isDragging = true;
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    // Only fire selection on clean left-click (no drag)
    if (e.button !== 0 || this.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const hit = this.sceneManager.raycastFromScreen(this.mouse, this.camera);
    if (hit) {
      this.sceneManager.select(hit.id);
    } else {
      this.sceneManager.deselectAll();
    }
  };
  
  updateCamera(camera: Camera) {
    this.camera = camera;
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
  }
}
