import { BufferGeometry, Float32BufferAttribute, Vector3, Plane, Box3 } from 'three';

/**
 * Intersects a BufferGeometry with an array of Planes to generate a LineSegments geometry.
 */
export function generateIntersectionLines(geometry: BufferGeometry, planes: Plane[]): BufferGeometry {
  const positionAttribute = geometry.attributes.position;
  const indices = geometry.index;
  
  const lineVertices: number[] = [];

  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  
  const v0 = new Vector3();
  const v1 = new Vector3();
  const v2 = new Vector3();

  // Helper to intersect a plane with a triangle
  const intersectPlaneTriangle = (plane: Plane, p0: Vector3, p1: Vector3, p2: Vector3) => {
    const d0 = plane.distanceToPoint(p0);
    const d1 = plane.distanceToPoint(p1);
    const d2 = plane.distanceToPoint(p2);

    // If all points are on the same side, no intersection
    if ((d0 > 0 && d1 > 0 && d2 > 0) || (d0 < 0 && d1 < 0 && d2 < 0)) return;

    const points: Vector3[] = [];

    // Check edge 0-1
    if (d0 * d1 < 0) {
      const t = d0 / (d0 - d1);
      points.push(new Vector3().lerpVectors(p0, p1, t));
    }
    // Check edge 1-2
    if (d1 * d2 < 0) {
      const t = d1 / (d1 - d2);
      points.push(new Vector3().lerpVectors(p1, p2, t));
    }
    // Check edge 2-0
    if (d2 * d0 < 0) {
      const t = d2 / (d2 - d0);
      points.push(new Vector3().lerpVectors(p2, p0, t));
    }

    // A plane intersecting a triangle will yield exactly 2 points (a line segment)
    // In rare cases (plane passes exactly through a vertex and an edge), it might yield 2 identical points or more, 
    // but typically 2 distinct points.
    if (points.length === 2) {
      lineVertices.push(points[0].x, points[0].y, points[0].z);
      lineVertices.push(points[1].x, points[1].y, points[1].z);
    }
  };

  const vertexCount = indices ? indices.count : positionAttribute.count;
  
  for (const plane of planes) {
    for (let i = 0; i < vertexCount; i += 3) {
      if (indices) {
        a.fromBufferAttribute(positionAttribute, indices.getX(i));
        b.fromBufferAttribute(positionAttribute, indices.getX(i + 1));
        c.fromBufferAttribute(positionAttribute, indices.getX(i + 2));
      } else {
        a.fromBufferAttribute(positionAttribute, i);
        b.fromBufferAttribute(positionAttribute, i + 1);
        c.fromBufferAttribute(positionAttribute, i + 2);
      }
      
      intersectPlaneTriangle(plane, a, b, c);
    }
  }

  const lineGeo = new BufferGeometry();
  lineGeo.setAttribute('position', new Float32BufferAttribute(lineVertices, 3));
  return lineGeo;
}

/**
 * Assigns vertex colors to an EdgesGeometry based on XYZ axis alignment.
 */
export function assignXYZColors(edgesGeometry: BufferGeometry) {
  const pos = edgesGeometry.attributes.position;
  const colors: number[] = [];
  
  const v1 = new Vector3();
  const v2 = new Vector3();
  const dir = new Vector3();

  for (let i = 0; i < pos.count; i += 2) {
    v1.fromBufferAttribute(pos, i);
    v2.fromBufferAttribute(pos, i + 1);
    
    let r = 0.5, g = 0.5, b = 0.5; // default grey
    
    const eps = 1e-4;
    if (Math.abs(v1.x) < eps && Math.abs(v2.x) < eps) {
      r = 1; g = 0; b = 0; // X=0 plane (YZ plane) -> Red
    } else if (Math.abs(v1.y) < eps && Math.abs(v2.y) < eps) {
      r = 0; g = 1; b = 0; // Y=0 plane (XZ plane) -> Green
    } else if (Math.abs(v1.z) < eps && Math.abs(v2.z) < eps) {
      r = 0; g = 0; b = 1; // Z=0 plane (XY plane) -> Blue
    } else {
      dir.subVectors(v2, v1).normalize();
      const ax = Math.abs(dir.x);
      const ay = Math.abs(dir.y);
      const az = Math.abs(dir.z);
      
      const threshold = 0.95;
      if (ax > threshold) { r = 1; g = 0; b = 0; }
      else if (ay > threshold) { r = 0; g = 1; b = 0; }
      else if (az > threshold) { r = 0; g = 0; b = 1; }
    }
    
    colors.push(r, g, b);
    colors.push(r, g, b);
  }
  
  edgesGeometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
}

/**
 * Creates the planes for the 'halfs' overlay.
 */
export function getHalfPlanes(bbox: Box3): Plane[] {
  const center = new Vector3();
  bbox.getCenter(center);
  
  return [
    new Plane(new Vector3(1, 0, 0), -center.x), // YZ plane at center X
    new Plane(new Vector3(0, 1, 0), -center.y), // XZ plane at center Y
    new Plane(new Vector3(0, 0, 1), -center.z), // XY plane at center Z
  ];
}

/**
 * Creates the planes for the 'thirds' overlay.
 */
export function getThirdPlanes(bbox: Box3): Plane[] {
  const size = new Vector3();
  bbox.getSize(size);
  const min = bbox.min;
  
  const planes: Plane[] = [];
  
  // X slices
  if (size.x > 0.01) {
    planes.push(new Plane(new Vector3(1, 0, 0), -(min.x + size.x * 1/3)));
    planes.push(new Plane(new Vector3(1, 0, 0), -(min.x + size.x * 2/3)));
  }
  
  // Y slices
  if (size.y > 0.01) {
    planes.push(new Plane(new Vector3(0, 1, 0), -(min.y + size.y * 1/3)));
    planes.push(new Plane(new Vector3(0, 1, 0), -(min.y + size.y * 2/3)));
  }
  
  // Z slices
  if (size.z > 0.01) {
    planes.push(new Plane(new Vector3(0, 0, 1), -(min.z + size.z * 1/3)));
    planes.push(new Plane(new Vector3(0, 0, 1), -(min.z + size.z * 2/3)));
  }
  
  return planes;
}

/**
 * Creates the planes for the 'cross' overlay (diagonals).
 */
export function getCrossPlanes(bbox: Box3): Plane[] {
  const center = new Vector3();
  bbox.getCenter(center);
  const size = new Vector3();
  bbox.getSize(size);
  
  const planes: Plane[] = [];
  
  // If bounding box has significant volume
  if (size.x > 0.01 && size.y > 0.01) {
    // XY diagonals
    planes.push(new Plane(new Vector3(size.y, -size.x, 0).normalize(), 0).translate(center));
    planes.push(new Plane(new Vector3(size.y, size.x, 0).normalize(), 0).translate(center));
  }
  
  if (size.x > 0.01 && size.z > 0.01) {
    // XZ diagonals
    planes.push(new Plane(new Vector3(size.z, 0, -size.x).normalize(), 0).translate(center));
    planes.push(new Plane(new Vector3(size.z, 0, size.x).normalize(), 0).translate(center));
  }
  
  if (size.y > 0.01 && size.z > 0.01) {
    // YZ diagonals
    planes.push(new Plane(new Vector3(0, size.z, -size.y).normalize(), 0).translate(center));
    planes.push(new Plane(new Vector3(0, size.z, size.y).normalize(), 0).translate(center));
  }
  
  return planes;
}
