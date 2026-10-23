    start(stageId = this.selectedStage) {
        const requestedStage = Number(stageId);
        this.selectedStage = requestedStage <= this.unlockedStage ? requestedStage : this.unlockedStage;
        this.routeSelectionStage = this.selectedStage;
        this.activeRouteGoal = this.getRouteGoal(this.selectedStage);
        this.awaitingBriefing = false;
        this.activeModifierId = this.getModifierConfig(this.selectedModifierId).id;
        this.audio.init();
        this.createLevel(this.selectedStage);
        this.updateStageHud();
        this.state = 'PLAYING';
        this.updateRivalHud();
        this.updateModifierHud();
        this.score = 0;
        this.time = 0;
        this.enemiesDefeated = 0;
        this.armoredBreakthroughs = 0;
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
        this.bestCombo = 0;
        this.checkpointRecoveries = 0;
        this.safeRecoveryChoices = 0;
        this.redlineRecoveryChoices = 0;
        this.recoveryPadStats = {
            usedPads: new Set(),
            launches: 0,
            cleanBoosts: 0,
            cleanMastery: 0,
            landingScore: 0,
            gradeCounts: { EDGE: 0, CLEAN: 0, PERFECT: 0 },
            chain: 0,
            bestChain: 0,
            damagedSinceLaunch: false
        };
        this.recoveryPadContractsCompleted = new Set();
        this.recoveryPadBonusScore = 0;
        this.pendingRecovery = null;
        this.activeCheckpointIndex = -1;
        this.checkpointFlashTimer = 0;
        this.checkpointToastTimer = 0;
        this.checkpointMessage = '';
        this.momentumToastTimer = 0;
        this.momentumMessage = '';
        this.precisionToastTimer = 0;
        this.precisionMessage = '';
        this.precisionBurst = null;
        this.padGradeToastTimer = 0;
        this.padGradeMessage = '';
        this.relicToastTimer = 0;
        this.relicMessage = '';
        this.relicBurst = null;
        this.justRecovered = false;
        this.finishCelebration = null;
        this.finishFlashTimer = 0;
        this.hazardHitCooldown = 0;
        this.runStats = null;
        this.updateWindContractHud();
        this.updateRecoveryPadHud();
        const overlay = document.getElementById('msg-overlay');
        overlay.classList.add('hidden');
        overlay.classList.remove('results-overlay', 'recovery-overlay');
        this.ui.recoveryChoice?.classList.remove('visible');
        document.getElementById('start-btn')?.classList.remove('hidden');
        window.ProgressLogger.logProgress('game_started', { stage: this.selectedStage });
    }
