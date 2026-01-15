import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  DollarSign,
  Calendar,
  Hash,
  Loader2,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import type { DateRangeValue } from "@/components/layout/Header"
import { apiFetch } from "@/lib/api"

interface PayrollTransaction {
  transaction_id: string
  account_id: string
  amount: number
  date: string
  name: string
  merchant_name: string | null
  category: string[]
  pending: boolean
}

interface PayrollSummary {
  totalPayroll: number
  averagePayroll: number
  lastPayrollDate: string | null
  payrollCount: number
}

interface PayrollData {
  summary: PayrollSummary
  transactions: PayrollTransaction[]
}

interface MonthlyData {
  month: string
  monthKey: string
  total: number
  count: number
}

interface MetaBilling {
  balance: number
  currency: string
  configured: boolean
}

interface PayrollWidgetProps {
  dateRange: DateRangeValue
  refreshKey: number
}

export function PayrollWidget({ dateRange, refreshKey }: PayrollWidgetProps) {
  const [data, setData] = useState<PayrollData | null>(null)
  const [metaBilling, setMetaBilling] = useState<MetaBilling | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTransactions, setShowTransactions] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")
  const [useCustomRange, setUseCustomRange] = useState(false)

  // Note: We always fetch all available payroll data and filter client-side
  // This ensures we have complete historical data for proper month selection
  void dateRange // Acknowledge prop is received but we use 'all' for fetching

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch payroll and Meta billing in parallel
        const [payrollRes, metaRes] = await Promise.all([
          apiFetch(`/api/finance/payroll?range=all`),
          apiFetch(`/api/meta/billing`),
        ])

        if (payrollRes.ok) {
          const payrollData = await payrollRes.json()
          setData(payrollData)
        }

        if (metaRes.ok) {
          const metaData = await metaRes.json()
          setMetaBilling(metaData)
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [refreshKey])

  // Get unique months from transactions for filtering
  const availableMonths = useMemo(() => {
    if (!data?.transactions) return []
    const months = new Set<string>()
    data.transactions.forEach((tx) => {
      const date = new Date(tx.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      months.add(monthKey)
    })
    return Array.from(months).sort().reverse()
  }, [data?.transactions])

  // Aggregate data by month for the chart
  const monthlyData = useMemo(() => {
    if (!data?.transactions) return []

    const monthMap = new Map<string, { total: number; count: number }>()

    data.transactions.forEach((tx) => {
      const date = new Date(tx.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { total: 0, count: 0 })
      }

      const entry = monthMap.get(monthKey)!
      entry.total += Math.abs(tx.amount)
      entry.count += 1
    })

    // Convert to array and sort chronologically
    return Array.from(monthMap.entries())
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split("-")
        const date = new Date(parseInt(year), parseInt(month) - 1, 1)
        return {
          month: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          monthKey,
          total: data.total,
          count: data.count,
        }
      })
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
  }, [data?.transactions])

  // Filter transactions by selected month or custom date range
  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return []

    let filtered = data.transactions

    // Apply custom date range filter (takes priority over month filter)
    if (useCustomRange && customStartDate && customEndDate) {
      // Parse dates properly - add time zone offset handling
      const startParts = customStartDate.split("-").map(Number)
      const endParts = customEndDate.split("-").map(Number)
      const start = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0)
      const end = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59)

      filtered = filtered.filter((tx) => {
        const txParts = tx.date.split("-").map(Number)
        const txDate = new Date(txParts[0], txParts[1] - 1, txParts[2], 12, 0, 0)
        return txDate >= start && txDate <= end
      })
    } else if (selectedMonth !== "all") {
      // Only apply month filter if custom range is not active
      filtered = filtered.filter((tx) => {
        const date = new Date(tx.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        return monthKey === selectedMonth
      })
    }

    return filtered
  }, [data?.transactions, selectedMonth, useCustomRange, customStartDate, customEndDate])

  // Calculate filtered summary
  const filteredSummary = useMemo(() => {
    const totalPayroll = filteredTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    const payrollCount = filteredTransactions.length
    const averagePayroll = payrollCount > 0 ? totalPayroll / payrollCount : 0
    const lastPayrollDate = filteredTransactions.length > 0 ? filteredTransactions[0].date : null

    return {
      totalPayroll,
      averagePayroll,
      lastPayrollDate,
      payrollCount,
    }
  }, [filteredTransactions])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatShortDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split("-")
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  const handleBarClick = (data: any) => {
    const monthData = data as MonthlyData
    if (selectedMonth === monthData.monthKey) {
      setSelectedMonth("all")
    } else {
      setSelectedMonth(monthData.monthKey)
    }
  }

  const handleClearFilters = () => {
    setSelectedMonth("all")
    setUseCustomRange(false)
    setCustomStartDate("")
    setCustomEndDate("")
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload as MonthlyData
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-semibold">{formatMonthLabel(data.monthKey)}</p>
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-medium text-purple-600">{formatCurrency(data.total)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Payroll runs: <span className="font-medium">{data.count}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Click to filter</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users size={18} className="text-purple-600" />
            Payroll (Gusto)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users size={18} className="text-purple-600" />
            Payroll (Gusto)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Users size={32} />
            <p>No Gusto payroll transactions found</p>
            <p className="text-sm">Payroll transactions will appear here when processed</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasActiveFilters = selectedMonth !== "all" || useCustomRange

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users size={18} className="text-purple-600" />
          Payroll (Gusto)
        </CardTitle>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Filter Dropdown */}
          <select
            value={useCustomRange ? "all" : selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value)
              if (e.target.value !== "all") {
                setUseCustomRange(false) // Disable custom range when selecting a month
              }
            }}
            className="h-8 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={useCustomRange}
          >
            <option value="all">All Months</option>
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {formatMonthLabel(month)}
              </option>
            ))}
          </select>

          {/* Custom Date Range Toggle */}
          <Button
            variant={useCustomRange ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => {
              const newValue = !useCustomRange
              setUseCustomRange(newValue)
              if (newValue) {
                setSelectedMonth("all") // Clear month filter when enabling custom range
              }
            }}
          >
            <Calendar size={14} className="mr-1" />
            Custom Range
          </Button>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8" onClick={handleClearFilters}>
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Custom Date Range Inputs */}
        {useCustomRange && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
          </div>
        )}

        {/* Monthly Payroll Chart */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-muted-foreground">Monthly Payroll</h4>
          <div className="h-[200px]">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted)/0.2)" }} />
                  <Bar
                    dataKey="total"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(data) => handleBarClick(data)}
                  >
                    {monthlyData.map((entry) => (
                      <Cell
                        key={entry.monthKey}
                        fill={
                          selectedMonth === entry.monthKey
                            ? "#7c3aed"
                            : selectedMonth === "all"
                            ? "#a78bfa"
                            : "#e9d5ff"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No payroll data available
              </div>
            )}
          </div>
          {selectedMonth !== "all" && (
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Showing data for <span className="font-medium text-purple-600">{formatMonthLabel(selectedMonth)}</span>
              {" • "}
              <button className="text-purple-600 hover:underline" onClick={() => setSelectedMonth("all")}>
                Show all
              </button>
            </p>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign size={14} />
              Total Payroll
            </div>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(filteredSummary.totalPayroll)}</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign size={14} />
              Avg per Run
            </div>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(filteredSummary.averagePayroll)}</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar size={14} />
              Last Payroll
            </div>
            <p className="mt-1 text-2xl font-bold">
              {filteredSummary.lastPayrollDate ? formatShortDate(filteredSummary.lastPayrollDate) : "N/A"}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hash size={14} />
              Payroll Runs
            </div>
            <p className="mt-1 text-2xl font-bold">{filteredSummary.payrollCount}</p>
          </div>
        </div>

        {/* Active Expenses */}
        {metaBilling && metaBilling.configured && metaBilling.balance > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">Active Expenses</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border p-3 bg-blue-50/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-100 p-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Meta Ads</p>
                    <p className="text-sm text-muted-foreground">Current billing balance</p>
                  </div>
                </div>
                <p className="font-bold text-blue-600">{formatCurrency(metaBilling.balance)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Show Transactions Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowTransactions(!showTransactions)}
        >
          {showTransactions ? (
            <>
              <ChevronUp size={16} className="mr-2" />
              Hide Transactions
            </>
          ) : (
            <>
              <ChevronDown size={16} className="mr-2" />
              Show All Transactions ({filteredTransactions.length})
            </>
          )}
        </Button>

        {/* Transaction History (Collapsible) */}
        {showTransactions && (
          <div>
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">
              {selectedMonth === "all"
                ? useCustomRange && customStartDate && customEndDate
                  ? `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`
                  : "All Payroll Runs"
                : formatMonthLabel(selectedMonth)}
            </h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <div
                    key={tx.transaction_id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-purple-100 p-2">
                        <ArrowUpRight className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">{tx.merchant_name || tx.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(tx.date)}
                          {tx.pending && " • Pending"}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-purple-600">
                      {formatCurrency(Math.abs(tx.amount))}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No transactions found for the selected period
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
