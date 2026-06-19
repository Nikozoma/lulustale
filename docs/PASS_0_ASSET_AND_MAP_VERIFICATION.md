# PASS 0 - Asset and Map Verification

Date: 2026-06-18

Scope: compact preflight verification only. No app scaffold, gameplay implementation, scaling tuning, placeholder assets, fake sprites, improvised maps, or git repository creation was performed.

## 1. Project folder summary

Workspace inspected: `H:\Codex Projects\LULUsTALE`

Blueprint folder:
- FOUND: `Lulus_Tale_Demo_Blueprint_v2.1`

Semantic home map:
- FOUND: `home_interior_day1.semantic_tilemap.json`

Required asset folders:
- FOUND: Lulu/player: `The Female Adventurer - Free`
- FOUND: Dog: `DogMegaPackFree`
- FOUND: Bird: `Basic animal Asset Pack`
- FOUND: NPC/cashier/filler later: `SuperRetroWorld_CharacterPack_Full`
- FOUND: Home/interiors: `Top-Down_Retro_Interior`
- FOUND: Supplemental interiors: `Modern_Interiors_Free_v2.2`

Notes:
- The blueprint handoff folder contains `04_PASS_0_ASSET_AND_MAP_VERIFICATION_PROMPT_TEMPLATE.txt`; the source-of-truth files above were used for this verification.

## 2. Semantic map verification

File: `home_interior_day1.semantic_tilemap.json`

Map metadata:
- `mapName`: `home_interior_day1`
- Width: 28 tiles
- Height: 40 tiles
- Tile size: 32 game-world pixels
- World pixel size: 896 x 1280
- Layer order: `ground`, `structures`, `objects`, `markers`

Expected objects/markers:

| ID | Status | Count / location summary |
| --- | --- | --- |
| `player_spawn` | FOUND | 1 marker at tile `(18, 9)` |
| `dog_spawn` | FOUND | 1 marker at tile `(8, 34)` |
| `dog_interaction` | FOUND | 1 marker at tile `(8, 35)` |
| `dog_bowl` | FOUND | 1 object tile at `(7, 35)` |
| `bed` | FOUND | 20 object tiles, spanning bedroom bed area |
| `bed_interaction` | FOUND | 3 marker tiles at `(18, 8)`, `(19, 8)`, `(20, 8)` |
| `refrigerator` | FOUND | 6 object tiles at x `21-22`, y `31-33` |
| `fridge_interaction` | FOUND | 1 marker at tile `(20, 32)` |
| `event_zone` | FOUND | 1 marker at tile `(20, 33)` |
| `entrance_exit` | FOUND | 3 structure tiles at y `13`; 3 marker tiles at y `14` |
| `interior_wall` | FOUND | 130 structure tiles |
| `doorway` | FOUND | 6 structure tiles |
| `indoor_floor` | FOUND | 431 ground tiles |

Other semantic IDs present:
- `window`, `couch`, `table`, `stove`, `sink`, `counter_top`, `furniture_appliance`
- `interaction_point`, `interior_door`, `kitchen_zone`, `room_zone`, `save_point`

Missing map data:
- None of the required IDs are missing.

Ambiguous map data:
- `entrance_exit` appears in both `structures` and `markers`. Treat structure tiles as doorway/exit geometry and marker tiles as the interaction/transition zone.
- `bed`, `couch`, `table`, `refrigerator`, and other furniture are multi-tile semantic regions. Implementation should consume these as semantic rectangles/zones, not as single-object points.

## 3. Asset candidate verification

### Lulu/player sprite

Best candidate:
- Path: `The Female Adventurer - Free\Idle\Idle.png`
- Image dimensions: 384 x 384
- Likely frame size: 48 x 64, confirmed by `The Female Adventurer - Free\frame dimensions.png`
- Likely layout: 8 columns x 6 rows
- Confidence: HIGH
- Ambiguity/blocker: The sheet is real and frame size is documented. Direction-to-row mapping still needs implementation-time validation against the visible sheet rows.

### Lulu directional animation candidates

Best candidates:
- Path: `The Female Adventurer - Free\Walk\walk.png`
  - Image dimensions: 384 x 384
  - Likely frame size: 48 x 64
  - Likely layout: 8 columns x 6 rows
  - Confidence: HIGH
- Path: `The Female Adventurer - Free\Walk\walk_Down.png`
  - Image dimensions: 384 x 64
  - Likely frame size: 48 x 64
  - Likely layout: 8 frames in one directional strip
  - Confidence: HIGH
- Path: `The Female Adventurer - Free\Walk\walk_Up.png`
  - Image dimensions: 384 x 64
  - Likely frame size: 48 x 64
  - Likely layout: 8 frames in one directional strip
  - Confidence: HIGH

Additional directional strip files exist for diagonal directions:
- `Walk\walk_Left_Down.png`
- `Walk\walk_Left_Up.png`
- `Walk\walk_Right_Down.png`
- `Walk\walk_Right_Up.png`

Ambiguity/blocker:
- The pack appears to provide down, up, and diagonal strips, not explicit cardinal left/right strip filenames. If the implementation requires four-cardinal movement, the next pass must decide whether to use the full `walk.png` row layout or mirror/derive left-right from available directions after visual validation. Do not invent replacement sprites.

