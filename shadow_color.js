// Recovery aura telegraphs the short safe window after a checkpoint respawn.
        if (this.recoveryTimer > 0 && !this.isDead) {
            const recoveryPulse = 1 + Math.sin(Date.now() / 55) * 0.16;
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowBlur = 28;
            ctx.shadowColor = '#7cffeb';
            ctx.strokeStyle = `rgba(124, 255, 235, ${0.58 + Math.sin(Date.now() / 80) * 0.18})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(
                this.x - camera.x + this.width / 2,
                this.y - camera.y + this.height / 2,
                this.width * 0.78 * recoveryPulse,
                this.height * 0.68 * recoveryPulse,
                0,
                0,
                Math.PI * 2
            );
            ctx.stroke();
        }

        // Momentum boost aura marks the short acceleration window after a clean gate pass.
        if (this.momentumBoostTimer > 0 && !this.isDead) {
            const pulse = 1 + Math.sin(Date.now() / 55) * 0.12;
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowBlur = 22;
            ctx.shadowColor = '#7cffeb';
            ctx.strokeStyle = `rgba(124, 255, 235, ${0.5 + Math.sin(Date.now() / 70) * 0.16})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(
                this.x - camera.x + this.width / 2,
                this.y - camera.y + this.height / 2,
                this.width * 0.82 * pulse,
                this.height * 0.7 * pulse,
                0,
                0,
                Math.PI * 2
            );
            ctx.stroke();
        }

        // Bloodlust aura and invincibility telegraph
        if (this.bloodlustTimer > 0 && !this.isDead) {
            const pulse = 1 + Math.sin(Date.now() / 70) * 0.12;
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowBlur = 26;
            ctx.shadowColor = '#ff4d00';
            ctx.strokeStyle = `rgba(255, 209, 102, ${0.55 + Math.sin(Date.now() / 90) * 0.2})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(
                this.x - camera.x + this.width / 2,
                this.y - camera.y + this.height / 2,
                this.width * 0.72 * pulse,
                this.height * 0.62 * pulse,
                0,
                0,
                Math.PI * 2
            );
            ctx.stroke();
        }

        // Color-cycling glow for high combo
        if (this.combo >= 3 && !this.isDead) {
            const hue = (Date.now() / 5) % 360;
            const glowColor = `hsl(${hue}, 100%, 60%)`;
            ctx.shadowBlur = 20 + Math.sin(Date.now() / 150) * 10;
            ctx.shadowColor = glowColor;
            
            // Apply a slight color overlay pulse
            if (Math.sin(Date.now() / 100) > 0) {
                ctx.globalCompositeOperation = 'source-atop';
            }
        }

        if (this.isDashing) {
            ctx.globalAlpha = 0.6;
        }

        // Chromatic Aberration Pulse
        if (this.chromaticPulse > 0 && tintedImages && tintedImages.red && tintedImages.blue) {
            const offset = this.chromaticPulse * 40; // Max 8px offset
            ctx.save();
            ctx.globalAlpha = this.chromaticPulse * 2;
            ctx.globalCompositeOperation = 'screen';
            
            const drawSplit = (img, offX) => {
                if (!this.facingRight) {
                    ctx.save();
                    ctx.translate(this.x - camera.x + this.width + offX, this.y - camera.y);
                    ctx.scale(-1, 1);
                    ctx.drawImage(img, 0, 0, this.width, this.height);
                    ctx.restore();
                } else {
                    ctx.drawImage(img, this.x - camera.x + offX, this.y - camera.y, this.width, this.height);
                }
            };

            drawSplit(tintedImages.red, -offset);
            drawSplit(tintedImages.blue, offset);
            ctx.restore();
        }

        if (!this.facingRight) {
            ctx.translate(this.x - camera.x + this.width, this.y - camera.y);
            ctx.scale(-1, 1);
            ctx.drawImage(this.img, 0, 0, this.width, this.height);
        } else {
            ctx.drawImage(this.img, this.x - camera.x, this.y - camera.y, this.width, this.height);
        }
        ctx.restore();
    }
}
