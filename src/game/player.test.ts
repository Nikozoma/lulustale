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

function createOpenMapFixture(width: number, height: number): RawSemanticMap {
  const openRow = Array.from({ length: width }, () => "indoor_floor");
  const emptyRow = Array.from({ length: width }, () => null);
  return {
    mapName: "open_movement_test",
    width,
    height,
    gameTileSizePx: 32,
    layerOrder: ["ground", "structures", "objects", "markers"],
    layers: {
      ground: Array.from({ length: height }, () => [...openRow]),
      structures: Array.from({ length: height }, () => [...emptyRow]),
      objects: Array.from({ length: height }, () => [...emptyRow]),
      markers: Array.from({ length: height }, () => [...emptyRow])
    }
  };
}

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

  it("moves the same world distance on every cardinal axis", () => {
    const map = normalizeSemanticMap(createOpenMapFixture(20, 20));
    const collision = buildCollisionGrid(map);
    const start = { x: 320, y: 320 };
    const directions = [
      { input: { x: 1, y: 0 }, expected: { x: PLAYER.speedPxPerSecond, y: 0 } },
      { input: { x: -1, y: 0 }, expected: { x: -PLAYER.speedPxPerSecond, y: 0 } },
      { input: { x: 0, y: -1 }, expected: { x: 0, y: -PLAYER.speedPxPerSecond } },
      { input: { x: 0, y: 1 }, expected: { x: 0, y: PLAYER.speedPxPerSecond } }
    ];

    for (const { input, expected } of directions) {
      const player = createPlayer(start);
      updatePlayer(player, input, 1, map, collision);

      expect(player.position.x - start.x).toBeCloseTo(expected.x);
      expect(player.position.y - start.y).toBeCloseTo(expected.y);
      expect(Math.hypot(player.position.x - start.x, player.position.y - start.y)).toBeCloseTo(
        PLAYER.speedPxPerSecond
      );
    }
  });

  it("normalizes diagonal movement so it is not faster than single-axis movement", () => {
    const map = normalizeSemanticMap(createOpenMapFixture(20, 20));
    const collision = buildCollisionGrid(map);
    const start = { x: 320, y: 320 };
    const player = createPlayer(start);

    updatePlayer(player, { x: 1, y: -1 }, 1, map, collision);

    const dx = player.position.x - start.x;
    const dy = player.position.y - start.y;
    expect(Math.hypot(dx, dy)).toBeCloseTo(PLAYER.speedPxPerSecond);
    expect(dx).toBeCloseTo(PLAYER.speedPxPerSecond / Math.SQRT2);
    expect(dy).toBeCloseTo(-PLAYER.speedPxPerSecond / Math.SQRT2);
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
