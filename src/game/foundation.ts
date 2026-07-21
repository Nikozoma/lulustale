import type { VisualPhase } from "./visual";

export type FoundationMapId = "home" | "overworld" | "charles_jr";

export type WorldPoint = { x: number; y: number };
export type PixelRect = { x: number; y: number; width: number; height: number };
export type Collider = { width: number; height: number; centerOffsetY: number };

export type SpawnDefinition = {
  id: string;
  pixel_point: WorldPoint;
  facing: string;
  source_transition_id?: string;
};

export type TransitionDefinition = {
  id: string;
  pixel_rect: PixelRect;
  target_map: FoundationMapId;
  target_transition_id: string;
  target_spawn_id: string;
  activation: "player_enter";
};

export type InteractionDefinition = {
  id: string;
  pixel_rect: PixelRect;
  action: string;
  facing: string;
};

export type NpcAnchorDefinition = {
  id: string;
  pixel_point: WorldPoint;
  kind: string;
  facing: string;
  enabled_by_default: boolean;
};

export type FoundationSemantic = {
  schema_version: string;
  map_id: FoundationMapId;
  map_dimensions: {
    tiles: { width: number; height: number };
    pixels: { width: number; height: number };
    tile_size_px: number;
    world_scale: number;
  };
  spawns: SpawnDefinition[];
  transitions: TransitionDefinition[];
  interactions: InteractionDefinition[];
  npc_spawn_markers: NpcAnchorDefinition[];
};

export type CollisionSource = {
  schema_version: string;
  map_id: FoundationMapId;
  width_tiles: number;
  height_tiles: number;
  tile_size_px: number;
  encoding: "row_rle_count_colon_value";
  rows_rle: string[];
};

export type AlphaComponent = {
  id: string;
  pixel_bbox: PixelRect;
  trigger_tile_rect: PixelRect;
};

export type ForegroundLayer = {
  id: string;
  z_index: number;
  asset: string;
  sha256: string;
  occlusion_opacity?: number;
  alpha_components: AlphaComponent[];
};

export type FoundationVisual = {
  schema_version: string;
  map_id: FoundationMapId;
  variant: VisualPhase;
  canvas: { width_px: number; height_px: number; tile_size_px: number };
  base_layer: { asset: string; sha256: string; origin_px: WorldPoint; z_index: number };
  foreground_layers: ForegroundLayer[];
};

export type RuntimeMap = {
  id: FoundationMapId;
  semantic: FoundationSemantic;
  collision: boolean[][];
  visuals: Record<VisualPhase, FoundationVisual>;
  width: number;
  height: number;
  tileSize: number;
};

export type LoadedForeground = { definition: ForegroundLayer; image: HTMLImageElement };
export type LoadedMapVisual = {
  phase: VisualPhase;
  definition: FoundationVisual;
  base: HTMLImageElement;
  foregrounds: LoadedForeground[];
};

export const FOUNDATION_MAP_IDS: readonly FoundationMapId[] = ["home", "overworld", "charles_jr"];

export async function loadFoundationMaps(): Promise<Map<FoundationMapId, RuntimeMap>> {
  const entries = await Promise.all(
    FOUNDATION_MAP_IDS.map(async (id) => {
      const base = `/data/maps/${id}`;
      const [semantic, collisionSource, day, night] = await Promise.all([
        fetchJson<FoundationSemantic>(`${base}/semantic.json`),
        fetchJson<CollisionSource>(`${base}/collision_grid.json`),
        fetchJson<FoundationVisual>(`${base}/visual_day.json`),
        fetchJson<FoundationVisual>(`${base}/visual_night.json`)
      ]);
      const collision = decodeCollisionGrid(collisionSource);
      validateRuntimeMap(id, semantic, collisionSource, day, night, collision);
      return [
        id,
        {
          id,
          semantic,
          collision,
          visuals: { day, night },
          width: semantic.map_dimensions.pixels.width,
          height: semantic.map_dimensions.pixels.height,
          tileSize: semantic.map_dimensions.tile_size_px
        }
      ] as const;
    })
  );
  return new Map(entries);
}

export async function loadMapVisual(map: RuntimeMap, phase: VisualPhase): Promise<LoadedMapVisual> {
  const definition = map.visuals[phase];
  const [base, ...foregroundImages] = await Promise.all([
    loadImage(mapAssetHref(definition.base_layer.asset)),
    ...definition.foreground_layers.map((layer) => loadImage(mapAssetHref(layer.asset)))
  ]);
  return {
    phase,
    definition,
    base,
    foregrounds: definition.foreground_layers.map((foreground, index) => ({
      definition: foreground,
      image: foregroundImages[index]
    }))
  };
}

