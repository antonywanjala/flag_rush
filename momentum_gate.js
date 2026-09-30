class MomentumGate {
    constructor(x, floorY, options = {}) {
        this.x = x;
        this.width = options.width || 34;
        this.height = options.height || 174;
        this.y = floorY - this.height;
        this.targetSpeed = options.targetSpeed || 12;
        this.comboRequired = options.comboRequired || 0;
        this.reward = options.reward || 'score';
        this.staminaReward = options.stamina || 0;
        this.scoreReward = options.score || 0;
        this.boostDuration = options.boostDuration || 2.2;
        this.label = options.label || 'MOMENTUM';
        this.passed = false;
        this.activated = false;
        this.activationTimer = 0;
    }

    update(dt) {
        this.activationTimer = Math.max(0, this.activationTimer - dt);
    }

    get triggerRect() {
        return {
            x: this.x - 10,
            y: this.y + 8,
            width: this.width + 20,
            height: this.height - 8
        };
    }

    draw(ctx, camera, time = 0) {
        const screenX = this.x - camera.x;
        const top = this.y - camera.y;
        const bottom = top + this.height;
        if (screenX < -120 || screenX > window.innerWidth + 120) return;

        const pulse = (Math.sin(time * 8 + this.x * 0.01) + 1) * 0.5;
        const isActive = this.activationTimer > 0;
        const color = this.passed
            ? (this.activated ? '#ffd166' : '#53627b')
            : '#7cffeb';
        const glow = isActive ? 34 : (this.passed ? 8 : 20 + pulse * 10);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = glow;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = isActive ? 8 : 4;
        ctx.beginPath();
        ctx.moveTo(screenX, bottom);
        ctx.lineTo(screenX, top + 12);
        ctx.quadraticCurveTo(screenX, top, screenX + 12, top);
        ctx.lineTo(screenX + this.width - 12, top);
        ctx.quadraticCurveTo(screenX + this.width, top, screenX + this.width, top + 12);
        ctx.lineTo(screenX + this.width, bottom);
        ctx.stroke();

        if (!this.passed) {
            ctx.globalAlpha = 0.28 + pulse * 0.14;
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 10]);
            ctx.beginPath();
            ctx.moveTo(screenX + this.width / 2, top + 18);
            ctx.lineTo(screenX + this.width / 2, bottom - 8);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(5, 12, 27, 0.88)';
        ctx.fillRect(screenX - 42, top - 49, this.width + 84, 36);
        ctx.fillStyle = color;
        ctx.font = '700 9px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.activated ? `${this.label} · CLEAR` : (this.passed ? 'MISSED' : this.label), screenX + this.width / 2, top - 35);
        if (!this.passed) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
            ctx.font = '600 7px Inter, sans-serif';
            const comboText = this.comboRequired > 0 ? `OR COMBO X${this.comboRequired}` : 'FAST LINE REWARD';
            ctx.fillText(`SPEED ${this.targetSpeed}+  ·  ${comboText}`, screenX + this.width / 2, top - 21);
        }
        ctx.restore();
    }
}
