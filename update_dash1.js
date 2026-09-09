    updateShake(dt) {
        if (this.shakeTimer > 0) {
            this.shakeTimer = Math.max(0, this.shakeTimer - dt);
            const decay = this.shakeDuration > 0 ? this.shakeTimer / this.shakeDuration : 0;
            const currentIntensity = this.shakeIntensity * decay * decay;
            this.camera.shakeX = (Math.random() - 0.5) * currentIntensity;
            this.camera.shakeY = (Math.random() - 0.5) * currentIntensity;
            if (this.shakeTimer <= 0) {
                this.shakeIntensity = 0;
                this.shakeDuration = 0;
            }
        } else if (this.player && this.player.isDashing) {
            this.camera.shakeX = (Math.random() - 0.5) * 4;
            this.camera.shakeY = (Math.random() - 0.5) * 4;
        } else {
            this.camera.shakeX = 0;
            this.camera.shakeY = 0;
        }
    }
