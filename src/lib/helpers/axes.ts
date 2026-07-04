import { AxesHelper, Group, Sprite, SpriteMaterial, CanvasTexture } from 'three';

/**
 * XYZ axes at the origin with axis labels
 */
export function createAxesHelper(size: number = 5): Group {
  const group = new Group();
  group.name = '_PerspX_axes';

  const axes = new AxesHelper(size);
  group.add(axes);

  // Add labels
  const labels = [
    { text: 'X', color: '#ff4444', pos: [size + 0.3, 0, 0] },
    { text: 'Y', color: '#44ff44', pos: [0, size + 0.3, 0] },
    { text: 'Z', color: '#4444ff', pos: [0, 0, size + 0.3] },
  ];

  for (const label of labels) {
    const sprite = createTextSprite(label.text, label.color);
    sprite.position.set(label.pos[0], label.pos[1], label.pos[2]);
    sprite.scale.set(0.5, 0.5, 0.5);
    group.add(sprite);
  }

  return group;
}

function createTextSprite(text: string, color: string): Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.font = 'Bold 80px Inter, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 64, 64);

  const texture = new CanvasTexture(canvas);
  const material = new SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  return new Sprite(material);
}
