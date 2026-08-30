 getBloodMoonMastery() {
        const armoredTotal = Math.max(1, this.getStageConfig(3).enemies.filter(enemy => enemy.armored).length);
        const armorScore = Math.round(Math.min(this.armoredBreakthroughs, armoredTotal) / armoredTotal * 30);
        const bloodlustScore = Math.min(20, this.player.bloodlustActivations * 10);
        const comboScore = Math.round(Math.min(this.bestCombo, 10) / 10 * 25);
        const disciplineScore = Math.round(25 * Math.max(0, 1 - Math.min(this.checkpointRecoveries, 3) / 3));
        const score = armorScore + bloodlustScore + comboScore + disciplineScore;
        const rank = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 60 ? 'B' : 'C';
        const title = {
            S: 'MOONBREAKER',
            A: 'BLOODRUNNER',
            B: 'EDGE RIDER',
            C: 'ROUTE INITIATE'
        }[rank];
        const targets = [];
        const remainingArmor = Math.max(0, armoredTotal - this.armoredBreakthroughs);

        if (remainingArmor > 0) {
            targets.push(`Break ${remainingArmor} more armored Bumper${remainingArmor === 1 ? '' : 's'} with direct Dashes.`);
        }
        if (this.player.bloodlustActivations < 2) {
            const triggersNeeded = 2 - this.player.bloodlustActivations;
            targets.push(`Trigger Bloodlust ${triggersNeeded} more time${triggersNeeded === 1 ? '' : 's'} through a clean high-combo finish.`);
        }
        if (this.bestCombo < 10) {
            targets.push(`Stretch your best combo to X10 (current peak: X${this.bestCombo}).`);
        }
        if (this.checkpointRecoveries > 0) {
            targets.push(`Finish with zero checkpoint recoveries (current run: ${this.checkpointRecoveries}).`);
        }
        if (targets.length === 0) {
            targets.push('Perfect control secured — preserve the sweep and shave time on the next run.');
        }

        return {
            rank,
            title,
            score,
            breakdown: {
                armor: armorScore,
                bloodlust: bloodlustScore,
                combo: comboScore,
                discipline: disciplineScore
            },
            targets
        };
    }

    formatTime(seconds) {
        const safeSeconds = Math.max(0, Math.floor(seconds));
        return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
    }

    shake(intensity, duration) {
        // Keep the strongest active shake and let each burst decay independently.
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeTimer = Math.max(this.shakeTimer, duration);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
    }

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

    update(dt) {
        if (this.state === 'CELEBRATING') {
            this.updateFinishCelebration(dt);
            return;
        }
        if (this.state !== 'PLAYING') return;
        this.justRecovered = false;

        if (this.bloodlustFlashTimer > 0) {
            this.bloodlustFlashTimer = Math.max(0, this.bloodlustFlashTimer - dt);
        }
        if (this.checkpointFlashTimer > 0) {
            this.checkpointFlashTimer = Math.max(0, this.checkpointFlashTimer - dt);
        }
        if (this.checkpointToastTimer > 0) {
            this.checkpointToastTimer = Math.max(0, this.checkpointToastTimer - dt);
        }
        if (this.recoveryBurst) {
            this.recoveryBurst.life -= dt * 1.7;
            if (this.recoveryBurst.life <= 0) this.recoveryBurst = null;
        }

        // Handle Time Slow recovery
        if (this.slowMoTimer > 0) {
            this.slowMoTimer -= dt; // recovery uses real time
            if (this.slowMoTimer <= 0) {
                this.timeScale = 1.0;
            } else if (this.slowMoTimer < 0.4) {
                // Gradually return to normal speed
                this.timeScale = 0.2 + (1.0 - 0.2) * (1.0 - (this.slowMoTimer / 0.4));
            }
        }

        const scaledDt = dt * this.timeScale;

        this.time += scaledDt;
        this.player.update(this.input, this.level, this.audio, scaledDt);
        if (this.justRecovered) return;

        // Activate checkpoints in route order as Dash passes their bright marker.
        this.level.checkpoints.forEach(checkpoint => {
            if (!checkpoint.activated && this.player.x + this.player.width > checkpoint.x) {
                this.activateCheckpoint(checkpoint);
            }
        });
        
        // Enemy updates & collisions
        this.level.enemies.forEach(enemy => {
            if (this.justRecovered) return;
            enemy.update(this.level, scaledDt);
            if (!enemy.isDead && !this.player.isDead && !this.justRecovered) {
                if (this.player.testCollision(enemy)) {
                    // Check for offensive dash first
                    if (this.player.isDashing) {
                        enemy.die();
                        if (enemy.isArmored) this.armoredBreakthroughs++;
                        this.player.combo++;
                        this.bestCombo = Math.max(this.bestCombo, this.player.combo);
                        this.enemiesDefeated++;
                        this.player.comboTimer = 2.5;
                        this.score += 200 * this.player.combo;
                        
                        this.audio.playSFX('stomp');
                        
                        // Enhanced Particle Explosion for Dash-Kill
                        const centerX = enemy.x + enemy.width/2;
                        const centerY = enemy.y + enemy.height/2;
                        this.spawnParticles(centerX, centerY, '#00ffff', 40, 20); // Cyan blast
                        this.spawnParticles(centerX, centerY, '#ffffff', 20, 15); // White sparks
                        this.spawnParticles(centerX, centerY, '#ff00ff', 10, 10); // Magenta flare
                        if (enemy.isArmored) {
                            // Armored Bumpers only break on this direct Dash impact.
                            this.spawnParticles(centerX, centerY, '#ff8a00', 36, 18);
                            this.spawnParticles(centerX, centerY, '#fff4b0', 20, 14);
                        }
                        this.applyHighComboHealthSteal(centerX, centerY);
                        
                        this.shake(enemy.isArmored ? 24 : 15, enemy.isArmored ? 0.3 : 0.2);
                        
                        // Cooldown reduction and energy recovery on dash-kill
                        this.player.dashCooldownTimer = Math.max(0, this.player.dashCooldownTimer - COOLDOWN_REDUCTION_ON_KILL);
                        this.player.stamina = Math.min(MAX_STAMINA, this.player.stamina + STAMINA_RECOVERY_ON_KILL);

                        // Time-warp on successful dash-kill
                        this.timeScale = 0.05;
                        this.slowMoTimer = 0.4;
                    } else {
                        // Check if stomp (falling and above the enemy)
                        const playerBottom = this.player.y + this.player.height;
                        const enemyTop = enemy.y + 15; // Small threshold for stomp
                        const isStomp = this.player.vy > 0 && playerBottom < enemyTop + 20;
                        
                        if (isStomp && !enemy.isArmored) {
                            enemy.die();
                            this.player.vy = PLAYER_JUMP * 0.7; // Stomp bounce
                            this.player.y = enemy.y - this.player.height; // Snap to top
                            
                            this.player.combo++;
                            this.bestCombo = Math.max(this.bestCombo, this.player.combo);
                            this.enemiesDefeated++;
                            this.player.comboTimer = 2.5; // 2.5 seconds to continue combo
                            this.score += 100 * this.player.combo;
                            
                            this.audio.playSFX('stomp');
                            const stompX = enemy.x + enemy.width/2;
                            const stompY = enemy.y + enemy.height/2;
                            this.spawnParticles(stompX, stompY, '#FFD700', 15, 12);
                            this.applyHighComboHealthSteal(stompX, stompY);

                            // Partial cooldown reduction on stomp
                            this.player.dashCooldownTimer = Math.max(0, this.player.dashCooldownTimer - COOLDOWN_REDUCTION_ON_KILL * 0.5);
                            this.player.stamina = Math.min(MAX_STAMINA, this.player.stamina + STAMINA_RECOVERY_ON_KILL * 0.5);

                            // Brief time-warp on stomp
                            this.timeScale = 0.3;
                            this.slowMoTimer = 0.15;
                        } else {
                            // Armor blocks stomps, forcing Dash to spend stamina for the breakthrough.
                            if (enemy.isArmored && isStomp) {
                                enemy.registerArmorBlock();
                                this.player.vy = -8;
                                this.player.y = enemy.y - this.player.height;
                                const armorBlockX = enemy.x + enemy.width / 2;
                                const armorBlockY = enemy.y + enemy.height / 2;
                                this.spawnParticles(armorBlockX, armorBlockY, '#ff8a00', 18, 11);
                                this.spawnParticles(armorBlockX, armorBlockY, '#fff4b0', 8, 8);
                                this.shake(10, 0.18);
                            }
                            const damageTaken = this.player.takeDamage(CONTACT_DAMAGE);
                            if (damageTaken > 0) {
                                this.shake(12, 0.18);
                                this.spawnParticles(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, '#ff3b5c', 12, 9);
                                this.player.combo = 0;
                            }
                        }
                    }
                }
            }
        });
