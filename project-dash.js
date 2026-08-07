const TILE_SIZE = 64;
const GRAVITY = 0.6;
const FRICTION = 0.85;
const PLAYER_ACCEL = 1.5;
const PLAYER_RUN_ACCEL = 2.5;
const PLAYER_JUMP = -14;
const PLAYER_RUN_JUMP = -17;
const DASH_SPEED = 22;
const DASH_DURATION = 0.2;
const DASH_COOLDOWN = 0.6;
const DASH_STAMINA_COST = 25;
const ENEMY_SPEED = 2;
const MAX_STAMINA = 100;
const STAMINA_DRAIN = 40; // per second
const STAMINA_REGEN = 25; // per second
const COOLDOWN_REDUCTION_ON_KILL = 0.25; // seconds
const STAMINA_RECOVERY_ON_KILL = 15;

const ASSETS = {
    hero: 'assets/hero-dash-black.webp',
    enemy: 'assets/enemy-bumper.webp',
    bg: 'assets/level-bg.webp',
    tile: 'assets/ground-tile.webp',
    flag: 'assets/finish-flag.webp',
    pickup: 'assets/speed-boost-powerup.webp',
    audioMusic: 'assets/audio/upbeat-stage-music.mp3',
    audioJump: 'assets/audio/jump-sfx.mp3',
    audioStomp: 'assets/audio/stomp-sfx.mp3',
    audioDash: 'assets/audio/dash-sfx.mp3',
    audioPickup: 'assets/audio/powerup-pickup.mp3',
    audioShockwave: 'assets/audio/shockwave-sfx.mp3',
    audioSuperDash: 'assets/audio/super-dash-sfx.mp3'
};
