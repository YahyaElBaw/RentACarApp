import { useEffect, useRef, useState, useCallback } from 'react';
import { gpsApi } from '../api';
import { subscribeGps, useSpectatorStore } from '../store/useSpectatorStore';

const POLL_MS = 1000;
const KM_REFRESH_MS = 60000;
const STALE_MS = 30 * 60 * 1000;

export interface GpsPosition {
  carId: string;
  lat: number;
  lng: number;
  speed: number;
  positionAt: string;
  brand?: string;
  model?: string;
  matricule?: string;
  carColor?: string;
  provider?: string;
  isRented?: boolean;
  contract?: any;
  client?: any;
}

export interface KmTodayEntry {
  carId: string;
  matricule: string;
  brand: string;
  model: string;
  kmToday: number;
  topSpeed: number;
  limit: number;
}

export interface SpeedAlert {
  _id: string;
  carId: string;
  matricule: string;
  brand: string;
  model: string;
  speed: number;
  limit: number;
  provider: string;
  alertAt: string;
}

export function useGpsTracking(enabled = true) {
  const [positions, setPositions] = useState<GpsPosition[]>([]);
  const [kmToday, setKmToday] = useState<KmTodayEntry[]>([]);
  const [alerts, setAlerts] = useState<{ id: string; type: 'speed' | 'km'; message: string; car: string; detail: string; timestamp: string }[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const kmRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPositions = useCallback(async () => {
    try {
      const data = await gpsApi.getPositions();
      setPositions(data || []);
    } catch (err) {
      console.error('[GPS] positions fetch failed', err);
    }
  }, []);

  const fetchKm = useCallback(async () => {
    try {
      const data = await gpsApi.getKmToday();
      setKmToday(data?.cars || []);
    } catch (err) {
      console.error('[GPS] km-today fetch failed', err);
    }
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Ensure socket is connected for GPS events
    useSpectatorStore.getState().connect();

    fetchPositions();
    fetchKm();

    pollRef.current = setInterval(fetchPositions, POLL_MS);
    kmRef.current = setInterval(fetchKm, KM_REFRESH_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (kmRef.current) clearInterval(kmRef.current);
    };
  }, [enabled, fetchPositions, fetchKm]);

  useEffect(() => {
    if (!enabled) return;

    const unsub = subscribeGps((event, payload) => {
      const data = payload?.data || payload || {};

      if (event === 'gps:position-update') {
        setPositions((prev) => {
          const idx = prev.findIndex((p) => String(p.carId) === String(data.carId));
          const pos: GpsPosition = {
            carId: data.carId,
            lat: data.lat,
            lng: data.lng,
            speed: data.speed || 0,
            positionAt: data.positionAt,
          };
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...pos };
            return next;
          }
          return [...prev, pos];
        });
      }

      if (event === 'gps:speed-alert') {
        const id = `speed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const carName = `${data.brand || ''} ${data.model || ''}`.trim();
        setAlerts((prev) => [
          { id, type: 'speed' as const, message: 'Excès de Vitesse', car: `${carName} — ${data.matricule || ''}`, detail: `${data.speed} km/h (limite: ${data.limit} km/h)`, timestamp: data.alertAt || new Date().toISOString() },
          ...prev,
        ].slice(0, 10));
      }

      if (event === 'gps:km-alert') {
        const id = `km-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const carName = `${data.brand || ''} ${data.model || ''}`.trim();
        setAlerts((prev) => [
          { id, type: 'km' as const, message: 'Dépassement Kilométrique', car: `${carName} — ${data.matricule || ''}`, detail: `${data.kmToday} km parcourus (limite: ${data.limit} km)`, timestamp: data.alertAt || new Date().toISOString() },
          ...prev,
        ].slice(0, 10));
      }
    });

    return unsub;
  }, [enabled]);

  const isStale = useCallback((positionAt: string) => {
    return Date.now() - new Date(positionAt).getTime() > STALE_MS;
  }, []);

  const getStatus = useCallback((pos: GpsPosition): 'moving' | 'parked' | 'inactive' => {
    if (isStale(pos.positionAt)) return 'inactive';
    if ((pos.speed || 0) > 2) return 'moving';
    return 'parked';
  }, [isStale]);

  return {
    positions,
    kmToday,
    alerts,
    dismissAlert,
    refresh: fetchPositions,
    refreshKm: fetchKm,
    isStale,
    getStatus,
  };
}
