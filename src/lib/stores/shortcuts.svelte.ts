import { get, writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface ShortcutBinding {
  code: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export interface ShortcutDefinition {
  id: string;
  label: string;
  group: string;
  defaultBindings: ShortcutBinding[];
  bindings?: ShortcutBinding[]; // Current bindings, overriding default if defined (empty array means unbound)
}

const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  // Global
  { id: 'toggle_grid', label: 'Toggle Grid', group: 'Global', defaultBindings: [{ code: 'Digit1' }] },
  { id: 'toggle_vanishing', label: 'Toggle Vanishing Point', group: 'Global', defaultBindings: [{ code: 'Digit2' }] },
  
  // Edit & History
  { id: 'undo', label: 'Undo', group: 'Edit & History', defaultBindings: [{ code: 'KeyZ', ctrl: true }] },
  { id: 'redo', label: 'Redo', group: 'Edit & History', defaultBindings: [{ code: 'KeyZ', ctrl: true, shift: true }, { code: 'KeyY', ctrl: true }] },
  { id: 'copy', label: 'Copy', group: 'Edit & History', defaultBindings: [{ code: 'KeyC', ctrl: true }] },
  { id: 'cut', label: 'Cut', group: 'Edit & History', defaultBindings: [{ code: 'KeyX', ctrl: true }] },
  { id: 'paste', label: 'Paste', group: 'Edit & History', defaultBindings: [{ code: 'KeyV', ctrl: true }] },
  { id: 'duplicate', label: 'Duplicate', group: 'Edit & History', defaultBindings: [{ code: 'KeyD', ctrl: true }] },

  // Selection & Objects
  { id: 'select_all', label: 'Select All', group: 'Selection & Objects', defaultBindings: [{ code: 'KeyA', ctrl: true }] },
  { id: 'cancel', label: 'Deselect All / Detach', group: 'Selection & Objects', defaultBindings: [{ code: 'Escape' }] },
  { id: 'delete', label: 'Delete', group: 'Selection & Objects', defaultBindings: [{ code: 'Delete' }, { code: 'Backspace' }] },
  { id: 'rename', label: 'Rename', group: 'Selection & Objects', defaultBindings: [{ code: 'F2' }] },

  // Transform Modes
  { id: 'mode_translate', label: 'Move (Translate)', group: 'Transform Modes', defaultBindings: [{ code: 'KeyG' }, { code: 'KeyT' }] },
  { id: 'mode_rotate', label: 'Rotate', group: 'Transform Modes', defaultBindings: [{ code: 'KeyR' }] },
  { id: 'mode_scale', label: 'Scale', group: 'Transform Modes', defaultBindings: [{ code: 'KeyS' }] },
  { id: 'toggle_space', label: 'Toggle Transform Space', group: 'Transform Modes', defaultBindings: [{ code: 'KeyX' }] },
];

const STORAGE_KEY = 'perspx-shortcuts';

function createShortcutsStore() {
  const { subscribe, set, update } = writable<ShortcutDefinition[]>(DEFAULT_SHORTCUTS);

  if (browser) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: Record<string, ShortcutBinding[]> = JSON.parse(stored);
        const initial = DEFAULT_SHORTCUTS.map(def => ({
          ...def,
          bindings: parsed[def.id]
        }));
        set(initial);
      } catch (e) {
        console.warn('Failed to parse shortcuts from local storage', e);
      }
    }
  }

  return {
    subscribe,
    updateBinding: (id: string, binding: ShortcutBinding | null) => {
      update(defs => {
        let isNoOp = false;
        const targetDef = defs.find(d => d.id === id);
        
        if (targetDef && binding) {
          const activeBindings = targetDef.bindings !== undefined ? targetDef.bindings : targetDef.defaultBindings;
          if (activeBindings.length === 1) {
            const b = activeBindings[0];
            if (b.code === binding.code && !!b.ctrl === !!binding.ctrl && !!b.shift === !!binding.shift && !!b.alt === !!binding.alt) {
              isNoOp = true;
            }
          }
        }

        if (isNoOp) return defs;

        let next = defs.map(def => {
          if (def.id === id) {
            let newBindings: ShortcutBinding[] | undefined = binding ? [binding] : undefined;
            
            // If the assigned binding matches the default exactly, just reset to undefined (default)
            if (binding && def.defaultBindings.length === 1) {
              const db = def.defaultBindings[0];
              if (db.code === binding.code && !!db.ctrl === !!binding.ctrl && !!db.shift === !!binding.shift && !!db.alt === !!binding.alt) {
                newBindings = undefined;
              }
            }

            return {
              ...def,
              bindings: newBindings
            };
          }
          return def;
        });

        // Resolve conflicts: remove the newly active bindings from all other actions
        const nextTargetDef = next.find(d => d.id === id);
        if (nextTargetDef) {
          const targetBindings = nextTargetDef.bindings !== undefined ? nextTargetDef.bindings : nextTargetDef.defaultBindings;
          
          if (targetBindings.length > 0) {
            next = next.map(def => {
              if (def.id === id) return def;

              const activeBindings = def.bindings !== undefined ? def.bindings : def.defaultBindings;
              const newBindings = activeBindings.filter(b => {
                return !targetBindings.some(tb => 
                  tb.code === b.code && !!tb.ctrl === !!b.ctrl && !!tb.shift === !!b.shift && !!tb.alt === !!b.alt
                );
              });

              if (newBindings.length !== activeBindings.length) {
                return { ...def, bindings: newBindings };
              }
              return def;
            });
          }
        }

        if (browser) {
          const toSave: Record<string, ShortcutBinding[]> = {};
          next.forEach(d => {
            if (d.bindings !== undefined) toSave[d.id] = d.bindings;
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        }

        return next;
      });
    },
    resetAll: () => {
      set(DEFAULT_SHORTCUTS);
      if (browser) localStorage.removeItem(STORAGE_KEY);
    }
  };
}

export const shortcutsStore = createShortcutsStore();

function formatBinding(b: ShortcutBinding): string {
  const parts = [];
  
  // Try to figure out Mac vs Windows if needed, but 'Ctrl' is generally understood
  // and we'll use a generic string representation.
  const isMac = browser ? navigator.platform.toUpperCase().indexOf('MAC') >= 0 : false;
  const ctrlLabel = isMac ? 'Cmd' : 'Ctrl';

  if (b.ctrl) parts.push(ctrlLabel);
  if (b.alt) parts.push('Alt');
  if (b.shift) parts.push('Shift');

  let key = b.code;
  if (key.startsWith('Key')) key = key.slice(3);
  else if (key.startsWith('Digit')) key = key.slice(5);
  else if (key === 'Escape') key = 'Esc';
  else if (key === 'Delete') key = 'Del';
  else if (key === 'Backspace') key = 'Backspace';
  else if (key.startsWith('Arrow')) key = key.slice(5);
  
  parts.push(key);
  return parts.join('+');
}

let currentShortcuts = DEFAULT_SHORTCUTS;
shortcutsStore.subscribe(v => currentShortcuts = v);

export function formatShortcut(id: string): string {
  const def = currentShortcuts.find(d => d.id === id);
  if (!def) return '';

  const activeBindings = def.bindings !== undefined ? def.bindings : def.defaultBindings;
  if (activeBindings.length === 0) return 'Unbound';
  return activeBindings.map(formatBinding).join(' / ');
}

export function matchShortcut(e: KeyboardEvent, id: string): boolean {
  const def = currentShortcuts.find(d => d.id === id);
  if (!def) return false;

  const activeBindings = def.bindings !== undefined ? def.bindings : def.defaultBindings;
  const isMac = browser ? navigator.platform.toUpperCase().indexOf('MAC') >= 0 : false;
  const eventCtrl = isMac ? e.metaKey : e.ctrlKey;

  for (const b of activeBindings) {
    if (b.code === e.code &&
        !!b.ctrl === eventCtrl &&
        !!b.shift === e.shiftKey &&
        !!b.alt === e.altKey) {
      return true;
    }
  }

  return false;
}
