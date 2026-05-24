"use client"

import { useRef, useEffect, useState } from "react"
import { useFrame } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import type { Group } from "three"

function clampScale(scale: number, cameraZ: number, fov: number, maxScreenFraction = 0.9) {
  const vFOV = (fov * Math.PI) / 180
  const visibleHeight = 2 * Math.tan(vFOV / 2) * cameraZ
  const maxRadius = (visibleHeight / 2) * maxScreenFraction
  return Math.min(scale, maxRadius)
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function Football({ progress, scrollProgress }: { progress: number; scrollProgress: number }) {
  const group = useRef<Group>(null)
  const { scene } = useGLTF("/football.glb", true)
  const spinRef = useRef(0)

  const t = easeInOutCubic(progress)

  let x = -20 + 20 * t
  let y = 10 - 17 * t - 4 * Math.sin(Math.PI * t)
  const z = 0
  let scale = 1 + 100 * t

  if (progress >= 1 && scrollProgress > 0) {
    const scrollEased = easeInOutCubic(scrollProgress)
    const centerX = 0
    const centerScale = 101

    if (scrollProgress <= 0.5) {
      const scaleProgress = scrollProgress / 0.5
      const scaleEased = easeInOutCubic(scaleProgress)
      const finalScale = 7
      scale = centerScale - (centerScale - finalScale) * scaleEased
      x = x - (x - -0.9) * scaleEased
      y = y - (y - -1) * scaleEased
    } else {
      const slideProgress = (scrollProgress - 0.5) / 0.5
      const slideEased = easeInOutCubic(slideProgress)


      scale = 7 - (7 - 15) * slideEased

    x=-0.9
      y = -1
    }
  }

  useFrame((state, delta) => {
    let spin
    if (progress < 1) {
      spin = t * 3 * Math.PI
      spinRef.current = spin
    } else {
      spinRef.current += delta * 1
      spin = spinRef.current
    }

    if (group.current) {
      group.current.position.x = x
      group.current.position.y = y
      group.current.position.z = z
      group.current.scale.set(scale, scale, scale)
      group.current.rotation.set(0, spin, 0)
    }
  })

  return <primitive ref={group} object={scene} />
}

interface FootballSceneProps {
  onAnimationComplete?: () => void
  onShowText?: (show: boolean) => void
}

export default function FootballScene({ onAnimationComplete, onShowText }: FootballSceneProps) {
  const [progress, setProgress] = useState(0)
  const [keyPressed, setKeyPressed] = useState(false)
  const [keyAnimationProgress, setKeyAnimationProgress] = useState(0)
  const [animationComplete, setAnimationComplete] = useState(false)
  const [showText, setShowText] = useState(false)
  const [notified, setNotified] = useState(false)

  // Dispatch custom events for navigation control
  const dispatchFootballSceneEvent = (eventType: 'start' | 'end') => {
    const event = new CustomEvent(`football-scene-${eventType}`)
    window.dispatchEvent(event)
  }

  // Initial animation
  useEffect(() => {
    // Dispatch start event when component mounts
    dispatchFootballSceneEvent('start')
    
    let start: number | null = null
    let animationFrame: number
    const totalDuration = 2500

    function animate(ts: number) {
      if (!start) start = ts
      const elapsed = ts - start
      const prog = Math.min(elapsed / totalDuration, 1)
      setProgress(prog)

      if (prog < 1) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        setAnimationComplete(true)
      }
    }
    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [])

  // Key press animation
  useEffect(() => {
    function handleKeyPress() {
      if (animationComplete && !keyPressed) {
        console.log("Key pressed, starting animation")
        setKeyPressed(true)
        
        let start: number | null = null
        let animationFrame: number
        const totalDuration = 3000

        function animateKey(ts: number) {
          if (!start) start = ts
          const elapsed = ts - start
          const prog = Math.min(elapsed / totalDuration, 1)
          setKeyAnimationProgress(prog)

          // Trigger text reveal when animation reaches 50%
          if (prog < 0.5 && !showText) {
            console.log("Ball animation reached 50%, showing text")
            
          }
          else if (prog >= 0.5 && !showText) {
            console.log("Ball animation reached 50%, showing text")
            setShowText(true)
          }

          if (prog < 1) {
            animationFrame = requestAnimationFrame(animateKey)
          } else {
            console.log("Key animation complete")
            // Dispatch end event when animation completes
            dispatchFootballSceneEvent('end')
          }
        }
        animationFrame = requestAnimationFrame(animateKey)
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [animationComplete, keyPressed, showText])

  // Notify parent component when text should show
  useEffect(() => {
    if (onShowText) {
      onShowText(showText)
    }
  }, [showText, onShowText])

  // Trigger external callback when final text is shown (once)
  useEffect(() => {
    if (showText && !notified) {
      setNotified(true)
      onAnimationComplete && onAnimationComplete()
    }
  }, [showText, notified, onAnimationComplete])

  // Click handler for text (optional additional show trigger)
  useEffect(() => {
    function handleClick() {
      if (animationComplete && !keyPressed) {
        console.log("Click detected, starting animation")
        setKeyPressed(true)
        
        let start: number | null = null
        let animationFrame: number
        const totalDuration = 3000

        function animateKey(ts: number) {
          if (!start) start = ts
          const elapsed = ts - start
          const prog = Math.min(elapsed / totalDuration, 1)
          setKeyAnimationProgress(prog)

          // Trigger text reveal when animation reaches 50%
          if (prog >= 0.5 && !showText) {
            console.log("Ball animation reached 50%, showing text")
            setShowText(true)
          }

          if (prog < 1) {
            animationFrame = requestAnimationFrame(animateKey)
          } else {
            console.log("Click animation complete")
            // Dispatch end event when animation completes
            dispatchFootballSceneEvent('end')
          }
        }
        animationFrame = requestAnimationFrame(animateKey)
      }
    }

    window.addEventListener("click", handleClick)
    return () => window.removeEventListener("click", handleClick)
  }, [animationComplete, keyPressed, showText])

  // Cleanup: dispatch end event when component unmounts
  useEffect(() => {
    return () => {
      dispatchFootballSceneEvent('end')
    }
  }, [])

  return (
    <>
      <Football progress={progress} scrollProgress={keyAnimationProgress} />
    </>
  )
}