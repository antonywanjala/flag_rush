class Shockwave {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = options.maxRadius || 350;
        this.life = 1.0;
        this.speed = options.speed || 12;
        this.palette = options.palette || 'cyan';
        this.hitEnemies = new Set();
    }

    update(dt) {
        this.radius = Math.min(this.maxRadius, this.radius + this.speed);
        this.life -= dt * 1.8;
        return this.life > 0 && this.radius < this.maxRadius;
    }

    draw(ctx, camera) {
        ctx.save();
        
        // Multi-layered refraction ripple effect
        const ripples = 3;
        const isBloodlust = this.palette === 'bloodlust';
        for (let i = 0; i < ripples; i++) {
            const r = this.radius - (i * 15);
            if (r < 0) continue;
            
            const alpha = this.life * (1 - i/ripples);
            ctx.beginPath();
            ctx.arc(this.x - camera.x, this.y - camera.y, r, 0, Math.PI * 2);
            
            // Alternating colors for chromatic refraction look
            if (i === 0) {
                ctx.strokeStyle = isBloodlust
                    ? `rgba(255, 77, 0, ${alpha * 0.9})`
                    : `rgba(0, 255, 255, ${alpha * 0.8})`;
                ctx.lineWidth = 15 * alpha;
            } else if (i === 1) {
                ctx.strokeStyle = isBloodlust
                    ? `rgba(255, 209, 102, ${alpha * 0.7})`
                    : `rgba(255, 255, 255, ${alpha * 0.5})`;
                ctx.lineWidth = 8 * alpha;
            } else {
                ctx.strokeStyle = isBloodlust
                    ? `rgba(255, 150, 40, ${alpha * 0.45})`
                    : `rgba(200, 255, 255, ${alpha * 0.3})`;
                ctx.lineWidth = 4 * alpha;
            }
            
            ctx.stroke();
        }
        
        ctx.restore();
    }
}
