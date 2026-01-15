import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle, XCircle, Clock, Database, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { useRealtime } from '@/context/RealtimeContext';

interface SyncStatusData {
  source: string;
  status: string;
  completed_at: string;
  records_synced: number;
}

export function SyncStatus() {
  const { syncStatus: realtimeSyncStatus, isConnected, isSyncing: realtimeIsSyncing } = useRealtime();
  const [syncStatus, setSyncStatus] = useState<SyncStatusData[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Use realtime data if connected, otherwise fall back to polling
  const effectiveSyncStatus = isConnected && realtimeSyncStatus.length > 0
    ? realtimeSyncStatus
    : syncStatus;

  const effectiveIsSyncing = isConnected ? realtimeIsSyncing : syncing;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/sync/status`);
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await apiFetch(`/api/sync/all`, { method: 'POST' });
      // If not using realtime, wait and refresh
      if (!isConnected) {
        setTimeout(fetchStatus, 2000);
      }
    } catch (error) {
      console.error('Failed to trigger sync:', error);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Only poll if realtime is not connected
    if (!isConnected) {
      const interval = setInterval(fetchStatus, 60000);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, isConnected]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const sources = ['shopify', 'etsy', 'plaid', 'omnisend', 'meta'];

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      shopify: 'Shopify',
      etsy: 'Etsy',
      plaid: 'Plaid (Finance)',
      omnisend: 'Omnisend (Email)',
      meta: 'Meta Ads',
    };
    return labels[source] || source;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Data Sync Status</CardTitle>
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <Button
          onClick={triggerSync}
          disabled={effectiveIsSyncing}
          size="sm"
          variant="outline"
          className="h-8"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${effectiveIsSyncing ? 'animate-spin' : ''}`} />
          {effectiveIsSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {sources.map(source => {
            const status = effectiveSyncStatus.find(s => s.source === source);
            return (
              <div key={source} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status?.status || 'pending')}
                  <span className="font-medium">{getSourceLabel(source)}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  {status?.records_synced !== undefined && (
                    <span className="text-xs">{status.records_synced} records</span>
                  )}
                  <span className="text-xs">
                    {status?.completed_at ? formatTime(status.completed_at) : 'Never synced'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            Auto-sync: Full sync every 6 hours, Etsy every 2 hours
            {isConnected && <span className="text-green-600 ml-2">• Live updates</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
