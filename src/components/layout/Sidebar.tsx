import { useState, useEffect } from "react"
import {
  Gauge,
  Package,
  Megaphone,
  Users,
  Settings,
  ShoppingBag,
  CreditCard,
  Mail,
  Store,
  Database,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Warehouse,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"

interface SyncStatusData {
  source: string
  status: string
  completed_at: string
  records_synced: number
}

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: <Gauge size={22} />, href: "/" },
  { label: "Products", icon: <Package size={22} />, href: "/products" },
  { label: "Customers", icon: <Users size={22} />, href: "/customers" },
  { label: "Finance", icon: <CreditCard size={22} />, href: "/finance" },
  { label: "Inventory", icon: <Warehouse size={22} />, href: "/inventory" },
  { label: "Marketing", icon: <Megaphone size={22} />, href: "/marketing" },
  { label: "Email", icon: <Mail size={22} />, href: "/email" },
  { label: "Forecast", icon: <TrendingUp size={22} />, href: "/forecasting" },
]

const platformItems: NavItem[] = [
  { label: "Shopify", icon: <ShoppingBag size={22} />, href: "/shopify" },
  { label: "Meta", icon: <Megaphone size={22} />, href: "/meta" },
  { label: "Banking", icon: <CreditCard size={22} />, href: "/banking" },
]

export interface ShopInfo {
  name: string
  domain: string
  currency: string
  plan_display_name: string
  shop_owner: string
  email: string
  created_at: string
}

interface SidebarProps {
  currentPath?: string
  shopInfo?: ShopInfo | null
  variant?: "desktop" | "mobile"
  onNavigate?: (href: string) => void
}

export function Sidebar({ currentPath = "/", shopInfo, variant = "desktop", onNavigate }: SidebarProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatusData[]>([])
  const [syncing, setSyncing] = useState(false)
  const [showSyncPopup, setShowSyncPopup] = useState(false)
  const isMobile = variant === "mobile"

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await apiFetch(`/api/sync/status`)
        if (res.ok) {
          const data = await res.json()
          setSyncStatus(data || [])
        }
      } catch (error) {
        console.error("Failed to fetch sync status:", error)
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  const triggerSync = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setSyncing(true)
    try {
      await apiFetch(`/api/sync/all`, { method: "POST" })
      setTimeout(async () => {
        const res = await apiFetch(`/api/sync/status`)
        if (res.ok) setSyncStatus(await res.json())
        setSyncing(false)
      }, 3000)
    } catch {
      setSyncing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "failed":
        return <XCircle className="h-3 w-3 text-red-500" />
      case "running":
        return <RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-3 w-3 text-yellow-500" />
    }
  }

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "Never"
    const diffMins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  const sources = ["shopify", "plaid", "omnisend", "meta"]
  const allSynced = sources.every((s) => syncStatus.find((st) => st.source === s)?.status === "completed")

  // Get initials from shop name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar-background",
        isMobile ? "w-full" : "hidden h-screen w-20 border-r md:flex"
      )}
    >
      {/* Logo / Shop Icon */}
      <div
        className={cn(
          "flex items-center border-b",
          isMobile ? "justify-between gap-3 px-4 py-4" : "h-16 justify-center"
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          {shopInfo?.name ? getInitials(shopInfo.name) : <Store size={20} />}
        </div>
        {isMobile && (
          <div className="flex-1">
            <p className="text-sm font-semibold text-sidebar-foreground">
              {shopInfo?.name || "Analytics LG"}
            </p>
            <p className="text-xs text-sidebar-foreground/60">
              {shopInfo?.domain || "analytics-lg"}
            </p>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav
        className={cn(
          "flex-1 py-4",
          isMobile ? "flex flex-col gap-1 px-3" : "flex flex-col items-center space-y-1 overflow-y-auto"
        )}
      >
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={(event) => {
              if (onNavigate) {
                event.preventDefault()
                onNavigate(item.href)
              }
            }}
            className={cn(
              isMobile
                ? "flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
                : "flex flex-col items-center justify-center w-16 py-2 rounded-lg transition-colors group",
              currentPath === item.href
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            {item.icon}
            <span className={cn("font-medium", isMobile ? "text-sm" : "text-[10px] mt-1")}>
              {item.label}
            </span>
          </a>
        ))}

        {/* Divider */}
        <div className={cn("border-t border-sidebar-foreground/20 my-2", isMobile ? "w-full" : "w-10")} />

        {/* Platforms */}
        {platformItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={(event) => {
              if (onNavigate) {
                event.preventDefault()
                onNavigate(item.href)
              }
            }}
            className={cn(
              isMobile
                ? "flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
                : "flex flex-col items-center justify-center w-16 py-2 rounded-lg transition-colors group",
              currentPath === item.href
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            {item.icon}
            <span className={cn("font-medium", isMobile ? "text-sm" : "text-[10px] mt-1")}>
              {item.label}
            </span>
          </a>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className={cn("flex border-t", isMobile ? "flex-col px-3 py-4 gap-2" : "flex-col items-center py-4 space-y-2")}>
        {/* Data Sync */}
        <div className="relative">
          <button
            onClick={() => setShowSyncPopup(!showSyncPopup)}
            className={cn(
              isMobile
                ? "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm"
                : "flex flex-col items-center justify-center w-16 py-2 rounded-lg transition-colors",
              "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <div className="relative">
              <Database size={22} />
              <span
                className={cn(
                  "absolute -top-1 -right-1 h-2 w-2 rounded-full",
                  allSynced ? "bg-green-500" : "bg-yellow-500"
                )}
              />
            </div>
            <span className={cn("font-medium", isMobile ? "text-sm" : "text-[10px] mt-1")}>Sync</span>
          </button>

          {/* Sync Popup */}
          {showSyncPopup && (
            <div
              className={cn(
                "absolute z-50 w-48 rounded-lg border bg-popover p-3 shadow-lg",
                isMobile ? "left-0 right-0 top-full mt-2 w-full" : "bottom-full left-full ml-2 mb-2"
              )}
            >
              <p className="text-xs font-semibold mb-2 text-popover-foreground">Data Sync Status</p>
              <div className="space-y-2">
                {sources.map((source) => {
                  const status = syncStatus.find((s) => s.source === source)
                  return (
                    <div key={source} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status?.status || "pending")}
                        <span className="capitalize text-popover-foreground">{source}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {status ? formatTime(status.completed_at) : "Never"}
                      </span>
                    </div>
                  )
                })}
              </div>
              <button
                onClick={triggerSync}
                disabled={syncing}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
                {syncing ? "Syncing..." : "Sync Now"}
              </button>
            </div>
          )}
        </div>

        {/* Settings */}
        <a
          href="/settings"
          className={cn(
            isMobile
              ? "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm"
              : "flex flex-col items-center justify-center w-16 py-2 rounded-lg transition-colors",
            currentPath === "/settings"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Settings size={22} />
          <span className={cn("font-medium", isMobile ? "text-sm" : "text-[10px] mt-1")}>Settings</span>
        </a>
      </div>
    </aside>
  )
}
