precision highp float;

// PDE filter.
//
// phi is updated as a function of its gradient and the image gradient


uniform sampler2D sourceTextureSampler;
uniform sampler2D distanceFieldSampler;
uniform vec2 sourceTextureSize;
uniform vec2 sourceTexelSize;
uniform vec2 seedOrigin;
uniform float seedRadius;
uniform int iteration;
uniform float epsilon;
uniform int renderDistanceField;
uniform int numberOfIterations;
uniform float edgeWeight;
uniform float alpha;

varying vec2 textureCoordinate;

//encoding a single float value to RGBA integer texture
vec4 encode_float( const in float value ) {
/*    const vec4 bit_shift = vec4( 256. * 256. * 256., 256. * 256., 256., 1. );
    const vec4 bit_mask  = vec4( 0., 1. / 256., 1. / 256., 1. / 256. );
    vec4 res = fract( value * bit_shift );
    res -= res.xxyz * bit_mask;
    return res;*/
    return vec4( value, 0., 0., 0. );
}

vec4 encode_float( const in float value1, const in float value2 ) {
/*    const vec4 bit_shift = vec4( 256. * 256. * 256., 256. * 256., 256., 1. );
    const vec4 bit_mask  = vec4( 0., 1. / 256., 1. / 256., 1. / 256. );
    vec4 res = fract( value * bit_shift );
    res -= res.xxyz * bit_mask;
    return res;*/
    return vec4( value1, value2, 0., 0. );
}

vec4 encode_float( const in float value, float min, float max ) {
    return encode_float( ( value - min ) / ( max - min ) );
}

vec4 encode_float_normalized( const in float value ) {
    //return encode_float( clamp( ( value + 1. ) / 2., 0., 1. ) );
    return encode_float( ( value + 1. ) / 2. );
}

//decoding float value from RGBA integer texture
float decode_float( const in vec4 rgba_value ) {
    /*const vec4 bit_shift = vec4( 1. / ( 256. * 256. * 256. ), 1. / ( 256. * 256. ), 1. / 256., 1. );
    float value = dot( rgba_value, bit_shift );
    return value;*/
    return rgba_value.r;
}

float decode_float( const in vec4 rgba_value, float min, float max ) {
    return decode_float( rgba_value ) * ( max - min ) + min;
}

float decode_float_normalized( const in vec4 rgba_value ) {
    //return clamp( decode_float( rgba_value ) * 2. - 1., -1., 1. );
    return decode_float( rgba_value ) * 2. - 1.;
}

vec4 initialize_distance_field( void ) {
    //vec4 color;
    float distanceToSeed = length( textureCoordinate - seedOrigin );
    float current_distance = clamp( seedRadius - distanceToSeed, -1., 1. ); //should be negative outside of radius and positive inside of radius

    //normalize to [0, 1] range

    //return encode_float_normalized( current_distance );
    float normalized_distance = ( current_distance + 1. ) / 2.;
    return vec4( normalized_distance, 0., 0., 0. );
}

float get_offset_texture_value( float offset_x, float offset_y ) {
    vec4 encoded_value = texture2D( distanceFieldSampler, textureCoordinate + vec2(offset_x, offset_y) * sourceTexelSize );
    return encoded_value.r * 2. - 1.;
}

