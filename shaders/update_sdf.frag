precision highp float;

uniform vec3  volumeDimensions;
uniform vec2  tiles;
uniform vec2  sourceTexelSize;
uniform vec3  seedOrigin;
uniform sampler2D distanceFieldTexture;
uniform sampler2D volumeTexture;
uniform float targetIntensity;

varying vec2 pos;
varying vec2 textureCoordinate;

//todo: make these uniform
//const vec2 tiles = vec2( 16., 16. );
const float epsilon = 0.1;
const float alpha = 0.9;

//sample volumetric data from tiled 2d texture
vec4 sampleAs3DTexture( sampler2D volume, vec3 texCoord ) {
    if( texCoord.x < 0. || texCoord.x > 1. ||
        texCoord.y < 0. || texCoord.y > 1. ||
        texCoord.z < 0. || texCoord.z > 1. ) {
        return vec4( 0. );
    }

    float volumeDepth = tiles.x * tiles.y;
    float max_slice = volumeDepth - 1.;
    vec2 slice;

    //z coordinate determines which 2D tile we sample from
    //z slice number runs from 0 to 255.
    float slice_z = floor( texCoord.z * max_slice );

    float dx = mod( slice_z, tiles.x ); //zB mod( 255, 16 ) = 15 || 1.0 , 1/16
    //examples inverted y values (they are like this in the example volumes) - do we want this?
    //for inverted values do
    //float dy = floor( ( max_slice - slice_z ) / tiles.x );
    //float dy = tiles.y - 1. - floor( slice_z / tiles.x ); //??
    float dy = floor( slice_z / tiles.x );

    slice.x = ( texCoord.x + dx ) / tiles.x;
    slice.y = ( texCoord.y + dy ) / tiles.y;

    //bilinear filtering is done at each texture2D lookup by default
    return texture2D( volume, slice );
}

vec3 tiledTextureCoordToVolumeCoord( vec2 textureCoordinate ) {
    //scale textureCoordinate from [ 0, 1 ] to [ 0, tiles[x,y] ]
    float tx = textureCoordinate.x * tiles.x;
    float ty = textureCoordinate.y * tiles.y;

    float dx = floor( tx );
    float dy = floor( ty );

    vec3 coord;

    coord.x = fract( tx );
    coord.y = fract( ty );

    //z-arrangement in examples inverted to adhere to file format. maybe change this!
    //coord.z = ( ( tiles.y - dy ) * tiles.x + dx ) / ( tiles.x * tiles.y );
    coord.z = ( dy * tiles.x + dx ) / ( tiles.x * tiles.y );

    return coord;
}

vec4 sampleWithOffset( sampler2D volume, vec3 pos, vec3 offset ) {
    //todo theck if offset coord goes outside of volume - currently returning black for sampling outside of volume
    vec3 offsetCoord = pos + offset / volumeDimensions;

    return sampleAs3DTexture( volume, offsetCoord );
}

float getNormalizedSample( sampler2D volume, vec3 texCoord, vec3 offset ) {
    return sampleWithOffset( volume, texCoord, offset ).r * 2.0 - 1.0;
}

/*void getNeigborhood( sampler2D volume, vec3 pos, out float[ 27 ] neighborhood ) {
    *//* calculate neighborhood values
        | n00 | n01 | n02 |
        | n03 | n04 | n05 | -z
        | n06 | n07 | n08 |

        | n09 | n10 | n11 |
        | n12 | n13 | n14 |
        | n15 | n16 | n17 |

        | n18 | n19 | n20 |
        | n21 | n22 | n23 | +z
        | n24 | n25 | n26 |
    *//*
    neighbors[ 0 ] = sampleWithOffset( volume, vec2(0.,0.), vec3( -1., -1.,  0. ) );

    neighbors[ 1 ] = 1.;
}*/

