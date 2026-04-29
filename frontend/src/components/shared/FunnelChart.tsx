import { useState, useRef, useEffect, type ReactNode } from 'react'

interface Channel { label: string; color: string; pct: number }
interface Stage {
  label: string
  value: number
  displayPct: number
  channels?: Channel[]   // per-stage proportions (override global)
}

interface Props {
  stages: Stage[]
  channels: Channel[]   // global fallback, must sum to 1.0
  height?: number
}

function fmt(n: number): string {
  return n.toLocaleString('pt-BR')
}

interface PopupState { si: number; x: number; y: number }

export default function FunnelChart({ stages, channels, height = 380 }: Props) {
  const [popup, setPopup] = useState<PopupState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!popup) return
    function handleOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopup(null)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [popup])

  if (stages.length === 0) return null
  if (stages.length === 1) return (
    <div className="text-center text-sm text-muted-foreground py-8">
      Dados insuficientes para exibir o funil.
    </div>
  )

  const W = 600
  const CX = W / 2
  const MAX_HALF_W = W * 0.42
  const LABEL_PAD = 130
  const SVG_W = W + LABEL_PAD + 80

  const usableH = height - 80
  const stageY = stages.map((_, i) =>
    40 + (i / Math.max(stages.length - 1, 1)) * usableH
  )
  const halfWs = stages.map(s => s.displayPct * MAX_HALF_W)

  function stageCum(si: number): number[] {
    const chs = stages[si].channels ?? channels
    return chs.reduce<number[]>((a, ch) => {
      a.push(a[a.length - 1] + ch.pct)
      return a
    }, [0])
  }

  const chLeft  = (si: number, cum: number[], k: number) =>
    LABEL_PAD + CX - halfWs[si] + cum[k]   * 2 * halfWs[si]
  const chRight = (si: number, cum: number[], k: number) =>
    LABEL_PAD + CX - halfWs[si] + cum[k+1] * 2 * halfWs[si]

  const polygons: ReactNode[] = []
  const lines: ReactNode[] = []

  for (let si = 0; si < stages.length - 1; si++) {
    const y1 = stageY[si], y2 = stageY[si + 1]
    const chs1 = stages[si].channels ?? channels
    const cum1 = stageCum(si)
    const cum2 = stageCum(si + 1)

    chs1.forEach((ch, ci) => {
      const xl1 = chLeft(si, cum1, ci),  xr1 = chRight(si, cum1, ci)
      const xl2 = chLeft(si+1, cum2, ci), xr2 = chRight(si+1, cum2, ci)
      polygons.push(
        <polygon key={`p-${si}-${ci}`}
          points={`${xl1},${y1} ${xr1},${y1} ${xr2},${y2} ${xl2},${y2}`}
          fill={ch.color} opacity={0.80} />
      )
      if (ci < chs1.length - 1) {
        lines.push(
          <line key={`l-${si}-${ci}`}
            x1={xr1} y1={y1} x2={xr2} y2={y2}
            stroke="rgba(6,8,15,.6)" strokeWidth={1.5} />
        )
      }
    })
    const xlB = chLeft(si+1, cum2, 0)
    const xrB = chRight(si+1, cum2, (stages[si+1].channels ?? channels).length - 1)
    lines.push(<line key={`b-${si}`} x1={xlB} y1={y2} x2={xrB} y2={y2}
      stroke="rgba(6,8,15,.7)" strokeWidth={2} />)
  }

  // Clickable hit areas per stage
  const hitAreas: ReactNode[] = stages.map((st, si) => {
    const y = stageY[si]
    const cum = stageCum(si)
    const chs = st.channels ?? channels
    const xl = chLeft(si, cum, 0)
    const xr = chRight(si, cum, chs.length - 1)
    return (
      <rect
        key={`hit-${si}`}
        x={xl - 8}
        y={y - 16}
        width={xr - xl + 16}
        height={32}
        fill="transparent"
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          if (popup?.si === si) { setPopup(null); return }
          const container = containerRef.current
          if (!container) return
          const rect = container.getBoundingClientRect()
          setPopup({ si, x: e.clientX - rect.left, y: e.clientY - rect.top })
        }}
      />
    )
  })

  // Legend uses the union of all channels across stages (deduplicated)
  const legendChannels = stages.some(s => s.channels)
    ? Array.from(
        new Map(
          stages.flatMap(s => (s.channels ?? channels).map(ch => [ch.label, ch]))
        ).values()
      )
    : channels

  // Popup content
  const popupStage = popup !== null ? stages[popup.si] : null
  const popupChs   = popupStage ? (popupStage.channels ?? channels) : []

  return (
    <div ref={containerRef} className="relative">
      <svg width="100%" viewBox={`0 0 ${SVG_W} ${height}`} preserveAspectRatio="xMidYMid meet">
        {polygons}
        {lines}
        {/* Outer silhouette */}
        <polyline
          points={stages.map((_, i) => `${chLeft(i, stageCum(i), 0)},${stageY[i]}`).join(' ')}
          fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={1} />
        <polyline
          points={stages.map((_, i) => {
            const chs = stages[i].channels ?? channels
            const cum = stageCum(i)
            return `${chRight(i, cum, chs.length - 1)},${stageY[i]}`
          }).join(' ')}
          fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={1} />
        {/* Labels */}
        {stages.map((st, si) => {
          const y = stageY[si]
          const cum = stageCum(si)
          const chs = st.channels ?? channels
          const xl = chLeft(si, cum, 0) - 8
          const xr = chRight(si, cum, chs.length - 1) + 10
          const conv = si < stages.length - 1
            ? (stages[si+1].displayPct / st.displayPct * 100).toFixed(1) : null
          const isSelected = popup?.si === si
          return (
            <g key={`lbl-${si}`}>
              <text x={xl} y={y - 6} textAnchor="end" fontSize={12} fontWeight={600}
                fill={isSelected ? '#e2e8f0' : '#94a3b8'}>{st.label}</text>
              <text x={xl} y={y + 9} textAnchor="end" fontSize={11} fill="#64748b">{fmt(st.value)}</text>
              <text x={xr} y={y} textAnchor="start" fontSize={13} fontWeight={700} fill="#f1f5f9">
                {(st.displayPct * 100).toFixed(1)}%
              </text>
              {conv !== null && (
                <text x={xr} y={(stageY[si] + stageY[si+1]) / 2 + 4}
                  textAnchor="start" fontSize={11} fill="#475569">↓ {conv}%</text>
              )}
            </g>
          )
        })}
        {hitAreas}
      </svg>

      {/* Stage popup */}
      {popup !== null && popupStage !== null && (
        <div
          ref={popupRef}
          className="absolute z-50 bg-card border border-border rounded-xl shadow-2xl p-4 w-52"
          style={{
            left: Math.min(popup.x - 104, (containerRef.current?.offsetWidth ?? 500) - 220),
            top: popup.y + 14,
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">{popupStage.label}</span>
            <button
              onClick={() => setPopup(null)}
              className="text-muted-foreground hover:text-foreground leading-none text-base"
            >✕</button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {fmt(popupStage.value)} eventos · {(popupStage.displayPct * 100).toFixed(1)}% do topo
          </p>
          <div className="space-y-2">
            {popupChs.map(ch => (
              <div key={ch.label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ch.color }} />
                <span className="text-xs text-foreground/80 flex-1 truncate">{ch.label}</span>
                <span className="text-xs font-bold tabular-nums" style={{ color: ch.color }}>
                  {(ch.pct * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-3 flex-wrap mt-3 pt-3 border-t border-border/75">
        {legendChannels.map(ch => (
          <div key={ch.label} className="flex items-center gap-2 px-2.5 py-1 rounded-lg"
            style={{ background: ch.color + '18', border: `1px solid ${ch.color}40` }}>
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ch.color }} />
            <span className="text-sm font-medium text-foreground/90">{ch.label}</span>
            <span className="text-sm font-bold" style={{ color: ch.color }}>{(ch.pct * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