void main( void ) {
  // First time called, fill in currentDistance transform
  // Last time called, move the label into RGB
  // Rest of the iterations, run the pde

  vec4 encoded_distance = texture2D( distanceFieldSampler, textureCoordinate );
  float current_distance = encoded_distance.r * 2. - 1.;

  //TODO this is a temporary choice in selecting the target value
  vec4 target_color = texture2D( sourceTextureSampler, seedOrigin );
  vec4 source_color = texture2D( sourceTextureSampler, textureCoordinate );

  if ( renderDistanceField == 1 && iteration == 0 ) {
    gl_FragColor = initialize_distance_field();
    return;
  } else if ( renderDistanceField == 1 && iteration > 0 && iteration <= numberOfIterations ) {
    /* calculate all the values
    | u6 | u7 | u8 |
    | u3 | u4 | u5 |
    | u0 | u1 | u2 |

    | TL | TO | TR |
    | OL | OO | OR |
    | BL | BO | BR |
    */

    float u0 = get_offset_texture_value( -1., -1. );
    float u1 = get_offset_texture_value(  0., -1. );
    float u2 = get_offset_texture_value(  1., -1. );
    float u3 = get_offset_texture_value( -1.,  0. );
//  float u4 = S ( vec2(  0.,  0. ) ); //equals current_distance
    float u4 = get_offset_texture_value(  0.,  0. );
    float u5 = get_offset_texture_value(  1.,  0. );
    float u6 = get_offset_texture_value( -1.,  1. );
    float u7 = get_offset_texture_value(  0.,  1. );
    float u8 = get_offset_texture_value(  1.,  1. );

    float Dx   = ( u5 - u3 ) / 2.;
    float Dy   = ( u7 - u1 ) / 2.;
    float Dxp  = ( u5 - u4 );
    float Dyp  = ( u7 - u4 );
    float Dxm  = ( u4 - u3 );
    float Dym  = ( u4 - u1 );
    float Dxpy = ( u8 - u6 ) / 2.;
    float Dxmy = ( u2 - u0 ) / 2.;
    float Dypx = ( u8 - u2 ) / 2.;
    float Dymx = ( u6 - u0 ) / 2.;

    if( Dx == 0. || Dy == 0. ) {
        gl_FragColor = encoded_distance;
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

    float H = ( nxp - nxm + nyp - nym ) / 2.;

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
    vec2 grad_phi_max = vec2( sqrt( max_Dxp * max_Dxp + max_mDxm * max_mDxm ), sqrt( max_Dyp * max_Dyp + max_mDym * max_mDym ) );

    float min_Dxp  = min(  Dxp, 0. );
    float min_mDxm = min( -Dxm, 0. );
    float min_Dyp  = min(  Dyp, 0. );
    float min_mDym = min( -Dym, 0. );
    vec2 grad_phi_min = vec2( sqrt( min_Dxp * min_Dxp + min_mDxm * min_mDxm ), sqrt( min_Dyp * min_Dyp + min_mDym * min_mDym ) );

    //epsilon = 0.2;
    float target_value = target_color.x;
    //TODO consider which intensity value is used
    float D = epsilon - abs( source_color.x - target_value );

    float speed_function = D;//alpha * D + ( 1. - alpha ) * H;
    float gradient_mag = (speed_function > 0.) ? length( grad_phi_max ) : length( grad_phi_min );
    float update_value = gradient_mag * speed_function;

    float final_value = current_distance + update_value;

    float normalized_final_value = ( final_value + 1. ) / 2.;
    gl_FragColor = vec4( normalized_final_value, gradient_mag, 0., 0. );
    //gl_FragColor = encode_float_normalized( ( final_value > 0. ) ? 0.5 : 1. );


    return;
  } else if ( renderDistanceField == 0 ) {
    float absDistance = abs( current_distance );
    float current_gradient = encoded_distance.g * 2. - 1.;
    //vec4 outputColor = vec4( (current_distance > 0.) ? absDistance : 0., 0., (current_distance < 0.) ? absDistance : 0., 1. );

    vec4 outputColor = source_color;

    float eps = 0.008;
    /* draw outline of border */
    /*if ( absDistance <= ( ( current_gradient > 0. ) ? eps / current_gradient : eps ) ) {
        outputColor += vec4( .0, .4, .6, 1. );
    }*/
    if( current_distance > 0. ) {
        outputColor += vec4( .0, .4, .6, max( .1 - current_distance, 0. ) );
    }

    gl_FragColor = outputColor;
    return;
  }

}
