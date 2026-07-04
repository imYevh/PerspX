<script lang="ts">
  import { Renderer } from '$lib/core/renderer';
  import { SceneManager } from '$lib/core/scene';
  import { RenderLoop } from '$lib/core/loop';


  import { PerspectiveCamera, BoxGeometry, MeshBasicMaterial, Mesh, AmbientLight, DirectionalLight } from 'three';

  let canvas: HTMLCanvasElement;

  $effect(() => {
    let renderer: Renderer;
    let loop: RenderLoop;
    let sceneManager: SceneManager;
    let cleanupResize = () => {};

    async function init() {
      if (!canvas) return;

      renderer = new Renderer({ canvas });
      await renderer.init();

      sceneManager = new SceneManager(renderer.scene);

      const camera = new PerspectiveCamera(50, renderer.getAspect(), 0.1, 1000);
      camera.position.set(3, 3, 3);
      camera.lookAt(0, 0, 0);

      // Add lights
      const ambientLight = new AmbientLight(0xffffff, 0.5);
      const dirLight = new DirectionalLight(0xffffff, 1);
      dirLight.position.set(5, 5, 5);
      renderer.scene.add(ambientLight);
      renderer.scene.add(dirLight);

      // Create a blue cube
      const geometry = new BoxGeometry(1, 1, 1);
      const material = new MeshBasicMaterial({ color: 0x4a9eff });
      const cube = new Mesh(geometry, material);
      
      sceneManager.addObject(cube, 'primitive', 'Cube');

      loop = new RenderLoop(renderer.instance, renderer.scene, camera);
      loop.onUpdate((dt) => {
        cube.rotation.y += dt * 0.5;
        cube.rotation.x += dt * 0.2;
      });
      loop.start();

      const handleResize = () => {
        if (!renderer) return;
        camera.aspect = renderer.getAspect();
        camera.updateProjectionMatrix();
      };
      
      window.addEventListener('resize', handleResize);
      cleanupResize = () => window.removeEventListener('resize', handleResize);
    }

    init().catch(console.error);

    return () => {
      cleanupResize();
      if (loop) loop.stop();
      if (renderer) renderer.dispose();
      if (sceneManager) sceneManager.clearAll();
    };
  });
</script>

<canvas bind:this={canvas} id="viewport"></canvas>

<style>
  #viewport {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none; /* Critical for mobile — prevents browser gestures */
  }
</style>
