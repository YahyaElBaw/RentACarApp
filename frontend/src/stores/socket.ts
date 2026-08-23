import { defineStore } from 'pinia';
import { ref } from 'vue';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth';
import { presenceApi } from '../api';

export interface ActiveUser {
  socketId: string;
  userId: string;
  name: string;
  role: string;
  device?: 'phone' | 'pc' | string;
  devices?: string[];
  connectedAt: string;
}

export const useSocketStore = defineStore('socket', () => {
  const socket = ref<Socket | null>(null);
  const isConnected = ref(false);
  const onlineCount = ref(0);
  const onlineUsers = ref<ActiveUser[]>([]);
  const listeners = new Map<string, Set<Function>>();
  let presenceTimer: ReturnType<typeof setInterval> | null = null;

  function connect() {
    if (socket.value && socket.value.connected) return;

    const authStore = useAuthStore();
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    socket.value = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    socket.value.on('connect', () => {
      console.log('⚡ Socket.IO connected:', socket.value?.id);
      isConnected.value = true;
      identify();
    });

    socket.value.on('disconnect', () => {
      console.log('⚡ Socket.IO disconnected');
      isConnected.value = false;
    });

    socket.value.on('users:online', () => {
      // Socket pushes are just a trigger; REST presence (DB) is the single source of truth
      void refreshOnline();
    });

    // Global listener dispatcher
    const events = ['contract:change', 'car:change', 'reservation:change', 'depense:change', 'user:login', 'gps:speed-alert'];
    events.forEach((eventName) => {
      socket.value?.on(eventName, (payload: any) => {
        const callbacks = listeners.get(eventName);
        if (callbacks) {
          callbacks.forEach((cb) => cb(payload));
        }
      });
    });
  }

  function identify() {
    const authStore = useAuthStore();
    if (socket.value && authStore.user) {
      socket.value.emit('user:identify', {
        userId: authStore.user.id || authStore.user._id,
        name: `${authStore.user.firstName || ''} ${authStore.user.lastName || ''}`.trim() || authStore.user.cin,
        role: authStore.user.role || 'user',
      });
    }
  }

  function disconnect() {
    if (socket.value) {
      socket.value.emit('user:logout');
      socket.value.disconnect();
      socket.value = null;
      isConnected.value = false;
    }
  }

  function onEvent(event: string, callback: Function) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(callback);

    // Return cleanup function
    return () => {
      listeners.get(event)?.delete(callback);
    };
  }

  async function sendHeartbeat() {
    try {
      await presenceApi.heartbeat({ device: 'pc' });
    } catch (err) {
      // ignore polling failures
    }
  }

  async function refreshOnline() {
    try {
      const data = await presenceApi.online();
      onlineCount.value = data.count || 0;
      onlineUsers.value = (data.users || []).map((u: any) => ({
        socketId: u.socketId || '',
        userId: u.userId,
        name: u.name || '',
        role: u.role || 'user',
        device: u.device || 'pc',
        devices: Array.isArray(u.devices) && u.devices.length ? u.devices : [u.device || 'pc'],
        connectedAt: u.lastSeen,
      }));
    } catch (err) {
      // ignore polling failures
    }
  }

  function startPresence() {
    stopPresence();
    sendHeartbeat();
    refreshOnline();
    presenceTimer = setInterval(() => {
      sendHeartbeat();
      refreshOnline();
    }, 30_000);
  }

  function stopPresence() {
    if (presenceTimer) {
      clearInterval(presenceTimer);
      presenceTimer = null;
    }
  }

  return {
    socket,
    isConnected,
    onlineCount,
    onlineUsers,
    connect,
    identify,
    disconnect,
    onEvent,
    startPresence,
    stopPresence,
  };
});
