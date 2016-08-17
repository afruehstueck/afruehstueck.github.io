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

const float factor = 2.;
const float MAX_FACTOR = 8.;

/*vec4 sampleAs3DTexture( sampler2D volume, vec2 texCoord ) {

    vec2 slice;
    float sliceSample;

    float sampleValue = 0.;
    for( float index = 0.; index < MAX_FACTOR; index++ ) {
        //values[ index ] = 0.;
        if( index > factor ) continue;
        float dx = mod( layer * factor + index, tiles.x );
        float dy = floor( ( layer * factor + index ) / tiles.x );

        slice.x = ( texCoord.x + dx ) / tiles.x;
        slice.y = ( texCoord.y + dy ) / tiles.y;

        sliceSample = texture( volume, slice ).r;
        sampleValue += sliceSample;
    }

    sampleValue /= factor;
    return vec4( sampleValue );
   *//* float dx = mod( layer * 2., tiles.x );
    float dy = floor( layer * 2. / tiles.x );

    slice.x = ( texCoord.x + dx ) / tiles.x;
    slice.y = ( texCoord.y + dy ) / tiles.y;

    return texture( volume, slice );*//*
}*/

//sample volumetric data from tiled 2d texture
vec4 sampleAs3DTexture( sampler2D volume, vec2 texCoord ) {

    vec2 slice;

    float dx = mod( layer * 1., tiles.x );
    float dy = floor( layer * 1. / tiles.x );

    slice.x = ( texCoord.x + dx ) / tiles.x;
    slice.y = ( texCoord.y + dy ) / tiles.y;

    return texture( volume, slice );
}


void main( void ) {
    color = sampleAs3DTexture( tiledTexture, textureCoordinate );
}
