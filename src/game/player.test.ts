import { describe, expect, it } from "vitest";
import { PLAYER } from "./constants";
import { createPlayer, updatePlayer } from "./player";
import { buildCollisionGrid, normalizeSemanticMap, type RawSemanticMap } from "./world";

const mapFixture: RawSemanticMap = {
  mapName: "movement_test",
  width: 4,
  height: 3,
  gameTileSizePx: 32,
  layerOrder: ["ground", "structures", "objects", "markers"],
  layers: {
    ground: [
      ["indoor_floor", "indoor_floor", "indoor_floor", "indoor_floor"],
      ["indoor_floor", "indoor_floor", "indoor_floor", "indoor_floor"],
      ["indoor_floor", "indoor_floor", "indoor_floor", "indoor_floor"]
    ],
    structures: [
      [null, null, null, null],
      [null, null, "interior_wall", null],
      [null, null, null, null]
    ],
    objects: [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null]
    ],
    markers: [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null]
    ]
  }
};

describe("player movement", () => {
  it("moves with normalized input and updates facing", () => {
    const map = normalizeSemanticMap(mapFixture);
    const collision = buildCollisionGrid(map);
    const player = createPlayer({ x: 16, y: 16 });

    updatePlayer(player, { x: 1, y: 0 }, 0.5, map, collision);

    expect(player.position.x).toBeCloseTo(16 + PLAYER.speedPxPerSecond * 0.5);
    expect(player.position.y).toBeCloseTo(16);
    expect(player.facing).toBe("right_down");
    expect(player.isMoving).toBe(true);
  });

  it("slides along solid semantic tiles instead of entering them", () => {
    const map = normalizeSemanticMap(mapFixture);
    const collision = buildCollisionGrid(map);
    const player = createPlayer({ x: 48, y: 48 });

    updatePlayer(player, { x: 1, y: 0 }, 1, map, collision);

    expect(player.position.x).toBeLessThan(64 - PLAYER.collisionRadiusPx + 0.01);
    expect(player.position.y).toBe(48);
  });
});
