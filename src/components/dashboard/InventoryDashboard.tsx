import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Package,
  Warehouse,
  AlertTriangle,
  Plus,
  Trash2,
  RefreshCw,
  X,
  Edit3,
  Check,
  Search,
  ShoppingCart,
  Layers,
  Box,
  TrendingDown,
  Loader2,
  Calendar,
  History,
  Eye,
  EyeOff,
} from "lucide-react"
import { apiFetch } from "@/lib/api"

// Types
interface InventoryLocation {
  id: string
  location_id: number
  name: string
  city: string | null
  province: string | null
  country: string | null
  active: boolean
}

interface InventoryLevel {
  id: string
  inventory_item_id: number
  location_id: number
  product_id: number | null
  variant_id: number | null
  sku: string | null
  product_title: string | null
  variant_title: string | null
  available: number
  committed: number
  incoming: number
  on_hand: number
  unavailable: number
  price: number | null
  cost: number | null
  active?: boolean
}

interface InventoryHistoryRecord {
  id: string
  inventory_item_id: number
  location_id: number
  sku: string | null
  product_title: string | null
  variant_title: string | null
  available: number
  on_hand: number
  price: number | null
  cost: number | null
  snapshot_date: string
}

type ViewMode = "current" | "historical"

interface InventoryCategory {
  category: string
  count: number
  inStock: number
  outOfStock: number
}

interface ShopifySummary {
  totalSkus: number
  totalUnits: number
  inStockSkus: number
  outOfStockSkus: number
  inventoryValue: number
  inventoryCost: number
  potentialProfit: number
  categories: Array<{
    category: string
    skuCount: number
    units: number
    inventoryValue: number
    inventoryCost: number
  }>
}

interface RawMaterial {
  id: string
  name: string
  sku: string | null
  description: string | null
  category: string
  unit: string
  quantity_on_hand: number
  cost_per_unit: number
  reorder_point: number
  reorder_quantity: number
  lead_time_days: number
  supplier_name: string | null
  supplier_contact: string | null
  notes: string | null
  active: boolean
}

interface ProductMaterial {
  id: string
  product_id: number
  variant_id: number | null
  material_id: string
  quantity_required: number
  notes: string | null
  material_name?: string
  material_unit?: string
  product_title?: string
  variant_title?: string
}

interface InventoryAlert {
  id: string
  alert_type: string
  source_type: string
  source_id: string
  source_name: string
  current_quantity: number
  threshold_quantity: number
  suggested_reorder: number
  status: string
}

interface ReorderSuggestion {
  id: string
  name: string
  sku: string | null
  current_quantity: number
  reorder_point: number
  reorder_quantity: number
  suggested_order: number
  urgency: "critical" | "high" | "medium" | "low"
  lead_time_days: number
  supplier_name: string | null
}

interface InventorySummary {
  totalShopifyProducts: number
  lowStockProducts: number
  totalRawMaterials: number
  lowStockMaterials: number
  activeAlerts: number
  totalInventoryValue: number
}

type TabType = "shopify" | "materials" | "bom" | "alerts"

const categoryOptions = ["packaging", "ingredient", "component", "supply", "other"]
const unitOptions = ["unit", "oz", "lb", "ml", "l", "g", "kg", "piece", "roll", "sheet", "box"]

