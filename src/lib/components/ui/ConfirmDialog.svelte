<script lang="ts">
  import { fade, fly } from 'svelte/transition';

  interface Props {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }
  
  let { 
    title, 
    message, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel', 
    danger = false,
    onConfirm, 
    onCancel 
  }: Props = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter') onConfirm();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="overlay" onclick={onCancel} transition:fade={{ duration: 150 }}>
  <div class="dialog" onclick={(e) => e.stopPropagation()} transition:fly={{ y: 20, duration: 200 }}>
    <h3 class="title">{title}</h3>
    <p class="message">{message}</p>
    <div class="actions">
      <button class="btn cancel-btn" onclick={onCancel}>{cancelText}</button>
      <button class="btn confirm-btn" class:danger onclick={onConfirm}>{confirmText}</button>
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

  .title {
    margin: 0 0 12px 0;
    font-size: 18px;
    font-weight: 600;
  }

  .message {
    margin: 0 0 24px 0;
    font-size: 14px;
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .cancel-btn {
    background: var(--color-bg);
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
  }

  .cancel-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .confirm-btn {
    background: var(--color-accent);
    color: white;
  }

  .confirm-btn:hover {
    background: var(--color-accent-hover);
  }

  .confirm-btn.danger {
    background: var(--color-danger);
  }

  .confirm-btn.danger:hover {
    background: #dc2626; /* Slightly darker danger hover */
  }
</style>
