import { writable } from 'svelte/store';
import type { TransformMode } from '../transforms/transform-controls';

export interface MarqueeState {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface DragState {
  active: boolean;
  type: 'primitive' | 'light' | null;
  item: string | null;
}

export interface UIState {
  transformMode: TransformMode;
  snapEnabled: boolean;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  sceneCollapsed: boolean;
  libraryCollapsed: boolean;
  propertiesCollapsed: boolean;
  cameraCollapsed: boolean;
  panelsVisible: boolean;
  marquee: MarqueeState;
  drag: DragState;
  breakpoint: 'desktop' | 'tablet' | 'mobile';
  gridVisible: boolean;
  vanishingVisible: boolean;
  overlays: {
    edges: boolean;
    half: boolean;
    third: boolean;
    cross: boolean;
    solid: boolean;
    xyz: boolean;
  };
}

export const uiStore = writable<UIState>({
  transformMode: 'translate',
  snapEnabled: false,
  leftPanelOpen: true,
  rightPanelOpen: true,
  sceneCollapsed: false,
  libraryCollapsed: false,
  propertiesCollapsed: false,
  cameraCollapsed: false,
  panelsVisible: true,
  marquee: {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  },
  drag: {
    active: false,
    type: null,
    item: null,
  },
  breakpoint: 'desktop',
  gridVisible: true,
  vanishingVisible: false,
  overlays: {
    edges: true,
    half: false,
    third: false,
    cross: false,
    solid: false,
    xyz: false,
  }
});

export function getBreakpoint(width: number): 'desktop' | 'tablet' | 'mobile' {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}
