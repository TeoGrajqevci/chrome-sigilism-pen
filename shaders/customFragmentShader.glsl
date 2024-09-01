varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform float exposure; // Add this line if you need to handle exposure manually

void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    color.rgb *= exposure; // Apply exposure

    // grayscale
    // float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    // color.rgb = vec3(gray);
    


    gl_FragColor = vec4(color.rgb, color.a);
}

