precision highp float;

attribute vec3 position;
attribute vec3 texCoord;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

varying vec3 worldSpaceCoordinate;
varying vec3 textureCoordinate;
varying vec4 projectedCoordinate;

void main( void ) {
	worldSpaceCoordinate = position;// + vec3( 0.5 );
    textureCoordinate = texCoord;
    //worldSpaceCoordinate = position.xyz * 0.5 + 0.5;

    projectedCoordinate = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	gl_Position = projectedCoordinate;
}