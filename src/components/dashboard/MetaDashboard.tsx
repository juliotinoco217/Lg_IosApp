import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GroupedMetricCard } from "./GroupedMetricCard"
import {
  Eye,
  MousePointer,
  ShoppingCart,
  Target,
  BarChart3,
  RefreshCw,
  Search,
  Filter,
  Grid3X3,
  List,
  ExternalLink,
  Copy,
  ChevronDown,
  X,
  Play,
  Image,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  CheckCircle2,
  PauseCircle,
  XCircle,
  ChevronUp,
  Zap,
  Users,
  TrendingDown,
  Percent,
  Activity,
} from "lucide-react"
import {
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { apiFetch } from "@/lib/api"

// Types
interface MetaMetrics {
  spend: number
  impressions: number
  reach: number
  frequency: number
  clicks: number
  linkClicks: number
  cpm: number
  ctr: number
  linkCtr: number
  cpc: number
  cpcLink: number
  purchases: number
  revenue: number
  roas: number
  cpa: number
  addToCart: number
  initiateCheckout: number
  landingPageViews: number
}

interface TimeSeriesPoint extends MetaMetrics {
  date: string
}

interface AdCard {
  id: string
  name: string
  status: string
  campaignId: string
  adsetId: string
  createdTime: string
  updatedTime: string
  creative: {
    id?: string
    thumbnailUrl?: string
    title?: string
    body?: string
    cta?: string
    linkUrl?: string
    hasVideo: boolean
  }
  metrics: MetaMetrics
}

interface Campaign {
  id: string
  name: string
  status: string
  objective: string
  dailyBudget: number
  lifetimeBudget: number
  createdTime: string
  updatedTime: string
  metrics: MetaMetrics
  adsets?: AdSet[]
}

interface AdSet {
  id: string
  name: string
  status: string
  campaignId: string
  dailyBudget: number
  lifetimeBudget: number
  metrics: MetaMetrics
  ads?: AdCard[]
}

interface OverviewData {
  kpis: MetaMetrics
  previousKpis: MetaMetrics
  timeSeries: TimeSeriesPoint[]
  configured: boolean
}

type DatePreset = "today" | "yesterday" | "last_7d" | "last_14d" | "last_30d" | "last_60d" | "last_90d" | "this_month" | "last_month"
type Attribution = "1d_click" | "7d_click" | "28d_click" | "1d_view" | "7d_view"
type Level = "account" | "campaign" | "adset" | "ad"
type SortField = "spend" | "roas" | "purchases" | "cpm" | "ctr" | "cpc"
type ChartMetric = "revenue_spend" | "mer" | "amer" | "cpa" | "roas" | "purchases" | "ctr" | "cpm" | "performance" | "yoy_comparison"
type ChartTimeRange = 7 | 14 | 30 | 60 | 90

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7d", label: "Last 7 Days" },
  { value: "last_14d", label: "Last 14 Days" },
  { value: "last_30d", label: "Last 30 Days" },
  { value: "last_60d", label: "Last 60 Days" },
  { value: "last_90d", label: "Last 90 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
]

const ATTRIBUTION_WINDOWS: { value: Attribution; label: string }[] = [
  { value: "1d_click", label: "1-Day Click" },
  { value: "7d_click", label: "7-Day Click" },
  { value: "28d_click", label: "28-Day Click" },
  { value: "1d_view", label: "1-Day View" },
  { value: "7d_view", label: "7-Day View" },
]

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "spend", label: "Spend" },
  { value: "roas", label: "ROAS" },
  { value: "purchases", label: "Purchases" },
  { value: "cpm", label: "CPM" },
  { value: "ctr", label: "CTR" },
  { value: "cpc", label: "CPC" },
]

const CHART_METRICS: { value: ChartMetric; label: string; description: string }[] = [
  { value: "revenue_spend", label: "Revenue vs Spend", description: "Compare revenue to ad spend" },
  { value: "yoy_comparison", label: "2025 vs 2026", description: "Year-over-year comparison by calendar day" },
  { value: "performance", label: "Performance Overview", description: "CPA, ROAS, CTR & Purchases combined" },
  { value: "mer", label: "MER", description: "Marketing Efficiency Ratio" },
  { value: "amer", label: "aMER (7-day)", description: "7-day rolling average MER" },
  { value: "cpa", label: "CPA", description: "Cost Per Acquisition" },
  { value: "roas", label: "ROAS", description: "Return on Ad Spend" },
  { value: "purchases", label: "Purchases", description: "Daily purchase count" },
  { value: "ctr", label: "CTR", description: "Click-Through Rate" },
  { value: "cpm", label: "CPM", description: "Cost Per 1000 Impressions" },
]

const CHART_TIME_RANGES: { value: ChartTimeRange; label: string }[] = [
  { value: 7, label: "7D" },
  { value: 14, label: "14D" },
  { value: 30, label: "30D" },
  { value: 60, label: "60D" },
  { value: 90, label: "90D" },
]

