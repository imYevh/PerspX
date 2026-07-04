<script lang="ts">
  import ScenePanel from './panels/ScenePanel.svelte';
  import LibraryPanel from './panels/LibraryPanel.svelte';
  import PropertiesPanel from './panels/PropertiesPanel.svelte';
  import CameraPanel from './panels/CameraPanel.svelte';
  
  import type { SceneManager } from '$lib/core/scene';
  import type { ObjectManager } from '$lib/objects/object-manager';
  import type { CameraController } from '$lib/camera/camera-controller';
  import type { LightManager } from '$lib/lighting/light-manager';

  interface Props {
    sceneManager: SceneManager | undefined;
    objectManager: ObjectManager | undefined;
    cameraController: CameraController | undefined;
    lightManager: LightManager | undefined;
  }
  let { sceneManager, objectManager, cameraController, lightManager }: Props = $props();

  let activeTab = $state<'scene' | 'library' | 'properties' | 'camera'>('properties');
  
  let currentHeight = $state(250);
  let isDragging = $state(false);
  let startY = $state(0);
  let startHeight = $state(0);
  const minHeight = 60;

  function handleTouchStart(e: TouchEvent) {
    isDragging = true;
    startY = e.touches[0].clientY;
    startHeight = currentHeight;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isDragging) return;
    const dy = startY - e.touches[0].clientY;
    const maxHeight = window.innerHeight * 0.8;
    currentHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + dy));
  }

  function handleTouchEnd() {
    if (!isDragging) return;
    isDragging = false;
    const maxHeight = window.innerHeight * 0.8;
    
    // Snap
    if (currentHeight < 100) {
      currentHeight = minHeight;
    } else if (currentHeight > maxHeight * 0.6) {
      currentHeight = maxHeight;
    } else {
      currentHeight = 350; // Mid snap
    }
  }
</script>

<svelte:window ontouchmove={handleTouchMove} ontouchend={handleTouchEnd} />

<div class="bottom-sheet glass" style="height: {currentHeight}px; transition: {isDragging ? 'none' : 'height 0.2s ease'}">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="handle-area" ontouchstart={handleTouchStart}>
    <div class="handle-bar"></div>
  </div>

  <div class="tabs">
    <button class="tab" class:active={activeTab === 'scene'} onclick={() => activeTab = 'scene'}>🎬 Scene</button>
    <button class="tab" class:active={activeTab === 'library'} onclick={() => activeTab = 'library'}>📦 Library</button>
    <button class="tab" class:active={activeTab === 'properties'} onclick={() => activeTab = 'properties'}>⚙️ Props</button>
    <button class="tab" class:active={activeTab === 'camera'} onclick={() => activeTab = 'camera'}>📷 Cam</button>
  </div>

  <div class="content" style="display: {currentHeight <= minHeight ? 'none' : 'block'}">
    {#if activeTab === 'scene'}
      <ScenePanel {sceneManager} />
    {:else if activeTab === 'library'}
      <LibraryPanel {objectManager} {lightManager} />
    {:else if activeTab === 'properties'}
      <PropertiesPanel {sceneManager} />
    {:else if activeTab === 'camera'}
      <CameraPanel {cameraController} />
    {/if}
  </div>
</div>

<style>
  .bottom-sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    border-radius: 16px 16px 0 0;
    z-index: 100;
    display: flex;
    flex-direction: column;
    /* Use strong glass effect */
    background: rgba(15, 15, 25, 0.85);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .handle-area {
    padding: 12px;
    display: flex;
    justify-content: center;
    touch-action: none;
    cursor: grab;
  }
  
  .handle-area:active {
    cursor: grabbing;
  }

  .handle-bar {
    width: 40px;
    height: 4px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
  }

  .tabs {
    display: flex;
    gap: 4px;
    padding: 0 8px 8px;
    overflow-x: auto;
    scrollbar-width: none; /* Hide scrollbar for clean look */
  }
  
  .tabs::-webkit-scrollbar {
    display: none;
  }

  .tab {
    flex: 1;
    min-width: max-content;
    padding: 8px 12px;
    font-size: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: #888;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tab.active {
    background: rgba(74, 158, 255, 0.15);
    border-color: rgba(74, 158, 255, 0.3);
    color: #fff;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    /* Hide scrollbar but keep functionality */
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }
</style>
