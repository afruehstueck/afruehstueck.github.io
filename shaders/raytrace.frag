precision highp float;

uniform vec2  iResolution;
uniform float iGlobalTime;
uniform sampler2D sdfBuffer;
uniform sampler2D backfaceBuffer;
uniform sampler2D volumeTexture;

//vec2 doModel( vec3 p );
//vec2 sampleVolume( vec3 pos );

//#pragma glslify: raytrace = require( 'glsl-raytrace' , map = sampleVolumeSimple, MAX_STEPS = 150 )
//#pragma glslify: normal   = require( 'glsl-sdf-normal', map = doModel)
//#pragma glslify: noise    = require( 'glsl-noise/simplex/4d' )
//#pragma glslify: square   = require( 'glsl-square-frame' )
//#pragma glslify: smin     = require( 'glsl-smooth-min' )
//#pragma glslify: camera2   = require( 'glsl-camera-ray' )
//#pragma glslify: camera  = require( 'glsl-turntable-camera' )

const float numSlices = 256.0;
const float slicesX = 16.0;
const float slicesY = 16.0;
const int MAX_STEPS = 250;

varying vec3 textureCoordinate;

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


//////////////////////// BEGIN TURNTABLE_CAMERA

vec2 squareFrame( vec2 screenSize ) {
  vec2 position = 2.0 * ( gl_FragCoord.xy / screenSize.xy ) - 1.0;
  position.x *= screenSize.x / screenSize.y;
  return position;
}

vec2 squareFrame( vec2 screenSize, vec2 coord ) {
  vec2 position = 2.0 * ( coord.xy / screenSize.xy ) - 1.0;
  position.x *= screenSize.x / screenSize.y;
  return position;
}

mat3 calcLookAtMatrix( vec3 origin, vec3 target, float roll ) {
  vec3 rr = vec3( sin( roll ), cos( roll ), 0.0 );
  vec3 ww = normalize( target - origin );
  vec3 uu = normalize( cross( ww, rr ) );
  vec3 vv = normalize( cross( uu, ww ) );

  return mat3( uu, vv, ww );
}

vec3 getRay( mat3 camMat, vec2 screenPos, float lensLength ) {
  return normalize( camMat * vec3( screenPos, lensLength ) );
}

vec3 getRay( vec3 origin, vec3 target, vec2 screenPos, float lensLength ) {
  mat3 camMat = calcLookAtMatrix( origin, target, 0.0 );
  return getRay( camMat, screenPos, lensLength );
}

void orbitCamera(
  in float camAngle,
  in float camHeight,
  in float camDistance,
  in vec2 screenResolution,
  out vec3 rayOrigin,
  out vec3 rayDirection
) {
  vec2 screenPos = squareFrame( screenResolution );
  vec3 rayTarget = vec3( 0.0 );

  rayOrigin = vec3(
    camDistance * sin( camAngle ),
    camHeight,
    camDistance * cos( camAngle )
  );

  rayDirection = getRay( rayOrigin, rayTarget, screenPos, 2.0 );
}

//////////////////////// END TURNTABLE_CAMERA

vec2 sampleVolume( vec3 p ) {
    if( p.x > 1. || p.y > 1. || p.x < 0. || p.y < 0. ) return vec2( 1.0, 0.0 );

    float tiles_x = 16.;
    float tiles_y = 16.;
    float volumeWidth = 128.;
    float volumeHeight = 128.;

    float sliceNo = floor( p.z * tiles_x * tiles_y );

    float dx = mod( sliceNo, tiles_x );
    float dy = ( sliceNo - dx ) / tiles_x;

    dx *= volumeWidth;
    dy *= volumeHeight;

    vec2 t;
    t.x = dx + p.x * volumeWidth;
    t.y = dy + p.y * volumeHeight;

    t.x /= ( volumeWidth * tiles_x );
    t.y /= ( volumeHeight * tiles_y );

    vec4 texColor = texture2D( sdfBuffer, t );

    float deNormalized = texColor.x * 2.0 - 1.0;
    //////////
    return vec2 ( deNormalized, 0.0 );
}

