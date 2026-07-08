<script lang="ts">
  import { Renderer } from '$lib/core/renderer';
  import { SceneManager } from '$lib/core/scene';
  import { RenderLoop } from '$lib/core/loop';
  import { bindSceneManager } from '$lib/stores/scene';
  import { CameraController } from '$lib/camera/camera-controller';
  import { ObjectManager } from '$lib/objects/object-manager';
  import { TransformSystem } from '$lib/transforms/transform-controls';
  import { InputSystem } from '$lib/core/input';
  import { createInfiniteGrid, createVerticalGuidelines } from '$lib/helpers/grid';
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
  import BottomSheet from '$lib/components/BottomSheet.svelte';
  import SubToolbar from '$lib/components/SubToolbar.svelte';
  import ViewportOverlay from '$lib/components/ViewportOverlay.svelte';
  import PrimitiveOverlays from '$lib/components/PrimitiveOverlays.svelte';
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

      let currentOverlays: any = undefined; // just declare it
      uiStore.subscribe(state => currentOverlays = state.overlays)(); // get initial synchronously
      
      const updateOverlays = (overlays: any) => {
        if (!_sceneManager) return;
        const objs = _sceneManager.getAllObjects();
        for (const { object } of objs) {
          if (object.userData.itemType) {
            object.children.forEach((child: any) => {
              if (child.userData.isDefaultEdges) child.visible = overlays.edges && !overlays.xyz;
              if (child.userData.isXYZEdges) child.visible = overlays.xyz;
              if (child.userData.isHalfLines) child.visible = overlays.half;
              if (child.userData.isThirdLines) child.visible = overlays.third;
              if (child.userData.isCrossLines) child.visible = overlays.cross;
              
              if (child.userData.isBaseMesh) {
                const mat = child.material;
                if (overlays.solid) {
                  mat.transparent = false;
                  mat.opacity = 1.0;
                  mat.depthWrite = true;
                  mat.color.setHex(0xffffff);
                } else {
                  mat.transparent = true;
                  mat.opacity = 0.75;
                  mat.depthWrite = false;
                  mat.color.setHex(child.userData.baseColor);
                }
                mat.needsUpdate = true;
              }
            });
            
            object.children.forEach((child: any) => {
              if (child.userData.isDefaultEdges) {
                if (child.material && child.material.color) {
                  child.material.color.setHex(overlays.solid ? 0x000000 : 0xffffff);
                }
              }
            });
          }
        }
      };

      _sceneManager.on('object-added', (data) => {
        console.log(`Added: ${data.meta.name} (${data.id})`);
        updateOverlays(currentOverlays);
        commitHistory(_sceneManager);
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

      // @ts-ignore
      window.cameraController = _cameraController;

      // Use the appropriate camera from controller
      _transformSystem = new TransformSystem(_cameraController.perspCamera, canvas, _sceneManager, _cameraController);
      transformSystem = _transformSystem;
      inputSystem = new InputSystem(canvas, _cameraController.perspCamera, _sceneManager);
      inputSystem.setTransformSystem(_transformSystem);

      // Sync camera changes to store
      _transformSystem.controls.addEventListener('change', () => {
        updateCameraStore({ mode: _cameraController.mode, fov: _cameraController.getFOV(), roll: _cameraController.getRoll() });
      });

      // Add lights
      const _lightManager = new LightManager(_sceneManager);
      lightManager = _lightManager;
      _lightManager.applyPreset('studio');

      // Add helpers
      const grid = createInfiniteGrid();
      const guidelinesFull = createVerticalGuidelines();
      const guidelinesNearest = createVerticalGuidelines({ size: 12, divisions: 12, color: 0x666688 });
      
      guidelinesFull.visible = $cameraStore.guidelines === 'full';
      guidelinesNearest.visible = $cameraStore.guidelines === 'nearest';
      
      renderer.scene.add(grid);
      renderer.scene.add(guidelinesFull);
      renderer.scene.add(guidelinesNearest);
      
      // Store reference to guidelines so we can toggle and move them
      (window as any).__guidelinesFull = guidelinesFull;
      (window as any).__guidelinesNearest = guidelinesNearest;
      
      vanishingHelper = new VanishingPointHelper();
      renderer.scene.add(vanishingHelper.group);

      // Sync UI store visibility toggles
      const unsubscribeUI = uiStore.subscribe(s => {
        currentOverlays = s.overlays;
        if (grid) grid.visible = s.gridVisible;
        if (vanishingHelper) vanishingHelper.group.visible = s.vanishingVisible;
        updateOverlays(s.overlays);
      });

      // Keyboard toggles: 1=grid, 2=vanishing
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        switch (e.code) {
          case 'Digit1': uiStore.update(s => ({ ...s, gridVisible: !s.gridVisible })); break;
          case 'Digit2': uiStore.update(s => ({ ...s, vanishingVisible: !s.vanishingVisible })); break;
        }
      };
      window.addEventListener('keydown', onKeyDown);
      
      const onResetCamera = () => {
        if (_cameraController) {
          _cameraController.applyState(new Vector3(5, 4, 5), new Vector3(0, 0, 0));
          _cameraController.setRoll(0);
          _cameraController.setFOV(50, false);
          _cameraController.mode = 'perspective';
          _cameraController.update();
        }
        
        // Reset helpers
        uiStore.update(s => ({ ...s, gridVisible: true, vanishingVisible: false }));
        vanishingHelper.clear();
        if ((window as any).__guidelinesFull) {
          (window as any).__guidelinesFull.visible = false;
        }
        if ((window as any).__guidelinesNearest) {
          (window as any).__guidelinesNearest.visible = false;
        }
        
        // Reset every camera effect and setting to default values
        updateCameraStore({
          mode: 'perspective',
          fov: 50,
          roll: 0,
          zolly: false,
          fisheye: false,
          fisheyeIntensity: 0,
          chromaticAberration: false,
          chromaticAberrationIntensity: 0,
          tiltShift: false,
          tiltShiftPosition: 0.5,
          tiltShiftWidth: 0.2,
          tiltShiftIntensity: 0.5,
          guidelines: 'disabled',
          lockPan: false,
          lockOrbit: false,
          orbitMode: 'free'
        });

        // Reset theme to default
        import('$lib/stores/theme.svelte').then(({ THEME_MODES, ACCENT_PRESETS }) => {
           // We can't easily call the setter from here without importing the stores, 
           // but we can dispatch a custom event that Toolbar can listen to.
        });
      };
      const onTakeScreenshot = async (e: any) => {
        const filename = e.detail?.filename || 'perspx-screenshot.png';

        // 1. Hide UI helpers
        const wasGridVisible = grid.visible;
        const wasVanishingVisible = vanishingHelper.group.visible;
        const wasFullLinesVisible = (window as any).__guidelinesFull?.visible;
        const wasNearestLinesVisible = (window as any).__guidelinesNearest?.visible;
        const wasGuidelinesState = $cameraStore.guidelines;
        
        // Disable Transform Controls temporarily
        _transformSystem.detach();
        
        grid.visible = false;
        vanishingHelper.group.visible = false;
        if ((window as any).__guidelinesFull) (window as any).__guidelinesFull.visible = false;
        if ((window as any).__guidelinesNearest) (window as any).__guidelinesNearest.visible = false;
        updateCameraStore({ guidelines: 'disabled' });
        
        // Hide bounding box helpers
        _sceneManager.getAllObjects().forEach(({ object }) => {
           if (object.userData.boundingBoxHelper) {
             object.userData.boundingBoxHelper.visible = false;
           }
        });

        // Hide light helpers
        if (_lightManager) {
           _lightManager.hideHelpers();
        }

        // Wait a frame for visibility changes to apply? No, synchronous is fine for three.js
        // 2. Render synchronous frame
        loop.renderOnce();

        // 3. Get Data URL
        const dataUrl = renderer.instance.domElement.toDataURL('image/png');

        // 4. Download file
        try {
          if ('showSaveFilePicker' in window) {
            // Modern API to specify path
            const handle = await (window as any).showSaveFilePicker({
              suggestedName: filename,
              types: [{
                description: 'PNG Image',
                accept: {'image/png': ['.png']},
              }],
            });
            const writable = await handle.createWritable();
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            await writable.write(blob);
            await writable.close();
          } else {
            // Fallback for older devices/safari
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = filename;
            a.click();
          }
        } catch (err) {
          console.log('User cancelled screenshot save or failed', err);
        }

        // 5. Restore UI helpers
        grid.visible = wasGridVisible;
        vanishingHelper.group.visible = wasVanishingVisible;
        if ((window as any).__guidelinesFull) (window as any).__guidelinesFull.visible = wasFullLinesVisible;
        if ((window as any).__guidelinesNearest) (window as any).__guidelinesNearest.visible = wasNearestLinesVisible;
        updateCameraStore({ guidelines: wasGuidelinesState });
        
        // Re-attach transform control if an object was selected
        const selectedIds = _sceneManager.getSelectedIds();
        if (selectedIds.length === 1) {
           _transformSystem.attachToObject(selectedIds[0]);
        } else if (selectedIds.length > 1) {
           _transformSystem.attachToMultiple(selectedIds);
        }
        
        _sceneManager.getAllObjects().forEach(({ object }) => {
           if (object.userData.boundingBoxHelper && selectedIds.includes(object.userData.id)) {
             object.userData.boundingBoxHelper.visible = true;
           }
        });

        if (_lightManager) {
           _lightManager.restoreHelpers();
           _lightManager.updateHelpers();
        }
      };
      const preventContextMenu = (e: MouseEvent) => {
        e.preventDefault();
      };
      window.addEventListener('contextmenu', preventContextMenu);
      window.addEventListener('perspx-reset-camera', onResetCamera);
      window.addEventListener('perspx-take-screenshot', onTakeScreenshot);

      cleanupKeys = () => {
        unsubscribeUI();
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('perspx-reset-camera', onResetCamera);
        window.removeEventListener('perspx-take-screenshot', onTakeScreenshot);
        window.removeEventListener('contextmenu', preventContextMenu);
      };

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
          const code = e.code;
          
          if (code === 'KeyZ') {
            e.preventDefault();
            if (e.shiftKey) {
              if (objectManager && lightManager) redo(_sceneManager, objectManager, lightManager);
            } else {
              if (objectManager && lightManager) undo(_sceneManager, objectManager, lightManager);
            }
          } else if (code === 'KeyY') {
            e.preventDefault();
            if (objectManager && lightManager) redo(_sceneManager, objectManager, lightManager);
          } else if (code === 'KeyC' || code === 'KeyX') {
            e.preventDefault();
            const selectedIds = _sceneManager.getSelectedIds();
            if (selectedIds.length > 0) {
              const { serializeObjects } = await import('$lib/utils/serialization');
              const objects = serializeObjects(_sceneManager, selectedIds);
              const data = JSON.stringify({ type: 'perspx-clipboard', objects });
              await navigator.clipboard.writeText(data);
              
              if (code === 'KeyX') {
                for (const id of selectedIds) {
                  _sceneManager.removeObject(id);
                }
                commitHistory(_sceneManager);
              }
            }
          } else if (code === 'KeyV') {
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
      
      // Move helpers to the overlay scene in loop to keep them free from chromatic aberration
      renderer.scene.remove(grid);
      renderer.scene.remove(guidelinesFull);
      renderer.scene.remove(guidelinesNearest);
      renderer.scene.remove(vanishingHelper.group);
      
      loop.overlayScene.add(grid);
      loop.overlayScene.add(guidelinesFull);
      loop.overlayScene.add(guidelinesNearest);
      loop.overlayScene.add(vanishingHelper.group);

      loop.onUpdate((_dt) => {
        // Apply Store settings
        if (_cameraController.getFOV() !== $cameraStore.fov) {
          _cameraController.setFOV($cameraStore.fov, $cameraStore.zolly);
        }
        if (_cameraController.getRoll() !== $cameraStore.roll) {
          _cameraController.setRoll($cameraStore.roll);
        }
        if (_cameraController.lockOrbit !== $cameraStore.lockOrbit) {
          _cameraController.lockOrbit = $cameraStore.lockOrbit;
        }
        // Force lockPan if in snap mode
        const shouldLockPan = $cameraStore.lockPan || $cameraStore.orbitMode === 'snap';
        if (_cameraController.lockPan !== shouldLockPan) {
          _cameraController.lockPan = shouldLockPan;
        }

        // Apply Snap to Object BEFORE updating camera controller
        if ($cameraStore.orbitMode === 'snap') {
          const selectedIds = _sceneManager.getSelectedIds();
          if (selectedIds.length > 0) {
            const currentObjId = selectedIds[0];
            const obj = _sceneManager.getObject(currentObjId);
            if (obj) {
              const worldPos = new Vector3();
              obj.getWorldPosition(worldPos);
              
              if ((window as any).__lastSnapObjId !== currentObjId) {
                // New object selected. Keep camera position static, but rotate to focus on it.
                _cameraController.applyState(_cameraController.perspCamera.position, worldPos);
              } else {
                // Same object. Update target so camera follows it.
                _cameraController.target.copy(worldPos);
              }
              
              (window as any).__lastSnapObjId = currentObjId;
            }
          } else {
            (window as any).__lastSnapObjId = null;
          }
        } else {
          (window as any).__lastSnapObjId = null;
        }

        _cameraController.update();
        loop.setCamera(_cameraController.camera);
        _transformSystem.updateCamera(_cameraController.camera);
        inputSystem.updateCamera(_cameraController.camera);
        if (lightManager) lightManager.updateHelpers();

        // Apply camera effects
        loop.setFisheye($cameraStore.fisheye, $cameraStore.fisheyeIntensity);
        loop.setChromaticAberration($cameraStore.chromaticAberration, $cameraStore.chromaticAberrationIntensity);
        loop.setTiltShift($cameraStore.tiltShift, $cameraStore.tiltShiftPosition, $cameraStore.tiltShiftWidth, $cameraStore.tiltShiftIntensity);

        if ((window as any).__guidelinesFull) {
          (window as any).__guidelinesFull.visible = $cameraStore.guidelines === 'full';
        }
        if ((window as any).__guidelinesNearest) {
          (window as any).__guidelinesNearest.visible = $cameraStore.guidelines === 'nearest';
          if ($cameraStore.guidelines === 'nearest') {
            (window as any).__guidelinesNearest.position.set(
              _cameraController.target.x,
              _cameraController.target.y,
              _cameraController.target.z
            );
          }
        }

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
  
  {#if $uiStore.panelsVisible}
    <SubToolbar {transformSystem} />
  {/if}

  <div class="workspace">
    <!-- Left Panel -->
    {#if $uiStore.panelsVisible && $uiStore.leftPanelOpen && ($uiStore.breakpoint === 'desktop' || $uiStore.breakpoint === 'tablet')}
      {#if !$uiStore.sceneCollapsed || !$uiStore.libraryCollapsed}
        <aside class="sidebar left-sidebar">
          {#if !$uiStore.sceneCollapsed}
            <ScenePanel {sceneManager} />
          {/if}
          {#if !$uiStore.sceneCollapsed && !$uiStore.libraryCollapsed}
            <div class="panel-gap"></div>
          {/if}
          {#if !$uiStore.libraryCollapsed}
            <LibraryPanel {objectManager} {lightManager} />
          {/if}
        </aside>
      {/if}
    {/if}

    <!-- Viewport -->
    <div class="viewport-wrapper" ondragover={onDragOver} ondrop={onDrop}>
      <canvas bind:this={canvas} id="viewport"></canvas>
      <ViewportOverlay />
      <PrimitiveOverlays />
    </div>

    <!-- Right Panel -->
    {#if $uiStore.panelsVisible && $uiStore.rightPanelOpen && ($uiStore.breakpoint === 'desktop' || $uiStore.breakpoint === 'tablet')}
      {#if !$uiStore.propertiesCollapsed || !$uiStore.cameraCollapsed}
        <aside class="sidebar right-sidebar">
          {#if !$uiStore.propertiesCollapsed}
            <PropertiesPanel {sceneManager} />
          {/if}
          {#if !$uiStore.propertiesCollapsed && !$uiStore.cameraCollapsed}
            <div class="panel-gap"></div>
          {/if}
          {#if !$uiStore.cameraCollapsed}
            <CameraPanel {cameraController} />
          {/if}
        </aside>
      {/if}
    {/if}
  </div>

  {#if $uiStore.panelsVisible && $uiStore.breakpoint === 'mobile'}
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
    position: relative;
  }

  .sidebar {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 50;
    height: 100%;
    width: 220px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    padding: 8px;
    gap: 0;
    overflow-y: auto;
    background: rgba(12, 12, 22, 0.85);
    border-color: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(12px);
  }

  .left-sidebar {
    left: 0;
    border-right: 1px solid rgba(255, 255, 255, 0.06);
  }

  .right-sidebar {
    right: 0;
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
