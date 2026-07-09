<script lang="ts">
  import type { TransformSystem } from '$lib/transforms/transform-controls';
  import { uiStore } from '$lib/stores/ui';
  import { cameraStore, updateCameraStore } from '$lib/stores/camera';
  import type { TransformMode } from '$lib/transforms/transform-controls';

  interface Props {
    transformSystem: TransformSystem | undefined;
  }
  
  let { transformSystem }: Props = $props();

  const modes: { key: TransformMode; label: string; icon: string; shortcut: string }[] = [
    { key: 'select', label: 'Select', icon: '⬚', shortcut: 'Esc' },
    { key: 'translate', label: 'Move', icon: '↔', shortcut: 'G' },
    { key: 'rotate', label: 'Rotate', icon: '↻', shortcut: 'R' },
    { key: 'scale', label: 'Scale', icon: '⤢', shortcut: 'S' },
  ];

  function setMode(mode: TransformMode) {
    transformSystem?.setMode(mode);
    uiStore.update(s => ({ ...s, transformMode: mode }));
  }

  function toggleSnapping() {
    uiStore.update(s => {
      const snapEnabled = !s.snapEnabled;
      if (snapEnabled) {
        transformSystem?.enableGridSnap();
      } else {
        transformSystem?.disableSnap();
      }
      return { ...s, snapEnabled };
    });
  }
</script>

<div class="sub-toolbar glass">
  <div class="toolbar-group">
    {#each modes as mode}
      <button
        class="tool-btn"
        class:active={$uiStore.transformMode === mode.key}
        onclick={() => setMode(mode.key)}
        title="{$uiStore.breakpoint === 'mobile' ? mode.label : `${mode.label} (${mode.shortcut})`}"
      >
        <span class="tool-icon">{mode.icon}</span>
        {#if $uiStore.breakpoint !== 'mobile'}
          <span class="tool-label">{mode.label}</span>
        {/if}
      </button>
    {/each}
  </div>

  <div class="toolbar-sep"></div>

  <div class="toolbar-group">
    <button
      class="tool-btn snap-btn"
      class:active={$uiStore.snapEnabled}
      onclick={toggleSnapping}
      title="Toggle Snapping"
    >
      <span class="tool-icon">🧲</span>
      {#if $uiStore.breakpoint !== 'mobile'}
        <span class="tool-label">Snap</span>
      {/if}
    </button>
  </div>

  <div class="toolbar-sep"></div>

  <div class="toolbar-group">
    <button
      class="tool-btn camera-snap-btn"
      class:active={$cameraStore.orbitMode === 'snap'}
      onclick={() => updateCameraStore({ orbitMode: $cameraStore.orbitMode === 'free' ? 'snap' : 'free' })}
      title="Camera: Free / Snap to Object"
    >
      <span class="tool-icon">🎥</span>
      {#if $uiStore.breakpoint !== 'mobile'}
        <span class="tool-label">{$cameraStore.orbitMode === 'free' ? 'Free Cam' : 'Snap Cam'}</span>
      {/if}
    </button>
  </div>
</div>

<style>
  .sub-toolbar {
    position: absolute;
    top: 60px; /* Below top toolbar (44px) + some padding */
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 12px;
    background: var(--color-surface);
    backdrop-filter: blur(var(--backdrop-blur));
    -webkit-backdrop-filter: blur(var(--backdrop-blur));
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-panel);
    z-index: 20;
    transition: all 0.2s ease;
  }

  /* Make it slightly smaller on mobile */
  @media (max-width: 767px) {
    .sub-toolbar {
      top: 52px;
      padding: 4px 8px;
      gap: 4px;
    }
  }

  .toolbar-sep {
    width: 1px;
    height: 24px;
    background: var(--color-border);
  }

  .toolbar-group {
    display: flex;
    gap: 4px;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    color: var(--color-text-muted);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  /* Compact padding for icons only on mobile */
  @media (max-width: 767px) {
    .tool-btn {
      padding: 6px 10px;
    }
  }

  .tool-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .tool-btn.active {
    background: var(--color-accent-muted);
    border-color: transparent;
    color: var(--color-accent);
  }
  
  .snap-btn.active {
    background: var(--color-accent-muted);
    border-color: transparent;
    color: var(--color-accent);
  }

  .tool-icon {
    font-size: 15px;
  }
</style>
