import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GroupedMetricCard } from "./GroupedMetricCard"
import {
  Target,
  DollarSign,
  Calendar,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  ChevronDown,
  X,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  ArrowRight,
  Settings2,
  Zap,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts"
import { apiFetch } from "@/lib/api"

// Types
interface MonthlyTarget {
  month: string
  target: number
}

interface MonthInfo {
  month: string
  monthName: string
  daysInMonth: number
}

interface ForecastScenario {
  id: string
  name: string
  startDate: string
  endDate: string
  revenueTarget: number
  roas: number
  autoCatchUpEnabled: boolean
  revenueSource: "shopify" | "etsy" | "combined"
  useMonthlyTargets: boolean
  monthlyTargets: MonthlyTarget[]
  createdAt: string
  updatedAt: string
}

interface ForecastMetrics {
  requiredAdSpendTotal: number
  baseRequiredDailyAdSpend: number
  baseRequiredDailyRevenue: number
  totalDaysInRange: number
  elapsedDays: number
  daysRemaining: number
  actualRevenueToDate: number
  actualAdSpendToDate: number
  forecastRevenueToDate: number
  delta: number
  deltaPercent: number
  status: "on_track" | "ahead" | "behind"
  remainingRevenueNeeded: number
  remainingAdSpendNeeded: number
  catchUpDailyAdSpend: number
  catchUpDailyRevenue: number
}

interface ForecastDataPoint {
  date: string
  actualRevenue: number | null
  actualAdSpend: number | null
  forecastRevenue: number
  forecastAdSpend: number
  cumulativeActualRevenue: number
  cumulativeForecastRevenue: number
}

interface WeeklyAggregate {
  weekStart: string
  weekEnd: string
  weekNumber: number
  actualRevenue: number
  forecastRevenue: number
  delta: number
  deltaPercent: number
}

interface MonthlyAggregate {
  month: string
  monthName: string
  actualRevenue: number
  forecastRevenue: number
  delta: number
  deltaPercent: number
}

interface QuarterlyAggregate {
  quarter: string
  year: number
  actualRevenue: number
  forecastRevenue: number
  delta: number
  deltaPercent: number
}

interface ForecastResult {
  scenario: ForecastScenario
  metrics: ForecastMetrics
  dailyData: ForecastDataPoint[]
  weeklyData: WeeklyAggregate[]
  monthlyData: MonthlyAggregate[]
  quarterlyData: QuarterlyAggregate[]
}

type PacingView = "daily" | "weekly" | "monthly" | "quarterly"

export function ForecastingDashboard() {
  // State
  const [scenarios, setScenarios] = useState<ForecastScenario[]>([])
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)
  const [pacingView, setPacingView] = useState<PacingView>("daily")
  const [showScenarioDropdown, setShowScenarioDropdown] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Form state for new/edit scenario
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    revenueTarget: "",
    roas: "2.5",
    autoCatchUpEnabled: false,
    revenueSource: "shopify" as "shopify" | "etsy" | "combined",
    useMonthlyTargets: false,
    monthlyTargets: [] as MonthlyTarget[],
  })

  // Months in the date range
  const [availableMonths, setAvailableMonths] = useState<MonthInfo[]>([])

  // Monthly targets editor modal
  const [showMonthlyTargetsEditor, setShowMonthlyTargetsEditor] = useState(false)
  const [editingMonthlyTargets, setEditingMonthlyTargets] = useState<MonthlyTarget[]>([])
  const [editorMonths, setEditorMonths] = useState<MonthInfo[]>([])

  // Load scenarios on mount
  useEffect(() => {
    loadScenarios()
  }, [])

  // Load months when date range changes
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      loadMonths(formData.startDate, formData.endDate)
    }
  }, [formData.startDate, formData.endDate])

  // Compute forecast when scenario changes
  useEffect(() => {
    if (selectedScenarioId) {
      computeForecast(selectedScenarioId)
    }
  }, [selectedScenarioId])

  const loadScenarios = async () => {
    try {
      setLoading(true)
      const res = await apiFetch(`/api/forecasting/scenarios`)
      if (res.ok) {
        const data = await res.json()
        setScenarios(data.scenarios || [])
        if (data.scenarios?.length > 0 && !selectedScenarioId) {
          setSelectedScenarioId(data.scenarios[0].id)
        }
      }
    } catch (error) {
      console.error("Failed to load scenarios:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadMonths = async (startDate: string, endDate: string) => {
    try {
      const res = await apiFetch(`/api/forecasting/months?start=${startDate}&end=${endDate}`)
      if (res.ok) {
        const data = await res.json()
        setAvailableMonths(data.months || [])

        // Initialize monthly targets with zeros if switching to monthly mode
        if (formData.useMonthlyTargets && data.months?.length > 0) {
          const newTargets = data.months.map((m: MonthInfo) => ({
            month: m.month,
            target: formData.monthlyTargets.find(t => t.month === m.month)?.target || 0,
          }))
          setFormData((prev) => ({ ...prev, monthlyTargets: newTargets }))
        }
      }
    } catch (error) {
      console.error("Failed to load months:", error)
    }
  }

  const distributeTargetEvenly = () => {
    if (availableMonths.length === 0 || !formData.revenueTarget) return

    const totalTarget = parseFloat(formData.revenueTarget)
    const totalDays = availableMonths.reduce((sum, m) => sum + m.daysInMonth, 0)

    const newTargets = availableMonths.map((m) => ({
      month: m.month,
      target: Math.round((m.daysInMonth / totalDays) * totalTarget),
    }))

    setFormData((prev) => ({ ...prev, monthlyTargets: newTargets }))
  }

  const updateMonthlyTarget = (month: string, value: number) => {
    setFormData((prev) => {
      const newTargets = prev.monthlyTargets.map((t) =>
        t.month === month ? { ...t, target: value } : t
      )
      // Update total revenue target
      const total = newTargets.reduce((sum, t) => sum + t.target, 0)
      return { ...prev, monthlyTargets: newTargets, revenueTarget: total.toString() }
    })
  }

  const computeForecast = async (scenarioId: string) => {
    try {
      setComputing(true)
      const res = await apiFetch(`/api/forecasting/compute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      })
      if (res.ok) {
        const data = await res.json()
        setForecastResult(data)
      }
    } catch (error) {
      console.error("Failed to compute forecast:", error)
    } finally {
      setComputing(false)
    }
  }

  const createScenario = async () => {
    try {
      const res = await apiFetch(`/api/forecasting/scenarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          startDate: formData.startDate,
          endDate: formData.endDate,
          revenueTarget: parseFloat(formData.revenueTarget),
          roas: parseFloat(formData.roas),
          autoCatchUpEnabled: formData.autoCatchUpEnabled,
          revenueSource: formData.revenueSource,
          useMonthlyTargets: formData.useMonthlyTargets,
          monthlyTargets: formData.monthlyTargets,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setScenarios((prev) => [data.scenario, ...prev])
        setSelectedScenarioId(data.scenario.id)
        setShowCreateForm(false)
        resetForm()
      }
    } catch (error) {
      console.error("Failed to create scenario:", error)
    }
  }

  const updateScenario = async (id: string, updates: Partial<ForecastScenario>) => {
    try {
      const res = await apiFetch(`/api/forecasting/scenarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const data = await res.json()
        setScenarios((prev) => prev.map((s) => (s.id === id ? data.scenario : s)))
        if (selectedScenarioId === id) {
          computeForecast(id)
        }
      }
    } catch (error) {
      console.error("Failed to update scenario:", error)
    }
  }

  const deleteScenario = async (id: string) => {
    try {
      const res = await apiFetch(`/api/forecasting/scenarios/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setScenarios((prev) => prev.filter((s) => s.id !== id))
        if (selectedScenarioId === id) {
          setSelectedScenarioId(scenarios.find((s) => s.id !== id)?.id || null)
          setForecastResult(null)
        }
      }
    } catch (error) {
      console.error("Failed to delete scenario:", error)
    }
  }

  const setRunningYear = async () => {
    try {
      const res = await apiFetch(`/api/forecasting/running-year`)
      if (res.ok) {
        const data = await res.json()
        setFormData((prev) => ({
          ...prev,
          startDate: data.startDate,
          endDate: data.endDate,
        }))
      }
    } catch (error) {
      console.error("Failed to get running year:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      startDate: "",
      endDate: "",
      revenueTarget: "",
      roas: "2.5",
      autoCatchUpEnabled: false,
      revenueSource: "shopify",
      useMonthlyTargets: false,
      monthlyTargets: [],
    })
    setAvailableMonths([])
  }

  const toggleMonthlyTargets = (enabled: boolean) => {
    if (enabled && availableMonths.length > 0) {
      // Initialize monthly targets based on current total
      const totalTarget = parseFloat(formData.revenueTarget) || 0
      const totalDays = availableMonths.reduce((sum, m) => sum + m.daysInMonth, 0)
      const newTargets = availableMonths.map((m) => ({
        month: m.month,
        target: Math.round((m.daysInMonth / totalDays) * totalTarget),
      }))
      setFormData((prev) => ({ ...prev, useMonthlyTargets: true, monthlyTargets: newTargets }))
    } else {
      setFormData((prev) => ({ ...prev, useMonthlyTargets: false }))
    }
  }

  // Open monthly targets editor for existing scenario
  const openMonthlyTargetsEditor = async () => {
    if (!selectedScenario) return

    try {
      const res = await apiFetch(
        `/api/forecasting/months?start=${selectedScenario.startDate}&end=${selectedScenario.endDate}`
      )
      if (res.ok) {
        const data = await res.json()
        setEditorMonths(data.months || [])

        // Initialize with existing targets or distribute evenly
        if (selectedScenario.monthlyTargets?.length > 0) {
          setEditingMonthlyTargets([...selectedScenario.monthlyTargets])
        } else {
          const totalDays = data.months.reduce((sum: number, m: MonthInfo) => sum + m.daysInMonth, 0)
          const newTargets = data.months.map((m: MonthInfo) => ({
            month: m.month,
            target: Math.round((m.daysInMonth / totalDays) * selectedScenario.revenueTarget),
          }))
          setEditingMonthlyTargets(newTargets)
        }
        setShowMonthlyTargetsEditor(true)
      }
    } catch (error) {
      console.error("Failed to load months for editor:", error)
    }
  }

  const updateEditorMonthlyTarget = (month: string, value: number) => {
    setEditingMonthlyTargets((prev) =>
      prev.map((t) => (t.month === month ? { ...t, target: value } : t))
    )
  }

  const distributeEditorTargetsEvenly = () => {
    if (editorMonths.length === 0 || !selectedScenario) return

    const totalDays = editorMonths.reduce((sum, m) => sum + m.daysInMonth, 0)
    const newTargets = editorMonths.map((m) => ({
      month: m.month,
      target: Math.round((m.daysInMonth / totalDays) * selectedScenario.revenueTarget),
    }))
    setEditingMonthlyTargets(newTargets)
  }

  const saveMonthlyTargets = async () => {
    if (!selectedScenario) return

    const newTotal = editingMonthlyTargets.reduce((sum, t) => sum + t.target, 0)
    await updateScenario(selectedScenario.id, {
      useMonthlyTargets: true,
      monthlyTargets: editingMonthlyTargets,
      revenueTarget: newTotal,
    })
    setShowMonthlyTargetsEditor(false)
  }

  const disableMonthlyTargets = async () => {
    if (!selectedScenario) return

    await updateScenario(selectedScenario.id, {
      useMonthlyTargets: false,
    })
    setShowMonthlyTargetsEditor(false)
  }

  // Load editor when opening
  useEffect(() => {
    if (showMonthlyTargetsEditor && selectedScenario) {
      openMonthlyTargetsEditor()
    }
  }, [showMonthlyTargetsEditor])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toFixed(1)}%`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId)

  // Status styling helpers
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "ahead":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/30",
          border: "border-emerald-200 dark:border-emerald-800",
          text: "text-emerald-700 dark:text-emerald-400",
          icon: TrendingUp,
          label: "Ahead of Target",
          gradient: "from-emerald-500 to-green-500",
        }
      case "behind":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/30",
          border: "border-amber-200 dark:border-amber-800",
          text: "text-amber-700 dark:text-amber-400",
          icon: TrendingDown,
          label: "Behind Target",
          gradient: "from-amber-500 to-orange-500",
        }
      default:
        return {
          bg: "bg-blue-50 dark:bg-blue-950/30",
          border: "border-blue-200 dark:border-blue-800",
          text: "text-blue-700 dark:text-blue-400",
          icon: CheckCircle2,
          label: "On Track",
          gradient: "from-blue-500 to-indigo-500",
        }
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-500" />
          <p className="mt-3 text-sm text-muted-foreground">Loading forecasts...</p>
        </div>
      </div>
    )
  }

  // Show create form if no scenarios
  if (scenarios.length === 0 || showCreateForm) {
    return (
      <div className="space-y-6">
        <Card className="mx-auto max-w-2xl overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Target size={20} />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {scenarios.length === 0 ? "Create Your First Forecast" : "Create New Scenario"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">Set up revenue goals and track your progress</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Scenario Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Q1 2024 Aggressive Growth"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={setRunningYear} className="gap-2">
              <Calendar className="h-4 w-4" />
              Use Running Year (YTD → Dec 31)
            </Button>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {formData.useMonthlyTargets ? "Total Revenue Target ($)" : "Revenue Target ($)"}
                </label>
                <input
                  type="number"
                  value={formData.revenueTarget}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, revenueTarget: e.target.value }))
                  }
                  placeholder="1000000"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
                  disabled={formData.useMonthlyTargets}
                />
                {formData.useMonthlyTargets && (
                  <p className="text-xs text-muted-foreground">Auto-calculated from monthly targets</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Target ROAS</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.roas}
                  onChange={(e) => setFormData((prev) => ({ ...prev, roas: e.target.value }))}
                  placeholder="2.5"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Monthly Targets Toggle */}
            {formData.startDate && formData.endDate && (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="useMonthlyTargets"
                      checked={formData.useMonthlyTargets}
                      onChange={(e) => toggleMonthlyTargets(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="useMonthlyTargets" className="text-sm font-medium">
                      Set monthly targets (for seasonal businesses)
                    </label>
                  </div>
                  {formData.useMonthlyTargets && formData.revenueTarget && (
                    <Button variant="outline" size="sm" onClick={distributeTargetEvenly}>
                      Distribute Evenly
                    </Button>
                  )}
                </div>

                {formData.useMonthlyTargets && availableMonths.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {availableMonths.map((month) => {
                      const target = formData.monthlyTargets.find((t) => t.month === month.month)
                      return (
                        <div key={month.month} className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">
                            {month.monthName}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <input
                              type="number"
                              value={target?.target || 0}
                              onChange={(e) => updateMonthlyTarget(month.month, parseInt(e.target.value) || 0)}
                              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-7 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Revenue Source</label>
              <select
                value={formData.revenueSource}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    revenueSource: e.target.value as "shopify" | "etsy" | "combined",
                  }))
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="shopify">Shopify Only</option>
                <option value="etsy">Etsy Only</option>
                <option value="combined">Combined</option>
              </select>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <input
                type="checkbox"
                id="autoCatchUp"
                checked={formData.autoCatchUpEnabled}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, autoCatchUpEnabled: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <label htmlFor="autoCatchUp" className="text-sm font-medium">
                  Enable auto catch-up
                </label>
                <p className="text-xs text-muted-foreground">Adjust forecast when behind pace</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={createScenario}
                disabled={!formData.name || !formData.startDate || !formData.endDate || !formData.revenueTarget}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Scenario
              </Button>
              {scenarios.length > 0 && (
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Scenario Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowScenarioDropdown(!showScenarioDropdown)}
            className="min-w-[240px] justify-between gap-2 border-border/60 bg-background/80 px-4 py-2.5 text-left shadow-sm hover:bg-muted/20"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Target size={12} />
              </div>
              <span className="font-medium">{selectedScenario?.name || "Select Scenario"}</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showScenarioDropdown ? "rotate-180" : ""}`} />
          </Button>
          {showScenarioDropdown && (
            <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-border/60 bg-background shadow-xl">
              <div className="p-2">
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/30 ${
                      scenario.id === selectedScenarioId ? "bg-indigo-50 dark:bg-indigo-950/30" : ""
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedScenarioId(scenario.id)
                        setShowScenarioDropdown(false)
                      }}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-medium">{scenario.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(scenario.revenueTarget)} target
                      </p>
                    </button>
                    <button
                      onClick={() => deleteScenario(scenario.id)}
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedScenarioId && computeForecast(selectedScenarioId)}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${computing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateForm(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Scenario
          </Button>
        </div>
      </div>

      {/* Progress Hero Section */}
      {forecastResult && (
        <Card className="overflow-hidden">
          <div className={`border-b border-border/60 ${getStatusConfig(forecastResult.metrics.status).bg}`}>
            <CardContent className="py-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                {/* Left: Status and Progress */}
                <div className="space-y-4 lg:flex-1">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const config = getStatusConfig(forecastResult.metrics.status)
                      const Icon = config.icon
                      return (
                        <>
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/70 ${config.text}`}>
                            <Icon size={18} />
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${config.text}`}>{config.label}</p>
                            <p className="text-xs text-muted-foreground">
                              Day {forecastResult.metrics.elapsedDays} of {forecastResult.metrics.totalDaysInRange}
                            </p>
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress to Target</span>
                      <span className="font-semibold">
                        {((forecastResult.metrics.actualRevenueToDate / forecastResult.scenario.revenueTarget) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="relative h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      {/* Expected progress marker */}
                      <div
                        className="absolute top-0 h-full w-0.5 bg-slate-400"
                        style={{
                          left: `${(forecastResult.metrics.elapsedDays / forecastResult.metrics.totalDaysInRange) * 100}%`,
                        }}
                      />
                      {/* Actual progress */}
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (forecastResult.metrics.actualRevenueToDate / forecastResult.scenario.revenueTarget) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(forecastResult.metrics.actualRevenueToDate)}</span>
                      <span>{formatCurrency(forecastResult.scenario.revenueTarget)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Key Numbers */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{formatCurrency(forecastResult.metrics.actualRevenueToDate)}</p>
                    <p className="text-xs text-muted-foreground">Actual Revenue</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{formatCurrency(forecastResult.metrics.forecastRevenueToDate)}</p>
                    <p className="text-xs text-muted-foreground">Expected Revenue</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${forecastResult.metrics.delta >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {formatCurrency(Math.abs(forecastResult.metrics.delta))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {forecastResult.metrics.delta >= 0 ? "Ahead" : "Behind"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{forecastResult.metrics.daysRemaining}</p>
                    <p className="text-xs text-muted-foreground">Days Left</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      )}

      {/* Forecast vs Actual Grouped Cards */}
      {forecastResult && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Forecast Metrics Card */}
          <GroupedMetricCard
            title="Forecast Metrics"
            icon={<Target size={18} />}
            heroMetric={{
              label: "Revenue Target",
              value: formatCurrency(forecastResult.scenario.revenueTarget),
              sublabel: `${forecastResult.metrics.totalDaysInRange} days total`,
            }}
            metrics={[
              { label: "Required Ad Spend", value: formatCurrency(forecastResult.metrics.requiredAdSpendTotal) },
              { label: "Target ROAS", value: `${forecastResult.scenario.roas.toFixed(2)}x` },
              { label: "Daily Revenue Target", value: `${formatCurrency(forecastResult.metrics.baseRequiredDailyRevenue)}/day` },
              { label: "Daily Ad Spend Target", value: `${formatCurrency(forecastResult.metrics.baseRequiredDailyAdSpend)}/day` },
              { label: "Forecast to Date", value: formatCurrency(forecastResult.metrics.forecastRevenueToDate) },
              { label: "Days Remaining", value: forecastResult.metrics.daysRemaining.toString() },
            ]}
            columns={3}
          />

          {/* Actuals Metrics Card */}
          <GroupedMetricCard
            title="Actual Performance"
            icon={<DollarSign size={18} />}
            heroMetric={{
              label: "Actual Revenue",
              value: formatCurrency(forecastResult.metrics.actualRevenueToDate),
              sublabel: `${forecastResult.metrics.elapsedDays} days elapsed`,
            }}
            metrics={[
              { label: "Actual Ad Spend", value: formatCurrency(forecastResult.metrics.actualAdSpendToDate) },
              {
                label: "Actual ROAS",
                value: forecastResult.metrics.actualAdSpendToDate > 0
                  ? `${(forecastResult.metrics.actualRevenueToDate / forecastResult.metrics.actualAdSpendToDate).toFixed(2)}x`
                  : "N/A"
              },
              {
                label: "Delta",
                value: formatCurrency(forecastResult.metrics.delta),
                trend: forecastResult.metrics.delta >= 0 ? "up" : "down"
              },
              {
                label: "Delta %",
                value: formatPercent(forecastResult.metrics.deltaPercent),
                trend: forecastResult.metrics.deltaPercent >= 0 ? "up" : "down"
              },
              {
                label: "Status",
                value: forecastResult.metrics.status.replace("_", " ").toUpperCase(),
                highlight: true
              },
              {
                label: "Revenue Remaining",
                value: formatCurrency(forecastResult.metrics.remainingRevenueNeeded)
              },
            ]}
            columns={3}
          />
        </div>
      )}

      {/* Catch-Up Plan (shown when behind) */}
      {forecastResult && forecastResult.metrics.status === "behind" && (
        <Card className="overflow-hidden border-amber-200 dark:border-amber-800">
          <CardHeader className="border-b border-border/60 bg-amber-50/60 dark:bg-amber-950/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Zap size={18} />
              </div>
              <div>
                <CardTitle className="text-lg text-amber-800 dark:text-amber-400">Catch-Up Plan</CardTitle>
                <p className="text-sm text-amber-700/70 dark:text-amber-400/70">Adjusted targets to reach your goal</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-amber-50/50 p-4 dark:bg-amber-950/20">
                <p className="text-sm text-amber-700 dark:text-amber-400">Remaining Revenue</p>
                <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-300">
                  {formatCurrency(forecastResult.metrics.remainingRevenueNeeded)}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50/50 p-4 dark:bg-amber-950/20">
                <p className="text-sm text-amber-700 dark:text-amber-400">Remaining Ad Spend</p>
                <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-300">
                  {formatCurrency(forecastResult.metrics.remainingAdSpendNeeded)}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50/50 p-4 dark:bg-amber-950/20">
                <p className="text-sm text-amber-700 dark:text-amber-400">New Daily Ad Spend</p>
                <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-300">
                  {formatCurrency(forecastResult.metrics.catchUpDailyAdSpend)}/day
                </p>
              </div>
              <div className="rounded-xl bg-amber-50/50 p-4 dark:bg-amber-950/20">
                <p className="text-sm text-amber-700 dark:text-amber-400">New Daily Revenue</p>
                <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-300">
                  {formatCurrency(forecastResult.metrics.catchUpDailyRevenue)}/day
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-100/50 p-3 dark:bg-amber-950/30">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {selectedScenario?.autoCatchUpEnabled
                  ? "Auto catch-up is enabled. The forecast line will adjust from today forward."
                  : "Enable auto catch-up to see adjusted forecast projections."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Card */}
      {selectedScenario && (
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700">
                  <Settings2 size={16} className="text-slate-600 dark:text-slate-400" />
                </div>
                <CardTitle className="text-base">Scenario Settings</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={openMonthlyTargetsEditor}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                {selectedScenario.useMonthlyTargets ? "Edit Monthly Targets" : "Set Monthly Targets"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Date Range</label>
                <p className="font-semibold">
                  {formatDate(selectedScenario.startDate)} <ArrowRight className="inline h-3 w-3" /> {formatDate(selectedScenario.endDate)}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Revenue Source</label>
                <p className="font-semibold capitalize">{selectedScenario.revenueSource}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Target ROAS</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={selectedScenario.roas}
                    onChange={(e) =>
                      updateScenario(selectedScenario.id, { roas: parseFloat(e.target.value) })
                    }
                    className="w-20 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
                  />
                  <span className="text-muted-foreground">x</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Auto Catch-Up</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="catchUp"
                    checked={selectedScenario.autoCatchUpEnabled}
                    onChange={(e) =>
                      updateScenario(selectedScenario.id, { autoCatchUpEnabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="catchUp" className="text-sm font-medium">
                    {selectedScenario.autoCatchUpEnabled ? "Enabled" : "Disabled"}
                  </label>
                </div>
              </div>
            </div>

            {/* Monthly Targets Preview */}
            {selectedScenario.useMonthlyTargets && selectedScenario.monthlyTargets?.length > 0 && (
              <div className="mt-6 border-t pt-6">
                <p className="mb-3 text-sm font-medium text-muted-foreground">Monthly Targets</p>
                <div className="flex flex-wrap gap-2">
                  {selectedScenario.monthlyTargets.map((t) => (
                    <div key={t.month} className="rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
                      <span className="text-xs text-muted-foreground">{t.month.split("-")[1]}: </span>
                      <span className="text-sm font-semibold">{formatCurrency(t.target)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pacing Breakdown */}
      {forecastResult && (
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Revenue Pacing</CardTitle>
              <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                {(["daily", "weekly", "monthly", "quarterly"] as PacingView[]).map((view) => (
                  <button
                    key={view}
                    onClick={() => setPacingView(view)}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                      pacingView === view
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {pacingView === "daily" && (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastResult.dailyData}>
                    <defs>
                      <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      className="text-xs"
                      interval="preserveStartEnd"
                      tick={{ fill: "#94a3b8" }}
                    />
                    <YAxis
                      className="text-xs"
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      tick={{ fill: "#94a3b8" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "0.75rem",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value, name) => [
                        formatCurrency(Number(value) ?? 0),
                        name === "actualRevenue" ? "Actual" : "Forecast",
                      ]}
                      labelFormatter={formatDate}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="forecastRevenue"
                      name="Forecast"
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="url(#forecastGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="actualRevenue"
                      name="Actual"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#actualGradient)"
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {pacingView === "weekly" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="px-4 py-3 text-left font-semibold">Week</th>
                      <th className="px-4 py-3 text-right font-semibold">Actual</th>
                      <th className="px-4 py-3 text-right font-semibold">Forecast</th>
                      <th className="px-4 py-3 text-right font-semibold">Delta</th>
                      <th className="px-4 py-3 text-right font-semibold">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastResult.weeklyData.map((week, idx) => (
                      <tr
                        key={week.weekNumber}
                        className={`border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${
                          idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium">Week {week.weekNumber}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {formatDate(week.weekStart)} - {formatDate(week.weekEnd)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(week.actualRevenue)}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(week.forecastRevenue)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${week.delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {week.delta >= 0 ? "+" : ""}{formatCurrency(week.delta)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            week.deltaPercent >= 0
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}>
                            {week.deltaPercent >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {formatPercent(week.deltaPercent)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pacingView === "monthly" && (
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecastResult.monthlyData} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="monthName" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "0.75rem",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value) => formatCurrency(Number(value) ?? 0)}
                    />
                    <Legend />
                    <Bar dataKey="forecastRevenue" name="Forecast" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actualRevenue" name="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {pacingView === "quarterly" && (
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecastResult.quarterlyData} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="quarter" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "0.75rem",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value) => formatCurrency(Number(value) ?? 0)}
                    />
                    <Legend />
                    <Bar dataKey="forecastRevenue" name="Forecast" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actualRevenue" name="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monthly Targets Editor Modal */}
      {showMonthlyTargetsEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4 dark:bg-slate-900">
              <div>
                <h2 className="text-lg font-semibold">Monthly Revenue Targets</h2>
                <p className="text-sm text-muted-foreground">
                  Set different targets for each month to account for seasonality
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMonthlyTargetsEditor(false)}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-6 p-6">
              {/* Summary */}
              <div className="flex items-center justify-between rounded-xl bg-muted/20 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Target</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(editingMonthlyTargets.reduce((sum, t) => sum + t.target, 0))}
                  </p>
                </div>
                <Button variant="outline" onClick={distributeEditorTargetsEvenly} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Distribute Evenly
                </Button>
              </div>

              {/* Monthly Inputs */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {editorMonths.map((month) => {
                  const target = editingMonthlyTargets.find((t) => t.month === month.month)
                  return (
                    <div key={month.month} className="space-y-1.5">
                      <label className="text-sm font-medium">{month.monthName}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <input
                          type="number"
                          value={target?.target || 0}
                          onChange={(e) => updateEditorMonthlyTarget(month.month, parseInt(e.target.value) || 0)}
                          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-7 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{month.daysInMonth} days</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-between border-t bg-white px-6 py-4 dark:bg-slate-900">
              {selectedScenario?.useMonthlyTargets ? (
                <Button variant="ghost" onClick={disableMonthlyTargets} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                  Disable Monthly Targets
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowMonthlyTargetsEditor(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={saveMonthlyTargets}
                  className="gap-2"
                >
                  Save Targets
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
