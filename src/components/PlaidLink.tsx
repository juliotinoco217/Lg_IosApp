import { useCallback, useEffect, useState } from "react"
import { usePlaidLink } from "react-plaid-link"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, CheckCircle, Copy, AlertCircle } from "lucide-react"
import { AccountSelector } from "./AccountSelector"
import { apiFetch } from "@/lib/api"

interface PlaidLinkButtonProps {
  onSuccess?: (accessToken: string, itemId: string) => void
  onExit?: () => void
  buttonText?: string
  className?: string
}

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

interface ExchangeResult {
  accessToken: string
  itemId: string
  accounts: Account[]
}

export function PlaidLinkButton({
  onSuccess,
  onExit,
  buttonText = "Connect Bank Account",
  className,
}: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exchangeResult, setExchangeResult] = useState<ExchangeResult | null>(null)
  const [showAccountSelector, setShowAccountSelector] = useState(false)
  const [selectionComplete, setSelectionComplete] = useState(false)
  const [copied, setCopied] = useState(false)

  // Fetch link token when component mounts
  useEffect(() => {
    const fetchLinkToken = async () => {
      try {
        const response = await apiFetch(`/api/finance/link-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "user-" + Date.now() }),
        })

        if (!response.ok) {
          throw new Error("Failed to create link token")
        }

        const data = await response.json()
        setLinkToken(data.link_token)
      } catch (err) {
        console.error("Error fetching link token:", err)
        setError("Failed to initialize Plaid. Check your API credentials.")
      }
    }

    fetchLinkToken()
  }, [])

  const handleSuccess = useCallback(
    async (publicToken: string) => {
      setLoading(true)
      setError(null)

      try {
        const response = await apiFetch(`/api/finance/exchange-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicToken }),
        })

        if (!response.ok) {
          throw new Error("Failed to exchange token")
        }

        const data = await response.json()
        setExchangeResult({
          accessToken: data.accessToken,
          itemId: data.itemId,
          accounts: data.accounts || [],
        })

        // Show account selector if there are multiple accounts
        if (data.accounts && data.accounts.length > 1) {
          setShowAccountSelector(true)
        } else {
          // Single account - auto-select it
          if (data.accounts && data.accounts.length === 1) {
            const accountId = data.accounts[0].account_id
            await saveAccountPreferences([accountId], [accountId])
          }
          setSelectionComplete(true)
          if (onSuccess) {
            onSuccess(data.accessToken, data.itemId)
          }
        }
      } catch (err) {
        console.error("Error exchanging token:", err)
        setError("Failed to connect bank account. Please try again.")
      } finally {
        setLoading(false)
      }
    },
    [onSuccess]
  )

  const saveAccountPreferences = async (selectedAccountIds: string[], allAccountIds: string[]) => {
    try {
      await apiFetch(`/api/finance/account-preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabledAccountIds: selectedAccountIds,
          allAccountIds: allAccountIds, // Send all accounts so backend can disable unselected ones
        }),
      })
    } catch (err) {
      console.error("Error saving account preferences:", err)
    }
  }

  const handleAccountSelection = async (selectedAccountIds: string[]) => {
    setShowAccountSelector(false)
    const allAccountIds = exchangeResult?.accounts.map(a => a.account_id) || []
    await saveAccountPreferences(selectedAccountIds, allAccountIds)
    setSelectionComplete(true)

    if (onSuccess && exchangeResult) {
      onSuccess(exchangeResult.accessToken, exchangeResult.itemId)
    }
  }

  const handleExit = useCallback(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken: string) => handleSuccess(publicToken),
    onExit: handleExit,
  })

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  // Auto-reload page after selection complete
  useEffect(() => {
    if (selectionComplete) {
      const timer = setTimeout(() => {
        window.location.reload()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [selectionComplete])

  if (error && !linkToken) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <AlertCircle size={16} />
        {error}
      </div>
    )
  }

  // Show account selector modal
  if (showAccountSelector && exchangeResult) {
    return (
      <AccountSelector
        open={showAccountSelector}
        onClose={() => {
          setShowAccountSelector(false)
          // If closed without selecting, still enable all accounts from this institution
          const allAccountIds = exchangeResult.accounts.map((a) => a.account_id)
          saveAccountPreferences(allAccountIds, allAccountIds).then(() => {
            setSelectionComplete(true)
            if (onSuccess) {
              onSuccess(exchangeResult.accessToken, exchangeResult.itemId)
            }
          })
        }}
        accounts={exchangeResult.accounts}
        institutionName="the connected institution"
        onConfirm={handleAccountSelection}
      />
    )
  }

  if (selectionComplete && exchangeResult) {
    return (
      <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle size={20} />
          <span className="font-medium">Bank account connected successfully!</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 size={16} className="animate-spin" />
          <span>Loading your financial data...</span>
        </div>

        <div className="space-y-2 border-t pt-3">
          <p className="text-xs text-gray-500">
            For persistence across restarts, save this token to your .env:
          </p>

          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-gray-100 p-2 text-xs">
              PLAID_ACCESS_TOKEN={exchangeResult.accessToken}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                copyToClipboard(`PLAID_ACCESS_TOKEN=${exchangeResult.accessToken}`)
              }
            >
              {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Button
      onClick={() => open()}
      disabled={!ready || loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="mr-2 animate-spin" />
          Connecting...
        </>
      ) : !ready ? (
        <>
          <Loader2 size={16} className="mr-2 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          <Plus size={16} className="mr-2" />
          {buttonText}
        </>
      )}
    </Button>
  )
}
