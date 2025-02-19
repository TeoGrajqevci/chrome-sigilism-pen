import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Pen from './Pen';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

const vertexShaderCode = `varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShaderCode = `uniform sampler2D u_texture;
uniform vec2 iResolution;
varying vec2 vUv;

vec4 thresholding(vec4 texColor, float threshold) {
    float bright = 0.33333333 * (texColor.r + texColor.g + texColor.b);
    float smoothThreshold = smoothstep(threshold - 0.0, threshold + 0.0, bright);
    vec3 finalColor = vec3(smoothThreshold);
    finalColor = 1.0 - finalColor;

    if (smoothThreshold > -1. && (texColor.r < threshold + 0.2 || texColor.g < threshold + 0.2 || texColor.b < threshold + 0.2)) {
        finalColor = vec3(1.0); 
    } else {
        finalColor = vec3(0.0); 
    }

    return vec4(finalColor, 1.0);
}

vec3 computeNormalFromHeight(float height, vec2 uv) {
    vec2 texelSize = 1.0 / iResolution;
    float stepSize = 30.0; 

    // Sample multiple neighboring pixels for smoother gradient calculation
    float heightLeft = texture2D(u_texture, uv - vec2(stepSize * texelSize.x, 0.0)).r;
    float heightRight = texture2D(u_texture, uv + vec2(stepSize * texelSize.x, 0.0)).r;
    float heightUp = texture2D(u_texture, uv - vec2(0.0, stepSize * texelSize.y)).r;
    float heightDown = texture2D(u_texture, uv + vec2(0.0, stepSize * texelSize.y)).r;

    // Compute gradients with adjusted sampling
    vec3 dx = vec3(heightRight - heightLeft, 0.0, stepSize * 2.0 * texelSize.x);
    vec3 dy = vec3(0.0, heightDown - heightUp, stepSize * 2.0 * texelSize.y);

    vec3 normal = normalize(cross(dx, dy));

    normal.z = mix(normal.z, height * 2.5 - 1.0, 0.5);

    if (normal.z <= 0.0) {
        normal = vec3(1.0);
    }

    return normal * 0.5 + 0.5;
}

void main() {
    vec4 color = texture2D(u_texture, vUv);
  
    color = 1.0 - color;
    color = thresholding(color, 0.3);

    vec3 normal = computeNormalFromHeight(color.r, vUv);

    float alpha = 1.0;
    gl_FragColor = vec4(normal, alpha);
}
`;

const alphaFragmentShaderCode = `uniform sampler2D u_texture;
varying vec2 vUv;

vec4 thresholding(vec4 texColor, float threshold) {
    float bright = 0.33333333 * (texColor.r + texColor.g + texColor.b);
    float smoothThreshold = smoothstep(threshold - 0.0, threshold + 0.0, bright);
    vec3 finalColor = vec3(smoothThreshold);
    finalColor = 1.0 - finalColor;

    if (smoothThreshold > -1. && (texColor.r < threshold + 0.2 || texColor.g < threshold + 0.2 || texColor.b < threshold + 0.2)) {
        finalColor = vec3(1.0); 
    } else {
        finalColor = vec3(0.0); 
    }

    return vec4(finalColor, 1.0);
}

