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
  private resizeObserver: ResizeObserver;
  public width = window.innerWidth;
  public height = window.innerHeight;

  constructor(options: RendererOptions) {
    this.instance = new WebGPURenderer({
      canvas: options.canvas,
      antialias: options.antialias ?? true,
      alpha: true,
    });

    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for perf
    if (options.backgroundColor !== undefined) {
      this.instance.setClearColor(new Color(options.backgroundColor), 1);
    } else {
      this.instance.setClearColor(new Color(0x000000), 0); // Transparent by default
    }
    this.instance.shadowMap.enabled = true;

    this.scene = new Scene();

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentBoxSize) {
          this.handleResize(entry.contentRect.width, entry.contentRect.height);
        }
      }
    });

    if (options.canvas.parentElement) {
      this.resizeObserver.observe(options.canvas.parentElement);
      // getBoundingClientRect() is 0 before first browser layout pass,
      // so defer the initial size read to the next animation frame.
      requestAnimationFrame(() => {
        const parent = options.canvas.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          this.handleResize(rect.width, rect.height);
        } else {
          // Fallback: use window dimensions minus toolbar height heuristic
          this.handleResize(window.innerWidth, window.innerHeight);
        }
      });
    } else {
      this.handleResize(window.innerWidth, window.innerHeight);
    }
  }

  handleResize(width: number, height: number): void {
    if (width === 0 || height === 0) return;
    this.width = width;
    this.height = height;
    this.instance.setSize(width, height, false);
    // Let CSS handle the canvas dimensions, just update the internal resolution
    this.instance.domElement.style.width = '100%';
    this.instance.domElement.style.height = '100%';
    
    // Dispatch a custom event to notify camera controllers
    window.dispatchEvent(new CustomEvent('renderer-resize'));
  }

  setCompactMode(enabled: boolean): void {
    const maxPixelRatio = enabled ? 1.5 : 2;
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    if (enabled) {
      // Lower shadow map quality/features for compact mode could go here if needed,
      // but is largely handled by the light preset.
    }
  }

  async init(): Promise<void> {
    await this.instance.init(); // WebGPU requires async init
  }

  getAspect(): number {
    return this.width / this.height;
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.instance.dispose();
  }
}
