    testCollision(other) {
        return this.x < other.x + other.width &&
               this.x + this.width > other.x &&
               this.y < other.y + other.height &&
               this.y + this.height > other.y;
    }

    heal(amount) {
        const previousHealth = this.health;
        this.health = Math.min(MAX_HEALTH, this.health + amount);
        return this.health - previousHealth;
    }

    activateBloodlust() {
        if (this.bloodlustTimer > 0) return false;
        this.bloodlustTimer = BLOODLUST_DURATION;
        this.damageCooldownTimer = BLOODLUST_DURATION;
        this.bloodlustActivations++;
        return true;
    }

    takeDamage(amount) {
        if (this.bloodlustTimer > 0 || this.damageCooldownTimer > 0 || this.isDead) return 0;
        this.health = Math.max(0, this.health - amount);
        this.damageCooldownTimer = DAMAGE_COOLDOWN;
        if (this.health <= 0) this.die();
        return amount;
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.vy = -10;
        window.dispatchEvent(new CustomEvent('player-died'));
    }
