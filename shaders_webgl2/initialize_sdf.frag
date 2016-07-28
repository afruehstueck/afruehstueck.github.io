#version 300 es
precision highp float;
precision highp int;

in vec2 textureCoordinate;
in vec2 pos;

out vec4 color;

uniform float layer;

uniform vec3 seedOrigin;
uniform float seedRadius;
uniform float numLayers;
/*
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
}*/

void main( void ) {

    //vec3 currentPosition = vec3( x, y, z );
    //vec3 currentPosition = tiledTextureCoordToVolumeCoord( textureCoordinate );
    float currentLayer = layer / numLayers + 0.5 / numLayers;
    vec3 currentPosition = vec3( textureCoordinate.x, textureCoordinate.y, currentLayer );

    float distanceToOrigin = distance( seedOrigin, currentPosition );
    //WATCH OUT, different from other example
    //distance in distance function is *positive* outside of seed and *negative* inside of seed (required this way by glsl-raytrace
    // todo normalize distance value by dividing through fbo resolution
    float distance = distanceToOrigin - seedRadius;

    //distance = distance / ( seedRadius * 2. );

    float clampDistance = clamp( distance, -1., 1. );
    //normalize distance value to [0, 1] range
    float normalizedDistance = ( clampDistance + 1. ) / 2.;

    color.r = normalizedDistance;
    color.g = normalizedDistance;
    color.b = normalizedDistance;

    //DEBUG: draws a nice circle around the seed region with unused green and blue values
    //gl_FragColor.rgb = vec3( normalizedDistance, ( abs( clampDistance ) < 0.01 ) ? 1. : 0., ( abs( clampDistance ) < 0.01 ) ? 1. : 0. );

    color.a = 1.;
}