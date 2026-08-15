// --- Input Manager ---
    constructor() {
        this.keys = { left: false, right: false, jump: false, run: false, dash: false };
        this.setupButtons();
        this.setupKeyboard();
    }

    setupButtons() {
        const bindBtn = (id, key) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const start = (e) => { e.preventDefault(); this.keys[key] = true; };
            const end = (e) => { e.preventDefault(); this.keys[key] = false; };
            btn.addEventListener('touchstart', start);
            btn.addEventListener('touchend', end);
            btn.addEventListener('mousedown', start);
            btn.addEventListener('mouseup', end);
            btn.addEventListener('mouseleave', end);
        };
        bindBtn('left-btn', 'left');
        bindBtn('right-btn', 'right');
        bindBtn('jump-btn', 'jump');
        bindBtn('run-btn', 'run');
        bindBtn('dash-btn', 'dash');
    }
