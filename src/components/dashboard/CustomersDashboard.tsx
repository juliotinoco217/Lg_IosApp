import { useState, useEffect } from "react"
import { MetricCard } from "./MetricCard"
import { CohortAnalysisComponent } from "./CohortAnalysis"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  UserPlus,
  UserCheck,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Package,
  Loader2,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { DateRangeValue } from "@/components/layout/Header"
import { dateRangeOptions } from "@/components/layout/Header"
import { apiFetch } from "@/lib/api"

interface CustomerMetrics {
  totalCustomers: number
  newCustomers: number
  returningCustomers: number
  returningCustomerRate: number
  totalOrders: number
  averageOrderValue: number
}

interface TopProduct {
  title: string
  grossSales: number
  orders: number
}

interface CustomersDashboardProps {
  dateRange: DateRangeValue
  refreshKey: number
}

export function CustomersDashboard({ dateRange, refreshKey }: CustomersDashboardProps) {
  const [metrics, setMetrics] = useState<CustomerMetrics | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)

  const dateLabel = dateRangeOptions.find((o) => o.value === dateRange)?.label || "Last 30 days"

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const encodedRange = encodeURIComponent(dateRange)
        const [customersRes, productsRes] = await Promise.all([
          apiFetch(`/api/metrics/customers-detailed?range=${encodedRange}`),
          apiFetch(`/api/metrics/top-products?range=${encodedRange}&limit=5`),
        ])

        if (customersRes.ok) {
          const customersData = await customersRes.json()
          setMetrics(customersData)
        }

        if (productsRes.ok) {
          const productsData = await productsRes.json()
          setTopProducts(productsData)
        }
      } catch (error) {
        console.error("Failed to fetch customer metrics:", error)
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

  const formatCurrencyDetailed = (value: number) => {
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
      {/* Customer Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Customers"
          value={(metrics?.totalCustomers || 0).toString()}
          changeLabel={dateLabel}
          icon={<Users size={16} />}
        />
        <MetricCard
          title="New Customers"
          value={(metrics?.newCustomers || 0).toString()}
          changeLabel={dateLabel}
          icon={<UserPlus size={16} />}
        />
        <MetricCard
          title="Returning Customers"
          value={(metrics?.returningCustomers || 0).toString()}
          changeLabel={`${(metrics?.returningCustomerRate || 0).toFixed(1)}% of total`}
          icon={<UserCheck size={16} />}
        />
      </div>

      {/* Order Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Orders"
          value={(metrics?.totalOrders || 0).toString()}
          changeLabel={dateLabel}
          icon={<ShoppingCart size={16} />}
        />
        <MetricCard
          title="Average Order Value"
          value={formatCurrencyDetailed(metrics?.averageOrderValue || 0)}
          changeLabel={dateLabel}
          icon={<DollarSign size={16} />}
        />
        <MetricCard
          title="Returning Rate"
          value={`${(metrics?.returningCustomerRate || 0).toFixed(1)}%`}
          changeLabel="Of all customers"
          icon={<TrendingUp size={16} />}
        />
      </div>

      {/* Customer Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                    <UserPlus size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">New Customers</p>
                    <p className="text-sm text-muted-foreground">First-time buyers</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{metrics?.newCustomers || 0}</p>
                  <p className="text-sm text-muted-foreground">
                    {metrics && metrics.totalCustomers > 0
                      ? `${(((metrics.newCustomers) / metrics.totalCustomers) * 100).toFixed(1)}%`
                      : "0%"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                    <UserCheck size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Returning Customers</p>
                    <p className="text-sm text-muted-foreground">Repeat buyers</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{metrics?.returningCustomers || 0}</p>
                  <p className="text-sm text-muted-foreground">
                    {(metrics?.returningCustomerRate || 0).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="relative h-32 w-32">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-muted/20"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${metrics?.returningCustomerRate || 0} ${100 - (metrics?.returningCustomerRate || 0)}`}
                    className="text-blue-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">
                    {(metrics?.returningCustomerRate || 0).toFixed(0)}%
                  </span>
                  <span className="text-xs text-muted-foreground">Returning</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package size={18} />
            Best Selling Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <div className="space-y-4">
              {/* Bar Chart */}
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topProducts}
                    layout="vertical"
                    margin={{ left: 20, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tickFormatter={(v) => `$${v}`} className="text-xs" />
                    <YAxis
                      type="category"
                      dataKey="title"
                      width={150}
                      className="text-xs"
                      tickFormatter={(v) => v.length > 20 ? v.substring(0, 20) + "..." : v}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrencyDetailed(value as number), "Gross Sales"]}
                    />
                    <Bar dataKey="grossSales" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Product Table */}
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium">Product</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Orders</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Gross Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                              {index + 1}
                            </span>
                            {product.title}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">{product.orders}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          {formatCurrency(product.grossSales)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No product data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* LTV Cohort Analysis */}
      <CohortAnalysisComponent refreshKey={refreshKey} />
    </div>
  )
}
