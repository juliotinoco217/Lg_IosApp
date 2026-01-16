import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sparkline } from "./sparkline"

interface ListItemProps {
  title: string
  subtitle?: string
  value: string
  change?: {
    value: number
    percent: number
  }
  sparklineData?: number[]
  icon?: React.ReactNode
  showChevron?: boolean
  onClick?: () => void
  className?: string
}

export function ListItem({
  title,
  subtitle,
  value,
  change,
  sparklineData,
  icon,
  showChevron = false,
  onClick,
  className,
}: ListItemProps) {
  const isPositive = change ? change.value >= 0 : true

  const content = (
    <>
      {/* Left side - icon and title */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rh-card flex items-center justify-center">
            {icon}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Center - sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="flex-shrink-0 mx-3">
          <Sparkline data={sparklineData} width={60} height={24} />
        </div>
      )}

      {/* Right side - value and change */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex flex-col items-end">
          <p className="text-sm font-semibold text-foreground tabular-nums">
            {value}
          </p>
          {change && (
            <p className={cn(
              "text-xs tabular-nums",
              isPositive ? "text-rh-positive" : "text-rh-negative"
            )}>
              {isPositive ? "+" : ""}{change.percent.toFixed(2)}%
            </p>
          )}
        </div>
        {showChevron && (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "flex items-center w-full px-4 py-3",
          "border-b border-border last:border-b-0",
          "hover:bg-rh-card/50 active:bg-rh-card",
          "transition-colors duration-150 touch-manipulation",
          "text-left",
          className
        )}
      >
        {content}
      </button>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center px-4 py-3",
        "border-b border-border last:border-b-0",
        className
      )}
    >
      {content}
    </div>
  )
}
