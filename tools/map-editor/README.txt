Lulu's Tale Tile Tool v1.3 vNext
=================================

Install
-------
Copy the included tools folder into the root of a Lulu's Tale project folder.

Expected location:
LULUsTALE/tools/map-editor/tiletool.bat

Run
---
Double-click tiletool.bat or RUN_MAP_EDITOR.bat.

Main modes
----------
1. Tilemap Builder
   Edits semantic/gameplay layers only:
   - ground
   - structures
   - objects
   - markers

2. Tile Asset Editor
   Edits visual asset placements only.
   It does not change semantic layers.

Visual storage
--------------
Visual placements are saved in a separate companion file:

<map base>.visual.json

Example:
home_interior_day1.semantic_tilemap.json
home_interior_day1.visual.json

This keeps the gameplay map JSON clean while allowing human-made visual asset layout work.

Backups and reports
-------------------
Before overwriting semantic or visual files, the tool creates backups in:

tools/map-editor/backups/

Each save also creates a report in:

tools/map-editor/reports/

Known limitation
----------------
The game renderer may need a Codex integration pass before it uses the new *.visual.json files at runtime.
