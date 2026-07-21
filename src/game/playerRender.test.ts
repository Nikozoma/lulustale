import { describe, expect, it } from "vitest";
import { PLAYER } from "./constants";
import { getPlayerFrameCrop, getPlayerSpriteDrawBox, PLAYER_DIRECTION_ROWS } from "./playerRender";

describe("96x96 Lulu runtime geometry", () => {
  it("maps the fixed eight directions to the authoritative row order", () => {
    expect(PLAYER_DIRECTION_ROWS).toEqual({
      down: 0,
      left_down: 1,
      left: 2,
      left_up: 3,
      up: 4,
      right_up: 5,
      right: 6,
      right_down: 7
    });
  });

  it("crops native 96px cells", () => {
    expect(getPlayerFrameCrop("right_up", true, 0.26, 0.125, 96, 96, 4)).toMatchObject({
      sheet: "walk",
      x: 192,
      y: 480,
      width: 96,
      height: 96,
      frameIndex: 2
    });
  });

  it("draws the native cell from the (48,88) foot anchor with no scaling", () => {
    const box = getPlayerSpriteDrawBox({ x: 100, y: 200 }, 96, 96, 1, 8, 0.5, 1);
    expect(box).toEqual({ x: 52, y: 112, width: 96, height: 96 });
    expect(PLAYER.rootAnchorX).toBe(48);
    expect(PLAYER.rootAnchorY).toBe(88);
  });
});
