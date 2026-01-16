import { cn } from "@/lib/utils"

interface TimeRangeSelectorProps {
  options: string[]
  selected: string
  onSelect: (option: string) => void
  className?: string
}

export function TimeRangeSelector({
  options,
  selected,
  onSelect,
  className,
}: TimeRangeSelectorProps) {
  return (
    <div className={cn("flex items-center justify-center gap-1 py-2", className)}>
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onSelect(option)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-full",
            "transition-all duration-200 touch-manipulation",
            selected === option
              ? "bg-white text-black"
              : "text-muted-foreground hover:text-foreground active:bg-white/10"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

// Preset time range options
export const TIME_RANGES = {
  short: ["1D", "1W", "1M"],
  standard: ["1W", "1M", "3M", "YTD", "1Y"],
  full: ["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"],
}
