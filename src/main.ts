import "./styles.css";
import { ASSET_MANIFEST, loadImages } from "./game/assets";
import { clampCamera, getVisibleWorldViewport } from "./game/camera";
import {
  applySwordAttack,
  areAllBirdsDefeated,
  createBirdGangRuntimeState,
  spawnBirdGang,
  updateBirdGang,
  type BirdGangRuntimeState
} from "./game/combat";
import { HOME_RENDER_ZOOM, INTERACTION_RADIUS_PX, OVERWORLD_RENDER_ZOOM, VIRTUAL_VIEWPORT } from "./game/constants";
import { createInputController } from "./game/input";
import { getMapSpec, MAP_REGISTRY, type MapId } from "./game/mapRegistry";
import { createPlayer, updatePlayer } from "./game/player";
import {
  advanceBirdSnatchEvent,
  advanceSleepTransition,
  advanceWakeSequence,
  applyBirdStealAttempt,
  applyQuestInteraction,
  advanceBirdGangIntro,
  completeBirdGangFight,
  type BirdAttention,
  createQuestState,
  discoverBird,
  getActiveInteractableTarget,
  getAvailableQuestInteraction,
  getQuestObjective,
  getTappedQuestInteraction,
  markQuestMovementStarted,
  restartQuest,
  startBirdGangIntro,
  type ActiveInteractableTarget,
  type QuestInteraction,
  type QuestMarkerPositions,
  type QuestState
} from "./game/quest";
import { CanvasRenderer } from "./game/renderer";
import {
  createTutorialState,
  dismissActiveTutorial,
  isTutorialBlockingGameplay,
  maybeOpenInteractionTutorial,
  TUTORIAL_CONTENT,
  type TutorialState
} from "./game/tutorial";
import {
  buildCollisionGrid,
  collectObjectRegions,
  findMarkerPositions,
  normalizeSemanticMap,
  type CollisionGrid,
  type MarkerPosition,
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
const restartButton = requireElement<HTMLButtonElement>("#restart-button");
const tutorialPopup = requireElement<HTMLElement>("#tutorial-popup");
const tutorialTitle = requireElement<HTMLHeadingElement>("#tutorial-title");
const tutorialBody = requireElement<HTMLDivElement>("#tutorial-body");
const tutorialButton = requireElement<HTMLButtonElement>("#tutorial-button");

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("Canvas2D is required for this pass.");
}
const canvasContext = ctx;

canvasContext.imageSmoothingEnabled = false;

const BIRD_SNATCH_SECONDS = 1.4;
const BIRD_DISCOVERY_RADIUS_PX = 120;
const SLEEP_TRANSITION_SECONDS = 1.1;
const WAKE_MESSAGE_SECONDS = 1.6;
const BIRD_GANG_MESSAGE_SECONDS = 1.6;
const SWORD_ATTACK_COOLDOWN_SECONDS = 0.28;

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
  birdSpawns: MarkerPosition[];
  questMarkers: QuestMarkerPositions;
};

type BirdRuntimeState = {
  visible: boolean;
  position: { x: number; y: number };
  attention: BirdAttention;
  elapsed: number;
  animationTime: number;
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
    birdSpawns: findMarkerPositions(map, "npc_spawn"),
    questMarkers: {
      fridge: findMarkerPositions(map, "fridge_interaction"),
      dog: findMarkerPositions(map, "dog_spawn").concat(findMarkerPositions(map, "dog_interaction")),
      exit: findMarkerPositions(map, "entrance_exit"),
      charlesJr: findMarkerPositions(map, "transition_to_charles_jr").concat(
        findMarkerPositions(map, "charles_jr_door")
      ),
      order: findMarkerPositions(map, "order_interaction"),
      bird: [],
      home: findMarkerPositions(map, "transition_to_home").concat(findMarkerPositions(map, "player_door")),
      bed: findMarkerPositions(map, "bed_interaction"),
      sword: findSwordPickupMarkers(id, map)
    }
  };
}

