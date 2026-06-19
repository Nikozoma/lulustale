import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MAP_REGISTRY, getMapSpec } from "./mapRegistry";
import { loadSemanticMapFromProjectFile } from "./mapRegistryNode";
import { buildCollisionGrid, findMarkerPositions } from "./world";

describe("map registry", () => {
  it("contains home and Charles Jr. map specs", () => {
    expect(Object.keys(MAP_REGISTRY).sort()).toEqual(["charles_jr_interior_day1", "home_interior_day1"]);
    expect(getMapSpec("home_interior_day1").fileName).toBe("home_interior_day1.semantic_tilemap.json");
    expect(getMapSpec("charles_jr_interior_day1").fileName).toBe(
      "charles_jr_interior_day1.semantic_tilemap.json"
    );
  });

  it("loads the corrected Charles Jr. semantic map metadata", () => {
    const map = loadSemanticMapFromProjectFile("charles_jr_interior_day1");

    expect(map.name).toBe("charles_jr_interior_day1");
    expect(map.widthTiles).toBe(18);
    expect(map.heightTiles).toBe(18);
    expect(map.tileSize).toBe(32);
    expect(map.worldWidth).toBe(576);
    expect(map.worldHeight).toBe(576);
    expect(findMarkerPositions(map, "player_spawn")).toEqual([{ x: 80, y: 336, tileX: 2, tileY: 10 }]);
  });

  it("classifies Charles Jr. restaurant collision from semantic structures and objects", () => {
    const map = loadSemanticMapFromProjectFile("charles_jr_interior_day1");
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
      readFileSync(resolve(process.cwd(), "charles_jr_interior_day1.semantic_tilemap.json"), "utf8")
    ) as { mapId?: string; mapName?: string; displayName?: string };

    expect(raw.mapId).toBe("charles_jr_interior_day1");
    expect(raw.mapName).toBe("charles_jr_interior_day1");
    expect(raw.displayName).toBe("Charles Jr. Interior");
  });
});
