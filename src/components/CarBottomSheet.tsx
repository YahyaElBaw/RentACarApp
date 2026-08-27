import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Animated, PanResponder, Dimensions } from 'react-native';
import { X, Navigation, Phone, FileText, MapPin, Gauge, Clock, Fuel } from 'lucide-react-native';
import type { GpsPosition, KmTodayEntry } from '../hooks/useGpsTracking';
import { resolveCarColor } from '../utils/carColor';

const STATUS_CONFIG = {
  moving: { label: 'En mouvement', color: '#10b981', bg: '#ecfdf5' },
  parked: { label: 'Garé', color: '#ef4444', bg: '#fef2f2' },
  inactive: { label: 'Inactif', color: '#94a3b8', bg: '#f8fafc' },
};

const { height: SCREEN_H } = Dimensions.get('window');
const COLLAPSED_H = 80;
const BOTTOM_MARGIN = 24;
const EXPANDED_H = SCREEN_H * 0.72;

interface Props {
  visible: boolean;
  onClose: () => void;
  position: GpsPosition | null;
  kmEntry: KmTodayEntry | null;
  status: 'moving' | 'parked' | 'inactive';
}

export default function CarBottomSheet({ visible, onClose, position, kmEntry, status }: Props) {
  const animY = useRef(new Animated.Value(EXPANDED_H)).current;
  const expanded = useRef(true);
  const startY = useRef(0);

  useEffect(() => {
    if (visible) {
      expanded.current = true;
      Animated.spring(animY, { toValue: COLLAPSED_H, useNativeDriver: false, tension: 65, friction: 11 }).start();
    } else {
      Animated.timing(animY, { toValue: EXPANDED_H, duration: 250, useNativeDriver: false }).start();
    }
  }, [visible]);

  const toggle = (toExp?: boolean) => {
    const next = toExp !== undefined ? toExp : !expanded.current;
    expanded.current = next;
    Animated.spring(animY, { toValue: next ? EXPANDED_H : COLLAPSED_H, useNativeDriver: false, tension: 65, friction: 11 }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderGrant: () => { startY.current = 0; },
      onPanResponderMove: (_, g) => {
        const target = (expanded.current ? COLLAPSED_H : EXPANDED_H) + g.dy;
        animY.setValue(Math.max(COLLAPSED_H, Math.min(EXPANDED_H, target)));
      },
      onPanResponderRelease: (_, g) => {
        const current = animY as any;
        const val = current._value ?? EXPANDED_H;
        if (g.vy < -0.3 || (g.dy < -40 && val > (COLLAPSED_H + EXPANDED_H) / 2)) {
          toggle(true);
        } else if (g.vy > 0.3 || (g.dy > 40 && val < (COLLAPSED_H + EXPANDED_H) / 2)) {
          toggle(false);
        } else {
          toggle(expanded.current);
        }
      },
    })
  ).current;

  if (!position) return null;

  const st = STATUS_CONFIG[status];
  const carColor = resolveCarColor(position.carColor);
  const lastSeen = new Date(position.positionAt);
  const lastSeenStr = `${String(lastSeen.getHours()).padStart(2, '0')}:${String(lastSeen.getMinutes()).padStart(2, '0')}:${String(lastSeen.getSeconds()).padStart(2, '0')}`;

  return (
    <Animated.View
      style={{
        position: 'absolute', bottom: BOTTOM_MARGIN, left: 16, right: 16, zIndex: 60,
        height: animY, backgroundColor: 'white',
        borderRadius: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 20,
        overflow: 'hidden',
      }}
      {...panResponder.panHandlers}
    >
      {/* Drag handle */}
      <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db' }} />
      </View>

      {/* Collapsed bar — always visible */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => toggle(!expanded.current)}
        style={{
          flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 12,
        }}
      >
        <View style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: carColor ? `${carColor}20` : '#f1f5f9',
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1.5, borderColor: carColor ? `${carColor}40` : '#e2e8f0',
        }}>
          <Navigation size={18} color={carColor || '#64748b'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }} numberOfLines={1}>
            {position.brand} {position.model}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: st.color }} />
            <Text style={{ fontSize: 9, fontWeight: '800', color: st.color, textTransform: 'uppercase' }}>{st.label}</Text>
            <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', fontFamily: 'monospace' }}>
              {Math.round(position.speed || 0)} km/h
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} color="#94a3b8" />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Expanded content */}
      {expanded.current && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Status + Speed */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <View style={{ flex: 1, backgroundColor: st.bg, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: `${st.color}20` }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: st.color, marginBottom: 6 }} />
              <Text style={{ fontSize: 9, fontWeight: '900', color: st.color, textTransform: 'uppercase', letterSpacing: 1 }}>{st.label}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}>
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#0f172a', fontVariant: ['tabular-nums'] }}>
                {Math.round(position.speed || 0)}
              </Text>
              <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>km/h</Text>
            </View>
          </View>

          {/* Matricule */}
          <View style={{ backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Matricule</Text>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', fontFamily: 'monospace', letterSpacing: 1 }}>{position.matricule}</Text>
          </View>

          {/* KM Today */}
          {kmEntry && (
            <View style={{ backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Fuel size={14} color="#4f46e5" />
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Kilométrage Aujourd'hui</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: (kmEntry.kmToday || 0) > kmEntry.limit ? '#ef4444' : '#0f172a', fontVariant: ['tabular-nums'] }}>
                  {kmEntry.kmToday || 0}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8' }}>/ {kmEntry.limit} km</Text>
              </View>
              <View style={{ height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                <View style={{ height: '100%', borderRadius: 2, width: `${Math.min(100, ((kmEntry.kmToday || 0) / kmEntry.limit) * 100)}%`, backgroundColor: (kmEntry.kmToday || 0) > kmEntry.limit ? '#ef4444' : '#4f46e5' }} />
              </View>
              {kmEntry.topSpeed > 0 && (
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 6 }}>
                  Vitesse max: <Text style={{ color: '#ef4444', fontWeight: '900' }}>{kmEntry.topSpeed} km/h</Text>
                </Text>
              )}
            </View>
          )}

          {/* Details */}
          <View style={{ backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
            <InfoRow icon={MapPin} label="Position" value={`${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`} />
            <InfoRow icon={Gauge} label="GPS" value={position.provider || 'N/A'} />
            <InfoRow icon={Clock} label="Dernière vue" value={lastSeenStr} />
          </View>

          {/* Active Contract */}
          {position.contract && (
            <View style={{ backgroundColor: '#eef2ff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#c7d2fe' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <FileText size={14} color="#4f46e5" />
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: 1 }}>Contrat Actif</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                {position.contract.reference || 'N/A'}
              </Text>
              {position.client && (
                <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>
                      {position.client.firstName} {position.client.lastName}
                    </Text>
                    {position.client.phone && (
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', marginTop: 2 }}>
                        {position.client.phone}
                      </Text>
                    )}
                  </View>
                  {position.client.phone && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${position.client.phone}`)}
                      style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Phone size={16} color="white" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </Animated.View>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
      <Icon size={14} color="#94a3b8" />
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', marginLeft: 8, width: 80 }}>{label}</Text>
      <Text style={{ fontSize: 11, fontWeight: '800', color: '#0f172a', flex: 1 }}>{value}</Text>
    </View>
  );
}
