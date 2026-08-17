"use client"

import { useEffect, useRef } from "react"

export function useScenePresence(rootMargin = "-10% 0px") {
  const sceneRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const scene = sceneRef.current

    if (!scene) return

    scene.dataset.presence = "ready"

    if (!("IntersectionObserver" in window)) {
      scene.dataset.presence = "visible"
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return

        scene.dataset.presence = "visible"
        observer.disconnect()
      },
      { rootMargin, threshold: 0.05 },
    )

    observer.observe(scene)

    return () => observer.disconnect()
  }, [rootMargin])

  return sceneRef
}
