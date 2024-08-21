// Shader input variables
uniform sampler2D uTexture;
varying vec2 vUv;
uniform vec2 iResolution;
uniform float threshold;
uniform vec3 brushColor;


void main()
{
   vec4 texColor = texture2D(uTexture, vUv);
    float bright = 0.33333333 * (texColor.r + texColor.g + texColor.b);
    
    float threshold = threshold ;
    float smoothThreshold = smoothstep(threshold - 0.0, threshold + 0.0, bright);
    
    vec3 finalColor = vec3(smoothThreshold);

    finalColor = 1.0 - finalColor;

    if (smoothThreshold > -1. && (texColor.r < threshold+0.2|| texColor.g < threshold+0.2 || texColor.b < threshold+0.2)) {
        finalColor = vec3(1.0); 
    } else {
        finalColor = vec3(0.0); 
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
