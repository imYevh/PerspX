import type { WebGPURenderer } from "three/webgpu";
import { Scene, type Camera, Vector2 } from "three";
import { PostProcessing } from "three/webgpu";
import { pass, uv, sub, mul, add, dot, Fn, uniform, div, vec4, vec2, float, max, abs, smoothstep, clamp, mix, lessThan, and, or, select, texture, exp, cos, sin, length } from "three/tsl";
import { buildShaderNode, type ShaderNodeUniforms } from "$lib/materials/shaders";
import type { ShaderType } from "$lib/stores/shader.svelte";

export type UpdateCallback = (deltaTime: number, elapsedTime: number) => void;

export class RenderLoop {
  private animationId: number | null = null;
  private lastTime = 0;
  private elapsed = 0;
  private updateCallbacks: UpdateCallback[] = [];

  private postProcessing: PostProcessing;
  private scenePass: any;
  private overlayPass: any;
  private viewportPass: any;
  private combinedEffectNode: any;
  
  private fisheyeIntensityUniform = uniform(0.0);
  public fisheyeEnabled = false;

  private swirlAmountUniform = uniform(0.0);
  private swirlRadiusUniform = uniform(0.5);
  public swirlEnabled = false;

  private caIntensityUniform = uniform(0.0);
  public caEnabled = false;

  private tiltShiftPositionUniform = uniform(0.5);
  private tiltShiftWidthUniform = uniform(0.2);
  private tiltShiftIntensityUniform = uniform(0.5);
  public tiltShiftEnabled = false;

  // ── Shader / Procedural Texture ──────────────────────────────────────────
  private shaderUniforms: ShaderNodeUniforms = {
    scale:     uniform(200.0),
    angle:     uniform(45.0),
    intensity: uniform(0.9),
    threshold: uniform(0.5),
    softness:  uniform(0.15),
    steps:     uniform(5.0),
    time:      uniform(0.0),
    resolution: uniform(new Vector2(typeof window !== 'undefined' ? window.innerWidth : 800, typeof window !== 'undefined' ? window.innerHeight : 600)),
    thickness: uniform(2.0),
    roughness: uniform(5.0),
    density:   uniform(1.0),
    bleed:     uniform(4.0),
    paper:     uniform(0.3),
    position:  uniform(80.0),
    length:    uniform(20.0),
    size:      uniform(8.0),
    hue1:      uniform(220.0),
    hue2:      uniform(40.0),
  };
  private activeShaderType: ShaderType = 'none';

  public compactMode = false;

  public overlayScene = new Scene();

  /** Viewport helpers (grid, guidelines, vanishing point) — composited after shader, before gizmos. */
  public viewportScene = new Scene();

  constructor(
    private renderer: WebGPURenderer,
    private scene: Scene,
    private camera: Camera,
  ) {
    this.postProcessing = new PostProcessing(this.renderer);
    this.scenePass = pass(this.scene, this.camera, { depthBuffer: true });
    this.overlayPass = pass(this.overlayScene, this.camera, { depthBuffer: true });
    this.viewportPass = pass(this.viewportScene, this.camera, { depthBuffer: true });

    const postProcessFn = this.buildCameraEffectsNode();

    this.combinedEffectNode = postProcessFn;
    this.postProcessing.outputNode = this.combinedEffectNode;
  }

  private getFisheyeUVNode(baseUV: any): any {
    const p = sub(mul(baseUV, 2.0), 1.0); // p = uv * 2 - 1
    const r2 = dot(p, p);
    
    const k = mul(this.fisheyeIntensityUniform, 0.009);
    const maxScale = add(1.0, mul(k, 2.0));
    const scale = div(add(1.0, mul(k, r2)), maxScale);
    const newP = mul(p, scale);
    
    return add(mul(newP, 0.5), 0.5);
  }

  private getSwirlUVNode(baseUV: any): any {
    const center = vec2(0.5, 0.5);
    const p = sub(baseUV, center);
    
    const r = length(p);
    const decay = div(r, this.swirlRadiusUniform);
    const rot = mul(this.swirlAmountUniform, exp(sub(0.0, mul(decay, decay))));
    
    const cosT = cos(rot);
    const sinT = sin(rot);
    
    const x = sub(mul(p.x, cosT), mul(p.y, sinT));
    const y = add(mul(p.x, sinT), mul(p.y, cosT));
    
    return add(vec2(x, y), center);
  }

  // ── Shader API ────────────────────────────────────────────────────────────

