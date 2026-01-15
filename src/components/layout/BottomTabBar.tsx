import { Wallet, Store, Megaphone, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export type BottomSection = "finance" | "shop" | "marketing" | "settings"

interface BottomTabBarProps {
  activeSection: BottomSection
  onSectionChange: (section: BottomSection) => void
}

const tabs: { label: string; icon: typeof Wallet; section: BottomSection }[] = [
  { label: "Finance", icon: Wallet, section: "finance" },
  { label: "Shop", icon: Store, section: "shop" },
  { label: "Marketing", icon: Megaphone, section: "marketing" },
  { label: "Settings", icon: Settings, section: "settings" },
]

export function BottomTabBar({ activeSection, onSectionChange }: BottomTabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-rh-card/95 backdrop-blur-md bottom-tab-bar border-t border-white/10">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = tab.section === activeSection
          const Icon = tab.icon

          return (
            <button
              key={tab.label}
              onClick={() => onSectionChange(tab.section)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-20 h-full touch-manipulation select-none-touch",
                "transition-all duration-200 active:scale-95",
                isActive
                  ? "text-rh-accent"
                  : "text-rh-text-secondary hover:text-rh-text active:text-rh-accent"
              )}
            >
              <Icon
                className="h-6 w-6"
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span className={cn(
                "text-[10px] tracking-wide",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
