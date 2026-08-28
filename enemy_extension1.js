class Enemy extends Entity {
    constructor(x, y, img, options = {}) {
        super(x, y, 48, 48, img);
        this.vx = ENEMY_SPEED;
        this.isDead = false;
        this.deathTimer = 0;
        this.isArmored = Boolean(options.armored);
        this.armorFlashTimer = 0;
    }

    update(level, dt = 0) {
        if (this.armorFlashTimer > 0) {
            this.armorFlashTimer = Math.max(0, this.armorFlashTimer - dt);
        }
        if (this.isDead) {
            this.deathTimer++;
            return;
        }

        this.x += this.vx;
        
        // Turn around if hitting a wall or edge
        const tiles = level.getNearbyTiles(this);
        let hitWall = false;
        for (const tile of tiles) {
            if (this.testCollision(tile)) {
                hitWall = true;
                break;
            }
        }

        // Simple edge detection: check tile below front
        const checkX = this.vx > 0 ? this.x + this.width : this.x;
        const tileBelow = level.getTileAt(checkX, this.y + this.height + 2);
        
        if (hitWall || !tileBelow) {
            this.vx *= -1;
            this.x += this.vx;
        }
    }

    registerArmorBlock() {
        this.armorFlashTimer = 0.2;
    }

    drawArmor(ctx, camera) {
        const x = this.x - camera.x;
        const y = this.y - camera.y;
        const pulse = 1 + Math.sin(Date.now() / 120) * 0.04;
        const isBlocking = this.armorFlashTimer > 0;
        const armorColor = isBlocking ? '#fff4b0' : '#ff8a00';

        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = armorColor;
        ctx.fillStyle = isBlocking ? 'rgba(255, 244, 176, 0.28)' : 'rgba(92, 24, 18, 0.58)';
        ctx.shadowBlur = isBlocking ? 22 : 12;
        ctx.shadowColor = armorColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + 9, y + 13);
        ctx.lineTo(x + 16, y + 7);
        ctx.lineTo(x + 32, y + 7);
        ctx.lineTo(x + 39, y + 13);
        ctx.lineTo(x + 42, y + 31);
        ctx.lineTo(x + 32, y + 42);
        ctx.lineTo(x + 16, y + 42);
        ctx.lineTo(x + 6, y + 31);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = armorColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 9, y + 25);
        ctx.lineTo(x + 39, y + 25);
        ctx.moveTo(x + 15, y + 10);
        ctx.lineTo(x + 18, y + 40);
        ctx.moveTo(x + 33, y + 10);
        ctx.lineTo(x + 30, y + 40);
        ctx.stroke();

        ctx.fillStyle = armorColor;
        ctx.beginPath();
        ctx.arc(x + 24, y + 25, 3.5 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '700 8px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ARMOR', x + 24, y - 6);
        ctx.restore();
    }

    testCollision(other) {
        return this.x < other.x + other.width &&
               this.x + this.width > other.x &&
               this.y < other.y + other.height &&
               this.y + this.height > other.y;
    }

    die() {
        this.isDead = true;
        this.vx = 0;
    }

    draw(ctx, camera) {
        if (this.isDead) {
            ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 30);
            ctx.drawImage(this.img, this.x - camera.x, this.y - camera.y + (this.height * 0.5), this.width, this.height * 0.5);
            ctx.globalAlpha = 1;
        } else {
            super.draw(ctx, camera);
            if (this.isArmored) this.drawArmor(ctx, camera);
        }
    }
}

class Pickup extends Entity {
    constructor(x, y, img) {
        super(x, y, 40, 40, img);
        this.bobOffset = 0;
        this.isCollected = false;
    }

    update(dt) {
        this.bobOffset += dt * 5;
        this.y += Math.sin(this.bobOffset) * 0.5;
    }

    draw(ctx, camera) {
        if (this.isCollected) return;
        super.draw(ctx, camera);
    }
}

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

// --- Level & Game Engine ---
class Level {
    constructor(width, height, tileImg, stage) {
        this.width = width;
        this.height = height;
        this.tileImg = tileImg;
        this.stage = stage;
        this.tiles = [];
        this.enemies = [];
        this.pickups = [];
        this.checkpoints = [];
        this.goal = null;
    }

    getNearbyTiles(entity) {
        const margin = TILE_SIZE * 2;
        return this.tiles.filter(t => 
            t.x > entity.x - margin && t.x < entity.x + margin &&
            t.y > entity.y - margin && t.y < entity.y + margin
        );
    }

