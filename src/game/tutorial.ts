import type { QuestState } from "./quest";
import type { MarkerPosition, WorldPoint } from "./world";

export type TutorialPopupId = "movement" | "interaction";

export type TutorialState = {
  active: TutorialPopupId | null;
  movementDismissed: boolean;
  interactionDismissed: boolean;
};

export type TutorialPopupContent = {
  title: string;
  body: string[];
  buttonLabel: string;
};

export const TUTORIAL_CONTENT: Record<TutorialPopupId, TutorialPopupContent> = {
  movement: {
    title: "Move Lulu",
    body: ["Drag on the left side of the screen to move."],
    buttonLabel: "Got it"
  },
  interaction: {
    title: "Interact",
    body: ["Tap the ! marker to interact."],
    buttonLabel: "Got it"
  }
};

export function createTutorialState(): TutorialState {
  return {
    active: "movement",
    movementDismissed: false,
    interactionDismissed: false
  };
}

export function dismissActiveTutorial(state: TutorialState): TutorialState {
  if (state.active === "movement") {
    return { ...state, active: null, movementDismissed: true };
  }

  if (state.active === "interaction") {
    return { ...state, active: null, interactionDismissed: true };
  }

  return state;
}

export function maybeOpenInteractionTutorial(
  state: TutorialState,
  quest: QuestState,
  playerPosition: WorldPoint,
  fridgeMarkers: MarkerPosition[],
  triggerRadius: number
): TutorialState {
  if (state.active || state.interactionDismissed || quest.stage !== "get_food") {
    return state;
  }

  return isNearAny(playerPosition, fridgeMarkers, triggerRadius) ? { ...state, active: "interaction" } : state;
}

export function isTutorialBlockingGameplay(state: TutorialState): boolean {
  return state.active !== null;
}

function isNearAny(playerPosition: WorldPoint, positions: MarkerPosition[], radius: number): boolean {
  return positions.some((position) => {
    const dx = playerPosition.x - position.x;
    const dy = playerPosition.y - position.y;
    return Math.hypot(dx, dy) <= radius;
  });
}
