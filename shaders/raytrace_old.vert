precision highp float;

attribute vec3 position;
attribute vec3 texCoord;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

varying vec3 textureCoordinate;
varying vec3 t;
varying vec4 projectedCoordinate;
//varying vec3 worldSpaceCoordinate;
//varying vec4 projectedCoordinate;

void main() {

    //worldSpaceCoordinate = (modelMatrix * vec4(position + vec3( 0.5 ), 1.0 )).xyz;
    projectedCoordinate = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    gl_Position = projectedCoordinate;

    textureCoordinate = position * 0.5 + 0.5;//texCoord;//
    t = texCoord;
}