    getTileAt(x, y) {
        return this.tiles.find(t => 
            x >= t.x && x < t.x + t.width &&
            y >= t.y && y < t.y + t.height
        );
    }
}

class Game {
    constructor() {
        this.canvas = document.createElement('canvas');
        document.getElementById('game-container').appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        // Backbuffer for post-processing
        this.backbuffer = document.createElement('canvas');
        this.backCtx = this.backbuffer.getContext('2d');

        this.input = new InputManager();
        this.audio = new AudioManager();
        
        this.player = null;
        this.level = null;
        this.camera = { x: 0, y: 0, shakeX: 0, shakeY: 0 };
        this.shakeTimer = 0;
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
        this.shockwaves = [];
        this.timeScale = 1.0;
        this.slowMoTimer = 0;
        this.bloodlustFlashTimer = 0;
        this.checkpointFlashTimer = 0;
        this.checkpointToastTimer = 0;
        this.checkpointMessage = '';
        this.recoveryBurst = null;
        this.finishCelebration = null;
        this.finishFlashTimer = 0;
        this.state = 'START'; // START, PLAYING, CELEBRATING, WIN, GAMEOVER
        this.unlockedStage = this.loadUnlockedStage();
        this.selectedStage = this.unlockedStage;
        this.secondaryStage = null;
        this.awaitingBriefing = false;
        this.runStats = null;
        this.enemiesDefeated = 0;
        this.armoredBreakthroughs = 0;
        this.bestCombo = 0;
        this.checkpointRecoveries = 0;
        this.activeCheckpointIndex = -1;
        this.justRecovered = false;
        
        this.score = 0;
        this.time = 0;
        this.lastTime = 0;

        this.images = {};
        this.tintedImages = { red: null, blue: null };
        
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('player-died', () => this.handleFailure());
        window.addEventListener('dash-impact', (e) => {
            this.shake(20, 0.3); // Increased shake intensity and duration
            if (e.detail) {
                // Determine collision side for better particle placement
                const x = this.player.vx > 0 ? e.detail.x + this.player.width : e.detail.x;
                const y = e.detail.y + this.player.height / 2;
                
                // Spawn a bigger, more energetic burst
                this.spawnParticles(x, y, '#ffffff', 25, 15); // White sparks
                this.spawnParticles(x, y, '#00ffff', 15, 10); // Cyan highlights
                
                // Play impact sound
                this.audio.playSFX('dash'); 

                // Trigger brief time-warp (hit-stop) for impact weight
                this.timeScale = 0.05;
                this.slowMoTimer = 0.3; 
            }
        });
        window.addEventListener('dash-finisher', (e) => {
            if (e.detail) {
                this.shockwaves.push(new Shockwave(e.detail.x, e.detail.y));
                this.shake(30, 0.6); // Increased intensity and duration for finisher
                this.audio.playSFX('shockwave');
                this.spawnParticles(e.detail.x, e.detail.y, '#00ffff', 60, 25);
                this.spawnParticles(e.detail.x, e.detail.y, '#ffffff', 40, 15);
                
                // Trigger Time-Slow
                this.timeScale = 0.2;
                this.slowMoTimer = 0.8; // seconds in real time
            }
        });

        window.addEventListener('combo-reset', () => {
            this.shake(8, 0.2); // Gentle shake on combo loss
        });

        window.addEventListener('spawn-dash-blur', (e) => {
            if (e.detail && this.state === 'PLAYING') {
                const { x, y, facingRight } = e.detail;
                if (!this.particles) this.particles = [];
                this.particles.push({
                    x, y,
                    vx: facingRight ? -15 : 15, // Move opposite to dash
                    vy: (Math.random() - 0.5) * 2,
                    life: 0.5,
                    color: '#ffffff',
                    isStretched: true
                });
            }
        });
        
        document.getElementById('start-btn').addEventListener('click', () => {
            if (this.awaitingBriefing) {
                this.awaitingBriefing = false;
                this.selectedStage = this.secondaryStage || this.selectedStage;
                const overlay = document.getElementById('msg-overlay');
                overlay.classList.remove('results-overlay');
                this.prepareStartScreen();
                return;
            }
            this.start(this.secondaryStage || this.selectedStage);
        });
        
        this.resize();
        this.updateStageHud();
        this.prepareStartScreen();
    }
