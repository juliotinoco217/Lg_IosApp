import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Building2,
  PiggyBank,
  CreditCard,
  Landmark,
  TrendingUp,
  CheckCircle2,
  Circle,
} from "lucide-react"

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
  mask: string | null
}

interface AccountSelectorProps {
  open: boolean
  onClose: () => void
  accounts: Account[]
  institutionName?: string
  onConfirm: (selectedAccountIds: string[]) => void
}

export function AccountSelector({
  open,
  onClose,
  accounts,
  institutionName = "this institution",
  onConfirm,
}: AccountSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(accounts.map((a) => a.account_id))
  )

  const toggleAccount = (accountId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedIds(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(accountId)) {
        newSelected.delete(accountId)
      } else {
        newSelected.add(accountId)
      }
      return newSelected
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(accounts.map((a) => a.account_id)))
  }

  const selectNone = () => {
    setSelectedIds(new Set())
  }

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds))
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value)
  }

  const getAccountIcon = (type: string, subtype: string) => {
    if (type === "credit") return <CreditCard size={20} className="text-red-500" />
    if (type === "investment") return <TrendingUp size={20} className="text-purple-500" />
    if (subtype === "checking") return <Building2 size={20} className="text-blue-500" />
    if (subtype === "savings") return <PiggyBank size={20} className="text-green-500" />
    return <Landmark size={20} className="text-gray-500" />
  }

  const getAccountTypeLabel = (type: string, subtype: string) => {
    if (type === "investment") return "Investment"
    if (type === "credit") return "Credit"
    return subtype.charAt(0).toUpperCase() + subtype.slice(1)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Accounts</DialogTitle>
          <DialogDescription>
            Choose which accounts from {institutionName} you want to track.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex justify-end gap-2 text-sm">
            <button
              type="button"
              onClick={selectAll}
              className="text-blue-600 hover:underline"
            >
              Select all
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={selectNone}
              className="text-blue-600 hover:underline"
            >
              Select none
            </button>
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {accounts.map((account) => {
              const isSelected = selectedIds.has(account.account_id)
              return (
                <button
                  type="button"
                  key={account.account_id}
                  onClick={(e) => toggleAccount(account.account_id, e)}
                  className={`flex w-full items-center justify-between rounded-lg border p-4 transition-colors cursor-pointer ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isSelected ? (
                      <CheckCircle2 size={20} className="text-blue-600" />
                    ) : (
                      <Circle size={20} className="text-gray-300" />
                    )}
                    {getAccountIcon(account.type, account.subtype)}
                    <div className="text-left">
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-gray-500">
                        {getAccountTypeLabel(account.type, account.subtype)}
                        {account.mask && ` ••••${account.mask}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(account.balances.current)}
                    </p>
                    {account.type === "credit" && account.balances.limit && (
                      <p className="text-xs text-gray-500">
                        Limit: {formatCurrency(account.balances.limit)}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <p className="text-sm text-gray-500">
            {selectedIds.size} of {accounts.length} accounts selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
              Confirm Selection
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
