"use client"

import React, { useEffect, useRef, useCallback, useMemo } from "react"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Trophy, Star, MapPin, Calendar } from "lucide-react"
import Image from "next/image"

const DEFAULT_BEHIND_GRADIENT =
  "radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y),hsla(266,100%,90%,var(--card-opacity)) 4%,hsla(266,50%,80%,calc(var(--card-opacity)*0.75)) 10%,hsla(266,25%,70%,calc(var(--card-opacity)*0.5)) 50%,hsla(266,0%,60%,0) 100%),radial-gradient(35% 52% at 55% 20%,#00ffaac4 0%,#073aff00 100%),radial-gradient(100% 100% at 50% 50%,#00c1ffff 1%,#073aff00 76%),conic-gradient(from 124deg at 50% 50%,#c137ffff 0%,#07c6ffff 40%,#07c6ffff 60%,#c137ffff 100%)"

const DEFAULT_INNER_GRADIENT =
  "linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)"

const ANIMATION_CONFIG = {
  SMOOTH_DURATION: 600,
  INITIAL_DURATION: 1500,
  INITIAL_X_OFFSET: 70,
  INITIAL_Y_OFFSET: 60,
} as const

interface Player {
  name: string
  position: string
  team: string
  rating: number
  value: string
  age: number
  height: string
  nationality: string
  goals: number
  assists: number
  games: number
  image?: string
}

interface ProfileCardProps {
  player: Player
  className?: string
  enableTilt?: boolean
  onSelect?: (player: Player) => void
  showStats?: boolean
  compact?: boolean
}

const clamp = (value: number, min = 0, max = 100): number =>
  Math.min(Math.max(value, min), max)

const round = (value: number, precision = 3): number =>
  parseFloat(value.toFixed(precision))

const adjust = (
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number
): number =>
  round(toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin))

const easeInOutCubic = (x: number): number =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

