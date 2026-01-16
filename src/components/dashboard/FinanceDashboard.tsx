import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlaidLinkButton } from "@/components/PlaidLink"
import { PlaidReconnect } from "@/components/PlaidReconnect"
import { PayrollWidget } from "./PayrollWidget"
import { FormulaTooltip } from "@/components/ui/formula-tooltip"
import {
  Building2,
  PiggyBank,
  CreditCard,
  Loader2,
  Landmark,
  X,
  Clock,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Wallet,
  Users,
} from "lucide-react"
import type { DateRangeValue } from "@/components/layout/Header"
import { apiFetch } from "@/lib/api"

type FinanceTabType = "overview" | "payroll"

interface Account {
  account_id: string
  name: string
  official_name: string | null
  type: "depository" | "credit" | "loan" | "investment" | "other"
  subtype: string
  balances: {
    available: number | null
    current: number
    limit: number | null
    iso_currency_code: string
  }
  mask: string
}

interface Transaction {
  transaction_id: string
  account_id: string
  amount: number
  date: string
  name: string
  merchant_name: string | null
  category: string[]
  pending: boolean
  iso_currency_code: string
}

interface Payout {
  id: number
  date: string
  currency: string
  amount: string
  status: "scheduled" | "in_transit" | "paid" | "failed" | "canceled"
}

interface PayoutSummary {
  pendingBalance: number
  scheduledPayouts: Payout[]
  inTransitPayouts: Payout[]
  recentPayouts: Payout[]
  totalScheduled: number
  totalInTransit: number
}

interface PayrollSummary {
  totalPayroll: number
  averagePayroll: number
  lastPayrollDate: string | null
  payrollCount: number
}

interface FinanceDashboardProps {
  dateRange: DateRangeValue
  refreshKey: number
}

