precision highp float;

uniform vec2  iResolution;
uniform float iGlobalTime;
uniform sampler2D sdfBuffer;
uniform sampler2D sourceTexture;

vec2 doModel( vec3 p );
vec2 sampleVolume( vec3 pos );
vec2 sampleVolumeSimple( vec3 pos );

//#pragma glslify: raytrace = require( 'glsl-raytrace' , map = sampleVolumeSimple, steps = 150 )
//#pragma glslify: normal   = require( 'glsl-sdf-normal', map = doModel)
//#pragma glslify: noise    = require( 'glsl-noise/simplex/4d' )
//#pragma glslify: square   = require( 'glsl-square-frame' )
//#pragma glslify: smin     = require( 'glsl-smooth-min' )
//#pragma glslify: camera2   = require( 'glsl-camera-ray' )
//#pragma glslify: camera  = require( 'glsl-turntable-camera' )

const float numSlices = 256.0;
const float slicesX = 16.0;
const float slicesY = 16.0;

//////////////////////// BEGIN GLSL-RAYTRACE

vec2 raytrace(vec3 rayOrigin, vec3 rayDir, float maxd, float precis) {
  float latest = precis * 2.0;
  float dist   = +0.0;
  float type   = -1.0;
  vec2  res    = vec2(-1.0, -1.0);

  for (int i = 0; i < 150 ; i++) {
    if (latest < precis || dist > maxd) break;

    vec2 result = doModel(rayOrigin + rayDir * dist);

    latest = result.x;
    type   = result.y;
    dist  += latest;
  }

  if (dist < maxd) {
    res = vec2(dist, type);
  }

  return res;
}

vec2 raytrace(vec3 rayOrigin, vec3 rayDir) {
  return raytrace(rayOrigin, rayDir, 20.0, 0.001);
}
//////////////////////// END GLSL-RAYTRACE


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

vec2 squareFrame_4_7(vec2 screenSize) {
  vec2 position = 2.0 * (gl_FragCoord.xy / screenSize.xy) - 1.0;
  position.x *= screenSize.x / screenSize.y;
  return position;
}

vec2 squareFrame_4_7(vec2 screenSize, vec2 coord) {
  vec2 position = 2.0 * (coord.xy / screenSize.xy) - 1.0;
  position.x *= screenSize.x / screenSize.y;
  return position;
}

mat3 calcLookAtMatrix_6_8(vec3 origin, vec3 target, float roll) {
  vec3 rr = vec3(sin(roll), cos(roll), 0.0);
  vec3 ww = normalize(target - origin);
  vec3 uu = normalize(cross(ww, rr));
  vec3 vv = normalize(cross(uu, ww));

  return mat3(uu, vv, ww);
}

vec3 getRay_5_9(mat3 camMat, vec2 screenPos, float lensLength) {
  return normalize(camMat * vec3(screenPos, lensLength));
}

vec3 getRay_5_9(vec3 origin, vec3 target, vec2 screenPos, float lensLength) {
  mat3 camMat = calcLookAtMatrix_6_8(origin, target, 0.0);
  return getRay_5_9(camMat, screenPos, lensLength);
}

void orbitCamera_3_10(
  in float camAngle,
  in float camHeight,
  in float camDistance,
  in vec2 screenResolution,
  out vec3 rayOrigin,
  out vec3 rayDirection
) {
  vec2 screenPos = squareFrame_4_7(screenResolution);
  vec3 rayTarget = vec3(0.0);

  rayOrigin = vec3(
    camDistance * sin(camAngle),
    camHeight,
    camDistance * cos(camAngle)
  );

  rayDirection = getRay_5_9(rayOrigin, rayTarget, screenPos, 2.0);
}

//////////////////////// END TURNTABLE_CAMERA

