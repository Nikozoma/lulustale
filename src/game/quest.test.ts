import { describe, expect, it } from "vitest";
import {
  applyQuestInteraction,
  createQuestState,
  getAvailableQuestInteraction,
  getQuestObjective,
  markQuestMovementStarted,
  restartQuest,
  type QuestMarkerPositions
} from "./quest";

const markers: QuestMarkerPositions = {
  fridge: [{ x: 208, y: 336, tileX: 6, tileY: 10 }],
  dog: [{ x: 112, y: 336, tileX: 3, tileY: 10 }],
  exit: [{ x: 80, y: 176, tileX: 2, tileY: 5 }],
  order: [{ x: 304, y: 432, tileX: 9, tileY: 13 }]
};

describe("indoor home quest flow", () => {
  it("advances through home, transitions to Charles Jr, orders fries, and restarts", () => {
    let quest = createQuestState();

    expect(quest.location).toBe("home_interior_day1");
    expect(getQuestObjective(quest, "desktop")).toBe("Move with WASD or arrow keys.");
    quest = markQuestMovementStarted(quest);
    expect(getQuestObjective(quest, "desktop")).toBe("Get food from the fridge.");

    const fridge = getAvailableQuestInteraction(quest, { x: 206, y: 334 }, markers, 40);
    expect(fridge?.kind).toBe("fridge");
    quest = applyQuestInteraction(quest, fridge!);
    expect(quest.hasDogFood).toBe(true);
    expect(getQuestObjective(quest, "desktop")).toBe("Feed the dog.");

    const dog = getAvailableQuestInteraction(quest, { x: 110, y: 335 }, markers, 40);
    expect(dog?.kind).toBe("dog");
    quest = applyQuestInteraction(quest, dog!);
    expect(quest.hasDogFood).toBe(false);
    expect(quest.dogFed).toBe(true);
    expect(getQuestObjective(quest, "desktop")).toBe("Go to the door.");

    const exit = getAvailableQuestInteraction(quest, { x: 80, y: 176 }, markers, 40);
    expect(exit?.kind).toBe("exit");
    quest = applyQuestInteraction(quest, exit!);
    expect(quest.location).toBe("charles_jr_interior_day1");
    expect(quest.stage).toBe("order_fries");
    expect(getQuestObjective(quest, "desktop")).toBe("Order fries at the counter.");

    const order = getAvailableQuestInteraction(quest, { x: 304, y: 432 }, markers, 40);
    expect(order?.kind).toBe("order");
    quest = applyQuestInteraction(quest, order!);
    expect(quest.hasFries).toBe(true);
    expect(quest.stage).toBe("complete");
    expect(getQuestObjective(quest, "desktop")).toBe("END OF DEMO");

    quest = restartQuest();
    expect(quest).toEqual(createQuestState());
  });

  it("uses mobile movement instruction copy", () => {
    expect(getQuestObjective(createQuestState(), "mobile")).toBe("Drag the left side of the screen to move.");
  });

  it("only offers the relevant nearby interaction for the current quest stage", () => {
    const nearFridge = { x: 206, y: 334 };
    const nearDog = { x: 110, y: 335 };
    const nearExit = { x: 80, y: 176 };
    const farAway = { x: 16, y: 16 };
    let quest = createQuestState();

    expect(getAvailableQuestInteraction(quest, nearFridge, markers, 42)).toBeNull();

    quest = markQuestMovementStarted(quest);
    expect(getAvailableQuestInteraction(quest, farAway, markers, 42)).toBeNull();
    expect(getAvailableQuestInteraction(quest, nearDog, markers, 42)).toBeNull();
    expect(getAvailableQuestInteraction(quest, nearExit, markers, 42)).toBeNull();
    expect(getAvailableQuestInteraction(quest, nearFridge, markers, 42)?.kind).toBe("fridge");

    quest = applyQuestInteraction(quest, { kind: "fridge", prompt: "" });
    expect(getAvailableQuestInteraction(quest, nearFridge, markers, 42)).toBeNull();
    expect(getAvailableQuestInteraction(quest, nearExit, markers, 42)).toBeNull();
    expect(getAvailableQuestInteraction(quest, nearDog, markers, 42)?.kind).toBe("dog");

    quest = applyQuestInteraction(quest, { kind: "dog", prompt: "" });
    expect(getAvailableQuestInteraction(quest, nearDog, markers, 42)).toBeNull();
    expect(getAvailableQuestInteraction(quest, nearFridge, markers, 42)).toBeNull();
    expect(getAvailableQuestInteraction(quest, nearExit, markers, 42)?.kind).toBe("exit");

    quest = applyQuestInteraction(quest, { kind: "exit", prompt: "" });
    expect(getAvailableQuestInteraction(quest, nearExit, markers, 42)).toBeNull();
    expect(getAvailableQuestInteraction(quest, nearFridge, markers, 42)).toBeNull();
    expect(getAvailableQuestInteraction(quest, farAway, markers, 42)).toBeNull();
    expect(getAvailableQuestInteraction(quest, { x: 304, y: 432 }, markers, 20)?.kind).toBe("order");
  });
});
