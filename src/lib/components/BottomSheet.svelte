<script lang="ts">
  import ScenePanel from './panels/ScenePanel.svelte';
  import LibraryPanel from './panels/LibraryPanel.svelte';
  import PropertiesPanel from './panels/PropertiesPanel.svelte';
  import CameraPanel from './panels/CameraPanel.svelte';
  import { appModeStore } from '$lib/stores/appMode.svelte';
  import { uiStore } from '$lib/stores/ui';
  
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

  let currentHeight = $state(250);
  let isDragging = $state(false);
  let startY = $state(0);
  let startHeight = $state(0);
  
  let innerWidth = $state(typeof window !== 'undefined' ? window.innerWidth : 1000);
  let innerHeight = $state(typeof window !== 'undefined' ? window.innerHeight : 1000);
  let isLandscape = $derived(innerWidth > innerHeight);
  let minHeight = $derived(isLandscape ? 100 : 150);

  // Touch drag
  function handleTouchStart(e: TouchEvent) {
    isDragging = true;
    startY = e.touches[0].clientY;
    startHeight = currentHeight;
  }

  function getMaxHeight() {
    return isLandscape ? innerHeight - 90 : innerHeight * 0.8;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isDragging) return;
    const dy = startY - e.touches[0].clientY;
    const proposedHeight = startHeight + dy;
    
    if (proposedHeight < 80) {
      uiStore.update(s => ({ ...s, mobileBottomSheetExpanded: false }));
      isDragging = false;
      currentHeight = 350;
      return;
    }
    currentHeight = Math.max(minHeight, Math.min(getMaxHeight(), proposedHeight));
  }

  function handleTouchEnd() {
    if (!isDragging) return;
    isDragging = false;
    snapHeight();
  }

  // Mouse drag (for desktop users resizing the sheet)
  function handleMouseDown(e: MouseEvent) {
    isDragging = true;
    startY = e.clientY;
    startHeight = currentHeight;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    const dy = startY - e.clientY;
    const proposedHeight = startHeight + dy;
    
    if (proposedHeight < 80) {
      uiStore.update(s => ({ ...s, mobileBottomSheetExpanded: false }));
      isDragging = false;
      currentHeight = 350;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      return;
    }
    currentHeight = Math.max(minHeight, Math.min(getMaxHeight(), proposedHeight));
  }

  function handleMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    snapHeight();
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  function snapHeight() {
    const maxH = getMaxHeight();
    if (currentHeight < 200) {
      currentHeight = minHeight; // Snap to minimum usable height
    } else if (currentHeight > maxH * 0.75) {
      currentHeight = maxH;
    } else {
      currentHeight = Math.min(350, maxH); // Mid snap, capped by maxH
    }
  }
</script>

<svelte:window bind:innerWidth bind:innerHeight ontouchmove={handleTouchMove} ontouchend={handleTouchEnd} />

<div class="bottom-sheet glass" 
     class:mobile-collapsed={$uiStore.breakpoint === 'mobile' && !$uiStore.mobileBottomSheetExpanded}
     style="height: {currentHeight}px; transition: {isDragging ? 'none' : 'height 0.2s ease'}; {isDragging ? 'backdrop-filter: none; -webkit-backdrop-filter: none;' : ''}">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="handle-area" ontouchstart={handleTouchStart} onmousedown={handleMouseDown}>
    <div class="handle-bar"></div>
  </div>

  <div class="content" style="display: block;">
    {#if $uiStore.mobileActiveTab === 'scene'}
      <ScenePanel {sceneManager} {cameraController} />
    {:else if $uiStore.mobileActiveTab === 'library'}
      <LibraryPanel {objectManager} {lightManager} />
    {:else if $uiStore.mobileActiveTab === 'properties'}
      <PropertiesPanel {sceneManager} />
    {:else if $uiStore.mobileActiveTab === 'camera'}
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
    /* Use strong glass effect that respects theme surface color */
    background: color-mix(in srgb, var(--color-surface) 85%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    max-width: 500px;
    margin: 0 auto;
    /* Safe area for devices with home indicators and notches in landscape */
    padding-bottom: env(safe-area-inset-bottom, 0px);
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
  }

  .handle-area {
    padding: 12px;
    display: flex;
    justify-content: center;
    touch-action: none;
    cursor: grab;
    /* Touch target */
    min-height: 24px;
    align-items: center;
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

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    padding-bottom: 24px;
    /* Hide scrollbar but keep functionality */
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }

  /* Hide bottom sheet entirely when collapsed on mobile */
  .bottom-sheet.mobile-collapsed {
    transform: translateY(100%);
    pointer-events: none;
  }
</style>
