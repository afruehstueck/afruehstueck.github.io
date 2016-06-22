attribute vec3 aPosition;
attribute vec4 aColor;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying vec4 vColor;
varying vec4 vPos;
varying vec3 vTexCoords;

void main(void)
{
	gl_Position = uPMatrix * uMVMatrix * vec4(aPosition, 1.0);
	vTexCoords = aPosition.xyz * 0.5 + 0.5;
	vColor = aColor;
}