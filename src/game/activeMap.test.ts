import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCollisionGrid, normalizeSemanticMap, type RawSemanticMap } from "./world";

const requiredIds = [
  "indoor_floor",
  "exterior_wall",
  "interior_wall",
  "doorway",
  "entrance_exit",
  "player_spawn",
  "dog_spawn",
  "dog_interaction",
  "dog_bowl",
  "bed",
  "bed_interaction",
  "refrigerator",
  "fridge_interaction",
  "couch",
  "counter_top",
  "sink",
  "dining_table"
];

describe("active compact home map", () => {
  function loadActiveMap() {
    const path = resolve(process.cwd(), "Home.json");
    const raw = JSON.parse(readFileSync(path, "utf8")) as RawSemanticMap & {
      mapId?: string;
      displayName?: string;
    };
    const map = normalizeSemanticMap(raw);
    return { raw, map };
  }

  it("uses the compact Home semantic map with required IDs", () => {
    const { raw, map } = loadActiveMap();
    const ids = new Set<string>();

    for (const layer of Object.values(map.layers)) {
      for (const row of layer) {
        for (const cell of row) {
          if (cell) {
            ids.add(cell);
          }
        }
      }
    }

    expect(raw.mapId).toBe("Home");
    expect(raw.mapName).toBe("Home");
    expect(raw.displayName).toBe("Home");
    expect(map.widthTiles).toBe(10);
    expect(map.heightTiles).toBe(13);
    expect(map.tileSize).toBe(32);
    expect(map.worldWidth).toBe(320);
    expect(map.worldHeight).toBe(416);
    expect(requiredIds.filter((id) => !ids.has(id))).toEqual([]);
  });

  it("classifies compact map collision from ground, structures, and objects without marker blocking", () => {
    const { map } = loadActiveMap();
    const collision = buildCollisionGrid(map);

    expect(collision.isSolidTile(4, 0)).toBe(true); // exterior_wall
    expect(collision.isSolidTile(6, 4)).toBe(true); // interior_wall
    expect(collision.isSolidTile(2, 12)).toBe(true); // window/edge tile
    expect(collision.isSolidTile(0, 0)).toBe(true); // no indoor floor

    expect(collision.isSolidTile(5, 4)).toBe(false); // doorway structure/object tile
    expect(collision.isSolidTile(2, 4)).toBe(false); // entrance_exit structure
    expect(collision.isSolidTile(2, 5)).toBe(false); // entrance_exit marker
    expect(collision.isSolidTile(3, 5)).toBe(false); // normal indoor floor
    expect(collision.isSolidTile(6, 3)).toBe(false); // player_spawn marker only
    expect(collision.isSolidTile(3, 10)).toBe(false); // dog_interaction marker only

    expect(collision.isSolidTile(1, 7)).toBe(true); // couch
    expect(collision.isSolidTile(7, 1)).toBe(true); // bed
    expect(collision.isSolidTile(7, 10)).toBe(true); // refrigerator
    expect(collision.isSolidTile(5, 7)).toBe(true); // counter_top
    expect(collision.isSolidTile(6, 7)).toBe(true); // sink
    expect(collision.isSolidTile(4, 11)).toBe(true); // dining_table
    expect(collision.isSolidTile(2, 11)).toBe(false); // dog_bowl remains non-blocking
  });
});
