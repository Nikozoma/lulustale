import "./styles.css";
import { ASSET_MANIFEST, loadImages } from "./game/assets";
import { clampCamera, getVisibleWorldViewport } from "./game/camera";
import { HOME_RENDER_ZOOM, INTERACTION_RADIUS_PX, VIRTUAL_VIEWPORT } from "./game/constants";
import { createInputController } from "./game/input";
import { getMapSpec, MAP_REGISTRY, type MapId } from "./game/mapRegistry";
import { createPlayer, updatePlayer } from "./game/player";
import {
  applyQuestInteraction,
  createQuestState,
  getAvailableQuestInteraction,
  getQuestObjective,
  markQuestMovementStarted,
  restartQuest,
  type QuestInteraction,
  type QuestMarkerPositions,
  type QuestState
} from "./game/quest";
import { CanvasRenderer } from "./game/renderer";
import {
  buildCollisionGrid,
  findMarkerPositions,
  normalizeSemanticMap,
  type CollisionGrid,
  type RawSemanticMap,
  type SemanticMap
} from "./game/world";

const canvas = requireElement<HTMLCanvasElement>("#game");
const status = requireElement<HTMLDivElement>("#status");
const gate = requireElement<HTMLElement>("#orientation-gate");
const gateTitle = requireElement<HTMLHeadingElement>("#gate-title");
const gateCopy = requireElement<HTMLParagraphElement>("#gate-copy");
const gateButton = requireElement<HTMLButtonElement>("#gate-button");
const debugToggle = requireElement<HTMLButtonElement>("#debug-toggle");
const objective = requireElement<HTMLDivElement>("#objective");
const questMessage = requireElement<HTMLDivElement>("#quest-message");
const interactionPrompt = requireElement<HTMLDivElement>("#interaction-prompt");
const interactButton = requireElement<HTMLButtonElement>("#interact-button");
const restartButton = requireElement<HTMLButtonElement>("#restart-button");

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("Canvas2D is required for this pass.");
}
const canvasContext = ctx;

canvasContext.imageSmoothingEnabled = false;

function setStatus(message: string): void {
  status.textContent = message;
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing required game shell element: ${selector}`);
  }
  return element;
}

function fitCanvasToWindow(): void {
  const scale = Math.min(window.innerWidth / VIRTUAL_VIEWPORT.width, window.innerHeight / VIRTUAL_VIEWPORT.height);
  canvas.style.width = `${Math.floor(VIRTUAL_VIEWPORT.width * scale)}px`;
  canvas.style.height = `${Math.floor(VIRTUAL_VIEWPORT.height * scale)}px`;
}

function isPortrait(): boolean {
  return window.innerHeight > window.innerWidth;
}

function isLikelyTouchDevice(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

async function tryEnterFullscreen(): Promise<void> {
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Mobile browsers commonly require a direct user gesture; the gate button handles that path.
    }
  }

  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (orientation: "landscape") => Promise<void>;
  };
  if (orientation?.lock) {
    try {
      await orientation.lock("landscape");
    } catch {
      // Orientation lock is best-effort and not supported by all browsers.
    }
  }
}

async function loadRawMap(mapId: MapId): Promise<RawSemanticMap> {
  const response = await fetch(getMapSpec(mapId).href);
  if (!response.ok) {
    throw new Error(`Unable to load semantic map ${mapId}: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as RawSemanticMap;
}

type MapContext = {
  id: MapId;
  map: SemanticMap;
  collision: CollisionGrid;
  playerSpawn: { x: number; y: number };
  questMarkers: QuestMarkerPositions;
};

function createMapContext(id: MapId, rawMap: RawSemanticMap): MapContext {
  const map = normalizeSemanticMap(rawMap);
  const collision = buildCollisionGrid(map);
  const playerSpawn = findMarkerPositions(map, "player_spawn")[0];

  if (!playerSpawn) {
    throw new Error(`Semantic map ${id} does not contain player_spawn.`);
  }

  return {
    id,
    map,
    collision,
    playerSpawn,
    questMarkers: {
      fridge: findMarkerPositions(map, "fridge_interaction"),
      dog: findMarkerPositions(map, "dog_interaction").concat(findMarkerPositions(map, "dog_spawn")),
      exit: findMarkerPositions(map, "entrance_exit"),
      order: findMarkerPositions(map, "order_interaction")
    }
  };
}

