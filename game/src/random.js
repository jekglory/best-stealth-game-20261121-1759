// Seeded random numbers: a tiny mulberry32 generator so every run with the
// same seed plays the same way. No Math.random anywhere in the game logic.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick an integer in [min, max) from a seeded generator.
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min));
}

// Pick one element of an array from a seeded generator.
export function randPick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

// A float in [min, max) from a seeded generator.
export function randFloat(rng, min, max) {
  return min + rng() * (max - min);
}

// A stable hash of a short string, used to turn a level name into a seed.
// FNV-1a: cheap, deterministic, and the same on every machine.
export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