void main( void ) {
    //calculate volume position from texture coordinate
    vec3 currentPosition = tiledTextureCoordToVolumeCoord( textureCoordinate );

    vec4 encodedDistance = texture2D( distanceFieldTexture, textureCoordinate );
    //equal to:
    //vec4 encodedDistance = sampleAs3DTexture( distanceFieldTexture, currentPosition );
    float currentDistance = encodedDistance.r * 2. - 1.; //de-normalize


    /* calculate all the values
    | u6 | u7 | u8 |
    | u3 | u4 | u5 |
    | u0 | u1 | u2 |
    */
    //evaluate neighboring values from texture
    //todo: incorporate neighboring values in sample function to avoid repeat calculation
    float u0 = getNormalizedSample( distanceFieldTexture, currentPosition, vec3( -1., -1.,  0. ) );
    float u1 = getNormalizedSample( distanceFieldTexture, currentPosition, vec3(  0., -1.,  0. ) );
    float u2 = getNormalizedSample( distanceFieldTexture, currentPosition, vec3(  1., -1.,  0. ) );
    float u3 = getNormalizedSample( distanceFieldTexture, currentPosition, vec3( -1.,  0.,  0. ) );
    float u4 = currentDistance; //currentDistance; // equals:
    //float u4 = getNormalizedSample( distanceFieldTexture, currentPosition, vec3(  0.,  0.,  0. ) ); //currentDistance; // equals:
    float u5 = getNormalizedSample( distanceFieldTexture, currentPosition, vec3(  1.,  0.,  0. ) );
    float u6 = getNormalizedSample( distanceFieldTexture, currentPosition, vec3( -1.,  1.,  0. ) );
    float u7 = getNormalizedSample( distanceFieldTexture, currentPosition, vec3(  0.,  1.,  0. ) );
    float u8 = getNormalizedSample( distanceFieldTexture, currentPosition, vec3(  1.,  1.,  0. ) );

    float u1pz = getNormalizedSample( distanceFieldTexture, currentPosition, vec3(  0., -1.,  1. ) );
    float u3pz = getNormalizedSample( distanceFieldTexture, currentPosition, vec3( -1.,  0.,  1. ) );
    float u4pz = getNormalizedSample( distanceFieldTexture, currentPosition, vec3(  0.,  0.,  1. ) );
    float u5pz = getNormalizedSample( distanceFieldTexture, currentPosition, vec3(  1.,  0.,  1. ) );
    float u7pz = getNormalizedSample( distanceFieldTexture, currentPosition, vec3(  0.,  1.,  1. ) );

    float u1mz = getNormalizedSample( distanceFieldTexture, currentPosition, vec3(  0., -1., -1. ) );
    float u3mz = getNormalizedSample( distanceFieldTexture, currentPosition, vec3( -1.,  0., -1. ) );
    float u4mz = getNormalizedSample( distanceFieldTexture, currentPosition, vec3(  0.,  0., -1. ) );
    float u5mz = getNormalizedSample( distanceFieldTexture, currentPosition, vec3(  1.,  0., -1. ) );
    float u7mz = getNormalizedSample( distanceFieldTexture, currentPosition, vec3(  0.,  1., -1. ) );

    //calculate derivatives of level set
    float Dx   = ( u5   - u3 ) / 2.;
    float Dy   = ( u7   - u1 ) / 2.;
    float Dz   = ( u4pz - u4mz ) / 2.;
    float Dxp  = ( u5   - u4 );
    float Dxm  = ( u4   - u3 );
    float Dyp  = ( u7   - u4 );
    float Dym  = ( u4   - u1 );
    float Dzp  = ( u4pz - u4 );
    float Dzm  = ( u4   - u4mz );
    float Dxpy = ( u8   - u6 ) / 2.;
    float Dxmy = ( u2   - u0 ) / 2.;
    float Dypx = ( u8   - u2 ) / 2.;
    float Dymx = ( u6   - u0 ) / 2.;
    float Dxpz = ( u5pz - u3pz ) / 2.;
    float Dxmz = ( u5mz - u3mz ) / 2.;
    float Dypz = ( u7pz - u1pz ) / 2.;
    float Dymz = ( u7mz - u1mz ) / 2.;
    float Dzpx = ( u5pz - u5mz ) / 2.;
    float Dzmx = ( u3pz - u3mz ) / 2.;
    float Dzpy = ( u7pz - u7mz ) / 2.;
    float Dzmy = ( u1pz - u1mz ) / 2.;

    /* todo something's not right with some of the tiles :( check!
    if( Dx == 0. ) {
        gl_FragColor = vec4( 1., 0., 0., 1. ); //todo: check?
        return;
    }

    if( Dy == 0. ) {
        gl_FragColor = vec4( 0., 1., 0., 1. ); //todo: check?
        return;
    }

    if( u4mz == 0. ) {
        gl_FragColor = vec4( 0., 0., 1., 1. ); //todo: check?
        return;
    }*/
    if( Dx == 0. || Dy == 0. || Dz == 0. ) {
        gl_FragColor = encodedDistance;
        return;
    }


    float nxp_dif1 = ( Dypx + Dy ) / 2.;
    float nxp_dif2 = ( Dzpx + Dz ) / 2.;

    float nyp_dif1 = ( Dxpy + Dx ) / 2.;
    float nyp_dif2 = ( Dzpy + Dz ) / 2.;

    float nzp_dif1 = ( Dxpz + Dx ) / 2.;
    float nzp_dif2 = ( Dypz + Dy ) / 2.;

    float nxp_denom = sqrt( Dxp * Dxp + nxp_dif1 * nxp_dif1 + nxp_dif2 * nxp_dif2 );
    float nyp_denom = sqrt( Dyp * Dyp + nyp_dif1 * nyp_dif1 + nyp_dif2 * nyp_dif2 );
    float nzp_denom = sqrt( Dzp * Dzp + nzp_dif1 * nzp_dif1 + nzp_dif2 * nzp_dif2 );

    float nxp = Dxp / ( ( nxp_denom > 0. ) ? nxp_denom : 1. );
    float nyp = Dyp / ( ( nyp_denom > 0. ) ? nyp_denom : 1. );
    float nzp = Dzp / ( ( nzp_denom > 0. ) ? nzp_denom : 1. );


    float nxm_dif1 = ( Dymx + Dy ) / 2.;
    float nxm_dif2 = ( Dzmx + Dz ) / 2.;

    float nym_dif1 = ( Dxmy + Dx ) / 2.;
    float nym_dif2 = ( Dzmy + Dz ) / 2.;

    float nzm_dif1 = ( Dxmz + Dx ) / 2.;
    float nzm_dif2 = ( Dymz + Dy ) / 2.;

    float nxm_denom = sqrt( Dxm * Dxm + nxm_dif1 * nxm_dif1 + nxm_dif2 * nxm_dif2 );
    float nym_denom = sqrt( Dym * Dym + nym_dif1 * nym_dif1 + nym_dif2 * nym_dif2 );
    float nzm_denom = sqrt( Dzm * Dzm + nzm_dif1 * nzm_dif1 + nzm_dif2 * nzm_dif2 );

    float nxm = Dxm / ( ( nxm_denom > 0. ) ? nxm_denom : 1. );
    float nym = Dym / ( ( nym_denom > 0. ) ? nym_denom : 1. );
    float nzm = Dzm / ( ( nzm_denom > 0. ) ? nzm_denom : 1. );

    //calculate mean curvature
    float H = ( nxp - nxm + nyp - nym + nzp - nzm ) / 2.;

    if( abs( u1 ) == 1. ||
        abs( u3 ) == 1. ||
        abs( u4 ) == 1. ||
        abs( u5 ) == 1. ||
        abs( u7 ) == 1. ) {
            // region with (potentially) clamped values
        H = 0.;
    }

    float max_Dxp  = max(  Dxp, 0. );
    float max_mDxm = max( -Dxm, 0. );
    float max_Dyp  = max(  Dyp, 0. );
    float max_mDym = max( -Dym, 0. );
    float max_Dzp  = max(  Dzp, 0. );
    float max_mDzm = max( -Dzm, 0. );
    //upwind approximation of gradient
    vec3 grad_phi_max = vec3(  sqrt( max_Dxp * max_Dxp + max_mDxm * max_mDxm ),
                                sqrt( max_Dyp * max_Dyp + max_mDym * max_mDym ),
                                sqrt( max_Dzp * max_Dzp + max_mDzm * max_mDzm ) );

    float min_Dxp  = min(  Dxp, 0. );
    float min_mDxm = min( -Dxm, 0. );
    float min_Dyp  = min(  Dyp, 0. );
    float min_mDym = min( -Dym, 0. );
    float min_Dzp  = min(  Dzp, 0. );
    float min_mDzm = min( -Dzm, 0. );
    vec3 grad_phi_min = vec3(   sqrt( min_Dxp * min_Dxp + min_mDxm * min_mDxm ),
                                 sqrt( min_Dyp * min_Dyp + min_mDym * min_mDym ),
                                 sqrt( min_Dzp * min_Dzp + min_mDzm * min_mDzm ) );

    //float targetValue = targetIntensity;//
    float targetValue = sampleAs3DTexture( volumeTexture, seedOrigin ).r;

    //todo: figure out which component (rgba)
    float sourceValue = sampleAs3DTexture( volumeTexture, currentPosition ).r;

    //speed function pulling distance function towards areas with target intensity
    float D = epsilon - abs( sourceValue - targetValue );

    //speed function is composed from speed function D and curvature function H, controlled by alpha value
    //TODO look at curvature H which is probably broken
    float speedFunction = alpha * D + ( 1. - alpha ) * H;
    //choose gradient magnitude according to speed function
    float gradientMagnitude = ( speedFunction > 0. ) ? length( grad_phi_max ) : length( grad_phi_min );
    float updateDistance = gradientMagnitude * speedFunction;

    float distance = currentDistance + updateDistance;
    float clampDistance = clamp( distance, -1., 1. );

    //update values in distance field
    float normalizedDistance = ( clampDistance + 1. ) / 2.;

    vec3 gradient1 = vec3( u3, u1, u4mz );
    vec3 gradient2 = vec3( u5, u7, u4pz );
    //calculate normal vector for lighting
    vec3 N  = normalize( gradient1 - gradient2 );

    //gl_FragColor = vec4( normalizedDistance, ( abs( clampDistance ) < 0.05 ) ? 1. : 0., ( abs( clampDistance ) < 0.05 ) ? 1. : 0., normalizedDistance );
    gl_FragColor.r = normalizedDistance;
    gl_FragColor.gba = N;
}