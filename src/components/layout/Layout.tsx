import { useState, useCallback } from "react"
import { Sidebar } from "./Sidebar"
import type { ShopInfo } from "./Sidebar"
import { Header } from "./Header"
import type { DateRangeValue } from "./Header"
import { BottomTabBar } from "./BottomTabBar"
import type { BottomSection } from "./BottomTabBar"
import { SlidingTabs } from "./SlidingTabs"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useSwipe } from "@/hooks/useSwipe"

// Section-specific tabs
const sectionTabs: Record<BottomSection, { id: string; label: string }[]> = {
  finance: [
    { id: "/finance", label: "Finance" },
  ],
  shop: [
    { id: "/", label: "Dashboard" },
    { id: "/customers", label: "Customers" },
    { id: "/products", label: "Products" },
    { id: "/inventory", label: "Inventory" },
  ],
  marketing: [
    { id: "/meta", label: "Meta" },
    { id: "/email", label: "Email" },
  ],
  settings: [],
}

// Map page paths to their section
export const pathToSection: Record<string, BottomSection> = {
  "/finance": "finance",
  "/": "shop",
  "/customers": "shop",
  "/products": "shop",
  "/inventory": "shop",
  "/meta": "marketing",
  "/email": "marketing",
  "/settings": "settings",
}

// Default tab for each section
export const sectionDefaultTab: Record<BottomSection, string> = {
  finance: "/finance",
  shop: "/",
  marketing: "/meta",
  settings: "/settings",
}

interface LayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  currentPath?: string
  activeSection: BottomSection
  shopInfo?: ShopInfo | null
  dateRange: DateRangeValue
  onDateRangeChange: (value: DateRangeValue) => void
  onRefresh?: () => void
  onLogout?: () => void
  onNavigate?: (href: string) => void
  onSectionChange: (section: BottomSection) => void
}

export function Layout({ children, title, subtitle, currentPath, activeSection, shopInfo, dateRange, onDateRangeChange, onRefresh, onLogout, onNavigate, onSectionChange }: LayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Get tabs for current section
  const currentTabs = sectionTabs[activeSection] || []

  // Get current tab index for swipe navigation within section
  const currentTabIndex = currentTabs.findIndex(tab => tab.id === currentPath)

  const goToNextTab = useCallback(() => {
    if (currentTabIndex < currentTabs.length - 1) {
      onNavigate?.(currentTabs[currentTabIndex + 1].id)
    }
  }, [currentTabIndex, currentTabs, onNavigate])

  const goToPrevTab = useCallback(() => {
    if (currentTabIndex > 0) {
      onNavigate?.(currentTabs[currentTabIndex - 1].id)
    }
  }, [currentTabIndex, currentTabs, onNavigate])

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

        {/* Mobile Sliding Tabs - only show if section has multiple tabs */}
        {currentTabs.length > 1 && (
          <div className="md:hidden border-b border-border flex-shrink-0">
            <SlidingTabs
              tabs={currentTabs}
              activeTab={currentPath || "/"}
              onTabChange={(id) => onNavigate?.(id)}
            />
          </div>
        )}

        <main
          className="flex-1 overflow-y-auto overflow-x-hidden p-3 pb-20 md:p-6 md:pb-6"
          {...swipeHandlers}
        >
          {children}
        </main>
      </div>

      <BottomTabBar
        activeSection={activeSection}
        onSectionChange={onSectionChange}
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
