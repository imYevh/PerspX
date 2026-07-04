<script lang="ts">
  import { cameraStore, updateCameraStore } from '$lib/stores/camera';

  // Handle input events to ensure we coerce to numbers and update store properly
  function onFovInput(e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value);
    updateCameraStore($cameraStore.mode, v, $cameraStore.roll);
  }

  function onRollInput(e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value);
    updateCameraStore($cameraStore.mode, $cameraStore.fov, v);
  }
</script>

<div class="viewport-controls">
  <div class="control-group">
    <div class="control-header">
      <span class="control-label">FIELD OF VIEW</span>
      <span class="control-value">{$cameraStore.fov.toFixed(0)}°</span>
    </div>
    <input type="range" min="10" max="120" step="1" 
           value={$cameraStore.fov} oninput={onFovInput} class="slider" />
  </div>

  <div class="control-group">
    <div class="control-header">
      <span class="control-label">HORIZON ROLL</span>
      <span class="control-value">{$cameraStore.roll.toFixed(0)}°</span>
    </div>
    <input type="range" min="-45" max="45" step="1" 
           value={$cameraStore.roll} oninput={onRollInput} class="slider" />
  </div>
</div>

<style>
  .viewport-controls {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 12px 24px;
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
    width: 140px;
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
</style>
