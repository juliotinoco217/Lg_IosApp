import { useState, useEffect } from "react"
import { Calendar as CalendarIcon, RefreshCw, ChevronDown, X, LogOut, Menu } from "lucide-react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export const dateRangeOptions = [
  { label: "Today", value: "today", days: 1 },
  { label: "Yesterday", value: "yesterday", days: 1 },
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 14 days", value: "14d", days: 14 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 90 days", value: "90d", days: 90 },
  { label: "This month", value: "this_month", days: 30 },
  { label: "Last month", value: "last_month", days: 30 },
  { label: "This year", value: "this_year", days: 365 },
]

// DateRangeValue can be a preset string or a custom range string like "custom:2024-01-01:2024-01-31"
export type DateRangeValue = typeof dateRangeOptions[number]["value"] | `custom:${string}:${string}`

export interface CustomDateRange {
  start: Date
  end: Date
}

export function parseCustomRange(value: DateRangeValue): CustomDateRange | null {
  if (typeof value === "string" && value.startsWith("custom:")) {
    const [, startStr, endStr] = value.split(":")
    // Parse as local date, not UTC
    const [startYear, startMonth, startDay] = startStr.split("-").map(Number)
    const [endYear, endMonth, endDay] = endStr.split("-").map(Number)
    return {
      start: new Date(startYear, startMonth - 1, startDay),
      end: new Date(endYear, endMonth - 1, endDay),
    }
  }
  return null
}

interface HeaderProps {
  title: string
  subtitle?: string
  dateRange: DateRangeValue
  onDateRangeChange: (value: DateRangeValue) => void
  onRefresh?: () => void
  onLogout?: () => void
  onOpenNav?: () => void
}

export function Header({ title, subtitle, dateRange, onDateRangeChange, onRefresh, onLogout, onOpenNav }: HeaderProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(undefined)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const isCustomRange = dateRange.startsWith("custom:")
  const customRange = parseCustomRange(dateRange)

  const getSelectedLabel = () => {
    if (isCustomRange && customRange) {
      // If start and end are the same, show single date
      if (customRange.start.getTime() === customRange.end.getTime()) {
        return format(customRange.start, "MMM d, yyyy")
      }
      return `${format(customRange.start, "MMM d")} - ${format(customRange.end, "MMM d, yyyy")}`
    }
    return dateRangeOptions.find((o) => o.value === dateRange)?.label || "Last 30 days"
  }

  const handleApplyCustomRange = () => {
    if (selectedRange?.from) {
      const startStr = format(selectedRange.from, "yyyy-MM-dd")
      // If no end date, use start date (single day)
      const endStr = selectedRange.to ? format(selectedRange.to, "yyyy-MM-dd") : startStr
      onDateRangeChange(`custom:${startStr}:${endStr}`)
      setIsDialogOpen(false)
      setSelectedRange(undefined)
    }
  }

  const handlePresetSelect = (value: string) => {
    onDateRangeChange(value as DateRangeValue)
  }

  const handleOpenCustomDialog = () => {
    // Start fresh - no pre-selection
    setSelectedRange(undefined)
    setIsDialogOpen(true)
  }

  const handleClearSelection = () => {
    setSelectedRange(undefined)
  }

  const getSelectionText = () => {
    if (!selectedRange?.from) {
      return "Click a date to start selecting"
    }
    if (!selectedRange.to) {
      return `${format(selectedRange.from, "MMM d, yyyy")} → Click another date or Apply for single day`
    }
    if (selectedRange.from.getTime() === selectedRange.to.getTime()) {
      return format(selectedRange.from, "MMMM d, yyyy")
    }
    return `${format(selectedRange.from, "MMM d, yyyy")} → ${format(selectedRange.to, "MMM d, yyyy")}`
  }

  return (
    <header className="flex flex-col gap-3 border-b bg-background px-4 py-3 pt-[max(env(safe-area-inset-top),12px)] md:h-16 md:flex-row md:items-center md:justify-between md:px-6 md:pt-3">
      <div className="flex items-start gap-3 md:items-center">
        {onOpenNav && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:hidden"
            onClick={onOpenNav}
            title="Open menu"
          >
            <Menu size={18} />
          </Button>
        )}
        <div>
          <h1 className="text-lg font-semibold text-foreground md:text-xl">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground md:text-sm">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 max-w-[140px] xs:max-w-[180px] md:max-w-[220px]">
              <CalendarIcon size={14} className="shrink-0" />
              <span className="truncate text-xs md:text-sm">{getSelectedLabel()}</span>
              <ChevronDown size={12} className="shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {dateRangeOptions.slice(0, 2).map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handlePresetSelect(option.value)}
                className={dateRange === option.value ? "bg-accent" : ""}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {dateRangeOptions.slice(2, 6).map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handlePresetSelect(option.value)}
                className={dateRange === option.value ? "bg-accent" : ""}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {dateRangeOptions.slice(6).map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handlePresetSelect(option.value)}
                className={dateRange === option.value ? "bg-accent" : ""}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleOpenCustomDialog}
              className={isCustomRange ? "bg-accent" : ""}
            >
              Custom Range...
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-fit">
            <DialogHeader>
              <DialogTitle>Select Date Range</DialogTitle>
            </DialogHeader>

            <div className="pt-2">
              {/* Selection indicator */}
              <div className="flex items-center justify-between mb-4 px-1">
                <p className="text-sm text-muted-foreground">
                  {getSelectionText()}
                </p>
                {selectedRange?.from && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} className="mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Calendar with range selection */}
              <Calendar
                mode="range"
                selected={selectedRange}
                onSelect={setSelectedRange}
                numberOfMonths={isMobile ? 1 : 2}
                disabled={(date: Date) => date > new Date()}
                defaultMonth={new Date(new Date().getFullYear(), new Date().getMonth() - 1)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleApplyCustomRange}
                disabled={!selectedRange?.from}
              >
                Apply
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="icon" className="h-8 w-8" onClick={onRefresh}>
          <RefreshCw size={16} />
        </Button>

        {onLogout && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onLogout}
            title="Sign out"
          >
            <LogOut size={16} />
          </Button>
        )}
      </div>
    </header>
  )
}
