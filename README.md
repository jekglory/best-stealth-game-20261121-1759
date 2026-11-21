[![Make the best stealth game](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![Rank](https://make.fun/badge/best-stealth-game-20261121-1759/jekglory/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![Reward](https://make.fun/badge/best-stealth-game-20261121-1759/jekglory/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

# LAMPLIGHT — A Quiet Heist

A top-down stealth game in a museum at night, built for make.fun's "Make the best stealth game" bounty ($50 in USDC).

You are a thief in a dark gallery. Collect 3 intel files on each of 3 levels, then reach the green EXIT unseen. Guards patrol with visible vision cones; get spotted and the alarm rises, get caught and you lose a life. Hide in bushes, slip through shadows, sneak past patrols — or toss a pebble with a mouse click to lure a guard away.

## Play

```sh
node serve.ts
```

Then open http://localhost:8081 in a desktop browser.

- **WASD / arrows** — move
- **Shift** — sneak (slow, quiet, harder to spot)
- **Space** — sprint (fast, noisy)
- **Click** — toss a pebble to distract a nearby guard
- **P** — pause · **M** — mute

## Details

- 3 hand-designed levels, 3–5 guards each, with patrol / suspicious / alert / search states and a detection meter
- Cover that matters: walls, crates and display cases block sight; shadow floors shrink detection; bushes hide you
- Score from intel, time bonus and a ghost bonus for never being spotted
- Deterministic seeded RNG; WebAudio synth sounds only, no audio files, no network requests
- Pure Node stdlib hand-in: `node main.ts` writes the dossier to `/output` (or `$MAKEFUN_OUTPUT_DIR`)
- Staged screenshots via `?shot=start|patrol|alert|win&seed=20261121`, autopilot via `?autopilot=1`
