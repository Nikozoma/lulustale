import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PLAYER } from "./constants";
import { canUseQuestTransition, createDemoQuestState, feedBrutusForQuest, takeDogFood } from "./demoQuest";
import {
  canOccupy,
  decodeCollisionGrid,
  pointInRect,
  resolveSafeSpawn,
  transitionAt,
  type CollisionSource,
  type FoundationMapId,
  type FoundationSemantic,
  type FoundationVisual,
  type RuntimeMap
} from "./foundation";
import { canActivateObjectiveMarker } from "./interactionSystem";
import { createPlayer, updatePlayer } from "./player";

const expected = {
  overworld: { tiles: [96, 68], pixels: [3072, 2176] },
  home: { tiles: [28, 43], pixels: [896, 1376] },
  charles_jr: { tiles: [39, 33], pixels: [1248, 1056] }
} as const;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8")) as T;
}

function runtimeMap(id: FoundationMapId): RuntimeMap {
  const root = `public/data/maps/${id}`;
  const semantic = readJson<FoundationSemantic>(`${root}/semantic.json`);
  const collisionSource = readJson<CollisionSource>(`${root}/collision_grid.json`);
  const day = readJson<FoundationVisual>(`${root}/visual_day.json`);
  const night = readJson<FoundationVisual>(`${root}/visual_night.json`);
  return {
    id,
    semantic,
    collision: decodeCollisionGrid(collisionSource),
    visuals: { day, night },
    width: semantic.map_dimensions.pixels.width,
    height: semantic.map_dimensions.pixels.height,
    tileSize: semantic.map_dimensions.tile_size_px
  };
}

