import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

interface FormulaTooltipProps {
  children: React.ReactNode
  formula?: string
  className?: string
  delay?: number // Delay in ms before showing tooltip
}

export function FormulaTooltip({
  children,
  formula,
  className,
  delay = 800, // Show after 800ms hover
}: FormulaTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isTouchDevice = useRef(false)

  const handleMouseEnter = () => {
    if (isTouchDevice.current || !formula) return
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  // Touch support - tap to toggle
  const handleTouchStart = useCallback(() => {
    isTouchDevice.current = true
  }, [])

  const handleClick = useCallback(() => {
    if (!isTouchDevice.current || !formula) return
    setIsVisible(prev => !prev)
  }, [formula])

  // Close on tap outside for touch devices
  useEffect(() => {
    if (!isVisible || !isTouchDevice.current) return

    const handleTapOutside = (e: TouchEvent | MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsVisible(false)
      }
    }

    document.addEventListener("touchstart", handleTapOutside)
    document.addEventListener("mousedown", handleTapOutside)
    return () => {
      document.removeEventListener("touchstart", handleTapOutside)
      document.removeEventListener("mousedown", handleTapOutside)
    }
  }, [isVisible])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  if (!formula) {
    return <>{children}</>
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            "absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2",
            "px-3 py-2 rounded-lg shadow-lg",
            "bg-slate-900 dark:bg-slate-800 text-white text-xs",
            "whitespace-pre-line max-w-xs",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            "before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2",
            "before:border-4 before:border-transparent before:border-t-slate-900 dark:before:border-t-slate-800"
          )}
        >
          <div className="font-semibold text-slate-300 mb-1">Formula:</div>
          <div className="font-mono">{formula}</div>
        </div>
      )}
    </div>
  )
}
