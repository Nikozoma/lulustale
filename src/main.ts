import "./styles.css";
import {
  canStartGameplay,
  deriveBootView,
  getDisplayViewportSize,
  type BootEnvironment
} from "./game/bootFlow";
import { clampCamera } from "./game/camera";
import {
  attackEnemy,
  createBirdGangBattle,
  defend as defendInBattle,
  getBattleExperienceReward,
  livingEnemies,
  resolveEnemyTurn,
  useFries,
  type TurnBasedBattleState
} from "./game/combat";
import { loadCharacterAssets } from "./game/characterAssets";
import {
  beginCompanionCommand,
  beginCompanionInteraction,
  beginFetch,
  createCompanion,
  getFeedingPropPosition,
  getFetchToyPosition,
  resetCompanionForMap,
  restoreCompanionCommandState,
  updateCompanion,
  type CompanionActionName,
  type CompanionInteractionName
} from "./game/companion";
import { BRUTUS, PLAYER } from "./game/constants";
import {
  applyQuestTransition,
  winBirdGangBattle,
  canUseQuestTransition,
  chooseDayEnd,
  createDemoQuestState,
  feedBrutusForQuest,
  getDemoObjective,
  meetNightGuide,
  orderFries,
  resolveBirdInvestigation,
  resolveFryDefense,
  sleepAfterNight,
  takeBushSword,
  takeDogFood,
  type BedChoice,
  type FriesOutcome
} from "./game/demoQuest";
import {
  findSafePlacement,
  getSpawn,
  loadFoundationMaps,
  loadMapVisual,
  resolveSafeSpawn,
  transitionAt,
  type FoundationMapId,
  type PixelRect,
  type RuntimeMap,
  type TransitionDefinition,
  type WorldPoint
} from "./game/foundation";
import {
  ITEM_DEFINITIONS,
  SAVE_SCHEMA_VERSION,
  createDefaultStatus,
  createEquipmentFromQuest,
  equipItem,
  getActiveQuestTitle,
  getEffectiveStatus,
  removeInventoryItem,
  rebuildInventoryFromQuest,
  unequipSlot,
  type EquipmentSlot,
  type EquipmentState,
  type InventoryEntry,
  type PersistentGameState,
  type PlayerStatusState
} from "./game/gameState";
import {
  exportBackupSave,
  readAutosave,
  readBackupSaveFile,
  writeAutosave
} from "./game/saveSystem";
import { createInputController } from "./game/input";
import {
  WORLD_ACTION_LABELS,
  canActivateObjectiveMarker,
  describeWorldAction,
  getAvailableWorldActions,
  type WorldActionKind,
  type WorldActionTarget
} from "./game/interactionSystem";
import { pickupItem } from "./game/itemPickup";
import { getNpcDialogue, type DialogueLine } from "./game/npcDialogue";
import { createPlayer, updatePlayer, type Facing } from "./game/player";
import { FoundationRenderer } from "./game/renderer";
import { applyLogicalViewport, calculateLogicalViewport, type LogicalViewport } from "./game/viewport";
import type { VisualPhase } from "./game/visual";
import {
  loadWorldActorAssets,
  requireBirdAnimation,
  requireNpcAnimation,
  type WorldActorRenderState
} from "./game/worldActors";

const titleScreen = requireElement<HTMLElement>("#title-screen");
const titlePlayButton = requireElement<HTMLButtonElement>("#title-play-button");
const canvas = requireElement<HTMLCanvasElement>("#game");
const objectiveMarker = requireElement<HTMLButtonElement>("#objective-marker");
const status = requireElement<HTMLDivElement>("#status");
const objective = requireElement<HTMLDivElement>("#objective");
const message = requireElement<HTMLDivElement>("#quest-message");
const gate = requireElement<HTMLElement>("#orientation-gate");
const gateTitle = requireElement<HTMLHeadingElement>("#gate-title");
const gateCopy = requireElement<HTMLParagraphElement>("#gate-copy");
const gateButton = requireElement<HTMLButtonElement>("#gate-button");
const debugToggle = requireElement<HTMLButtonElement>("#debug-toggle");
const phaseButton = requireElement<HTMLButtonElement>("#phase-button");
const runButton = requireElement<HTMLButtonElement>("#run-button");
const petButton = requireElement<HTMLButtonElement>("#pet-button");
const feedButton = requireElement<HTMLButtonElement>("#feed-button");
const commandButton = requireElement<HTMLButtonElement>("#command-button");
const menuButton = requireElement<HTMLButtonElement>("#menu-button");
const worldActionToggle = requireElement<HTMLButtonElement>("#world-action-toggle");
const worldActionMenu = requireElement<HTMLDivElement>("#world-action-menu");
const worldActionButtons = [...worldActionMenu.querySelectorAll<HTMLButtonElement>("button[data-world-action]")];
const brutusActionEntry = requireElement<HTMLButtonElement>("#brutus-action-entry");
const companionActionMenu = requireElement<HTMLDivElement>("#companion-action-menu");
const companionActionButtons = [...companionActionMenu.querySelectorAll<HTMLButtonElement>("button[data-companion-action]")];
const worldChatBubble = requireElement<HTMLDivElement>("#world-chat-bubble");
const menuPanel = requireElement<HTMLElement>("#main-menu");
const menuClose = requireElement<HTMLButtonElement>("#menu-close");
const menuTabs = requireElement<HTMLElement>("#menu-tabs");
const menuContent = requireElement<HTMLDivElement>("#menu-content");
const backupLoadInput = requireElement<HTMLInputElement>("#backup-load-input");
const questTracker = requireElement<HTMLElement>("#quest-tracker");
const questTrackerOpen = requireElement<HTMLButtonElement>("#quest-tracker-open");
const questTrackerMinimize = requireElement<HTMLButtonElement>("#quest-tracker-minimize");
const questTrackerTitle = requireElement<HTMLSpanElement>("#quest-tracker-title");
const questTrackerObjective = requireElement<HTMLSpanElement>("#quest-tracker-objective");
const dialoguePanel = requireElement<HTMLElement>("#dialogue-panel");
const dialogueSpeaker = requireElement<HTMLDivElement>("#dialogue-speaker");
const dialogueText = requireElement<HTMLDivElement>("#dialogue-text");
const dialogueChoices = requireElement<HTMLDivElement>("#dialogue-choices");
const minigamePanel = requireElement<HTMLElement>("#minigame-panel");
const minigameText = requireElement<HTMLDivElement>("#minigame-text");
const minigameButtons = [...document.querySelectorAll<HTMLButtonElement>("#minigame-arrows button")];
const battlePanel = requireElement<HTMLElement>("#battle-panel");
const battleEnemies = requireElement<HTMLDivElement>("#battle-enemies");
const battleRound = requireElement<HTMLDivElement>("#battle-round");
const battlePlayerHp = requireElement<HTMLDivElement>("#battle-player-hp");
const battlePlayerHpFill = requireElement<HTMLDivElement>("#battle-player-hp-fill");
const battleLog = requireElement<HTMLDivElement>("#battle-log");
const battleCommandPanel = requireElement<HTMLDivElement>("#battle-command-panel");
const battleAttackButton = requireElement<HTMLButtonElement>("#battle-attack");
const battleDefendButton = requireElement<HTMLButtonElement>("#battle-defend");
const battleItemButton = requireElement<HTMLButtonElement>("#battle-item");
const battleSubmenu = requireElement<HTMLDivElement>("#battle-submenu");

const context = canvas.getContext("2d");
if (!context) throw new Error("Canvas2D is required for Lulu's Tale.");
const canvasContext = context;

const INTERACTION_RADIUS = 58;
const BUSH_TILE = { x: 68, y: 38 }; // Existing real bush east of Home in the locked 96×68 Overworld grid.
const BIRD_GANG_DESIGN_POINT = { x: 84.5 * 32, y: 48.5 * 32 }; // Enhanced quest draft (42,24) mapped to the locked 2× grid.

type MenuPage = "status" | "equipment" | "inventory" | "quest" | "map" | "save";
type ActiveWorldBubble = { position: WorldPoint; text: string; expiresAt: number };

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required game shell element: ${selector}`);
  return element;
}

function requireElementFrom<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required menu element: ${selector}`);
  return element;
}

function isPortrait(): boolean {
  if (window.matchMedia?.("(orientation: portrait)").matches) return true;
  const size = getDisplayViewportSize(window.innerWidth, window.innerHeight, window.visualViewport);
  return size.height > size.width;
}

let gameBooting = false;
let gameStarted = false;
let fullscreenFallbackAccepted = false;
let lastFullscreenActive = false;
let runtimeDisplayRefresh: (() => void) | null = null;

function isFullscreenActive(): boolean {
  const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
  return Boolean(
    document.fullscreenElement ||
    standaloneNavigator.standalone ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    window.matchMedia?.("(display-mode: standalone)").matches
  );
}

function getBootEnvironment(): BootEnvironment {
  return {
    portrait: isPortrait(),
    fullscreenSupported: typeof getFullscreenRequest() === "function",
    fullscreenActive: isFullscreenActive(),
    fullscreenFallbackAccepted,
    gameplayStarted: gameStarted
  };
}

function getFullscreenRequest(): (() => Promise<void>) | undefined {
  return (document.documentElement as HTMLElement & { requestFullscreen?: () => Promise<void> }).requestFullscreen;
}

