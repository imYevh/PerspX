import { WebGPURenderer, PostProcessing } from "three/webgpu";
import { Scene, PerspectiveCamera, BoxGeometry, MeshStandardMaterial, Mesh, DirectionalLight, AmbientLight, Color, Vector2, MathUtils } from "three";
import { pass, uv, Fn, uniform, mix } from "three/tsl";
import { buildShaderNode, type ShaderNodeUniforms } from "./shaders";
import { SHADER_ORDER, type ShaderType } from "../stores/shader.svelte";

export async function generateShaderPreviews(): Promise<Partial<Record<ShaderType, string>>> {
  // Use a regular canvas for toDataURL support
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;

  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  
  await renderer.init();
  renderer.setClearColor(new Color(0x000000), 0); // Transparent background

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(2, 2, 2.5);
  camera.lookAt(0, -0.2, 0);

  // Setup a nice cube
  const geometry = new BoxGeometry(1.2, 1.2, 1.2);
  const material = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 });
  const cube = new Mesh(geometry, material);
  cube.rotation.y = Math.PI / 4;
  cube.rotation.x = Math.PI / 8;
  scene.add(cube);

  // Lighting
  const ambientLight = new AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  const dirLight2 = new DirectionalLight(0xffffff, 0.8);
  dirLight2.position.set(-5, 5, -5);
  scene.add(dirLight2);

  const previews: Partial<Record<ShaderType, string>> = {};

  // Base shader uniforms
  const shaderUniforms: ShaderNodeUniforms = {
    scale: uniform(100.0), // Reduced scale for smaller preview
    angle: uniform(45.0),
    intensity: uniform(1.0),
    threshold: uniform(0.5),
    softness: uniform(0.15),
    steps: uniform(5.0),
    time: uniform(0.0),
    resolution: uniform(new Vector2(64, 64)),
    thickness: uniform(2.0),
    roughness: uniform(5.0),
    density: uniform(1.0),
    bleed: uniform(4.0),
    paper: uniform(0.3),
    position: uniform(80.0),
    length: uniform(20.0),
    size: uniform(4.0), // Pixelate block size smaller for preview
    hue1: uniform(220.0),
    hue2: uniform(40.0),
  };

  const postProcessing = new PostProcessing(renderer);
  const scenePass = pass(scene, camera, { depthBuffer: true });

  // Generate for each shader
  for (const type of SHADER_ORDER) {
    if (type === 'none') continue;
    
    // Some shaders need specific scale overrides to look good at 64x64
    let originalScale = shaderUniforms.scale.value;
    if (type === 'halftone' || type === 'checkerboard' || type === 'dither' || type === 'manga' || type === 'crosshatch') {
        shaderUniforms.scale.value = 30.0;
    }
    if (type === 'stipple' || type === 'noise') {
        shaderUniforms.scale.value = 100.0;
    }

    const effectNode = Fn(() => {
        const sceneTexNode = scenePass.getTextureNode();
        const baseColor = sceneTexNode.sample(uv());
        const shaderColor = buildShaderNode(type, sceneTexNode, shaderUniforms, uv());
        // only apply shader where the cube is
        return mix(baseColor, shaderColor, baseColor.a);
    })();
    
    postProcessing.outputNode = effectNode;
    postProcessing.needsUpdate = true;
    
    if ('renderAsync' in postProcessing) {
        await (postProcessing as any).renderAsync();
    } else {
        postProcessing.render();
    }

    // Wait a microtask to ensure pixels are flushed
    await new Promise(r => setTimeout(r, 0));

    previews[type] = canvas.toDataURL('image/png');
    
    // Restore
    shaderUniforms.scale.value = originalScale;
  }

  // Also add 'none' as just the cube
  const effectNodeNone = Fn(() => {
      const sceneTexNode = scenePass.getTextureNode();
      return sceneTexNode.sample(uv());
  })();
  postProcessing.outputNode = effectNodeNone;
  postProcessing.needsUpdate = true;
  if ('renderAsync' in postProcessing) {
      await (postProcessing as any).renderAsync();
  } else {
      postProcessing.render();
  }
  await new Promise(r => setTimeout(r, 0));
  previews['none'] = canvas.toDataURL('image/png');

  renderer.dispose();
  geometry.dispose();
  material.dispose();
  
  return previews;
}
