# PASS 3C QA Report

Date: 2026-06-19

## Summary

PASS 3C was run as a bounded QA/screenshot pass only. No gameplay scope, semantic map redesign, placeholder art, night mode, combat, cars, APK work, or source refactor was added.

Standard checks pass:

- `npm test`: passed, 9 test files / 30 tests.
- `npm run build`: passed, Vite production build completed.

Local browser QA was partial. The app launches, the landscape canvas shell renders, the movement tutorial appears and dismisses, and keyboard-held movement through Chrome DevTools Protocol works. However, the automated playthrough did not complete because the automation could not reliably route Lulu into the fridge interaction radius from the current home layout/collision geometry. The pass stopped there rather than making gameplay/map changes.

## Changed Files From This Pass

- `docs/PASS_3C_QA_REPORT.md`
- `docs/qa/` screenshots, checkpoint JSON, and Vite logs

Existing uncommitted gameplay/source changes from earlier passes were left untouched.

## Commands Run

- `npm test`
- `npm run build`
- `npm run dev -- --host 0.0.0.0 --port 5173 --strictPort`
- Browser QA via Chrome DevTools Protocol against `http://localhost:5173/`
- Read-only process/status checks with PowerShell and `git status --short`

## Test And Build Results

`npm test` passed:

- 9 test files passed.
- 30 tests passed.

`npm run build` passed:

- TypeScript `tsc --noEmit` passed.
- Vite build completed and emitted `dist/`.

## Local App Launch

The Vite dev server launched successfully.

- Desktop URL: `http://localhost:5173/`
- LAN URL observed from Vite: `http://10.0.0.143:5173/`

## Browser QA Status

Partial.

Confirmed:

- App loads in a landscape browser viewport.
- Canvas renders the home map.
- Movement tutorial appears.
- Tutorial can be dismissed.
- Held keyboard movement works when using CDP trusted key events.
- Home objective changes to `Get food from the fridge.`
- Fridge `!` marker is visible.
- Debug toggle works.

Blocked:

- Automated route did not reach a state where pressing `E` or interacting advanced from `Get food from the fridge.` to `Feed the dog.`
- Because the fridge interaction did not advance, later automated checkpoints for overworld, Charles Jr., bird snatch, fries recovery, END OF DEMO, and restart were not validly reached in this pass.

## Checkpoint Matrix

| Checkpoint | Result | Notes |
| --- | --- | --- |
| Game launches | Pass | Loaded at `http://localhost:5173/`. |
| Landscape/mobile shell usable | Pass | Canvas fit/rendered in landscape viewport. |
| Movement tutorial appears | Pass | `Move Lulu` popup captured. |
| Tutorial dismisses | Pass | Objective advanced to fridge objective. |
| Lulu can move | Pass | Movement was confirmed with CDP held-key input. |
| `!` marker appears on fridge | Pass | Marker visible in home screenshots. |
| Tap/click marker gets dog food | Not completed | Automation did not enter interaction radius reliably. |
| `!` marker appears on dog | Not completed | Blocked before dog objective. |
| Dog feeding works | Not completed | Blocked before dog objective. |
| Home exit transitions to overworld | Not completed | Blocked before home exit objective. |
| Overworld loads | Not completed in browser QA | Covered by unit tests, but not reached by automated browser route. |
| Objective becomes `Go to Charles Jr.` | Not completed in browser QA | Covered by quest tests. |
| Charles Jr. transition works | Not completed in browser QA | Covered by quest tests. |
| Order fries works | Not completed in browser QA | Covered by quest tests. |
| Charles Jr. exit after fries works | Not completed in browser QA | Covered by quest tests. |
| Bird snatch triggers | Not completed in browser QA | Covered by quest tests. |
| Bird appears visibly | Not completed in browser QA | Not reached in browser route. |
| Objective becomes `Get the fries back` | Not completed in browser QA | Covered by quest tests. |
| Failed steal while watching | Not completed in browser QA | Covered by quest tests. |
| Successful steal while distracted | Not completed in browser QA | Covered by quest tests. |
| END OF DEMO appears | Not completed in browser QA | Covered by quest tests. |
| Restart returns home | Not completed in browser QA | Covered by quest tests. |

## Screenshots Created

Primary screenshots:

- `H:\Codex Projects\LULUsTALE\docs\qa\PASS_3C_01_home_tutorial.png`
- `H:\Codex Projects\LULUsTALE\docs\qa\PASS_3C_02_home_fridge_marker.png`

Diagnostic screenshots/artifacts:

- `H:\Codex Projects\LULUsTALE\docs\qa\PASS_3C_route_near_fridge.png`
- `H:\Codex Projects\LULUsTALE\docs\qa\PASS_3C_route2_near_fridge.png`
- `H:\Codex Projects\LULUsTALE\docs\qa\PASS_3C_corridor_near_fridge.png`
- `H:\Codex Projects\LULUsTALE\docs\qa\PASS_3C_cdp_checkpoints.json`

Files named for later milestones (`PASS_3C_03_overworld.png` through `PASS_3C_08_end_of_demo.png`) were created during an attempted route, but are not valid evidence for those milestones because the quest did not advance past the fridge objective. They should be replaced in a later QA pass after the navigation/interact blocker is resolved.

## Visual Issues Found

- Home map renders with real pixel assets.
- Lulu sprite renders and animates.
- Fridge `!` marker is visible.
- Current home navigation/collision around the dog/table/fridge area is hard to route in automation and may be worth manual playtesting for reachability clarity.
- No missing sprite was observed in the reached home states.

## Gameplay / Quest Issues Found

- Browser automation could not advance the fridge interaction after multiple movement routes. This may be an automation precision issue, a collision/navigation issue, or an interaction-radius usability issue around the fridge marker.
- The unit test suite still verifies the intended full quest state machine, including overworld, Charles Jr., bird steal failure/success, END OF DEMO, and restart.

## Tiny Fixes Made

None.

## Remaining Risks / Known Issues

- Browser playthrough coverage is incomplete.
- Required overworld/Charles Jr./bird screenshots still need a successful reachable run.
- The existing screenshot files for later milestones should not be treated as proof until replaced.

## Recommended Next Pass

Run a focused navigation/reachability pass for the home tutorial:

1. Verify by manual play whether the fridge marker can be reached naturally from Lulu's spawn.
2. If manual reachability is awkward, adjust only collision/marker placement or interaction radius as a tiny targeted fix.
3. Re-run PASS 3C from the start and replace the invalid later milestone screenshots.

## Local Testing

Exact PowerShell run command:

```powershell
cd "H:\Codex Projects\LULUsTALE"; npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

Desktop URL:

```text
http://localhost:5173/
```

Phone/LAN URL pattern:

```text
http://<PC-LAN-IP>:5173/
```

Observed LAN URL in this pass:

```text
http://10.0.0.143:5173/
```
