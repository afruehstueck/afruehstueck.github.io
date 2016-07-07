precision highp float;

// The texture.
uniform sampler2D texture;

// Passed in from the vertex shader.
varying vec2 textureCoordinate;
void main() {
    gl_FragColor.rgb = texture2D( texture, textureCoordinate ).rgb;
    gl_FragColor.a = 1.;
}