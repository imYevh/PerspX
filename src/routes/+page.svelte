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
  import { uiStore, getBreakpoint, getOrientation } from '$lib/stores/ui';
  import { initHistory, commitHistory, undo, redo } from '$lib/stores/history';
  import { createPrimitive } from '$lib/objects/primitives';
  import { applyRenderMode } from '$lib/objects/model-loader';
  import { initAppMode, appModeStore } from '$lib/stores/appMode.svelte';
  import { initShader, shaderStore, resetShaders } from '$lib/stores/shader.svelte';
  import { matchShortcut } from '$lib/stores/shortcuts.svelte';
  import { serializeObjects, pasteObjects } from '$lib/utils/serialization';

  // UI Components
  import Toolbar from '$lib/components/Toolbar.svelte';
  import ScenePanel from '$lib/components/panels/ScenePanel.svelte';
  import PropertiesPanel from '$lib/components/panels/PropertiesPanel.svelte';
  import CameraPanel from '$lib/components/panels/CameraPanel.svelte';
  import LibraryPanel from '$lib/components/panels/LibraryPanel.svelte';
  import BottomSheet from '$lib/components/BottomSheet.svelte';
  import SubToolbar from '$lib/components/SubToolbar.svelte';
  import CompactCameraBar from '$lib/components/CompactCameraBar.svelte';
  import ViewportOverlay from '$lib/components/ViewportOverlay.svelte';
  import FloatingShaderPanel from '$lib/components/ui/FloatingShaderPanel.svelte';

  let canvas: HTMLCanvasElement;
  let renderer = $state<Renderer | undefined>();
  let sceneManager = $state<SceneManager | undefined>();
  let cameraController = $state<CameraController | undefined>();
  let transformSystem = $state<TransformSystem | undefined>();
  let objectManager = $state<ObjectManager | undefined>();
  let lightManager = $state<LightManager | undefined>();
  let inputSystem = $state<InputSystem | undefined>();

  let ghostObject: Object3D | null = null;

  // Compact mode: track hidden objects to restore when switching back to desktop
  let hiddenByCompactMode = new Set<string>();
  // Compact mode: track last lighting preset for restore
  let lastDesktopLightPreset = 'studio';

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
    let _renderer: Renderer;
    let loop: RenderLoop;
    let _sceneManager: SceneManager;
    let _cameraController: CameraController;
    let _lastFocusObjId: string | null = null;
    let _sceneStateUrl: string | null = null;
    let _transformSystem: TransformSystem;
    let inputSystem: InputSystem;
    let vanishingHelper: VanishingPointHelper;
    let cleanupResize = () => {};
    let cleanupKeys = () => {};

    let _guidelinesFull: any;

    async function init() {
      if (!canvas) return;

      _renderer = new Renderer({ canvas });
      await _renderer.init();

      _sceneManager = new SceneManager(_renderer.scene);
      bindSceneManager(_sceneManager);
      sceneManager = _sceneManager;

      objectManager = new ObjectManager(_sceneManager);

      let currentOverlays: any = undefined; // just declare it
      uiStore.subscribe(state => currentOverlays = state.overlays)(); // get initial synchronously
      
      const updateOverlays = (overlays: any) => {
        if (!_sceneManager) return;
        try {
          const objs = _sceneManager.getAllObjects();
          for (const { object } of objs) {
            if (!object.userData.itemType) continue;

            object.children.forEach((child: any) => {
              // ── Overlay line visibility ──────────────────────────────────
              if (child.userData.isDefaultEdges) child.visible = overlays.edges && !overlays.xyz;
              if (child.userData.isXYZEdges)     child.visible = overlays.xyz;
              if (child.userData.isHalfLines)    child.visible = overlays.half;
              if (child.userData.isThirdLines)   child.visible = overlays.third;
              if (child.userData.isCrossLines)   child.visible = overlays.cross;

              // ── Base mesh / fill ─────────────────────────────────────────
              if (child.userData.isBaseMesh) {

                // --- IMPORTED MODEL (isBaseMesh child is a Group) ----------
                if (child.isGroup) {
                  const mode = overlays.textured ? 'textured' : 'primitive';
                  applyRenderMode(child, mode, overlays.solid);

                  // Edge colour: black on solid-white, white otherwise
                  object.children.forEach((sib: any) => {
                    if (sib.userData.isDefaultEdges && sib.material?.color) {
                      sib.material.color.setHex(
                        overlays.solid && !overlays.textured ? 0x000000 : 0xffffff
                      );
                    }
                  });

                // --- PRIMITIVE (isBaseMesh child is a Mesh) ----------------
                } else {
                  const mat = child.material;
                  if (!mat) return;

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

                  // Edge colour: black on solid-white, white otherwise
                  object.children.forEach((sib: any) => {
                    if (sib.userData.isDefaultEdges && sib.material?.color) {
                      sib.material.color.setHex(overlays.solid ? 0x000000 : 0xffffff);
                    }
                  });
                }
              }
            });
          }
        } catch (err) {
          console.error('Error in updateOverlays:', err);
        }
      };


      _sceneManager.on('object-added', (data) => {
        console.log(`Added: ${data.meta.name} (${data.id})`);
        updateOverlays(currentOverlays);
      });
      if (import.meta.env.DEV) {
        // @ts-ignore
        window.sceneManager = _sceneManager;
        // @ts-ignore
        window.objectManager = objectManager;
      }

      _cameraController = new CameraController({
        canvas,
        aspect: _renderer.getAspect(),
        initialPosition: new Vector3(5, 4, 5)
      });
      cameraController = _cameraController;
      if (import.meta.env.DEV) {
        // @ts-ignore
        window.cameraController = _cameraController;
      }

      // Use the appropriate camera from controller
      _transformSystem = new TransformSystem(_cameraController.perspCamera, canvas, _sceneManager, _cameraController);
      transformSystem = _transformSystem;
      inputSystem = new InputSystem(canvas, _cameraController.perspCamera, _sceneManager);
      inputSystem.setTransformSystem(_transformSystem);
      inputSystem.setCameraController(_cameraController);

      // Sync camera changes to store
      _transformSystem.controls.addEventListener('change', () => {
        updateCameraStore({ mode: _cameraController.mode, fov: _cameraController.getFOV(), roll: _cameraController.getRoll() });
      });

      // Add lights
      const _lightManager = new LightManager(_sceneManager);
      lightManager = _lightManager;
      await _lightManager.applyPreset('studio');

      // Add helpers — placed in viewportScene so shader effects never apply to them.
      // (viewportScene is composited after the procedural shader but before gizmos.)
      const grid = createInfiniteGrid();
      const guidelinesFull = createVerticalGuidelines();
      
      guidelinesFull.visible = $cameraStore.guidelines === 'full';
      
      // Store reference to guidelines so we can toggle and move them
      _guidelinesFull = guidelinesFull;
      
      vanishingHelper = new VanishingPointHelper();
      // Note: grid / guidelines / vanishing helper are added to viewportScene
      // after loop is created below (loop isn't available yet at this point).

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
        
        if (matchShortcut(e, 'toggle_grid')) {
          e.preventDefault();
          uiStore.update(s => ({ ...s, gridVisible: !s.gridVisible }));
        } else if (matchShortcut(e, 'toggle_vanishing')) {
          e.preventDefault();
          uiStore.update(s => ({ ...s, vanishingVisible: !s.vanishingVisible }));
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
        if (_guidelinesFull) {
          _guidelinesFull.visible = false;
        }
        
        // Reset every camera effect and setting to default values
        updateCameraStore({
          mode: 'perspective',
          fov: 50,
          roll: 0,
          zolly: false,
          fisheye: true,
          fisheyeIntensity: 0,
          swirl: false,
          swirlAmount: 0,
          swirlRadius: 0.5,
          chromaticAberration: true,
          chromaticAberrationIntensity: 0,
          tiltShift: true,
          tiltShiftPosition: 0.5,
          tiltShiftWidth: 0.2,
          tiltShiftIntensity: 0,
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
        const wasFullLinesVisible = _guidelinesFull?.visible;
        const wasGuidelinesState = $cameraStore.guidelines;
        
        // Disable Transform Controls temporarily
        _transformSystem.detach();
        
        grid.visible = false;
        vanishingHelper.group.visible = false;
        if (_guidelinesFull) _guidelinesFull.visible = false;
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
        const dataUrl = _renderer.instance.domElement.toDataURL('image/png');

        // Convert DataURL to Blob synchronously
        const arr = dataUrl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){ u8arr[n] = bstr.charCodeAt(n); }
        const blob = new Blob([u8arr], { type: mime });

        // 4. Download file
        try {
          if ('Capacitor' in window && (window as any).Capacitor.isNativePlatform()) {
            const { Filesystem, Directory } = await import('@capacitor/filesystem');
            const { Media } = await import('@capacitor-community/media');
            
            try {
              await Media.requestPermissions();
              
              const base64Data = dataUrl.split(',')[1];
              const savedFile = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Cache
              });
              
              let album;
              try {
                album = await Media.createAlbum({ name: 'PerspX' });
              } catch (albumErr) {
                console.warn('Could not create album, saving to default', albumErr);
              }
              
              await Media.savePhoto({
                path: savedFile.uri,
                albumIdentifier: album ? album.identifier : undefined
              });
              
              alert('Image successfully saved to gallery!');
            } catch(e: any) {
              console.error('Capacitor save failed', e);
              alert('Failed to save image to gallery: ' + (e.message || 'Unknown error'));
            }
            return;
          }

          const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
          const isAndroid = /Android/i.test(navigator.userAgent);
          let shared = false;
          
          if (isMobile && !isAndroid && navigator.share) {
            try {
              const file = new File([u8arr], filename, { type: mime });
              
              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                  title: 'PerspX Render',
                  files: [file]
                });
                shared = true;
              }
            } catch (e) {
              console.warn('Share failed or user cancelled', e);
            }
          }

          if (!shared) {
            if ('showSaveFilePicker' in window && !isMobile) {
              // Modern API to specify path (desktop only)
              const handle = await (window as any).showSaveFilePicker({
                suggestedName: filename,
                types: [{
                  description: 'PNG Image',
                  accept: {'image/png': ['.png']},
                }],
              });
              const writable = await handle.createWritable();
              await writable.write(blob);
              await writable.close();
            } else {
              // Fallback for older devices/safari/mobile without share
              // Using ObjectURL is much more robust for large canvas images
              const objectUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.style.display = 'none';
              a.href = objectUrl;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(objectUrl);
              }, 100);
            }
          }
        } catch (err) {
          console.log('User cancelled screenshot save or failed', err);
        }

        // 5. Restore UI helpers
        grid.visible = wasGridVisible;
        vanishingHelper.group.visible = wasVanishingVisible;
        if (_guidelinesFull) _guidelinesFull.visible = wasFullLinesVisible;
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

        if (matchShortcut(e, 'duplicate')) {
          e.preventDefault();
          const selectedIds = _sceneManager.getSelectedIds();
          if (selectedIds.length > 0) {
            for (const id of selectedIds) {
              _sceneManager.duplicateObject(id);
            }
          }
        } else if (matchShortcut(e, 'undo')) {
          e.preventDefault();
          if (objectManager && lightManager) undo(_sceneManager, objectManager, lightManager);
        } else if (matchShortcut(e, 'redo')) {
          e.preventDefault();
          if (objectManager && lightManager) redo(_sceneManager, objectManager, lightManager);
        } else if (matchShortcut(e, 'copy') || matchShortcut(e, 'cut')) {
          e.preventDefault();
          const selectedIds = _sceneManager.getSelectedIds();
          if (selectedIds.length > 0) {
            const objects = serializeObjects(_sceneManager, selectedIds);
            const data = JSON.stringify({ type: 'perspx-clipboard', objects });
            await navigator.clipboard.writeText(data);
            
            if (matchShortcut(e, 'cut')) {
              for (const id of selectedIds) {
                _sceneManager.removeObject(id);
              }
              commitHistory(_sceneManager);
            }
          }
        } else if (matchShortcut(e, 'paste')) {
          e.preventDefault();
          try {
            const text = await navigator.clipboard.readText();
            if (text) {
              const data = JSON.parse(text);
              if (data.type === 'perspx-clipboard' && Array.isArray(data.objects)) {
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
      };
      window.addEventListener('keydown', onKeyDownGlobal);
      const oldCleanupKeys = cleanupKeys;
      cleanupKeys = () => {
        oldCleanupKeys();
        window.removeEventListener('keydown', onKeyDownGlobal);
      };

      loop = new RenderLoop(_renderer.instance, _renderer.scene, _cameraController.camera);
      loop.handleResize(_renderer.width, _renderer.height);
      
      _renderer.setCompactMode(appModeStore.mode === 'compact');
      loop.setCompactMode(appModeStore.mode === 'compact');
      // Disable transform gizmo in compact mode (view-only)
      if (appModeStore.mode === 'compact') {
        _transformSystem.controls.enabled = false;
        _transformSystem.detach();
      }
      
      // Move viewport helpers (grid, guidelines, vanishing point) to viewportScene
      // so that procedural shaders (halftone, manga, etc.) are never applied to them.
      // Gizmo overlay (transform controls, light helpers) stays in overlayScene.
      loop.viewportScene.add(grid);
      loop.viewportScene.add(guidelinesFull);
      loop.viewportScene.add(vanishingHelper.group);
      loop.overlayScene.add(_transformSystem.controls.getHelper());
      
      // Keep light helpers out of camera effects by moving them to the overlay scene
      if (_lightManager) {
        _lightManager.setHelperScene(loop.overlayScene);
      }

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
        // Force lockPan if in focus mode
        const shouldLockPan = $cameraStore.lockPan || $cameraStore.orbitMode === 'focus';
        if (_cameraController.lockPan !== shouldLockPan) {
          _cameraController.lockPan = shouldLockPan;
        }

        // Apply Focus to Object BEFORE updating camera controller
        if ($cameraStore.orbitMode === 'focus') {
          const selectedIds = _sceneManager.getSelectedIds();
          if (selectedIds.length > 0) {
            const currentObjId = selectedIds[0];
            const obj = _sceneManager.getObject(currentObjId);
            if (obj) {
              const worldPos = new Vector3();
              obj.getWorldPosition(worldPos);
              
              if (_lastFocusObjId !== currentObjId) {
                // New object selected. Keep camera position static, but rotate to focus on it.
                _cameraController.applyState(_cameraController.perspCamera.position, worldPos);
              } else {
                // Same object. Update target so camera follows it.
                _cameraController.target.copy(worldPos);
              }
              
              _lastFocusObjId = currentObjId;
            }
          } else {
            _lastFocusObjId = null;
          }
        } else {
          _lastFocusObjId = null;
        }

        _cameraController.update();
        loop.setCamera(_cameraController.camera);
        _transformSystem.updateCamera(_cameraController.camera);
        inputSystem.updateCamera(_cameraController.camera);
        if (lightManager) lightManager.updateHelpers();

        // Apply camera effects
        loop.setFisheye($cameraStore.fisheye, $cameraStore.fisheyeIntensity);
        loop.setSwirl($cameraStore.swirl, $cameraStore.swirlAmount, $cameraStore.swirlRadius);
        loop.setChromaticAberration($cameraStore.chromaticAberration, $cameraStore.chromaticAberrationIntensity);
        loop.setTiltShift($cameraStore.tiltShift, $cameraStore.tiltShiftPosition, $cameraStore.tiltShiftWidth, $cameraStore.tiltShiftIntensity);

        if (_guidelinesFull) {
          _guidelinesFull.visible = $cameraStore.guidelines === 'full';
        }

        if (vanishingHelper.group.visible) {
          const selectedIds = _sceneManager.getSelectedIds();
          if (selectedIds.length === 1) {
            const obj = _sceneManager.getObject(selectedIds[0]);
            if (obj) {
              vanishingHelper.updateForBox(obj.position, new Vector3(1, 1, 1));
            }
          } else {
            vanishingHelper.clear();
          }
        }
      });
      loop.start();

      // Restore saved shader (if any was persisted in localStorage)
      if (shaderStore.active !== 'none') {
        loop.setShader(shaderStore.active, shaderStore.params[shaderStore.active] ?? {});
      }

      const handleResize = () => {
        const bp = getBreakpoint(window.innerWidth, window.innerHeight);
        const ori = getOrientation(window.innerWidth, window.innerHeight);
        if ($uiStore.breakpoint !== bp || $uiStore.orientation !== ori) {
          uiStore.update(s => ({ ...s, breakpoint: bp, orientation: ori }));
        }
      };
      
      const onRendererResize = () => {
        if (!_renderer || !_cameraController) return;
        _cameraController.handleResize(_renderer.getAspect());
        if (loop) {
          loop.handleResize(_renderer.width, _renderer.height);
        }
      };
      
      // Initialize breakpoint
      handleResize();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('renderer-resize', onRendererResize);
      cleanupResize = () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('renderer-resize', onRendererResize);
      };
    }

    init().catch(console.error);

    // Initialize app mode
    initAppMode();

    // Initialize shader system
    initShader();

    // Listen for shader change events from CameraPanel
    const onShaderChanged = (e: any) => {
      if (loop) {
        loop.setShader(e.detail.type, e.detail.params);
      }
    };
    const onShaderParamsChanged = (e: any) => {
      if (loop) {
        loop.updateShaderParams(e.detail.params);
      }
    };
    window.addEventListener('perspx-shader-changed', onShaderChanged);
    window.addEventListener('perspx-shader-params-changed', onShaderParamsChanged);

    // Handle application mode changes
    const onModeChanged = async (e: any) => {
      const { mode, previousMode } = e.detail;
      // Use the reactive $state variables which are set by init()
      if (!sceneManager || !lightManager) return;

      // Reset shaders and overlays on any mode switch
      resetShaders();
      uiStore.update(s => ({
        ...s,
        overlays: {
          edges: true,
          half: false,
          third: false,
          cross: false,
          solid: false,
          xyz: false,
          textured: false,
        }
      }));

      if (mode === 'compact') {
        // --- Switch TO compact ---
        // 1. Save current lighting preset name (best effort)
        lastDesktopLightPreset = 'studio';

        // 2. Hide extra non-light objects (keep first one)
        const nonLightObjs = sceneManager.getAllObjects().filter(({ meta }) => meta.type !== 'light');
        hiddenByCompactMode.clear();
        if (nonLightObjs.length > 1) {
          for (let i = 1; i < nonLightObjs.length; i++) {
            const { id, object } = nonLightObjs[i];
            object.visible = false;
            hiddenByCompactMode.add(id);
          }
        }

        // 3. Apply compact sun lighting
        await lightManager.applyPreset('compact');

        // 4. Disable camera post-effects
        if (_renderer) _renderer.setCompactMode(true);
        if (loop) loop.setCompactMode(true);
        updateCameraStore({
          fisheye: false, fisheyeIntensity: 0,
          swirl: false, swirlAmount: 0,
          chromaticAberration: false, chromaticAberrationIntensity: 0,
          tiltShift: false, tiltShiftIntensity: 0,
        });

        // 5. Disable transform gizmo — compact is view-only
        if (_transformSystem) {
          _transformSystem.controls.enabled = false;
          _transformSystem.detach();
        }

        // 6. Collapse right panel
        uiStore.update(s => ({ ...s, rightPanelOpen: false }));

      } else if (mode === 'desktop' && previousMode === 'compact') {
        // --- Switch BACK to desktop ---
        // 1. Restore hidden objects
        for (const id of hiddenByCompactMode) {
          const obj = sceneManager.getObject(id);
          if (obj) obj.visible = true;
        }
        hiddenByCompactMode.clear();

        // 2. Restore lighting preset
        if (_renderer) _renderer.setCompactMode(false);
        if (loop) loop.setCompactMode(false);
        await lightManager.applyPreset(lastDesktopLightPreset);

        // 3. Re-enable transform gizmo
        if (_transformSystem) {
          _transformSystem.controls.enabled = true;
        }

        // 4. Restore panel layout
        uiStore.update(s => ({ ...s, rightPanelOpen: true }));
      }
    };

    window.addEventListener('perspx-mode-changed', onModeChanged);

    return () => {
      cleanupResize();
      cleanupKeys();
      window.removeEventListener('perspx-mode-changed', onModeChanged);
      window.removeEventListener('perspx-shader-changed', onShaderChanged);
      window.removeEventListener('perspx-shader-params-changed', onShaderParamsChanged);
      if (loop) loop.stop();
      if (_renderer) _renderer.dispose();
      if (_sceneManager) _sceneManager.clearAll();
      if (_cameraController) _cameraController.dispose();
      if (_transformSystem) _transformSystem.dispose();
      if (inputSystem) inputSystem.dispose();
      if (vanishingHelper) vanishingHelper.dispose();
    };
  });
