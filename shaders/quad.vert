precision highp float;

attribute vec2 position;
attribute vec2 texCoord;

varying vec2 textureCoordinate;
varying vec2 pos;

void main( void ) {
  pos = position;
  gl_Position = vec4( position.x, position.y, 0., 1. );
  textureCoordinate = texCoord;
}