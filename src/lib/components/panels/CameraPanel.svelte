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
    
    // Apply position and target properly through the controller's internal state
    cameraController.applyState(preset.position, preset.target);
    
    cameraController.setFOV(preset.fov);
    cameraStore.update(s => ({ ...s, fov: preset.fov }));
  }

  let presetKeys = $derived(
    $cameraStore.mode === 'orthographic'
      ? Object.keys(CAMERA_PRESETS).slice(0, 6)
      : Object.keys(CAMERA_PRESETS)
  );
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
