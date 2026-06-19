# Codex Reorientation Report

Date: 2026-06-19
Project root: `H:\Codex Projects\LULUsTALE`

## Summary

This pass was a context recovery and sanity-check only. No gameplay source, assets, map data, remotes, or build configuration were intentionally changed.

The project is a Vite + TypeScript browser game with Vitest tests. The currently implemented demo flow appears to be:

1. Home interior tutorial starts at `home_interior_day1`.
2. Player moves to leave the movement tutorial stage.
3. Player gets dog food from the fridge.
4. Player feeds the dog.
5. Player interacts with the home exit.
6. Game transitions directly to `charles_jr_interior_day1`.
7. Player orders fries at the counter.
8. HUD shows `END OF DEMO`, with restart support.

The overworld/neighborhood hub is not wired into runtime map registration and no `main_neighborhood_hub_day1` semantic map file was found.

## Project Structure Found

- Package manager: npm, using `package-lock.json`.
- Framework/tooling: Vite 5, TypeScript, Vitest.
- App shell: `index.html`.
- Main source folders:
  - `src/main.ts`
  - `src/styles.css`
  - `src/game/`
- Main game modules:
  - `assets.ts`
  - `camera.ts`
  - `constants.ts`
  - `input.ts`
  - `mapRegistry.ts`
  - `mapRegistryNode.ts`
  - `player.ts`
  - `playerRender.ts`
  - `quest.ts`
  - `renderer.ts`
  - `renderPlan.ts`
  - `world.ts`
- Public/runtime assets:
  - `public/assets/dog-mega-pack/Dogs.png`
  - `public/assets/female-adventurer/walk/*.png`
  - `public/assets/super-retro-world/character_9_frame32x32.png`
  - `public/assets/top-down-retro-interior/*.png`
- Source asset folders also exist at project root:
  - `Basic animal Asset Pack/`
  - `DogMegaPackFree/`
  - `GuttyKreum_JapaneseCity_Freev1/`
  - `Modern_Interiors_Free_v2.2/`
  - `nature free/`
  - `SuperRetroWorld_CharacterPack_Full/`
  - `The Female Adventurer - Free/`
  - `Top-Down_Retro_Interior/`
- Docs folders/files:
  - `docs/PASS_0_ASSET_AND_MAP_VERIFICATION.md`
  - `docs/PASS_1H_DEBUG_SCREENSHOT.png`
  - `docs/PASS_1H_NORMAL_SCREENSHOT.png`
  - `Lulus_Tale_Demo_Blueprint_v2.1/`
- Tests present:
  - `src/game/activeMap.test.ts`
  - `src/game/mapRegistry.test.ts`
  - `src/game/player.test.ts`
  - `src/game/playerRender.test.ts`
  - `src/game/quest.test.ts`
  - `src/game/renderPlan.test.ts`
  - `src/game/world.test.ts`
- Build output: `dist/` exists and was regenerated successfully by `npm run build`.
- Git repo: `.git/` exists.

## Semantic Tilemap Files Present

- `home_interior_day1.semantic_tilemap.json`
- `home_interior_day1_compact_corrected.semantic_tilemap.json`
- `charles_jr_interior_day1.semantic_tilemap.json`

No `main_neighborhood_hub_day1` file was found.

## Current Implemented Gameplay State

