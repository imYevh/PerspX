import { MathUtils, PerspectiveCamera, Vector3 } from 'three';

/**
 * Dolly Zoom (Vertigo / Hitchcock effect)
 *
 * Moves the camera along its look direction while adjusting FOV
 * so the subject stays the same apparent size on screen.
 *
 * Formula: FOV = 2 * atan(subjectSize / (2 * distance))
 */
export class DollyZoom {
  private subjectWorldPos = new Vector3();
  private subjectApparentSize: number;
  private isActive = false;

  constructor(
    private camera: PerspectiveCamera,
    subjectPos: Vector3 = new Vector3(0, 0, 0),
    subjectHeight: number = 1
  ) {
    this.subjectWorldPos.copy(subjectPos);
    this.subjectApparentSize = subjectHeight;
  }

  /**
   * Start the dolly zoom. Locks the subject's apparent size.
   */
  activate(subjectPos?: Vector3): void {
    if (subjectPos) this.subjectWorldPos.copy(subjectPos);
    this.isActive = true;
  }

  deactivate(): void {
    this.isActive = false;
  }

  get active(): boolean {
    return this.isActive;
  }

  /**
   * Call when the camera distance changes.
   * Adjusts FOV to maintain the subject's apparent size.
   */
  update(): void {
    if (!this.isActive) return;

    const distance = this.camera.position.distanceTo(this.subjectWorldPos);
    if (distance < 0.01) return; // Avoid division by zero

    const fov = 2 * MathUtils.RAD2DEG * Math.atan(
      this.subjectApparentSize / (2 * distance)
    );

    this.camera.fov = MathUtils.clamp(fov, 1, 170);
    this.camera.updateProjectionMatrix();
  }

  /**
   * Set the distance while applying dolly zoom.
   * Moves camera along its current look direction.
   */
  setDistance(newDistance: number): void {
    const direction = new Vector3()
      .subVectors(this.camera.position, this.subjectWorldPos)
      .normalize();

    this.camera.position.copy(
      this.subjectWorldPos.clone().add(direction.multiplyScalar(newDistance))
    );

    this.update();
  }

  /**
   * Get info for UI display
   */
  getInfo(): { distance: number; fov: number; focalLength: number } {
    const distance = this.camera.position.distanceTo(this.subjectWorldPos);
    const fov = this.camera.fov;
    // Approximate focal length (35mm equivalent)
    const focalLength = (36 / 2) / Math.tan(MathUtils.DEG2RAD * fov / 2);
    return { distance, fov, focalLength };
  }

  setSubject(pos: Vector3, height?: number): void {
    this.subjectWorldPos.copy(pos);
    if (height !== undefined) this.subjectApparentSize = height;
  }
}
