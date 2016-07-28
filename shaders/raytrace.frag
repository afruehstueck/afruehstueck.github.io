precision highp float;

uniform vec2  resolution;
uniform vec2 tiles;
uniform vec3  volumeDimensions;
uniform vec3  seedOrigin;
uniform sampler2D distanceFieldTexture;
uniform sampler2D backfaceTexture;
uniform sampler2D frontfaceTexture;
uniform sampler2D volumeTexture;
uniform float seedRadius;

//#pragma glslify: raytrace = require( 'glsl-raytrace' , map = sampleVolumeSimple, MAX_STEPS = 150 )
//#pragma glslify: normal   = require( 'glsl-sdf-normal', map = doModel)
//#pragma glslify: noise    = require( 'glsl-noise/simplex/4d' )
//#pragma glslify: square   = require( 'glsl-square-frame' )
//#pragma glslify: smin     = require( 'glsl-smooth-min' )
//#pragma glslify: camera2   = require( 'glsl-camera-ray' )
//#pragma glslify: camera  = require( 'glsl-turntable-camera' )

//todo: make this uniform
//const vec2 tiles = vec2( 16., 16. );
const int MAX_STEPS = 125;

varying vec3 textureCoordinate;
varying vec3 worldSpaceCoordinate;
varying vec3 frontFaceCoordinate;
varying vec4 projectedCoordinate;

//sample volumetric data from tiled 2d texture - do trilinear filtering
vec4 sampleAs3DTexture( sampler2D volume, vec3 texCoord ) {
    if( texCoord.x < 0. || texCoord.x > 1. ||
        texCoord.y < 0. || texCoord.y > 1. ||
        texCoord.z < 0. || texCoord.z > 1. ) {
        return vec4( 0. );
    }

    float volumeDepth = tiles.x * tiles.y;
    float max_slice = volumeDepth;// - 1.0;
    vec2 slice1, slice2;

    //z coordinate determines which 2D tile we sample from
    //z slice number runs from 0 to 255.
    float slice1_z = floor( texCoord.z * max_slice );
    float slice2_z = clamp( slice1_z + 1., 0., max_slice );

    float dx1 = mod( slice1_z, tiles.x );
    //examples inverted y values (they are like this in the example volumes) - do we want this?
    //for inverted values do
    //float dy1 = floor( ( max_slice - slice1_z ) / tiles.x );
    //float dy1 = floor( slice1_z / tiles.x ); // same for dy2
    float dy1 = floor( slice1_z / tiles.x );
    //if( flip_y ) dy1 = tiles.y - 1. - dy1;

    float dx2 = mod( slice2_z, tiles.x );
    //float dy2 = floor( slice2_z / tiles.x );
    //float dy2 = floor( ( max_slice - slice2_z ) / tiles.x );
    float dy2 = floor( slice2_z / tiles.x );
    //if( flip_y ) dy2 = tiles.y - 1. - dy2;

    slice1.x = ( texCoord.x + dx1 ) / tiles.x;
    slice1.y = ( texCoord.y + dy1 ) / tiles.y;

    slice2.x = ( texCoord.x + dx2 ) / tiles.x;
    slice2.y = ( texCoord.y + dy2 ) / tiles.y;

    //bilinear filtering is done at each texture2D lookup by default
    vec4 color1 = texture2D( volume, slice1 );
    vec4 color2 = texture2D( volume, slice2 );
    //TODO: lookup transfer functions for colors (if relevant)

    float zDifference = mod( texCoord.z * max_slice, 1.0 );
    //interpolate between the two intermediate colors of each slice
    return mix( color1, color2, zDifference );
}

/*
vec2 computeSliceOffset(float slice, float slicesPerRow, vec2 sliceSize) {
  return sliceSize * vec2(mod(slice, slicesPerRow),
                          floor(slice / slicesPerRow));
}

vec4 sampleAs3DTexture( sampler2D tex, vec3 texCoord ) {
  float numRows = tiles.y;
  float slicesPerRow = tiles.x;
  float size = tiles.x * tiles.y;
  float slice   = texCoord.z * size;
  float sliceZ  = floor(slice);                         // slice we need
  float zOffset = fract(slice);                         // dist between slices

  vec2 sliceSize = vec2(1.0 / slicesPerRow,             // u space of 1 slice
                        1.0 / numRows);                 // v space of 1 slice

  vec2 slice0Offset = computeSliceOffset(sliceZ, slicesPerRow, sliceSize);
  vec2 slice1Offset = computeSliceOffset(sliceZ + 1.0, slicesPerRow, sliceSize);

  vec2 slicePixelSize = sliceSize / size;               // space of 1 pixel
  vec2 sliceInnerSize = slicePixelSize * (size - 1.0);  // space of size pixels

  vec2 uv = slicePixelSize * 0.5 + texCoord.xy * sliceInnerSize;
  vec4 slice0Color = texture2D(tex, slice0Offset + uv);
  vec4 slice1Color = texture2D(tex, slice1Offset + uv);
  return mix(slice0Color, slice1Color, zOffset);
}
*/

