import type { Facing } from "./player";
import type { WorldPoint } from "./world";

export type BirdGangEnemy = {
  id: number;
  position: WorldPoint;
  defeated: boolean;
  hitFlashSeconds: number;
};

export type BirdGangRuntimeState = {
  enemies: BirdGangEnemy[];
};

export const SWORD_ATTACK_RANGE_PX = 82;
export const SWORD_ATTACK_CONE_DOT = 0.35;

export function createBirdGangRuntimeState(): BirdGangRuntimeState {
  return { enemies: [] };
}

export function spawnBirdGang(anchor: WorldPoint): BirdGangRuntimeState {
  return {
    enemies: [
      { id: 1, position: { x: anchor.x - 112, y: anchor.y - 44 }, defeated: false, hitFlashSeconds: 0 },
      { id: 2, position: { x: anchor.x - 64, y: anchor.y - 88 }, defeated: false, hitFlashSeconds: 0 },
      { id: 3, position: { x: anchor.x - 16, y: anchor.y - 44 }, defeated: false, hitFlashSeconds: 0 }
    ]
  };
}

export function applySwordAttack(
  state: BirdGangRuntimeState,
  playerPosition: WorldPoint,
  facing: Facing
): BirdGangRuntimeState {
  const attackDirection = facingToVector(facing);
  let hitEnemyId: number | null = null;

  for (const enemy of state.enemies) {
    if (enemy.defeated) {
      continue;
    }

    const toEnemy = {
      x: enemy.position.x - playerPosition.x,
      y: enemy.position.y - playerPosition.y
    };
    const distance = Math.hypot(toEnemy.x, toEnemy.y);
    if (distance > SWORD_ATTACK_RANGE_PX || distance < 0.001) {
      continue;
    }

    const dot = (toEnemy.x / distance) * attackDirection.x + (toEnemy.y / distance) * attackDirection.y;
    if (dot >= SWORD_ATTACK_CONE_DOT) {
      hitEnemyId = enemy.id;
      break;
    }
  }

  if (hitEnemyId === null) {
    return state;
  }

  return {
    enemies: state.enemies.map((enemy) =>
      enemy.id === hitEnemyId ? { ...enemy, defeated: true, hitFlashSeconds: 0.16 } : enemy
    )
  };
}

export function updateBirdGang(state: BirdGangRuntimeState, dt: number): BirdGangRuntimeState {
  return {
    enemies: state.enemies.map((enemy) => ({
      ...enemy,
      hitFlashSeconds: Math.max(0, enemy.hitFlashSeconds - dt)
    }))
  };
}

export function areAllBirdsDefeated(state: BirdGangRuntimeState): boolean {
  return state.enemies.length > 0 && state.enemies.every((enemy) => enemy.defeated);
}

function facingToVector(facing: Facing): WorldPoint {
  switch (facing) {
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
    case "left_up":
      return normalized({ x: -1, y: -0.5 });
    case "left_down":
      return normalized({ x: -1, y: 0.5 });
    case "right_up":
      return normalized({ x: 1, y: -0.5 });
    case "right_down":
      return normalized({ x: 1, y: 0.5 });
  }
}

function normalized(vector: WorldPoint): WorldPoint {
  const length = Math.hypot(vector.x, vector.y);
  return { x: vector.x / length, y: vector.y / length };
}
