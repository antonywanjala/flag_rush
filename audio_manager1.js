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
