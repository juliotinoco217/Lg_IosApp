import { useState, useEffect, useCallback } from "react"
import { GroupedMetricCard } from "./GroupedMetricCard"
import { KPITable } from "./KPITable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FormulaTooltip } from "@/components/ui/formula-tooltip"
import { MarketCard } from "@/components/ui/market-card"
import { HorizontalScrollSection } from "@/components/ui/horizontal-scroll"
import {
  DollarSign,
  ShoppingCart,
  Users,
  Target,
  Loader2,
  Package,
  Truck,
  Megaphone,
  RotateCcw,
  Wallet,
  ChevronDown,
  TrendingUp,
} from "lucide-react"
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Legend,
} from "recharts"
import type { DateRangeValue } from "@/components/layout/Header"
import { apiFetch } from "@/lib/api"
import { useMobile } from "@/hooks/useMobile"

interface OverviewMetrics {
  mer: number
  aov: number
  roas: number
  ncRoas: number
  cac: number
  grossSales: number
  netSales: number
  totalSales: number
  cogs: number
  shipping: number
  adSpend: number
  returns: number
  contributionMargin: number
  contributionMarginPercent: number
  totalOrders: number
  totalCustomers: number
  newCustomers: number
  returningCustomers: number
  returningCustomerRate: number
  newCustomerRevenue: number
  returningCustomerRevenue: number
  acquisitionMer: number
  newCustomerOrders?: number
  returningCustomerOrders?: number
}

interface PayrollData {
  summary: {
    totalPayroll: number
    averagePayroll: number
    lastPayrollDate: string | null
    payrollCount: number
  }
}

interface OverviewDashboardProps {
  dateRange: DateRangeValue
  refreshKey: number
}

type BreakdownTimeRange = "7d" | "14d" | "30d" | "60d" | "90d"

const BREAKDOWN_TIME_RANGES: { value: BreakdownTimeRange; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "14d", label: "14D" },
  { value: "30d", label: "30D" },
  { value: "60d", label: "60D" },
  { value: "90d", label: "90D" },
]

// Robinhood-style chart configuration
type ChartMetricType = "revenue_vs_spend" | "mer" | "contribution" | "orders" | "customers"
type ChartTimeRange = "7d" | "14d" | "30d"

const CHART_METRICS: { value: ChartMetricType; label: string; description: string }[] = [
  { value: "revenue_vs_spend", label: "Revenue vs Ad Spend", description: "Compare daily revenue and ad spend" },
  { value: "mer", label: "MER (Efficiency)", description: "Marketing Efficiency Ratio over time" },
  { value: "contribution", label: "Contribution Margin", description: "Daily contribution margin" },
  { value: "orders", label: "Orders", description: "Daily order count" },
  { value: "customers", label: "New vs Returning", description: "Customer acquisition breakdown" },
]

const CHART_TIME_RANGES: { value: ChartTimeRange; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "14d", label: "14D" },
  { value: "30d", label: "30D" },
]

interface DailyMetric {
  date: string
  dateRaw: string
  netSales: number
  grossSales: number
  totalSales: number
  orders: number
  adSpend: number
  cogs: number
  shipping: number
  contributionMargin: number
  newCustomerRevenue?: number
  returningCustomerRevenue?: number
}

interface BreakdownMetrics {
  netSales: number
  cogs: number
  adSpend: number
  payroll: number
  shipping: number
  returns: number
  netProfit: number
}

