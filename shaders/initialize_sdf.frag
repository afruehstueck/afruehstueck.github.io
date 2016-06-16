precision highp float;

//uniform sampler2D sdfBuffer;

uniform vec3 seedOrigin;
uniform float seedRadius;
uniform vec2 volumeDimensions;
uniform vec2 sliceLayout;

varying vec2 textureCoordinate;

void main( void ) {
    float volumeWidth = volumeDimensions.x; //* sliceLayout.x;
    float volumeHeight = volumeDimensions.y;// * sliceLayout.y;

    float imageWidth = volumeDimensions.x * sliceLayout.x;
    float imageHeight = volumeDimensions.y * sliceLayout.y;

    float tx = textureCoordinate.x * imageWidth;
    float ty = textureCoordinate.y * imageHeight;

    float x = mod( tx, volumeWidth );
    float y = mod( ty, volumeHeight );
    float tile_x = ( tx - x ) / volumeWidth;
    float tile_y = ( ty - y ) / volumeHeight;

    //normalize to [ 0, 1 ] range
    x /= volumeWidth;
    y /= volumeHeight;
    float z = ( tile_y * sliceLayout.x + tile_x ) / ( sliceLayout.x * sliceLayout.y );

    vec3 currentPosition = vec3( x, y, z );
    /*float len_x = seedOrigin.x - x;
    float len_y = seedOrigin.y - y;
    float len_z = seedOrigin.z - z;

    float distanceToOrigin = sqrt( len_x * len_x + len_y * len_y + len_z * len_z );
*/
    float distanceToOrigin = distance( seedOrigin, currentPosition );
    //WATCH OUT, different from other example
    //distance in distance function is positive outside of seed and negative inside of seed (required this way by glsl-raytrace
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

    gl_FragColor.a = 1.;
}