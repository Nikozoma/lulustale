import { describe, expect, it } from "vitest";
import { createQuestState, markQuestMovementStarted } from "./quest";
import {
  createTutorialState,
  dismissActiveTutorial,
  isTutorialBlockingGameplay,
  maybeOpenInteractionTutorial,
  TUTORIAL_CONTENT
} from "./tutorial";

const fridgeMarkers = [{ x: 208, y: 336, tileX: 6, tileY: 10 }];

describe("tutorial popup state", () => {
  it("opens the movement tutorial before play and dismisses it", () => {
    const state = createTutorialState();

    expect(state.active).toBe("movement");
    expect(TUTORIAL_CONTENT.movement.title).toBe("Move Lulu");
    expect(TUTORIAL_CONTENT.movement.body).toEqual(["Drag on the left side of the screen to move."]);
    expect(TUTORIAL_CONTENT.movement.body.join(" ")).not.toMatch(/desktop|WASD|arrow/i);
    expect(isTutorialBlockingGameplay(state)).toBe(true);

    const dismissed = dismissActiveTutorial(state);
    expect(dismissed.active).toBeNull();
    expect(dismissed.movementDismissed).toBe(true);
    expect(isTutorialBlockingGameplay(dismissed)).toBe(false);
  });

  it("opens the interaction tutorial once when Lulu nears the fridge objective", () => {
    let tutorial = dismissActiveTutorial(createTutorialState());
    const quest = markQuestMovementStarted(createQuestState());

    expect(maybeOpenInteractionTutorial(tutorial, quest, { x: 40, y: 40 }, fridgeMarkers, 42)).toBe(tutorial);

    tutorial = maybeOpenInteractionTutorial(tutorial, quest, { x: 206, y: 334 }, fridgeMarkers, 42);
    expect(tutorial.active).toBe("interaction");
    expect(TUTORIAL_CONTENT.interaction.title).toBe("Interact");
    expect(TUTORIAL_CONTENT.interaction.body).toEqual(["Tap the ! marker to interact."]);
    expect(TUTORIAL_CONTENT.interaction.body.join(" ")).not.toMatch(/desktop|press E|keyboard/i);

    tutorial = dismissActiveTutorial(tutorial);
    expect(tutorial.interactionDismissed).toBe(true);
    expect(maybeOpenInteractionTutorial(tutorial, quest, { x: 206, y: 334 }, fridgeMarkers, 42)).toBe(tutorial);
  });
});
