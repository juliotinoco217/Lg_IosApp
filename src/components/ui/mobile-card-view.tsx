import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/useMobile"

interface MobileCardField {
  label: string
  value: string | number
  highlight?: boolean
  colorClass?: string
}

type BadgeVariant = "positive" | "negative" | "warning" | "neutral"

interface MobileCardData {
  title: string
  subtitle?: string
  fields: MobileCardField[]
  badge?: {
    text: string
    variant: BadgeVariant
  }
  actions?: React.ReactNode
}

interface MobileCardViewProps<T> {
  data: T[]
  renderCard: (item: T, index: number) => MobileCardData
  renderTable: () => React.ReactNode
  emptyMessage?: string
  className?: string
}

const badgeVariants: Record<BadgeVariant, string> = {
  positive: "bg-rh-positive/10 text-rh-positive border-rh-positive/30",
  negative: "bg-rh-negative/10 text-rh-negative border-rh-negative/30",
  warning: "bg-rh-accent-gold/10 text-rh-accent-gold border-rh-accent-gold/30",
  neutral: "bg-muted text-muted-foreground border-border",
}

export function MobileCardView<T>({
  data,
  renderCard,
  renderTable,
  emptyMessage = "No data available",
  className,
}: MobileCardViewProps<T>) {
  const isMobile = useMobile(768) // Use md breakpoint

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    )
  }

  // Desktop: render table
  if (!isMobile) {
    return <>{renderTable()}</>
  }

  // Mobile: render cards
  return (
    <div className={cn("space-y-3", className)}>
      {data.map((item, index) => {
        const cardData = renderCard(item, index)
        return (
          <div
            key={index}
            className="rounded-xl bg-rh-card p-4 border border-border/40"
          >
            {/* Header: Title, subtitle, badge */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground truncate">
                  {cardData.title}
                </h4>
                {cardData.subtitle && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {cardData.subtitle}
                  </p>
                )}
              </div>
              {cardData.badge && (
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold border ml-2 flex-shrink-0",
                    badgeVariants[cardData.badge.variant]
                  )}
                >
                  {cardData.badge.text}
                </span>
              )}
            </div>

            {/* Fields grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {cardData.fields.map((field, fieldIndex) => (
                <div
                  key={fieldIndex}
                  className={cn(
                    field.highlight && "col-span-2 pt-2 border-t border-border/40 mt-1"
                  )}
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {field.label}
                  </p>
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      field.colorClass || "text-foreground"
                    )}
                  >
                    {field.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Actions */}
            {cardData.actions && (
              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/40">
                {cardData.actions}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