- Map/scene management: `src/game/mapRegistry.ts` registers exactly two maps, `home_interior_day1` and `charles_jr_interior_day1`. `src/main.ts` loads every registered map at startup and swaps active map context when quest location changes.
- Active maps: home interior and Charles Jr. interior.
- Home map support: yes. Home markers are used for player spawn, fridge, dog, and exit.
- Charles Jr. map support: yes. Charles Jr. markers are used for player spawn, cashier, and order interaction.
- Player movement: continuous 2D movement with normalized keyboard/touch vectors, axis-separated collision, animation timing, and facing direction.
- Mobile controls: left-side pointer drag virtual joystick; landscape gate and fullscreen/orientation-lock best effort.
- Desktop controls: WASD/arrows to move, E to interact, R to restart at complete, F3 for debug.
- Interaction system: proximity-based marker interactions with a 42 px radius.
- Quest state machine: `movement -> get_food -> feed_dog -> go_to_door -> order_fries -> complete`.
- END OF DEMO/restart: `complete` objective is `END OF DEMO`; restart button and R key reset to the initial home state.
- Debug overlay: F3 or Debug button toggles collision/marker overlay and quest debug text.
- Camera/viewport/zoom: 1280x720 virtual viewport, `HOME_RENDER_ZOOM = 2.25`, camera clamps around the player within current map bounds.
- Collision rules: walkable only on `indoor_floor`; solid structures include walls, collision blocks, and windows; solid objects include bed, booth seats, counters, couch, table, dining table, refrigerator, sink, stove, and appliance furniture.
- Real asset usage: renderer uses real image assets from `public/assets`; missing image loads fail with an explicit error.

## Current Maps Found And Metadata

### `home_interior_day1`

- Filename: `home_interior_day1.semantic_tilemap.json`
- `mapName`: `home_interior_day1`
- Width/height: 10 x 13 tiles
- Tile size: 32 px
- Layer order: `ground`, `structures`, `objects`, `markers`
- Important markers:
  - `player_spawn`: `6,3`
  - `fridge_interaction`: `6,10`
  - `dog_spawn`: `2,10`
  - `dog_interaction`: `3,10`
  - `entrance_exit`: `2,5`
  - `bed_interaction`: `7,3`
  - `interior_door`: `5,4`
  - `save_point`: `6,2`
  - zone markers include `kitchen_zone`, `room_zone`, `seating_area`, and `walkable_area`

### `home_interior_day1_compact_corrected`

- Filename: `home_interior_day1_compact_corrected.semantic_tilemap.json`
- `mapName`: `home_interior_day1`
- Width/height: 10 x 13 tiles
- Tile size: 32 px
- Layer order: `ground`, `structures`, `objects`, `markers`
- Important markers: same marker set and positions as `home_interior_day1.semantic_tilemap.json`.
- Runtime status: present but not registered in `MAP_REGISTRY`.

### `charles_jr_interior_day1`

- Filename: `charles_jr_interior_day1.semantic_tilemap.json`
- `mapName`: `charles_jr_interior_day1`
- Width/height: 18 x 18 tiles
- Tile size: 32 px
- Layer order: `ground`, `structures`, `objects`, `markers`
- Important markers:
  - `player_spawn`: `2,10`
  - `order_interaction`: `9,13`
  - `cashier_spawn`: `9,15`
  - `entrance_exit`: `11,5`; `1,10`
  - `npc_spawn`: `6,6`; `10,8`
  - `seating_area`: `3,3`; `5,3`; `7,3`; `3,7`; `12,7`; `12,11`
  - `walkable_area`: `5,10`; `8,10`; `10,10`; `12,10`; `6,12`; `11,12`

### `main_neighborhood_hub_day1`

- Not found.
- Not registered in runtime map registry.

## Current Assets And Rendering Status

- Ground, walls, windows, doors, furniture, counters, appliances, and tables are drawn from `TopDownHouse_*` sheets copied into `public/assets/top-down-retro-interior/`.
- Lulu uses six walking sprite strips from `public/assets/female-adventurer/walk/`.
- The dog is drawn from `public/assets/dog-mega-pack/Dogs.png` at `dog_spawn`.
- Cashier is drawn from `public/assets/super-retro-world/character_9_frame32x32.png` at `cashier_spawn`.
- Object rendering groups contiguous semantic object cells into regions and either tiles or fits asset crops.
- The renderer deliberately skips `dog_bowl` object regions; no dog bowl sprite is currently drawn from the manifest.
- The dev info text is always drawn at the bottom of the canvas; collision/marker overlays only appear when debug is enabled.

## Controls, UI, And Debug Status

- Desktop:
  - Move: WASD or arrow keys
  - Interact: E
  - Restart after completion: R
  - Debug: F3 or on-screen Debug button
