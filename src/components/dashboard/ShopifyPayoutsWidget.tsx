import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Store,
  Loader2,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Banknote,
  Calendar,
  TrendingUp,
} from "lucide-react"
import type { DateRangeValue } from "@/components/layout/Header"
import { apiFetch } from "@/lib/api"
import { formatDateForDisplay } from "@/lib/date-utils"

interface Payout {
  id: number
  date: string
  currency: string
  amount: string
  status: "scheduled" | "in_transit" | "paid" | "failed" | "canceled"
}

interface PayoutTransaction {
  id: number
  type: string
  payout_id: number | null
  payout_status: string | null
  currency: string
  amount: string
  fee: string
  net: string
  source_type: string | null
  processed_at: string
}

interface PayoutSummary {
  pendingBalance: number
  scheduledPayouts: Payout[]
  inTransitPayouts: Payout[]
  recentPayouts: Payout[]
  pendingTransactions: PayoutTransaction[]
  totalScheduled: number
  totalInTransit: number
  nextPayoutDate: string | null
  nextPayoutAmount: number | null
}

interface ApiError {
  error: string
  code?: string
  message?: string
  setupUrl?: string
}

interface ShopifyPayoutsWidgetProps {
  dateRange: DateRangeValue
  refreshKey: number
}

export function ShopifyPayoutsWidget({ refreshKey }: ShopifyPayoutsWidgetProps) {
  const [data, setData] = useState<PayoutSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    const fetchPayouts = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await apiFetch(`/api/shopify/payouts`)

        if (response.ok) {
          const payoutData = await response.json()
          setData(payoutData)
        } else {
          const errData: ApiError = await response.json()
          setError(errData)
        }
      } catch (err) {
        console.error("Failed to fetch Shopify payouts:", err)
        setError({ error: "Failed to connect to Shopify" })
      } finally {
        setLoading(false)
      }
    }

    fetchPayouts()
  }, [refreshKey])

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }


  const formatShortDate = (dateStr: string) => {
    return formatDateForDisplay(dateStr)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Clock className="h-4 w-4 text-amber-500" />
      case "in_transit":
        return <ArrowRight className="h-4 w-4 text-blue-500" />
      case "paid":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "failed":
      case "canceled":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "scheduled":
        return "Scheduled"
      case "in_transit":
        return "In Transit"
      case "paid":
        return "Deposited"
      case "failed":
        return "Failed"
      case "canceled":
        return "Canceled"
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      case "in_transit":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      case "paid":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "failed":
      case "canceled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store size={18} className="text-green-600" />
            Shopify Payouts
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

  if (error) {
    // Check if this is a scope/permission error
    const isScopeError = error.code === "SCOPE_REQUIRED"

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store size={18} className="text-green-600" />
            Shopify Payouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isScopeError ? (
            <div className="flex flex-col items-center justify-center gap-4 py-6">
              <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/30">
                <Banknote size={24} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium text-foreground">API Permission Required</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  To view Shopify Payments data, add the <code className="px-1 py-0.5 bg-muted rounded text-xs">read_shopify_payments_payouts</code> scope to your Shopify app.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 w-full max-w-md">
                <p className="text-xs font-medium mb-2">How to fix:</p>
                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>Go to your Shopify Partners Dashboard</li>
                  <li>Select your app {">"} Configuration {">"} API Access</li>
                  <li>Add scope: <code className="px-1 bg-background rounded">read_shopify_payments_payouts</code></li>
                  <li>Save and reinstall the app to your store</li>
                </ol>
              </div>
              {error.setupUrl && (
                <a
                  href={error.setupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  Open Shopify Partners Dashboard
                </a>
              )}
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
              <XCircle size={32} className="text-red-400" />
              <p>{error.error || error.message || "Failed to fetch payouts"}</p>
              <p className="text-sm">Check your Shopify Payments configuration</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store size={18} className="text-green-600" />
            Shopify Payouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Banknote size={32} />
            <p>No payout data available</p>
            <p className="text-sm">Payouts will appear here once processed</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasUpcomingPayouts = data.scheduledPayouts.length > 0 || data.inTransitPayouts.length > 0
  const upcomingPayouts = [...data.scheduledPayouts, ...data.inTransitPayouts]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Calculate total incoming (all money you'll receive)
  const totalIncoming = data.pendingBalance + data.totalScheduled + data.totalInTransit

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Store size={18} className="text-green-600" />
            Shopify Payouts
          </span>
          <span className="text-lg font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalIncoming)} incoming
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Pending Balance */}
          <div className="rounded-lg border bg-gradient-to-br from-green-50 to-green-100/50 p-4 dark:from-green-950/20 dark:to-green-900/10">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Banknote size={14} />
              Pending Balance
            </div>
            <p className="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">
              {formatCurrency(data.pendingBalance)}
            </p>
            <p className="text-xs text-green-600/70 dark:text-green-400/70">Available for payout</p>
          </div>

          {/* Scheduled */}
          <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 dark:from-amber-950/20 dark:to-amber-900/10">
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Clock size={14} />
              Scheduled
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">
              {formatCurrency(data.totalScheduled)}
            </p>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
              {data.scheduledPayouts.length} payout{data.scheduledPayouts.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* In Transit */}
          <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 dark:from-blue-950/20 dark:to-blue-900/10">
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <ArrowRight size={14} />
              In Transit
            </div>
            <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(data.totalInTransit)}
            </p>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
              {data.inTransitPayouts.length} payout{data.inTransitPayouts.length !== 1 ? "s" : ""} processing
            </p>
          </div>

          {/* Next Payout */}
          <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 dark:from-purple-950/20 dark:to-purple-900/10">
            <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
              <Calendar size={14} />
              Next Payout
            </div>
            {data.nextPayoutDate ? (
              <>
                <p className="mt-1 text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {formatShortDate(data.nextPayoutDate)}
                </p>
                <p className="text-xs text-purple-600/70 dark:text-purple-400/70">
                  {formatCurrency(data.nextPayoutAmount || 0)}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-2xl font-bold text-purple-700 dark:text-purple-300">—</p>
                <p className="text-xs text-purple-600/70 dark:text-purple-400/70">No payouts scheduled</p>
              </>
            )}
          </div>
        </div>

        {/* Upcoming Payouts */}
        {hasUpcomingPayouts && (
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp size={14} />
              Upcoming Payouts
            </h4>
            <div className="space-y-2">
              {upcomingPayouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(payout.status)}
                    <div>
                      <p className="font-medium">{formatDateForDisplay(payout.date)}</p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                          payout.status
                        )}`}
                      >
                        {getStatusLabel(payout.status)}
                      </span>
                    </div>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(payout.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Payouts */}
        {data.recentPayouts.length > 0 && (
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 size={14} />
              Recent Deposits
            </h4>
            <div className="space-y-2">
              {data.recentPayouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium">{formatDateForDisplay(payout.date)}</p>
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Deposited
                      </span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(payout.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Transactions - Money Coming */}
        {data.pendingTransactions.length > 0 && (
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock size={14} />
              Pending Sales
              <span className="ml-auto text-green-600 dark:text-green-400 font-semibold">
                {formatCurrency(data.pendingBalance)} incoming
              </span>
            </h4>
            <div className="space-y-2">
              {data.pendingTransactions.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg border border-dashed border-green-300 bg-green-50/30 p-3 dark:border-green-800 dark:bg-green-950/20"
                >
                  <div className="flex items-center gap-3">
                    <Banknote className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium text-sm">
                        {tx.source_type === "charge" ? "Sale" : tx.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateForDisplay(tx.processed_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 dark:text-green-400">
                      +{formatCurrency(tx.net)}
                    </p>
                    {parseFloat(tx.fee) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Fee: {formatCurrency(tx.fee)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {data.pendingTransactions.length > 10 && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  + {data.pendingTransactions.length - 10} more pending transactions
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
