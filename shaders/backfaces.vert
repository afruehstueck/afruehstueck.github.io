precision highp float;

attribute vec3 position;
attribute vec3 texCoord;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

varying vec3 worldSpaceCoordinate;
varying vec3 textureCoordinate;

void main( void ) {
	worldSpaceCoordinate = position + vec3( 0.5 );
    textureCoordinate = texCoord;
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}