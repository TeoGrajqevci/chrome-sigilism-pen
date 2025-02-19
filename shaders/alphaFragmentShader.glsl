uniform sampler2D u_texture;
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
}