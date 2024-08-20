import { Pane } from 'tweakpane'; // Ensure you have this import
import * as THREE from 'three'; // Ensure you have this import

export default class GUI {
    constructor(pen, settingsCanvas, shaderCanvas) {
        this.pen = pen;
        this.settingsCanvas = settingsCanvas; // Pass the settings canvas instance
        this.shaderCanvas = shaderCanvas; // Pass the shader canvas instance

        // Create a pane for the GUI
        const pane = new Pane();

        // Create a parameter object to store GUI values
        const params = {
            strokeWidth: this.pen.strokeWidth, // Initialize with pen's current stroke width
            smoothing: this.pen.smoothing, // Initial smoothing value
            brushColor: '#8e8e8e', // Initial brush color (light grey)
            threshold : 0.12,
            blurRadius: 58,
            is3D: true,
        };

        // Add a slider to control the stroke width
        pane.addBinding(params, 'strokeWidth', {
            min: 10,
            max: 100,
            step: 1,
        }).on('change', (ev) => {
            this.pen.setStrokeWidth(ev.value); // Update the pen's stroke width
            this.settingsCanvas.updateBrushRadius(ev.value); // Update the circle in SettingsCanvas
        });

        // Add a slider to control the smoothing
        pane.addBinding(params, 'smoothing', {
            min: 0,
            max: 10000,
            step: 100,
        }).on('change', (ev) => {
            this.pen.setSmoothing(ev.value); // Update the pen's smoothing value
        });

        // Add a color picker to control the brush color
        pane.addBinding(params, 'brushColor').on('change', (ev) => {
            const color = new THREE.Color(ev.value);
            shaderCanvas.material.uniforms.brushColor.value.set(color.r, color.g, color.b);
        });

        // Add a slider to control the threshold
        pane.addBinding(params, 'threshold', {
            min: 0,
            max: 0.5,
            step: 0.01,
        }).on('change', (ev) => {
            shaderCanvas.material.uniforms.threshold.value = ev.value;
        });

        // Add a slider to control the blur radius
        pane.addBinding(params, 'blurRadius', {
            min: 10,
            max: 100,
            step: 1,
        }).on('change', (ev) => {
            shaderCanvas.blurRadius = ev.value; // Apply the blur effect
    });

    // Add a checkBox to toggle between 2D and 3D shaders
    pane.addBinding(params, 'is3D', { // Add a comma after 'is3D'
        label: '3D',
    }).on('change', (ev) => {
        shaderCanvas.toggleShaders(); // Toggle between 2D and
    })



    // Add a button to clear the canvas 
    pane.addButton({
        title: 'Clear Canvas',
    }).on('click', () => {
        this.pen.clear(); // Clear the paper.js canvas
    });

    // Add a button to undo the last stroke and redo the last stroke one next to the other
    pane.addButton({
        title: 'Undo',
    }).on('click', () => {
        this.pen.undo(); // Undo the last stroke
    });

    pane.addButton({
        title: 'Redo',
    }).on('click', () => {
        this.pen.redo(); // Redo the last stroke
    });

   

    }
}