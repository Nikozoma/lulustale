import { describe, expect, it } from "vitest";
import { ASSET_MANIFEST } from "./assets";

describe("asset manifest overworld readability mappings", () => {
  it("maps key overworld ground semantics to real city or nature assets", () => {
    expect(ASSET_MANIFEST.tiles.street.imageKey).toBe("cityPropTiles");
    expect(ASSET_MANIFEST.tiles.sidewalk.imageKey).toBe("cityPropTiles");
    expect(ASSET_MANIFEST.tiles.parking_lot.imageKey).toBe("cityPropTiles");
    expect(ASSET_MANIFEST.tiles.crosswalk.imageKey).toBe("cityPropTiles");
    expect(ASSET_MANIFEST.tiles.grass.imageKey).toBe("modernCityTiles");
  });

  it("renders overworld buildings as grouped real-asset facades", () => {
    expect(ASSET_MANIFEST.structures.player_apartment_building).toMatchObject({
      imageKey: "modernCityTiles",
      render: { mode: "fillRegion" }
    });
    expect(ASSET_MANIFEST.structures.charles_jr_building).toMatchObject({
      imageKey: "cityPropTiles",
      render: { mode: "fillRegion" }
    });
    expect(ASSET_MANIFEST.structures.apartment_building).toMatchObject({
      imageKey: "cityPropTiles",
      render: { mode: "fillRegion" }
    });
  });

  it("has real sprite crops for overworld transition door fixtures", () => {
    expect(ASSET_MANIFEST.tiles.home_door.imageKey).toBe("modernCityTiles");
    expect(ASSET_MANIFEST.tiles.charles_jr_door.imageKey).toBe("cityPropTiles");
  });

  it("maps home-specific indoor polish sprites to real Top-Down_Retro_Interior assets", () => {
    expect(ASSET_MANIFEST.tiles.home_floor).toMatchObject({
      imageKey: "topDownFloorsWalls",
      crop: { x: 16, y: 80, width: 16, height: 16 }
    });
    expect(ASSET_MANIFEST.tiles.home_wall).toMatchObject({
      imageKey: "topDownFloorsWalls",
      crop: { x: 144, y: 48, width: 16, height: 16 }
    });
    expect(ASSET_MANIFEST.tiles.entrance_exit).toMatchObject({
      imageKey: "topDownDoorsWindows",
      crop: { x: 128, y: 80, width: 32, height: 48 }
    });
    expect(ASSET_MANIFEST.objects.doorway.imageKey).toBe("topDownDoorsWindows");
    expect(ASSET_MANIFEST.objects.home_dining_table).toMatchObject({
      imageKey: "topDownFurnitureState1",
      render: { mode: "fit", widthTiles: 2, heightTiles: 1 }
    });
    expect(ASSET_MANIFEST.objects.bed).toMatchObject({
      imageKey: "modernInteriors32",
      crop: { x: 224, y: 2400, width: 64, height: 64 },
      render: { mode: "fit", widthTiles: 1.7, heightTiles: 2 }
    });
  });
});
