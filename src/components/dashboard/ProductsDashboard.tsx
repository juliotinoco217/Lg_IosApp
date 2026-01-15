import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DollarSign,
  Package,
  TrendingUp,
  Percent,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import type { DateRangeValue } from "@/components/layout/Header"
import { apiFetch } from "@/lib/api"

interface CategoryMetrics {
  category: string
  netSales: number
  cogs: number
  grossProfit: number
  marginPercent: number
  unitsSold: number
  orderCount: number
  aov: number
  percentOfTotal: number
}

interface CategoryMetricsResponse {
  categories: CategoryMetrics[]
  totals: {
    netSales: number
    cogs: number
    grossProfit: number
    marginPercent: number
  }
}

interface ProductsDashboardProps {
  dateRange: DateRangeValue
  refreshKey: number
}

type SortField = "category" | "netSales" | "cogs" | "grossProfit" | "marginPercent" | "unitsSold" | "orderCount" | "aov" | "percentOfTotal"
type SortDirection = "asc" | "desc"

export function ProductsDashboard({ dateRange, refreshKey }: ProductsDashboardProps) {
  const [data, setData] = useState<CategoryMetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>("netSales")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const encodedRange = encodeURIComponent(dateRange)
        const response = await apiFetch(
          `/api/metrics/product-categories?range=${encodedRange}`
        )

        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error("Failed to fetch product category metrics:", error)
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

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value)
  }

  const getMarginColor = (margin: number) => {
    if (margin >= 50) return "text-green-600"
    if (margin >= 30) return "text-yellow-600"
    return "text-red-600"
  }

  const getMarginBg = (margin: number) => {
    if (margin >= 50) return "bg-green-500/10"
    if (margin >= 30) return "bg-yellow-500/10"
    return "bg-red-500/10"
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="text-muted-foreground" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp size={14} className="text-primary" />
    ) : (
      <ArrowDown size={14} className="text-primary" />
    )
  }

  const sortedCategories = data?.categories
    ? [...data.categories].sort((a, b) => {
        const aVal = a[sortField]
        const bVal = b[sortField]
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal)
        }
        return sortDirection === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number)
      })
    : []

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3 md:pt-6 md:px-6">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-blue-500/10 p-1.5 md:p-2">
                <DollarSign size={14} className="text-blue-600 md:w-4 md:h-4" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Net Sales</p>
                <p className="text-lg md:text-2xl font-bold">
                  {formatCurrency(data?.totals.netSales || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:pt-6 md:px-6">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-orange-500/10 p-1.5 md:p-2">
                <Package size={14} className="text-orange-600 md:w-4 md:h-4" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">COGS</p>
                <p className="text-lg md:text-2xl font-bold">
                  {formatCurrency(data?.totals.cogs || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:pt-6 md:px-6">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-green-500/10 p-1.5 md:p-2">
                <TrendingUp size={14} className="text-green-600 md:w-4 md:h-4" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Gross Profit</p>
                <p className="text-lg md:text-2xl font-bold">
                  {formatCurrency(data?.totals.grossProfit || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:pt-6 md:px-6">
            <div className="flex items-center gap-2">
              <div className={`rounded-md p-2 ${getMarginBg(data?.totals.marginPercent || 0)}`}>
                <Percent size={16} className={getMarginColor(data?.totals.marginPercent || 0)} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overall Margin</p>
                <p className={`text-2xl font-bold ${getMarginColor(data?.totals.marginPercent || 0)}`}>
                  {formatPercent(data?.totals.marginPercent || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product Category Profitability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th
                    className="cursor-pointer px-4 py-3 text-left font-medium hover:bg-muted/50"
                    onClick={() => handleSort("category")}
                  >
                    <div className="flex items-center gap-1">
                      Category {getSortIcon("category")}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right font-medium hover:bg-muted/50"
                    onClick={() => handleSort("netSales")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Net Sales {getSortIcon("netSales")}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right font-medium hover:bg-muted/50"
                    onClick={() => handleSort("cogs")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      COGS {getSortIcon("cogs")}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right font-medium hover:bg-muted/50"
                    onClick={() => handleSort("grossProfit")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Gross Profit {getSortIcon("grossProfit")}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right font-medium hover:bg-muted/50"
                    onClick={() => handleSort("marginPercent")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Margin % {getSortIcon("marginPercent")}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right font-medium hover:bg-muted/50"
                    onClick={() => handleSort("unitsSold")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Units {getSortIcon("unitsSold")}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right font-medium hover:bg-muted/50"
                    onClick={() => handleSort("orderCount")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Orders {getSortIcon("orderCount")}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right font-medium hover:bg-muted/50"
                    onClick={() => handleSort("aov")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      AOV {getSortIcon("aov")}
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right font-medium hover:bg-muted/50"
                    onClick={() => handleSort("percentOfTotal")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      % of Total {getSortIcon("percentOfTotal")}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedCategories.map((cat) => (
                  <tr key={cat.category} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{cat.category}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(cat.netSales)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(cat.cogs)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(cat.grossProfit)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${getMarginColor(cat.marginPercent)}`}>
                      {formatPercent(cat.marginPercent)}
                    </td>
                    <td className="px-4 py-3 text-right">{formatNumber(cat.unitsSold)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(cat.orderCount)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(cat.aov)}</td>
                    <td className="px-4 py-3 text-right">{formatPercent(cat.percentOfTotal)}</td>
                  </tr>
                ))}
                {sortedCategories.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      No product data found for this date range
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