describe("authoritative map runtime foundation", () => {
  it.each(Object.entries(expected) as Array<[FoundationMapId, (typeof expected)[FoundationMapId]]>)(
    "loads %s at the required native size and 1.0x world scale",
    (id, dimensions) => {
      const map = runtimeMap(id);
      expect([map.semantic.map_dimensions.tiles.width, map.semantic.map_dimensions.tiles.height]).toEqual(dimensions.tiles);
      expect([map.width, map.height]).toEqual(dimensions.pixels);
      expect(map.tileSize).toBe(32);
      expect(map.semantic.map_dimensions.world_scale).toBe(1);
      expect([map.semantic.map_dimensions.tiles.width, map.semantic.map_dimensions.tiles.height]).not.toEqual([48, 34]);
    }
  );

  it("keeps all destination spawns safe and outside their source activation rectangles", () => {
    const maps = new Map((Object.keys(expected) as FoundationMapId[]).map((id) => [id, runtimeMap(id)]));
    for (const map of maps.values()) {
      for (const spawn of map.semantic.spawns) {
        const resolved = resolveSafeSpawn(map, spawn, PLAYER.collider);
        expect(canOccupy(map, resolved.position, PLAYER.collider), `${map.id}:${spawn.id}`).toBe(true);
        expect(map.semantic.transitions.some((transition) => pointInRect(resolved.position, transition.pixel_rect))).toBe(false);
      }
    }
  });

  it("keeps the corrected Home entry spawn safe above the front-door threshold", () => {
    const home = runtimeMap("home");
    const spawn = home.semantic.spawns.find((candidate) => candidate.id === "spawn_home_entry")!;
    expect(canOccupy(home, spawn.pixel_point, PLAYER.collider)).toBe(true);
    expect(resolveSafeSpawn(home, spawn, PLAYER.collider)).toEqual({
      position: { x: 464, y: 1200 },
      adjusted: false
    });
  });

  it("aligns representative Home collision points to visible walls, dividers, furniture, and floor", () => {
    const home = runtimeMap("home");
    expect(home.collision[3][25]).toBe(false); // Bedroom right wall.
    expect(home.collision[15][13]).toBe(false); // Bedroom connector side wall.
    expect(home.collision[15][14]).toBe(true); // Visible connector opening.
    expect(home.collision[16][5]).toBe(false); // Main-room top divider wall.
    expect(home.collision[18][5]).toBe(true); // Main-room floor below divider.
    expect(home.collision[27][22]).toBe(true); // Floor band in front of stove/fridge.
    expect(home.collision[28][23]).toBe(false); // Right pantry front.
    expect(home.collision[38][10]).toBe(false); // Bottom wall outside door.
    expect(home.collision[38][12]).toBe(true); // Front-door opening.
  });

  it("keeps the Home collision companion synchronized with corrected semantic regions", () => {
    const home = runtimeMap("home");
    const semantic = readJson<FoundationSemantic & {
      walkable_regions: Array<{ tile_rect: TileRect }>;
      blocked_regions: Array<{ tile_rect: TileRect }>;
      passable_overrides: Array<{ tile_rect: TileRect }>;
    }>("public/data/maps/home/semantic.json");
    const derived = Array.from({ length: 43 }, () => Array.from({ length: 28 }, () => false));
    for (const region of semantic.walkable_regions) fillTiles(derived, region.tile_rect, true);
    for (const region of semantic.blocked_regions) fillTiles(derived, region.tile_rect, false);
    for (const region of semantic.passable_overrides) fillTiles(derived, region.tile_rect, true);
    expect(home.collision).toEqual(derived);
  });

  it("places the refrigerator objective within range of legal floor", () => {
    const home = runtimeMap("home");
    const refrigerator = home.semantic.interactions.find((candidate) => candidate.id === "interaction_refrigerator")!;
    const marker = {
      x: refrigerator.pixel_rect.x + refrigerator.pixel_rect.width / 2,
      y: refrigerator.pixel_rect.y + refrigerator.pixel_rect.height / 2
    };
    const legalFloor = { x: 720, y: 880 };
    expect(canOccupy(home, legalFloor, PLAYER.collider)).toBe(true);
    expect(canActivateObjectiveMarker(legalFloor, marker, 58)).toBe(true);
  });

  it("allows front-door traversal to activate Home to Overworld without bypassing quest gating", () => {
    const home = runtimeMap("home");
    const player = createPlayer({ x: 448, y: 1200 }, "down");
    updatePlayer(player, { x: 0, y: 1 }, false, 0.25, home);
    expect(player.position.y).toBeGreaterThan(1200);
    expect(transitionAt(home, player.position)?.id).toBe("transition_home_to_overworld");

    const beforeFeeding = createDemoQuestState();
    const readyToLeave = feedBrutusForQuest(takeDogFood(beforeFeeding));
    expect(canUseQuestTransition(beforeFeeding, "transition_home_to_overworld")).toBe(false);
    expect(canUseQuestTransition(readyToLeave, "transition_home_to_overworld")).toBe(true);
  });

  it("keeps Home and Charles Jr. transitions reciprocal with valid named arrival spawns", () => {
    const maps = new Map((Object.keys(expected) as FoundationMapId[]).map((id) => [id, runtimeMap(id)]));
    for (const map of maps.values()) {
      for (const transition of map.semantic.transitions) {
        const target = maps.get(transition.target_map)!;
        expect(target.semantic.transitions.some((candidate) => candidate.id === transition.target_transition_id)).toBe(true);
        expect(target.semantic.spawns.some((spawn) => spawn.id === transition.target_spawn_id)).toBe(true);
      }
    }
  });

  it("ships every selected day/night base and alpha-derived foreground at full-canvas origin", () => {
    for (const id of Object.keys(expected) as FoundationMapId[]) {
      const map = runtimeMap(id);
      for (const visual of Object.values(map.visuals)) {
        expect(visual.base_layer.origin_px).toEqual({ x: 0, y: 0 });
        expect([visual.canvas.width_px, visual.canvas.height_px]).toEqual(expected[id].pixels);
        for (const layer of visual.foreground_layers) {
          expect(layer.alpha_components.length).toBeGreaterThan(0);
          const assetPath = resolve(process.cwd(), "public/assets/maps/native", layer.asset.replace(/^production\//, ""));
          expect(existsSync(assetPath), assetPath).toBe(true);
          expect(readPngDimensions(assetPath)).toEqual(expected[id].pixels);
        }
        const basePath = resolve(
          process.cwd(),
          "public/assets/maps/native",
          visual.base_layer.asset.replace(/^production\//, "")
        );
        expect(existsSync(basePath), basePath).toBe(true);
        expect(readPngDimensions(basePath)).toEqual(expected[id].pixels);
      }
    }
  });

  it("matches every selected map byte to the runtime authority manifest", () => {
    const manifest = readJson<{ map_assets_sha256: Record<string, string> }>("RUNTIME_AUTHORITY_MANIFEST.json");
    for (const [relative, expectedHash] of Object.entries(manifest.map_assets_sha256)) {
      const bytes = readFileSync(resolve(process.cwd(), "public/assets/maps/native", relative));
      expect(createHash("sha256").update(bytes).digest("hex"), relative).toBe(expectedHash);
    }
  });

  it("keeps every active visual descriptor synchronized with runtime asset and package authority", () => {
    const manifest = readJson<{
      map_visual_sources: { overworld: string; home_and_charles_jr: string };
      map_assets_sha256: Record<string, string>;
    }>("RUNTIME_AUTHORITY_MANIFEST.json");
    const expectedPackages: Record<FoundationMapId, string> = {
      overworld: manifest.map_visual_sources.overworld,
      home: manifest.map_visual_sources.home_and_charles_jr.split(" (")[0],
      charles_jr: manifest.map_visual_sources.home_and_charles_jr.split(" (")[0]
    };

    for (const id of Object.keys(expected) as FoundationMapId[]) {
      for (const phase of ["day", "night"] as const) {
        const visual = readJson<VisualAuthorityDescriptor>(`public/data/maps/${id}/visual_${phase}.json`);
        expect(visual.art_source).toEqual({
          package: expectedPackages[id],
          authority: "RUNTIME_AUTHORITY_MANIFEST.json"
        });
        expectAssetHash(visual.base_layer.asset, visual.base_layer.sha256, manifest.map_assets_sha256);
        for (const layer of visual.foreground_layers) {
          expectAssetHash(layer.asset, layer.sha256, manifest.map_assets_sha256);
          expectAssetHash(layer.day_asset, layer.day_sha256, manifest.map_assets_sha256);
          expectAssetHash(layer.night_asset, layer.night_sha256, manifest.map_assets_sha256);
        }
      }
    }
  });
});

type VisualAuthorityDescriptor = FoundationVisual & {
  art_source: { package: string; authority: string };
  base_layer: FoundationVisual["base_layer"] & { sha256: string };
  foreground_layers: Array<FoundationVisual["foreground_layers"][number] & {
    sha256: string;
    day_asset: string;
    day_sha256: string;
    night_asset: string;
    night_sha256: string;
  }>;
};

type TileRect = { x: number; y: number; width: number; height: number };

function fillTiles(grid: boolean[][], rect: TileRect, value: boolean): void {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) grid[y][x] = value;
  }
}

function expectAssetHash(asset: string, embeddedHash: string, manifestHashes: Record<string, string>): void {
  const relative = asset.replace(/^production\//, "");
  const bytes = readFileSync(resolve(process.cwd(), "public/assets/maps/native", relative));
  const actual = createHash("sha256").update(bytes).digest("hex");
  expect(embeddedHash, asset).toBe(actual);
  expect(manifestHashes[relative], asset).toBe(actual);
}

function readPngDimensions(path: string): readonly [number, number] {
  const png = readFileSync(path);
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}
