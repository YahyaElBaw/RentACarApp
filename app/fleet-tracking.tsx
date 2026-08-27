import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { ArrowLeft, RefreshCw, Layers, Crosshair, Navigation, Clock, Car } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useGpsTracking, GpsPosition } from '../src/hooks/useGpsTracking';
import { resolveCarColor } from '../src/utils/carColor';
import CarBottomSheet from '../src/components/CarBottomSheet';
import AlertToast from '../src/components/AlertToast';

const STATUS_COLORS = { moving: '#10b981', parked: '#ef4444', inactive: '#94a3b8' };

function carLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function CustomMarker({ position, status, color, isSelected, onPress }: {
  position: GpsPosition; status: string; color: string; isSelected: boolean; onPress: () => void;
}) {
  const isMoving = status === 'moving';
  const iconColor = carLuminance(color) > 186 ? '#334155' : '#ffffff';
  return (
    <Marker coordinate={{ latitude: position.lat, longitude: position.lng }} onPress={onPress} tracksViewChanges={true}>
      <View style={{ alignItems: 'center' }}>
        {/* Pulse ring for moving */}
        {isMoving && (
          <View style={{
            position: 'absolute', width: 56, height: 56, borderRadius: 28,
            backgroundColor: `${color}25`, top: -8,
          }} />
        )}
        {/* Rounded square car body */}
        <View style={{
          width: 36, height: 36, borderRadius: 11,
          backgroundColor: color,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 3, borderColor: isSelected ? '#818cf8' : 'white',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 8,
        }}>
          <Car size={18} color={iconColor} strokeWidth={2.2} />
        </View>
        {/* Pointer triangle */}
        <View style={{
          width: 0, height: 0,
          borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 8,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderTopColor: color,
          marginTop: -1,
        }} />
        {/* Speed badge */}
        {isMoving && (
          <View style={{
            position: 'absolute', top: -6, right: -14,
            backgroundColor: '#10b981', borderRadius: 8,
            paddingHorizontal: 5, paddingVertical: 2,
            borderWidth: 1.5, borderColor: 'white',
          }}>
            <Text style={{ fontSize: 8, fontWeight: '900', color: 'white' }}>
              {Math.round(position.speed || 0)}
            </Text>
          </View>
        )}
        {/* Matricule label */}
        <View style={{
          marginTop: 4, backgroundColor: 'white', borderRadius: 6,
          paddingHorizontal: 6, paddingVertical: 2,
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
        }}>
          <Text style={{ fontSize: 8, fontWeight: '800', color: '#334155', fontFamily: 'monospace' }} numberOfLines={1}>
            {position.matricule || ''}
          </Text>
        </View>
      </View>
    </Marker>
  );
}

