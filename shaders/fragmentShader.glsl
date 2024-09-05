uniform sampler2D u_texture;
uniform vec2 iResolution;
varying vec2 vUv;

// Function to apply thresholding
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

// Function to compute normal from height with smoothing
vec3 computeNormalFromHeight(float height, vec2 uv) {
    vec2 texelSize = 1.0 / iResolution.xy;
    float stepSize = 40.0; // Step size to sample further out pixels; adjust for smoother results

    // Sample multiple neighboring pixels for smoother gradient calculation
    float heightLeft = texture2D(u_texture, uv - vec2(stepSize * texelSize.x, 0.0)).r;
    float heightRight = texture2D(u_texture, uv + vec2(stepSize * texelSize.x, 0.0)).r;
    float heightUp = texture2D(u_texture, uv - vec2(0.0, stepSize * texelSize.y)).r;
    float heightDown = texture2D(u_texture, uv + vec2(0.0, stepSize * texelSize.y)).r;

    // Compute gradients with adjusted sampling
    vec3 dx = vec3(heightRight - heightLeft, 0.0, stepSize * 2.0 * texelSize.x);
    vec3 dy = vec3(0.0, heightDown - heightUp, stepSize * 2.0 * texelSize.y);

    // Compute normal from the cross product of the gradients
    vec3 normal = normalize(cross(dx, dy));

    // Optionally adjust the normal based on height
    normal.z = mix(normal.z, height * 10.0 - 1.0, 0.5);

    if (normal.z <= 0.0) {
        normal = vec3(1.0, 1.0, 1.0);
    }

    // Encode normal to [0, 1] range
    return normal * 0.5 + 0.5;
}

void main() {
    vec4 color = texture2D(u_texture, vUv);
  
    color = 1.0 - color;
    color = thresholding(color, 0.3);

    // Compute normal from height
    vec3 normal = computeNormalFromHeight(color.r, vUv);

    float alpha = 1.0;


    // if (normal.z <= 1.0) {
    //     alpha = 0.0;
    // }

    normal = 1.0 - normal;

    // Output the normal as the final color
    gl_FragColor = vec4(normal, alpha);
}
