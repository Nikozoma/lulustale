# AGENTS.md - Lulu's Tale

## Project Context

Lulu's Tale is a mobile-first, landscape-first PWA game built with a web stack and intended to be wrapped as an Android APK.

Current priority is the playable demo foundation and vertical slice stability.

Focus on completing, stabilizing, and polishing the current playable flow before implementing additional locations, systems, or large feature expansions.

## Source Of Truth

Use the highest-numbered Lulu's Tale Blueprint Update available in the project as the authoritative design document unless explicitly instructed otherwise.

Use existing project files, maps, assets, and blueprint documentation as the primary reference before making assumptions.

If project files and blueprint documents conflict, preserve the currently working implementation unless the user explicitly asks to change it.

## Core Rules

* Treat the user as a competent technical user.
* Keep responses concise.
* Skip basic explanations unless specifically requested.
* Preserve existing working functionality unless explicitly instructed to change it.
* Make the smallest reasonable change necessary to accomplish the task.
* Do not perform unrelated cleanup.
* Do not perform speculative refactors.
* Do not perform broad architectural rewrites unless explicitly requested.
* Do not expand the requested scope.
* Do not implement future systems unless explicitly requested.
* Do not silently guess when project data is ambiguous.

## No Placeholders Rule

Never use:

* placeholder assets
* fake assets
* fake data
* mock content
* mock implementations
* stub content
* temporary stand-ins
* colored-box stand-ins
* invented art
* invented map data
* invented gameplay data

If a task requires missing assets, missing data, missing implementation details, or missing design decisions:

* Stop.
* Report the blocker.
* Explain exactly what is missing.
* Do not substitute placeholder content.

If a prompt appears to request, imply, or allow placeholder content, treat that as an instruction conflict and report the conflict instead of proceeding.

Use real project assets and real project data only.

## Asset Rules

Do not replace existing assets with alternatives unless explicitly requested.

Do not create replacement art.

Do not create substitute art.

If a required asset cannot be identified with confidence:

* Stop.
* Report the blocker.
* Request clarification.

If multiple real project assets could fit:

* inspect the options
* choose the safest real asset only if confidence is high
* report the chosen asset and why
* otherwise stop and report the ambiguity

## Gameplay Testing Rule

The user performs gameplay testing.

Do not perform automated gameplay playthroughs or automated in-game navigation unless explicitly requested.

Avoid attempts to make Codex "play" the game like a human.

Do not spend large amounts of effort, time, or compute trying to navigate the game world manually through browser automation.

When testing is needed, prefer:

* unit tests
* build checks
* code inspection
* focused validation
* targeted debug checks
* controlled screenshot capture
* debug-state screenshots, if such tools already exist

If screenshots are requested, prefer controlled/debug states over automated full playthrough navigation.

Do not claim phone testing, full gameplay testing, or manual playtesting was done unless it was actually done.

## Scope Discipline

Stay focused on the requested task.

Do not expand scope.

Do not implement future systems unless explicitly requested.

Do not add optional features unless explicitly requested.

Do not redesign completed systems without a direct reason.

Do not modify maps, assets, collision, controls, rendering, or quest flow unless directly required by the task.

If a requested task depends on another unfinished system, report that dependency before proceeding.

## Mobile Requirements

Lulu's Tale is mobile-first.

Maintain:

* landscape orientation support
* responsive scaling
* dynamic viewport handling
* consistent behavior across mobile screen sizes
* touch controls where applicable
* mobile-first interaction UX
* tap/click interaction through current-objective `!` markers when applicable

Do not break mobile compatibility.

Do not add desktop-facing tutorial text or desktop-control instructions to normal player-facing UI unless explicitly requested.

Desktop keyboard controls may exist silently for development/testing, but the game should present itself as mobile-first.

## Current Interaction UX Rules

Preserve the current mobile interaction direction unless explicitly changed:

* no separate Interact button
* no floating `Press E / Tap...` prompts
* `!` marker is the tap target
* tap-to-interact requires Lulu to be in range
* only the current objective should show an active `!` marker
* no inactive-object marker spam
* no desktop tutorial/control wording in normal player-facing UI

## Git Rules

Do not create repositories, branches, commits, tags, releases, or pushes unless explicitly requested.

Do not reset, discard, revert, overwrite, or clean uncommitted work unless explicitly requested.

Before meaningful edits, check the working tree when appropriate.

If a git repository exists, include git status in the final report.

## Reporting Requirements

At the end of every task provide:

### Summary

What was completed.

### Changed Files

List all modified files.

### Commands Run

List commands executed.

### Tests / Builds / Checks

Include pass/fail status.

### Validation Results

Describe what was verified.

### Known Issues

List any remaining issues.

### Blockers

List blockers encountered.

### Assumptions

List assumptions made.

### Suggested Next Step

Recommend the next logical task.

### Git Status

Include git status if a git repository exists.

### Placeholder Confirmation

Confirm that no placeholders, fake assets, fake data, mock implementations, stub content, or temporary stand-ins were added.

## General Principle

Prefer correctness over assumptions.

Prefer reporting blockers over inventing solutions.

Prefer real implementation over placeholder implementation.

Preserve working functionality whenever possible.