export default function FleetTrackingScreen() {
  const router = useRouter();
  const { positions, kmToday, alerts, dismissAlert, refresh, isStale, getStatus } = useGpsTracking();
  const [selectedCar, setSelectedCar] = useState<GpsPosition | null>(null);
  const [followCar, setFollowCar] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('satellite');
  const mapRef = useRef<MapView | null>(null);

  const movingCount = useMemo(() => positions.filter((p) => getStatus(p) === 'moving').length, [positions, getStatus]);

  const fitAll = useCallback(() => {
    if (!positions.length || !mapRef.current) return;
    const coords = positions.map((p) => ({ latitude: p.lat, longitude: p.lng }));
    mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 100, right: 60, bottom: 200, left: 60 }, animated: true });
  }, [positions]);

  const handleMarkerPress = useCallback((pos: GpsPosition) => {
    setSelectedCar(pos);
    setFollowCar(String(pos.carId));
    mapRef.current?.animateToRegion({
      latitude: pos.lat, longitude: pos.lng,
      latitudeDelta: 0.008, longitudeDelta: 0.008,
    }, 400);
  }, []);

  const handleCarChipPress = useCallback((pos: GpsPosition) => {
    setSelectedCar(pos);
    setFollowCar(String(pos.carId));
    mapRef.current?.animateToRegion({
      latitude: pos.lat, longitude: pos.lng,
      latitudeDelta: 0.008, longitudeDelta: 0.008,
    }, 400);
  }, []);

  // Follow selected car on live updates
  useEffect(() => {
    if (!followCar) return;
    const pos = positions.find((p) => String(p.carId) === followCar);
    if (pos && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: pos.lat, longitude: pos.lng,
        latitudeDelta: 0.008, longitudeDelta: 0.008,
      }, 800);
    }
  }, [positions, followCar]);

  const onMapPress = useCallback(() => {
    setFollowCar(null);
  }, []);

  const initialRegion = useMemo(() => {
    if (!positions.length) return { latitude: 36.8, longitude: 10.18, latitudeDelta: 0.5, longitudeDelta: 0.5 };
    const lats = positions.map((p) => p.lat);
    const lngs = positions.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.3),
      longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.3),
    };
  }, [positions]);

  const followedPos = useMemo(() => {
    if (!followCar) return null;
    return positions.find((p) => String(p.carId) === followCar) || null;
  }, [positions, followCar]);

  const selectedKm = selectedCar ? kmToday.find((k) => String(k.carId) === String(selectedCar.carId)) || null : null;
  const selectedStatus = selectedCar ? getStatus(selectedCar) : 'inactive';

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <AlertToast alerts={alerts} onDismiss={dismissAlert} />

      {/* Header */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
        paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16,
        backgroundColor: 'rgba(15,23,42,0.92)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={18} color="white" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '900', color: 'white', letterSpacing: -0.3 }}>Tracker Flotte</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' }} />
              <Text style={{ fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
                {positions.length} véhic. · {movingCount} actifs
              </Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={() => setMapType((t) => t === 'standard' ? 'satellite' : 'standard')}
            style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={fitAll}
            style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
            <Crosshair size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={refresh}
            style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Car Chips */}
      {positions.length > 0 && (
        <View style={{ position: 'absolute', top: 105, left: 0, right: 0, zIndex: 40 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
            {positions.map((p) => {
              const status = getStatus(p);
              const color = resolveCarColor(p.carColor) || STATUS_COLORS[status];
              const isSelected = selectedCar?.carId === p.carId;
              const isMoving = status === 'moving';
              return (
                <TouchableOpacity
                  key={String(p.carId)}
                  onPress={() => handleCarChipPress(p)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
                    backgroundColor: isSelected ? 'rgba(79,70,229,0.95)' : 'rgba(15,23,42,0.8)',
                    borderWidth: 1, borderColor: isSelected ? '#818cf8' : 'rgba(255,255,255,0.15)',
                  }}
                >
                  <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }} />
                  <Text style={{ fontSize: 9, fontWeight: '800', color: 'white', fontFamily: 'monospace' }} numberOfLines={1}>
                    {p.matricule || ''}
                  </Text>
                  {isMoving && (
                    <View style={{ backgroundColor: '#10b981', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 8, fontWeight: '900', color: 'white' }}>
                        {Math.round(p.speed || 0)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Map */}
      <View style={{ flex: 1 }}>
        {positions.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b' }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Navigation size={28} color="#475569" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#64748b' }}>Aucune position GPS</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#475569', marginTop: 4 }}>En attente de données...</Text>
            <TouchableOpacity onPress={refresh} style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#4f46e5', borderRadius: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: 1 }}>Actualiser</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            provider={PROVIDER_DEFAULT}
            mapType={mapType}
            initialRegion={initialRegion}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
            onPanDrag={onMapPress}
          >
            {positions.map((p) => (
              <CustomMarker
                key={String(p.carId)}
                position={p}
                status={getStatus(p)}
                color={resolveCarColor(p.carColor) || STATUS_COLORS[getStatus(p)]}
                isSelected={selectedCar?.carId === p.carId}
                onPress={() => handleMarkerPress(p)}
              />
            ))}
          </MapView>
        )}
      </View>

      {/* Bottom legend */}
      <View style={{
        position: 'absolute', bottom: selectedCar ? 108 : 16, left: 16, zIndex: 20,
        flexDirection: 'row', gap: 14, backgroundColor: 'rgba(15,23,42,0.85)',
        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
      }}>
        {[
          { c: '#10b981', l: 'En mouv.' },
          { c: '#ef4444', l: 'Garé' },
          { c: '#94a3b8', l: 'Inactif' },
        ].map(({ c, l }) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />
            <Text style={{ fontSize: 8, fontWeight: '800', color: 'rgba(255,255,255,0.6)' }}>{l}</Text>
          </View>
        ))}
      </View>

      {/* Car Bottom Sheet — draggable collapsed/expanded */}
      <CarBottomSheet
        visible={!!selectedCar}
        onClose={() => { setSelectedCar(null); setFollowCar(null); }}
        position={followedPos || selectedCar}
        kmEntry={selectedKm}
        status={selectedCar ? getStatus(followedPos || selectedCar) : 'inactive'}
      />
    </View>
  );
}
