const STAGE_CONFIGS = [
    {
        id: 1,
        name: 'SUNNY SPRINT',
        subtitle: 'Warm-up hills, clean jumps, and room to build a combo.',
        tileCount: 180,
        tint: 'rgba(255, 214, 112, 0.05)',
        groundSegments: [[0, 4], [7, 18], [21, 36], [39, 58], [61, 79], [82, 99], [102, 122], [125, 145], [148, 179]],
        platforms: [
            { start: 12, rise: 2, length: 3 },
            { start: 27, rise: 3, length: 4 },
            { start: 45, rise: 2, length: 3 },
            { start: 67, rise: 3, length: 4 },
            { start: 88, rise: 2, length: 3 },
            { start: 110, rise: 3, length: 5 },
            { start: 133, rise: 2, length: 4 },
            { start: 157, rise: 3, length: 4 }
        ],
        enemies: [
            { tile: 14, rise: 2 }, { tile: 31, rise: 0 }, { tile: 48, rise: 2 },
            { tile: 70, rise: 3 }, { tile: 94, rise: 0 }, { tile: 114, rise: 3 },
            { tile: 138, rise: 2 }, { tile: 160, rise: 3 }, { tile: 171, rise: 0 }
        ],
        pickups: [
            { tile: 30, rise: 5 }, { tile: 69, rise: 5 }, { tile: 112, rise: 5 }, { tile: 159, rise: 5 }
        ],
        checkpoints: [34, 74, 120, 155]
    },
    {
        id: 2,
        name: 'NEON SWITCHBACK',
        subtitle: 'A sharper route of back-to-back gaps and elevated ambushes.',
        tileCount: 210,
        tint: 'rgba(89, 54, 150, 0.14)',
        groundSegments: [[0, 11], [14, 25], [29, 40], [43, 48], [52, 67], [70, 84], [88, 101], [105, 119], [123, 139], [143, 157], [161, 178], [182, 196], [200, 209]],
        platforms: [
            { start: 16, rise: 2, length: 3 },
            { start: 30, rise: 3, length: 4 },
            { start: 45, rise: 2, length: 4 },
            { start: 57, rise: 3, length: 3 },
            { start: 73, rise: 2, length: 4 },
            { start: 91, rise: 3, length: 4 },
            { start: 108, rise: 2, length: 3 },
            { start: 126, rise: 3, length: 5 },
            { start: 147, rise: 2, length: 4 },
            { start: 165, rise: 3, length: 4 },
            { start: 185, rise: 2, length: 4 },
            { start: 202, rise: 3, length: 3 }
        ],
        enemies: [
            { tile: 8, rise: 0 }, { tile: 18, rise: 2 }, { tile: 33, rise: 3 },
            { tile: 46, rise: 2 }, { tile: 62, rise: 3 }, { tile: 76, rise: 2 },
            { tile: 95, rise: 3 }, { tile: 111, rise: 2 }, { tile: 130, rise: 3 },
            { tile: 151, rise: 2 }, { tile: 169, rise: 3 }, { tile: 188, rise: 2 },
            { tile: 204, rise: 3 }
        ],
        pickups: [
            { tile: 19, rise: 5 }, { tile: 47, rise: 4 }, { tile: 75, rise: 4 },
            { tile: 96, rise: 5 }, { tile: 131, rise: 5 }, { tile: 170, rise: 5 }, { tile: 189, rise: 4 }
        ],
        checkpoints: [25, 67, 119, 178]
    }
];