function findSwordPickupMarkers(id: MapId, map: SemanticMap): MarkerPosition[] {
  if (id !== "main_neighborhood_hub_day1") {
    return [];
  }

  const homeMarker =
    findMarkerPositions(map, "transition_to_home")[0] ?? findMarkerPositions(map, "player_door")[0] ?? null;
  const bushMarkers = collectObjectRegions(map)
    .filter((region) => region.id === "bush")
    .map((region) => ({
      x: (region.tileX + region.widthTiles / 2) * map.tileSize,
      y: (region.tileY + region.heightTiles / 2) * map.tileSize,
      tileX: region.tileX,
      tileY: region.tileY
    }));

  if (bushMarkers.length === 0) {
    throw new Error("Night sword pickup requires a real overworld bush object, but none was found.");
  }

  if (!homeMarker) {
    return [bushMarkers[0]];
  }

  return bushMarkers.sort((a, b) => distance(a, homeMarker) - distance(b, homeMarker)).slice(0, 1);
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
  let tutorial: TutorialState = createTutorialState();
  let availableInteraction: QuestInteraction | null = null;
  let bird: BirdRuntimeState = createBirdRuntimeState();
  let birdGang: BirdGangRuntimeState = createBirdGangRuntimeState();
  const renderer = new CanvasRenderer(canvasContext, images, ASSET_MANIFEST);

  let debugEnabled = false;
  let gameplayStarted = !isLikelyTouchDevice() && !isPortrait();
  let gameplayPausedForPortrait = false;
  let lastTime = performance.now();
  let lastCamera = { x: 0, y: 0 };
  let lastRenderZoom = HOME_RENDER_ZOOM;
  let pointerDownPoint: { x: number; y: number; id: number } | null = null;
  let scriptedQuestTimer = 0;
  let swordAttackCooldown = 0;

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
    if ((event.code === "Space" || event.code === "KeyJ") && !event.repeat) {
      event.preventDefault();
      attemptSwordAttack();
    }
  });

  debugToggle.addEventListener("click", () => {
    setDebugEnabled(!debugEnabled);
  });

  restartButton.addEventListener("click", () => {
    restartFoundation();
  });

  tutorialButton.addEventListener("click", () => {
    const dismissed = tutorial.active;
    tutorial = dismissActiveTutorial(tutorial);
    if (dismissed === "movement") {
      quest = markQuestMovementStarted(quest);
    }
    refreshAvailableInteraction();
    updateHud();
    updateTutorialPopup();
  });

  canvas.addEventListener("pointerdown", (event) => {
    pointerDownPoint = { ...pointerToVirtual(event), id: event.pointerId };
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!pointerDownPoint || pointerDownPoint.id !== event.pointerId) {
      pointerDownPoint = null;
      return;
    }

    const pointerUpPoint = pointerToVirtual(event);
    const dx = pointerUpPoint.x - pointerDownPoint.x;
    const dy = pointerUpPoint.y - pointerDownPoint.y;
    pointerDownPoint = null;

    if (Math.hypot(dx, dy) > 12 || !canUseGameplayInput()) {
      return;
    }

    const tapWorldPosition = virtualToWorld(pointerUpPoint);
    const tappedInteraction = getTappedQuestInteraction(
      quest,
      player.position,
      tapWorldPosition,
      getCurrentQuestMarkers(),
      INTERACTION_RADIUS_PX,
      42
    );
    if (tappedInteraction) {
      availableInteraction = tappedInteraction;
      applyAvailableInteraction();
      return;
    }

    if (pointerUpPoint.x > VIRTUAL_VIEWPORT.width / 2) {
      attemptSwordAttack();
    }
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
    updateTutorialPopup();
  });

  function updateLaunchGate(): void {
    if (isPortrait()) {
      gameplayPausedForPortrait = true;
      gate.hidden = false;
      tutorialPopup.hidden = true;
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
    setStatus("");
    updateTutorialPopup();
  }

  updateLaunchGate();
  updateTutorialPopup();

  function setDebugEnabled(enabled: boolean): void {
    debugEnabled = enabled;
    debugToggle.setAttribute("aria-pressed", String(debugEnabled));
  }

  function applyAvailableInteraction(): void {
    if (!availableInteraction || !canUseGameplayInput()) {
      return;
    }
    if (availableInteraction.kind === "bird") {
      quest = applyBirdStealAttempt(quest, player.position, bird.position, bird.attention, INTERACTION_RADIUS_PX);
      if (quest.stage === "go_home") {
        bird = createBirdRuntimeState();
      }
      refreshAvailableInteraction();
      updateHud();
      return;
    }

    const previousLocation = quest.location;
    const interactionKind = availableInteraction.kind;
    quest = applyQuestInteraction(quest, availableInteraction);
    if (quest.location !== previousLocation) {
      enterMap(quest.location, interactionKind);
    }
    if (quest.stage === "sleep_transition") {
      scriptedQuestTimer = 0;
    }
    if (interactionKind === "charles_exit" && quest.stage === "bird_snatch") {
      startBirdSnatchEvent();
    }
    refreshAvailableInteraction();
    updateHud();
  }

  function restartFoundation(): void {
    quest = restartQuest();
    tutorial = createTutorialState();
    bird = createBirdRuntimeState();
    birdGang = createBirdGangRuntimeState();
    enterMap(quest.location);
    availableInteraction = null;
    scriptedQuestTimer = 0;
    swordAttackCooldown = 0;
    lastTime = performance.now();
    updateHud();
    updateTutorialPopup();
  }

  function getMapContext(id: MapId): MapContext {
    const context = mapContexts.get(id);
    if (!context) {
      throw new Error(`Map registry missing loaded context: ${id}`);
    }
    return context;
  }

  function enterMap(id: MapId, source?: QuestInteraction["kind"]): void {
    activeMapContext = getMapContext(id);
    const spawn =
      id === "main_neighborhood_hub_day1" && source === "charles_exit"
        ? (activeMapContext.questMarkers.charlesJr[0] ?? activeMapContext.playerSpawn)
        : id === "main_neighborhood_hub_day1" && source === "exit" && quest.isNight
          ? (activeMapContext.questMarkers.home[0] ?? activeMapContext.playerSpawn)
        : id === "home_interior_day1" && source === "home"
          ? (activeMapContext.questMarkers.exit[0] ?? activeMapContext.playerSpawn)
        : activeMapContext.playerSpawn;
    player = createPlayer({ x: spawn.x, y: spawn.y });
  }

  function refreshAvailableInteraction(): void {
    availableInteraction = getAvailableQuestInteraction(
      quest,
      player.position,
      getCurrentQuestMarkers(),
      INTERACTION_RADIUS_PX
    );
  }

  function getActiveTarget(): ActiveInteractableTarget | null {
    return getActiveInteractableTarget(quest, getCurrentQuestMarkers());
  }

  function getCurrentQuestMarkers(): QuestMarkerPositions {
    return {
      ...activeMapContext.questMarkers,
      bird: bird.visible
        ? [
            {
              x: bird.position.x,
              y: bird.position.y,
              tileX: Math.floor(bird.position.x / activeMapContext.map.tileSize),
              tileY: Math.floor(bird.position.y / activeMapContext.map.tileSize)
            }
          ]
        : []
    };
  }

  function createBirdRuntimeState(): BirdRuntimeState {
    return {
      visible: false,
      position: { x: 0, y: 0 },
      attention: "watching",
      elapsed: 0,
      animationTime: 0
    };
  }

  function startBirdSnatchEvent(): void {
    bird = {
      visible: true,
      position: { x: player.position.x - 28, y: player.position.y - 36 },
      attention: "watching",
      elapsed: 0,
      animationTime: 0
    };
  }

  function updateBird(dt: number): void {
    if (!bird.visible) {
      return;
    }

    if (quest.stage === "bird_snatch") {
      const nextElapsed = bird.elapsed + dt;
      if (nextElapsed >= BIRD_SNATCH_SECONDS) {
        const spawn =
          activeMapContext.birdSpawns[0] ?? activeMapContext.questMarkers.charlesJr[0] ?? activeMapContext.playerSpawn;
        bird = {
          ...bird,
          position: { x: spawn.x, y: spawn.y },
          elapsed: 0,
          animationTime: 0,
          attention: "watching"
        };
        quest = advanceBirdSnatchEvent(quest);
        return;
      }

      bird = {
        ...bird,
        elapsed: nextElapsed,
        animationTime: bird.animationTime + dt
      };
      return;
    }

    if (quest.stage !== "find_bird" && quest.stage !== "steal_fries") {
      return;
    }

    const nextElapsed = bird.elapsed + dt;
    const phase = nextElapsed % 4;
    bird = {
      ...bird,
      elapsed: nextElapsed,
      animationTime: bird.animationTime + dt,
      attention: phase < 2.2 ? "watching" : "distracted"
    };
  }

  function updateBirdDiscovery(): void {
    if (!bird.visible || quest.stage !== "find_bird") {
      return;
    }

    const dx = player.position.x - bird.position.x;
    const dy = player.position.y - bird.position.y;
    if (Math.hypot(dx, dy) <= BIRD_DISCOVERY_RADIUS_PX) {
      quest = discoverBird(quest);
    }
  }

  function updateScriptedQuest(dt: number): void {
    if (
      quest.stage !== "sleep_transition" &&
      quest.stage !== "wake_tapping" &&
      quest.stage !== "night_overworld" &&
      quest.stage !== "bird_gang_intro"
    ) {
      scriptedQuestTimer = 0;
      return;
    }

    if (quest.stage === "night_overworld") {
      quest = startBirdGangIntro(quest);
      birdGang = spawnBirdGang(activeMapContext.questMarkers.home[0] ?? activeMapContext.playerSpawn);
      scriptedQuestTimer = 0;
      return;
    }

    scriptedQuestTimer += dt;
    if (quest.stage === "sleep_transition" && scriptedQuestTimer >= SLEEP_TRANSITION_SECONDS) {
      quest = advanceSleepTransition(quest);
      scriptedQuestTimer = 0;
      return;
    }

    if (quest.stage === "wake_tapping" && scriptedQuestTimer >= WAKE_MESSAGE_SECONDS) {
      quest = advanceWakeSequence(quest);
      scriptedQuestTimer = 0;
      return;
    }

    if (quest.stage === "bird_gang_intro" && scriptedQuestTimer >= BIRD_GANG_MESSAGE_SECONDS) {
      quest = advanceBirdGangIntro(quest);
      scriptedQuestTimer = 0;
    }
  }

  function getSleepOverlayAlpha(): number {
    if (quest.stage !== "sleep_transition") {
      return 0;
    }

    return Math.min(scriptedQuestTimer / SLEEP_TRANSITION_SECONDS, 1) * 0.52;
  }

  function attemptSwordAttack(): void {
    if (!canUseGameplayInput() || quest.stage !== "fight_birds" || !quest.hasSword || swordAttackCooldown > 0) {
      return;
    }

    const previousGang = birdGang;
    birdGang = applySwordAttack(birdGang, player.position, player.facing);
    swordAttackCooldown = SWORD_ATTACK_COOLDOWN_SECONDS;
    if (birdGang !== previousGang && areAllBirdsDefeated(birdGang)) {
      quest = completeBirdGangFight(quest);
    }
    refreshAvailableInteraction();
    updateHud();
  }

  function updateBirdGangRuntime(dt: number): void {
    swordAttackCooldown = Math.max(0, swordAttackCooldown - dt);
    birdGang = updateBirdGang(birdGang, dt);
    if (quest.stage === "fight_birds" && areAllBirdsDefeated(birdGang)) {
      quest = completeBirdGangFight(quest);
    }
  }

  function canUseGameplayInput(): boolean {
    return gameplayStarted && !gameplayPausedForPortrait && !isPortrait() && !isTutorialBlockingGameplay(tutorial);
  }

  function updateTutorialPopup(): void {
    if (!gameplayStarted || gameplayPausedForPortrait || isPortrait() || !tutorial.active) {
      tutorialPopup.hidden = true;
      return;
    }

    const content = TUTORIAL_CONTENT[tutorial.active];
    tutorialTitle.textContent = content.title;
    tutorialBody.replaceChildren(
      ...content.body.map((line) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = line;
        return paragraph;
      })
    );
    tutorialButton.textContent = content.buttonLabel;
    tutorialPopup.hidden = false;
  }

  function updateHud(): void {
    objective.textContent = getQuestObjective(quest, inputMode);
    const birdHint =
      quest.stage === "steal_fries"
        ? bird.attention === "watching"
          ? "Wait until the bird looks away."
          : "Tap ! to steal the fries back."
        : "";
    questMessage.textContent = quest.message ?? birdHint;
    restartButton.hidden = quest.stage !== "complete";
  }

  function pointerToVirtual(event: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIRTUAL_VIEWPORT.width,
      y: ((event.clientY - rect.top) / rect.height) * VIRTUAL_VIEWPORT.height
    };
  }

  function virtualToWorld(point: { x: number; y: number }): { x: number; y: number } {
    return {
      x: point.x / lastRenderZoom + lastCamera.x,
      y: point.y / lastRenderZoom + lastCamera.y
    };
  }

  function getActiveRenderZoom(): number {
    return activeMapContext.id === "main_neighborhood_hub_day1" ? OVERWORLD_RENDER_ZOOM : HOME_RENDER_ZOOM;
  }

  function frame(now: number): void {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    const moveVector = input.getMoveVector();

    if (canUseGameplayInput()) {
      if (Math.hypot(moveVector.x, moveVector.y) > 0.01) {
        quest = markQuestMovementStarted(quest);
      }
      updatePlayer(player, moveVector, dt, activeMapContext.map, activeMapContext.collision);
    }

    refreshAvailableInteraction();
    tutorial = maybeOpenInteractionTutorial(
      tutorial,
      quest,
      player.position,
      activeMapContext.questMarkers.fridge,
      INTERACTION_RADIUS_PX
    );
    updateBird(dt);
    updateBirdDiscovery();
    updateScriptedQuest(dt);
    updateBirdGangRuntime(dt);
    updateHud();
    updateTutorialPopup();

    const renderZoom = getActiveRenderZoom();
    const visibleWorldViewport = getVisibleWorldViewport(VIRTUAL_VIEWPORT, renderZoom);
    const camera = clampCamera(
      player.position,
      { width: activeMapContext.map.worldWidth, height: activeMapContext.map.worldHeight },
      visibleWorldViewport
    );
    lastCamera = camera;
    lastRenderZoom = renderZoom;
    renderer.render({
      map: activeMapContext.map,
      collision: activeMapContext.collision,
      camera,
      renderZoom,
      player,
      inputState: input.getTouchState(),
      debugEnabled,
      activeInteractableTarget: getActiveTarget()?.markerPosition ?? null,
      bird,
      birdGang,
      nightMode: quest.isNight,
      sleepOverlayAlpha: getSleepOverlayAlpha(),
      questDebugText: `${quest.location} | quest ${quest.stage} | night ${quest.isNight ? "yes" : "no"} | sword ${quest.hasSword ? "yes" : "no"} | food ${quest.hasDogFood ? "yes" : "no"} | dogFed ${quest.dogFed ? "yes" : "no"} | fries ${quest.hasFries ? "yes" : "no"} | stolen ${quest.friesStolen ? "yes" : "no"} | bird ${bird.visible ? bird.attention : "hidden"}`
    });

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(error);
  setStatus(`Blocked: ${message}`);
});
