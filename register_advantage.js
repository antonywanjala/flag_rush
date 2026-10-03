    registerAdvantage(label, amount = 0.01) {
        this.playerBoost = Math.min(0.09, this.playerBoost + amount);
        this.flashTimer = Math.max(this.flashTimer, 1.05);
        this.flashMessage = `${label} // GROUND GAINED`;
    }
