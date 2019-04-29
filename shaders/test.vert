precision highp float;

attribute vec3 position;
attribute vec2 texCoord;

varying vec2 textureCoordinate;

void main( void ) {
  gl_Position = vec4( position, 1. );
  textureCoordinate = texCoord;
}