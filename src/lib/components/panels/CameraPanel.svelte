<script lang="ts">
  import Panel from './Panel.svelte';
  import { cameraStore, updateCameraStore } from '$lib/stores/camera';
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

  function onFovInput(e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value);
    updateCameraStore({ fov: v });
  }

  function onRollInput(e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value);
    updateCameraStore({ roll: v });
  }





  function resetFov() {
    updateCameraStore({ fov: 50 });
  }

  function resetRoll() {
    updateCameraStore({ roll: 0 });
  }
</script>

<Panel title="Camera">
  <div class="cam-section">
    <div class="prop-title">Mode</div>
    <div class="mode-toggle">
      <button
        class="mode-btn"
        class:active={$cameraStore.mode === 'perspective'}
        onclick={() => setMode('perspective')}
      >Perspective</button>
      <button
        class="mode-btn"
        class:active={$cameraStore.mode === 'orthographic'}
        onclick={() => setMode('orthographic')}
      >Orthographic</button>
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

  {#if $cameraStore.mode === 'perspective'}
    <div class="cam-section">
      <div class="prop-header">
        <div class="prop-title">Field of View</div>
        <div class="value-row">
          <span class="control-value">{$cameraStore.fov.toFixed(0)}°</span>
          <button class="icon-btn" onclick={() => updateCameraStore({ zolly: false, fov: 50 })} title="Reset">⟲</button>
        </div>
      </div>
      <input type="range" min="1" max="179" step="1" value={$cameraStore.fov} 
             oninput={(e) => updateCameraStore({ zolly: false, fov: parseFloat((e.target as HTMLInputElement).value) })} 
             class="slider" />
    </div>

    <div class="cam-section">
      <div class="guidelines-toggle" style="margin-bottom: 8px;">
        <label class="toggle-label">
          <input type="checkbox" checked={$cameraStore.zolly} onchange={(e) => updateCameraStore({ zolly: (e.target as HTMLInputElement).checked })} />
          <span>Enable Dolly Zoom</span>
        </label>
      </div>
      {#if $cameraStore.zolly}
        <div class="prop-header">
          <div class="prop-title" style="color: var(--color-accent);">Zolly Angle</div>
          <div class="value-row">
            <span class="control-value">{$cameraStore.fov.toFixed(0)}°</span>
            <button class="icon-btn" onclick={() => updateCameraStore({ zolly: true, fov: 50 })} title="Reset">⟲</button>
          </div>
        </div>
        <input type="range" min="1" max="179" step="1" value={$cameraStore.fov} 
               oninput={(e) => updateCameraStore({ zolly: true, fov: parseFloat((e.target as HTMLInputElement).value) })} 
               class="slider" />
      {/if}
    </div>
  {/if}

  <div class="cam-section">
    <div class="prop-header">
      <div class="prop-title">Horizon Roll</div>
      <div class="value-row">
        <span class="control-value">{$cameraStore.roll.toFixed(0)}°</span>
        <button class="icon-btn" onclick={resetRoll} title="Reset Roll">⟲</button>
      </div>
    </div>
    <input type="range" min="-180" max="180" step="1" value={$cameraStore.roll} oninput={onRollInput} class="slider" />
  </div>


    <div class="cam-section">
      <div class="prop-header">
        <div class="prop-title">Fisheye</div>
        <div class="value-row">
          <span class="control-value">{$cameraStore.fisheyeIntensity.toFixed(1)}</span>
          <button class="icon-btn" onclick={() => updateCameraStore({ fisheyeIntensity: 0 })} title="Reset Fisheye">⟲</button>
        </div>
      </div>
      <input type="range" min="-50" max="50" step="0.1" 
             value={$cameraStore.fisheyeIntensity} 
             oninput={(e) => updateCameraStore({ fisheyeIntensity: parseFloat((e.target as HTMLInputElement).value) })} 
             class="slider" />
    </div>

    <div class="cam-section">
      <div class="prop-header">
        <div class="prop-title">Chromatic Aberration</div>
        <div class="value-row">
          <span class="control-value">{$cameraStore.chromaticAberrationIntensity.toFixed(2)}</span>
          <button class="icon-btn" onclick={() => updateCameraStore({ chromaticAberrationIntensity: 0 })} title="Reset">⟲</button>
        </div>
      </div>
      <input type="range" min="-1" max="1" step="0.01" 
             value={$cameraStore.chromaticAberrationIntensity} 
             oninput={(e) => updateCameraStore({ chromaticAberrationIntensity: parseFloat((e.target as HTMLInputElement).value) })} 
             class="slider" />
    </div>


    <div class="cam-section">
      <div class="prop-header">
        <div class="prop-title">Tilt-Shift</div>
        <div class="value-row">
          <button class="icon-btn" onclick={() => updateCameraStore({ tiltShiftPosition: 0.5, tiltShiftWidth: 0.2, tiltShiftIntensity: 0 })} title="Reset">⟲</button>
        </div>
      </div>
      <div class="sub-prop">
        <span class="sub-label">Position: {$cameraStore.tiltShiftPosition.toFixed(2)}</span>
        <input type="range" min="0" max="1" step="0.01" 
               value={$cameraStore.tiltShiftPosition} 
               oninput={(e) => updateCameraStore({ tiltShiftPosition: parseFloat((e.target as HTMLInputElement).value) })} 
               class="slider" />
      </div>
      <div class="sub-prop">
        <span class="sub-label">Width: {$cameraStore.tiltShiftWidth.toFixed(2)}</span>
        <input type="range" min="0" max="1" step="0.01" 
               value={$cameraStore.tiltShiftWidth} 
               oninput={(e) => updateCameraStore({ tiltShiftWidth: parseFloat((e.target as HTMLInputElement).value) })} 
               class="slider" />
      </div>
      <div class="sub-prop">
        <span class="sub-label">Intensity: {$cameraStore.tiltShiftIntensity.toFixed(2)}</span>
        <input type="range" min="0" max="1" step="0.01" 
               value={$cameraStore.tiltShiftIntensity} 
               oninput={(e) => updateCameraStore({ tiltShiftIntensity: parseFloat((e.target as HTMLInputElement).value) })} 
               class="slider" />
      </div>
    </div>

</Panel>

<style>
  .cam-section {
    margin-bottom: 12px;
  }

  .prop-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 6px;
  }

  .prop-title {
    font-size: 10px;
    font-weight: 700;
    color: var(--color-text-dim);
    text-transform: uppercase;
    letter-spacing: 0.7px;
    margin-bottom: 6px;
  }
  
  .prop-header .prop-title {
    margin-bottom: 0;
  }

  .sub-prop {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
  }

  .sub-label {
    font-size: 10px;
    color: var(--color-text-muted);
  }

  .mode-toggle {
    display: flex;
    gap: 4px;
  }

  .mode-btn {
    flex: 1;
    padding: 6px 4px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    color: var(--color-text-muted);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .mode-btn.active {
    background: var(--color-accent-muted);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .snap-cam-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    color: var(--color-text-muted);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .snap-cam-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .snap-cam-btn.active {
    background: color-mix(in srgb, #51cf66 12%, transparent);
    border-color: #51cf66;
    color: #51cf66;
  }

  .preset-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 3px;
  }

  .preset-btn {
    padding: 5px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text-muted);
    font-size: 11px;
    cursor: pointer;
    transition: all 0.12s;
  }

  .preset-btn:hover {
    background: var(--color-accent-muted);
    border-color: var(--color-accent);
    color: var(--color-text);
  }

  .value-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .control-value {
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .icon-btn {
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: 2px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    font-size: 12px;
  }

  .icon-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .icon-btn.locked {
    color: var(--color-danger);
  }

  .slider {
    margin-top: 4px;
  }

  .action-btn {
    width: 100%;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-size: 11px;
    font-weight: 500;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .emoji {
    font-size: 12px;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 11px;
    user-select: none;
    color: var(--color-text-muted);
  }
</style>
