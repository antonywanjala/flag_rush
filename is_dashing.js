draw() {
        const isDashing = Boolean(this.player?.isDashing);
        // Normal frames render directly to the visible canvas. The backbuffer is reserved for dash compositing.
        const ctx = isDashing ? this.backCtx : this.ctx;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        if (!this.level) return;

        ctx.save();
        ctx.translate(this.camera.shakeX, this.camera.shakeY);

        // Background (Parallax), with a subtle route-specific mood shift.
        const bgWidth = window.innerHeight * (16/9);
        const bgOffset = -(this.camera.x * 0.2) % bgWidth;
        for (let i = 0; i <= Math.ceil(window.innerWidth / bgWidth) + 1; i++) {
            ctx.drawImage(this.images.bg, bgOffset + i * bgWidth, 0, bgWidth, window.innerHeight);
        }
        const stageTint = this.level.stage?.tint;
        if (stageTint) {
            ctx.fillStyle = stageTint;
            ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
        }

        // Tiles
        this.level.tiles.forEach(tile => {
            if (tile.x + tile.width > this.camera.x && tile.x < this.camera.x + window.innerWidth) {
                ctx.drawImage(this.images.tile, tile.x - this.camera.x, tile.y - this.camera.y, tile.width, tile.height);
            }
        });

        // Sliding platform rails and motion accents make the safe landing window obvious at a glance.
        this.level.movingPlatforms.forEach(platform => {
            if (platform.x + platform.width < this.camera.x - 80 || platform.x > this.camera.x + window.innerWidth + 80) return;
            const screenX = platform.x - this.camera.x;
            const screenY = platform.y - this.camera.y;
            const railY = screenY + platform.height / 2;
            const railStart = platform.baseX - platform.travel - this.camera.x + platform.width / 2;
            const railEnd = platform.baseX + platform.travel - this.camera.x + platform.width / 2;
            const pulse = (Math.sin(platform.clock * 8) + 1) * 0.5;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = 'rgba(124, 255, 235, 0.48)';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#7cffeb';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 7]);
            ctx.beginPath();
            ctx.moveTo(railStart, railY);
            ctx.lineTo(railEnd, railY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.strokeStyle = `rgba(255, 209, 102, ${0.62 + pulse * 0.28})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(screenX, screenY, platform.width, platform.height);
            ctx.fillStyle = '#7cffeb';
            ctx.fillRect(screenX + 10, screenY + 5, platform.width - 20, 3);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(5, 12, 27, 0.8)';
            ctx.fillRect(screenX + platform.width / 2 - 31, screenY - 25, 62, 16);
            ctx.fillStyle = '#fff4b0';
            ctx.font = '700 8px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('SLIDE', screenX + platform.width / 2, screenY - 13);
            ctx.restore();
        });

        // Blood Moon landmarks turn combat and recovery beats into a visible procession.
        this.level.landmarks.forEach(landmark => landmark.draw(ctx, this.camera, this.time));

        // Checkpoint beacons
        this.level.checkpoints.forEach(checkpoint => {
            if (checkpoint.x + checkpoint.width < this.camera.x || checkpoint.x > this.camera.x + window.innerWidth) return;
            const screenX = checkpoint.x - this.camera.x;
            const baseY = checkpoint.y + checkpoint.height - this.camera.y;
            const isActive = checkpoint.index <= this.activeCheckpointIndex;
            const pulse = 1 + Math.sin(Date.now() / 120 + checkpoint.index) * 0.12;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowBlur = isActive ? 20 : 12;
            ctx.shadowColor = isActive ? '#7cffeb' : '#ffd166';
            ctx.strokeStyle = isActive ? '#7cffeb' : '#ffd166';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(screenX + 26, baseY);
            ctx.lineTo(screenX + 26, baseY - 76);
            ctx.stroke();
            ctx.fillStyle = isActive ? '#7cffeb' : '#ffd166';
            ctx.beginPath();
            ctx.moveTo(screenX + 28, baseY - 74);
            ctx.lineTo(screenX + 62, baseY - 62);
            ctx.lineTo(screenX + 28, baseY - 50);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.arc(screenX + 26, baseY - 78, 7 * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(5, 12, 27, 0.72)';
            ctx.fillRect(screenX + 5, baseY - 112, 43, 18);
            ctx.fillStyle = isActive ? '#7cffeb' : '#ffd166';
            ctx.font = '700 10px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`CP ${checkpoint.index + 1}`, screenX + 26, baseY - 99);
            ctx.restore();
        });

        // Timed gates sit in the lane as clear, high-contrast timing tests.
        this.level.timedGates.forEach(gate => {
            if (gate.x + gate.width < this.camera.x - 70 || gate.x > this.camera.x + window.innerWidth + 70) return;
            gate.draw(ctx, this.camera);
        });

        // Momentum gates are bright, non-solid route markers that invite a fast commitment.
        this.level.momentumGates.forEach(gate => {
            if (gate.x + gate.width < this.camera.x - 120 || gate.x > this.camera.x + window.innerWidth + 120) return;
            gate.draw(ctx, this.camera, this.time);
        });

        // Named relics sit above the route with their own readable glow and label.
        this.level.relics.forEach(relic => {
            if (relic.x + relic.width < this.camera.x - 90 || relic.x > this.camera.x + window.innerWidth + 90) return;
            relic.draw(ctx, this.camera, this.time);
        });

        // Goal
        ctx.drawImage(this.images.flag, this.level.goal.x - this.camera.x, this.level.goal.y - this.camera.y, this.level.goal.width, this.level.goal.height);

        // During the clear sequence, the flag becomes the visual center of the route.
        if (this.finishCelebration) {
            const celebration = this.finishCelebration;
            const spotlightX = celebration.x - this.camera.x;
            const spotlightY = celebration.y - this.camera.y;
            const pulse = 1 + Math.sin(celebration.elapsed * 8) * 0.06;
            const beamWidth = 120 + Math.sin(celebration.elapsed * 5) * 12;
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.2 + Math.min(0.28, celebration.elapsed * 0.08);
            ctx.fillStyle = celebration.colors[0];
            ctx.beginPath();
            ctx.moveTo(spotlightX - 26, 0);
            ctx.lineTo(spotlightX + 26, 0);
            ctx.lineTo(spotlightX + beamWidth, spotlightY + 155);
            ctx.lineTo(spotlightX - beamWidth, spotlightY + 155);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 0.85;
            ctx.shadowBlur = 34;
            ctx.shadowColor = celebration.colors[1];
            ctx.strokeStyle = celebration.colors[1];
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(spotlightX, spotlightY, (46 + celebration.elapsed * 8) * pulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 0.95;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(spotlightX, spotlightY, 6 + Math.sin(celebration.elapsed * 10) * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Enemies
        this.level.enemies.forEach(enemy => {
            if (enemy.x + enemy.width > this.camera.x && enemy.x < this.camera.x + window.innerWidth) {
                enemy.draw(ctx, this.camera);
            }
        });

        // Pickups
        this.level.pickups.forEach(pickup => {
            if (pickup.x + pickup.width > this.camera.x && pickup.x < this.camera.x + window.innerWidth) {
                pickup.draw(ctx, this.camera);
            }
        });

        // Player
        this.player.draw(ctx, this.camera, this.tintedImages);

        // Relic collection burst lingers just long enough to read the named objective.
        if (this.relicBurst) {
            const burst = this.relicBurst;
            const progress = 1 - burst.life;
            const burstX = burst.x - this.camera.x;
            const burstY = burst.y - this.camera.y;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = burst.life;
            ctx.strokeStyle = burst.color;
            ctx.shadowBlur = 26;
            ctx.shadowColor = burst.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(burstX, burstY, 24 + progress * 58, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = burst.life * 0.72;
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i) / 8;
                const inner = 20 + progress * 28;
                const outer = inner + 12 + progress * 18;
                ctx.beginPath();
                ctx.moveTo(burstX + Math.cos(angle) * inner, burstY + Math.sin(angle) * inner);
                ctx.lineTo(burstX + Math.cos(angle) * outer, burstY + Math.sin(angle) * outer);
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#fff4b0';
            ctx.font = '700 10px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${burst.name} SECURED`, burstX, burstY - 42 - progress * 18);
            ctx.restore();
        }

        // Shockwaves
        this.shockwaves.forEach(sw => sw.draw(ctx, this.camera));

        // Respawn recovery burst
        if (this.recoveryBurst) {
            const burst = this.recoveryBurst;
            const burstX = burst.x - this.camera.x;
            const burstY = burst.y - this.camera.y;
            const burstProgress = 1 - burst.life;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = burst.life;
            ctx.strokeStyle = '#7cffeb';
            ctx.shadowBlur = 26;
            ctx.shadowColor = '#7cffeb';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(burstX, burstY, 18 + burstProgress * 100, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = burst.life * 0.7;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(burstX, burstY, 8 + burstProgress * 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Particles
        if (this.particles) {
            this.particles.forEach(p => {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                if (p.isStretched) {
                    const length = 20;
                    ctx.fillRect(p.x - this.camera.x, p.y - this.camera.y, length, 2);
                } else {
                    const size = p.isFinish ? (p.size || 4) * (0.7 + p.life * 0.45) : 4;
                    ctx.fillRect(p.x - this.camera.x, p.y - this.camera.y, size, size);
                }
            });
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        // Speed Lines (Draw in screen space on backbuffer)
        if (this.player && this.player.isDashing) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            for (let i = 0; i < (this.isLowPowerDevice ? 5 : 8); i++) {
                const x = Math.random() * window.innerWidth;
                const y = Math.random() * window.innerHeight;
                const length = 100 + Math.random() * 200;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + (this.player.facingRight ? -length : length), y);
                ctx.stroke();
            }
        }

        // --- Final Output to Main Canvas with Radial Blur ---
        // A normal frame is already on-screen; only dash frames need the backbuffer copy.
        if (isDashing) {
            this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            this.ctx.drawImage(this.backbuffer, 0, 0, window.innerWidth, window.innerHeight);
            const centerX = this.player.x - this.camera.x + this.player.width / 2;
            const centerY = this.player.y - this.camera.y + this.player.height / 2;
            
            this.ctx.save();
            this.ctx.globalAlpha = 0.15;
            this.ctx.globalCompositeOperation = 'screen';
            
            // Keep the speed warp expressive without redrawing the full viewport four times.
            const blurLayers = this.isLowPowerDevice ? 1 : 2;
            for (let i = 1; i <= blurLayers; i++) {
                const scale = 1 + (i * 0.012);
                const w = window.innerWidth * scale;
                const h = window.innerHeight * scale;
                const offX = (window.innerWidth - w) * (centerX / window.innerWidth);
                const offY = (window.innerHeight - h) * (centerY / window.innerHeight);
                
                this.ctx.drawImage(this.backbuffer, offX, offY, w, h);
            }
            this.ctx.restore();
        }

        // Bloodlust post-processing: a warm, pulsing grade over the whole viewport.
        if (this.player && this.player.bloodlustTimer > 0) {
            const remaining = this.player.bloodlustTimer / BLOODLUST_DURATION;
            const pulse = (Math.sin(Date.now() / 85) + 1) * 0.5;
            const gradeAlpha = 0.08 + pulse * 0.05 + (1 - remaining) * 0.04;
            const edgeAlpha = 0.12 + pulse * 0.06;

            this.ctx.save();
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = `rgba(255, 91, 0, ${gradeAlpha})`;
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            this.ctx.globalCompositeOperation = 'multiply';
            this.ctx.fillStyle = `rgba(255, 198, 110, ${0.06 + pulse * 0.03})`;
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

            // Subtle gold vignette keeps the center readable while framing the state.
            const gradient = this.ctx.createRadialGradient(
                window.innerWidth / 2,
                window.innerHeight / 2,
                Math.min(window.innerWidth, window.innerHeight) * 0.22,
                window.innerWidth / 2,
                window.innerHeight / 2,
                Math.max(window.innerWidth, window.innerHeight) * 0.72
            );
            gradient.addColorStop(0, 'rgba(255, 190, 70, 0)');
            gradient.addColorStop(1, `rgba(255, 72, 0, ${edgeAlpha})`);
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            this.ctx.restore();
        }

        // Checkpoint capture/recovery flashes use a cooler signal than Bloodlust.
        if (this.checkpointFlashTimer > 0) {
            const checkpointFlashAlpha = Math.min(0.34, this.checkpointFlashTimer * 0.62);
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = `rgba(124, 255, 235, ${checkpointFlashAlpha})`;
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            this.ctx.restore();
        }

        // A short white-hot activation flash sits above the sustained grade.
        if (this.bloodlustFlashTimer > 0) {
            const flashProgress = this.bloodlustFlashTimer / 0.24;
            const flashAlpha = Math.min(0.82, flashProgress * 0.82);
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = `rgba(255, 238, 190, ${flashAlpha})`;
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            this.ctx.restore();
        }

        if (this.finishCelebration) {
            const celebration = this.finishCelebration;
            const pulse = (Math.sin(celebration.elapsed * 7) + 1) * 0.5;
            const fadeIn = Math.min(1, celebration.elapsed / 0.65);
            const gradient = this.ctx.createRadialGradient(
                window.innerWidth / 2,
                window.innerHeight * 0.45,
                40,
                window.innerWidth / 2,
                window.innerHeight * 0.45,
                Math.max(window.innerWidth, window.innerHeight) * 0.8
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${0.03 + pulse * 0.03})`);
            gradient.addColorStop(0.55, `rgba(34, 12, 78, ${0.04 * fadeIn})`);
            gradient.addColorStop(1, `rgba(4, 7, 20, ${0.24 * fadeIn})`);
            this.ctx.save();
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            this.ctx.restore();
        }

        if (this.finishFlashTimer > 0) {
            const flashAlpha = Math.min(0.72, (this.finishFlashTimer / FINISH_FLASH_DURATION) * 0.72);
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            this.ctx.restore();
        }
    }

    loop(timestamp = 0) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = Math.min(0.05, Math.max(0, (timestamp - this.lastTime) / 1000));
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame(this.frameRequest);
    }
