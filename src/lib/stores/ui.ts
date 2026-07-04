import { writable } from 'svelte/store';
import type { TransformMode } from '../transforms/transform-controls';

export interface MarqueeState {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface UIState {
  transformMode: TransformMode;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  sceneCollapsed: boolean;
  libraryCollapsed: boolean;
  propertiesCollapsed: boolean;
  cameraCollapsed: boolean;
  marquee: MarqueeState;
}

export const uiStore = writable<UIState>({
  transformMode: 'translate',
  leftPanelOpen: true,
  rightPanelOpen: true,
  sceneCollapsed: false,
  libraryCollapsed: false,
  propertiesCollapsed: false,
  cameraCollapsed: false,
  marquee: {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  }
});
