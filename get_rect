// --- Entities ---
class Entity {
    constructor(x, y, w, h, img) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.img = img;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false;
    }

    get rect() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }

    draw(ctx, camera) {
        ctx.drawImage(this.img, this.x - camera.x, this.y - camera.y, this.width, this.height);
    }
}
