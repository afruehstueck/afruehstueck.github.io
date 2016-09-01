#version 300 es
precision highp float;
    precision highp int;
precision highp sampler3D;

in vec2 textureCoordinate;
in vec2 pos;

out vec4 color;

uniform float layer;
uniform vec3  volumeDimensions;
uniform float numLayers;
uniform vec3  seedOrigin;
uniform sampler3D distanceFieldTexture;
uniform sampler3D volumeTexture;
uniform float targetIntensity;
uniform vec2 dataRange;

//todo: make these uniform
const float eps = 1e-9;
uniform float sensitivity;
uniform float alpha;

float getDistance( vec3 texCoord ) {
    clamp( texCoord, 0., 1. );
    return texture( distanceFieldTexture, texCoord ).r;
}

void main( void ) {
    //calculate volume position from texture coordinate
    float currentLayer = layer / numLayers + 0.5 / numLayers;
    vec3 currentPosition = vec3( textureCoordinate.x, textureCoordinate.y, currentLayer );

    float currentDistance = getDistance( currentPosition );
    float oX = 1. / volumeDimensions.x;
    float oY = 1. / volumeDimensions.y;
    float oZ = 1. / volumeDimensions.z;
    /* calculate all the values
    | u6 | u7 | u8 |
    | u3 | u4 | u5 |
    | u0 | u1 | u2 |
    */

    //evaluate neighboring values from texture
    //todo: incorporate neighboring values in sample function to avoid repeat calculation
    float u1   = getDistance( currentPosition + vec3(  0., -oY,  0. ) );
    float u3   = getDistance( currentPosition + vec3( -oX,  0.,  0. ) );
    float u4   = currentDistance; // equals: //float u4 = getDistance( currentPosition + vec3(  0.,  0.,  0. ) );
    float u5   = getDistance( currentPosition + vec3(  oX,  0.,  0. ) );
    float u7   = getDistance( currentPosition + vec3(  0.,  oY,  0. ) );
    float u4pz = getDistance( currentPosition + vec3(  0.,  0.,  oZ ) );
    float u4mz = getDistance( currentPosition + vec3(  0.,  0., -oZ ) );

    /*
    float narrowBand = length( volumeDimensions / 8. );
    if( abs( u4 ) > narrowBand &&
        abs( u1 ) > narrowBand &&
        abs( u3 ) > narrowBand &&
        abs( u5 ) > narrowBand &&
        abs( u7 ) > narrowBand &&
        abs( u4pz ) > narrowBand &&
        abs( u4mz ) > narrowBand ) {
        color = vec4( currentDistance );
        return;
    }*/

    float u0   = getDistance( currentPosition + vec3( -oX, -oY,  0. ) );
    float u2   = getDistance( currentPosition + vec3(  oX, -oY,  0. ) );
    float u6   = getDistance( currentPosition + vec3( -oX,  oY,  0. ) );
    float u8   = getDistance( currentPosition + vec3(  oX,  oY,  0. ) );

    float u1pz = getDistance( currentPosition + vec3(  0., -oY,  oZ ) );
    float u3pz = getDistance( currentPosition + vec3( -oX,  0.,  oZ ) );
    float u5pz = getDistance( currentPosition + vec3(  oX,  0.,  oZ ) );
    float u7pz = getDistance( currentPosition + vec3(  0.,  oY,  oZ ) );

    float u1mz = getDistance( currentPosition + vec3(  0., -oY, -oZ ) );
    float u3mz = getDistance( currentPosition + vec3( -oX,  0., -oZ ) );
    float u5mz = getDistance( currentPosition + vec3(  oX,  0., -oZ ) );
    float u7mz = getDistance( currentPosition + vec3(  0.,  oY, -oZ ) );

    //calculate derivatives of level set by calculating central differences
    float Dx   = ( u5   - u3 ) / 2.;
    float Dy   = ( u7   - u1 ) / 2.;
    float Dz   = ( u4pz - u4mz ) / 2.; // tmp
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

    float Dzpx = ( u5pz - u5mz ) / 2.; // tmp
    float Dzmx = ( u3pz - u3mz ) / 2.; // tmp
    float Dzpy = ( u7pz - u7mz ) / 2.; // tmp
    float Dzmy = ( u1pz - u1mz ) / 2.; // tmp

    /*if( abs( Dx ) < eps && abs( Dy ) < eps && abs ( Dz ) < eps ) {
        color = encodedDistance;
        return;
    }*/

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


    float nxp_dif1 = ( Dypx + Dy ) / 2.;
    float nxp_dif2 = ( Dzpx + Dz ) / 2.;

    float nyp_dif1 = ( Dxpy + Dx ) / 2.;
    float nyp_dif2 = ( Dzpy + Dz ) / 2.;

    float nzp_dif1 = ( Dxpz + Dx ) / 2.;
    float nzp_dif2 = ( Dypz + Dy ) / 2.;

    float nxp_denom = sqrt( Dxp * Dxp + nxp_dif1 * nxp_dif1 + nxp_dif2 * nxp_dif2 );
    float nyp_denom = sqrt( Dyp * Dyp + nyp_dif1 * nyp_dif1 + nyp_dif2 * nyp_dif2 );
    float nzp_denom = sqrt( Dzp * Dzp + nzp_dif1 * nzp_dif1 + nzp_dif2 * nzp_dif2 );

    vec3 np;
    np.x = Dxp / ( ( nxp_denom > 0. ) ? nxp_denom : 1. );
    np.y = Dyp / ( ( nyp_denom > 0. ) ? nyp_denom : 1. );
    np.z = Dzp / ( ( nzp_denom > 0. ) ? nzp_denom : 1. );


    float nxm_dif1 = ( Dymx + Dy ) / 2.;
    float nxm_dif2 = ( Dzmx + Dz ) / 2.;

    float nym_dif1 = ( Dxmy + Dx ) / 2.;
    float nym_dif2 = ( Dzmy + Dz ) / 2.;

    float nzm_dif1 = ( Dxmz + Dx ) / 2.;
    float nzm_dif2 = ( Dymz + Dy ) / 2.;

    float nxm_denom = sqrt( Dxm * Dxm + nxm_dif1 * nxm_dif1 + nxm_dif2 * nxm_dif2 );
    float nym_denom = sqrt( Dym * Dym + nym_dif1 * nym_dif1 + nym_dif2 * nym_dif2 );
    float nzm_denom = sqrt( Dzm * Dzm + nzm_dif1 * nzm_dif1 + nzm_dif2 * nzm_dif2 );

    vec3 nm;
    nm.x = Dxm / ( ( nxm_denom > 0. ) ? nxm_denom : 1. );
    nm.y = Dym / ( ( nym_denom > 0. ) ? nym_denom : 1. );
    nm.z = Dzm / ( ( nzm_denom > 0. ) ? nzm_denom : 1. );

    vec3 n_diff = normalize( np ) - normalize( nm );
    //calculate mean curvature

    float H = ( np.x - nm.x + np.y - nm.y + np.z - nm.z ) / 2.;
    //float H = ( n_diff.x + n_diff.y + n_diff.z ) / 2.;

    //TODO: re-figure this out
    /*if( abs( u1 ) > 1. - eps ||
        abs( u3 ) > 1. - eps ||
        abs( u4 ) > 1. - eps ||
        abs( u5 ) > 1. - eps ||
        abs( u7 ) > 1. - eps ) {
            // region with (potentially) clamped values
        H = 0.;
    }*/

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

    float targetValue = targetIntensity / 255.;//
    //float targetValue = texture( volumeTexture, seedOrigin ).r;

    //todo: figure out which component (rgba)
    float sourceValue = texture( volumeTexture, currentPosition ).y;

    float min = dataRange.x;
    float max = dataRange.y;
    sourceValue = ( sourceValue - min ) / ( max - min );

    //speed function pulling distance function towards areas with target intensity
    float D = sensitivity - abs( sourceValue - targetValue );

    //speed function is composed from speed function D and curvature function H, controlled by alpha value
    //TODO look at curvature H which is probably broken
    float speedFunction = alpha * D + ( 1. - alpha ) * H;
    //choose gradient magnitude according to speed function
    vec3 gradient = ( speedFunction > 0. ) ? grad_phi_max : grad_phi_min;
    float gradientMagnitude = length( gradient );
    float updateDistance = gradientMagnitude * speedFunction;

    float distance = currentDistance + updateDistance;
    //float clampDistance = clamp( distance, -1., 1. );

    //update values in distance field
    //float normalizedDistance = ( clampDistance + 1. ) / 2.;

    //calculate normal vector for lighting TODO: weird behaviour
    vec3 N  = normalize( vec3( Dx, Dy, Dz ) );

    color.r = distance;
    color.gba = N;//vec3( H, 0., 0. );
}
