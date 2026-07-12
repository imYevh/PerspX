import type { WebGPURenderer } from "three/webgpu";
import { Scene, type Camera, Vector2 } from "three";
import { PostProcessing } from "three/webgpu";
import { pass, uv, sub, mul, add, dot, Fn, uniform, div, vec4, vec2, float, max, abs, smoothstep, clamp, mix, lessThan, and, select, texture } from "three/tsl";
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
  private combinedEffectNode: any;
  
  private fisheyeIntensityUniform = uniform(0.0);
  public fisheyeEnabled = false;

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
  };
  private activeShaderType: ShaderType = 'none';

  public compactMode = false;

  public overlayScene = new Scene();

  constructor(
    private renderer: WebGPURenderer,
    private scene: Scene,
    private camera: Camera,
  ) {
    this.postProcessing = new PostProcessing(this.renderer);
    this.scenePass = pass(this.scene, this.camera, { depthBuffer: true });
    this.overlayPass = pass(this.overlayScene, this.camera, { depthBuffer: true });

    const postProcessFn = this.buildCameraEffectsNode();

    this.combinedEffectNode = postProcessFn;
    this.postProcessing.outputNode = this.combinedEffectNode;
  }

  private getFisheyeUVNode(): any {
    const p = sub(mul(uv(), 2.0), 1.0); // p = uv * 2 - 1
    const r2 = dot(p, p);
    
    const k = mul(this.fisheyeIntensityUniform, 0.009);
    const maxScale = add(1.0, mul(k, 2.0));
    const scale = div(add(1.0, mul(k, r2)), maxScale);
    const newP = mul(p, scale);
    
    return add(mul(newP, 0.5), 0.5);
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
    // No needsUpdate needed — uniforms update live
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

    // Advance time uniform for animated shaders (noise grain)
    this.shaderUniforms.time.value = this.elapsed;

    for (const cb of this.updateCallbacks) {
      cb(delta, this.elapsed);
    }

    this.renderOnce();
  };

  public renderOnce(): void {

    const hasFisheye = this.fisheyeEnabled && this.fisheyeIntensityUniform.value !== 0;
    const hasCA = this.caEnabled && this.caIntensityUniform.value !== 0;
    const hasTiltShift = this.tiltShiftEnabled && this.tiltShiftIntensityUniform.value !== 0;
    const hasShader = this.activeShaderType !== 'none';

    if (hasFisheye || hasCA || hasTiltShift || hasShader) {
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

  private buildCameraEffectsNode(): any {
    return Fn(() => {
      const sceneTexNode = this.scenePass.getTextureNode();

      // Helper to evaluate either the shader or just sample the scene at a given UV
      const getColorAt = (targetUV: any) => {
        const sceneColor = sceneTexNode.sample(targetUV);
        if (this.activeShaderType !== 'none') {
          const shaderColor = buildShaderNode(this.activeShaderType, sceneTexNode, this.shaderUniforms, targetUV);
          // Only apply the shader where the scene has alpha (objects), leaving background intact
          return mix(sceneColor, shaderColor, sceneColor.a);
        }
        return sceneColor;
      };

      // 1. Fisheye UV warp
      const fisheyeUV = this.getFisheyeUVNode();

      // 2. Chromatic Aberration
      const caOffset = mul(sub(fisheyeUV, 0.5), this.caIntensityUniform, 0.05);
      const cR = getColorAt(add(fisheyeUV, caOffset)).r;
      const cG = getColorAt(fisheyeUV).g;
      const cB = getColorAt(sub(fisheyeUV, caOffset)).b;
      const cA = getColorAt(fisheyeUV).a;
      const caColor = vec4(cR, cG, cB, cA);

      // 3. Tilt-shift blur amount
      const yDist = abs(sub(fisheyeUV.y, this.tiltShiftPositionUniform));
      const w2 = mul(this.tiltShiftWidthUniform, 0.5);
      const tBlur = mul(smoothstep(w2, this.tiltShiftWidthUniform, yDist), this.tiltShiftIntensityUniform);
      let blurAmount = clamp(tBlur, 0.0, 1.0);

      // 4. Compute Blur
      const blurRadius = mul(blurAmount, 0.02);
      
      let bColor = getColorAt(fisheyeUV);
      bColor = add(bColor, getColorAt(add(fisheyeUV, mul(vec2(-1.0, -1.0), blurRadius))));
      bColor = add(bColor, getColorAt(add(fisheyeUV, mul(vec2(0.0, -1.0), blurRadius))));
      bColor = add(bColor, getColorAt(add(fisheyeUV, mul(vec2(1.0, -1.0), blurRadius))));
      bColor = add(bColor, getColorAt(add(fisheyeUV, mul(vec2(-1.0, 0.0), blurRadius))));
      bColor = add(bColor, getColorAt(add(fisheyeUV, mul(vec2(1.0, 0.0), blurRadius))));
      bColor = add(bColor, getColorAt(add(fisheyeUV, mul(vec2(-1.0, 1.0), blurRadius))));
      bColor = add(bColor, getColorAt(add(fisheyeUV, mul(vec2(0.0, 1.0), blurRadius))));
      bColor = add(bColor, getColorAt(add(fisheyeUV, mul(vec2(1.0, 1.0), blurRadius))));
      bColor = mul(bColor, div(1.0, 9.0));

      const mainOutputColor = mix(caColor, bColor, blurAmount);

      // 5. Combine main color and overlay color using depth testing
      const overlayTexNode = this.overlayPass.getTextureNode();
      const overlayColor = overlayTexNode.sample(fisheyeUV);
      
      const mainDepth = texture(this.scenePass.renderTarget.depthTexture).sample(fisheyeUV).r;
      const overlayDepth = texture(this.overlayPass.renderTarget.depthTexture).sample(fisheyeUV).r;

      const isOverlayCloser = lessThan(overlayDepth, mainDepth);
      const isOverlayVisible = lessThan(0.0, overlayColor.a);
      const showOverlay = and(isOverlayCloser, isOverlayVisible);

      return select(showOverlay, overlayColor, mainOutputColor);
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
