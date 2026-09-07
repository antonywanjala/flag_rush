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
        if (this.momentumToastTimer > 0) {
            this.momentumToastTimer = Math.max(0, this.momentumToastTimer - dt);
        }
        if (this.relicToastTimer > 0) {
            this.relicToastTimer = Math.max(0, this.relicToastTimer - dt);
        }
        if (this.relicBurst) {
            this.relicBurst.life = Math.max(0, this.relicBurst.life - dt * 1.35);
            if (this.relicBurst.life <= 0) this.relicBurst = null;
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
        this.hazardHitCooldown = Math.max(0, this.hazardHitCooldown - scaledDt);

        // Moving hazards advance before player physics so platforms are solid at their visible position.
        this.level.movingPlatforms.forEach(platform => {
            platform.clock += scaledDt;
            platform.x = platform.baseX + Math.sin(platform.clock * platform.speed + platform.phase) * platform.travel;
        });
        this.level.timedGates.forEach(gate => gate.update(scaledDt));
        this.level.momentumGates.forEach(gate => gate.update(scaledDt));
        this.level.relics.forEach(relic => relic.update(scaledDt));

        this.time += scaledDt;
        const playerPreviousRight = this.player.x + this.player.width;
        this.player.update(this.input, this.level, this.audio, scaledDt);
        if (this.justRecovered) return;

        // Momentum gates are non-solid: carry speed through the beam, or preserve a live combo to claim the reward.
        this.level.momentumGates.forEach(gate => {
            const crossedForward = playerPreviousRight < gate.x && this.player.x + this.player.width >= gate.x;
            if (gate.passed || !crossedForward) return;
            gate.passed = true;
            const verticallyAligned = this.player.y + this.player.height > gate.y + 8 && this.player.y < gate.y + gate.height;
            const speed = this.player.vx;
            const hasCombo = gate.comboRequired > 0 && this.player.combo >= gate.comboRequired;
            if (verticallyAligned && speed > 0 && (speed >= gate.targetSpeed || hasCombo)) {
                this.activateMomentumGate(gate, speed, hasCombo);
            }
        });
        if (this.justRecovered) return;

        // Closed gates are dangerous but readable: jump above them, wait for the opening, or Dash through.
        this.level.timedGates.forEach(gate => {
            if (!gate.isOpen && !this.player.isDashing && this.hazardHitCooldown <= 0 && this.player.testCollision(gate.rect)) {
                const playerIsLeft = this.player.x + this.player.width / 2 < gate.x + gate.width / 2;
                this.player.x = playerIsLeft ? gate.x - this.player.width - 2 : gate.x + gate.width + 2;
                this.player.vx = playerIsLeft ? -4 : 4;
                const damageTaken = this.player.takeDamage(24);
                this.hazardHitCooldown = 0.72;
                this.player.combo = 0;
                this.shake(13, 0.2);
                this.spawnParticles(gate.x + gate.width / 2, this.player.y + this.player.height / 2, '#ff4d5e', 16, 11);
                if (damageTaken > 0) this.spawnParticles(gate.x + gate.width / 2, gate.y + gate.height * 0.5, '#fff4b0', 10, 9);
            }
        });
        if (this.justRecovered) return;

        // Activate checkpoints in route order as Dash passes their bright marker.
        this.level.checkpoints.forEach(checkpoint => {
            if (!checkpoint.activated && this.player.x + this.player.width > checkpoint.x) {
                this.activateCheckpoint(checkpoint);
            }
        });

        // Vex surfaces at selected route markers, turning landmarks into readable race beats.
        this.level.rivalLandmarks.forEach(spot => {
            if (!spot.triggered && this.player.x + this.player.width > spot.x) {
                spot.triggered = true;
                this.rival?.appearAtLandmark(spot);
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
                        this.rival?.registerAdvantage(
                            enemy.isArmored ? 'ARMOR BREAK' : 'COMBO CHAIN',
                            enemy.isArmored ? 0.024 : (this.player.combo >= 2 ? 0.008 : 0.003)
                        );
                        
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
                        this.timeScale = 0.2;
                        this.slowMoTimer = 0.22;
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
                            this.rival?.registerAdvantage('COMBO CHAIN', this.player.combo >= 2 ? 0.01 : 0.004);
                            
                            this.audio.playSFX('stomp');
                            const stompX = enemy.x + enemy.width/2;
                            const stompY = enemy.y + enemy.height/2;
                            this.spawnParticles(stompX, stompY, '#FFD700', 15, 12);
                            this.applyHighComboHealthSteal(stompX, stompY);

                            // Partial cooldown reduction on stomp
                            this.player.dashCooldownTimer = Math.max(0, this.player.dashCooldownTimer - COOLDOWN_REDUCTION_ON_KILL * 0.5);
                            this.player.stamina = Math.min(MAX_STAMINA, this.player.stamina + STAMINA_RECOVERY_ON_KILL * 0.5);

                            // Brief time-warp on stomp
                            this.timeScale = 0.42;
                            this.slowMoTimer = 0.08;
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
