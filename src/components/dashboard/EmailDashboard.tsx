import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Mail,
  MousePointerClick,
  Eye,
  UserMinus,
  TrendingUp,
  AlertCircle,
  Loader2,
  Send,
  DollarSign,
} from "lucide-react"
import {
  LineChart,
  Line,
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
import { dateRangeOptions } from "@/components/layout/Header"
import { apiFetch } from "@/lib/api"

interface SubscriberCounts {
  emailSubscribers: number
  smsSubscribers: number
  totalContacts: number
}

interface CampaignMetric {
  campaignID: string
  name: string
  sent: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
  openRate: number
  clickRate: number
  bounceRate: number
  unsubscribeRate: number
  startedAt?: string
  finishedAt?: string
}

interface DashboardData {
  subscribers: SubscriberCounts & { newSignups?: number }
  campaigns: CampaignMetric[]
  totals: {
    sent: number
    opened: number
    clicked: number
    bounced: number
    unsubscribed: number
    avgOpenRate: number
    avgClickRate: number
  }
  subscriberGrowth?: Array<{ date: string; email: number; sms: number }>
}

interface RevenueData {
  totalRevenue: number
  orderCount: number
  averageOrderValue: number
  dailyBreakdown: Array<{ date: string; revenue: number; orders: number }>
  byCampaign: Array<{ campaign: string; revenue: number; orders: number }>
}

interface EmailDashboardProps {
  dateRange: DateRangeValue
  refreshKey: number
}

type ChartTimeRange = "7d" | "14d" | "30d" | "60d" | "90d" | "365d" | "2025"

const CHART_TIME_RANGES: { value: ChartTimeRange; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "14d", label: "14D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "365d", label: "1Y" },
  { value: "2025", label: "2025" },
]

function getDaysFromRange(range: DateRangeValue): number {
  const option = dateRangeOptions.find((o) => o.value === range)
  return option?.days || 30
}

export function EmailDashboard({ dateRange, refreshKey }: EmailDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartTimeRange, setChartTimeRange] = useState<ChartTimeRange>("30d")

  const days = getDaysFromRange(dateRange)
  const dateLabel = dateRangeOptions.find((o) => o.value === dateRange)?.label || "Last 30 days"

  // Fetch dashboard data (subscribers, campaigns)
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await apiFetch(`/api/omnisend/dashboard?days=${days}`)
        if (!response.ok) {
          throw new Error("Failed to fetch Omnisend data")
        }
        const dashboardData: DashboardData = await response.json()
        setData(dashboardData)
      } catch (err) {
        console.error("Failed to fetch email metrics:", err)
        setError("Unable to load Omnisend data. Please check your API key configuration.")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [days, refreshKey])

  // Fetch revenue data separately based on chart time range
  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        const response = await apiFetch(`/api/omnisend/revenue?range=${chartTimeRange}`)
        if (response.ok) {
          const revenue: RevenueData = await response.json()
          setRevenueData(revenue)
        }
      } catch (err) {
        console.error("Failed to fetch revenue data:", err)
      }
    }

    fetchRevenueData()
  }, [chartTimeRange, refreshKey])

  const formatNumber = (value: number) => {
    return value.toLocaleString()
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Omnisend Not Connected</h3>
              <p className="text-muted-foreground max-w-md">
                {error || "Add your OMNISEND_API_KEY to the backend .env file to see real email marketing data."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { subscribers, totals, campaigns } = data
  const newSignups = subscribers.newSignups || 0

  // Calculate rates
  const avgBounceRate = totals.sent > 0 ? (totals.bounced / totals.sent) * 100 : 0
  const avgUnsubscribeRate = totals.sent > 0 ? (totals.unsubscribed / totals.sent) * 100 : 0

  // Engagement trend from campaigns
  const engagementTrend = campaigns
    ?.slice(0, 8)
    .reverse()
    .map((campaign) => ({
      date: campaign.finishedAt
        ? new Date(campaign.finishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : campaign.name.slice(0, 8),
      openRate: campaign.openRate,
      clickRate: campaign.clickRate,
      sent: campaign.sent,
    })) || []

  // Subscriber growth data - use real data if available, otherwise generate mock
  const subscriberGrowthData = data.subscriberGrowth?.length
    ? data.subscriberGrowth.map(d => ({
        date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        subscribed: d.email,
        sms: d.sms,
      }))
    : [
        { date: "Dec 8", subscribed: 3310, sms: 46 },
        { date: "Dec 15", subscribed: 3450, sms: 46 },
        { date: "Dec 22", subscribed: 3580, sms: 46 },
        { date: "Dec 29", subscribed: 3710, sms: 46 },
        { date: "Jan 5", subscribed: 3839, sms: 46 },
      ]

  return (
    <div className="space-y-8">
      {/* Audience Growth Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Audience growth</h2>
            <p className="text-sm text-muted-foreground">{dateLabel}</p>
          </div>
        </div>

        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Subscriber Cards Column */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:space-y-4 lg:gap-0">
            {/* Email Subscribers */}
            <Card>
              <CardContent className="p-3 md:pt-5 md:pb-4 md:px-6">
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Email subscribers</p>
                <div className="flex items-center gap-2 md:gap-3">
                  <span className="text-xl md:text-3xl font-bold">{formatNumber(subscribers.emailSubscribers)}</span>
                  {newSignups > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-sm font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <TrendingUp className="h-3 w-3" />
                      +{formatNumber(newSignups)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatNumber(newSignups)} subscribed | {formatNumber(totals.unsubscribed)} unsubscribed
                </p>
              </CardContent>
            </Card>

            {/* SMS Subscribers */}
            <Card>
              <CardContent className="p-3 md:pt-5 md:pb-4 md:px-6">
                <p className="text-xs md:text-sm text-muted-foreground mb-1">SMS subscribers</p>
                <div className="flex items-center gap-2 md:gap-3">
                  <span className="text-xl md:text-3xl font-bold">{formatNumber(subscribers.smsSubscribers)}</span>
                  <span className="text-sm text-muted-foreground">0</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  0 subscribed | 0 unsubscribed
                </p>
              </CardContent>
            </Card>

            {/* Total Contacts */}
            <Card className="col-span-2 lg:col-span-1">
              <CardContent className="p-3 md:pt-5 md:pb-4 md:px-6">
                <p className="text-xs md:text-sm text-muted-foreground mb-1">Total contacts</p>
                <div className="flex items-center gap-2 md:gap-3">
                  <span className="text-xl md:text-3xl font-bold">{formatNumber(subscribers.totalContacts)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  All contacts in your audience
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Subscriber Growth Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-4">
                <button className="text-sm font-medium border-b-2 border-primary pb-1">Email</button>
                <button className="text-sm text-muted-foreground pb-1">SMS</button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-rh-positive" />
                  <span className="text-muted-foreground">Subscribed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-rh-positive/30" />
                  <span className="text-muted-foreground">Unsubscribed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-rh-accent-gold" />
                  <span className="text-muted-foreground">Total subscribers</span>
                </div>
              </div>
              <div className="h-[180px] md:h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subscriberGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis dataKey="date" className="text-xs" tickLine={false} axisLine={false} />
                    <YAxis className="text-xs" tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="subscribed" fill="#00c853" radius={[4, 4, 0, 0]} name="Subscribed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Revenue Attribution Section - Meta Style */}
      {revenueData && (
        <div>
          <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
            <CardContent className="p-4 md:p-8">
              {/* Hero Section */}
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between mb-4 md:mb-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 md:gap-4">
                    <p className="text-2xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                      {formatCurrency(revenueData.totalRevenue)}
                    </p>
                    <div className="flex items-center gap-1.5 rounded-full px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-semibold shadow-sm bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                      <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                      {revenueData.orderCount} orders
                    </div>
                  </div>
                  <p className="mt-1 md:mt-2 text-xs md:text-sm text-muted-foreground font-medium">
                    Email Revenue • AOV: {formatCurrency(revenueData.averageOrderValue)}
                  </p>
                </div>
              </div>

              {/* Time Range Selector */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6">
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto">
                  {CHART_TIME_RANGES.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => setChartTimeRange(range.value)}
                      className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-md transition-all shrink-0 ${
                        chartTimeRange === range.value
                          ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {revenueData.dailyBreakdown.length} data points
                </p>
              </div>

              {/* Revenue Chart */}
              <div className="h-[220px] md:h-[380px] -mx-2">
                {revenueData.dailyBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={revenueData.dailyBreakdown.map(d => ({
                        ...d,
                        dateDisplay: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                      }))}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="emailRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="50%" stopColor="#10b981" stopOpacity={0.15}/>
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
                      <XAxis
                        dataKey="dateDisplay"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#9ca3af", fontSize: 11, fontWeight: 500 }}
                        dy={10}
                      />
                      <YAxis
                        tickFormatter={(v) => `$${v}`}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#10b981", fontSize: 11, fontWeight: 500 }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                          padding: "12px 16px"
                        }}
                        labelFormatter={(v) => v}
                        formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                        cursor={{ stroke: "#9ca3af", strokeWidth: 1, strokeDasharray: "4 4" }}
                      />
                      <Area
                        type="monotoneX"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#10b981"
                        fill="url(#emailRevenueGradient)"
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2, fill: "#10b981" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-2">
                    <DollarSign className="h-12 w-12 opacity-20" />
                    <p>No revenue data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign Performance Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Campaign performance</h2>
            <p className="text-sm text-muted-foreground">{dateLabel}</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-rh-accent dark:text-blue-400">Emails Sent</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatNumber(totals.sent)}</p>
                  <p className="text-xs text-blue-500 dark:text-blue-400">{dateLabel}</p>
                </div>
                <div className="rounded-full bg-blue-200/50 p-3 dark:bg-blue-800/30">
                  <Send className="h-5 w-5 text-rh-accent dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-rh-positive dark:text-emerald-400">Open Rate</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{totals.avgOpenRate.toFixed(1)}%</p>
                  <p className="text-xs text-emerald-500 dark:text-emerald-400">{formatNumber(totals.opened)} opened</p>
                </div>
                <div className="rounded-full bg-emerald-200/50 p-3 dark:bg-emerald-800/30">
                  <Eye className="h-5 w-5 text-rh-positive dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-950/20 dark:to-cyan-900/10">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">Click Rate</p>
                  <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{totals.avgClickRate.toFixed(1)}%</p>
                  <p className="text-xs text-cyan-500 dark:text-cyan-400">{formatNumber(totals.clicked)} clicked</p>
                </div>
                <div className="rounded-full bg-cyan-200/50 p-3 dark:bg-cyan-800/30">
                  <MousePointerClick className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-rh-accent-gold dark:text-amber-400">Bounced</p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{formatNumber(totals.bounced)}</p>
                  <p className="text-xs text-amber-500 dark:text-amber-400">{avgBounceRate.toFixed(2)}% rate</p>
                </div>
                <div className="rounded-full bg-amber-200/50 p-3 dark:bg-amber-800/30">
                  <AlertCircle className="h-5 w-5 text-rh-accent-gold dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/20 dark:to-rose-900/10">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-rh-negative dark:text-rose-400">Unsubscribed</p>
                  <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{formatNumber(totals.unsubscribed)}</p>
                  <p className="text-xs text-rose-500 dark:text-rose-400">{avgUnsubscribeRate.toFixed(2)}% rate</p>
                </div>
                <div className="rounded-full bg-rose-200/50 p-3 dark:bg-rose-800/30">
                  <UserMinus className="h-5 w-5 text-rh-negative dark:text-rose-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-rh-accent-gold dark:text-purple-400">Campaigns</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{campaigns.length}</p>
                  <p className="text-xs text-purple-500 dark:text-purple-400">{dateLabel}</p>
                </div>
                <div className="rounded-full bg-purple-200/50 p-3 dark:bg-purple-800/30">
                  <Mail className="h-5 w-5 text-rh-accent-gold dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Engagement Trends */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-2 w-2 rounded-full bg-rh-positive" />
                Engagement Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {engagementTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={engagementTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis dataKey="date" className="text-xs" tickLine={false} axisLine={false} />
                      <YAxis className="text-xs" tickLine={false} axisLine={false} unit="%" />
                      <Tooltip
                        formatter={(value) => `${Number(value).toFixed(1)}%`}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="openRate"
                        name="Open Rate"
                        stroke="#00c853"
                        strokeWidth={2}
                        dot={{ fill: '#00c853', strokeWidth: 0, r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="clickRate"
                        name="Click Rate"
                        stroke="#ff6b35"
                        strokeWidth={2}
                        dot={{ fill: '#ff6b35', strokeWidth: 0, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-2">
                    <TrendingUp className="h-12 w-12 opacity-20" />
                    <p>No campaign data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Emails Sent by Campaign */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-2 w-2 rounded-full bg-rh-accent-gold" />
                Emails Sent by Campaign
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {campaigns.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={campaigns.slice(0, 5)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" className="text-xs" tickLine={false} axisLine={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        className="text-xs"
                        width={100}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(value) => (value as number).toLocaleString()}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="sent" fill="#d4af37" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground gap-2">
                    <Send className="h-12 w-12 opacity-20" />
                    <p>No campaign data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Campaigns Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="h-2 w-2 rounded-full bg-rh-accent" />
            Recent Campaigns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {campaigns.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Campaign</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Sent</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Open Rate</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Click Rate</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Revenue</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Orders</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.slice(0, 10).map((campaign, index) => {
                    // Find revenue data for this campaign by matching name
                    const campaignNameLower = campaign.name.toLowerCase()
                    const revenueMatch = revenueData?.byCampaign.find(r => {
                      const utmCampaignLower = r.campaign.toLowerCase()
                      // Match if campaign name is contained in utm_campaign string
                      return utmCampaignLower.includes(campaignNameLower) ||
                             campaignNameLower.includes(utmCampaignLower.split(' (')[0])
                    })
                    const campaignRevenue = revenueMatch?.revenue || 0
                    const campaignOrders = revenueMatch?.orders || 0

                    return (
                      <tr key={index} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                        <td className="py-3 px-2 font-medium max-w-[200px] truncate" title={campaign.name}>
                          {campaign.name}
                        </td>
                        <td className="text-right py-3 px-2">{campaign.sent.toLocaleString()}</td>
                        <td className="text-right py-3 px-2">
                          <span className="text-rh-positive font-medium">{campaign.openRate.toFixed(1)}%</span>
                        </td>
                        <td className="text-right py-3 px-2">
                          <span className="text-rh-accent font-medium">{campaign.clickRate.toFixed(1)}%</span>
                        </td>
                        <td className="text-right py-3 px-2">
                          <span className={campaignRevenue > 0 ? "text-rh-positive font-semibold" : "text-muted-foreground"}>
                            {campaignRevenue > 0 ? formatCurrency(campaignRevenue) : "—"}
                          </span>
                        </td>
                        <td className="text-right py-3 px-2">
                          <span className={campaignOrders > 0 ? "font-medium" : "text-muted-foreground"}>
                            {campaignOrders > 0 ? campaignOrders : "—"}
                          </span>
                        </td>
                        <td className="text-right py-3 px-2 text-muted-foreground">
                          {campaign.finishedAt
                            ? new Date(campaign.finishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No campaigns found. Send your first campaign in Omnisend to see data here.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
