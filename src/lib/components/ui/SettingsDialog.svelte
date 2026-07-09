<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { themeStore, setTheme, setAccent, THEME_MODES, ACCENT_PRESETS } from '$lib/stores/theme.svelte';

  interface Props {
    onClose: () => void;
  }
  
  let { onClose }: Props = $props();

  let isThemeDropdownOpen = $state(false);

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  function selectTheme(mode: any) {
    setTheme(mode);
    isThemeDropdownOpen = false;
  }

  let sliderValue = $derived(
    themeStore.accentSaturation === 0 
      ? (themeStore.accentLightness > 50 
          ? (themeStore.mode === 'light' || themeStore.mode === 'chromatic' ? 405 : -45)
          : (themeStore.mode === 'light' || themeStore.mode === 'chromatic' ? -45 : 405))
      : themeStore.accentHue
  );

  function handleSliderInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const val = Number(target.value);
    const isLight = themeStore.mode === 'light' || themeStore.mode === 'chromatic';
    
    if (val < 0) {
      setAccent(0, 0, isLight ? 15 : 100);
    } else if (val > 360) {
      setAccent(0, 0, isLight ? 100 : 15);
    } else {
      setAccent(val, undefined, undefined);
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="overlay" onclick={onClose} transition:fade={{ duration: 150 }}>
  <div class="dialog" onclick={(e) => { e.stopPropagation(); isThemeDropdownOpen = false; }} transition:fly={{ y: 20, duration: 200 }}>
    <div class="header">
      <h3 class="title">Settings</h3>
      <button class="close-btn" onclick={onClose}>×</button>
    </div>
    
    <div class="content">
      <div class="setting-group">
        <label>Base Theme</label>
        <div class="custom-select" onclick={(e) => e.stopPropagation()}>
          <button class="select-btn" onclick={() => isThemeDropdownOpen = !isThemeDropdownOpen}>
            {themeStore.mode.charAt(0).toUpperCase() + themeStore.mode.slice(1)}
            <span class="chevron">▼</span>
          </button>
          {#if isThemeDropdownOpen}
            <div class="select-menu" transition:fade={{ duration: 100 }}>
              {#each THEME_MODES as mode}
                <button class="select-item" class:active={themeStore.mode === mode} onclick={() => selectTheme(mode)}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="setting-group">
        <label>Accent Color Presets</label>
        <div class="presets">
          {#each ACCENT_PRESETS as preset}
            <button 
              class="preset-btn"
              class:active={themeStore.accentHue === preset.hue && (preset.name === 'White' ? themeStore.accentSaturation === 0 : themeStore.accentSaturation !== 0)}
              style="background: {preset.name === 'White' ? (themeStore.mode === 'light' || themeStore.mode === 'chromatic' ? '#151515' : '#ffffff') : `hsl(${preset.hue}, 80%, 60%)`};"
              title={preset.name}
              onclick={() => setAccent(preset.hue, preset.saturation, preset.name === 'White' ? (themeStore.mode === 'light' || themeStore.mode === 'chromatic' ? 15 : 100) : undefined)}
            ></button>
          {/each}
        </div>
      </div>

      <div class="setting-group">
        <label for="hue-slider">Custom Accent Color</label>
        <input 
          id="hue-slider"
          type="range" 
          min="-45" 
          max="405" 
          value={sliderValue} 
          oninput={handleSliderInput}
          class="hue-slider"
        />
      </div>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dialog {
    background: var(--color-surface);
    backdrop-filter: blur(var(--backdrop-blur));
    -webkit-backdrop-filter: blur(var(--backdrop-blur));
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 400px;
    box-shadow: var(--shadow-panel);
    color: var(--color-text);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    padding: 0 4px;
  }

  .close-btn:hover {
    color: var(--color-text);
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    font-size: 13px;
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .custom-select {
    position: relative;
    width: 100%;
  }

  .select-btn {
    width: 100%;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    outline: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .select-btn:focus {
    border-color: var(--color-accent);
  }

  .chevron {
    font-size: 10px;
    opacity: 0.7;
  }

  .select-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--color-surface-hover);
    backdrop-filter: blur(var(--backdrop-blur));
    -webkit-backdrop-filter: blur(var(--backdrop-blur));
    border: 1px solid var(--color-border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 100;
    display: flex;
    flex-direction: column;
    padding: 4px;
  }

  .select-item {
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: var(--color-text);
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    border-radius: 4px;
  }

  .select-item:hover {
    background: var(--color-surface-active);
  }

  .select-item.active {
    background: var(--color-accent);
    color: white;
  }

  .presets {
    display: flex;
    flex-wrap: nowrap;
    gap: 6px;
    overflow-x: auto;
    padding: 4px;
    margin: -4px;
  }

  .preset-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: transform 0.1s;
    padding: 0;
    flex-shrink: 0;
  }

  .preset-btn:hover {
    transform: scale(1.1);
  }

  .preset-btn.active {
    border-color: var(--color-text);
    box-shadow: 0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-text);
  }

  .hue-slider {
    width: 100%;
    -webkit-appearance: none;
    height: 6px;
    background: linear-gradient(to right, #ffffff 0%, #ff0000 10%, #ffff00 23.33%, #00ff00 36.66%, #00ffff 50%, #0000ff 63.33%, #ff00ff 76.66%, #ff0000 90%, #000000 100%);
    border-radius: 3px;
    outline: none;
  }

  .hue-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0,0,0,0.5);
  }
</style>
