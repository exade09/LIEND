/**
 * Goodbye Dream Clouds by teadrinker.
 * Copyright (c) 2026 @teadrinker.
 * Original: https://fragcoord.xyz/s/gcbixaag
 * License: https://creativecommons.org/licenses/by-nc-sa/4.0/
 *
 * The rendering model and alpha values are preserved. Only the RGB palette
 * and the noise lookup texture coordinates are adapted for LONS/WebGL2.
 */

export const FULLSCREEN_VERTEX_SHADER = `#version 300 es
precision highp float;

const vec2 POSITIONS[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2( 3.0, -1.0),
  vec2(-1.0,  3.0)
);

void main() {
  gl_Position = vec4(POSITIONS[gl_VertexID], 0.0, 1.0);
}
`

export const NOISE_FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp int;

out vec4 fragColor;

#define NOISE_LOOKUP_SIZE 256

float hash(uvec2 q) {
  q *= uvec2(1597334677U, 3812015801U);
  uint n = (q.x ^ q.y) * 1597334677U;
  return float(n ^ (n >> 15)) * (1.0 / float(0xffffffffU));
}

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  if (coord.x >= NOISE_LOOKUP_SIZE + 1 || coord.y >= NOISE_LOOKUP_SIZE + 1) {
    fragColor = vec4(0.0);
    return;
  }

  uvec2 pos = uvec2(coord) % uint(NOISE_LOOKUP_SIZE);
  uvec2 zOffset = uvec2(99, 111);
  float r = hash(pos);
  float g = hash((pos + zOffset) % uint(NOISE_LOOKUP_SIZE));
  fragColor = vec4(r, g, 0.0, 1.0);
}
`

export const CLOUD_FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec4 u_mouse;
uniform sampler2D u_pass1;

out vec4 fragColor;

#define NOISE_LOOKUP_SIZE 256
#define NOISE_TEXTURE_SIZE 257.0

#define _BaseSize          0.18
#define _BaseOffset        0.2
#define _BaseGradient     -1.8
#define _Animate           1.0
#define _AnimateBase       0.53
#define _AnimateDetail    -0.11
#define _AnimateDetail2    0.1
#define _AnimateBaseV      vec3(0.0, 0.00, 1.00)
#define _AnimateDetailV    vec3(1.0, 0.31, 0.55)
#define _AnimateDetail2V   vec3(1.0, 0.00, 0.00)
#define _BaseShape         1.54
#define _BaseWeight        2.06
#define _DetailWeight      0.93
#define _DetailCombine    -0.25
#define _DensityCutoff     0.47

// LONS palette. Original alpha values are intentionally unchanged.
#define _LowDensityColor   vec4(0.725490, 0.647059, 1.000000, 0.043)
#define _HighDensityColor  vec4(0.192157, 0.333333, 0.960784, 0.270)
#define _SunColor          vec4(0.349020, 0.909804, 1.000000, 0.620)
#define _BackgroundC       vec4(0.933333, 0.941176, 1.000000, 0.886)
#define _BackgroundSunC    vec4(0.545098, 0.388235, 1.000000, 0.317)

#define _BackgroundSunSize 0.22
#define _Near              6.0
#define _Far               42.0
#define _FarFade           0.75
#define _SunDir            vec3(-0.61, -0.1, 1.96)
#define _SunCurve          0.286
#define _SunOffset         0.963
#define _Gamma             4.0
#define _DetailCutoff     -0.4
#define _AlphaMax          0.93
#define _StepSizeInside    0.27
#define _StepSizeOutside   0.66
#define _Jitter            2.0
#define Loop_Max           159

float hashu(uvec2 q) {
  q *= uvec2(1597334677U, 3812015801U);
  uint n = (q.x ^ q.y) * 1597334677U;
  return float(n) * (1.0 / float(0xffffffffU));
}

float hash(vec2 n) {
  return hashu(uvec2(n * 9e5));
}

float noise(vec3 c) {
  vec3 p = floor(c);
  vec3 f = fract(c);
  f = f * f * (3.0 - 2.0 * f);
  vec2 zShift = vec2(99.0, 111.0) * mod(p.z, float(NOISE_LOOKUP_SIZE));
  vec2 base = mod(p.xy + zShift, float(NOISE_LOOKUP_SIZE));
  vec2 uv = base + f.xy + 0.5;
  vec2 rg = textureLod(u_pass1, uv / vec2(NOISE_TEXTURE_SIZE), 0.0).rg;
  return mix(rg.r, rg.g, f.z) * 2.0 - 1.0;
}

float cloudDensity(vec3 p, float len) {
  float linearField = (p.y * _BaseGradient + _BaseOffset) * _BaseWeight;
  if (linearField < -_BaseWeight) return -1000.0;

  float time = u_time * _Animate;
  p += time * _AnimateBase * _AnimateBaseV;

  float baseNoise = noise(
    mat3(
      0.5, -0.5, 0.70711,
      0.85355, 0.14644, -0.5,
      0.14644, 0.85355, 0.5
    ) * p
  );

  float normalizedDensity = 0.5 + 0.5 * baseNoise;
  normalizedDensity = pow(normalizedDensity, _BaseShape);
  float density = _BaseWeight * (normalizedDensity * 2.0 - 1.0);
  density += linearField;

  if (density > _DetailCutoff) {
    p += time * _AnimateDetail * _AnimateDetailV;
    float detail = 0.28 * noise(p * 5.0);
    detail += 0.2 * noise(p * 10.1);
    p += time * _AnimateDetail2 * _AnimateDetail2V;
    detail += 0.1 * noise(p * 22.52);

    float fadeDistance = 6.0;
    if (len < fadeDistance) {
      detail += 0.057 * noise(p * 54.28);
      float fadeByDistance = (fadeDistance - len) / fadeDistance;
      detail += 0.1 * fadeByDistance * noise(p * 154.28);
    }

    density += _DetailWeight * detail *
      (1.0 - _DetailCombine * (normalizedDensity - 0.5));
  }

  return density;
}

float gammaMap(float color) { return pow(color, _Gamma); }
vec3 gammaMap(vec3 color) { return pow(color, vec3(_Gamma)); }
vec4 gammaMap(vec4 color) {
  color.rgb = pow(color.rgb, vec3(_Gamma));
  return color;
}

vec4 rayMarch(vec3 rayOrigin, vec3 rayDirection, vec2 uv) {
  float len = _Jitter * hash(uv + fract(u_time));
  vec4 sum = vec4(0.0);
  float depthAlphaSum = 0.0;

  vec4 lowDensityColor = gammaMap(_LowDensityColor);
  vec4 highDensityColor = gammaMap(_HighDensityColor);
  vec3 sunColor = gammaMap(_SunColor).rgb;
  float ambient = gammaMap(_SunColor.a);

  for (int iteration = 0; iteration < Loop_Max; ++iteration) {
    vec3 position = (rayOrigin + len * rayDirection) * _BaseSize;
    float density = cloudDensity(position, len * _BaseSize);

    if (density < -100.0 && sign(_BaseGradient) * rayDirection.y < 0.0) break;

    if (density > _DensityCutoff) {
      float sunDifference = cloudDensity(
        position + 0.06 * normalize(_SunDir),
        len * _BaseSize
      ) - density;
      float sunCurve = pow(
        max(0.0, _SunOffset - position.y * _BaseGradient * _SunCurve),
        8.0
      );
      float sun = max(0.0, -sunCurve * sunDifference / 0.2);

      density = clamp(density, 0.0, 1.0);
      vec4 color = mix(lowDensityColor, highDensityColor, density);
      color.rgb *= ambient + sunColor * sun * 5.0;
      color.a *= min(1.0, len / _Near);

      float weight = color.a * (1.0 - sum.a);
      depthAlphaSum += weight * smoothstep(
        1.0 - _FarFade,
        1.0,
        len / _Far
      );
      sum.rgb += weight * color.rgb;
      sum.a += weight;
    }

    len += density > _DetailCutoff ? _StepSizeInside : _StepSizeOutside;
    if (len > _Far || sum.a > _AlphaMax) break;
  }

  float depthAlpha = 1.0 - depthAlphaSum / (sum.a + 0.00001);
  sum.a = (sum.a / _AlphaMax) * depthAlpha;
  sum.a = min(1.0, sum.a);
  return sum;
}

vec4 renderPixel(vec3 rayOrigin, vec3 rayDirection, vec2 uv) {
  vec4 color = rayMarch(rayOrigin, rayDirection, uv);
  float sun = 0.5 + 0.5 * dot(normalize(_SunDir), rayDirection);
  sun = pow(
    1.0 - pow(1.0 - sun, _BackgroundSunSize),
    1.0 / _BackgroundSunSize
  ) * 5.0;
  sun *= 1.0 + color.a * 6.0;

  vec4 background = gammaMap(_BackgroundC) +
    _BackgroundSunC.a * sun * gammaMap(_BackgroundSunC);
  color = mix(background, vec4(color.rgb, 1.0), color.a);
  color.rgb = pow(color.rgb, vec3(1.0 / _Gamma));
  color.rgb *= max(1.0, color.a);
  color.a = min(1.0, color.a);
  return color;
}

vec2 rotate2d(vec2 point, float angle) {
  float sine = sin(angle);
  float cosine = cos(angle);
  return vec2(
    point.x * cosine - point.y * sine,
    point.x * sine + point.y * cosine
  );
}

vec3 cameraRayDirection(
  vec2 uv,
  float aspect,
  vec3 position,
  vec3 target,
  float fieldOfView,
  float roll
) {
  vec3 forward = normalize(target - position);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
  vec3 up = normalize(cross(forward, right));
  float halfHeight = tan(fieldOfView * 0.5);
  uv = (2.0 * uv - 1.0) * vec2(halfHeight * aspect, halfHeight);
  vec2 rotatedUv = mat2(cos(roll), -sin(roll), sin(roll), cos(roll)) * uv;
  return normalize(forward + rotatedUv.x * right + rotatedUv.y * up);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 mouse = (u_mouse.xy - 0.5 * u_resolution.xy) / u_resolution.y;

  vec3 cameraPosition = vec3(0.0, 1.7, -3.0);
  vec3 cameraTarget = vec3(0.0, 1.7, 6.0);

  float orbit = 0.0;
  float upDown = 0.0;
  if (u_mouse.z > 0.0) {
    upDown = clamp(-4.0 * mouse.y, -1.570795, 1.570795);
    orbit = -4.0 * mouse.x;
  }

  cameraPosition -= cameraTarget;
  cameraPosition.yz = rotate2d(cameraPosition.yz, upDown);
  cameraPosition.xz = rotate2d(cameraPosition.xz, orbit);
  cameraPosition += cameraTarget;

  vec3 rayOrigin = cameraPosition + vec3(125.0, 0.0, 64.0);
  vec3 rayDirection = cameraRayDirection(
    uv,
    aspect,
    cameraPosition,
    cameraTarget,
    radians(40.0),
    0.0
  );

  fragColor = renderPixel(rayOrigin, rayDirection, uv);
}
`
