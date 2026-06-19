import type { AssetManifest, LoadedImages, ObjectSprite, SpriteCrop, TileSprite } from "./assets";
import { PLAYER, VIRTUAL_VIEWPORT } from "./constants";
import type { TouchState } from "./input";
import type { PlayerState } from "./player";
import type { BirdAttention } from "./quest";
import { getPlayerSpriteDrawBox } from "./playerRender";
import { getObjectDrawBox, getStructureSpriteKey } from "./renderPlan";
import {
  collectObjectRegions,
  collectStructureRegions,
  type CollisionGrid,
  type ObjectRegion,
  type SemanticMap,
  type WorldPoint
} from "./world";

const GROUPED_STRUCTURE_IDS = new Set([
  "player_apartment_building",
  "charles_jr_building",
  "apartment_building",
  "building_shell"
]);

type RenderState = {
  map: SemanticMap;
  collision: CollisionGrid;
  camera: WorldPoint;
  renderZoom: number;
  player: PlayerState;
  inputState: TouchState;
  debugEnabled: boolean;
  activeInteractableTarget?: WorldPoint | null;
  bird?: {
    visible: boolean;
    position: WorldPoint;
    attention: BirdAttention;
    animationTime: number;
  };
  birdGang?: {
    enemies: Array<{
      position: WorldPoint;
      defeated: boolean;
      hitFlashSeconds: number;
    }>;
  };
  nightMode?: boolean;
  sleepOverlayAlpha?: number;
  questDebugText?: string;
};