function syncBootUi(): void {
  const view = deriveBootView(getBootEnvironment());
  gate.hidden = view.gate === null;
  titleScreen.hidden = !view.titleVisible;
  titlePlayButton.disabled = gameBooting || !view.titleInteractive;
  titleScreen.setAttribute("aria-hidden", String(!view.titleVisible));

  if (view.gate === "portrait") {
    gateTitle.textContent = "Please turn phone sideways";
    gateCopy.textContent = "Landscape orientation is required.";
    gateButton.hidden = true;
  } else if (view.gate === "fullscreen") {
    gateTitle.textContent = gameStarted ? "Return to fullscreen" : "Enter fullscreen";
    gateCopy.textContent = "Fullscreen landscape is required to continue.";
    gateButton.textContent = gameStarted ? "Return to Fullscreen" : "Enter Fullscreen";
    gateButton.hidden = false;
  }
}

async function enterFullscreenFromGate(): Promise<void> {
  if (isPortrait()) {
    syncBootUi();
    return;
  }

  const requestFullscreen = getFullscreenRequest();
  if (!isFullscreenActive() && requestFullscreen) {
    try {
      await requestFullscreen.call(document.documentElement);
    } catch {
      fullscreenFallbackAccepted = true;
    }
  }
  const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: "landscape") => Promise<void> };
  if (orientation.lock) {
    try {
      await orientation.lock("landscape");
    } catch {
      // Some desktop and installed-display modes do not expose orientation locking.
    }
  }

  if (requestFullscreen && !isFullscreenActive()) fullscreenFallbackAccepted = true;
  scheduleDisplayRefresh();
}

function refreshDisplayEnvironment(): void {
  const fullscreenActive = isFullscreenActive();
  if (fullscreenActive) fullscreenFallbackAccepted = false;
  if (lastFullscreenActive && !fullscreenActive) fullscreenFallbackAccepted = false;
  lastFullscreenActive = fullscreenActive;
  syncBootUi();
  runtimeDisplayRefresh?.();
}

function scheduleDisplayRefresh(): void {
  refreshDisplayEnvironment();
  window.requestAnimationFrame(refreshDisplayEnvironment);
  window.setTimeout(refreshDisplayEnvironment, 120);
}

window.addEventListener("resize", scheduleDisplayRefresh);
window.addEventListener("orientationchange", scheduleDisplayRefresh);
document.addEventListener("fullscreenchange", scheduleDisplayRefresh);
window.visualViewport?.addEventListener("resize", scheduleDisplayRefresh);
gateButton.addEventListener("click", () => void enterFullscreenFromGate());
syncBootUi();

