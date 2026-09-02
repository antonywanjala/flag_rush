class InputManager {
    constructor() {
        this.keys = { left: false, right: false, jump: false, run: false };
        this.setupButtons();
        this.setupKeyboard();
    }

    setupButtons() {
        const bindBtn = (id, key) => {
            const btn = document.getElementById(id);
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
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = true;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = true;
            if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') this.keys.jump = true;
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') this.keys.run = true;
        });
        window.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = false;
            if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = false;
            if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') this.keys.jump = false;
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') this.keys.run = false;
        });
    }
}
