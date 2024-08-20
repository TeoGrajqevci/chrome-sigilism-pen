// Shader input variables
uniform sampler2D uTexture;       // Base texture
uniform sampler2D reflectionMap;  // Environment reflection texture
varying vec2 vUv;
uniform vec2 iResolution;
uniform float threshold;
uniform vec3 brushColor;
uniform vec2 uMouse;
uniform float roughness;          // Roughness value (0 for perfect reflection, 1 for diffuse)

// Lighting and bump mapping parameters
const float steps = 32.0;
const float delta = 0.02;
const float sunHeight = 0.5;
const float bumpHeight = 0.5;

const vec3 sunlight = vec3(1.0, 1.0, 1.0) * 5.0;
const vec3 ambientLight = vec3(1., 1., 1.0);

// Bayer dithering function
#define g(a) (-4.0 * a.x * a.y + 3.0 * a.x + a.y * 2.0)
float bayer16x16(vec2 p) {
    vec2 m0 = vec2(mod(floor(p / 8.0), 2.0));
    vec2 m1 = vec2(mod(floor(p / 4.0), 2.0));
    vec2 m2 = vec2(mod(floor(p / 2.0), 2.0));
    vec2 m3 = vec2(mod(floor(p), 2.0));
    return (g(m0) + g(m1) * 4.0 + g(m2) * 16.0 + g(m3) * 32.0) / 255.0;
}
#undef g

// Lighting calculation function
vec3 getLighting(vec3 color, float nDotL, vec3 lPos, vec3 rV) {
    float reflection = pow(clamp(dot(lPos, rV), 0.0, 100.0), 10.0);
    return color * (sunlight * nDotL + (ambientLight + sunlight * 0.015)) 
           + reflection * sunlight;
}

void main() {
    // Sample the texture color
    vec4 texColor = texture2D(uTexture, vUv);

    // Brightness calculation
    float bright = 0.33333333 * (texColor.r + texColor.g + texColor.b);

    // Apply thresholding
    float smoothThreshold = smoothstep(threshold - 0.0, threshold + 0.0, bright);
    vec3 baseColor = vec3(smoothThreshold);

    // Threshold logic with brushColor
    vec3 finalColor;

    // Bump mapping and normal calculation
    vec2 deltat = (vUv - 0.5) / steps * bumpHeight;
    vec2 uv = vUv;
    vec2 dither = bayer16x16(gl_FragCoord.xy) * deltat;

    float d0 = texture2D(uTexture, uv + dither).r;
    float d1 = texture2D(uTexture, uv + vec2(delta, 0.0) + dither).r;
    float d2 = texture2D(uTexture, uv + vec2(0.0, delta) + dither).r;

    // Normal calculation
    float dx = (d0 - d1) / delta;
    float dy = (d0 - d2) / delta;
    vec3 normal = normalize(vec3(dx, dy, 1.5));

    // Light source position (no mouse control, fixed direction)
    vec3 lPos = normalize(vec3(-uMouse.x, uMouse.y, sunHeight));  // Fixed light position

    // Calculate diffuse lighting
    float ndotL = max(dot(normal, lPos), .0);

    // View direction (assuming camera is at (0, 0, 1))
    vec3 viewDir = normalize(vec3(uv, 1.0));

    // Reflection vector for specular highlights
    vec3 reflectedVector = reflect(-viewDir, normal);

    // Roughness effect: blending between perfect reflection and diffuse color
    vec3 reflectionColor = texture2D(reflectionMap, reflectedVector.xy * 0.5 + 0.5).rgb;
    reflectionColor = mix(reflectionColor, baseColor, roughness);

    // Apply lighting and reflection to the final color
    if (smoothThreshold > -2.0 && 
        (texColor.r < threshold + 0.2 || texColor.g < threshold + 0.2 || texColor.b < threshold + 0.2)) {
        vec3 litColor = getLighting(brushColor, ndotL, lPos, reflectedVector);
        finalColor = mix(litColor, reflectionColor, 1.0 - roughness);  // Mix with reflection based on roughness
    } else {
        finalColor = vec3(0.0) * 100.;
    }

    // Tone mapping to prevent color overflow
    finalColor /= 0.5 + finalColor;

    // Output the final color
    gl_FragColor = vec4(finalColor, 1.0);
}
