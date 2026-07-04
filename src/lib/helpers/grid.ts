import { GridHelper, Group } from 'three';

/**
 * A two-level grid on the XZ plane using the built-in GridHelper.
 * Compatible with both WebGL and WebGPU renderers.
 */
export function createInfiniteGrid(options?: {
  size?: number;
  divisions?: number;
  color1?: number;
  color2?: number;
}): Group {
  const size = options?.size ?? 100;
  const divisions = options?.divisions ?? 100;
  const color1 = options?.color1 ?? 0x444455; // Major lines
  const color2 = options?.color2 ?? 0x333344; // Minor lines

  const group = new Group();
  group.name = '_PerspX_grid';

  // Main grid (smaller 1x1 cells)
  const grid = new GridHelper(size, divisions, color1, color2);
  if (!Array.isArray(grid.material)) {
    grid.material.transparent = true;
    grid.material.opacity = 0.15; // Make smaller grid very transparent
  }
  group.add(grid);

  // Overlay a coarser 10-unit grid for clearer subdivisions
  const coarseGrid = new GridHelper(size, divisions / 10, 0x555566, 0x555566);
  if (!Array.isArray(coarseGrid.material)) {
    coarseGrid.material.transparent = true;
    coarseGrid.material.opacity = 0.4;
  }
  group.add(coarseGrid);

  return group;
}
