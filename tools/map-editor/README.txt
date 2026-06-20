Lulu's Tale Project Map Editor v1.1 Asset POC
=============================================

Purpose
-------
This is a project-local map editor for Lulu's Tale.
It edits the actual root-level map JSON files used by the project.

v1.1 adds an Asset Tile Paint mode so you can manually place exact cropped visual tiles from the PNG assets already inside the project folder.

Install
-------
Copy the included tools folder into the root of your Lulu's Tale project so the path becomes:

tools/map-editor/tiletool.bat

The project root should also contain files like:
- Home.json
- Overworld.json
- Charles.json
- package.json

Run
---
Double-click:

tools/map-editor/tiletool.bat

It starts a tiny local Node server and opens the editor in your browser.
Close the PowerShell/CMD window to stop the editor.

What v1.1 can do
----------------
- Find root-level map JSON files in the project folder.
- Load existing game map JSON files.
- Paint/edit semantic layers:
  - ground
  - structures
  - objects
  - markers
- Toggle semantic layer visibility.
- Scan PNG assets in the project folder.
- Let you choose a tileset/source PNG.
- Let you choose source tile size, usually 16 or 32 px.
- Click a tile crop from the source PNG.
- Paint that exact asset crop onto the map.
- Save asset placements into the selected map JSON under assetLayers.
- Toggle asset layer visibility.
- Save directly back to the selected game map JSON.
- Create a timestamped backup before every direct save.
- Download a copy without changing the project file.

Asset tile JSON format
----------------------
Asset tiles are saved into the map JSON like this:

assetTileFormat: "lulus_asset_tile_layers_v1"
assetLayerOrder: ["ground", "structures", "objects"]
assetLayers: {
  ground: [[...]],
  structures: [[...]],
  objects: [[...]]
}

Each painted asset tile cell stores:

{
  "assetPath": "public/assets/top-down-retro-interior/TopDownHouse_FloorsAndWalls.png",
  "sx": 0,
  "sy": 0,
  "sw": 16,
  "sh": 16
}

Meaning:
- assetPath = project-relative PNG path
- sx/sy = source crop position inside that PNG
- sw/sh = source crop size

Important limitation
--------------------
The editor previews assetLayers immediately.
The current game renderer may not draw assetLayers yet unless a Codex/game-code pass has added support for them.

So this editor solves the manual asset placement problem and stores the data in the actual map JSON, but the game may need one renderer integration pass to display those asset layers in-game.

Backups
-------
Every direct save creates a backup here:

tools/map-editor/backups/

Important
---------
Use Save Directly to Game Map only when you are ready to overwrite the selected JSON file.
A backup is made automatically, but Git/backups are still recommended before big edits.
