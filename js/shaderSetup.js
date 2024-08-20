import * as THREE from 'three';
import { loadShader } from './loadShader'; // Adjust the path if needed

export default class ShaderCanvas {
    constructor(drawingCanvas) {
        this.drawingCanvas = drawingCanvas;

        // Track the current shader mode (true for 3D, false for 2D)
        this.is3D = true;

        window.addEventListener('mousemove', (event) => {
            this.updateMousePosition(event.clientX, event.clientY);
        });

        this.mouseX = 0;
        this.mouseY = 0;

        // Create a new canvas for the shader
        this.shaderCanvas = document.createElement('canvas');
        this.shaderCanvas.style.position = 'fixed';
        this.shaderCanvas.style.top = '0';
        this.shaderCanvas.style.left = '0';
        this.shaderCanvas.style.zIndex = '0'; // Ensure it's behind other canvases
        document.body.appendChild(this.shaderCanvas);

        this.shaderCanvas.style.pointerEvents = 'none'; // Disable pointer events
        this.shaderCanvas.style.userSelect = 'none'; // Disable user selection

        // Set up Three.js renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.shaderCanvas });
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Create a scene and camera
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 1;

        this.shaderBasePath = process.env.NODE_ENV === 'production' ? '/build/shaders/' : './shaders/';

        // Load the initial shaders (3D by default)
        this.loadShaders(`${this.shaderBasePath}vertexShader3D.glsl`, `${this.shaderBasePath}fragmentShaderParallax.glsl`);

        // Update the shader canvas on window resize
        window.addEventListener('resize', () => this.resizeCanvas());

        // Add event listener for the "A" key press to toggle between 2D and 3D shaders
        window.addEventListener('keydown', (event) => {
            if (event.key === 'a' || event.key === 'A') {
                this.toggleShaders();
            }
        });

        this.resizeCanvas();
        this.animate();
    }

    updateMousePosition(x, y) {
        
        this.mouseX = (x / window.innerWidth) * 2 - 1;
        this.mouseY = (y / window.innerHeight) * 2 - 1; 

        if (this.material) {
            this.material.uniforms.uMouse.value.set(this.mouseX, this.mouseY);

    }
}

    // Function to load shaders dynamically
    loadShaders(vertexShaderPath, fragmentShaderPath) {
        Promise.all([
            loadShader(vertexShaderPath),
            loadShader(fragmentShaderPath)
        ]).then(([vertexShaderSource, fragmentShaderSource]) => {
            // If material exists, remove the mesh before updating the material
            if (this.material && this.mesh) {
                this.scene.remove(this.mesh);
            }

            // Create a shader material with the loaded vertex and fragment shaders
            this.material = new THREE.ShaderMaterial({
                uniforms: {
                    uTexture: { type: 't', value: null },
                    iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
                    brushColor: { value: new THREE.Vector3(0.557, 0.557, 0.557) },
                    threshold: { value: 0.12 },
                    uMouse: { value: new THREE.Vector2(0, 0) },
                },
                vertexShader: vertexShaderSource,
                fragmentShader: fragmentShaderSource
            });

            // Create geometry and mesh with the new shader material
            this.geometry = new THREE.PlaneGeometry(2, 2);
            this.mesh = new THREE.Mesh(this.geometry, this.material);
            this.scene.add(this.mesh);

            // Update the texture from DrawingCanvas after shaders are loaded
            this.updateTexture();
        }).catch(error => {
            console.error('Error loading shaders:', error);
        });
    }

    // Function to toggle between 2D and 3D shaders
    toggleShaders() {
        if (this.is3D) {
            // Load 2D shaders
            this.loadShaders(`${this.shaderBasePath}vertexShader3D.glsl`, `${this.shaderBasePath}fragmentShader2D.glsl`);
        } else {
            // Load 3D shaders
            this.loadShaders(`${this.shaderBasePath}vertexShader3D.glsl`, `${this.shaderBasePath}fragmentShaderParallax.glsl`);
        }

        // Toggle the is3D flag
        this.is3D = !this.is3D;
    }

    resizeCanvas() {
        // Resize the shader canvas
        this.shaderCanvas.width = window.innerWidth;
        this.shaderCanvas.height = window.innerHeight;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        // Update the iResolution uniform to match the new size
        if (this.material) {
            this.material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight, 1);
        }
    }

    // Function to apply the blur and update the texture
    applyBlurAndUpdateTexture() {
        // Create an offscreen canvas to apply the blur effect
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = this.drawingCanvas.canvas.width;
        offscreenCanvas.height = this.drawingCanvas.canvas.height;
        const offscreenContext = offscreenCanvas.getContext('2d');

        this.blurRadius;

        if (this.blurRadius === undefined) {
            this.blurRadius = 58;
        }

        // Apply the blur filter before drawing the image from the DrawingCanvas
        offscreenContext.filter = `blur(${this.blurRadius}px)`;
        offscreenContext.drawImage(this.drawingCanvas.canvas, 0, 0);

        // Create a Three.js texture from the offscreen canvas
        const texture = new THREE.CanvasTexture(offscreenCanvas);

        // Set the blurred texture to the shader material uniform
        if (this.material) {
            this.material.uniforms.uTexture.value = texture;
        }
    }

    updateTexture() {
        // Apply blur and update the texture
        this.applyBlurAndUpdateTexture();
    }

    animate() {
        this.updateTexture();
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}
