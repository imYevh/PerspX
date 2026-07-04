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

  // Main grid
  const grid = new GridHelper(size, divisions, color1, color2);
  group.add(grid);

  // Overlay a coarser 10-unit grid for clearer subdivisions
  const coarseGrid = new GridHelper(size, divisions / 10, 0x555566, 0x555566);
  group.add(coarseGrid);

  return group;
}
