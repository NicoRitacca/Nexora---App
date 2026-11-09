import { useLayoutEffect, useMemo, useState } from 'react'

// Deterministic PRNG (mulberry32) - same fixed seed every time, so the
// constellation's layout never changes between visits or refreshes, even
// though it looks randomly scattered.
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

const CONSTELLATION_SEED = 1105260
const BAND_SPACING = 480 // target vertical px per constellation - tight enough that one is always in view
const GLOW_COLORS = ['blue', 'purple']

// Eighteen well-known constellations, simplified to their classic asterism
// (the lines people actually picture) in a small local coordinate space.
// `bright: true` marks the star(s) most people would recognize by name.
const CONSTELLATION_TEMPLATES = [
  {
    name: 'Big Dipper',
    stars: [
      { x: 0, y: 0, bright: true }, // Dubhe
      { x: 2, y: 20, bright: false }, // Merak
      { x: 16, y: 24, bright: false }, // Phecda
      { x: 18, y: 8, bright: false }, // Megrez
      { x: 36, y: 4, bright: true }, // Alioth
      { x: 54, y: -4, bright: true }, // Mizar
      { x: 70, y: -14, bright: false }, // Alkaid
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
  {
    name: 'Orion',
    stars: [
      { x: 22, y: 0, bright: true }, // Betelgeuse
      { x: -10, y: 4, bright: false }, // Bellatrix
      { x: 2, y: 22, bright: false }, // Mintaka
      { x: 12, y: 24, bright: false }, // Alnilam
      { x: 22, y: 26, bright: false }, // Alnitak
      { x: 30, y: 46, bright: true }, // Saiph
      { x: -8, y: 50, bright: true }, // Rigel
    ],
    lines: [
      [0, 4],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [2, 6],
    ],
  },
  {
    name: 'Cassiopeia',
    stars: [
      { x: 0, y: 22, bright: false }, // Segin
      { x: 16, y: 0, bright: true }, // Ruchbah
      { x: 32, y: 16, bright: false }, // Gamma Cas
      { x: 48, y: -6, bright: true }, // Schedar
      { x: 64, y: 10, bright: true }, // Caph
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    name: 'Cygnus',
    stars: [
      { x: 0, y: -34, bright: true }, // Deneb
      { x: -2, y: 0, bright: false }, // Sadr
      { x: -22, y: -6, bright: false }, // Gienah
      { x: 20, y: -10, bright: false }, // Delta Cyg
      { x: 4, y: 38, bright: true }, // Albireo
    ],
    lines: [
      [0, 1],
      [1, 2],
      [1, 3],
      [1, 4],
    ],
  },
  {
    name: 'Leo',
    stars: [
      { x: 0, y: 36, bright: true }, // Regulus
      { x: 10, y: 15, bright: false }, // Algieba
      { x: 17, y: 0, bright: false }, // Adhafera
      { x: 42, y: -6, bright: false }, // Zosma
      { x: 44, y: 16, bright: false }, // Chertan
      { x: 68, y: 22, bright: true }, // Denebola
    ],
    lines: [
      [0, 1],
      [1, 2],
      [0, 4],
      [4, 3],
      [4, 5],
      [3, 5],
    ],
  },
  {
    name: 'Lyra',
    stars: [
      { x: 0, y: 0, bright: true }, // Vega
      { x: 10, y: 16, bright: false }, // Zeta Lyr
      { x: 24, y: 20, bright: false }, // Delta Lyr
      { x: 22, y: 40, bright: false }, // Sulafat
      { x: 8, y: 38, bright: false }, // Sheliak
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 1],
    ],
  },
  {
    name: 'Scorpius',
    stars: [
      { x: -12, y: -6, bright: false }, // Graffias
      { x: 0, y: -12, bright: false }, // Dschubba
      { x: 6, y: 10, bright: true }, // Antares
      { x: 22, y: 26, bright: false }, // Tau Sco
      { x: 32, y: 48, bright: false }, // Epsilon Sco
      { x: 26, y: 68, bright: false }, // Mu Sco
      { x: 10, y: 82, bright: false }, // Zeta Sco
      { x: -2, y: 96, bright: true }, // Shaula
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
    ],
  },
  {
    name: 'Gemini',
    stars: [
      { x: 0, y: 0, bright: true }, // Castor
      { x: 17, y: 7, bright: true }, // Pollux
      { x: 2, y: 32, bright: false }, // Tejat
      { x: 4, y: 52, bright: false }, // Mebsuta
      { x: 5, y: 68, bright: false }, // Propus
      { x: 15, y: 30, bright: false }, // Wasat
      { x: 16, y: 52, bright: false }, // Mekbuda
      { x: 17, y: 70, bright: false }, // Alhena
    ],
    lines: [
      [0, 1],
      [0, 2],
      [2, 3],
      [3, 4],
      [1, 5],
      [5, 6],
      [6, 7],
    ],
  },
  {
    name: 'Taurus',
    stars: [
      { x: 0, y: 0, bright: true }, // Aldebaran
      { x: 14, y: -6, bright: false }, // Epsilon Tau
      { x: -10, y: -8, bright: false }, // Gamma Tau
      { x: -34, y: -38, bright: true }, // Elnath
      { x: 30, y: 26, bright: false }, // Zeta Tau
    ],
    lines: [
      [0, 1],
      [0, 2],
      [2, 3],
      [1, 4],
    ],
  },
  {
    name: 'Pegasus',
    stars: [
      { x: 0, y: 0, bright: true }, // Scheat
      { x: 0, y: 30, bright: false }, // Markab
      { x: 30, y: 30, bright: false }, // Algenib
      { x: 30, y: 0, bright: true }, // Alpheratz
      { x: -26, y: -18, bright: true }, // Enif
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [0, 4],
    ],
  },
  {
    name: 'Canis Major',
    stars: [
      { x: 0, y: 0, bright: true }, // Sirius
      { x: -14, y: -10, bright: false }, // Mirzam
      { x: 16, y: 20, bright: false }, // Wezen
      { x: 10, y: 34, bright: true }, // Adhara
      { x: 22, y: 44, bright: false }, // Aludra
    ],
    lines: [
      [1, 0],
      [0, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    name: 'Ursa Minor',
    stars: [
      { x: 0, y: 0, bright: true }, // Polaris
      { x: 10, y: 14, bright: false }, // Yildun
      { x: 18, y: 26, bright: false }, // Epsilon UMi
      { x: 30, y: 18, bright: false }, // Zeta UMi
      { x: 36, y: 30, bright: false }, // Eta UMi
      { x: 50, y: 20, bright: true }, // Kochab
      { x: 60, y: 28, bright: true }, // Pherkad
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 3],
    ],
  },
  {
    name: 'Draco',
    stars: [
      { x: 0, y: 0, bright: true }, // Eltanin
      { x: -14, y: -8, bright: false }, // Rastaban
      { x: 10, y: -20, bright: false }, // Nodus
      { x: 26, y: -12, bright: false }, // Draco 1
      { x: 40, y: -26, bright: false }, // Draco 2
      { x: 54, y: -16, bright: false }, // Draco 3
      { x: 68, y: -30, bright: false }, // Draco 4
    ],
    lines: [
      [0, 1],
      [0, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
  {
    name: 'Perseus',
    stars: [
      { x: 0, y: 0, bright: true }, // Mirfak
      { x: -18, y: 14, bright: true }, // Algol
      { x: -10, y: -16, bright: false }, // Gamma Per
      { x: 16, y: 16, bright: false }, // Delta Per
      { x: 30, y: 10, bright: false }, // Epsilon Per
      { x: 34, y: 28, bright: false }, // Zeta Per
    ],
    lines: [
      [0, 1],
      [0, 2],
      [0, 3],
      [3, 4],
      [4, 5],
    ],
  },
  {
    name: 'Sagittarius',
    stars: [
      { x: 0, y: 0, bright: false }, // Kaus Borealis
      { x: 12, y: 14, bright: true }, // Kaus Media
      { x: 26, y: 24, bright: true }, // Kaus Australis
      { x: 34, y: 4, bright: false }, // Nunki
      { x: 46, y: 10, bright: false }, // Ascella
      { x: 20, y: -14, bright: false }, // Phi Sgr
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 4],
      [4, 3],
      [3, 5],
      [5, 0],
    ],
  },
  {
    name: 'Corona Borealis',
    stars: [
      { x: 0, y: 0, bright: false },
      { x: 10, y: -8, bright: false },
      { x: 22, y: -12, bright: true }, // Alphecca
      { x: 34, y: -10, bright: false },
      { x: 44, y: -2, bright: false },
      { x: 50, y: 8, bright: false },
      { x: 46, y: 18, bright: false },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
  },
  {
    name: 'Hercules',
    stars: [
      { x: 0, y: 0, bright: false }, // Pi Her
      { x: 22, y: -6, bright: false }, // Eta Her
      { x: 26, y: 16, bright: true }, // Zeta Her
      { x: 2, y: 20, bright: false }, // Epsilon Her
      { x: -18, y: 36, bright: true }, // Ras Algethi
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
    ],
  },
  {
    name: 'Andromeda',
    stars: [
      { x: 0, y: 0, bright: true }, // Alpheratz
      { x: 16, y: 10, bright: false }, // Delta And
      { x: 32, y: 16, bright: true }, // Mirach
      { x: 44, y: 8, bright: false }, // Mu And
      { x: 58, y: 14, bright: true }, // Almach
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
]

// Two more real constellations, reserved for guaranteed placement on the
// left side of the page - kept out of CONSTELLATION_TEMPLATES above so
// they're never part of the shuffled rotation and can't repeat one
// already used there.
const LEFT_SIDE_TEMPLATES = [
  {
    name: 'Aquila',
    stars: [
      { x: 0, y: 0, bright: true }, // Altair
      { x: -14, y: -10, bright: false }, // Tarazed
      { x: 16, y: -8, bright: false }, // Alshain
      { x: 8, y: 22, bright: false },
      { x: -6, y: 28, bright: false },
    ],
    lines: [
      [1, 0],
      [0, 2],
      [0, 3],
      [3, 4],
    ],
  },
  {
    name: 'Pisces',
    stars: [
      { x: 0, y: 0, bright: false },
      { x: 14, y: 10, bright: false },
      { x: 26, y: 24, bright: true }, // Alrescha
      { x: 40, y: 10, bright: false },
      { x: 54, y: 0, bright: false },
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
]

function shuffled(array, rand) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Places as many of the real constellations above as fit the page's full
// measured height at roughly one every BAND_SPACING px (so at least one is
// always in view while scrolling), capped at the template count - none
// repeated. Each is scaled up to span a big part of the screen and
// positioned directly in real pixel coordinates (no viewBox stretching),
// so dots stay perfect circles and lines stay evenly thick at any size -
// and since positions are uniform scale + offset of the template's own
// shape, nothing is distorted or unrecognizable. A light scatter of
// small, unconnected background stars fills out the night-sky feel.
function buildConstellations(width, height) {
  const rand = mulberry32(CONSTELLATION_SEED)
  const bandCount = Math.min(
    CONSTELLATION_TEMPLATES.length,
    Math.max(6, Math.round(height / BAND_SPACING))
  )
  const templates = shuffled(CONSTELLATION_TEMPLATES, rand).slice(0, bandCount)
  const bandHeight = height / bandCount

  const constellations = templates.map((template, i) => {
    const bandTop = bandHeight * i
    const xs = template.stars.map((s) => s.x)
    const ys = template.stars.map((s) => s.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const localSpan = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY, 1)
    const midX = (Math.max(...xs) + minX) / 2
    const midY = (Math.max(...ys) + minY) / 2

    // Big - allowed to spill well past its own band and past the screen's
    // own width, since running off the edges is fine.
    const targetSpan = Math.min(width * 1.1, bandHeight * 2.6) * (0.65 + rand() * 0.35)
    const scale = targetSpan / localSpan

    const cx = width * (0.1 + rand() * 0.8)
    const cy = bandTop + bandHeight * (0.25 + rand() * 0.5)

    const stars = template.stars.map((s) => {
      const brightness = s.bright ? 0.7 + rand() * 0.25 : 0.35 + rand() * 0.3
      return {
        x: cx + (s.x - midX) * scale,
        y: cy + (s.y - midY) * scale,
        r: s.bright ? 2.6 + rand() * 1.4 : 1.4 + rand() * 1.2,
        brightness,
        bright: s.bright,
      }
    })

    const lines = template.lines.map(([a, b]) => [stars[a], stars[b]])
    const glow = stars
      .filter((s) => s.bright)
      .map((s) => ({ node: s, color: GLOW_COLORS[Math.floor(rand() * GLOW_COLORS.length)] }))

    return { stars, lines, glow }
  })

  // A light scatter of small, dim, unconnected background stars.
  const looseStars = []
  for (let i = 0; i < bandCount; i++) {
    const bandTop = bandHeight * i
    const looseCount = 2 + Math.floor(rand() * 2)
    for (let s = 0; s < looseCount; s++) {
      const brightness = 0.2 + rand() * 0.3
      looseStars.push({
        x: width * rand(),
        y: bandTop + bandHeight * rand(),
        r: 1 + brightness * 1.8,
        brightness,
      })
    }
  }

  // Two more real constellations, always on the left side of the page -
  // sized and placed with the exact same formulas as the rotation above,
  // just biased toward the left edge instead of anywhere across the width.
  const leftBandHeight = height / LEFT_SIDE_TEMPLATES.length
  const leftConstellations = LEFT_SIDE_TEMPLATES.map((template, i) => {
    const bandTop = leftBandHeight * i
    const xs = template.stars.map((s) => s.x)
    const ys = template.stars.map((s) => s.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const localSpan = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY, 1)
    const midX = (Math.max(...xs) + minX) / 2
    const midY = (Math.max(...ys) + minY) / 2

    const targetSpan = Math.min(width * 1.1, leftBandHeight * 2.6) * (0.65 + rand() * 0.35)
    const scale = targetSpan / localSpan

    const cx = width * (0.04 + rand() * 0.14)
    const cy = bandTop + leftBandHeight * (0.25 + rand() * 0.5)

    const stars = template.stars.map((s) => {
      const brightness = s.bright ? 0.7 + rand() * 0.25 : 0.35 + rand() * 0.3
      return {
        x: cx + (s.x - midX) * scale,
        y: cy + (s.y - midY) * scale,
        r: s.bright ? 2.6 + rand() * 1.4 : 1.4 + rand() * 1.2,
        brightness,
        bright: s.bright,
      }
    })

    const lines = template.lines.map(([a, b]) => [stars[a], stars[b]])
    const glow = stars
      .filter((s) => s.bright)
      .map((s) => ({ node: s, color: GLOW_COLORS[Math.floor(rand() * GLOW_COLORS.length)] }))

    return { stars, lines, glow }
  })

  return { constellations: [...constellations, ...leftConstellations], looseStars }
}

export function ConnectionField({ width, height }) {
  const { constellations, looseStars } = useMemo(
    () => buildConstellations(width, height),
    [width, height]
  )

  return (
    <svg className="connection-field" width={width} height={height} aria-hidden="true">
      <g className="connection-loose-stars">
        {looseStars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fillOpacity={s.brightness} />
        ))}
      </g>
      {constellations.map((constellation, ci) => (
        <g key={ci}>
          <g className="connection-lines" stroke="currentColor" strokeWidth="1">
            {constellation.lines.map(([a, b], li) => (
              <line key={li} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            ))}
          </g>
          <g className="connection-dots">
            {constellation.stars.map((s, si) => (
              <circle key={si} cx={s.x} cy={s.y} r={s.r} fillOpacity={s.brightness} />
            ))}
          </g>
          <g className="connection-glow">
            {constellation.glow.map((g, gi) => (
              <circle
                key={gi}
                className={`glow-dot glow-dot-${g.color}`}
                cx={g.node.x}
                cy={g.node.y}
                r={g.node.r + 1.5}
              />
            ))}
          </g>
        </g>
      ))}
    </svg>
  )
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
