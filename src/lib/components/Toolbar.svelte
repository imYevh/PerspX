<script lang="ts">
  import type { ObjectManager } from '$lib/objects/object-manager';
  import type { SceneManager } from '$lib/core/scene';
  import type { LightManager } from '$lib/lighting/light-manager';
  import type { Renderer } from '$lib/core/renderer';
  import { uiStore } from '$lib/stores/ui';
  import { cameraStore, updateCameraStore } from '$lib/stores/camera';
  import { undo, redo, initHistory } from '$lib/stores/history';
  import { serializeScene, applySceneSnapshot } from '$lib/utils/serialization';
  
  import Dropdown from './ui/Dropdown.svelte';
  import type { DropdownItem } from './ui/Dropdown.svelte';
  import ConfirmDialog from './ui/ConfirmDialog.svelte';
  import SettingsDialog from './ui/SettingsDialog.svelte';

  interface Props {
    objectManager: ObjectManager | undefined;
    sceneManager: SceneManager | undefined;
    lightManager: LightManager | undefined;
    renderer: Renderer | undefined;
  }
  
  let { objectManager, sceneManager, lightManager, renderer }: Props = $props();

  let confirmDialog = $state<{
    title: string;
    message: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  let showSettings = $state(false);

  const mainMenu: DropdownItem[] = [
    { id: 'reset', label: 'Reset Scene', icon: '🎥' },
    { id: 'clear', label: 'Clear Scene', icon: '✨' },
    { id: 'save', label: 'Save Scene', icon: '💾' },
    { id: 'load', label: 'Load Scene', icon: '📁' },
    { id: 'divider1', label: '', divider: true },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: '⌨️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'divider2', label: '', divider: true },
    { id: 'about', label: 'About PerspX', icon: 'ℹ️' },
  ];

  const lightingMenu: DropdownItem[] = [
    { id: 'studio', label: 'Studio', icon: '💡' },
    { id: 'outdoor', label: 'Outdoor', icon: '☀️' },
    { id: 'dramatic', label: 'Dramatic', icon: '🎭' },
    { id: 'flat', label: 'Flat', icon: '⬜' },
    { id: 'warm', label: 'Warm Interior', icon: '🔥' },
  ];

  function handleMenuSelect(id: string) {
    if (id === 'reset') {
      confirmDialog = {
        title: 'Reset Scene',
        message: 'Are you sure you want to reset the entire application to its initial state? All added objects will be deleted and settings will return to default.',
        danger: false,
        onConfirm: () => {
          resetSettings();
          confirmDialog = null;
        }
      };
    } else if (id === 'clear') {
      confirmDialog = {
        title: 'Clear Scene',
        message: 'Are you sure you want to delete all objects and wipe the scene clean? This cannot be undone.',
        danger: true,
        onConfirm: () => {
          clearSceneLogic();
          confirmDialog = null;
        }
      };
    } else if (id === 'save') {
      saveScene();
    } else if (id === 'load') {
      loadScene();
    } else if (id === 'settings') {
      showSettings = true;
    } else {
      alert(`Feature "${id}" coming soon!`);
    }
  }

  function resetSettings() {
    if (sceneManager) {
      sceneManager.deselectAll();
      const objects = sceneManager.getAllObjects();
      for (const { id, meta } of objects) {
        if (meta.type !== 'light') {
          sceneManager.removeObject(id);
        }
      }
      initHistory(sceneManager);
    }
    
    if (lightManager) {
      lightManager.applyPreset('studio');
    }
    resetCameraAndUI();
  }

  function resetCameraAndUI() {
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
      guidelines: false,
      lockPan: false,
      lockOrbit: false,
      orbitMode: 'free'
    });
    
    uiStore.update(s => ({
      ...s,
      transformMode: 'translate',
      snapEnabled: false
    }));

    import('$lib/objects/primitives').then(({ resetColorCycle }) => {
      resetColorCycle();
    });

    window.dispatchEvent(new CustomEvent('perspx-reset-camera'));
  }

  function clearSceneLogic() {
    if (sceneManager) {
      sceneManager.deselectAll();
      sceneManager.clearAll();
      initHistory(sceneManager);
    }
    updateCameraStore({
      fisheye: false,
      fisheyeIntensity: 0,
      chromaticAberration: false,
      chromaticAberrationIntensity: 0,
      tiltShift: false,
      tiltShiftPosition: 0.5,
      tiltShiftWidth: 0.2,
      tiltShiftIntensity: 0.5,
      guidelines: 'disabled'
    });
  }

  function handleLightSelect(id: string) {
    if (lightManager) lightManager.applyPreset(id);
  }

  function getTimestamp() {
    const d = new Date();
    const date = d.toISOString().split('T')[0];
    const time = d.toTimeString().split(' ')[0].replace(/:/g, '-');
    return `${date}_${time}`;
  }

  function saveScene() {
    if (!sceneManager) return;
    const snapshot = serializeScene(sceneManager, $cameraStore, (window as any).cameraController);
    const data = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `perspx_scene_${getTimestamp()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function loadScene() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !sceneManager || !objectManager || !lightManager) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const content = ev.target?.result as string;
          const snapshot = JSON.parse(content);
          const skipped = applySceneSnapshot(snapshot, sceneManager, objectManager, lightManager, updateCameraStore, (window as any).cameraController);
          if (skipped.length > 0) {
            const names = skipped.map(n => `• ${n}`).join('\n');
            alert(`Scene loaded.\n\n${skipped.length} model(s) could not be restored from the save file — please re-import them manually:\n\n${names}`);
          }
        } catch (err) {
          console.error("Failed to load scene", err);
          alert("Failed to load scene file. It may be corrupted or invalid.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function takeScreenshot() {
    window.dispatchEvent(new CustomEvent('perspx-take-screenshot', {
      detail: {
        filename: `perspx_render_${getTimestamp()}.png`
      }
    }));
  }

  const viewMenu = $derived([
    ...($uiStore.breakpoint === 'desktop' ? [
      { id: 'panelsVisible', label: $uiStore.panelsVisible ? 'Hide UI' : 'Show UI' },
      { id: 'divider0', label: '', divider: true }
    ] : []),
    { id: 'leftPanel', label: 'Left Panel', icon: $uiStore.leftPanelOpen ? '✓' : ' ', keepOpenOnClick: true },
    { id: 'rightPanel', label: 'Right Panel', icon: $uiStore.rightPanelOpen ? '✓' : ' ', keepOpenOnClick: true },
    { id: 'divider1', label: '', divider: true },
    { id: 'inspector', label: 'Inspector (Left)', icon: !$uiStore.sceneCollapsed ? '✓' : ' ', keepOpenOnClick: true },
    { id: 'library', label: 'Library (Left)', icon: !$uiStore.libraryCollapsed ? '✓' : ' ', keepOpenOnClick: true },
    { id: 'properties', label: 'Properties (Right)', icon: !$uiStore.propertiesCollapsed ? '✓' : ' ', keepOpenOnClick: true },
    { id: 'camera', label: 'Camera Effects (Right)', icon: !$uiStore.cameraCollapsed ? '✓' : ' ', keepOpenOnClick: true },
    { id: 'divider2', label: '', divider: true },
    { id: 'default', label: 'Restore Default', icon: '🔄' },
  ] as DropdownItem[]);

  function handleViewSelect(id: string) {
    if (id === 'panelsVisible') {
      uiStore.update(s => ({ ...s, panelsVisible: !s.panelsVisible }));
    } else if (id === 'leftPanel') {
      uiStore.update(s => ({ ...s, leftPanelOpen: !s.leftPanelOpen }));
    } else if (id === 'rightPanel') {
      uiStore.update(s => ({ ...s, rightPanelOpen: !s.rightPanelOpen }));
    } else if (id === 'inspector') {
      uiStore.update(s => ({ ...s, sceneCollapsed: !s.sceneCollapsed }));
    } else if (id === 'library') {
      uiStore.update(s => ({ ...s, libraryCollapsed: !s.libraryCollapsed }));
    } else if (id === 'properties') {
      uiStore.update(s => ({ ...s, propertiesCollapsed: !s.propertiesCollapsed }));
    } else if (id === 'camera') {
      uiStore.update(s => ({ ...s, cameraCollapsed: !s.cameraCollapsed }));
    } else if (id === 'default') {
      uiStore.update(s => ({
        ...s,
        leftPanelOpen: true,
        rightPanelOpen: true,
        sceneCollapsed: false,
        libraryCollapsed: false,
        propertiesCollapsed: false,
        cameraCollapsed: false,
        panelsVisible: true
      }));
    }
  }

  const overlaysMenu = $derived([
    { id: 'edges', label: 'Edges', icon: $uiStore.overlays.edges ? '✓' : ' ', keepOpenOnClick: true },
    { id: 'half', label: 'Half', icon: $uiStore.overlays.half ? '✓' : ' ', keepOpenOnClick: true },
    { id: 'third', label: 'Third', icon: $uiStore.overlays.third ? '✓' : ' ', keepOpenOnClick: true },
    { id: 'cross', label: 'Cross', icon: $uiStore.overlays.cross ? '✓' : ' ', keepOpenOnClick: true },
    { id: 'solid', label: 'Solid', icon: $uiStore.overlays.solid ? '✓' : ' ', keepOpenOnClick: true },
    { id: 'xyz', label: 'XYZ', icon: $uiStore.overlays.xyz ? '✓' : ' ', keepOpenOnClick: true },
    { id: 'divider-tex', label: '', divider: true },
    { id: 'textured', label: 'Textured (Models)', icon: $uiStore.overlays.textured ? '✓' : ' ', keepOpenOnClick: true },
  ] as DropdownItem[]);

  function handleOverlaySelect(id: string) {
    const key = id as keyof typeof $uiStore.overlays;
    uiStore.update((s) => ({
      ...s,
      overlays: {
        ...s.overlays,
        [key]: !s.overlays[key]
      }
    }));
  }
</script>

<header class="toolbar">
  <div class="toolbar-brand">
    {#if $uiStore.breakpoint !== 'mobile'}
      <div class="brand-logo-container">
        <a href="https://github.com/imYevh/PerspX" target="_blank" rel="noopener noreferrer" class="brand-logo" title="View on GitHub">P</a>
      </div>
    {/if}
    <Dropdown 
      icon={$uiStore.breakpoint === 'desktop' ? '' : '☰'} 
      label={$uiStore.breakpoint === 'desktop' ? 'File' : ''} 
      items={mainMenu} 
      onSelect={handleMenuSelect} 
      title={$uiStore.breakpoint === 'desktop' ? 'File Menu' : 'Main Menu'} 
    />
  </div>

  <div class="toolbar-sep"></div>

  <!-- Central actions -->
  <div class="toolbar-group">
    <Dropdown 
      icon="" 
      label="View" 
      items={viewMenu} 
      onSelect={handleViewSelect} 
      title="View Options" 
    />
    <div class="toolbar-sep"></div>
    <Dropdown 
      icon="🧊" 
      label="Overlays" 
      items={overlaysMenu} 
      onSelect={handleOverlaySelect} 
      title="Primitive Overlays" 
      hideLabelOnMobile={true}
      isMobile={$uiStore.breakpoint === 'mobile'}
    />
    <div class="toolbar-sep"></div>
    {#if $uiStore.breakpoint !== 'desktop'}
      <button class="tool-btn" title="Toggle UI Panels" onclick={() => uiStore.update(s => ({ ...s, panelsVisible: !s.panelsVisible }))}>
        <span class="tool-label">{$uiStore.panelsVisible ? 'Hide UI' : 'Show UI'}</span>
      </button>
      <div class="toolbar-sep"></div>
    {/if}
    <button class="tool-btn" class:locked={$cameraStore.lockOrbit} onclick={() => updateCameraStore({ lockOrbit: !$cameraStore.lockOrbit })} title="Lock Orbit (Rotation)">
      <span class="tool-icon">{$cameraStore.lockOrbit ? '🔒' : '🔓'}</span>
      {#if $uiStore.breakpoint !== 'mobile'}
        <span class="tool-label">Orbit</span>
      {/if}
    </button>
    <button class="tool-btn" class:locked={$cameraStore.lockPan} onclick={() => updateCameraStore({ lockPan: !$cameraStore.lockPan })} title="Lock Pan (Movement)">
      <span class="tool-icon">{$cameraStore.lockPan ? '🔒' : '🔓'}</span>
      {#if $uiStore.breakpoint !== 'mobile'}
        <span class="tool-label">Pan</span>
      {/if}
    </button>
    <button class="tool-btn" title="Reset Camera Position" onclick={() => {
      if (sceneManager) {
        // Find the camera controller from the main page and reset it.
        // It's cleaner to emit an event or call a global function.
        // For now, we dispatch a custom event on window since cameraController is in +page.svelte.
        window.dispatchEvent(new CustomEvent('perspx-reset-camera'));
      }
    }}>
      <span class="tool-icon">🎥</span>
      {#if $uiStore.breakpoint !== 'mobile'}
        <span class="tool-label">Reset Camera</span>
      {/if}
    </button>
    <div class="toolbar-sep"></div>
    <Dropdown 
      icon="💡" 
      label="Lighting" 
      items={lightingMenu} 
      onSelect={handleLightSelect} 
      title="Lighting Presets" 
      hideLabelOnMobile={true}
      isMobile={$uiStore.breakpoint === 'mobile'}
    />
  </div>

  <div class="toolbar-sep"></div>

  <!-- History controls -->
  <div class="toolbar-group">
    <button class="tool-btn" title={$uiStore.breakpoint === 'mobile' ? "Undo" : "Undo (Ctrl+Z)"} onclick={() => {
      if (sceneManager && objectManager && lightManager) undo(sceneManager, objectManager, lightManager);
    }}>⟲</button>
    <button class="tool-btn" title={$uiStore.breakpoint === 'mobile' ? "Redo" : "Redo (Ctrl+Y)"} onclick={() => {
      if (sceneManager && objectManager && lightManager) redo(sceneManager, objectManager, lightManager);
    }}>⟳</button>
  </div>
  
  <div class="spacer"></div>

  <!-- Utility actions -->
  <div class="toolbar-group">
    <button
      class="tool-btn"
      class:active={$uiStore.gridVisible}
      onclick={() => uiStore.update(s => ({ ...s, gridVisible: !s.gridVisible }))}
      title="Toggle Infinite Grid (1)"
    >
      <span class="tool-icon">▦</span>
      {#if $uiStore.breakpoint !== 'mobile'}
        <span class="tool-label">Grid</span>
      {/if}
    </button>
    <button
      class="tool-btn"
      class:active={$uiStore.vanishingVisible}
      onclick={() => uiStore.update(s => ({ ...s, vanishingVisible: !s.vanishingVisible }))}
      title="Toggle Vanishing Helper (2)"
    >
      <span class="tool-icon">⨂</span>
      {#if $uiStore.breakpoint !== 'mobile'}
        <span class="tool-label">Vanishing</span>
      {/if}
    </button>
    <button
      class="tool-btn"
      class:active={$cameraStore.guidelines !== 'disabled'}
      onclick={() => {
        const next = {
          'disabled': 'full',
          'full': 'disabled'
        };
        updateCameraStore({ guidelines: next[$cameraStore.guidelines] as 'disabled' | 'full' });
      }}
      title="Vertical Guidelines: {$cameraStore.guidelines}"
    >
      <span class="tool-icon" style="font-weight: 800; transform: scaleX(1.2); letter-spacing: -2px;">|||</span>
      {#if $uiStore.breakpoint !== 'mobile'}
        <span class="tool-label">Guidelines</span>
      {/if}
    </button>
    <div class="toolbar-sep"></div>
    <button class="tool-btn" title="Take Screenshot" onclick={takeScreenshot}>
      <span class="tool-icon">📷</span>
      {#if $uiStore.breakpoint !== 'mobile'}
        <span class="tool-label">Screenshot</span>
      {/if}
    </button>
  </div>
</header>

{#if confirmDialog}
  <ConfirmDialog
    title={confirmDialog.title}
    message={confirmDialog.message}
    danger={confirmDialog.danger}
    onConfirm={confirmDialog.onConfirm}
    onCancel={() => confirmDialog = null}
  />
{/if}

{#if showSettings}
  <SettingsDialog onClose={() => showSettings = false} />
{/if}

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 12px;
    height: 44px;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    z-index: 100; /* Higher than Sidebar (50) and SubToolbar (20) */
  }

  .toolbar-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-right: 4px;
  }
  
  .brand-logo-container {
    display: flex;
    align-items: center;
    gap: 8px;
    user-select: none;
  }

  .brand-logo {
    width: 26px;
    height: 26px;
    background: linear-gradient(135deg, #4a9eff, #7b5ea7);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 14px;
    color: white;
    text-decoration: none;
    transition: transform 0.15s ease;
  }

  .brand-logo:hover {
    transform: scale(1.05);
  }

  .toolbar-sep {
    width: 1px;
    height: 24px;
    background: var(--color-border);
    margin: 0 4px;
  }

  .toolbar-group {
    display: flex;
    gap: 2px;
    height: 32px;
  }
  
  .spacer {
    flex: 1;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--color-text-muted);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    height: 100%;
  }

  .tool-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .tool-btn.active {
    background: var(--color-accent-muted);
    color: var(--color-accent);
  }
  
  .tool-btn.locked {
    color: #ff6b6b;
  }

  .tool-icon {
    font-size: 14px;
  }
</style>
