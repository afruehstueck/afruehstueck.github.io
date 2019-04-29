precision highp float;

// The texture.
uniform sampler2D texture;

// Passed in from the vertex shader.
varying vec2 textureCoordinate;
void main() {
    /*gl_FragColor.r = clamp( texture2D( texture, textureCoordinate ).r * 2.0 - 1.0, 0., 1.);
    gl_FragColor.g = clamp(- ( texture2D( texture, textureCoordinate ).r * 2.0 - 1.0 ), 0., 1.);

    if(texture2D( texture, textureCoordinate ).r == 0. || texture2D( texture, textureCoordinate ).r == 1. ) gl_FragColor.b = 1.;
    //gl_FragColor.rgb = vec3( texture2D( texture, textureCoordinate ).a );
    gl_FragColor.a = 1.;*/
    gl_FragColor.rgba = texture2D( texture, textureCoordinate ).rgba;
}