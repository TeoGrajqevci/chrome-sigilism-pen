varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform float exposure; 

void main()
{
    vec2 xy= vUv;
   
    xy*=2.;
    
    float l1=step(xy.x,1.);
    float l2=step(xy.y,1.);
    float m1=l1*l2;
    
     l1=step(xy.x,1.);
     l2=step(1.,xy.y);
    float m2=l1*l2;
    
    l1=step(1.,xy.x);
     l2=step(1.,xy.y);
    float m3=l1*l2;
    
    l1=step(1.,xy.x);
    l2=step(xy.y,1.);
    float m4=l1*l2;
    xy.x=m1*xy.x+m2*xy.x+m3*(2.-xy.x)+m4*(2.-xy.x);
    xy.y=m1*(1.-xy.y)+m2*(xy.y-1.)+m3*(xy.y-1.)+m4*(1.-xy.y);

    vec4 texColor=texture2D(tDiffuse,vUv);

    texColor.rgb*=exposure;

    //     // float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
//     // color.rgb = vec3(gray);

//     // if (color.r < 0.1 || color.g < 0.1 || color.b < 0.1) {
//     //     color.rgb = vec3(1.0);
//     // } 

    gl_FragColor=texColor;
}