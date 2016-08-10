#version 300 es

precision highp float;
precision highp int;

in vec2 position;
in vec2 texCoord;

out vec2 textureCoordinate;
out vec2 pos;

void main( void ) {
  pos = position;
  gl_Position = vec4( position.x, position.y, 0., 1. );
  textureCoordinate = texCoord;
}