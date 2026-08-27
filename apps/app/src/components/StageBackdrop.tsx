"use client"

import { useEffect, useRef } from "react"
import {
  CLOUD_FRAGMENT_SHADER,
  FULLSCREEN_VERTEX_SHADER,
  NOISE_FRAGMENT_SHADER,
} from "@/shaders/goodbyeDreamClouds"
import styles from "./StageBackdrop.module.css"

const NOISE_TEXTURE_SIZE = 257
const MAX_RENDER_PIXELS = 1_250_000
const MAX_DEVICE_PIXEL_RATIO = 1
const FRAME_INTERVAL_MS = 1000 / 30

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error("Unable to allocate a WebGL shader")

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "Unknown shader compilation error"
    gl.deleteShader(shader)
    throw new Error(log)
  }

  return shader
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()

  if (!program) {
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    throw new Error("Unable to allocate a WebGL program")
  }

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "Unknown shader linking error"
    gl.deleteProgram(program)
    throw new Error(log)
  }

  return program
}

function requiredUniform(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
) {
  const location = gl.getUniformLocation(program, name)
  if (location === null) throw new Error(`Missing shader uniform: ${name}`)
  return location
}

/** Full-screen LIEND-colored volumetric cloud shader. Decorative only. */
export function StageBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      desynchronized: true,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      stencil: false,
    })

    if (!gl) {
      canvas.dataset.state = "fallback"
      return
    }

    let animationFrame = 0
    let resizeObserver: ResizeObserver | undefined
    let cloudProgram: WebGLProgram | undefined
    let noiseProgram: WebGLProgram | undefined
    let noiseTexture: WebGLTexture | undefined
    let noiseFramebuffer: WebGLFramebuffer | undefined
    let vertexArray: WebGLVertexArrayObject | undefined

    try {
      cloudProgram = createProgram(gl, FULLSCREEN_VERTEX_SHADER, CLOUD_FRAGMENT_SHADER)
      noiseProgram = createProgram(gl, FULLSCREEN_VERTEX_SHADER, NOISE_FRAGMENT_SHADER)
      vertexArray = gl.createVertexArray() ?? undefined
      noiseTexture = gl.createTexture() ?? undefined
      noiseFramebuffer = gl.createFramebuffer() ?? undefined

      if (!vertexArray || !noiseTexture || !noiseFramebuffer) {
        throw new Error("Unable to allocate the cloud rendering targets")
      }

      const renderProgram = cloudProgram
      const lookupTexture = noiseTexture

      gl.bindVertexArray(vertexArray)
      gl.bindTexture(gl.TEXTURE_2D, lookupTexture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        NOISE_TEXTURE_SIZE,
        NOISE_TEXTURE_SIZE,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      )

      gl.bindFramebuffer(gl.FRAMEBUFFER, noiseFramebuffer)
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        noiseTexture,
        0,
      )

      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error("The cloud noise framebuffer is incomplete")
      }

      gl.viewport(0, 0, NOISE_TEXTURE_SIZE, NOISE_TEXTURE_SIZE)
      gl.useProgram(noiseProgram)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      const resolutionUniform = requiredUniform(gl, renderProgram, "u_resolution")
      const timeUniform = requiredUniform(gl, renderProgram, "u_time")
      const mouseUniform = requiredUniform(gl, renderProgram, "u_mouse")
      const noiseUniform = requiredUniform(gl, renderProgram, "u_pass1")
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
      const startedAt = performance.now()
      let lastFrameAt = Number.NEGATIVE_INFINITY
      let renderedStaticFrame = false
      let drawingWidth = 0
      let drawingHeight = 0

      const resize = () => {
        const bounds = canvas.getBoundingClientRect()
        const cssWidth = Math.max(1, bounds.width)
        const cssHeight = Math.max(1, bounds.height)
        const pixelBudgetRatio = Math.sqrt(MAX_RENDER_PIXELS / (cssWidth * cssHeight))
        const renderRatio = Math.min(
          window.devicePixelRatio || 1,
          MAX_DEVICE_PIXEL_RATIO,
          pixelBudgetRatio,
        )
        const nextWidth = Math.max(1, Math.round(cssWidth * renderRatio))
        const nextHeight = Math.max(1, Math.round(cssHeight * renderRatio))

        if (nextWidth === drawingWidth && nextHeight === drawingHeight) return
        drawingWidth = nextWidth
        drawingHeight = nextHeight
        canvas.width = drawingWidth
        canvas.height = drawingHeight
        renderedStaticFrame = false
      }

      resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(canvas)
      resize()

      const render = (now: number) => {
        animationFrame = window.requestAnimationFrame(render)
        if (document.hidden || drawingWidth === 0 || drawingHeight === 0) return
        if (reducedMotion.matches && renderedStaticFrame) return
        if (!reducedMotion.matches && now - lastFrameAt < FRAME_INTERVAL_MS) return

        lastFrameAt = now
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.viewport(0, 0, drawingWidth, drawingHeight)
        gl.useProgram(renderProgram)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, lookupTexture)
        gl.uniform1i(noiseUniform, 0)
        gl.uniform2f(resolutionUniform, drawingWidth, drawingHeight)
        gl.uniform1f(timeUniform, reducedMotion.matches ? 0 : (now - startedAt) / 1000)
        gl.uniform4f(mouseUniform, 0, 0, -1, -1)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        renderedStaticFrame = true
      }

      animationFrame = window.requestAnimationFrame(render)
    } catch (error) {
      canvas.dataset.state = "fallback"
      console.error("LIEND cloud background could not start", error)
    }

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver?.disconnect()
      if (noiseFramebuffer) gl.deleteFramebuffer(noiseFramebuffer)
      if (noiseTexture) gl.deleteTexture(noiseTexture)
      if (cloudProgram) gl.deleteProgram(cloudProgram)
      if (noiseProgram) gl.deleteProgram(noiseProgram)
      if (vertexArray) gl.deleteVertexArray(vertexArray)
    }
  }, [])

  return (
    <div className={styles.stage} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.wash} />
    </div>
  )
}
