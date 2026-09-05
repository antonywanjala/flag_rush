    createLevel(stageId = this.selectedStage) {
        const stage = this.getStageConfig(stageId);
        this.selectedStage = stage.id;
        const levelWidth = TILE_SIZE * stage.tileCount;
        const levelHeight = window.innerHeight;
        this.level = new Level(levelWidth, levelHeight, this.images.tile, stage);
        this.particles = [];
        this.recoveryBurst = null;
        this.finishCelebration = null;
        this.finishFlashTimer = 0;
        this.shockwaves = [];
        this.hazardHitCooldown = 0;

        const floorY = levelHeight - TILE_SIZE;
        const addTile = (tileX, tileY) => {
            this.level.tiles.push({ x: tileX * TILE_SIZE, y: tileY, width: TILE_SIZE, height: TILE_SIZE });
        };

        // Hand-authored floor segments create deliberate jump rhythms and safe recovery zones.
        stage.groundSegments.forEach(([start, end]) => {
            for (let tile = start; tile <= end; tile++) addTile(tile, floorY);
        });

        // Moving platforms bridge selected Blood Moon gaps without turning the route into a maze.
        (stage.movingPlatforms || []).forEach(spec => {
            const platform = {
                x: spec.tile * TILE_SIZE,
                y: floorY - spec.rise * TILE_SIZE,
                width: spec.width || 104,
                height: 18,
                baseX: spec.tile * TILE_SIZE,
                travel: spec.travel || 24,
                speed: spec.speed || 1.2,
                phase: spec.phase || 0,
                clock: 0,
                isMovingPlatform: true
            };
            this.level.movingPlatforms.push(platform);
            this.level.tiles.push(platform);
        });

        // Platforms are authored independently from the floor so each stage can shape its own route.
        const authoredPlatforms = [
            ...stage.platforms,
            ...(stage.finishApproach?.platforms || [])
        ];
        authoredPlatforms.forEach(platform => {
            const platformY = floorY - platform.rise * TILE_SIZE;
            for (let offset = 0; offset < platform.length; offset++) {
                addTile(platform.start + offset, platformY);
            }
        });

        (stage.landmarks || []).forEach((landmarkSpot, index) => {
            this.level.landmarks.push(new BloodMoonLandmark(landmarkSpot.tile * TILE_SIZE, floorY, {
                ...landmarkSpot,
                index
            }));
        });

        stage.enemies.forEach(enemySpot => {
            const enemyY = floorY - (enemySpot.rise + 1) * TILE_SIZE;
            this.level.enemies.push(new Enemy(enemySpot.tile * TILE_SIZE, enemyY, this.images.enemy, {
                armored: enemySpot.armored
            }));
        });

        // Sweepers reuse the Bumper combat language, but follow a readable back-and-forth path.
        (stage.sweepers || []).forEach(sweeperSpot => {
            const enemyY = floorY - (sweeperSpot.rise + 1) * TILE_SIZE;
            this.level.enemies.push(new Enemy(sweeperSpot.tile * TILE_SIZE, enemyY, this.images.enemy, {
                sweeper: true,
                sweepRange: sweeperSpot.range,
                sweepSpeed: sweeperSpot.speed,
                sweepPhase: sweeperSpot.phase
            }));
        });

        (stage.timedGates || []).forEach(gateSpot => {
            this.level.timedGates.push(new TimedGate(gateSpot.tile * TILE_SIZE, floorY, gateSpot));
        });

        // Later routes reward players who carry speed or a live combo through these non-solid gates.
        (stage.momentumGates || []).forEach(gateSpot => {
            this.level.momentumGates.push(new MomentumGate(gateSpot.tile * TILE_SIZE, floorY, gateSpot));
        });

        // Named relics sit above the safe lane or over gaps, making precision routes visible and valuable.
        (stage.relics || []).forEach(relicSpot => {
            const platformY = floorY - relicSpot.rise * TILE_SIZE;
            const relicY = platformY - 50;
            this.level.relics.push(new Relic(relicSpot.tile * TILE_SIZE, relicY, this.images.relic, relicSpot));
        });

        stage.pickups.forEach(pickupSpot => {
            const pickupY = floorY - pickupSpot.rise * TILE_SIZE - 20;
            this.level.pickups.push(new Pickup(pickupSpot.tile * TILE_SIZE, pickupY, this.images.pickup));
        });

        stage.checkpoints.forEach((checkpointTile, index) => {
            this.level.checkpoints.push({
                index,
                x: checkpointTile * TILE_SIZE,
                y: floorY - TILE_SIZE,
                width: 56,
                height: TILE_SIZE,
                activated: false
            });
        });
