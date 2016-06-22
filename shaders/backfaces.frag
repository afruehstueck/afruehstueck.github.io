precision highp float;

varying vec3 worldSpaceCoordinate;
varying vec3 textureCoordinate;

void main( void ) {
	//vec3 positionScaled = pos.xyz * 0.5 + 0.5;
	gl_FragColor = vec4( worldSpaceCoordinate.xyz, 1.0 );
}