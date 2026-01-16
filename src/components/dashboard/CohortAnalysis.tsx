import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users, TrendingUp } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface CohortPeriod {
  period: number
  revenue: number
  orders: number
  customers: number
}

interface Cohort {
  name: string
  startDate: string
  customerCount: number
  periods: CohortPeriod[]
  totalRevenue: number
  averageLTV: number
}

interface CohortAnalysis {
  cohorts: Cohort[]
  periodLabels: string[]
  maxPeriods: number
}

interface CohortAnalysisProps {
  refreshKey?: number
}

export function CohortAnalysisComponent({ refreshKey }: CohortAnalysisProps) {
  const [data, setData] = useState<CohortAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"revenue" | "retention">("revenue")

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await apiFetch(`/api/metrics/cohort-analysis?months=6`)
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error("Failed to fetch cohort analysis:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [refreshKey])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(0)}%`
  }

  // Calculate color intensity based on value
  const getHeatmapColor = (value: number, maxValue: number, isRetention: boolean = false) => {
    if (value === 0) return "bg-muted/30"

    const intensity = Math.min(value / maxValue, 1)

    if (isRetention) {
      // Green scale for retention
      if (intensity > 0.7) return "bg-green-500 text-white"
      if (intensity > 0.5) return "bg-green-400 text-white"
      if (intensity > 0.3) return "bg-green-300 text-green-900"
      if (intensity > 0.1) return "bg-green-200 text-green-800"
      return "bg-green-100 text-green-700"
    }

    // Blue scale for revenue
    if (intensity > 0.7) return "bg-blue-500 text-white"
    if (intensity > 0.5) return "bg-blue-400 text-white"
    if (intensity > 0.3) return "bg-blue-300 text-blue-900"
    if (intensity > 0.1) return "bg-blue-200 text-blue-800"
    return "bg-blue-100 text-blue-700"
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.cohorts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users size={18} />
            LTV Cohort Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            Not enough data for cohort analysis
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate max values for heatmap coloring
  const allRevenues = data.cohorts.flatMap(c => c.periods.map(p => p.revenue))
  const maxRevenue = Math.max(...allRevenues, 1)

  // For retention, calculate as percentage of Month 0 customers
  const getRetentionRate = (cohort: Cohort, period: CohortPeriod) => {
    const month0 = cohort.periods.find(p => p.period === 0)
    if (!month0 || month0.customers === 0) return 0
    return (period.customers / month0.customers) * 100
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp size={18} />
            LTV Cohort Analysis
          </CardTitle>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setViewMode("revenue")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === "revenue"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setViewMode("retention")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === "retention"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Retention
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Cohort Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total Cohorts</p>
              <p className="text-2xl font-bold">{data.cohorts.length}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold">
                {data.cohorts.reduce((sum, c) => sum + c.customerCount, 0)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Avg LTV</p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  data.cohorts.reduce((sum, c) => sum + c.averageLTV, 0) / data.cohorts.length
                )}
              </p>
            </div>
          </div>

          {/* Cohort Heatmap */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Cohort</th>
                  <th className="whitespace-nowrap px-3 py-2 text-center font-medium">Customers</th>
                  {data.periodLabels.map((label, i) => (
                    <th key={i} className="whitespace-nowrap px-3 py-2 text-center font-medium">
                      {label}
                    </th>
                  ))}
                  <th className="whitespace-nowrap px-3 py-2 text-center font-medium">Avg LTV</th>
                </tr>
              </thead>
              <tbody>
                {data.cohorts.map((cohort, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="whitespace-nowrap px-3 py-2 font-medium">{cohort.name}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">
                      {cohort.customerCount}
                    </td>
                    {/* Fill in period data */}
                    {Array.from({ length: data.maxPeriods }).map((_, periodIdx) => {
                      const period = cohort.periods.find(p => p.period === periodIdx)

                      if (!period || periodIdx >= cohort.periods.length) {
                        return (
                          <td key={periodIdx} className="px-2 py-1">
                            <div className="flex h-10 items-center justify-center rounded bg-muted/20 text-xs text-muted-foreground">
                              -
                            </div>
                          </td>
                        )
                      }

                      if (viewMode === "revenue") {
                        const color = getHeatmapColor(period.revenue, maxRevenue)
                        return (
                          <td key={periodIdx} className="px-2 py-1">
                            <div
                              className={`flex h-10 items-center justify-center rounded text-xs font-medium ${color}`}
                              title={`${period.customers} customers, ${period.orders} orders`}
                            >
                              {formatCurrency(period.revenue)}
                            </div>
                          </td>
                        )
                      } else {
                        const retentionRate = getRetentionRate(cohort, period)
                        const color = getHeatmapColor(retentionRate, 100, true)
                        return (
                          <td key={periodIdx} className="px-2 py-1">
                            <div
                              className={`flex h-10 items-center justify-center rounded text-xs font-medium ${color}`}
                              title={`${period.customers} of ${cohort.customerCount} customers`}
                            >
                              {formatPercent(retentionRate)}
                            </div>
                          </td>
                        )
                      }
                    })}
                    <td className="px-3 py-2 text-center font-medium">
                      {formatCurrency(cohort.averageLTV)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
            <span>Low</span>
            <div className="flex gap-0.5">
              {viewMode === "revenue" ? (
                <>
                  <div className="h-3 w-6 rounded-sm bg-blue-100" />
                  <div className="h-3 w-6 rounded-sm bg-blue-200" />
                  <div className="h-3 w-6 rounded-sm bg-blue-300" />
                  <div className="h-3 w-6 rounded-sm bg-blue-400" />
                  <div className="h-3 w-6 rounded-sm bg-blue-500" />
                </>
              ) : (
                <>
                  <div className="h-3 w-6 rounded-sm bg-green-100" />
                  <div className="h-3 w-6 rounded-sm bg-green-200" />
                  <div className="h-3 w-6 rounded-sm bg-green-300" />
                  <div className="h-3 w-6 rounded-sm bg-green-400" />
                  <div className="h-3 w-6 rounded-sm bg-green-500" />
                </>
              )}
            </div>
            <span>High</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
