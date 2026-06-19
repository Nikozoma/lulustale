export const VIRTUAL_VIEWPORT = {
  width: 1280,
  height: 720
} as const;

export const HOME_RENDER_ZOOM = 2.25;
export const OVERWORLD_RENDER_ZOOM = 1.35;
export const PLAYER_RENDER_SCALE = 1.25;
export const PLAYER_SPRITE_ANCHOR_X = 0.5;
export const PLAYER_SPRITE_ANCHOR_Y = 1;
export const PLAYER_SPRITE_FOOT_OFFSET_Y = 38;
export const INTERACTION_RADIUS_PX = 42;

export const PLAYER = {
  speedPxPerSecond: 168,
  collisionRadiusPx: 11,
  renderScale: PLAYER_RENDER_SCALE,
  frameWidth: 48,
  frameHeight: 64,
  spriteAnchorX: PLAYER_SPRITE_ANCHOR_X,
  spriteAnchorY: PLAYER_SPRITE_ANCHOR_Y,
  spriteFootOffsetY: PLAYER_SPRITE_FOOT_OFFSET_Y,
  animationFrameSeconds: 0.105
} as const;