export function MetaDashboard() {
  // Global state
  const [datePreset, setDatePreset] = useState<DatePreset>("today")
  const [attribution, setAttribution] = useState<Attribution>("7d_click")
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_level, _setLevel] = useState<Level>("ad")

  // Data state
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [ads, setAds] = useState<AdCard[]>([])
  const [loading, setLoading] = useState(true)
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [adsLoading, setAdsLoading] = useState(false)
  const [configured, setConfigured] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Campaigns table state
  const [campaignSortField, setCampaignSortField] = useState<SortField>("spend")
  const [campaignSortDirection, setCampaignSortDirection] = useState<"asc" | "desc">("desc")
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [campaignsCollapsed, setCampaignsCollapsed] = useState(false)
  const [adsCollapsed, setAdsCollapsed] = useState(false)
  const [hidePaused, setHidePaused] = useState(false)

  // Campaign detail state
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [campaignDrawerOpen, setCampaignDrawerOpen] = useState(false)
  const [campaignAdsets, setCampaignAdsets] = useState<Map<string, AdSet[]>>(new Map())
  const [campaignAds, setCampaignAds] = useState<Map<string, AdCard[]>>(new Map())
  const [loadingAdsets, setLoadingAdsets] = useState<Set<string>>(new Set())

  // Gallery state
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>("spend")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Drawer state
  const [selectedAd, setSelectedAd] = useState<AdCard | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Dropdown states
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const [showAttrDropdown, setShowAttrDropdown] = useState(false)
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  // Chart state
  const [selectedChartMetric, setSelectedChartMetric] = useState<ChartMetric>("revenue_spend")
  const [showChartMetricDropdown, setShowChartMetricDropdown] = useState(false)
  const [chartTimeRange, setChartTimeRange] = useState<ChartTimeRange>(30)

  // Compute effective date preset for fetching - needs to cover both KPI period and chart range
  const getEffectiveDatePreset = useCallback((): DatePreset => {
    // Map chart time range to minimum required date preset
    const chartRangeToPreset: Record<ChartTimeRange, DatePreset> = {
      7: "last_7d",
      14: "last_14d",
      30: "last_30d",
      60: "last_60d",
      90: "last_90d",
    }

    // Map date presets to their day counts
    const presetToDays: Record<DatePreset, number> = {
      today: 1,
      yesterday: 1,
      last_7d: 7,
      last_14d: 14,
      last_30d: 30,
      last_60d: 60,
      last_90d: 90,
      this_month: 31,
      last_month: 31,
    }

    const chartDays = chartTimeRange
    const presetDays = presetToDays[datePreset] || 30

    // Use whichever requires more data
    if (chartDays > presetDays) {
      return chartRangeToPreset[chartTimeRange]
    }
    return datePreset
  }, [datePreset, chartTimeRange])

  // Fetch overview data
  const fetchOverview = useCallback(async () => {
    try {
      const effectivePreset = getEffectiveDatePreset()
      const res = await apiFetch(
        `/api/meta/overview?datePreset=${effectivePreset}&attribution=${attribution}&level=account`
      )
      if (res.ok) {
        const data = await res.json()
        setOverview(data)
        setConfigured(data.configured)
      }
    } catch (error) {
      console.error("Failed to fetch overview:", error)
    }
  }, [getEffectiveDatePreset, attribution])

  // Fetch campaigns with metrics
  const fetchCampaigns = useCallback(async () => {
    try {
      setCampaignsLoading(true)
      const params = new URLSearchParams({
        datePreset,
        attribution,
        level: "campaign",
        sortField: campaignSortField,
        sortDirection: campaignSortDirection,
        limit: "50",
      })

      const res = await apiFetch(`/api/meta/entities?${params}`)
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch campaigns:", error)
    } finally {
      setCampaignsLoading(false)
    }
  }, [datePreset, attribution, campaignSortField, campaignSortDirection])

  // Fetch ads gallery
  const fetchAds = useCallback(async () => {
    try {
      setAdsLoading(true)
      const params = new URLSearchParams({
        datePreset,
        attribution,
        sortField,
        sortDirection,
        limit: "100",
      })

      if (statusFilter.length > 0) {
        params.set("status", statusFilter.join(","))
      }
      if (searchQuery) {
        params.set("search", searchQuery)
      }

      const res = await apiFetch(`/api/meta/ads?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAds(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch ads:", error)
    } finally {
      setAdsLoading(false)
    }
  }, [datePreset, attribution, sortField, sortDirection, statusFilter, searchQuery])

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchOverview(), fetchCampaigns(), fetchAds()])
      setLastUpdated(new Date())
      setLoading(false)
    }
    loadData()
  }, [fetchOverview, fetchCampaigns, fetchAds])

  // Refresh handler
  const handleRefresh = async () => {
    setLoading(true)
    await apiFetch(`/api/meta/refresh`, { method: "POST" })
    await Promise.all([fetchOverview(), fetchCampaigns(), fetchAds()])
    setLastUpdated(new Date())
    setLoading(false)
  }

  // Fetch adsets for a campaign
  const fetchCampaignAdsets = useCallback(async (campaignId: string) => {
    if (campaignAdsets.has(campaignId) || loadingAdsets.has(campaignId)) return

    setLoadingAdsets(prev => new Set(prev).add(campaignId))
    try {
      const params = new URLSearchParams({
        datePreset,
        attribution,
        level: "adset",
        limit: "50",
      })

      // Fetch adsets for this campaign
      const res = await apiFetch(`/api/meta/entities?${params}&campaignId=${campaignId}`)
      if (res.ok) {
        const data = await res.json()
        setCampaignAdsets(prev => new Map(prev).set(campaignId, data.data || []))
      }
    } catch (error) {
      console.error("Failed to fetch adsets:", error)
    } finally {
      setLoadingAdsets(prev => {
        const next = new Set(prev)
        next.delete(campaignId)
        return next
      })
    }
  }, [datePreset, attribution, campaignAdsets, loadingAdsets])

  // Fetch ads for a campaign
  const fetchCampaignAds = useCallback(async (campaignId: string) => {
    if (campaignAds.has(campaignId)) return

    try {
      const params = new URLSearchParams({
        datePreset,
        attribution,
        limit: "50",
      })

      const res = await apiFetch(`/api/meta/ads?${params}&campaignId=${campaignId}`)
      if (res.ok) {
        const data = await res.json()
        setCampaignAds(prev => new Map(prev).set(campaignId, data.data || []))
      }
    } catch (error) {
      console.error("Failed to fetch campaign ads:", error)
    }
  }, [datePreset, attribution, campaignAds])

  // Toggle campaign expansion
  const toggleCampaignExpansion = async (campaignId: string) => {
    const isCurrentlyExpanded = expandedCampaigns.has(campaignId)

    setExpandedCampaigns(prev => {
      const next = new Set(prev)
      if (next.has(campaignId)) {
        next.delete(campaignId)
      } else {
        next.add(campaignId)
      }
      return next
    })

    // Fetch adsets and ads if expanding
    if (!isCurrentlyExpanded) {
      await Promise.all([
        fetchCampaignAdsets(campaignId),
        fetchCampaignAds(campaignId),
      ])
    }
  }

  // Open campaign detail drawer
  const openCampaignDrawer = async (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setCampaignDrawerOpen(true)
    await fetchCampaignAds(campaign.id)
  }

  // Sorted campaigns
  const sortedCampaigns = useMemo(() => {
    let filtered = [...campaigns]
    if (hidePaused) {
      filtered = filtered.filter(c => c.status === "ACTIVE")
    }
    return filtered.sort((a, b) => {
      const aVal = a.metrics[campaignSortField] || 0
      const bVal = b.metrics[campaignSortField] || 0
      return campaignSortDirection === "asc" ? aVal - bVal : bVal - aVal
    })
  }, [campaigns, campaignSortField, campaignSortDirection, hidePaused])

  // Format helpers
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(2)}`
  }

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toFixed(0)
  }

  const formatPercent = (value: number) => `${value.toFixed(2)}%`
  const formatRoas = (value: number) => `${value.toFixed(2)}x`

  const calculateDelta = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  // Ad Card component
  const AdCardComponent = ({ ad }: { ad: AdCard }) => {
    const statusColors: Record<string, string> = {
      ACTIVE: "bg-green-100 text-green-700",
      PAUSED: "bg-yellow-100 text-yellow-700",
      DELETED: "bg-red-100 text-red-700",
      ARCHIVED: "bg-gray-100 text-gray-700",
    }

    return (
      <Card
        className="cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
        onClick={() => {
          setSelectedAd(ad)
          setDrawerOpen(true)
        }}
      >
        {/* Creative Preview */}
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          {ad.creative.thumbnailUrl ? (
            <img
              src={ad.creative.thumbnailUrl}
              alt={ad.name}
              className="h-full w-full object-cover"
              style={{ imageRendering: 'auto' }}
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              {ad.creative.hasVideo ? (
                <Play className="h-12 w-12 text-gray-400" />
              ) : (
                <Image className="h-12 w-12 text-gray-400" />
              )}
            </div>
          )}
          {ad.creative.hasVideo && (
            <div className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2.5 py-1 text-xs text-white flex items-center gap-1">
              <Play className="h-3 w-3" />
              Video
            </div>
          )}
          {/* Status badge */}
          <div className={`absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm ${statusColors[ad.status] || "bg-gray-100"}`}>
            {ad.status}
          </div>
        </div>

        {/* Ad Info */}
        <CardContent className="p-3">
          <h3 className="truncate text-sm font-medium">{ad.name}</h3>

          {/* Metrics Grid */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-muted-foreground">Spend</p>
              <p className="font-semibold">{formatCurrency(ad.metrics.spend)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">ROAS</p>
              <p className={`font-semibold ${ad.metrics.roas >= 1 ? "text-green-600" : "text-red-600"}`}>
                {formatRoas(ad.metrics.roas)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Purchases</p>
              <p className="font-semibold">{ad.metrics.purchases}</p>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-muted-foreground">CPM</p>
              <p className="font-medium">{formatCurrency(ad.metrics.cpm)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">CTR</p>
              <p className="font-medium">{formatPercent(ad.metrics.ctr)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">CPC</p>
              <p className="font-medium">{formatCurrency(ad.metrics.cpc)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Filtered and sorted ads
  const filteredAds = useMemo(() => {
    let result = [...ads]

    // Hide paused filter
    if (hidePaused) {
      result = result.filter(ad => ad.status === "ACTIVE")
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        ad => ad.name.toLowerCase().includes(query) || ad.id.includes(query)
      )
    }

    // Status filter
    if (statusFilter.length > 0) {
      result = result.filter(ad => statusFilter.includes(ad.status))
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a.metrics[sortField] || 0
      const bVal = b.metrics[sortField] || 0
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal
    })

    return result
  }, [ads, searchQuery, statusFilter, sortField, sortDirection, hidePaused])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!configured) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-6">
        <div className="rounded-full bg-blue-100 p-6">
          <BarChart3 className="h-12 w-12 text-blue-600" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">Connect Meta Ads</h2>
          <p className="mt-2 max-w-md text-muted-foreground">
            Add your Meta API credentials to view ad performance data.
          </p>
        </div>
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4 pt-6">
            <div className="rounded-lg bg-muted p-3 text-xs font-mono">
              META_ACCESS_TOKEN=your_access_token
              <br />
              META_AD_ACCOUNT_ID=act_123456789
              <br />
              META_APP_ID=your_app_id
              <br />
              META_APP_SECRET=your_app_secret
            </div>
            <p className="text-xs text-muted-foreground">
              Get credentials from{" "}
              <a
                href="https://developers.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Meta for Developers
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          {/* Date Range Selector */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="min-w-[140px] justify-between"
            >
              {DATE_PRESETS.find(p => p.value === datePreset)?.label}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
            {showDateDropdown && (
              <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-md border bg-white shadow-lg">
                {DATE_PRESETS.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => {
                      setDatePreset(preset.value)
                      setShowDateDropdown(false)
                    }}
                    className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                      datePreset === preset.value ? "bg-gray-50 font-medium" : ""
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Attribution Window */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAttrDropdown(!showAttrDropdown)}
              className="min-w-[130px] justify-between"
            >
              {ATTRIBUTION_WINDOWS.find(a => a.value === attribution)?.label}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
            {showAttrDropdown && (
              <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-md border bg-white shadow-lg">
                {ATTRIBUTION_WINDOWS.map(attr => (
                  <button
                    key={attr.value}
                    onClick={() => {
                      setAttribution(attr.value)
                      setShowAttrDropdown(false)
                    }}
                    className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                      attribution === attr.value ? "bg-gray-50 font-medium" : ""
                    }`}
                  >
                    {attr.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Hide Paused Toggle */}
          <Button
            variant={hidePaused ? "default" : "outline"}
            size="sm"
            onClick={() => setHidePaused(!hidePaused)}
            className={hidePaused ? "bg-yellow-500 hover:bg-yellow-600" : ""}
          >
            <PauseCircle className="mr-2 h-4 w-4" />
            {hidePaused ? "Show Paused" : "Hide Paused"}
          </Button>

          {/* Refresh Button */}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </CardContent>
      </Card>

      {/* Performance Chart - Robinhood Style */}
      {overview && overview.timeSeries.length > 0 && (() => {
        // Filter data based on selected time range
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - chartTimeRange)
        const filteredTimeSeries = overview.timeSeries.filter(d => new Date(d.date) >= cutoffDate)

        // Calculate derived metrics for chart - filter out days with no spend for ratio metrics
        const chartData = filteredTimeSeries.map((d, idx, arr) => {
          const windowStart = Math.max(0, idx - 6)
          const window = arr.slice(windowStart, idx + 1)
          const totalRevenue = window.reduce((sum, w) => sum + w.revenue, 0)
          const totalSpend = window.reduce((sum, w) => sum + w.spend, 0)
          return {
            ...d,
            // Only calculate ratios if there's spend, otherwise null (will be skipped in chart)
            mer: d.spend > 0 ? d.revenue / d.spend : null,
            roas: d.spend > 0 ? d.revenue / d.spend : null,
            cpa: d.purchases > 0 ? d.spend / d.purchases : null,
            cpm: d.impressions > 0 ? (d.spend / d.impressions) * 1000 : null,
            ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : null,
            amer: totalSpend > 0 ? totalRevenue / totalSpend : null,
          }
        })

        // Get current value for hero display
        const getHeroData = () => {
          const latest = chartData[chartData.length - 1]
          if (!latest) return { value: "—", change: 0, subtitle: "" }

          const previous = chartData.length > 1 ? chartData[chartData.length - 2] : latest

          switch (selectedChartMetric) {
            case "revenue_spend":
              return { value: formatCurrency(overview.kpis.revenue), change: calculateDelta(latest.revenue, previous.revenue), subtitle: `vs ${formatCurrency(overview.kpis.spend)} spend` }
            case "yoy_comparison": {
              // Calculate totals for 2025 and 2026 Jan data
              const data2025 = overview.timeSeries.filter(d => d.date.startsWith("2025-01"))
              const data2026 = overview.timeSeries.filter(d => d.date.startsWith("2026-01"))
              const spend2025 = data2025.reduce((sum, d) => sum + d.spend, 0)
              const spend2026 = data2026.reduce((sum, d) => sum + d.spend, 0)
              const yoyChange = spend2025 > 0 ? ((spend2026 - spend2025) / spend2025) * 100 : 0
              return { value: formatCurrency(spend2026), change: yoyChange, subtitle: `2026 YTD vs ${formatCurrency(spend2025)} in 2025` }
            }
            case "performance":
              return { value: formatRoas(overview.kpis.roas), change: calculateDelta(overview.kpis.roas, overview.previousKpis.roas), subtitle: "ROAS • CPA • CTR • Purchases" }
            case "mer":
            case "roas":
              return { value: `${(overview.kpis.revenue / overview.kpis.spend).toFixed(2)}x`, change: calculateDelta(latest.mer || 0, previous.mer || 0), subtitle: "Revenue / Spend" }
            case "amer":
              const prevAmer = chartData.length > 7 ? chartData[chartData.length - 8]?.amer : latest.amer
              return { value: `${(latest.amer || 0).toFixed(2)}x`, change: calculateDelta(latest.amer || 0, prevAmer || 0), subtitle: "7-day rolling average" }
            case "cpa":
              return { value: formatCurrency(overview.kpis.cpa), change: -calculateDelta(latest.cpa || 0, previous.cpa || 0), subtitle: "Cost per purchase" }
            case "purchases":
              return { value: formatNumber(overview.kpis.purchases), change: calculateDelta(overview.kpis.purchases, overview.previousKpis.purchases), subtitle: "Total purchases" }
            case "ctr":
              return { value: `${overview.kpis.ctr.toFixed(2)}%`, change: calculateDelta(overview.kpis.ctr, overview.previousKpis.ctr), subtitle: "Click-through rate" }
            case "cpm":
              return { value: formatCurrency(overview.kpis.cpm), change: -calculateDelta(latest.cpm || 0, previous.cpm || 0), subtitle: "Cost per 1K impressions" }
            default:
              return { value: "—", change: 0, subtitle: "" }
          }
        }

        const heroData = getHeroData()
        const isPositive = heroData.change > 0
        const isNegative = heroData.change < 0

        // Dynamic chart colors
        const primaryColor = isPositive ? "#10b981" : isNegative ? "#ef4444" : "#6366f1"

        return (
          <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
            <CardContent className="p-8">
              <div>
                {/* Hero Section */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-4">
                      <p className="text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        {heroData.value}
                      </p>
                      <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold shadow-sm ${
                        isPositive
                          ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                          : isNegative
                          ? "bg-gradient-to-r from-red-500 to-rose-500 text-white"
                          : "bg-gradient-to-r from-gray-400 to-gray-500 text-white"
                      }`}>
                        {isPositive && <ArrowUpRight className="h-4 w-4" />}
                        {isNegative && <ArrowDownRight className="h-4 w-4" />}
                        {Math.abs(heroData.change).toFixed(1)}%
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground font-medium">{heroData.subtitle}</p>
                  </div>

                  {/* Metric Selector Dropdown */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      onClick={() => setShowChartMetricDropdown(!showChartMetricDropdown)}
                      className="min-w-[200px] justify-between h-11 rounded-xl border-2 hover:border-primary/50 transition-all shadow-sm"
                    >
                      <span className="font-medium">{CHART_METRICS.find(m => m.value === selectedChartMetric)?.label}</span>
                      <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showChartMetricDropdown ? "rotate-180" : ""}`} />
                    </Button>
                    {showChartMetricDropdown && (
                      <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border-0 bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
                        {CHART_METRICS.map((metric, idx) => (
                          <button
                            key={metric.value}
                            onClick={() => {
                              setSelectedChartMetric(metric.value)
                              setShowChartMetricDropdown(false)
                            }}
                            className={`block w-full px-5 py-4 text-left transition-all ${
                              selectedChartMetric === metric.value
                                ? "bg-primary/10 border-l-4 border-primary"
                                : "hover:bg-gray-50 border-l-4 border-transparent"
                            } ${idx !== CHART_METRICS.length - 1 ? "border-b border-gray-100" : ""}`}
                          >
                            <p className={`text-sm font-semibold ${selectedChartMetric === metric.value ? "text-primary" : "text-gray-900"}`}>
                              {metric.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{metric.description}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Time Range Selector */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    {CHART_TIME_RANGES.map((range) => (
                      <button
                        key={range.value}
                        onClick={() => setChartTimeRange(range.value)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                          chartTimeRange === range.value
                            ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {chartData.length} data points
                  </p>
                </div>

                {/* Chart */}
                <div className="h-[380px] -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    {selectedChartMetric === "yoy_comparison" ? (() => {
                      // Build YoY comparison data - align by calendar day (MM-DD)
                      const data2025 = overview.timeSeries
                        .filter(d => d.date.startsWith("2025-01"))
                        .map(d => ({
                          day: parseInt(d.date.split("-")[2]),
                          dayLabel: `Jan ${parseInt(d.date.split("-")[2])}`,
                          revenue2025: d.revenue,
                          spend2025: d.spend,
                        }))

                      const data2026 = overview.timeSeries
                        .filter(d => d.date.startsWith("2026-01"))
                        .map(d => ({
                          day: parseInt(d.date.split("-")[2]),
                          revenue2026: d.revenue,
                          spend2026: d.spend,
                        }))

                      // Merge by day
                      const maxDay = Math.max(
                        ...data2025.map(d => d.day),
                        ...data2026.map(d => d.day)
                      )

                      const yoyData = []
                      for (let day = 1; day <= maxDay; day++) {
                        const d2025 = data2025.find(d => d.day === day)
                        const d2026 = data2026.find(d => d.day === day)
                        yoyData.push({
                          day,
                          dayLabel: `Jan ${day}`,
                          revenue2025: d2025?.revenue2025 || 0,
                          spend2025: d2025?.spend2025 || 0,
                          revenue2026: d2026?.revenue2026 || 0,
                          spend2026: d2026?.spend2026 || 0,
                        })
                      }

                      return (
                        <AreaChart data={yoyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="revenue2025Gradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3}/>
                              <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="revenue2026Gradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
                          <XAxis
                            dataKey="dayLabel"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                            dy={10}
                          />
                          <YAxis
                            tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}K` : v.toFixed(0)}`}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                            dx={-10}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: "12px",
                              border: "none",
                              boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                              padding: "12px 16px"
                            }}
                            formatter={(value, name) => [formatCurrency(Number(value)), name]}
                            cursor={{ stroke: "#9ca3af", strokeWidth: 1, strokeDasharray: "4 4" }}
                          />
                          <Legend
                            verticalAlign="top"
                            height={36}
                            iconType="circle"
                            wrapperStyle={{ paddingBottom: "20px" }}
                          />
                          {/* 2025 lines - dashed */}
                          <Area
                            type="monotoneX"
                            dataKey="revenue2025"
                            name="Revenue 2025"
                            stroke="#6366f1"
                            fill="url(#revenue2025Gradient)"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            dot={false}
                            activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#6366f1" }}
                          />
                          <Line
                            type="monotoneX"
                            dataKey="spend2025"
                            name="Spend 2025"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            dot={false}
                            activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#f59e0b" }}
                          />
                          {/* 2026 lines - solid */}
                          <Area
                            type="monotoneX"
                            dataKey="revenue2026"
                            name="Revenue 2026"
                            stroke="#10b981"
                            fill="url(#revenue2026Gradient)"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2, fill: "#10b981" }}
                          />
                          <Line
                            type="monotoneX"
                            dataKey="spend2026"
                            name="Spend 2026"
                            stroke="#f43f5e"
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2, fill: "#f43f5e" }}
                          />
                        </AreaChart>
                      )
                    })() : selectedChartMetric === "performance" ? (
                      <AreaChart data={chartData.filter(d => d.roas !== null)} margin={{ top: 10, right: 60, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="roasGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                          dy={10}
                        />
                        <YAxis
                          yAxisId="roas"
                          orientation="left"
                          tickFormatter={(v) => `${v.toFixed(1)}x`}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#10b981", fontSize: 11, fontWeight: 500 }}
                          domain={[0, 'auto']}
                        />
                        <YAxis
                          yAxisId="cpa"
                          orientation="right"
                          tickFormatter={(v) => `$${v.toFixed(0)}`}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#f59e0b", fontSize: 11, fontWeight: 500 }}
                        />
                        <YAxis
                          yAxisId="ctr"
                          orientation="right"
                          tickFormatter={(v) => `${v.toFixed(1)}%`}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#8b5cf6", fontSize: 11, fontWeight: 500 }}
                          hide
                        />
                        <YAxis
                          yAxisId="purchases"
                          orientation="right"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#3b82f6", fontSize: 11, fontWeight: 500 }}
                          hide
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                            padding: "12px 16px"
                          }}
                          labelFormatter={(v) => new Date(v).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                          formatter={(value, name) => {
                            if (value == null) return ["—", name]
                            const numValue = Number(value)
                            if (name === "ROAS") return [`${numValue.toFixed(2)}x`, name]
                            if (name === "CPA") return [formatCurrency(numValue), name]
                            if (name === "CTR") return [`${numValue.toFixed(2)}%`, name]
                            return [formatNumber(numValue), name]
                          }}
                          cursor={{ stroke: "#9ca3af", strokeWidth: 1, strokeDasharray: "4 4" }}
                        />
                        <Legend
                          verticalAlign="top"
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ paddingBottom: "20px" }}
                        />
                        <Area
                          yAxisId="roas"
                          type="monotoneX"
                          dataKey="roas"
                          name="ROAS"
                          stroke="#10b981"
                          fill="url(#roasGradient)"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#10b981" }}
                          connectNulls
                        />
                        <Line
                          yAxisId="cpa"
                          type="monotoneX"
                          dataKey="cpa"
                          name="CPA"
                          stroke="#f59e0b"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#f59e0b" }}
                          connectNulls
                        />
                        <Line
                          yAxisId="ctr"
                          type="monotoneX"
                          dataKey="ctr"
                          name="CTR"
                          stroke="#8b5cf6"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#8b5cf6" }}
                          connectNulls
                        />
                        <Line
                          yAxisId="purchases"
                          type="monotoneX"
                          dataKey="purchases"
                          name="Purchases"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "#3b82f6" }}
                        />
                      </AreaChart>
                    ) : selectedChartMetric === "revenue_spend" ? (
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="50%" stopColor="#10b981" stopOpacity={0.15}/>
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3}/>
                            <stop offset="50%" stopColor="#f43f5e" stopOpacity={0.1}/>
                            <stop offset="100%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#10b981" floodOpacity="0.3"/>
                          </filter>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                          dy={10}
                        />
                        <YAxis
                          tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}`}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                          dx={-10}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                            padding: "12px 16px"
                          }}
                          labelFormatter={(v) => new Date(v).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                          formatter={(value, name) => [formatCurrency(Number(value)), name]}
                          cursor={{ stroke: "#9ca3af", strokeWidth: 1, strokeDasharray: "4 4" }}
                        />
                        <Legend
                          verticalAlign="top"
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ paddingBottom: "20px" }}
                        />
                        <Area
                          type="monotoneX"
                          dataKey="revenue"
                          name="Revenue"
                          stroke="#10b981"
                          fill="url(#revenueGradient)"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2, fill: "#10b981" }}
                        />
                        <Area
                          type="monotoneX"
                          dataKey="spend"
                          name="Ad Spend"
                          stroke="#f43f5e"
                          fill="url(#spendGradient)"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2, fill: "#f43f5e" }}
                        />
                      </AreaChart>
                    ) : selectedChartMetric === "amer" ? (
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="amerGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={primaryColor} stopOpacity={0.4}/>
                            <stop offset="50%" stopColor={primaryColor} stopOpacity={0.15}/>
                            <stop offset="100%" stopColor={primaryColor} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                          dy={10}
                        />
                        <YAxis
                          tickFormatter={(v) => `${v.toFixed(1)}x`}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                          domain={[0, 'auto']}
                          dx={-10}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                            padding: "12px 16px"
                          }}
                          labelFormatter={(v) => new Date(v).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                          formatter={(value, name) => [`${Number(value).toFixed(2)}x`, name]}
                          cursor={{ stroke: "#9ca3af", strokeWidth: 1, strokeDasharray: "4 4" }}
                        />
                        <Legend
                          verticalAlign="top"
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ paddingBottom: "20px" }}
                        />
                        <Area
                          type="monotoneX"
                          dataKey="mer"
                          name="Daily MER"
                          stroke="#c4b5fd"
                          fill="none"
                          strokeWidth={2}
                          strokeDasharray="6 4"
                          dot={false}
                        />
                        <Area
                          type="monotoneX"
                          dataKey="amer"
                          name="7-Day aMER"
                          stroke={primaryColor}
                          fill="url(#amerGradient)"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2, fill: primaryColor }}
                        />
                      </AreaChart>
                    ) : (
                      <AreaChart
                        data={chartData.filter(d => {
                          if (selectedChartMetric === "cpa") return d.cpa != null && d.cpa > 0
                          return true
                        })}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={primaryColor} stopOpacity={0.4}/>
                            <stop offset="50%" stopColor={primaryColor} stopOpacity={0.15}/>
                            <stop offset="100%" stopColor={primaryColor} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                          dy={10}
                        />
                        <YAxis
                          tickFormatter={(v) => {
                            if (selectedChartMetric === "mer" || selectedChartMetric === "roas") return `${v.toFixed(1)}x`
                            if (selectedChartMetric === "cpa" || selectedChartMetric === "cpm") return `$${v.toFixed(0)}`
                            if (selectedChartMetric === "ctr") return `${v.toFixed(1)}%`
                            return formatNumber(v)
                          }}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                          domain={selectedChartMetric === "mer" || selectedChartMetric === "roas" ? [0, 'auto'] : undefined}
                          dx={-10}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                            padding: "12px 16px"
                          }}
                          labelFormatter={(v) => new Date(v).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                          formatter={(value) => {
                            const numValue = Number(value)
                            if (selectedChartMetric === "mer" || selectedChartMetric === "roas") return [`${numValue.toFixed(2)}x`, selectedChartMetric.toUpperCase()]
                            if (selectedChartMetric === "cpa" || selectedChartMetric === "cpm") return [formatCurrency(numValue), selectedChartMetric.toUpperCase()]
                            if (selectedChartMetric === "ctr") return [`${numValue.toFixed(2)}%`, "CTR"]
                            return [formatNumber(numValue), "Purchases"]
                          }}
                          cursor={{ stroke: "#9ca3af", strokeWidth: 1, strokeDasharray: "4 4" }}
                        />
                        <Area
                          type="monotoneX"
                          dataKey={selectedChartMetric}
                          name={CHART_METRICS.find(m => m.value === selectedChartMetric)?.label}
                          stroke={primaryColor}
                          fill="url(#metricGradient)"
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2, fill: primaryColor }}
                        />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Grouped KPI Cards - Top Row */}
      {overview && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Spend & Efficiency */}
          <GroupedMetricCard
            title="Spend & Efficiency"
            icon={<Target size={18} />}
            heroMetric={{
              label: "Return on Ad Spend",
              value: formatRoas(overview.kpis.roas),
              sublabel: overview.kpis.roas >= 1
                ? `+${formatCurrency(overview.kpis.revenue - overview.kpis.spend)} profit`
                : `${formatCurrency(overview.kpis.revenue - overview.kpis.spend)} loss`,
            }}
            metrics={[
              {
                label: "Total Spend",
                value: formatCurrency(overview.kpis.spend),
                trend: calculateDelta(overview.kpis.spend, overview.previousKpis.spend) < 0 ? "up" : "down",
                sublabel: `${calculateDelta(overview.kpis.spend, overview.previousKpis.spend) > 0 ? "+" : ""}${calculateDelta(overview.kpis.spend, overview.previousKpis.spend).toFixed(1)}% vs prev`,
              },
              {
                label: "CPA",
                value: formatCurrency(overview.kpis.cpa),
                trend: calculateDelta(overview.kpis.cpa, overview.previousKpis.cpa) < 0 ? "up" : "down",
                sublabel: "Cost per purchase",
              },
              {
                label: "CPM",
                value: formatCurrency(overview.kpis.cpm),
                trend: calculateDelta(overview.kpis.cpm, overview.previousKpis.cpm) < 0 ? "up" : "down",
                sublabel: "Cost per 1K impressions",
              },
              {
                label: "CPC",
                value: formatCurrency(overview.kpis.cpc),
                trend: calculateDelta(overview.kpis.cpc, overview.previousKpis.cpc) < 0 ? "up" : "down",
                sublabel: "Cost per click",
              },
            ]}
            columns={4}
          />

          {/* Revenue & Conversions */}
          <GroupedMetricCard
            title="Revenue & Conversions"
            icon={<ShoppingCart size={18} />}
            heroMetric={{
              label: "Attributed Revenue",
              value: formatCurrency(overview.kpis.revenue),
              sublabel: `${overview.kpis.purchases} purchases`,
            }}
            metrics={[
              {
                label: "Purchases",
                value: formatNumber(overview.kpis.purchases),
                trend: calculateDelta(overview.kpis.purchases, overview.previousKpis.purchases) > 0 ? "up" : "down",
                sublabel: `${calculateDelta(overview.kpis.purchases, overview.previousKpis.purchases) > 0 ? "+" : ""}${calculateDelta(overview.kpis.purchases, overview.previousKpis.purchases).toFixed(1)}% vs prev`,
              },
              {
                label: "Add to Cart",
                value: formatNumber(overview.kpis.addToCart),
                sublabel: overview.kpis.addToCart > 0 ? `${((overview.kpis.purchases / overview.kpis.addToCart) * 100).toFixed(1)}% to purchase` : "N/A",
              },
              {
                label: "Checkouts",
                value: formatNumber(overview.kpis.initiateCheckout),
                sublabel: overview.kpis.initiateCheckout > 0 ? `${((overview.kpis.purchases / overview.kpis.initiateCheckout) * 100).toFixed(1)}% completed` : "N/A",
              },
              {
                label: "Avg Order",
                value: overview.kpis.purchases > 0 ? formatCurrency(overview.kpis.revenue / overview.kpis.purchases) : "$0",
                sublabel: "Per purchase",
              },
            ]}
            columns={4}
          />
        </div>
      )}

      {/* Grouped KPI Cards - Bottom Row */}
      {overview && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Engagement */}
          <GroupedMetricCard
            title="Engagement"
            icon={<MousePointer size={18} />}
            heroMetric={{
              label: "Click-Through Rate",
              value: formatPercent(overview.kpis.ctr),
              sublabel: `${formatNumber(overview.kpis.clicks)} total clicks`,
            }}
            metrics={[
              {
                label: "Link CTR",
                value: formatPercent(overview.kpis.linkCtr),
                trend: calculateDelta(overview.kpis.linkCtr, overview.previousKpis.linkCtr) > 0 ? "up" : "down",
                sublabel: "Website clicks / impressions",
              },
              {
                label: "Link Clicks",
                value: formatNumber(overview.kpis.linkClicks),
                sublabel: `${formatCurrency(overview.kpis.cpcLink)}/click`,
              },
              {
                label: "Landing Views",
                value: formatNumber(overview.kpis.landingPageViews),
                sublabel: overview.kpis.linkClicks > 0 ? `${((overview.kpis.landingPageViews / overview.kpis.linkClicks) * 100).toFixed(1)}% of clicks` : "N/A",
              },
              {
                label: "Engagement Rate",
                value: overview.kpis.impressions > 0 ? `${((overview.kpis.clicks / overview.kpis.impressions) * 100).toFixed(2)}%` : "0%",
                sublabel: "All interactions",
              },
            ]}
            columns={4}
          />

          {/* Reach & Awareness */}
          <GroupedMetricCard
            title="Reach & Awareness"
            icon={<Users size={18} />}
            heroMetric={{
              label: "Total Impressions",
              value: formatNumber(overview.kpis.impressions),
              sublabel: `${formatNumber(overview.kpis.reach)} unique people`,
            }}
            metrics={[
              {
                label: "Reach",
                value: formatNumber(overview.kpis.reach),
                trend: calculateDelta(overview.kpis.reach, overview.previousKpis.reach) > 0 ? "up" : "down",
                sublabel: `${calculateDelta(overview.kpis.reach, overview.previousKpis.reach) > 0 ? "+" : ""}${calculateDelta(overview.kpis.reach, overview.previousKpis.reach).toFixed(1)}% vs prev`,
              },
              {
                label: "Frequency",
                value: overview.kpis.frequency.toFixed(2),
                sublabel: "Avg impressions/person",
                trend: overview.kpis.frequency > 3 ? "down" : "neutral",
              },
              {
                label: "Cost/Reach",
                value: overview.kpis.reach > 0 ? formatCurrency((overview.kpis.spend / overview.kpis.reach) * 1000) : "$0",
                sublabel: "Per 1K people reached",
              },
              {
                label: "Est. Ad Recall",
                value: formatNumber(Math.round(overview.kpis.reach * 0.08)),
                sublabel: "~8% of reach",
              },
            ]}
            columns={4}
          />
        </div>
      )}

      {/* Performance Funnel */}
      {overview && overview.kpis.impressions > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
                  <Activity size={18} />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Conversion Funnel</CardTitle>
                  <p className="text-xs text-muted-foreground">Impression to purchase journey</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">{formatNumber(overview.kpis.purchases)}</p>
                <p className="text-xs text-muted-foreground">Total Purchases</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 pb-4">
            {/* Funnel visualization */}
            <div className="space-y-2">
              {[
                { label: "Impressions", value: overview.kpis.impressions, gradient: "from-blue-500 to-blue-600" },
                { label: "Clicks", value: overview.kpis.clicks, gradient: "from-sky-500 to-cyan-500" },
                { label: "Link Clicks", value: overview.kpis.linkClicks, gradient: "from-cyan-500 to-teal-500" },
                { label: "Add to Cart", value: overview.kpis.addToCart, gradient: "from-teal-500 to-emerald-500" },
                { label: "Checkout", value: overview.kpis.initiateCheckout, gradient: "from-emerald-500 to-green-500" },
                { label: "Purchase", value: overview.kpis.purchases, gradient: "from-green-500 to-green-600" },
              ].map((step, idx, arr) => {
                const prevValue = idx > 0 ? arr[idx - 1].value : step.value
                const dropOff = idx > 0 && prevValue > 0 ? ((1 - step.value / prevValue) * 100).toFixed(1) : null
                const convRate = idx > 0 && prevValue > 0 ? ((step.value / prevValue) * 100).toFixed(1) : null
                const widthPercent = arr[0].value > 0 ? Math.max(25, (step.value / arr[0].value) * 100) : 25

                return (
                  <div key={step.label} className="relative group">
                    <div className="flex items-center gap-4">
                      {/* Stage number */}
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-500 flex-shrink-0">
                        {idx + 1}
                      </div>

                      {/* Bar container */}
                      <div className="flex-1 relative">
                        <div
                          className={`h-11 rounded-lg bg-gradient-to-r ${step.gradient} shadow-sm transition-all duration-300 group-hover:shadow-md flex items-center justify-between px-4`}
                          style={{ width: `${widthPercent}%` }}
                        >
                          <span className="text-sm font-semibold text-white truncate">{step.label}</span>
                          <span className="text-sm font-bold text-white">{formatNumber(step.value)}</span>
                        </div>
                      </div>

                      {/* Conversion rate badge */}
                      <div className="w-24 flex-shrink-0 text-right">
                        {convRate && (
                          <div className="inline-flex items-center gap-1">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{convRate}%</span>
                            {Number(dropOff) > 50 && (
                              <span className="text-xs text-red-500">↓{dropOff}%</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Connector line */}
                    {idx < arr.length - 1 && (
                      <div className="ml-3 w-px h-2 bg-slate-200 dark:bg-slate-700" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Summary metrics */}
            <div className="mt-6 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Click Rate</p>
                <p className="text-xl font-bold text-blue-600">{formatPercent(overview.kpis.ctr)}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Landing → Cart</p>
                <p className="text-xl font-bold text-teal-600">
                  {overview.kpis.landingPageViews > 0
                    ? `${((overview.kpis.addToCart / overview.kpis.landingPageViews) * 100).toFixed(1)}%`
                    : "N/A"}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Cart → Purchase</p>
                <p className="text-xl font-bold text-emerald-600">
                  {overview.kpis.addToCart > 0
                    ? `${((overview.kpis.purchases / overview.kpis.addToCart) * 100).toFixed(1)}%`
                    : "N/A"}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Overall Rate</p>
                <p className="text-xl font-bold text-green-600">
                  {overview.kpis.impressions > 0
                    ? `${((overview.kpis.purchases / overview.kpis.impressions) * 100).toFixed(3)}%`
                    : "0%"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Analytics Row */}
      {overview && campaigns.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Spend Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <Percent size={16} />
                  </div>
                  <CardTitle className="text-base">Spend Distribution</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const topCampaigns = [...campaigns]
                  .sort((a, b) => b.metrics.spend - a.metrics.spend)
                  .slice(0, 5)
                const totalSpend = campaigns.reduce((sum, c) => sum + c.metrics.spend, 0)
                const otherSpend = totalSpend - topCampaigns.reduce((sum, c) => sum + c.metrics.spend, 0)
                const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#6b7280"]

                return (
                  <div className="space-y-4">
                    {/* Mini bar chart */}
                    <div className="h-8 flex rounded-lg overflow-hidden">
                      {topCampaigns.map((campaign, idx) => {
                        const percent = totalSpend > 0 ? (campaign.metrics.spend / totalSpend) * 100 : 0
                        return (
                          <div
                            key={campaign.id}
                            className="h-full transition-all hover:opacity-80"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: colors[idx],
                              minWidth: percent > 0 ? "8px" : "0",
                            }}
                            title={`${campaign.name}: ${formatCurrency(campaign.metrics.spend)} (${percent.toFixed(1)}%)`}
                          />
                        )
                      })}
                      {otherSpend > 0 && (
                        <div
                          className="h-full bg-gray-300"
                          style={{ width: `${(otherSpend / totalSpend) * 100}%` }}
                          title={`Other: ${formatCurrency(otherSpend)}`}
                        />
                      )}
                    </div>

                    {/* Legend */}
                    <div className="space-y-2">
                      {topCampaigns.map((campaign, idx) => {
                        const percent = totalSpend > 0 ? (campaign.metrics.spend / totalSpend) * 100 : 0
                        return (
                          <div key={campaign.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-3 h-3 rounded-sm flex-shrink-0"
                                style={{ backgroundColor: colors[idx] }}
                              />
                              <span className="truncate max-w-[180px]">{campaign.name}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="font-medium">{formatCurrency(campaign.metrics.spend)}</span>
                              <span className="text-xs text-muted-foreground w-12 text-right">
                                {percent.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      {otherSpend > 0 && campaigns.length > 5 && (
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-gray-300" />
                            <span>Other ({campaigns.length - 5} campaigns)</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span>{formatCurrency(otherSpend)}</span>
                            <span className="text-xs w-12 text-right">
                              {((otherSpend / totalSpend) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          {/* Quick Insights */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                  <Zap size={16} />
                </div>
                <CardTitle className="text-base">Quick Insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const insights: { type: "success" | "warning" | "info"; message: string }[] = []
                  const kpis = overview.kpis
                  const prevKpis = overview.previousKpis

                  // ROAS insight
                  if (kpis.roas >= 2) {
                    insights.push({ type: "success", message: `Strong ROAS of ${formatRoas(kpis.roas)} - your ads are profitable` })
                  } else if (kpis.roas < 1 && kpis.spend > 100) {
                    insights.push({ type: "warning", message: `ROAS below 1x - review underperforming campaigns` })
                  }

                  // Frequency insight
                  if (kpis.frequency > 4) {
                    insights.push({ type: "warning", message: `High frequency (${kpis.frequency.toFixed(1)}) - audience may be fatigued` })
                  } else if (kpis.frequency < 1.5 && kpis.reach > 1000) {
                    insights.push({ type: "info", message: `Low frequency (${kpis.frequency.toFixed(1)}) - room to increase impressions` })
                  }

                  // CPA trend
                  const cpaDelta = calculateDelta(kpis.cpa, prevKpis.cpa)
                  if (cpaDelta < -10 && kpis.purchases > 5) {
                    insights.push({ type: "success", message: `CPA improved ${Math.abs(cpaDelta).toFixed(0)}% vs previous period` })
                  } else if (cpaDelta > 20 && kpis.purchases > 5) {
                    insights.push({ type: "warning", message: `CPA increased ${cpaDelta.toFixed(0)}% - check targeting` })
                  }

                  // CTR insight
                  if (kpis.ctr > 2) {
                    insights.push({ type: "success", message: `Excellent CTR of ${formatPercent(kpis.ctr)} - strong creative engagement` })
                  } else if (kpis.ctr < 0.5 && kpis.impressions > 10000) {
                    insights.push({ type: "warning", message: `Low CTR (${formatPercent(kpis.ctr)}) - test new creatives` })
                  }

                  // Conversion rate
                  const convRate = kpis.linkClicks > 0 ? (kpis.purchases / kpis.linkClicks) * 100 : 0
                  if (convRate > 5) {
                    insights.push({ type: "success", message: `High conversion rate (${convRate.toFixed(1)}%) - landing pages converting well` })
                  } else if (convRate < 1 && kpis.linkClicks > 500) {
                    insights.push({ type: "info", message: `${convRate.toFixed(1)}% click-to-purchase rate - consider landing page optimization` })
                  }

                  // Cart abandonment
                  if (kpis.addToCart > 0 && kpis.purchases > 0) {
                    const cartConv = (kpis.purchases / kpis.addToCart) * 100
                    if (cartConv < 30) {
                      insights.push({ type: "info", message: `${(100 - cartConv).toFixed(0)}% cart abandonment - consider retargeting` })
                    }
                  }

                  // Default insight
                  if (insights.length === 0) {
                    insights.push({ type: "info", message: "Keep monitoring - gather more data for insights" })
                  }

                  return insights.slice(0, 5).map((insight, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 rounded-lg p-3 ${
                        insight.type === "success"
                          ? "bg-green-50 dark:bg-green-950/20"
                          : insight.type === "warning"
                          ? "bg-amber-50 dark:bg-amber-950/20"
                          : "bg-blue-50 dark:bg-blue-950/20"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${
                          insight.type === "success"
                            ? "bg-green-500"
                            : insight.type === "warning"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                        }`}
                      >
                        {insight.type === "success" && <CheckCircle2 className="h-3 w-3 text-white" />}
                        {insight.type === "warning" && <TrendingDown className="h-3 w-3 text-white" />}
                        {insight.type === "info" && <Activity className="h-3 w-3 text-white" />}
                      </div>
                      <p
                        className={`text-sm ${
                          insight.type === "success"
                            ? "text-green-800 dark:text-green-300"
                            : insight.type === "warning"
                            ? "text-amber-800 dark:text-amber-300"
                            : "text-blue-800 dark:text-blue-300"
                        }`}
                      >
                        {insight.message}
                      </p>
                    </div>
                  ))
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign Performance Comparison */}
      {campaigns.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
                <BarChart3 size={16} />
              </div>
              <CardTitle className="text-base">Campaign Performance Comparison</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const activeCampaigns = campaigns.filter(c => c.metrics.spend > 10).slice(0, 8)
              const maxSpend = Math.max(...activeCampaigns.map(c => c.metrics.spend))
              const maxRevenue = Math.max(...activeCampaigns.map(c => c.metrics.revenue))

              return (
                <div className="space-y-3">
                  {activeCampaigns.map((campaign) => (
                    <div key={campaign.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate max-w-[200px]">{campaign.name}</span>
                        <div className="flex items-center gap-4 text-xs">
                          <span className={`font-semibold ${campaign.metrics.roas >= 1 ? "text-green-600" : "text-red-600"}`}>
                            {formatRoas(campaign.metrics.roas)} ROAS
                          </span>
                          <span>{campaign.metrics.purchases} sales</span>
                        </div>
                      </div>
                      <div className="flex gap-1 h-6">
                        {/* Spend bar */}
                        <div className="flex-1 bg-gray-100 rounded overflow-hidden">
                          <div
                            className="h-full bg-red-400 flex items-center justify-end pr-2"
                            style={{ width: maxSpend > 0 ? `${(campaign.metrics.spend / maxSpend) * 100}%` : "0%" }}
                          >
                            <span className="text-[10px] text-white font-medium">
                              {formatCurrency(campaign.metrics.spend)}
                            </span>
                          </div>
                        </div>
                        {/* Revenue bar */}
                        <div className="flex-1 bg-gray-100 rounded overflow-hidden">
                          <div
                            className="h-full bg-green-500 flex items-center pl-2"
                            style={{ width: maxRevenue > 0 ? `${(campaign.metrics.revenue / maxRevenue) * 100}%` : "0%" }}
                          >
                            <span className="text-[10px] text-white font-medium">
                              {formatCurrency(campaign.metrics.revenue)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Legend */}
                  <div className="flex justify-center gap-6 pt-2 border-t mt-4">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded bg-red-400" />
                      <span className="text-muted-foreground">Spend</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded bg-green-500" />
                      <span className="text-muted-foreground">Revenue</span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Campaigns Table */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setCampaignsCollapsed(!campaignsCollapsed)}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-5 w-5 text-blue-600" />
              Ad Campaigns
              <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {campaigns.length}
              </span>
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {campaignsCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {!campaignsCollapsed && <CardContent>
          {campaignsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
              <Layers className="h-10 w-10 mb-2 opacity-50" />
              <p>No campaigns found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/80">
                    <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-gray-600">
                      Campaign
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center font-medium text-gray-600">
                      Status
                    </th>
                    <th
                      className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                      onClick={() => {
                        if (campaignSortField === "spend") {
                          setCampaignSortDirection(d => d === "asc" ? "desc" : "asc")
                        } else {
                          setCampaignSortField("spend")
                          setCampaignSortDirection("desc")
                        }
                      }}
                    >
                      <span className="inline-flex items-center gap-1">
                        Spend
                        {campaignSortField === "spend" && (campaignSortDirection === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
                      </span>
                    </th>
                    <th
                      className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                      onClick={() => {
                        if (campaignSortField === "roas") {
                          setCampaignSortDirection(d => d === "asc" ? "desc" : "asc")
                        } else {
                          setCampaignSortField("roas")
                          setCampaignSortDirection("desc")
                        }
                      }}
                    >
                      <span className="inline-flex items-center gap-1">
                        ROAS
                        {campaignSortField === "roas" && (campaignSortDirection === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
                      </span>
                    </th>
                    <th
                      className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                      onClick={() => {
                        if (campaignSortField === "purchases") {
                          setCampaignSortDirection(d => d === "asc" ? "desc" : "asc")
                        } else {
                          setCampaignSortField("purchases")
                          setCampaignSortDirection("desc")
                        }
                      }}
                    >
                      <span className="inline-flex items-center gap-1">
                        Purchases
                        {campaignSortField === "purchases" && (campaignSortDirection === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
                      </span>
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-600">
                      Revenue
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-600">
                      CPA
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-600">
                      CPM
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-600">
                      CTR
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-600">
                      Impressions
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-center font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedCampaigns.map((campaign) => (
                    <React.Fragment key={campaign.id}>
                      <tr
                        className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${expandedCampaigns.has(campaign.id) ? "bg-blue-50/50" : ""}`}
                        onClick={() => toggleCampaignExpansion(campaign.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button
                              className="flex h-6 w-6 items-center justify-center rounded hover:bg-gray-200 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleCampaignExpansion(campaign.id)
                              }}
                            >
                              {expandedCampaigns.has(campaign.id) ? (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90" />
                              )}
                            </button>
                            <div
                              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm cursor-pointer hover:from-blue-600 hover:to-blue-700"
                              onClick={(e) => {
                                e.stopPropagation()
                                openCampaignDrawer(campaign)
                              }}
                            >
                              <Layers className="h-4 w-4" />
                            </div>
                            <div
                              className="cursor-pointer hover:text-blue-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                openCampaignDrawer(campaign)
                              }}
                            >
                              <p className="font-medium text-gray-900 max-w-[200px] truncate hover:text-blue-600">{campaign.name}</p>
                              <p className="text-xs text-gray-500">{campaign.objective || "Traffic"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            campaign.status === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : campaign.status === "PAUSED"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {campaign.status === "ACTIVE" && <CheckCircle2 className="h-3 w-3" />}
                            {campaign.status === "PAUSED" && <PauseCircle className="h-3 w-3" />}
                            {campaign.status !== "ACTIVE" && campaign.status !== "PAUSED" && <XCircle className="h-3 w-3" />}
                            {campaign.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(campaign.metrics.spend)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-semibold ${campaign.metrics.roas >= 1 ? "text-green-600" : "text-red-600"}`}>
                            {formatRoas(campaign.metrics.roas)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {campaign.metrics.purchases}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">
                          {formatCurrency(campaign.metrics.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(campaign.metrics.cpa)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(campaign.metrics.cpm)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatPercent(campaign.metrics.ctr)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatNumber(campaign.metrics.impressions)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                openCampaignDrawer(campaign)
                              }}
                              className="h-8 w-8 p-0"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(`https://business.facebook.com/adsmanager/manage/campaigns?act=${campaign.id}&selected_campaign_ids=${campaign.id}`, "_blank")
                              }}
                              className="h-8 w-8 p-0"
                              title="Open in Meta"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {/* Expanded adsets and ads */}
                      {expandedCampaigns.has(campaign.id) && (
                        <tr key={`${campaign.id}-adsets`}>
                          <td colSpan={11} className="bg-gray-50/80 px-4 py-3">
                            {loadingAdsets.has(campaign.id) ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                <span className="ml-2 text-sm text-muted-foreground">Loading ad sets...</span>
                              </div>
                            ) : (() => {
                              const adsets = (campaignAdsets.get(campaign.id) || []).filter((adset: any) =>
                                !hidePaused || adset.status === "ACTIVE" || adset.effective_status === "ACTIVE"
                              );
                              const inlineAds = (campaignAds.get(campaign.id) || []).filter((ad: AdCard) =>
                                !hidePaused || ad.status === "ACTIVE"
                              );
                              return (
                                <div className="ml-8 space-y-4">
                                  {/* Ad Sets Section */}
                                  {adsets.length > 0 && (
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Ad Sets ({adsets.length})</p>
                                      {adsets.map((adset: any) => (
                                      <div
                                        key={adset.id}
                                        className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm border hover:shadow-md transition-shadow"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white text-xs shadow-sm">
                                            <Target className="h-3.5 w-3.5" />
                                          </div>
                                          <div>
                                            <p className="font-medium text-sm text-gray-900">{adset.name}</p>
                                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                              adset.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                                              adset.status === "PAUSED" ? "bg-yellow-100 text-yellow-700" :
                                              "bg-gray-100 text-gray-600"
                                            }`}>
                                              {adset.status}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-6 text-sm">
                                          <div className="text-right">
                                            <p className="text-xs text-gray-500">Spend</p>
                                            <p className="font-medium">{formatCurrency(adset.metrics?.spend || 0)}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-xs text-gray-500">ROAS</p>
                                            <p className={`font-medium ${(adset.metrics?.roas || 0) >= 1 ? "text-green-600" : "text-red-600"}`}>
                                              {formatRoas(adset.metrics?.roas || 0)}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-xs text-gray-500">Purchases</p>
                                            <p className="font-medium">{adset.metrics?.purchases || 0}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-xs text-gray-500">Revenue</p>
                                            <p className="font-medium text-green-600">{formatCurrency(adset.metrics?.revenue || 0)}</p>
                                          </div>
                                        </div>
                                      </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Inline Ads Section */}
                                  {inlineAds.length > 0 && (
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                                        <Image className="h-3.5 w-3.5 text-purple-500" />
                                        Ads ({inlineAds.length})
                                      </p>
                                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                        {inlineAds.slice(0, 10).map((ad: AdCard) => (
                                          <div
                                            key={ad.id}
                                            className="rounded-lg border bg-white overflow-hidden cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setSelectedAd(ad)
                                              setDrawerOpen(true)
                                            }}
                                          >
                                            <div className="relative aspect-square bg-gray-100">
                                              {ad.creative.thumbnailUrl ? (
                                                <img
                                                  src={ad.creative.thumbnailUrl}
                                                  alt={ad.name}
                                                  className="h-full w-full object-cover"
                                                  loading="lazy"
                                                />
                                              ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                  {ad.creative.hasVideo ? (
                                                    <Play className="h-6 w-6 text-gray-400" />
                                                  ) : (
                                                    <Image className="h-6 w-6 text-gray-400" />
                                                  )}
                                                </div>
                                              )}
                                              <span className={`absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                                                ad.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                                                ad.status === "PAUSED" ? "bg-yellow-100 text-yellow-700" :
                                                "bg-gray-100 text-gray-700"
                                              }`}>
                                                {ad.status}
                                              </span>
                                              {ad.creative.hasVideo && (
                                                <div className="absolute bottom-1.5 right-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] text-white flex items-center gap-0.5">
                                                  <Play className="h-2.5 w-2.5" />
                                                </div>
                                              )}
                                            </div>
                                            <div className="p-2">
                                              <p className="text-[11px] font-medium truncate text-gray-900">{ad.name}</p>
                                              <div className="flex justify-between mt-1 text-[10px]">
                                                <span className="text-gray-500">{formatCurrency(ad.metrics.spend)}</span>
                                                <span className={ad.metrics.roas >= 1 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                                  {formatRoas(ad.metrics.roas)}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      {inlineAds.length > 10 && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="mt-2"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            openCampaignDrawer(campaign)
                                          }}
                                        >
                                          View all {inlineAds.length} ads
                                          <ExternalLink className="ml-2 h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  )}

                                  {/* Empty state */}
                                  {adsets.length === 0 && inlineAds.length === 0 && (
                                    <div className="text-center py-4 text-sm text-muted-foreground">
                                      {hidePaused ? "No active ad sets or ads found" : "No ad sets or ads found for this campaign"}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
                {/* Totals Row */}
                <tfoot>
                  <tr className="border-t-2 bg-gray-50 font-medium">
                    <td className="px-4 py-3 text-gray-700">
                      Total ({sortedCampaigns.length} campaigns)
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(sortedCampaigns.reduce((sum, c) => sum + c.metrics.spend, 0))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(() => {
                        const totalSpend = sortedCampaigns.reduce((sum, c) => sum + c.metrics.spend, 0)
                        const totalRevenue = sortedCampaigns.reduce((sum, c) => sum + c.metrics.revenue, 0)
                        const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
                        return <span className={avgRoas >= 1 ? "text-green-600" : "text-red-600"}>{formatRoas(avgRoas)}</span>
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {sortedCampaigns.reduce((sum, c) => sum + c.metrics.purchases, 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {formatCurrency(sortedCampaigns.reduce((sum, c) => sum + c.metrics.revenue, 0))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(() => {
                        const totalSpend = sortedCampaigns.reduce((sum, c) => sum + c.metrics.spend, 0)
                        const totalPurchases = sortedCampaigns.reduce((sum, c) => sum + c.metrics.purchases, 0)
                        return totalPurchases > 0 ? formatCurrency(totalSpend / totalPurchases) : "-"
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(() => {
                        const totalSpend = sortedCampaigns.reduce((sum, c) => sum + c.metrics.spend, 0)
                        const totalImpressions = sortedCampaigns.reduce((sum, c) => sum + c.metrics.impressions, 0)
                        return totalImpressions > 0 ? formatCurrency((totalSpend / totalImpressions) * 1000) : "-"
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(() => {
                        const totalClicks = sortedCampaigns.reduce((sum, c) => sum + c.metrics.clicks, 0)
                        const totalImpressions = sortedCampaigns.reduce((sum, c) => sum + c.metrics.impressions, 0)
                        return totalImpressions > 0 ? formatPercent((totalClicks / totalImpressions) * 100) : "-"
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatNumber(sortedCampaigns.reduce((sum, c) => sum + c.metrics.impressions, 0))}
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>}
      </Card>

      {/* Ads Gallery */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setAdsCollapsed(!adsCollapsed)}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Image className="h-5 w-5 text-purple-600" />
              Ads Gallery
              <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                {filteredAds.length}
              </span>
            </CardTitle>

            <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search ads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-48 rounded-md border pl-9 pr-3 text-sm"
                />
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                >
                  Sort: {SORT_OPTIONS.find(s => s.value === sortField)?.label}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
                {showSortDropdown && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border bg-white shadow-lg">
                    {SORT_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          if (sortField === option.value) {
                            setSortDirection(d => d === "asc" ? "desc" : "asc")
                          } else {
                            setSortField(option.value)
                            setSortDirection("desc")
                          }
                          setShowSortDropdown(false)
                        }}
                        className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                          sortField === option.value ? "bg-gray-50 font-medium" : ""
                        }`}
                      >
                        {option.label} {sortField === option.value && (sortDirection === "asc" ? "↑" : "↓")}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Status
                  {statusFilter.length > 0 && (
                    <span className="ml-1 rounded-full bg-blue-100 px-1.5 text-xs text-blue-700">
                      {statusFilter.length}
                    </span>
                  )}
                </Button>
                {showFilterDropdown && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border bg-white p-2 shadow-lg">
                    {["ACTIVE", "PAUSED", "DELETED", "ARCHIVED"].map(status => (
                      <label key={status} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={statusFilter.includes(status)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setStatusFilter([...statusFilter, status])
                            } else {
                              setStatusFilter(statusFilter.filter(s => s !== status))
                            }
                          }}
                          className="rounded"
                        />
                        {status}
                      </label>
                    ))}
                    {statusFilter.length > 0 && (
                      <button
                        onClick={() => setStatusFilter([])}
                        className="mt-2 w-full rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* View Toggle */}
              <div className="flex rounded-md border" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Collapse Toggle */}
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                {adsCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {!adsCollapsed && <CardContent>
          {adsLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAds.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
              <Image className="h-12 w-12 mb-2" />
              <p>No ads found</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAds.map(ad => (
                <AdCardComponent key={ad.id} ad={ad} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAds.map(ad => (
                <div
                  key={ad.id}
                  onClick={() => {
                    setSelectedAd(ad)
                    setDrawerOpen(true)
                  }}
                  className="flex cursor-pointer items-center gap-4 rounded-lg border p-3 hover:bg-gray-50"
                >
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                    {ad.creative.thumbnailUrl ? (
                      <img src={ad.creative.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Image className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{ad.name}</p>
                    <p className="text-xs text-muted-foreground">{ad.status}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-center text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Spend</p>
                      <p className="font-medium">{formatCurrency(ad.metrics.spend)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">ROAS</p>
                      <p className={`font-medium ${ad.metrics.roas >= 1 ? "text-green-600" : "text-red-600"}`}>
                        {formatRoas(ad.metrics.roas)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Purchases</p>
                      <p className="font-medium">{ad.metrics.purchases}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CPM</p>
                      <p className="font-medium">{formatCurrency(ad.metrics.cpm)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>}
      </Card>

      {/* Campaign Detail Drawer */}
      {campaignDrawerOpen && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/50"
            onClick={() => setCampaignDrawerOpen(false)}
          />

          {/* Drawer */}
          <div className="w-full max-w-2xl overflow-auto bg-white shadow-xl">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Campaign Details</h2>
                  <p className="text-sm text-muted-foreground">{selectedCampaign.objective || "Traffic"}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCampaignDrawerOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Campaign Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{selectedCampaign.name}</h3>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                    selectedCampaign.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                    selectedCampaign.status === "PAUSED" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {selectedCampaign.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">ID: {selectedCampaign.id}</p>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://business.facebook.com/adsmanager/manage/campaigns?act=${selectedCampaign.id}&selected_campaign_ids=${selectedCampaign.id}`, "_blank")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in Meta
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(selectedCampaign.id)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy ID
                </Button>
              </div>

              {/* Key Metrics Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 bg-gradient-to-br from-blue-50 to-white">
                  <p className="text-xs font-medium text-muted-foreground">Total Spend</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(selectedCampaign.metrics.spend)}</p>
                </div>
                <div className="rounded-lg border p-4 bg-gradient-to-br from-green-50 to-white">
                  <p className="text-xs font-medium text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedCampaign.metrics.revenue)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground">ROAS</p>
                  <p className={`text-2xl font-bold ${selectedCampaign.metrics.roas >= 1 ? "text-green-600" : "text-red-600"}`}>
                    {formatRoas(selectedCampaign.metrics.roas)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground">Purchases</p>
                  <p className="text-2xl font-bold">{selectedCampaign.metrics.purchases}</p>
                </div>
              </div>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Impressions</span>
                    <span className="font-medium">{formatNumber(selectedCampaign.metrics.impressions)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Reach</span>
                    <span className="font-medium">{formatNumber(selectedCampaign.metrics.reach)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Frequency</span>
                    <span className="font-medium">{selectedCampaign.metrics.frequency.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Clicks</span>
                    <span className="font-medium">{formatNumber(selectedCampaign.metrics.clicks)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">CTR</span>
                    <span className="font-medium">{formatPercent(selectedCampaign.metrics.ctr)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">CPC</span>
                    <span className="font-medium">{formatCurrency(selectedCampaign.metrics.cpc)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">CPM</span>
                    <span className="font-medium">{formatCurrency(selectedCampaign.metrics.cpm)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">CPA</span>
                    <span className="font-medium">{formatCurrency(selectedCampaign.metrics.cpa)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Link Clicks</span>
                    <span className="font-medium">{formatNumber(selectedCampaign.metrics.linkClicks)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Add to Cart</span>
                    <span className="font-medium">{selectedCampaign.metrics.addToCart}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Ads in Campaign */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Image className="h-4 w-4 text-purple-600" />
                    Ads in this Campaign
                    {campaignAds.has(selectedCampaign.id) && (
                      <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                        {(campaignAds.get(selectedCampaign.id) || []).filter(ad => !hidePaused || ad.status === "ACTIVE").length}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!campaignAds.has(selectedCampaign.id) ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading ads...</span>
                    </div>
                  ) : (() => {
                    const drawerAds = (campaignAds.get(selectedCampaign.id) || []).filter(ad =>
                      !hidePaused || ad.status === "ACTIVE"
                    );
                    return drawerAds.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        {hidePaused ? "No active ads found" : "No ads found in this campaign"}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {drawerAds.map((ad) => (
                        <div
                          key={ad.id}
                          className="rounded-lg border overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => {
                            setSelectedAd(ad)
                            setDrawerOpen(true)
                          }}
                        >
                          <div className="relative aspect-square bg-gray-100">
                            {ad.creative.thumbnailUrl ? (
                              <img
                                src={ad.creative.thumbnailUrl}
                                alt={ad.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                {ad.creative.hasVideo ? (
                                  <Play className="h-8 w-8 text-gray-400" />
                                ) : (
                                  <Image className="h-8 w-8 text-gray-400" />
                                )}
                              </div>
                            )}
                            <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              ad.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                              ad.status === "PAUSED" ? "bg-yellow-100 text-yellow-700" :
                              "bg-gray-100 text-gray-700"
                            }`}>
                              {ad.status}
                            </span>
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-medium truncate">{ad.name}</p>
                            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                              <span>{formatCurrency(ad.metrics.spend)}</span>
                              <span className={ad.metrics.roas >= 1 ? "text-green-600" : "text-red-600"}>
                                {formatRoas(ad.metrics.roas)}
                              </span>
                            </div>
                          </div>
                        </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Budget Info */}
              {(selectedCampaign.dailyBudget > 0 || selectedCampaign.lifetimeBudget > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Budget</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedCampaign.dailyBudget > 0 && (
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">Daily Budget</span>
                        <span className="font-medium">{formatCurrency(selectedCampaign.dailyBudget / 100)}</span>
                      </div>
                    )}
                    {selectedCampaign.lifetimeBudget > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Lifetime Budget</span>
                        <span className="font-medium">{formatCurrency(selectedCampaign.lifetimeBudget / 100)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ad Detail Drawer */}
      {drawerOpen && selectedAd && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer */}
          <div className="w-full max-w-lg overflow-auto bg-white shadow-xl">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
              <h2 className="text-lg font-semibold">Ad Details</h2>
              <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Creative Preview */}
              <div className="aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 shadow-inner">
                {selectedAd.creative.thumbnailUrl ? (
                  <img
                    src={selectedAd.creative.thumbnailUrl}
                    alt={selectedAd.name}
                    className="h-full w-full object-contain"
                    style={{ imageRendering: 'auto' }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    {selectedAd.creative.hasVideo ? (
                      <div className="flex flex-col items-center gap-2">
                        <Play className="h-16 w-16 text-gray-400" />
                        <span className="text-sm text-gray-500">Video Ad</span>
                      </div>
                    ) : (
                      <Image className="h-16 w-16 text-gray-400" />
                    )}
                  </div>
                )}
              </div>

              {/* Ad Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{selectedAd.name}</h3>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                    selectedAd.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                    selectedAd.status === "PAUSED" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {selectedAd.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">ID: {selectedAd.id}</p>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://business.facebook.com/adsmanager/manage/ads?act=${selectedAd.campaignId}&selected_ad_ids=${selectedAd.id}`, "_blank")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in Meta
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(selectedAd.id)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy ID
                </Button>
              </div>

              {/* Metrics Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Spend</span>
                    <span className="font-medium">{formatCurrency(selectedAd.metrics.spend)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="font-medium">{formatCurrency(selectedAd.metrics.revenue)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">ROAS</span>
                    <span className={`font-medium ${selectedAd.metrics.roas >= 1 ? "text-green-600" : "text-red-600"}`}>
                      {formatRoas(selectedAd.metrics.roas)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Purchases</span>
                    <span className="font-medium">{selectedAd.metrics.purchases}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">CPA</span>
                    <span className="font-medium">{formatCurrency(selectedAd.metrics.cpa)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Impressions</span>
                    <span className="font-medium">{formatNumber(selectedAd.metrics.impressions)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Reach</span>
                    <span className="font-medium">{formatNumber(selectedAd.metrics.reach)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">CPM</span>
                    <span className="font-medium">{formatCurrency(selectedAd.metrics.cpm)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">CTR (All)</span>
                    <span className="font-medium">{formatPercent(selectedAd.metrics.ctr)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">CTR (Link)</span>
                    <span className="font-medium">{formatPercent(selectedAd.metrics.linkCtr)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">CPC (All)</span>
                    <span className="font-medium">{formatCurrency(selectedAd.metrics.cpc)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">CPC (Link)</span>
                    <span className="font-medium">{formatCurrency(selectedAd.metrics.cpcLink)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Frequency</span>
                    <span className="font-medium">{selectedAd.metrics.frequency.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground">Add to Cart</span>
                    <span className="font-medium">{selectedAd.metrics.addToCart}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Initiate Checkout</span>
                    <span className="font-medium">{selectedAd.metrics.initiateCheckout}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Creative Details */}
              {(selectedAd.creative.title || selectedAd.creative.body) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Creative Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {selectedAd.creative.title && (
                      <div>
                        <p className="text-xs text-muted-foreground">Headline</p>
                        <p>{selectedAd.creative.title}</p>
                      </div>
                    )}
                    {selectedAd.creative.body && (
                      <div>
                        <p className="text-xs text-muted-foreground">Primary Text</p>
                        <p>{selectedAd.creative.body}</p>
                      </div>
                    )}
                    {selectedAd.creative.cta && (
                      <div>
                        <p className="text-xs text-muted-foreground">CTA</p>
                        <p>{selectedAd.creative.cta}</p>
                      </div>
                    )}
                    {selectedAd.creative.linkUrl && (
                      <div>
                        <p className="text-xs text-muted-foreground">Destination URL</p>
                        <a
                          href={selectedAd.creative.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {selectedAd.creative.linkUrl}
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
