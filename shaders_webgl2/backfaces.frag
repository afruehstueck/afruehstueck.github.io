#version 300 es
precision highp float;

in vec3 worldSpaceCoordinate;
in vec3 textureCoordinate;

out vec4 color;

void main( void ) {
	vec3 positionScaled = worldSpaceCoordinate.xyz * 0.5 + 0.5;
	color = vec4( positionScaled.xyz, 1.0 );
}