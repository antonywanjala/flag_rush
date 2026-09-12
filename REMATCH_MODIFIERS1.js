const REMATCH_MODIFIERS = [
    {
        id: 'standard',
        label: 'STANDARD RUN',
        shortLabel: 'STANDARD',
        description: 'No extra rule. Chase the cleanest line.',
        effect: 'No penalty',
        checkpointTimePenalty: 1,
        checkpointScorePenalty: 1,
        staminaRegenMultiplier: 1,
        hazardSpeedMultiplier: 1
    },
    {
        id: 'hard-checkpoints',
        label: 'HARD CHECKPOINTS',
        shortLabel: 'HARD CP',
        description: 'Recovery mistakes cost more time and score.',
        effect: '-10s / -500 pts per recovery',
        checkpointTimePenalty: 2,
        checkpointScorePenalty: 2,
        staminaRegenMultiplier: 1,
        hazardSpeedMultiplier: 1
    },
    {
        id: 'low-charge',
        label: 'LOW-CHARGE PROTOCOL',
        shortLabel: 'LOW CHARGE',
        description: 'Stamina recovery is deliberately throttled.',
        effect: '35% slower stamina recovery',
        checkpointTimePenalty: 1,
        checkpointScorePenalty: 1,
        staminaRegenMultiplier: 0.65,
        hazardSpeedMultiplier: 1
    },
    {
        id: 'hazard-overdrive',
        label: 'HAZARD OVERDRIVE',
        shortLabel: 'HAZARD +35%',
        description: 'Moving hazards and timing gates cycle faster.',
        effect: '35% faster moving hazards',
        checkpointTimePenalty: 1,
        checkpointScorePenalty: 1,
        staminaRegenMultiplier: 1,
        hazardSpeedMultiplier: 1.35
    }
];
