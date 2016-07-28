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
uniform sampler2D frontfaceTexture;

uniform sampler3D volumeTexture;
uniform sampler3D distanceFieldTexture;

//todo: make this uniform
const int MAX_STEPS = 500;
const float alphaCorrection = 0.2;

float textureSDF( sampler3D volume, vec3 texCoord ) {
    return texture( volume, texCoord ).r * 2.0 - 1.0;
}

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

vec3 calcNormal( vec3 pos ) {
  const float eps = 0.001;

  const vec3 v1 = vec3(  1.0, -1.0, -1.0 );
  const vec3 v2 = vec3( -1.0, -1.0,  1.0 );
  const vec3 v3 = vec3( -1.0,  1.0, -1.0 );
  const vec3 v4 = vec3(  1.0,  1.0,  1.0 );

  return normalize( v1 * textureSDF( distanceFieldTexture, pos + v1 * eps ) +
                    v2 * textureSDF( distanceFieldTexture, pos + v2 * eps ) +
                    v3 * textureSDF( distanceFieldTexture, pos + v3 * eps ) +
                    v4 * textureSDF( distanceFieldTexture, pos + v4 * eps ) );
}

vec4 rayAccumulate( vec3 rayStart, vec3 ray, int steps, bool renderDistanceField ) {
    vec3 accumulatedColor = vec3( 0.0 );
    float accumulatedAlpha = 0.0;
    float accumulatedLength = 0.0;

    float rayLength = length( ray );

    vec3 deltaDirection = normalize ( ray ) / float( steps );
    float deltaLength = length ( deltaDirection );

    vec3 position = rayStart;
    vec4 sampleColor = vec4( 0. );
    float sampleValue = sampleColor.x;
    float sampleAlpha = 0.;

    bool foundIsoSurface = false;
    float sdfSample = 1.;
    float prev = 1.;

    for ( int i = 0; i < MAX_STEPS; ++i ) {

        prev = sdfSample;
        sdfSample = texture( distanceFieldTexture, position ).r * 2.0 - 1.0;
        if( sign( sdfSample ) != sign( prev ) ) {
            foundIsoSurface = true;
            break;
        }

        if( accumulatedAlpha < 1. ) {
            sampleColor = texture( volumeTexture, position );

            //todo: determine which value is sampled. currently .x because some data do not have alpha
            sampleValue = sampleColor.x;

            sampleAlpha = sampleValue * alphaCorrection;

            accumulatedColor += ( 1. - accumulatedAlpha ) * vec3( sampleValue ) * sampleAlpha;
            accumulatedAlpha += sampleAlpha;
        }

        position += deltaDirection;
        accumulatedLength += deltaLength;

        if( /*accumulatedAlpha >= 1. ||*/ accumulatedLength >= rayLength ) {
            break;
        }
    }

    if( foundIsoSurface ) {
        vec3 normal = texture( distanceFieldTexture, position ).bga;//
        //vec3 normal = calcNormal( position );
        accumulatedColor.xyz += normal * .5 + .5;
        //accumulatedColor.xyz += vec3( .5, 0., 0. );
    }
    return vec4( accumulatedColor, accumulatedAlpha );
}


void main() {
    int steps = 100;

    vec2 tex = vec2( ( ( projectedCoordinate.x / projectedCoordinate.w ) + 1.0 ) / 2.0,
                       ( ( projectedCoordinate.y / projectedCoordinate.w ) + 1.0 ) / 2.0 );

    vec3 rayStart = texture( frontfaceTexture, tex ).xyz;
    vec3 rayEnd = texture( backfaceTexture, tex ).xyz;

    vec3 ray = rayEnd - rayStart;

    vec4 accumulatedColor = rayAccumulate( rayStart, ray, steps, true );

    color = vec4( accumulatedColor.xyz, 1.0 );
}