vec4 sampleAs3DTexture( vec3 texCoord, sampler2D volume ) {
    if( texCoord.x < 0. || texCoord.x > 1. ||
        texCoord.y < 0. || texCoord.y > 1. ||
        texCoord.z < 0. || texCoord.z > 1. ) {
        return vec4( 0.0, 0.0, 0.0, 0.0 );
    }

    vec2 tiles = vec2( 16., 16. );
    float volumeDepth = tiles.x * tiles.y;
    float max_slice = volumeDepth - 1.0;
    vec2 slice1, slice2;

    //z coordinate determines which 2D tile we sample from
    //z slice number runs from 0 to 255.
    float slice1_z = floor( texCoord.z * max_slice );
    float slice2_z = clamp( slice1_z + 1.0, 0.0, max_slice );

    float dx1 = mod( slice1_z, tiles.x );
    float dy1 = floor( ( max_slice - slice1_z ) / tiles.x );

    float dx2 = mod( slice2_z, tiles.x );
    float dy2 = floor( ( max_slice - slice2_z ) / tiles.x );

    slice1.x = ( texCoord.x + dx1 ) / tiles.x;
    slice1.y = ( texCoord.y + dy1 ) / tiles.y;

    slice2.x = ( texCoord.x + dx2 ) / tiles.x;
    slice2.y = ( texCoord.y + dy2 ) / tiles.y;

    //bilinear filtering is done at each texture2D by default
    vec4 color1 = texture2D( volume, slice1 );
    vec4 color2 = texture2D( volume, slice2 );
    //TODO: lookup transfer functions for colors (if relevant)

    float zDifference = mod( texCoord.z * max_slice, 1.0 );
    //interpolate between the two intermediate colors of each slice
    return mix( color1, color2, zDifference );
}


vec2 doModel( vec3 p ) {

  //vec3 pos = p * 0.5 + 0.5;

  float r = 1.0;
  r += noise( vec4( p * 0.75, iGlobalTime ) ) * 0.25;

  //return vec2( length(p) - r, 0.0);
  return sampleVolume( p );
}


vec3 doMaterial( vec3 pos, vec3 nor ) {
  return vec3( 0.4, 0.768, 1.0 ) * 0.5;
}

vec3 doLighting( vec3 pos, vec3 nor, vec3 rd, float dis, vec3 mal ) {
  vec3 lin = vec3( 0.0 );

  vec3  lig = normalize( vec3( 1.0, 0.7, 0.9 ) );
  float dif = max( dot( nor, lig ) ,0.0 );

  lin += dif * vec3( 2 );
  lin += vec3( 0.05 );

  return mal*lin;
}

vec3 calcNormal( vec3 pos ) {
  const float eps = 0.05;

  const vec3 v1 = vec3(  1.0, -1.0, -1.0 );
  const vec3 v2 = vec3( -1.0, -1.0,  1.0 );
  const vec3 v3 = vec3( -1.0,  1.0, -1.0 );
  const vec3 v4 = vec3(  1.0,  1.0,  1.0 );

  return normalize( v1 * doModel( pos + v1 * eps ).x +
                    v2 * doModel( pos + v2 * eps ).x +
                    v3 * doModel( pos + v3 * eps ).x +
                    v4 * doModel( pos + v4 * eps ).x );
}



//////////////////////// BEGIN GLSL-RAYTR ACE

vec2 raytrace( vec3 rayOrigin, vec3 rayDir, float maxd, float precis ) {
  float latest = precis * 2.0;
  float dist   = +0.0;
  float type   = -1.0;
  vec2  res    = vec2( -1.0, -1.0 );

  for ( int i = 0; i < 150 ; i++ ) {
    if ( latest < precis || dist > maxd ) break;

    vec2 result = doModel( rayOrigin + rayDir * dist );

    latest = result.x;
    type   = result.y;
    dist  += latest;
  }

  if ( dist < maxd ) {
    res = vec2( dist, type );
  }

  return res;
}