  setShader(type: ShaderType, params: Record<string, number>): void {
    this.activeShaderType = type;

    if (type === 'none') {
      // Force effect node rebuild on next renderOnce
      this.postProcessing.needsUpdate = true;
      return;
    }

    // Update shared uniforms from the params dict
    if (params.scale     !== undefined) this.shaderUniforms.scale.value     = params.scale;
    if (params.angle     !== undefined) this.shaderUniforms.angle.value     = params.angle;
    if (params.intensity !== undefined) this.shaderUniforms.intensity.value = params.intensity;
    if (params.threshold !== undefined) this.shaderUniforms.threshold.value = params.threshold;
    if (params.softness  !== undefined) this.shaderUniforms.softness.value  = params.softness;
    if (params.steps     !== undefined) this.shaderUniforms.steps.value     = params.steps;
    if (params.thickness !== undefined) this.shaderUniforms.thickness.value = params.thickness;
    if (params.roughness !== undefined) this.shaderUniforms.roughness.value = params.roughness;
    if (params.density   !== undefined) this.shaderUniforms.density.value   = params.density;
    if (params.bleed     !== undefined) this.shaderUniforms.bleed.value     = params.bleed;
    if (params.paper     !== undefined) this.shaderUniforms.paper.value     = params.paper;
    if (params.position  !== undefined) this.shaderUniforms.position.value  = params.position;
    if (params.length    !== undefined) this.shaderUniforms.length.value    = params.length;
    if (params.size      !== undefined) this.shaderUniforms.size.value      = params.size;
    if (params.hue1      !== undefined) this.shaderUniforms.hue1.value      = params.hue1;
    if (params.hue2      !== undefined) this.shaderUniforms.hue2.value      = params.hue2;

    // Rebuild the final composite effect node
    this.combinedEffectNode = this.buildCameraEffectsNode();
    this.postProcessing.outputNode = this.combinedEffectNode;
    this.postProcessing.needsUpdate = true;
  }

  updateShaderParams(params: Record<string, number>): void {
    if (this.activeShaderType === 'none') return;
    if (params.scale     !== undefined) this.shaderUniforms.scale.value     = params.scale;
    if (params.angle     !== undefined) this.shaderUniforms.angle.value     = params.angle;
    if (params.intensity !== undefined) this.shaderUniforms.intensity.value = params.intensity;
    if (params.threshold !== undefined) this.shaderUniforms.threshold.value = params.threshold;
    if (params.softness  !== undefined) this.shaderUniforms.softness.value  = params.softness;
    if (params.steps     !== undefined) this.shaderUniforms.steps.value     = params.steps;
    if (params.thickness !== undefined) this.shaderUniforms.thickness.value = params.thickness;
    if (params.roughness !== undefined) this.shaderUniforms.roughness.value = params.roughness;
    if (params.density   !== undefined) this.shaderUniforms.density.value   = params.density;
    if (params.bleed     !== undefined) this.shaderUniforms.bleed.value     = params.bleed;
    if (params.paper     !== undefined) this.shaderUniforms.paper.value     = params.paper;
    if (params.position  !== undefined) this.shaderUniforms.position.value  = params.position;
    if (params.length    !== undefined) this.shaderUniforms.length.value    = params.length;
    if (params.size      !== undefined) this.shaderUniforms.size.value      = params.size;
    if (params.hue1      !== undefined) this.shaderUniforms.hue1.value      = params.hue1;
    if (params.hue2      !== undefined) this.shaderUniforms.hue2.value      = params.hue2;
    // No needsUpdate needed — uniforms update live
  }

  setFisheye(enabled: boolean, intensity: number): void {
    this.fisheyeEnabled = enabled;
    this.fisheyeIntensityUniform.value = enabled ? intensity : 0.0; 
  }

  setSwirl(enabled: boolean, amount: number, radius: number): void {
    this.swirlEnabled = enabled;
    this.swirlAmountUniform.value = enabled ? amount : 0.0;
    this.swirlRadiusUniform.value = radius;
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

    // Advance time uniform for animated shaders (noise grain)
    this.shaderUniforms.time.value = this.elapsed;

    for (const cb of this.updateCallbacks) {
      cb(delta, this.elapsed);
    }

    this.renderOnce();
  };

  public renderOnce(): void {

    const hasFisheye = this.fisheyeEnabled && this.fisheyeIntensityUniform.value !== 0;
    const hasSwirl = this.swirlEnabled && this.swirlAmountUniform.value !== 0;
    const hasCA = this.caEnabled && this.caIntensityUniform.value !== 0;
    const hasTiltShift = this.tiltShiftEnabled && this.tiltShiftIntensityUniform.value !== 0;
    const hasShader = this.activeShaderType !== 'none';

    if (hasFisheye || hasSwirl || hasCA || hasTiltShift || hasShader) {
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
      this.renderer.render(this.viewportScene, this.camera);
      this.renderer.render(this.overlayScene, this.camera);
      this.renderer.autoClear = oldAutoClear;
    }
  }

