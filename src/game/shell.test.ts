import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("game shell mobile-first UI", () => {
  it("boots through the Lulu's Tale title screen before gameplay", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    const main = readFileSync(resolve(process.cwd(), "src/main.ts"), "utf8");

    expect(html).toContain('id="title-screen"');
    expect(html).toContain('id="title-play-button"');
    expect(html).toContain('/assets/ui/lulus-tale-title-screen.png');
    expect(main).toContain('titlePlayButton.addEventListener("click"');
    expect(main).toContain('await start();');
    expect(main).toContain('const restoredSave = readAutosave();');
    expect(main).not.toContain('start().catch');
  });

  it("ships the batch-1 menu and quest tracker foundation", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(html).toContain('id="menu-button"');
    expect(html).toContain('id="main-menu"');
    expect(html).toContain('id="menu-close"');
    expect(html).toContain('id="quest-tracker"');
    expect(html).toContain('id="quest-tracker-minimize"');
    expect(html).toContain('id="backup-load-input"');
  });

  it("ships the batch-2 context action menu and overhead bubble shell", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(html).toContain('id="world-action-toggle"');
    expect(html).toContain('id="world-action-menu"');
    expect(html).toContain('data-world-action="use"');
    expect(html).toContain('data-world-action="chat"');
    expect(html).toContain('data-world-action="interact"');
    expect(html).toContain('data-world-action="pickup"');
    expect(html).toContain('id="world-chat-bubble"');
    expect(html).not.toContain("interaction-prompt");
  });

  it("ships the Brutus companion submenu inside the world interaction menu", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(html).toContain('id="companion-action-menu"');
    expect(html).toContain('data-companion-action="pet"');
    expect(html).toContain('data-companion-action="feed"');
    expect(html).toContain('data-companion-action="sit"');
    expect(html).toContain('data-companion-action="follow"');
    expect(html).toContain('data-companion-action="lay"');
    expect(html).toContain('data-companion-action="fetch"');
  });

  it("uses the requested simple quest marker icon", () => {
    const renderer = readFileSync(resolve(process.cwd(), "src/game/renderer.ts"), "utf8");
    expect(renderer).toContain('fillText("❕"');
    expect(renderer).not.toContain('fillText("!"');
  });
  it("ships the batch-3 turn-based battle shell", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(html).toContain('id="battle-panel"');
    expect(html).toContain('id="battle-enemies"');
    expect(html).toContain('id="battle-attack"');
    expect(html).toContain('id="battle-defend"');
    expect(html).toContain('id="battle-item"');
  });

});
