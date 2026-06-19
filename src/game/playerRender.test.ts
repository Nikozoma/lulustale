import { describe, expect, it } from "vitest";
import { PLAYER } from "./constants";
import { getPlayerSpriteDrawBox } from "./playerRender";

describe("player sprite anchoring", () => {
  it("draws Lulu bottom-centered with visible feet lowered onto the collision anchor", () => {
    const box = getPlayerSpriteDrawBox(
      { x: 100, y: 120 },
      PLAYER.frameWidth,
      PLAYER.frameHeight,
      PLAYER.renderScale,
      PLAYER.spriteFootOffsetY,
      PLAYER.spriteAnchorX,
      PLAYER.spriteAnchorY
    );

    expect(box.x + box.width / 2).toBe(100);
    expect(PLAYER.spriteFootOffsetY).toBeGreaterThan(0);
    expect(box.y + box.height - PLAYER.spriteFootOffsetY).toBe(120);
  });
});
