import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../../presentation/store/authStore';
import { getDeviceId } from '../utils/deviceId';

export type OrderEventType = 'NEW_ORDER' | 'ORDER_UPDATE' | 'CONNECTED';

export interface OrderEvent {
  type: OrderEventType;
  data: unknown;
}

interface UseOrderEventsOptions {
  type: 'cashier' | 'customer';
  deviceId?: string;
  onNewOrder?: (order: unknown) => void;
  onOrderUpdate?: (order: unknown) => void;
  onConnected?: (data: unknown) => void;
  enabled?: boolean;
}

/**
 * Hook for subscribing to real-time order events via SSE
 */
export const useOrderEvents = ({
  type: clientType,
  onNewOrder,
  onOrderUpdate,
  onConnected,
  enabled = true
}: UseOrderEventsOptions) => {
  const { user } = useAuthStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  
  // Store callbacks in refs to avoid recreating connect function
  const onNewOrderRef = useRef(onNewOrder);
  const onOrderUpdateRef = useRef(onOrderUpdate);
  const onConnectedRef = useRef(onConnected);
  
  useEffect(() => {
    onNewOrderRef.current = onNewOrder;
    onOrderUpdateRef.current = onOrderUpdate;
    onConnectedRef.current = onConnected;
  }, [onNewOrder, onOrderUpdate, onConnected]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      disconnect();
      return;
    }

    const connect = () => {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      let url = `${API_BASE_URL}/api/orders/events/${clientType}`;
      
      // For customers, include identifier
      if (clientType === 'customer') {
        const customerId = user?.name || user?.email || getDeviceId();
        url += `?customerId=${encodeURIComponent(customerId)}&deviceId=${encodeURIComponent(getDeviceId())}`;
      }

      console.log(`📡 Connecting to SSE: ${url}`);
      
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('📡 SSE Connection opened');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
      };

      // Handle CONNECTED event
      eventSource.addEventListener('CONNECTED', (event) => {
        const data = JSON.parse(event.data);
        console.log('📡 SSE Connected:', data);
        onConnectedRef.current?.(data);
      });

      // Handle NEW_ORDER event
      eventSource.addEventListener('NEW_ORDER', (event) => {
        const data = JSON.parse(event.data);
        console.log('📥 New order received:', data);
        onNewOrderRef.current?.(data);
      });

      // Handle ORDER_UPDATE event
      eventSource.addEventListener('ORDER_UPDATE', (event) => {
        const data = JSON.parse(event.data);
        console.log('🔄 Order update received:', data);
        onOrderUpdateRef.current?.(data);
      });

      eventSource.onerror = (error) => {
        console.error('📡 SSE Error:', error);
        setIsConnected(false);
        setConnectionError('Connection lost');
        eventSource.close();

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`📡 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setConnectionError('Max reconnection attempts reached');
        }
      };
    };

    connect();
    
    return () => {
      disconnect();
    };
  }, [enabled, clientType, user?.name, user?.email, disconnect]);

  return {
    isConnected,
    connectionError,
    disconnect
  };
};
