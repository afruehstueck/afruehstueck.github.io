precision highp float;

// segmentation using signed distance transform
// implemented after Aaron Lefohn et al. "A Streaming Narrow-Band Algorithm: Interactive Computation and Visualization of Level Sets" (TVCG '03)

uniform sampler2D sourceTextureSampler;
uniform sampler2D distanceFieldSampler;
uniform vec2 sourceTextureSize;
uniform vec2 sourceTexelSize;
uniform vec2 seedOrigin;
uniform float seedRadius;
uniform int iteration;
uniform float epsilon;
uniform int numberOfIterations;
//defines whether render target is distance field (= 1) or image buffer (= 0)
uniform int renderDistanceField;
uniform float edgeWeight;
uniform float alpha;

varying vec2 textureCoordinate;

vec4 initialize_distance_field( void ) {
    float distanceToSeed = length( textureCoordinate - seedOrigin );
    //distance in distance function is negative outside of seed and positive inside of seed
    float currentDistance = clamp( seedRadius - distanceToSeed, -1., 1. ); 
    //normalize distance value to [0, 1] range
    float normalizedDistance = ( currentDistance + 1. ) / 2.;
    return vec4( normalizedDistance, 0., 0., 0. );
}

float get_offset_texture_value( float offset_x, float offset_y ) {
    vec4 encoded_value = texture2D( distanceFieldSampler, textureCoordinate + vec2( offset_x, offset_y ) * sourceTexelSize );
    return encoded_value.r * 2. - 1.;
}

void main( void ) {
  vec4 encodedDistance = texture2D( distanceFieldSampler, textureCoordinate );
  float currentDistance = encodedDistance.r * 2. - 1.;

  //target value is selected from color value at center of seed circle
  vec4 targetColor = texture2D( sourceTextureSampler, seedOrigin );
  vec4 sourceColor = texture2D( sourceTextureSampler, textureCoordinate );

  /* First time called, fill in currentDistance transform */
  if ( renderDistanceField == 1 && iteration == 0 ) {
    gl_FragColor = initialize_distance_field();
    return;
  /* for all following iterations, update distance field */
  } else if ( renderDistanceField == 1 && iteration > 0 && iteration <= numberOfIterations ) {
    /* calculate all the values
    | TL | TC | TR |
    | CL | CC | CR |
    | BL | BC | BR |
    */

    //evaluate neighboring values from texture
    float BL = get_offset_texture_value( -1., -1. );
    float BC = get_offset_texture_value(  0., -1. );
    float BR = get_offset_texture_value(  1., -1. );
    float CL = get_offset_texture_value( -1.,  0. );
    float CC = currentDistance; // equals: get_offset_texture_value(  0.,  0. );
    float CR = get_offset_texture_value(  1.,  0. );
    float TL = get_offset_texture_value( -1.,  1. );
    float TC = get_offset_texture_value(  0.,  1. );
    float TR = get_offset_texture_value(  1.,  1. );

    //calculate derivatives of level set
    float Dx   = ( CR - CL ) / 2.;
    float Dy   = ( TC - BC ) / 2.;
    float Dxp  = ( CR - CC );
    float Dyp  = ( TC - CC );
    float Dxm  = ( CC - CL );
    float Dym  = ( CC - BC );
    float Dxpy = ( TR - TL ) / 2.;
    float Dxmy = ( BR - BL ) / 2.;
    float Dypx = ( TR - BR ) / 2.;
    float Dymx = ( TL - BL ) / 2.;

    if( Dx == 0. || Dy == 0. ) {
        gl_FragColor = encodedDistance;
        return;
    }

    float nxp_dif = ( Dypx + Dy ) / 2.;
    float nyp_dif = ( Dxpy + Dx ) / 2.;

    float nxp_denom = sqrt( Dxp * Dxp + nxp_dif * nxp_dif );
    float nyp_denom = sqrt( Dyp * Dyp + nyp_dif * nyp_dif );

    float nxp = Dxp / ( ( nxp_denom > 0. ) ? nxp_denom : 1. );
    float nyp = Dyp / ( ( nyp_denom > 0. ) ? nyp_denom : 1. );

    float nmx_dif = ( Dymx + Dy ) / 2.;
    float nmy_dif = ( Dxmy + Dx ) / 2.;

    float nxm_denom = sqrt( Dxm * Dxm + nmx_dif * nmx_dif );
    float nym_denom = sqrt( Dym * Dym + nmy_dif * nmy_dif );

    float nxm = Dxm / ( ( nxm_denom > 0. ) ? nxm_denom : 1. );
    float nym = Dym / ( ( nym_denom > 0. ) ? nym_denom : 1. );

    //calculate mean curvature
    float H = ( nxp - nxm + nyp - nym ) / 2.;

    if( abs( BC ) == 1. ||
        abs( CL ) == 1. ||
        abs( CC ) == 1. ||
        abs( CR ) == 1. ||
        abs( TC ) == 1. ) {
            // region with (potentially) clamped values
        H = 0.;
    }

    float max_Dxp  = max(  Dxp, 0. );
    float max_mDxm = max( -Dxm, 0. );
    float max_Dyp  = max(  Dyp, 0. );
    float max_mDym = max( -Dym, 0. );
    //upwind approximation of gradient
    vec2 grad_phi_max = vec2( sqrt( max_Dxp * max_Dxp + max_mDxm * max_mDxm ), sqrt( max_Dyp * max_Dyp + max_mDym * max_mDym ) );

    float min_Dxp  = min(  Dxp, 0. );
    float min_mDxm = min( -Dxm, 0. );
    float min_Dyp  = min(  Dyp, 0. );
    float min_mDym = min( -Dym, 0. );
    vec2 grad_phi_min = vec2( sqrt( min_Dxp * min_Dxp + min_mDxm * min_mDxm ), sqrt( min_Dyp * min_Dyp + min_mDym * min_mDym ) );

    float targetValue = targetColor.x;
    //speed function pulling distance function towards areas with target intensity
    float D = epsilon - abs( sourceColor.x - targetValue );

    //speed function is composed from speed function D and curvature function H, controlled by alpha value
    //TODO curvature H is currently broken
    float speedFunction = D;//alpha * D + ( 1. - alpha ) * H;
    //choose gradient magnitude according to speed function
    float gradientMagnitude = (speedFunction > 0.) ? length( grad_phi_max ) : length( grad_phi_min );
    float updateDistance = gradientMagnitude * speedFunction;

    float finalDistance = currentDistance + updateDistance;

    //update values in distance field
    float normalizedFinalDistance = ( finalDistance + 1. ) / 2.;
    gl_FragColor = vec4( normalizedFinalDistance, gradientMagnitude, 0., 0. );


    return;
  /* when rendering to image buffer, overlay source image with segmentation region */
  } else if ( renderDistanceField == 0 ) {
    //float absDistance = abs( currentDistance );
    //float current_gradient = encodedDistance.g * 2. - 1.;
    //vec4 outputColor = vec4( (currentDistance > 0.) ? absDistance : 0., 0., (currentDistance < 0.) ? absDistance : 0., 1. );

    vec4 outputColor = sourceColor;

    //overlay region with positive distance values in distance function with color value
    if( currentDistance > 0. ) {
        outputColor += vec4( .0, .4, .6, .1 );
    }

    if( length( textureCoordinate - seedOrigin ) < 0.01  ) {
        outputColor = vec4( 0., .5, 1., 1. );
        if( length( textureCoordinate - seedOrigin ) > 0.008  ) {
                    outputColor = vec4( 0., 0., 0., 1. );
        }
    }



    gl_FragColor = outputColor;
    return;
  }

}
