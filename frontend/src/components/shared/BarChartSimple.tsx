import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { formatBRL } from '@/lib/formatters'

function formatYTick(v: number): string {
  if (v === 0) return '0'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`
  return String(v)
}

interface DataPoint { label: string; value: number | null; meta?: number | null }
interface Props { data: DataPoint[]; color?: string; height?: number; showMeta?: boolean; yDomain?: [number, number] }

export default function BarChartSimple({ data, color = '#38bdf8', height = 160, showMeta = false, yDomain }: Props) {
  const gradientId = `bar-grad-${color.replace('#', '')}`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.85} />
            <stop offset="100%" stopColor={color} stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 12%)" vertical={false} strokeOpacity={0.6} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(215 16% 40%)' }} axisLine={false} tickLine={false} />
        {yDomain ? (
          <YAxis
            domain={yDomain}
            tickFormatter={formatYTick}
            tick={{ fontSize: 10, fill: 'hsl(215 16% 40%)' }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickCount={5}
          />
        ) : (
          <YAxis hide />
        )}
        <Tooltip
          contentStyle={{
            background: 'hsl(222 60% 6%)',
            border: '1px solid hsl(215 28% 14%)',
            borderRadius: 8,
            fontSize: 12,
            boxShadow: '0 4px 16px hsl(224 71% 2% / 0.6)',
          }}
          cursor={{ fill: 'hsl(215 28% 12% / 0.4)' }}
          formatter={(v) => [formatBRL(v as number), 'Realizado']}
          labelStyle={{ color: 'hsl(215 16% 50%)' }}
        />
        <Bar dataKey="value" fill={`url(#${gradientId})`} radius={[4, 4, 0, 0]} maxBarSize={40} />
        {showMeta && (
          <Line dataKey="meta" dot={false} stroke="hsl(215 16% 44%)" strokeWidth={1.5} strokeDasharray="5 3" strokeOpacity={0.7} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