export class CanvasRenderer {
  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly images: LoadedImages,
    private readonly manifest: AssetManifest
  ) {}

  render(state: RenderState): void {
    const { ctx } = this;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, VIRTUAL_VIEWPORT.width, VIRTUAL_VIEWPORT.height);
    ctx.fillStyle = "#181512";
    ctx.fillRect(0, 0, VIRTUAL_VIEWPORT.width, VIRTUAL_VIEWPORT.height);

    ctx.save();
    ctx.scale(state.renderZoom, state.renderZoom);
    ctx.translate(-state.camera.x, -state.camera.y);
    this.drawGround(state.map);
    this.drawStructures(state.map);
    this.drawMarkerFixtures(state.map);
    this.drawObjects(state.map);
    this.drawDog(state.map);
    this.drawCashier(state.map);
    this.drawBird(state.bird);
    this.drawBirdGang(state.birdGang);
    this.drawInteractableMarker(state.activeInteractableTarget);
    this.drawPlayer(state.player);

    if (state.debugEnabled) {
      this.drawDebug(state.map, state.collision, state.player);
    }

    ctx.restore();
    this.drawNightOverlay(state.nightMode, state.sleepOverlayAlpha);
    this.drawTouchControls(state.inputState);
    if (state.debugEnabled) {
      this.drawDevInfo(state);
    }
  }

  private drawGround(map: SemanticMap): void {
    for (let y = 0; y < map.heightTiles; y += 1) {
      for (let x = 0; x < map.widthTiles; x += 1) {
        const cell = map.layers.ground[y][x];
        if (!cell) {
          continue;
        }
        this.drawTileSprite(this.manifest.tiles[cell], x * map.tileSize, y * map.tileSize, map.tileSize, map.tileSize);
      }
    }
  }

  private drawStructures(map: SemanticMap): void {
    for (let y = 0; y < map.heightTiles; y += 1) {
      for (let x = 0; x < map.widthTiles; x += 1) {
        const cell = map.layers.structures[y][x];
        if (!cell) {
          continue;
        }
        if (GROUPED_STRUCTURE_IDS.has(cell)) {
          continue;
        }
        const spriteKey = getStructureSpriteKey(cell);
        if (!spriteKey) {
          continue;
        }
        const sprite = this.manifest.tiles[spriteKey] ?? this.manifest.tiles.interior_wall;
        this.drawTileSprite(sprite, x * map.tileSize, y * map.tileSize, map.tileSize, map.tileSize);
      }
    }

    for (const region of collectStructureRegions(map)) {
      const sprite = this.manifest.structures[region.id];
      if (!sprite) {
        continue;
      }
      this.drawRegion(sprite, region, map.tileSize);
    }
  }

  private drawMarkerFixtures(map: SemanticMap): void {
    for (let y = 0; y < map.heightTiles; y += 1) {
      for (let x = 0; x < map.widthTiles; x += 1) {
        const marker = map.layers.markers[y][x];
        if (marker === "player_door" || marker === "transition_to_home") {
          this.drawDoorFixture(this.manifest.tiles.home_door, x, y, map.tileSize);
        }
        if (marker === "charles_jr_door" || marker === "transition_to_charles_jr") {
          this.drawDoorFixture(this.manifest.tiles.charles_jr_door, x, y, map.tileSize);
        }
      }
    }
  }

  private drawDoorFixture(sprite: TileSprite | undefined, tileX: number, tileY: number, tileSize: number): void {
    const width = tileSize;
    const height = tileSize * 1.45;
    const x = tileX * tileSize;
    const y = tileY * tileSize + tileSize - height;
    this.drawTileSprite(sprite, x, y, width, height);
  }

  private drawObjects(map: SemanticMap): void {
    for (const region of collectObjectRegions(map)) {
      if (region.id === "dog_bowl") {
        continue;
      }

      const sprite = this.manifest.objects[region.id];
      if (!sprite) {
        continue;
      }

      if (sprite.render.mode === "tile") {
        this.drawTiledRegion(sprite, region, map.tileSize);
        continue;
      }

      this.drawRegion(sprite, region, map.tileSize);
    }
  }

  private drawDog(map: SemanticMap): void {
    const marker = map.layers.markers.flatMap((row, tileY) =>
      row.flatMap((cell, tileX) => (cell === "dog_spawn" ? [{ x: tileX, y: tileY }] : []))
    )[0];

    if (!marker) {
      return;
    }

    const image = this.images.get(this.manifest.dog.image.key);
    if (!image) {
      return;
    }

    const destWidth = 64;
    const destHeight = 64;
    const worldX = marker.x * map.tileSize + map.tileSize / 2 - destWidth / 2;
    const worldY = marker.y * map.tileSize + map.tileSize - destHeight;
    const crop = this.manifest.dog.crop;
    this.ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, worldX, worldY, destWidth, destHeight);
  }

  private drawCashier(map: SemanticMap): void {
    const marker = map.layers.markers.flatMap((row, tileY) =>
      row.flatMap((cell, tileX) => (cell === "cashier_spawn" ? [{ x: tileX, y: tileY }] : []))
    )[0];

    if (!marker) {
      return;
    }

    const sprite = this.manifest.characters.cashier;
    const image = this.images.get(sprite.imageKey);
    if (!image) {
      return;
    }

    const destWidth = 32;
    const destHeight = 32;
    const worldX = marker.x * map.tileSize + map.tileSize / 2 - destWidth / 2;
    const worldY = marker.y * map.tileSize + map.tileSize - destHeight;
    this.drawCrop(image, sprite.crop, worldX, worldY, destWidth, destHeight);
  }

  private drawPlayer(player: PlayerState): void {
    const strip = this.manifest.lulu.strips[player.facing];
    const image = this.images.get(strip.key);
    if (!image) {
      return;
    }

    const frameCount = Math.floor(image.width / this.manifest.lulu.frameWidth);
    const frameIndex = player.isMoving
      ? Math.floor(player.animationTime / PLAYER.animationFrameSeconds) % frameCount
      : 0;
    const sourceX = frameIndex * this.manifest.lulu.frameWidth;
    const drawBox = getPlayerSpriteDrawBox(
      player.position,
      this.manifest.lulu.frameWidth,
      this.manifest.lulu.frameHeight,
      PLAYER.renderScale,
      PLAYER.spriteFootOffsetY,
      PLAYER.spriteAnchorX,
      PLAYER.spriteAnchorY
    );

    this.ctx.drawImage(
      image,
      sourceX,
      0,
      this.manifest.lulu.frameWidth,
      this.manifest.lulu.frameHeight,
      drawBox.x,
      drawBox.y,
      drawBox.width,
      drawBox.height
    );
  }

  private drawBird(bird: RenderState["bird"]): void {
    if (!bird?.visible) {
      return;
    }

    const image = this.images.get(this.manifest.bird.image.key);
    if (!image) {
      return;
    }

    const frameCount = Math.floor(image.width / this.manifest.bird.frameWidth);
    const frameIndex = Math.floor(bird.animationTime / 0.16) % frameCount;
    const sourceX = frameIndex * this.manifest.bird.frameWidth;
    const destWidth = 32;
    const destHeight = 32;
    const x = bird.position.x - destWidth / 2;
    const y = bird.position.y - destHeight + 10;

    this.ctx.drawImage(
      image,
      sourceX,
      0,
      this.manifest.bird.frameWidth,
      this.manifest.bird.frameHeight,
      x,
      y,
      destWidth,
      destHeight
    );

    this.ctx.save();
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.font = "bold 12px ui-sans-serif, system-ui, sans-serif";
    this.ctx.fillStyle = bird.attention === "watching" ? "#ff6b5a" : "#7ddf64";
    this.ctx.fillText(bird.attention === "watching" ? "..." : "Z", bird.position.x + 17, y + 6);
    this.ctx.restore();
  }

  private drawBirdGang(birdGang: RenderState["birdGang"]): void {
    if (!birdGang) {
      return;
    }

    for (const enemy of birdGang.enemies) {
      if (enemy.defeated) {
        continue;
      }

      this.drawBirdSprite(enemy.position, 0, enemy.hitFlashSeconds > 0);
    }
  }

  private drawBirdSprite(position: WorldPoint, animationTime: number, hitFlash: boolean): void {
    const image = this.images.get(this.manifest.bird.image.key);
    if (!image) {
      return;
    }

    const frameCount = Math.floor(image.width / this.manifest.bird.frameWidth);
    const frameIndex = Math.floor(animationTime / 0.16) % frameCount;
    const sourceX = frameIndex * this.manifest.bird.frameWidth;
    const destWidth = 32;
    const destHeight = 32;
    const x = position.x - destWidth / 2;
    const y = position.y - destHeight + 10;

    this.ctx.drawImage(
      image,
      sourceX,
      0,
      this.manifest.bird.frameWidth,
      this.manifest.bird.frameHeight,
      x,
      y,
      destWidth,
      destHeight
    );

    if (hitFlash) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.45;
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(x, y, destWidth, destHeight);
      this.ctx.restore();
    }
  }

  private drawInteractableMarker(target: WorldPoint | null | undefined): void {
    if (!target) {
      return;
    }

    const { ctx } = this;
    const x = target.x;
    const y = target.y;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgb(0 0 0 / 0.55)";
    ctx.shadowBlur = 4;
    ctx.fillStyle = "#ffd84d";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#5a3000";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#3a2100";
    ctx.font = "bold 18px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("!", x, y + 1);
    ctx.restore();
  }

  private drawDebug(map: SemanticMap, collision: CollisionGrid, player: PlayerState): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = 0.28;

    for (let y = 0; y < map.heightTiles; y += 1) {
      for (let x = 0; x < map.widthTiles; x += 1) {
        if (collision.walkable[y][x]) {
          ctx.fillStyle = "#22c55e";
          ctx.fillRect(x * map.tileSize, y * map.tileSize, map.tileSize, map.tileSize);
        }

        if (collision.solid[y][x]) {
          ctx.fillStyle = "#ff2d55";
          ctx.fillRect(x * map.tileSize, y * map.tileSize, map.tileSize, map.tileSize);
        }

        const marker = map.layers.markers[y][x];
        if (marker) {
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(x * map.tileSize + 6, y * map.tileSize + 6, map.tileSize - 12, map.tileSize - 12);
        }
      }
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(player.position.x, player.position.y, PLAYER.collisionRadiusPx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(player.position.x, player.position.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawTouchControls(input: TouchState): void {
    if (!input.active) {
      return;
    }

    const { ctx } = this;
    const dx = input.current.x - input.start.x;
    const dy = input.current.y - input.start.y;
    const length = Math.hypot(dx, dy);
    const cap = 76;
    const knob = length > cap ? { x: input.start.x + (dx / length) * cap, y: input.start.y + (dy / length) * cap } : input.current;

    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = "#f4efe8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(input.start.x, input.start.y, cap, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgb(244 239 232 / 0.24)";
    ctx.beginPath();
    ctx.arc(knob.x, knob.y, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawNightOverlay(nightMode: boolean | undefined, sleepOverlayAlpha: number | undefined): void {
    const alpha = Math.max(nightMode ? 0.24 : 0, sleepOverlayAlpha ?? 0);
    if (alpha <= 0) {
      return;
    }

    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = `rgb(7 12 32 / ${alpha})`;
    ctx.fillRect(0, 0, VIRTUAL_VIEWPORT.width, VIRTUAL_VIEWPORT.height);
    ctx.restore();
  }

  private drawDevInfo(state: RenderState): void {
    const { ctx } = this;
    const playerTile = {
      x: Math.floor(state.player.position.x / state.map.tileSize),
      y: Math.floor(state.player.position.y / state.map.tileSize)
    };
    ctx.save();
    ctx.font = "14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "rgb(244 239 232 / 0.88)";
    ctx.fillText(
      `${state.map.name} | ${state.map.widthTiles}x${state.map.heightTiles} | player tile ${playerTile.x},${playerTile.y} | camera ${state.camera.x.toFixed(0)},${state.camera.y.toFixed(0)} | debug F3`,
      14,
      VIRTUAL_VIEWPORT.height - 16
    );
    if (state.debugEnabled && state.questDebugText) {
      ctx.fillText(state.questDebugText, 14, VIRTUAL_VIEWPORT.height - 34);
    }
    ctx.restore();
  }

  private drawRegion(sprite: ObjectSprite, region: ObjectRegion, tileSize: number): void {
    const box = getObjectDrawBox(region, tileSize, sprite.render);
    this.drawTileSprite(sprite, box.x, box.y, box.width, box.height);
  }

  private drawTiledRegion(sprite: ObjectSprite, region: ObjectRegion, tileSize: number): void {
    for (let y = 0; y < region.heightTiles; y += 1) {
      for (let x = 0; x < region.widthTiles; x += 1) {
        this.drawTileSprite(
          sprite,
          (region.tileX + x) * tileSize,
          (region.tileY + y) * tileSize,
          tileSize,
          tileSize
        );
      }
    }
  }

  private drawTileSprite(sprite: TileSprite | undefined, x: number, y: number, width: number, height: number): void {
    if (!sprite) {
      return;
    }

    const image = this.images.get(sprite.imageKey);
    if (!image) {
      return;
    }

    this.drawCrop(image, sprite.crop, x, y, width, height);
  }

  private drawCrop(
    image: HTMLImageElement,
    crop: SpriteCrop,
    destX: number,
    destY: number,
    destWidth: number,
    destHeight: number
  ): void {
    this.ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, destX, destY, destWidth, destHeight);
  }
}