vec2 sampleVolume( vec3 p ) {

    vec3 pos = p;

    if(abs( pos.x ) > 1. || abs(pos.y) > 1. ) return vec2( -1.0, 0.0 );

	vec2 tex1, tex2;
	float slice1, slice2;
	slice1 = floor( pos.z * numSlices );
	slice2 = slice1 + 1.0;

	float dx1, dy1, dx2, dy2;
	dx1 = fract( slice1 / slicesX );
	dx2 = fract( slice2 / slicesX );
	dy1 = floor( slice1 / slicesY ) / slicesY;
	dy2 = floor( slice2 / slicesY ) / slicesY;

	tex1.x = dx1 + ( pos.x / slicesX );
	tex2.x = dx2 + ( pos.x / slicesX );

	tex1.y = ( -pos.y / slicesY ) - dy1;
	tex2.y = ( -pos.y / slicesY ) - dy2;

    vec4 slice1Color = texture2D( sdfBuffer, tex1 );
    vec4 slice2Color = texture2D( sdfBuffer, tex2 );

	float slice1X = slice1Color.x * 2.0 - 1.0;
	float slice2X = slice2Color.x * 2.0 - 1.0;
	return vec2 ( mix( slice1X, slice2X, ( pos.z * numSlices ) - slice1 ), 1.0 );
}


vec2 sampleVolumeSimple( vec3 p ) {

    vec3 pos = p;

    if( pos.x > 1. || pos.y > 1. || pos.x < -1. || pos.y < -1. || pos.z < -1. || pos.z > 10. ) return vec2( -1.0, 0.0 );

	vec2 tex1;
	float slice1;
	slice1 = floor( pos.z * numSlices );

	float dx1, dy1;
	dx1 = fract( slice1 / slicesX );
	dy1 = floor( slice1 / slicesY ) / slicesY;

	tex1.x = dx1 + ( ( pos.x * 0.5 + 0.5 ) / slicesX );

	tex1.y = ( -( pos.y * 0.5 + 0.5 ) / slicesY ) - dy1;

    vec4 slice1Color = texture2D( sdfBuffer, tex1 );

	return vec2 ( slice1Color.x * 2.0 - 1.0, 0.0 );
}


vec2 doModel( vec3 p ) {
  //if( abs ( p.x ) > 1. || abs ( p.y ) > 1. || abs ( p.z ) > 1. ) return vec2( 1.0, 0.0 );

  float r = 1.0;
  r += noise( vec4( p * 0.75, iGlobalTime ) ) * 0.25;

  return vec2( length( p ) - 4.0, 0.0 );
  //return vec2( sampleVolume ( p * 0.5 + 0.5 ), 0.0 );

  //return vec2 ( sampleVolume ( p * 0.5 + 0.5 ) , 0.0 );
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

vec3 calcNormalSimple( vec3 pos ) {
  const float eps = 0.05;

  const vec3 v1 = vec3(  1.0, -1.0, -1.0 );
  const vec3 v2 = vec3( -1.0, -1.0,  1.0 );
  const vec3 v3 = vec3( -1.0,  1.0, -1.0 );
  const vec3 v4 = vec3(  1.0,  1.0,  1.0 );

  return normalize( v1 * sampleVolumeSimple( pos + v1 * eps ).x +
                    v2 * sampleVolumeSimple( pos + v2 * eps ).x +
                    v3 * sampleVolumeSimple( pos + v3 * eps ).x +
                    v4 * sampleVolumeSimple( pos + v4 * eps ).x );
}



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
  vec3 color = vec3( 0.0 );
  vec3 rayOrigin, rayDirection;

  float rotation = 0.0;//fiGlobalTime;
  float height   = 0.0;
  float dist     = 10.0;
  vec2 test = vec2( 512, 512 );
  orbitCamera_3_10( rotation, height, dist, iResolution.xy, rayOrigin, rayDirection );

  vec2 t = raytrace( rayOrigin, rayDirection );
  if ( t.x > -0.5 ) {
    vec3 pos = rayOrigin + t.x * rayDirection;
    vec3 nor = calcNormalSimple( pos );
    vec3 mal = doMaterial( pos, nor );

    color = doLighting( pos, nor, rayDirection, t.x, mal );
    //color = nor * 0.5 + 0.5;
  }

  gl_FragColor.rgb = color;
  gl_FragColor.a   = 1.0;
}