async function start(): Promise<void> {
  fitCanvasToWindow();
  window.addEventListener("resize", () => {
    fitCanvasToWindow();
    updateLaunchGate();
  });

  const [rawMaps, images] = await Promise.all([
    Promise.all((Object.keys(MAP_REGISTRY) as MapId[]).map(async (id) => [id, await loadRawMap(id)] as const)),
    loadImages(ASSET_MANIFEST)
  ]);
  const mapContexts = new Map<MapId, MapContext>(
    rawMaps.map(([id, rawMap]) => [id, createMapContext(id, rawMap)])
  );
  let activeMapContext = getMapContext("home_interior_day1");

  const input = createInputController(canvas, VIRTUAL_VIEWPORT);
  const inputMode = isLikelyTouchDevice() ? "mobile" : "desktop";
  let player = createPlayer({ x: activeMapContext.playerSpawn.x, y: activeMapContext.playerSpawn.y });
  let quest: QuestState = createQuestState();
  let availableInteraction: QuestInteraction | null = null;
  const renderer = new CanvasRenderer(canvasContext, images, ASSET_MANIFEST);

  let debugEnabled = false;
  let gameplayStarted = !isLikelyTouchDevice() && !isPortrait();
  let gameplayPausedForPortrait = false;
  let lastTime = performance.now();

  window.addEventListener("keydown", (event) => {
    if (event.code === "F3" && !event.repeat) {
      setDebugEnabled(!debugEnabled);
    }
    if (event.code === "KeyE" && !event.repeat) {
      applyAvailableInteraction();
    }
    if (event.code === "KeyR" && !event.repeat && quest.stage === "complete") {
      restartFoundation();
    }
  });

  debugToggle.addEventListener("click", () => {
    setDebugEnabled(!debugEnabled);
  });

  interactButton.addEventListener("click", () => {
    applyAvailableInteraction();
  });

  restartButton.addEventListener("click", () => {
    restartFoundation();
  });

  gateButton.addEventListener("click", async () => {
    if (isPortrait()) {
      updateLaunchGate();
      return;
    }

    await tryEnterFullscreen();
    gameplayStarted = true;
    gameplayPausedForPortrait = false;
    lastTime = performance.now();
    updateLaunchGate();
  });

  function updateLaunchGate(): void {
    if (isPortrait()) {
      gameplayPausedForPortrait = true;
      gate.hidden = false;
      gateTitle.textContent = "Please turn phone sideways";
      gateCopy.textContent = "Landscape mode is required for this indoor-home demo.";
      gateButton.hidden = true;
      setStatus("Turn phone sideways to play.");
      return;
    }

    if (!gameplayStarted) {
      gate.hidden = false;
      gateTitle.textContent = "Lulu's Tale";
      gateCopy.textContent = "Tap to start in landscape fullscreen.";
      gateButton.hidden = false;
      setStatus("Landscape detected. Tap to start.");
      void tryEnterFullscreen();
      return;
    }

    gameplayPausedForPortrait = false;
    gate.hidden = true;
    setStatus("WASD/arrows move. Drag left side on touch. Press F3 or tap Debug.");
  }

  updateLaunchGate();

  function setDebugEnabled(enabled: boolean): void {
    debugEnabled = enabled;
    debugToggle.setAttribute("aria-pressed", String(debugEnabled));
  }

  function applyAvailableInteraction(): void {
    if (!availableInteraction || !gameplayStarted || gameplayPausedForPortrait || isPortrait()) {
      return;
    }
    const previousLocation = quest.location;
    quest = applyQuestInteraction(quest, availableInteraction);
    if (quest.location !== previousLocation) {
      enterMap(quest.location);
    }
    refreshAvailableInteraction();
    updateHud();
  }

  function restartFoundation(): void {
    quest = restartQuest();
    enterMap(quest.location);
    availableInteraction = null;
    lastTime = performance.now();
    updateHud();
  }

  function getMapContext(id: MapId): MapContext {
    const context = mapContexts.get(id);
    if (!context) {
      throw new Error(`Map registry missing loaded context: ${id}`);
    }
    return context;
  }

  function enterMap(id: MapId): void {
    activeMapContext = getMapContext(id);
    player = createPlayer({ x: activeMapContext.playerSpawn.x, y: activeMapContext.playerSpawn.y });
  }

  function refreshAvailableInteraction(): void {
    availableInteraction = getAvailableQuestInteraction(
      quest,
      player.position,
      activeMapContext.questMarkers,
      INTERACTION_RADIUS_PX
    );
  }

  function updateHud(): void {
    objective.textContent = getQuestObjective(quest, inputMode);
    questMessage.textContent = quest.message ?? "";
    interactionPrompt.textContent = availableInteraction?.prompt ?? "";
    interactButton.hidden = !availableInteraction || quest.stage === "complete";
    restartButton.hidden = quest.stage !== "complete";
  }

  function frame(now: number): void {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const moveVector = input.getMoveVector();

    if (gameplayStarted && !gameplayPausedForPortrait && !isPortrait()) {
      if (Math.hypot(moveVector.x, moveVector.y) > 0.01) {
        quest = markQuestMovementStarted(quest);
      }
      updatePlayer(player, moveVector, dt, activeMapContext.map, activeMapContext.collision);
    }

    refreshAvailableInteraction();
    updateHud();

    const visibleWorldViewport = getVisibleWorldViewport(VIRTUAL_VIEWPORT, HOME_RENDER_ZOOM);
    const camera = clampCamera(
      player.position,
      { width: activeMapContext.map.worldWidth, height: activeMapContext.map.worldHeight },
      visibleWorldViewport
    );
    renderer.render({
      map: activeMapContext.map,
      collision: activeMapContext.collision,
      camera,
      player,
      inputState: input.getTouchState(),
      debugEnabled,
      questDebugText: `${quest.location} | quest ${quest.stage} | food ${quest.hasDogFood ? "yes" : "no"} | dogFed ${quest.dogFed ? "yes" : "no"} | fries ${quest.hasFries ? "yes" : "no"}`
    });

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(error);
  setStatus(`Blocked: ${message}`);
});
