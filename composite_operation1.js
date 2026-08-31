class TimedGate {
    constructor(x, floorY, options = {}) {
        this.x = x;
        this.width = options.width || 24;
        this.height = options.height || 156;
        this.y = floorY - this.height;
        this.cycle = options.cycle || 3.5;
        this.openDuration = options.openDuration || 1;
        this.phase = options.phase || 0;
        this.clock = this.phase;
        this.isOpen = false;
        this.label = options.label || 'GATE';
    }

    update(dt) {
        this.clock = (this.clock + dt) % this.cycle;
        this.isOpen = this.clock < this.openDuration;
    }

    get rect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }

    draw(ctx, camera) {
        const screenX = this.x - camera.x;
        const top = this.y - camera.y;
        const bottom = top + this.height;
        const pulse = (Math.sin(this.clock * 12) + 1) * 0.5;
        const closingSoon = !this.isOpen && this.clock < this.openDuration + 0.6;
        const color = this.isOpen ? '#7cffeb' : (closingSoon ? '#fff4b0' : '#ff4d5e');

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(255, 77, 0, 0.42)';
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 9]);
        ctx.beginPath();
        ctx.moveTo(screenX - 34, top - 18);
        ctx.lineTo(screenX - 34, bottom + 2);
        ctx.moveTo(screenX + this.width + 34, top - 18);
        ctx.lineTo(screenX + this.width + 34, bottom + 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.shadowBlur = this.isOpen ? 14 : 24 + pulse * 8;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(screenX, top);
        ctx.lineTo(screenX, bottom);
        ctx.moveTo(screenX + this.width, top);
        ctx.lineTo(screenX + this.width, bottom);
        if (!this.isOpen) {
            ctx.moveTo(screenX, top + this.height * 0.5);
            ctx.lineTo(screenX + this.width, top + this.height * 0.5);
        }
        ctx.stroke();

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(5, 12, 27, 0.82)';
        ctx.fillRect(screenX - 28, top - 42, this.width + 56, 18);
        ctx.fillStyle = color;
        ctx.font = '700 9px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.isOpen ? 'OPEN · DASH' : (closingSoon ? 'WARNING' : 'CLOSED'), screenX + this.width / 2, top - 29);

        const arrowOffset = (this.clock * 22) % 24;
        ctx.globalAlpha = 0.5 + pulse * 0.35;
        ctx.fillStyle = color;
        for (let y = top + 14 - arrowOffset; y < bottom; y += 24) {
            ctx.beginPath();
            ctx.moveTo(screenX - 22, y);
            ctx.lineTo(screenX - 12, y + 6);
            ctx.lineTo(screenX - 22, y + 12);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(screenX + this.width + 22, y);
            ctx.lineTo(screenX + this.width + 12, y + 6);
            ctx.lineTo(screenX + this.width + 22, y + 12);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
}