void main() {
    vec4 color = texture2D(u_texture, vUv);
  
    color = 1.0 - color;
    color = thresholding(color, 0.3);

    gl_FragColor = color;
}`;

const customVertexShaderCode = `varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Custom fragment shader with ACES tone mapping and gamma correction.
// The tone mapping function has been renamed to toneMapACES to avoid conflicts.
const customFragmentShaderCode = `varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform float exposure; 

// Renamed ACES tone mapping function
vec3 toneMapACES(vec3 color) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
}

void main() {
    vec4 texColor = texture2D(tDiffuse, vUv);
    // Apply exposure
    texColor.rgb *= exposure;
    // Apply ACES tone mapping using the renamed function
    texColor.rgb = toneMapACES(texColor.rgb);
 
    gl_FragColor = texColor;
}
`;

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

        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.controls = null;
        this.geometry = null;
        this.loader = null;
        this.renderTarget = null;
        this.alphaMapRenderTarget = null;
        this.offscreenScene = null;
        this.offscreenMaterial = null;
        this.alphaMapMaterial = null;

        this.composer = null;
        this.renderPass = null;
        this.customShaderPass = null;
        this.fxaaPass = null;

        this.lastFrameTime = performance.now();
        this.frameCount = 0;

        this.pixelRatio = window.devicePixelRatio || 1;
        this.fps = 60;

        this.init();
    }

    async init() {
        this.renderer = new THREE.WebGLRenderer({ antialias: false }); // We'll use FXAA instead.
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.renderer.domElement.style.pointerEvents = 'none';
        this.renderer.domElement.style.position = 'fixed';
        this.renderer.domElement.style.zIndex = 1;
        this.renderer.domElement.style.width = "100%";
        this.renderer.domElement.style.height = "100%";

        // Set tone mapping (renderer still applies ACES tone mapping to non-postprocessed parts)
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
                this.loadShader(vertexShaderCode, true),
                this.loadShader(fragmentShaderCode, true),
                this.loadShader(alphaFragmentShaderCode, true),
                this.loadShader(customVertexShaderCode, true),
                this.loadShader(customFragmentShaderCode, true)
            ]);
        
            this.offscreenMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    u_texture: { value: this.canvasTexture },
                    iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                },
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
                side: THREE.DoubleSide,
            });
        
            this.alphaMapMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    u_texture: { value: this.canvasTexture },
                    iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
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

        // Render the main scene
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        // FXAA pass for anti-aliasing
        this.fxaaPass = new ShaderPass(FXAAShader);
        this.fxaaPass.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
        this.composer.addPass(this.fxaaPass);

        // Custom shader pass (applied after FXAA)
        this.customShaderPass.renderToScreen = true;
        this.composer.addPass(this.customShaderPass);
    }

    async loadShader(input, isRaw = false) {
        if (isRaw) {
            return input;
        } else {
            try {
                const response = await fetch(input);
                return await response.text();
            } catch (error) {
                console.error(`Error loading shader from ${input}:`, error);
                return '';
            }
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

        // Update FXAA pass resolution
        if (this.fxaaPass) {
            this.fxaaPass.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
        }
    }

    applyBlurAndUpdateCanvasTexture() {
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = this.pen.paperCanvas.width;
        offscreenCanvas.height = this.pen.paperCanvas.height;
        const offscreenContext = offscreenCanvas.getContext('2d');

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
        // console.log('Pixel ratio:', this.pixelRatio);
    }

    render() {
        if (!this.offscreenScene || !this.camera || !this.renderer) {
            console.warn('Skipping render because required components are missing.');
            return;
        }

        this.logFPS();
        this.updatePixelRatio(this.fps);

        // Render the offscreen scene with the normal map shader
        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.render(this.offscreenScene, this.camera);

        // Render the offscreen scene with the alpha map shader
        this.renderer.setRenderTarget(this.alphaMapRenderTarget);
        this.offscreenScene.overrideMaterial = this.alphaMapMaterial;
        this.renderer.render(this.offscreenScene, this.camera);
        this.offscreenScene.overrideMaterial = null;

        // Back to default render target
        this.renderer.setRenderTarget(null);

        // Update material properties
        this.geometry.material.metalness = this.metalness;
        this.geometry.material.roughness = this.roughness;
        this.renderer.toneMappingExposure = this.exposure;
        this.geometry.material.alphaMap = this.alphaMapRenderTarget.texture;

        this.controls.update();

        // Render the full composer chain (scene -> FXAA -> custom shader with ACES & gamma correction)
        this.composer.render();
    }
}
