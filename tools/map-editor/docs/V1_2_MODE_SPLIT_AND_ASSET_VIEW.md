# Lulu's Tale Project Map Editor v1.2

## Main change

The editor UI is now split into two independent working modes:

- **Tilemap Builder**
- **Tile Asset Editor**

This avoids mixing semantic editing controls with exact asset-tile placement controls.

## Tilemap Builder mode

Use this mode for semantic/gameplay data:

- ground
- structures
- objects
- markers
- player spawns
- doors
- transitions
- interaction zones
- collision/logic markers

The best view for this mode is **Color Coding View**.

## Tile Asset Editor mode

Use this mode to manually place exact visual tiles from existing project PNG assets.

Asset placements are saved under:

```json
assetLayers
```

The best view for this mode is **Actual Asset View**.

## Map View options

### Color Coding View

Shows semantic colored blocks only.

### Actual Asset View

Shows the placed visual asset tiles only. Marker glyphs can still appear if marker visibility is enabled.

### Combined View

Shows semantic color blocks dimmed underneath the placed asset tiles. This helps compare visual tiles against gameplay layout.

## Save format

The editor preserves the original semantic layers and adds/updates assetLayers.

Existing semantic maps remain backward compatible.
