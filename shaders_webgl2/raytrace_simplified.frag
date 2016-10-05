#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp sampler3D;

in vec3 textureCoordinate;
in vec3 worldSpaceCoordinate;
in vec3 frontFaceCoordinate;
in vec4 projectedCoordinate;

out vec4 color;

uniform sampler2D backfaceTexture;
uniform sampler2D transferTexture;
uniform sampler3D volumeTexture;
uniform vec2 dataRange;
uniform int samplingRate;
uniform float alphaCorrection;

//todo: make this uniform
const int MAX_STEPS = 1000;

vec4 rayAccumulate( vec3 rayStart, vec3 ray, int steps ) {
    vec3 accumulatedColor = vec3( 0.0 );
    float accumulatedAlpha = 0.0;
    float accumulatedLength = 0.0;

    float rayLength = length( ray );
    if( rayLength == 0. ) return vec4( 0. );

    vec3 deltaDirection = normalize ( ray ) / float( steps );
    float deltaLength = length ( deltaDirection );

    vec3 position = rayStart;
    vec4 sampleColor = vec4( 0. );
    float sampleValue = sampleColor.x;
    float sampleAlpha = 0.;

    for ( int i = 0; i < MAX_STEPS; ++i ) {
        if( accumulatedAlpha < 1. ) {
            sampleColor = texture( volumeTexture, position );

            float min = dataRange.x;
            float max = dataRange.y;
            //normalize sampleValue to [0, 1] range
            sampleValue = ( sampleColor.x - min ) / ( max - min );

            sampleAlpha = sampleValue * alphaCorrection;

            vec4 transferLookupColor = texture( transferTexture, vec2( sampleValue, 0.5 ) ).rgba;
            float alpha = transferLookupColor.a * alphaCorrection;

            accumulatedColor += ( 1. - accumulatedAlpha ) * transferLookupColor.rgb * alpha;

            accumulatedAlpha += alpha;
        }

        position += deltaDirection;
        accumulatedLength += deltaLength;

        if( accumulatedAlpha >= 1. || accumulatedLength >= rayLength ) {
            //ray is outside of box
            break;
        }
    }

    clamp( accumulatedColor, 0., 1. );
    clamp( accumulatedAlpha, 0., 1. );
    return vec4( accumulatedColor, accumulatedAlpha );
}

void main() {
    vec2 tex = vec2( ( ( projectedCoordinate.x / projectedCoordinate.w ) + 1.0 ) / 2.0,
                       ( ( projectedCoordinate.y / projectedCoordinate.w ) + 1.0 ) / 2.0 );

    vec3 rayStart = worldSpaceCoordinate.xyz * 0.5 + 0.5; //front face of box
    vec3 rayEnd = texture( backfaceTexture, tex ).xyz;

    vec3 ray = rayEnd - rayStart;

    vec4 accumulatedColor = rayAccumulate( rayStart, ray, samplingRate );

    vec4 backgroundColor = vec4( 0., 0., 0., 1. );

    color = backgroundColor + accumulatedColor;
}