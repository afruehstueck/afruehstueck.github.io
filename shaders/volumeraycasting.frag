precision mediump float;

uniform sampler2D uBackfaceTextureSampler;
uniform sampler2D uVolumeTextureSampler;

uniform int uCompositMode;
uniform float uWidth;
uniform float uHeight;

varying vec4 vColor;
varying vec4 vPos;
varying vec3 vTexCoords;

const float steps = 100.0;
const float numSlices = 256.0;
const float slicesX = 16.0;
const float slicesY = 16.0;

float sampleVolume(vec3 pos)
{
	vec2 tex1,tex2;
	float slice1,slice2;
	slice1 = floor(pos.z*numSlices);
	slice2 = slice1+1.0;

	float dx1,dy1, dx2,dy2;
	dx1 = fract(slice1/slicesX);
	dx2 = fract(slice2/slicesX);
	dy1 = floor(slice1/slicesY)/slicesY;
	dy2 = floor(slice2/slicesY)/slicesY;

	tex1.x = dx1+(pos.x/slicesX);
	tex2.x = dx2+(pos.x/slicesX);

	tex1.y = (-pos.y/slicesY)-dy1;
	tex2.y = (-pos.y/slicesY)-dy2;

	return mix( texture2D(uVolumeTextureSampler, tex1).x,
				texture2D(uVolumeTextureSampler, tex2).x,
				( pos.z*numSlices )-slice1);

}

void main(void)
{
	vec4 acc = vec4(0.0, 0.0, 0.0, 0.0);
	vec4 src = vec4(0.0, 0.0, 0.0, 0.0);
	vec4 dst = vec4(0.0, 0.0, 0.0, 0.0);

	vec3 rayEnd = texture2D(uBackfaceTextureSampler, gl_FragCoord.xy / vec2(uWidth, uHeight)).rgb * 2.0 - 1.0;
	vec3 rayStart = vTexCoords * 2.0 - 1.0;

	vec3 dir = rayEnd.rgb - rayStart.rgb;

	vec3 step = dir/steps;
	vec3 ray = rayStart;

	for (int i = 0; i < int(steps); ++i)
	{
		if ((uCompositMode == 2) && (dst.a >= 0.5 )) {
			break;
		}
		acc.a = sampleVolume(ray * 0.5 + 0.5);

		// do not have tf, otherwise sample it
		src = vec4(acc.aaaa);

		if (uCompositMode == 0)
		{	// MIP
			if (src.a >= dst.a)
				dst = src;
		}
		else if (uCompositMode == 1)
		{	// X-ray
			dst = dst + src;
		}
		else if (uCompositMode == 2)
		{	// Density compositing
			dst = (1.0 - dst.a) * src + dst;
		}
		ray  += step;
	}

	if (uCompositMode == 1)
		dst.a = dst.a / 15.0;

	gl_FragColor = vec4(dst.aaaa);
	//gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}