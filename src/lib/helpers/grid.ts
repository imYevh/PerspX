import {
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  DoubleSide,
  Color,
} from 'three';

/**
 * An infinite-looking grid on the XZ plane.
 * Uses a custom shader that fades out based on distance from camera
 * and renders smoothly without Moiré patterns.
 */
export function createInfiniteGrid(options?: {
  size?: number;
  divisions?: number;
  color1?: number;
  color2?: number;
  fadeDistance?: number;
}): Mesh {
  const size = options?.size ?? 100;
  const color1 = new Color(options?.color1 ?? 0x444444);
  const color2 = new Color(options?.color2 ?? 0x222222);
  const fadeDistance = options?.fadeDistance ?? 50;

  const geometry = new PlaneGeometry(size, size, 1, 1);

  const material = new ShaderMaterial({
    side: DoubleSide,
    transparent: true,
    depthWrite: false,

    uniforms: {
      uColor1: { value: color1 },
      uColor2: { value: color2 },
      uSize1: { value: 1.0 },   // Major grid spacing
      uSize2: { value: 0.2 },   // Minor grid spacing
      uFadeDistance: { value: fadeDistance },
    },

    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,

    fragmentShader: /* glsl */ `
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uSize1;
      uniform float uSize2;
      uniform float uFadeDistance;
      varying vec3 vWorldPosition;

      float getGrid(float size) {
        vec2 r = vWorldPosition.xz / size;
        vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
        float line = min(grid.x, grid.y);
        return 1.0 - min(line, 1.0);
      }

      void main() {
        float d = length(vWorldPosition.xz);
        float fade = 1.0 - smoothstep(uFadeDistance * 0.5, uFadeDistance, d);

        float g1 = getGrid(uSize1);
        float g2 = getGrid(uSize2);

        vec3 color = mix(uColor2, uColor1, g1) + uColor1 * g2 * 0.5;
        float alpha = (g1 + g2 * 0.3) * fade;

        gl_FragColor = vec4(color, alpha * 0.8);
      }
    `,
  });

  const grid = new Mesh(geometry, material);
  grid.rotation.x = -Math.PI / 2; // Lay flat on XZ
  grid.renderOrder = -1;          // Render behind everything
  grid.name = '_PerspX_grid';

  return grid;
}