float getSDFSample( sampler2D volume, vec3 texCoord ) {
    return sampleAs3DTexture( volume, texCoord ).r * 2.0 - 1.0;
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

    vec3 color = ambient + material * diffuse * cosTheta/*/ ( distance * distance )*/;

    return color;
    //return ambient + material * lin;
}

vec3 calcNormal( vec3 pos ) {
  const float eps = 0.01;

  const vec3 v1 = vec3(  1.0, -1.0, -1.0 );
  const vec3 v2 = vec3( -1.0, -1.0,  1.0 );
  const vec3 v3 = vec3( -1.0,  1.0, -1.0 );
  const vec3 v4 = vec3(  1.0,  1.0,  1.0 );

  return normalize( v1 * getSDFSample( distanceFieldTexture, pos + v1 * eps ) +
                    v2 * getSDFSample( distanceFieldTexture, pos + v2 * eps ) +
                    v3 * getSDFSample( distanceFieldTexture, pos + v3 * eps ) +
                    v4 * getSDFSample( distanceFieldTexture, pos + v4 * eps ) );
}

vec4 rayAccumulate( vec3 rayStart, vec3 ray, int steps ) {
    float alphaCorrection = 0.2;
    vec4 accumulatedColor = vec4( 0.0 );
    float accumulatedAlpha = 0.0;
    float accumulatedLength = 0.0;

    float rayLength = length( ray );

    //vec3 deltaDirection = normalize ( ray ) / float( steps );
    vec3 deltaDirection = ray / float( steps );
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
        sdfSample = getSDFSample( distanceFieldTexture, position );
        if( sign( sdfSample ) != sign( prev ) ) {
            foundIsoSurface = true;
            break;
        }

        if( accumulatedAlpha < 1. ) {
            sampleColor = sampleAs3DTexture( volumeTexture, position );

            //todo: determine which value is sampled. currently .x because some data do not have alpha
            sampleValue = sampleColor.x;

            sampleAlpha = sampleValue * alphaCorrection;

            accumulatedColor += ( 1. - accumulatedAlpha ) * vec4( vec3( sampleValue ), 1. ) * sampleAlpha;
            accumulatedAlpha += sampleAlpha;
        }
        /*MIP // do not have tf, otherwise sample it
        src = vec4( acc.aaaa );
        if ( src.a >= dst.a )
            dst = src;
        */
        position += deltaDirection;
        accumulatedLength += deltaLength;

        if( /*accumulatedAlpha >= 1. || */accumulatedLength >= rayLength ) {
            break;
        }
    }

    if( foundIsoSurface ) {
        vec3 normal = sampleAs3DTexture( distanceFieldTexture, position ).bga;//calcNormal( position );
        accumulatedColor.xyz += normal * .5 + .5;
    }
    return accumulatedColor;
}


vec4 raySurface( vec3 rayStart, vec3 ray, int steps ) {
    float precis = 0.001;
    float rayLength = length( ray );
    vec3 direction = normalize ( ray );

    vec4 color = vec4( 0., 0., 0., 1. );

    vec3 position = rayStart;

    float distance = 0.;
    float sampleValue = getSDFSample( distanceFieldTexture, position );


    float prev = sampleValue;


    for ( int i = 0; i < MAX_STEPS; ++i ) {
        if( sign( sampleValue ) != sign( prev ) || abs( sampleValue ) < precis ||  distance >= rayLength ) {
            break;
        }
        distance += sampleValue * seedRadius;

        position = rayStart + distance * direction;
        prev = sampleValue;
        sampleValue = getSDFSample( distanceFieldTexture, position );

        /*if( abs( sampleValue ) < 0.05 ) {
            vec3 normal = calcNormal( position );
            vec3 material = doMaterial( position, normal );

            color.xyz = doLighting( position, normal, direction, material );

            //color.xyz = normal * .5 + .5;
            break;
        }*/
        //accumulatedLength += deltaLength;
    }

    if( distance <= rayLength ) {
        //position = rayStart + distance * direction;
        //vec3 normal = calcNormal( position );
        vec3 normal = sampleAs3DTexture( distanceFieldTexture, position ).bga;//calcNormal( position );
        //color.xyz += normal * .5 + .5;
        //color.a = 1.0;
        vec3 material = doMaterial( position, normal );

        color.xyz = doLighting( position, normal, material );
    }
    return color;
}

