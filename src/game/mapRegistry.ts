export type MapId = "home_interior_day1" | "main_neighborhood_hub_day1" | "charles_jr_interior_day1";

export type MapSpec = {
  id: MapId;
  fileName: string;
  href: string;
};

export const MAP_REGISTRY: Record<MapId, MapSpec> = {
  home_interior_day1: {
    id: "home_interior_day1",
    fileName: "home_interior_day1.semantic_tilemap.json",
    href: new URL("../../home_interior_day1.semantic_tilemap.json", import.meta.url).href
  },
  main_neighborhood_hub_day1: {
    id: "main_neighborhood_hub_day1",
    fileName: "main_neighborhood_hub_day1.semantic_tilemap.json",
    href: new URL("../../main_neighborhood_hub_day1.semantic_tilemap.json", import.meta.url).href
  },
  charles_jr_interior_day1: {
    id: "charles_jr_interior_day1",
    fileName: "charles_jr_interior_day1.semantic_tilemap.json",
    href: new URL("../../charles_jr_interior_day1.semantic_tilemap.json", import.meta.url).href
  }
};

export function getMapSpec(id: MapId): MapSpec {
  return MAP_REGISTRY[id];
}
