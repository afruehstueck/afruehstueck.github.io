#version 300 es

precision highp float;
precision highp int;

in vec3 position;
in vec3 texCoord;

out vec3 textureCoordinate;
out vec3 worldSpaceCoordinate;
out vec4 projectedCoordinate;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main( void ) {
	worldSpaceCoordinate = position;// + vec3( 0.5 );
    textureCoordinate = texCoord;
    //worldSpaceCoordinate = position.xyz * 0.5 + 0.5;

    projectedCoordinate = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	gl_Position = projectedCoordinate;
}