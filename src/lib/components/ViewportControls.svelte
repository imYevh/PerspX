<script lang="ts">
  import { cameraStore, updateCameraStore } from '$lib/stores/camera';
  import { environmentStore } from '$lib/stores/environment';
  import ScrubInput from './panels/ScrubInput.svelte';

  // These will be passed in from +page.svelte to handle the actual 3D updates if needed,
  // though the loop usually syncs from stores. However, since the loop only syncs TO the store,
  // we might need to dispatch an event or directly update the controllers if they don't listen to the store.
  // For simplicity, we can dispatch updates to the +page.svelte via a callback or rely on the store.

  let fov = $state($cameraStore.fov);
  let roll = $state($cameraStore.roll);
  let sunElev = $state($environmentStore.sunElevation);

  // Sync state -> store
  $effect(() => {
    updateCameraStore($cameraStore.mode, fov, roll);
  });

  $effect(() => {
    environmentStore.set({ sunElevation: sunElev });
  });

  // Sync store -> state (if changed elsewhere)
  $effect(() => { fov = $cameraStore.fov; });
  $effect(() => { roll = $cameraStore.roll; });
  $effect(() => { sunElev = $environmentStore.sunElevation; });

</script>

<div class="viewport-controls">
  <div class="control-group">
    <div class="control-header">
      <span class="control-label">FIELD OF VIEW</span>
      <span class="control-value">{fov.toFixed(0)}°</span>
    </div>
    <input type="range" min="10" max="120" step="1" bind:value={fov} class="slider" />
  </div>

  <div class="control-group">
    <div class="control-header">
      <span class="control-label">SUN ELEVATION</span>
      <span class="control-value">{sunElev.toFixed(0)}°</span>
    </div>
    <input type="range" min="5" max="85" step="1" bind:value={sunElev} class="slider" />
  </div>

  <div class="control-group">
    <div class="control-header">
      <span class="control-label">HORIZON ROLL</span>
      <span class="control-value">{roll.toFixed(0)}°</span>
    </div>
    <input type="range" min="-45" max="45" step="1" bind:value={roll} class="slider" />
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
