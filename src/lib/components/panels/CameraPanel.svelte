<script lang="ts">
  import Panel from './Panel.svelte';
  import { cameraStore } from '$lib/stores/camera';
  import type { CameraController, CameraMode } from '$lib/camera/camera-controller';
  import { CAMERA_PRESETS, fovToFocalLength } from '$lib/camera/camera-presets';

  interface Props {
    cameraController: CameraController | undefined;
  }
  let { cameraController }: Props = $props();

  function setFOV(value: string) {
    const fov = parseFloat(value);
    if (!isNaN(fov) && cameraController) {
      cameraController.setFOV(fov);
      cameraStore.update(s => ({ ...s, fov }));
    }
  }

  function setMode(mode: CameraMode) {
    cameraController?.setMode(mode);
    cameraStore.update(s => ({ ...s, mode }));
  }

  function applyPreset(key: string) {
    const preset = CAMERA_PRESETS[key];
    if (!preset || !cameraController) return;
    cameraController.perspCamera.position.copy(preset.position);
    cameraController.target.copy(preset.target);
    cameraController.setFOV(preset.fov);
    cameraStore.update(s => ({ ...s, fov: preset.fov }));
  }

  const presetKeys = Object.keys(CAMERA_PRESETS);
</script>

<Panel title="📷 Camera">
  <div class="cam-section">
    <div class="prop-title">Mode</div>
    <div class="mode-toggle">
      <button
        class="mode-btn"
        class:active={$cameraStore.mode === 'perspective'}
        onclick={() => setMode('perspective')}
      >🔭 Perspective</button>
      <button
        class="mode-btn"
        class:active={$cameraStore.mode === 'orthographic'}
        onclick={() => setMode('orthographic')}
      >📐 Orthographic</button>
    </div>
  </div>

  {#if $cameraStore.mode === 'perspective'}
    <div class="cam-section">
      <div class="prop-title">Field of View</div>
      <div class="fov-row">
        <input
          type="range"
          min="5"
          max="150"
          step="1"
          value={$cameraStore.fov}
          oninput={(e) => setFOV((e.target as HTMLInputElement).value)}
          class="fov-slider"
        />
        <span class="fov-value">{$cameraStore.fov.toFixed(0)}°</span>
      </div>
      <div class="focal-len">≈ {fovToFocalLength($cameraStore.fov).toFixed(0)}mm</div>
    </div>

    <div class="cam-section">
      <div class="prop-title">Presets</div>
      <div class="preset-grid">
        {#each presetKeys as key}
          <button class="preset-btn" onclick={() => applyPreset(key)}>
            {CAMERA_PRESETS[key].name}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</Panel>

<style>
  .cam-section {
    margin-bottom: 12px;
  }

  .prop-title {
    font-size: 10px;
    font-weight: 700;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    margin-bottom: 6px;
  }

  .mode-toggle {
    display: flex;
    gap: 4px;
  }

  .mode-btn {
    flex: 1;
    padding: 6px 4px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 5px;
    color: #888;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .mode-btn.active {
    background: rgba(74, 158, 255, 0.15);
    border-color: rgba(74, 158, 255, 0.4);
    color: #4a9eff;
  }

  .fov-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .fov-slider {
    flex: 1;
    accent-color: #4a9eff;
  }

  .fov-value {
    font-size: 12px;
    color: #e0e0e0;
    font-family: monospace;
    min-width: 32px;
    text-align: right;
  }

  .focal-len {
    font-size: 11px;
    color: #555;
    text-align: right;
    margin-top: 2px;
  }

  .preset-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 3px;
  }

  .preset-btn {
    padding: 5px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 4px;
    color: #aaa;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.12s;
  }

  .preset-btn:hover {
    background: rgba(74, 158, 255, 0.1);
    border-color: rgba(74, 158, 255, 0.3);
    color: #ccc;
  }
</style>
