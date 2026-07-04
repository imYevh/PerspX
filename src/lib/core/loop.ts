import type { WebGPURenderer } from "three/webgpu";
import type { Scene, Camera } from "three";
import { PostProcessing } from "three/webgpu";
import { pass, uv, sub, mul, add, dot, Fn, uniform } from "three/tsl";

export type UpdateCallback = (deltaTime: number, elapsedTime: number) => void;

export class RenderLoop {
  private animationId: number | null = null;
  private lastTime = 0;
  private elapsed = 0;
  private updateCallbacks: UpdateCallback[] = [];

  private postProcessing: PostProcessing;
  private scenePass: any;
  private fisheyeNode: any;
  private fisheyeIntensityUniform = uniform(0.5);
  public fisheyeEnabled = false;

  constructor(
    private renderer: WebGPURenderer,
    private scene: Scene,
    private camera: Camera,
  ) {
    this.postProcessing = new PostProcessing(this.renderer);
    this.scenePass = pass(this.scene, this.camera);

    const fisheyeUV = Fn(() => {
      const p = sub(mul(uv(), 2.0), 1.0); // p = uv * 2 - 1
      const r2 = dot(p, p);
      const distortion = add(1.0, mul(this.fisheyeIntensityUniform, r2)); // barrel distortion
      const newP = mul(p, distortion);
      return add(mul(newP, 0.5), 0.5);
    })();

    this.fisheyeNode = this.scenePass.getTextureNode().sample(fisheyeUV);
    this.postProcessing.outputNode = this.scenePass;
  }

  setFisheye(enabled: boolean, intensity: number): void {
    this.fisheyeEnabled = enabled;
    // Map UI slider [0, 1] to a reasonable distortion range, e.g., [0, 2]
    this.fisheyeIntensityUniform.value = intensity * 1.5; 
  }

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
    if (this.fisheyeEnabled && this.fisheyeIntensityUniform.value > 0) {
      if (this.postProcessing.outputNode !== this.fisheyeNode) {
        this.postProcessing.outputNode = this.fisheyeNode;
        this.postProcessing.needsUpdate = true;
      }
      this.postProcessing.render();
    } else {
      if (this.postProcessing.outputNode !== this.scenePass) {
        this.postProcessing.outputNode = this.scenePass;
        this.postProcessing.needsUpdate = true;
      }
      // Can also just call this.renderer.render, but postProcessing allows future effects
      this.renderer.render(this.scene, this.camera);
    }
  };

  setCamera(camera: Camera): void {
    this.camera = camera;
    if (this.scenePass) {
      this.scenePass.camera = camera;
    }
  }
}
