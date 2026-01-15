import { useCallback, useEffect, useState } from "react"
import { usePlaidLink } from "react-plaid-link"
import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface ItemStatus {
  accessToken: string
  needsUpdate: boolean
  error?: string
  institutionName?: string
}

interface PlaidReconnectProps {
  onSuccess?: () => void
}

export function PlaidReconnect({ onSuccess }: PlaidReconnectProps) {
  const [itemsNeedingUpdate, setItemsNeedingUpdate] = useState<ItemStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [currentItem, setCurrentItem] = useState<ItemStatus | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Check item status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await apiFetch(`/api/finance/item-status`)
        if (!response.ok) throw new Error("Failed to check status")

        const data = await response.json()
        const needsUpdate = data.items?.filter((item: ItemStatus) => item.needsUpdate) || []
        setItemsNeedingUpdate(needsUpdate)
      } catch (err) {
        console.error("Error checking item status:", err)
      } finally {
        setLoading(false)
      }
    }

    checkStatus()
  }, [])

  const startReconnect = async (item: ItemStatus) => {
    setReconnecting(true)
    setCurrentItem(item)

    try {
      const response = await apiFetch(`/api/finance/update-link-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user-" + Date.now(),
          accessToken: item.accessToken,
        }),
      })

      if (!response.ok) throw new Error("Failed to create update link token")

      const data = await response.json()
      setLinkToken(data.link_token)
    } catch (err) {
      console.error("Error creating update link token:", err)
      setReconnecting(false)
    }
  }

  const handleSuccess = useCallback(() => {
    setSuccess(true)
    setLinkToken(null)
    setCurrentItem(null)
    setReconnecting(false)

    // Remove the reconnected item from the list
    setItemsNeedingUpdate((prev) =>
      prev.filter((item) => item.accessToken !== currentItem?.accessToken)
    )

    // Reload after a short delay
    setTimeout(() => {
      if (onSuccess) {
        onSuccess()
      } else {
        window.location.reload()
      }
    }, 1500)
  }, [currentItem, onSuccess])

  const handleExit = useCallback(() => {
    setLinkToken(null)
    setReconnecting(false)
  }, [])

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: handleExit,
  })

  // Open Plaid Link when token is ready
  useEffect(() => {
    if (linkToken && ready) {
      open()
    }
  }, [linkToken, ready, open])

  if (loading) {
    return null
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <h4 className="font-medium text-green-800">Reconnected!</h4>
            <p className="text-sm text-green-700">
              Your bank account has been reconnected. Refreshing...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (itemsNeedingUpdate.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
        <div className="flex-1">
          <h4 className="font-medium text-amber-800">Bank Reconnection Required</h4>
          <p className="mb-3 text-sm text-amber-700">
            Your connection to {itemsNeedingUpdate[0].institutionName || "your bank"} has expired.
            Please reconnect to continue syncing your financial data.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => startReconnect(itemsNeedingUpdate[0])}
            disabled={reconnecting}
            className="border-amber-300 bg-white hover:bg-amber-100"
          >
            {reconnecting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <RefreshCw size={16} className="mr-2" />
                Reconnect {itemsNeedingUpdate[0].institutionName || "Bank"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