vec2 raytrace( vec3 rayOrigin, vec3 rayDir ) {
  return raytrace( rayOrigin, rayDir, 20.0, 0.001 );
}
//////////////////////// END GLSL-RAYTRACE


/*void main() {
  float cameraAngle  = 0.0;//iGlobalTime;
  vec3  rayOrigin    = vec3( 3.5 * sin( cameraAngle ), 3.0, 3.5 * cos( cameraAngle ) );
  vec3  rayTarget    = vec3( 0.0, 0.0, 0.0 );
  vec2  screenPos    = square( iResolution );
  vec3  rayDirection = camera( rayOrigin, rayTarget, screenPos, 2.0 );

  vec3 col = vec3( 0.015 );
  vec2 t   = raytrace( rayOrigin, rayDirection );

  if ( t.x > -0.5 ) {
    vec3 pos = rayOrigin + t.x * rayDirection;
    vec3 nor = calcNormal( pos );
    vec3 mal = doMaterial( pos, nor );

    col = doLighting( pos, nor, rayDirection, t.x, mal );
  }

  col = pow( clamp( col, 0.0, 1.0 ), vec3( 0.4545 ) );

  gl_FragColor = vec4( col, 1.0 );
}*/


void main() {
    float steps = 100.0;
    float alphaCorrection = 0.1;
    vec4 accumulatedColor = vec4( 0.0 );
    float accumulatedAlpha = 0.0;
    float accumulatedLength = 0.0;

    vec3 rayStart = textureCoordinate;//? * 2.0 - 1.0;
    vec3 rayEnd = texture2D( backfaceBuffer, gl_FragCoord.xy / vec2( iResolution.x, iResolution.y ) ).xyz;// * 2.0 - 1.0;

    vec3 ray = rayEnd - rayStart;
    float rayLength = length( ray );

    float delta = 1.0 / steps;
    vec3 deltaDirection = normalize ( ray ) * delta;
    float deltaLength = length ( deltaDirection );

    vec3 position = rayStart;

    for ( int i = 0; i < MAX_STEPS; ++i ) {
        //acc.a = sampleAs3DTexture( position * 0.5 + 0.5, volumeTexture );
        vec4 sampleColor = sampleAs3DTexture( position, volumeTexture );

        //todo: determine which value is sampled. currently .x because some data does not have alpha
        float sampleAlpha = sampleColor.x * alphaCorrection;

        accumulatedColor += ( 1.0 - accumulatedAlpha ) * sampleColor * sampleAlpha;

        accumulatedAlpha += sampleAlpha;

        /*MIP // do not have tf, otherwise sample it
        src = vec4( acc.aaaa );
        if ( src.a >= dst.a )
            dst = src;
        */
        position += deltaDirection;
        accumulatedLength += deltaLength;

        if( accumulatedLength >= rayLength || accumulatedAlpha >= 1.0 ) {
            break;
        }
    }

    //vec4 sampleColor = sampleAs3DTexture( rayStart, volumeTexture );
    //gl_FragColor  = vec4(sampleColor.xyz, 1.0);
    //gl_FragColor = vec4( texsture2D( backfaceBuffer, gl_FragCoord.xy / vec2( iResolution.x, iResolution.y ) ).xyz, 1.0 );
    gl_FragColor = vec4(accumulatedColor.xyz, 1.0);
}

/*
void main() {
  vec3 color = vec3( 0.0 );
  vec3 rayOrigin, rayDirection;

  float rotation = 0.0;//2.4;
  float height   = 0.0;
  float dist     = 5.0;

  orbitCamera( rotation, height, dist, iResolution.xy, rayOrigin, rayDirection );

  vec2 t = raytrace( rayOrigin, rayDirection, 20.0, 0.01 ); //find first ray intersection
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
