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

const float MAX_DOWNSAMPLE = 8.;
uniform vec3 volumeDimensions;
uniform vec3 datasetDimensions;

//sample volumetric data from tiled 2d texture
vec4 sampleAs3DTexture( sampler2D volume, vec2 texCoord ) {

    vec2 slice;

    vec3 downsample = datasetDimensions / volumeDimensions; //e.g. { 1., 1., 2. }
    float x_step = 1. / datasetDimensions.x;
    float y_step = 1. / datasetDimensions.y;

    float accumulate = 0.;
    for( float z_offset = 0.; z_offset < MAX_DOWNSAMPLE; z_offset++ ) {
        if( z_offset >= downsample.z ) break;

        float currentLayer = ( layer * downsample.z ) + z_offset;
        clamp( currentLayer, 0., datasetDimensions.z );

        float dx = mod( currentLayer, tiles.x );
        float dy = floor( currentLayer / tiles.x );

        for( float y_offset = 0.; y_offset < MAX_DOWNSAMPLE; y_offset++ ) {
                if( y_offset >= downsample.y ) break;

                for( float x_offset = 0.; x_offset < MAX_DOWNSAMPLE; x_offset++ ) {
                        if( x_offset >= downsample.x ) break;

                        vec2 currentCoord = texCoord + vec2( x_offset * x_step, y_offset * y_step );
                        clamp( currentCoord, 0., 1. );

                        slice.x = ( currentCoord.x + dx ) / tiles.x;
                        slice.y = ( currentCoord.y + dy ) / tiles.y;

                        //return texture( volume, slice );
                        accumulate += texture( volume, slice ).r;
                }
        }
    }

    return vec4( accumulate /= ( downsample.x * downsample.y * downsample.z ) );
}

void main( void ) {
    color = sampleAs3DTexture( tiledTexture, textureCoordinate );
}
