uniform sampler2D u_texture;
varying vec2 vUv;
void main() {
    vec4 color = texture2D(u_texture, vUv);
    // Apply some effect, like inverting colors
   
    gl_FragColor = color;
}
