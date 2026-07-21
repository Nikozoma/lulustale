import { describe, expect, it } from "vitest";
import { PLAYER, WALK_MAX_STRENGTH } from "./constants";
import type { FoundationSemantic, FoundationVisual, RuntimeMap } from "./foundation";
import { createPlayer, updatePlayer } from "./player";

function createOpenMap(widthTiles = 20, heightTiles = 20): RuntimeMap {
  const semantic = {
    schema_version: "1.0.0",
    map_id: "home",
    map_dimensions: {
      tiles: { width: widthTiles, height: heightTiles },
      pixels: { width: widthTiles * 32, height: heightTiles * 32 },
      tile_size_px: 32,
      world_scale: 1
    },
    spawns: [],
    transitions: [],
    interactions: [],
    npc_spawn_markers: []
  } satisfies FoundationSemantic;
  const visual = {
    schema_version: "1.0.0",
    map_id: "home",
    variant: "day",
    canvas: { width_px: widthTiles * 32, height_px: heightTiles * 32, tile_size_px: 32 },
    base_layer: { asset: "", sha256: "", origin_px: { x: 0, y: 0 }, z_index: 0 },
    foreground_layers: []
  } satisfies FoundationVisual;
  return {
    id: "home",
    semantic,
    collision: Array.from({ length: heightTiles }, () => Array.from({ length: widthTiles }, () => true)),
    visuals: { day: visual, night: { ...visual, variant: "night" } },
    width: widthTiles * 32,
    height: heightTiles * 32,
    tileSize: 32
  };
}

describe("authoritative player movement", () => {
  it("uses low analog strength to walk and ordinary strength to run", () => {
    const map = createOpenMap();
    const walker = createPlayer({ x: 160, y: 160 });
    const runner = createPlayer({ x: 160, y: 224 });
    updatePlayer(walker, { x: WALK_MAX_STRENGTH, y: 0 }, 1, map);
    updatePlayer(runner, { x: WALK_MAX_STRENGTH + 0.01, y: 0 }, 1, map);
    expect(walker.position.x).toBe(160 + PLAYER.walkSpeedPxPerSecond);
    expect(runner.position.x).toBe(160 + PLAYER.runSpeedPxPerSecond);
    expect(walker.isRunning).toBe(false);
    expect(runner.isRunning).toBe(true);
  });

  it("treats full-strength keyboard movement as running", () => {
    const map = createOpenMap();
    const player = createPlayer({ x: 160, y: 160 });
    updatePlayer(player, { x: 1, y: 0 }, 1, map);
    expect(player.position.x).toBe(160 + PLAYER.runSpeedPxPerSecond);
    expect(player.isRunning).toBe(true);
  });

  it("normalizes diagonal movement", () => {
    const map = createOpenMap();
    const player = createPlayer({ x: 256, y: 256 });
    updatePlayer(player, { x: 1, y: -1 }, 1, map);
    expect(Math.hypot(player.position.x - 256, player.position.y - 256)).toBeCloseTo(
      PLAYER.runSpeedPxPerSecond
    );
    expect(player.facing).toBe("right_up");
  });

  it("uses the 20x12 foot-level collider", () => {
    const map = createOpenMap(4, 4);
    map.collision[1][2] = false;
    const player = createPlayer({ x: 54, y: 64 });
    updatePlayer(player, { x: 1, y: 0 }, 0.5, map);
    expect(player.position.x).toBeLessThan(64 - PLAYER.collider.width / 2 + 0.01);
    expect(PLAYER.collider).toEqual({ width: 20, height: 12, centerOffsetY: -6 });
  });

  it("locks movement while a reusable action animation is active", () => {
    const map = createOpenMap();
    const player = createPlayer({ x: 160, y: 160 });
    player.action = "pet_dog";
    updatePlayer(player, { x: 1, y: 0 }, 0.5, map);
    expect(player.position).toEqual({ x: 160, y: 160 });
    expect(player.actionTime).toBeCloseTo(0.5);
  });
});
