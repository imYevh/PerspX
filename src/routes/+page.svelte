<script lang="ts">
  import { Renderer } from '$lib/core/renderer';
  import { SceneManager } from '$lib/core/scene';
  import { RenderLoop } from '$lib/core/loop';
  import { bindSceneManager } from '$lib/stores/scene';
  import { CameraController } from '$lib/camera/camera-controller';
  import { ObjectManager } from '$lib/objects/object-manager';
  import { TransformSystem } from '$lib/transforms/transform-controls';
  import { InputSystem } from '$lib/core/input';
  import { createInfiniteGrid } from '$lib/helpers/grid';
  import { createGroundPlane } from '$lib/helpers/ground-plane';
  import { VanishingPointHelper } from '$lib/helpers/vanishing-points';
  import { AmbientLight, DirectionalLight, Vector3 } from 'three';

  let canvas: HTMLCanvasElement;
  let objectManager: ObjectManager | undefined = $state();

  $effect(() => {
    let renderer: Renderer;
    let loop: RenderLoop;
    let sceneManager: SceneManager;
    let cameraController: CameraController;
    let transformSystem: TransformSystem;
    let inputSystem: InputSystem;
    let vanishingHelper: VanishingPointHelper;
    let cleanupResize = () => {};
    let cleanupKeys = () => {};

    async function init() {
      if (!canvas) return;

      renderer = new Renderer({ canvas });
      await renderer.init();

      sceneManager = new SceneManager(renderer.scene);
      bindSceneManager(sceneManager);
      
      objectManager = new ObjectManager(sceneManager);
      
      sceneManager.on('object-added', (data) => {
        console.log(`Added: ${data.meta.name} (${data.id})`);
      });

      // @ts-ignore
      window.sceneManager = sceneManager;
      // @ts-ignore
      window.objectManager = objectManager;

      cameraController = new CameraController({
        canvas,
        aspect: renderer.getAspect(),
        initialPosition: new Vector3(3, 3, 3)
      });

      transformSystem = new TransformSystem(cameraController.camera, canvas, sceneManager, cameraController);
      inputSystem = new InputSystem(canvas, cameraController.camera, sceneManager);

      // Add lights
      const ambientLight = new AmbientLight(0xffffff, 0.5);
      const dirLight = new DirectionalLight(0xffffff, 1);
      dirLight.position.set(5, 5, 5);
      renderer.scene.add(ambientLight);
      renderer.scene.add(dirLight);

      // Add helpers
      const grid = createInfiniteGrid();
      const ground = createGroundPlane();
      vanishingHelper = new VanishingPointHelper();
      renderer.scene.add(grid);
      renderer.scene.add(ground);
      renderer.scene.add(vanishingHelper.group);

      // Keyboard toggles: 1=grid, 2=ground, 3=vanishing
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        switch (e.key) {
          case '1': grid.visible = !grid.visible; break;
          case '2': ground.visible = !ground.visible; break;
          case '3': vanishingHelper.group.visible = !vanishingHelper.group.visible; break;
        }
      };
      window.addEventListener('keydown', onKeyDown);
      cleanupKeys = () => window.removeEventListener('keydown', onKeyDown);

      loop = new RenderLoop(renderer.instance, renderer.scene, cameraController.camera);
      loop.onUpdate((dt) => {
        cameraController.update();
        loop.setCamera(cameraController.camera);
        transformSystem.updateCamera(cameraController.camera);
        inputSystem.updateCamera(cameraController.camera);

        // Update vanishing lines every frame so they follow the object while being dragged
        if (vanishingHelper.group.visible) {
          const selectedIds = sceneManager.getSelectedIds();
          if (selectedIds.length === 1) {
            const obj = sceneManager.getObject(selectedIds[0]);
            if (obj) {
              vanishingHelper.updateForBox(
                obj.position,
                new Vector3(1, 1, 1),
                cameraController.perspCamera
              );
            }
          } else {
            vanishingHelper.clear();
          }
        }
      });
      loop.start();

      const handleResize = () => {
        if (!renderer) return;
        cameraController.handleResize(renderer.getAspect());
      };
      
      window.addEventListener('resize', handleResize);
      cleanupResize = () => window.removeEventListener('resize', handleResize);
    }

    init().catch(console.error);

    return () => {
      cleanupResize();
      cleanupKeys();
      if (loop) loop.stop();
      if (renderer) renderer.dispose();
      if (sceneManager) sceneManager.clearAll();
      if (cameraController) cameraController.dispose();
      if (transformSystem) transformSystem.dispose();
      if (inputSystem) inputSystem.dispose();
      if (vanishingHelper) vanishingHelper.dispose();
    };
  });
</script>

<div class="ui-layer">
  <button 
    onclick={() => objectManager?.addPrimitive('cube')}
    disabled={!objectManager}
  >
    Add Test Cube
  </button>
</div>

<canvas bind:this={canvas} id="viewport"></canvas>

<style>
  .ui-layer {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 10;
  }
  
  .ui-layer button {
    padding: 0.5rem 1rem;
    background: #4a9eff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
  }

  .ui-layer button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  #viewport {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none; /* Critical for mobile — prevents browser gestures */
  }
</style>
