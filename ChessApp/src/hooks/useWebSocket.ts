import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface WebSocketHook {
  send: (message: WebSocketMessage) => void;
  onMessage: (handler: (data: WebSocketMessage) => void) => void;
  connected: boolean;
  reconnect: () => void;
}

const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 30000;

export const useWebSocket = (): WebSocketHook | null => {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const messageHandlers = useRef<Set<(data: WebSocketMessage) => void>>(new Set());
  const messageQueue = useRef<WebSocketMessage[]>([]);
  
  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && !connected) {
        connect();
      } else if (nextAppState === 'background') {
        // Keep connection alive in background for a while
        // Most mobile OS will kill it eventually
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [connected]);

  const connect = useCallback(async () => {
    if (!user) return;

    try {
      // Get auth token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      // Clean up existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Create WebSocket connection
      const wsUrl = __DEV__ 
        ? 'ws://10.0.2.2:8080/ws' // Android emulator
        : 'wss://your-domain.com/ws'; // Production

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        reconnectAttempts.current = 0;

        // Send authentication
        ws.send(JSON.stringify({
          type: 'Connect',
          token,
        }));

        // Process queued messages
        while (messageQueue.current.length > 0) {
          const msg = messageQueue.current.shift();
          if (msg) ws.send(JSON.stringify(msg));
        }

        // Start heartbeat
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle pong
          if (data.type === 'Pong') {
            return;
          }

          // Notify all handlers
          messageHandlers.current.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              console.error('Message handler error:', error);
            }
          });
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setConnected(false);
        stopHeartbeat();
        wsRef.current = null;

        // Attempt reconnection
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          console.log(`Reconnecting... Attempt ${reconnectAttempts.current}`);
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, RECONNECT_INTERVAL);
        }
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [user]);

  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatInterval.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'Ping' }));
      }
    }, HEARTBEAT_INTERVAL);
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  };

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      messageQueue.current.push(message);
      
      // Try to reconnect if not connected
      if (!connected && reconnectAttempts.current === 0) {
        connect();
      }
    }
  }, [connected, connect]);

  const onMessage = useCallback((handler: (data: WebSocketMessage) => void) => {
    messageHandlers.current.add(handler);
    
    // Return cleanup function
    return () => {
      messageHandlers.current.delete(handler);
    };
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    connect();
  }, [connect]);

  // Initial connection
  useEffect(() => {
    if (user) {
      connect();
    }

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      stopHeartbeat();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user, connect]);

  if (!user) return null;

  return {
    send,
    onMessage,
    connected,
    reconnect,
  };
};