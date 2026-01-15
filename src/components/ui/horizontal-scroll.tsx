import { cn } from "@/lib/utils"

interface HorizontalScrollProps {
  children: React.ReactNode
  className?: string
  gap?: number
  padding?: number
}

export function HorizontalScroll({
  children,
  className,
  gap = 12,
  padding = 16,
}: HorizontalScrollProps) {
  return (
    <div className="overflow-hidden">
      <div
        data-swipe-ignore
        className={cn(
          "flex overflow-x-auto scrollbar-hide",
          className
        )}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          paddingLeft: padding,
          paddingRight: padding,
          gap,
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Section wrapper with title
interface HorizontalScrollSectionProps extends HorizontalScrollProps {
  title?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function HorizontalScrollSection({
  title,
  action,
  children,
  className,
  gap,
  padding,
}: HorizontalScrollSectionProps) {
  return (
    <div className="space-y-3">
      {(title || action) && (
        <div className="flex items-center justify-between px-4">
          {title && (
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="text-sm text-rh-accent font-medium"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
      <HorizontalScroll className={className} gap={gap} padding={padding}>
        {children}
      </HorizontalScroll>
    </div>
  )
}
