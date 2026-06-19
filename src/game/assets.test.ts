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
});
