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
uniform sampler3D distanceFieldTexture;
uniform vec3 volumeDimensions;
uniform vec2 dataRange;
uniform int samplingRate;
uniform float alphaCorrection;

const int MAX_STEPS = 1000;

vec3 doMaterial(/* vec3 position, vec3 normal */) {
  return vec3( 0.2, 0.768, 1.0 );
}

vec3 doLighting( vec3 position, vec3 normal, vec3 material ) {
    vec3 ambient = vec3( 0.4 );

    vec3 diffuse = vec3( 0.2 );

    vec3 light = normalize( vec3( -5, -8, 15 ) );

    float cosTheta = clamp( dot( normal, light ), 0., 1. );

    diffuse += cosTheta * vec3( 0.5 );
    diffuse += vec3( 0.05 );

    return ambient + material * diffuse * cosTheta;//* ( distance * distance );
}

float textureWithOffset( sampler3D volume, vec3 texCoord, vec3 offset ) {
    vec3 offsetCoord = texCoord + ( offset / volumeDimensions );
    return texture( distanceFieldTexture, offsetCoord ).r;
}

vec3 calcNormal( sampler3D volume, vec3 pos ) {
  const vec3 offset1 =  5. * vec3(  1., -1., -1. );
  const vec3 offset2 =  5. * vec3( -1., -1.,  1. );
  const vec3 offset3 =  5. * vec3( -1.,  1., -1. );
  const vec3 offset4 =  5. * vec3(  1.,  1.,  1. );

  return normalize( offset1 * textureWithOffset( distanceFieldTexture, pos, offset1 ) +
                    offset2 * textureWithOffset( distanceFieldTexture, pos, offset2 ) +
                    offset3 * textureWithOffset( distanceFieldTexture, pos, offset3 ) +
                    offset4 * textureWithOffset( distanceFieldTexture, pos, offset4 ) );
}

vec3 norm( sampler3D volume, vec3 pos ) {
    vec3 normal = vec3( 0. );

    float value = texture( volume, pos ).r;
    normal.x    = texture( volume, vec3( pos.x + 2. / volumeDimensions.x, pos.y, pos.z ) ).r - value;
    normal.y    = texture( volume, vec3( pos.x, pos.y + 2. / volumeDimensions.y, pos.z ) ).r - value;
    normal.z    = texture( volume, vec3( pos.x, pos.y, pos.z + 2. / volumeDimensions.z ) ).r - value;
    return normalize( normal );
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

        if( sdfSample >= 0./*sign( sdfSample ) != sign( prev ) */) {
            //found isosurface, stop raycasting
            foundSurface = true;
            break;
        }

        if( accumulatedAlpha < 1. ) {
            //if( position.x > 1. || position.y > 1. || position.z > 1. ) break;
            //if( position.x < 0. || position.y < 0. || position.z < 0. ) break;
            sampleColor = texture( volumeTexture, position );

            //sampleValue = dot( sampleColor, mask[ channel ] );
            sampleValue = sampleColor.x;

            float min = dataRange.x;
            float max = dataRange.y;
            //normalize sampleValue to [0, 1] range
            sampleValue = ( sampleValue - min ) / ( max - min );

            sampleAlpha = sampleValue * alphaCorrection;

            vec4 transferLookupColor = texture( transferTexture, vec2( sampleValue, 0.5 ) ).rgba;
            float alpha = transferLookupColor.a * alphaCorrection;

            accumulatedColor += ( 1. - accumulatedAlpha ) * transferLookupColor.rgb * alpha;

            accumulatedAlpha += alpha;
        }

        position += deltaDirection;
        accumulatedLength += deltaLength;

        if( /*accumulatedAlpha >= 1. || */accumulatedLength >= rayLength ) {
            //ray is outside of box
            break;
        }
    }

    if( foundSurface ) {
         vec3 normal = norm( distanceFieldTexture, position );
         //vec3 normal = texture( distanceFieldTexture, position ).gba;//calcNormal( distanceFieldTexture, position );
         //vec3 lighting = doLighting( position, normal, doMaterial() );
         accumulatedColor += normal * .5 + .5;
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

    color = backgroundColor + accumulatedColor;//vec4( accumulatedColor.xyz, 1.0 );//
}