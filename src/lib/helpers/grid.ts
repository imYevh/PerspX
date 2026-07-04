import { Group, BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments } from 'three';

/**
 * A dense 3D wireframe lattice.
 * Compatible with both WebGL and WebGPU renderers.
 */
export function createInfiniteGrid(options?: {
  size?: number;
  divisions?: number;
  color1?: number;
  color2?: number;
}): Group {
  // Use a smaller volume for a 3D grid to avoid visual clutter
  const size = options?.size ?? 40; 
  const divisions = options?.divisions ?? 40;
  const color1 = options?.color1 ?? 0x444455; // Minor lines
  const color2 = options?.color2 ?? 0x666677; // Major lines

  const group = new Group();
  group.name = '_PerspX_grid';

  const halfSize = size / 2;
  const step = size / divisions;

  const vertices: number[] = [];
  const coarseVertices: number[] = [];
  const coarseStep = 10;

  for (let i = 0; i <= divisions; i++) {
    const val = -halfSize + i * step;
    const isCoarse = Math.abs(val % coarseStep) < 0.001;
    const target = isCoarse ? coarseVertices : vertices;

    for (let j = 0; j <= divisions; j++) {
      const val2 = -halfSize + j * step;
      
      // X-axis lines (varying Y and Z)
      target.push(-halfSize, val, val2, halfSize, val, val2);
      // Y-axis lines (varying X and Z)
      target.push(val, -halfSize, val2, val, halfSize, val2);
      // Z-axis lines (varying X and Y)
      target.push(val, val2, -halfSize, val, val2, halfSize);
    }
  }

  // Main grid
  if (vertices.length > 0) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    const material = new LineBasicMaterial({
      color: color1,
      transparent: true,
      opacity: 0.15
    });
    group.add(new LineSegments(geometry, material));
  }

  // Coarse grid
  if (coarseVertices.length > 0) {
    const coarseGeometry = new BufferGeometry();
    coarseGeometry.setAttribute('position', new Float32BufferAttribute(coarseVertices, 3));
    const coarseMaterial = new LineBasicMaterial({
      color: color2,
      transparent: true,
      opacity: 0.4
    });
    group.add(new LineSegments(coarseGeometry, coarseMaterial));
  }

  return group;
}
