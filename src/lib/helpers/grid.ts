import { Group, SphereGeometry, WireframeGeometry, LineSegments, LineBasicMaterial, MathUtils } from 'three';

/**
 * A spherical perspective grid (like a dome) to resemble the competitor app.
 */
export function createInfiniteGrid(options?: {
  radius?: number;
  widthSegments?: number;
  heightSegments?: number;
  color?: number;
}): Group {
  const radius = options?.radius ?? 50;
  const widthSegments = options?.widthSegments ?? 24; // Longitude lines
  const heightSegments = options?.heightSegments ?? 12; // Latitude lines
  const color = options?.color ?? 0x444455;

  const group = new Group();
  group.name = '_PerspX_grid';

  // Create a sphere geometry
  const sphereGeo = new SphereGeometry(radius, widthSegments, heightSegments);
  
  // Convert to wireframe lines
  const wireframeGeo = new WireframeGeometry(sphereGeo);

  const material = new LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.15,
  });

  const lines = new LineSegments(wireframeGeo, material);
  
  // Rotate so the "poles" are at top and bottom (Y axis)
  // SphereGeometry by default has poles on the Y axis, which is perfect.
  group.add(lines);

  // Add a slightly more visible "horizon" (equator) ring
  const equatorGeo = new SphereGeometry(radius, widthSegments, 2, 0, Math.PI * 2, Math.PI / 2 - 0.01, 0.02);
  const equatorWireframe = new WireframeGeometry(equatorGeo);
  const equatorMat = new LineBasicMaterial({
    color: 0x666677,
    transparent: true,
    opacity: 0.4
  });
  group.add(new LineSegments(equatorWireframe, equatorMat));

  return group;
}
