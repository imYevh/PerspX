import type { WebGPURenderer } from "three/webgpu";
import { Scene, type Camera } from "three";
import { PostProcessing } from "three/webgpu";
import { pass, uv, sub, mul, add, dot, Fn, uniform, div, vec4, vec2, float, max, abs, smoothstep, clamp, mix, lessThan, and, select, texture } from "three/tsl";

export type UpdateCallback = (deltaTime: number, elapsedTime: number) => void;

export class RenderLoop {
  private animationId: number | null = null;
  private lastTime = 0;
  private elapsed = 0;
  private updateCallbacks: UpdateCallback[] = [];

  private postProcessing: PostProcessing;
  private scenePass: any;
  private overlayPass: any;
  private combinedEffectNode: any;
  
  private fisheyeIntensityUniform = uniform(0.0);
  public fisheyeEnabled = false;

  private caIntensityUniform = uniform(0.0);
  public caEnabled = false;

  private tiltShiftPositionUniform = uniform(0.5);
  private tiltShiftWidthUniform = uniform(0.2);
  private tiltShiftIntensityUniform = uniform(0.5);
  public tiltShiftEnabled = false;

  public overlayScene = new Scene();

  constructor(
    private renderer: WebGPURenderer,
    private scene: Scene,
    private camera: Camera,
  ) {
    this.postProcessing = new PostProcessing(this.renderer);
    this.scenePass = pass(this.scene, this.camera, { depthBuffer: true });
    this.overlayPass = pass(this.overlayScene, this.camera, { depthBuffer: true });

    const postProcessFn = Fn(() => {
      // 1. Fisheye Math (UV deformation)
      const p = sub(mul(uv(), 2.0), 1.0); // p = uv * 2 - 1
      const r2 = dot(p, p);
      
      const k = mul(this.fisheyeIntensityUniform, 0.009);
      const maxScale = add(1.0, mul(k, 2.0));
      const scale = div(add(1.0, mul(k, r2)), maxScale);
      const newP = mul(p, scale);
      
      const fisheyeUV = add(mul(newP, 0.5), 0.5);

      // 2. Chromatic Aberration Math (Main Scene)
      const caOffset = mul(sub(fisheyeUV, 0.5), this.caIntensityUniform, 0.05);
      const texNode = this.scenePass.getTextureNode();
      const r = texNode.sample(add(fisheyeUV, caOffset)).r;
      const g = texNode.sample(fisheyeUV).g;
      const b = texNode.sample(sub(fisheyeUV, caOffset)).b;
      const caColor = vec4(r, g, b, 1.0);

      // 3. Overlay Scene Math (Fisheye only, NO Chromatic Aberration)
      const overlayTexNode = this.overlayPass.getTextureNode();
      const overlayColor = overlayTexNode.sample(fisheyeUV);

      // 4. Blur Amount Calculation
      let blurAmount: ReturnType<typeof float> = float(0.0);

      // Tilt-Shift blur amount
      const yDist = abs(sub(fisheyeUV.y, this.tiltShiftPositionUniform));
      const w2 = mul(this.tiltShiftWidthUniform, 0.5);
      const tBlur = mul(smoothstep(w2, this.tiltShiftWidthUniform, yDist), this.tiltShiftIntensityUniform);
      
      blurAmount = max(blurAmount, tBlur);
      blurAmount = clamp(blurAmount, 0.0, 1.0);

      // 5. Compute Blur
      // 9-tap box blur
      const blurRadius = mul(blurAmount, 0.02); // 2% of screen at max blur
      
      let bColor = texNode.sample(fisheyeUV);
      bColor = add(bColor, texNode.sample(add(fisheyeUV, mul(vec2(-1.0, -1.0), blurRadius))));
      bColor = add(bColor, texNode.sample(add(fisheyeUV, mul(vec2(0.0, -1.0), blurRadius))));
      bColor = add(bColor, texNode.sample(add(fisheyeUV, mul(vec2(1.0, -1.0), blurRadius))));
      bColor = add(bColor, texNode.sample(add(fisheyeUV, mul(vec2(-1.0, 0.0), blurRadius))));
      bColor = add(bColor, texNode.sample(add(fisheyeUV, mul(vec2(1.0, 0.0), blurRadius))));
      bColor = add(bColor, texNode.sample(add(fisheyeUV, mul(vec2(-1.0, 1.0), blurRadius))));
      bColor = add(bColor, texNode.sample(add(fisheyeUV, mul(vec2(0.0, 1.0), blurRadius))));
      bColor = add(bColor, texNode.sample(add(fisheyeUV, mul(vec2(1.0, 1.0), blurRadius))));
      bColor = mul(bColor, div(1.0, 9.0));

      const mainOutputColor = mix(caColor, bColor, blurAmount);

      // 6. Combine main color and overlay color using depth testing
      const mainDepth = texture(this.scenePass.renderTarget.depthTexture).sample(fisheyeUV).r;
      const overlayDepth = texture(this.overlayPass.renderTarget.depthTexture).sample(fisheyeUV).r;

      const isOverlayCloser = lessThan(overlayDepth, mainDepth);
      const isOverlayVisible = lessThan(0.0, overlayColor.a);
      const showOverlay = and(isOverlayCloser, isOverlayVisible);

      return select(showOverlay, overlayColor, mainOutputColor);
    })();

    this.combinedEffectNode = postProcessFn;
    this.postProcessing.outputNode = this.scenePass;
  }

