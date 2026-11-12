import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

// Deterministic PRNG (mulberry32) - only used for the still fallback shown
// under prefers-reduced-motion, so that layout stays fixed across re-renders
// instead of reshuffling. The animated sparks below are genuinely random
// (new ones are meant to keep appearing over time), so they use Math.random
// directly and don't need this.
function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const STATIC_SEED = 1105260
// Soft purple and soft blue - the same tones used elsewhere in the app
// (--color-primary-light and the event-card glow blue).
const SPARK_COLORS = ['#7c3aed', '#2563eb']

// Roughly one spark per this many CSS pixels of width, clamped - keeps the
// animation lightweight on a narrow phone screen without ever feeling
// sparse on a wide desktop window.
const SPARKS_PER_PX = 1 / 42
const MIN_SPARKS = 16
const MAX_SPARKS = 90
const SPARK_CAP = Math.round(MAX_SPARKS * 1.6)

// Sections/tiles that get their own small burst of sparks the first time
// they scroll into view - shared by both pages via one selector list
// instead of either page having to tell this component about its own
// layout.
const BURST_SELECTOR =
  '.landing-tile, .feed-header-tile, .top-picks-section, .more-businesses-section, .events-section'
const BURST_SPARK_COUNT = 6

// Roughly the widest any page's actual content column gets (the app shell
// and both pages cap out in this neighborhood) - used only to bias sparks
// toward the open side margins on a wide window, not to lay anything out.
const CONTENT_WIDTH = 1200
const MARGIN_BIAS_CHANCE = 0.6

function randRange(rand, min, max) {
  return min + rand() * (max - min)
}

// Most sparks land in whatever empty side-margin space exists beside the
// centered content column on a wide window; the rest scatter across the
// full width (including behind the content itself, for a little depth).
// On a narrow window there's no real margin to bias toward, so it's just
// uniform.
function sampleX(rand, width) {
  const margin = (width - CONTENT_WIDTH) / 2
  if (margin < 32 || rand() >= MARGIN_BIAS_CHANCE) return rand() * width
  const onLeft = rand() < 0.5
  return onLeft ? rand() * margin : width - rand() * margin
}

// Scattered uniformly across the full page height, from the very top down -
// used both for the initial fill and every ambient respawn, so every part
// of the page (including the hero at the top) always has some, not just
// wherever the page happens to have been scrolled to.
function makeSpark(rand, width, height) {
  return {
    x: sampleX(rand, width),
    y: rand() * height,
    radius: randRange(rand, 1.4, 3.2),
    maxAlpha: randRange(rand, 0.6, 1),
    speed: randRange(rand, 8, 22), // px/sec, upward
    wobblePhase: rand() * Math.PI * 2,
    wobbleSpeed: randRange(rand, 0.3, 0.8),
    wobbleAmount: randRange(rand, 2, 8),
    life: 0,
    lifespan: randRange(rand, 7, 16), // seconds to drift up and fully fade
    color: SPARK_COLORS[Math.floor(rand() * SPARK_COLORS.length)],
  }
}

// Fades a spark in over its first ~12% of life and out over its last ~30%,
// so sparks never pop in or out abruptly.
function sparkAlpha(spark) {
  const t = spark.life / spark.lifespan
  if (t <= 0 || t >= 1) return 0
  const fadeIn = Math.min(1, t / 0.12)
  const fadeOut = Math.min(1, (1 - t) / 0.3)
  return spark.maxAlpha * Math.min(fadeIn, fadeOut)
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => setReduced(query.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  return reduced
}

// A handful of still, non-animated sparks for prefers-reduced-motion -
// fixed positions (seeded) so they never shift or flicker.
function StaticSparks({ width, height }) {
  const sparks = useMemo(() => {
    if (width <= 0 || height <= 0) return []
    const rand = mulberry32(STATIC_SEED)
    const count = Math.max(8, Math.min(18, Math.round(width / 70)))
    return Array.from({ length: count }, () => ({
      x: sampleX(rand, width),
      y: rand() * height,
      radius: randRange(rand, 1.8, 3.4),
      alpha: randRange(rand, 0.55, 1),
      color: SPARK_COLORS[Math.floor(rand() * SPARK_COLORS.length)],
    }))
  }, [width, height])

  if (width <= 0 || height <= 0) return null

  return (
    <svg className="sparks-field sparks-field-static" width={width} height={height} aria-hidden="true">
      {sparks.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.radius}
          fill={s.color}
          fillOpacity={s.alpha}
          style={{ filter: `drop-shadow(0 0 6px ${s.color}b3)` }}
        />
      ))}
    </svg>
  )
}