export function OverviewDashboard({ dateRange, refreshKey }: OverviewDashboardProps) {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null)
  const [payrollData, setPayrollData] = useState<PayrollData | null>(null)
  const [loading, setLoading] = useState(true)
  const isMobile = useMobile()

  // Breakdown chart state
  const [breakdownRange, setBreakdownRange] = useState<BreakdownTimeRange>("7d")
  const [breakdownMetrics, setBreakdownMetrics] = useState<BreakdownMetrics | null>(null)
  const [breakdownLoading, setBreakdownLoading] = useState(false)

  // Robinhood-style chart state
  const [chartMetric, setChartMetric] = useState<ChartMetricType>("revenue_vs_spend")
  const [chartTimeRange, setChartTimeRange] = useState<ChartTimeRange>("30d")
  const [chartData, setChartData] = useState<DailyMetric[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [showMetricDropdown, setShowMetricDropdown] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const encodedRange = encodeURIComponent(dateRange)
        const [metricsRes, payrollRes] = await Promise.all([
          apiFetch(`/api/metrics/overview?range=${encodedRange}`),
          apiFetch(`/api/finance/payroll?range=${encodedRange}`),
        ])

        if (metricsRes.ok) {
          const metricsData = await metricsRes.json()
          setMetrics(metricsData)
        }

        if (payrollRes.ok) {
          const payroll = await payrollRes.json()
          setPayrollData(payroll)
        }
      } catch (error) {
        console.error("Failed to fetch metrics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange, refreshKey])

  // Fetch breakdown data based on selected range
  const fetchBreakdownData = useCallback(async (range: BreakdownTimeRange) => {
    setBreakdownLoading(true)
    try {
      const [metricsRes, payrollRes] = await Promise.all([
        apiFetch(`/api/metrics/overview?range=${range}`),
        apiFetch(`/api/finance/payroll?range=${range}`),
      ])

      let breakdownData: BreakdownMetrics = {
        netSales: 0,
        cogs: 0,
        adSpend: 0,
        payroll: 0,
        shipping: 0,
        returns: 0,
        netProfit: 0,
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json()
        breakdownData.netSales = data.netSales || 0
        breakdownData.cogs = data.cogs || 0
        breakdownData.adSpend = data.adSpend || 0
        breakdownData.shipping = data.shipping || 0
        breakdownData.returns = data.returns || 0
      }

      if (payrollRes.ok) {
        const payroll = await payrollRes.json()
        breakdownData.payroll = payroll?.summary?.totalPayroll || 0
      }

      // Calculate net profit (contribution margin - payroll)
      const contributionMargin = breakdownData.netSales - breakdownData.cogs - breakdownData.shipping - breakdownData.adSpend - breakdownData.returns
      breakdownData.netProfit = contributionMargin - breakdownData.payroll

      setBreakdownMetrics(breakdownData)
    } catch (error) {
      console.error("Failed to fetch breakdown data:", error)
    } finally {
      setBreakdownLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBreakdownData(breakdownRange)
  }, [breakdownRange, fetchBreakdownData, refreshKey])

  // Fetch chart data for Robinhood-style chart
  useEffect(() => {
    const fetchChartData = async () => {
      setChartLoading(true)
      try {
        const response = await apiFetch(`/api/metrics/daily-metrics?range=${chartTimeRange}`)
        if (response.ok) {
          const data = await response.json()
          // Sort by date ascending for chart
          const sortedData = [...data].sort((a: DailyMetric, b: DailyMetric) =>
            new Date(a.dateRaw).getTime() - new Date(b.dateRaw).getTime()
          )
          setChartData(sortedData)
        }
      } catch (error) {
        console.error("Failed to fetch chart data:", error)
      } finally {
        setChartLoading(false)
      }
    }

    fetchChartData()
  }, [chartTimeRange, refreshKey])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatCompact = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return formatCurrency(value)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Calculate derived metrics
  const grossSales = metrics?.grossSales || 0
  const netSales = metrics?.netSales || 0
  const totalSales = metrics?.totalSales || 0
  const contributionMargin = metrics?.contributionMargin || 0
  const contributionMarginPercent = metrics?.contributionMarginPercent || 0
  const cogs = metrics?.cogs || 0
  const shipping = metrics?.shipping || 0
  const adSpend = metrics?.adSpend || 0
  const returns = metrics?.returns || 0

  // Calculate payroll and net profit
  const payroll = payrollData?.summary?.totalPayroll || 0
  const softwareCosts = 0 // TODO: Pull from finance transactions
  const netProfit = contributionMargin - payroll - softwareCosts
  const netProfitPercent = grossSales > 0 ? (netProfit / grossSales) * 100 : 0

  // Calculate % of gross sales for cost breakdown
  const adSpendPercent = grossSales > 0 ? (adSpend / grossSales) * 100 : 0
  const cogsPercent = grossSales > 0 ? (cogs / grossSales) * 100 : 0
  const shippingPercent = grossSales > 0 ? (shipping / grossSales) * 100 : 0
  const returnsPercent = grossSales > 0 ? (returns / grossSales) * 100 : 0

  const totalOrders = metrics?.totalOrders || 0
  const totalCustomers = metrics?.totalCustomers || 0
  const newCustomerRevenue = metrics?.newCustomerRevenue || 0
  const returningCustomerRevenue = metrics?.returningCustomerRevenue || 0
  const returningRate = metrics?.returningCustomerRate || 0

  // Use actual order counts from API, fall back to estimate if not available
  const newCustomerOrders = metrics?.newCustomerOrders || 0
  const returningCustomerOrders = metrics?.returningCustomerOrders || 0
  
  // Fallback estimate if actual counts not available
  const revenueTotal = newCustomerRevenue + returningCustomerRevenue
  const newOrdersEstimate = revenueTotal > 0
    ? Math.round((newCustomerRevenue / revenueTotal) * totalOrders)
    : 0
  const returningOrdersEstimate = totalOrders - newOrdersEstimate
  
  // Use actual values if available, otherwise use estimates
  const displayNewOrders = newCustomerOrders > 0 ? newCustomerOrders : newOrdersEstimate
  const displayReturningOrders = returningCustomerOrders > 0 ? returningCustomerOrders : returningOrdersEstimate

  const mer = metrics?.mer || 0
  const acquisitionMer = metrics?.acquisitionMer || 0
  const ncRoas = metrics?.ncRoas || 0
  const roas = metrics?.roas || 0
  const aov = metrics?.aov || 0
  const cac = metrics?.cac || 0

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Robinhood-Style Performance Chart - FIRST, Full Width */}
      <div className="-mx-4 md:-mx-6 px-4 md:px-6 py-6 bg-gradient-to-b from-background via-background to-muted/10">
        {/* Chart Header with Dropdown */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          {/* Metric Selector Dropdown */}
          <div className="relative z-50">
            <button
              onClick={() => setShowMetricDropdown(!showMetricDropdown)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1c1c1e] border border-white/10 hover:border-rh-accent/50 transition-all w-full md:min-w-[320px]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rh-accent/20">
                <TrendingUp className="h-5 w-5 text-rh-accent" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-white">
                  {CHART_METRICS.find(m => m.value === chartMetric)?.label}
                </p>
                <p className="text-xs text-gray-400">
                  {CHART_METRICS.find(m => m.value === chartMetric)?.description}
                </p>
              </div>
              <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showMetricDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showMetricDropdown && (
              <div className="absolute top-full left-0 mt-2 w-full bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden">
                {CHART_METRICS.map((metric) => (
                  <button
                    key={metric.value}
                    onClick={() => {
                      setChartMetric(metric.value)
                      setShowMetricDropdown(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${
                      chartMetric === metric.value ? 'bg-rh-accent/10 border-l-2 border-rh-accent' : ''
                    }`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      chartMetric === metric.value ? 'bg-rh-accent/20' : 'bg-white/5'
                    }`}>
                      <TrendingUp className={`h-4 w-4 ${chartMetric === metric.value ? 'text-rh-accent' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-medium ${chartMetric === metric.value ? 'text-rh-accent' : 'text-white'}`}>
                        {metric.label}
                      </p>
                      <p className="text-xs text-gray-500">{metric.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
            {CHART_TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setChartTimeRange(range.value)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  chartTimeRange === range.value
                    ? 'bg-rh-accent text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hero Values based on metric type */}
        {chartMetric === "revenue_vs_spend" && chartData.length > 0 && (
          <div className="flex flex-wrap gap-6 md:gap-12 mb-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Revenue</p>
              <p className="text-3xl md:text-4xl font-bold text-rh-positive">
                {formatCompact(chartData.reduce((sum, d) => sum + (d.netSales || 0), 0))}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Ad Spend</p>
              <p className="text-3xl md:text-4xl font-bold text-rh-accent">
                {formatCompact(chartData.reduce((sum, d) => sum + (d.adSpend || 0), 0))}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Avg MER</p>
              <p className="text-3xl md:text-4xl font-bold text-white">
                {(() => {
                  const totalRevenue = chartData.reduce((sum, d) => sum + (d.netSales || 0), 0)
                  const totalSpend = chartData.reduce((sum, d) => sum + (d.adSpend || 0), 0)
                  return totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0.00'
                })()}
              </p>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-[280px] md:h-[350px]">
          {chartLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartMetric === "revenue_vs_spend" ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradientMain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00c853" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#00c853" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="spendGradientMain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff6b35" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#ff6b35" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1c1c1e',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                    }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number | undefined, name?: string) => [
                      formatCurrency(value ?? 0),
                      name === 'netSales' ? 'Revenue' : 'Ad Spend'
                    ]}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => <span style={{ color: '#9ca3af' }}>{value === 'netSales' ? 'Revenue' : 'Ad Spend'}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="netSales"
                    name="netSales"
                    stroke="#00c853"
                    fill="url(#revenueGradientMain)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#000', strokeWidth: 2, fill: '#00c853' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="adSpend"
                    name="adSpend"
                    stroke="#ff6b35"
                    fill="url(#spendGradientMain)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#000', strokeWidth: 2, fill: '#ff6b35' }}
                  />
                </AreaChart>
              ) : chartMetric === "mer" ? (
                <AreaChart
                  data={chartData.map(d => ({
                    ...d,
                    mer: d.adSpend > 0 ? d.netSales / d.adSpend : 0
                  }))}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="merGradientMain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d4af37" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number | undefined) => [(value ?? 0).toFixed(2), 'MER']}
                  />
                  <Area type="monotone" dataKey="mer" stroke="#d4af37" fill="url(#merGradientMain)" strokeWidth={3} dot={false} />
                </AreaChart>
              ) : chartMetric === "contribution" ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="contribGradientMain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00c853" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#00c853" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Contribution Margin']}
                  />
                  <Area type="monotone" dataKey="contributionMargin" stroke="#00c853" fill="url(#contribGradientMain)" strokeWidth={3} dot={false} />
                </AreaChart>
              ) : chartMetric === "orders" ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ordersGradientMain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff6b35" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#ff6b35" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number | undefined) => [value ?? 0, 'Orders']}
                  />
                  <Area type="monotone" dataKey="orders" stroke="#ff6b35" fill="url(#ordersGradientMain)" strokeWidth={3} dot={false} />
                </AreaChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="newGradientMain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00c853" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#00c853" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="returningGradientMain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d4af37" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number | undefined, name?: string) => [formatCurrency(value ?? 0), name === 'newCustomerRevenue' ? 'New Customer' : 'Returning']}
                  />
                  <Legend verticalAlign="top" height={36} formatter={(value) => <span style={{ color: '#9ca3af' }}>{value === 'newCustomerRevenue' ? 'New Customers' : 'Returning'}</span>} />
                  <Area type="monotone" dataKey="newCustomerRevenue" stroke="#00c853" fill="url(#newGradientMain)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="returningCustomerRevenue" stroke="#d4af37" fill="url(#returningGradientMain)" strokeWidth={2} dot={false} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-gray-500 gap-2">
              <TrendingUp className="h-12 w-12 opacity-20" />
              <p>No data available for this period</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Robinhood-Style Hero Section */}
      {isMobile && (
        <div className="space-y-4">
          {/* Key Metrics Horizontal Scroll */}
          <HorizontalScrollSection title="Key Metrics">
            <MarketCard
              title="Net Sales"
              value={formatCurrency(netSales)}
            />
            <MarketCard
              title="Contribution"
              value={formatCurrency(contributionMargin)}
              change={{
                value: contributionMargin,
                percent: contributionMarginPercent,
              }}
            />
            <MarketCard
              title="Net Profit"
              value={formatCurrency(netProfit)}
              change={{
                value: netProfit,
                percent: netProfitPercent,
              }}
            />
            <MarketCard
              title="Ad Spend"
              value={formatCurrency(adSpend)}
            />
            <MarketCard
              title="MER"
              value={mer.toFixed(2)}
            />
            <MarketCard
              title="AOV"
              value={formatCurrency(aov)}
            />
            <MarketCard
              title="Orders"
              value={totalOrders.toLocaleString()}
            />
          </HorizontalScrollSection>
        </div>
      )}

      {/* Desktop: Top row with grouped cards (hidden on mobile) */}
      <div className={`grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${isMobile ? 'hidden' : ''}`}>
        {/* Revenue & Profitability Card */}
        <GroupedMetricCard
          title="Revenue & Profitability"
          icon={<DollarSign size={18} />}
          heroMetric={{
            label: "Total Sales",
            value: formatCurrency(totalSales),
            sublabel: "Includes shipping & taxes",
            formula: "Gross Sales + Shipping + Taxes",
          }}
          metrics={[
            {
              label: "Net Sales",
              value: formatCurrency(netSales),
              formula: "Gross Sales − Discounts − Returns",
            },
            {
              label: "Contribution Margin",
              value: formatCurrency(contributionMargin),
              sublabel: `${contributionMarginPercent.toFixed(1)}% of Net Sales`,
              formula: "Net Sales − COGS − Shipping − Processing Fees − Ad Spend",
            },
            {
              label: "COGS",
              value: formatCurrency(cogs),
              formula: "Sum of (Unit Cost × Quantity Sold)\nfrom Shopify inventory",
            },
            {
              label: "Net Profit",
              value: formatCurrency(netProfit),
              highlight: true,
              formula: "Contribution Margin − Payroll − Software Costs",
            },
          ]}
          columns={2}
        />

        {/* Orders & Customers Card */}
        <GroupedMetricCard
          title="Orders & Customers"
          icon={<ShoppingCart size={18} />}
          heroMetric={{
            label: "Total Orders",
            value: totalOrders.toLocaleString(),
            sublabel: `${totalCustomers.toLocaleString()} unique customers`,
            formula: "Count of all paid orders\nin date range",
          }}
          metrics={[
            {
              label: "New Customer Orders",
              value: displayNewOrders.toLocaleString(),
              formula: "Orders from customers\nwith no prior purchases",
            },
            {
              label: "Returning Orders",
              value: displayReturningOrders.toLocaleString(),
              formula: "Orders from customers\nwith previous purchases",
            },
            {
              label: "New Revenue",
              value: formatCompact(newCustomerRevenue),
              formula: "Revenue from first-time\ncustomer orders",
            },
            {
              label: "Returning Revenue",
              value: formatCompact(returningCustomerRevenue),
              sublabel: `${returningRate.toFixed(1)}% return rate`,
              formula: "Revenue from repeat\ncustomer orders",
            },
          ]}
          columns={2}
        />

        {/* Marketing Efficiency Card */}
        <GroupedMetricCard
          title="Marketing Efficiency"
          icon={<Target size={18} />}
          heroMetric={{
            label: "MER",
            value: mer.toFixed(2),
            sublabel: "Marketing Efficiency Ratio",
            formula: "Net Sales ÷ Ad Spend",
          }}
          metrics={[
            {
              label: "Acquisition MER",
              value: acquisitionMer.toFixed(2),
              formula: "New Customer Revenue ÷ Ad Spend",
            },
            {
              label: "NC ROAS",
              value: ncRoas.toFixed(2),
              formula: "New Customer Revenue ÷ Ad Spend\n(same as Acquisition MER)",
            },
            {
              label: "ROAS",
              value: roas.toFixed(2),
              formula: "Net Sales ÷ Ad Spend\n(Return on Ad Spend)",
            },
            {
              label: "AOV",
              value: formatCurrency(aov),
              formula: "Net Sales ÷ Total Orders\n(Average Order Value)",
            },
            {
              label: "CAC",
              value: formatCurrency(cac),
              formula: "Ad Spend ÷ New Customers\n(Customer Acquisition Cost)",
            },
            {
              label: "Return Rate",
              value: `${returningRate.toFixed(1)}%`,
              formula: "Returning Customers ÷ Total Customers × 100",
            },
          ]}
          columns={3}
        />
      </div>

      {/* Cost Breakdown Row - Hidden on mobile, replaced by horizontal scroll cards above */}
      <div className={`grid gap-2 xs:gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 ${isMobile ? 'hidden' : ''}`}>
        <FormulaTooltip formula="Total spend from Meta Ads Manager">
          <Card className="bg-muted/20 cursor-help transition-colors hover:bg-muted/30">
            <CardContent className="p-3 md:pt-5 md:pb-4 md:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-blue-600 dark:text-blue-400">Meta Ads</p>
                  <p className="text-lg md:text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCompact(adSpend)}</p>
                  <p className="text-[10px] md:text-xs text-blue-500 dark:text-blue-400">{adSpendPercent.toFixed(1)}% of sales</p>
                </div>
                <div className="rounded-full bg-blue-200/50 p-2 md:p-3 dark:bg-blue-800/30">
                  <Megaphone className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </FormulaTooltip>

        <FormulaTooltip formula="Sum of (Unit Cost × Quantity Sold) from Shopify inventory">
          <Card className="bg-muted/20 cursor-help transition-colors hover:bg-muted/30">
            <CardContent className="p-3 md:pt-5 md:pb-4 md:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-rose-600 dark:text-rose-400">COGS</p>
                  <p className="text-lg md:text-2xl font-bold text-rose-700 dark:text-rose-300">{formatCompact(cogs)}</p>
                  <p className="text-[10px] md:text-xs text-rose-500 dark:text-rose-400">{cogsPercent.toFixed(1)}% of sales</p>
                </div>
                <div className="rounded-full bg-rose-200/50 p-2 md:p-3 dark:bg-rose-800/30">
                  <Package className="h-4 w-4 md:h-5 md:w-5 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </FormulaTooltip>

        <FormulaTooltip formula="Sum of shipping costs from all orders">
          <Card className="bg-muted/20 cursor-help transition-colors hover:bg-muted/30">
            <CardContent className="p-3 md:pt-5 md:pb-4 md:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-sky-600 dark:text-sky-400">Shipping</p>
                  <p className="text-lg md:text-2xl font-bold text-sky-700 dark:text-sky-300">{formatCompact(shipping)}</p>
                  <p className="text-[10px] md:text-xs text-sky-500 dark:text-sky-400">{shippingPercent.toFixed(1)}% of sales</p>
                </div>
                <div className="rounded-full bg-sky-200/50 p-2 md:p-3 dark:bg-sky-800/30">
                  <Truck className="h-4 w-4 md:h-5 md:w-5 text-sky-600 dark:text-sky-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </FormulaTooltip>

        <FormulaTooltip formula="Total refunded amounts from Shopify orders">
          <Card className="bg-muted/20 cursor-help transition-colors hover:bg-muted/30">
            <CardContent className="p-3 md:pt-5 md:pb-4 md:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-amber-600 dark:text-amber-400">Returns</p>
                  <p className="text-lg md:text-2xl font-bold text-amber-700 dark:text-amber-300">{formatCompact(returns)}</p>
                  <p className="text-[10px] md:text-xs text-amber-500 dark:text-amber-400">{returnsPercent.toFixed(1)}% of sales</p>
                </div>
                <div className="rounded-full bg-amber-200/50 p-2 md:p-3 dark:bg-amber-800/30">
                  <RotateCcw className="h-4 w-4 md:h-5 md:w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </FormulaTooltip>

        <FormulaTooltip formula="Contribution Margin − Payroll − Software Costs">
          <Card className="bg-muted/20 cursor-help transition-colors hover:bg-muted/30">
            <CardContent className="p-3 md:pt-5 md:pb-4 md:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-emerald-600 dark:text-emerald-400">Net Profit</p>
                  <p className="text-lg md:text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCompact(netProfit)}</p>
                  <p className="text-[10px] md:text-xs text-emerald-500 dark:text-emerald-400">{netProfitPercent.toFixed(1)}% margin</p>
                </div>
                <div className="rounded-full bg-emerald-200/50 p-2 md:p-3 dark:bg-emerald-800/30">
                  <Wallet className="h-4 w-4 md:h-5 md:w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </FormulaTooltip>

        <FormulaTooltip formula="Returning Customers ÷ Total Customers × 100">
          <Card className="bg-muted/20 cursor-help transition-colors hover:bg-muted/30">
            <CardContent className="p-3 md:pt-5 md:pb-4 md:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-purple-600 dark:text-purple-400">Return Rate</p>
                  <p className="text-lg md:text-2xl font-bold text-purple-700 dark:text-purple-300">{returningRate.toFixed(1)}%</p>
                  <p className="text-[10px] md:text-xs text-purple-500 dark:text-purple-400">Returning customers</p>
                </div>
                <div className="rounded-full bg-purple-200/50 p-2 md:p-3 dark:bg-purple-800/30">
                  <Users className="h-4 w-4 md:h-5 md:w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </FormulaTooltip>
      </div>

      {/* Net Sales Breakdown Chart - Hidden on mobile */}
      <Card className={isMobile ? 'hidden' : ''}>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              Net Sales Breakdown
            </CardTitle>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {BREAKDOWN_TIME_RANGES.map((range) => (
                <Button
                  key={range.value}
                  variant={breakdownRange === range.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-xs shrink-0"
                  onClick={() => setBreakdownRange(range.value)}
                  disabled={breakdownLoading}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {breakdownLoading ? (
            <div className="h-[280px] flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center md:h-[280px]">
              <div className="w-full md:w-1/3 h-[180px] md:h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "COGS", value: breakdownMetrics?.cogs || 0, color: "#ff5252" },
                        { name: "Ad Spend", value: breakdownMetrics?.adSpend || 0, color: "#ff6b35" },
                        { name: "Payroll", value: breakdownMetrics?.payroll || 0, color: "#d4af37" },
                        { name: "Shipping", value: breakdownMetrics?.shipping || 0, color: "#8e8e93" },
                        { name: "Returns", value: breakdownMetrics?.returns || 0, color: "#ff8a65" },
                        { name: "Net Profit", value: Math.max(breakdownMetrics?.netProfit || 0, 0), color: "#00c853" },
                      ].filter(item => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {[
                        { name: "COGS", value: breakdownMetrics?.cogs || 0, color: "#ff5252" },
                        { name: "Ad Spend", value: breakdownMetrics?.adSpend || 0, color: "#ff6b35" },
                        { name: "Payroll", value: breakdownMetrics?.payroll || 0, color: "#d4af37" },
                        { name: "Shipping", value: breakdownMetrics?.shipping || 0, color: "#8e8e93" },
                        { name: "Returns", value: breakdownMetrics?.returns || 0, color: "#ff8a65" },
                        { name: "Net Profit", value: Math.max(breakdownMetrics?.netProfit || 0, 0), color: "#00c853" },
                      ].filter(item => item.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number | undefined) => [formatCurrency(value ?? 0), ""]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-2/3 grid grid-cols-2 gap-x-4 md:gap-x-8 gap-y-2 md:gap-y-3 text-xs md:text-sm pl-0 md:pl-4 pt-4 md:pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-rh-negative" />
                    <span>COGS</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{formatCurrency(breakdownMetrics?.cogs || 0)}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {(breakdownMetrics?.netSales || 0) > 0 ? (((breakdownMetrics?.cogs || 0) / (breakdownMetrics?.netSales || 1)) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-rh-accent" />
                    <span>Ad Spend</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{formatCurrency(breakdownMetrics?.adSpend || 0)}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {(breakdownMetrics?.netSales || 0) > 0 ? (((breakdownMetrics?.adSpend || 0) / (breakdownMetrics?.netSales || 1)) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-rh-accent-gold" />
                    <span>Payroll</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{formatCurrency(breakdownMetrics?.payroll || 0)}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {(breakdownMetrics?.netSales || 0) > 0 ? (((breakdownMetrics?.payroll || 0) / (breakdownMetrics?.netSales || 1)) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-rh-text-secondary" />
                    <span>Shipping</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{formatCurrency(breakdownMetrics?.shipping || 0)}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {(breakdownMetrics?.netSales || 0) > 0 ? (((breakdownMetrics?.shipping || 0) / (breakdownMetrics?.netSales || 1)) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#ff8a65" }} />
                    <span>Returns</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{formatCurrency(breakdownMetrics?.returns || 0)}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {(breakdownMetrics?.netSales || 0) > 0 ? (((breakdownMetrics?.returns || 0) / (breakdownMetrics?.netSales || 1)) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-rh-positive" />
                    <span className="font-medium">Net Profit</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rh-positive">{formatCurrency(breakdownMetrics?.netProfit || 0)}</span>
                    <span className="text-rh-positive ml-2 text-xs">
                      {(breakdownMetrics?.netSales || 0) > 0 ? (((breakdownMetrics?.netProfit || 0) / (breakdownMetrics?.netSales || 1)) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
                <div className="col-span-2 pt-2 border-t text-center">
                  <span className="text-muted-foreground text-xs">Net Sales: </span>
                  <span className="font-semibold">{formatCurrency(breakdownMetrics?.netSales || 0)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Table - Hidden on mobile for cleaner Robinhood-style experience */}
      <div className={isMobile ? 'hidden' : ''}>
        <KPITable refreshKey={refreshKey} />
      </div>

      {/* Mobile: Additional Cost Breakdown as List */}
      {isMobile && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold px-1">Cost Breakdown</h3>
          <div className="rounded-xl bg-rh-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Megaphone className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-sm">Meta Ads</span>
              </div>
              <span className="text-sm font-semibold">{formatCompact(adSpend)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <Package className="h-4 w-4 text-rose-400" />
                </div>
                <span className="text-sm">COGS</span>
              </div>
              <span className="text-sm font-semibold">{formatCompact(cogs)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center">
                  <Truck className="h-4 w-4 text-sky-400" />
                </div>
                <span className="text-sm">Shipping</span>
              </div>
              <span className="text-sm font-semibold">{formatCompact(shipping)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <RotateCcw className="h-4 w-4 text-amber-400" />
                </div>
                <span className="text-sm">Returns</span>
              </div>
              <span className="text-sm font-semibold">{formatCompact(returns)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-sm font-medium">Net Profit</span>
              </div>
              <span className="text-sm font-bold text-rh-positive">{formatCompact(netProfit)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
