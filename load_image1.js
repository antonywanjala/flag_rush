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
    audioSuperDash: 'assets/audio/super-dash-sfx.mp3',
    audioFinish: 'assets/audio/finish-fanfare.mp3'
};

// --- Helper: Asset Loader ---
async function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.src = src;
    });
}

// --- Audio Manager ---
class AudioManager {
    constructor() {
        this.context = null;
        this.music = new Audio(ASSETS.audioMusic);
        this.music.loop = true;
        this.sfx = {
            jump: new Audio(ASSETS.audioJump),
            stomp: new Audio(ASSETS.audioStomp),
            dash: new Audio(ASSETS.audioDash),
            pickup: new Audio(ASSETS.audioPickup),
            shockwave: new Audio(ASSETS.audioShockwave),
            superDash: new Audio(ASSETS.audioSuperDash),
            finish: new Audio(ASSETS.audioFinish)
        };
    }

    init() {
        if (!this.context) {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        }
        this.music.play().catch(e => console.log("Audio play failed, needs gesture"));
    }

    playSFX(name) {
        if (this.sfx[name]) {
            const sound = this.sfx[name].cloneNode();
            sound.play();
        }
    }

    stopMusic() {
        this.music.pause();
    }
}
