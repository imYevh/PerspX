import { Raycaster, Vector2, type Camera } from 'three';
import type { SceneManager } from './scene';

export class InputSystem {
  private raycaster = new Raycaster();
  private mouse = new Vector2();
  private canvas: HTMLCanvasElement;
  private camera: Camera;
  private sceneManager: SceneManager;

  constructor(canvas: HTMLCanvasElement, camera: Camera, sceneManager: SceneManager) {
    this.canvas = canvas;
    this.camera = camera;
    this.sceneManager = sceneManager;

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
  }

  private onPointerDown = (e: PointerEvent): void => {
    // Only select on left click
    if (e.button !== 0) return;

    // Convert mouse position to normalized device coordinates (-1 to +1)
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Intersect against all primitive objects
    const objects = this.sceneManager.getObjectsByType('primitive');
    const intersects = this.raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
      // Find the root object that has the userData.id
      let selectedObj = intersects[0].object;
      while (selectedObj && !selectedObj.userData?.id) {
        if (selectedObj.parent) {
          selectedObj = selectedObj.parent;
        } else {
          break;
        }
      }

      if (selectedObj && selectedObj.userData?.id) {
        this.sceneManager.select(selectedObj.userData.id);
      }
    } else {
      this.sceneManager.deselectAll();
    }
  };
  
  updateCamera(camera: Camera) {
    this.camera = camera;
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
  }
}
