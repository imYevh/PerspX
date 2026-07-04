import {
  Vector3,
  Group,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Float32BufferAttribute,
  PerspectiveCamera,
} from 'three';

/**
 * Visualizes vanishing points by drawing lines from an object
 * extending to the vanishing points on the horizon.
 *
 * This is an advanced helper for studying perspective construction.
 */
export class VanishingPointHelper {
  public readonly group: Group;
  private lines: Line[] = [];
  private material: LineBasicMaterial;

  constructor(color: number = 0xffaa00, opacity: number = 0.4) {
    this.group = new Group();
    this.group.name = '_PerspX_vanishing';

    this.material = new LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: false,
    });
    
    // Initialize lines once
    const colors = [0xff4444, 0x44ff44, 0x4444ff];
    for (let i = 0; i < 3; i++) {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute([0,0,0, 0,0,0], 3));
      geometry.setDrawRange(0, 0); // Hide initially
      
      const lineMat = new LineBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.3,
        depthTest: false,
      });

      const line = new Line(geometry, lineMat);
      this.lines.push(line);
      this.group.add(line);
    }
  }

  /**
   * Update vanishing lines for a given object's edges.
   * Extends edges to where they converge (vanishing points).
   */
  updateForBox(
    objectPosition: Vector3,
    objectSize: Vector3,
    camera: PerspectiveCamera
  ): void {
    // The 3 principal directions (world-aligned)
    const directions = [
      new Vector3(1, 0, 0),  // X
      new Vector3(0, 1, 0),  // Y
      new Vector3(0, 0, 1),  // Z
    ];

    for (let i = 0; i < directions.length; i++) {
      const dir = directions[i];
      const extensionLength = 100; // How far the vanishing lines extend

      const start = objectPosition.clone().sub(dir.clone().multiplyScalar(extensionLength));
      const end = objectPosition.clone().add(dir.clone().multiplyScalar(extensionLength));

      const line = this.lines[i];
      const positionAttribute = line.geometry.getAttribute('position') as Float32BufferAttribute;
      
      positionAttribute.setXYZ(0, start.x, start.y, start.z);
      positionAttribute.setXYZ(1, end.x, end.y, end.z);
      positionAttribute.needsUpdate = true;
      line.geometry.setDrawRange(0, 2); // Ensure it's drawn
    }
  }

  clear(): void {
    for (const line of this.lines) {
      line.geometry.setDrawRange(0, 0);
    }
  }

  dispose(): void {
    this.clear();
    this.material.dispose();
  }
}
