import type { WorldPoint } from "./world";

export type PlayerSpriteDrawBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function getPlayerSpriteDrawBox(
  feetAnchor: WorldPoint,
  frameWidth: number,
  frameHeight: number,
  renderScale: number,
  footOffsetY: number,
  anchorX = 0.5,
  anchorY = 1
): PlayerSpriteDrawBox {
  const width = frameWidth * renderScale;
  const height = frameHeight * renderScale;

  return {
    x: feetAnchor.x - width * anchorX,
    y: feetAnchor.y - height * anchorY + footOffsetY,
    width,
    height
  };
}
