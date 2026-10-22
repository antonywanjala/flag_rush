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
