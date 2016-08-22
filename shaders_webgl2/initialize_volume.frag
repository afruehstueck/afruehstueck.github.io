#version 300 es
precision highp float;
precision highp sampler2D;
precision highp int;

in vec2 pos;
in vec2 textureCoordinate;

out vec4 color;

uniform sampler2D tiledTexture;

uniform vec2 tiles;
uniform float layer;

//const float factor = 2.;
const float MAX_DOWNSAMPLE = 4.;
//uniform vec3 downsample;
uniform vec3 volumeDimensions;
uniform vec3 datasetDimensions;

//sample volumetric data from tiled 2d texture
vec4 sampleAs3DTexture( sampler2D volume, vec2 texCoord ) {

    vec2 slice;

    vec3 downsample = datasetDimensions / volumeDimensions;

    //vec3 multiplier = downsample;

    vec4 accumulate = vec4( 0. );
    for( float z_offset = 0.; z_offset < MAX_DOWNSAMPLE; z_offset++ ) {
        if( z_offset >= downsample.z ) break;

        float currentLayer = ( layer * downsample.z ) + z_offset;

        float dx = mod( currentLayer, tiles.x );
        float dy = floor( currentLayer / tiles.x );

        for( float y_offset = 0.; y_offset < MAX_DOWNSAMPLE; y_offset++ ) {
                if( y_offset >= downsample.y ) break;

                for( float x_offset = 0.; x_offset < MAX_DOWNSAMPLE; x_offset++ ) {
                        if( x_offset >= downsample.x ) break;

                        slice.x = ( texCoord.x + ( x_offset / volumeDimensions.x ) + dx ) / tiles.x;
                        slice.y = ( texCoord.y + ( y_offset / volumeDimensions.y ) + + dy ) / tiles.y;

                        //return texture( volume, slice );
                        accumulate += texture( volume, slice );
                }
        }
    }

    return accumulate /= ( downsample.x * downsample.y * downsample.z );
}

void main( void ) {
    color = sampleAs3DTexture( tiledTexture, textureCoordinate );
}
