"use client"

import { useEffect, useRef } from "react"

const VERTEX_SOURCE = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

/*
 * Adapted from "Bromine Clouds" by @Kaso:
 * https://fragcoord.xyz/s/b6749csy
 * SPDX-License-Identifier: CC-BY-SA-4.0
 * Palette, pacing and composition adapted for STAYFI.
 */
const FRAGMENT_SOURCE = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_tone;
out vec4 fragColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 5; octave++) {
    value += amplitude * noise(p);
    p = p * 2.02 + vec2(7.1, 3.7);
    amplitude *= 0.5;
  }
  return value;
}

vec3 stayfiPalette(float t, float tone) {
  vec3 cobalt = vec3(0.055, 0.18, 0.76);
  vec3 cyan = vec3(0.18, 0.91, 1.0);
  vec3 violet = vec3(0.47, 0.24, 0.94);
  vec3 midnight = vec3(0.015, 0.025, 0.10);
  vec3 bright = mix(cyan, violet, smoothstep(0.18, 0.86, t));
  bright = mix(bright, cobalt, 0.28 + 0.18 * sin(t * 6.28318));
  return mix(mix(midnight, bright, 0.72), mix(midnight, violet, 0.82), tone * 0.28);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv - 0.5;
  p.x *= u_resolution.x / u_resolution.y;
  float time = u_time * 0.034;
  vec2 flow = vec2(
    fbm(p * 1.8 + vec2(time * 0.6, time)),
    fbm(p * 1.8 + vec2(-time, time * 0.4))
  );
  vec2 q = p + 0.30 * (flow - 0.5);
  float broad = fbm(q * 2.6 + time);
  float detail = fbm(q * 5.2 - time * 1.2);
  float clouds = smoothstep(0.32, 0.92, broad + 0.55 * detail);
  float radial = exp(-2.5 * length(q)) * (0.72 + 0.28 * sin(time * 2.0 + broad * 5.0));
  float intensity = clouds * 0.62 + radial;
  float field = fbm(q * 1.9 + intensity + time);
  vec3 color = stayfiPalette(field + intensity * 0.44, u_tone);
  color += mix(vec3(0.08, 0.42, 1.0), vec3(0.44, 0.18, 1.0), u_tone) * radial * 0.55;
  color *= 0.40 + intensity * 1.42;
  color = 1.0 - exp(-color);
  float edge = smoothstep(0.94, 0.18, length(p * vec2(0.72, 1.0)));
  fragColor = vec4(color, 0.56 + edge * 0.24);
}`

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error("Shader allocation failed")
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Shader compilation failed"
    gl.deleteShader(shader)
    throw new Error(message)
  }
  return shader
}

export function AtmosphereBackdrop({ tone = 0, className = "" }: { tone?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, powerPreference: "low-power" })
    if (!gl) return

    let frame = 0
    let visible = true
    const startedAt = performance.now()

    try {
      const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SOURCE)
      const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE)
      const program = gl.createProgram()
      if (!program) throw new Error("Program allocation failed")
      gl.attachShader(program, vertex)
      gl.attachShader(program, fragment)
      gl.linkProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "Program link failed")

      const buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const position = gl.getAttribLocation(program, "a_position")
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
      const resolution = gl.getUniformLocation(program, "u_resolution")
      const time = gl.getUniformLocation(program, "u_time")
      const toneLocation = gl.getUniformLocation(program, "u_tone")
      const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches

      const resize = () => {
        const dpr = Math.min(devicePixelRatio || 1, 1.35)
        const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
        const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width
          canvas.height = height
        }
      }

      const draw = (now: number) => {
        resize()
        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.useProgram(program)
        gl.uniform2f(resolution, canvas.width, canvas.height)
        gl.uniform1f(time, reducedMotion ? 18 : (now - startedAt) / 1000)
        gl.uniform1f(toneLocation, tone)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        if (!reducedMotion && visible) frame = requestAnimationFrame(draw)
      }

      const intersection = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting
        if (visible && !frame) frame = requestAnimationFrame(draw)
        if (!visible && frame) {
          cancelAnimationFrame(frame)
          frame = 0
        }
      }, { rootMargin: "120px" })
      intersection.observe(canvas)
      frame = requestAnimationFrame(draw)

      return () => {
        intersection.disconnect()
        if (frame) cancelAnimationFrame(frame)
        gl.deleteBuffer(buffer)
        gl.deleteProgram(program)
      }
    } catch (error) {
      console.error("STAYFI atmosphere could not start", error)
    }
  }, [tone])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
