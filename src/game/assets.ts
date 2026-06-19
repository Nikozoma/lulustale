import type { ObjectRenderRule } from "./renderPlan";

export type SpriteCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ImageAsset = {
  key: string;
  sourcePath: string;
  href: string;
};

export type TileSprite = {
  imageKey: string;
  crop: SpriteCrop;
};

export type ObjectSprite = TileSprite & {
  note: string;
  render: ObjectRenderRule;
};

export type AssetManifest = {
  images: ImageAsset[];
  tiles: Record<string, TileSprite>;
  objects: Record<string, ObjectSprite>;
  characters: {
    cashier: TileSprite;
  };
  lulu: {
    frameWidth: number;
    frameHeight: number;
    strips: Record<string, ImageAsset>;
  };
  dog: {
    image: ImageAsset;
    crop: SpriteCrop;
  };
};

const floors = imageAsset(
  "topDownFloorsWalls",
  "Top-Down_Retro_Interior/TopDownHouse_FloorsAndWalls.png",
  "/assets/top-down-retro-interior/TopDownHouse_FloorsAndWalls.png"
);
const doors = imageAsset(
  "topDownDoorsWindows",
  "Top-Down_Retro_Interior/TopDownHouse_DoorsAndWindows.png",
  "/assets/top-down-retro-interior/TopDownHouse_DoorsAndWindows.png"
);
const furniture = imageAsset(
  "topDownFurnitureState1",
  "Top-Down_Retro_Interior/TopDownHouse_FurnitureState1.png",
  "/assets/top-down-retro-interior/TopDownHouse_FurnitureState1.png"
);
const dogSheet = imageAsset(
  "dogSheet",
  "DogMegaPackFree/DogMegaPackFree/Dogs.png",
  "/assets/dog-mega-pack/Dogs.png"
);
const cashierSprite = imageAsset(
  "cashierCharacter9",
  "SuperRetroWorld_CharacterPack_Full/sprite_split/character_9/character_9_frame32x32.png",
  "/assets/super-retro-world/character_9_frame32x32.png"
);

const luluStrips = {
  down: imageAsset(
    "luluWalkDown",
    "The Female Adventurer - Free/Walk/walk_Down.png",
    "/assets/female-adventurer/walk/walk_Down.png"
  ),
  up: imageAsset(
    "luluWalkUp",
    "The Female Adventurer - Free/Walk/walk_Up.png",
    "/assets/female-adventurer/walk/walk_Up.png"
  ),
  left_down: imageAsset(
    "luluWalkLeftDown",
    "The Female Adventurer - Free/Walk/walk_Left_Down.png",
    "/assets/female-adventurer/walk/walk_Left_Down.png"
  ),
  left_up: imageAsset(
    "luluWalkLeftUp",
    "The Female Adventurer - Free/Walk/walk_Left_Up.png",
    "/assets/female-adventurer/walk/walk_Left_Up.png"
  ),
  right_down: imageAsset(
    "luluWalkRightDown",
    "The Female Adventurer - Free/Walk/walk_Right_Down.png",
    "/assets/female-adventurer/walk/walk_Right_Down.png"
  ),
  right_up: imageAsset(
    "luluWalkRightUp",
    "The Female Adventurer - Free/Walk/walk_Right_Up.png",
    "/assets/female-adventurer/walk/walk_Right_Up.png"
  )
};

