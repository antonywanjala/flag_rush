checkCollisions(level, axis) {
        let hit = false;
        const tiles = level.getNearbyTiles(this);
        for (const tile of tiles) {
            if (this.testCollision(tile)) {
                hit = true;
                if (axis === 'horizontal') {
                    if (this.vx > 0) this.x = tile.x - this.width;
                    if (this.vx < 0) this.x = tile.x + tile.width;
                    this.vx = 0;
                } else {
                    if (this.vy > 0) {
                        this.y = tile.y - this.height;
                        this.grounded = true;
                        this.vy = 0;
                    }
                    if (this.vy < 0) {
                        this.y = tile.y + tile.height;
                        this.vy = 0;
                    }
                }
            }
        }
        return hit;
    }

    testCollision(other) {
        return this.x < other.x + other.width &&
               this.x + this.width > other.x &&
               this.y < other.y + other.height &&
               this.y + this.height > other.y;
    }
