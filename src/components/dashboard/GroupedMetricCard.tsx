import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormulaTooltip } from "@/components/ui/formula-tooltip"
import { cn } from "@/lib/utils"

interface MetricItem {
  label: string
  value: string
  sublabel?: string
  highlight?: boolean
  trend?: "up" | "down" | "neutral"
  formula?: string // Formula explanation shown on hover
}

interface GroupedMetricCardProps {
  title: string
  icon?: React.ReactNode
  heroMetric?: {
    label: string
    value: string
    sublabel?: string
    formula?: string
  }
  metrics: MetricItem[]
  columns?: 2 | 3 | 4
  className?: string
}

export function GroupedMetricCard({
  title,
  icon,
  heroMetric,
  metrics,
  columns = 2,
  className,
}: GroupedMetricCardProps) {
  const gridCols = {
    2: "grid-cols-1 xs:grid-cols-2",
    3: "grid-cols-1 xs:grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b border-border/60 bg-background/60 pb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          <CardTitle className="text-sm font-semibold md:text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Hero metric at the top */}
        {heroMetric && (
          <FormulaTooltip formula={heroMetric.formula}>
            <div className="border-b border-border/60 bg-muted/20 px-4 py-3 cursor-help md:px-5 md:py-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground md:text-[11px]">
                {heroMetric.label}
              </p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-primary md:text-2xl lg:text-3xl">
                {heroMetric.value}
              </p>
              {heroMetric.sublabel && (
                <p className="mt-0.5 text-xs text-muted-foreground">{heroMetric.sublabel}</p>
              )}
            </div>
          </FormulaTooltip>
        )}

        {/* Grid of metrics */}
        <div className={cn("grid divide-x divide-y divide-border/60", gridCols[columns])}>
          {metrics.map((metric, idx) => (
            <FormulaTooltip key={idx} formula={metric.formula}>
              <div
                className={cn(
                  "px-4 py-3 transition-colors hover:bg-muted/20 md:py-4",
                  metric.highlight && "bg-muted/10",
                  metric.formula && "cursor-help"
                )}
              >
                <p className="text-[11px] font-medium text-muted-foreground md:text-xs">{metric.label}</p>
                <p
                  className={cn(
                    "mt-1 text-base font-semibold tabular-nums md:text-lg",
                    metric.trend === "up" && "text-green-600",
                    metric.trend === "down" && "text-red-600"
                  )}
                >
                  {metric.value}
                </p>
                {metric.sublabel && (
                  <p className="text-xs text-muted-foreground">{metric.sublabel}</p>
                )}
              </div>
            </FormulaTooltip>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
