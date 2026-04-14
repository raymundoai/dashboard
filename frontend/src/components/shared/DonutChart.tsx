import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Slice { label: string; orders: number; sharePct: number }
interface Props { data: Slice[]; title: string; height?: number; colors?: string[] }

const COLORS = ['#38bdf8', '#34d399', '#c084fc', '#fb923c', '#f472b6', '#a3e635', '#facc15']

export default function DonutChart({ data, title, height = 240, colors }: Props) {
  const palette = colors ?? COLORS
  const chartData = data.map((d) => ({ name: d.label, value: d.orders }))
  if (chartData.length === 0) return (
    <div className="bg-card/40 border border-border/50 rounded-xl p-4">
      <p className="text-sm font-semibold text-foreground mb-1 pb-2 border-b border-border/40">{title}</p>
      <div style={{ height }} className="flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Sem dados</p>
      </div>
    </div>
  )

  return (
    <div className="bg-card/40 border border-border/50 rounded-xl p-4">
      <p className="text-sm font-semibold text-foreground mb-1 pb-2 border-b border-border/40">{title}</p>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="48%"
            innerRadius="46%"
            outerRadius="82%"
            dataKey="value"
            paddingAngle={2}
            strokeWidth={0}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} opacity={0.9} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'hsl(222 60% 6%)',
              border: '1px solid hsl(215 28% 14%)',
              borderRadius: 8,
              fontSize: 12,
              boxShadow: '0 4px 16px hsl(224 71% 2% / 0.6)',
            }}
            formatter={(v, name) => [v as number, name as string]}
            itemStyle={{ color: 'hsl(210 20% 80%)' }}
          />
          <Legend
            iconType="circle"
            iconSize={6}
            wrapperStyle={{ fontSize: 11, color: 'hsl(215 16% 50%)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
