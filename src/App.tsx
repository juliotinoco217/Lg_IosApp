import { useState, useEffect, useCallback } from "react"
import { Layout, pathToSection, sectionDefaultTab } from "@/components/layout/Layout"
import type { BottomSection } from "@/components/layout/BottomTabBar"
import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard"
import { EmailDashboard } from "@/components/dashboard/EmailDashboard"
import { ProductsDashboard } from "@/components/dashboard/ProductsDashboard"
import { CustomersDashboard } from "@/components/dashboard/CustomersDashboard"
import { FinanceDashboard } from "@/components/dashboard/FinanceDashboard"
import { MetaDashboard } from "@/components/dashboard/MetaDashboard"
import { InventoryDashboard } from "@/components/dashboard/InventoryDashboard"
import { Login } from "@/components/Login"
import { AuthProvider, useAuth } from "@/context/AuthContext"
import { RealtimeProvider } from "@/context/RealtimeContext"
import { apiFetch } from "@/lib/api"
import { Loader2, Settings } from "lucide-react"
import type { ShopInfo } from "@/components/layout/Sidebar"
import type { DateRangeValue } from "@/components/layout/Header"
import "./index.css"

type Page = "/" | "/email" | "/products" | "/customers" | "/finance" | "/meta" | "/inventory" | "/settings"

const pageConfig: Record<Page, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Your e-commerce business at a glance" },
  "/email": { title: "Email & SMS", subtitle: "Marketing performance and subscriber metrics" },
  "/products": { title: "Products", subtitle: "Category profitability and product performance" },
  "/customers": { title: "Customers", subtitle: "Customer behavior, retention, and top products" },
  "/finance": { title: "Finance", subtitle: "Cash flow, accounts, and transactions" },
  "/meta": { title: "Meta Ads", subtitle: "Campaign performance, ad creatives, and insights" },
  "/inventory": { title: "Inventory", subtitle: "Stock levels, raw materials, and reorder alerts" },
  "/settings": { title: "Settings", subtitle: "App preferences and configuration" },
}

// Read initial page from URL hash to persist navigation across reloads
const getInitialPage = (): Page => {
  const hash = window.location.hash.slice(1) // Remove the '#'
  if (hash && hash in pageConfig) {
    return hash as Page
  }
  return "/"
}

// Get initial section from page
const getInitialSection = (page: Page): BottomSection => {
  return pathToSection[page] || "shop"
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage)
  const [activeSection, setActiveSection] = useState<BottomSection>(() => getInitialSection(getInitialPage()))
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null)
  const [dateRange, setDateRange] = useState<DateRangeValue>("today")
  const [refreshKey, setRefreshKey] = useState(0)
  const { isAuthenticated, isLoading, logout } = useAuth()

  // All hooks must be called before any conditional returns
  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  // Handle section change from bottom nav
  const handleSectionChange = useCallback((section: BottomSection) => {
    setActiveSection(section)
    const defaultTab = sectionDefaultTab[section] as Page
    setCurrentPage(defaultTab)
  }, [])

  // Persist current page to URL hash so it survives page reloads
  useEffect(() => {
    if (isAuthenticated) {
      window.location.hash = currentPage
    }
  }, [currentPage, isAuthenticated])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (hash && hash in pageConfig) {
        setCurrentPage(hash as Page)
      }
    }
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  // Fetch shop info only when authenticated
  useEffect(() => {
    if (!isAuthenticated) return

    apiFetch(`/api/shopify/shop`)
      .then((res) => res.json())
      .then((data) => {
        if (data.shop) {
          setShopInfo(data.shop)
        }
      })
      .catch((err) => console.error("Failed to fetch shop info:", err))
  }, [isAuthenticated])

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />
  }

  const handleNavigate = (href: string) => {
    if (href && href in pageConfig) {
      setCurrentPage(href as Page)
    }
  }

  // Handle navigation via click events on sidebar links
  const handleNavigation = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const link = target.closest("a")
    if (link) {
      e.preventDefault()
      const href = link.getAttribute("href") as Page
      handleNavigate(href)
    }
  }

  const renderPage = () => {
    switch (currentPage) {
      case "/email":
        return <EmailDashboard dateRange={dateRange} refreshKey={refreshKey} />
      case "/products":
        return <ProductsDashboard dateRange={dateRange} refreshKey={refreshKey} />
      case "/customers":
        return <CustomersDashboard dateRange={dateRange} refreshKey={refreshKey} />
      case "/finance":
        return <FinanceDashboard dateRange={dateRange} refreshKey={refreshKey} />
      case "/meta":
        return <MetaDashboard />
      case "/inventory":
        return <InventoryDashboard />
      case "/settings":
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Settings size={48} className="mb-4 opacity-50" />
            <p className="text-lg">Settings coming soon</p>
          </div>
        )
      case "/":
      default:
        return <OverviewDashboard dateRange={dateRange} refreshKey={refreshKey} />
    }
  }

  const { title, subtitle } = pageConfig[currentPage] || pageConfig["/"]

  return (
    <div onClick={handleNavigation}>
      <Layout
        title={title}
        subtitle={subtitle}
        currentPath={currentPage}
        activeSection={activeSection}
        shopInfo={shopInfo}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={handleRefresh}
        onLogout={logout}
        onNavigate={handleNavigate}
        onSectionChange={handleSectionChange}
      >
        {renderPage()}
      </Layout>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <AppContent />
      </RealtimeProvider>
    </AuthProvider>
  )
}

export default App
