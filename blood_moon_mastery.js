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
