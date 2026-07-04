import { Mesh, PlaneGeometry, ShadowMaterial } from 'three';

/**
 * A transparent ground plane that only receives shadows.
 * This gives depth cues without a visible floor.
 */
export function createGroundPlane(size: number = 50, opacity: number = 0.3): Mesh {
  const geometry = new PlaneGeometry(size, size);
  const material = new ShadowMaterial({ opacity });

  const ground = new Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.001; // Slight offset to prevent z-fighting with grid
  ground.receiveShadow = true;
  ground.name = '_PerspX_ground';

  return ground;
}
