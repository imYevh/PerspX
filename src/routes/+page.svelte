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
  import { cameraStore, updateCameraStore } from '$lib/stores/camera';
  import { uiStore } from '$lib/stores/ui';

  // UI Components
  import Toolbar from '$lib/components/Toolbar.svelte';
  import ScenePanel from '$lib/components/panels/ScenePanel.svelte';
  import PropertiesPanel from '$lib/components/panels/PropertiesPanel.svelte';
  import CameraPanel from '$lib/components/panels/CameraPanel.svelte';
  import LibraryPanel from '$lib/components/panels/LibraryPanel.svelte';
  import ViewportOverlay from '$lib/components/ViewportOverlay.svelte';

  let canvas: HTMLCanvasElement;

  // Expose to components
  let objectManager: ObjectManager | undefined = $state();
  let sceneManager: SceneManager | undefined = $state();
  let cameraController: CameraController | undefined = $state();
  let transformSystem: TransformSystem | undefined = $state();

  $effect(() => {
    let renderer: Renderer;
    let loop: RenderLoop;
    let _sceneManager: SceneManager;
    let _cameraController: CameraController;
    let _transformSystem: TransformSystem;
    let inputSystem: InputSystem;
    let vanishingHelper: VanishingPointHelper;
    let cleanupResize = () => {};
    let cleanupKeys = () => {};

    async function init() {
      if (!canvas) return;

      renderer = new Renderer({ canvas });
      await renderer.init();

      _sceneManager = new SceneManager(renderer.scene);
      bindSceneManager(_sceneManager);
      sceneManager = _sceneManager;

      objectManager = new ObjectManager(_sceneManager);

      _sceneManager.on('object-added', (data) => {
        console.log(`Added: ${data.meta.name} (${data.id})`);
      });

      // @ts-ignore
      window.sceneManager = _sceneManager;
      // @ts-ignore
      window.objectManager = objectManager;

      _cameraController = new CameraController({
        canvas,
        aspect: renderer.getAspect(),
        initialPosition: new Vector3(5, 4, 5)
      });
      cameraController = _cameraController;

      _transformSystem = new TransformSystem(_cameraController.camera, canvas, _sceneManager, _cameraController);
      transformSystem = _transformSystem;
      inputSystem = new InputSystem(canvas, _cameraController.camera, _sceneManager);

      // Sync camera changes to store
      _transformSystem.controls.addEventListener('change', () => {
        updateCameraStore(_cameraController.mode, _cameraController.getFOV());
      });

      // Add lights
      const ambientLight = new AmbientLight(0xffffff, 0.5);
      const dirLight = new DirectionalLight(0xffffff, 1);
      dirLight.position.set(5, 8, 5);
      dirLight.castShadow = true;
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

      loop = new RenderLoop(renderer.instance, renderer.scene, _cameraController.camera);
      loop.onUpdate((_dt) => {
        _cameraController.update();
        loop.setCamera(_cameraController.camera);
        _transformSystem.updateCamera(_cameraController.camera);
        inputSystem.updateCamera(_cameraController.camera);

        // Sync FOV to store every frame (handles slider changes)
        const fov = _cameraController.getFOV();
        if (fov !== $cameraStore.fov) {
          updateCameraStore(_cameraController.mode, fov);
        }

        // Live-update vanishing lines for selected object
        if (vanishingHelper.group.visible) {
          const selectedIds = _sceneManager.getSelectedIds();
          if (selectedIds.length === 1) {
            const obj = _sceneManager.getObject(selectedIds[0]);
            if (obj) {
              vanishingHelper.updateForBox(obj.position, new Vector3(1, 1, 1), _cameraController.perspCamera);
            }
          } else {
            vanishingHelper.clear();
          }
        }
      });
      loop.start();

      const handleResize = () => {
        if (!renderer) return;
        cameraController?.handleResize(renderer.getAspect());
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
      if (_sceneManager) _sceneManager.clearAll();
      if (_cameraController) _cameraController.dispose();
      if (_transformSystem) _transformSystem.dispose();
      if (inputSystem) inputSystem.dispose();
      if (vanishingHelper) vanishingHelper.dispose();
    };
  });
</script>

<div class="app">
  <Toolbar {transformSystem} {objectManager} />

  <div class="workspace">
    <!-- Left Panel -->
    <aside class="sidebar left-sidebar">
      <ScenePanel {sceneManager} />
      <div class="panel-gap"></div>
      <LibraryPanel {objectManager} />
    </aside>

    <!-- Viewport -->
    <div class="viewport-wrapper">
      <canvas bind:this={canvas} id="viewport"></canvas>
      <ViewportOverlay />
    </div>

    <!-- Right Panel -->
    <aside class="sidebar right-sidebar">
      <PropertiesPanel {sceneManager} />
      <div class="panel-gap"></div>
      <CameraPanel {cameraController} />
    </aside>
  </div>
</div>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    background: #0f0f1a;
    color: #e0e0e0;
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .workspace {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .sidebar {
    width: 220px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    padding: 8px;
    gap: 0;
    overflow-y: auto;
    background: rgba(12, 12, 22, 0.8);
    border-color: rgba(255, 255, 255, 0.06);
  }

  .left-sidebar {
    border-right: 1px solid rgba(255, 255, 255, 0.06);
  }

  .right-sidebar {
    border-left: 1px solid rgba(255, 255, 255, 0.06);
  }

  .panel-gap {
    height: 6px;
    flex-shrink: 0;
  }

  .viewport-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  #viewport {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
</style>
