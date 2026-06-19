import { describe, expect, it } from "vitest";
import { applySwordAttack, areAllBirdsDefeated, spawnBirdGang, updateBirdGang } from "./combat";

describe("bird gang combat", () => {
  it("spawns three birds near the nighttime home anchor", () => {
    const gang = spawnBirdGang({ x: 1168, y: 656 });

    expect(gang.enemies).toHaveLength(3);
    expect(gang.enemies.every((enemy) => !enemy.defeated)).toBe(true);
  });

  it("defeats birds with short-range facing attacks", () => {
    let gang = spawnBirdGang({ x: 1168, y: 656 });

    gang = applySwordAttack(gang, { x: 1012, y: 590 }, "right_down");
    expect(gang.enemies[0].defeated).toBe(true);
    expect(gang.enemies[1].defeated).toBe(false);

    const unchanged = applySwordAttack(gang, { x: 16, y: 16 }, "right_down");
    expect(unchanged).toBe(gang);

    gang = applySwordAttack(gang, { x: 1060, y: 546 }, "right_down");
    gang = applySwordAttack(gang, { x: 1108, y: 590 }, "right_down");
    expect(areAllBirdsDefeated(gang)).toBe(true);
  });

  it("decays hit flash timing without changing defeated state", () => {
    let gang = spawnBirdGang({ x: 1168, y: 656 });
    gang = applySwordAttack(gang, { x: 1012, y: 590 }, "right_down");

    expect(gang.enemies[0].hitFlashSeconds).toBeGreaterThan(0);
    gang = updateBirdGang(gang, 1);
    expect(gang.enemies[0]).toMatchObject({ defeated: true, hitFlashSeconds: 0 });
  });
});
