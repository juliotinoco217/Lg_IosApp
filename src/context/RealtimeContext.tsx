/**
 * RealtimeContext
 *
 * Provides centralized access to Supabase Realtime subscriptions.
 * Manages connection status and provides real-time data updates
 * to dashboard components.
 *
 * Usage:
 * const { syncStatus, isConnected, lastSyncTime } = useRealtime();
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/config/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';

// Types for sync status
interface SyncStatus {
  id: string;
  source: string;
  sync_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  records_synced: number;
  error_message: string | null;
  created_at: string;
}

// Context value type
interface RealtimeContextType {
  /** Current sync status for all sources */
  syncStatus: SyncStatus[];
  /** Whether realtime is connected */
  isConnected: boolean;
  /** Last time any data was updated */
  lastUpdate: Date | null;
  /** Connection error if any */
  error: string | null;
  /** Whether a sync is currently running */
  isSyncing: boolean;
  /** Get status for a specific source */
  getSourceStatus: (source: string) => SyncStatus | undefined;
  /** Force refresh sync status */
  refreshSyncStatus: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { isAuthenticated } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Derived state
  const isSyncing = syncStatus.some((s) => s.status === 'running');

  // Get status for a specific source
  const getSourceStatus = useCallback(
    (source: string) => {
      return syncStatus.find((s) => s.source === source);
    },
    [syncStatus]
  );

  // Fetch initial sync status
  const refreshSyncStatus = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('sync_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) {
        console.error('[Realtime] Error fetching sync status:', fetchError);
        setError(fetchError.message);
        return;
      }

      setSyncStatus((data as SyncStatus[]) || []);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('[Realtime] Error refreshing sync status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  // Setup realtime subscription
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear state when not authenticated
      setSyncStatus([]);
      setIsConnected(false);
      return;
    }

    // Initial fetch
    refreshSyncStatus();

    // Create realtime channel
    const newChannel = supabase
      .channel('realtime-sync-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_status',
        },
        (payload) => {
          console.log('[Realtime] Sync status change:', payload.eventType, payload);

          setSyncStatus((current) => {
            const newRecord = payload.new as SyncStatus;
            const oldRecord = payload.old as SyncStatus;

            switch (payload.eventType) {
              case 'INSERT':
                // Add new record at the beginning
                return [newRecord, ...current.slice(0, 19)];

              case 'UPDATE': {
                // Update existing record
                const index = current.findIndex((s) => s.id === oldRecord?.id);
                if (index >= 0) {
                  const updated = [...current];
                  updated[index] = newRecord;
                  return updated;
                }
                // If not found, add it
                return [newRecord, ...current.slice(0, 19)];
              }

              case 'DELETE':
                return current.filter((s) => s.id !== oldRecord?.id);

              default:
                return current;
            }
          });

          setLastUpdate(new Date());
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR') {
          setError('Realtime connection error');
        } else if (status === 'SUBSCRIBED') {
          setError(null);
        }
      });

    setChannel(newChannel);

    // Cleanup on unmount or auth change
    return () => {
      if (newChannel) {
        console.log('[Realtime] Removing channel');
        supabase.removeChannel(newChannel);
      }
      setIsConnected(false);
    };
  }, [isAuthenticated, refreshSyncStatus]);

  // Cleanup channel on unmount
  useEffect(() => {
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [channel]);

  return (
    <RealtimeContext.Provider
      value={{
        syncStatus,
        isConnected,
        lastUpdate,
        error,
        isSyncing,
        getSourceStatus,
        refreshSyncStatus,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Hook for checking if a specific source is syncing
 */
export function useSourceSyncing(source: string): boolean {
  const { getSourceStatus } = useRealtime();
  const status = getSourceStatus(source);
  return status?.status === 'running';
}

/**
 * Hook for getting the last sync time for a source
 */
export function useLastSyncTime(source: string): string | null {
  const { getSourceStatus } = useRealtime();
  const status = getSourceStatus(source);
  return status?.completed_at || null;
}