- Mobile:
  - Landscape required
  - Tap to start/fullscreen on touch devices
  - Drag left side of screen to move
  - Tap Interact button when near a valid quest marker
  - Restart button appears at demo completion
- HUD:
  - Objective text
  - Quest message
  - Interaction prompt
  - Interact/restart actions
  - Status text

## Quest/Demo Flow Currently Implemented

1. Initial state: location `home_interior_day1`, stage `movement`.
2. Any movement changes stage to `get_food`.
3. Near `fridge_interaction`, interaction sets `hasDogFood = true` and stage `feed_dog`.
4. Near dog marker, interaction sets `dogFed = true`, clears dog food, and stage `go_to_door`.
5. Near home `entrance_exit`, interaction changes location to `charles_jr_interior_day1` and stage `order_fries`.
6. Near `order_interaction`, interaction sets `hasFries = true` and stage `complete`.
7. Complete stage objective is `END OF DEMO`.
8. Restart returns to the initial home state.

## Git And GitHub Status

- Git repository: present.
- Branch: `main`.
- `git status`: clean working tree before this report; after this report, only this documentation file should be untracked/modified.
- Recent commits:
  - `09cdcf1 Playable home and Charles Jr demo foundation`
- Remotes: none reported by `git remote -v`.
- GitHub backup: not configured from local git remotes. A local git repo exists, but no GitHub remote URL is set.

## Commands Run

- `Get-ChildItem -Force`
- `git status --short --branch`
- `git status`
- `git log --oneline -5`
- `git branch --show-current`
- `git remote -v`
- `rg --files`
- `Get-Content -Raw package.json`
- `Get-ChildItem -Recurse -Force src`
- `Get-ChildItem -Recurse -Force public`
- `Get-ChildItem -Recurse -Force docs`
- `Get-Content -Raw src/main.ts`
- `Get-Content -Raw src/game/*.ts` for relevant runtime modules
- `Get-ChildItem -Force -Filter '*semantic_tilemap*.json'`
- `Get-ChildItem -Recurse -Force -Filter '*main_neighborhood_hub_day1*'`
- PowerShell JSON metadata extraction for semantic maps
- `npm test`
- `npm run build`
- `git status --short`

## Test Result

`npm test` passed.

- Test files: 7 passed
- Tests: 21 passed

## Build Result

`npm run build` passed.

- TypeScript check: passed via `tsc --noEmit`
- Vite build: passed
- Output includes bundled app files and semantic map JSON under `dist/`.

## Changed Files

- Added: `docs/CODEX_REORIENTATION_REPORT.md`

No source/gameplay/map/asset files were intentionally changed.

## Known Risks And Blockers

- No GitHub remote is configured, so GitHub backup does not appear active from this checkout.
- `dist/` exists locally and is generated output; future passes should decide whether it should remain tracked/committed or ignored, but this pass did not alter git policy.
- `home_interior_day1_compact_corrected.semantic_tilemap.json` duplicates the active home map content but is not registered.
- `main_neighborhood_hub_day1` is absent, so the future home -> overworld -> Charles Jr. flow is not ready from current files.
- The app title and some gate copy still refer to an indoor-home demo even though the current runtime flow reaches Charles Jr.
- `dog_bowl` regions are skipped by rendering and no dog bowl asset is in the current manifest.

## Recommended Next Pass

Use the next Codex pass to either:

1. Preserve the current home -> Charles Jr. demo and do visual/playtest validation on desktop and phone, or
2. Create a focused planning pass for the future overworld transition, including a semantic map inventory and acceptance criteria before any implementation.

Do not implement the overworld until a valid `main_neighborhood_hub_day1` semantic map exists or is intentionally created from the blueprint.

## Local Testing

Exact PowerShell run command:

```powershell
cd "H:\Codex Projects\LULUsTALE"; npm run dev
```

Desktop URL:

```text
http://localhost:5173/
```

Phone/LAN URL pattern:

```text
http://<your-computer-LAN-IP>:5173/
```

Use the phone and computer on the same Wi-Fi network. The npm `dev` script already uses `--host 0.0.0.0 --port 5173 --strictPort`.