### Dog sprite

Best candidate:
- Path: `DogMegaPackFree\DogMegaPackFree\Dogs.png`
- Image dimensions: 448 x 256
- Likely frame/tile size: 64 x 64, inferred from 7 columns x 4 rows
- Confidence: HIGH
- Ambiguity/blocker: Multiple dog rows/poses are present. A specific dog color/row and idle/happy frame sequence should be selected in the implementation prompt.

### Bird sprite

Best candidate:
- Path: `Basic animal Asset Pack\Basic Asset Pack\Basic Animal Animations\Tiny Chick\TinyChick.png`
- Image dimensions: 64 x 16
- Likely frame/tile size: 16 x 16, inferred from 4 frames
- Confidence: MEDIUM
- Ambiguity/blocker: This is a real bird-like asset from the assigned pack, but species and gameplay use are deferred. It is adequate as a candidate only if a tiny chick is acceptable for later bird content.

### Interior floor/wall tiles

Best candidate:
- Path: `Top-Down_Retro_Interior\TopDownHouse_FloorsAndWalls.png`
- Image dimensions: 288 x 144
- Likely native tile size: 16 x 16, inferred from sheet divisibility and visual grid
- Confidence: HIGH
- Ambiguity/blocker: Exact tile coordinates/crops for chosen floor and wall variants are not documented in an atlas file. The sheet visibly contains indoor floor and wall candidates.

Supplemental candidate:
- Path: `Modern_Interiors_Free_v2.2\Modern tiles_Free\Interiors_free\48x48\Room_Builder_free_48x48.png`
- Image dimensions: 816 x 1104
- Likely native tile size: 48 x 48, implied by folder/file naming
- Confidence: MEDIUM
- Ambiguity/blocker: Supplemental only. Mixing 48 px assets with the 32 px semantic world needs a deliberate later integration decision; no scaling tuning was done in this pass.

### Bed asset

Best candidate:
- Path: `Top-Down_Retro_Interior\TopDownHouse_FurnitureState1.png`
- Image dimensions: 208 x 288
- Likely native tile size: 16 x 16, inferred from sheet divisibility
- Confidence: HIGH
- Ambiguity/blocker: A bed is visibly present on the furniture sheet. Exact crop rectangle must be chosen during asset manifest work.

### Refrigerator asset

Best candidate:
- Path: `Top-Down_Retro_Interior\TopDownHouse_FurnitureState1.png`
- Image dimensions: 208 x 288
- Likely native tile size: 16 x 16, inferred from sheet divisibility
- Confidence: HIGH
- Ambiguity/blocker: A refrigerator is visibly present on the furniture sheet. Exact crop rectangle must be chosen during asset manifest work.

### Door/doorway asset

Best candidates:
- Path: `Top-Down_Retro_Interior\TopDownHouse_DoorsAndWindows.png`
  - Image dimensions: 288 x 160
  - Likely native tile size: 16 x 16
  - Confidence: HIGH
- Path: `Top-Down_Retro_Interior\TopDownHouse_FloorsAndWalls_OpenDoors.png`
  - Image dimensions: 128 x 48
  - Likely native tile size: 16 x 16
  - Confidence: HIGH

Ambiguity/blocker:
- Multiple closed/open door variants exist. The implementation pass should choose one visual variant matching the semantic `doorway` and `entrance_exit` zones.

### Dog bowl asset if available

Possible candidates:
- Path: `DogMegaPackFree\DogMegaPackFree\DogItems.png`
  - Image dimensions: 96 x 96
  - Likely native tile size: 32 x 32, inferred from 3 x 3 layout
  - Confidence: LOW
- Path: `Top-Down_Retro_Interior\TopDownHouse_SmallItems.png`
  - Image dimensions: 128 x 128
  - Likely native tile size: 16 x 16
  - Confidence: LOW

Ambiguity/blocker:
- No clearly labeled dog bowl file was found. `DogItems.png` contains bones, toys/leashes, and food-like items, but not a safely identifiable bowl from filename alone. `TopDownHouse_SmallItems.png` contains small dish/bowl-like sprites, but the exact intended dog bowl crop is ambiguous. Resolve this before implementing the dog feeding visual.

## 4. Focus boundary

This pass intentionally did not list every image in every pack. Verification was limited to the active indoor-home foundation and the required source folders.

## 5. Recommendation for next prompt

The semantic home map is complete enough for the indoor-home foundation: all required map IDs are present, dimensions match the blueprint, and core indoor/player/dog assets have real candidate files.

Before implementing dog feeding visuals, resolve the dog bowl asset ambiguity by selecting an approved crop from either `DogItems.png` or `TopDownHouse_SmallItems.png`.

Recommended next implementation step:
- Build the indoor-home scaffold/render/player movement pass using `home_interior_day1.semantic_tilemap.json` as the exact layout source of truth.
- Use real candidate assets only.
- Include an asset manifest with explicit source paths and crop rectangles for floors/walls, bed, refrigerator, doorway, and any approved dog bowl.
