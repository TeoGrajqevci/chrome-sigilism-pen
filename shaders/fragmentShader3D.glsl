// Shader input variables
uniform sampler2D uTexture;
varying vec2 vUv;
uniform vec2 iResolution;
uniform vec3 brushColor;
uniform float threshold;

const vec3 uLightDirection = normalize(vec3(-1.0, -1.0, 1.0)); // Example light direction
const vec3 uLightIntensity = vec3(1.5,1.5,1.5);// Increased light intensity

const vec3 uSurfaceColor = vec3(0.0); // Grey color

void main()
{
    vec4 texColor = texture2D(uTexture, vUv);
    float bright = 0.33333333 * (texColor.r + texColor.g + texColor.b);
    
    float threshold = threshold;
    float smoothThreshold = smoothstep(threshold - 0.1, threshold + 0.1, bright);
    
    vec2 offset = vec2(1.0) / iResolution;

    float brightL = 0.33333333 * (texture2D(uTexture, vUv - vec2(offset.x, 0.0)).r +
                      texture2D(uTexture, vUv - vec2(offset.x, 0.0)).g +
                      texture2D(uTexture, vUv - vec2(offset.x, 0.0)).b);
    
    float brightR = 0.33333333 * (texture2D(uTexture, vUv + vec2(offset.x, 0.0)).r +
                      texture2D(uTexture, vUv + vec2(offset.x, 0.0)).g +
                      texture2D(uTexture, vUv + vec2(offset.x, 0.0)).b);
    
    float brightT = 0.33333333 * (texture2D(uTexture, vUv + vec2(0.0, offset.y)).r +
                      texture2D(uTexture, vUv + vec2(0.0, offset.y)).g +
                      texture2D(uTexture, vUv + vec2(0.0, offset.y)).b);
    
    float brightB = 0.33333333 * (texture2D(uTexture, vUv - vec2(0.0, offset.y)).r +
                      texture2D(uTexture, vUv - vec2(0.0, offset.y)).g +
                      texture2D(uTexture, vUv - vec2(0.0, offset.y)).b);

    float smoothBrightL = smoothstep(threshold - 0.2, threshold + 0.2, brightL);
    float smoothBrightR = smoothstep(threshold - 0.2, threshold + 0.2, brightR);
    float smoothBrightT = smoothstep(threshold - 0.2, threshold + 0.2, brightT);
    float smoothBrightB = smoothstep(threshold - 0.2, threshold + 0.2, brightB);

    vec2 gradient = vec2(smoothBrightR - smoothBrightL, smoothBrightT - smoothBrightB);

    vec3 normal = normalize(vec3(gradient, 0.1));

    float diffuse = max(dot(normal, uLightDirection), 0.0);
    vec3 lightColor = uLightIntensity * diffuse;

    vec3 color;
    if (smoothThreshold > -1. && (texColor.r < threshold+0.2|| texColor.g < threshold+0.2 || texColor.b < threshold+0.2)) {
        color = brushColor; 
    } else {
        color = uSurfaceColor; 
    }

    vec3 finalColor = color * lightColor;
    gl_FragColor = vec4(vec3(finalColor), 1.0);
}
