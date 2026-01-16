import { useState, useEffect } from "react"
import { GroupedMetricCard } from "./GroupedMetricCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const encodedRange = encodeURIComponent(dateRange)
        // Charts always show 30 days of daily data, metrics use selected date range
        const [metricsRes, chartRes] = await Promise.all([
          apiFetch(`/api/metrics/overview?range=${encodedRange}`),
          apiFetch(`/api/metrics/revenue-chart?range=30d`),
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
  }, [dateRange, refreshKey])

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

      {/* Cost Breakdown Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/20 dark:to-rose-900/10">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-rose-600 dark:text-rose-400">COGS</p>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{formatCompact(cogs)}</p>
                <p className="text-xs text-rose-500 dark:text-rose-400">{cogsPercent.toFixed(1)}% of sales</p>
              </div>
              <div className="rounded-full bg-rose-200/50 p-3 dark:bg-rose-800/30">
                <Package className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-sky-50 to-sky-100/50 dark:from-sky-950/20 dark:to-sky-900/10">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-sky-600 dark:text-sky-400">Shipping</p>
                <p className="text-2xl font-bold text-sky-700 dark:text-sky-300">{formatCompact(shipping)}</p>
                <p className="text-xs text-sky-500 dark:text-sky-400">{shippingPercent.toFixed(1)}% of sales</p>
              </div>
              <div className="rounded-full bg-sky-200/50 p-3 dark:bg-sky-800/30">
                <Truck className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Returns</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{formatCompact(returns)}</p>
                <p className="text-xs text-amber-500 dark:text-amber-400">{returnsPercent.toFixed(1)}% of sales</p>
              </div>
              <div className="rounded-full bg-amber-200/50 p-3 dark:bg-amber-800/30">
                <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Net Profit</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCompact(netProfit)}</p>
                <p className="text-xs text-emerald-500 dark:text-emerald-400">{netProfitPercent.toFixed(1)}% margin</p>
              </div>
              <div className="rounded-full bg-emerald-200/50 p-3 dark:bg-emerald-800/30">
                <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Shopify Revenue
              </span>
              <span className="text-xs font-normal text-muted-foreground">Last 30 Days</span>
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
              <span className="text-xs font-normal text-muted-foreground">Last 30 Days</span>
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
