export default class SettingsCanvas {
    constructor(pen) {
        this.pen = pen;

        this.settingsCanvas = document.createElement('canvas');
        this.context = this.settingsCanvas.getContext('2d');
        document.body.appendChild(this.settingsCanvas);
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.settingsCanvas.style.position = 'absolute';
        this.settingsCanvas.style.top = '0';
        this.settingsCanvas.style.left = '0';
        this.settingsCanvas.style.zIndex = '1000';

        this.width = 140;
        this.height = 140;

        // Initialize brush radius from the pen's strokeWidth
        this.brushRadius = this.pen.strokeWidth;


    }

    resizeCanvas() {
        this.settingsCanvas.width = 140;
        this.settingsCanvas.height = 140;
    }

    // Method to update the brush radius
    updateBrushRadius(newRadius) {
        this.brushRadius = newRadius;
        this.drawCircle(); // Redraw the circle
    }

    drawCircle() {
        // Clear the canvas before redrawing
        this.context.clearRect(0, 0, this.settingsCanvas.width, this.settingsCanvas.height);

        this.context.beginPath();
        this.context.fillStyle = 'rgba(0, 0, 0, 0.0)';
        this.context.arc(this.width/2, this.height/2, this.brushRadius / 2, 0, 2 * Math.PI);
        this.context.lineWidth = 2;
        this.context.fill();
        this.context.stroke();

        this.context.font = '16px Arial';
        this.context.textAlign = 'center';
        this.context.fillStyle = 'black';
        
        if(this.brushRadius >= 75) {
        
            this.context.fillText('Brush', this.width/2, 15);
        } else{
            this.context.fillText('Brush', this.width/2 , (-this.brushRadius + 100)/1.6);
        }
    }

    
}
