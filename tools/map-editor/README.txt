Lulu's Tale Project Map Editor v1.0 POC
=======================================

Purpose
-------
This is a project-local map editor for Lulu's Tale.
It edits the actual root-level *.semantic_tilemap.json files used by the game.

Install
-------
Copy the included tools folder into the root of your Lulu's Tale project so the path becomes:

tools/map-editor/RUN_MAP_EDITOR.bat

The project root should also contain files like:
- home_interior_day1.semantic_tilemap.json
- main_neighborhood_hub_day1.semantic_tilemap.json
- charles_jr_interior_day1.semantic_tilemap.json
- package.json

Run
---
Double-click:

tools/map-editor/RUN_MAP_EDITOR.bat

It starts a tiny local Node server and opens the editor in your browser.
Close the PowerShell/CMD window to stop the editor.

What it can do in v1.0
----------------------
- Find root-level *.semantic_tilemap.json files in the project folder.
- Load existing game map JSON files.
- Paint/edit the existing layers:
  - ground
  - structures
  - objects
  - markers
- Toggle layer visibility.
- Use layer-specific palettes based on current Lulu's Tale semantic types.
- Save directly back to the selected game map JSON.
- Create a timestamped backup before every direct save.
- Download a copy without changing the project file.

Backups
-------
Every direct save creates a backup here:

tools/map-editor/backups/

Limitations / proof-of-concept notes
------------------------------------
- It edits colored semantic tiles, not final sprite art.
- It does not resize maps yet.
- It does not edit maps embedded inside TypeScript files.
- It only scans root-level *.semantic_tilemap.json files.
- It does not preview with real game sprites yet.
- It assumes the game continues to import these semantic JSON files.

Important
---------
Use Save Directly to Game Map only when you are ready to overwrite the selected JSON file.
A backup is made automatically, but Git/backups are still recommended before big edits.
