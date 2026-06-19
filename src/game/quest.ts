import type { MapId } from "./mapRegistry";
import type { MarkerPosition, WorldPoint } from "./world";

export type InputMode = "desktop" | "mobile";
export type QuestStage = "movement" | "get_food" | "feed_dog" | "go_to_door" | "order_fries" | "complete";
export type QuestInteractionKind = "fridge" | "dog" | "exit" | "order";

export type QuestState = {
  location: MapId;
  stage: QuestStage;
  hasDogFood: boolean;
  dogFed: boolean;
  hasFries: boolean;
  message: string | null;
};

export type QuestMarkerPositions = {
  fridge: MarkerPosition[];
  dog: MarkerPosition[];
  exit: MarkerPosition[];
  order: MarkerPosition[];
};

export type QuestInteraction = {
  kind: QuestInteractionKind;
  prompt: string;
};

export function createQuestState(): QuestState {
  return {
    location: "home_interior_day1",
    stage: "movement",
    hasDogFood: false,
    dogFed: false,
    hasFries: false,
    message: null
  };
}

export function restartQuest(): QuestState {
  return createQuestState();
}

export function markQuestMovementStarted(state: QuestState): QuestState {
  if (state.stage !== "movement") {
    return state;
  }
  return {
    ...state,
    stage: "get_food"
  };
}

export function getQuestObjective(state: QuestState, inputMode: InputMode): string {
  switch (state.stage) {
    case "movement":
      return inputMode === "mobile" ? "Drag the left side of the screen to move." : "Move with WASD or arrow keys.";
    case "get_food":
      return "Get food from the fridge.";
    case "feed_dog":
      return "Feed the dog.";
    case "go_to_door":
      return "Go to the door.";
    case "order_fries":
      return "Order fries at the counter.";
    case "complete":
      return "END OF DEMO";
  }
}

export function getAvailableQuestInteraction(
  state: QuestState,
  playerPosition: WorldPoint,
  markers: QuestMarkerPositions,
  radius: number
): QuestInteraction | null {
  if (state.stage === "get_food" && isNearAny(playerPosition, markers.fridge, radius)) {
    return { kind: "fridge", prompt: "Press E / Tap to get dog food" };
  }

  if (state.stage === "feed_dog" && state.hasDogFood && isNearAny(playerPosition, markers.dog, radius)) {
    return { kind: "dog", prompt: "Press E / Tap to feed dog" };
  }

  if (state.stage === "go_to_door" && state.dogFed && isNearAny(playerPosition, markers.exit, radius)) {
    return { kind: "exit", prompt: "Press E / Tap to leave home" };
  }

  if (state.stage === "order_fries" && isNearAny(playerPosition, markers.order, radius)) {
    return { kind: "order", prompt: "Press E / Tap to order fries" };
  }

  return null;
}

export function applyQuestInteraction(state: QuestState, interaction: QuestInteraction): QuestState {
  if (state.stage === "get_food" && interaction.kind === "fridge") {
    return {
      ...state,
      stage: "feed_dog",
      hasDogFood: true,
      message: "Dog food acquired."
    };
  }

  if (state.stage === "feed_dog" && interaction.kind === "dog" && state.hasDogFood) {
    return {
      ...state,
      stage: "go_to_door",
      hasDogFood: false,
      dogFed: true,
      message: "Good dog!"
    };
  }

  if (state.stage === "go_to_door" && interaction.kind === "exit" && state.dogFed) {
    return {
      ...state,
      location: "charles_jr_interior_day1",
      stage: "order_fries",
      message: null
    };
  }

  if (state.stage === "order_fries" && interaction.kind === "order") {
    return {
      ...state,
      stage: "complete",
      hasFries: true,
      message: "You got the fries."
    };
  }

  return state;
}

function isNearAny(playerPosition: WorldPoint, positions: MarkerPosition[], radius: number): boolean {
  return positions.some((position) => {
    const dx = playerPosition.x - position.x;
    const dy = playerPosition.y - position.y;
    return Math.hypot(dx, dy) <= radius;
  });
}
