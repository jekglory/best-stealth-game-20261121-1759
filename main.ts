// LAMPLIGHT — A Quiet Heist: the hand-in program (Node 22, stdlib only).
// It copies game/ and screenshots/ from beside this file to /output and
// writes /output/dossier.json with the vendored make.fun library.
// The grader's /output directory is never deleted or recreated: only its
// contents are cleared, and it is created only when it does not exist.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps, shared by the dossier build below.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// Create the output directory only when it is missing; never remove it.
mkdirSync(out, { recursive: true });
// Clear only the contents, so a stale file from an earlier run cannot leak
// into this entry. The directory itself stays exactly as the grader gave it.
for (const entry of readdirSync(out)) {
  rmSync(join(out, entry), { recursive: true, force: true });
}
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files, in all, or a path under game/ over 1000 bytes). The two runs
// the grader makes must write identical bytes, so nothing here reads the
// clock, the network, or anything outside this repository.
writeFileSync(join(out, 'dossier.json'), buildDossier(out, CAPS));
