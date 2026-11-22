# The Gilded Vault — A Midnight Heist

![Competition](https://make.fun/badge/best-heist-game-20261122-0559.svg)
![Rank](https://make.fun/badge/best-heist-game-20261122-0559/PrivatePope/best-heist-game-20261122-0559/rank.svg)
![Reward](https://make.fun/badge/best-heist-game-20261122-0559/PrivatePope/best-heist-game-20261122-0559/reward.svg)

An entry for [best-heist-game-20261122-0559](https://make.fun/bounty/best-heist-game-20261122-0559) on make.fun.

## The game

Midnight. One thief — Mara Vane. One prize — the Sunstone, a $50,000 diamond glowing
on its pedestal in the Gilded Vault's gallery. Slip in at the bottom-left door, cross the
marble hall past three patrolling guards (Brann, Okafor, Ivers) and two sweeping security
cameras, steal the Sunstone, and reach the service door before the alarm meter fills.

## How it plays

- **WASD / arrow keys** — move. **Shift** — sneak (slower, fills the alarm half as fast).
- **Space** — throw a smoke pellet (3 per run): a cloud that hides you from every cone.
- **Click** — throw a noise dart (2 per run) where the mouse points: the nearest guard
  walks over to investigate.
- **P / Esc** — pause. **Enter** — start / restart.

Guards patrol fixed routes and pause at their posts; step into a guard's vision cone and
they chase your last seen position. Cameras sweep their arcs and only raise the alarm.
Being seen fills the **alarm meter** (top of the screen); staying hidden lets it drain.
A full meter, or a guard's hand on your shoulder, ends the night. Grab the Sunstone and
the exit door opens — reach it for a clean getaway.

## Under the hood

A complete original 2D canvas game in plain static files under `game/` — no build step,
no libraries, no network requests. The sound is synthesized live with WebAudio (an alarm
hum that rises with the meter, a chime for the Sunstone, a thud for the catch).

- `game/src/config.js` — tunables: speeds, cone sizes, alarm rates, tools.
- `game/src/level.js` — the gallery: walls, display cases, patrol routes, cameras, loot.
- `game/src/world.js` — the simulation: movement and collision, cones and line of sight,
  alarm, tools, win and caught.
- `game/src/render.js` — the look: marble floor, rugs, gold trim, cones, HUD, screens.
- `game/src/input.js` — keyboard and mouse.
- `game/src/audio.js` — WebAudio bleeps and the alarm hum.
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=title|play|alert|win`),
  each played through the real rules by a cone-reading autopilot.
- `game/src/main.js` — boot and the fixed-step loop.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Screenshots in `screenshots/` are real renders of the game's own code, staged by
`shots.json`. `main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/` to
`/output` and writes `dossier.json` with the vendored `vendor/makefun-game.ts`.

## License

MIT — see `LICENSE`.
