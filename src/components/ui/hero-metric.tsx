import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface HeroMetricProps {
  value: string
  change?: {
    value: number
    percent: number
    direction: "up" | "down"
  }
  period?: string
  badge?: string
  label?: string
  className?: string
}

export function HeroMetric({
  value,
  change,
  period,
  badge,
  label,
  className,
}: HeroMetricProps) {
  const formatChange = (val: number) => {
    const absVal = Math.abs(val)
    if (absVal >= 1000000) {
      return `$${(absVal / 1000000).toFixed(1)}M`
    }
    if (absVal >= 1000) {
      return `$${(absVal / 1000).toFixed(1)}K`
    }
    return `$${absVal.toFixed(0)}`
  }

  return (
    <div className={cn("flex flex-col items-center py-6", className)}>
      {/* Optional label */}
      {label && (
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
      )}

      {/* Main value */}
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </h1>

      {/* Change indicator */}
      {change && (
        <div className={cn(
          "flex items-center gap-1 mt-2",
          change.direction === "up" ? "text-rh-positive" : "text-rh-negative"
        )}>
          {change.direction === "up" ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span className="text-sm font-semibold tabular-nums">
            {change.direction === "up" ? "+" : "-"}
            {formatChange(change.value)} ({change.percent.toFixed(2)}%)
          </span>
        </div>
      )}

      {/* Period and badge */}
      <div className="flex items-center gap-2 mt-1">
        {period && (
          <span className="text-xs text-muted-foreground">{period}</span>
        )}
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-rh-accent/20 text-rh-accent font-medium">
            {badge}
          </span>
        )}
      </div>
    </div>
  )
}
