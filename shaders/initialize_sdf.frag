precision highp float;

//uniform sampler2D sdfBuffer;

uniform vec3 seedOrigin;
uniform float seedRadius;
uniform vec2 tiles;

varying vec2 textureCoordinate;
varying vec2 pos;


vec3 tiledTextureCoordToVolumeCoord( vec2 textureCoordinate ) {
    //scale textureCoordinate from [ 0, 1 ] to [ 0, tiles{x,y} ]
    float tx = textureCoordinate.x * tiles.x;
    float ty = textureCoordinate.y * tiles.y;

    float dx = floor( tx );
    float dy = floor( ty );

    vec3 coord;

    coord.x = fract( tx );
    coord.y = fract( ty );

    //z-arrangement is inverted to adhere to file format. maybe change this!
    coord.z = ( dy * tiles.x + dx ) / ( tiles.x * tiles.y );
    //coord.z = ( ( tiles.y - dy ) * tiles.x + dx ) / ( tiles.x * tiles.y );

    return coord;
}

void main( void ) {

    //vec3 currentPosition = vec3( x, y, z );
    vec3 currentPosition = tiledTextureCoordToVolumeCoord( textureCoordinate );

    float distanceToOrigin = distance( seedOrigin, currentPosition );
    //WATCH OUT, different from other example
    //distance in distance function is *positive* outside of seed and *negative* inside of seed (required this way by glsl-raytrace
    // normalize distance value by dividing through fbo resolution
    float distance = distanceToOrigin - seedRadius;

    float clampDistance = clamp( distance, -1., 1. );
    //normalize distance value to [0, 1] range
    float normalizedDistance = ( clampDistance + 1. ) / 2.;

    gl_FragColor.r = normalizedDistance;
    gl_FragColor.g = 0.;
    gl_FragColor.b = 0.;

    //DEBUG: draws a nice circle around the seed region with unused green and blue values
    //gl_FragColor.rgb = vec3( normalizedDistance, ( abs( clampDistance ) < 0.01 ) ? 1. : 0., ( abs( clampDistance ) < 0.01 ) ? 1. : 0. );

    gl_FragColor.a = 0.;
}
