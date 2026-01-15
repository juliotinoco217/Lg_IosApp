import { useState, useCallback } from "react"
import { Sidebar } from "./Sidebar"
import type { ShopInfo } from "./Sidebar"
import { Header } from "./Header"
import type { DateRangeValue } from "./Header"
import { BottomTabBar } from "./BottomTabBar"
import { SlidingTabs } from "./SlidingTabs"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useSwipe } from "@/hooks/useSwipe"

// Navigation tabs for SlidingTabs component
const navigationTabs = [
  { id: "/", label: "KPIs" },
  { id: "/products", label: "Products" },
  { id: "/customers", label: "Customers" },
  { id: "/finance", label: "Finance" },
  { id: "/inventory", label: "Inventory" },
  { id: "/marketing", label: "Marketing" },
  { id: "/email", label: "Email" },
  { id: "/forecasting", label: "Forecast" },
  { id: "/shopify", label: "Shopify" },
  { id: "/meta", label: "Meta" },
  { id: "/banking", label: "Banking" },
]

interface LayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  currentPath?: string
  shopInfo?: ShopInfo | null
  dateRange: DateRangeValue
  onDateRangeChange: (value: DateRangeValue) => void
  onRefresh?: () => void
  onLogout?: () => void
  onNavigate?: (href: string) => void
}

export function Layout({ children, title, subtitle, currentPath, shopInfo, dateRange, onDateRangeChange, onRefresh, onLogout, onNavigate }: LayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Get current tab index for swipe navigation
  const currentTabIndex = navigationTabs.findIndex(tab => tab.id === currentPath)

  const goToNextTab = useCallback(() => {
    if (currentTabIndex < navigationTabs.length - 1) {
      onNavigate?.(navigationTabs[currentTabIndex + 1].id)
    }
  }, [currentTabIndex, onNavigate])

  const goToPrevTab = useCallback(() => {
    if (currentTabIndex > 0) {
      onNavigate?.(navigationTabs[currentTabIndex - 1].id)
    }
  }, [currentTabIndex, onNavigate])

  // Swipe handlers for tab navigation
  const swipeHandlers = useSwipe({
    onSwipeLeft: goToNextTab,
    onSwipeRight: goToPrevTab,
    minSwipeDistance: 75,
    maxSwipeTime: 400,
  })

  return (
    <div className="flex h-screen flex-col bg-background md:flex-row overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar currentPath={currentPath} shopInfo={shopInfo} variant="desktop" />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header
          title={title}
          subtitle={subtitle}
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          onRefresh={onRefresh}
          onLogout={onLogout}
          onOpenNav={() => setMobileNavOpen(true)}
        />

        {/* Mobile Sliding Tabs */}
        <div className="md:hidden border-b border-border flex-shrink-0">
          <SlidingTabs
            tabs={navigationTabs}
            activeTab={currentPath || "/"}
            onTabChange={(id) => onNavigate?.(id)}
          />
        </div>

        <main
          className="flex-1 overflow-y-auto overflow-x-hidden p-3 pb-20 md:p-6 md:pb-6"
          {...swipeHandlers}
        >
          {children}
        </main>
      </div>

      <BottomTabBar
        currentPath={currentPath || "/"}
        onNavigate={(href) => onNavigate?.(href)}
        onOpenNav={() => setMobileNavOpen(true)}
      />

      <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DialogContent className="max-w-xs p-0 max-h-[90vh] overflow-y-auto">
          <Sidebar
            currentPath={currentPath}
            shopInfo={shopInfo}
            variant="mobile"
            onNavigate={(href) => {
              if (href) {
                onNavigate?.(href)
              }
              setMobileNavOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
