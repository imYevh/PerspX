<script lang="ts">
  interface Props {
    value: number;
    step?: number;
    class?: string;
    oninput: (val: number) => void;
    onchange: () => void;
  }
  let { value, step = 1, class: className = '', oninput, onchange }: Props = $props();

  let isDragging = false;
  let isFocused = $state(false);
  let startX = 0;
  let startValue = 0;
  let inputElement: HTMLInputElement;

  function formatValue(v: number): string {
    return (v % 1 !== 0 ? v.toFixed(2) : v).toString();
  }

  // Update input value when prop changes, unless user is interacting with it
  $effect(() => {
    if (!isFocused && !isDragging && inputElement) {
      // Force read of value
      const v = value;
      if (parseFloat(inputElement.value) !== v) {
        inputElement.value = formatValue(v);
      }
    }
  });

  function handlePointerDown(e: PointerEvent) {
    // Only left click
    if (e.button !== 0) return;
    
    startX = e.clientX;
    startValue = value;
    isDragging = false;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      if (!isDragging && Math.abs(dx) > 2) {
        isDragging = true;
        inputElement.blur(); // Remove focus to hide cursor while dragging
        // Prevent body selection and set cursor
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
      }
      if (isDragging) {
        moveEvent.preventDefault();
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

<input 
  bind:this={inputElement}
  type="number"
  class={className}
  {step}
  onfocus={() => isFocused = true}
  onblur={() => isFocused = false}
  onpointerdown={handlePointerDown}
  oninput={handleInput}
  onchange={handleChange}
/>

<style>
  input {
    cursor: ew-resize; /* Let user know they can drag */
  }
  /* Hide the native up/down arrows */
  input[type="number"] {
    -moz-appearance: textfield;
  }
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  /* When typing, revert cursor to text */
  input:focus {
    cursor: text;
  }
</style>
