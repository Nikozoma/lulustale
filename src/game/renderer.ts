import { directionRow, type AnimationDefinition, type CharacterAssets } from "./characterAssets";
import type { CompanionState } from "./companion";
import { BRUTUS, PLAYER } from "./constants";
import {
  pointInRect,
  type LoadedForeground,
  type LoadedMapVisual,
  type RuntimeMap,
  type WorldPoint
} from "./foundation";
import type { TouchState } from "./input";
import type { PlayerState } from "./player";
import { getLuluRenderScale, getPlayerSpriteDrawBox } from "./playerRender";
import type { LogicalViewport } from "./viewport";
import type { WorldActorRenderState } from "./worldActors";

export type FoundationRenderState = {
  map: RuntimeMap;
  visual: LoadedMapVisual;
  viewport: LogicalViewport;
  camera: WorldPoint;
  player: PlayerState;
  companion: CompanionState;
  companionVisible: boolean;
  foodPropPosition: WorldPoint | null;
  toyPropPosition: WorldPoint | null;
  inputState: TouchState;
  debugEnabled: boolean;
  debugText: string;
  questTrail: WorldPoint[] | null;
  actors: WorldActorRenderState[];
};

type RenderableEntity = { y: number; draw: () => void };

export class FoundationRenderer {
  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly characters: CharacterAssets
  ) {}

  render(state: FoundationRenderState): void {
    const { ctx } = this;
    const physicalWidth = state.viewport.width * state.viewport.outputScale;
    const physicalHeight = state.viewport.height * state.viewport.outputScale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, physicalWidth, physicalHeight);
    ctx.fillStyle = "#181512";
    ctx.fillRect(0, 0, physicalWidth, physicalHeight);
    ctx.setTransform(state.viewport.outputScale, 0, 0, state.viewport.outputScale, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const camera = { x: Math.round(state.camera.x), y: Math.round(state.camera.y) };
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, state.viewport.width, state.viewport.height);
    ctx.clip();
    ctx.translate(-camera.x, -camera.y);
    ctx.drawImage(state.visual.base, 0, 0);
    if (state.questTrail) this.drawQuestTrail(state.questTrail);

    const entities: RenderableEntity[] = [];
    if (state.foodPropPosition) {
      entities.push({ y: state.foodPropPosition.y, draw: () => this.drawFoodProp(state.foodPropPosition!) });
    }
    if (state.toyPropPosition) {
      entities.push({ y: state.toyPropPosition.y, draw: () => this.drawFetchToy(state.toyPropPosition!) });
    }
    if (state.companionVisible) {
      entities.push({ y: state.companion.position.y, draw: () => this.drawCompanion(state.companion) });
    }
    for (const actor of state.actors) {
      entities.push({ y: actor.position.y, draw: () => this.drawWorldActor(actor) });
    }
    entities.push({ y: state.player.position.y, draw: () => this.drawPlayer(state.player, state.map.id) });
    entities.sort((a, b) => a.y - b.y).forEach((entity) => entity.draw());

    this.drawForegrounds(state.visual.foregrounds, state.map, [
      state.player.position,
      ...(state.companionVisible ? [state.companion.position] : []),
      ...state.actors.map((actor) => actor.position)
    ]);
    if (state.debugEnabled) {
      this.drawDebug(state, camera);
    }
    ctx.restore();
    this.drawTouchControls(state.inputState);
    if (state.debugEnabled) {
      this.drawDebugText(state.debugText, state.viewport);
    }
  }

  private drawQuestTrail(points: WorldPoint[]): void {
    if (points.length < 2) return;
    this.ctx.save();
    this.ctx.strokeStyle = "rgb(38 208 236 / 0.62)";
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) this.ctx.lineTo(point.x, point.y);
    this.ctx.stroke();
    this.ctx.restore();
  }


  private drawWorldActor(actor: WorldActorRenderState): void {
    this.drawAnimation(actor.definition, actor.facing, actor.animationTime, actor.frameSeconds, actor.position);
  }

  private drawPlayer(player: PlayerState, mapId: RuntimeMap["id"]): void {
    const animationName = player.action ?? (player.isMoving ? (player.isRunning ? "run" : "walk") : "idle");
    const definition = this.characters.lulu.get(animationName) ?? this.characters.lulu.get("idle");
    if (!definition) {
      return;
    }
    const frameSeconds = player.action
      ? 0.18
      : player.isMoving
        ? player.isRunning
          ? PLAYER.runFrameSeconds
          : PLAYER.walkFrameSeconds
        : PLAYER.idleFrameSeconds;
    this.drawAnimation(
      definition,
      player.facing,
      player.action ? player.actionTime : player.animationTime,
      frameSeconds,
      player.position,
      getLuluRenderScale(mapId)
    );
  }

  private drawCompanion(companion: CompanionState): void {
    const animationName = companion.action ?? (companion.isMoving ? (companion.isRunning ? "run" : "walk") : "idle_stand");
    const definition = this.characters.brutus.get(animationName) ?? this.characters.brutus.get("idle_stand");
    if (!definition) {
      return;
    }
    const frameSeconds = companion.action ? 0.18 : companion.isRunning ? 0.1 : companion.isMoving ? 0.125 : 0.25;
    this.drawAnimation(
      definition,
      companion.facing,
      companion.action ? companion.actionTime : companion.animationTime,
      frameSeconds,
      companion.position
    );
  }

  private drawAnimation(
    definition: AnimationDefinition,
    facing: PlayerState["facing"],
    animationTime: number,
    frameSeconds: number,
    root: WorldPoint,
    renderScale = 1
  ): void {
    const frame = Math.floor(animationTime / frameSeconds) % definition.framesPerDirection;
    const sourceX = frame * definition.frameWidth;
    const sourceY = directionRow(facing) * definition.frameHeight;
    const destination = getPlayerSpriteDrawBox(
      root,
      definition.frameWidth,
      definition.frameHeight,
      renderScale,
      definition.rootAnchorX,
      definition.rootAnchorY
    );
    this.ctx.drawImage(
      definition.image,
      sourceX,
      sourceY,
      definition.frameWidth,
      definition.frameHeight,
      Math.round(destination.x),
      Math.round(destination.y),
      destination.width,
      destination.height
    );
  }

  private drawFoodProp(position: WorldPoint): void {
    this.ctx.drawImage(this.characters.foodPropImage, 64, 64, 16, 16, Math.round(position.x - 8), Math.round(position.y - 8), 16, 16);
  }

  private drawFetchToy(position: WorldPoint): void {
    // Real project asset: the small bone sprite in TopDownHouse_SmallItems.png.
    this.ctx.drawImage(this.characters.foodPropImage, 3, 41, 11, 6, Math.round(position.x - 7), Math.round(position.y - 4), 14, 8);
  }

  private drawForegrounds(foregrounds: LoadedForeground[], map: RuntimeMap, entityFeet: WorldPoint[]): void {
    for (const foreground of [...foregrounds].sort((a, b) => a.definition.z_index - b.definition.z_index)) {
      const components = foreground.definition.alpha_components ?? [];
      if (components.length === 0) {
        this.ctx.drawImage(foreground.image, 0, 0);
        continue;
      }
      for (const component of components) {
        const trigger = {
          x: component.trigger_tile_rect.x * map.tileSize,
          y: component.trigger_tile_rect.y * map.tileSize,
          width: component.trigger_tile_rect.width * map.tileSize,
          height: component.trigger_tile_rect.height * map.tileSize
        };
        if (!entityFeet.some((feet) => pointInRect(feet, trigger))) {
          continue;
        }
        const box = component.pixel_bbox;
        this.ctx.drawImage(foreground.image, box.x, box.y, box.width, box.height, box.x, box.y, box.width, box.height);
      }
    }
  }

  private drawDebug(state: FoundationRenderState, camera: WorldPoint): void {
    const { ctx } = this;
    const minX = Math.max(0, Math.floor(camera.x / state.map.tileSize));
    const maxX = Math.min(state.map.collision[0].length - 1, Math.ceil((camera.x + state.viewport.width) / state.map.tileSize));
    const minY = Math.max(0, Math.floor(camera.y / state.map.tileSize));
    const maxY = Math.min(state.map.collision.length - 1, Math.ceil((camera.y + state.viewport.height) / state.map.tileSize));
    ctx.save();
    ctx.globalAlpha = 0.22;
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        ctx.fillStyle = state.map.collision[y][x] ? "#22c55e" : "#ff2d55";
        ctx.fillRect(x * state.map.tileSize, y * state.map.tileSize, state.map.tileSize, state.map.tileSize);
      }
    }
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    for (const transition of state.map.semantic.transitions) {
      const rect = transition.pixel_rect;
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
    this.drawCollider(state.player.position, PLAYER.collider, "#ffffff");
    if (state.companionVisible) {
      this.drawCollider(state.companion.position, BRUTUS.collider, "#fbbf24");
    }
    ctx.restore();
  }

  private drawCollider(position: WorldPoint, collider: { width: number; height: number; centerOffsetY: number }, color: string): void {
    this.ctx.strokeStyle = color;
    this.ctx.strokeRect(
      position.x - collider.width / 2,
      position.y + collider.centerOffsetY - collider.height / 2,
      collider.width,
      collider.height
    );
  }

  private drawTouchControls(input: TouchState): void {
    if (!input.active) {
      return;
    }
    const dx = input.current.x - input.start.x;
    const dy = input.current.y - input.start.y;
    const length = Math.hypot(dx, dy);
    const cap = 58;
    const knob =
      length > cap
        ? { x: input.start.x + (dx / length) * cap, y: input.start.y + (dy / length) * cap }
        : input.current;
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = "#f4efe8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(input.start.x, input.start.y, cap, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgb(244 239 232 / 0.24)";
    ctx.beginPath();
    ctx.arc(knob.x, knob.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawDebugText(text: string, viewport: LogicalViewport): void {
    this.ctx.save();
    this.ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    this.ctx.fillStyle = "rgb(244 239 232 / 0.9)";
    this.ctx.fillText(text, 8, viewport.height - 8);
    this.ctx.restore();
  }
}