export function FinanceDashboard({ dateRange, refreshKey }: FinanceDashboardProps) {
  const [activeTab, setActiveTab] = useState<FinanceTabType>("overview")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [disabledAccounts, setDisabledAccounts] = useState<Account[]>([])
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([])
  const [payouts, setPayouts] = useState<PayoutSummary | null>(null)
  const [payroll, setPayroll] = useState<PayrollSummary | null>(null)
  const [shopifyBilling, setShopifyBilling] = useState<number>(0)
  const [metaBilling, setMetaBilling] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(true)
  const [unlinkingAccount, setUnlinkingAccount] = useState<string | null>(null)
  const [enablingAccount, setEnablingAccount] = useState<string | null>(null)
  const [showAccounts, setShowAccounts] = useState(false)
  const [showPending, setShowPending] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const encodedRange = encodeURIComponent(dateRange)
        const [statusRes, accountsRes, disabledRes, pendingRes, payoutsRes, payrollRes, shopifyBillingRes, metaBillingRes] = await Promise.all([
          apiFetch(`/api/finance/status`),
          apiFetch(`/api/finance/accounts`),
          apiFetch(`/api/finance/disabled-accounts`),
          apiFetch(`/api/finance/transactions?range=${encodedRange}&limit=50&pending=true`),
          apiFetch(`/api/shopify/payouts`),
          apiFetch(`/api/finance/payroll?range=90d`),
          apiFetch(`/api/shopify/billing`),
          apiFetch(`/api/meta/billing`),
        ])

        if (statusRes.ok) {
          const statusData = await statusRes.json()
          setConfigured(statusData.configured)
        }

        if (accountsRes.ok) {
          const accountsData = await accountsRes.json()
          setAccounts(accountsData.accounts || [])
        }

        if (disabledRes.ok) {
          const disabledData = await disabledRes.json()
          setDisabledAccounts(disabledData.accounts || [])
        }

        if (pendingRes.ok) {
          const pendingData = await pendingRes.json()
          setPendingTransactions(pendingData.transactions || [])
        }

        if (payoutsRes.ok) {
          const payoutsData = await payoutsRes.json()
          setPayouts(payoutsData)
        }

        if (payrollRes.ok) {
          const payrollData = await payrollRes.json()
          setPayroll(payrollData.summary || null)
        }

        if (shopifyBillingRes.ok) {
          const billingData = await shopifyBillingRes.json()
          setShopifyBilling(billingData.currentBalance || 0)
        }

        if (metaBillingRes.ok) {
          const metaData = await metaBillingRes.json()
          setMetaBilling(metaData.balance || 0)
        }
      } catch (error) {
        console.error("Failed to fetch finance data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange, refreshKey])

  // Format helpers
  const fmt = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const fmtDecimal = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const fmtDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const getAccountIcon = (type: string, subtype: string) => {
    if (type === "credit") return <CreditCard size={16} className="text-rh-negative" />
    if (subtype === "checking") return <Building2 size={16} className="text-rh-accent" />
    if (subtype === "savings") return <PiggyBank size={16} className="text-rh-positive" />
    return <Landmark size={16} className="text-muted-foreground" />
  }

  const handleUnlinkAccount = async (accountId: string) => {
    setUnlinkingAccount(accountId)
    try {
      const response = await apiFetch(`/api/finance/unlink-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      })
      if (response.ok) {
        const account = accounts.find((a) => a.account_id === accountId)
        if (account) {
          setAccounts((prev) => prev.filter((a) => a.account_id !== accountId))
          setDisabledAccounts((prev) => [...prev, account])
        }
      }
    } catch (error) {
      console.error("Failed to unlink account:", error)
    } finally {
      setUnlinkingAccount(null)
    }
  }

  const handleEnableAccount = async (accountId: string) => {
    setEnablingAccount(accountId)
    try {
      const response = await apiFetch(`/api/finance/enable-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      })
      if (response.ok) {
        const account = disabledAccounts.find((a) => a.account_id === accountId)
        if (account) {
          setDisabledAccounts((prev) => prev.filter((a) => a.account_id !== accountId))
          setAccounts((prev) => [...prev, account])
        }
      }
    } catch (error) {
      console.error("Failed to enable account:", error)
    } finally {
      setEnablingAccount(null)
    }
  }

  // ============================================
  // SPECIFIC ACCOUNT LOOKUPS
  // ============================================

  // Mercury Operations account (•••8705)
  const operationsAccount = accounts.find(a => a.mask === "8705")
  const operationsBalance = operationsAccount?.balances.current || 0

  // Mercury Payroll account (•••4804)
  const payrollAccount = accounts.find(a => a.mask === "4804")
  const payrollAccountBalance = payrollAccount?.balances.current || 0

  // Credit cards (sum all credit account balances)
  const creditBalance = accounts
    .filter(a => a.type === "credit")
    .reduce((sum, a) => sum + a.balances.current, 0)

  // Other accounts (savings, etc.)
  const savingsBalance = accounts
    .filter(a => a.subtype === "savings")
    .reduce((sum, a) => sum + a.balances.current, 0)

  // ============================================
  // PENDING TRANSACTIONS
  // ============================================

  const pendingCharges = pendingTransactions
    .filter(tx => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0)
  const pendingCredits = pendingTransactions
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  // ============================================
  // SHOPIFY MONEY INCOMING
  // ============================================

  const shopifyPendingBalance = payouts?.pendingBalance || 0
  const shopifyScheduled = payouts?.totalScheduled || 0
  const shopifyInTransit = payouts?.totalInTransit || 0
  const totalShopifyIncoming = shopifyPendingBalance + shopifyScheduled + shopifyInTransit

  // ============================================
  // OPERATING CASH CALCULATION
  // ============================================
  // Formula:
  // = Mercury Operations (•••8705)
  // + Shopify Incoming (pending + scheduled + in-transit)
  // + Pending Credits
  // - Pending Charges
  // - Credit Card Balance
  // - Shopify Billing (apps, shipping labels owed)
  // - Meta Ads (current billing balance)
  const operatingCash =
    operationsBalance +
    totalShopifyIncoming +
    pendingCredits -
    pendingCharges -
    creditBalance -
    shopifyBilling -
    metaBilling

  // ============================================
  // PAYROLL RUNWAY CALCULATION
  // ============================================

  // Average payroll per run (biweekly typically)
  const avgPayrollPerRun = payroll?.averagePayroll || 0
  // Assume biweekly payroll = every 2 weeks
  const weeklyPayrollCost = avgPayrollPerRun / 2

  // Payroll runway uses PAYROLL ACCOUNT balance (•••4804)
  const payrollRunwayWeeks = weeklyPayrollCost > 0
    ? Math.floor(payrollAccountBalance / weeklyPayrollCost)
    : 999

  // Next payroll estimate
  const nextPayrollEstimate = avgPayrollPerRun

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!configured) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-6">
        <div className="rounded-full bg-rh-accent/10 p-6">
          <Landmark className="h-12 w-12 text-rh-accent" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">Connect Your Bank Accounts</h2>
          <p className="mt-2 max-w-md text-muted-foreground">
            Link your bank accounts to track cash flow and payroll runway.
          </p>
        </div>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-base">Get Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Step 1: Add Plaid credentials to .env</p>
              <div className="rounded-lg bg-muted p-3 text-xs font-mono">
                PLAID_CLIENT_ID=your_client_id<br />
                PLAID_SECRET=your_secret<br />
                PLAID_ENV=sandbox
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Step 2: Connect your bank</p>
              <PlaidLinkButton buttonText="Connect Bank Account" className="w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <PlaidReconnect />
      
      {/* Tab Navigation */}
      <div className="flex gap-2">
        {[
          { id: "overview", label: "Overview", icon: <Wallet size={16} /> },
          { id: "payroll", label: "Payroll", icon: <Users size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as FinanceTabType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6 md:space-y-8">

      {/* Main Financial Position */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Operating Cash - Full Breakdown Always Visible */}
        <Card className="lg:row-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet size={18} className="text-rh-accent" />
              Operating Cash
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Cash available for operations after all obligations
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Starting Point */}
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Starting Balance
              </p>
              <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-rh-accent/10 border border-rh-accent/20">
                <div>
                  <span className="text-sm font-medium">Mercury Operations</span>
                  <span className="text-xs text-muted-foreground ml-1.5">•••8705</span>
                </div>
                <span className="font-bold tabular-nums text-rh-accent">{fmt(operationsBalance)}</span>
              </div>
            </div>

            {/* Money Coming In */}
            <div>
              <p className="text-[10px] font-medium text-rh-positive uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ArrowDownLeft size={10} />
                Money Coming In
              </p>
              <div className="space-y-1.5">
                {totalShopifyIncoming > 0 && (
                  <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-rh-positive/5 border border-rh-positive/10">
                    <div>
                      <span className="text-sm">Shopify Payouts</span>
                      <p className="text-[10px] text-muted-foreground">
                        {[
                          shopifyPendingBalance > 0 && `${fmt(shopifyPendingBalance)} pending`,
                          shopifyScheduled > 0 && `${fmt(shopifyScheduled)} scheduled`,
                          shopifyInTransit > 0 && `${fmt(shopifyInTransit)} in transit`,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums text-rh-positive">+{fmt(totalShopifyIncoming)}</span>
                  </div>
                )}
                {pendingCredits > 0 && (
                  <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-rh-positive/5 border border-rh-positive/10">
                    <div>
                      <span className="text-sm">Pending Deposits</span>
                      <p className="text-[10px] text-muted-foreground">Refunds, transfers incoming</p>
                    </div>
                    <span className="font-semibold tabular-nums text-rh-positive">+{fmt(pendingCredits)}</span>
                  </div>
                )}
                {totalShopifyIncoming === 0 && pendingCredits === 0 && (
                  <p className="text-sm text-muted-foreground py-2 px-3">No incoming funds</p>
                )}
              </div>
            </div>

            {/* Money Going Out */}
            <div>
              <p className="text-[10px] font-medium text-rh-negative uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ArrowUpRight size={10} />
                Obligations to Pay
              </p>
              <div className="space-y-1.5">
                {pendingCharges > 0 && (
                  <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-rh-negative/5 border border-rh-negative/10">
                    <div>
                      <span className="text-sm">Pending Charges</span>
                      <p className="text-[10px] text-muted-foreground">Processing transactions</p>
                    </div>
                    <span className="font-semibold tabular-nums text-rh-negative">−{fmt(pendingCharges)}</span>
                  </div>
                )}
                {creditBalance > 0 && (
                  <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-rh-negative/5 border border-rh-negative/10">
                    <div>
                      <span className="text-sm">Credit Cards</span>
                      <p className="text-[10px] text-muted-foreground">Outstanding balance owed</p>
                    </div>
                    <span className="font-semibold tabular-nums text-rh-negative">−{fmt(creditBalance)}</span>
                  </div>
                )}
                {shopifyBilling > 0 && (
                  <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-rh-negative/5 border border-rh-negative/10">
                    <div>
                      <span className="text-sm">Shopify Bill</span>
                      <p className="text-[10px] text-muted-foreground">Apps, shipping labels, fees</p>
                    </div>
                    <span className="font-semibold tabular-nums text-rh-negative">−{fmt(shopifyBilling)}</span>
                  </div>
                )}
                {metaBilling > 0 && (
                  <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-rh-negative/5 border border-rh-negative/10">
                    <div>
                      <span className="text-sm">Meta Ads</span>
                      <p className="text-[10px] text-muted-foreground">Current ad spend balance</p>
                    </div>
                    <span className="font-semibold tabular-nums text-rh-negative">−{fmt(metaBilling)}</span>
                  </div>
                )}
                {pendingCharges === 0 && creditBalance === 0 && shopifyBilling === 0 && metaBilling === 0 && (
                  <p className="text-sm text-muted-foreground py-2 px-3">No outstanding obligations</p>
                )}
              </div>
            </div>

            {/* Final Total */}
            <div className="pt-3 border-t-2 border-dashed">
              <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-muted/60">
                <div>
                  <span className="font-semibold">Operating Cash</span>
                  <p className="text-[10px] text-muted-foreground">After all settles</p>
                </div>
                <span className={`text-2xl font-bold tabular-nums ${operatingCash >= 0 ? "text-rh-positive" : "text-rh-negative"}`}>
                  {fmt(operatingCash)}
                </span>
              </div>
            </div>

            {/* Excluded Accounts Note */}
            {(payrollAccountBalance > 0 || savingsBalance > 0) && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Not Included (Reserved Funds)
                </p>
                <div className="space-y-1">
                  {payrollAccountBalance > 0 && (
                    <div className="flex justify-between items-center py-1.5 px-3 text-sm">
                      <span className="text-muted-foreground">Payroll Reserve <span className="text-xs">•••4804</span></span>
                      <span className="tabular-nums text-muted-foreground">{fmt(payrollAccountBalance)}</span>
                    </div>
                  )}
                  {savingsBalance > 0 && (
                    <div className="flex justify-between items-center py-1.5 px-3 text-sm">
                      <span className="text-muted-foreground">Savings Reserve</span>
                      <span className="tabular-nums text-muted-foreground">{fmt(savingsBalance)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payroll Runway */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users size={18} className="text-rh-accent-gold" />
              Payroll Runway
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormulaTooltip
              delay={400}
              formula={`Payroll Account (•••4804): ${fmt(payrollAccountBalance)}
÷ Weekly Payroll: ${fmt(weeklyPayrollCost)}
─────────────────
= ${payrollRunwayWeeks} weeks

Weekly = Avg Payroll (${fmt(avgPayrollPerRun)}) ÷ 2
(assumes biweekly pay)`}
            >
              <div className="flex items-baseline gap-2 cursor-help">
                <p className={`text-4xl font-bold ${
                  payrollRunwayWeeks < 4 ? "text-rh-negative" :
                  payrollRunwayWeeks < 8 ? "text-rh-accent-gold" :
                  "text-rh-positive"
                }`}>
                  {payrollRunwayWeeks > 52 ? "52+" : payrollRunwayWeeks}
                </p>
                <span className="text-xl text-muted-foreground">weeks</span>
              </div>
            </FormulaTooltip>
            <p className="text-sm text-muted-foreground mt-1">
              {fmt(payrollAccountBalance)} in payroll account (•••4804)
            </p>

            {payrollRunwayWeeks < 8 && (
              <div className="mt-3 p-2 rounded-lg bg-rh-accent-gold/10 border border-rh-accent-gold/30 flex items-start gap-2">
                <AlertTriangle size={16} className="text-rh-accent-gold mt-0.5 flex-shrink-0" />
                <p className="text-sm text-rh-accent-gold">
                  {payrollRunwayWeeks < 4
                    ? "Critical: Less than 1 month of payroll runway"
                    : "Warning: Less than 2 months of payroll runway"}
                </p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. Weekly Payroll</span>
                <span className="font-medium">{fmt(weeklyPayrollCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Payroll (Est.)</span>
                <span className="font-medium">{fmt(nextPayrollEstimate)}</span>
              </div>
              {payroll?.lastPayrollDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Payroll</span>
                  <span className="font-medium">{fmtDate(payroll.lastPayrollDate)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Balances */}
        <Card>
          <CardHeader className="pb-2">
            <button
              onClick={() => setShowAccounts(!showAccounts)}
              className="flex items-center justify-between w-full"
            >
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 size={18} />
                Bank Accounts
              </CardTitle>
              {showAccounts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </CardHeader>
          <CardContent>
            {/* Quick Summary */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Operations</p>
                <p className="text-lg font-bold">{fmt(operationsBalance)}</p>
                <p className="text-[10px] text-muted-foreground">•••8705</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payroll</p>
                <p className="text-lg font-bold">{fmt(payrollAccountBalance)}</p>
                <p className="text-[10px] text-muted-foreground">•••4804</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Credit Owed</p>
                <p className="text-lg font-bold text-rh-negative">{fmt(creditBalance)}</p>
              </div>
            </div>

            {/* Full Account List */}
            {showAccounts && (
              <div className="mt-4 pt-4 border-t space-y-2">
                {accounts.map((account) => {
                  const isOps = account.mask === "8705"
                  const isPayroll = account.mask === "4804"
                  const roleLabel = isOps ? "Operations" : isPayroll ? "Payroll" : null

                  return (
                    <div
                      key={account.account_id}
                      className="flex items-center justify-between py-1"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getAccountIcon(account.type, account.subtype)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {account.name}
                            {roleLabel && (
                              <span className="ml-1.5 text-xs font-normal text-rh-accent">
                                ({roleLabel})
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">••••{account.mask}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${account.type === "credit" ? "text-rh-negative" : ""}`}>
                          {fmtDecimal(account.balances.current)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                          onClick={() => handleUnlinkAccount(account.account_id)}
                          disabled={unlinkingAccount === account.account_id}
                        >
                          {unlinkingAccount === account.account_id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <X size={12} />
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}

                <PlaidLinkButton buttonText="+ Add Account" className="w-full h-8 text-xs mt-2" />

                {disabledAccounts.length > 0 && (
                  <div className="pt-2 border-t mt-2">
                    <p className="text-xs text-muted-foreground mb-2">
                      {disabledAccounts.length} hidden
                    </p>
                    {disabledAccounts.map((account) => (
                      <div
                        key={account.account_id}
                        className="flex items-center justify-between py-1 opacity-60"
                      >
                        <div className="flex items-center gap-2">
                          {getAccountIcon(account.type, account.subtype)}
                          <span className="text-sm truncate">{account.name}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => handleEnableAccount(account.account_id)}
                          disabled={enablingAccount === account.account_id}
                        >
                          {enablingAccount === account.account_id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <RotateCcw size={12} />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Transactions Summary */}
      {pendingTransactions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <button
              onClick={() => setShowPending(!showPending)}
              className="flex items-center justify-between w-full"
            >
              <CardTitle className="text-base flex items-center gap-2">
                <Clock size={18} className="text-rh-accent-gold" />
                Pending Transactions
                <span className="text-sm font-normal text-muted-foreground">
                  ({pendingTransactions.length})
                </span>
              </CardTitle>
              <div className="flex items-center gap-4 text-sm">
                {pendingCredits > 0 && (
                  <span className="text-rh-positive">+{fmt(pendingCredits)} in</span>
                )}
                {pendingCharges > 0 && (
                  <span className="text-rh-negative">-{fmt(pendingCharges)} out</span>
                )}
                {showPending ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>
          </CardHeader>
          {showPending && (
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {pendingTransactions.slice(0, 12).map((tx) => {
                  const isIncome = tx.amount < 0
                  return (
                    <div
                      key={tx.transaction_id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-rh-accent-gold/5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1 rounded-full ${isIncome ? "bg-rh-positive/10" : "bg-rh-negative/10"}`}>
                          {isIncome ? (
                            <ArrowDownLeft size={12} className="text-rh-positive" />
                          ) : (
                            <ArrowUpRight size={12} className="text-rh-negative" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{tx.merchant_name || tx.name}</p>
                          <p className="text-xs text-muted-foreground">{fmtDate(tx.date)}</p>
                        </div>
                      </div>
                      <span className={`font-medium text-sm ${isIncome ? "text-rh-positive" : "text-rh-negative"}`}>
                        {isIncome ? "+" : "-"}{fmtDecimal(Math.abs(tx.amount))}
                      </span>
                    </div>
                  )
                })}
              </div>
              {pendingTransactions.length > 12 && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  +{pendingTransactions.length - 12} more pending
                </p>
              )}
            </CardContent>
          )}
        </Card>
      )}

        </div>
      )}

      {/* Payroll Tab */}
      {activeTab === "payroll" && (
        <PayrollWidget dateRange={dateRange} refreshKey={refreshKey} />
      )}
    </div>
  )
}
