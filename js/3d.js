import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Pen from './Pen';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export default class Canvas3D {
    constructor() {
        this.metalness = 1.0;
        this.roughness = 0.0;
        this.exposure = 2.0;

        this.pen = new Pen();

        this.plane = {
            x: (2 * window.innerWidth) / window.innerHeight,
            y: (2 * window.innerHeight) / window.innerHeight,
        };

        this.renderer;
        this.scene;
        this.camera;
        this.controls;
        this.geometry;
        this.loader;
        this.renderTarget;
        this.alphaMapRenderTarget;
        this.offscreenScene;
        this.offscreenMaterial;
        this.alphaMapMaterial;

        this.composer;
        this.customShaderPass;

        this.lastFrameTime = performance.now();
        this.frameCount = 0;

        this.pixelRatio;

        this.hdr = {
            country : './spruit_sunrise_2k.hdr.jpg',
            studio: './studio_small_03_2k.hdr',
        }

        this.init();
    }

    async init() {
        this.renderer = new THREE.WebGLRenderer({ antialias: false });
        this.renderer.setPixelRatio(this.pixelRatio);
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

        // Create WebGLRenderTarget for the main scene
        this.renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
            {
                format: THREE.RGBAFormat,
                type: THREE.UnsignedByteType,
                depthBuffer: false,
                stencilBuffer: false,
            }
        );

        // Create WebGLRenderTarget for the alpha map
        this.alphaMapRenderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth,
            window.innerHeight,
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
            const [vertexShader, fragmentShader, alphaFragmentShader, customVertexShader, customFragmentShader] = await Promise.all([
                this.loadShader('shaders/vertexShader.glsl'),
                this.loadShader('shaders/fragmentShader.glsl'),
                this.loadShader('shaders/alphaFragmentShader.glsl'),
                this.loadShader('shaders/customVertexShader.glsl'),
                this.loadShader('shaders/customFragmentShader.glsl')
            ]);

            // Main shader material
            this.offscreenMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    u_texture: { value: this.canvasTexture },
                    iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
                },
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                side: THREE.DoubleSide,
            });

            // Alpha shader material
            this.alphaMapMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    u_texture: { value: this.canvasTexture },
                    iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
                },
                vertexShader: vertexShader,
                fragmentShader: alphaFragmentShader,
                side: THREE.DoubleSide,
            });

            // Fullscreen quad for offscreen rendering
            const offscreenQuad = new THREE.Mesh(
                new THREE.PlaneGeometry(this.plane.x, this.plane.y),
                this.offscreenMaterial
            );
            this.offscreenScene.add(offscreenQuad);

            // Custom shader pass
            this.customShaderPass = new ShaderPass({
                uniforms: {
                    tDiffuse: { value: null },
                    exposure: { value: this.exposure },
                },
                vertexShader: customVertexShader,
                fragmentShader: customFragmentShader,
            });
            this.customShaderPass.renderToScreen = true;
        } catch (error) {
            console.error('Error loading shaders:', error);
            return;
        }

        // Create material for the main scene
        this.material = new THREE.MeshStandardMaterial({
            metalness: this.metalness,
            roughness: this.roughness,
            normalMap: this.renderTarget.texture,
            alphaMap: this.alphaMapRenderTarget.texture,
            transparent: true,
            side: THREE.DoubleSide,
        });

        // Create geometry and add it to the main scene
        this.geometry = new THREE.Mesh(
            new THREE.PlaneGeometry(this.plane.x, this.plane.y),
            this.material
        );
        this.scene.add(this.geometry);

        // Setup camera
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.001, 200);
        this.camera.position.set(0.0, 0.0, -2.15);

        // Setup OrbitControls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        // Load HDR texture using RGBELoader
        this.loadHDR(this.hdr.country);

        // Initialize post-processing
        this.initPostProcessing();

        window.addEventListener('resize', this.resize.bind(this));

        setInterval(() => {
            this.canvasTexture.needsUpdate = true;
            this.applyBlurAndUpdateCanvasTexture();
        }, 60);
   
        
    }

    loadHDR(url) {
        this.loader = new RGBELoader();
        this.loader.load(url, (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.environment = texture;
            this.scene.background = texture;
        });
    }

    initPostProcessing() {
        // Create EffectComposer
        this.composer = new EffectComposer(this.renderer);
        
        // Render pass
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        // Add the custom shader pass
        this.composer.addPass(this.customShaderPass);
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

    calculateRatio() {
        const ratio = window.innerWidth / window.innerHeight;
        return ratio;
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Update the render target sizes
        this.renderTarget.setSize(window.innerWidth, window.innerHeight);
        this.alphaMapRenderTarget.setSize(window.innerWidth, window.innerHeight);

        // Update the composer size
        this.composer.setSize(window.innerWidth, window.innerHeight);
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
        if (this.alphaMapMaterial) {
            this.alphaMapMaterial.uniforms.u_texture.value = texture;
        }
    }

    logFPS() {
        let lastTime = performance.now();
        let frames = 0;
        let fpsInterval = 100; 

        const calculateFPS = () => {
            const now = performance.now();
            frames++;

            if (now - lastTime >= fpsInterval) {
                this.fps = (frames * 1000) / (now - lastTime);
                lastTime = now;
                frames = 0;
            }

            requestAnimationFrame(calculateFPS);
        };

        calculateFPS();
    }

    updatePixelRatio(fps) {

    document.addEventListener('mousedown', () => {
        if (fps < 30) {
            this.pixelRatio = 0.3;
        } else if (fps < 40) {
            this.pixelRatio = 0.7;
        } else {
            this.pixelRatio = 1.2;
        }
    });

    document.addEventListener('mouseup', () => {
        this.pixelRatio = 2;
    });

        this.renderer.setPixelRatio(this.pixelRatio);

       

        console.log('Pixel ratio:', this.pixelRatio);
    }

    render() {
        if (!this.offscreenScene || !this.camera || !this.renderer) {
            console.warn('Skipping render because required components are missing.');
            return;
        }

        

      this.logFPS();
        // console.log('FPS:', this.fps)

        this.updatePixelRatio(this.fps);

        // Render the offscreen scene for the main render target
        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.render(this.offscreenScene, this.camera);

        // Render the offscreen scene for the alphaMap render target
        this.renderer.setRenderTarget(this.alphaMapRenderTarget);
        this.offscreenScene.overrideMaterial = this.alphaMapMaterial;
        this.renderer.render(this.offscreenScene, this.camera);
        this.offscreenScene.overrideMaterial = null;

        // Reset render target
        this.renderer.setRenderTarget(null);

        // Update material properties based on sliders or other inputs
        this.geometry.material.metalness = this.metalness;
        this.geometry.material.roughness = this.roughness;

        // Update tone mapping exposure
        this.renderer.toneMappingExposure = this.exposure;

        // Assign the alpha map texture to the material
        this.geometry.material.alphaMap = this.alphaMapRenderTarget.texture;

        // Update controls
        this.controls.update();

        // Render the scene with post-processing
        this.composer.render();
    }
}
