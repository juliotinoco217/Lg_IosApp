import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Download,
  Loader2,
  CalendarDays,
  MoreHorizontal,
} from "lucide-react"
import { apiFetch } from "@/lib/api"

interface DailyKPIRow {
  date: string
  dateRaw: string
  totalSales: number
  netSales: number
  grossSales: number
  orders: number
  customers: number
  cogs: number
  adSpend: number
  shipping: number
  returns: number
  contributionMargin: number
  contributionMarginPercent: number
  aov: number
  mer: number
  roas: number
  ncRoas: number
  cac: number
  returningCustomerRate: number
  cogsPercent: number
  adSpendPercent: number
  shippingPercent: number
  returnsPercent: number
}

interface KPITableProps {
  refreshKey: number
}

export function KPITable({ refreshKey }: KPITableProps) {
  const [dailyKPIs, setDailyKPIs] = useState<DailyKPIRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 25

  const fetchDailyKPIs = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (pageNum === 1) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      // Fetch all available data with pagination
      const params = new URLSearchParams({
        range: "all",
        page: pageNum.toString(),
        pageSize: pageSize.toString(),
      })

      const res = await apiFetch(`/api/metrics/daily-kpis?${params}`)
      if (res.ok) {
        const data = await res.json()
        
        if (append) {
          setDailyKPIs(prev => [...prev, ...data.dailyKPIs])
        } else {
          setDailyKPIs(data.dailyKPIs || [])
        }
        
        setHasMore(data.hasMore || false)
        setPage(pageNum)
      }
    } catch (error) {
      console.error("Failed to fetch daily KPI data:", error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    setHasMore(true)
    fetchDailyKPIs(1, false)
  }, [fetchDailyKPIs, refreshKey])

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      fetchDailyKPIs(page + 1, true)
    }
  }

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

  const formatRatio = (value: number) => {
    return value.toFixed(2)
  }

  const exportToCSV = () => {
    const headers = [
      "Date", "Total Sales", "Net Sales", "Gross Sales", "Orders", "Customers", 
      "COGS", "Ad Spend", "Shipping", "Returns", "Contribution Margin", "CM %",
      "AOV", "MER", "ROAS", "NC ROAS", "CAC", "Return Rate %",
      "COGS %", "Ad Spend %", "Shipping %", "Returns %"
    ]
    
    const rows = dailyKPIs.map((day) => [
      day.date,
      day.totalSales.toString(),
      day.netSales.toString(),
      day.grossSales.toString(),
      day.orders.toString(),
      day.customers.toString(),
      day.cogs.toString(),
      day.adSpend.toString(),
      day.shipping.toString(),
      day.returns.toString(),
      day.contributionMargin.toString(),
      day.contributionMarginPercent.toFixed(1),
      day.aov.toString(),
      day.mer.toFixed(2),
      day.roas.toFixed(2),
      day.ncRoas.toFixed(2),
      day.cac.toString(),
      day.returningCustomerRate.toFixed(1),
      day.cogsPercent.toFixed(1),
      day.adSpendPercent.toFixed(1),
      day.shippingPercent.toFixed(1),
      day.returnsPercent.toFixed(1),
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `daily-kpis-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Daily KPIs
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-4 border-b border-border/60 bg-background/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-5 w-5" />
            Daily KPIs
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {dailyKPIs.length} days
            </span>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={exportToCSV} className="h-8 gap-1">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border/60">
          <Table className="min-w-[900px] text-xs md:text-sm">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold w-[100px]">Date</TableHead>
                <TableHead className="text-right font-semibold">Total Sales</TableHead>
                <TableHead className="text-right font-semibold">Net Sales</TableHead>
                <TableHead className="text-right font-semibold">Orders</TableHead>
                <TableHead className="text-right font-semibold">AOV</TableHead>
                <TableHead className="text-right font-semibold">COGS</TableHead>
                <TableHead className="text-right font-semibold">Ad Spend</TableHead>
                <TableHead className="text-right font-semibold">CM</TableHead>
                <TableHead className="text-right font-semibold">CM %</TableHead>
                <TableHead className="text-right font-semibold">MER</TableHead>
                <TableHead className="text-right font-semibold">ROAS</TableHead>
                <TableHead className="text-right font-semibold">NC ROAS</TableHead>
                <TableHead className="text-right font-semibold">CAC</TableHead>
                <TableHead className="text-right font-semibold">Return %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyKPIs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="h-32 text-center text-muted-foreground">
                    No daily data available for the selected date range
                  </TableCell>
                </TableRow>
              ) : (
                dailyKPIs.map((day) => (
                  <TableRow key={day.dateRaw} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{day.date}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(day.totalSales)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(day.netSales)}</TableCell>
                    <TableCell className="text-right tabular-nums">{day.orders}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(day.aov)}</TableCell>
                    <TableCell className="text-right tabular-nums text-rose-600">{formatCurrency(day.cogs)}</TableCell>
                    <TableCell className="text-right tabular-nums text-blue-600">{formatCurrency(day.adSpend)}</TableCell>
                    <TableCell className={`text-right tabular-nums font-medium ${day.contributionMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(day.contributionMargin)}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${day.contributionMarginPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatPercent(day.contributionMarginPercent)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatRatio(day.mer)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRatio(day.roas)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRatio(day.ncRoas)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(day.cac)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPercent(day.returningCustomerRate)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={loadingMore}
              className="gap-2"
            >
              {loadingMore ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
              {loadingMore ? "Loading..." : "Load More Days"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}