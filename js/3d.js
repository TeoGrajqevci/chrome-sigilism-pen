import * as THREE from 'three';
import { UltraHDRLoader } from 'three/examples/jsm/loaders/UltraHDRLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; // Ensure correct import
import Pen from './Pen';

export default class Canvas3D {
    constructor() {
        this.metalness = 1.0;
        this.roughness = 0.0;
        this.exposure = 2.0;

        this.pen = new Pen();

        this.renderer;
        this.scene;
        this.camera;
        this.controls;
        this.geometry;
        this.loader;
        this.renderTarget; 
        this.offscreenScene; 
        this.offscreenMaterial; 

        this.init();
    }

    async init() {
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.renderer.domElement.style.pointerEvents = 'none';
        this.renderer.domElement.style.zIndex = 1;

        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = this.exposure;

        this.renderer.setAnimationLoop(this.render.bind(this));

        this.scene = new THREE.Scene();

        // Create the canvas texture
        this.canvasTexture = new THREE.CanvasTexture(this.pen.paperCanvas);

        // Create WebGLRenderTarget for offscreen rendering
        this.renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth, // Update dimensions here
            window.innerHeight, // Update dimensions here
            {
                format: THREE.RGBAFormat,
                type: THREE.UnsignedByteType,
                depthBuffer: false,
                stencilBuffer: false,
            }
        );

        // Create an offscreen scene for rendering the shader
        this.offscreenScene = new THREE.Scene();

        // Load shaders and create ShaderMaterial
        try {
            const [vertexShader, fragmentShader] = await Promise.all([
                this.loadShader('shaders/vertexShader.glsl'),
                this.loadShader('shaders/fragmentShader.glsl')
            ]);

            this.offscreenMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    u_texture: { value: this.canvasTexture },
                },
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                side: THREE.DoubleSide,
            });

            // Fullscreen quad for offscreen rendering
            const offscreenQuad = new THREE.Mesh(
                new THREE.PlaneGeometry(2, 2),
                this.offscreenMaterial
            );
            this.offscreenScene.add(offscreenQuad);
        } catch (error) {
            console.error('Error loading shaders:', error);
            return;
        }

        // Create material for the main scene
        this.material = new THREE.MeshStandardMaterial({
            metalness: this.metalness,
            roughness: this.roughness,
            map: this.renderTarget.texture,
            // alphaMap: this.renderTarget.texture,
            // transparent: true,
            side: THREE.DoubleSide,
        });

        // Create geometry and add it to the main scene
        this.geometry = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            this.material
        );
        this.scene.add(this.geometry);

        // Setup camera
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.001, 200);
        this.camera.position.set(0.0, 0.0, -3.5);

        // Setup OrbitControls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        // Ensure controls are enabled and keys are set
        this.controls.enableKeys = true;
        this.controls.keys = {
            LEFT: 'ArrowLeft',
            UP: 'ArrowUp',
            RIGHT: 'ArrowRight',
            BOTTOM: 'ArrowDown'
        };

        // Load HDR texture
        this.loader = new UltraHDRLoader();
        this.loader.load('./spruit_sunrise_2k.hdr.jpg', (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.background = texture;
            this.scene.environment = texture;
        });

        window.addEventListener('resize', this.resize.bind(this));

        setInterval(() => {
            this.canvasTexture.needsUpdate = true;
            this.applyBlurAndUpdateCanvasTexture();
        }, 100);
    }

    async loadShader(url) {
        try {
            const response = await fetch(url);
            return await response.text();
        } catch (error) {
            console.error(`Error loading shader from ${url}:`, error);
            return '';
        }
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Update the render target size
        this.renderTarget.setSize(window.innerWidth, window.innerHeight);
    }

    applyBlurAndUpdateCanvasTexture() {
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = this.pen.paperCanvas.width;
        offscreenCanvas.height = this.pen.paperCanvas.height;
        const offscreenContext = offscreenCanvas.getContext('2d');

        this.blurRadius;

        if (this.blurRadius === undefined) {
            this.blurRadius = 58;
        }

        // Apply the blur filter before drawing the image from the DrawingCanvas
        offscreenContext.filter = `blur(${this.blurRadius}px)`;
        offscreenContext.drawImage(this.pen.paperCanvas, 0, 0);

        // Create a Three.js texture from the offscreen canvas
        const texture = new THREE.CanvasTexture(offscreenCanvas);

        // Set the blurred texture to the shader material uniform
        if (this.offscreenMaterial) {
            this.offscreenMaterial.uniforms.u_texture.value = texture;
        }
    }

    render() {
        if (!this.offscreenScene || !this.camera || !this.renderer) {
            console.warn('Skipping render because required components are missing.');
            return;
        }

        // Render the offscreen scene to the render target
        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.render(this.offscreenScene, this.camera);
        this.renderer.setRenderTarget(null);

        // Update material properties based on sliders or other inputs
        this.geometry.material.metalness = this.metalness;
        this.geometry.material.roughness = this.roughness;

        // Update tone mapping exposure
        this.renderer.toneMappingExposure = this.exposure;

        // Update controls and render the main scene
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
