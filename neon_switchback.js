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
    },
    {
        id: 3,
        name: 'BLOOD MOON OVERDRIVE',
        subtitle: 'A relentless gauntlet of broken lanes, rebound chains, and all-in momentum.',
        tileCount: 240,
        tint: 'rgba(38, 8, 68, 0.24)',
        celebrationColors: ['#ff4d00', '#ff1744', '#ffd166', '#ffffff'],
        groundSegments: [
            [0, 9], [12, 22], [25, 34], [37, 46], [49, 61], [64, 76],
            [79, 91], [94, 104], [107, 118], [121, 133], [136, 145], [148, 160],
            [163, 174], [177, 188], [191, 202], [205, 214], [217, 225], [228, 239]
        ],
        platforms: [
            { start: 14, rise: 2, length: 3 },
            { start: 27, rise: 3, length: 3 },
            { start: 41, rise: 2, length: 4 },
            { start: 55, rise: 3, length: 4 },
            { start: 69, rise: 2, length: 3 },
            { start: 84, rise: 3, length: 4 },
            { start: 98, rise: 2, length: 3 },
            { start: 112, rise: 3, length: 4 },
            { start: 126, rise: 2, length: 4 },
            { start: 141, rise: 3, length: 4 },
            { start: 154, rise: 2, length: 3 },
            { start: 168, rise: 3, length: 4 },
            { start: 182, rise: 2, length: 4 },
            { start: 196, rise: 3, length: 4 },
            { start: 210, rise: 2, length: 3 }
        ],
        enemies: [
            { tile: 7, rise: 0 }, { tile: 16, rise: 2 }, { tile: 21, rise: 0 },
            { tile: 30, rise: 3 }, { tile: 43, rise: 2 }, { tile: 58, rise: 3 },
            { tile: 66, rise: 0 }, { tile: 72, rise: 2 }, { tile: 87, rise: 3 },
            { tile: 101, rise: 2 }, { tile: 110, rise: 0 }, { tile: 115, rise: 3 },
            { tile: 129, rise: 2 }, { tile: 139, rise: 0 }, { tile: 144, rise: 3 },
            { tile: 157, rise: 2 }, { tile: 171, rise: 3 }, { tile: 180, rise: 0 },
            { tile: 186, rise: 2 }, { tile: 199, rise: 3 }, { tile: 207, rise: 0 },
            { tile: 212, rise: 2 }, { tile: 222, rise: 3 }, { tile: 232, rise: 1 },
            { tile: 237, rise: 0 }
        ],
        pickups: [
            { tile: 18, rise: 5 }, { tile: 42, rise: 4 }, { tile: 57, rise: 5 },
            { tile: 86, rise: 5 }, { tile: 114, rise: 5 }, { tile: 143, rise: 5 },
            { tile: 169, rise: 5 }, { tile: 197, rise: 5 }, { tile: 221, rise: 5 },
            { tile: 233, rise: 4 }
        ],
        checkpoints: [30, 75, 119, 165, 211],
        finishApproach: {
            goalOffset: 4,
            platforms: [
                { start: 218, rise: 1, length: 4 },
                { start: 222, rise: 2, length: 3 },
                { start: 226, rise: 3, length: 4 },
                { start: 231, rise: 1, length: 5 }
            ]
        }
    }
];
