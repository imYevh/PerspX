<script lang="ts">
  interface Props {
    value?: number;
    getValue?: () => number;
    step?: number;
    min?: number;
    max?: number;
    slider?: boolean;
    class?: string;
    tick?: number;
    oninput: (val: number) => void;
    onchange: () => void;
  }
  let { value, getValue, step = 1, min, max, slider = false, class: className = '', tick = 0, oninput, onchange }: Props = $props();

  let isDragging = false;
  let isFocused = $state(false);
  let startX = 0;
  let startValue = 0;
  let inputElement: HTMLInputElement;

  function formatValue(v: number): string {
    return (v % 1 !== 0 ? v.toFixed(2) : v).toString();
  }

  function getCurrentValue(): number {
    return getValue ? getValue() : (value ?? 0);
  }

  // Update input value when prop changes, unless user is interacting with it
  $effect(() => {
    const _ = tick; // Force Svelte to run this effect every frame
    if (!isFocused && !isDragging && inputElement) {
      // Force read of value
      const v = getCurrentValue();
      if (parseFloat(inputElement.value) !== v) {
        inputElement.value = formatValue(v);
      }
    }
  });

  function handlePointerDown(e: PointerEvent) {
    // Only left click
    if (e.button !== 0) return;
    
    startX = e.clientX;
    startValue = getCurrentValue();
    isDragging = false;
    let accumulatedDx = 0;

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!isDragging) {
        const dx = moveEvent.clientX - startX;
        if (Math.abs(dx) > 2) {
          isDragging = true;
          inputElement.blur(); // Remove focus to hide cursor while dragging
          try {
            inputElement.requestPointerLock();
          } catch (err) {
            console.warn("Pointer lock request failed", err);
          }
          // Prevent body selection and set cursor
          document.body.style.cursor = 'ew-resize';
          document.body.style.userSelect = 'none';
        }
      }
      
      if (isDragging) {
        moveEvent.preventDefault();
        
        let dx = 0;
        if (document.pointerLockElement === inputElement) {
          accumulatedDx += moveEvent.movementX;
          dx = accumulatedDx;
        } else {
          dx = moveEvent.clientX - startX;
        }

        const multiplier = moveEvent.shiftKey ? 10 : moveEvent.altKey ? 0.1 : 1;
        // For rotation (step 1), 1px = 1 unit. For position (step 0.1), 10px = 1 unit
        const sensitivity = step; 
        const newValue = startValue + dx * sensitivity * multiplier;
        inputElement.value = formatValue(newValue);
        oninput(newValue);
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      
      if (document.pointerLockElement === inputElement) {
        document.exitPointerLock();
      }
      
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      if (isDragging) {
        onchange(); // Commit history
      } else {
        // It was just a click, focus so user can type
        inputElement.focus();
      }
      isDragging = false;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
  }
  
  function handleInput(e: Event) {
    if (isDragging) return; // handled by pointer move
    const target = e.target as HTMLInputElement;
    const val = parseFloat(target.value);
    if (!isNaN(val)) {
      oninput(val);
    }
  }
  
  function handleChange() {
    if (isDragging) return;
    onchange();
  }
</script>

<div class="scrub-wrapper {className}" class:has-slider={slider}>
  <input 
    bind:this={inputElement}
    type="number"
    class="num-input"
    {step}
    onfocus={() => isFocused = true}
    onblur={() => isFocused = false}
    onpointerdown={handlePointerDown}
    oninput={handleInput}
    onchange={handleChange}
  />
  {#if slider}
    <input 
      type="range" 
      class="range-input" 
      {min} {max} {step}
      value={getCurrentValue()}
      oninput={handleInput}
      onchange={handleChange}
    />
  {/if}
</div>

<style>
  .scrub-wrapper {
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .num-input {
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    width: 100%;
    padding: 0;
    outline: none;
    cursor: ew-resize;
  }

  .range-input {
    width: 100%;
    margin: 4px 0 0 0;
    cursor: pointer;
    display: none; /* Hidden by default on desktop */
  }

  /* Show sliders only on touch devices/mobile */
  @media (pointer: coarse) {
    .range-input {
      display: block;
    }
    .scrub-wrapper.has-slider {
      padding-bottom: 6px;
    }
  }

  /* Hide the native up/down arrows */
  .num-input[type="number"] {
    -moz-appearance: textfield;
  }
  .num-input[type="number"]::-webkit-outer-spin-button,
  .num-input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  /* When typing, revert cursor to text */
  .num-input:focus {
    cursor: text;
  }
</style>
