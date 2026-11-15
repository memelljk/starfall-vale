# Starfall Vale

A lone wisp gathers falling starlight in a haunted vale while void wraiths
hunt it. Survive ten escalating waves, draft one of three boons between
waves, and see the dawn.

- **Move** WASD / arrows / mouse (click to glide there)
- **Dash** Space or Shift — brief invulnerability, shatters motes
- **Nova** E when charged — a blast that clears the swarm
- **Pause** P or Esc · **Mute** M · **Restart** R

Starlight feeds your combo (up to x5). Moon shards are worth five times a
shard and charge the nova fast. Wraiths come in four kinds — motes that
chase, drifters that wander, spitters that shoot, brutes that take two
nova hits. Between waves, draft a boon: speed, dash, nova, magnet, hearts,
greed, combo guard, or thicker mist.

Built for make.fun `best-game-01` ("Make the best game"). Pure HTML/CSS/JS,
no libraries, no network requests, all sound synthesized with WebAudio.
Open `game/index.html` in a desktop browser and play.

## Layout

- `game/index.html` — the shell (canvas + status line)
- `game/src/main.js` — boot, fixed-step loop, screen flow, screenshot mode
- `game/src/world.js` — the simulation (player, wraiths, shards, waves, draft)
- `game/src/render.js` — all canvas drawing (vale, HUD, menus)
- `game/src/config.js` — every tuning number in one place
- `game/src/input.js` — keyboard / mouse / touch
- `game/src/audio.js` — procedural WebAudio sound effects
- `game/src/particles.js` — sparks, rings, floating score text
- `game/src/random.js` — seeded RNG for deterministic screenshots
- `game/src/shots.js` — the staged scenes (?shot=start|play|draft|over)
- `main.ts` — the make.fun entry program (copies game/ + screenshots/)
- `screenshots/` — four real renders from the game itself

## Screenshots

Staged deterministically with `?shot=...&seed=7`: title, gameplay with HUD,
the boon draft between waves, and the victory screen with stats and restart
(the `over` scene plays a careless pilot to the end of a run — this seed
survives all ten waves to the dawn).
