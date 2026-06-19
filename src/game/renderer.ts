import type { AssetManifest, LoadedImages, ObjectSprite, SpriteCrop, TileSprite } from "./assets";
import { HOME_RENDER_ZOOM, PLAYER, VIRTUAL_VIEWPORT } from "./constants";
import type { TouchState } from "./input";
import type { PlayerState } from "./player";
import { getPlayerSpriteDrawBox } from "./playerRender";
import { getObjectDrawBox, getStructureSpriteKey } from "./renderPlan";
import {
  collectObjectRegions,
  type CollisionGrid,
  type ObjectRegion,
  type SemanticMap,
  type WorldPoint
} from "./world";

type RenderState = {
  map: SemanticMap;
  collision: CollisionGrid;
  camera: WorldPoint;
  player: PlayerState;
  inputState: TouchState;
  debugEnabled: boolean;
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
    ctx.scale(HOME_RENDER_ZOOM, HOME_RENDER_ZOOM);
    ctx.translate(-state.camera.x, -state.camera.y);
    this.drawGround(state.map);
    this.drawStructures(state.map);
    this.drawObjects(state.map);
    this.drawDog(state.map);
    this.drawCashier(state.map);
    this.drawPlayer(state.player);

    if (state.debugEnabled) {
      this.drawDebug(state.map, state.collision, state.player);
    }

    ctx.restore();
    this.drawTouchControls(state.inputState);
    this.drawDevInfo(state);
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
        const spriteKey = getStructureSpriteKey(cell);
        if (!spriteKey) {
          continue;
        }
        const sprite = this.manifest.tiles[spriteKey] ?? this.manifest.tiles.interior_wall;
        this.drawTileSprite(sprite, x * map.tileSize, y * map.tileSize, map.tileSize, map.tileSize);
      }
    }
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
