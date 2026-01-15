import { useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface Tab {
  id: string
  label: string
}

interface SlidingTabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (id: string) => void
  className?: string
}

export function SlidingTabs({ tabs, activeTab, onTabChange, className }: SlidingTabsProps) {
  const tabsRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLButtonElement>(null)

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (activeTabRef.current && tabsRef.current) {
      const container = tabsRef.current
      const activeElement = activeTabRef.current
      const containerWidth = container.offsetWidth
      const elementLeft = activeElement.offsetLeft
      const elementWidth = activeElement.offsetWidth

      // Center the active tab
      const scrollPosition = elementLeft - (containerWidth / 2) + (elementWidth / 2)
      container.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth'
      })
    }
  }, [activeTab])

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        ref={tabsRef}
        data-swipe-ignore
        className="flex overflow-x-auto scrollbar-hide gap-1 px-4 py-2 bg-background"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative px-4 py-2 text-sm font-medium whitespace-nowrap rounded-full",
                "transition-all duration-200 touch-manipulation select-none-touch",
                "flex-shrink-0",
                isActive
                  ? "bg-white text-black"
                  : "text-muted-foreground hover:text-foreground active:bg-white/10"
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {/* Bottom fade gradient for scroll indication */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  )
}