export function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("shopify")
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Shopify Inventory State
  const [locations, setLocations] = useState<InventoryLocation[]>([])
  const [levels, setLevels] = useState<InventoryLevel[]>([])
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null)
  const [shopifySearch, setShopifySearch] = useState("")
  const [shopifyCategories, setShopifyCategories] = useState<InventoryCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [sortBy, setSortBy] = useState<string>("product_title")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [shopifySummary, setShopifySummary] = useState<ShopifySummary | null>(null)

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("current")
  const [showDiscontinued, setShowDiscontinued] = useState(false)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [historyRecords, setHistoryRecords] = useState<InventoryHistoryRecord[]>([])

  // Raw Materials State
  const [materials, setMaterials] = useState<RawMaterial[]>([])
  const [materialSearch, setMaterialSearch] = useState("")
  const [materialCategory, setMaterialCategory] = useState<string>("")
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null)
  const [materialForm, setMaterialForm] = useState<Partial<RawMaterial>>({})

  // Stock Adjustment Modal
  const [showStockModal, setShowStockModal] = useState(false)
  const [stockAction, setStockAction] = useState<"add" | "deduct" | "adjust">("add")
  const [stockMaterial, setStockMaterial] = useState<RawMaterial | null>(null)
  const [stockQuantity, setStockQuantity] = useState("")
  const [stockNotes, setStockNotes] = useState("")

  // BOM State
  const [productMaterials, setProductMaterials] = useState<ProductMaterial[]>([])
  const [showBomModal, setShowBomModal] = useState(false)
  const [bomProductId, setBomProductId] = useState("")
  const [bomVariantId, setBomVariantId] = useState("")
  const [bomMaterialId, setBomMaterialId] = useState("")
  const [bomQuantity, setBomQuantity] = useState("")

  // Alerts State
  const [alerts, setAlerts] = useState<InventoryAlert[]>([])
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([])
  const [summary, setSummary] = useState<InventorySummary | null>(null)

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === "shopify") {
      fetchLocations()
      fetchShopifyCategories()
      fetchShopifySummary()
      fetchAvailableDates()
      if (viewMode === "current") {
        fetchLevels()
      }
    } else if (activeTab === "materials") {
      fetchMaterials()
    } else if (activeTab === "bom") {
      fetchProductMaterials()
      fetchMaterials()
    } else if (activeTab === "alerts") {
      fetchAlerts()
      fetchReorderSuggestions()
    }
    fetchSummary()
  }, [activeTab])

  // Re-fetch levels when filters change (current view)
  useEffect(() => {
    if (activeTab === "shopify" && viewMode === "current") {
      fetchLevels()
    }
  }, [selectedLocation, selectedCategory, sortBy, sortOrder, showDiscontinued])

  // Fetch history when date or view mode changes
  useEffect(() => {
    if (activeTab === "shopify" && viewMode === "historical" && selectedDate) {
      fetchHistoryRecords()
    }
  }, [viewMode, selectedDate, selectedCategory])

  // Fetch functions
  const fetchLocations = async () => {
    try {
      const res = await apiFetch(`/api/inventory/locations`)
      const data = await res.json()
      setLocations(data.locations || [])
    } catch (error) {
      console.error("Failed to fetch locations:", error)
    }
  }

  const fetchLevels = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedLocation) params.append("locationId", selectedLocation.toString())
      if (selectedCategory) params.append("category", selectedCategory)
      if (sortBy) params.append("sortBy", sortBy)
      if (sortOrder) params.append("sortOrder", sortOrder)
      // Only show active items unless showDiscontinued is true
      if (!showDiscontinued) params.append("activeOnly", "true")
      else params.append("activeOnly", "false")
      const res = await apiFetch(`/api/inventory/levels?${params}`)
      const data = await res.json()
      setLevels(data.levels || [])
    } catch (error) {
      console.error("Failed to fetch levels:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchShopifyCategories = async () => {
    try {
      const res = await apiFetch(`/api/inventory/categories`)
      const data = await res.json()
      setShopifyCategories(data.categories || [])
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }

  const fetchShopifySummary = async () => {
    try {
      const res = await apiFetch(`/api/inventory/shopify-summary`)
      const data = await res.json()
      setShopifySummary(data)
    } catch (error) {
      console.error("Failed to fetch shopify summary:", error)
    }
  }

  const fetchAvailableDates = async () => {
    try {
      const res = await apiFetch(`/api/inventory/history/dates`)
      const data = await res.json()
      setAvailableDates(data.dates || [])
      // Auto-select the most recent date if none selected
      if (data.dates?.length > 0 && !selectedDate) {
        setSelectedDate(data.dates[0])
      }
    } catch (error) {
      console.error("Failed to fetch available dates:", error)
    }
  }

  const fetchHistoryRecords = async () => {
    if (!selectedDate) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("date", selectedDate)
      if (selectedCategory) params.append("category", selectedCategory)
      const res = await apiFetch(`/api/inventory/history?${params}`)
      const data = await res.json()
      setHistoryRecords(data.history || [])
    } catch (error) {
      console.error("Failed to fetch history:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMaterials = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (materialCategory) params.append("category", materialCategory)
      if (materialSearch) params.append("search", materialSearch)
      const res = await apiFetch(`/api/inventory/materials?${params}`)
      const data = await res.json()
      setMaterials(data.materials || [])
    } catch (error) {
      console.error("Failed to fetch materials:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProductMaterials = async () => {
    try {
      const res = await apiFetch(`/api/inventory/bom`)
      const data = await res.json()
      setProductMaterials(data.materials || [])
    } catch (error) {
      console.error("Failed to fetch BOM:", error)
    }
  }

  const fetchAlerts = async () => {
    try {
      const res = await apiFetch(`/api/inventory/alerts`)
      const data = await res.json()
      setAlerts(data.alerts || [])
    } catch (error) {
      console.error("Failed to fetch alerts:", error)
    }
  }

  const fetchReorderSuggestions = async () => {
    try {
      const res = await apiFetch(`/api/inventory/reorder-suggestions`)
      const data = await res.json()
      setReorderSuggestions(data.suggestions || [])
    } catch (error) {
      console.error("Failed to fetch reorder suggestions:", error)
    }
  }

  const fetchSummary = async () => {
    try {
      const res = await apiFetch(`/api/inventory/summary`)
      const data = await res.json()
      setSummary(data)
    } catch (error) {
      console.error("Failed to fetch summary:", error)
    }
  }

  // Sync Shopify Inventory
  const syncShopifyInventory = async () => {
    setSyncing(true)
    try {
      await apiFetch(`/api/inventory/sync-shopify`, { method: "POST" })
      await fetchLocations()
      await fetchLevels()
      await fetchShopifyCategories()
      await fetchShopifySummary()
      await fetchSummary()
    } catch (error) {
      console.error("Failed to sync Shopify inventory:", error)
    } finally {
      setSyncing(false)
    }
  }

  // Material CRUD
  const saveMaterial = async () => {
    try {
      if (editingMaterial) {
        await apiFetch(`/api/inventory/materials/${editingMaterial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(materialForm),
        })
      } else {
        await apiFetch(`/api/inventory/materials`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(materialForm),
        })
      }
      setShowMaterialModal(false)
      setEditingMaterial(null)
      setMaterialForm({})
      fetchMaterials()
      fetchSummary()
    } catch (error) {
      console.error("Failed to save material:", error)
    }
  }

  const deleteMaterial = async (id: string) => {
    if (!confirm("Are you sure you want to delete this material?")) return
    try {
      await apiFetch(`/api/inventory/materials/${id}`, { method: "DELETE" })
      fetchMaterials()
      fetchSummary()
    } catch (error) {
      console.error("Failed to delete material:", error)
    }
  }

  // Stock Adjustment
  const handleStockAdjustment = async () => {
    if (!stockMaterial || !stockQuantity) return
    try {
      const endpoint = stockAction === "add" ? "add-stock" : stockAction === "deduct" ? "deduct-stock" : "adjust-stock"
      await apiFetch(`/api/inventory/materials/${stockMaterial.id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: parseFloat(stockQuantity),
          notes: stockNotes,
        }),
      })
      setShowStockModal(false)
      setStockMaterial(null)
      setStockQuantity("")
      setStockNotes("")
      fetchMaterials()
      fetchSummary()
    } catch (error) {
      console.error("Failed to adjust stock:", error)
    }
  }

  // BOM Management
  const addBomEntry = async () => {
    if (!bomProductId || !bomMaterialId || !bomQuantity) return
    try {
      await apiFetch(`/api/inventory/bom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: parseInt(bomProductId),
          materialId: bomMaterialId,
          quantityRequired: parseFloat(bomQuantity),
          variantId: bomVariantId ? parseInt(bomVariantId) : undefined,
        }),
      })
      setShowBomModal(false)
      setBomProductId("")
      setBomVariantId("")
      setBomMaterialId("")
      setBomQuantity("")
      fetchProductMaterials()
    } catch (error) {
      console.error("Failed to add BOM entry:", error)
    }
  }

  const deleteBomEntry = async (productId: number, materialId: string, variantId?: number) => {
    try {
      await apiFetch(`/api/inventory/bom`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, materialId, variantId }),
      })
      fetchProductMaterials()
    } catch (error) {
      console.error("Failed to delete BOM entry:", error)
    }
  }

  // Filter levels by search
  const filteredLevels = levels.filter(
    (l) =>
      !shopifySearch ||
      l.product_title?.toLowerCase().includes(shopifySearch.toLowerCase()) ||
      l.sku?.toLowerCase().includes(shopifySearch.toLowerCase())
  )

  // Get urgency color (Robinhood palette)
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "bg-rh-negative/10 text-rh-negative border-rh-negative/30"
      case "high":
        return "bg-rh-accent/10 text-rh-accent border-rh-accent/30"
      case "medium":
        return "bg-rh-accent-gold/10 text-rh-accent-gold border-rh-accent-gold/30"
      default:
        return "bg-rh-positive/10 text-rh-positive border-rh-positive/30"
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-rh-card border-border/40">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-rh-accent">
                <Package size={18} />
                <span className="text-xs font-medium">Shopify Products</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-foreground">{summary.totalShopifyProducts}</p>
            </CardContent>
          </Card>
          <Card className="bg-rh-card border-border/40">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-rh-accent-gold">
                <Box size={18} />
                <span className="text-xs font-medium">Raw Materials</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-foreground">{summary.totalRawMaterials}</p>
            </CardContent>
          </Card>
          <Card className="bg-rh-card border-border/40">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-rh-accent-gold">
                <TrendingDown size={18} />
                <span className="text-xs font-medium">Low Stock Items</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-foreground">{summary.lowStockProducts + summary.lowStockMaterials}</p>
            </CardContent>
          </Card>
          <Card className="bg-rh-card border-border/40">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-rh-negative">
                <AlertTriangle size={18} />
                <span className="text-xs font-medium">Active Alerts</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-foreground">{summary.activeAlerts}</p>
            </CardContent>
          </Card>
          <Card className="bg-rh-card border-border/40 col-span-2">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-rh-positive">
                <Warehouse size={18} />
                <span className="text-xs font-medium">Total Inventory Value</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-foreground">
                ${summary.totalInventoryValue?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {[
          { id: "shopify", label: "Shopify Inventory", icon: <ShoppingCart size={16} /> },
          { id: "materials", label: "Raw Materials", icon: <Box size={16} /> },
          { id: "bom", label: "Bill of Materials", icon: <Layers size={16} /> },
          { id: "alerts", label: "Alerts & Reorder", icon: <AlertTriangle size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "shopify" && (
        <Card>
          {/* Shopify Summary Bar */}
          {shopifySummary && (
            <div className="px-6 pt-4 pb-2 border-b bg-muted/30">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total SKUs</p>
                  <p className="font-semibold text-lg">{shopifySummary.totalSkus}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Units</p>
                  <p className="font-semibold text-lg">{shopifySummary.totalUnits.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">In Stock</p>
                  <p className="font-semibold text-lg text-green-600">{shopifySummary.inStockSkus}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Out of Stock</p>
                  <p className="font-semibold text-lg text-red-500">{shopifySummary.outOfStockSkus}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Inventory Value</p>
                  <p className="font-semibold text-lg text-blue-600">${shopifySummary.inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Inventory Cost</p>
                  <p className="font-semibold text-lg">${shopifySummary.inventoryCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Potential Profit</p>
                  <p className="font-semibold text-lg text-green-600">${shopifySummary.potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          )}
          <CardHeader className="flex flex-col gap-4">
            <div className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Shopify Product Inventory</CardTitle>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode("current")}
                    className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      viewMode === "current"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Package size={14} />
                    Current
                  </button>
                  <button
                    onClick={() => setViewMode("historical")}
                    className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      viewMode === "historical"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <History size={14} />
                    Historical
                  </button>
                </div>
                <Button onClick={syncShopifyInventory} disabled={syncing} variant="outline" size="sm">
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing..." : "Sync"}
                </Button>
              </div>
            </div>
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={shopifySearch}
                  onChange={(e) => setShopifySearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border rounded-lg bg-background w-56"
                />
              </div>
              {viewMode === "current" && (
                <select
                  value={selectedLocation || ""}
                  onChange={(e) => {
                    const locId = e.target.value ? parseInt(e.target.value) : null
                    setSelectedLocation(locId)
                  }}
                  className="px-3 py-2 text-sm border rounded-lg bg-background"
                >
                  <option value="">All Locations</option>
                  {locations.map((loc) => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-sm border rounded-lg bg-background"
              >
                <option value="">All Categories</option>
                {shopifyCategories.map((cat) => (
                  <option key={cat.category} value={cat.category}>
                    {cat.category} ({cat.count})
                  </option>
                ))}
              </select>
              {viewMode === "current" && (
                <>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 text-sm border rounded-lg bg-background"
                  >
                    <option value="product_title">Sort by: Name</option>
                    <option value="sku">Sort by: SKU</option>
                    <option value="on_hand">Sort by: On Hand</option>
                    <option value="available">Sort by: Available</option>
                    <option value="committed">Sort by: Committed</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="px-3 py-2 text-sm border rounded-lg bg-background hover:bg-muted flex items-center gap-1"
                  >
                    {sortOrder === "asc" ? "Low → High" : "High → Low"}
                  </button>
                  <button
                    onClick={() => setShowDiscontinued(!showDiscontinued)}
                    className={`px-3 py-2 text-sm border rounded-lg flex items-center gap-1.5 transition-colors ${
                      showDiscontinued
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                        : "bg-background hover:bg-muted text-muted-foreground"
                    }`}
                    title={showDiscontinued ? "Showing discontinued items" : "Hiding discontinued items"}
                  >
                    {showDiscontinued ? <Eye size={14} /> : <EyeOff size={14} />}
                    {showDiscontinued ? "Discontinued" : "Active Only"}
                  </button>
                </>
              )}
              {viewMode === "historical" && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-muted-foreground" />
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 text-sm border rounded-lg bg-background"
                  >
                    {availableDates.length === 0 ? (
                      <option value="">No snapshots available</option>
                    ) : (
                      availableDates.map((date) => (
                        <option key={date} value={date}>
                          {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : viewMode === "current" ? (
              // Current Inventory View
              filteredLevels.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No inventory data found. Click "Sync" to fetch inventory.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-3 px-2 font-medium">Product</th>
                        <th className="text-left py-3 px-2 font-medium">Variant</th>
                        <th className="text-left py-3 px-2 font-medium">SKU</th>
                        <th className="text-right py-3 px-2 font-medium">On Hand</th>
                        <th className="text-right py-3 px-2 font-medium">Available</th>
                        <th className="text-right py-3 px-2 font-medium">Committed</th>
                        <th className="text-right py-3 px-2 font-medium">Unavailable</th>
                        <th className="text-right py-3 px-2 font-medium">Incoming</th>
                        <th className="text-right py-3 px-2 font-medium">Price</th>
                        <th className="text-right py-3 px-2 font-medium">Cost</th>
                        <th className="text-right py-3 px-2 font-medium">Inv. Value</th>
                        <th className="text-right py-3 px-2 font-medium">Inv. Cost</th>
                        {showDiscontinued && <th className="text-center py-3 px-2 font-medium">Status</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLevels.map((level) => {
                        const inventoryValue = (level.price || 0) * Math.max(0, level.available)
                        const inventoryCost = (level.cost || 0) * Math.max(0, level.available)
                        const isDiscontinued = level.active === false
                        return (
                          <tr
                            key={level.id}
                            className={`border-b hover:bg-muted/30 ${isDiscontinued ? "opacity-60 bg-muted/20" : ""}`}
                          >
                            <td className="py-3 px-2">{level.product_title || "-"}</td>
                            <td className="py-3 px-2 text-muted-foreground">{level.variant_title || "Default"}</td>
                            <td className="py-3 px-2 font-mono text-xs">{level.sku || "-"}</td>
                            <td className="py-3 px-2 text-right font-medium">
                              {level.on_hand || 0}
                            </td>
                            <td
                              className={`py-3 px-2 text-right font-medium ${
                                level.available <= 0 ? "text-red-500" : level.available <= 5 ? "text-amber-500" : ""
                              }`}
                            >
                              {level.available}
                            </td>
                            <td className="py-3 px-2 text-right text-muted-foreground">
                              {level.committed || 0}
                            </td>
                            <td className="py-3 px-2 text-right text-muted-foreground">
                              {level.unavailable || 0}
                            </td>
                            <td className="py-3 px-2 text-right text-blue-500">
                              {level.incoming || 0}
                            </td>
                            <td className="py-3 px-2 text-right text-muted-foreground">
                              {level.price ? `$${level.price.toFixed(2)}` : "-"}
                            </td>
                            <td className="py-3 px-2 text-right text-muted-foreground">
                              {level.cost ? `$${level.cost.toFixed(2)}` : "-"}
                            </td>
                            <td className="py-3 px-2 text-right font-medium text-blue-600">
                              {level.price && level.available > 0 ? `$${inventoryValue.toFixed(2)}` : "-"}
                            </td>
                            <td className="py-3 px-2 text-right">
                              {level.cost && level.available > 0 ? `$${inventoryCost.toFixed(2)}` : "-"}
                            </td>
                            {showDiscontinued && (
                              <td className="py-3 px-2 text-center">
                                {isDiscontinued ? (
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                    Discontinued
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-600 border border-green-500/30">
                                    Active
                                  </span>
                                )}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              // Historical View
              availableDates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No historical snapshots available.</p>
                  <p className="text-sm mt-2">Snapshots are created automatically during sync.</p>
                </div>
              ) : historyRecords.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No data for selected date. Select a different date.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="mb-4 p-3 rounded-lg bg-muted/30 text-sm">
                    <span className="text-muted-foreground">Showing inventory snapshot for </span>
                    <span className="font-medium">
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-3 px-2 font-medium">Product</th>
                        <th className="text-left py-3 px-2 font-medium">Variant</th>
                        <th className="text-left py-3 px-2 font-medium">SKU</th>
                        <th className="text-right py-3 px-2 font-medium">Available</th>
                        <th className="text-right py-3 px-2 font-medium">Price</th>
                        <th className="text-right py-3 px-2 font-medium">Cost</th>
                        <th className="text-right py-3 px-2 font-medium">Inv. Value</th>
                        <th className="text-right py-3 px-2 font-medium">Inv. Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRecords
                        .filter(
                          (r) =>
                            !shopifySearch ||
                            r.product_title?.toLowerCase().includes(shopifySearch.toLowerCase()) ||
                            r.sku?.toLowerCase().includes(shopifySearch.toLowerCase())
                        )
                        .map((record) => {
                          const inventoryValue = (record.price || 0) * Math.max(0, record.available)
                          const inventoryCost = (record.cost || 0) * Math.max(0, record.available)
                          return (
                            <tr key={record.id} className="border-b hover:bg-muted/30">
                              <td className="py-3 px-2">{record.product_title || "-"}</td>
                              <td className="py-3 px-2 text-muted-foreground">{record.variant_title || "Default"}</td>
                              <td className="py-3 px-2 font-mono text-xs">{record.sku || "-"}</td>
                              <td
                                className={`py-3 px-2 text-right font-medium ${
                                  record.available <= 0
                                    ? "text-red-500"
                                    : record.available <= 5
                                    ? "text-amber-500"
                                    : ""
                                }`}
                              >
                                {record.available}
                              </td>
                              <td className="py-3 px-2 text-right text-muted-foreground">
                                {record.price ? `$${record.price.toFixed(2)}` : "-"}
                              </td>
                              <td className="py-3 px-2 text-right text-muted-foreground">
                                {record.cost ? `$${record.cost.toFixed(2)}` : "-"}
                              </td>
                              <td className="py-3 px-2 text-right font-medium text-blue-600">
                                {record.price && record.available > 0 ? `$${inventoryValue.toFixed(2)}` : "-"}
                              </td>
                              <td className="py-3 px-2 text-right">
                                {record.cost && record.available > 0 ? `$${inventoryCost.toFixed(2)}` : "-"}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "materials" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Raw Materials</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchMaterials()}
                  className="pl-9 pr-4 py-2 text-sm border rounded-lg bg-background w-64"
                />
              </div>
              <select
                value={materialCategory}
                onChange={(e) => {
                  setMaterialCategory(e.target.value)
                  setTimeout(fetchMaterials, 0)
                }}
                className="px-3 py-2 text-sm border rounded-lg bg-background"
              >
                <option value="">All Categories</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => {
                  setEditingMaterial(null)
                  setMaterialForm({ category: "other", unit: "unit" })
                  setShowMaterialModal(true)
                }}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Material
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Box className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No materials found. Add your first raw material to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-3 px-2 font-medium">Name</th>
                      <th className="text-left py-3 px-2 font-medium">SKU</th>
                      <th className="text-left py-3 px-2 font-medium">Category</th>
                      <th className="text-right py-3 px-2 font-medium">On Hand</th>
                      <th className="text-right py-3 px-2 font-medium">Reorder Point</th>
                      <th className="text-right py-3 px-2 font-medium">Cost/Unit</th>
                      <th className="text-left py-3 px-2 font-medium">Supplier</th>
                      <th className="text-center py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((material) => (
                      <tr key={material.id} className="border-b hover:bg-muted/30">
                        <td className="py-3 px-2 font-medium">{material.name}</td>
                        <td className="py-3 px-2 font-mono text-xs text-muted-foreground">{material.sku || "-"}</td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-1 rounded-full text-xs bg-muted capitalize">
                            {material.category}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-2 text-right font-medium ${
                            material.quantity_on_hand <= material.reorder_point ? "text-red-500" : ""
                          }`}
                        >
                          {material.quantity_on_hand} {material.unit}
                        </td>
                        <td className="py-3 px-2 text-right text-muted-foreground">
                          {material.reorder_point} {material.unit}
                        </td>
                        <td className="py-3 px-2 text-right">${material.cost_per_unit.toFixed(2)}</td>
                        <td className="py-3 px-2 text-muted-foreground">{material.supplier_name || "-"}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setStockMaterial(material)
                                setStockAction("add")
                                setShowStockModal(true)
                              }}
                              className="p-1.5 hover:bg-green-500/10 rounded text-green-500"
                              title="Add Stock"
                            >
                              <Plus size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingMaterial(material)
                                setMaterialForm(material)
                                setShowMaterialModal(true)
                              }}
                              className="p-1.5 hover:bg-blue-500/10 rounded text-blue-500"
                              title="Edit"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => deleteMaterial(material.id)}
                              className="p-1.5 hover:bg-red-500/10 rounded text-red-500"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "bom" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Bill of Materials</CardTitle>
            <Button onClick={() => setShowBomModal(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Link Material to Product
            </Button>
          </CardHeader>
          <CardContent>
            {productMaterials.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No product-material links found. Link materials to products to enable auto-deduction.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-3 px-2 font-medium">Product ID</th>
                      <th className="text-left py-3 px-2 font-medium">Variant ID</th>
                      <th className="text-left py-3 px-2 font-medium">Material</th>
                      <th className="text-right py-3 px-2 font-medium">Qty Required</th>
                      <th className="text-left py-3 px-2 font-medium">Notes</th>
                      <th className="text-center py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productMaterials.map((pm) => (
                      <tr key={pm.id} className="border-b hover:bg-muted/30">
                        <td className="py-3 px-2 font-mono">{pm.product_id}</td>
                        <td className="py-3 px-2 font-mono text-muted-foreground">{pm.variant_id || "-"}</td>
                        <td className="py-3 px-2">
                          {pm.material_name || pm.material_id}
                          {pm.material_unit && (
                            <span className="text-muted-foreground text-xs ml-1">({pm.material_unit})</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right font-medium">{pm.quantity_required}</td>
                        <td className="py-3 px-2 text-muted-foreground">{pm.notes || "-"}</td>
                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => deleteBomEntry(pm.product_id, pm.material_id, pm.variant_id || undefined)}
                            className="p-1.5 hover:bg-red-500/10 rounded text-red-500"
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "alerts" && (
        <div className="space-y-6">
          {/* Reorder Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reorder Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              {reorderSuggestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Check className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>All materials are well-stocked. No reorders needed.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {reorderSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className={`p-4 rounded-lg border ${getUrgencyColor(suggestion.urgency)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{suggestion.name}</h4>
                          {suggestion.sku && (
                            <p className="text-xs font-mono opacity-70">{suggestion.sku}</p>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${getUrgencyColor(
                            suggestion.urgency
                          )}`}
                        >
                          {suggestion.urgency}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="opacity-70">Current:</span>
                          <span className="font-medium">{suggestion.current_quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-70">Reorder Point:</span>
                          <span>{suggestion.reorder_point}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-70">Suggested Order:</span>
                          <span className="font-bold">{suggestion.suggested_order}</span>
                        </div>
                        {suggestion.lead_time_days > 0 && (
                          <div className="flex justify-between">
                            <span className="opacity-70">Lead Time:</span>
                            <span>{suggestion.lead_time_days} days</span>
                          </div>
                        )}
                      </div>
                      {suggestion.supplier_name && (
                        <p className="mt-2 text-xs opacity-70">Supplier: {suggestion.supplier_name}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Check className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>No active alerts. Your inventory is healthy.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-amber-500/5 border-amber-500/20"
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <div>
                          <p className="font-medium">{alert.source_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Current: {alert.current_quantity} | Threshold: {alert.threshold_quantity}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs bg-amber-500/10 text-amber-500 capitalize">
                        {alert.alert_type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Material Add/Edit Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingMaterial ? "Edit Material" : "Add New Material"}
              </h2>
              <button
                onClick={() => {
                  setShowMaterialModal(false)
                  setEditingMaterial(null)
                  setMaterialForm({})
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name *</label>
                  <input
                    type="text"
                    value={materialForm.name || ""}
                    onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    placeholder="Material name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">SKU</label>
                  <input
                    type="text"
                    value={materialForm.sku || ""}
                    onChange={(e) => setMaterialForm({ ...materialForm, sku: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    placeholder="Optional SKU"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={materialForm.description || ""}
                  onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={materialForm.category || "other"}
                    onChange={(e) => setMaterialForm({ ...materialForm, category: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Unit</label>
                  <select
                    value={materialForm.unit || "unit"}
                    onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                  >
                    {unitOptions.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Cost per Unit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={materialForm.cost_per_unit || ""}
                    onChange={(e) =>
                      setMaterialForm({ ...materialForm, cost_per_unit: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Reorder Point</label>
                  <input
                    type="number"
                    value={materialForm.reorder_point || ""}
                    onChange={(e) =>
                      setMaterialForm({ ...materialForm, reorder_point: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Reorder Quantity</label>
                  <input
                    type="number"
                    value={materialForm.reorder_quantity || ""}
                    onChange={(e) =>
                      setMaterialForm({ ...materialForm, reorder_quantity: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Lead Time (days)</label>
                  <input
                    type="number"
                    value={materialForm.lead_time_days || ""}
                    onChange={(e) =>
                      setMaterialForm({ ...materialForm, lead_time_days: parseInt(e.target.value) || 0 })
                    }
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Supplier Name</label>
                  <input
                    type="text"
                    value={materialForm.supplier_name || ""}
                    onChange={(e) => setMaterialForm({ ...materialForm, supplier_name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    placeholder="Supplier"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Supplier Contact</label>
                  <input
                    type="text"
                    value={materialForm.supplier_contact || ""}
                    onChange={(e) => setMaterialForm({ ...materialForm, supplier_contact: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    placeholder="Email or phone"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  value={materialForm.notes || ""}
                  onChange={(e) => setMaterialForm({ ...materialForm, notes: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                  rows={2}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMaterialModal(false)
                  setEditingMaterial(null)
                  setMaterialForm({})
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveMaterial} disabled={!materialForm.name}>
                {editingMaterial ? "Save Changes" : "Add Material"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && stockMaterial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {stockAction === "add" ? "Add Stock" : stockAction === "deduct" ? "Deduct Stock" : "Adjust Stock"}
              </h2>
              <button
                onClick={() => {
                  setShowStockModal(false)
                  setStockMaterial(null)
                  setStockQuantity("")
                  setStockNotes("")
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="font-medium">{stockMaterial.name}</p>
                <p className="text-sm text-muted-foreground">
                  Current: {stockMaterial.quantity_on_hand} {stockMaterial.unit}
                </p>
              </div>
              <div className="flex gap-2">
                {(["add", "deduct", "adjust"] as const).map((action) => (
                  <button
                    key={action}
                    onClick={() => setStockAction(action)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      stockAction === action
                        ? action === "add"
                          ? "bg-green-500 text-white"
                          : action === "deduct"
                          ? "bg-red-500 text-white"
                          : "bg-blue-500 text-white"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {action}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium">
                  {stockAction === "adjust" ? "New Quantity" : "Quantity"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                  placeholder={stockAction === "adjust" ? "Enter new total quantity" : "Enter quantity"}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <input
                  type="text"
                  value={stockNotes}
                  onChange={(e) => setStockNotes(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowStockModal(false)
                  setStockMaterial(null)
                  setStockQuantity("")
                  setStockNotes("")
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleStockAdjustment} disabled={!stockQuantity}>
                {stockAction === "add" ? "Add Stock" : stockAction === "deduct" ? "Deduct Stock" : "Set Quantity"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* BOM Modal */}
      {showBomModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Link Material to Product</h2>
              <button
                onClick={() => {
                  setShowBomModal(false)
                  setBomProductId("")
                  setBomVariantId("")
                  setBomMaterialId("")
                  setBomQuantity("")
                }}
                className="p-1 hover:bg-muted rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Product ID *</label>
                <input
                  type="number"
                  value={bomProductId}
                  onChange={(e) => setBomProductId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                  placeholder="Shopify Product ID"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Variant ID (optional)</label>
                <input
                  type="number"
                  value={bomVariantId}
                  onChange={(e) => setBomVariantId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                  placeholder="Shopify Variant ID"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Material *</label>
                <select
                  value={bomMaterialId}
                  onChange={(e) => setBomMaterialId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="">Select a material</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Quantity Required *</label>
                <input
                  type="number"
                  step="0.01"
                  value={bomQuantity}
                  onChange={(e) => setBomQuantity(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                  placeholder="Amount of material per unit sold"
                />
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBomModal(false)
                  setBomProductId("")
                  setBomVariantId("")
                  setBomMaterialId("")
                  setBomQuantity("")
                }}
              >
                Cancel
              </Button>
              <Button onClick={addBomEntry} disabled={!bomProductId || !bomMaterialId || !bomQuantity}>
                Link Material
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
