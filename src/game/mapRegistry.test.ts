import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MAP_REGISTRY, getMapSpec } from "./mapRegistry";
import { loadSemanticMapFromProjectFile } from "./mapRegistryNode";
import { buildCollisionGrid, findMarkerPositions } from "./world";

describe("map registry", () => {
  it("contains home, overworld, and Charles Jr. map specs", () => {
    expect(Object.keys(MAP_REGISTRY).sort()).toEqual([
      "Charles",
      "Home",
      "Overworld"
    ]);
    expect(getMapSpec("Home").fileName).toBe("Home.json");
    expect(getMapSpec("Overworld").fileName).toBe(
      "Overworld.json"
    );
    expect(getMapSpec("Charles").fileName).toBe(
      "Charles.json"
    );
  });

  it("loads the reviewed main neighborhood hub semantic map metadata", () => {
    const map = loadSemanticMapFromProjectFile("Overworld");

    expect(map.name).toBe("Overworld");
    expect(map.widthTiles).toBe(42);
    expect(map.heightTiles).toBe(30);
    expect(map.tileSize).toBe(32);
    expect(map.worldWidth).toBe(1344);
    expect(map.worldHeight).toBe(960);
    expect(findMarkerPositions(map, "player_spawn")).toEqual([{ x: 1104, y: 688, tileX: 34, tileY: 21 }]);
    expect(findMarkerPositions(map, "transition_to_charles_jr")).toEqual([
      { x: 496, y: 656, tileX: 15, tileY: 20 }
    ]);
  });

  it("classifies main neighborhood hub collision from outdoor semantic IDs", () => {
    const map = loadSemanticMapFromProjectFile("Overworld");
    const collision = buildCollisionGrid(map);

    expect(collision.isSolidTile(0, 0)).toBe(false); // street
    expect(collision.isSolidTile(4, 0)).toBe(false); // sidewalk
    expect(collision.isSolidTile(7, 7)).toBe(false); // parking_lot
    expect(collision.isSolidTile(5, 2)).toBe(false); // crosswalk
    expect(collision.isSolidTile(6, 9)).toBe(true); // grass plus tree object
    expect(collision.isSolidTile(7, 8)).toBe(false); // parking_lot without object
    expect(collision.isSolidTile(22, 8)).toBe(false); // grass

    expect(collision.isSolidTile(14, 10)).toBe(true); // charles_jr_building
    expect(collision.isSolidTile(28, 16)).toBe(true); // player_apartment_building
    expect(collision.isSolidTile(28, 9)).toBe(true); // apartment_building
    expect(collision.isSolidTile(36, 19)).toBe(true); // bush
    expect(collision.isSolidTile(27, 9)).toBe(true); // tree

    expect(collision.isSolidTile(15, 19)).toBe(false); // Charles Jr entrance_exit/door marker
    expect(collision.isSolidTile(35, 20)).toBe(false); // home entrance_exit/player door
    expect(collision.isSolidTile(36, 20)).toBe(false); // transition_to_home marker only
  });

  it("loads the corrected Charles Jr. semantic map metadata", () => {
    const map = loadSemanticMapFromProjectFile("Charles");

    expect(map.name).toBe("Charles");
    expect(map.widthTiles).toBe(18);
    expect(map.heightTiles).toBe(18);
    expect(map.tileSize).toBe(32);
    expect(map.worldWidth).toBe(576);
    expect(map.worldHeight).toBe(576);
    expect(findMarkerPositions(map, "player_spawn")).toEqual([{ x: 80, y: 336, tileX: 2, tileY: 10 }]);
  });

  it("classifies Charles Jr. restaurant collision from semantic structures and objects", () => {
    const map = loadSemanticMapFromProjectFile("Charles");
    const collision = buildCollisionGrid(map);

    expect(collision.isSolidTile(0, 0)).toBe(true); // exterior wall
    expect(collision.isSolidTile(0, 16)).toBe(true); // no floor outside shell
    expect(collision.isSolidTile(1, 1)).toBe(true); // booth seat
    expect(collision.isSolidTile(4, 4)).toBe(true); // dining table
    expect(collision.isSolidTile(9, 14)).toBe(true); // cashier counter

    expect(collision.isSolidTile(11, 4)).toBe(false); // entrance_exit structure remains passable
    expect(collision.isSolidTile(1, 10)).toBe(false); // entrance_exit marker remains passable
    expect(collision.isSolidTile(2, 10)).toBe(false); // player_spawn marker only
    expect(collision.isSolidTile(9, 13)).toBe(false); // order_interaction marker only
    expect(collision.isSolidTile(6, 6)).toBe(false); // npc_spawn marker only
    expect(collision.isSolidTile(9, 15)).toBe(true); // cashier_spawn sits on an exterior_wall tile in the source map
  });

  it("uses the unmodified corrected Charles Jr. map file identity", () => {
    const raw = JSON.parse(
      readFileSync(resolve(process.cwd(), "Charles.json"), "utf8")
    ) as { mapId?: string; mapName?: string; displayName?: string };

    expect(raw.mapId).toBe("Charles");
    expect(raw.mapName).toBe("Charles");
    expect(raw.displayName).toBe("Charles");
  });

  it("uses the reviewed main neighborhood hub map file identity", () => {
    const raw = JSON.parse(
      readFileSync(resolve(process.cwd(), "Overworld.json"), "utf8")
    ) as { mapId?: string; mapName?: string; displayName?: string; width?: number; height?: number; gameTileSizePx?: number };

    expect(raw.mapId).toBe("Overworld");
    expect(raw.mapName).toBe("Overworld");
    expect(raw.displayName).toBe("Overworld");
    expect(raw.width).toBe(42);
    expect(raw.height).toBe(30);
    expect(raw.gameTileSizePx).toBe(32);
  });
});
