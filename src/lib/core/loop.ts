import type { WebGPURenderer } from "three/webgpu";
import type { Scene, Camera } from "three";

export type UpdateCallback = (deltaTime: number, elapsedTime: number) => void;

export class RenderLoop {
  private animationId: number | null = null;
  private lastTime = 0;
  private elapsed = 0;
  private updateCallbacks: UpdateCallback[] = [];

  constructor(
    private renderer: WebGPURenderer,
    private scene: Scene,
    private camera: Camera,
  ) {}

  onUpdate(callback: UpdateCallback): void {
    this.updateCallbacks.push(callback);
  }

  start(): void {
    this.lastTime = performance.now();
    this.tick();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private tick = (): void => {
    this.animationId = requestAnimationFrame(this.tick);

    const now = performance.now();
    const delta = (now - this.lastTime) / 1000; // seconds
    this.lastTime = now;
    this.elapsed += delta;

    // Run all update callbacks
    for (const cb of this.updateCallbacks) {
      cb(delta, this.elapsed);
    }

    // Render
    this.renderer.render(this.scene, this.camera);
  };

  setCamera(camera: Camera): void {
    this.camera = camera;
  }
}