  private buildCameraEffectsNode(): any {
    return Fn(() => {
      const sceneTexNode = this.scenePass.getTextureNode();

      // Raw scene sample — used for CA splits and blur taps.
      // The procedural shader is intentionally NOT applied here; it runs once
      // at the end on the final blended color to avoid re-evaluating expensive
      // shaders (e.g. watercolor) for every blur tap.
      const getRawAt = (targetUV: any) => sceneTexNode.sample(targetUV);

      // 0. Swirl UV warp
      const swirledUV = this.getSwirlUVNode(uv());

      // 1. Fisheye UV warp
      const fisheyeUV = this.getFisheyeUVNode(swirledUV);

      // 2. Chromatic Aberration — splits on raw samples only
      const caOffset = mul(sub(fisheyeUV, 0.5), this.caIntensityUniform, 0.05);
      const cR = getRawAt(add(fisheyeUV, caOffset)).r;
      const cG = getRawAt(fisheyeUV).g;
      const cB = getRawAt(sub(fisheyeUV, caOffset)).b;
      const cA = getRawAt(fisheyeUV).a;
      const caColor = vec4(cR, cG, cB, cA);

      // 3. Tilt-shift blur amount
      const yDist = abs(sub(fisheyeUV.y, this.tiltShiftPositionUniform));
      const w2 = mul(this.tiltShiftWidthUniform, 0.5);
      const tBlur = mul(smoothstep(w2, this.tiltShiftWidthUniform, yDist), this.tiltShiftIntensityUniform);
      let blurAmount = clamp(tBlur, 0.0, 1.0);

      // 4. Tilt-shift blur — 16-tap golden spiral on RAW scene samples only.
      //    Running the procedural shader inside each tap would multiply its cost
      //    by 17× (1 base + 16 taps), which was causing the GPU spike.
      const blurRadius = mul(blurAmount, 0.02);

      let bColor = getRawAt(fisheyeUV);
      const samplesCount = 16;
      let bSamples = 1.0;

      for (let i = 0; i < samplesCount; i++) {
        const angle = i * 2.39996; // Golden angle
        const radius = Math.sqrt(i + 0.5) / Math.sqrt(samplesCount);
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        bColor = add(bColor, getRawAt(add(fisheyeUV, mul(vec2(x, y), blurRadius))));
        bSamples += 1.0;
      }

      bColor = mul(bColor, div(1.0, bSamples));

      // Blended raw scene color (CA + tilt-shift)
      const blendedRaw = mix(caColor, bColor, blurAmount);

      // 5. Apply procedural shader ONCE to the blended scene color.
      //    Only affects pixels where the main scene has content (alpha > 0),
      //    leaving the background untouched.
      let mainOutputColor = blendedRaw;
      if (this.activeShaderType !== 'none') {
        // The shader samples sceneTexNode internally; we pass fisheyeUV so it
        // aligns with the warped coordinate space.
        const shaderColor = buildShaderNode(this.activeShaderType, sceneTexNode, this.shaderUniforms, fisheyeUV);
        mainOutputColor = mix(blendedRaw, shaderColor, blendedRaw.a);
      }

      const mainDepth = texture(this.scenePass.renderTarget.depthTexture).sample(fisheyeUV).r;

      // 5. Composite viewport helpers (grid, guidelines, vanishing point) over the
      //    shader-processed main scene.  Viewport elements are occluded by opaque
      //    objects via depth test AND by transparent/semi-transparent objects via
      //    the main scene alpha — so the grid never bleeds through a transparent cube.
      const viewportTexNode = this.viewportPass.getTextureNode();
      const viewportColor = viewportTexNode.sample(fisheyeUV);
      const viewportDepth = texture(this.viewportPass.renderTarget.depthTexture).sample(fisheyeUV).r;

      const isViewportCloser = lessThan(viewportDepth, mainDepth);
      
      // Proper alpha blending:
      // gridOverMain = grid + main * (1 - grid.a)
      const gridOverMain = add(viewportColor, mul(mainOutputColor, sub(1.0, viewportColor.a)));
      // mainOverGrid = main + grid * (1 - main.a)
      const mainOverGrid = add(mainOutputColor, mul(viewportColor, sub(1.0, mainOutputColor.a)));

      // If grid is closer, draw it on top. Otherwise draw main scene on top.
      // This ensures the grid is visible through transparent objects!
      const afterViewport = select(isViewportCloser, gridOverMain, mainOverGrid);

      // 6. Composite gizmo overlay (transform controls, light helpers) — always on top.
      const overlayTexNode = this.overlayPass.getTextureNode();
      const overlayColor = overlayTexNode.sample(fisheyeUV);
      const overlayDepth = texture(this.overlayPass.renderTarget.depthTexture).sample(fisheyeUV).r;

      const isOverlayCloserOrNoDepth = or(lessThan(overlayDepth, mainDepth), lessThan(0.99999, overlayDepth));
      
      // Blend overlay on top of everything
      const overlayOverAll = add(overlayColor, mul(afterViewport, sub(1.0, overlayColor.a)));

      return select(isOverlayCloserOrNoDepth, overlayOverAll, afterViewport);
    })();
  }

  setCamera(camera: Camera): void {
    this.camera = camera;
    if (this.scenePass) {
      this.scenePass.camera = camera;
    }
    if (this.overlayPass) {
      this.overlayPass.camera = camera;
    }
    if (this.viewportPass) {
      this.viewportPass.camera = camera;
    }
  }

  setCompactMode(enabled: boolean): void {
    this.compactMode = enabled;
  }

  handleResize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    if ('aspect' in this.camera) {
      (this.camera as any).aspect = width / height;
    }
    if ('updateProjectionMatrix' in this.camera) {
      (this.camera as any).updateProjectionMatrix();
    }

    this.shaderUniforms.resolution.value.set(width, height);
  }
}
