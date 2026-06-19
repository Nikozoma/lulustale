import { describe, expect, it } from "vitest";
import {
  advanceBirdSnatchEvent,
  applyBirdStealAttempt,
  applyQuestInteraction,
  createQuestState,
  discoverBird,
  getActiveInteractableTarget,
  getAvailableQuestInteraction,
  getTappedQuestInteraction,
  getQuestObjective,
  markQuestMovementStarted,
  restartQuest,
  triggerBirdSnatch,
  type QuestMarkerPositions
} from "./quest";

const markers: QuestMarkerPositions = {
  fridge: [{ x: 208, y: 336, tileX: 6, tileY: 10 }],
  dog: [{ x: 112, y: 336, tileX: 3, tileY: 10 }],
  exit: [{ x: 80, y: 176, tileX: 2, tileY: 5 }],
  charlesJr: [{ x: 496, y: 656, tileX: 15, tileY: 20 }],
  order: [{ x: 304, y: 432, tileX: 9, tileY: 13 }],
  bird: [{ x: 336, y: 592, tileX: 10, tileY: 18 }],
  home: [{ x: 1168, y: 656, tileX: 36, tileY: 20 }],
  bed: [{ x: 240, y: 112, tileX: 7, tileY: 3 }]
};

describe("indoor home quest flow", () => {
  it("advances through the full first-day demo flow and restarts", () => {
    let quest = createQuestState();

    expect(quest.location).toBe("home_interior_day1");
    expect(getQuestObjective(quest, "desktop")).toBe("Drag the left side of the screen to move.");
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
    expect(quest.location).toBe("main_neighborhood_hub_day1");
    expect(quest.stage).toBe("go_to_charles_jr");
    expect(getQuestObjective(quest, "desktop")).toBe("Go to Charles Jr.");

    const charlesJr = getAvailableQuestInteraction(quest, { x: 496, y: 656 }, markers, 40);
    expect(charlesJr?.kind).toBe("charles_jr");
    quest = applyQuestInteraction(quest, charlesJr!);
    expect(quest.location).toBe("charles_jr_interior_day1");
    expect(quest.stage).toBe("order_fries");
    expect(getQuestObjective(quest, "desktop")).toBe("Order fries at the counter.");

    const order = getAvailableQuestInteraction(quest, { x: 304, y: 432 }, markers, 40);
    expect(order?.kind).toBe("order");
    quest = applyQuestInteraction(quest, order!);
    expect(quest.hasFries).toBe(true);
    expect(quest.stage).toBe("leave_charles_jr");
    expect(getQuestObjective(quest, "desktop")).toBe("Go outside.");

    const charlesExit = getAvailableQuestInteraction(quest, { x: 80, y: 176 }, markers, 40);
    expect(charlesExit?.kind).toBe("charles_exit");
    quest = applyQuestInteraction(quest, charlesExit!);
    expect(quest.location).toBe("main_neighborhood_hub_day1");
    expect(quest.stage).toBe("bird_snatch");
    expect(quest.hasFries).toBe(false);
    expect(quest.friesStolen).toBe(true);
    expect(quest.message).toBe("A bird swoops down and steals Lulu's fries!");

    quest = advanceBirdSnatchEvent(quest);
    expect(getQuestObjective(quest, "desktop")).toBe("Find the bird.");

    quest = discoverBird(quest);
    expect(getQuestObjective(quest, "desktop")).toBe("Steal the fries back.");

    quest = applyBirdStealAttempt(quest, { x: 336, y: 592 }, { x: 336, y: 592 }, "distracted", 42);
    expect(quest.hasFries).toBe(true);
    expect(quest.friesRecovered).toBe(true);
    expect(quest.stage).toBe("go_home");
    expect(getQuestObjective(quest, "desktop")).toBe("Go home.");

    const home = getAvailableQuestInteraction(quest, { x: 1168, y: 656 }, markers, 40);
    expect(home?.kind).toBe("home");
    quest = applyQuestInteraction(quest, home!);
    expect(quest.location).toBe("home_interior_day1");
    expect(quest.stage).toBe("go_to_bed");
    expect(getQuestObjective(quest, "desktop")).toBe("It's getting late, time for bed.");

    const bed = getAvailableQuestInteraction(quest, { x: 240, y: 112 }, markers, 40);
    expect(bed?.kind).toBe("bed");
    quest = applyQuestInteraction(quest, bed!);
    expect(quest.stage).toBe("complete");
    expect(getQuestObjective(quest, "desktop")).toBe("END OF DEMO");

    quest = restartQuest();
    expect(quest).toEqual(createQuestState());
  });

  it("uses mobile movement instruction copy", () => {
    expect(getQuestObjective(createQuestState(), "mobile")).toBe("Drag the left side of the screen to move.");
    expect(getQuestObjective(createQuestState(), "desktop")).not.toMatch(/WASD|arrow/i);
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
    expect(getAvailableQuestInteraction(quest, { x: 496, y: 656 }, markers, 42)?.kind).toBe("charles_jr");

    quest = applyQuestInteraction(quest, { kind: "charles_jr", prompt: "" });
    expect(getAvailableQuestInteraction(quest, { x: 496, y: 656 }, markers, 42)).toBeNull();
    expect(getAvailableQuestInteraction(quest, { x: 304, y: 432 }, markers, 20)?.kind).toBe("order");

    quest = applyQuestInteraction(quest, { kind: "order", prompt: "" });
    expect(getAvailableQuestInteraction(quest, { x: 304, y: 432 }, markers, 42)).toBeNull();
    expect(getAvailableQuestInteraction(quest, nearExit, markers, 42)?.kind).toBe("charles_exit");

    quest = applyQuestInteraction(quest, { kind: "charles_exit", prompt: "" });
    expect(getAvailableQuestInteraction(quest, { x: 336, y: 592 }, markers, 42)).toBeNull();

    quest = advanceBirdSnatchEvent(quest);
    expect(getAvailableQuestInteraction(quest, { x: 336, y: 592 }, markers, 42)).toBeNull();

    quest = discoverBird(quest);
    expect(getAvailableQuestInteraction(quest, { x: 336, y: 592 }, markers, 42)?.kind).toBe("bird");

    quest = applyBirdStealAttempt(quest, { x: 336, y: 592 }, { x: 336, y: 592 }, "distracted", 42);
    expect(getAvailableQuestInteraction(quest, { x: 1168, y: 656 }, markers, 42)?.kind).toBe("home");

    quest = applyQuestInteraction(quest, { kind: "home", prompt: "" });
    expect(getAvailableQuestInteraction(quest, { x: 240, y: 112 }, markers, 42)?.kind).toBe("bed");
  });

  it("exposes only the current objective target for the interactable marker", () => {
    let quest = createQuestState();
    expect(getActiveInteractableTarget(quest, markers)).toBeNull();

    quest = markQuestMovementStarted(quest);
    expect(getActiveInteractableTarget(quest, markers)).toMatchObject({
      kind: "fridge",
      markerPosition: { x: 240, y: 344 }
    });

    quest = applyQuestInteraction(quest, { kind: "fridge", prompt: "" });
    expect(getActiveInteractableTarget(quest, markers)).toMatchObject({
      kind: "dog",
      markerPosition: { x: 112, y: 316 }
    });

    quest = applyQuestInteraction(quest, { kind: "dog", prompt: "" });
    expect(getActiveInteractableTarget(quest, markers)).toMatchObject({
      kind: "exit",
      markerPosition: { x: 80, y: 176 }
    });

    quest = applyQuestInteraction(quest, { kind: "exit", prompt: "" });
    expect(getActiveInteractableTarget(quest, markers)).toMatchObject({
      kind: "charles_jr",
      markerPosition: { x: 496, y: 648 }
    });

    quest = applyQuestInteraction(quest, { kind: "charles_jr", prompt: "" });
    expect(getActiveInteractableTarget(quest, markers)).toMatchObject({
      kind: "order",
      markerPosition: { x: 304, y: 450 }
    });

    quest = applyQuestInteraction(quest, { kind: "order", prompt: "" });
    expect(getActiveInteractableTarget(quest, markers)).toMatchObject({
      kind: "charles_exit",
      markerPosition: { x: 80, y: 176 }
    });

    quest = applyQuestInteraction(quest, { kind: "charles_exit", prompt: "" });
    expect(getActiveInteractableTarget(quest, markers)).toBeNull();

    quest = advanceBirdSnatchEvent(quest);
    expect(getActiveInteractableTarget(quest, markers)).toBeNull();

    quest = discoverBird(quest);
    expect(getActiveInteractableTarget(quest, markers)).toMatchObject({
      kind: "bird",
      markerPosition: { x: 336, y: 570 }
    });

    quest = applyBirdStealAttempt(quest, { x: 336, y: 592 }, { x: 336, y: 592 }, "distracted", 42);
    expect(getActiveInteractableTarget(quest, markers)).toMatchObject({
      kind: "home",
      markerPosition: { x: 1168, y: 648 }
    });

    quest = applyQuestInteraction(quest, { kind: "home", prompt: "" });
    expect(getActiveInteractableTarget(quest, markers)).toMatchObject({
      kind: "bed",
      markerPosition: { x: 240, y: 90 }
    });

    quest = applyQuestInteraction(quest, { kind: "bed", prompt: "" });
    expect(getActiveInteractableTarget(quest, markers)).toBeNull();
  });

  it("allows tapping the active marker only when Lulu is also in interaction range", () => {
    const quest = markQuestMovementStarted(createQuestState());
    const fridgeMarkerTap = { x: 240, y: 344 };

    expect(getTappedQuestInteraction(quest, { x: 16, y: 16 }, fridgeMarkerTap, markers, 42, 36)).toBeNull();
    expect(getTappedQuestInteraction(quest, { x: 206, y: 334 }, { x: 80, y: 176 }, markers, 42, 36)).toBeNull();
    expect(getTappedQuestInteraction(quest, { x: 206, y: 334 }, fridgeMarkerTap, markers, 42, 36)?.kind).toBe("fridge");
  });

  it("bird steal fails while watching, succeeds while distracted, and requires range", () => {
    let quest = createQuestState();
    quest = {
      ...quest,
      location: "main_neighborhood_hub_day1",
      stage: "find_bird",
      friesStolen: true
    };
    quest = discoverBird(quest);

    const birdPosition = { x: 336, y: 592 };
    expect(getTappedQuestInteraction(quest, { x: 16, y: 16 }, { x: 336, y: 570 }, markers, 42, 42)).toBeNull();
    expect(getTappedQuestInteraction(quest, birdPosition, { x: 336, y: 570 }, markers, 42, 42)?.kind).toBe("bird");

    const watchingAttempt = applyBirdStealAttempt(quest, birdPosition, birdPosition, "watching", 42);
    expect(watchingAttempt.stage).toBe("steal_fries");
    expect(watchingAttempt.hasFries).toBe(false);
    expect(watchingAttempt.message).toBe("Not while it's watching!");

    const farAttempt = applyBirdStealAttempt(quest, { x: 16, y: 16 }, birdPosition, "distracted", 42);
    expect(farAttempt).toBe(quest);

    const success = applyBirdStealAttempt(quest, birdPosition, birdPosition, "distracted", 42);
    expect(success.stage).toBe("go_home");
    expect(success.hasFries).toBe(true);
    expect(success.friesRecovered).toBe(true);
    expect(success.message).toBe("You got the fries back!");
  });

  it("keeps bird snatch, discovery, return home, and bed ending explicit", () => {
    let quest = createQuestState();
    quest = {
      ...quest,
      location: "charles_jr_interior_day1",
      stage: "leave_charles_jr",
      hasFries: true
    };

    quest = triggerBirdSnatch(quest);
    expect(quest.location).toBe("main_neighborhood_hub_day1");
    expect(quest.stage).toBe("bird_snatch");
    expect(quest.hasFries).toBe(false);
    expect(quest.friesStolen).toBe(true);
    expect(quest.message).toBe("A bird swoops down and steals Lulu's fries!");

    quest = advanceBirdSnatchEvent(quest);
    expect(quest.stage).toBe("find_bird");
    expect(getQuestObjective(quest, "mobile")).toBe("Find the bird.");

    quest = discoverBird(quest);
    expect(quest.stage).toBe("steal_fries");
    expect(getQuestObjective(quest, "mobile")).toBe("Steal the fries back.");

    quest = applyBirdStealAttempt(quest, { x: 336, y: 592 }, { x: 336, y: 592 }, "distracted", 42);
    expect(quest.stage).toBe("go_home");
    expect(getQuestObjective(quest, "mobile")).toBe("Go home.");

    quest = applyQuestInteraction(quest, { kind: "home", prompt: "" });
    expect(quest.stage).toBe("go_to_bed");
    expect(getQuestObjective(quest, "mobile")).toBe("It's getting late, time for bed.");

    quest = applyQuestInteraction(quest, { kind: "bed", prompt: "" });
    expect(quest.stage).toBe("complete");
  });
});