export function decodeCollisionGrid(source: CollisionSource): boolean[][] {
  if (source.rows_rle.length !== source.height_tiles) {
    throw new Error(`${source.map_id} collision row count does not match its declared height.`);
  }
  return source.rows_rle.map((row, rowIndex) => {
    const decoded = row.split(",").flatMap((run) => {
      const [countText, valueText] = run.split(":");
      const count = Number(countText);
      const value = Number(valueText);
      if (!Number.isInteger(count) || count < 1 || (value !== 0 && value !== 1)) {
        throw new Error(`${source.map_id} collision row ${rowIndex} contains invalid RLE data.`);
      }
      return Array.from({ length: count }, () => value === 1);
    });
    if (decoded.length !== source.width_tiles) {
      throw new Error(`${source.map_id} collision row ${rowIndex} has ${decoded.length} columns.`);
    }
    return decoded;
  });
}

export function canOccupy(map: RuntimeMap, point: WorldPoint, collider: Collider): boolean {
  const centerY = point.y + collider.centerOffsetY;
  const left = point.x - collider.width / 2;
  const right = point.x + collider.width / 2;
  const top = centerY - collider.height / 2;
  const bottom = centerY + collider.height / 2;
  if (left < 0 || top < 0 || right > map.width || bottom > map.height) {
    return false;
  }
  const epsilon = 0.001;
  const minTileX = Math.floor(left / map.tileSize);
  const maxTileX = Math.floor((right - epsilon) / map.tileSize);
  const minTileY = Math.floor(top / map.tileSize);
  const maxTileY = Math.floor((bottom - epsilon) / map.tileSize);
  for (let y = minTileY; y <= maxTileY; y += 1) {
    for (let x = minTileX; x <= maxTileX; x += 1) {
      if (!map.collision[y]?.[x]) {
        return false;
      }
    }
  }
  return true;
}

export function transitionAt(map: RuntimeMap, point: WorldPoint): TransitionDefinition | null {
  return map.semantic.transitions.find((transition) => pointInRect(point, transition.pixel_rect)) ?? null;
}

export function getSpawn(map: RuntimeMap, spawnId?: string): SpawnDefinition {
  const spawn = spawnId
    ? map.semantic.spawns.find((candidate) => candidate.id === spawnId)
    : map.semantic.spawns.find((candidate) => candidate.id.includes("default"));
  if (!spawn) {
    throw new Error(`${map.id} is missing required spawn ${spawnId ?? "default"}.`);
  }
  return spawn;
}

export function resolveSafeSpawn(
  map: RuntimeMap,
  spawn: SpawnDefinition,
  collider: Collider
): { position: WorldPoint; adjusted: boolean } {
  if (canOccupy(map, spawn.pixel_point, collider) && transitionAt(map, spawn.pixel_point) === null) {
    return { position: { ...spawn.pixel_point }, adjusted: false };
  }
  const position = findSafePlacement(map, spawn.pixel_point, collider, true);
  if (!position) {
    throw new Error(`${map.id}:${spawn.id} has no safe runtime placement near its authoritative point.`);
  }
  return { position, adjusted: true };
}

export function findSafePlacement(
  map: RuntimeMap,
  origin: WorldPoint,
  collider: Collider,
  avoidTransitions = true
): WorldPoint | null {
  const candidates: WorldPoint[] = [{ ...origin }];
  for (let radius = 16; radius <= 160; radius += 16) {
    for (const [x, y] of [
      [0, radius],
      [-radius, 0],
      [radius, 0],
      [0, -radius],
      [-radius, radius],
      [radius, radius],
      [-radius, -radius],
      [radius, -radius]
    ] as const) {
      candidates.push({ x: origin.x + x, y: origin.y + y });
    }
  }
  return (
    candidates.find(
      (candidate) => canOccupy(map, candidate, collider) && (!avoidTransitions || transitionAt(map, candidate) === null)
    ) ?? null
  );
}

export function pointInRect(point: WorldPoint, rect: PixelRect): boolean {
  return point.x >= rect.x && point.y >= rect.y && point.x < rect.x + rect.width && point.y < rect.y + rect.height;
}

function validateRuntimeMap(
  id: FoundationMapId,
  semantic: FoundationSemantic,
  collisionSource: CollisionSource,
  day: FoundationVisual,
  night: FoundationVisual,
  collision: boolean[][]
): void {
  const dimensions = semantic.map_dimensions;
  if (
    semantic.map_id !== id ||
    collisionSource.map_id !== id ||
    day.map_id !== id ||
    night.map_id !== id ||
    dimensions.world_scale !== 1 ||
    dimensions.tile_size_px !== 32 ||
    day.canvas.width_px !== dimensions.pixels.width ||
    day.canvas.height_px !== dimensions.pixels.height ||
    night.canvas.width_px !== dimensions.pixels.width ||
    night.canvas.height_px !== dimensions.pixels.height ||
    collision.length !== dimensions.tiles.height ||
    collision[0]?.length !== dimensions.tiles.width
  ) {
    throw new Error(`${id} failed authoritative map contract validation.`);
  }
}

function mapAssetHref(assetPath: string): string {
  const relative = assetPath.replace(/^production\//, "");
  return `/assets/maps/native/${relative}`;
}

async function fetchJson<T>(href: string): Promise<T> {
  const response = await fetch(href);
  if (!response.ok) {
    throw new Error(`Unable to load ${href}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

function loadImage(href: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load authoritative image ${href}.`));
    image.src = href;
  });
}
