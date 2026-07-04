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
  import { LightManager } from '$lib/lighting/light-manager';
  import { Vector3, Vector2, Raycaster, Plane, Object3D, MeshStandardMaterial, Mesh, SphereGeometry } from 'three';
  import { cameraStore, updateCameraStore } from '$lib/stores/camera';
  import { uiStore } from '$lib/stores/ui';
  import { initHistory, commitHistory, undo, redo } from '$lib/stores/history';
  import { createPrimitive } from '$lib/objects/primitives';

  // UI Components
  import Toolbar from '$lib/components/Toolbar.svelte';
  import ScenePanel from '$lib/components/panels/ScenePanel.svelte';
  import PropertiesPanel from '$lib/components/panels/PropertiesPanel.svelte';
  import CameraPanel from '$lib/components/panels/CameraPanel.svelte';
  import LibraryPanel from '$lib/components/panels/LibraryPanel.svelte';
  import ViewportOverlay from '$lib/components/ViewportOverlay.svelte';
  import BottomSheet from '$lib/components/BottomSheet.svelte';
  import SubToolbar from '$lib/components/SubToolbar.svelte';
  import { getBreakpoint } from '$lib/stores/ui';

  let canvas: HTMLCanvasElement;
  let renderer = $state<Renderer | undefined>();
  let sceneManager = $state<SceneManager | undefined>();
  let cameraController = $state<CameraController | undefined>();
  let transformSystem = $state<TransformSystem | undefined>();
  let objectManager = $state<ObjectManager | undefined>();
  let lightManager = $state<LightManager | undefined>();
  let inputSystem = $state<InputSystem | undefined>();

  let ghostObject: Object3D | null = null;

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    if (!sceneManager || !cameraController || !canvas) return;

    const drag = $uiStore.drag;
    if (!drag.active || !drag.item) return;

    const rect = canvas.getBoundingClientRect();
    const mouse = new Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new Raycaster();
    raycaster.setFromCamera(mouse, cameraController.camera);
    const plane = new Plane(new Vector3(0, 1, 0), 0);
    const intersectPoint = new Vector3();
    const hit = raycaster.ray.intersectPlane(plane, intersectPoint);

    if (hit) {
      if (!ghostObject || ghostObject.userData.itemType !== drag.item) {
        if (ghostObject) sceneManager.scene.remove(ghostObject);
        
        if (drag.type === 'primitive') {
          ghostObject = createPrimitive(drag.item as any);
          ghostObject.traverse((child) => {
            if (child instanceof Mesh) {
              const mat = child.material as MeshStandardMaterial;
              mat.transparent = true;
              mat.opacity = 0.5;
              mat.depthWrite = false;
            }
          });
        } else if (drag.type === 'light') {
          ghostObject = new Mesh(new SphereGeometry(0.5, 8, 8), new MeshStandardMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.3,
            wireframe: true
          }));
        }
        
        if (ghostObject) {
          ghostObject.userData.itemType = drag.item;
          sceneManager.scene.add(ghostObject);
        }
      }

      if (ghostObject) {
        ghostObject.position.copy(intersectPoint);
      }
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    if (!sceneManager || !cameraController || !canvas) return;
    
    const perspxType = e.dataTransfer?.getData('application/perspx-type');
    const itemType = e.dataTransfer?.getData('application/perspx-item');
    if (!perspxType || !itemType) return;

    const rect = canvas.getBoundingClientRect();
    const mouse = new Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new Raycaster();
    raycaster.setFromCamera(mouse, cameraController.camera);
    const plane = new Plane(new Vector3(0, 1, 0), 0);
    const intersectPoint = new Vector3();
    const intersectResult = raycaster.ray.intersectPlane(plane, intersectPoint);

    if (perspxType === 'primitive' && objectManager) {
      const id = objectManager.addPrimitive(itemType as any);
      if (id && intersectResult) {
        const obj = sceneManager.getObject(id);
        if (obj) {
          obj.position.x = intersectPoint.x;
          obj.position.z = intersectPoint.z;
          obj.updateMatrixWorld();
          commitHistory(sceneManager, true);
        }
      }
    } else if (perspxType === 'light' && lightManager) {
      const id = lightManager.addLight({ type: itemType as any, intensity: 1, color: 0xffffff });
      if (id && intersectResult) {
        const obj = sceneManager.getObject(id);
        if (obj) {
          obj.position.x = intersectPoint.x;
          obj.position.z = intersectPoint.z;
          lightManager.updateHelpers();
          commitHistory(sceneManager, true);
        }
      }
    }
  }

  $effect(() => {
    // Clean up ghost object if dragging stopped
    if (!$uiStore.drag.active && ghostObject) {
      sceneManager?.scene.remove(ghostObject);
      ghostObject = null;
    }
  });

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
      inputSystem.setTransformSystem(_transformSystem);

      // Sync camera changes to store
      _transformSystem.controls.addEventListener('change', () => {
        updateCameraStore(_cameraController.mode, _cameraController.getFOV());
      });

      // Add lights
      const _lightManager = new LightManager(_sceneManager);
      lightManager = _lightManager;
      _lightManager.applyPreset('studio');

      // Add helpers
      const grid = createInfiniteGrid();
      const ground = createGroundPlane();
      vanishingHelper = new VanishingPointHelper();
      renderer.scene.add(grid);
      renderer.scene.add(ground);
      renderer.scene.add(vanishingHelper.group);

      // Keyboard toggles: 1=grid, 2=vanishing
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        switch (e.key) {
          case '1': grid.visible = !grid.visible; break;
          case '2': vanishingHelper.group.visible = !vanishingHelper.group.visible; break;
        }
      };
      window.addEventListener('keydown', onKeyDown);
      cleanupKeys = () => window.removeEventListener('keydown', onKeyDown);

      // History tracking
      initHistory(_sceneManager);
      _sceneManager.on('object-added', () => commitHistory(_sceneManager));
      _sceneManager.on('object-removed', () => commitHistory(_sceneManager));

      // Keyboard Shortcuts for Undo/Redo & Clipboard
      const onKeyDownGlobal = async (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmdKey = isMac ? e.metaKey : e.ctrlKey;

        if (cmdKey) {
          const key = e.key.toLowerCase();
          
          if (key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
              if (objectManager && lightManager) redo(_sceneManager, objectManager, lightManager);
            } else {
              if (objectManager && lightManager) undo(_sceneManager, objectManager, lightManager);
            }
          } else if (key === 'y') {
            e.preventDefault();
            if (objectManager && lightManager) redo(_sceneManager, objectManager, lightManager);
          } else if (key === 'c' || key === 'x') {
            e.preventDefault();
            const selectedIds = _sceneManager.getSelectedIds();
            if (selectedIds.length > 0) {
              const { serializeObjects } = await import('$lib/utils/serialization');
              const objects = serializeObjects(_sceneManager, selectedIds);
              const data = JSON.stringify({ type: 'perspx-clipboard', objects });
              await navigator.clipboard.writeText(data);
              
              if (key === 'x') {
                for (const id of selectedIds) {
                  _sceneManager.removeObject(id);
                }
                commitHistory(_sceneManager);
              }
            }
          } else if (key === 'v') {
            e.preventDefault();
            try {
              const text = await navigator.clipboard.readText();
              if (text) {
                const data = JSON.parse(text);
                if (data.type === 'perspx-clipboard' && Array.isArray(data.objects)) {
                  const { pasteObjects } = await import('$lib/utils/serialization');
                  if (objectManager && lightManager) {
                    const newIds = pasteObjects(data.objects, _sceneManager, objectManager, lightManager);
                    if (newIds.length > 0) {
                      _sceneManager.selectMultiple(newIds, false);
                      commitHistory(_sceneManager);
                    }
                  }
                }
              }
            } catch (err) {
              console.warn('Clipboard read failed or invalid data', err);
            }
          }
        }
      };
      window.addEventListener('keydown', onKeyDownGlobal);
      const oldCleanupKeys = cleanupKeys;
      cleanupKeys = () => {
        oldCleanupKeys();
        window.removeEventListener('keydown', onKeyDownGlobal);
      };

      loop = new RenderLoop(renderer.instance, renderer.scene, _cameraController.camera);
      loop.onUpdate((_dt) => {
        _cameraController.update();
        loop.setCamera(_cameraController.camera);
        _transformSystem.updateCamera(_cameraController.camera);
        inputSystem.updateCamera(_cameraController.camera);
        if (lightManager) lightManager.updateHelpers();

        // Sync FOV to store every frame (handles slider changes)
        const fov = _cameraController.getFOV();
        if (fov !== $cameraStore.fov) {
          updateCameraStore(_cameraController.mode, fov);
        }

        // Live-update vanishing lines for selected object
        _sceneManager.on('selection-changed', () => {
          sceneStore.update((s) => ({ ...s, selectedIds: _sceneManager.getSelectedIds() }));
        });



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
        const bp = getBreakpoint(window.innerWidth);
        if ($uiStore.breakpoint !== bp) {
          uiStore.update(s => ({ ...s, breakpoint: bp }));
        }
        
        if (!renderer) return;
        cameraController?.handleResize(renderer.getAspect());
      };
      
      // Initialize breakpoint
      handleResize();
      
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

<div class="app" data-theme="dark">
  <Toolbar {objectManager} {sceneManager} {lightManager} {renderer} />
  <SubToolbar {transformSystem} />

  <div class="workspace">
    <!-- Left Panel -->
    {#if $uiStore.breakpoint === 'desktop' || $uiStore.breakpoint === 'tablet'}
      <aside class="sidebar left-sidebar" class:tablet-overlay={$uiStore.breakpoint === 'tablet'}>
        <ScenePanel {sceneManager} />
        <div class="panel-gap"></div>
        <LibraryPanel {objectManager} {lightManager} />
      </aside>
    {/if}

    <!-- Viewport -->
    <div class="viewport-wrapper" ondragover={onDragOver} ondrop={onDrop}>
      <canvas bind:this={canvas} id="viewport"></canvas>
      <ViewportOverlay />
    </div>

    <!-- Right Panel -->
    {#if $uiStore.breakpoint === 'desktop' || $uiStore.breakpoint === 'tablet'}
      <aside class="sidebar right-sidebar" class:tablet-overlay={$uiStore.breakpoint === 'tablet'}>
        <PropertiesPanel {sceneManager} />
        <div class="panel-gap"></div>
        <CameraPanel {cameraController} />
      </aside>
    {/if}
  </div>

  {#if $uiStore.breakpoint === 'mobile'}
    <BottomSheet {sceneManager} {objectManager} {lightManager} {cameraController} />
  {/if}
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

  .tablet-overlay {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 50;
    height: 100%;
  }
  
  .left-sidebar.tablet-overlay {
    left: 0;
  }
  
  .right-sidebar.tablet-overlay {
    right: 0;
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
