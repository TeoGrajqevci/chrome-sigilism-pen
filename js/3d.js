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

        this.init();
    }

    async init() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.renderer.domElement.style.pointerEvents = 'none';
        this.renderer.domElement.style.position = 'fixed';
        // this.renderer.domElement.style.top = "10%";
        // this.renderer.domElement.style.left = "20%";
        // this.renderer.domElement.style.border = "1px solid white";
        // this.renderer.domElement.style.borderRadius = "100px";

        this.renderer.domElement.style.zIndex = 1;
        this.renderer.domElement.style.width ="100%";
        this.renderer.domElement.style.height ="100%";

        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = this.exposure;

        this.renderer.setAnimationLoop(this.render.bind(this));

        this.scene = new THREE.Scene();

        this.canvasTexture = new THREE.CanvasTexture(this.pen.paperCanvas);

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

        this.offscreenScene = new THREE.Scene();

        try {
            const [vertexShader, fragmentShader, alphaFragmentShader, customVertexShader, customFragmentShader] = await Promise.all([
                this.loadShader('shaders/vertexShader.glsl'),
                this.loadShader('shaders/fragmentShader.glsl'),
                this.loadShader('shaders/alphaFragmentShader.glsl'),
                this.loadShader('shaders/customVertexShader.glsl'),
                this.loadShader('shaders/customFragmentShader.glsl')
            ]);

            this.offscreenMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    u_texture: { value: this.canvasTexture },
                    iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
                },
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                side: THREE.DoubleSide,
            });

            this.alphaMapMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    u_texture: { value: this.canvasTexture },
                    iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
                },
                vertexShader: vertexShader,
                fragmentShader: alphaFragmentShader,
                side: THREE.DoubleSide,
            });

            const offscreenQuad = new THREE.Mesh(
                new THREE.PlaneGeometry(this.plane.x, this.plane.y),
                this.offscreenMaterial
            );
            this.offscreenScene.add(offscreenQuad);

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

        this.material = new THREE.MeshStandardMaterial({
            metalness: this.metalness,
            roughness: this.roughness,
            normalMap: this.renderTarget.texture,
            alphaMap: this.alphaMapRenderTarget.texture,
            transparent: true,
            side: THREE.DoubleSide,
        });

        this.geometry = new THREE.Mesh(
            new THREE.PlaneGeometry(this.plane.x, this.plane.y),
            this.material
        );
        this.scene.add(this.geometry);

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.001, 200);
        this.camera.position.set(0.0, 0.0, -2.15);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.loader = new RGBELoader();
        this.loader.load('./studio_small_03_2k.hdr', (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.environment = texture;
        });

        this.initPostProcessing();

        window.addEventListener('resize', this.resize.bind(this));

        setInterval(() => {
            this.canvasTexture.needsUpdate = true;
            this.applyBlurAndUpdateCanvasTexture();
        }, 30);
   
        
    }

    initPostProcessing() {

        this.composer = new EffectComposer(this.renderer);
        
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

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

        offscreenContext.filter = `blur(${this.blurRadius}px)`;
        offscreenContext.drawImage(this.pen.paperCanvas, 0, 0);

        const texture = new THREE.CanvasTexture(offscreenCanvas);

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

        const minFps = 5;
        const maxFps = 60;
        const minRatio = 0.1;
        const maxRatio = 2;

        

    document.addEventListener('mousedown', () => {
        if (fps < 10) {
            this.pixelRatio = 0.1;
        } else if (fps < 20) {
            this.pixelRatio = 0.25;
        } else if (fps < 30) {
            this.pixelRatio = 0.35;
        } else if (fps < 40) {
            this.pixelRatio = 0.5;
        } else if (fps < 50) {
            this.pixelRatio = 1;
        } else if (fps < 55) {
            this.pixelRatio = 2;
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

        this.updatePixelRatio(this.fps);

        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.render(this.offscreenScene, this.camera);

        this.renderer.setRenderTarget(this.alphaMapRenderTarget);
        this.offscreenScene.overrideMaterial = this.alphaMapMaterial;
        this.renderer.render(this.offscreenScene, this.camera);
        this.offscreenScene.overrideMaterial = null;

        this.renderer.setRenderTarget(null);

        this.geometry.material.metalness = this.metalness;
        this.geometry.material.roughness = this.roughness;

        this.renderer.toneMappingExposure = this.exposure;

        this.geometry.material.alphaMap = this.alphaMapRenderTarget.texture;

        this.controls.update();

        this.composer.render();
    }
}
