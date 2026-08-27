import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { getServerUrl } from '../utils/serverDiscovery';
import { dashboardApi, presenceApi } from '../api';

export interface SpectatorEvent {
  id: string;
  event: string;
  action: string;
  label: string;
  detail?: string;
  timestamp: string;
}

export interface OnlineUser {
  userId: string;
  name: string;
  role: string;
  lastSeen: string;
  connectedAt?: string;
  device?: string;
  devices?: string[];
}

const EVENT_META: Record<string, { label: string; color: string; bg: string; action: (payload: any) => string; detail?: (payload: any) => string | undefined }> = {
  'contract:change': {
    label: 'Contrat',
    color: '#4f46e5',
    bg: '#eef2ff',
    action: (p) => (p?.action === 'created' ? 'Nouveau contrat créé' : `Contrat ${p?.action || 'modifié'}`),
    detail: (p) => (p?.reference ? `Référence: ${p.reference}` : undefined),
  },
  'reservation:change': {
    label: 'Réservation',
    color: '#10b981',
    bg: '#ecfdf5',
    action: (p) => (p?.action === 'created' ? 'Nouvelle réservation' : `Réservation ${p?.action || 'modifiée'}`),
    detail: (p) => (p?.reference ? `Référence: ${p.reference}` : undefined),
  },
  'car:change': {
    label: 'Parc',
    color: '#f59e0b',
    bg: '#fffbeb',
    action: (p) => (p?.action === 'created' ? 'Véhicule ajouté' : `Véhicule ${p?.action || 'modifié'}`),
    detail: (p) => {
      const car = p?.car || p?.data || {};
      const name = [car.brand, car.model].filter(Boolean).join(' ');
      return name ? name : undefined;
    },
  },
  'depense:change': {
    label: 'Dépense',
    color: '#e11d48',
    bg: '#fff1f2',
    action: (p) => (p?.action === 'created' ? 'Nouvelle dépense' : `Dépense ${p?.action || 'modifiée'}`),
    detail: (p) => (p?.amount ? `Montant: ${p.amount} TND` : undefined),
  },
  'user:login': {
    label: 'Connexion',
    color: '#0ea5e9',
    bg: '#f0f9ff',
    action: () => 'Connexion détectée',
    detail: (p) => (p?.name ? `${p.name} (${p.role || 'user'})` : undefined),
  },
  'user:logout': {
    label: 'Déconnexion',
    color: '#64748b',
    bg: '#f8fafc',
    action: () => 'Déconnexion détectée',
    detail: (p) => (p?.name ? p.name : undefined),
  },
};

const LIVE_EVENTS = Object.keys(EVENT_META);

const GPS_EVENTS = ['gps:position-update', 'gps:speed-alert', 'gps:km-alert'];

type GpsCallback = (event: string, payload: any) => void;

let gpsListeners = new Set<GpsCallback>();

export function subscribeGps(cb: GpsCallback): () => void {
  gpsListeners.add(cb);
  return () => { gpsListeners.delete(cb); };
}

function emitGpsEvent(event: string, payload: any) {
  gpsListeners.forEach((cb) => cb(event, payload));
}

interface SpectatorState {
  connected: boolean;
  events: SpectatorEvent[];
  onlineUsers: OnlineUser[];
  onlineCount: number;
  stats: any | null;
  statsLoading: boolean;
  connect: () => void;
  disconnect: () => void;
  clearEvents: () => void;
  refreshOnline: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

let socket: Socket | null = null;
let listeners = new Map<string, Set<(payload: any) => void>>();
let eventId = 0;

function pushEvent(entry: Omit<SpectatorEvent, 'id' | 'timestamp'>) {
  useSpectatorStore.setState((state) => ({
    events: [
      { ...entry, id: `evt-${Date.now()}-${eventId++}`, timestamp: new Date().toISOString() },
      ...state.events,
    ].slice(0, 50),
  }));
}

function attachEvent(name: string, payload: any) {
  const meta = EVENT_META[name];
  const wrapped = { timestamp: new Date().toISOString(), data: payload };
  const callbacks = listeners.get(name);
  if (callbacks) callbacks.forEach((cb) => cb(wrapped));

  if (meta) {
    pushEvent({
      event: name,
      action: meta.action(payload),
      label: meta.label,
      detail: meta.detail?.(payload),
    });
  }
}

export const useSpectatorStore = create<SpectatorState>((set, get) => ({
  connected: false,
  events: [],
  onlineUsers: [],
  onlineCount: 0,
  stats: null,
  statsLoading: false,

  connect: () => {
    if (socket && socket.connected) return;

    const url = getServerUrl();
    socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('⚡ Spectator socket connected');
      set({ connected: true });
      get().refreshOnline();
      get().refreshStats();
    });

    socket.on('disconnect', () => {
      console.log('⚡ Spectator socket disconnected');
      set({ connected: false });
    });

    LIVE_EVENTS.forEach((name) => {
      socket?.on(name, (payload: any) => attachEvent(name, payload));
    });

    GPS_EVENTS.forEach((name) => {
      socket?.on(name, (payload: any) => emitGpsEvent(name, payload));
    });

    socket.on('users:online', (data: { count: number; users: any[] }) => {
      set({
        onlineCount: data.count || 0,
        onlineUsers: (data.users || []).map((u: any) => ({
          userId: u.userId,
          name: u.name || 'Utilisateur',
          role: u.role || 'user',
          lastSeen: u.connectedAt || u.lastSeen || new Date().toISOString(),
          connectedAt: u.connectedAt,
          device: u.device || 'pc',
          devices:
            Array.isArray(u.devices) && u.devices.length
              ? u.devices
              : [u.device || 'pc'],
        })),
      });
    });
  },

  disconnect: () => {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
    listeners = new Map();
    set({ connected: false });
  },

  clearEvents: () => set({ events: [] }),

  refreshOnline: async () => {
    try {
      const data = await presenceApi.online();
      set({
        onlineCount: data.count || 0,
        onlineUsers: (data.users || []).map((u: any) => ({
          userId: u.userId,
          name: u.name || 'Utilisateur',
          role: u.role || 'user',
          lastSeen: u.lastSeen,
          device: u.device || 'pc',
          devices:
            Array.isArray(u.devices) && u.devices.length
              ? u.devices
              : [u.device || 'pc'],
        })),
      });
    } catch (err) {
      console.error('Failed to refresh online users', err);
    }
  },

  refreshStats: async () => {
    set({ statsLoading: true });
    try {
      const data = await dashboardApi.getStats();
      set({ stats: data });
    } catch (err) {
      console.error('Failed to refresh spectator stats', err);
    } finally {
      set({ statsLoading: false });
    }
  },
}));

export { EVENT_META };
