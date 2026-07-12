<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { themeStore, setTheme, setAccent, THEME_MODES, ACCENT_PRESETS } from '$lib/stores/theme.svelte';
  import { appModeStore, setAppMode, APP_MODES, APP_MODE_LABELS, APP_MODE_DESCRIPTIONS } from '$lib/stores/appMode.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';

  interface Props {
    onClose: () => void;
  }
  
  let { onClose }: Props = $props();

  let isThemeDropdownOpen = $state(false);
  let isModeDropdownOpen = $state(false);
  
  let confirmDialog = $state<{ newMode: any } | null>(null);

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  function selectTheme(themeMode: any) {
    setTheme(themeMode);
    isThemeDropdownOpen = false;
  }

  function selectMode(newMode: any) {
    if (newMode === appModeStore.mode) {
      isModeDropdownOpen = false;
      return;
    }
    confirmDialog = { newMode };
    isModeDropdownOpen = false;
  }

  function confirmModeSwitch() {
    if (confirmDialog) {
      setAppMode(confirmDialog.newMode);
      confirmDialog = null;
    }
  }

  function cancelModeSwitch() {
    confirmDialog = null;
  }

  let sliderValue = $derived(
    themeStore.accentSaturation === 0 
      ? ((themeStore.accentLightness ?? 50) > 50 ? -45 : 405)
      : themeStore.accentHue
  );

  function handleSliderInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const val = Number(target.value);
    
    if (val < 0 || val > 360) {
      const isLight = themeStore.mode === 'light';
      const isChromatic = themeStore.mode === 'chromatic';
      const defaultLit = isChromatic ? 45 : (isLight ? 50 : 64);
      const defaultSat = (isLight || isChromatic) ? 85 : 90;
      
      if (val < 0) {
        const progress = Math.abs(val) / 45; // 0 to 1
        const s = defaultSat - (defaultSat * progress);
        const l = defaultLit + ((100 - defaultLit) * progress);
        setAccent(0, Math.round(s), Math.round(l));
      } else {
        const progress = (val - 360) / 45; // 0 to 1
        const s = defaultSat - (defaultSat * progress);
        const l = defaultLit - ((defaultLit - 15) * progress);
        setAccent(360, Math.round(s), Math.round(l));
      }
    } else {
      setAccent(val, undefined, undefined);
    }
  }

  function closeAllDropdowns() {
    isThemeDropdownOpen = false;
    isModeDropdownOpen = false;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="overlay" onclick={onClose} transition:fade={{ duration: 150 }}>
  <div class="dialog" onclick={(e) => { e.stopPropagation(); closeAllDropdowns(); }} transition:fly={{ y: 20, duration: 200 }}>
    <div class="header">
      <h3 class="title">Settings</h3>
      <button class="close-btn" onclick={onClose}>×</button>
    </div>
    
    <div class="content">
      <!-- Application Mode -->
      <div class="setting-group">
        <label>Application Mode</label>
        <div class="custom-select" onclick={(e) => e.stopPropagation()}>
          <button class="select-btn" id="mode-select-btn" onclick={() => { isModeDropdownOpen = !isModeDropdownOpen; isThemeDropdownOpen = false; }}>
            {APP_MODE_LABELS[appModeStore.mode]}
            <span class="chevron">▼</span>
          </button>
          {#if isModeDropdownOpen}
            <div class="select-menu" transition:fade={{ duration: 100 }}>
              {#each APP_MODES as m}
                <button class="select-item" class:active={appModeStore.mode === m} onclick={() => selectMode(m)}>
                  <span class="mode-label">{APP_MODE_LABELS[m]}</span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
        <p class="setting-hint">{APP_MODE_DESCRIPTIONS[appModeStore.mode]}</p>
      </div>

      <div class="setting-divider"></div>

      <!-- Base Theme -->
      <div class="setting-group">
        <label>Base Theme</label>
        <div class="custom-select" onclick={(e) => e.stopPropagation()}>
          <button class="select-btn" onclick={() => { isThemeDropdownOpen = !isThemeDropdownOpen; isModeDropdownOpen = false; }}>
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
              class:active={themeStore.accentHue === preset.hue && (preset.saturation !== undefined ? (themeStore.accentSaturation === preset.saturation && themeStore.accentLightness === preset.lightness) : themeStore.accentSaturation !== 0)}
              style="background: {preset.saturation !== undefined ? `hsl(${preset.hue}, ${preset.saturation}%, ${preset.lightness}%)` : `hsl(${preset.hue}, 80%, 60%)`};"
              title={preset.name}
              onclick={() => setAccent(preset.hue, preset.saturation, preset.lightness)}
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
    padding: 20px;
    width: calc(100% - 32px);
    max-width: 380px;
    box-sizing: border-box;
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

  .setting-divider {
    height: 1px;
    background: var(--color-border);
    margin: 0 -4px;
  }

  label {
    font-size: 13px;
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .setting-hint {
    font-size: 11px;
    color: var(--color-text-dim);
    margin: 0;
    line-height: 1.4;
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
    background: var(--color-dropdown-bg, var(--color-surface-hover));
    backdrop-filter: blur(var(--backdrop-blur));
    -webkit-backdrop-filter: blur(var(--backdrop-blur));
    border: 1px solid var(--color-border);
    border-radius: 6px;
    box-shadow: var(--shadow-panel);
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
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .select-item:hover {
    background: var(--color-surface-active);
  }

  .select-item.active {
    background: var(--color-accent);
    color: var(--color-accent-text, white);
  }

  .mode-label {
    font-size: 14px;
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
    height: 4px;
    background: linear-gradient(to right, #ffffff 0%, #ff0000 10%, #ffff00 23.33%, #00ff00 36.66%, #00ffff 50%, #0000ff 63.33%, #ff00ff 76.66%, #ff0000 90%, #000000 100%);
    border-radius: 2px;
    outline: none;
  }

  .hue-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: white;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0,0,0,0.5);
  }
</style>

{#if confirmDialog}
  <ConfirmDialog
    title="Switch Application Mode"
    message="Are you sure you want to switch modes? This action will reset the scene and all added objects will be hidden or lost."
    danger={true}
    onConfirm={confirmModeSwitch}
    onCancel={cancelModeSwitch}
  />
{/if}
