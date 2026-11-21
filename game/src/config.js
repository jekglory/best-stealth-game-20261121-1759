// LAMPLIGHT — A Quiet Heist: shared tuning constants for the stealth game.
// One job: every number the rest of the game reads, in one place.
export const TILE = 32;
export const COLS = 30;
export const ROWS = 17;
export const VIEW_W = COLS * TILE;
export const VIEW_H = ROWS * TILE;

// Player movement, in tiles per second.
export const WALK_SPEED = 4.2;
export const SNEAK_SPEED = 2.1;
export const SPRINT_SPEED = 6.4;

// Guard vision: how far a guard sees, and how wide the cone opens.
export const GUARD_VIEW_RANGE = 5.6;
export const GUARD_VIEW_HALF_ANGLE = 0.62; // radians, about 35 degrees
export const GUARD_PATROL_SPEED = 1.6;
export const GUARD_CHASE_SPEED = 3.4;
export const GUARD_SEARCH_SPEED = 2.0;

// Detection: suspicion 0..1. Rates are per second while the player is seen.
export const SPOT_RATE_CLOSE = 1.4; // within 2 tiles
export const SPOT_RATE_MID = 0.7; // within the cone at normal range
export const SPOT_RATE_FAR = 0.35; // at the cone's edge
export const SPOT_DECAY = 0.45; // suspicion lost per second unseen
export const SNEAK_SPOT_MULT = 0.45; // sneaking is much harder to spot
export const SHADOW_SPOT_MULT = 0.4; // standing in shadow shrinks detection
export const BUSH_SPOT_MULT = 0.12; // hiding in a bush almost blinds guards
export const SPRINT_SPOT_MULT = 1.6; // sprinting is loud and obvious
export const SUSPICIOUS_AT = 0.45; // suspicion level that makes a guard investigate
export const ALERT_AT = 1.0; // suspicion level that raises the alarm
export const CATCH_RANGE = 0.55; // tiles: a guard this close catches the player

// Pebbles: limited distractions, tossed with a mouse click.
export const PEBBLES_PER_LEVEL = 3;
export const PEBBLE_NOISE_RADIUS = 4.5; // tiles guards can hear
export const PEBBLE_FLY_TIME = 0.45; // seconds from hand to landing
// A pebble's ring stays visible on the floor for this long.
export const PEBBLE_MARK_SECONDS = 2.5;

// Lives, score and timing.
export const START_LIVES = 3;
export const INTEL_PER_LEVEL = 3;
export const TIME_BONUS_PER_SECOND = 12; // points per second under par
export const LEVEL_PAR_SECONDS = 90;
export const GHOST_BONUS = 1000; // never spotted on a level
export const PICKUP_SCORE = 250;

// How long a guard searches the last seen spot before giving up.
export const SEARCH_SECONDS = 6;
// How long a guard waits at each patrol waypoint.
export const WAYPOINT_PAUSE = 0.9;
// Seconds between footstep sounds while the thief walks.
export const FOOTSTEP_INTERVAL = 0.42;