//////////////////////// BEGIN GLSL-RAYTRACE


float raytraceSDF( vec3 rayOrigin, vec3 rayDir, float maxd, float precis ) {
  float latest = precis * 2.0;
  float dist = +0.0;
  float res = -1.0;

  for ( int i = 0; i < MAX_STEPS; i++ ) {
    if ( latest < precis || dist > maxd ) break;

    vec3 pos = rayOrigin + rayDir * dist;

    latest = getSDFSample( distanceFieldTexture, pos );
    dist  += latest;
  }

  if ( dist < maxd ) {
    res = dist;
  }

  return res;
}

//////////////////////// END GLSL-RAYTRACE

/*
void main() {
  vec3 color = vec3( 0.0 );
  vec3 rayOrigin, rayDirection;

  float rotation = 0.0;//2.4;
  float height   = 0.0;
  float dist     = 5.0;

  orbitCamera( rotation, height, dist, resolution.xy, rayOrigin, rayDirection );

  vec2 t = raytraceSDF( rayOrigin, rayDirection, 20.0, 0.01 ); //find first ray intersection
  if ( t.x > -0.5 ) {
    vec3 pos = rayOrigin + t.x * rayDirection;
    vec3 nor = calcNormal( pos );
    vec3 mal = doMaterial( pos, nor );

    //color = doLighting( pos, nor, rayDirection, t.x, mal );
        color = nor * 0.5 + 0.5;
  }

  gl_FragColor.rgb = color;
  gl_FragColor.a   = 1.0;
}
*/

void main() {

    //gl_FragColor = vec4( 0.3, 0.4, 0.8, 1.0 );
    int steps = MAX_STEPS;

    vec2 tex = vec2( ( ( projectedCoordinate.x / projectedCoordinate.w ) + 1.0 ) / 2.0,
                       ( ( projectedCoordinate.y / projectedCoordinate.w ) + 1.0 ) / 2.0 );

    vec3 rayStart = texture2D( frontfaceTexture, tex ).xyz;
    //vec3 rayStart = worldSpaceCoordinate.xyz * 0.5 + 0.5;// frontFaceCoordinate;//texture2D( frontfaceTexture, texc ).xyz;
    vec3 rayEnd = texture2D( backfaceTexture, tex ).xyz;

    vec3 ray = rayEnd - rayStart;

    vec4 color = vec4( 0. );
    vec4 accumulatedColor = rayAccumulate( rayStart, ray, steps );
    //accumulatedColor.a = 1.0;
    /*vec4 SDFcolor = raySurface( rayStart, ray, steps );
    SDFcolor.a = 0.8;*/
    color = accumulatedColor;// + SDFcolor;

    //vec4 sampleColor = sampleAs3DTexture( volumeTexture, rayStart );
    //gl_FragColor  = vec4(sampleColor.xyz, 1.0);
    //gl_FragColor = vec4( texture2D( frontfaceTexture, gl_FragCoord.xy / vec2( resolution.x, resolution.y ) ).xyz, 1.0 );
    gl_FragColor = vec4( color.xyz, 1.0 );

   /* bool x_edge = abs( worldSpaceCoordinate.x ) > 0.9;
    bool y_edge = abs( worldSpaceCoordinate.y ) > 0.9;
    bool z_edge = abs( worldSpaceCoordinate.z ) > 0.9;

    if( ( x_edge && y_edge ) || ( x_edge && z_edge ) || ( y_edge && z_edge ) )
       gl_FragColor = vec4( x_edge ? 1.0 : 0.0, y_edge ? 1.0 : 0.0, z_edge ? 1.0 : 0.0, 1.0 );*/
}