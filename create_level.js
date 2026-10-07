    createLevel(stageId = this.selectedStage) {
        const stage = this.getStageConfig(stageId);
        this.selectedStage = stage.id;
        const levelWidth = TILE_SIZE * stage.tileCount;
        const levelHeight = window.innerHeight;
        this.level = new Level(levelWidth, levelHeight, this.images.tile, stage);
        this.level.modifier = this.getModifierConfig(this.activeModifierId);
        this.rival = new RivalRunner(stage.rival, this.images.hero);
        this.rival.reset();
        (stage.rivalSpots || []).forEach((tile, index) => {
            this.level.rivalLandmarks.push({
                index,
                x: tile * TILE_SIZE,
                label: `PACE MARKER ${String(index + 1).padStart(2, '0')}`,
                triggered: false
            });
        });
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

        // Each route fork adds an elevated, hazardous cut above the reliable ground line.
        // The player commits by crossing its marker on the upper lane or staying low.
        this.level.routeForks = (stage.routeForks || []).map((spec, index) => {
            const fork = {
                ...spec,
                index,
                x: spec.tile * TILE_SIZE,
                width: (spec.platformLength || 4) * TILE_SIZE,
                choiceX: (spec.tile + (spec.choiceOffset || 3.2)) * TILE_SIZE,
                fastY: floorY - (spec.rise || 2) * TILE_SIZE,
                checked: false,
                selected: null,
                exitGate: null
            };
            const platformStart = Math.floor(spec.tile);
            const platformEnd = Math.ceil(spec.tile + (spec.platformLength || 4)) - 1;
            for (let tile = platformStart; tile <= platformEnd; tile++) {
                addTile(tile, fork.fastY);
            }
            const hazardRise = Number.isFinite(spec.hazardRise) ? spec.hazardRise : (spec.rise || 2);
            const hazardY = floorY - (hazardRise + 1) * TILE_SIZE;
            this.level.enemies.push(new Enemy(spec.hazardTile * TILE_SIZE, hazardY, this.images.enemy, {
                sweeper: true,
                sweepRange: spec.hazardRange || 30,
                sweepSpeed: spec.hazardSpeed || 1.8,
                sweepPhase: index * 1.3 + stage.id * 0.4
            }));
            return fork;
        });

        // Wind currents occupy selected gaps and reverse by route sector so the hazard is readable,
        // authored, and learnable rather than a hidden random shove.
        (stage.windCurrents || []).forEach((currentSpot, index) => {
            this.level.windCurrents.push(new WindCurrent(currentSpot.startTile * TILE_SIZE, floorY, {
                ...currentSpot,
                windIndex: index
            }));
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

        // Pace signs are generated from the authored route beats so every major
        // commitment gets a readable warning without adding collision geometry.
        buildPaceSignSpecs(stage).forEach((signSpec, index) => {
            this.level.paceSigns.push(new PaceSign(signSpec.tile * TILE_SIZE, floorY, {
                ...signSpec,
                theme: stage.paceTheme,
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

        // Optional mastery lines are one-shot route tests: take the high cut, carry a combo,
        // or cross a Bloodlust beacon while the overdrive state is active.
        const challengeConfig = stage.challenges || {};
        this.level.challengeShortcuts = (challengeConfig.shortcuts || []).map((spot, index) => ({
            ...spot,
            index,
            x: spot.tile * TILE_SIZE,
            width: 82,
            y: floorY - (spot.rise || 2) * TILE_SIZE,
            checked: false,
            earned: false
        }));
        this.level.comboVaults = (challengeConfig.comboVaults || []).map((spot, index) => ({
            ...spot,
            index,
            x: spot.tile * TILE_SIZE,
            width: 82,
            y: floorY - TILE_SIZE * 2.2,
            checked: false,
            earned: false
        }));
        this.level.bloodlustBeacons = (challengeConfig.bloodlustBeacons || []).map((spot, index) => ({
            ...spot,
            index,
            x: spot.tile * TILE_SIZE,
            width: 92,
            y: floorY - TILE_SIZE * 1.8,
            checked: false,
            earned: false
        }));

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

        const padProfile = {
            sun: { launchSpeed: 15.5, launchJump: -8.8 },
            neon: { launchSpeed: 16.5, launchJump: -9.5 },
            blood: { launchSpeed: 17.5, launchJump: -10.2 }
        }[stage.paceTheme?.id || 'sun'] || { launchSpeed: 16, launchJump: -9 };
        buildRecoveryLaunchPadSpecs(stage).forEach((padSpec, index) => {
            this.level.recoveryPads.push(new RecoveryLaunchPad(padSpec.tile * TILE_SIZE, floorY, {
                ...padSpec,
                theme: stage.paceTheme,
                index,
                ...padProfile
            }));
        });

        const goalOffset = stage.finishApproach?.goalOffset || 5;
        const goalX = levelWidth - TILE_SIZE * goalOffset;
        this.level.goal = { x: goalX, y: floorY - TILE_SIZE * 3.5, width: 120, height: 240 };
        this.player = new Player(100, floorY - TILE_SIZE * 2, this.images.hero);
        this.camera.x = 0;
        this.camera.y = 0;
        this.activeCheckpointIndex = -1;
        this.checkpointRecoveries = 0;
        this.safeRecoveryChoices = 0;
        this.redlineRecoveryChoices = 0;
        this.pendingRecovery = null;
        this.momentumGatesCleared = 0;
        this.precisionLinesCleared = 0;
        this.precisionBonusScore = 0;
        this.windPrecisionTypes = new Set();
        this.windPrecisionChain = 0;
        this.windPrecisionBestChain = 0;
        this.windLastPrecisionIndex = -1;
        this.windContractsCompleted = new Set();
        this.windContractBonusScore = 0;
        this.relicsCollected = 0;
        this.relicSetBonusAwarded = false;
        this.relicSetComplete = false;
        this.relicToastTimer = 0;
        this.relicMessage = '';
        this.relicBurst = null;
        this.justRecovered = false;
        this.checkpointMessage = '';
        this.checkpointToastTimer = 0;
        this.momentumMessage = '';
        this.momentumToastTimer = 0;
        this.precisionMessage = '';
        this.precisionToastTimer = 0;
        this.precisionBurst = null;
    }
