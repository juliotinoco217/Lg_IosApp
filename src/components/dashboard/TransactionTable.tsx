import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  X,
  Receipt,
  Download,
} from "lucide-react"
import type { DateRangeValue } from "@/components/layout/Header"
import { apiFetch } from "@/lib/api"

interface Transaction {
  transaction_id: string
  account_id: string
  amount: number
  date: string
  name: string
  merchant_name: string | null
  category: string[]
  primary_category: string | null
  pending: boolean
  payment_channel: string
  iso_currency_code: string
}

interface Account {
  account_id: string
  name: string
  mask: string
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface TransactionTableProps {
  dateRange: DateRangeValue
  refreshKey: number
  accounts: Account[]
}

type SortField = "date" | "amount" | "merchant_name"
type SortOrder = "asc" | "desc"

export function TransactionTable({ dateRange, refreshKey, accounts }: TransactionTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<string[]>([])

  // Filters
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [accountFilter, setAccountFilter] = useState<string>("")
  const [minAmount, setMinAmount] = useState<string>("")
  const [maxAmount, setMaxAmount] = useState<string>("")
  const [sortBy, setSortBy] = useState<SortField>("date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await apiFetch(`/api/finance/transactions/categories`)
        if (res.ok) {
          const data = await res.json()
          setCategories(data.categories || [])
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error)
      }
    }
    fetchCategories()
  }, [])

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        range: dateRange,
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        sortBy,
        sortOrder,
      })

      if (debouncedSearch) params.append("search", debouncedSearch)
      if (categoryFilter) params.append("category", categoryFilter)
      if (accountFilter) params.append("accountId", accountFilter)
      if (minAmount) params.append("minAmount", minAmount)
      if (maxAmount) params.append("maxAmount", maxAmount)

      const res = await apiFetch(`/api/finance/transactions/list?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions || [])
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
    } finally {
      setLoading(false)
    }
  }, [dateRange, pagination.page, pagination.pageSize, debouncedSearch, categoryFilter, accountFilter, minAmount, maxAmount, sortBy, sortOrder])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions, refreshKey])

  // Reset page when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }))
  }, [debouncedSearch, categoryFilter, accountFilter, minAmount, maxAmount, dateRange])

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

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("desc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    )
  }

  const clearFilters = () => {
    setSearch("")
    setCategoryFilter("")
    setAccountFilter("")
    setMinAmount("")
    setMaxAmount("")
    setSortBy("date")
    setSortOrder("desc")
  }

  const hasActiveFilters = search || categoryFilter || accountFilter || minAmount || maxAmount

  const getAccountName = (accountId: string) => {
    const account = accounts.find((a) => a.account_id === accountId)
    return account ? `${account.name} (••${account.mask})` : accountId.slice(-4)
  }

  const exportToCSV = () => {
    const headers = ["Date", "Merchant/Description", "Category", "Account", "Amount", "Status"]
    const rows = transactions.map((tx) => [
      tx.date,
      tx.merchant_name || tx.name,
      tx.primary_category || tx.category?.[0] || "Uncategorized",
      getAccountName(tx.account_id),
      tx.amount.toString(),
      tx.pending ? "Pending" : "Posted",
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `transactions-${dateRange}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-5 w-5" />
            All Transactions
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {pagination.total.toLocaleString()} total
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs">
                <X className="h-3 w-3" />
                Clear filters
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={exportToCSV} className="h-8 gap-1">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters Row */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search merchant or description..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Account Filter */}
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.account_id} value={acc.account_id}>
                  {acc.name} (••{acc.mask})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Amount Range */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min $"
              value={minAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinAmount(e.target.value)}
              className="w-[90px] h-9"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="Max $"
              value={maxAmount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxAmount(e.target.value)}
              className="w-[90px] h-9"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead
                  className="w-[120px] cursor-pointer select-none"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {getSortIcon("date")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("merchant_name")}
                >
                  <div className="flex items-center gap-1">
                    Merchant / Description
                    {getSortIcon("merchant_name")}
                  </div>
                </TableHead>
                <TableHead className="w-[140px]">Category</TableHead>
                <TableHead className="w-[160px]">Account</TableHead>
                <TableHead
                  className="w-[120px] text-right cursor-pointer select-none"
                  onClick={() => handleSort("amount")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Amount
                    {getSortIcon("amount")}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.transaction_id} className="group">
                    <TableCell className="font-medium text-sm">
                      {formatDate(tx.date)}
                      {tx.pending && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{tx.merchant_name || tx.name}</div>
                      {tx.merchant_name && tx.name !== tx.merchant_name && (
                        <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {tx.name}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                        {tx.primary_category || tx.category?.[0] || "Uncategorized"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getAccountName(tx.account_id)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold text-sm ${
                        tx.amount < 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {tx.amount < 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(tx.amount))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Showing {((pagination.page - 1) * pagination.pageSize) + 1} -{" "}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{" "}
              {pagination.total.toLocaleString()}
            </span>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(val) =>
                setPagination((prev) => ({ ...prev, pageSize: parseInt(val), page: 1 }))
              }
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>per page</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page === 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: 1 }))}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page === 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="mx-2 text-sm">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.totalPages }))}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
