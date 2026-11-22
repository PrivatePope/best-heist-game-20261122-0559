// Tunables for The Gilded Vault: one room, one thief, three guards, two cameras.
export const WORLD = { width: 1280, height: 800 };
export const STEP = 1 / 60;
export const BEST_KEY = 'gilded-vault-best-loot';

export const THIEF = {
  radius: 13,
  walkSpeed: 205,
  sneakSpeed: 105,
  grabRadius: 34,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  chaseSpeed: 118,
  coneRange: 235,
  coneHalfAngle: 0.56,
  touchRadius: 26,
};

export const CAMERA = {
  coneRange: 265,
  coneHalfAngle: 0.42,
  sweepSpeed: 0.55,
};

export const ALARM = {
  guardPerSecond: 46,
  cameraPerSecond: 50,
  decayPerSecond: 9,
  sneakFactor: 0.45,
  max: 100,
};

export const TOOLS = { smoke: 3, dart: 2, smokeSeconds: 3.2 };
export const SMOKE_RADIUS = 95;
