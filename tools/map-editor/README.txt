Lulu's Tale Tile Tool v1.6
===========================

Launcher
--------
Use only:

tools/map-editor/tiletool.bat

RUN_MAP_EDITOR.bat is not included or required going forward.

Current project naming
----------------------
The active project maps are:

- Home.json
- Charles.json
- Overworld.json

The active map IDs / map names / display names are:

- Home
- Charles
- Overworld

Visual companion files
----------------------
Visual asset placements are stored separately from semantic gameplay maps:

- Home.visual.json
- Charles.visual.json
- Overworld.visual.json

Semantic files remain responsible for gameplay layers:

- ground
- structures
- objects
- markers

Visual files store asset crop placements only.

Backup behavior
---------------
Direct saves create project-relative numbered backups in:

tools/backups

Examples:

- tools/backups/backup1/Home.json
- tools/backups/backup2/Home.visual.json
- tools/backups/backup3/Overworld.json

The tool never hardcodes the absolute project folder name.

Map selector behavior
---------------------
When Home.json, Charles.json, and/or Overworld.json exist, the active map selector shows those current active maps only.

The selector does not load maps from:

- tools/backups
- tools/map-editor/reports
- dist
- node_modules
- temporary folders

Legacy files
------------
Legacy semantic map files may still be loaded in fallback/import-style situations, but they are not treated as current active maps when the current root map files exist.

Legacy map visual files are written with a LegacyImport_ prefix to avoid creating old active filenames.

Usage
-----
1. Copy the tools folder into the Lulu's Tale project root.
2. Run tools/map-editor/tiletool.bat.
3. Pick Home, Charles, or Overworld from the map selector.
4. Use Tilemap Builder mode for semantic/gameplay edits.
5. Use Tile Asset Editor mode for visual asset placement.
6. Save semantic or visual changes. The tool creates numbered backups before overwriting existing files.


V1.6 QUICK NOTES
----------------
- Actual Asset View no longer shows the semantic color overlay.
- Combined View is where semantic overlay opacity and marker glyph options apply.
- Added auto asset preview from semantic map so current Codex/game-style assets are visible even before manual visual placements exist.
- Added Sprite Sheet Select/Pan tools. Use Pan Sheet to left-drag around large sheets.
- Added Tilemap Builder Move Tile tool for dragging semantic cells within the active layer only.
- Asset folder dropdown now uses grouped/shortened labels.
