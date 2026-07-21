import { CHARACTER_CELL, ROOT_ANCHOR } from "./constants";
import type { Facing } from "./player";

export const DIRECTION_ORDER = [
  "Down",
  "Down-Left",
  "Left",
  "Up-Left",
  "Up",
  "Up-Right",
  "Right",
  "Down-Right"
] as const;

export type DirectionName = (typeof DIRECTION_ORDER)[number];

type LuluAnimationManifest = {
  sheet: string;
  frames_per_direction: number;
  sheet_size: [number, number];
};

type CompanionAnimationManifest = {
  filename: string;
  frame_cell: [number, number];
  sheet_dimensions: [number, number];
  frames_per_direction: number;
  direction_order: DirectionName[];
  ground_root_anchor: [number, number];
};

export type LuluManifest = {
  package: string;
  frame_cell: [number, number];
  row_order: DirectionName[];
  foot_anchor: [number, number];
  animations: Record<string, LuluAnimationManifest>;
};

export type BrutusManifest = {
  package: string;
  frame_cell: [number, number];
  direction_order: DirectionName[];
  brutus_master_scale: { ground_root_anchor: [number, number] };
  brutus_animations: Record<string, CompanionAnimationManifest>;
  lulu_interaction_animations: Record<string, CompanionAnimationManifest>;
};

export type InteractionDirection = {
  brutus_relative_offset: [number, number];
  lulu_facing: DirectionName;
  brutus_facing: DirectionName;
  food_placement_relative_to_lulu_root?: [number, number];
  brutus_play_ready_relative_offset?: [number, number];
  brutus_mouth_anchor_local?: [number, number];
  lulu_throw_origin_local?: [number, number];
};

export type SynchronizedInteractionDefinition = {
  lulu_animation: string;
  brutus_animation: string;
  synchronization: {
    frame_ms: number;
    total_frames?: number;
    food_spawn_frame?: number;
    command_cue_frame?: number;
    response_frame?: number;
    throw_release_frame?: number;
  };
  per_direction: Record<DirectionName, InteractionDirection>;
};

export type CompanionInteractions = {
  interactions: Record<string, SynchronizedInteractionDefinition>;
};

export type AnimationDefinition = {
  name: string;
  image: HTMLImageElement;
  framesPerDirection: number;
  frameWidth: number;
  frameHeight: number;
  rootAnchorX: number;
  rootAnchorY: number;
};

export type CharacterAssets = {
  lulu: Map<string, AnimationDefinition>;
  brutus: Map<string, AnimationDefinition>;
  interactions: CompanionInteractions;
  foodPropImage: HTMLImageElement;
};

export async function loadCharacterAssets(): Promise<CharacterAssets> {
  const [luluManifest, brutusManifest, interactions, foodPropImage] = await Promise.all([
    fetchJson<LuluManifest>("/assets/characters/lulu/MANIFEST.json"),
    fetchJson<BrutusManifest>("/assets/characters/brutus/MANIFEST.json"),
    fetchJson<CompanionInteractions>("/assets/characters/brutus/INTERACTIONS.json"),
    loadImage("/assets/top-down-retro-interior/TopDownHouse_SmallItems.png")
  ]);
  validateManifests(luluManifest, brutusManifest);

  const luluEntries = [
    ...Object.entries(luluManifest.animations).map(([name, definition]) => ({
      name,
      href: `/assets/characters/lulu/${definition.sheet}`,
      framesPerDirection: definition.frames_per_direction,
      frameWidth: luluManifest.frame_cell[0],
      frameHeight: luluManifest.frame_cell[1],
      rootAnchorX: luluManifest.foot_anchor[0],
      rootAnchorY: luluManifest.foot_anchor[1]
    })),
    ...Object.entries(brutusManifest.lulu_interaction_animations).map(([name, definition]) => ({
      name,
      href: `/assets/characters/brutus/${definition.filename}`,
      framesPerDirection: definition.frames_per_direction,
      frameWidth: definition.frame_cell[0],
      frameHeight: definition.frame_cell[1],
      rootAnchorX: definition.ground_root_anchor[0],
      rootAnchorY: definition.ground_root_anchor[1]
    }))
  ];
  const brutusEntries = Object.entries(brutusManifest.brutus_animations).map(([name, definition]) => ({
    name,
    href: `/assets/characters/brutus/${definition.filename}`,
    framesPerDirection: definition.frames_per_direction,
    frameWidth: definition.frame_cell[0],
    frameHeight: definition.frame_cell[1],
    rootAnchorX: definition.ground_root_anchor[0],
    rootAnchorY: definition.ground_root_anchor[1]
  }));

  const [lulu, brutus] = await Promise.all([loadAnimationMap(luluEntries), loadAnimationMap(brutusEntries)]);
  return { lulu, brutus, interactions, foodPropImage };
}

export function directionNameForFacing(facing: Facing): DirectionName {
  const names: Record<Facing, DirectionName> = {
    down: "Down",
    left_down: "Down-Left",
    left: "Left",
    left_up: "Up-Left",
    up: "Up",
    right_up: "Up-Right",
    right: "Right",
    right_down: "Down-Right"
  };
  return names[facing];
}

export function facingForDirectionName(direction: DirectionName): Facing {
  return {
    Down: "down",
    "Down-Left": "left_down",
    Left: "left",
    "Up-Left": "left_up",
    Up: "up",
    "Up-Right": "right_up",
    Right: "right",
    "Down-Right": "right_down"
  }[direction] as Facing;
}

export function directionRow(facing: Facing): number {
  return DIRECTION_ORDER.indexOf(directionNameForFacing(facing));
}

async function loadAnimationMap(
  entries: Array<Omit<AnimationDefinition, "image"> & { href: string }>
): Promise<Map<string, AnimationDefinition>> {
  const loaded = await Promise.all(
    entries.map(async ({ href, ...definition }) => [definition.name, { ...definition, image: await loadImage(href) }] as const)
  );
  return new Map(loaded);
}

function validateManifests(lulu: LuluManifest, brutus: BrutusManifest): void {
  const expectedDirections = JSON.stringify(DIRECTION_ORDER);
  if (
    lulu.frame_cell[0] !== CHARACTER_CELL.width ||
    lulu.frame_cell[1] !== CHARACTER_CELL.height ||
    lulu.foot_anchor[0] !== ROOT_ANCHOR.x ||
    lulu.foot_anchor[1] !== ROOT_ANCHOR.y ||
    JSON.stringify(lulu.row_order) !== expectedDirections ||
    brutus.frame_cell[0] !== CHARACTER_CELL.width ||
    brutus.frame_cell[1] !== CHARACTER_CELL.height ||
    JSON.stringify(brutus.direction_order) !== expectedDirections
  ) {
    throw new Error("Authoritative character manifests do not match the v1.1 runtime contract.");
  }
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
    image.onerror = () => reject(new Error(`Unable to load authoritative character asset ${href}.`));
    image.src = href;
  });
}