async function start(): Promise<void> {
  let viewport = resizeViewport();
  const [maps, characters, actorAssets] = await Promise.all([
    loadFoundationMaps(),
    loadCharacterAssets(),
    loadWorldActorAssets()
  ]);
  const restoredSave = readAutosave();
  let quest = restoredSave?.quest ?? createDemoQuestState();
  let activeMap = requireMap(maps, restoredSave?.mapId ?? "home");
  let phase: VisualPhase = restoredSave?.phase ?? quest.phase;
  quest = { ...quest, phase };
  let activeVisual = await loadMapVisual(activeMap, phase);
  const initialSpawn = getSpawn(activeMap);
  const initialSpawnResolution = resolveSafeSpawn(activeMap, initialSpawn, PLAYER.collider);
  const restoredPlayerPosition = restoredSave
    ? findSafePlacement(activeMap, restoredSave.player.position, PLAYER.collider) ?? initialSpawnResolution.position
    : initialSpawnResolution.position;
  let player = createPlayer(
    restoredPlayerPosition,
    restoredSave?.player.facing ?? facingFromAuthored(initialSpawn.facing)
  );
  const homeCompanionAnchor = activeMap.semantic.npc_spawn_markers.find((anchor) => anchor.id === "npc_anchor_home_companion");
  const restoredCompanionPosition = restoredSave
    ? findSafePlacement(activeMap, restoredSave.companion.position, BRUTUS.collider)
    : null;
  const companion = createCompanion(
    restoredCompanionPosition ?? homeCompanionAnchor?.pixel_point ?? { x: player.position.x - 48, y: player.position.y + 36 },
    restoredSave?.companion.facing ?? "down"
  );
  if (restoredSave && restoredCompanionPosition) {
    restoreCompanionCommandState(companion, restoredSave.companion);
    companion.pathHistory = [{ ...companion.position }, { ...player.position }];
  } else {
    resetCompanionForMap(companion, activeMap, player.position, homeCompanionAnchor?.pixel_point);
  }
  let inventory: InventoryEntry[] = restoredSave?.inventory ?? rebuildInventoryFromQuest(quest);
  let equipment: EquipmentState = restoredSave?.equipment ?? createEquipmentFromQuest(quest);
  let playerStatus: PlayerStatusState = restoredSave?.status ?? createDefaultStatus();
  const renderer = new FoundationRenderer(canvasContext, characters);
  const input = createInputController(canvas, () => viewport);

  const overworld = requireMap(maps, "overworld");
  const charlesMap = requireMap(maps, "charles_jr");
  const apartmentAnchor = requireNpcAnchor(overworld, "npc_anchor_apartment_courtyard");
  const charlesAnchor = requireNpcAnchor(overworld, "npc_anchor_charles_property");
  const cashierAnchor = requireNpcAnchor(charlesMap, "npc_anchor_cashier_left");
  const homelessPosition = findSafePlacement(
    overworld,
    midpoint(transitionCenter(overworld, "transition_overworld_to_home"), transitionCenter(overworld, "transition_overworld_to_charles_jr")),
    PLAYER.collider,
    true
  ) ?? apartmentAnchor;
  const guidePosition = findSafePlacement(overworld, apartmentAnchor, PLAYER.collider, true) ?? apartmentAnchor;
  const birdHideoutPosition = findSafePlacement(overworld, { x: charlesAnchor.x, y: charlesAnchor.y + 128 }, PLAYER.collider, true) ?? charlesAnchor;
  const bushInteractionPosition = findSafePlacement(
    overworld,
    { x: (BUSH_TILE.x + 0.5) * 32, y: (BUSH_TILE.y + 2.5) * 32 },
    PLAYER.collider,
    true
  ) ?? { x: (BUSH_TILE.x + 0.5) * 32, y: (BUSH_TILE.y + 2.5) * 32 };
  const gangCenter = findSafePlacement(overworld, BIRD_GANG_DESIGN_POINT, PLAYER.collider, true) ?? BIRD_GANG_DESIGN_POINT;
  const ambientNpcPositions = buildAmbientNpcPositions(overworld, apartmentAnchor, charlesAnchor);

  let primaryBirdPosition: WorldPoint | null = quest.stage === "investigate_bird" ? birdHideoutPosition : null;
  let ambushOrigin: WorldPoint | null = quest.stage === "ambush_pending" ? { ...player.position } : null;
  let ambushRunning = false;
  let actorTime = 0;
  let debugEnabled = false;
  let busy = false;
  let storyBusy = false;
  // start() runs only after the landscape/fullscreen gate and Play are complete.
  let portraitPaused = deriveBootView(getBootEnvironment()).gameplayPaused;
  let lastTime = performance.now();
  let lastCamera: WorldPoint = { x: 0, y: 0 };
  let messageTime = 0;
  let dayWarningSeen = restoredSave?.flags.dayWarningSeen ?? false;
  let menuOpen = false;
  let actionMenuOpen = false;
  let companionMenuOpen = false;
  let activeWorldBubble: ActiveWorldBubble | null = null;
  let menuPage: MenuPage = "status";
  let questTrackerMinimized = false;
  let autosaveElapsed = 0;
  let lastAutosaveAt = restoredSave?.savedAt ?? null;
  let battleState: TurnBasedBattleState | null = null;
  let battleMenuMode: "commands" | "targets" | "items" = "commands";
  let battleResolving = false;

  runtimeDisplayRefresh = () => {
    viewport = resizeViewport();
    portraitPaused = deriveBootView(getBootEnvironment()).gameplayPaused;
    lastTime = performance.now();
  };
  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.code === "F3") {
      setDebug(!debugEnabled);
    } else if (event.code === "KeyN" && debugEnabled) {
      void switchPhaseDebug();
    } else if (event.code === "KeyP") {
      void startInteraction("petting");
    } else if (event.code === "KeyF") {
      void startInteraction("feeding");
    } else if (event.code === "KeyC") {
      void startInteraction("companion_command");
    } else if (event.code === "Escape" && menuOpen) {
      closeMenu();
    } else if (event.code === "Escape" && actionMenuOpen) {
      closeActionMenu();
    } else if (event.code === "KeyE" && !menuOpen && !storyBusy && !busy && !battleState) {
      const markerTarget = getQuestTargetPosition();
      if (canActivateObjectiveMarker(player.position, markerTarget, INTERACTION_RADIUS)) {
        closeActionMenu();
        void handleQuestInteraction();
      } else if (actionMenuOpen) {
        closeActionMenu();
      } else {
        openWorldActionMenu();
      }
    }
  });

  debugToggle.addEventListener("click", () => setDebug(!debugEnabled));
  phaseButton.addEventListener("click", () => void switchPhaseDebug());
  petButton.addEventListener("click", () => void startInteraction("petting"));
  feedButton.addEventListener("click", () => void startInteraction("feeding"));
  commandButton.addEventListener("click", () => void startInteraction("companion_command"));
  menuButton.addEventListener("click", () => {
    closeActionMenu();
    openMenu("status");
  });
  worldActionToggle.addEventListener("click", () => {
    if (busy || storyBusy || menuOpen) return;
    if (actionMenuOpen) {
      closeActionMenu();
      return;
    }
    openWorldActionMenu();
  });
  worldActionMenu.addEventListener("click", (event) => {
    const backButton = (event.target as Element).closest<HTMLButtonElement>("button[data-companion-back]");
    if (backButton) {
      openWorldActionMenu();
      return;
    }
    const openCompanionButton = (event.target as Element).closest<HTMLButtonElement>("button[data-open-companion]");
    if (openCompanionButton && !openCompanionButton.disabled) {
      openCompanionActionMenu();
      return;
    }
    const companionButton = (event.target as Element).closest<HTMLButtonElement>("button[data-companion-action]");
    const companionAction = companionButton?.dataset.companionAction as CompanionActionName | undefined;
    if (companionButton && companionAction && !companionButton.disabled) {
      void runCompanionAction(companionAction);
      return;
    }
    const button = (event.target as Element).closest<HTMLButtonElement>("button[data-world-action]");
    const kind = button?.dataset.worldAction as WorldActionKind | undefined;
    if (!button || !kind || button.disabled) return;
    void runWorldAction(kind);
  });
  objectiveMarker.addEventListener("click", () => void activateObjectiveMarker());
  menuClose.addEventListener("click", closeMenu);
  questTrackerOpen.addEventListener("click", () => openMenu("quest"));
  questTrackerMinimize.addEventListener("click", () => {
    questTrackerMinimized = !questTrackerMinimized;
    questTracker.classList.toggle("is-minimized", questTrackerMinimized);
    questTrackerMinimize.textContent = questTrackerMinimized ? "➕" : "➖";
    questTrackerMinimize.setAttribute("aria-label", questTrackerMinimized ? "Expand quest tracker" : "Minimize quest tracker");
  });
  menuTabs.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>("button[data-menu-page]");
    const nextPage = button?.dataset.menuPage as MenuPage | undefined;
    if (!nextPage) return;
    menuPage = nextPage;
    renderMenu();
  });
  backupLoadInput.addEventListener("change", () => void importBackupFromInput());
  window.addEventListener("beforeunload", () => persistAutosave());
  for (const eventName of ["pointerdown", "pointerup", "pointercancel", "pointerleave"] as const) {
    runButton.addEventListener(eventName, (event) => {
      input.setTouchRun(eventName === "pointerdown");
      runButton.setAttribute("aria-pressed", String(eventName === "pointerdown"));
      event.preventDefault();
    });
  }
  battleAttackButton.addEventListener("click", () => {
    if (!battleState || battleState.phase !== "player_turn" || battleResolving) return;
    battleMenuMode = "targets";
    renderBattle();
  });
  battleDefendButton.addEventListener("click", () => {
    if (!battleState || battleState.phase !== "player_turn" || battleResolving) return;
    battleState = defendInBattle(battleState).state;
    battleMenuMode = "commands";
    renderBattle();
    void runEnemyBattleTurn();
  });
  battleItemButton.addEventListener("click", () => {
    if (!battleState || battleState.phase !== "player_turn" || battleResolving) return;
    battleMenuMode = "items";
    renderBattle();
  });
  battleSubmenu.addEventListener("click", (event) => {
    const targetButton = (event.target as Element).closest<HTMLButtonElement>("button[data-battle-target]");
    if (targetButton?.dataset.battleTarget) {
      void performBattleAttack(targetButton.dataset.battleTarget);
      return;
    }
    const itemButton = (event.target as Element).closest<HTMLButtonElement>("button[data-battle-item]");
    if (itemButton?.dataset.battleItem === "fries") {
      void performBattleItem();
      return;
    }
    const systemButton = (event.target as Element).closest<HTMLButtonElement>("button[data-battle-system]");
    if (systemButton?.dataset.battleSystem === "back") {
      battleMenuMode = "commands";
      renderBattle();
    } else if (systemButton?.dataset.battleSystem === "continue") {
      void finishBattleVictory();
    } else if (systemButton?.dataset.battleSystem === "retry") {
      restartBirdGangBattle();
    }
  });

  runtimeDisplayRefresh();
  updateHud();
  status.textContent = "";
  persistAutosave();

  function createPersistentSnapshot(): PersistentGameState {
    const savedAt = new Date().toISOString();
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt,
      quest,
      mapId: activeMap.id,
      phase,
      player: {
        position: { ...player.position },
        facing: player.facing
      },
      companion: {
        position: { ...companion.position },
        facing: companion.facing,
        mode: companion.mode,
        commandPose: companion.commandPose
      },
      inventory: inventory.map((entry) => ({ ...entry })),
      equipment: { ...equipment },
      status: { ...playerStatus },
      flags: { dayWarningSeen }
    };
  }

  function persistAutosave(): void {
    try {
      const snapshot = createPersistentSnapshot();
      writeAutosave(snapshot);
      lastAutosaveAt = snapshot.savedAt;
    } catch (error) {
      console.warn("Unable to write Lulu's Tale autosave.", error);
    }
  }

  function openMenu(page: MenuPage): void {
    if (storyBusy || busy || battleState) return;
    menuPage = page;
    menuOpen = true;
    menuPanel.hidden = false;
    renderMenu();
    updateControls();
  }

  function closeMenu(): void {
    menuOpen = false;
    menuPanel.hidden = true;
    updateControls();
  }

  function renderMenu(): void {
    for (const button of menuTabs.querySelectorAll<HTMLButtonElement>("button[data-menu-page]")) {
      button.classList.toggle("is-active", button.dataset.menuPage === menuPage);
    }

    if (menuPage === "status") {
      const effective = getEffectiveStatus(playerStatus, equipment);
      menuContent.innerHTML = `
        <h3 class="menu-section-title">Player Status</h3>
        <div class="menu-grid">
          ${menuStatCard("Level", String(playerStatus.level))}
          ${menuStatCard("Experience", String(playerStatus.experience))}
          ${menuStatCard("HP", `${playerStatus.hp} / ${playerStatus.maxHp}`)}
          ${menuStatCard("MP", `${playerStatus.mp} / ${playerStatus.maxMp}`)}
          ${menuStatCard("Attack", String(effective.attack))}
          ${menuStatCard("Defense", String(effective.defense))}
          ${menuStatCard("Speed", String(effective.speed))}
          ${menuStatCard("Day / Phase", `Day ${quest.day} • ${phase === "day" ? "Day" : "Night"}`)}
        </div>`;
      return;
    }

    if (menuPage === "inventory") {
      const rows = inventory.length
        ? inventory
            .map((entry) => {
              const item = ITEM_DEFINITIONS[entry.itemId];
              const name = item?.name ?? entry.itemId;
              const description = item?.description ?? "";
              return `<div class="inventory-row"><div class="inventory-copy"><div class="inventory-name">${name}</div><div class="inventory-description">${description}</div></div><div class="inventory-quantity">×${entry.quantity}</div></div>`;
            })
            .join("")
        : '<div class="menu-card menu-muted">Lulu is not carrying anything yet.</div>';
      menuContent.innerHTML = `<h3 class="menu-section-title">Inventory</h3><div class="inventory-list">${rows}</div>`;
      return;
    }

    if (menuPage === "equipment") {
      const slots: EquipmentSlot[] = ["weapon", "body", "accessory"];
      const slotRows = slots
        .map((slot) => {
          const equippedId = equipment[slot];
          const equipped = equippedId ? ITEM_DEFINITIONS[equippedId] : null;
          return `<div class="equipment-row"><div class="equipment-copy"><div class="menu-label">${capitalize(slot)}</div><div class="equipment-name">${equipped?.name ?? "Nothing equipped"}</div><div class="equipment-description">${equipped?.description ?? "This slot is empty."}</div></div>${equippedId ? `<button class="equipment-action" type="button" data-unequip-slot="${slot}">Unequip</button>` : ""}</div>`;
        })
        .join("");
      const equippableRows = inventory
        .filter((entry) => ITEM_DEFINITIONS[entry.itemId]?.equippableSlot)
        .map((entry) => {
          const item = ITEM_DEFINITIONS[entry.itemId];
          const equipped = item.equippableSlot ? equipment[item.equippableSlot] === item.id : false;
          return `<div class="equipment-row"><div class="equipment-copy"><div class="equipment-name">${item.name}</div><div class="equipment-description">${item.description}</div></div><button class="equipment-action" type="button" data-equip-item="${item.id}" ${equipped ? "disabled" : ""}>${equipped ? "Equipped" : "Equip"}</button></div>`;
        })
        .join("");
      menuContent.innerHTML = `<h3 class="menu-section-title">Equipment</h3><div class="equipment-list">${slotRows}</div><h3 class="menu-section-title" style="margin-top:16px">Available Equipment</h3><div class="equipment-list">${equippableRows || '<div class="menu-card menu-muted">No equippable items in inventory.</div>'}</div>`;
      menuContent.querySelectorAll<HTMLButtonElement>("button[data-equip-item]").forEach((button) => {
        button.addEventListener("click", () => {
          const itemId = button.dataset.equipItem;
          if (!itemId) return;
          equipment = equipItem(inventory, equipment, itemId);
          persistAutosave();
          renderMenu();
        });
      });
      menuContent.querySelectorAll<HTMLButtonElement>("button[data-unequip-slot]").forEach((button) => {
        button.addEventListener("click", () => {
          const slot = button.dataset.unequipSlot as EquipmentSlot | undefined;
          if (!slot) return;
          equipment = unequipSlot(equipment, slot);
          persistAutosave();
          renderMenu();
        });
      });
      return;
    }

    if (menuPage === "quest") {
      const title = getActiveQuestTitle(quest);
      const detail = title === "Birds After Dark"
        ? "Follow the neighborhood's increasingly strange nighttime bird problem to its source."
        : title === "Day 1 Complete"
          ? "The first day's neighborhood incident is complete. The birds will remember this."
          : "Get breakfast sorted, make the trip to Charles Jr., and deal with the neighborhood's increasingly organized birds.";
      menuContent.innerHTML = `
        <h3 class="menu-section-title">Quest Log</h3>
        <div class="quest-detail-card">
          <h3>${title}</h3>
          <div class="menu-muted">${detail}</div>
          <div class="quest-objective-label">Current Objective</div>
          <div class="quest-objective-text">${getDemoObjective(quest, activeMap.id)}</div>
          <div class="quest-objective-label">Progress</div>
          <div class="menu-muted">Day ${quest.day} • ${phase === "day" ? "Day Mode" : "Night Mode"}</div>
        </div>`;
      return;
    }

    if (menuPage === "map") {
      const marker = getOverworldMapMarker();
      const mapImage = phase === "night" ? "/assets/maps/native/overworld/night_base.png" : "/assets/maps/native/overworld/day_base.png";
      menuContent.innerHTML = `
        <h3 class="menu-section-title">Overworld Map</h3>
        <div class="world-map-frame">
          <img src="${mapImage}" alt="Lulu's Tale Overworld map" />
          <span class="world-map-marker" style="left:${marker.xPercent}%;top:${marker.yPercent}%" aria-label="Current location"></span>
        </div>
        <div class="map-location-line">Current location: ${currentLocationLabel()}</div>`;
      return;
    }

    const autosaveLabel = lastAutosaveAt ? new Date(lastAutosaveAt).toLocaleString() : "Not yet saved";
    menuContent.innerHTML = `
      <h3 class="menu-section-title">Save / Load</h3>
      <div class="save-card">
        <strong>Automatic browser/PWA save</strong>
        <div class="menu-muted" style="margin-top:5px">Game progress is saved automatically in browser storage during play.</div>
        <div class="menu-muted" style="margin-top:5px">Last autosave: ${autosaveLabel}</div>
      </div>
      <div class="save-card" style="margin-top:10px">
        <strong>Backup save file</strong>
        <div class="menu-muted" style="margin-top:5px">Export a portable backup file to the device, or restore one if browser/PWA storage is cleared.</div>
        <div class="save-actions">
          <button id="backup-save-button" type="button">Export Backup Save</button>
          <button id="backup-load-button" type="button">Load Backup Save</button>
        </div>
      </div>`;
    requireElementFrom<HTMLButtonElement>(menuContent, "#backup-save-button").addEventListener("click", () => {
      persistAutosave();
      exportBackupSave(createPersistentSnapshot());
      setMessage("Backup save exported.");
      renderMenu();
    });
    requireElementFrom<HTMLButtonElement>(menuContent, "#backup-load-button").addEventListener("click", () => backupLoadInput.click());
  }

  async function importBackupFromInput(): Promise<void> {
    const file = backupLoadInput.files?.[0];
    backupLoadInput.value = "";
    if (!file) return;
    try {
      const imported = await readBackupSaveFile(file);
      const confirmed = window.confirm("Load this backup save? Current automatic save progress will be replaced.");
      if (!confirmed) return;
      writeAutosave({ ...imported, savedAt: new Date().toISOString() });
      window.location.reload();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      window.alert(`Unable to load backup save: ${reason}`);
    }
  }

  function currentLocationLabel(): string {
    if (activeMap.id === "home") return "Home";
    if (activeMap.id === "charles_jr") return "Charles Jr.";
    return "Overworld";
  }

  function getOverworldMapMarker(): { xPercent: number; yPercent: number } {
    let point: WorldPoint;
    if (activeMap.id === "overworld") {
      point = player.position;
    } else if (activeMap.id === "home") {
      point = transitionCenter(overworld, "transition_overworld_to_home");
    } else {
      point = transitionCenter(overworld, "transition_overworld_to_charles_jr");
    }
    return {
      xPercent: Math.max(0, Math.min(100, (point.x / overworld.width) * 100)),
      yPercent: Math.max(0, Math.min(100, (point.y / overworld.height) * 100))
    };
  }

  function menuStatCard(label: string, value: string): string {
    return `<div class="menu-card"><div class="menu-label">${label}</div><div class="menu-value">${value}</div></div>`;
  }

  function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function setDebug(enabled: boolean): void {
    debugEnabled = enabled;
    debugToggle.setAttribute("aria-pressed", String(enabled));
    phaseButton.hidden = !enabled;
  }

  function setMessage(text: string, seconds = 2.4): void {
    message.textContent = text;
    messageTime = seconds;
  }

  function closeActionMenu(): void {
    actionMenuOpen = false;
    companionMenuOpen = false;
    worldActionMenu.hidden = true;
    companionActionMenu.hidden = true;
    worldActionToggle.setAttribute("aria-expanded", "false");
  }

  function openWorldActionMenu(): void {
    actionMenuOpen = true;
    companionMenuOpen = false;
    worldActionMenu.hidden = false;
    companionActionMenu.hidden = true;
    worldActionToggle.setAttribute("aria-expanded", "true");
    updateWorldActionMenu();
  }

  function openCompanionActionMenu(): void {
    actionMenuOpen = true;
    companionMenuOpen = true;
    worldActionMenu.hidden = false;
    companionActionMenu.hidden = false;
    worldActionToggle.setAttribute("aria-expanded", "true");
    updateWorldActionMenu();
  }

  function getQuestActionTarget(): WorldActionTarget | null {
    const target = getQuestTargetPosition();
    if (!target) return null;
    switch (quest.stage) {
      case "check_fridge":
        return { id: "quest-fridge", label: "Fridge", kind: "use", position: target, priority: 100 };
      case "feed_brutus":
        return null;
      case "order_fries":
        return { id: "cashier", label: "Charles Jr. Employee", kind: "chat", position: target, priority: 100 };
      case "investigate_bird":
        return null;
      case "choose_day_end":
      case "night_quest_pending":
      case "sleep_after_night":
        return { id: "quest-bed", label: "Bed", kind: "use", position: target, priority: 100 };
      case "meet_night_guide":
        return { id: "night-guide", label: "Mysterious Guide", kind: "chat", position: target, priority: 100 };
      case "find_bush_sword":
        return { id: "quest-bush-sword", label: "Bush Sword", kind: "pickup", position: target, priority: 100 };
      case "confront_bird_gang":
        return null;
      default:
        return null;
    }
  }

  function getWorldActionTargets(): WorldActionTarget[] {
    const targets: WorldActionTarget[] = [];
    const questTarget = getQuestActionTarget();
    if (questTarget) targets.push(questTarget);
    if (activeMap.id === "home") {
      const fridge = interactionCenter(activeMap, "interaction_refrigerator");
      const bed = interactionCenter(activeMap, "interaction_bed");
      if (fridge) targets.push({ id: "fridge", label: "Fridge", kind: "use", position: fridge, priority: 5 });
      if (bed) targets.push({ id: "bed", label: "Bed", kind: "use", position: bed, priority: 5 });
    }
    if (activeMap.id === "charles_jr" && phase === "day") {
      targets.push({ id: "cashier", label: "Charles Jr. Employee", kind: "chat", position: cashierAnchor, priority: 20 });
    }
    if (activeMap.id === "overworld" && phase === "day") {
      targets.push({ id: "homeless-day", label: "Neighborhood Regular", kind: "chat", position: homelessPosition, priority: 20 });
      ambientNpcPositions.forEach((position, index) => {
        targets.push({ id: `pedestrian-${index + 1}`, label: "Neighbor", kind: "chat", position, priority: 5 });
      });
    }
    if (activeMap.id === "overworld" && phase === "night" && ["meet_night_guide", "find_bush_sword", "confront_bird_gang", "return_home_night"].includes(quest.stage)) {
      targets.push({ id: "night-guide", label: "Mysterious Guide", kind: "chat", position: guidePosition, priority: 20 });
    }
    return targets;
  }

  function updateWorldActionMenu(): void {
    const actions = getAvailableWorldActions(player.position, getWorldActionTargets(), INTERACTION_RADIUS + 18);
    for (const button of worldActionButtons) {
      const kind = button.dataset.worldAction as WorldActionKind;
      const target = actions[kind];
      button.hidden = companionMenuOpen || !target;
      button.dataset.available = String(Boolean(target));
      button.textContent = target ? `${WORLD_ACTION_LABELS[kind]} · ${target.label}` : WORLD_ACTION_LABELS[kind];
      button.title = describeWorldAction(target, kind);
      button.disabled = busy || storyBusy || menuOpen || !target;
    }
    updateCompanionActionMenu();
    const brutusAvailable = phase === "day" && distance(player.position, companion.position) <= INTERACTION_RADIUS + 18;
    brutusActionEntry.hidden = companionMenuOpen || !brutusAvailable;
    brutusActionEntry.disabled = busy || storyBusy || menuOpen || !brutusAvailable;
    companionActionMenu.hidden = !companionMenuOpen;
  }

  function updateCompanionActionMenu(): void {
    const nearby = phase === "day" && distance(player.position, companion.position) <= INTERACTION_RADIUS + 18;
    for (const button of companionActionButtons) {
      const action = button.dataset.companionAction as CompanionActionName;
      const alreadyFollowing = action === "follow" && companion.mode === "follow";
      const alreadySitting = action === "sit" && companion.mode === "stay" && companion.commandPose !== "lay";
      const alreadyLying = action === "lay" && companion.mode === "stay" && companion.commandPose === "lay";
      button.disabled = busy || storyBusy || menuOpen || !nearby || alreadyFollowing || alreadySitting || alreadyLying || Boolean(companion.fetch);
    }
  }

  async function runWorldAction(kind: WorldActionKind): Promise<void> {
    if (!canUseInput()) return;
    const actions = getAvailableWorldActions(player.position, getWorldActionTargets(), INTERACTION_RADIUS + 18);
    const target = actions[kind];
    if (!target) {
      setMessage(`${WORLD_ACTION_LABELS[kind]} unavailable.`);
      return;
    }
    closeActionMenu();

    if (target.priority === 100) {
      if (kind === "chat") {
        const dialogue = getNpcDialogue(target.id);
        if (dialogue) {
          showWorldBubble(target.position, dialogue.bubble, 2.2);
          await wait(420);
        }
      }
      await handleQuestInteraction();
      return;
    }

    if (kind === "chat") {
      await chatWithNpc(target);
      return;
    }
    if (kind === "use" && target.id === "fridge") {
      await showDialogue([{ speaker: "Lulu", text: "Still a fridge. Still mostly condiments." }]);
      return;
    }
    if (kind === "use" && target.id === "bed") {
      await showDialogue([{ speaker: "Lulu", text: "Not yet." }]);
      return;
    }
    setMessage(`${WORLD_ACTION_LABELS[kind]}: ${target.label}`);
  }

  async function activateObjectiveMarker(): Promise<void> {
    if (!canUseInput()) return;
    const target = getQuestTargetPosition();
    if (!canActivateObjectiveMarker(player.position, target, INTERACTION_RADIUS)) {
      setMessage("Move closer to interact.");
      return;
    }
    closeActionMenu();
    await handleQuestInteraction();
  }

  function updateObjectiveMarker(): void {
    const target = getQuestTargetPosition();
    if (!target) {
      objectiveMarker.hidden = true;
      return;
    }
    const logicalX = target.x - lastCamera.x;
    const logicalY = target.y - lastCamera.y - 32;
    if (logicalX < 0 || logicalY < 0 || logicalX > viewport.width || logicalY > viewport.height) {
      objectiveMarker.hidden = true;
      return;
    }
    const canvasRect = canvas.getBoundingClientRect();
    objectiveMarker.hidden = false;
    objectiveMarker.style.left = `${canvasRect.left + (logicalX / viewport.width) * canvasRect.width}px`;
    objectiveMarker.style.top = `${canvasRect.top + (logicalY / viewport.height) * canvasRect.height}px`;
    objectiveMarker.disabled = !canActivateObjectiveMarker(player.position, target, INTERACTION_RADIUS) || !canUseInput();
  }

  async function runCompanionAction(action: CompanionActionName): Promise<void> {
    if (!canUseInput() || phase === "night") return;
    closeActionMenu();
    if (action === "pet") {
      await startInteraction("petting");
      return;
    }
    if (action === "feed") {
      await startInteraction("feeding");
      return;
    }
    if (action === "fetch") {
      const result = beginFetch(companion, player, activeMap, characters.interactions);
      if (!result.ok) {
        setMessage(result.reason);
        return;
      }
      setMessage("Fetch!", 1.1);
      updateHud();
      return;
    }
    const command = action === "follow" ? "follow" : action === "lay" ? "lay" : "sit";
    const result = beginCompanionCommand(command, companion, player, activeMap, characters.interactions);
    if (!result.ok) {
      setMessage(result.reason);
      return;
    }
    setMessage(action === "follow" ? "Brutus, follow." : action === "lay" ? "Brutus, lie down." : "Brutus, sit.", 1.1);
    updateHud();
    persistAutosave();
  }

  async function chatWithNpc(target: WorldActionTarget): Promise<void> {
    const dialogue = getNpcDialogue(target.id);
    if (!dialogue) {
      setMessage("They don't have anything to say right now.");
      return;
    }
    showWorldBubble(target.position, dialogue.bubble, 2.2);
    await wait(420);
    await showDialogue(dialogue.lines);
  }

  function showWorldBubble(position: WorldPoint, text: string, seconds = 2.6): void {
    activeWorldBubble = { position: { ...position }, text, expiresAt: performance.now() + seconds * 1000 };
    worldChatBubble.textContent = text;
    worldChatBubble.hidden = false;
    updateWorldBubble(performance.now());
  }

  function updateWorldBubble(now: number): void {
    if (!activeWorldBubble || now >= activeWorldBubble.expiresAt) {
      activeWorldBubble = null;
      worldChatBubble.hidden = true;
      return;
    }
    const canvasRect = canvas.getBoundingClientRect();
    const logicalX = activeWorldBubble.position.x - lastCamera.x;
    const logicalY = activeWorldBubble.position.y - lastCamera.y - 66;
    if (logicalX < -20 || logicalY < -30 || logicalX > viewport.width + 20 || logicalY > viewport.height + 20) {
      worldChatBubble.hidden = true;
      return;
    }
    worldChatBubble.hidden = false;
    worldChatBubble.style.left = `${canvasRect.left + (logicalX / viewport.width) * canvasRect.width}px`;
    worldChatBubble.style.top = `${canvasRect.top + (logicalY / viewport.height) * canvasRect.height}px`;
  }

  function wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  async function startInteraction(name: CompanionInteractionName): Promise<void> {
    if (!canUseInput()) return;
    if (phase === "night") {
      setMessage("Brutus is inside for the night.");
      return;
    }
    const result = beginCompanionInteraction(name, companion, player, activeMap, characters.interactions);
    if (!result.ok) {
      setMessage(result.reason);
      return;
    }
    if (name === "feeding" && quest.stage === "feed_brutus") {
      quest = feedBrutusForQuest(quest);
      inventory = removeInventoryItem(inventory, "dog_food");
      await showDialogue([
        { speaker: "Lulu", text: "One of us is having breakfast." },
        { speaker: "Brutus", text: "[the sound of a bowl becoming somebody else's problem]" },
        { speaker: "Lulu", text: "Great. Now I want fries." }
      ]);
    } else {
      setMessage(name === "petting" ? "Petting Brutus" : name === "feeding" ? "Feeding Brutus" : "Companion command", 1.1);
    }
    updateHud();
    persistAutosave();
  }

  async function handleQuestInteraction(): Promise<void> {
    if (storyBusy || busy) return;
    switch (quest.stage) {
      case "check_fridge":
        quest = takeDogFood(quest);
        inventory = pickupItem(inventory, "dog_food").inventory;
        await showDialogue([
          { speaker: "Lulu", text: "Dog food, mustard, and an ice cube with seniority." },
          { speaker: "Lulu", text: "Breakfast has made its position clear." },
          { speaker: "System", text: "Dog Food obtained." }
        ]);
        break;
      case "feed_brutus":
        await startInteraction("feeding");
        break;
      case "go_to_charles": {
        const transitionId = activeMap.id === "home" ? "transition_home_to_overworld" : "transition_overworld_to_charles_jr";
        const transition = activeMap.semantic.transitions.find((candidate) => candidate.id === transitionId);
        if (transition) await enterMap(transition);
        break;
      }
      case "order_fries":
        await showDialogue([
          { speaker: "Cashier", text: "Welcome to Charles Jr. What can I get started for you?" },
          { speaker: "Lulu", text: "Fries." },
          { speaker: "Cashier", text: "What size?" },
          { speaker: "Lulu", text: "A size that makes the walk here feel like planning." },
          { speaker: "System", text: "Hot, salty, and currently undefended. Fries obtained." }
        ]);
        quest = orderFries(quest);
        inventory = pickupItem(inventory, "fries").inventory;
        break;
      case "head_home_with_fries": {
        const transition = activeMap.semantic.transitions.find((candidate) => candidate.id === "transition_charles_jr_to_overworld");
        if (transition) await enterMap(transition);
        break;
      }
      case "investigate_bird":
        await showBirdInvestigation();
        quest = resolveBirdInvestigation(quest);
        inventory = pickupItem(inventory, "glossy_feather").inventory;
        primaryBirdPosition = null;
        break;
      case "return_home_day":
      case "return_home_night": {
        const transition = activeMap.semantic.transitions.find((candidate) => candidate.id === "transition_overworld_to_home");
        if (transition) await enterMap(transition);
        break;
      }
      case "choose_day_end":
      case "night_quest_pending":
        await handleBedChoice();
        break;
      case "leave_home_night": {
        const transition = activeMap.semantic.transitions.find((candidate) => candidate.id === "transition_home_to_overworld");
        if (transition) await enterMap(transition);
        break;
      }
      case "meet_night_guide":
        await showDialogue([
          { speaker: "Guide", text: "You brought paperwork." },
          { speaker: "Lulu", text: "It's a feather." },
          { speaker: "Guide", text: "That's what their paperwork looks like." },
          { speaker: "Guide", text: "You took food back from a bird on Division." },
          { speaker: "Lulu", text: "It took food from me." },
          { speaker: "Guide", text: "That distinction is why they sent three." },
          { speaker: "Guide", text: "They're gathering east of here. I wouldn't go empty-handed." }
        ]);
        quest = meetNightGuide(quest);
        break;
      case "find_bush_sword":
        await showDialogue([
          { speaker: "Lulu", text: "There is a sword in this bush." },
          { speaker: "Guide", text: "Yes." },
          { speaker: "Lulu", text: "Is it yours?" },
          { speaker: "Guide", text: "It is in the bush." },
          { speaker: "System", text: "Bush Sword equipped." }
        ]);
        quest = takeBushSword(quest);
        inventory = pickupItem(inventory, "bush_sword").inventory;
        equipment = equipItem(inventory, equipment, "bush_sword");
        break;
      case "confront_bird_gang":
        await startBirdGangBattle();
        break;
      case "sleep_after_night":
        await showDialogue([
          { speaker: "Lulu", text: "That was enough municipal bird politics for one night." },
          { speaker: "System", text: "Lulu finally gets some sleep." }
        ]);
        quest = sleepAfterNight(quest);
        await setPhase(quest.phase);
        await showDialogue([
          { speaker: "DAY 2", text: "THE BIRDS WILL REMEMBER THIS." },
          { speaker: "Lulu", text: "Is that a receipt?" },
          { speaker: "Brutus", text: "[looks away]" },
          { speaker: "System", text: "END OF DEMO" }
        ]);
        break;
      default:
        break;
    }
    updateHud();
    persistAutosave();
  }

  async function showBirdInvestigation(): Promise<void> {
    const outcomeLine =
      quest.friesOutcome === "mostly_saved"
        ? "You saved most of lunch. The bird still stole one fry on principle."
        : quest.friesOutcome === "partial"
          ? "The bag is torn, but a cold handful survived."
          : "The recovered bag has been dragged through a parking lot. It is no longer food.";
    await showDialogue([
      { speaker: "Lulu", text: "I walked all the way over here." },
      { speaker: "Bird", text: "..." },
      { speaker: "System", text: outcomeLine },
      { speaker: "System", text: "The bird drops a glossy black feather and retreats." }
    ]);
  }

  async function handleBedChoice(): Promise<void> {
    const choice = await showDialogue(
      [
        { speaker: "Lulu", text: quest.stage === "night_quest_pending" ? "The feather can wait... or not." : "The feather gives one quiet tap against the table." }
      ],
      [
        { id: "stay_up", label: "Stay Up Tonight" },
        { id: "sleep", label: "Sleep Until Tomorrow" },
        { id: "cancel", label: "Cancel" }
      ]
    );
    if (choice === "cancel" || !choice) return;
    quest = chooseDayEnd(quest, choice as BedChoice);
    await setPhase(quest.phase);
    if (choice === "sleep") {
      await showDialogue([
        { speaker: "System", text: `Day ${quest.day}. The night bird thread is still waiting whenever Lulu decides to stay up.` }
      ]);
    } else {
      await showDialogue([{ speaker: "System", text: "Night settles over the neighborhood." }]);
    }
  }

  async function startBirdGangBattle(): Promise<void> {
    await showDialogue([
      { speaker: "Lulu", text: "Are these the three?" },
      { speaker: "Guide", text: "Numerically, yes." },
      { speaker: "Lulu", text: "I want it noted that they started this." },
      { speaker: "Guide", text: "Noted by whom?" },
      { speaker: "Lulu", text: "Me." }
    ]);

    const effective = getEffectiveStatus(playerStatus, equipment);
    const friesCount = inventory.find((entry) => entry.itemId === "fries")?.quantity ?? 0;
    battleState = createBirdGangBattle(
      {
        name: "Lulu",
        hp: playerStatus.hp,
        maxHp: playerStatus.maxHp,
        attack: effective.attack,
        defense: effective.defense,
        speed: effective.speed
      },
      friesCount
    );
    battleMenuMode = "commands";
    battleResolving = false;
    battlePanel.hidden = false;
    renderBattle();
    updateControls();
    persistAutosave();
  }

  async function performBattleAttack(enemyId: string): Promise<void> {
    if (!battleState || battleState.phase !== "player_turn" || battleResolving) return;
    battleState = attackEnemy(battleState, enemyId).state;
    battleMenuMode = "commands";
    renderBattle();
    if (battleState.phase === "enemy_turn") await runEnemyBattleTurn();
  }

  async function performBattleItem(): Promise<void> {
    if (!battleState || battleState.phase !== "player_turn" || battleResolving) return;
    const result = useFries(battleState);
    if (result.state === battleState) {
      battleMenuMode = "commands";
      renderBattle();
      return;
    }
    battleState = result.state;
    battleMenuMode = "commands";
    renderBattle();
    if (battleState.phase === "enemy_turn") await runEnemyBattleTurn();
  }

  async function runEnemyBattleTurn(): Promise<void> {
    if (!battleState || battleState.phase !== "enemy_turn" || battleResolving) return;
    battleResolving = true;
    renderBattle();
    await wait(650);
    if (!battleState) return;
    battleState = resolveEnemyTurn(battleState);
    battleResolving = false;
    renderBattle();
  }

  function restartBirdGangBattle(): void {
    if (!battleState || battleState.phase !== "defeat") return;
    const effective = getEffectiveStatus(playerStatus, equipment);
    const friesCount = inventory.find((entry) => entry.itemId === "fries")?.quantity ?? 0;
    battleState = createBirdGangBattle(
      {
        name: "Lulu",
        hp: playerStatus.maxHp,
        maxHp: playerStatus.maxHp,
        attack: effective.attack,
        defense: effective.defense,
        speed: effective.speed
      },
      friesCount
    );
    battleMenuMode = "commands";
    battleResolving = false;
    renderBattle();
  }

  async function finishBattleVictory(): Promise<void> {
    if (!battleState || battleState.phase !== "victory" || battleResolving) return;
    battleResolving = true;
    const reward = getBattleExperienceReward(battleState);
    const friesBefore = inventory.find((entry) => entry.itemId === "fries")?.quantity ?? 0;
    const friesUsed = Math.max(0, friesBefore - battleState.inventory.fries);
    if (friesUsed > 0) inventory = removeInventoryItem(inventory, "fries", friesUsed);
    playerStatus = {
      ...playerStatus,
      hp: battleState.player.hp,
      experience: playerStatus.experience + reward
    };
    quest = winBirdGangBattle(quest);
    battleState = null;
    battlePanel.hidden = true;
    battleSubmenu.replaceChildren();
    battleResolving = false;
    updateHud();
    persistAutosave();
    await showDialogue([
      { speaker: "System", text: `Victory! Lulu earned ${reward} XP.` },
      { speaker: "System", text: "The birds retreat rather than die." },
      { speaker: "Guide", text: "That means the matter is settled." },
      { speaker: "Lulu", text: "Good." },
      { speaker: "Guide", text: "Locally." }
    ]);
  }

  function renderBattle(): void {
    if (!battleState) {
      battlePanel.hidden = true;
      return;
    }

    battlePanel.hidden = false;
    battleRound.textContent = battleState.phase === "victory" ? "Victory" : battleState.phase === "defeat" ? "Defeat" : `Round ${battleState.round}`;
    battlePlayerHp.textContent = `HP ${battleState.player.hp} / ${battleState.player.maxHp}`;
    battlePlayerHpFill.style.width = `${Math.max(0, (battleState.player.hp / battleState.player.maxHp) * 100)}%`;
    battlePlayerHpFill.style.background = battleState.player.hp <= battleState.player.maxHp * 0.3 ? "#e25a4f" : "#71d26d";

    battleEnemies.innerHTML = battleState.enemies
      .map((enemy) => {
        const hpPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
        return `<div class="battle-enemy-card${enemy.hp <= 0 ? " is-defeated" : ""}">
          <div class="battle-enemy-name">${enemy.name}</div>
          <div class="battle-sprite" style="background-image:url('${enemy.spritePath}');background-position:0 -192px"></div>
          <div class="battle-hp-label">HP ${enemy.hp} / ${enemy.maxHp}</div>
          <div class="battle-hp-track"><div class="battle-hp-fill" style="width:${hpPercent}%"></div></div>
        </div>`;
      })
      .join("");

    battleLog.innerHTML = battleState.log.map((line) => `<div>${line}</div>`).join("");
    battleLog.scrollTop = battleLog.scrollHeight;

    const playerTurn = battleState.phase === "player_turn" && !battleResolving;
    battleCommandPanel.hidden = !playerTurn || battleMenuMode !== "commands";
    battleAttackButton.disabled = !playerTurn || livingEnemies(battleState).length === 0;
    battleDefendButton.disabled = !playerTurn;
    battleItemButton.disabled = !playerTurn;
    battleItemButton.textContent = `Item (${battleState.inventory.fries})`;

    battleSubmenu.replaceChildren();
    battleSubmenu.hidden = false;

    if (battleState.phase === "victory") {
      battleSubmenu.innerHTML = '<button type="button" data-battle-system="continue">Continue</button>';
      return;
    }
    if (battleState.phase === "defeat") {
      battleSubmenu.innerHTML = '<button type="button" data-battle-system="retry">Try Again</button>';
      return;
    }
    if (battleState.phase === "enemy_turn" || battleResolving) {
      battleSubmenu.innerHTML = '<div class="menu-card menu-muted">The bird gang is taking its turn…</div>';
      return;
    }
    if (battleMenuMode === "targets") {
      battleSubmenu.innerHTML = livingEnemies(battleState)
        .map((enemy) => `<button class="battle-target-button" type="button" data-battle-target="${enemy.id}">${enemy.name}<span>HP ${enemy.hp}/${enemy.maxHp}</span></button>`)
        .join("") + '<button type="button" data-battle-system="back">Back</button>';
      return;
    }
    if (battleMenuMode === "items") {
      const canUseFries = battleState.inventory.fries > 0 && battleState.player.hp < battleState.player.maxHp;
      battleSubmenu.innerHTML = `${canUseFries ? `<button type="button" data-battle-item="fries">Use Fries ×${battleState.inventory.fries}<span>Restore up to 8 HP</span></button>` : '<div class="menu-card menu-muted">No usable combat items right now.</div>'}<button type="button" data-battle-system="back">Back</button>`;
      return;
    }
    battleSubmenu.hidden = true;
  }

  async function runBirdAmbush(): Promise<void> {
    if (ambushRunning || quest.stage !== "ambush_pending") return;
    ambushRunning = true;
    primaryBirdPosition = { x: player.position.x + 60, y: player.position.y + 18 };
    await showDialogue([
      { speaker: "Lulu", text: "No." },
      { speaker: "Bird", text: "..." },
      { speaker: "Lulu", text: "I know that look." }
    ]);
    const outcome = await runFryDefenseMinigame();
    quest = resolveFryDefense(quest, outcome);
    if (outcome === "stolen") inventory = removeInventoryItem(inventory, "fries");
    primaryBirdPosition = birdHideoutPosition;
    await showDialogue([
      {
        speaker: "System",
        text:
          outcome === "mostly_saved"
            ? "Mostly secured. The bird escapes with exactly one fry."
            : outcome === "partial"
              ? "A contested lunch. Lulu saves a small portion."
              : "Professionally robbed. The bird takes the whole bag."
      }
    ]);
    ambushRunning = false;
    updateHud();
    persistAutosave();
  }

  async function runFryDefenseMinigame(): Promise<FriesOutcome> {
    storyBusy = true;
    minigamePanel.hidden = false;
    const sequence = ["left", "right", "down"] as const;
    let score = 0;
    for (let index = 0; index < sequence.length; index += 1) {
      const required = sequence[index];
      minigameText.textContent = `Bird lunge ${index + 1}/3: ${required.toUpperCase()}!`;
      const chosen = await waitForMinigameDirection();
      if (chosen === required) score += 1;
    }
    minigamePanel.hidden = true;
    storyBusy = false;
    return score === 3 ? "mostly_saved" : score === 2 ? "partial" : "stolen";
  }

  function waitForMinigameDirection(): Promise<string> {
    return new Promise((resolve) => {
      const cleanup = () => minigameButtons.forEach((button) => button.removeEventListener("click", onClick));
      const onClick = (event: Event) => {
        const button = event.currentTarget as HTMLButtonElement;
        cleanup();
        resolve(button.dataset.direction ?? "");
      };
      minigameButtons.forEach((button) => button.addEventListener("click", onClick));
    });
  }

  async function showDialogue(
    lines: DialogueLine[],
    choices: Array<{ id: string; label: string }> = []
  ): Promise<string | null> {
    storyBusy = true;
    dialoguePanel.hidden = false;
    let index = 0;
    return new Promise((resolve) => {
      const render = () => {
        const line = lines[index];
        dialogueSpeaker.textContent = line.speaker;
        dialogueText.textContent = line.text;
        dialogueChoices.replaceChildren();
        const isLast = index === lines.length - 1;
        if (isLast && choices.length > 0) {
          for (const choice of choices) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = choice.label;
            button.addEventListener("click", () => finish(choice.id));
            dialogueChoices.append(button);
          }
          return;
        }
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = isLast ? "Continue" : "Next";
        button.addEventListener("click", () => {
          if (isLast) finish(null);
          else {
            index += 1;
            render();
          }
        });
        dialogueChoices.append(button);
      };
      const finish = (choice: string | null) => {
        dialoguePanel.hidden = true;
        dialogueChoices.replaceChildren();
        storyBusy = false;
        resolve(choice);
      };
      render();
    });
  }

  async function setPhase(next: VisualPhase): Promise<void> {
    if (phase === next) return;
    busy = true;
    updateControls();
    status.textContent = `Loading ${next} artwork…`;
    try {
      activeVisual = await loadMapVisual(activeMap, next);
      phase = next;
      if (phase === "day") resetCompanionForMap(companion, activeMap, player.position, preferredCompanionAnchor(activeMap));
    } finally {
      busy = false;
      status.textContent = "";
      updateHud();
      persistAutosave();
    }
  }

  async function switchPhaseDebug(): Promise<void> {
    if (!debugEnabled || busy) return;
    const next: VisualPhase = phase === "day" ? "night" : "day";
    quest = { ...quest, phase: next };
    await setPhase(next);
    setMessage(`${next === "day" ? "Day" : "Night"} Mode (debug)`);
  }

  async function enterMap(transition: TransitionDefinition): Promise<void> {
    if (busy || !canUseQuestTransition(quest, transition.id)) return;
    busy = true;
    updateControls();
    status.textContent = "Loading destination…";
    try {
      const destination = requireMap(maps, transition.target_map);
      const [visual, spawn] = await Promise.all([
        loadMapVisual(destination, phase),
        Promise.resolve(getSpawn(destination, transition.target_spawn_id))
      ]);
      quest = applyQuestTransition(quest, transition.id);
      activeMap = destination;
      activeVisual = visual;
      const spawnResolution = resolveSafeSpawn(activeMap, spawn, PLAYER.collider);
      player = createPlayer(spawnResolution.position, facingFromAuthored(spawn.facing));
      if (quest.stage === "ambush_pending") ambushOrigin = { ...player.position };
      resetCompanionForMap(companion, activeMap, player.position, preferredCompanionAnchor(activeMap));
      lastCamera = clampCamera(player.position, { width: activeMap.width, height: activeMap.height }, { width: viewport.width, height: viewport.height });
    } finally {
      busy = false;
      status.textContent = "";
      updateHud();
      persistAutosave();
    }
  }

  function preferredCompanionAnchor(map: RuntimeMap): WorldPoint | undefined {
    return map.semantic.npc_spawn_markers.find((anchor) => anchor.kind === "companion_anchor")?.pixel_point;
  }

  function canUseInput(): boolean {
    return gameStarted && !portraitPaused && gate.hidden && !busy && !storyBusy && !menuOpen && !battleState && !isPortrait();
  }

  function updateControls(): void {
    const uiBlocked = busy || storyBusy || menuOpen || Boolean(battleState);
    phaseButton.disabled = uiBlocked;
    petButton.disabled = uiBlocked || phase === "night";
    feedButton.disabled = uiBlocked || phase === "night";
    commandButton.disabled = uiBlocked || phase === "night";
    runButton.disabled = uiBlocked;
    menuButton.disabled = busy || storyBusy || Boolean(battleState);
    worldActionToggle.disabled = busy || storyBusy || menuOpen || Boolean(battleState);
    for (const button of worldActionButtons) {
      button.disabled = busy || storyBusy || menuOpen || Boolean(battleState) || button.dataset.available !== "true";
    }
    brutusActionEntry.disabled = uiBlocked || phase !== "day" || distance(player.position, companion.position) > INTERACTION_RADIUS + 18;
    updateCompanionActionMenu();
  }

  function updateHud(): void {
    const mapLabel = activeMap.id === "charles_jr" ? "Charles Jr." : activeMap.id[0].toUpperCase() + activeMap.id.slice(1);
    const currentObjective = getDemoObjective(quest, activeMap.id);
    objective.textContent = "";
    questTrackerTitle.textContent = getActiveQuestTitle(quest);
    questTrackerObjective.textContent = currentObjective;
    phaseButton.textContent = phase === "day" ? "Night" : "Day";
    commandButton.textContent = companion.mode === "follow" ? "Stay" : "Follow";
    status.dataset.map = mapLabel;
    if (menuOpen) renderMenu();
    updateWorldActionMenu();
    updateControls();
  }

  function getQuestTargetPosition(): WorldPoint | null {
    switch (quest.stage) {
      case "check_fridge":
        return interactionCenter(activeMap, "interaction_refrigerator");
      case "feed_brutus":
        return phase === "day" ? companion.position : null;
      case "go_to_charles":
        return activeMap.id === "home"
          ? transitionCenter(activeMap, "transition_home_to_overworld")
          : activeMap.id === "overworld"
            ? transitionCenter(activeMap, "transition_overworld_to_charles_jr")
            : null;
      case "order_fries":
        return interactionCenter(activeMap, "interaction_service_counter");
      case "head_home_with_fries":
        return activeMap.id === "charles_jr" ? transitionCenter(activeMap, "transition_charles_jr_to_overworld") : null;
      case "investigate_bird":
        return activeMap.id === "overworld" ? primaryBirdPosition : null;
      case "return_home_day":
      case "return_home_night":
        return activeMap.id === "overworld" ? transitionCenter(activeMap, "transition_overworld_to_home") : null;
      case "choose_day_end":
      case "night_quest_pending":
      case "sleep_after_night":
        return activeMap.id === "home" ? interactionCenter(activeMap, "interaction_bed") : null;
      case "leave_home_night":
        return activeMap.id === "home" ? transitionCenter(activeMap, "transition_home_to_overworld") : null;
      case "meet_night_guide":
        return activeMap.id === "overworld" ? guidePosition : null;
      case "find_bush_sword":
        return activeMap.id === "overworld" ? bushInteractionPosition : null;
      case "confront_bird_gang":
        return activeMap.id === "overworld" ? gangCenter : null;
      default:
        return null;
    }
  }

  function getActors(): WorldActorRenderState[] {
    const actors: WorldActorRenderState[] = [];
    if (activeMap.id === "charles_jr" && phase === "day") {
      actors.push(actor("cashier", cashierAnchor, "down", requireNpcAnimation(actorAssets, "charles_jr_employee:idle"), actorTime, 0.25));
    }
    if (activeMap.id === "overworld" && phase === "day") {
      actors.push(actor("homeless-day", homelessPosition, "right", requireNpcAnimation(actorAssets, "homeless_man_day:sit"), actorTime, 0.5));
      ambientNpcPositions.forEach((position, index) => {
        actors.push(
          actor(
            `pedestrian-${index + 1}`,
            position,
            ["down", "left", "right", "up"][index % 4] as Facing,
            requireNpcAnimation(actorAssets, `pedestrian_${String(index + 1).padStart(2, "0")}:idle`),
            actorTime + index * 0.17,
            0.45
          )
        );
      });
      actors.push(actor("ambient-robin", { x: apartmentAnchor.x + 120, y: apartmentAnchor.y + 72 }, "left", requireBirdAnimation(actorAssets, "ambient_robin:idle"), actorTime, 0.4));
      if ((quest.stage === "investigate_bird" || ambushRunning) && primaryBirdPosition) {
        actors.push(
          actor(
            "fries-thief",
            primaryBirdPosition,
            "left",
            requireBirdAnimation(actorAssets, ambushRunning ? "primary_fries_thief:theft_attempt" : "primary_fries_thief:idle"),
            actorTime,
            0.16
          )
        );
      }
    }
    if (activeMap.id === "overworld" && phase === "night") {
      if (["meet_night_guide", "find_bush_sword", "confront_bird_gang", "return_home_night"].includes(quest.stage)) {
        actors.push(actor("night-guide", guidePosition, "left", requireNpcAnimation(actorAssets, "wizard_night:idle"), actorTime, 0.25));
      }
      if (quest.stage === "confront_bird_gang") {
        actors.push(actor("bird-lookout", { x: gangCenter.x - 52, y: gangCenter.y + 12 }, "left", requireBirdAnimation(actorAssets, "bird_lookout:idle"), actorTime, 0.22));
        actors.push(actor("fries-thief-night", { x: gangCenter.x, y: gangCenter.y - 10 }, "down", requireBirdAnimation(actorAssets, "primary_fries_thief:idle"), actorTime, 0.22));
        actors.push(actor("peck-captain", { x: gangCenter.x + 56, y: gangCenter.y + 12 }, "right", requireBirdAnimation(actorAssets, "peck_captain:idle"), actorTime, 0.22));
      }
    }
    return actors;
  }

  function frame(now: number): void {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    actorTime += dt;
    autosaveElapsed += dt;
    if (autosaveElapsed >= 5 && !busy && !storyBusy && !battleState) {
      autosaveElapsed = 0;
      persistAutosave();
    }
    if (messageTime > 0) {
      messageTime = Math.max(0, messageTime - dt);
      if (messageTime === 0) message.textContent = "";
    }

    if (canUseInput()) {
      updatePlayer(player, input.getMoveVector(), input.isRunning(), dt, activeMap);
      if (phase === "day") updateCompanion(companion, player, dt, activeMap, characters.interactions);
      const transition = transitionAt(activeMap, player.position);
      if (transition && canUseQuestTransition(quest, transition.id)) void enterMap(transition);
      if (
        quest.stage === "ambush_pending" &&
        activeMap.id === "overworld" &&
        ambushOrigin &&
        distance(player.position, ambushOrigin) >= 80 &&
        !transitionAt(activeMap, player.position)
      ) {
        void runBirdAmbush();
      }
      if (
        !dayWarningSeen &&
        phase === "day" &&
        activeMap.id === "overworld" &&
        quest.stage === "go_to_charles" &&
        distance(player.position, homelessPosition) <= 72
      ) {
        dayWarningSeen = true;
        persistAutosave();
        showWorldBubble(homelessPosition, "Birds don't steal. They collect.", 3.2);
      }
    }

    lastCamera = clampCamera(player.position, { width: activeMap.width, height: activeMap.height }, { width: viewport.width, height: viewport.height });
    updateObjectiveMarker();
    updateWorldBubble(now);
    const foodPropPosition = phase === "day" ? getFeedingPropPosition(companion, player, characters.interactions) : null;
    const toyPropPosition = phase === "day" ? getFetchToyPosition(companion, characters.interactions) : null;
    renderer.render({
      map: activeMap,
      visual: activeVisual,
      viewport,
      camera: lastCamera,
      player,
      companion,
      companionVisible: phase === "day",
      foodPropPosition,
      toyPropPosition,
      inputState: input.getTouchState(),
      debugEnabled,
      debugText: `${activeMap.id} | ${phase} | ${quest.stage} | camera ${lastCamera.x.toFixed(0)},${lastCamera.y.toFixed(0)} | logical ${viewport.width}×360 @${viewport.outputScale}×`,
      actors: getActors()
    });
    updateHud();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function buildAmbientNpcPositions(map: RuntimeMap, apartmentAnchor: WorldPoint, charlesAnchor: WorldPoint): WorldPoint[] {
  const offsets = [
    { x: -112, y: 72 },
    { x: 112, y: 72 },
    { x: -128, y: -64 },
    { x: 128, y: -64 },
    { x: -120, y: 88 },
    { x: 120, y: 88 },
    { x: -144, y: -64 },
    { x: 144, y: -64 }
  ];
  return offsets.map((offset, index) => {
    const base = index < 4 ? apartmentAnchor : charlesAnchor;
    return findSafePlacement(map, { x: base.x + offset.x, y: base.y + offset.y }, PLAYER.collider, true) ?? base;
  });
}

function actor(
  id: string,
  position: WorldPoint,
  facing: Facing,
  definition: WorldActorRenderState["definition"],
  animationTime: number,
  frameSeconds: number
): WorldActorRenderState {
  return { id, position, facing, definition, animationTime, frameSeconds };
}

function interactionCenter(map: RuntimeMap, id: string): WorldPoint | null {
  const interaction = map.semantic.interactions.find((candidate) => candidate.id === id);
  return interaction ? rectCenter(interaction.pixel_rect) : null;
}

function transitionCenter(map: RuntimeMap, id: string): WorldPoint {
  const transition = map.semantic.transitions.find((candidate) => candidate.id === id);
  if (!transition) throw new Error(`${map.id} is missing transition ${id}.`);
  return rectCenter(transition.pixel_rect);
}

function requireNpcAnchor(map: RuntimeMap, id: string): WorldPoint {
  const anchor = map.semantic.npc_spawn_markers.find((candidate) => candidate.id === id);
  if (!anchor) throw new Error(`${map.id} is missing NPC anchor ${id}.`);
  return { ...anchor.pixel_point };
}

function rectCenter(rect: PixelRect): WorldPoint {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function midpoint(a: WorldPoint, b: WorldPoint): WorldPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function distance(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function resizeViewport(): LogicalViewport {
  const display = getDisplayViewportSize(window.innerWidth, window.innerHeight, window.visualViewport);
  const viewport = calculateLogicalViewport(display.width, display.height, window.devicePixelRatio);
  applyLogicalViewport(canvas, viewport);
  canvasContext.imageSmoothingEnabled = false;
  return viewport;
}

function facingFromAuthored(facing: string): Facing {
  return ({ north: "up", south: "down", east: "right", west: "left" }[facing] as Facing | undefined) ?? "down";
}

function requireMap(maps: Map<FoundationMapId, RuntimeMap>, id: FoundationMapId): RuntimeMap {
  const map = maps.get(id);
  if (!map) throw new Error(`Authoritative map ${id} did not load.`);
  return map;
}

titlePlayButton.addEventListener("click", () => {
  if (gameBooting || !canStartGameplay(getBootEnvironment())) {
    syncBootUi();
    return;
  }
  gameBooting = true;
  titlePlayButton.disabled = true;
  titleScreen.classList.add("is-loading");

  void (async () => {
    try {
      // Browser/PWA autosave restoration occurs inside start(), so saved state is
      // loaded only after the player explicitly presses Play.
      await start();
      gameStarted = true;
      syncBootUi();
    } catch (error: unknown) {
      const text = error instanceof Error ? error.message : String(error);
      status.textContent = `Unable to start: ${text}`;
      titlePlayButton.disabled = false;
      titleScreen.classList.remove("is-loading");
      gameBooting = false;
      syncBootUi();
      console.error(error);
    }
  })();
});