export default function ProfileCard({
  player,
  className = "",
  enableTilt = true,
  onSelect,
  showStats = true,
  compact = false
}: ProfileCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const animationHandlers = useMemo(() => {
    if (!enableTilt) return null

    let rafId: number | null = null

    const updateCardTransform = (
      offsetX: number,
      offsetY: number,
      card: HTMLElement,
      wrap: HTMLElement
    ) => {
      const width = card.clientWidth
      const height = card.clientHeight

      const percentX = clamp((100 / width) * offsetX)
      const percentY = clamp((100 / height) * offsetY)

      const centerX = percentX - 50
      const centerY = percentY - 50

      const properties = {
        "--pointer-x": `${percentX}%`,
        "--pointer-y": `${percentY}%`,
        "--background-x": `${adjust(percentX, 0, 100, 35, 65)}%`,
        "--background-y": `${adjust(percentY, 0, 100, 35, 65)}%`,
        "--pointer-from-center": `${clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1)}`,
        "--pointer-from-top": `${percentY / 100}`,
        "--pointer-from-left": `${percentX / 100}`,
        "--rotate-x": `${round(-(centerX / 5))}deg`,
        "--rotate-y": `${round(centerY / 4)}deg`,
      }

      Object.entries(properties).forEach(([property, value]) => {
        wrap.style.setProperty(property, value)
      })
    }

    const createSmoothAnimation = (
      duration: number,
      startX: number,
      startY: number,
      card: HTMLElement,
      wrap: HTMLElement
    ) => {
      const startTime = performance.now()
      const targetX = wrap.clientWidth / 2
      const targetY = wrap.clientHeight / 2

      const animationLoop = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = clamp(elapsed / duration)
        const easedProgress = easeInOutCubic(progress)

        const currentX = adjust(easedProgress, 0, 1, startX, targetX)
        const currentY = adjust(easedProgress, 0, 1, startY, targetY)

        updateCardTransform(currentX, currentY, card, wrap)

        if (progress < 1) {
          rafId = requestAnimationFrame(animationLoop)
        }
      }

      rafId = requestAnimationFrame(animationLoop)
    }

    return {
      updateCardTransform,
      createSmoothAnimation,
      cancelAnimation: () => {
        if (rafId) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
      },
    }
  }, [enableTilt])

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const card = cardRef.current
      const wrap = wrapRef.current

      if (!card || !wrap || !animationHandlers) return

      const rect = card.getBoundingClientRect()
      animationHandlers.updateCardTransform(
        event.clientX - rect.left,
        event.clientY - rect.top,
        card,
        wrap
      )
    },
    [animationHandlers]
  )

  const handlePointerEnter = useCallback(() => {
    const card = cardRef.current
    const wrap = wrapRef.current

    if (!card || !wrap || !animationHandlers) return

    animationHandlers.cancelAnimation()
    wrap.classList.add("active")
    card.classList.add("active")
  }, [animationHandlers])

  const handlePointerLeave = useCallback(
    (event: PointerEvent) => {
      const card = cardRef.current
      const wrap = wrapRef.current

      if (!card || !wrap || !animationHandlers) return

      animationHandlers.createSmoothAnimation(
        ANIMATION_CONFIG.SMOOTH_DURATION,
        event.offsetX,
        event.offsetY,
        card,
        wrap
      )
      wrap.classList.remove("active")
      card.classList.remove("active")
    },
    [animationHandlers]
  )

  useEffect(() => {
    const card = cardRef.current
    if (!card || !animationHandlers) return

    card.addEventListener("pointermove", handlePointerMove)
    card.addEventListener("pointerenter", handlePointerEnter)
    card.addEventListener("pointerleave", handlePointerLeave)

    return () => {
      card.removeEventListener("pointermove", handlePointerMove)
      card.removeEventListener("pointerenter", handlePointerEnter)
      card.removeEventListener("pointerleave", handlePointerLeave)
      animationHandlers.cancelAnimation()
    }
  }, [animationHandlers, handlePointerMove, handlePointerEnter, handlePointerLeave])

  return (
    <div
      ref={wrapRef}
      className={`profile-card-wrap ${className}`}
      style={{
        "--card-opacity": "0.15",
        "--pointer-x": "50%",
        "--pointer-y": "50%",
        "--rotate-x": "0deg",
        "--rotate-y": "0deg",
        perspective: "1000px",
      } as React.CSSProperties}
    >
      <div
        ref={cardRef}
        className={`profile-card ${compact ? 'compact' : ''}`}
        style={{
          transform: enableTilt ? "rotateX(var(--rotate-x)) rotateY(var(--rotate-y))" : "none",
          transformStyle: "preserve-3d",
          transition: "transform 0.1s ease-out",
        }}
        onClick={() => onSelect?.(player)}
      >
        {/* Background gradient */}
        <div
          className="profile-card-background"
          style={{
            background: DEFAULT_BEHIND_GRADIENT,
            position: "absolute",
            inset: "0",
            borderRadius: "12px",
            opacity: "var(--card-opacity)",
            transition: "opacity 0.3s ease",
          }}
        />
        
        {/* Inner gradient */}
        <div
          className="profile-card-inner"
          style={{
            background: DEFAULT_INNER_GRADIENT,
            position: "absolute",
            inset: "1px",
            borderRadius: "11px",
            backdropFilter: "blur(8px)",
          }}
        />

        {/* Card content */}
        <div className="profile-card-content">
          {/* Player Image */}
          <div className="profile-card-avatar">
            <div className="avatar-container">
              <Image
                src={player.image || "/api/placeholder/200/200"}
                alt={player.name}
                width={200}
                height={200}
                className="avatar-image"
              />
            </div>
          </div>

          {/* Player Info */}
          <div className="profile-card-info">
            <div className="player-header">
              <h3 className="player-name">{player.name}</h3>
              <Badge className="position-badge">
                {player.position}
              </Badge>
            </div>

            <div className="player-meta">
              <div className="meta-item">
                <MapPin className="meta-icon" />
                <span>{player.nationality}</span>
              </div>
              <div className="meta-item">
                <span className="team-name">{player.team}</span>
              </div>
            </div>

            <div className="player-rating">
              <div className="rating-circle">
                <span className="rating-number">{player.rating}</span>
              </div>
              <div className="rating-stars">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`star ${i < Math.floor(player.rating / 20) ? 'filled' : ''}`}
                  />
                ))}
              </div>
            </div>

            {showStats && !compact && (
              <div className="player-stats">
                <div className="stat-item">
                  <span className="stat-label">Goals</span>
                  <span className="stat-value">{player.goals}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Assists</span>
                  <span className="stat-value">{player.assists}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Games</span>
                  <span className="stat-value">{player.games}</span>
                </div>
              </div>
            )}

            <div className="player-value">
              <Trophy className="value-icon" />
              <span className="value-text">{player.value}</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .profile-card-wrap {
          position: relative;
          width: 100%;
          max-width: 320px;
          height: ${compact ? '200px' : '400px'};
          cursor: pointer;
        }

        .profile-card {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .profile-card.compact {
          height: 200px;
        }

        .profile-card-content {
          position: relative;
          z-index: 10;
          width: 100%;
          height: 100%;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: white;
        }

        .profile-card-avatar {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
        }

        .avatar-container {
          width: ${compact ? '60px' : '100px'};
          height: ${compact ? '60px' : '100px'};
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid rgba(34, 211, 238, 0.5);
          background: linear-gradient(135deg, #1e40af, #06b6d4);
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .player-header {
          text-align: center;
          margin-bottom: 12px;
        }

        .player-name {
          font-size: ${compact ? '16px' : '20px'};
          font-weight: bold;
          margin-bottom: 4px;
          color: white;
        }

        .position-badge {
          background: rgba(34, 211, 238, 0.2);
          color: #22d3ee;
          border: 1px solid rgba(34, 211, 238, 0.5);
          font-size: 12px;
          padding: 2px 8px;
        }

        .player-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          font-size: ${compact ? '12px' : '14px'};
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          color: rgba(255, 255, 255, 0.8);
        }

        .meta-icon {
          width: 12px;
          height: 12px;
        }

        .team-name {
          font-weight: 600;
          color: #22d3ee;
        }

        .player-rating {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .rating-circle {
          width: ${compact ? '30px' : '40px'};
          height: ${compact ? '30px' : '40px'};
          border-radius: 50%;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: black;
          font-size: ${compact ? '12px' : '14px'};
        }

        .rating-stars {
          display: flex;
          gap: 2px;
        }

        .star {
          width: 12px;
          height: 12px;
          color: rgba(255, 255, 255, 0.3);
        }

        .star.filled {
          color: #fbbf24;
        }

        .player-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }

        .stat-item {
          text-align: center;
          background: rgba(255, 255, 255, 0.05);
          padding: 8px 4px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stat-label {
          display: block;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 2px;
        }

        .stat-value {
          font-weight: bold;
          font-size: 14px;
          color: #22d3ee;
        }

        .player-value {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(34, 211, 238, 0.1);
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid rgba(34, 211, 238, 0.3);
        }

        .value-icon {
          width: 16px;
          height: 16px;
          color: #22d3ee;
        }

        .value-text {
          font-weight: bold;
          color: #22d3ee;
          font-size: ${compact ? '14px' : '16px'};
        }

        .profile-card-wrap.active .profile-card-background {
          opacity: 0.25;
        }

        .profile-card:hover {
          transform: translateY(-2px);
        }

        .profile-card.compact .profile-card-content {
          padding: 12px;
        }

        .profile-card.compact .player-header {
          margin-bottom: 8px;
        }

        .profile-card.compact .player-meta {
          margin-bottom: 8px;
        }

        .profile-card.compact .player-rating {
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  )
} 