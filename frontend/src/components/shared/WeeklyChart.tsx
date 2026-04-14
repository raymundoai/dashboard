import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { formatBRL } from '@/lib/formatters'

interface WeekBar {
  label: string   // e.g. "01-07"
  value: number | null
  meta: number | null
}

interface Props { data: WeekBar[]; color?: string; height?: number }

function fmt(v: number) {
  if (v >= 1_000_000) return `${(v/1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${Math.round(v/1_000)}k`
  return String(v)
}

export default function WeeklyChart({ data, color = '#38bdf8', height = 200 }: Props) {
  const max = data.length === 0
    ? 0
    : Math.max(...data.map(d => Math.max(d.value ?? 0, d.meta ?? 0)))
  const domain: [number, number] = [0, max > 0 ? Math.ceil(max * 1.1 / 1000) * 1000 : 1000]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 12%)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
        <YAxis domain={domain} tickFormatter={fmt} tick={{ fontSize: 10, fill: 'hsl(215 16% 40%)' }}
          axisLine={false} tickLine={false} width={44} tickCount={5} />
        <Tooltip
          contentStyle={{ background: 'hsl(222 60% 6%)', border: '1px solid hsl(215 28% 14%)', borderRadius: 8, fontSize: 12 }}
          formatter={(v, name) => [formatBRL(v as number), name === 'value' ? 'Realizado' : 'Meta semanal']}
        />
        <Bar dataKey="value" fill={color} fillOpacity={0.82} radius={[4,4,0,0]} maxBarSize={60} />
        <Line dataKey="meta" dot={false} stroke="hsl(215 16% 44%)" strokeWidth={1.5}
          strokeDasharray="5 3" strokeOpacity={0.7} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
