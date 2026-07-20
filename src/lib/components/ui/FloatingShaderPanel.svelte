<script lang="ts">
  import { shaderStore, SHADER_DEFS, setShaderParam } from '$lib/stores/shader.svelte';
  import { uiStore } from '$lib/stores/ui';
  
  let collapsed = $state(false);
  let visible = $state(true);
  
  let translateX = $state(0);
  let translateY = $state(0);
  let isDragging = false;
  let hasDragged = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialTx = 0;
  let initialTy = 0;

  function onPointerDown(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('.header-btn')) return;
    isDragging = true;
    hasDragged = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    initialTx = translateX;
    initialTy = translateY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    if (!hasDragged && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      hasDragged = true;
    }
    if (hasDragged) {
      translateX = initialTx + dx;
      translateY = initialTy + dy;
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (isDragging) {
      isDragging = false;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }
  
  $effect(() => {
    // Re-show panel when active shader changes (but not to 'none')
    if (shaderStore.active && shaderStore.active !== 'none') {
      visible = true;
    }

    const onMenuOpened = () => {
      if (shaderStore.active && shaderStore.active !== 'none') {
        visible = true;
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('perspx-shader-menu-opened', onMenuOpened);
      return () => {
        window.removeEventListener('perspx-shader-menu-opened', onMenuOpened);
      };
    }
  });
  
  function onShaderParamInput(key: string, value: number) {
    setShaderParam(key, value);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('perspx-shader-params-changed', {
        detail: { params: shaderStore.params[shaderStore.active] ?? {} }
      }));
    }
  }
</script>

{#if shaderStore.active !== 'none' && visible}
  {@const activeDef = SHADER_DEFS[shaderStore.active]}
  {@const activeParams = shaderStore.params[shaderStore.active]}
  <div 
    class="floating-shader-panel" 
    class:collapsed 
    class:mobile={$uiStore.breakpoint === 'mobile'}
    style="transform: translate({translateX}px, {translateY}px);"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="panel-header" 
      onpointerdown={onPointerDown}
      onpointermove={onPointerMove}
      onpointerup={onPointerUp}
      onpointercancel={onPointerUp}
      onclick={(e) => {
        if (hasDragged) return;
        if ((e.target as HTMLElement).closest('.header-btn')) return;
        collapsed = !collapsed;
      }}
    >
      <div class="header-left">
        <span class="shader-icon">{activeDef.icon}</span>
        <span class="shader-name">{activeDef.label} Settings</span>
      </div>
      <div class="header-actions">
        <button class="header-btn collapse-btn" onclick={() => collapsed = !collapsed}>{collapsed ? '▲' : '▼'}</button>
        <button class="header-btn close-btn" onclick={() => visible = false}>✕</button>
      </div>
    </div>
    
    {#if !collapsed}
      <div class="shader-params">
        {#each Object.entries(activeDef.params) as [key, paramDef]}
          <div class="sub-prop">
            <div class="sub-header">
              <span class="sub-label">{paramDef.label}</span>
              <div class="input-group">
                <button
                  class="reset-btn"
                  title="Reset to default"
                  onclick={(e) => { e.stopPropagation(); onShaderParamInput(key, paramDef.default); }}
                >
                  ⟲
                </button>
                <input
                  type="number"
                  min={paramDef.min}
                  max={paramDef.max}
                  step={paramDef.step}
                  value={Number(activeParams[key]).toFixed(paramDef.step < 1 ? 2 : 0)}
                  oninput={(e) => onShaderParamInput(key, parseFloat((e.target as HTMLInputElement).value))}
                  onclick={(e) => e.stopPropagation()}
                  class="num-input"
                />
              </div>
            </div>
            <input
              type="range"
              min={paramDef.min}
              max={paramDef.max}
              step={paramDef.step}
              value={activeParams[key]}
              ondblclick={(e) => { e.stopPropagation(); onShaderParamInput(key, paramDef.default); }}
              oninput={(e) => onShaderParamInput(key, parseFloat((e.target as HTMLInputElement).value))}
              onclick={(e) => e.stopPropagation()}
              class="slider"
            />
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .floating-shader-panel {
    position: absolute;
    top: 60px;
    right: 20px;
    width: 240px;
    max-height: calc(100svh - 150px);
    background: var(--color-surface);
    backdrop-filter: blur(var(--backdrop-blur));
    -webkit-backdrop-filter: blur(var(--backdrop-blur));
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: var(--shadow-panel);
    z-index: 100;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: width 0.2s;
  }
  
  .floating-shader-panel.mobile {
    top: 80px;
    right: 8px;
    width: 210px;
  }
  
  .floating-shader-panel.collapsed {
    width: auto;
    min-width: 140px;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    user-select: none;
    touch-action: none;
  }
  
  .floating-shader-panel.collapsed .panel-header {
    border-bottom: none;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .shader-icon {
    font-size: 14px;
    line-height: 1;
  }

  .shader-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .header-btn {
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    font-size: 10px;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }
  
  .header-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }
  
  .close-btn {
    font-size: 12px;
  }

  .shader-params {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    overflow-y: auto;
    flex-shrink: 1;
  }

  .sub-prop {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .sub-label {
    font-size: 11px;
    color: var(--color-text-muted);
  }
  .sub-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .input-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .reset-btn {
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    font-size: 14px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }
  .reset-btn:hover {
    color: var(--color-text);
    background: var(--color-surface-hover);
  }
  .num-input {
    width: 50px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    border-radius: 4px;
    padding: 2px 4px;
    font-size: 11px;
    text-align: right;
    outline: none;
  }
  .num-input:focus {
    border-color: var(--color-accent);
  }
  .slider {
    width: 100%;
  }
</style>
