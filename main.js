import './style.css';
import DrawingCanvas from '/js/DrawingCanvas';
import SettingsCanvas from '/js/SettingsCanvas';
import Pen from '/js/Pen';
import GUI from '/js/GUI';
import ShaderCanvas from '/js/shaderSetup'; // Import ShaderCanvas

// Create a new drawing canvas
const drawingCanvas = new DrawingCanvas();

// Create a new pen for drawing on the canvas
const pen = new Pen(drawingCanvas.canvas);

// Create a new settings canvas for the brush preview
const settingsCanvasInstance = new SettingsCanvas(pen);
// Create a new shader canvas that uses the drawing canvas as a texture
const shaderCanvas = new ShaderCanvas(drawingCanvas);
// Create a new GUI to control the pen and link it to the settings canvas
const gui = new GUI(pen, settingsCanvasInstance, shaderCanvas); // Pass the shader canvas instance


// Set the cursor style to crosshair for the entire document
document.documentElement.style.cursor = "crosshair";