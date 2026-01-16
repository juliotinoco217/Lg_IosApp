import { useState, useEffect } from "react"
import { MetricCard } from "./MetricCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DollarSign,
  Tag,
  RotateCcw,
  Loader2,
  ArrowRight,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { DateRangeValue } from "@/components/layout/Header"
import { dateRangeOptions } from "@/components/layout/Header"
import { apiFetch } from "@/lib/api"

interface RevenueMetrics {
  grossSales: number
  netSales: number
  totalSales: number
  discounts: number
  returns: number
}

interface RevenueDataPoint {
  date: string
  revenue: number
  orders: number
}

interface RevenueDashboardProps {
  dateRange: DateRangeValue
  refreshKey: number
}

export function RevenueDashboard({ dateRange, refreshKey }: RevenueDashboardProps) {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  const dateLabel = dateRangeOptions.find((o) => o.value === dateRange)?.label || "Last 30 days"

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const encodedRange = encodeURIComponent(dateRange)
        const [revenueRes, chartRes] = await Promise.all([
          apiFetch(`/api/metrics/revenue?range=${encodedRange}`),
          apiFetch(`/api/metrics/revenue-chart?range=${encodedRange}`),
        ])

        if (revenueRes.ok) {
          const revenueData = await revenueRes.json()
          setMetrics(revenueData)
        }

        if (chartRes.ok) {
          const chartData = await chartRes.json()
          setRevenueData(chartData)
        }
      } catch (error) {
        console.error("Failed to fetch revenue metrics:", error)
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Shopify Sales Metrics - Direct from Shopify Analytics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Gross Sales"
          value={formatCurrency(metrics?.grossSales || 0)}
          changeLabel={dateLabel}
          icon={<DollarSign size={16} />}
        />
        <MetricCard
          title="Net Sales"
          value={formatCurrency(metrics?.netSales || 0)}
          changeLabel="Gross - Discounts - Returns"
          icon={<DollarSign size={16} />}
        />
        <MetricCard
          title="Total Sales"
          value={formatCurrency(metrics?.totalSales || 0)}
          changeLabel="Includes shipping & taxes"
          icon={<DollarSign size={16} />}
        />
      </div>

      {/* Deductions */}
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          title="Discounts"
          value={formatCurrency(metrics?.discounts || 0)}
          changeLabel={dateLabel}
          icon={<Tag size={16} />}
        />
        <MetricCard
          title="Returns"
          value={formatCurrency(metrics?.returns || 0)}
          changeLabel={dateLabel}
          icon={<RotateCcw size={16} />}
        />
      </div>

      {/* Revenue Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="flex-1 rounded-lg bg-green-500/10 p-4 text-center">
              <p className="text-sm text-muted-foreground">Gross Sales</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics?.grossSales || 0)}
              </p>
            </div>

            <ArrowRight className="text-muted-foreground" size={24} />

            <div className="flex-1 rounded-lg bg-red-500/10 p-4 text-center">
              <p className="text-sm text-muted-foreground">Deductions</p>
              <p className="text-2xl font-bold text-red-600">
                -{formatCurrency((metrics?.discounts || 0) + (metrics?.returns || 0))}
              </p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <p>Discounts: {formatCurrency(metrics?.discounts || 0)}</p>
                <p>Returns: {formatCurrency(metrics?.returns || 0)}</p>
              </div>
            </div>

            <ArrowRight className="text-muted-foreground" size={24} />

            <div className="flex-1 rounded-lg bg-blue-500/10 p-4 text-center">
              <p className="text-sm text-muted-foreground">Net Sales</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(metrics?.netSales || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Net Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(value) => [formatCurrency(value as number), "Net Sales"]} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
