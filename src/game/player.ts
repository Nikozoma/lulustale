import { PLAYER } from "./constants";
import { canOccupyCircle, type CollisionGrid, type SemanticMap, type WorldPoint } from "./world";

export type Facing = "down" | "up" | "left_down" | "left_up" | "right_down" | "right_up";

export type PlayerState = {
  position: WorldPoint;
  facing: Facing;
  isMoving: boolean;
  animationTime: number;
};

export function createPlayer(position: WorldPoint): PlayerState {
  return {
    position: { ...position },
    facing: "down",
    isMoving: false,
    animationTime: 0
  };
}

export function updatePlayer(
  player: PlayerState,
  inputVector: WorldPoint,
  dt: number,
  map: SemanticMap,
  collision: CollisionGrid
): void {
  const length = Math.hypot(inputVector.x, inputVector.y);

  if (length < 0.001) {
    player.isMoving = false;
    player.animationTime = 0;
    return;
  }

  const direction = {
    x: inputVector.x / length,
    y: inputVector.y / length
  };
  const distance = PLAYER.speedPxPerSecond * Math.min(length, 1) * dt;
  const nextX = {
    x: player.position.x + direction.x * distance,
    y: player.position.y
  };
  const nextY = {
    x: player.position.x,
    y: player.position.y + direction.y * distance
  };

  if (canOccupyCircle(map, collision, nextX, PLAYER.collisionRadiusPx)) {
    player.position.x = nextX.x;
  }

  if (canOccupyCircle(map, collision, nextY, PLAYER.collisionRadiusPx)) {
    player.position.y = nextY.y;
  }

  player.facing = facingFromVector(direction);
  player.isMoving = true;
  player.animationTime += dt;
}

function facingFromVector(vector: WorldPoint): Facing {
  if (Math.abs(vector.x) < 0.35) {
    return vector.y < 0 ? "up" : "down";
  }

  if (vector.x < 0) {
    return vector.y < -0.25 ? "left_up" : "left_down";
  }

  return vector.y < -0.25 ? "right_up" : "right_down";
}
