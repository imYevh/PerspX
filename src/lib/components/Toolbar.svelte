<script lang="ts">
  import type { ObjectManager } from '$lib/objects/object-manager';
  import type { SceneManager } from '$lib/core/scene';
  import type { LightManager } from '$lib/lighting/light-manager';
  import type { Renderer } from '$lib/core/renderer';
  import { uiStore } from '$lib/stores/ui';
  import { undo, redo } from '$lib/stores/history';
  import { serializeScene, applySceneSnapshot } from '$lib/utils/serialization';
  
  import Dropdown from './ui/Dropdown.svelte';
  import type { DropdownItem } from './ui/Dropdown.svelte';

  interface Props {
    objectManager: ObjectManager | undefined;
    sceneManager: SceneManager | undefined;
    lightManager: LightManager | undefined;
    renderer: Renderer | undefined;
  }
  
  let { objectManager, sceneManager, lightManager, renderer }: Props = $props();

  const mainMenu: DropdownItem[] = [
    { id: 'new', label: 'Clear Scene', icon: '✨' },
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
    if (id === 'new') {
      if (confirm('Clear current scene? All unsaved progress will be lost.')) {
        if (sceneManager) sceneManager.clearAll();
      }
    } else {
      alert(`Feature "${id}" coming soon!`);
    }
  }

  function handleLightSelect(id: string) {
    if (lightManager) lightManager.applyPreset(id);
  }

  function saveScene() {
    if (!sceneManager) return;
    const snapshot = serializeScene(sceneManager);
    const data = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scene.perspx.json';
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
          applySceneSnapshot(snapshot, sceneManager, objectManager, lightManager);
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
    if (!renderer) return;
    
    // Force a render immediately before capturing to ensure WebGL buffer isn't cleared
    renderer.render(); 
    
    const url = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'perspx-screenshot.png';
    a.click();
  }
</script>

<header class="toolbar">
  <div class="toolbar-brand">
    <Dropdown 
      icon="☰" 
      items={mainMenu} 
      onSelect={handleMenuSelect} 
      title="Main Menu" 
    />
    {#if $uiStore.breakpoint !== 'mobile'}
      <div class="brand-logo-container">
        <span class="brand-logo">P</span>
        <span class="brand-name">PerspX</span>
      </div>
    {/if}
  </div>

  <div class="toolbar-sep"></div>

  <!-- Central actions -->
  <div class="toolbar-group">
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
    <button class="tool-btn" title="Save Scene" onclick={saveScene}>
      <span class="tool-icon">💾</span>
      {#if $uiStore.breakpoint !== 'mobile'}
        <span class="tool-label">Save</span>
      {/if}
    </button>
    <button class="tool-btn" title="Load Scene" onclick={loadScene}>
      <span class="tool-icon">📁</span>
      {#if $uiStore.breakpoint !== 'mobile'}
        <span class="tool-label">Load</span>
      {/if}
    </button>
    <button class="tool-btn" title="Take Screenshot" onclick={takeScreenshot}>
      <span class="tool-icon">📷</span>
    </button>
  </div>
</header>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 12px;
    height: 44px;
    background: rgba(15, 15, 25, 0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
    z-index: 30; /* Higher than SubToolbar */
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
  }

  .brand-name {
    font-size: 15px;
    font-weight: 700;
    color: #e0e0e0;
    letter-spacing: -0.3px;
  }

  .toolbar-sep {
    width: 1px;
    height: 24px;
    background: rgba(255, 255, 255, 0.1);
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
    color: #aaa;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    height: 100%;
  }

  .tool-btn:hover {
    background: rgba(255, 255, 255, 0.07);
    color: #e0e0e0;
  }

  .tool-icon {
    font-size: 14px;
  }
</style>