export const ASSET_MANIFEST: AssetManifest = {
  images: [floors, doors, furniture, dogSheet, cashierSprite, ...Object.values(luluStrips)],
  tiles: {
    indoor_floor: {
      imageKey: floors.key,
      crop: { x: 144, y: 80, width: 16, height: 16 }
    },
    exterior_wall: {
      imageKey: floors.key,
      crop: { x: 80, y: 48, width: 16, height: 16 }
    },
    interior_wall: {
      imageKey: floors.key,
      crop: { x: 80, y: 48, width: 16, height: 16 }
    },
    window: {
      imageKey: doors.key,
      crop: { x: 96, y: 48, width: 32, height: 32 }
    },
    doorway: {
      imageKey: doors.key,
      crop: { x: 160, y: 80, width: 32, height: 48 }
    },
    entrance_exit: {
      imageKey: doors.key,
      crop: { x: 160, y: 80, width: 32, height: 48 }
    }
  },
  objects: {
    booth_seat: {
      imageKey: furniture.key,
      crop: { x: 32, y: 160, width: 48, height: 32 },
      render: { mode: "tile", anchor: "center" },
      note: "Tiled booth seating using the closest real couch/seat crop from TopDownHouse_FurnitureState1.png."
    },
    bed: {
      imageKey: furniture.key,
      crop: { x: 0, y: 80, width: 32, height: 48 },
      render: { mode: "fit", widthTiles: 1.4, heightTiles: 2, anchor: "bottom" },
      note: "Visible bed from TopDownHouse_FurnitureState1.png."
    },
    couch: {
      imageKey: furniture.key,
      crop: { x: 32, y: 160, width: 48, height: 32 },
      render: { mode: "fit", widthTiles: 1.6, heightTiles: 1.2, anchor: "center" },
      note: "Visible couch from TopDownHouse_FurnitureState1.png."
    },
    table: {
      imageKey: furniture.key,
      crop: { x: 96, y: 160, width: 48, height: 32 },
      render: { mode: "fit", widthTiles: 2, heightTiles: 1.3, anchor: "center" },
      note: "Visible table/cabinet surface from TopDownHouse_FurnitureState1.png."
    },
    dining_table: {
      imageKey: furniture.key,
      crop: { x: 96, y: 160, width: 48, height: 32 },
      render: { mode: "fit", widthTiles: 2, heightTiles: 1.3, anchor: "center" },
      note: "Visible dining table using real table/cabinet surface from TopDownHouse_FurnitureState1.png."
    },
    refrigerator: {
      imageKey: furniture.key,
      crop: { x: 0, y: 192, width: 32, height: 48 },
      render: { mode: "fit", widthTiles: 1.2, heightTiles: 1.8, anchor: "bottom" },
      note: "Visible refrigerator from TopDownHouse_FurnitureState1.png."
    },
    stove: {
      imageKey: furniture.key,
      crop: { x: 64, y: 208, width: 32, height: 32 },
      render: { mode: "fit", widthTiles: 1, heightTiles: 1, anchor: "bottom" },
      note: "Visible stove from TopDownHouse_FurnitureState1.png."
    },
    sink: {
      imageKey: furniture.key,
      crop: { x: 96, y: 208, width: 32, height: 32 },
      render: { mode: "fit", widthTiles: 1, heightTiles: 1, anchor: "bottom" },
      note: "Visible sink from TopDownHouse_FurnitureState1.png."
    },
    counter_top: {
      imageKey: furniture.key,
      crop: { x: 112, y: 224, width: 16, height: 16 },
      render: { mode: "tile", anchor: "bottom" },
      note: "Tiled counter/cabinet segment from TopDownHouse_FurnitureState1.png."
    },
    cashier_counter: {
      imageKey: furniture.key,
      crop: { x: 112, y: 224, width: 16, height: 16 },
      render: { mode: "tile", anchor: "bottom" },
      note: "Tiled cashier counter using a real cabinet/counter segment from TopDownHouse_FurnitureState1.png."
    },
    furniture_appliance: {
      imageKey: furniture.key,
      crop: { x: 192, y: 208, width: 16, height: 48 },
      render: { mode: "fit", widthTiles: 1, heightTiles: 3, anchor: "bottom" },
      note: "Visible tall appliance/cabinet edge from TopDownHouse_FurnitureState1.png."
    }
  },
  characters: {
    cashier: {
      imageKey: cashierSprite.key,
      crop: { x: 32, y: 0, width: 32, height: 32 }
    }
  },
  lulu: {
    frameWidth: 48,
    frameHeight: 64,
    strips: luluStrips
  },
  dog: {
    image: dogSheet,
    crop: { x: 0, y: 128, width: 64, height: 64 }
  }
};

export type LoadedImages = Map<string, HTMLImageElement>;

export async function loadImages(manifest: AssetManifest): Promise<LoadedImages> {
  const loaded = new Map<string, HTMLImageElement>();

  await Promise.all(
    manifest.images.map(
      (asset) =>
        new Promise<void>((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            loaded.set(asset.key, image);
            resolve();
          };
          image.onerror = () => reject(new Error(`Unable to load real asset: ${asset.sourcePath}`));
          image.src = asset.href;
        })
    )
  );

  return loaded;
}

function imageAsset(key: string, sourcePath: string, href: string): ImageAsset {
  return {
    key,
    sourcePath,
    href
  };
}
