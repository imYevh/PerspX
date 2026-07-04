<script lang="ts">
  import { cameraStore, updateCameraStore } from '$lib/stores/camera';

  // Handle input events to ensure we coerce to numbers and update store properly
  function onFovInput(e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value);
    updateCameraStore({ fov: v });
  }

  function onRollInput(e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value);
    updateCameraStore({ roll: v });
  }

  function toggleZolly() {
    updateCameraStore({ zolly: !$cameraStore.zolly });
  }

  function resetFov() {
    updateCameraStore({ fov: 50 });
  }

  function resetRoll() {
    updateCameraStore({ roll: 0 });
  }
</script>

<div class="viewport-controls">
  {#if $cameraStore.mode === 'perspective'}
    <div class="control-group">
      <div class="control-header">
        <span class="control-label">FIELD OF VIEW</span>
        <div class="value-row">
          <span class="control-value">{$cameraStore.fov.toFixed(0)}°</span>
          <button class="icon-btn" onclick={resetFov} title="Reset FOV">⟲</button>
          <button class="icon-btn" class:locked={$cameraStore.zolly} onclick={toggleZolly} title="Toggle Dolly Zoom (Zolly)">
            {#if $cameraStore.zolly}
              <span>🔒</span>
            {:else}
              <span>🔓</span>
            {/if}
          </button>
        </div>
      </div>
      <input type="range" min="1" max="179" step="1" 
             value={$cameraStore.fov} oninput={onFovInput} class="slider" />
    </div>
  {/if}

  <div class="control-group">
    <div class="control-header">
      <span class="control-label">HORIZON ROLL</span>
      <div class="value-row">
        <span class="control-value">{$cameraStore.roll.toFixed(0)}°</span>
        <button class="icon-btn" onclick={resetRoll} title="Reset Roll">⟲</button>
      </div>
    </div>
    <input type="range" min="-180" max="180" step="1" 
           value={$cameraStore.roll} oninput={onRollInput} class="slider" />
  </div>

  {#if $cameraStore.mode === 'perspective'}
    <div class="control-group fisheye-group">
      <div class="control-header">
        <span class="control-label">EFFECTS</span>
      </div>
      <button class="toggle-btn" class:active={$cameraStore.fisheye} onclick={() => updateCameraStore({ fisheye: !$cameraStore.fisheye })}>
        <span class="emoji">🐟</span> Fisheye
      </button>
    </div>
  {/if}
</div>

<style>
  .viewport-controls {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 32px;
    padding: 12px 28px;
    background: rgba(15, 15, 26, 0.85);
    backdrop-filter: blur(12px);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    z-index: 10;
    user-select: none;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 170px;
  }

  .control-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .control-label {
    font-size: 11px;
    font-weight: 600;
    color: #888;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .control-value {
    font-size: 13px;
    font-weight: 500;
    color: #eee;
    font-variant-numeric: tabular-nums;
  }

  .value-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .icon-btn {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 2px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .icon-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #eee;
  }

  .icon-btn.locked {
    color: #ff6b6b;
  }

  .slider {
    -webkit-appearance: none;
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    outline: none;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ff6b6b; /* Vibrant coral red like the screenshot */
    cursor: pointer;
    transition: transform 0.1s;
  }

  .slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ff6b6b;
    cursor: pointer;
    border: none;
    transition: transform 0.1s;
  }

  .slider::-moz-range-thumb:hover {
    transform: scale(1.2);
  }

  .fisheye-group {
    width: 80px;
    justify-content: space-between;
  }

  .toggle-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #aaa;
    font-size: 11px;
    font-weight: 500;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.2s;
  }

  .toggle-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #eee;
  }

  .toggle-btn.active {
    background: rgba(74, 158, 255, 0.15);
    border-color: rgba(74, 158, 255, 0.4);
    color: #4a9eff;
  }

  .emoji {
    font-size: 12px;
  }
</style>
