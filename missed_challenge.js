class Game {
    constructor() {
        this.canvas = document.createElement('canvas');
        document.getElementById('game-container').appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true });
        this.isLowPowerDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
            || (navigator.hardwareConcurrency || 8) <= 4;
        this.maxParticles = this.isLowPowerDevice ? 220 : 360;
        this.renderDprCap = this.isLowPowerDevice ? 1 : 1.15;
        this.hudTimer = 0;
        this.frameRequest = (timestamp) => this.loop(timestamp);
        this.ui = {
            stageDisplay: document.getElementById('stage-display'),
            checkpointToast: document.getElementById('checkpoint-toast'),
            momentumToast: document.getElementById('momentum-toast'),
            precisionToast: document.getElementById('precision-toast'),
            padGradeToast: document.getElementById('pad-grade-toast'),
            relicToast: document.getElementById('relic-toast'),
            rivalHud: document.getElementById('rival-hud'),
            rivalName: document.getElementById('rival-name'),
            rivalGap: document.getElementById('rival-gap'),
            rivalDashMarker: document.getElementById('rival-dash-marker'),
            rivalMarker: document.getElementById('rival-marker'),
            rivalStatus: document.getElementById('rival-status'),
            rivalBeat: document.getElementById('rival-beat'),
            rivalBeatTitle: document.getElementById('rival-beat-title'),
            rivalBeatDetail: document.getElementById('rival-beat-detail'),
            relicCount: document.getElementById('relic-count'),
            windContractHud: document.getElementById('wind-contract-hud'),
            windContractList: document.getElementById('wind-contract-list'),
            recoveryPadHud: document.getElementById('recovery-pad-hud'),
            recoveryPadList: document.getElementById('recovery-pad-list'),
            finishToast: document.getElementById('finish-toast'),
            scoreDisplay: document.getElementById('score-display'),
            timerDisplay: document.getElementById('timer-display'),
            staminaBar: document.getElementById('stamina-bar'),
            healthBar: document.getElementById('health-bar'),
            bloodlustHud: document.getElementById('bloodlust-hud'),
            bloodlustTimer: document.getElementById('bloodlust-timer'),
            dashOverlay: document.getElementById('dash-cooldown-overlay'),
            dashButton: document.getElementById('dash-btn'),
            comboHud: document.getElementById('combo-hud'),
            comboDisplay: document.getElementById('combo-display'),
            comboTimerBar: document.getElementById('combo-timer-bar'),
            modifierHud: document.getElementById('modifier-hud'),
            recoveryChoice: document.getElementById('recovery-choice'),
            recoveryCopy: document.getElementById('recovery-copy'),
            recoveryOptions: document.getElementById('recovery-options'),
            reducedFlashToggle: document.getElementById('reduced-flash-toggle'),
            reducedFlashLabel: document.getElementById('reduced-flash-label')
        };
        
        // Backbuffer is only used while dashing, when the speed-warp composite needs it.
        this.backbuffer = document.createElement('canvas');
        this.backCtx = this.backbuffer.getContext('2d', { alpha: false, desynchronized: true });

        this.input = new InputManager();
        this.audio = new AudioManager();
        
        this.player = null;
        this.level = null;
        this.camera = { x: 0, y: 0, shakeX: 0, shakeY: 0 };
        this.shakeTimer = 0;
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
        this.shockwaves = [];
        this.hazardHitCooldown = 0;
        this.timeScale = 1.0;
        this.slowMoTimer = 0;
        this.bloodlustFlashTimer = 0;
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
        this.recoveryBurst = null;
        this.rival = null;
        this.finishCelebration = null;
        this.finishFlashTimer = 0;
        this.state = 'START'; // START, PLAYING, RECOVERY_CHOICE, CELEBRATING, WIN, GAMEOVER
        this.pendingRecovery = null;
        this.unlockedStage = this.loadUnlockedStage();
        this.routeRecords = this.loadRouteRecords();
        this.selectedStage = this.unlockedStage;
        this.routeSelectionStage = this.unlockedStage;
        this.secondaryStage = null;
        this.awaitingBriefing = false;
        this.selectedModifierId = 'standard';
        this.activeModifierId = 'standard';
        this.reducedFlash = this.loadReducedFlashSetting();
        this.runStats = null;
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
        this.activeCheckpointIndex = -1;
        this.justRecovered = false;
        
        this.score = 0;
        this.time = 0;
        this.lastTime = 0;

        this.images = {};
        this.tintedImages = { red: null, blue: null };
        
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('player-died', () => {
            this.registerRecoveryPadDamage();
            this.handleFailure();
        });
        window.addEventListener('player-damaged', () => this.registerRecoveryPadDamage());
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
                this.timeScale = 0.2;
                this.slowMoTimer = 0.18; 
            }
        });
        window.addEventListener('dash-finisher', (e) => {
            if (e.detail) {
                this.shockwaves.push(new Shockwave(e.detail.x, e.detail.y, { reducedFlash: this.reducedFlash }));
                this.shake(30, 0.6); // Increased intensity and duration for finisher
                this.audio.playSFX('shockwave');
                this.spawnParticles(e.detail.x, e.detail.y, '#00ffff', 60, 25);
                this.spawnParticles(e.detail.x, e.detail.y, '#ffffff', 40, 15);
                
                // Trigger Time-Slow
                this.timeScale = 0.42;
                this.slowMoTimer = 0.45; // seconds in real time
            }
        });

        window.addEventListener('combo-reset', () => {
            this.shake(8, 0.2); // Gentle shake on combo loss
        });

        window.addEventListener('spawn-dash-blur', (e) => {
            if (e.detail && this.state === 'PLAYING') {
                if (this.reducedFlash && Math.random() < 0.75) return;
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

        this.ui.reducedFlashToggle?.addEventListener('click', () => this.toggleReducedFlash());
        
        document.getElementById('start-btn').addEventListener('click', () => {
            if (this.awaitingBriefing) {
                this.awaitingBriefing = false;
                this.selectedStage = this.secondaryStage || this.routeSelectionStage || this.selectedStage;
                this.routeSelectionStage = this.selectedStage;
                this.state = 'START';
                const overlay = document.getElementById('msg-overlay');
                overlay.classList.remove('results-overlay');
                this.prepareStartScreen();
                return;
            }
            this.start(this.routeSelectionStage || this.secondaryStage || this.selectedStage);
        });

        document.getElementById('route-selector')?.addEventListener('click', (event) => {
            const card = event.target.closest('[data-route-stage]');
            if (!card || !event.currentTarget.contains(card)) return;
            this.selectRoute(Number(card.dataset.routeStage));
        });

        document.getElementById('results-stats').addEventListener('click', (event) => {
            const option = event.target.closest('[data-modifier-id]');
            if (!option || this.state !== 'WIN') return;
            this.selectedModifierId = option.dataset.modifierId;
            this.updateRematchSelection();
        });

        this.ui.recoveryOptions?.addEventListener('click', (event) => {
            const option = event.target.closest('[data-recovery-option]');
            if (!option || this.state !== 'RECOVERY_CHOICE') return;
            this.resolveRecoveryChoice(option.dataset.recoveryOption);
        });
        
        this.resize();
        this.updateStageHud();
        this.prepareStartScreen();
    }

    getModifierConfig(modifierId = this.selectedModifierId) {
        return REMATCH_MODIFIERS.find(modifier => modifier.id === modifierId) || REMATCH_MODIFIERS[0];
    }

    updateModifierHud() {
        const modifierHud = this.ui.modifierHud;
        if (!modifierHud) return;
        const modifier = this.getModifierConfig(this.activeModifierId);
        const isVisible = this.state === 'PLAYING' || this.state === 'CELEBRATING';
        modifierHud.textContent = `RULE // ${modifier.shortLabel}`;
        modifierHud.classList.toggle('active', isVisible);
        modifierHud.classList.toggle('standard', modifier.id === 'standard');
        modifierHud.setAttribute('aria-label', `Active rematch rule: ${modifier.label}`);
    }

    updateRematchSelection() {
        const panel = document.getElementById('rematch-panel');
        if (!panel) return;
        const selected = this.getModifierConfig(this.selectedModifierId);
        panel.querySelectorAll('[data-modifier-id]').forEach(option => {
            const isSelected = option.dataset.modifierId === selected.id;
            option.classList.toggle('selected', isSelected);
            option.setAttribute('aria-pressed', String(isSelected));
        });
        const detail = panel.querySelector('#rematch-selection-detail');
        if (detail) detail.innerHTML = `<strong>NEXT RUN // ${selected.label}</strong><span>${selected.effect} · ${selected.description}</span>`;
    }

    renderRivalryRecap(stage, showdown) {
        const rivalName = this.rival?.name || 'VEX';
        const swings = this.rival?.landmarkSwings || [];
        const biggestResponse = this.rival?.biggestPaceResponse || null;
        const theme = stage.paceTheme?.id || 'sun';
        const voiceByRoute = {
            sun: {
                'clean-win': 'The golden line was yours, Dash. I’ll take the Sunlift next time.',
                comeback: 'One last crosswind, and you had me. I’ll own the next ridge.',
                'photo-finish': 'That finish was a coin flip. Next run, I claim the sunlight.',
                'vex-edge': 'You cleared the route. I kept the pace. The golden line is mine.'
            },
            neon: {
                'clean-win': 'You found the clean vector, Dash. I’ll redraw this switchback.',
                comeback: 'Last turn was yours. I’m already plotting the reverse.',
                'photo-finish': 'Half a frame, Dash. The next switchback settles it.',
                'vex-edge': 'Route cleared. Pace claimed. Next time you lose the vector.'
            },
            blood: {
                'clean-win': 'Moon’s yours tonight. The Bloodline runback is mine.',
                comeback: 'You hauled me back at last light. Don’t count on another.',
                'photo-finish': 'One breath between us. The Blood Moon gets a rematch.',
                'vex-edge': 'You survived the route. I owned the overdrive. Again.'
            }
        };
        const lastWord = voiceByRoute[theme]?.[showdown.id] || 'The line is yours today, Dash. We run it back.';
        const swingRows = swings.length
            ? swings.map((swing, index) => `
              <li class="rivalry-swing ${swing.leader === 'vex' ? 'vex' : 'dash'}">
                <span>${String(index + 1).padStart(2, '0')}</span>
                <strong>${swing.callout}</strong>
                <small>${swing.label}</small>
              </li>`).join('')
            : '<li class="rivalry-swing quiet"><span>—</span><strong>No clear lead changed hands at a route landmark.</strong><small>The final run-in decided the duel.</small></li>';
        const paceTitle = biggestResponse?.label || 'No landmark pace response fired this run.';
        const paceDetail = biggestResponse
            ? `The strongest response landed at ${biggestResponse.landmark}.`
            : 'Both racers held their pace between markers.';
        const finalTitle = `${showdown.title || 'PHOTO FINISH'} · ${showdown.rivalName || rivalName}`;
        const finalDetail = showdown.recap || 'Dash secured the route at the finish.';
        const accent = stage.paceTheme?.accent || '#ffd166';
        const secondary = stage.paceTheme?.secondary || '#7cffeb';
        const rivalColor = stage.rival?.color || '#ff4fd8';

        return `<section class="rivalry-recap" data-showdown="${showdown.id || 'photo-finish'}" style="--recap-accent:${accent};--recap-secondary:${secondary};--recap-rival:${rivalColor}" aria-label="${stage.name} rivalry recap">
          <div class="rivalry-recap-heading">
            <div><span>RACE FILM // ${stage.rival?.callsign || 'ROUTE RIVAL'}</span><strong>THE RUN YOU DROVE</strong></div>
            <b>${swings.length} SWING${swings.length === 1 ? '' : 'S'}</b>
          </div>
          <div class="rivalry-swing-section">
            <span class="rivalry-recap-label">DECISIVE LANDMARK SWINGS</span>
            <ol>${swingRows}</ol>
          </div>
          <div class="rivalry-recap-details">
            <div><span class="rivalry-recap-label">BIGGEST PACE RESPONSE</span><strong>${paceTitle}</strong><small>${paceDetail}</small></div>
            <div><span class="rivalry-recap-label">FINAL SHOWDOWN</span><strong>${finalTitle}</strong><small>${finalDetail}</small></div>
          </div>
          <blockquote><span>${rivalName} // LAST WORD</span>“${lastWord}”</blockquote>
        </section>`;
    }

    renderModifierSummary(modifier) {
        const safeModifier = modifier || this.getModifierConfig('standard');
        return `<section class="modifier-summary" aria-label="Active rematch rule">
          <span class="modifier-summary-kicker">ACTIVE RULE // THIS CLEAR</span>
          <strong>${safeModifier.label}</strong>
          <span>${safeModifier.effect} · ${safeModifier.description}</span>
        </section>`;
    }

    renderRematchPanel() {
        const selected = this.getModifierConfig(this.selectedModifierId);
        const options = REMATCH_MODIFIERS.map(modifier => `
          <button class="modifier-option ${modifier.id === selected.id ? 'selected' : ''}" type="button" data-modifier-id="${modifier.id}" aria-pressed="${modifier.id === selected.id}">
            <span class="modifier-option-top"><strong>${modifier.label}</strong><span>${modifier.id === 'standard' ? 'BASELINE' : 'OPTIONAL'}</span></span>
            <span class="modifier-option-description">${modifier.description}</span>
            <span class="modifier-option-effect">${modifier.effect}</span>
          </button>
        `).join('');
        return `<section id="rematch-panel" class="rematch-panel" aria-label="Rematch modifiers">
          <div class="rematch-heading"><div><span class="rematch-kicker">REMATCH PROTOCOL</span><strong>SHARPEN THE NEXT RUN</strong></div><span class="rematch-chip">OPTIONAL</span></div>
          <p class="rematch-intro">Pick one rule before restarting. The rule stays active for the next stage or replay and appears in the HUD.</p>
          <div class="modifier-options">${options}</div>
          <div id="rematch-selection-detail" class="rematch-selection"><strong>NEXT RUN // ${selected.label}</strong><span>${selected.effect} · ${selected.description}</span></div>
        </section>`;
    }

    renderRouteSelector() {
        const themeLabels = {
            sun: 'SUNLIFT · GOLDEN HILLS',
            neon: 'NEON · VECTOR RUN',
            blood: 'CRIMSON · BLOOD MOON'
        };
        return STAGE_CONFIGS
            .filter(stage => stage.id <= this.unlockedStage)
            .map(stage => {
                const stageId = String(stage.id);
                const record = this.routeRecords[stageId];
                const challengeConfig = stage.challenges || {};
                const challengeTotal = ['shortcuts', 'comboVaults', 'bloodlustBeacons']
                    .reduce((total, key) => total + (challengeConfig[key]?.length || 0), 0);
                const themeId = stage.paceTheme?.id || 'sun';
                const theme = themeLabels[themeId] || 'ROUTE THEME';
                const selected = stage.id === this.routeSelectionStage;
                const metrics = [
                    ['BEST TIME', record ? this.formatTime(record.time) : '—'],
                    ['BEST SCORE', record ? record.score.toLocaleString() : '—'],
                    ['BEST COMBO', record ? `X${record.combo}` : '—'],
                    ['CHALLENGE PB', record ? `${Math.min(record.challenges, challengeTotal)}/${challengeTotal}` : `—/${challengeTotal}`]
                ];
                return `<button class="route-card ${selected ? 'selected' : ''}" type="button" style="--route-accent:${stage.paceTheme?.accent || '#ffd166'}" data-route-stage="${stage.id}" aria-pressed="${selected}" aria-label="Stage ${stage.id}, ${stage.name}, ${theme}. Best time ${metrics[0][1]}, score ${metrics[1][1]}, combo ${metrics[2][1]}, challenges ${metrics[3][1]}.">
                    <span class="route-card-heading"><span>STAGE ${String(stage.id).padStart(2, '0')}</span><span class="route-card-state">${selected ? 'SELECTED' : 'RACE'}</span></span>
                    <strong class="route-card-title">${stage.name}</strong>
                    <span class="route-card-theme">${theme}</span>
                    <span class="route-card-metrics">${metrics.map(([label, value]) => `<span><small>${label}</small><b>${value}</b></span>`).join('')}</span>
                </button>`;
            }).join('');
    }

    updateRouteSelector() {
        const selector = document.getElementById('route-selector');
        if (!selector) return;
        const focusedStage = selector.contains(document.activeElement)
            ? document.activeElement.dataset.routeStage
            : null;
        selector.innerHTML = `<div class="route-selector-heading"><strong>CHOOSE YOUR ROUTE</strong><span>${this.unlockedStage}/${STAGE_CONFIGS.length} UNLOCKED</span></div><div class="route-cards">${this.renderRouteSelector()}</div>`;
        selector.classList.add('visible');
        if (focusedStage) {
            selector.querySelector(`[data-route-stage="${focusedStage}"]`)?.focus({ preventScroll: true });
        }
        this.updateStartButtonLabel();
    }

    updateStartButtonLabel() {
        const button = document.getElementById('start-btn');
        if (!button) return;
        const routeId = this.routeSelectionStage || this.selectedStage;
        if (this.awaitingBriefing && routeId === 3) {
            button.textContent = 'VIEW BLOOD MOON BRIEFING';
        } else if (this.state === 'WIN') {
            const clearedStage = this.runStats?.stage;
            button.textContent = routeId === clearedStage ? `REPLAY STAGE ${routeId}` : `START STAGE ${routeId}`;
        } else {
            button.textContent = `START STAGE ${routeId}`;
        }
    }

    selectRoute(stageId) {
        const stage = STAGE_CONFIGS.find(candidate => candidate.id === stageId && candidate.id <= this.unlockedStage);
        if (!stage) return;
        this.routeSelectionStage = stage.id;
        this.secondaryStage = stage.id;
        if (this.state === 'START') {
            this.selectedStage = stage.id;
            this.awaitingBriefing = false;
            this.prepareStartScreen();
            return;
        }
        if (this.state === 'WIN') {
            this.awaitingBriefing = stage.id === 3;
            this.updateRouteSelector();
        }
    }

    prepareStartScreen() {
        const stage = this.getStageConfig(this.routeSelectionStage || this.selectedStage);
        this.selectedStage = stage.id;
        const selectedModifier = this.getModifierConfig(this.selectedModifierId);
        document.getElementById('overlay-title').textContent = 'DASH & JUMP';
        document.getElementById('overlay-subtitle').innerHTML = this.unlockedStage > 1
            ? `Route ${stage.id}: ${stage.name}<br>${stage.subtitle}<br><strong>RIVAL // ${stage.rival?.name || 'VEX'} · ${stage.rival?.callsign || 'ROUTE RIVAL'}</strong>`
            : `Run, Jump, and Dash to the end!<br>Stomp enemies for extra points!<br><strong>RIVAL // ${stage.rival?.name || 'VEX'} · LIVE PACE TRACK</strong>`;
        document.getElementById('results-stats').innerHTML = (this.unlockedStage > 1
            ? `<div class="unlock-banner">✓ ROUTE ${stage.id} READY · ${stage.name}</div>`
            : '') + `<div class="selected-rule-banner">NEXT RUN RULE · ${selectedModifier.label} <span>${selectedModifier.effect}</span></div>`;
        const routeBriefing = document.getElementById('route-briefing');
        if (routeBriefing) routeBriefing.classList.toggle('visible', stage.id === 3);
        this.routeSelectionStage = stage.id;
        this.secondaryStage = stage.id;
        this.updateRouteSelector();
        document.getElementById('start-btn').classList.remove('hidden');
        this.ui.reducedFlashToggle?.classList.remove('hidden');
        this.updateReducedFlashToggle();
        document.getElementById('msg-overlay').classList.remove('recovery-overlay');
        this.ui.recoveryChoice?.classList.remove('visible');
        this.updateModifierHud();
    }

    updateStageHud() {
        const stageDisplay = this.ui.stageDisplay;
        if (stageDisplay) {
            const stage = this.getStageConfig(this.selectedStage);
            const checkpointTotal = this.level?.checkpoints?.length || stage.checkpoints.length;
            const checkpointNumber = Math.max(0, this.activeCheckpointIndex + 1);
            const text = `STAGE ${stage.id} · ${stage.name}  |  CP ${checkpointNumber}/${checkpointTotal}`;
            if (stageDisplay.textContent !== text) stageDisplay.textContent = text;
        }
    }

    updateRivalHud() {
        const rivalHud = this.ui.rivalHud;
        const stage = this.getStageConfig(this.selectedStage);
        const rivalConfig = stage.rival || {};
        if (this.ui.rivalName) this.ui.rivalName.textContent = rivalConfig.name || 'VEX';
        if (rivalHud) {
            rivalHud.style.setProperty('--rival-color', this.rival?.color || rivalConfig.color || '#ff4fd8');
        }
        if (!rivalHud) return;

        const isRaceVisible = this.state === 'PLAYING' || this.state === 'CELEBRATING';
        rivalHud.classList.toggle('active', isRaceVisible);
        if (!isRaceVisible || !this.rival || !this.player || !this.level?.goal) return;

        const race = this.rival.getRaceState(this.player, this.level.goal.x);
        if (this.ui.rivalGap) this.ui.rivalGap.textContent = race.status;
        if (this.ui.rivalDashMarker) this.ui.rivalDashMarker.style.left = `${race.dashPercent}%`;
        if (this.ui.rivalMarker) this.ui.rivalMarker.style.left = `${race.rivalPercent}%`;
        if (this.ui.rivalStatus) {
            this.ui.rivalStatus.textContent = `${this.rival.callsign}  ·  ${race.dashPercent}% / ${race.rivalPercent}%`;
            this.ui.rivalStatus.style.color = race.dashProgress >= race.rivalProgress ? '#7cffeb' : this.rival.color;
        }

        const activeBeat = this.rival.beatTimer > 0 ? this.rival.activeBeat : null;
        const beatVisible = Boolean(activeBeat);
        rivalHud.classList.toggle('beat-vex', beatVisible && this.rival.beatLeader === 'vex');
        rivalHud.classList.toggle('beat-dash', beatVisible && this.rival.beatLeader === 'dash');
        if (this.ui.rivalBeat) {
            this.ui.rivalBeat.classList.toggle('active', beatVisible);
            this.ui.rivalBeat.dataset.leader = beatVisible ? this.rival.beatLeader : '';
            if (beatVisible) this.ui.rivalBeat.style.setProperty('--beat-color', activeBeat.color);
        }
        if (beatVisible) {
            if (this.ui.rivalBeatTitle) this.ui.rivalBeatTitle.textContent = activeBeat.callout;
            if (this.ui.rivalBeatDetail) this.ui.rivalBeatDetail.textContent = activeBeat.detail;
        }
    }

    loadUnlockedStage() {
        try {
            const savedStage = Number.parseInt(localStorage.getItem(STAGE_STORAGE_KEY), 10);
            return STAGE_CONFIGS.some(stage => stage.id === savedStage) ? savedStage : 1;
        } catch (error) {
            return 1;
        }
    }

    loadReducedFlashSetting() {
        try {
            return localStorage.getItem(REDUCED_FLASH_STORAGE_KEY) === 'true';
        } catch (error) {
            return false;
        }
    }

    updateReducedFlashToggle() {
        const toggle = this.ui.reducedFlashToggle;
        if (!toggle) return;
        toggle.classList.toggle('enabled', this.reducedFlash);
        toggle.setAttribute('aria-pressed', String(this.reducedFlash));
        if (this.ui.reducedFlashLabel) {
            this.ui.reducedFlashLabel.textContent = `REDUCED FLASH · ${this.reducedFlash ? 'ON' : 'OFF'}`;
        }
        document.body.classList.toggle('reduced-flash', this.reducedFlash);
    }

    toggleReducedFlash() {
        this.reducedFlash = !this.reducedFlash;
        try {
            localStorage.setItem(REDUCED_FLASH_STORAGE_KEY, String(this.reducedFlash));
        } catch (error) {
            // Keep the presentation preference for the current session if storage is unavailable.
        }
        this.updateReducedFlashToggle();
    }

    saveUnlockedStage(stageId) {
        this.unlockedStage = Math.max(this.unlockedStage, stageId);
        try {
            localStorage.setItem(STAGE_STORAGE_KEY, String(this.unlockedStage));
        } catch (error) {
            // Progress still works for this session if storage is unavailable.
        }
    }

    loadRouteRecords() {
        try {
            const saved = JSON.parse(localStorage.getItem(ROUTE_RECORDS_STORAGE_KEY) || '{}');
            if (!saved || typeof saved !== 'object') return {};
            const records = {};
            STAGE_CONFIGS.forEach(stage => {
                const candidate = saved[String(stage.id)];
                if (!candidate || typeof candidate !== 'object') return;
                const time = Number(candidate.time);
                const score = Number(candidate.score);
                const combo = Number(candidate.combo);
                const challenges = Number(candidate.challenges);
                if ([time, score, combo, challenges].every(Number.isFinite)) {
                    records[String(stage.id)] = {
                        time: Math.max(0, time),
                        score: Math.max(0, score),
                        combo: Math.max(0, combo),
                        challenges: Math.max(0, challenges)
                    };
                }
            });
            return records;
        } catch (error) {
            return {};
        }
    }

    saveRouteRecords() {
        try {
            localStorage.setItem(ROUTE_RECORDS_STORAGE_KEY, JSON.stringify(this.routeRecords));
        } catch (error) {
            // The current run still celebrates records for this session if storage is unavailable.
        }
    }

    recordRouteClear(stage, run) {
        const key = String(stage.id);
        const previous = this.routeRecords[key] || null;
        const normalizedRun = {
            time: Math.max(0, Number(run.time) || 0),
            score: Math.max(0, Number(run.score) || 0),
            combo: Math.max(0, Number(run.combo) || 0),
            challenges: Math.max(0, Number(run.challenges) || 0)
        };
        const personalBests = {
            time: !previous || normalizedRun.time < previous.time,
            score: !previous || normalizedRun.score > previous.score,
            combo: !previous || normalizedRun.combo > previous.combo,
            challenges: !previous || normalizedRun.challenges > previous.challenges
        };
        const records = {
            time: personalBests.time ? normalizedRun.time : previous.time,
            score: personalBests.score ? normalizedRun.score : previous.score,
            combo: personalBests.combo ? normalizedRun.combo : previous.combo,
            challenges: personalBests.challenges ? normalizedRun.challenges : previous.challenges
        };
        this.routeRecords[key] = records;
        this.saveRouteRecords();
        return {
            isFirstClear: !previous,
            previous,
            records,
            personalBests
        };
    }

    getStageConfig(stageId) {
        return STAGE_CONFIGS.find(stage => stage.id === stageId) || STAGE_CONFIGS[0];
    }

    async init() {
        // Load all assets
        const loadPromises = Object.entries(ASSETS).map(async ([key, src]) => {
            if (key.startsWith('audio')) return;
            this.images[key] = await loadImage(src);
        });
        await Promise.all(loadPromises);

        // Create tinted versions of the hero for chromatic aberration
        this.createTintedHero();
        
        this.loop();
    }

    createTintedHero() {
        const createTint = (color) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = this.images.hero.width;
            canvas.height = this.images.hero.height;
            
            ctx.drawImage(this.images.hero, 0, 0);
            ctx.globalCompositeOperation = 'source-in';
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            return canvas;
        };
        
        this.tintedImages.red = createTint('#ff0000');
        this.tintedImages.blue = createTint('#0000ff');
        this.tintedImages.cyan = createTint('#00ffff');
    }

    resize() {
        // Keep the pixel workload bounded so effects do not multiply with high-DPI screens.
        const dpr = Math.min(window.devicePixelRatio || 1, this.renderDprCap);
        this.canvas.width = Math.floor(window.innerWidth * dpr);
        this.canvas.height = Math.floor(window.innerHeight * dpr);
        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
        this.ctx.imageSmoothingEnabled = false;

        this.backbuffer.width = this.canvas.width;
        this.backbuffer.height = this.canvas.height;
        this.backCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.backCtx.scale(dpr, dpr);
        this.backCtx.imageSmoothingEnabled = false;
    }

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
            const beats = stage.rivalBeats?.[index] || {};
            this.level.rivalLandmarks.push({
                index,
                x: tile * TILE_SIZE,
                label: beats.label || `PACE MARKER ${String(index + 1).padStart(2, '0')}`,
                beats,
                playerAccent: stage.paceTheme?.accent || '#7cffeb',
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

    spawnParticles(x, y, color, count = 10, speed = 10) {
        if (!this.particles) this.particles = [];
        const available = Math.max(0, this.maxParticles - this.particles.length);
        const requestedCount = this.reducedFlash && count >= 16 ? Math.ceil(count * 0.35) : count;
        const effectSpeed = this.reducedFlash ? speed * 0.72 : speed;
        const spawnCount = Math.min(requestedCount, available);
        for (let i = 0; i < spawnCount; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * effectSpeed,
                vy: (Math.random() - 0.5) * effectSpeed,
                life: 1.0,
                color
            });
        }
    }

    applyHighComboHealthSteal(x, y) {
        if (this.player.combo < HIGH_COMBO_THRESHOLD) return;

        const wasFullHealth = this.player.health >= MAX_HEALTH;
        const healed = this.player.heal(HEALTH_STEAL_ON_KILL);
        const reachedFullHealth = this.player.health >= MAX_HEALTH;

        // Full health plus a high-combo kill awakens a short invincible Bloodlust.
        if (wasFullHealth || reachedFullHealth) {
            const activated = this.player.activateBloodlust();
            if (activated) {
                const blastX = this.player.x + this.player.width / 2;
                const blastY = this.player.y + this.player.height / 2;
                this.bloodlustFlashTimer = 0.24;
                this.shockwaves.push(new Shockwave(blastX, blastY, {
                    maxRadius: 300,
                    speed: 24,
                    palette: 'bloodlust',
                    reducedFlash: this.reducedFlash
                }));
                this.audio.playSFX('shockwave');
                this.spawnParticles(x, y, '#ff4d00', 24, 16);
                this.spawnParticles(blastX, blastY, '#ffd166', 28, 18);
                this.spawnParticles(blastX, blastY, '#ffffff', 14, 12);
                this.shake(34, 0.48);

                // Brief hit-stop makes the Bloodlust blast feel immediate and powerful.
                this.timeScale = 0.28;
                this.slowMoTimer = 0.22;
            }
        } else if (healed > 0) {
            this.spawnParticles(x, y, '#7CFF6B', 18, 12);
            this.shake(5, 0.12);
        }
    }

    start(stageId = this.selectedStage) {
        const requestedStage = Number(stageId);
        this.selectedStage = requestedStage <= this.unlockedStage ? requestedStage : this.unlockedStage;
        this.routeSelectionStage = this.selectedStage;
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

    collectRelic(relic) {
        if (relic.isCollected || this.state !== 'PLAYING') return;
        relic.isCollected = true;
        this.relicsCollected++;
        this.player.combo++;
        this.bestCombo = Math.max(this.bestCombo, this.player.combo);
        this.player.comboTimer = COMBO_MAX_TIME;
        this.score += 350 * this.player.combo;
        this.relicToastTimer = 2.2;
        this.relicMessage = `RELIC CLAIMED  ·  ${relic.name}  ·  ${this.relicsCollected}/${this.level.relics.length}`;
        this.relicBurst = {
            x: relic.x + relic.width / 2,
            y: relic.y + relic.height / 2,
            color: relic.color,
            name: relic.name,
            life: 1
        };
        this.spawnParticles(this.relicBurst.x, this.relicBurst.y, relic.color, 34, 17);
        this.spawnParticles(this.relicBurst.x, this.relicBurst.y, '#ffffff', 18, 13);
        this.spawnParticles(this.relicBurst.x, this.relicBurst.y, '#ffd166', 12, 10);
        this.audio.playSFX('relic');
        this.shake(8, 0.18);
    }

    activateCheckpoint(checkpoint) {
        if (checkpoint.activated || checkpoint.index <= this.activeCheckpointIndex) return;
        checkpoint.activated = true;
        this.activeCheckpointIndex = checkpoint.index;
        this.checkpointFlashTimer = 0.55;
        this.checkpointToastTimer = 2.2;
        this.checkpointMessage = `CHECKPOINT ${checkpoint.index + 1} SECURED`;
        const burstX = checkpoint.x + checkpoint.width / 2;
        const burstY = checkpoint.y + checkpoint.height * 0.45;
        this.spawnParticles(burstX, burstY, '#7cffeb', 26, 15);
        this.spawnParticles(burstX, burstY, '#ffd166', 14, 11);
        this.shake(7, 0.16);
    }

    activateMomentumGate(gate, speed, hasCombo) {
        gate.activated = true;
        this.momentumGatesCleared++;
        gate.activationTimer = 0.8;
        const rewardParts = [];

        if (gate.staminaReward > 0) {
            this.player.stamina = Math.min(MAX_STAMINA, this.player.stamina + gate.staminaReward);
            rewardParts.push(`+${gate.staminaReward} ENERGY`);
        }
        if (gate.reward === 'acceleration') {
            this.player.momentumBoostTimer = Math.max(this.player.momentumBoostTimer, gate.boostDuration);
            this.player.momentumBoostMultiplier = Math.max(this.player.momentumBoostMultiplier, 1.6);
            rewardParts.push(`${gate.boostDuration.toFixed(1)}s ACCEL BOOST`);
        }
        if (gate.scoreReward > 0) {
            this.score += gate.scoreReward;
            rewardParts.push(`+${gate.scoreReward} SCORE`);
        }

        this.player.comboTimer = Math.max(this.player.comboTimer, COMBO_MAX_TIME);
        this.momentumMessage = `${gate.label}  ·  ${Math.round(speed)} SPD  ·  ${rewardParts.join('  ·  ')}`;
        this.momentumToastTimer = 1.8;
        const burstX = gate.x + gate.width / 2;
        const burstY = gate.y + gate.height * 0.48;
        this.spawnParticles(burstX, burstY, '#7cffeb', 24, 17);
        this.spawnParticles(burstX, burstY, '#ffd166', 14, 13);
        this.shake(hasCombo ? 9 : 6, 0.14);
        this.audio.playSFX('pickup');
        this.rival?.registerAdvantage(gate.label, hasCombo ? 0.016 : 0.01);
    }

    getRecoveryPadContractConfigs() {
        const padCount = this.level?.recoveryPads?.length || 0;
        return buildRecoveryPadContractSpecs(this.getStageConfig(this.selectedStage), padCount);
    }

    getRecoveryPadContractProgress(contract) {
        const stats = this.recoveryPadStats;
        const target = Math.max(1, Number(contract.target) || 1);
        const value = contract.kind === 'used'
            ? stats.usedPads.size
            : contract.kind === 'chain'
                ? stats.chain
                : stats.cleanMastery;
        const completionValue = contract.kind === 'chain' ? stats.bestChain : value;
        let detail;
        if (contract.kind === 'used') {
            detail = `${Math.min(value, target)}/${target} DIFFERENT PADS`;
        } else if (contract.kind === 'chain') {
            detail = `${Math.min(stats.chain, target)}/${target} LIVE · BEST ${Math.min(stats.bestChain, target)}`;
        } else {
            detail = `${Math.min(value, target)}/${target} MASTERY · EDGE 1 / CLEAN 2 / PERFECT 3 · NO HIT`;
        }
        const completed = this.recoveryPadContractsCompleted.has(contract.id);
        return {
            value,
            target,
            completionValue,
            completed,
            percent: completed ? 100 : Math.min(100, (value / target) * 100),
            detail
        };
    }

    completeRecoveryPadContract(contract, progress) {
        if (this.recoveryPadContractsCompleted.has(contract.id)) return;
        this.recoveryPadContractsCompleted.add(contract.id);
        const reward = Math.max(0, Number(contract.reward) || 0);
        this.recoveryPadBonusScore += reward;
        this.score += reward;
        this.momentumMessage = `PAD MASTERY EARNED  ·  ${contract.label}  ·  +${reward.toLocaleString()} PTS`;
        this.momentumToastTimer = 2.6;
        const centerX = this.player.x + this.player.width / 2;
        const centerY = this.player.y + this.player.height / 2;
        const color = this.level.stage?.paceTheme?.accent || '#ffd166';
        this.spawnParticles(centerX, centerY, color, 26, 17);
        this.spawnParticles(centerX, centerY, '#fff4b0', 14, 12);
        this.audio.playSFX('pickup');
        this.shake(10, 0.18);
        this.rival?.registerAdvantage('PAD MASTERY', 0.018);
        window.ProgressLogger.logProgress('recovery_pad_contract_completed', {
            stage: this.selectedStage,
            contract: contract.id,
            label: contract.label,
            target: progress.target,
            reward
        });
    }

    updateRecoveryPadContractCompletions() {
        this.getRecoveryPadContractConfigs().forEach(contract => {
            const progress = this.getRecoveryPadContractProgress(contract);
            if (progress.completionValue >= progress.target) {
                this.completeRecoveryPadContract(contract, progress);
            }
        });
    }

    registerRecoveryPadDamage() {
        if (!this.recoveryPadStats || this.state !== 'PLAYING') return;
        this.recoveryPadStats.damagedSinceLaunch = true;
        this.recoveryPadStats.chain = 0;
        this.updateRecoveryPadHud();
    }

    updateRecoveryPadHud() {
        const hud = this.ui.recoveryPadHud;
        const list = this.ui.recoveryPadList;
        const contracts = this.getRecoveryPadContractConfigs();
        const isVisible = (this.state === 'PLAYING' || this.state === 'CELEBRATING') && contracts.length > 0;
        hud?.classList.toggle('active', isVisible);
        if (!list || !isVisible) return;
        list.innerHTML = contracts.map(contract => {
            const progress = this.getRecoveryPadContractProgress(contract);
            const value = Math.min(progress.value, progress.target);
            const secured = progress.completed
                ? `+${Number(contract.reward || 0).toLocaleString()} PTS SECURED`
                : progress.detail;
            const liveChainDetail = progress.completed && contract.kind === 'chain'
                ? ` · ${progress.detail}`
                : '';
            return `<div class="wind-contract-row ${progress.completed ? 'complete' : ''}">
              <div class="wind-contract-row-top"><strong>${contract.label}</strong><span>${progress.completed ? '✓ COMPLETE' : `${value}/${progress.target}`}</span></div>
              <div class="wind-contract-track" role="progressbar" aria-label="${contract.label}" aria-valuemin="0" aria-valuemax="${progress.target}" aria-valuenow="${progress.completed ? progress.target : value}"><i style="width:${progress.percent}%"></i></div>
              <small>${secured}${liveChainDetail}</small>
            </div>`;
        }).join('');
    }

    getRecoveryPadRecap() {
        const stats = this.recoveryPadStats;
        const contracts = this.getRecoveryPadContractConfigs().map(contract => {
            const progress = this.getRecoveryPadContractProgress(contract);
            return {
                id: contract.id,
                label: contract.label,
                description: contract.description,
                kind: contract.kind,
                target: progress.target,
                value: progress.value,
                detail: progress.detail,
                completed: progress.completed,
                reward: Math.max(0, Number(contract.reward) || 0)
            };
        });
        return {
            total: contracts.length,
            completed: contracts.filter(contract => contract.completed).length,
            bonusScore: this.recoveryPadBonusScore,
            totalPads: this.level?.recoveryPads?.length || 0,
            uniquePads: stats.usedPads.size,
            launches: stats.launches,
            cleanBoosts: stats.cleanBoosts,
            cleanMastery: stats.cleanMastery,
            landingScore: stats.landingScore,
            gradeCounts: { ...stats.gradeCounts },
            bestChain: stats.bestChain,
            contracts
        };
    }

    getWindContractConfigs() {
        return this.getStageConfig(this.selectedStage).windContracts || [];
    }

    getWindContractProgress(contract) {
        const target = Math.max(1, Number(contract.target) || 1);
        let value = 0;
        let detail = '';
        if (contract.kind === 'types') {
            value = this.windPrecisionTypes.size;
            detail = `${value}/${target} LINE TYPES`;
        } else if (contract.kind === 'chain') {
            value = this.windPrecisionChain;
            detail = `${Math.min(value, target)}/${target} LIVE · BEST ${Math.min(this.windPrecisionBestChain, target)}`;
        } else {
            value = this.precisionBonusScore;
            detail = `${Math.min(value, target).toLocaleString()}/${target.toLocaleString()} PTS`;
        }
        const completed = this.windContractsCompleted.has(contract.id);
        return {
            value,
            target,
            completed,
            percent: Math.min(100, (value / target) * 100),
            detail: completed ? 'CONTRACT COMPLETE' : detail
        };
    }

    completeWindContract(contract, progress) {
        if (this.windContractsCompleted.has(contract.id)) return;
        this.windContractsCompleted.add(contract.id);
        const reward = Math.max(0, Number(contract.reward) || 0);
        this.windContractBonusScore += reward;
        this.score += reward;
        this.momentumMessage = `REPLAY CONTRACT COMPLETE  ·  ${contract.label}  ·  +${reward.toLocaleString()} PTS`;
        this.momentumToastTimer = 2.6;
        const centerX = this.player.x + this.player.width / 2;
        const centerY = this.player.y + this.player.height / 2;
        const color = this.level.stage?.paceTheme?.accent || '#7cffeb';
        this.spawnParticles(centerX, centerY, color, 26, 17);
        this.spawnParticles(centerX, centerY, '#fff4b0', 14, 12);
        this.audio.playSFX('pickup');
        this.shake(10, 0.18);
        this.rival?.registerAdvantage('REPLAY CONTRACT', 0.018);
        window.ProgressLogger.logProgress('wind_replay_contract_completed', {
            stage: this.selectedStage,
            contract: contract.id,
            label: contract.label,
            kind: contract.kind,
            target: progress.target,
            reward
        });
    }

    updateWindContractCompletions() {
        this.getWindContractConfigs().forEach(contract => {
            const progress = this.getWindContractProgress(contract);
            if (progress.value >= progress.target) this.completeWindContract(contract, progress);
        });
    }

    registerWindPrecisionProgress(current, type) {
        this.windPrecisionTypes.add(type);
        const expectedIndex = this.windLastPrecisionIndex + 1;
        this.windPrecisionChain = current.windIndex === expectedIndex
            ? this.windPrecisionChain + 1
            : 1;
        this.windPrecisionBestChain = Math.max(this.windPrecisionBestChain, this.windPrecisionChain);
        this.windLastPrecisionIndex = current.windIndex;
        this.updateWindContractCompletions();
    }

    breakWindPrecisionChain() {
        this.windPrecisionChain = 0;
        this.windLastPrecisionIndex = -1;
    }

    updateWindContractHud() {
        const hud = this.ui.windContractHud;
        const list = this.ui.windContractList;
        const isVisible = (this.state === 'PLAYING' || this.state === 'CELEBRATING') && this.getWindContractConfigs().length > 0;
        hud?.classList.toggle('active', isVisible);
        if (!list || !isVisible) return;
        list.innerHTML = this.getWindContractConfigs().map(contract => {
            const progress = this.getWindContractProgress(contract);
            const stateClass = progress.completed ? 'complete' : '';
            const valueLabel = contract.kind === 'score'
                ? `${Math.min(progress.value, progress.target).toLocaleString()}/${progress.target.toLocaleString()}`
                : contract.kind === 'chain'
                    ? `${Math.min(progress.value, progress.target)}/${progress.target}`
                    : `${Math.min(progress.value, progress.target)}/${progress.target}`;
            const currentValue = Math.min(progress.value, progress.target);
            return `<div class="wind-contract-row ${stateClass}">
              <div class="wind-contract-row-top"><strong>${contract.label}</strong><span>${progress.completed ? '✓ COMPLETE' : valueLabel}</span></div>
              <div class="wind-contract-track" role="progressbar" aria-label="${contract.label}" aria-valuemin="0" aria-valuemax="${progress.target}" aria-valuenow="${currentValue}"><i style="width:${progress.percent}%"></i></div>
              <small>${progress.completed ? `+${Number(contract.reward || 0).toLocaleString()} PTS SECURED` : progress.detail}</small>
            </div>`;
        }).join('');
    }

    awardWindPrecision(current, type, x, y) {
        if (!current || current.precisionClaimed || this.state !== 'PLAYING') return;
        const line = current.precisionLines[type];
        if (!line) return;

        const routeBonus = Math.max(0, this.selectedStage - 1) * 75;
        const reward = line.reward + routeBonus;
        current.precisionClaimed = type;
        this.precisionLinesCleared++;
        this.precisionBonusScore += reward;
        this.registerWindPrecisionProgress(current, type);
        this.score += reward;
        this.player.comboTimer = Math.max(this.player.comboTimer, COMBO_MAX_TIME);
        this.precisionMessage = `${line.name}  ·  +${reward.toLocaleString()} PTS`;
        this.precisionToastTimer = 1.9;
        this.precisionBurst = {
            x: x || current.x + current.width / 2,
            y: y || current.y + current.height * 0.42,
            color: line.color,
            lineLabel: line.label,
            name: line.name,
            reward,
            life: 1
        };
        this.spawnParticles(this.precisionBurst.x, this.precisionBurst.y, line.color, 26, 16);
        this.spawnParticles(this.precisionBurst.x, this.precisionBurst.y, '#ffffff', 12, 11);
        this.audio.playSFX(type === 'dash' ? 'dash' : 'pickup');
        this.shake(type === 'dash' ? 9 : 6, 0.16);
        this.rival?.registerAdvantage('PRECISION LINE', type === 'dash' ? 0.022 : 0.014);
        window.ProgressLogger.logProgress('wind_precision_line', {
            stage: this.selectedStage,
            current: current.label,
            line: line.label,
            reward,
            type
        });
    }

    evaluateWindPrecision(previousX, previousY, previousVx, previousDashing, dt) {
        if (!this.level || !this.player || this.state !== 'PLAYING') return;

        const player = this.player;
        const previousCenter = previousX + player.width / 2;
        const currentCenter = player.x + player.width / 2;
        const previousCenterY = previousY + player.height / 2;
        const currentCenterY = player.y + player.height / 2;
        const previousProbe = {
            x: previousX,
            y: previousY,
            width: player.width,
            height: player.height
        };
        const currentBefore = this.level.getWindCurrent(previousProbe);
        const currentAfter = this.level.getWindCurrent(player);
        const pathCurrent = this.level.windCurrents.find(current => {
            const horizontalPass = Math.max(previousCenter, currentCenter) >= current.x &&
                Math.min(previousCenter, currentCenter) <= current.x + current.width;
            const verticalPass = Math.max(previousCenterY, currentCenterY) >= current.y &&
                Math.min(previousCenterY, currentCenterY) <= current.bottom;
            return horizontalPass && verticalPass;
        });
        const current = currentAfter || currentBefore || pathCurrent;
        if (!current) return;

        const attempt = current.precisionAttempt;
        const touched = currentAfter === current || currentBefore === current || pathCurrent === current;
        if (!attempt.entered && touched) {
            attempt.entered = true;
            attempt.entrySpeed = Math.max(0, previousVx, player.vx);
            if (!current.precisionClaimed && !previousDashing && previousVx >= current.speedThreshold) {
                this.awardWindPrecision(current, 'speed', current.x + 18, current.y + current.height * 0.32);
            }
        }
        if (!attempt.entered) return;

        const counterKey = current.direction > 0 ? 'left' : 'right';
        if (touched && !player.isDashing && this.input.keys[counterKey]) {
            attempt.counterTime += dt;
        }
        if (touched && (previousDashing || player.isDashing)) {
            attempt.dashTouched = true;
        }

        const exitedRight = previousCenter < current.x + current.width &&
            currentCenter >= current.x + current.width - 1 && currentCenter > previousCenter;
        const exitedLeft = previousCenter > current.x &&
            currentCenter <= current.x && currentCenter < previousCenter;
        if (exitedLeft) {
            this.breakWindPrecisionChain();
            current.resetPrecisionAttempt();
            return;
        }
        if (!exitedRight) {
            const outsideCurrent = currentCenter < current.x || currentCenter > current.x + current.width ||
                currentCenterY <= current.y || currentCenterY >= current.bottom;
            const abandonedCurrent = currentBefore === current && currentAfter !== current && outsideCurrent;
            if (abandonedCurrent) {
                this.breakWindPrecisionChain();
                current.resetPrecisionAttempt();
            }
            return;
        }

        attempt.dashAtExit = player.isDashing || previousDashing;
        if (!current.precisionClaimed) {
            if (attempt.dashTouched && attempt.dashAtExit) {
                this.awardWindPrecision(current, 'dash', current.x + current.width * 0.72, current.y + current.height * 0.52);
            } else if (attempt.counterTime >= 0.12 && player.vx > 4 && player.x > current.x + current.width - player.width - 10) {
                this.awardWindPrecision(current, 'counter', current.x + current.width * 0.72, current.y + current.height * 0.65);
            }
            if (!current.precisionClaimed) this.breakWindPrecisionChain();
        }
        current.resetPrecisionAttempt();
    }

    processRouteForks(playerPreviousRight) {
        if (!this.level?.routeForks?.length || !this.player || this.state !== 'PLAYING') return;

        const player = this.player;
        const playerRight = player.x + player.width;
        const floorY = this.level.height - TILE_SIZE;
        for (const fork of this.level.routeForks) {
            if (fork.checked || playerPreviousRight >= fork.choiceX || playerRight < fork.choiceX) continue;

            fork.checked = true;
            const fastLine = player.y + player.height <= fork.fastY + 28;
            const gate = new TimedGate(fork.gateTile * TILE_SIZE, floorY, fastLine
                ? { width: 28, height: 164, cycle: 3.25, openDuration: 0.82, phase: 3, label: 'FAST EXIT' }
                : { width: 28, height: 150, cycle: 3.8, openDuration: 2.85, phase: 0, label: 'SAFE EXIT' });
            gate.update(0);
            this.level.timedGates.push(gate);
            fork.exitGate = gate;

            if (fastLine) {
                fork.selected = 'fast';
                this.score += fork.reward;
                player.facingRight = true;
                player.vx = Math.max(player.vx, Math.min(PLAYER_RUN_MAX_SPEED, fork.boostSpeed || 19));
                player.launchBoostTimer = Math.max(player.launchBoostTimer, fork.boostDuration || 1.6);
                player.launchBoostSpeed = Math.max(player.launchBoostSpeed, fork.boostSpeed || 19);
                player.momentumBoostTimer = Math.max(player.momentumBoostTimer, fork.boostDuration || 1.6);
                player.momentumBoostMultiplier = Math.max(player.momentumBoostMultiplier, 1.35);
                this.momentumMessage = `FAST CUT SECURED  ·  ${fork.label}  ·  +${fork.reward.toLocaleString()} PTS  ·  BOOST ON / TIGHT EXIT`;
                this.rival?.registerAdvantage('FAST ROUTE CUT', 0.022);
                this.spawnParticles(fork.choiceX, fork.fastY, '#ff8a00', 28, 17);
                this.audio.playSFX('dash');
            } else {
                fork.selected = 'safe';
                const recoveredHealth = player.heal(fork.safeHealth || 18);
                const recoveredStamina = Math.min(MAX_STAMINA - player.stamina, fork.safeStamina || 32);
                player.stamina += recoveredStamina;
                this.score += fork.safeScore || 250;
                this.momentumMessage = `SAFE LINE SECURED  ·  ${fork.label}  ·  +${recoveredHealth} HP / +${recoveredStamina} ENERGY  ·  WIDE EXIT WINDOW`;
                this.rival?.registerAdvantage('SAFE ROUTE', 0.006);
                this.spawnParticles(fork.choiceX, floorY - 34, '#7cffeb', 20, 11);
                this.audio.playSFX('pickup');
            }

            fork.gateMode = fastLine ? 'tight' : 'wide';
            this.momentumToastTimer = 2.6;
            window.ProgressLogger.logProgress('route_fork_chosen', {
                stage: this.selectedStage,
                fork: fork.id,
                line: fork.selected,
                score: fastLine ? fork.reward : (fork.safeScore || 250),
                exitGate: fork.gateMode
            });
        }
    }

    drawRouteForks(ctx) {
        if (!this.level?.routeForks?.length) return;
        const floorY = this.level.height - TILE_SIZE;
        this.level.routeForks.forEach(fork => {
            const screenX = fork.x - this.camera.x;
            const screenEnd = screenX + fork.width;
            if (screenEnd < -180 || screenX > window.innerWidth + 180) return;

            const baseY = floorY - this.camera.y;
            const fastY = fork.fastY - this.camera.y;
            const choiceX = fork.choiceX - this.camera.x;
            const gateX = fork.gateTile * TILE_SIZE - this.camera.x;
            const pulse = 0.78 + Math.sin(this.time * 6 + fork.index) * 0.16;
            const fastColor = fork.selected === 'fast' ? '#ffb347' : '#ff8a00';
            const safeColor = fork.selected === 'safe' ? '#fff4b0' : '#7cffeb';
            const fastLabel = fork.selected === 'fast' ? 'FAST CUT · BOOST LIVE' : `FAST CUT · +${fork.reward.toLocaleString()} PTS`;
            const safeLabel = fork.selected === 'safe' ? 'SAFE LINE · RECOVERED' : 'SAFE LINE · HP + ENERGY';

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 7]);
            ctx.strokeStyle = `${safeColor}bb`;
            ctx.shadowBlur = 12;
            ctx.shadowColor = safeColor;
            ctx.beginPath();
            ctx.moveTo(screenX + 8, baseY - 38);
            ctx.lineTo(choiceX + 5, baseY - 38);
            ctx.lineTo(gateX - 14, baseY - 38);
            ctx.stroke();
            ctx.strokeStyle = `${fastColor}dd`;
            ctx.shadowColor = fastColor;
            ctx.beginPath();
            ctx.moveTo(screenX + 8, baseY - 42);
            ctx.lineTo(screenX + 42, fastY - 24);
            ctx.lineTo(choiceX + 6, fastY - 24);
            ctx.lineTo(gateX - 14, fastY - 24);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.95;
            const labelWidth = Math.max(166, Math.min(218, fork.width - 8));
            const labelX = screenX + fork.width / 2 - labelWidth / 2;
            ctx.fillStyle = 'rgba(5, 12, 27, 0.88)';
            ctx.fillRect(labelX, fastY - 78, labelWidth, 34);
            ctx.strokeStyle = `${fastColor}b8`;
            ctx.lineWidth = 1;
            ctx.strokeRect(labelX, fastY - 78, labelWidth, 34);
            ctx.fillStyle = fastColor;
            ctx.font = '700 8px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(fastLabel, screenX + fork.width / 2, fastY - 64);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
            ctx.font = '600 7px Inter, sans-serif';
            ctx.fillText('DODGE SWEEPER · EXIT GATE TIGHTENS', screenX + fork.width / 2, fastY - 51);

            ctx.fillStyle = 'rgba(5, 12, 27, 0.88)';
            ctx.fillRect(screenX + fork.width / 2 - 88, baseY - 73, 176, 20);
            ctx.strokeStyle = `${safeColor}a8`;
            ctx.strokeRect(screenX + fork.width / 2 - 88, baseY - 73, 176, 20);
            ctx.fillStyle = safeColor;
            ctx.font = '700 7px Orbitron, sans-serif';
            ctx.fillText(safeLabel, screenX + fork.width / 2, baseY - 60);

            ctx.globalAlpha = pulse;
            ctx.fillStyle = fork.checked ? (fork.selected === 'fast' ? fastColor : safeColor) : '#ffffff';
            ctx.font = '700 8px Orbitron, sans-serif';
            ctx.fillText(fork.checked ? `${fork.label} · ${fork.selected.toUpperCase()} LINE` : `${fork.label} · CHOOSE YOUR LINE`, screenX + fork.width / 2, fastY - 88);
            ctx.restore();
        });
    }

    processChallengeBeats(playerPreviousRight) {
        if (!this.level || !this.player) return;
        const playerRight = this.player.x + this.player.width;
        const floorY = this.level.height - TILE_SIZE;
        const crossed = challenge => !challenge.checked && playerPreviousRight < challenge.x && playerRight >= challenge.x;

        this.level.challengeShortcuts.forEach(shortcut => {
            if (!crossed(shortcut)) return;
            shortcut.checked = true;
            const highLine = this.player.y + this.player.height <= floorY - ((shortcut.rise || 2) * TILE_SIZE - 16);
            if (!highLine) return;
            shortcut.earned = true;
            this.score += shortcut.reward;
            this.momentumMessage = `SHORTCUT SECURED  ·  ${shortcut.label}  ·  +${shortcut.reward.toLocaleString()} PTS`;
            this.momentumToastTimer = 2.1;
            this.rival?.registerAdvantage('SHORTCUT', 0.014);
            this.spawnParticles(shortcut.x + shortcut.width / 2, shortcut.y, '#ffd166', 20, 13);
        });

        this.level.comboVaults.forEach(vault => {
            if (!crossed(vault)) return;
            vault.checked = true;
            if (this.player.combo < vault.comboRequired) return;
            vault.earned = true;
            this.score += vault.reward;
            this.player.comboTimer = Math.max(this.player.comboTimer, COMBO_MAX_TIME);
            this.momentumMessage = `COMBO VAULT OPEN  ·  ${vault.label}  ·  +${vault.reward.toLocaleString()} PTS`;
            this.momentumToastTimer = 2.1;
            this.rival?.registerAdvantage('COMBO VAULT', 0.018);
            this.spawnParticles(vault.x + vault.width / 2, vault.y, '#7cffeb', 24, 15);
        });

        this.level.bloodlustBeacons.forEach(beacon => {
            if (!crossed(beacon)) return;
            beacon.checked = true;
            if (this.player.bloodlustTimer <= 0) return;
            beacon.earned = true;
            const extension = 0.6;
            this.player.bloodlustTimer = Math.min(BLOODLUST_DURATION + extension, this.player.bloodlustTimer + extension);
            this.score += beacon.reward;
            this.momentumMessage = `BLOODLUST BEACON LIT  ·  ${beacon.label}  ·  +${beacon.reward.toLocaleString()} PTS  ·  +${extension.toFixed(1)}s FURY`;
            this.momentumToastTimer = 2.1;
            this.rival?.registerAdvantage('BLOODLUST BEACON', 0.02);
            this.spawnParticles(beacon.x + beacon.width / 2, beacon.y, '#ff8a00', 28, 17);
            this.spawnParticles(beacon.x + beacon.width / 2, beacon.y, '#ffd166', 16, 12);
        });
    }

    drawChallengeMarkers(ctx) {
        if (!this.level) return;
        const drawMarker = (challenge, color, prefix, markerY, shape) => {
            if (challenge.x + challenge.width < this.camera.x - 100 || challenge.x > this.camera.x + window.innerWidth + 100) return;
            const screenX = challenge.x - this.camera.x;
            const centerX = screenX + challenge.width / 2;
            const screenY = markerY - this.camera.y;
            const stateColor = challenge.checked ? (challenge.earned ? '#7cffeb' : '#64748b') : color;
            const pulse = 0.72 + Math.sin(this.time * 7 + challenge.index) * 0.18;
            const status = challenge.checked ? (challenge.earned ? 'EARNED' : 'MISSED') : 'OPTIONAL';

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = challenge.checked && !challenge.earned ? 0.45 : 0.9;
            ctx.shadowBlur = challenge.earned ? 18 : 11;
            ctx.shadowColor = stateColor;
            ctx.strokeStyle = stateColor;
            ctx.fillStyle = stateColor;
            ctx.lineWidth = challenge.earned ? 4 : 2;
            if (shape === 'shortcut') {
                ctx.setLineDash([7, 7]);
                ctx.beginPath();
                ctx.moveTo(screenX - 14, screenY + 12);
                ctx.lineTo(screenX + challenge.width + 14, screenY + 12);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.moveTo(centerX - 11, screenY + 4);
                ctx.lineTo(centerX, screenY - 8);
                ctx.lineTo(centerX + 11, screenY + 4);
                ctx.stroke();
            } else if (shape === 'vault') {
                ctx.strokeRect(screenX + 7, screenY - 8, challenge.width - 14, 42);
                ctx.beginPath();
                ctx.moveTo(centerX, screenY - 5);
                ctx.lineTo(centerX, screenY + 28);
                ctx.stroke();
                ctx.fillRect(centerX - 3, screenY + 8, 6, 6);
            } else {
                ctx.beginPath();
                ctx.moveTo(centerX, screenY + 34);
                ctx.lineTo(centerX, screenY - 24);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(centerX, screenY - 29, 8 + pulse * 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(centerX, screenY - 29, 19 + pulse * 5, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(5, 12, 27, 0.84)';
            ctx.fillRect(screenX - 15, screenY - 54, challenge.width + 30, 27);
            ctx.fillStyle = stateColor;
            ctx.font = '700 8px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${prefix} · ${status}`, centerX, screenY - 42);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
            ctx.font = '600 7px Inter, sans-serif';
            ctx.fillText(challenge.label, centerX, screenY - 32);
            ctx.restore();
        };

        this.level.challengeShortcuts.forEach(shortcut => {
            drawMarker(shortcut, '#ffd166', 'CUT', shortcut.y, 'shortcut');
        });
        this.level.comboVaults.forEach(vault => {
            drawMarker(vault, '#7cffeb', `VAULT X${vault.comboRequired}`, vault.y, 'vault');
        });
        this.level.bloodlustBeacons.forEach(beacon => {
            drawMarker(beacon, '#ff8a00', 'FURY', beacon.y, 'beacon');
        });
    }

    gradeRecoveryPadLanding(pad, approachVx, descentVy) {
        const playerCenterX = this.player.x + this.player.width / 2;
        const padCenterX = pad.x + pad.width / 2;
        const centerOffset = Math.abs(playerCenterX - padCenterX);
        const forwardSpeed = Math.max(0, approachVx);
        const descentSpeed = Math.max(0, descentVy);
        const centerQuality = Math.max(0, Math.min(1, 1 - centerOffset / (pad.width * 0.68)));
        const speedQuality = Math.max(0, Math.min(1, (forwardSpeed - 2) / 10));
        const timingQuality = Math.max(0, Math.min(1, 1 - Math.abs(descentSpeed - 12) / 18));
        const quality = centerQuality * 0.42 + speedQuality * 0.3 + timingQuality * 0.28;

        let label = 'EDGE';
        if (quality >= 0.78 && centerQuality >= 0.72 && speedQuality >= 0.68 && timingQuality >= 0.65) {
            label = 'PERFECT';
        } else if (quality >= 0.45 && centerQuality >= 0.3 && speedQuality >= 0.2 && timingQuality >= 0.2) {
            label = 'CLEAN';
        }

        const rewards = {
            EDGE: { score: RECOVERY_PAD_SCORE, mastery: 1, color: '#ff8a00', cue: 'EDGE CATCH' },
            CLEAN: { score: RECOVERY_PAD_SCORE * 2, mastery: 2, color: '#ffd166', cue: 'CENTER / CARRY / TIMING' },
            PERFECT: { score: RECOVERY_PAD_SCORE * 3 + 25, mastery: 3, color: '#7cffeb', cue: 'CENTER / CARRY / TIMING' }
        };
        return {
            label,
            ...rewards[label],
            centerOffset: Math.round(centerOffset),
            approachSpeed: Math.round(forwardSpeed * 10) / 10,
            descentSpeed: Math.round(descentSpeed * 10) / 10,
            quality: Math.round(quality * 100)
        };
    }

    processRecoveryLaunchPads(previousY, previousVy, previousVx) {
        if (!this.level?.recoveryPads?.length || !this.player || this.state !== 'PLAYING') return;

        const player = this.player;
        const previousBottom = previousY + player.height;
        const currentBottom = player.y + player.height;
        if (previousVy <= 0 || !player.grounded || currentBottom < previousBottom) return;

        for (const pad of this.level.recoveryPads) {
            if (pad.cooldownTimer > 0) continue;
            const overlapsHorizontally = player.x + player.width > pad.x && player.x < pad.x + pad.width;
            const crossedTop = previousBottom <= pad.y + 10 && currentBottom >= pad.y;
            if (!overlapsHorizontally || !crossedTop) continue;

            const grade = this.gradeRecoveryPadLanding(pad, previousVx, previousVy);
            pad.activate();
            const padStats = this.recoveryPadStats;
            const cleanLaunch = !padStats.damagedSinceLaunch;
            padStats.launches++;
            padStats.usedPads.add(pad.index);
            padStats.gradeCounts[grade.label]++;
            padStats.landingScore += grade.score;
            padStats.chain = cleanLaunch ? padStats.chain + 1 : 1;
            padStats.bestChain = Math.max(padStats.bestChain, padStats.chain);
            if (cleanLaunch) {
                padStats.cleanBoosts++;
                padStats.cleanMastery += grade.mastery;
            }
            padStats.damagedSinceLaunch = false;

            player.vx = Math.max(player.vx, pad.launchSpeed);
            player.vy = pad.launchJump;
            player.grounded = false;
            player.canDoubleJump = true;
            player.facingRight = true;
            player.launchBoostTimer = pad.boostDuration;
            player.launchBoostSpeed = pad.launchSpeed;
            player.momentumBoostTimer = Math.max(player.momentumBoostTimer, pad.boostDuration);
            player.momentumBoostMultiplier = Math.max(player.momentumBoostMultiplier, 1.3);
            player.comboTimer = Math.max(player.comboTimer, COMBO_MAX_TIME);
            this.score += grade.score;
            const masteryMessage = cleanLaunch
                ? `+${grade.mastery} MASTERY`
                : 'NO-HIT LINE BROKEN';
            this.padGradeMessage = `${grade.label} ROUTE LINE  ·  ${grade.cue}  ·  +${grade.score} PTS  ·  ${masteryMessage}`;
            this.padGradeToastTimer = 1.9;
            this.ui.padGradeToast?.setAttribute('data-grade', grade.label);
            this.updateRecoveryPadContractCompletions();
            this.updateRecoveryPadHud();

            const burstX = pad.x + pad.width / 2;
            const burstY = pad.y + pad.height * 0.45;
            this.spawnParticles(burstX, burstY, grade.color, grade.label === 'PERFECT' ? 30 : grade.label === 'CLEAN' ? 24 : 18, 15);
            this.spawnParticles(burstX, burstY, '#ffffff', grade.label === 'PERFECT' ? 14 : 10, 10);
            this.audio.playSFX('dash');
            this.shake(grade.label === 'PERFECT' ? 11 : grade.label === 'CLEAN' ? 9 : 7, 0.16);
            this.rival?.registerAdvantage('LAUNCH PAD', 0.012);
            window.ProgressLogger.logProgress('recovery_launch_pad_used', {
                stage: this.selectedStage,
                source: pad.sourceLabel,
                x: Math.round(pad.x / TILE_SIZE),
                landingGrade: grade.label,
                score: grade.score,
                mastery: cleanLaunch ? grade.mastery : 0,
                approachSpeed: grade.approachSpeed,
                descentSpeed: grade.descentSpeed,
                centerOffset: grade.centerOffset,
                quality: grade.quality
            });
            break;
        }
    }

    getRecoveryDetails(choice = 'safe') {
        const modifier = this.getModifierConfig(this.activeModifierId);
        const isRedline = choice === 'redline';
        const penaltyMultiplier = isRedline ? REDLINE_RECOVERY_PENALTY_MULTIPLIER : 1;
        return {
            choice: isRedline ? 'redline' : 'safe',
            penaltyMultiplier,
            timePenalty: CHECKPOINT_TIME_PENALTY * modifier.checkpointTimePenalty * penaltyMultiplier,
            scorePenalty: CHECKPOINT_SCORE_PENALTY * modifier.checkpointScorePenalty * penaltyMultiplier,
            launchSpeed: REDLINE_LAUNCH_SPEED,
            launchDuration: REDLINE_LAUNCH_DURATION
        };
    }

    showRecoveryChoice(checkpoint) {
        const safe = this.getRecoveryDetails('safe');
        const redline = this.getRecoveryDetails('redline');
        const checkpointLabel = checkpoint ? `CHECKPOINT ${checkpoint.index + 1}` : 'THE START LINE';
        const overlay = document.getElementById('msg-overlay');
        const startButton = document.getElementById('start-btn');
        this.ui.reducedFlashToggle?.classList.add('hidden');
        document.getElementById('route-selector')?.classList.remove('visible');

        if (overlay) {
            overlay.classList.remove('hidden', 'results-overlay');
            overlay.classList.add('recovery-overlay');
        }
        document.getElementById('overlay-title').textContent = 'FALL RECOVERY';
        document.getElementById('overlay-subtitle').textContent = 'The route is paused. Pick the line that matches your next-section strategy.';
        const routeBriefing = document.getElementById('route-briefing');
        if (routeBriefing) routeBriefing.classList.remove('visible');
        const resultsStats = document.getElementById('results-stats');
        if (resultsStats) resultsStats.innerHTML = '';
        if (startButton) startButton.classList.add('hidden');

        if (this.ui.recoveryCopy) {
            this.ui.recoveryCopy.textContent = `${checkpointLabel} is secured. Safe recovery protects the next attempt; Redline recovery costs more, then throws Dash into the next section at speed.`;
        }
        if (this.ui.recoveryOptions) {
            this.ui.recoveryOptions.innerHTML = `
              <button class="recovery-option" type="button" data-recovery-option="safe">
                <strong>RESUME AT ${checkpointLabel}</strong>
                <span class="recovery-effect">NORMAL PENALTY · -${safe.timePenalty}s / -${safe.scorePenalty} PTS</span>
                <span class="recovery-detail">Stable reset with the full recovery window. Rebuild pace safely and read the next hazard.</span>
              </button>
              <button class="recovery-option redline" type="button" data-recovery-option="redline">
                <strong>REDLINE RESET</strong>
                <span class="recovery-effect">HARSHER PENALTY · -${redline.timePenalty}s / -${redline.scorePenalty} PTS</span>
                <span class="recovery-detail">Launch at ${redline.launchSpeed} speed for ${redline.launchDuration.toFixed(1)}s. Risk the next line to claw back lost pace.</span>
              </button>
            `;
        }
        this.ui.recoveryChoice?.classList.add('visible');
        this.updateRivalHud();
        this.updateModifierHud();
        this.updateWindContractHud();
        this.updateRecoveryPadHud();
    }

    resolveRecoveryChoice(choice) {
        if (this.state !== 'RECOVERY_CHOICE' || !this.pendingRecovery || !this.player || !this.level) return;
        const details = this.getRecoveryDetails(choice);
        const checkpoint = this.pendingRecovery.checkpoint;
        const floorY = this.level.height - TILE_SIZE;
        const respawnX = checkpoint ? checkpoint.x + (checkpoint.width - this.player.width) / 2 : 100;
        const respawnY = floorY - this.player.height;
        const isRedline = details.choice === 'redline';

        this.timeScale = 1;
        this.slowMoTimer = 0;
        this.time += details.timePenalty;
        this.score = Math.max(0, this.score - details.scorePenalty);
        this.checkpointRecoveries++;
        if (isRedline) this.redlineRecoveryChoices++;
        else this.safeRecoveryChoices++;

        this.player.reviveAt(respawnX, respawnY);
        if (isRedline) {
            this.player.vx = details.launchSpeed;
            this.player.vy = REDLINE_LAUNCH_JUMP;
            this.player.facingRight = true;
            this.player.stamina = Math.round(MAX_STAMINA * 0.72);
            this.player.momentumBoostTimer = details.launchDuration;
            this.player.momentumBoostMultiplier = 1.55;
            this.player.recoveryTimer = REDLINE_RECOVERY_DURATION;
            this.player.damageCooldownTimer = REDLINE_RECOVERY_DURATION;
        }

        this.pendingRecovery = null;
        this.state = 'PLAYING';
        this.justRecovered = true;
        this.breakWindPrecisionChain();
        this.level.windCurrents.forEach(current => current.resetPrecisionAttempt());
        this.camera.x = Math.max(0, Math.min(respawnX - window.innerWidth / 3, this.level.width - window.innerWidth));
        this.checkpointFlashTimer = isRedline ? 0.5 : 0.36;
        this.checkpointToastTimer = 2.8;
        const locationLabel = checkpoint ? `CHECKPOINT ${checkpoint.index + 1}` : 'START LINE';
        this.checkpointMessage = isRedline
            ? `REDLINE RESET AT ${locationLabel}  ·  -${details.timePenalty}s  ·  -${details.scorePenalty} PTS  ·  LAUNCH +${details.launchSpeed} SPD`
            : `RECOVERED AT ${locationLabel}  ·  -${details.timePenalty}s  ·  -${details.scorePenalty} PTS`;
        this.momentumToastTimer = isRedline ? details.launchDuration : 0;
        this.momentumMessage = isRedline
            ? `REDLINE LAUNCH  ·  ${details.launchDuration.toFixed(1)}s ACCEL WINDOW  ·  COMMIT TO THE NEXT SECTION`
            : '';
        this.recoveryBurst = {
            x: respawnX + this.player.width / 2,
            y: respawnY + this.player.height / 2,
            life: 1,
            mode: details.choice
        };
        this.spawnParticles(this.recoveryBurst.x, this.recoveryBurst.y, isRedline ? '#ff8a00' : '#7cffeb', 42, 20);
        this.spawnParticles(this.recoveryBurst.x, this.recoveryBurst.y, '#ffffff', 18, 13);
        this.shake(isRedline ? 24 : 18, isRedline ? 0.4 : 0.32);
        this.audio.playSFX(isRedline ? 'dash' : 'jump');

        const overlay = document.getElementById('msg-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('recovery-overlay');
        }
        this.ui.recoveryChoice?.classList.remove('visible');
        document.getElementById('start-btn')?.classList.remove('hidden');
        this.updateStageHud();
        this.updateRivalHud();
        this.updateModifierHud();
        this.updateWindContractHud();
        this.updateRecoveryPadHud();
        window.ProgressLogger.logProgress('checkpoint_recovered', {
            stage: this.selectedStage,
            checkpoint: checkpoint ? checkpoint.index + 1 : 0,
            timePenalty: details.timePenalty,
            scorePenalty: details.scorePenalty,
            recoveryChoice: details.choice,
            penaltyMultiplier: details.penaltyMultiplier,
            momentumLaunch: isRedline,
            modifier: this.activeModifierId
        });
    }

    handleFailure() {
        if (this.state !== 'PLAYING' || !this.player || !this.level || this.pendingRecovery) return;
        const checkpoint = this.level.checkpoints[this.activeCheckpointIndex];
        this.pendingRecovery = {
            checkpointIndex: this.activeCheckpointIndex,
            checkpoint
        };
        Object.keys(this.input.keys).forEach(key => { this.input.keys[key] = false; });
        this.state = 'RECOVERY_CHOICE';
        this.showRecoveryChoice(checkpoint);
        window.ProgressLogger.logProgress('fall_recovery_offered', {
            stage: this.selectedStage,
            checkpoint: checkpoint ? checkpoint.index + 1 : 0,
            modifier: this.activeModifierId
        });
    }

    spawnFinishParticles(x, y, colors, count = 48, speed = 18) {
        if (!this.particles) this.particles = [];
        const available = Math.max(0, this.maxParticles - this.particles.length);
        const requestedCount = this.reducedFlash ? Math.ceil(count * 0.35) : count;
        const spawnCount = Math.min(requestedCount, available);
        const effectSpeed = this.reducedFlash ? speed * 0.72 : speed;
        for (let i = 0; i < spawnCount; i++) {
            const angle = (Math.PI * 2 * i) / spawnCount + (Math.random() - 0.5) * 0.24;
            const burstSpeed = effectSpeed * (0.55 + Math.random() * 0.75);
            this.particles.push({
                x: x + (Math.random() - 0.5) * 12,
                y: y + (Math.random() - 0.5) * 18,
                vx: Math.cos(angle) * burstSpeed,
                vy: Math.sin(angle) * burstSpeed,
                gravity: 0.18,
                drag: 0.985,
                life: 0.95 + Math.random() * 0.45,
                color: colors[i % colors.length],
                size: 3 + Math.random() * 4,
                isFinish: true
            });
        }
    }

    drawFinishSignature(ctx, celebration, reducedFlash = false) {
        const profile = celebration.profile || {};
        const progress = Math.min(1, celebration.elapsed / FINISH_CELEBRATION_DURATION);
        const fade = Math.min(1, celebration.elapsed / 0.28) * Math.max(0, 1 - Math.max(0, celebration.elapsed - 2.05) / 0.55) * (reducedFlash ? 0.58 : 1);
        const screenX = celebration.x - this.camera.x;
        const screenY = celebration.y - this.camera.y;
        const radius = Math.max(window.innerWidth, window.innerHeight) * 0.72;
        if (screenX < -radius || screenX > window.innerWidth + radius) return;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.lineCap = 'round';

        if (profile.id === 'sun-sweep') {
            const sweep = celebration.elapsed * 2.4;
            for (let i = 0; i < 5; i++) {
                const angle = -2.15 + sweep + i * 0.18;
                const spread = 0.055 + progress * 0.025;
                ctx.globalAlpha = fade * (0.12 - i * 0.014);
                ctx.fillStyle = profile.colors[i % profile.colors.length];
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(screenX + Math.cos(angle - spread) * radius, screenY + Math.sin(angle - spread) * radius);
                ctx.lineTo(screenX + Math.cos(angle + spread) * radius, screenY + Math.sin(angle + spread) * radius);
                ctx.closePath();
                ctx.fill();
            }
            ctx.globalAlpha = fade * 0.72;
            ctx.shadowBlur = 30;
            ctx.shadowColor = profile.colors[0];
            ctx.strokeStyle = profile.colors[1];
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(screenX, screenY, 42 + progress * 48, -1.9 + celebration.elapsed * 1.6, 0.15 + celebration.elapsed * 1.6);
            ctx.stroke();
            ctx.globalAlpha = fade * 0.9;
            ctx.fillStyle = profile.colors[1];
            ctx.beginPath();
            ctx.arc(screenX, screenY, 9 + Math.sin(celebration.elapsed * 10) * 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (profile.id === 'neon-vector') {
            const rotation = celebration.elapsed * 1.8;
            for (let i = 0; i < 6; i++) {
                const angle = rotation + i * Math.PI / 3;
                const inner = 34 + (i % 2) * 14;
                const outer = 150 + progress * 150 + (i % 3) * 22;
                ctx.globalAlpha = fade * (0.24 - (i % 3) * 0.035);
                ctx.strokeStyle = profile.colors[i % profile.colors.length];
                ctx.shadowBlur = 18;
                ctx.shadowColor = ctx.strokeStyle;
                ctx.lineWidth = 3 + (i % 2);
                ctx.setLineDash([18, 11]);
                ctx.beginPath();
                ctx.moveTo(screenX + Math.cos(angle) * inner, screenY + Math.sin(angle) * inner);
                ctx.lineTo(screenX + Math.cos(angle + 0.12) * (outer * 0.55), screenY + Math.sin(angle + 0.12) * (outer * 0.55));
                ctx.lineTo(screenX + Math.cos(angle) * outer, screenY + Math.sin(angle) * outer);
                ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.globalAlpha = fade * 0.8;
            ctx.strokeStyle = profile.colors[2];
            ctx.shadowBlur = 28;
            ctx.shadowColor = profile.colors[2];
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i <= 6; i++) {
                const angle = rotation + i * Math.PI / 3;
                const pointX = screenX + Math.cos(angle) * (48 + progress * 22);
                const pointY = screenY + Math.sin(angle) * (48 + progress * 22);
                if (i === 0) ctx.moveTo(pointX, pointY);
                else ctx.lineTo(pointX, pointY);
            }
            ctx.stroke();
        } else if (profile.id === 'crimson-overdrive') {
            const pulse = 1 + Math.sin(celebration.elapsed * 12) * 0.08;
            ctx.globalAlpha = fade * 0.18;
            ctx.fillStyle = profile.colors[1];
            ctx.beginPath();
            ctx.arc(screenX, screenY, 72 + progress * 160, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = fade * 0.8;
            ctx.strokeStyle = profile.colors[1];
            ctx.shadowBlur = 34;
            ctx.shadowColor = profile.colors[0];
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(screenX, screenY, (52 + progress * 126) * pulse, 0, Math.PI * 2);
            ctx.stroke();
            for (let i = 0; i < 14; i++) {
                const angle = (Math.PI * 2 * i) / 14 + celebration.elapsed * 0.7;
                const inner = 66 + progress * 42;
                const outer = inner + 32 + (i % 3) * 22;
                ctx.globalAlpha = fade * (0.5 - (i % 3) * 0.08);
                ctx.strokeStyle = profile.colors[i % profile.colors.length];
                ctx.lineWidth = i % 2 ? 3 : 5;
                ctx.beginPath();
                ctx.moveTo(screenX + Math.cos(angle) * inner, screenY + Math.sin(angle) * inner);
                ctx.lineTo(screenX + Math.cos(angle + 0.045) * outer, screenY + Math.sin(angle + 0.045) * outer);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    beginFinishCelebration() {
        if (this.state !== 'PLAYING' || !this.player || !this.level?.goal) return;

        const goal = this.level.goal;
        const stage = this.getStageConfig(this.selectedStage);
        const showdown = this.rival?.resolveShowdown(this.player, goal.x) || {
            id: 'photo-finish',
            title: 'PHOTO FINISH',
            callout: 'PHOTO FINISH // ROUTE SECURED',
            recap: 'Dash cleared the route.'
        };
        const totalRelics = this.level.relics.length;
        this.relicSetComplete = totalRelics > 0 && this.relicsCollected === totalRelics;
        if (this.relicSetComplete && !this.relicSetBonusAwarded) {
            this.score += RELIC_SET_BONUS;
            this.relicSetBonusAwarded = true;
        }
        const celebrationProfile = stage.celebration || {
            id: 'finish-burst',
            label: 'ROUTE BURST',
            callout: `ROUTE CLEAR // ${stage.name}`,
            colors: ['#ffd166', '#7cffeb', '#ffffff', '#ff8a3d'],
            flash: 'rgba(255, 255, 255, 0.2)'
        };
        const routeColors = celebrationProfile.colors;
        const holdX = goal.x - this.player.width * 0.58;
        const floorY = this.level.height - TILE_SIZE;

        this.player.x = holdX;
        this.player.y = floorY - this.player.height;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.grounded = true;
        this.player.isDashing = false;
        this.player.dashTimer = 0;
        this.player.dashCooldownTimer = 0;
        this.player.trail = [];
        this.finishCelebration = {
            elapsed: 0,
            x: goal.x + goal.width * 0.5,
            y: goal.y + goal.height * 0.28,
            colors: routeColors,
            profile: celebrationProfile,
            stageName: stage.name,
            showdown,
            relicSetComplete: this.relicSetComplete,
            relicBonus: this.relicSetComplete ? RELIC_SET_BONUS : 0,
            burstOne: false,
            burstTwo: false,
            burstThree: false
        };
        this.finishFlashTimer = FINISH_FLASH_DURATION;
        const finishToast = document.getElementById('finish-toast');
        if (finishToast) {
            finishToast.dataset.celebration = celebrationProfile.id;
            finishToast.dataset.showdown = showdown.id;
            finishToast.textContent = this.relicSetComplete
                ? `FULL RELIC SET  ·  +${RELIC_SET_BONUS.toLocaleString()} PRECISION BONUS`
                : showdown.callout;
            finishToast.classList.add('visible');
        }
        const checkpointToast = document.getElementById('checkpoint-toast');
        if (checkpointToast) checkpointToast.classList.remove('visible');
        const relicToast = document.getElementById('relic-toast');
        if (relicToast) relicToast.classList.remove('visible');
        this.state = 'CELEBRATING';
        this.audio.stopMusic();
        this.audio.playSFX('finish');
        this.shake(12, 0.28);
        this.spawnFinishParticles(this.finishCelebration.x, this.finishCelebration.y, routeColors, 58, 20);
        this.spawnParticles(this.finishCelebration.x, this.finishCelebration.y, '#ffffff', 18, 10);
        this.shockwaves.push(new Shockwave(this.finishCelebration.x, this.finishCelebration.y, {
            maxRadius: 220,
            speed: 20,
            palette: 'finish',
            reducedFlash: this.reducedFlash
        }));
        window.ProgressLogger.logProgress('finish_celebration_started', {
            stage: this.selectedStage,
            score: this.score,
            time: this.time,
            rivalShowdown: showdown
        });
    }

    updateFinishCelebration(dt) {
        const celebration = this.finishCelebration;
        if (!celebration) return;
        celebration.elapsed += Math.min(dt, 0.05);
        this.finishFlashTimer = Math.max(0, this.finishFlashTimer - dt);

        const profile = celebration.profile || {};
        if (!celebration.burstOne && celebration.elapsed >= 0.34) {
            celebration.burstOne = true;
            this.spawnFinishParticles(celebration.x - 52, celebration.y + 22, celebration.colors, 34, profile.id === 'crimson-overdrive' ? 18 : 13);
            if (profile.id === 'sun-sweep') {
                this.spawnFinishParticles(celebration.x - 118, celebration.y + 46, ['#fff4b0', '#ffd166'], 18, 10);
            }
            if (profile.id === 'neon-vector') {
                this.spawnFinishParticles(celebration.x - 120, celebration.y - 24, ['#7cffeb', '#ff4fd8'], 18, 16);
            }
            this.shake(profile.id === 'crimson-overdrive' ? 12 : 8, 0.18);
        }
        if (!celebration.burstTwo && celebration.elapsed >= 0.86) {
            celebration.burstTwo = true;
            this.spawnFinishParticles(celebration.x + 56, celebration.y - 10, celebration.colors, 42, profile.id === 'crimson-overdrive' ? 22 : 16);
            if (profile.id === 'sun-sweep') {
                this.spawnFinishParticles(celebration.x + 124, celebration.y - 2, ['#ffffff', '#ff9f43'], 22, 12);
            }
            if (profile.id === 'neon-vector') {
                this.spawnFinishParticles(celebration.x + 118, celebration.y + 28, ['#a78bfa', '#7cffeb'], 22, 18);
            }
            this.shake(profile.id === 'crimson-overdrive' ? 14 : 9, 0.2);
        }
        if (!celebration.burstThree && celebration.elapsed >= 1.45) {
            celebration.burstThree = true;
            this.spawnFinishParticles(celebration.x, celebration.y + 18, ['#ffffff', ...celebration.colors], profile.id === 'crimson-overdrive' ? 78 : 52, profile.id === 'crimson-overdrive' ? 28 : 23);
            this.shockwaves.push(new Shockwave(celebration.x, celebration.y, {
                maxRadius: profile.id === 'crimson-overdrive' ? 340 : 300,
                speed: profile.id === 'crimson-overdrive' ? 28 : 24,
                palette: 'finish',
                reducedFlash: this.reducedFlash
            }));
            this.shake(profile.id === 'crimson-overdrive' ? 22 : 14, profile.id === 'crimson-overdrive' ? 0.42 : 0.3);
        }

        const particles = this.particles || [];
        let aliveParticles = 0;
        for (const particle of particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= particle.drag || 0.99;
            particle.vy = particle.vy * (particle.drag || 0.99) + (particle.gravity || 0);
            particle.life -= 0.05;
            if (particle.life > 0) particles[aliveParticles++] = particle;
        }
        particles.length = aliveParticles;
        this.particles = particles;
        this.shockwaves = this.shockwaves.filter(sw => sw.update(dt));

        const finishToast = document.getElementById('finish-toast');
        if (finishToast) {
            const signatureLabel = celebration.profile?.callout || `FINISH LINE  ·  ${celebration.stageName}`;
            finishToast.textContent = celebration.elapsed < 0.82
                ? (celebration.showdown?.callout || `${this.rival?.name || 'VEX'} OVERTAKE  ·  HOLD THE LINE`)
                : celebration.relicSetComplete && celebration.elapsed < 1.15
                    ? `FULL RELIC SET  ·  +${celebration.relicBonus.toLocaleString()} PRECISION BONUS`
                    : celebration.elapsed < 1.15
                        ? signatureLabel
                        : celebration.elapsed < 1.9
                            ? `${celebration.profile?.label || 'ROUTE BURST'}  ·  FLAG LOCKED`
                            : 'ROUTE SECURED  ·  STAGE CLEAR';
            finishToast.classList.toggle('visible', celebration.elapsed < FINISH_CELEBRATION_DURATION - 0.2);
        }
        const checkpointToast = document.getElementById('checkpoint-toast');
        if (checkpointToast) checkpointToast.classList.remove('visible');

        const targetX = celebration.x - window.innerWidth * 0.5;
        this.camera.x += (targetX - this.camera.x) * 0.12;
        this.camera.x = Math.max(0, Math.min(this.camera.x, this.level.width - window.innerWidth));
        this.updateRivalHud();
        this.updateShake(dt);

        if (celebration.elapsed >= FINISH_CELEBRATION_DURATION) {
            this.win();
        }
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.audio.stopMusic();
        this.updateRivalHud();
        this.updateModifierHud();
        this.updateWindContractHud();
        this.updateRecoveryPadHud();
        const overlay = document.getElementById('msg-overlay');
        overlay.classList.remove('hidden');
        overlay.classList.remove('results-overlay', 'recovery-overlay');
        this.ui.recoveryChoice?.classList.remove('visible');
        document.getElementById('route-selector')?.classList.remove('visible');
        this.ui.reducedFlashToggle?.classList.add('hidden');
        document.getElementById('start-btn').classList.remove('hidden');
        document.getElementById('overlay-title').textContent = "GAME OVER";
        document.getElementById('overlay-subtitle').textContent = `Score: ${this.score}`;
        document.getElementById('results-stats').innerHTML = '';
        const routeBriefing = document.getElementById('route-briefing');
        if (routeBriefing) routeBriefing.classList.remove('visible');
        document.getElementById('start-btn').textContent = "TRY AGAIN";
    }

    win() {
        if (this.state !== 'CELEBRATING') return;
        this.state = 'WIN';
        this.audio.stopMusic();
        this.updateRivalHud();
        this.updateModifierHud();
        this.updateWindContractHud();
        this.updateRecoveryPadHud();
        const stage = this.getStageConfig(this.selectedStage);
        const showdown = this.finishCelebration?.showdown || this.rival?.showdown || {
            id: 'photo-finish', title: 'PHOTO FINISH', rivalName: this.rival?.name || 'VEX',
            gapSeconds: 0, lateDeficitSeconds: 0, recap: 'Dash cleared the route.'
        };
        const mastery = stage.id === 3 ? this.getBloodMoonMastery() : null;
        const challenges = this.getChallengeRecap();
        const windContracts = this.getWindContractRecap();
        const recoveryPads = this.getRecoveryPadRecap();
        const routeForks = this.getRouteForkRecap();
        const performanceGrade = this.getRoutePerformanceGrade(stage, challenges, routeForks, recoveryPads);
        const challengeGroups = [challenges.shortcuts, challenges.comboVaults, challenges.bloodlustBeacons];
        const challengeTotal = challengeGroups.reduce((sum, group) => sum + group.earned, 0);
        const totalChallenges = challengeGroups.reduce((sum, group) => sum + group.total, 0);
        const personalBestResult = this.recordRouteClear(stage, {
            time: this.time,
            score: this.score,
            combo: this.bestCombo,
            challenges: challengeTotal
        });
        const activeModifier = this.getModifierConfig(this.activeModifierId);
        this.runStats = {
            stage: stage.id,
            score: this.score,
            time: this.time,
            challengeTotal,
            totalChallenges,
            personalBests: personalBestResult.personalBests,
            routeRecords: personalBestResult.records,
            bloodlustActivations: this.player.bloodlustActivations,
            bloodlustTime: this.player.totalBloodlustTime,
            enemiesDefeated: this.enemiesDefeated,
            armoredBreakthroughs: this.armoredBreakthroughs,
            momentumGatesCleared: this.momentumGatesCleared,
            precisionLinesCleared: this.precisionLinesCleared,
            precisionLinesTotal: this.level.windCurrents.length,
            precisionBonusScore: this.precisionBonusScore,
            windContractBonusScore: this.windContractBonusScore,
            windContracts,
            recoveryPads,
            relicsCollected: this.relicsCollected,
            totalRelics: this.level.relics.length,
            relicSetComplete: this.relicSetComplete,
            relicSetBonus: this.relicSetComplete ? RELIC_SET_BONUS : 0,
            bestCombo: this.bestCombo,
            checkpointRecoveries: this.checkpointRecoveries,
            safeRecoveryChoices: this.safeRecoveryChoices,
            redlineRecoveryChoices: this.redlineRecoveryChoices,
            rivalName: this.rival?.name || 'VEX',
            rivalProgress: this.rival ? Math.round(this.rival.progress * 100) : 0,
            routeForks,
            rivalShowdown: showdown,
            modifier: {
                id: activeModifier.id,
                label: activeModifier.label,
                effect: activeModifier.effect,
                description: activeModifier.description
            },
            mastery,
            performanceGrade,
            challenges
        };
        const nextStage = STAGE_CONFIGS.find(candidate => candidate.id === stage.id + 1);
        if (nextStage) this.saveUnlockedStage(nextStage.id);

        const overlay = document.getElementById('msg-overlay');
        const finishToast = document.getElementById('finish-toast');
        if (finishToast) finishToast.classList.remove('visible');
        const routeBriefing = document.getElementById('route-briefing');
        if (routeBriefing) routeBriefing.classList.remove('visible');
        overlay.classList.remove('hidden');
        overlay.classList.remove('recovery-overlay');
        overlay.classList.add('results-overlay');
        this.ui.recoveryChoice?.classList.remove('visible');
        this.ui.reducedFlashToggle?.classList.remove('hidden');
        this.updateReducedFlashToggle();
        document.getElementById('start-btn').classList.remove('hidden');
        document.getElementById('overlay-title').textContent = nextStage ? 'STAGE CLEAR!' : 'ALL ROUTES CLEAR!';
        document.getElementById('overlay-subtitle').textContent = nextStage
            ? `${stage.name} complete — ${nextStage.name} is now unlocked.`
            : 'Every route conquered — you are the champion!';
        document.getElementById('results-stats').innerHTML = `
          <div class="result-stat"><span>ROUTE ${stage.id} · ${stage.name}</span><strong>${String(this.score).padStart(4, '0')} PTS</strong></div>
          <div class="result-stat"><span>COMPLETION TIME</span><strong>${this.formatTime(this.time)}</strong></div>
          <div class="result-stat"><span>BEST COMBO</span><strong>X${this.bestCombo}</strong></div>
          ${this.renderPersonalBestCard(stage, personalBestResult, {
              time: this.time,
              score: this.score,
              combo: this.bestCombo,
              challenges: challengeTotal,
              totalChallenges
          })}
          ${this.renderRoutePerformanceCard(performanceGrade)}
          ${this.renderRivalryRecap(stage, showdown)}
          <div class="result-stat"><span>BUMPERS DEFEATED</span><strong>${this.enemiesDefeated}</strong></div>
          ${(stage.momentumGates?.length || 0) > 0 ? `<div class="result-stat momentum-stat"><span>MOMENTUM GATES</span><strong>${this.momentumGatesCleared}/${stage.momentumGates.length}</strong></div>` : ''}
          ${this.level.windCurrents.length > 0 ? `<div class="result-stat precision-stat"><span>WIND PRECISION</span><strong>${this.precisionLinesCleared}/${this.level.windCurrents.length} · +${this.precisionBonusScore.toLocaleString()}</strong></div>` : ''}
          ${this.renderWindContractRecap(windContracts)}
          ${this.renderRecoveryPadRecap(recoveryPads)}
          <div class="result-stat relic-stat"><span>RELICS RECOVERED</span><strong>${this.relicsCollected}/${this.level.relics.length}</strong></div>
          ${this.relicSetComplete ? `<section class="relic-complete-card" aria-label="Full relic set complete"><span class="relic-complete-kicker">✦ PRECISION REPLAY COMPLETE</span><strong>FULL RELIC SET SECURED</strong><span>+${RELIC_SET_BONUS.toLocaleString()} POINTS · EVERY RISKY LINE CLAIMED</span></section>` : ''}
          ${this.renderChallengeRecap(challenges)}
          ${stage.id === 3 ? `<div class="result-stat armor-stat"><span>ARMORED BREAKTHROUGHS</span><strong>${this.armoredBreakthroughs}</strong></div>` : ''}
          ${stage.id === 3 ? `<section class="mastery-card" aria-label="Blood Moon mastery results">
            <div class="mastery-heading">
              <div>
                <span class="mastery-kicker">BLOOD MOON MASTERY</span>
                <strong class="mastery-title">${mastery.title}</strong>
              </div>
              <strong class="mastery-rank">${mastery.rank}</strong>
            </div>
            <div class="mastery-score"><span>MASTERY SCORE</span><strong>${mastery.score}/100</strong></div>
            <div class="mastery-breakdown">
              <div><span>ARMOR</span><strong>${mastery.breakdown.armor}/30</strong></div>
              <div><span>BLOODLUST</span><strong>${mastery.breakdown.bloodlust}/20</strong></div>
              <div><span>COMBO</span><strong>${mastery.breakdown.combo}/25</strong></div>
              <div><span>DISCIPLINE</span><strong>${mastery.breakdown.discipline}/25</strong></div>
            </div>
            <div class="mastery-targets">
              <span>REPLAY TARGETS</span>
              <ul>${mastery.targets.map(target => `<li>${target}</li>`).join('')}</ul>
            </div>
          </section>` : ''}
          <div class="result-stat"><span>BLOODLUST TRIGGERS</span><strong>${this.player.bloodlustActivations}</strong></div>
          <div class="result-stat"><span>INVINCIBLE TIME</span><strong>${this.player.totalBloodlustTime.toFixed(1)}s</strong></div>
          <div class="result-stat"><span>CHECKPOINT RECOVERIES</span><strong>${this.checkpointRecoveries}</strong></div>
          <div class="result-stat"><span>RECOVERY LINE</span><strong>${this.safeRecoveryChoices} SAFE · ${this.redlineRecoveryChoices} REDLINE</strong></div>
          ${this.renderRouteForkRecap(routeForks)}
          ${this.renderModifierSummary(activeModifier)}
          ${this.renderRematchPanel()}
        `;
        this.secondaryStage = nextStage ? nextStage.id : null;
        this.routeSelectionStage = nextStage ? nextStage.id : stage.id;
        this.awaitingBriefing = nextStage?.id === 3;
        this.updateRouteSelector();
        window.ProgressLogger.logProgress('stage_cleared', {
            stage: stage.id,
            score: this.score,
            time: this.time,
            challengeTotal,
            totalChallenges,
            personalBests: personalBestResult.personalBests,
            routeRecords: personalBestResult.records,
            bloodlustActivations: this.player.bloodlustActivations,
            bloodlustTime: this.player.totalBloodlustTime,
            enemiesDefeated: this.enemiesDefeated,
            armoredBreakthroughs: this.armoredBreakthroughs,
            momentumGatesCleared: this.momentumGatesCleared,
            precisionLinesCleared: this.precisionLinesCleared,
            precisionLinesTotal: this.level.windCurrents.length,
            precisionBonusScore: this.precisionBonusScore,
            windContractBonusScore: this.windContractBonusScore,
            windContracts,
            recoveryPads,
            relicsCollected: this.relicsCollected,
            totalRelics: this.level.relics.length,
            relicSetComplete: this.relicSetComplete,
            relicSetBonus: this.relicSetBonusAwarded ? RELIC_SET_BONUS : 0,
            bestCombo: this.bestCombo,
            checkpointRecoveries: this.checkpointRecoveries,
            safeRecoveryChoices: this.safeRecoveryChoices,
            redlineRecoveryChoices: this.redlineRecoveryChoices,
            rivalName: this.rival?.name || 'VEX',
            rivalProgress: this.rival ? Math.round(this.rival.progress * 100) : 0,
            rivalShowdown: this.runStats?.rivalShowdown || null,
            routeForks: this.runStats?.routeForks || null,
            modifier: this.runStats?.modifier || null,
            mastery: this.runStats?.mastery || null,
            performanceGrade: this.runStats?.performanceGrade || null,
            challenges: this.runStats?.challenges || null
        });
    }

    getBloodMoonMastery() {
        const armoredTotal = Math.max(1, this.getStageConfig(3).enemies.filter(enemy => enemy.armored).length);
        const armorScore = Math.round(Math.min(this.armoredBreakthroughs, armoredTotal) / armoredTotal * 30);
        const bloodlustScore = Math.min(20, this.player.bloodlustActivations * 10);
        const comboScore = Math.round(Math.min(this.bestCombo, 10) / 10 * 25);
        const disciplineScore = Math.round(25 * Math.max(0, 1 - Math.min(this.checkpointRecoveries, 3) / 3));
        const score = armorScore + bloodlustScore + comboScore + disciplineScore;
        const rank = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 60 ? 'B' : 'C';
        const title = {
            S: 'MOONBREAKER',
            A: 'BLOODRUNNER',
            B: 'EDGE RIDER',
            C: 'ROUTE INITIATE'
        }[rank];
        const targets = [];
        const remainingArmor = Math.max(0, armoredTotal - this.armoredBreakthroughs);

        if (remainingArmor > 0) {
            targets.push(`Break ${remainingArmor} more armored Bumper${remainingArmor === 1 ? '' : 's'} with direct Dashes.`);
        }
        if (this.player.bloodlustActivations < 2) {
            const triggersNeeded = 2 - this.player.bloodlustActivations;
            targets.push(`Trigger Bloodlust ${triggersNeeded} more time${triggersNeeded === 1 ? '' : 's'} through a clean high-combo finish.`);
        }
        if (this.bestCombo < 10) {
            targets.push(`Stretch your best combo to X10 (current peak: X${this.bestCombo}).`);
        }
        if (this.checkpointRecoveries > 0) {
            targets.push(`Finish with zero checkpoint recoveries (current run: ${this.checkpointRecoveries}).`);
        }
        if (targets.length === 0) {
            targets.push('Perfect control secured — preserve the sweep and shave time on the next run.');
        }

        return {
            rank,
            title,
            score,
            breakdown: {
                armor: armorScore,
                bloodlust: bloodlustScore,
                combo: comboScore,
                discipline: disciplineScore
            },
            targets
        };
    }

    getWindContractRecap() {
        const contracts = this.getWindContractConfigs().map(contract => {
            const progress = this.getWindContractProgress(contract);
            return {
                id: contract.id,
                label: contract.label,
                description: contract.description,
                kind: contract.kind,
                target: progress.target,
                value: progress.value,
                detail: progress.detail,
                completed: progress.completed,
                reward: Math.max(0, Number(contract.reward) || 0)
            };
        });
        return {
            completed: contracts.filter(contract => contract.completed).length,
            total: contracts.length,
            bonusScore: this.windContractBonusScore,
            bestChain: this.windPrecisionBestChain,
            precisionScore: this.precisionBonusScore,
            lineTypes: this.windPrecisionTypes.size,
            contracts
        };
    }

    renderWindContractRecap(recap) {
        if (!recap || recap.total === 0) return '';
        const rows = recap.contracts.map(contract => `
          <div class="wind-contract-recap-row ${contract.completed ? 'earned' : 'unfinished'}">
            <span class="wind-contract-recap-state">${contract.completed ? '✦ COMPLETE' : '○ UNFINISHED'}</span>
            <strong>${contract.label}</strong>
            <span class="wind-contract-recap-detail">${contract.completed ? `+${contract.reward.toLocaleString()} PTS SECURED` : `${contract.detail} · NEXT RUN`}</span>
            <small>${contract.description}</small>
          </div>
        `).join('');
        return `<section class="wind-contract-recap ${recap.completed > 0 ? 'has-complete' : ''}" aria-label="Wind replay contract recap">
          <div class="wind-contract-recap-heading">
            <div><span class="wind-contract-recap-kicker">WINDLINES // REPLAY CONTRACTS</span><strong>CONTRACT RECAP</strong></div>
            <strong class="wind-contract-recap-total">${recap.completed}/${recap.total}</strong>
          </div>
          <p class="wind-contract-recap-intro">${recap.completed > 0 ? `${recap.completed} contract${recap.completed === 1 ? '' : 's'} completed during the run. The route paid ${recap.bonusScore.toLocaleString()} bonus points.` : 'Replay the named wind contracts to turn clean line reading into bonus points.'}</p>
          <div class="wind-contract-recap-meta"><span>LINE TYPES <b>${recap.lineTypes}/3</b></span><span>BEST CHAIN <b>${recap.bestChain}</b></span><span>WIND SCORE <b>${recap.precisionScore.toLocaleString()}</b></span></div>
          <div class="wind-contract-recap-list">${rows}</div>
        </section>`;
    }

    renderRecoveryPadRecap(recap) {
        if (!recap || recap.total === 0) return '';
        const mastered = recap.completed === recap.total;
        const rows = recap.contracts.map(contract => `
          <div class="wind-contract-recap-row ${contract.completed ? 'earned' : 'unfinished'}">
            <span class="wind-contract-recap-state">${contract.completed ? '✦ COMPLETE' : '○ UNFINISHED'}</span>
            <strong>${contract.label}</strong>
            <span class="wind-contract-recap-detail">${contract.completed ? `+${contract.reward.toLocaleString()} PTS SECURED` : `${contract.detail} · NEXT RUN`}</span>
            <small>${contract.description}</small>
          </div>
        `).join('');
        const intro = mastered
            ? `PAD LINE MASTERED · All ${recap.total} recovery objectives cleared for +${recap.bonusScore.toLocaleString()} bonus points.`
            : `${recap.completed}/${recap.total} pad objectives earned · ${recap.bonusScore.toLocaleString()} bonus points secured. Build a cleaner launch line next run.`;
        const grades = recap.gradeCounts || { EDGE: 0, CLEAN: 0, PERFECT: 0 };
        return `<section class="wind-contract-recap recovery-pad-recap ${recap.completed > 0 ? 'has-complete' : ''} ${mastered ? 'mastered' : ''}" aria-label="Recovery pad mastery recap">
          <div class="wind-contract-recap-heading">
            <div><span class="wind-contract-recap-kicker">RECOVERY LINE // PAD MASTERY</span><strong>${mastered ? 'PAD LINE MASTERED' : 'PAD MASTERY RECAP'}</strong></div>
            <strong class="wind-contract-recap-total">${recap.completed}/${recap.total}</strong>
          </div>
          <p class="wind-contract-recap-intro">${intro}<br>LANDING GRADES · PERFECT ${grades.PERFECT} / CLEAN ${grades.CLEAN} / EDGE ${grades.EDGE} · +${recap.landingScore.toLocaleString()} PAD PTS</p>
          <div class="wind-contract-recap-meta"><span>UNIQUE PADS <b>${recap.uniquePads}/${recap.totalPads}</b></span><span>BEST CHAIN <b>${recap.bestChain}</b></span><span>CLEAN BOOSTS <b>${recap.cleanBoosts}</b></span><span>CLEAN MASTERY <b>${recap.cleanMastery}</b></span></div>
          <div class="wind-contract-recap-list">${rows}</div>
        </section>`;
    }

    getRouteForkRecap() {
        const forks = this.level?.routeForks || [];
        return {
            chosen: forks.filter(fork => fork.selected).length,
            total: forks.length,
            fast: forks.filter(fork => fork.selected === 'fast').length,
            safe: forks.filter(fork => fork.selected === 'safe').length,
            forks: forks.map(fork => ({
                id: fork.id,
                label: fork.label,
                selected: fork.selected || 'not-reached',
                reward: fork.selected === 'fast' ? fork.reward : (fork.selected === 'safe' ? fork.safeScore || 250 : 0),
                gateMode: fork.gateMode || 'not-set'
            }))
        };
    }

    renderRouteForkRecap(recap) {
        if (!recap || recap.total === 0) return '';
        const pathDetails = recap.forks.map(fork => {
            const pathLabel = fork.selected === 'fast'
                ? `FAST CUT +${fork.reward.toLocaleString()} PTS · TIGHT EXIT`
                : fork.selected === 'safe'
                    ? `SAFE LINE +${fork.reward.toLocaleString()} PTS · WIDE EXIT`
                    : 'NOT REACHED';
            return `<span>${fork.label}: <b>${pathLabel}</b></span>`;
        }).join('');
        return `<section class="route-fork-recap" aria-label="Route fork choices">
          <div class="route-fork-heading"><span>ROUTE PLANNING · ${recap.chosen}/${recap.total} DECISIONS</span><strong>${recap.fast} FAST · ${recap.safe} SAFE</strong></div>
          <div class="route-fork-details">${pathDetails}</div>
        </section>`;
    }

    getChallengeRecap() {
        const buildGroup = (items, title, rewardLabel) => {
            const safeItems = items || [];
            return {
                title,
                earned: safeItems.filter(item => item.earned).length,
                total: safeItems.length,
                items: safeItems.map(item => ({
                    label: item.label,
                    earned: Boolean(item.earned),
                    reward: `+${Number(item.reward || 0).toLocaleString()} PTS · ${rewardLabel(item)}`
                }))
            };
        };

        return {
            shortcuts: buildGroup(
                this.level?.challengeShortcuts,
                'OPTIONAL SHORTCUTS',
                () => 'HIGH LINE REWARD'
            ),
            comboVaults: buildGroup(
                this.level?.comboVaults,
                'COMBO VAULTS',
                item => `COMBO X${item.comboRequired} REWARD`
            ),
            bloodlustBeacons: buildGroup(
                this.level?.bloodlustBeacons,
                'BLOODLUST BEACONS',
                () => '+0.6s FURY EXTENSION'
            )
        };
    }

    renderChallengeRecap(recap) {
        const groups = [recap.shortcuts, recap.comboVaults, recap.bloodlustBeacons];
        const earned = groups.reduce((sum, group) => sum + group.earned, 0);
        const total = groups.reduce((sum, group) => sum + group.total, 0);
        const groupMarkup = groups.map(group => `
          <div class="challenge-group">
            <div class="challenge-group-heading"><span>${group.title}</span><strong>${group.earned}/${group.total}</strong></div>
            ${group.items.map(item => `
              <div class="challenge-row ${item.earned ? 'earned' : 'unfinished'}">
                <span class="challenge-state" aria-label="${item.earned ? 'Earned' : 'Unfinished'}">${item.earned ? '✓ EARNED' : '○ UNFINISHED'}</span>
                <strong>${item.label}</strong>
                <span class="challenge-reward">${item.reward}${item.earned ? '' : ' · NEXT RUN'}</span>
              </div>
            `).join('')}
          </div>
        `).join('');

        return `<section class="challenge-recap" aria-label="Optional challenge recap">
          <div class="challenge-recap-heading">
            <div><span class="challenge-recap-kicker">RUN MASTERY // OPTIONAL LINES</span><strong>CHALLENGE RECAP</strong></div>
            <strong class="challenge-recap-total">${earned}/${total}</strong>
          </div>
          <p class="challenge-recap-intro">Chase these riskier lines for bonus points, combo momentum, and longer Bloodlust windows.</p>
          <div class="challenge-groups">${groupMarkup}</div>
        </section>`;
    }

    getRoutePerformanceGrade(stage, challenges, routeForks, recoveryPads) {
        const clamp01 = value => Math.max(0, Math.min(1, value));
        const paceParSeconds = Math.round(stage.tileCount * 0.15);
        const paceShare = clamp01((paceParSeconds * 1.5 - this.time) / (paceParSeconds * 0.5));
        const enemyTotal = stage.enemies?.length || 0;
        const enemyShare = enemyTotal > 0 ? clamp01(this.enemiesDefeated / enemyTotal) : 1;
        const comboTarget = 8;
        const comboShare = clamp01(this.bestCombo / comboTarget);
        const windTotal = this.level?.windCurrents?.length || 0;
        const precisionShare = windTotal > 0 ? clamp01(this.precisionLinesCleared / windTotal) : 1;
        const challengeGroups = Object.values(challenges || {});
        const challengeTotal = challengeGroups.reduce((sum, group) => sum + (group.total || 0), 0);
        const challengeEarned = challengeGroups.reduce((sum, group) => sum + (group.earned || 0), 0);
        const challengeShare = challengeTotal > 0 ? clamp01(challengeEarned / challengeTotal) : 1;
        const relicTotal = this.level?.relics?.length || 0;
        const relicShare = relicTotal > 0 ? clamp01(this.relicsCollected / relicTotal) : 1;
        const forkTotal = routeForks?.total || 0;
        const forkShare = forkTotal > 0 ? clamp01((routeForks.chosen || 0) / forkTotal) : 1;
        const recoveryShare = clamp01(1 - this.checkpointRecoveries / 3);
        const padLaunches = recoveryPads?.launches || 0;
        const cleanPadShare = padLaunches > 0
            ? clamp01((recoveryPads.cleanBoosts || 0) / padLaunches)
            : 1;
        const categories = [
            { id: 'pace', label: 'PACE', score: Math.round(paceShare * 20), max: 20 },
            { id: 'combat', label: 'COMBAT', score: Math.round((enemyShare * 0.6 + comboShare * 0.4) * 20), max: 20 },
            { id: 'precision', label: 'PRECISION', score: Math.round(precisionShare * 15), max: 15 },
            { id: 'challenges', label: 'CHALLENGES', score: Math.round(challengeShare * 15), max: 15 },
            { id: 'relics', label: 'RELICS', score: Math.round(relicShare * 10), max: 10 },
            { id: 'forks', label: 'FORKS', score: Math.round(forkShare * 10), max: 10 },
            { id: 'recovery', label: 'RECOVERY', score: Math.round((recoveryShare * 0.8 + cleanPadShare * 0.2) * 10), max: 10 }
        ];
        const score = categories.reduce((sum, category) => sum + category.score, 0);
        const rank = score >= 90 ? 'S' : score >= 80 ? 'A' : score >= 68 ? 'B' : score >= 55 ? 'C' : 'D';
        const title = {
            S: 'ROUTE ACE',
            A: 'PACE SETTER',
            B: 'STRONG CLEAR',
            C: 'ROUTE RUNNER',
            D: 'FINISHER'
        }[rank];
        const strongest = categories.reduce((best, category) =>
            category.score / category.max > best.score / best.max ? category : best
        );
        const strengthCopy = {
            pace: `The clock was your edge: ${this.formatTime(this.time)} on a ${this.formatTime(paceParSeconds)} route-pace mark.`,
            combat: `${this.enemiesDefeated}/${enemyTotal} Bumpers down and a peak X${this.bestCombo} chain — you brought the fight.`,
            precision: `${this.precisionLinesCleared}/${windTotal} wind lines cleared — sharp reads carried you through.`,
            challenges: `${challengeEarned}/${challengeTotal} optional challenges claimed — you took the risky lines.`,
            relics: `${this.relicsCollected}/${relicTotal} relics recovered — a standout high-line run.`,
            forks: `${routeForks?.chosen || 0}/${forkTotal} route decisions made — decisive pathing from start to finish.`,
            recovery: this.checkpointRecoveries === 0
                ? (padLaunches > 0
                    ? `No checkpoint resets; ${recoveryPads.cleanBoosts}/${padLaunches} recovery-pad launches stayed clean.`
                    : 'No checkpoint resets — disciplined from the start line to the flag.')
                : `${this.checkpointRecoveries} ${this.checkpointRecoveries === 1 ? 'checkpoint recovery' : 'checkpoint recoveries'} taken; you kept the run alive and reached the flag.`
        }[strongest.id];

        const weakest = categories.reduce((worst, category) =>
            category.score / category.max < worst.score / worst.max ? category : worst
        );
        const missedChallenge = challengeGroups.flatMap(group => group.items || []).find(item => !item.earned);
        const unchosenFork = routeForks?.forks?.find(fork => fork.selected === 'not-reached');
        let replayTarget;
        switch (weakest.id) {
            case 'pace':
                replayTarget = `Trim this ${this.formatTime(this.time)} clear toward the ${this.formatTime(paceParSeconds)} pace mark.`;
                break;
            case 'combat':
                replayTarget = enemyShare <= comboShare && this.enemiesDefeated < enemyTotal
                    ? `Stomp more Bumpers (${this.enemiesDefeated}/${enemyTotal}) to keep combat momentum rolling.`
                    : `Build your best combo beyond X${this.bestCombo}; aim for X${comboTarget}.`;
                break;
            case 'precision':
                replayTarget = `Clear every wind precision line (${this.precisionLinesCleared}/${windTotal}) on the next run.`;
                break;
            case 'challenges':
                replayTarget = missedChallenge
                    ? `Claim ${missedChallenge.label}, the next optional challenge to add to your run.`
                    : `Raise your optional challenge haul (${challengeEarned}/${challengeTotal}).`;
                break;
            case 'relics':
                replayTarget = `Recover more relics (${this.relicsCollected}/${relicTotal}) along the high lines.`;
                break;
            case 'forks':
                replayTarget = unchosenFork
                    ? `Reach ${unchosenFork.label} and commit to a route (${routeForks.chosen}/${forkTotal} decisions made).`
                    : `Try the fast cut at ${routeForks.forks[0]?.label || 'the route fork'} for a tighter, speedier exit.`;
                break;
            default:
                replayTarget = this.checkpointRecoveries > 0
                    ? `Aim for zero checkpoint recoveries (this clear: ${this.checkpointRecoveries}).`
                    : padLaunches > (recoveryPads.cleanBoosts || 0)
                        ? 'Keep every recovery-pad launch clean by avoiding hits between landings.'
                        : 'Keep this no-recovery clear and shave time off the same clean line.';
        }

        return { score, rank, title, categories, strongest: strongest.label, strengthCopy, replayTarget, paceParSeconds };
    }

    renderRoutePerformanceCard(grade) {
        const breakdown = grade.categories.map(category => `
          <div><span>${category.label}</span><strong>${category.score}<small>/${category.max}</small></strong></div>
        `).join('');
        const accent = this.getStageConfig(this.selectedStage).paceTheme?.accent || '#ffd166';
        return `<section class="performance-grade-card" data-tier="${grade.rank}" style="--grade-accent:${accent}" aria-label="Route performance grade ${grade.rank}, ${grade.score} out of 100">
          <div class="performance-grade-heading">
            <div><span>ROUTE PERFORMANCE // MASTERY</span><strong>${grade.title}</strong></div>
            <strong class="performance-grade-rank">${grade.rank}</strong>
          </div>
          <div class="performance-grade-score"><span>PERFORMANCE SCORE</span><strong>${grade.score}<small>/100</small></strong></div>
          <div class="performance-grade-highlights">
            <div><span>STRONGEST AREA</span><p>${grade.strengthCopy}</p></div>
            <div class="replay-target"><span>REPLAY TARGET</span><p>${grade.replayTarget}</p></div>
          </div>
          <div class="performance-grade-breakdown" aria-label="Grade breakdown">${breakdown}</div>
        </section>`;
    }

    renderPersonalBestCard(stage, result, run) {
        const totalChallenges = Math.max(0, Number(run.totalChallenges) || 0);
        const newCount = Object.values(result.personalBests).filter(Boolean).length;
        const metrics = [
            {
                key: 'time',
                label: 'TIME',
                value: this.formatTime(result.records.time),
                runValue: this.formatTime(run.time)
            },
            {
                key: 'score',
                label: 'SCORE',
                value: result.records.score.toLocaleString(),
                runValue: run.score.toLocaleString()
            },
            {
                key: 'combo',
                label: 'COMBO',
                value: `X${result.records.combo}`,
                runValue: `X${run.combo}`
            },
            {
                key: 'challenges',
                label: 'OPTIONAL LINES',
                value: `${result.records.challenges}/${totalChallenges}`,
                runValue: `${run.challenges}/${totalChallenges}`
            }
        ];
        const title = result.isFirstClear
            ? 'FIRST ROUTE RECORD'
            : newCount > 0
                ? `${newCount} PERSONAL BEST${newCount === 1 ? '' : 'S'}`
                : 'RECORDS HELD';
        const intro = result.isFirstClear
            ? `Local records saved for ${stage.name}. Every category is now a target for the next precision replay.`
            : newCount > 0
                ? 'The highlighted categories moved your local records forward. Chase the remaining targets on the next run.'
                : 'No category record fell this run. Your saved route targets are still waiting for a cleaner line.';
        const metricMarkup = metrics.map(metric => {
            const isNew = Boolean(result.personalBests[metric.key]);
            return `<div class="personal-best-metric ${isNew ? 'new' : ''}">
              <span>${metric.label}</span>
              <strong>${metric.value}</strong>
              <small>${isNew ? '✦ NEW PERSONAL BEST' : `RECORD HELD · RUN ${metric.runValue}`}</small>
            </div>`;
        }).join('');

        return `<section class="personal-best-card ${newCount > 0 ? 'has-new' : ''}" aria-label="Personal best records">
          <div class="personal-best-heading">
            <div><span class="personal-best-kicker">LOCAL RECORDS // ${stage.name}</span><strong class="personal-best-title">${title}</strong></div>
            <strong class="personal-best-count">${newCount}/4</strong>
          </div>
          <p class="personal-best-intro">${intro}</p>
          <div class="personal-best-grid">${metricMarkup}</div>
        </section>`;
    }

    formatTime(seconds) {
        const safeSeconds = Math.max(0, Math.floor(seconds));
        return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
    }

    shake(intensity, duration) {
        // Keep impact feedback, but make camera movement gentler in reduced-flash mode.
        const adjustedIntensity = intensity * (this.reducedFlash ? 0.24 : 1);
        this.shakeIntensity = Math.max(this.shakeIntensity, adjustedIntensity);
        this.shakeTimer = Math.max(this.shakeTimer, duration);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
    }

    updateShake(dt) {
        if (this.shakeTimer > 0) {
            this.shakeTimer = Math.max(0, this.shakeTimer - dt);
            const decay = this.shakeDuration > 0 ? this.shakeTimer / this.shakeDuration : 0;
            const currentIntensity = this.shakeIntensity * decay * decay;
            this.camera.shakeX = (Math.random() - 0.5) * currentIntensity;
            this.camera.shakeY = (Math.random() - 0.5) * currentIntensity;
            if (this.shakeTimer <= 0) {
                this.shakeIntensity = 0;
                this.shakeDuration = 0;
            }
        } else if (this.player && this.player.isDashing) {
            const dashShake = this.reducedFlash ? 1 : 4;
            this.camera.shakeX = (Math.random() - 0.5) * dashShake;
            this.camera.shakeY = (Math.random() - 0.5) * dashShake;
        } else {
            this.camera.shakeX = 0;
            this.camera.shakeY = 0;
        }
    }

    update(dt) {
        if (this.state === 'CELEBRATING') {
            this.updateFinishCelebration(dt);
            return;
        }
        if (this.state !== 'PLAYING') return;
        this.justRecovered = false;

        if (this.bloodlustFlashTimer > 0) {
            this.bloodlustFlashTimer = Math.max(0, this.bloodlustFlashTimer - dt);
        }
        if (this.checkpointFlashTimer > 0) {
            this.checkpointFlashTimer = Math.max(0, this.checkpointFlashTimer - dt);
        }
        if (this.checkpointToastTimer > 0) {
            this.checkpointToastTimer = Math.max(0, this.checkpointToastTimer - dt);
        }
        if (this.momentumToastTimer > 0) {
            this.momentumToastTimer = Math.max(0, this.momentumToastTimer - dt);
        }
        if (this.precisionToastTimer > 0) {
            this.precisionToastTimer = Math.max(0, this.precisionToastTimer - dt);
        }
        if (this.padGradeToastTimer > 0) {
            this.padGradeToastTimer = Math.max(0, this.padGradeToastTimer - dt);
        }
        if (this.relicToastTimer > 0) {
            this.relicToastTimer = Math.max(0, this.relicToastTimer - dt);
        }
        if (this.relicBurst) {
            this.relicBurst.life = Math.max(0, this.relicBurst.life - dt * 1.35);
            if (this.relicBurst.life <= 0) this.relicBurst = null;
        }
        if (this.recoveryBurst) {
            this.recoveryBurst.life -= dt * 1.7;
            if (this.recoveryBurst.life <= 0) this.recoveryBurst = null;
        }
        if (this.precisionBurst) {
            this.precisionBurst.life = Math.max(0, this.precisionBurst.life - dt * 1.45);
            if (this.precisionBurst.life <= 0) this.precisionBurst = null;
        }

        // Handle Time Slow recovery
        if (this.slowMoTimer > 0) {
            this.slowMoTimer -= dt; // recovery uses real time
            if (this.slowMoTimer <= 0) {
                this.timeScale = 1.0;
            } else if (this.slowMoTimer < 0.4) {
                // Gradually return to normal speed
                this.timeScale = 0.2 + (1.0 - 0.2) * (1.0 - (this.slowMoTimer / 0.4));
            }
        }

        const scaledDt = dt * this.timeScale;
        this.hazardHitCooldown = Math.max(0, this.hazardHitCooldown - scaledDt);

        // Moving hazards advance before player physics so platforms are solid at their visible position.
        const hazardSpeedMultiplier = this.level.modifier?.hazardSpeedMultiplier || 1;
        this.level.movingPlatforms.forEach(platform => {
            platform.clock += scaledDt * hazardSpeedMultiplier;
            platform.x = platform.baseX + Math.sin(platform.clock * platform.speed + platform.phase) * platform.travel;
        });
        this.level.timedGates.forEach(gate => gate.update(scaledDt * hazardSpeedMultiplier));
        this.level.momentumGates.forEach(gate => gate.update(scaledDt));
        this.level.recoveryPads.forEach(pad => pad.update(scaledDt));
        this.level.relics.forEach(relic => relic.update(scaledDt));

        this.time += scaledDt;
        const playerPreviousX = this.player.x;
        const playerPreviousY = this.player.y;
        const playerPreviousVx = this.player.vx;
        const playerPreviousVy = this.player.vy;
        const playerPreviousDashing = this.player.isDashing;
        const playerPreviousRight = this.player.x + this.player.width;
        this.player.update(this.input, this.level, this.audio, scaledDt);
        this.evaluateWindPrecision(playerPreviousX, playerPreviousY, playerPreviousVx, playerPreviousDashing, scaledDt);
        this.processRecoveryLaunchPads(playerPreviousY, playerPreviousVy, playerPreviousVx);
        if (this.state !== 'PLAYING' || this.justRecovered) return;

        // Momentum gates are non-solid: carry speed through the beam, or preserve a live combo to claim the reward.
        this.level.momentumGates.forEach(gate => {
            const crossedForward = playerPreviousRight < gate.x && this.player.x + this.player.width >= gate.x;
            if (gate.passed || !crossedForward) return;
            gate.passed = true;
            const verticallyAligned = this.player.y + this.player.height > gate.y + 8 && this.player.y < gate.y + gate.height;
            const speed = this.player.vx;
            const hasCombo = gate.comboRequired > 0 && this.player.combo >= gate.comboRequired;
            if (verticallyAligned && speed > 0 && (speed >= gate.targetSpeed || hasCombo)) {
                this.activateMomentumGate(gate, speed, hasCombo);
            }
        });
        if (this.state !== 'PLAYING' || this.justRecovered) return;

        this.processRouteForks(playerPreviousRight);
        if (this.state !== 'PLAYING' || this.justRecovered) return;

        this.processChallengeBeats(playerPreviousRight);
        if (this.state !== 'PLAYING' || this.justRecovered) return;

        // Closed gates are dangerous but readable: jump above them, wait for the opening, or Dash through.
        this.level.timedGates.forEach(gate => {
            if (!gate.isOpen && !this.player.isDashing && this.hazardHitCooldown <= 0 && this.player.testCollision(gate.rect)) {
                const playerIsLeft = this.player.x + this.player.width / 2 < gate.x + gate.width / 2;
                this.player.x = playerIsLeft ? gate.x - this.player.width - 2 : gate.x + gate.width + 2;
                this.player.vx = playerIsLeft ? -4 : 4;
                const damageTaken = this.player.takeDamage(24);
                this.hazardHitCooldown = 0.72;
                this.player.combo = 0;
                this.shake(13, 0.2);
                this.spawnParticles(gate.x + gate.width / 2, this.player.y + this.player.height / 2, '#ff4d5e', 16, 11);
                if (damageTaken > 0) this.spawnParticles(gate.x + gate.width / 2, gate.y + gate.height * 0.5, '#fff4b0', 10, 9);
            }
        });
        if (this.state !== 'PLAYING' || this.justRecovered) return;

        // Activate checkpoints in route order as Dash passes their bright marker.
        this.level.checkpoints.forEach(checkpoint => {
            if (!checkpoint.activated && this.player.x + this.player.width > checkpoint.x) {
                this.activateCheckpoint(checkpoint);
            }
        });

        // Vex surfaces at selected route markers, turning landmarks into readable race beats.
        this.level.rivalLandmarks.forEach(spot => {
            if (!spot.triggered && this.player.x + this.player.width > spot.x) {
                spot.triggered = true;
                this.rival?.appearAtLandmark(spot, this.player, this.level.goal?.x);
            }
        });
        
        // Enemy updates & collisions
        this.level.enemies.forEach(enemy => {
            if (this.state !== 'PLAYING' || this.justRecovered) return;
            enemy.update(this.level, enemy.isSweeper ? scaledDt * hazardSpeedMultiplier : scaledDt);
            if (!enemy.isDead && !this.player.isDead && !this.justRecovered) {
                if (this.player.testCollision(enemy)) {
                    // Check for offensive dash first
                    if (this.player.isDashing) {
                        enemy.die();
                        if (enemy.isArmored) this.armoredBreakthroughs++;
                        this.player.combo++;
                        this.bestCombo = Math.max(this.bestCombo, this.player.combo);
                        this.enemiesDefeated++;
                        this.player.comboTimer = 2.5;
                        this.score += 200 * this.player.combo;
                        this.rival?.registerAdvantage(
                            enemy.isArmored ? 'ARMOR BREAK' : 'COMBO CHAIN',
                            enemy.isArmored ? 0.024 : (this.player.combo >= 2 ? 0.008 : 0.003)
                        );
                        
                        this.audio.playSFX('stomp');
                        
                        // Enhanced Particle Explosion for Dash-Kill
                        const centerX = enemy.x + enemy.width/2;
                        const centerY = enemy.y + enemy.height/2;
                        this.spawnParticles(centerX, centerY, '#00ffff', 40, 20); // Cyan blast
                        this.spawnParticles(centerX, centerY, '#ffffff', 20, 15); // White sparks
                        this.spawnParticles(centerX, centerY, '#ff00ff', 10, 10); // Magenta flare
                        if (enemy.isArmored) {
                            // Armored Bumpers only break on this direct Dash impact.
                            this.spawnParticles(centerX, centerY, '#ff8a00', 36, 18);
                            this.spawnParticles(centerX, centerY, '#fff4b0', 20, 14);
                        }
                        this.applyHighComboHealthSteal(centerX, centerY);
                        
                        this.shake(enemy.isArmored ? 24 : 15, enemy.isArmored ? 0.3 : 0.2);
                        
                        // Cooldown reduction and energy recovery on dash-kill
                        this.player.dashCooldownTimer = Math.max(0, this.player.dashCooldownTimer - COOLDOWN_REDUCTION_ON_KILL);
                        this.player.stamina = Math.min(MAX_STAMINA, this.player.stamina + STAMINA_RECOVERY_ON_KILL);

                        // Time-warp on successful dash-kill
                        this.timeScale = 0.2;
                        this.slowMoTimer = 0.22;
                    } else {
                        // Check if stomp (falling and above the enemy)
                        const playerBottom = this.player.y + this.player.height;
                        const enemyTop = enemy.y + 15; // Small threshold for stomp
                        const isStomp = this.player.vy > 0 && playerBottom < enemyTop + 20;
                        
                        if (isStomp && !enemy.isArmored) {
                            enemy.die();
                            this.player.vy = PLAYER_JUMP * 0.7; // Stomp bounce
                            this.player.y = enemy.y - this.player.height; // Snap to top
                            
                            this.player.combo++;
                            this.bestCombo = Math.max(this.bestCombo, this.player.combo);
                            this.enemiesDefeated++;
                            this.player.comboTimer = 2.5; // 2.5 seconds to continue combo
                            this.score += 100 * this.player.combo;
                            this.rival?.registerAdvantage('COMBO CHAIN', this.player.combo >= 2 ? 0.01 : 0.004);
                            
                            this.audio.playSFX('stomp');
                            const stompX = enemy.x + enemy.width/2;
                            const stompY = enemy.y + enemy.height/2;
                            this.spawnParticles(stompX, stompY, '#FFD700', 15, 12);
                            this.applyHighComboHealthSteal(stompX, stompY);

                            // Partial cooldown reduction on stomp
                            this.player.dashCooldownTimer = Math.max(0, this.player.dashCooldownTimer - COOLDOWN_REDUCTION_ON_KILL * 0.5);
                            this.player.stamina = Math.min(MAX_STAMINA, this.player.stamina + STAMINA_RECOVERY_ON_KILL * 0.5);

                            // Brief time-warp on stomp
                            this.timeScale = 0.42;
                            this.slowMoTimer = 0.08;
                        } else {
                            // Armor blocks stomps, forcing Dash to spend stamina for the breakthrough.
                            if (enemy.isArmored && isStomp) {
                                enemy.registerArmorBlock();
                                this.player.vy = -8;
                                this.player.y = enemy.y - this.player.height;
                                const armorBlockX = enemy.x + enemy.width / 2;
                                const armorBlockY = enemy.y + enemy.height / 2;
                                this.spawnParticles(armorBlockX, armorBlockY, '#ff8a00', 18, 11);
                                this.spawnParticles(armorBlockX, armorBlockY, '#fff4b0', 8, 8);
                                this.shake(10, 0.18);
                            }
                            const damageTaken = this.player.takeDamage(CONTACT_DAMAGE);
                            if (damageTaken > 0) {
                                this.shake(12, 0.18);
                                this.spawnParticles(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, '#ff3b5c', 12, 9);
                                this.player.combo = 0;
                            }
                        }
                    }
                }
            }
        });
        if (this.state !== 'PLAYING' || this.justRecovered) return;

        // Pickup collisions
        this.level.pickups.forEach(pickup => {
            if (!pickup.isCollected) {
                pickup.update(scaledDt);
                if (this.player.testCollision(pickup)) {
                    pickup.isCollected = true;
                    this.player.stamina = Math.min(MAX_STAMINA, this.player.stamina + 50);
                    
                    this.player.combo++;
                    this.bestCombo = Math.max(this.bestCombo, this.player.combo);
                    this.player.comboTimer = 2.5;
                    this.score += 250 * this.player.combo;
                    
                    this.audio.playSFX('pickup');
                    this.spawnParticles(pickup.x + pickup.width/2, pickup.y + pickup.height/2, '#00ffff', 20, 15);
                }
            }
        });

        // Relics are optional precision objectives and persist through checkpoint recovery.
        this.level.relics.forEach(relic => {
            if (!relic.isCollected && this.player.testCollision(relic)) {
                this.collectRelic(relic);
            }
        });

        // Advance the rival after this frame's gates, combos, and breakthroughs have been resolved.
        this.rival?.update(scaledDt, this.player, this);

        // Update particles
        const particles = this.particles || [];
        let aliveParticles = 0;
        for (const particle of particles) {
            particle.x += particle.vx * this.timeScale;
            particle.y += particle.vy * this.timeScale;
            particle.life -= 0.05 * this.timeScale;
            if (particle.life > 0) particles[aliveParticles++] = particle;
        }
        particles.length = aliveParticles;
        this.particles = particles;

        // Update Shockwaves & Check Enemy Hits
        this.shockwaves = this.shockwaves.filter(sw => {
            const active = sw.update(scaledDt);
            
            // Check enemies hit by shockwave
            this.level.enemies.forEach(enemy => {
                if (!enemy.isDead && !enemy.isArmored && !sw.hitEnemies.has(enemy)) {
                    const dx = (enemy.x + enemy.width/2) - sw.x;
                    const dy = (enemy.y + enemy.height/2) - sw.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < sw.radius) {
                        sw.hitEnemies.add(enemy);
                        enemy.die();
                        this.player.combo++;
                        this.bestCombo = Math.max(this.bestCombo, this.player.combo);
                        this.enemiesDefeated++;
                        this.player.comboTimer = COMBO_MAX_TIME;
                        this.score += 500 * this.player.combo;
                        const enemyCenterX = enemy.x + enemy.width / 2;
                        const enemyCenterY = enemy.y + enemy.height / 2;
                        this.spawnParticles(enemyCenterX, enemyCenterY, sw.palette === 'bloodlust' ? '#ff4d00' : '#00ffff', 20, 15);
                        this.spawnParticles(enemyCenterX, enemyCenterY, '#ffd166', 10, 11);
                        this.applyHighComboHealthSteal(enemyCenterX, enemyCenterY);
                        this.shake(sw.palette === 'bloodlust' ? 12 : 8, 0.16);
                    }
                }
            });
            
            return active;
        });

        if (this.state !== 'PLAYING' || this.justRecovered) return;

        // Goal collision starts the finish line sequence; results appear after the celebration.
        if (this.player.testCollision(this.level.goal)) {
            this.beginFinishCelebration();
            return;
        }

        // Camera follow
        const followSpeed = this.player.isDashing ? 0.09 : 0.15; // Keep the faster route centered without masking momentum
        const targetX = this.player.x - window.innerWidth / 3;
        this.camera.x += (targetX - this.camera.x) * followSpeed;
        this.camera.x = Math.max(0, Math.min(this.camera.x, this.level.width - window.innerWidth));
        
        // Handle Screen Shake with a quick decay so the shockwave lands hard and settles cleanly.
        if (this.shakeTimer > 0) {
            this.shakeTimer = Math.max(0, this.shakeTimer - dt);
            const decay = this.shakeDuration > 0 ? this.shakeTimer / this.shakeDuration : 0;
            const currentIntensity = this.shakeIntensity * decay * decay;
            this.camera.shakeX = (Math.random() - 0.5) * currentIntensity;
            this.camera.shakeY = (Math.random() - 0.5) * currentIntensity;
            if (this.shakeTimer <= 0) {
                this.shakeIntensity = 0;
                this.shakeDuration = 0;
            }
        } else if (this.player.isDashing) {
            // Constant subtle vibration during dash, reduced further for accessibility.
            const dashShake = this.reducedFlash ? 1 : 4;
            this.camera.shakeX = (Math.random() - 0.5) * dashShake;
            this.camera.shakeY = (Math.random() - 0.5) * dashShake;
        } else {
            this.camera.shakeX = 0;
            this.camera.shakeY = 0;
        }

        // HUD text and layout updates are intentionally throttled; gameplay and rendering stay frame-rate bound.
        this.hudTimer -= dt;
        if (this.hudTimer > 0) return;
        this.hudTimer = 0.08;

        this.updateStageHud();
        this.updateRivalHud();
        this.updateModifierHud();
        this.updateWindContractHud();
        this.updateRecoveryPadHud();
        const {
            checkpointToast,
            momentumToast,
            precisionToast,
            padGradeToast,
            relicToast,
            relicCount,
            finishToast,
            scoreDisplay,
            timerDisplay,
            staminaBar,
            healthBar,
            bloodlustHud,
            bloodlustTimer,
            dashOverlay,
            dashButton,
            comboHud,
            comboDisplay,
            comboTimerBar
        } = this.ui;

        if (checkpointToast) {
            checkpointToast.textContent = this.checkpointMessage;
            checkpointToast.classList.toggle('visible', this.checkpointToastTimer > 0);
        }
        if (momentumToast) {
            momentumToast.textContent = this.momentumMessage;
            momentumToast.classList.toggle('visible', this.momentumToastTimer > 0);
        }
        if (precisionToast) {
            precisionToast.textContent = this.precisionMessage;
            precisionToast.classList.toggle('visible', this.precisionToastTimer > 0);
        }
        if (padGradeToast) {
            padGradeToast.textContent = this.padGradeMessage;
            padGradeToast.classList.toggle('visible', this.padGradeToastTimer > 0);
        }
        if (relicToast) {
            relicToast.textContent = this.relicMessage;
            relicToast.classList.toggle('visible', this.relicToastTimer > 0);
        }
        if (relicCount) {
            const totalRelics = this.level?.relics?.length || 0;
            relicCount.textContent = `${this.relicsCollected}/${totalRelics}`;
            relicCount.classList.toggle('complete', totalRelics > 0 && this.relicsCollected === totalRelics);
        }
        if (finishToast) finishToast.classList.remove('visible');
        if (scoreDisplay) scoreDisplay.textContent = `SCORE: ${String(this.score).padStart(4, '0')}`;
        if (timerDisplay) timerDisplay.textContent = `TIME: ${Math.floor(this.time / 60)}:${String(Math.floor(this.time % 60)).padStart(2, '0')}`;

        const staminaPercent = (this.player.stamina / MAX_STAMINA) * 100;
        if (staminaBar) {
            staminaBar.style.width = `${staminaPercent}%`;
            staminaBar.style.background = staminaPercent < 30 ? '#ff0000' : '#00ff00';
        }

        const healthPercent = (this.player.health / MAX_HEALTH) * 100;
        if (healthBar) {
            healthBar.style.width = `${healthPercent}%`;
            healthBar.style.background = healthPercent <= 30 ? '#ff1744' : '#7CFF6B';
        }

        if (bloodlustHud && bloodlustTimer) {
            const bloodlustActive = this.player.bloodlustTimer > 0;
            bloodlustHud.style.display = bloodlustActive ? 'flex' : 'none';
            if (bloodlustActive) bloodlustTimer.textContent = `INVINCIBLE ${this.player.bloodlustTimer.toFixed(1)}s`;
        }

        if (dashOverlay && dashButton) {
            const cooldownPercent = (this.player.dashCooldownTimer / DASH_COOLDOWN) * 100;
            dashOverlay.style.height = `${Math.max(0, cooldownPercent)}%`;
            dashButton.style.opacity = this.player.stamina < DASH_STAMINA_COST ? '0.5' : '1';
        }

        if (comboHud && comboDisplay && comboTimerBar) {
            const hasCombo = this.player.combo > 1 || this.player.consecutiveDashes > 0;
            comboHud.style.display = hasCombo ? 'flex' : 'none';
            if (hasCombo) {
                let comboText = `COMBO X${Math.max(1, this.player.combo)}`;
                if (this.player.consecutiveDashes > 0) comboText += ` | DASH ${this.player.consecutiveDashes}/5`;
                comboDisplay.textContent = comboText;
                const timerPercent = (this.player.comboTimer / COMBO_MAX_TIME) * 100;
                comboTimerBar.style.width = `${Math.max(0, timerPercent)}%`;
                const pulse = 1 + Math.sin(this.time * 10) * 0.05;
                comboHud.style.transform = `scale(${pulse})`;
            }
        }
    }

    drawPrecisionBurst(ctx) {
        const burst = this.precisionBurst;
        if (!burst) return;
        const progress = 1 - burst.life;
        const screenX = burst.x - this.camera.x;
        const screenY = burst.y - this.camera.y;
        if (screenX < -180 || screenX > window.innerWidth + 180) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = burst.life;
        ctx.strokeStyle = burst.color;
        ctx.shadowBlur = 22;
        ctx.shadowColor = burst.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 18 + progress * 48, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = burst.life * 0.7;
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            const inner = 18 + progress * 22;
            const outer = inner + 10 + progress * 15;
            ctx.beginPath();
            ctx.moveTo(screenX + Math.cos(angle) * inner, screenY + Math.sin(angle) * inner);
            ctx.lineTo(screenX + Math.cos(angle) * outer, screenY + Math.sin(angle) * outer);
            ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = burst.life;
        ctx.fillStyle = 'rgba(5, 12, 27, 0.92)';
        ctx.fillRect(screenX - 112, screenY - 48 - progress * 18, 224, 42);
        ctx.strokeStyle = `${burst.color}dd`;
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX - 112, screenY - 48 - progress * 18, 224, 42);
        ctx.fillStyle = burst.color;
        ctx.font = '700 8px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`PRECISION // ${burst.lineLabel}`, screenX, screenY - 32 - progress * 18);
        ctx.fillStyle = '#fff4b0';
        ctx.font = '700 9px Orbitron, sans-serif';
        ctx.fillText(`${burst.name}  ·  +${burst.reward.toLocaleString()} PTS`, screenX, screenY - 19 - progress * 18);
        ctx.restore();
    }

    draw() {
        const isDashing = Boolean(this.player?.isDashing);
        // Normal frames render directly to the visible canvas. The backbuffer is reserved for dash compositing.
        const ctx = isDashing ? this.backCtx : this.ctx;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        if (!this.level) return;

        ctx.save();
        ctx.translate(this.camera.shakeX, this.camera.shakeY);

        // Background (Parallax), with a subtle route-specific mood shift.
        const bgWidth = window.innerHeight * (16/9);
        const bgOffset = -(this.camera.x * 0.2) % bgWidth;
        for (let i = 0; i <= Math.ceil(window.innerWidth / bgWidth) + 1; i++) {
            ctx.drawImage(this.images.bg, bgOffset + i * bgWidth, 0, bgWidth, window.innerHeight);
        }
        const stageTint = this.level.stage?.tint;
        if (stageTint) {
            ctx.fillStyle = stageTint;
            ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
        }

        // Gap currents render before the solid route so their streams remain visible through the void,
        // while moving platforms and Dash can pass over the telegraph cleanly.
        this.level.windCurrents.forEach(current => {
            current.draw(ctx, this.camera, this.time, this.player?.windCurrent === current);
        });

        // Tiles
        this.level.tiles.forEach(tile => {
            if (tile.x + tile.width > this.camera.x && tile.x < this.camera.x + window.innerWidth) {
                ctx.drawImage(this.images.tile, tile.x - this.camera.x, tile.y - this.camera.y, tile.width, tile.height);
            }
        });

        // Sliding platform rails and motion accents make the safe landing window obvious at a glance.
        this.level.movingPlatforms.forEach(platform => {
            if (platform.x + platform.width < this.camera.x - 80 || platform.x > this.camera.x + window.innerWidth + 80) return;
            const screenX = platform.x - this.camera.x;
            const screenY = platform.y - this.camera.y;
            const railY = screenY + platform.height / 2;
            const railStart = platform.baseX - platform.travel - this.camera.x + platform.width / 2;
            const railEnd = platform.baseX + platform.travel - this.camera.x + platform.width / 2;
            const pulse = (Math.sin(platform.clock * 8) + 1) * 0.5;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = 'rgba(124, 255, 235, 0.48)';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#7cffeb';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 7]);
            ctx.beginPath();
            ctx.moveTo(railStart, railY);
            ctx.lineTo(railEnd, railY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.strokeStyle = `rgba(255, 209, 102, ${0.62 + pulse * 0.28})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(screenX, screenY, platform.width, platform.height);
            ctx.fillStyle = '#7cffeb';
            ctx.fillRect(screenX + 10, screenY + 5, platform.width - 20, 3);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(5, 12, 27, 0.8)';
            ctx.fillRect(screenX + platform.width / 2 - 31, screenY - 25, 62, 16);
            ctx.fillStyle = '#fff4b0';
            ctx.font = '700 8px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('SLIDE', screenX + platform.width / 2, screenY - 13);
            ctx.restore();
        });

        // Recovery launch pads sit directly on the route after selected checkpoints and gap exits.
        // They are visual guidance until Dash lands on them, then kick off a controllable boost.
        this.level.recoveryPads.forEach(pad => pad.draw(ctx, this.camera, this.time));

        // Blood Moon landmarks turn combat and recovery beats into a visible procession.
        this.level.landmarks.forEach(landmark => landmark.draw(ctx, this.camera, this.time));

        // World-embedded pace signs sit before the next commitment so players can
        // read the target and choose a line without leaving the action.
        this.level.paceSigns.forEach(sign => sign.draw(ctx, this.camera, this.time));
        this.drawRouteForks(ctx);

        // Vex appears on a parallel, non-colliding pace line at selected route markers.
        this.rival?.drawWorld(ctx, this.camera, this.level.height - TILE_SIZE, this.time);

        // Checkpoint beacons
        this.level.checkpoints.forEach(checkpoint => {
            if (checkpoint.x + checkpoint.width < this.camera.x || checkpoint.x > this.camera.x + window.innerWidth) return;
            const screenX = checkpoint.x - this.camera.x;
            const baseY = checkpoint.y + checkpoint.height - this.camera.y;
            const isActive = checkpoint.index <= this.activeCheckpointIndex;
            const pulse = 1 + Math.sin(Date.now() / 120 + checkpoint.index) * 0.12;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowBlur = isActive ? 20 : 12;
            ctx.shadowColor = isActive ? '#7cffeb' : '#ffd166';
            ctx.strokeStyle = isActive ? '#7cffeb' : '#ffd166';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(screenX + 26, baseY);
            ctx.lineTo(screenX + 26, baseY - 76);
            ctx.stroke();
            ctx.fillStyle = isActive ? '#7cffeb' : '#ffd166';
            ctx.beginPath();
            ctx.moveTo(screenX + 28, baseY - 74);
            ctx.lineTo(screenX + 62, baseY - 62);
            ctx.lineTo(screenX + 28, baseY - 50);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.arc(screenX + 26, baseY - 78, 7 * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(5, 12, 27, 0.72)';
            ctx.fillRect(screenX + 5, baseY - 112, 43, 18);
            ctx.fillStyle = isActive ? '#7cffeb' : '#ffd166';
            ctx.font = '700 10px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`CP ${checkpoint.index + 1}`, screenX + 26, baseY - 99);
            ctx.restore();
        });

        // Timed gates sit in the lane as clear, high-contrast timing tests.
        this.level.timedGates.forEach(gate => {
            if (gate.x + gate.width < this.camera.x - 70 || gate.x > this.camera.x + window.innerWidth + 70) return;
            gate.draw(ctx, this.camera);
        });

        // Momentum gates are bright, non-solid route markers that invite a fast commitment.
        this.level.momentumGates.forEach(gate => {
            if (gate.x + gate.width < this.camera.x - 120 || gate.x > this.camera.x + window.innerWidth + 120) return;
            gate.draw(ctx, this.camera, this.time);
        });

        // Optional mastery lines are visible in-world so players can plan the next replay.
        this.drawChallengeMarkers(ctx);

        // Named relics sit above the route with their own readable glow and label.
        this.level.relics.forEach(relic => {
            if (relic.x + relic.width < this.camera.x - 90 || relic.x > this.camera.x + window.innerWidth + 90) return;
            relic.draw(ctx, this.camera, this.time);
        });

        // Goal
        ctx.drawImage(this.images.flag, this.level.goal.x - this.camera.x, this.level.goal.y - this.camera.y, this.level.goal.width, this.level.goal.height);

        // During the clear sequence, the flag becomes the visual center of the route.
        if (this.finishCelebration) {
            const celebration = this.finishCelebration;
            const spotlightX = celebration.x - this.camera.x;
            const spotlightY = celebration.y - this.camera.y;
            const pulse = 1 + Math.sin(celebration.elapsed * 8) * (this.reducedFlash ? 0.02 : 0.06);
            const beamWidth = 120 + Math.sin(celebration.elapsed * 5) * (this.reducedFlash ? 4 : 12);
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = (0.2 + Math.min(0.28, celebration.elapsed * 0.08)) * (this.reducedFlash ? 0.58 : 1);
            ctx.fillStyle = celebration.colors[0];
            ctx.beginPath();
            ctx.moveTo(spotlightX - 26, 0);
            ctx.lineTo(spotlightX + 26, 0);
            ctx.lineTo(spotlightX + beamWidth, spotlightY + 155);
            ctx.lineTo(spotlightX - beamWidth, spotlightY + 155);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = this.reducedFlash ? 0.58 : 0.85;
            ctx.shadowBlur = this.reducedFlash ? 16 : 34;
            ctx.shadowColor = celebration.colors[1];
            ctx.strokeStyle = celebration.colors[1];
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(spotlightX, spotlightY, (46 + celebration.elapsed * 8) * pulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = this.reducedFlash ? 0.72 : 0.95;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(spotlightX, spotlightY, 6 + Math.sin(celebration.elapsed * 10) * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            this.drawFinishSignature(ctx, celebration, this.reducedFlash);
        }

        // Enemies
        this.level.enemies.forEach(enemy => {
            if (enemy.x + enemy.width > this.camera.x && enemy.x < this.camera.x + window.innerWidth) {
                enemy.draw(ctx, this.camera);
            }
        });

        // Pickups
        this.level.pickups.forEach(pickup => {
            if (pickup.x + pickup.width > this.camera.x && pickup.x < this.camera.x + window.innerWidth) {
                pickup.draw(ctx, this.camera);
            }
        });

        // Player
        this.player.draw(ctx, this.camera, this.tintedImages, this.reducedFlash);

        // A short photo-finish pass lets the rival overtake Dash visually before the clear lands.
        if (this.finishCelebration) {
            this.rival?.drawFinishMoment(ctx, this.camera, this.finishCelebration, this.level, this.time);
        }

        // Precision line confirmations sit in-world at the stream that was mastered.
        this.drawPrecisionBurst(ctx);

        // Relic collection burst lingers just long enough to read the named objective.
        if (this.relicBurst) {
            const burst = this.relicBurst;
            const progress = 1 - burst.life;
            const burstX = burst.x - this.camera.x;
            const burstY = burst.y - this.camera.y;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = burst.life;
            ctx.strokeStyle = burst.color;
            ctx.shadowBlur = 26;
            ctx.shadowColor = burst.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(burstX, burstY, 24 + progress * 58, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = burst.life * 0.72;
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i) / 8;
                const inner = 20 + progress * 28;
                const outer = inner + 12 + progress * 18;
                ctx.beginPath();
                ctx.moveTo(burstX + Math.cos(angle) * inner, burstY + Math.sin(angle) * inner);
                ctx.lineTo(burstX + Math.cos(angle) * outer, burstY + Math.sin(angle) * outer);
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#fff4b0';
            ctx.font = '700 10px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${burst.name} SECURED`, burstX, burstY - 42 - progress * 18);
            ctx.restore();
        }

        // Shockwaves
        this.shockwaves.forEach(sw => sw.draw(ctx, this.camera));

        // Respawn recovery burst
        if (this.recoveryBurst) {
            const burst = this.recoveryBurst;
            const burstX = burst.x - this.camera.x;
            const burstY = burst.y - this.camera.y;
            const burstProgress = 1 - burst.life;
            ctx.save();
            const recoveryColor = burst.mode === 'redline' ? '#ff8a00' : '#7cffeb';
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = burst.life;
            ctx.strokeStyle = recoveryColor;
            ctx.shadowBlur = 26;
            ctx.shadowColor = recoveryColor;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(burstX, burstY, 18 + burstProgress * 100, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = burst.life * 0.7;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(burstX, burstY, 8 + burstProgress * 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Particles
        if (this.particles) {
            this.particles.forEach(p => {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                if (p.isStretched) {
                    const length = 20;
                    ctx.fillRect(p.x - this.camera.x, p.y - this.camera.y, length, 2);
                } else {
                    const size = p.isFinish ? (p.size || 4) * (0.7 + p.life * 0.45) : 4;
                    ctx.fillRect(p.x - this.camera.x, p.y - this.camera.y, size, size);
                }
            });
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        // Speed Lines (Draw in screen space on backbuffer)
        if (this.player && this.player.isDashing) {
            ctx.strokeStyle = this.reducedFlash ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            const speedLineCount = this.reducedFlash
                ? (this.isLowPowerDevice ? 1 : 2)
                : (this.isLowPowerDevice ? 5 : 8);
            for (let i = 0; i < speedLineCount; i++) {
                const x = Math.random() * window.innerWidth;
                const y = Math.random() * window.innerHeight;
                const length = this.reducedFlash ? 55 + Math.random() * 60 : 100 + Math.random() * 200;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + (this.player.facingRight ? -length : length), y);
                ctx.stroke();
            }
        }

        // --- Final Output to Main Canvas with Radial Blur ---
        // A normal frame is already on-screen; only dash frames need the backbuffer copy.
        if (isDashing) {
            this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            this.ctx.drawImage(this.backbuffer, 0, 0, window.innerWidth, window.innerHeight);
            const centerX = this.player.x - this.camera.x + this.player.width / 2;
            const centerY = this.player.y - this.camera.y + this.player.height / 2;
            
            this.ctx.save();
            this.ctx.globalAlpha = this.reducedFlash ? 0.045 : 0.15;
            this.ctx.globalCompositeOperation = 'screen';
            
            // Keep the speed warp expressive without redrawing the full viewport four times.
            const blurLayers = this.reducedFlash ? 1 : (this.isLowPowerDevice ? 1 : 2);
            for (let i = 1; i <= blurLayers; i++) {
                const scale = 1 + (i * (this.reducedFlash ? 0.006 : 0.012));
                const w = window.innerWidth * scale;
                const h = window.innerHeight * scale;
                const offX = (window.innerWidth - w) * (centerX / window.innerWidth);
                const offY = (window.innerHeight - h) * (centerY / window.innerHeight);
                
                this.ctx.drawImage(this.backbuffer, offX, offY, w, h);
            }
            this.ctx.restore();
        }

        // Bloodlust post-processing: a warm, pulsing grade over the whole viewport.
        if (this.player && this.player.bloodlustTimer > 0) {
            const remaining = this.player.bloodlustTimer / BLOODLUST_DURATION;
            const pulse = this.reducedFlash ? 0.5 : (Math.sin(Date.now() / 85) + 1) * 0.5;
            const gradeAlpha = (0.08 + pulse * 0.05 + (1 - remaining) * 0.04) * (this.reducedFlash ? 0.55 : 1);
            const edgeAlpha = (0.12 + pulse * 0.06) * (this.reducedFlash ? 0.55 : 1);

            this.ctx.save();
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = `rgba(255, 91, 0, ${gradeAlpha})`;
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            this.ctx.globalCompositeOperation = 'multiply';
            this.ctx.fillStyle = `rgba(255, 198, 110, ${(0.06 + pulse * 0.03) * (this.reducedFlash ? 0.55 : 1)})`;
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

            // Subtle gold vignette keeps the center readable while framing the state.
            const gradient = this.ctx.createRadialGradient(
                window.innerWidth / 2,
                window.innerHeight / 2,
                Math.min(window.innerWidth, window.innerHeight) * 0.22,
                window.innerWidth / 2,
                window.innerHeight / 2,
                Math.max(window.innerWidth, window.innerHeight) * 0.72
            );
            gradient.addColorStop(0, 'rgba(255, 190, 70, 0)');
            gradient.addColorStop(1, `rgba(255, 72, 0, ${edgeAlpha})`);
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            this.ctx.restore();
        }

        // Checkpoint capture/recovery flashes use a cooler signal than Bloodlust.
        if (this.checkpointFlashTimer > 0) {
            const flashScale = this.reducedFlash ? 0.3 : 1;
            const checkpointFlashAlpha = Math.min(0.34, this.checkpointFlashTimer * 0.62) * flashScale;
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = `rgba(124, 255, 235, ${checkpointFlashAlpha})`;
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            this.ctx.restore();
        }

        // A short white-hot activation flash sits above the sustained grade.
        if (this.bloodlustFlashTimer > 0) {
            const flashProgress = this.bloodlustFlashTimer / 0.24;
            const flashAlpha = Math.min(0.82, flashProgress * 0.82) * (this.reducedFlash ? 0.22 : 1);
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = `rgba(255, 238, 190, ${flashAlpha})`;
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            this.ctx.restore();
        }

        if (this.finishCelebration) {
            const celebration = this.finishCelebration;
            const pulse = (Math.sin(celebration.elapsed * 7) + 1) * 0.5;
            const fadeIn = Math.min(1, celebration.elapsed / 0.65);
            const gradient = this.ctx.createRadialGradient(
                window.innerWidth / 2,
                window.innerHeight * 0.45,
                40,
                window.innerWidth / 2,
                window.innerHeight * 0.45,
                Math.max(window.innerWidth, window.innerHeight) * 0.8
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${0.03 + pulse * 0.03})`);
            gradient.addColorStop(0.55, `rgba(34, 12, 78, ${0.04 * fadeIn})`);
            gradient.addColorStop(1, `rgba(4, 7, 20, ${0.24 * fadeIn})`);
            this.ctx.save();
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            this.ctx.restore();
        }

        if (this.finishFlashTimer > 0) {
            const flashAlpha = Math.min(0.72, (this.finishFlashTimer / FINISH_FLASH_DURATION) * 0.72) * (this.reducedFlash ? 0.22 : 1);
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            this.ctx.restore();
        }

        if (this.finishCelebration?.profile?.flash) {
            const celebration = this.finishCelebration;
            const fade = Math.min(1, celebration.elapsed / 0.35) * Math.max(0, 1 - Math.max(0, celebration.elapsed - 2.05) / 0.55);
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.globalAlpha = fade * (celebration.profile.id === 'crimson-overdrive' ? 0.34 : 0.2) * (this.reducedFlash ? 0.28 : 1);
            this.ctx.fillStyle = celebration.profile.flash;
            this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            this.ctx.restore();
        }
    }

    loop(timestamp = 0) {
        if (!this.lastTime) this.lastTime = timestamp;
        const dt = Math.min(0.05, Math.max(0, (timestamp - this.lastTime) / 1000));
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame(this.frameRequest);
    }
}