</script>

<div class="app">
  <Toolbar {objectManager} {sceneManager} {lightManager} {renderer} />

  <div class="workspace">
    <!-- Left Panel -->
    {#if $uiStore.panelsVisible && $uiStore.leftPanelOpen && ($uiStore.breakpoint === 'desktop' || $uiStore.breakpoint === 'tablet')}
      {#if appModeStore.mode === 'desktop'}
        {#if !$uiStore.sceneCollapsed || !$uiStore.libraryCollapsed}
          <aside class="sidebar left-sidebar">
            {#if !$uiStore.sceneCollapsed}
              <ScenePanel {sceneManager} {cameraController} />
            {/if}
            {#if !$uiStore.sceneCollapsed && !$uiStore.libraryCollapsed}
              <div class="panel-gap"></div>
            {/if}
            {#if !$uiStore.libraryCollapsed}
              <LibraryPanel {objectManager} {lightManager} />
            {/if}
          </aside>
        {/if}
      {:else}
        <aside class="sidebar left-sidebar">
          <LibraryPanel {objectManager} {lightManager} />
        </aside>
      {/if}
    {/if}

    <!-- Viewport -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="viewport-wrapper" ondragover={onDragOver} ondrop={onDrop}>
      <!-- SubToolbar contains transform tools -->
      {#if $uiStore.panelsVisible && (appModeStore.mode === 'desktop' || $uiStore.breakpoint === 'mobile')}
        <SubToolbar {transformSystem} />
      {/if}
      {#if appModeStore.mode === 'compact' && ($uiStore.breakpoint === 'desktop' || $uiStore.breakpoint === 'tablet')}
        <CompactCameraBar {cameraController} {sceneManager} />
      {/if}
      <canvas bind:this={canvas} id="viewport"></canvas>
      <ViewportOverlay />
      <FloatingShaderPanel />

    </div>

    <!-- Right Panel — hidden in compact mode -->
    {#if $uiStore.panelsVisible && $uiStore.rightPanelOpen && appModeStore.mode === 'desktop' && ($uiStore.breakpoint === 'desktop' || $uiStore.breakpoint === 'tablet')}
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
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    overflow: hidden;
    height: 100svh;
    width: 100vw;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100svh;
    width: 100vw;
    overflow: hidden;
    /* Safe area insets for devices with notches/home bars */
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
  }

  .workspace {
    display: flex;
    flex: 1;
    height: 0;
    min-height: 0;
    overflow: hidden;
    position: relative;
    z-index: 1;
  }

  .sidebar {
    --sidebar-width: 240px;
    width: var(--sidebar-width);
    height: 100%;
    max-height: 100%;
    min-height: 0;
    box-sizing: border-box;
    flex-shrink: 0;
    display: block;
    padding: 8px;
    padding-bottom: 24px;
    overflow-y: auto;
    scrollbar-gutter: stable; /* Keeps width stable when scrollbar toggles */
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
    background: var(--color-surface);
    border-color: var(--color-border);
    backdrop-filter: blur(var(--backdrop-blur));
    -webkit-backdrop-filter: blur(var(--backdrop-blur));
    transition: width 0.2s ease;
    z-index: 10;
  }

  /* Narrow sidebar on tablet */
  @media (max-width: 1024px) and (min-width: 768px) {
    .sidebar {
      --sidebar-width: 200px;
    }
  }

  /* Custom scrollbar styling for webkit */
  .sidebar::-webkit-scrollbar {
    width: 6px;
  }

  .sidebar::-webkit-scrollbar-track {
    background: transparent;
  }

  .sidebar::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 3px;
  }

  .sidebar::-webkit-scrollbar-thumb:hover {
    background: var(--color-text-dim);
  }

  .left-sidebar {
    left: 0;
    border-right: 1px solid var(--color-border);
  }

  .right-sidebar {
    right: 0;
    border-left: 1px solid var(--color-border);
  }

  .panel-gap {
    height: 6px;
    flex-shrink: 0;
  }

  .viewport-wrapper {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: var(--color-bg);
    transition: background 0.3s ease;
  }

  #viewport {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    position: relative;
    z-index: 0;
  }

</style>


