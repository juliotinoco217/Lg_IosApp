import { Home, Search, Activity, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomTabBarProps {
  currentPath: string
  onNavigate: (href: string) => void
  onOpenNav: () => void
}

// Simplified Robinhood-style bottom tabs
const tabs = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Browse", icon: Search, action: "browse" },
  { label: "Activity", icon: Activity, href: "/finance" },
  { label: "Profile", icon: User, action: "profile" },
]

export function BottomTabBar({ currentPath, onNavigate, onOpenNav }: BottomTabBarProps) {
  const handleTabPress = (tab: typeof tabs[0]) => {
    if ('action' in tab && tab.action) {
      // For browse/profile actions, open nav drawer
      onOpenNav()
    } else if ('href' in tab && tab.href) {
      onNavigate(tab.href)
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-rh-card/95 backdrop-blur-md bottom-tab-bar border-t border-white/10">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = 'href' in tab && tab.href === currentPath
          const Icon = tab.icon

          return (
            <button
              key={tab.label}
              onClick={() => handleTabPress(tab)}
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
