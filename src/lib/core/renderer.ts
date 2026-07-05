import { WebGPURenderer } from "three/webgpu";
import { Scene, Color, type ColorRepresentation } from "three";

export interface RendererOptions {
  canvas: HTMLCanvasElement;
  antialias?: boolean;
  backgroundColor?: ColorRepresentation;
}

export class Renderer {
  public readonly instance: WebGPURenderer;
  public readonly scene: Scene;
  public readonly helperScene: Scene;

  constructor(options: RendererOptions) {
    this.instance = new WebGPURenderer({
      canvas: options.canvas,
      antialias: options.antialias ?? true,
    });

    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for perf
    this.instance.setClearColor(new Color(options.backgroundColor ?? 0x1a1a2e));
    this.instance.shadowMap.enabled = true;

    this.scene = new Scene();
    this.helperScene = new Scene();

    this.handleResize();
    window.addEventListener("resize", () => this.handleResize());
  }

  handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.instance.setSize(width, height);
  }

  async init(): Promise<void> {
    await this.instance.init(); // WebGPU requires async init
  }

  getAspect(): number {
    return window.innerWidth / window.innerHeight;
  }

  dispose(): void {
    window.removeEventListener("resize", () => this.handleResize());
    this.instance.dispose();
  }
}
