// The Gilded Vault's one room: a marble gallery at midnight. Walls and display cases are
// cover — they block movement, sight and cones. The Sunstone sits on its pedestal in the
// vault alcove at the top right; the thief slips in at the bottom left and must reach the
// service door at the bottom right once the stone is taken.
export function buildLevel(random) {
  const W = 1280;
  const H = 800;
  const walls = [
    // Outer shell.
    { x: 0, y: 0, w: W, h: 26 },
    { x: 0, y: H - 26, w: W, h: 26 },
    { x: 0, y: 0, w: 26, h: H },
    { x: W - 26, y: 0, w: 26, h: H },
    // Interior partitions that split the gallery into lanes with gaps to slip through.
    { x: 300, y: 26, w: 22, h: 210 },
    { x: 300, y: 330, w: 22, h: 190 },
    { x: 620, y: 250, w: 22, h: 260 },
    { x: 620, y: 26, w: 22, h: 130 },
    { x: 920, y: 430, w: 22, h: 344 },
    { x: 920, y: 26, w: 22, h: 240 },
    { x: 1050, y: 430, w: 204, h: 22 },
  ];
  // Display cases: low glass boxes that block sight and movement but not the eye over them.
  const cases = [
    { x: 120, y: 180, w: 110, h: 60, label: 'Amber Idol' },
    { x: 120, y: 480, w: 110, h: 60, label: 'Jade Mask' },
    { x: 420, y: 120, w: 110, h: 60, label: 'Pearl Crown' },
    { x: 420, y: 600, w: 110, h: 60, label: 'Ruby Sceptre' },
    { x: 720, y: 120, w: 110, h: 60, label: 'Opal Mirror' },
    { x: 720, y: 620, w: 110, h: 60, label: 'Gold Scarab' },
  ];
  const guards = [
    {
      name: 'Brann',
      waypoints: [
        { x: 200, y: 340 },
        { x: 480, y: 340 },
        { x: 480, y: 640 },
        { x: 200, y: 640 },
      ],
      pause: 1.6,
    },
    {
      name: 'Okafor',
      waypoints: [
        { x: 760, y: 200 },
        { x: 1080, y: 200 },
        { x: 1080, y: 380 },
        { x: 760, y: 380 },
      ],
      pause: 1.2,
    },
    {
      name: 'Ivers',
      waypoints: [
        { x: 560, y: 560 },
        { x: 840, y: 560 },
        { x: 840, y: 720 },
        { x: 560, y: 720 },
      ],
      pause: 2.0,
    },
  ];
  const cameras = [
    { x: 340, y: 250, baseAngle: Math.PI / 2, sweep: 0.9, phase: 0 },
    { x: 960, y: 280, baseAngle: -Math.PI / 2, sweep: 1.1, phase: 1.4 },
  ];
  const loot = { x: 1150, y: 130, name: 'The Sunstone', value: 50000 };
  const entry = { x: 90, y: 700 };
  const exit = { x: 1150, y: 735, w: 90, h: 26 };
  const rugs = [
    { x: 90, y: 300, w: 150, h: 260 },
    { x: 660, y: 300, w: 200, h: 90 },
    { x: 990, y: 480, w: 220, h: 200 },
  ];
  // A little seeded variety in the patrol pauses, so seeds still matter.
  for (const guard of guards) guard.pause += random.range(-0.3, 0.3);
  return { walls, cases, guards, cameras, loot, entry, exit, rugs };
}

/** Every solid rectangle in the room (walls plus display cases). */
export function solidRects(level) {
  return level.walls.concat(level.cases);
}
