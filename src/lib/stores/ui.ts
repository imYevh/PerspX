import { writable } from 'svelte/store';
import type { TransformMode } from '../transforms/transform-controls';

export interface UIState {
  transformMode: TransformMode;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  sceneCollapsed: boolean;
  libraryCollapsed: boolean;
  propertiesCollapsed: boolean;
  cameraCollapsed: boolean;
}

export const uiStore = writable<UIState>({
  transformMode: 'translate',
  leftPanelOpen: true,
  rightPanelOpen: true,
  sceneCollapsed: false,
  libraryCollapsed: false,
  propertiesCollapsed: false,
  cameraCollapsed: false,
});
