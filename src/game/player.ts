import { DEFAULT_PLAYER_SPEED_MULTIPLIER, PLAYER, WALK_MAX_STRENGTH, getPlayerMovementSpeed } from "./constants";
import { canOccupy, type RuntimeMap, type WorldPoint } from "./foundation";

export type Facing = "down" | "left_down" | "left" | "left_up" | "up" | "right_up" | "right" | "right_down";

export type PlayerState = {
  position: WorldPoint;
  facing: Facing;
  isMoving: boolean;
  isRunning: boolean;
  animationTime: number;
  action: string | null;
  actionTime: number;
};

export function createPlayer(position: WorldPoint, facing: Facing = "down"): PlayerState {
  return {
    position: { ...position },
    facing,
    isMoving: false,
    isRunning: false,
    animationTime: 0,
    action: null,
    actionTime: 0
  };
}

export function updatePlayer(
  player: PlayerState,
  inputVector: WorldPoint,
  dt: number,
  map: RuntimeMap,
  speedMultiplier = DEFAULT_PLAYER_SPEED_MULTIPLIER
): void {
  if (player.action) {
    player.isMoving = false;
    player.isRunning = false;
    player.actionTime += dt;
    return;
  }

  const movement = normalizeMovementInput(inputVector);
  if (movement.strength < 0.001) {
    player.isMoving = false;
    player.isRunning = false;
    player.animationTime += dt;
    return;
  }

  const running = movement.strength > WALK_MAX_STRENGTH;
  const speed = getPlayerMovementSpeed(running, speedMultiplier);
  const distance = speed * dt;
  const nextX = { x: player.position.x + movement.direction.x * distance, y: player.position.y };
  const nextY = { x: player.position.x, y: player.position.y + movement.direction.y * distance };

  if (canOccupy(map, nextX, PLAYER.collider)) {
    player.position.x = nextX.x;
  }
  if (canOccupy(map, nextY, PLAYER.collider)) {
    player.position.y = nextY.y;
  }

  player.facing = facingFromVector(movement.direction);
  player.isMoving = true;
  player.isRunning = running;
  // The approved four-frame locomotion loops were timed against the original
  // 1.00x movement rates. Scaling animation time with traveled speed preserves
  // that distance-per-cycle relationship and prevents faster debug rates from
  // turning into visible foot sliding.
  player.animationTime += dt * speedMultiplier;
}

export function facingFromVector(vector: WorldPoint): Facing {
  if (Math.abs(vector.x) < 0.35) {
    return vector.y < 0 ? "up" : "down";
  }
  if (vector.x < 0) {
    if (Math.abs(vector.y) < 0.25) {
      return "left";
    }
    return vector.y < -0.25 ? "left_up" : "left_down";
  }
  if (Math.abs(vector.y) < 0.25) {
    return "right";
  }
  return vector.y < -0.25 ? "right_up" : "right_down";
}

function normalizeMovementInput(inputVector: WorldPoint): { direction: WorldPoint; strength: number } {
  const length = Math.hypot(inputVector.x, inputVector.y);
  if (length < 0.001) {
    return { direction: { x: 0, y: 0 }, strength: 0 };
  }
  return {
    direction: { x: inputVector.x / length, y: inputVector.y / length },
    strength: Math.min(length, 1)
  };
}
