/**
 * useRealtimeSubscription Hook
 *
 * Subscribe to Supabase Realtime changes for a specific table.
 * Automatically handles subscription lifecycle and cleanup.
 *
 * Usage:
 * const { data, isConnected, lastUpdate } = useRealtimeSubscription('sync_status', {
 *   event: 'UPDATE',
 *   filter: 'source=eq.shopify',
 *   onUpdate: (payload) => console.log('Updated:', payload)
 * });
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/config/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

interface UseRealtimeSubscriptionOptions {
  /** Event type to listen for */
  event?: PostgresChangeEvent;
  /** Filter string (e.g., 'source=eq.shopify') */
  filter?: string;
  /** Callback when data changes */
  onUpdate?: (payload: RealtimePayload) => void;
  /** Whether to fetch initial data */
  fetchInitial?: boolean;
  /** Select specific columns */
  select?: string;
  /** Order by column */
  orderBy?: { column: string; ascending?: boolean };
  /** Limit results */
  limit?: number;
  /** Enable/disable subscription */
  enabled?: boolean;
}

interface UseRealtimeSubscriptionResult<T> {
  /** Current data from the table */
  data: T[];
  /** Whether the realtime connection is active */
  isConnected: boolean;
  /** Last update timestamp */
  lastUpdate: Date | null;
  /** Any error that occurred */
  error: Error | null;
  /** Manually refresh data */
  refresh: () => Promise<void>;
}

export function useRealtimeSubscription<T extends Record<string, unknown>>(
  table: string,
  options: UseRealtimeSubscriptionOptions = {}
): UseRealtimeSubscriptionResult<T> {
  const {
    event = '*',
    filter,
    onUpdate,
    fetchInitial = true,
    select = '*',
    orderBy,
    limit,
    enabled = true,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const onUpdateRef = useRef<((payload: RealtimePayload) => void) | undefined>(onUpdate);

  // Keep callback ref updated
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      let query = supabase.from(table).select(select);

      if (filter) {
        // Parse simple filter like 'source=eq.shopify'
        const [column, rest] = filter.split('=');
        const [op, value] = rest.split('.');
        if (op === 'eq') {
          query = query.eq(column, value);
        }
      }

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data: result, error: fetchError } = await query;

      if (fetchError) {
        setError(new Error(fetchError.message));
        return;
      }

      setData((result as unknown as T[]) || []);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    }
  }, [table, select, filter, orderBy, limit]);

  // Setup realtime subscription
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Fetch initial data
    if (fetchInitial) {
      fetchData();
    }

    // Create subscription channel
    const channelName = `realtime-${table}-${filter || 'all'}-${Date.now()}`;

    // Build the subscription config
    const subscriptionConfig: {
      event: PostgresChangeEvent;
      schema: string;
      table: string;
      filter?: string;
    } = {
      event,
      schema: 'public',
      table,
    };

    if (filter) {
      subscriptionConfig.filter = filter;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase.channel(channelName) as any)
      .on(
        'postgres_changes',
        subscriptionConfig,
        (payload: RealtimePayload) => {
          console.log(`[Realtime] ${table} ${payload.eventType}:`, payload);

          // Update local data based on event type
          setData((currentData) => {
            switch (payload.eventType) {
              case 'INSERT':
                return [payload.new as T, ...currentData];

              case 'UPDATE': {
                const newRecord = payload.new as T;
                // Find and update the record, or add if not found
                const index = currentData.findIndex(
                  (item) => JSON.stringify(item) === JSON.stringify(payload.old)
                );
                if (index >= 0) {
                  const updated = [...currentData];
                  updated[index] = newRecord;
                  return updated;
                }
                return currentData;
              }

              case 'DELETE': {
                return currentData.filter(
                  (item) => JSON.stringify(item) !== JSON.stringify(payload.old)
                );
              }

              default:
                return currentData;
            }
          });

          setLastUpdate(new Date());

          // Call user callback
          if (onUpdateRef.current) {
            onUpdateRef.current(payload);
          }
        }
      )
      .subscribe((status: string) => {
        console.log(`[Realtime] ${table} subscription status:`, status);
        setIsConnected(status === 'SUBSCRIBED');
      }) as RealtimeChannel;

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [table, event, filter, fetchInitial, fetchData, enabled]);

  return {
    data,
    isConnected,
    lastUpdate,
    error,
    refresh: fetchData,
  };
}

/**
 * Hook for subscribing to sync_status updates
 */
export function useSyncStatusSubscription(source?: string) {
  return useRealtimeSubscription<{
    id: string;
    source: string;
    sync_type: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    records_synced: number;
    error_message: string | null;
    created_at: string;
  }>('sync_status', {
    event: '*',
    filter: source ? `source=eq.${source}` : undefined,
    orderBy: { column: 'created_at', ascending: false },
    limit: 10,
  });
}

/**
 * Hook for subscribing to daily metrics updates
 */
export function useDailyMetricsSubscription() {
  return useRealtimeSubscription<{
    date: string;
    gross_sales: number;
    net_sales: number;
    total_orders: number;
    average_order_value: number;
  }>('shopify_daily_metrics', {
    event: '*',
    orderBy: { column: 'date', ascending: false },
    limit: 30,
  });
}

/**
 * Hook for subscribing to transaction updates
 */
export function useTransactionSubscription() {
  return useRealtimeSubscription<{
    transaction_id: string;
    account_id: string;
    amount: number;
    merchant_name: string;
    category: string;
    transaction_date: string;
  }>('plaid_transactions', {
    event: 'INSERT',
    orderBy: { column: 'transaction_date', ascending: false },
    limit: 20,
  });
}
