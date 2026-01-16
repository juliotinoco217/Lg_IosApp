import { cn } from "@/lib/utils"
import { Sparkline } from "./sparkline"

interface MarketCardProps {
  title: string
  value: string
  change?: {
    value: number
    percent: number
  }
  sparklineData?: number[]
  onClick?: () => void
  className?: string
}

export function MarketCard({
  title,
  value,
  change,
  sparklineData,
  onClick,
  className,
}: MarketCardProps) {
  const isPositive = change ? change.value >= 0 : true

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col min-w-[140px] p-4 rounded-xl",
        "bg-rh-card hover:bg-rh-card-hover",
        "transition-all duration-200 touch-manipulation",
        "text-left",
        onClick && "active:scale-[0.98]",
        className
      )}
    >
      {/* Title */}
      <p className="text-sm text-muted-foreground truncate">{title}</p>

      {/* Value */}
      <p className="text-lg font-semibold text-foreground mt-1 tabular-nums">
        {value}
      </p>

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-2">
          <Sparkline data={sparklineData} width={100} height={24} />
        </div>
      )}

      {/* Change indicator */}
      {change && (
        <p className={cn(
          "text-xs font-medium mt-2 tabular-nums",
          isPositive ? "text-rh-positive" : "text-rh-negative"
        )}>
          {isPositive ? "+" : ""}{change.percent.toFixed(2)}%
        </p>
      )}
    </button>
  )
}
