<script lang="ts">
  import type { TransformSystem } from '$lib/transforms/transform-controls';
  import { uiStore } from '$lib/stores/ui';
  import { cameraStore, updateCameraStore } from '$lib/stores/camera';
  import type { TransformMode } from '$lib/transforms/transform-controls';

  import selectIcon from '$lib/assets/select.svg?raw';
  import moveIcon from '$lib/assets/move.svg?raw';
  import rotateIcon from '$lib/assets/rotate.svg?raw';
  import scaleIcon from '$lib/assets/scale.svg?raw';
  import freeCamIcon from '$lib/assets/free cam.svg?raw';
  import focusCamIcon from '$lib/assets/focus cam.svg?raw';
  import snapToGridIcon from '$lib/assets/snap to grid.svg?raw';
  import OverlaysDropdown from './ui/OverlaysDropdown.svelte';
  import ShadersDropdown from './ui/ShadersDropdown.svelte';

  import Dropdown from './ui/Dropdown.svelte';
  import { shaderStore, SHADER_DEFS, SHADER_ORDER, setShader, setShaderParam, type ShaderType } from '$lib/stores/shader.svelte';
  import { formatShortcut } from '$lib/stores/shortcuts.svelte';

  interface Props {
    transformSystem: TransformSystem | undefined;
  }
  
  let { transformSystem }: Props = $props();

  const modes: { key: TransformMode; label: string; icon: string; shortcutId: string }[] = [
    { key: 'select', label: 'Select', icon: selectIcon, shortcutId: 'cancel' },
    { key: 'translate', label: 'Move', icon: moveIcon, shortcutId: 'mode_translate' },
    { key: 'rotate', label: 'Rotate', icon: rotateIcon, shortcutId: 'mode_rotate' },
    { key: 'scale', label: 'Scale', icon: scaleIcon, shortcutId: 'mode_scale' },
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

  {#snippet subToolbarActions()}
    <div class="toolbar-group">
      {#each modes as mode}
        <button
          class="tool-btn"
          class:active={$uiStore.transformMode === mode.key}
          onclick={() => setMode(mode.key)}
          title="{$uiStore.breakpoint === 'mobile' ? mode.label : `${mode.label} (${formatShortcut(mode.shortcutId)})`}"
        >
          <span class="tool-icon">{@html mode.icon}</span>
          <span class="tool-label">{mode.label}</span>
        </button>
      {/each}
    </div>

    <div class="toolbar-sep hide-on-mobile-dropdown"></div>

    <div class="toolbar-group">
      <button
        class="tool-btn snap-btn"
        class:active={$uiStore.snapEnabled}
        onclick={toggleSnapping}
        title="Toggle Snapping"
      >
        <span class="tool-icon">{@html snapToGridIcon}</span>
        <span class="tool-label">Snap</span>
      </button>
    </div>

    <div class="toolbar-sep hide-on-mobile-dropdown"></div>

    <div class="toolbar-group">
      <button
        class="tool-btn camera-focus-btn"
        class:active={$cameraStore.orbitMode === 'focus'}
        onclick={() => updateCameraStore({ orbitMode: $cameraStore.orbitMode === 'free' ? 'focus' : 'free' })}
        title="Camera: Free / Focus Object"
      >
        <span class="tool-icon">{@html $cameraStore.orbitMode === 'free' ? freeCamIcon : focusCamIcon}</span>
        <span class="tool-label">{$cameraStore.orbitMode === 'free' ? 'Free Cam' : 'Focus Object'}</span>
      </button>
    </div>

    <div class="toolbar-sep hide-on-mobile-dropdown"></div>

    <div class="toolbar-group">
      <OverlaysDropdown align={$uiStore.breakpoint === 'mobile' ? 'center' : 'right'} />
      <ShadersDropdown align={$uiStore.breakpoint === 'mobile' ? 'center' : 'right'} />
    </div>
  {/snippet}

  {#if $uiStore.breakpoint === 'mobile'}
    <div class="sub-toolbar-mobile glass">
      {@render subToolbarActions()}
    </div>
  {:else}
    <div class="sub-toolbar glass">
      {@render subToolbarActions()}
    </div>
  {/if}

<style>
  .sub-toolbar {
    position: absolute;
    top: 16px; /* Positioned relative to viewport-wrapper */
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
    max-width: calc(100% - 24px); /* Adaptive width: never overflow parent container */
    box-sizing: border-box;
  }

  /* Make it slightly smaller on mobile */
  @media (max-width: 767px) {
    .sub-toolbar {
      top: 12px;
      padding: 4px 8px;
      gap: 4px;
    }
  }

  .sub-toolbar-mobile {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 4px;
    border-radius: 12px;
    background: var(--color-surface);
    backdrop-filter: blur(var(--backdrop-blur));
    -webkit-backdrop-filter: blur(var(--backdrop-blur));
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-panel);
    z-index: 20;
    transition: all 0.2s ease;
    padding: 4px 8px;
    max-width: calc(100% - 24px);
    overflow-x: auto;
    box-sizing: border-box;
  }
  
  @media (max-width: 767px) {
    .hide-on-mobile-dropdown {
      display: none;
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

  .tool-label {
    display: inline-block;
  }

  /* Hide labels on tablet/smaller desktop screen widths to stay compact and prevent panel overlaps */
  @media (max-width: 1024px) {
    .tool-label {
      display: none;
    }
    .tool-btn {
      padding: 6px 10px;
    }
    .sub-toolbar {
      gap: 4px;
    }
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .tool-icon :global(svg) {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }

  @media (min-width: 1025px) {
    .camera-focus-btn {
      min-width: 96px;
      justify-content: center;
    }
  }

  /* Touch-friendly targets */
  @media (pointer: coarse) {
    .tool-btn {
      min-height: 44px;
      min-width: 44px;
    }

    .sub-toolbar {
      flex-wrap: nowrap;
      overflow-x: auto;
    }
  }
  
</style>
