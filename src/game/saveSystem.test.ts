import { describe, expect, it } from "vitest";
import { createDemoQuestState } from "./demoQuest";
import { SAVE_SCHEMA_VERSION, createDefaultEquipment, createDefaultStatus } from "./gameState";
import { parseBackupSave, serializeBackupSave } from "./saveSystem";

describe("backup save format", () => {
  it("round-trips a versioned game state", () => {
    const state = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: "2026-07-20T00:00:00.000Z",
      quest: createDemoQuestState(),
      mapId: "home" as const,
      phase: "day" as const,
      player: { position: { x: 464, y: 1232 }, facing: "down" as const },
      companion: { position: { x: 420, y: 1232 }, facing: "right" as const, mode: "follow" as const },
      inventory: [],
      equipment: createDefaultEquipment(),
      status: createDefaultStatus(),
      flags: { dayWarningSeen: false }
    };
    expect(parseBackupSave(serializeBackupSave(state))).toEqual(state);
  });

  it("rejects unrelated JSON", () => {
    expect(() => parseBackupSave('{"hello":"world"}')).toThrow(/compatible/);
  });
});