  setFisheye(enabled: boolean, intensity: number): void {
    this.fisheyeEnabled = enabled;
    this.fisheyeIntensityUniform.value = enabled ? intensity : 0.0; 
  }

  setChromaticAberration(enabled: boolean, intensity: number): void {
    this.caEnabled = enabled;
    this.caIntensityUniform.value = enabled ? intensity : 0.0;
  }

  setTiltShift(enabled: boolean, position: number, width: number, intensity: number): void {
    this.tiltShiftEnabled = enabled;
    this.tiltShiftPositionUniform.value = position;
    this.tiltShiftWidthUniform.value = width;
    this.tiltShiftIntensityUniform.value = enabled ? intensity : 0.0;
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
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.elapsed += delta;

    for (const cb of this.updateCallbacks) {
      cb(delta, this.elapsed);
    }

    this.renderOnce();
  };

  public renderOnce(): void {
    const hasFisheye = this.fisheyeEnabled && this.fisheyeIntensityUniform.value !== 0;
    const hasCA = this.caEnabled && this.caIntensityUniform.value !== 0;
    const hasTiltShift = this.tiltShiftEnabled && this.tiltShiftIntensityUniform.value !== 0;

    if (hasFisheye || hasCA || hasTiltShift) {
      if (this.postProcessing.outputNode !== this.combinedEffectNode) {
        this.postProcessing.outputNode = this.combinedEffectNode;
        this.postProcessing.needsUpdate = true;
      }
      this.postProcessing.render();
    } else {
      if (this.postProcessing.outputNode !== this.scenePass) {
        this.postProcessing.outputNode = this.scenePass;
        this.postProcessing.needsUpdate = true;
      }
      this.renderer.render(this.scene, this.camera);
      
      const oldAutoClear = this.renderer.autoClear;
      this.renderer.autoClear = false;
      this.renderer.render(this.overlayScene, this.camera);
      this.renderer.autoClear = oldAutoClear;
    }
  }

  setCamera(camera: Camera): void {
    this.camera = camera;
    if (this.scenePass) {
      this.scenePass.camera = camera;
    }
    if (this.overlayPass) {
      this.overlayPass.camera = camera;
    }
  }

  handleResize(width: number, height: number): void {
    if (this.postProcessing) {
      this.postProcessing.setSize(width, height);
    }
  }
}
