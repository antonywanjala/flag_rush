    updateFinishCelebration(dt) {
        const celebration = this.finishCelebration;
        if (!celebration) return;
        celebration.elapsed += Math.min(dt, 0.05);
        this.finishFlashTimer = Math.max(0, this.finishFlashTimer - dt);

        const profile = celebration.profile || {};
        if (!celebration.burstOne && celebration.elapsed >= 0.34) {
            celebration.burstOne = true;
            this.spawnFinishParticles(celebration.x - 52, celebration.y + 22, celebration.colors, 34, profile.id === 'crimson-overdrive' ? 18 : 13);
            if (profile.id === 'sun-sweep') {
                this.spawnFinishParticles(celebration.x - 118, celebration.y + 46, ['#fff4b0', '#ffd166'], 18, 10);
            }
            if (profile.id === 'neon-vector') {
                this.spawnFinishParticles(celebration.x - 120, celebration.y - 24, ['#7cffeb', '#ff4fd8'], 18, 16);
            }
            this.shake(profile.id === 'crimson-overdrive' ? 12 : 8, 0.18);
        }
        if (!celebration.burstTwo && celebration.elapsed >= 0.86) {
            celebration.burstTwo = true;
            this.spawnFinishParticles(celebration.x + 56, celebration.y - 10, celebration.colors, 42, profile.id === 'crimson-overdrive' ? 22 : 16);
            if (profile.id === 'sun-sweep') {
                this.spawnFinishParticles(celebration.x + 124, celebration.y - 2, ['#ffffff', '#ff9f43'], 22, 12);
            }
            if (profile.id === 'neon-vector') {
                this.spawnFinishParticles(celebration.x + 118, celebration.y + 28, ['#a78bfa', '#7cffeb'], 22, 18);
            }
            this.shake(profile.id === 'crimson-overdrive' ? 14 : 9, 0.2);
        }
        if (!celebration.burstThree && celebration.elapsed >= 1.45) {
            celebration.burstThree = true;
            this.spawnFinishParticles(celebration.x, celebration.y + 18, ['#ffffff', ...celebration.colors], profile.id === 'crimson-overdrive' ? 78 : 52, profile.id === 'crimson-overdrive' ? 28 : 23);
            this.shockwaves.push(new Shockwave(celebration.x, celebration.y, {
                maxRadius: profile.id === 'crimson-overdrive' ? 340 : 300,
                speed: profile.id === 'crimson-overdrive' ? 28 : 24,
                palette: 'finish',
                reducedFlash: this.reducedFlash
            }));
            this.shake(profile.id === 'crimson-overdrive' ? 22 : 14, profile.id === 'crimson-overdrive' ? 0.42 : 0.3);
        }

        const particles = this.particles || [];
        let aliveParticles = 0;
        for (const particle of particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= particle.drag || 0.99;
            particle.vy = particle.vy * (particle.drag || 0.99) + (particle.gravity || 0);
            particle.life -= 0.05;
            if (particle.life > 0) particles[aliveParticles++] = particle;
        }
        particles.length = aliveParticles;
        this.particles = particles;
        this.shockwaves = this.shockwaves.filter(sw => sw.update(dt));

        const finishToast = document.getElementById('finish-toast');
        if (finishToast) {
            const signatureLabel = celebration.profile?.callout || `FINISH LINE  ·  ${celebration.stageName}`;
            finishToast.textContent = celebration.elapsed < 0.82
                ? (celebration.showdown?.callout || `${this.rival?.name || 'VEX'} OVERTAKE  ·  HOLD THE LINE`)
                : celebration.relicSetComplete && celebration.elapsed < 1.15
                    ? `FULL RELIC SET  ·  +${celebration.relicBonus.toLocaleString()} PRECISION BONUS`
                    : celebration.elapsed < 1.15
                        ? signatureLabel
                        : celebration.elapsed < 1.9
                            ? `${celebration.profile?.label || 'ROUTE BURST'}  ·  FLAG LOCKED`
                            : 'ROUTE SECURED  ·  STAGE CLEAR';
            finishToast.classList.toggle('visible', celebration.elapsed < FINISH_CELEBRATION_DURATION - 0.2);
        }
        const checkpointToast = document.getElementById('checkpoint-toast');
        if (checkpointToast) checkpointToast.classList.remove('visible');

        const targetX = celebration.x - window.innerWidth * 0.5;
        this.camera.x += (targetX - this.camera.x) * 0.12;
        this.camera.x = Math.max(0, Math.min(this.camera.x, this.level.width - window.innerWidth));
        this.updateRivalHud();
        this.updateShake(dt);

        if (celebration.elapsed >= FINISH_CELEBRATION_DURATION) {
            this.win();
        }
    }
