import { useState, useEffect } from "react"
import { GroupedMetricCard } from "./GroupedMetricCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HorizontalScroll } from "@/components/ui/horizontal-scroll"
import {
  DollarSign,
  ShoppingCart,
  Target,
  Loader2,
  Package,
  Truck,
  RotateCcw,
  Wallet,
  ShoppingBag,
  Users,
  TrendingUp,
} from "lucide-react"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from "recharts"
import type { DateRangeValue } from "@/components/layout/Header"
import { apiFetch } from "@/lib/api"

type ChartTimeRange = "7d" | "30d" | "90d"

interface ShopifyMetrics {
  mer: number
  aov: number
  roas: number
  ncRoas: number
  cac: number
  grossSales: number
  netSales: number
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

interface RevenueDataPoint {
  date: string
  revenue: number
  orders: number
}

interface ShopifyDashboardProps {
  dateRange: DateRangeValue
  refreshKey: number
}

export function ShopifyDashboard({ dateRange, refreshKey }: ShopifyDashboardProps) {
  const [metrics, setMetrics] = useState<ShopifyMetrics | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [chartTimeRange, setChartTimeRange] = useState<ChartTimeRange>("30d")

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const encodedRange = encodeURIComponent(dateRange)
        const [metricsRes, chartRes] = await Promise.all([
          apiFetch(`/api/metrics/overview?range=${encodedRange}`),
          apiFetch(`/api/metrics/revenue-chart?range=${chartTimeRange}`),
        ])

        if (metricsRes.ok) {
          const metricsData = await metricsRes.json()
          setMetrics(metricsData)
        }

        if (chartRes.ok) {
          const chartData = await chartRes.json()
          setRevenueData(chartData)
        }
      } catch (error) {
        console.error("Failed to fetch Shopify metrics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange, refreshKey, chartTimeRange])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatCompact = (value: number) => {
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
  const contributionMargin = metrics?.contributionMargin || 0
  const contributionMarginPercent = metrics?.contributionMarginPercent || 0
  const cogs = metrics?.cogs || 0
  const shipping = metrics?.shipping || 0
  const returns = metrics?.returns || 0

  // Calculate net profit (Shopify-only, no payroll deduction)
  const netProfit = contributionMargin
  const netProfitPercent = grossSales > 0 ? (netProfit / grossSales) * 100 : 0

  // Calculate % of gross sales for cost breakdown
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
  const newCustomers = metrics?.newCustomers || 0
  const returningCustomers = metrics?.returningCustomers || 0
  
  // Fallback estimate if actual counts not available
  const revenueTotal = newCustomerRevenue + returningCustomerRevenue
  const newOrdersEstimate = revenueTotal > 0
    ? Math.round((newCustomerRevenue / revenueTotal) * totalOrders)
    : 0
  const returningOrdersEstimate = totalOrders - newOrdersEstimate
  
  // Use actual values if available, otherwise use estimates
  const displayNewOrders = newCustomerOrders > 0 ? newCustomerOrders : newOrdersEstimate
  const displayReturningOrders = returningCustomerOrders > 0 ? returningCustomerOrders : returningOrdersEstimate
  const displayNewCustomers = newCustomers > 0 ? newCustomers : newOrdersEstimate
  const displayReturningCustomers = returningCustomers > 0 ? returningCustomers : returningOrdersEstimate

  const aov = metrics?.aov || 0
  const cac = metrics?.cac || 0
  const adSpend = metrics?.adSpend || 0
  const mer = metrics?.mer || 0

  // Chart time range labels
  const chartRangeLabels: Record<ChartTimeRange, string> = {
    "7d": "7 Days",
    "30d": "30 Days",
    "90d": "90 Days",
  }

  return (
    <div className="space-y-6">
      {/* Platform Header */}
      <div className="flex items-center gap-3 pb-2">
        <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
          <ShoppingBag className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Shopify Store</h2>
          <p className="text-sm text-muted-foreground">Sales channel performance</p>
        </div>
      </div>

      {/* Top row: Three main grouped cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue & Profitability Card */}
        <GroupedMetricCard
          title="Revenue & Profitability"
          icon={<DollarSign size={18} />}
          heroMetric={{
            label: "Contribution Margin",
            value: formatCurrency(contributionMargin),
            sublabel: `${contributionMarginPercent.toFixed(1)}% of Net Sales`,
          }}
          metrics={[
            { label: "Gross Sales", value: formatCurrency(grossSales) },
            { label: "Net Sales", value: formatCurrency(netSales) },
            { label: "COGS", value: formatCurrency(cogs) },
            { label: "Net Profit", value: formatCurrency(netProfit), highlight: true },
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
          }}
          metrics={[
            { label: "New Customer Orders", value: displayNewOrders.toLocaleString() },
            { label: "Returning Orders", value: displayReturningOrders.toLocaleString() },
            { label: "New Revenue", value: formatCompact(newCustomerRevenue) },
            {
              label: "Returning Revenue",
              value: formatCompact(returningCustomerRevenue),
              sublabel: `${returningRate.toFixed(1)}% return rate`
            },
          ]}
          columns={2}
        />

        {/* Customer Metrics Card */}
        <GroupedMetricCard
          title="Customer Metrics"
          icon={<Target size={18} />}
          heroMetric={{
            label: "AOV",
            value: formatCurrency(aov),
            sublabel: "Average Order Value",
          }}
          metrics={[
            { label: "Total Customers", value: totalCustomers.toLocaleString() },
            { label: "New Customers", value: displayNewCustomers.toLocaleString() },
            { label: "Returning", value: displayReturningCustomers.toLocaleString() },
            { label: "Return Rate", value: `${returningRate.toFixed(1)}%` },
          ]}
          columns={2}
        />
      </div>

      {/* Metrics Slider */}
      <HorizontalScroll gap={10} padding={0}>
        {/* AOV */}
        <div className="flex-shrink-0 min-w-[100px] rounded-xl bg-violet-500/10 dark:bg-violet-500/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="h-3.5 w-3.5 text-violet-500" />
            <span className="text-[10px] font-medium text-violet-600 dark:text-violet-400">AOV</span>
          </div>
          <p className="text-base font-bold text-violet-700 dark:text-violet-300">{formatCurrency(aov)}</p>
        </div>

        {/* CAC */}
        <div className="flex-shrink-0 min-w-[100px] rounded-xl bg-orange-500/10 dark:bg-orange-500/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400">CAC</span>
          </div>
          <p className="text-base font-bold text-orange-700 dark:text-orange-300">{formatCurrency(cac)}</p>
        </div>

        {/* MER */}
        <div className="flex-shrink-0 min-w-[100px] rounded-xl bg-blue-500/10 dark:bg-blue-500/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">MER</span>
          </div>
          <p className="text-base font-bold text-blue-700 dark:text-blue-300">{mer.toFixed(2)}x</p>
        </div>

        {/* COGS */}
        <div className="flex-shrink-0 min-w-[100px] rounded-xl bg-rose-500/10 dark:bg-rose-500/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-3.5 w-3.5 text-rose-500" />
            <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">COGS</span>
          </div>
          <p className="text-base font-bold text-rose-700 dark:text-rose-300">{formatCompact(cogs)}</p>
          <p className="text-[10px] text-rose-500">{cogsPercent.toFixed(1)}%</p>
        </div>

        {/* Shipping */}
        <div className="flex-shrink-0 min-w-[100px] rounded-xl bg-sky-500/10 dark:bg-sky-500/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Truck className="h-3.5 w-3.5 text-sky-500" />
            <span className="text-[10px] font-medium text-sky-600 dark:text-sky-400">Shipping</span>
          </div>
          <p className="text-base font-bold text-sky-700 dark:text-sky-300">{formatCompact(shipping)}</p>
          <p className="text-[10px] text-sky-500">{shippingPercent.toFixed(1)}%</p>
        </div>

        {/* Returns */}
        <div className="flex-shrink-0 min-w-[100px] rounded-xl bg-amber-500/10 dark:bg-amber-500/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Returns</span>
          </div>
          <p className="text-base font-bold text-amber-700 dark:text-amber-300">{formatCompact(returns)}</p>
          <p className="text-[10px] text-amber-500">{returnsPercent.toFixed(1)}%</p>
        </div>

        {/* Net Profit */}
        <div className="flex-shrink-0 min-w-[100px] rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Net Profit</span>
          </div>
          <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">{formatCompact(netProfit)}</p>
          <p className="text-[10px] text-emerald-500">{netProfitPercent.toFixed(1)}%</p>
        </div>

        {/* Ad Spend */}
        <div className="flex-shrink-0 min-w-[100px] rounded-xl bg-pink-500/10 dark:bg-pink-500/20 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-3.5 w-3.5 text-pink-500" />
            <span className="text-[10px] font-medium text-pink-600 dark:text-pink-400">Ad Spend</span>
          </div>
          <p className="text-base font-bold text-pink-700 dark:text-pink-300">{formatCompact(adSpend)}</p>
        </div>
      </HorizontalScroll>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Shopify Revenue
              </span>
              <div className="flex items-center gap-1">
                {(["7d", "30d", "90d"] as ChartTimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setChartTimeRange(range)}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                      chartTimeRange === range
                        ? "bg-green-500 text-white"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {range.toUpperCase()}
                  </button>
                ))}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="shopifyRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    className="text-xs"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value) || 0), "Revenue"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#shopifyRevenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Orders per Day
              </span>
              <span className="text-xs font-normal text-muted-foreground">{chartRangeLabels[chartTimeRange]}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    className="text-xs"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [Number(value) || 0, "Orders"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="orders"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
