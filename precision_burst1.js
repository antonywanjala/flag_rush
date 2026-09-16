    drawPrecisionBurst(ctx) {
        const burst = this.precisionBurst;
        if (!burst) return;
        const progress = 1 - burst.life;
        const screenX = burst.x - this.camera.x;
        const screenY = burst.y - this.camera.y;
        if (screenX < -180 || screenX > window.innerWidth + 180) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = burst.life;
        ctx.strokeStyle = burst.color;
        ctx.shadowBlur = 22;
        ctx.shadowColor = burst.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 18 + progress * 48, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = burst.life * 0.7;
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            const inner = 18 + progress * 22;
            const outer = inner + 10 + progress * 15;
            ctx.beginPath();
            ctx.moveTo(screenX + Math.cos(angle) * inner, screenY + Math.sin(angle) * inner);
            ctx.lineTo(screenX + Math.cos(angle) * outer, screenY + Math.sin(angle) * outer);
            ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = burst.life;
        ctx.fillStyle = 'rgba(5, 12, 27, 0.92)';
        ctx.fillRect(screenX - 112, screenY - 48 - progress * 18, 224, 42);
        ctx.strokeStyle = `${burst.color}dd`;
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX - 112, screenY - 48 - progress * 18, 224, 42);
        ctx.fillStyle = burst.color;
        ctx.font = '700 8px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`PRECISION // ${burst.lineLabel}`, screenX, screenY - 32 - progress * 18);
        ctx.fillStyle = '#fff4b0';
        ctx.font = '700 9px Orbitron, sans-serif';
        ctx.fillText(`${burst.name}  ·  +${burst.reward.toLocaleString()} PTS`, screenX, screenY - 19 - progress * 18);
        ctx.restore();
    }
