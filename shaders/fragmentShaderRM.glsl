// Shader input variables
uniform sampler2D uTexture;
uniform sampler2D reflectionMap;
varying vec2 vUv;
uniform vec2 iResolution;
uniform float threshold;


// Function to perform thresholding
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

// Function to compute normal from height
vec3 computeNormalFromHeight(float height, vec2 uv) {
    vec2 texelSize = 1.0 / iResolution.xy;

    // Sample neighboring pixels for gradient calculation
    float heightLeft = texture2D(uTexture, uv - vec2(texelSize.x, 0.0)).r;
    float heightRight = texture2D(uTexture, uv + vec2(texelSize.x, 0.0)).r;
    float heightUp = texture2D(uTexture, uv - vec2(0.0, texelSize.y)).r;
    float heightDown = texture2D(uTexture, uv + vec2(0.0, texelSize.y)).r;

    // Compute gradients relative to the baseline height
    vec3 dx = vec3(heightRight - heightLeft, 0.0, 2.0 * texelSize.x);
    vec3 dy = vec3(0.0, heightDown - heightUp, 2.0 * texelSize.y);

    // Compute normal based on height gradients
    vec3 normal = normalize(cross(dx, dy));

    // Adjust the normal vector based on the height value
    // This adjustment is subtle and might be specific to your application needs
    // Here, we use height to modify the normal vector's z-component slightly
    normal.z = mix(normal.z, height * 5.0 - 1.0, 0.5);

    if (normal.z <= 0.0) {
         normal = vec3(1.0, 1.0, 1.0);
    }

    // Encode normal to [0, 1] range
    return normal * 0.5 + .5;
}

void main() {
    // Get the color from the texture
    vec4 texColor = texture2D(uTexture, vUv);
    
    // Apply thresholding to get a binary image
    vec4 thresholdTexture = thresholding(texColor, threshold);
    
    // Extract height information from the thresholded image
    float height = thresholdTexture.g;
    
    // Compute normal map using height and texture coordinates
    vec3 normal = computeNormalFromHeight(height, vUv);

   // Sample the reflection map
    vec3 reflection = texture2D(reflectionMap, vUv).rgb;

    // Apply the normal map to the reflection
    reflection = mix(reflection, normal, 0.5);

    //

    // Output the normal map
    gl_FragColor = vec4(reflection, 1.0);
}
