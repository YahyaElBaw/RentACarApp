import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { AlertTriangle, Gauge, X } from 'lucide-react-native';

interface AlertItem {
  id: string;
  type: 'speed' | 'km';
  message: string;
  car: string;
  detail: string;
  timestamp: string;
}

interface Props {
  alerts: AlertItem[];
  onDismiss: (id: string) => void;
}

const CONFIG = {
  speed: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: Gauge, label: 'Vitesse' },
  km: { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', icon: AlertTriangle, label: 'Kilométrage' },
};

function AlertToastItem({ alert, onDismiss }: { alert: AlertItem; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(-20)).current;
  const cfg = CONFIG[alert.type];
  const Icon = cfg.icon;

  const alertTime = (() => {
    try {
      const d = new Date(alert.timestamp);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch { return ''; }
  })();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: -20, duration: 300, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: slideY }], marginBottom: 8 }}>
      <View style={{ backgroundColor: cfg.bg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: cfg.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${cfg.color}15`, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '900', color: cfg.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {alert.message}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', marginTop: 2 }} numberOfLines={1}>
            {alert.car}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#0f172a', marginTop: 1 }}>
            {alert.detail}
          </Text>
          {alertTime ? (
            <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', marginTop: 2 }}>
              {alertTime}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={14} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function AlertToast({ alerts, onDismiss }: Props) {
  if (!alerts.length) return null;

  return (
    <View style={{ position: 'absolute', top: 60, left: 16, right: 16, zIndex: 999 }}>
      {alerts.slice(0, 3).map((alert) => (
        <AlertToastItem key={alert.id} alert={alert} onDismiss={() => onDismiss(alert.id)} />
      ))}
    </View>
  );
}
