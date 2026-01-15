import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
}

export function MetricCard({ title, value, change, changeLabel, icon }: MetricCardProps) {
  const isPositive = change && change > 0
  const isNegative = change && change < 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <span
              className={cn(
                "flex items-center gap-0.5",
                isPositive && "text-green-600",
                isNegative && "text-red-600"
              )}
            >
              {isPositive && <TrendingUp size={12} />}
              {isNegative && <TrendingDown size={12} />}
              {isPositive && "+"}
              {change}%
            </span>
            {changeLabel && <span>{changeLabel}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
