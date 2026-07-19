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
  type: 'primitive' | 'light' | 'model' | null;
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
  shaderCollapsed: boolean;
  panelsVisible: boolean;
  marquee: MarqueeState;
  drag: DragState;
  breakpoint: 'desktop' | 'tablet' | 'mobile';
  gridVisible: boolean;
  vanishingVisible: boolean;
  lightHelpersVisible: boolean;
  overlays: {
    edges: boolean;
    half: boolean;
    third: boolean;
    cross: boolean;
    solid: boolean;
    xyz: boolean;
    textured: boolean;
  };
  orientation: 'portrait' | 'landscape';
  mobileBottomSheetExpanded: boolean;
  mobileActiveTab: 'scene' | 'library' | 'properties' | 'camera';
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
  shaderCollapsed: false,
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
  lightHelpersVisible: true,
  overlays: {
    edges: true,
    half: false,
    third: false,
    cross: false,
    solid: false,
    xyz: false,
    textured: false,
  },
  orientation: 'landscape',
  mobileBottomSheetExpanded: false,
  mobileActiveTab: 'properties'
});

export function getBreakpoint(width: number, height: number): 'desktop' | 'tablet' | 'mobile' {
  // Mobile landscape: width > height, but height is very small (e.g. < 500)
  if (width < 768 || (width > height && height < 500)) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function getOrientation(width: number, height: number): 'portrait' | 'landscape' {
  return width > height ? 'landscape' : 'portrait';
}
