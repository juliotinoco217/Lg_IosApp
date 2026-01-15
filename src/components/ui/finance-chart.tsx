import { useMemo } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { cn } from "@/lib/utils"

interface DataPoint {
  date: string
  value: number
  [key: string]: string | number
}

interface FinanceChartProps {
  data: DataPoint[]
  dataKey?: string
  color?: "orange" | "gold" | "green" | "red"
  height?: number
  showAxes?: boolean
  showTooltip?: boolean
  className?: string
  gradientOpacity?: number
}

const colorMap = {
  orange: {
    stroke: "#ff6b35",
    fill: "#ff6b35",
  },
  gold: {
    stroke: "#d4af37",
    fill: "#d4af37",
  },
  green: {
    stroke: "#00c853",
    fill: "#00c853",
  },
  red: {
    stroke: "#ff5252",
    fill: "#ff5252",
  },
}

export function FinanceChart({
  data,
  dataKey = "value",
  color = "orange",
  height = 280,
  showAxes = false,
  showTooltip = true,
  className,
  gradientOpacity = 0.3,
}: FinanceChartProps) {
  const colors = colorMap[color]
  const gradientId = `gradient-${color}-${Math.random().toString(36).substr(2, 9)}`

  // Determine if trend is up or down for auto-coloring (reserved for future use)
  const _trend = useMemo(() => {
    if (data.length < 2) return "neutral"
    const first = data[0][dataKey] as number
    const last = data[data.length - 1][dataKey] as number
    return last >= first ? "up" : "down"
  }, [data, dataKey])
  // Note: _trend can be used for auto-color selection in the future
  void _trend

  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(0)}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  if (!data || data.length === 0) {
    return (
      <div
        className={cn("flex items-center justify-center text-muted-foreground", className)}
        style={{ height }}
      >
        No data available
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.fill} stopOpacity={gradientOpacity} />
              <stop offset="100%" stopColor={colors.fill} stopOpacity={0} />
            </linearGradient>
          </defs>

          {showAxes && (
            <>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#8e8e93" }}
                tickFormatter={formatDate}
                minTickGap={50}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#8e8e93" }}
                tickFormatter={formatValue}
                width={50}
              />
            </>
          )}

          {showTooltip && (
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const point = payload[0].payload as DataPoint
                return (
                  <div className="rounded-lg bg-rh-card border border-white/10 px-3 py-2 shadow-xl">
                    <p className="text-xs text-muted-foreground">
                      {formatDate(point.date)}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatValue(point[dataKey] as number)}
                    </p>
                  </div>
                )
              }}
              cursor={{
                stroke: colors.stroke,
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />
          )}

          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={colors.stroke}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