// Rising sparks: small glowing purple/blue dots that drift slowly upward
// and fade out, replaced by new ones over time. Pass `containerRef` (the
// same element measured by useBackdropSize below) so a small cluster can
// burst in around any of that container's tracked sections/tiles the first
// time each one scrolls into view - `topOffset` corrects for a backdrop
// that's shifted above its container (see HomePage.jsx's feed-backdrop).
export function SparksField({ width, height, containerRef, topOffset = 0 }) {
  const canvasRef = useRef(null)
  const sparksRef = useRef([])
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (reducedMotion || width <= 0 || height <= 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const targetCount = Math.max(MIN_SPARKS, Math.min(MAX_SPARKS, Math.round(width * SPARKS_PER_PX)))
    const initial = Array.from({ length: targetCount }, () => makeSpark(Math.random, width, height))
    // Stagger starting life so they don't all fade in and out in unison.
    initial.forEach((s) => {
      s.life = Math.random() * s.lifespan
    })
    sparksRef.current = initial

    let scrollBoost = 0
    let lastScrollY = window.scrollY
    function handleScroll() {
      const current = window.scrollY
      const delta = current - lastScrollY
      lastScrollY = current
      // A little faster while actively scrolling - decays back to the
      // ambient drift speed once scrolling stops (see the frame loop).
      scrollBoost += Math.min(Math.abs(delta), 120) * 0.6
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    let tabVisible = !document.hidden
    function handleVisibility() {
      tabVisible = !document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibility)

    let rafId
    let lastTime = performance.now()

    function frame(time) {
      rafId = requestAnimationFrame(frame)
      const dt = Math.min((time - lastTime) / 1000, 0.1)
      lastTime = time
      if (!tabVisible) return

      scrollBoost *= 0.9

      ctx.clearRect(0, 0, width, height)
      const sparks = sparksRef.current
      for (let i = 0; i < sparks.length; i++) {
        const spark = sparks[i]
        spark.life += dt
        if (spark.life >= spark.lifespan || spark.y < -20) {
          sparks[i] = makeSpark(Math.random, width, height)
          continue
        }
        spark.y -= (spark.speed + scrollBoost) * dt
        const alpha = sparkAlpha(spark)
        if (alpha <= 0.015) continue
        const drawX = spark.x + Math.sin(spark.life * spark.wobbleSpeed + spark.wobblePhase) * spark.wobbleAmount
        ctx.globalAlpha = alpha
        ctx.fillStyle = spark.color
        ctx.shadowColor = spark.color
        ctx.shadowBlur = spark.radius * 8
        ctx.beginPath()
        ctx.arc(drawX, spark.y, spark.radius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
    }
    rafId = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [width, height, reducedMotion])

  useEffect(() => {
    if (reducedMotion) return
    const container = containerRef?.current
    if (!container || width <= 0 || height <= 0) return
    const targets = container.querySelectorAll(BURST_SELECTOR)
    if (targets.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          observer.unobserve(entry.target)

          // Measured fresh at trigger time (not when the observer was
          // created) so scrolling in between doesn't throw off the math.
          const containerRect = container.getBoundingClientRect()
          const rect = entry.target.getBoundingClientRect()
          const cx = rect.left + rect.width / 2
          const cy = rect.top - containerRect.top + topOffset + rect.height / 2

          for (let i = 0; i < BURST_SPARK_COUNT; i++) {
            const spark = makeSpark(Math.random, width, height)
            spark.x = cx + (Math.random() - 0.5) * Math.max(rect.width, 160)
            spark.y = cy + (Math.random() - 0.5) * Math.max(rect.height, 80)
            spark.lifespan = randRange(Math.random, 2.5, 4.5)
            spark.life = 0
            sparksRef.current.push(spark)
          }
          if (sparksRef.current.length > SPARK_CAP) {
            sparksRef.current.splice(0, sparksRef.current.length - SPARK_CAP)
          }
        })
      },
      { threshold: 0.2 }
    )
    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [containerRef, width, height, topOffset, reducedMotion])

  if (reducedMotion) return <StaticSparks width={width} height={height} />

  return <canvas ref={canvasRef} className="sparks-field" aria-hidden="true" />
}

// Measures the real pixel size the backdrop needs to cover: the full
// browser width and the host element's own full height. Re-measures on
// resize and whenever the page's content height changes.
export function useBackdropSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setSize({ width: window.innerWidth, height: el.offsetHeight })
    update()

    window.addEventListener('resize', update)
    let observer
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(update)
      observer.observe(el)
    }
    return () => {
      window.removeEventListener('resize', update)
      if (observer) observer.disconnect()
    }
  }, [ref])

  return size
}
