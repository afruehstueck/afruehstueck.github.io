precision highp float;

attribute vec3 position;
attribute vec2 texCoord;

varying vec2 textureCoordinate;
varying vec3 pos;

void main( void ) {
  pos = position;
  gl_Position = vec4( position, 1. );
  textureCoordinate = texCoord;
}