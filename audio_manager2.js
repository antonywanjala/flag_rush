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
            superDash: new Audio(ASSETS.audioSuperDash)
        };
    }
