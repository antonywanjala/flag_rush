    update(dt, player, game) {
        const goalX = Math.max(1, game.level?.goal?.x || game.level?.width || 1);
        const comboPressure = Math.min(player.combo, 8) * 0.009;
        const gatePressure = Math.min(game.momentumGatesCleared, 4) * 0.012;
        const armorPressure = Math.min(game.armoredBreakthroughs, 5) * 0.008;
        const recoveryPenalty = Math.min(game.checkpointRecoveries, 4) * 0.018;
        const paceMultiplier = Math.max(0.78, 1 + comboPressure + gatePressure + armorPressure - recoveryPenalty);

        // Vex keeps a readable, dangerous pace but never silently clears the route first.
        this.progress = Math.min(0.985, this.progress + (this.baseSpeed * paceMultiplier * dt) / goalX);
        this.playerBoost = Math.max(0, this.playerBoost - dt * 0.012);
        this.flashTimer = Math.max(0, this.flashTimer - dt);
        this.landmarkTimer = Math.max(0, this.landmarkTimer - dt);

        const dashProgress = Math.max(0, Math.min(1, player.x / goalX + this.playerBoost));
        const gap = dashProgress - this.progress;
        const signedGapSeconds = gap * goalX / Math.max(360, this.baseSpeed);
        const gapSeconds = Math.abs(signedGapSeconds);
        if (dashProgress >= 0.72 && signedGapSeconds <= -0.45) {
            this.wasBehindLate = true;
            this.lateDeficitSeconds = Math.max(this.lateDeficitSeconds, -signedGapSeconds);
        }
        if (this.flashTimer <= 0) {
            if (gap > 0.035) {
                this.status = `YOU +${gapSeconds.toFixed(1)}s`;
            } else if (gap < -0.035) {
                this.status = `${this.name} +${gapSeconds.toFixed(1)}s`;
            } else {
                this.status = 'NECK AND NECK';
            }
        }
    }
