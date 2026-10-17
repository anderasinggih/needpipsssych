"use client"

import { useEffect, useRef } from "react"
import { useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"
import { BUTTON_PRIMARY } from "@/components/ui/control-classes"

/* 2026-10-02 audit: the button was an outlined 60px-corner pill that wiped a fill up on hover
   and glowed blue (a border colour, an accent box-shadow glow and an inset accent ring at
   once). It is now the library's one white primary (BUTTON_PRIMARY at h-12 px-6, 14px
   medium, fully round) with one elevation: the charge the particles bring only brightens a
   1px top highlight in the accent, so the ring and the glow are gone. The particles are ink
   (the foreground, read from the stage) instead of blue and white, so the accent stays a
   small part of the field.
   2026-10-02 round 2: the default label is "Open an account", the step a broker or exchange
   asks for, instead of a generic SaaS free trial. */

type Particle = { x: number; y: number; vx: number; vy: number; born: number; size: number }

const LIFE_MS = 600
const GRAVITY_R = 140
const SPAWN_GAP_MS = 28

/**
 * A CTA stage where the cursor leaves a restrained particle trail (1–2px
 * ink dots with a soft halo, 0.6s decay). Near the button the dots gravitate
 * toward it and brighten its top highlight — signal language, no glitter.
 * Honors reduced motion by rendering a static pill.
 */
export function MouseTrailCta({
  label = "Open an account",
  href = "#",
  className,
  onClick,
}: {
  label?: string
  href?: string
  className?: string
  onClick?: () => void
}) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const pillRef = useRef<HTMLAnchorElement | null>(null)
  const reduced = useReducedMotion() ?? false

  useEffect(() => {
    if (reduced) return
    const root = rootRef.current
    const canvas = canvasRef.current
    const pill = pillRef.current
    if (!root || !canvas || !pill) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf = 0
    let running = false
    let onScreen = true
    let lastSpawn = 0
    let charge = 0 // 0..1 — particles arriving at the pill feed this
    const particles: Particle[] = []
    /* the ink: the stage's own text colour (text-foreground), read when a run starts so a
       theme change between runs is picked up; canvas takes any CSS colour, alpha goes on globalAlpha */
    let ink = getComputedStyle(root).color

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      const r = root.getBoundingClientRect()
      canvas.width = Math.max(1, Math.round(r.width * dpr))
      canvas.height = Math.max(1, Math.round(r.height * dpr))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(root)

    const pillCenter = () => {
      const rr = root.getBoundingClientRect()
      const pr = pill.getBoundingClientRect()
      return { x: pr.left - rr.left + pr.width / 2, y: pr.top - rr.top + pr.height / 2, rx: pr.width / 2 }
    }

    /* the charge brightens the button's 1px top highlight, in chart green, up to 70% */
    const applyCharge = () => {
      const t = charge
      pill.style.boxShadow =
        t > 0.02 ? `inset 0 1px 0 0 color-mix(in srgb, var(--chart-up, #34c28a) ${Math.round(75 * t)}%, transparent), 0 0 20px -4px color-mix(in srgb, var(--chart-up, #34c28a) ${Math.round(40 * t)}%, transparent)` : ""
    }

    const tick = (now: number) => {
      raf = 0
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      
      // Use exact chart-up green palette (#34c28a) for the quantitative particle dust
      const greenColor = getComputedStyle(root).getPropertyValue("--chart-up").trim() || "#34c28a"
      ctx.fillStyle = greenColor

      const c = pillCenter()
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        const age = (now - p.born) / LIFE_MS
        if (age >= 1) {
          particles.splice(i, 1)
          continue
        }
        const dx = c.x - p.x
        const dy = c.y - p.y
        const d = Math.hypot(dx, dy)
        if (d < GRAVITY_R && d > 1) {
          const pull = (1 - d / GRAVITY_R) * 0.9
          p.vx += (dx / d) * pull
          p.vy += (dy / d) * pull
        }
        if (d < c.rx + 10) {
          charge = Math.min(1, charge + 0.08)
          particles.splice(i, 1)
          continue
        }
        p.vx *= 0.92
        p.vy *= 0.92
        p.x += p.vx
        p.y += p.vy
        const fade = 1 - age
        // a soft halo + a crisp core, both in exact institutional chart-up green
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 3.2, 0, Math.PI * 2)
        ctx.globalAlpha = 0.22 * fade
        ctx.fill()
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 0.9, 0, Math.PI * 2)
        ctx.globalAlpha = 0.95 * fade
        ctx.fill()
      }
      ctx.globalAlpha = 1

      charge = Math.max(0, charge - 0.012)
      applyCharge()

      if (onScreen && (particles.length > 0 || charge > 0.01)) raf = requestAnimationFrame(tick)
      else running = false
    }

    const ensureLoop = () => {
      if (!running && onScreen) {
        running = true
        ink = getComputedStyle(root).color
        raf = requestAnimationFrame(tick)
      }
    }

    const onMove = (e: PointerEvent) => {
      const now = performance.now()
      if (now - lastSpawn < SPAWN_GAP_MS) return
      lastSpawn = now
      const r = root.getBoundingClientRect()
      // Only spawn particles if pointer is within or near the element bounds
      if (
        e.clientX < r.left - 40 ||
        e.clientX > r.right + 40 ||
        e.clientY < r.top - 40 ||
        e.clientY > r.bottom + 40
      ) {
        return
      }

      particles.push({
        x: e.clientX - r.left + (Math.random() - 0.5) * 4,
        y: e.clientY - r.top + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        born: now,
        size: Math.random() < 0.5 ? 1.5 : 2.5,
      })
      if (particles.length > 80) particles.shift()
      ensureLoop()
    }

    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      if (!onScreen && raf) {
        cancelAnimationFrame(raf)
        raf = 0
        running = false
      } else if (onScreen) ensureLoop()
    })
    io.observe(root)
    window.addEventListener("pointermove", onMove, { passive: true })

    return () => {
      window.removeEventListener("pointermove", onMove)
      io.disconnect()
      ro.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <div
      ref={rootRef}
      className={cn("relative flex items-center justify-center overflow-hidden text-foreground", className)}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />
      <a ref={pillRef} href={href} onClick={onClick} className={cn(BUTTON_PRIMARY, "relative z-10 w-auto px-6")}>
        {label}
      </a>
    </div>
  )
}
