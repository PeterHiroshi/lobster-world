import { useEffect, useRef } from 'react';
import type { RenderEvent } from '@lobster-world/protocol';
import { useWorldStore } from '../store/useWorldStore';
import { WS_VIEWER_URL, RECONNECT_BASE_DELAY_MS, RECONNECT_MAX_RETRIES } from '../lib/constants';

export function useWebSocket() {
  const handleRenderEvent = useWorldStore((s) => s.handleRenderEvent);
  const setConnectionStatus = useWorldStore((s) => s.setConnectionStatus);
  const retriesRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    function connect() {
      if (!mountedRef.current) return;

      setConnectionStatus('connecting');
      const ws = new WebSocket(WS_VIEWER_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        retriesRef.current = 0;
        setConnectionStatus('connected');
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data as string) as RenderEvent;
          handleRenderEvent(data);
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnectionStatus('disconnected');
        wsRef.current = null;

        if (retriesRef.current < RECONNECT_MAX_RETRIES) {
          const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, retriesRef.current);
          retriesRef.current += 1;
          setTimeout(connect, delay);
        }
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [handleRenderEvent, setConnectionStatus]);
}
