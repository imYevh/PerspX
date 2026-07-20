<script lang="ts">
  import type { ObjectManager } from '$lib/objects/object-manager';
  import type { SceneManager } from '$lib/core/scene';
  import type { LightManager } from '$lib/lighting/light-manager';
  import type { Renderer } from '$lib/core/renderer';
  import { uiStore } from '$lib/stores/ui';
  import { cameraStore, updateCameraStore } from '$lib/stores/camera';
  import { undo, redo, initHistory } from '$lib/stores/history';
  import { serializeScene, applySceneSnapshot } from '$lib/utils/serialization';
  import { appModeStore } from '$lib/stores/appMode.svelte';
  import { shaderStore, SHADER_DEFS, SHADER_ORDER, setShader, resetShaders, type ShaderType } from '$lib/stores/shader.svelte';
  import { resetColorCycle } from '$lib/objects/primitives';
  
  import lockIcon from '$lib/assets/lock.svg?raw';
  import orbitIcon from '$lib/assets/orbit.svg?raw';
  import panIcon from '$lib/assets/pan.svg?raw';
  import invisibleIcon from '$lib/assets/invisible.svg?raw';
  import visibleIcon from '$lib/assets/visible.svg?raw';
  import exportIcon from '$lib/assets/export.svg?raw';
  import resetIcon from '$lib/assets/reset.svg?raw';
  import undoRedoIcon from '$lib/assets/undo redo.svg?raw';
  import lightingIcon from '$lib/assets/lighting.svg?raw';
  import lightsOnIcon from '$lib/assets/lights-on.svg?raw';
  import lightsOffIcon from '$lib/assets/lights-off.svg?raw';
  import selectIcon from '$lib/assets/select.svg?raw';
  import overlaysIcon from '$lib/assets/overlays.svg?raw';
  import focusCamIcon from '$lib/assets/focus cam.svg?raw';

  import Dropdown from './ui/Dropdown.svelte';
  import type { DropdownItem } from './ui/Dropdown.svelte';
  import ConfirmDialog from './ui/ConfirmDialog.svelte';
  import SettingsDialog from './ui/SettingsDialog.svelte';
  import OverlaysDropdown from './ui/OverlaysDropdown.svelte';
  import ShadersDropdown from './ui/ShadersDropdown.svelte';

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

  let mainMenu = $derived([
    { id: 'reset', label: 'Reset Scene', icon: '' },
    { id: 'clear', label: 'Clear Scene', icon: '' },
    { id: 'save', label: 'Save Scene', icon: '' },
    { id: 'load', label: 'Load Scene', icon: '' },
    { id: 'divider1', label: '', divider: true },
    ...($uiStore.breakpoint === 'mobile' ? [] : [{ id: 'shortcuts', label: 'Keyboard Shortcuts', icon: '' }]),
    { id: 'settings', label: 'Settings', icon: '' },
    { id: 'divider2', label: '', divider: true },
    { id: 'exit', label: 'Exit', icon: '' },
  ] as DropdownItem[]);

  const lightingMenu: DropdownItem[] = [
    { id: 'studio', label: 'Studio', icon: '' },
    { id: 'outdoor', label: 'Outdoor', icon: '' },
    { id: 'dramatic', label: 'Dramatic', icon: '' },
    { id: 'flat', label: 'Flat', icon: '' },
    { id: 'warm', label: 'Warm Interior', icon: '' },
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
    } else if (id === 'exit') {
      window.close();
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
      lightManager.setShowHelpers(true);
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
      guidelines: 'disabled',
      lockPan: false,
      lockOrbit: false,
      orbitMode: 'free'
    });
    
    uiStore.update(s => ({
      ...s,
      transformMode: 'translate',
      snapEnabled: false,
      lightHelpersVisible: true
    }));

    resetColorCycle();
    resetShaders();

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

    resetShaders();
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
    { id: 'shader', label: 'Shaders (Right)', icon: !$uiStore.shaderCollapsed ? '✓' : ' ', keepOpenOnClick: true },
    { id: 'divider2', label: '', divider: true },
    { id: 'default', label: 'Restore Default', icon: '' },
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
    } else if (id === 'shader') {
      uiStore.update(s => ({ ...s, shaderCollapsed: !s.shaderCollapsed }));
    } else if (id === 'default') {
      uiStore.update(s => ({
        ...s,
        leftPanelOpen: true,
        rightPanelOpen: true,
        sceneCollapsed: false,
        libraryCollapsed: false,
        propertiesCollapsed: false,
        cameraCollapsed: false,
        shaderCollapsed: false,
        panelsVisible: true
      }));
    }
  }

  const checkIcon = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const blankIcon = `<svg viewBox="0 0 24 24" fill="none"></svg>`;

  const toolsMenu = $derived([
    { id: 'h-select', label: 'Selection', header: true },
    { id: 'toggle-multi', label: 'Multi-Select Mode', icon: $uiStore.multiSelectMode ? checkIcon : blankIcon, keepOpenOnClick: true },
    { id: 'select-all', label: 'Select All', icon: selectIcon },
    { id: 'deselect-all', label: 'Deselect All', icon: blankIcon },
    { id: 'deselect-lights', label: 'Deselect Lights', icon: blankIcon },
    { id: 'deselect-cameras', label: 'Deselect Cameras', icon: blankIcon },
    { id: 'divider-tools1', label: '', divider: true },
    { id: 'h-camera', label: 'Camera Controls', header: true },
    { id: 'lock-orbit', label: 'Lock Orbit', icon: $cameraStore.lockOrbit ? lockIcon : orbitIcon, keepOpenOnClick: true },
    { id: 'lock-pan', label: 'Lock Pan', icon: $cameraStore.lockPan ? lockIcon : panIcon, keepOpenOnClick: true },
    { id: 'reset-camera', label: 'Reset Camera Position', icon: resetIcon },
    { id: 'divider-tools2', label: '', divider: true },
    { id: 'h-viewport', label: 'Viewport', header: true },
    { id: 'toggle-grid', label: 'Grid', icon: $uiStore.gridVisible ? checkIcon : blankIcon, keepOpenOnClick: true },
    { id: 'toggle-vanishing', label: 'Vanishing Helper', icon: $uiStore.vanishingVisible ? checkIcon : blankIcon, keepOpenOnClick: true },
    { id: 'cycle-guidelines', label: `Guidelines: ${$cameraStore.guidelines}`, icon: blankIcon, keepOpenOnClick: true },
    { id: 'toggle-helpers', label: 'Light Helpers', icon: $uiStore.lightHelpersVisible ? lightsOnIcon : lightsOffIcon, keepOpenOnClick: true },
  ] as DropdownItem[]);

  function handleToolsSelect(id: string) {
    if (id === 'toggle-multi') {
      uiStore.update(s => ({ ...s, multiSelectMode: !s.multiSelectMode }));
    } else if (id === 'select-all') {
      if (sceneManager) {
        const allIds = sceneManager.getAllObjects()
          .filter(o => o.meta.type !== 'light' && o.meta.type !== 'camera')
          .map(o => o.id);
        sceneManager.selectMultiple(allIds, false);
      }
    } else if (id === 'deselect-all') {
      if (sceneManager) sceneManager.deselectAll();
    } else if (id === 'deselect-lights') {
      if (sceneManager) {
        const currentIds = sceneManager.getSelectedIds();
        const newIds = currentIds.filter(id => sceneManager?.getMeta(id)?.type !== 'light');
        sceneManager.selectMultiple(newIds, false);
      }
    } else if (id === 'deselect-cameras') {
      if (sceneManager) {
        const currentIds = sceneManager.getSelectedIds();
        const newIds = currentIds.filter(id => sceneManager?.getMeta(id)?.type !== 'camera');
        sceneManager.selectMultiple(newIds, false);
      }
    } else if (id === 'lock-orbit') {
      updateCameraStore({ lockOrbit: !$cameraStore.lockOrbit });
    } else if (id === 'lock-pan') {
      updateCameraStore({ lockPan: !$cameraStore.lockPan });
    } else if (id === 'reset-camera') {
      if (sceneManager) window.dispatchEvent(new CustomEvent('perspx-reset-camera'));
    } else if (id === 'toggle-grid') {
      uiStore.update(s => ({ ...s, gridVisible: !s.gridVisible }));
    } else if (id === 'toggle-vanishing') {
      uiStore.update(s => ({ ...s, vanishingVisible: !s.vanishingVisible }));
    } else if (id === 'cycle-guidelines') {
      const next = { 'disabled': 'full', 'full': 'disabled' };
      updateCameraStore({ guidelines: next[$cameraStore.guidelines] as 'disabled' | 'full' });
    } else if (id === 'toggle-helpers') {
      if (lightManager) {
        const isVisible = lightManager.toggleHelpers();
        uiStore.update(s => ({ ...s, lightHelpersVisible: isVisible }));
      }
    }
  }

  function toggleMobileTab(tab: 'scene' | 'library' | 'properties' | 'camera') {
    if ($uiStore.mobileBottomSheetExpanded && $uiStore.mobileActiveTab === tab) {
      uiStore.update(s => ({ ...s, mobileBottomSheetExpanded: false }));
    } else {
      uiStore.update(s => ({ ...s, mobileBottomSheetExpanded: true, mobileActiveTab: tab }));
    }
  }

  const listIcon = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`;
  const boxIcon = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
  const slidersIcon = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>`;
  const videoIcon = `<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
</script>

  {#snippet toolbarActions()}
    <!-- Central actions — some hidden in compact mode -->
    <div class="toolbar-group">
      {#if appModeStore.mode === 'desktop' && $uiStore.breakpoint !== 'mobile'}
        <Dropdown 
          icon="" 
          label="View" 
          items={viewMenu} 
          onSelect={handleViewSelect} 
          title="View Options" 
        />
        <div class="toolbar-sep"></div>
      {/if}
      {#if $uiStore.breakpoint === 'tablet' && appModeStore.mode === 'desktop'}
        <button class="tool-btn" title="Toggle UI Panels" onclick={() => uiStore.update(s => ({ ...s, panelsVisible: !s.panelsVisible }))}>
          <span class="tool-icon">{@html $uiStore.panelsVisible ? invisibleIcon : visibleIcon}</span>
          <span class="tool-label">{$uiStore.panelsVisible ? 'Hide UI' : 'Show UI'}</span>
        </button>
        <div class="toolbar-sep"></div>
      {/if}

      {#if $uiStore.breakpoint !== 'mobile'}
        <Dropdown 
          icon={lightingIcon} 
          label="Environment" 
          items={lightingMenu} 
          onSelect={handleLightSelect} 
          title="Environment Presets" 
        />
      {/if}
    </div>
  {/snippet}

<header class="toolbar" class:mobile-layout={$uiStore.breakpoint === 'mobile'}>
  <div class="toolbar-main-row">
    <div class="toolbar-brand">
      {#if $uiStore.breakpoint !== 'mobile'}
        <div class="brand-logo-container">
          <a href="https://github.com/imYevh/PerspX" target="_blank" rel="noopener noreferrer" class="brand-logo" title="View on GitHub">P</a>
          {#if appModeStore.mode === 'compact'}
            <span class="mode-badge">Compact</span>
          {/if}
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

    <!-- History controls always on top bar -->
    <div class="toolbar-group">
      <button class="tool-btn" title={$uiStore.breakpoint === 'mobile' ? "Undo" : "Undo (Ctrl+Z)"} onclick={() => {
        if (sceneManager && objectManager && lightManager) undo(sceneManager, objectManager, lightManager);
      }}>
        <span class="tool-icon">{@html undoRedoIcon}</span>
      </button>
      <button class="tool-btn" title={$uiStore.breakpoint === 'mobile' ? "Redo" : "Redo (Ctrl+Y)"} onclick={() => {
        if (sceneManager && objectManager && lightManager) redo(sceneManager, objectManager, lightManager);
      }}>
        <span class="tool-icon" style="transform: scaleX(-1);">{@html undoRedoIcon}</span>
      </button>
    </div>

    <div class="toolbar-sep"></div>

    <Dropdown 
      icon="" 
      label="Tools" 
      items={toolsMenu} 
      onSelect={handleToolsSelect} 
      title="Tools" 
    />

    <div class="toolbar-sep"></div>

    <button class="tool-btn" title="Take Render" onclick={takeScreenshot}>
      <span class="tool-icon">{@html exportIcon}</span>
    </button>

    {#if $uiStore.breakpoint === 'mobile'}
      <div class="spacer"></div>
      <Dropdown 
        icon={lightingIcon} 
        label="" 
        items={lightingMenu} 
        onSelect={handleLightSelect} 
        title="Environment Presets" 
        align="right"
      />
      <OverlaysDropdown align="right" />
      <ShadersDropdown align="right" />
    {:else}
      <div class="toolbar-sep"></div>
      <div class="spacer"></div>
      {@render toolbarActions()}
    {/if}
  </div>

  {#if $uiStore.breakpoint === 'mobile'}
    <div class="toolbar-bottom-row">
      {#if appModeStore.mode === 'compact'}
        <button class="mobile-tab-btn" class:active={$uiStore.mobileBottomSheetExpanded && $uiStore.mobileActiveTab === 'library'} onclick={() => toggleMobileTab('library')} title="Library">
          <span class="tool-icon">{@html boxIcon}</span> <span class="tab-label">Library</span>
        </button>
        <button class="mobile-tab-btn" onclick={takeScreenshot} title="Render">
          <span class="tool-icon">{@html exportIcon}</span> <span class="tab-label">Render</span>
        </button>
        <button class="mobile-tab-btn" onclick={() => window.dispatchEvent(new CustomEvent('perspx-reset-camera'))} title="Reset View">
          <span class="tool-icon">{@html resetIcon}</span> <span class="tab-label">Reset View</span>
        </button>
      {:else}
        <button class="mobile-tab-btn" class:active={$uiStore.mobileBottomSheetExpanded && $uiStore.mobileActiveTab === 'scene'} onclick={() => toggleMobileTab('scene')} title="Scene">
          <span class="tool-icon">{@html listIcon}</span> <span class="tab-label">Scene</span>
        </button>
        <button class="mobile-tab-btn" class:active={$uiStore.mobileBottomSheetExpanded && $uiStore.mobileActiveTab === 'library'} onclick={() => toggleMobileTab('library')} title="Library">
          <span class="tool-icon">{@html boxIcon}</span> <span class="tab-label">Library</span>
        </button>
      {/if}
      <button class="mobile-tab-btn" class:active={$uiStore.mobileBottomSheetExpanded && $uiStore.mobileActiveTab === 'properties'} onclick={() => toggleMobileTab('properties')} title="Properties">
        <span class="tool-icon">{@html slidersIcon}</span> <span class="tab-label">Props</span>
      </button>
      <button class="mobile-tab-btn" class:active={$uiStore.mobileBottomSheetExpanded && $uiStore.mobileActiveTab === 'camera'} onclick={() => toggleMobileTab('camera')} title="Camera">
        <span class="tool-icon">{@html videoIcon}</span> <span class="tab-label">Camera</span>
      </button>
    </div>
  {/if}
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
    flex-direction: column;
    background: color-mix(in srgb, var(--color-surface) 85%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
    z-index: 500; /* Higher than Sidebar (10) and BottomSheet (100) */
    position: relative;
    width: 100%;
  }

  .toolbar-main-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 12px;
    height: 44px;
    width: 100%;
    box-sizing: border-box;
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .tool-icon :global(svg) {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  /* ── Touch-friendly targets for coarse pointer devices ── */
  @media (pointer: coarse) {
    .tool-btn {
      min-height: 44px;
      min-width: 44px;
      padding: 6px 12px;
    }

    .toolbar-main-row {
      height: 52px;
    }

    .toolbar-group {
      height: 40px;
    }
  }

  /* ── Compact mode badge ── */
  .mode-badge {
    font-size: 10px;
    font-weight: 600;
    color: var(--color-accent);
    background: var(--color-accent-muted);
    border: 1px solid var(--color-accent);
    border-radius: 4px;
    padding: 1px 5px;
    letter-spacing: 0.3px;
    white-space: nowrap;
  }

  /* ── Mobile Expanded Toolbar ── */
  .mobile-expanded-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px;
    width: min(260px, calc(100vw - 32px));
    align-items: center;
  }

  .toolbar-bottom-row {
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 6px 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: transparent;
    width: 100%;
    box-sizing: border-box;
  }

  .mobile-tab-btn {
    background: transparent;
    border: none;
    font-size: 11px;
    height: 42px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    transition: background 0.2s;
    flex: 1;
    color: var(--color-text-muted);
  }
  .mobile-tab-btn:active {
    background: rgba(255, 255, 255, 0.1);
  }
  .mobile-tab-btn.active {
    background: rgba(74, 158, 255, 0.2);
    color: var(--color-accent);
  }
  .mobile-tab-btn .tool-icon :global(svg) {
    width: 18px;
    height: 18px;
  }
  .tab-label {
    font-weight: 600;
  }
  
  @media (max-width: 767px) {
    .hide-on-mobile-dropdown {
      display: none;
    }
  }

  @media (orientation: landscape) and (max-height: 500px) {
    .toolbar-main-row {
      height: 34px !important;
    }
    .toolbar-bottom-row {
      padding: 2px 4px !important;
    }
    .mobile-tab-btn {
      height: 30px !important;
      flex-direction: row !important;
      gap: 6px !important;
    }
    .tool-btn {
      min-height: 30px !important;
      min-width: 30px !important;
      padding: 4px 8px !important;
    }
    .toolbar-group {
      height: 30px !important;
    }
    .mobile-tab-btn .tool-icon :global(svg) {
      width: 14px !important;
      height: 14px !important;
    }
    .tab-label {
      font-size: 10px !important;
    }
  }
</style>
