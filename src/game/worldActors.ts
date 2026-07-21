import type { AnimationDefinition, DirectionName } from "./characterAssets";
import type { Facing } from "./player";
import type { WorldPoint } from "./foundation";

export type WorldActorRenderState = {
  id: string;
  position: WorldPoint;
  facing: Facing;
  definition: AnimationDefinition;
  animationTime: number;
  frameSeconds: number;
};

type NpcSheet = {
  filename: string;
  character_key: string;
  action: string;
  frame_cell_size: [number, number];
  frames_per_direction: number;
  direction_order: DirectionName[];
  ground_root_anchor: [number, number];
};

type NpcManifest = {
  runtime_direction_order: DirectionName[];
  sheets: NpcSheet[];
};

type BirdSheet = {
  filename: string;
  bird_id: string;
  action: string;
  frame_cell_size: [number, number];
  frames_per_direction: number;
  direction_order: DirectionName[];
  root_anchor: [number, number];
};

type BirdManifest = {
  runtime_direction_order: DirectionName[];
  sheets: BirdSheet[];
};

export type WorldActorAssets = {
  npcs: Map<string, AnimationDefinition>;
  birds: Map<string, AnimationDefinition>;
};

const REQUIRED_NPC_KEYS = new Set([
  "homeless_man_day:idle",
  "homeless_man_day:sit",
  "homeless_man_day:simple_gesture",
  "wizard_night:idle",
  "wizard_night:stand_pose",
  "wizard_night:magic_gesture",
  "charles_jr_employee:idle",
  "charles_jr_employee:serve_gesture",
  ...Array.from({ length: 8 }, (_, index) => `pedestrian_${String(index + 1).padStart(2, "0")}:idle`)
]);

const REQUIRED_BIRD_KEYS = new Set([
  "primary_fries_thief:idle",
  "primary_fries_thief:alert_interested",
  "primary_fries_thief:theft_attempt",
  "primary_fries_thief:carry_fly",
  "bird_lookout:idle",
  "peck_captain:idle",
  "peck_captain:command_reaction",
  "ambient_robin:idle"
]);

export async function loadWorldActorAssets(): Promise<WorldActorAssets> {
  const [npcManifest, birdManifest] = await Promise.all([
    fetchJson<NpcManifest>("/assets/characters/npcs/MANIFEST.json"),
    fetchJson<BirdManifest>("/assets/characters/birds/MANIFEST.json")
  ]);

  const npcEntries = npcManifest.sheets
    .map((sheet) => ({ key: `${sheet.character_key}:${sheet.action}`, sheet }))
    .filter(({ key }) => REQUIRED_NPC_KEYS.has(key));
  const birdEntries = birdManifest.sheets
    .map((sheet) => ({ key: `${sheet.bird_id}:${sheet.action}`, sheet }))
    .filter(({ key }) => REQUIRED_BIRD_KEYS.has(key));

  const [npcs, birds] = await Promise.all([
    loadDefinitions(
      npcEntries.map(({ key, sheet }) => ({
        key,
        href: `/assets/characters/npcs/${sheet.filename}`,
        framesPerDirection: sheet.frames_per_direction,
        frameWidth: sheet.frame_cell_size[0],
        frameHeight: sheet.frame_cell_size[1],
        rootAnchorX: sheet.ground_root_anchor[0],
        rootAnchorY: sheet.ground_root_anchor[1]
      }))
    ),
    loadDefinitions(
      birdEntries.map(({ key, sheet }) => ({
        key,
        href: `/assets/characters/birds/${sheet.filename}`,
        framesPerDirection: sheet.frames_per_direction,
        frameWidth: sheet.frame_cell_size[0],
        frameHeight: sheet.frame_cell_size[1],
        rootAnchorX: sheet.root_anchor[0],
        rootAnchorY: sheet.root_anchor[1]
      }))
    )
  ]);

  for (const key of REQUIRED_NPC_KEYS) {
    if (!npcs.has(key)) {
      throw new Error(`Required NPC animation ${key} is missing from NPC_Overworld_Batch_v1.`);
    }
  }
  for (const key of REQUIRED_BIRD_KEYS) {
    if (!birds.has(key)) {
      throw new Error(`Required bird animation ${key} is missing from Bird_Overworld_Assets_Full_v1.`);
    }
  }

  return { npcs, birds };
}

export function requireNpcAnimation(assets: WorldActorAssets, key: string): AnimationDefinition {
  const definition = assets.npcs.get(key);
  if (!definition) {
    throw new Error(`NPC animation ${key} is not loaded.`);
  }
  return definition;
}

export function requireBirdAnimation(assets: WorldActorAssets, key: string): AnimationDefinition {
  const definition = assets.birds.get(key);
  if (!definition) {
    throw new Error(`Bird animation ${key} is not loaded.`);
  }
  return definition;
}

async function loadDefinitions(
  entries: Array<{
    key: string;
    href: string;
    framesPerDirection: number;
    frameWidth: number;
    frameHeight: number;
    rootAnchorX: number;
    rootAnchorY: number;
  }>
): Promise<Map<string, AnimationDefinition>> {
  const loaded = await Promise.all(
    entries.map(async ({ key, href, ...definition }) => [
      key,
      {
        name: key,
        image: await loadImage(href),
        ...definition
      }
    ] as const)
  );
  return new Map(loaded);
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
    image.onerror = () => reject(new Error(`Unable to load world actor asset ${href}.`));
    image.src = href;
  });
}
