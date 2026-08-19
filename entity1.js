class Player extends Entity {
    constructor(x, y, img) {
        super(x, y, 48, 64, img);
        this.jumpCooldown = false;
        this.canDoubleJump = false;
        this.facingRight = true;
        this.score = 0;
        this.isDead = false;
        this.health = MAX_HEALTH;
        this.damageCooldownTimer = 0;
        this.bloodlustTimer = 0;
        this.stamina = MAX_STAMINA;
        this.dashTimer = 0;
        this.dashCooldownTimer = 0;
        this.isDashing = false;
        this.trail = [];
        this.combo = 0;
        this.comboTimer = 0;
        this.consecutiveDashes = 0;
        this.dashPressed = false;
        this.chromaticPulse = 0;
        this.trailTimer = 0;
    }
