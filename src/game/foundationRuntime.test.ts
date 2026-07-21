import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PLAYER } from "./constants";
import {
  canOccupy,
  decodeCollisionGrid,
  pointInRect,
  resolveSafeSpawn,
  type CollisionSource,
  type FoundationMapId,
  type FoundationSemantic,
  type FoundationVisual,
  type RuntimeMap
} from "./foundation";

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

  it("deterministically resolves the bundled Home spawn/collision contradiction without editing source semantics", () => {
    const home = runtimeMap("home");
    const spawn = home.semantic.spawns.find((candidate) => candidate.id === "spawn_home_entry")!;
    expect(canOccupy(home, spawn.pixel_point, PLAYER.collider)).toBe(false);
    expect(resolveSafeSpawn(home, spawn, PLAYER.collider)).toEqual({
      position: { x: 464, y: 1232 },
      adjusted: true
    });
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
