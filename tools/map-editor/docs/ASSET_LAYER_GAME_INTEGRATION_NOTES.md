# Lulu's Tale Asset Layer Game Integration Notes

The v1.1 editor writes manual visual tile placement into map JSON under:

```json
{
  "assetTileFormat": "lulus_asset_tile_layers_v1",
  "assetLayerOrder": ["ground", "structures", "objects"],
  "assetLayers": {
    "ground": [[null]],
    "structures": [[null]],
    "objects": [[null]]
  }
}
```

Each painted tile cell is either `null` or:

```json
{
  "assetPath": "public/assets/top-down-retro-interior/TopDownHouse_FloorsAndWalls.png",
  "sx": 0,
  "sy": 0,
  "sw": 16,
  "sh": 16
}
```

## Intended render order

For the game renderer, draw in this order:

1. `assetLayers.ground` if present
2. fallback semantic ground rendering for tiles not covered by asset ground, or semantic rendering behind it
3. `assetLayers.structures` if present
4. fallback semantic structures
5. `assetLayers.objects` if present
6. fallback semantic objects
7. dog / cashier / bird / player / markers / debug overlays as currently handled

## Important

Do not remove semantic layers. They still drive gameplay logic:

- collision
- walkable ground
- transitions
- spawns
- interaction markers

`assetLayers` should be treated as visual overrides/hand-placed visual art, not gameplay logic.

## Asset loading

The `assetPath` is project-relative. In the browser build, paths likely need conversion such as:

- `public/assets/top-down-retro-interior/TopDownHouse_FloorsAndWalls.png`
- browser URL: `/assets/top-down-retro-interior/TopDownHouse_FloorsAndWalls.png`

Root-level source files outside `public/` may not be available in the Vite dev server unless copied into `public/` or imported/served another way.

Recommended first implementation:

- Support `assetPath` values beginning with `public/` first.
- Convert `public/assets/...` to `/assets/...`.
- Ignore or warn for non-public asset paths until needed.

## Collision note

Do not use `assetLayers` for collision. Keep collision based on semantic `layers` unless intentionally changed later.
