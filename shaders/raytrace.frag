precision highp float;

uniform vec2  resolution;
uniform vec3  volumeDimensions;
uniform vec3  seedOrigin;
uniform float iGlobalTime;
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

const float numSlices = 256.0;
//todo: make this uniform
const vec2 tiles = vec2( 16., 16. );
const int MAX_STEPS = 150;

varying vec3 textureCoordinate;
varying vec4 projectedCoordinate;

//////////////////////// BEGIN NOISE

vec4 mod289_1_1(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0; }

float mod289_1_1(float x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0; }

vec4 permute_1_2(vec4 x) {
     return mod289_1_1(((x*34.0)+1.0)*x);
}

float permute_1_2(float x) {
     return mod289_1_1(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt_1_3(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float taylorInvSqrt_1_3(float r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec4 grad4_1_4(float j, vec4 ip)
  {
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p,s;

  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;

  return p;
  }

// (sqrt(5) - 1)/4 = F4, used once below
#define F4 0.309016994374947451

float noise(vec4 v)
  {
  const vec4  C = vec4( 0.138196601125011,  // (5 - sqrt(5))/20  G4
                        0.276393202250021,  // 2 * G4
                        0.414589803375032,  // 3 * G4
                       -0.447213595499958); // -1 + 4 * G4

// First corner
  vec4 i  = floor(v + dot(v, vec4(F4)) );
  vec4 x0 = v -   i + dot(i, C.xxxx);

// Other corners

// Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
  vec4 i0;
  vec3 isX = step( x0.yzw, x0.xxx );
  vec3 isYZ = step( x0.zww, x0.yyz );
//  i0.x = dot( isX, vec3( 1.0 ) );
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;
//  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;
  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;

  // i0 now contains the unique values 0,1,2,3 in each channel
  vec4 i3 = clamp( i0, 0.0, 1.0 );
  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

  //  x0 = x0 - 0.0 + 0.0 * C.xxxx
  //  x1 = x0 - i1  + 1.0 * C.xxxx
  //  x2 = x0 - i2  + 2.0 * C.xxxx
  //  x3 = x0 - i3  + 3.0 * C.xxxx
  //  x4 = x0 - 1.0 + 4.0 * C.xxxx
  vec4 x1 = x0 - i1 + C.xxxx;
  vec4 x2 = x0 - i2 + C.yyyy;
  vec4 x3 = x0 - i3 + C.zzzz;
  vec4 x4 = x0 + C.wwww;

// Permutations
  i = mod289_1_1(i);
  float j0 = permute_1_2( permute_1_2( permute_1_2( permute_1_2(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute_1_2( permute_1_2( permute_1_2( permute_1_2 (
             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));

// Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope
// 7*7*6 = 294, which is close to the ring size 17*17 = 289.
  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

  vec4 p0_1_6 = grad4_1_4(j0,   ip);
  vec4 p1 = grad4_1_4(j1.x, ip);
  vec4 p2 = grad4_1_4(j1.y, ip);
  vec4 p3 = grad4_1_4(j1.z, ip);
  vec4 p4 = grad4_1_4(j1.w, ip);

// Normalise gradients
  vec4 norm = taylorInvSqrt_1_3(vec4(dot(p0_1_6,p0_1_6), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0_1_6 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= taylorInvSqrt_1_3(dot(p4,p4));

// Mix contributions from the five corners
  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
  m0 = m0 * m0;
  m1 = m1 * m1;
  return 49.0 * ( dot(m0*m0, vec3( dot( p0_1_6, x0 ), dot( p1, x1 ), dot( p2, x2 )))
               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;

  }
//////////////////////// END NOISE

//sample volumetric data from tiled 2d texture - do trilinear filtering
vec4 sampleAs3DTexture( sampler2D volume, vec3 texCoord, bool flip_y ) {
    if( texCoord.x < 0. || texCoord.x > 1. ||
        texCoord.y < 0. || texCoord.y > 1. ||
        texCoord.z < 0. || texCoord.z > 1. ) {
        return vec4( 0. );
    }

    float volumeDepth = tiles.x * tiles.y;
    float max_slice = volumeDepth - 1.0;
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
    if( flip_y ) dy1 = tiles.y - 1. - dy1;

    float dx2 = mod( slice2_z, tiles.x );
    //float dy2 = floor( slice2_z / tiles.x );
    //float dy2 = floor( ( max_slice - slice2_z ) / tiles.x );
    float dy2 = floor( slice2_z / tiles.x );
    if( flip_y ) dy2 = tiles.y - 1. - dy2;

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

vec4 sampleAs3DTexture( sampler2D volume, vec3 texCoord ) {
    return sampleAs3DTexture( volume, texCoord, false );
}

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

    vec3 deltaDirection = normalize ( ray ) / float( steps );
    float deltaLength = length ( deltaDirection );

    vec3 position = rayStart;

    for ( int i = 0; i < MAX_STEPS; ++i ) {
        vec4 sampleColor = sampleAs3DTexture( volumeTexture, position );

        //todo: determine which value is sampled. currently .x because some data do not have alpha
        float sampleValue = sampleColor.x;

        float sampleAlpha = sampleValue * alphaCorrection;

        accumulatedColor += ( 1. - accumulatedAlpha ) * vec4( vec3( sampleValue ), 1. ) * sampleAlpha;
        accumulatedAlpha += sampleAlpha;

        /*MIP // do not have tf, otherwise sample it
        src = vec4( acc.aaaa );
        if ( src.a >= dst.a )
            dst = src;
        */
        position += deltaDirection;
        accumulatedLength += deltaLength;

        if( accumulatedLength >= rayLength || accumulatedAlpha >= 1. ) {
            break;
        }
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
        color.xyz = normal * .5 + .5;

        //vec3 material = doMaterial( position, normal );

        //color.xyz = doLighting( position, normal, material );
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
    int steps = MAX_STEPS;

    vec2 texc = vec2( ( ( projectedCoordinate.x / projectedCoordinate.w ) + 1.0 ) / 2.0,
                       ( ( projectedCoordinate.y / projectedCoordinate.w ) + 1.0 ) / 2.0 );

    vec3 rayStart = texture2D( frontfaceTexture, texc ).xyz;
    vec3 rayEnd = texture2D( backfaceTexture, texc ).xyz;

    vec3 ray = rayEnd - rayStart;
    vec3 rayDirection = normalize ( ray );

    vec4 color = vec4( 0. );
    vec4 accumulatedColor = rayAccumulate( rayStart, ray, steps );
    accumulatedColor.a = 1.0;
    vec4 SDFcolor = raySurface( rayStart, ray, steps );
    SDFcolor.a = 0.8;
    color = accumulatedColor + SDFcolor;

    //vec4 sampleColor = sampleAs3DTexture( volumeTexture, rayStart );
    //gl_FragColor  = vec4(sampleColor.xyz, 1.0);
    //gl_FragColor = vec4( texture2D( frontfaceTexture, gl_FragCoord.xy / vec2( resolution.x, resolution.y ) ).xyz, 1.0 );
    gl_FragColor = color;//vec4( color.xyz, 1.0 );
}