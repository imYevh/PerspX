<script lang="ts">
  import { cameraStore, updateCameraStore } from '$lib/stores/camera';
  import { uiStore } from '$lib/stores/ui';
  import { CAMERA_PRESETS } from '$lib/camera/camera-presets';
  import type { CameraController, CameraMode } from '$lib/camera/camera-controller';
  import type { SceneManager } from '$lib/core/scene';
  import { Vector3 } from 'three';
  import OverlaysDropdown from './ui/OverlaysDropdown.svelte';
  import ShadersDropdown from './ui/ShadersDropdown.svelte';

  interface Props {
    cameraController: CameraController | undefined;
    sceneManager: SceneManager | undefined;
  }
  let { cameraController, sceneManager }: Props = $props();

  let presetsOpen = $state(false);

  const presetKeys = Object.keys(CAMERA_PRESETS);

  function setMode(mode: CameraMode) {
    cameraController?.setMode(mode);
    updateCameraStore({ mode });
  }

  function toggleSnap() {
    updateCameraStore({ orbitMode: $cameraStore.orbitMode === 'snap' ? 'free' : 'snap' });
  }

  function applyPreset(key: string) {
    const preset = CAMERA_PRESETS[key];
    if (!preset || !cameraController) return;

    // If there's a selected object, offset preset position to orbit around it
    let target = preset.target.clone();
    if ($cameraStore.orbitMode === 'snap' && sceneManager) {
      const ids = sceneManager.getSelectedIds();
      if (ids.length > 0) {
        const obj = sceneManager.getObject(ids[0]);
        if (obj) obj.getWorldPosition(target);
      }
    }

    const offset = preset.position.clone().sub(preset.target);
    cameraController.applyState(target.clone().add(offset), target);
    cameraController.setFOV(preset.fov);
    updateCameraStore({ fov: preset.fov });
    presetsOpen = false;
  }

  function closePresets(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.presets-panel, .presets-btn')) {
      presetsOpen = false;
    }
  }
</script>

<svelte:window onclick={closePresets} />

<div class="compact-cam-bar glass">
  <!-- Perspective / Orthographic toggle -->
  <div class="btn-group">
    <button
      class="cam-btn"
      class:active={$cameraStore.mode === 'perspective'}
      onclick={() => setMode('perspective')}
      title="Perspective"
    >Perspective</button>
    <button
      class="cam-btn"
      class:active={$cameraStore.mode === 'orthographic'}
      onclick={() => setMode('orthographic')}
      title="Orthographic"
    >Orthographic</button>
  </div>

  <div class="sep"></div>

  <!-- Camera Presets -->
  <div class="presets-wrap">
    <button
      class="cam-btn presets-btn"
      class:active={presetsOpen}
      onclick={(e) => { e.stopPropagation(); presetsOpen = !presetsOpen; }}
      title="Camera Presets"
    >
      <span class="cam-label">Presets</span>
    </button>

    {#if presetsOpen}
      <div class="presets-panel glass">
        {#each presetKeys as key}
          <button class="preset-item" onclick={() => applyPreset(key)}>
            {CAMERA_PRESETS[key].name}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="sep"></div>

  <div class="dropdowns-wrap">
    <OverlaysDropdown align="right" />
    <ShadersDropdown align="right" />
  </div>
</div>

<style>
  .compact-cam-bar {
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 12px;
    background: var(--color-surface);
    backdrop-filter: blur(var(--backdrop-blur));
    -webkit-backdrop-filter: blur(var(--backdrop-blur));
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-panel);
    z-index: 20;
    max-width: calc(100% - 24px);
    box-sizing: border-box;
  }

  .btn-group {
    display: flex;
    gap: 2px;
  }

  .sep {
    width: 1px;
    height: 20px;
    background: var(--color-border);
  }

  .presets-wrap {
    position: relative;
  }

  .cam-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 7px;
    color: var(--color-text-muted);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .cam-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .cam-btn.active {
    background: var(--color-accent-muted);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .snap-btn.active {
    background: color-mix(in srgb, #51cf66 12%, transparent);
    border-color: #51cf66;
    color: #51cf66;
  }

  .cam-label {
    font-size: 12px;
  }

  /* Presets dropdown */
  .presets-panel {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-surface);
    backdrop-filter: blur(var(--backdrop-blur));
    -webkit-backdrop-filter: blur(var(--backdrop-blur));
    border: 1px solid var(--color-border);
    border-radius: 10px;
    box-shadow: var(--shadow-panel);
    padding: 6px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 3px;
    min-width: 180px;
    z-index: 30;
    animation: pop-in 0.15s ease;
  }

  @keyframes pop-in {
    from { opacity: 0; transform: translateX(-50%) translateY(-6px) scale(0.97); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  }

  .preset-item {
    padding: 6px 8px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    color: var(--color-text-muted);
    font-size: 11px;
    cursor: pointer;
    text-align: center;
    transition: all 0.12s;
    white-space: nowrap;
  }

  .preset-item:hover {
    background: var(--color-accent-muted);
    border-color: var(--color-accent);
    color: var(--color-text);
  }

  /* Touch-friendly on coarse pointer */
  @media (pointer: coarse) {
    .compact-cam-bar {
      top: 12px;
    }
    .cam-btn {
      min-height: 40px;
      min-width: 40px;
    }
  }
</style>
