win() {
    if (this.state !== 'CELEBRATING') return;
    this.state = 'WIN';
    this.audio.stopMusic();
    this.updateRivalHud();
    this.updateModifierHud();
    const stage = this.getStageConfig(this.selectedStage);
    const mastery = stage.id === 3 ? this.getBloodMoonMastery() : null;
    const challenges = this.getChallengeRecap();
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
        modifier: {
            id: activeModifier.id,
            label: activeModifier.label,
            effect: activeModifier.effect,
            description: activeModifier.description
        },
        mastery,
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
      <div class="result-stat rival-result-stat"><span>RIVAL SHOWDOWN</span><strong>${this.rival?.name || 'VEX'} · PHOTO FINISH</strong></div>
      <div class="result-stat"><span>BUMPERS DEFEATED</span><strong>${this.enemiesDefeated}</strong></div>
      ${(stage.momentumGates?.length || 0) > 0 ? `<div class="result-stat momentum-stat"><span>MOMENTUM GATES</span><strong>${this.momentumGatesCleared}/${stage.momentumGates.length}</strong></div>` : ''}
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
      ${this.renderModifierSummary(activeModifier)}
      ${this.renderRematchPanel()}
    `;
    this.secondaryStage = nextStage ? nextStage.id : null;
    this.awaitingBriefing = nextStage?.id === 3;
    document.getElementById('start-btn').textContent = this.awaitingBriefing
        ? 'VIEW BLOOD MOON BRIEFING'
        : (nextStage ? `START STAGE ${nextStage.id}` : 'PLAY AGAIN');
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
        modifier: this.runStats?.modifier || null,
        mastery: this.runStats?.mastery || null,
        challenges: this.runStats?.challenges || null
    });
}
