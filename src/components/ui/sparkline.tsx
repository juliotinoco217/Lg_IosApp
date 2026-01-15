import { useMemo } from "react"
import { LineChart, Line, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: "auto" | "green" | "red" | "orange" | "gold"
  strokeWidth?: number
  className?: string
}

const colorValues = {
  green: "#00c853",
  red: "#ff5252",
  orange: "#ff6b35",
  gold: "#d4af37",
}

export function Sparkline({
  data,
  width = 100,
  height = 30,
  color = "auto",
  strokeWidth = 1.5,
  className,
}: SparklineProps) {
  // Transform raw numbers into chart data
  const chartData = useMemo(() => {
    return data.map((value, index) => ({ index, value }))
  }, [data])

  // Determine color based on trend if auto
  const strokeColor = useMemo(() => {
    if (color !== "auto") {
      return colorValues[color]
    }
    if (data.length < 2) return colorValues.orange
    const first = data[0]
    const last = data[data.length - 1]
    return last >= first ? colorValues.green : colorValues.red
  }, [data, color])

  if (!data || data.length === 0) {
    return (
      <div
        className={cn("flex items-center justify-center", className)}
        style={{ width, height }}
      >
        <span className="text-[8px] text-muted-foreground">-</span>
      </div>
    )
  }

  return (
    <div className={cn("", className)} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Utility to generate sparkline data from a time series
export function generateSparklineData(
  timeSeries: { date: string; value: number }[],
  limit?: number
): number[] {
  const values = timeSeries.map(d => d.value)
  if (limit && values.length > limit) {
    return values.slice(-limit)
  }
  return values
}
