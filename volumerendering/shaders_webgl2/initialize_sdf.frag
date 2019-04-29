#version 300 es
precision highp float;
precision highp int;

in vec2 textureCoordinate;
in vec2 pos;

out vec4 color;

uniform float layer;

uniform vec3 volumeDimensions;
uniform vec3 seedOrigin;
uniform float seedRadius;
uniform float numLayers;


float sdSphere( vec3 pos, vec3 origin, float radius ) {
    float distanceToOrigin = distance( origin, pos );
    return radius - distanceToOrigin;
}

float sdTorus( vec3 pos, vec2 t ) {
  vec2 q = vec2( length( pos.xz ) - t.x, pos.y );
  return length( q ) - t.y;
}

vec3 calcNormal( vec3 pos, vec3 origin, float radius ) {
  const vec3 offset1 = vec3(  1., -1., -1. );
  const vec3 offset2 = vec3( -1., -1.,  1. );
  const vec3 offset3 = vec3( -1.,  1., -1. );
  const vec3 offset4 = vec3(  1.,  1.,  1. );

  return normalize( offset1 * sdSphere( pos + offset1, origin, radius ) +
                    offset2 * sdSphere( pos + offset2, origin, radius ) +
                    offset3 * sdSphere( pos + offset3, origin, radius ) +
                    offset4 * sdSphere( pos + offset4, origin, radius ) );
}

void main( void ) {

    //vec3 currentPosition = vec3( x, y, z );
    //vec3 currentPosition = tiledTextureCoordToVolumeCoord( textureCoordinate );
    float currentLayer = layer / numLayers + 0.5 / numLayers;
    vec3 currentPosition = vec3( textureCoordinate.x, textureCoordinate.y, currentLayer );

    vec3 voxelPosition = currentPosition * volumeDimensions;
    vec3 voxelSeedOrigin = seedOrigin * volumeDimensions;
    float voxelLength = length ( voxelPosition - voxelSeedOrigin );
    float distance = sdSphere( currentPosition, seedOrigin, seedRadius ); //in [0, 1]
    //distance *= voxelLength; //in [0, volumeDimension.n]
    //distance *= 1000.; //in [0, volumeDimension.n]

    color.r = distance;
    color.gba = calcNormal( voxelPosition, voxelSeedOrigin, seedRadius );

    //DEBUG: draws a nice circle around the seed region with unused green and blue values
    //gl_FragColor.rgb = vec3( normalizedDistance, ( abs( clampDistance ) < 0.01 ) ? 1. : 0., ( abs( clampDistance ) < 0.01 ) ? 1. : 0. );
}