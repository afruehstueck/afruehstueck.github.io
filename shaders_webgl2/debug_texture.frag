#version 300 es
precision highp float;
precision highp sampler2D;
precision highp sampler3D;
precision highp int;

// The texture.
uniform sampler2D tex;

out vec4 color;

// Passed in from the vertex shader.
in vec2 textureCoordinate;
uniform float layer;
uniform vec2 tiles;

//const vec2 tiles = vec2( 16., 16. );


vec4 sampleAs3DTexture( sampler2D volume, vec2 texCoord ) {

    vec2 slice;
    float layer = 100.;
    float dx = mod( layer, tiles.x );
    float dy = floor( layer / tiles.x );

    slice.x = ( texCoord.x + dx ) / tiles.x;
    slice.y = ( texCoord.y + dy ) / tiles.y;

    return texture( volume, slice );
}

void main() {
    /*gl_FragColor.r = clamp( texture2D( texture, textureCoordinate ).r * 2.0 - 1.0, 0., 1.);
    gl_FragColor.g = clamp(- ( texture2D( texture, textureCoordinate ).r * 2.0 - 1.0 ), 0., 1.);

    if(texture2D( texture, textureCoordinate ).r == 0. || texture2D( texture, textureCoordinate ).r == 1. ) gl_FragColor.b = 1.;
    //gl_FragColor.rgb = vec3( texture2D( texture, textureCoordinate ).a );
    gl_FragColor.a = 1.;*/

    float value = texture( tex, textureCoordinate ).r;
    color = vec4( vec3( ( value + 1. ) / 2. ), 1. );
    //color = sampleAs3DTexture( tex, textureCoordinate );
}