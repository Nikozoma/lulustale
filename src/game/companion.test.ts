import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { CompanionInteractions } from "./characterAssets";
import {
  beginCompanionCommand,
  beginCompanionInteraction,
  beginFetch,
  createCompanion,
  getFeedingPropPosition,
  getFetchToyPosition,
  resetCompanionForMap,
  updateCompanion
} from "./companion";
import { pointInRect, type FoundationSemantic, type FoundationVisual, type RuntimeMap } from "./foundation";
import { createPlayer } from "./player";

const interactions = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/assets/characters/brutus/INTERACTIONS.json"), "utf8")
) as CompanionInteractions;

function openMap(): RuntimeMap {
  const widthTiles = 32;
  const heightTiles = 24;
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

describe("daytime Brutus companion subsystem", () => {
  it("follows recent player path with a trailing distance and natural catch-up", () => {
    const map = openMap();
    const player = createPlayer({ x: 400, y: 400 });
    const companion = createCompanion({ x: 328, y: 400 });
    const startX = companion.position.x;
    for (let index = 0; index < 80; index += 1) {
      player.position.x += 3;
      player.isMoving = true;
      updateCompanion(companion, player, 0.05, map, interactions);
    }
    expect(companion.position.x).toBeGreaterThan(startX + 120);
    expect(Math.hypot(companion.position.x - player.position.x, companion.position.y - player.position.y)).toBeLessThan(180);
  });

  it("recovers near a recent safe player position when separation is excessive", () => {
    const map = openMap();
    const player = createPlayer({ x: 700, y: 500 });
    const companion = createCompanion({ x: 40, y: 40 });
    updateCompanion(companion, player, 0.05, map, interactions);
    expect(companion.fallbackCount).toBe(1);
    expect(Math.hypot(companion.position.x - player.position.x, companion.position.y - player.position.y)).toBeLessThan(150);
  });

  it("uses supplied root offsets and timing for synchronized petting", () => {
    const map = openMap();
    const player = createPlayer({ x: 400, y: 400 }, "down");
    const companion = createCompanion({ x: 400, y: 434 }, "up");
    expect(beginCompanionInteraction("petting", companion, player, map, interactions)).toEqual({ ok: true });
    expect(player.action).toBe("pet_dog");
    expect(companion.action).toBe("being_petted");
    expect(companion.position).toEqual({ x: 400, y: 434 });
    for (let index = 0; index < 8; index += 1) {
      updateCompanion(companion, player, 0.1, map, interactions);
    }
    expect(player.action).toBeNull();
    expect(companion.action).toBe("happy_excited");
  });

  it("uses feeding metadata for a separate real prop and command metadata for stay/follow", () => {
    const map = openMap();
    const player = createPlayer({ x: 400, y: 400 }, "down");
    const companion = createCompanion({ x: 400, y: 438 }, "up");
    expect(beginCompanionInteraction("feeding", companion, player, map, interactions)).toEqual({ ok: true });
    updateCompanion(companion, player, 0.2, map, interactions);
    expect(getFeedingPropPosition(companion, player, interactions)).toEqual({ x: 400, y: 429 });
    for (let index = 0; index < 7; index += 1) {
      updateCompanion(companion, player, 0.1, map, interactions);
    }

    companion.position = { x: 400, y: 442 };
    expect(beginCompanionInteraction("companion_command", companion, player, map, interactions)).toEqual({ ok: true });
    for (let index = 0; index < 8; index += 1) {
      updateCompanion(companion, player, 0.1, map, interactions);
    }
    expect(companion.mode).toBe("stay");
    expect(companion.action).toBe("stand_to_sit");
  });


  it("supports explicit sit, lie-down, and follow commands", () => {
    const map = openMap();
    const player = createPlayer({ x: 400, y: 400 }, "down");
    const companion = createCompanion({ x: 400, y: 442 }, "up");

    expect(beginCompanionCommand("lay", companion, player, map, interactions)).toEqual({ ok: true });
    for (let index = 0; index < 8; index += 1) updateCompanion(companion, player, 0.1, map, interactions);
    expect(companion.mode).toBe("stay");
    expect(companion.commandPose).toBe("lay");

    companion.position = { x: 400, y: 442 };
    expect(beginCompanionCommand("follow", companion, player, map, interactions)).toEqual({ ok: true });
    for (let index = 0; index < 8; index += 1) updateCompanion(companion, player, 0.1, map, interactions);
    expect(companion.mode).toBe("follow");
    expect(companion.commandPose).toBeNull();
  });

  it("runs a complete fetch cycle with the separate toy prop", () => {
    const map = openMap();
    const player = createPlayer({ x: 400, y: 400 }, "right");
    const companion = createCompanion({ x: 400, y: 442 }, "up");
    expect(beginFetch(companion, player, map, interactions)).toEqual({ ok: true });
    expect(player.action).toBe("throw_toy");
    expect(getFetchToyPosition(companion, interactions)).not.toBeNull();

    for (let index = 0; index < 240 && companion.fetch; index += 1) {
      updateCompanion(companion, player, 0.05, map, interactions);
    }
    expect(companion.fetch).toBeNull();
    expect(companion.action).toBe("happy_excited");
  });

  it("lets Brutus roam to safe rest spots when Lulu is idle at home", () => {
    const map = openMap();
    const player = createPlayer({ x: 400, y: 400 });
    const companion = createCompanion({ x: 328, y: 400 });
    companion.pathHistory = [{ x: 328, y: 400 }, { x: 400, y: 400 }];
    const start = { ...companion.position };
    for (let index = 0; index < 240; index += 1) {
      player.isMoving = false;
      updateCompanion(companion, player, 0.05, map, interactions);
    }
    expect(Math.hypot(companion.position.x - start.x, companion.position.y - start.y)).toBeGreaterThan(20);
    expect(["sniff", "sit", "lay_rest", null]).toContain(companion.action);
  });

  it("places Brutus outside transition activation areas after a map change", () => {
    const map = openMap();
    map.semantic.transitions.push({
      id: "door",
      pixel_rect: { x: 350, y: 350, width: 100, height: 100 },
      target_map: "overworld",
      target_transition_id: "return",
      target_spawn_id: "spawn",
      activation: "player_enter"
    });
    const player = createPlayer({ x: 400, y: 400 });
    const companion = createCompanion({ x: 400, y: 400 });
    resetCompanionForMap(companion, map, player.position, { x: 400, y: 400 });
    expect(pointInRect(companion.position, map.semantic.transitions[0].pixel_rect)).toBe(false);
  });
});
