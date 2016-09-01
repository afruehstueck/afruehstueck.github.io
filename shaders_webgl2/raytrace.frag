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
uniform sampler3D volumeTexture;
uniform sampler3D distanceFieldTexture;
uniform vec3 volumeDimensions;
uniform vec2 dataRange;

uniform int channel;

//todo: make this uniform
const int MAX_STEPS = 500;
const float alphaCorrection = 0.15;

vec4 mask[ 4 ] = vec4[ 4 ] (
    vec4( 1., 0., 0., 0. ),
    vec4( 0., 1., 0., 0. ),
    vec4( 0., 0., 1., 0. ),
    vec4( 0., 0., 0., 1. )
);

vec3 doMaterial( vec3 position, vec3 normal ) {
  return vec3( 0.2, 0.768, 1.0 ) * 0.7;
}

vec3 doLighting( vec3 position, vec3 normal, vec3 material ) {
    vec3 ambient = vec3( 0.1, 0.1, 0.1 );

    vec3 diffuse = vec3( 0.0 );

    vec3 light = normalize( vec3( -.8, .8, 1.5 ) );

    float cosTheta = clamp( dot( normal, light ), 0., 1. );

    diffuse += cosTheta * vec3( 2. );
    diffuse += vec3( 0.05 );

    return ambient + material * diffuse * cosTheta;//* ( distance * distance );
}

float textureWithOffset( sampler3D volume, vec3 texCoord, vec3 offset ) {
    vec3 offsetCoord = texCoord + offset / volumeDimensions;
    return texture( distanceFieldTexture, offsetCoord ).r;// * 2.0 - 1.0;
}

vec3 calcNormal( sampler3D volume, vec3 pos ) {
  const vec3 offset1 = vec3(  1., -1., -1. );
  const vec3 offset2 = vec3( -1., -1.,  1. );
  const vec3 offset3 = vec3( -1.,  1., -1. );
  const vec3 offset4 = vec3(  1.,  1.,  1. );

  return normalize( offset1 * textureWithOffset( distanceFieldTexture, pos, offset1 ) +
                    offset2 * textureWithOffset( distanceFieldTexture, pos, offset2 ) +
                    offset3 * textureWithOffset( distanceFieldTexture, pos, offset3 ) +
                    offset4 * textureWithOffset( distanceFieldTexture, pos, offset4 ) );
}

//returns -1.0 if x < 0, and 1.0 if x >= 0
float signGreaterEqualZero( float x )
{
    return step( 0., x ) * 2. - 1.;
}

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

    float sdfSample = texture( distanceFieldTexture, position ).r;
    float prev = 0.;
    bool foundSurface = false;

    for ( int i = 0; i < MAX_STEPS; ++i ) {
        prev = sdfSample;

        //do trilinear sampling (leave in this comment for trilinear polyfill)
        float sdfSample = texture( distanceFieldTexture, position ).r;

        if( sdfSample >= 0. /*sign( sdfSample ) != sign( prev )*/ ) {
            //found isosurface, stop raycasting
            foundSurface = true;
            break;
        }

        if( accumulatedAlpha < 1. ) {
            sampleColor = texture( volumeTexture, position );

            //todo: determine which value is sampled. currently .x because some data do not have alpha
            sampleValue = dot( sampleColor, mask[ channel ] );// < 0.6 ? sampleColor.x : 0.0;


            //clamp( sampleValue, 0., 1. );
            float min = dataRange.x;
            float max = dataRange.y;
            sampleValue = ( sampleValue - min ) / ( max - min );
            //sampleValue /= 255.;
            sampleAlpha = sampleValue * alphaCorrection;

            accumulatedColor += ( 1. - accumulatedAlpha ) * vec3( sampleValue ) * sampleAlpha;

            /*if( sampleValue > .01 && sampleValue < .5 ) accumulatedColor.r += 1.;
            if( sampleValue >= .5 && sampleValue < .8 ) accumulatedColor.g += 1.;
            if( sampleValue >= .8 ) accumulatedColor.b += 1.;*/
            accumulatedAlpha += sampleAlpha;
        }

        position += deltaDirection;
        accumulatedLength += deltaLength;

        if( /*accumulatedAlpha >= 1. ||*/ accumulatedLength >= rayLength ) {
            //ray is outside of box
            break;
        }
    }

    if( foundSurface ) {
         vec3 normal = texture( distanceFieldTexture, position ).gba;//calcNormal( distanceFieldTexture, position );
         accumulatedColor.xyz += normal * .5 + .5;
    }
    return vec4( accumulatedColor, accumulatedAlpha );
}

void main() {
    int steps = 150;

    vec2 tex = vec2( ( ( projectedCoordinate.x / projectedCoordinate.w ) + 1.0 ) / 2.0,
                       ( ( projectedCoordinate.y / projectedCoordinate.w ) + 1.0 ) / 2.0 );

    vec3 rayStart = worldSpaceCoordinate.xyz * 0.5 + 0.5; //front face of box
    vec3 rayEnd = texture( backfaceTexture, tex ).xyz;

    vec3 ray = rayEnd - rayStart;

    vec4 accumulatedColor = rayAccumulate( rayStart, ray, steps );

    color = vec4( accumulatedColor.xyz, 1.0 );
}