import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSpectatorStore } from '../../src/store/useSpectatorStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useRouter } from 'expo-router';
import {
  Radio,
  Wifi,
  Activity,
  Users,
  Shield,
  Clock,
  RefreshCw,
  Trash2,
  TrendingUp,
  Wallet,
  Car,
  CalendarCheck,
  FileText,
  MonitorPlay,
  LogOut,
  Smartphone,
  Monitor,
} from 'lucide-react-native';

type Segment = 'live' | 'online' | 'stats';

const SEGMENTS: { key: Segment; label: string; icon: any }[] = [
  { key: 'live', label: 'En Direct', icon: Radio },
  { key: 'online', label: 'En Ligne', icon: Users },
  { key: 'stats', label: 'Stats', icon: Activity },
];

const EVENT_ICONS: Record<string, any> = {
  'contract:change': FileText,
  'reservation:change': CalendarCheck,
  'car:change': Car,
  'depense:change': Wallet,
  'user:login': Users,
  'user:logout': Users,
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

export default function SpectatorScreen() {
  const { connected, events, onlineUsers, onlineCount, stats, statsLoading, connect, disconnect, clearEvents, refreshOnline, refreshStats } = useSpectatorStore();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [segment, setSegment] = useState<Segment>('live');
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = async () => {
    disconnect();
    await logout();
    router.replace('/login');
  };

  useEffect(() => {
    connect();
    const statsTimer = setInterval(() => refreshStats(), 30_000);
    const onlineTimer = setInterval(() => refreshOnline(), 30_000);
    return () => {
      clearInterval(statsTimer);
      clearInterval(onlineTimer);
      disconnect();
    };
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Promise.all([refreshStats(), refreshOnline()]).finally(() => setRefreshing(false));
  }, []);

  const kpis = stats?.kpis || {};
  const todayActions = stats?.todayActions || [];
  const alerts = stats?.alerts || [];

  const statCards = [
    { label: 'Recettes Mois', value: `${(kpis.totalRevenue ?? 0).toFixed(0)}`, unit: 'TND', color: '#4f46e5', bg: '#eef2ff', icon: TrendingUp },
    { label: 'Contrats Actifs', value: `${kpis.activeContrats ?? 0}`, unit: '', color: '#0ea5e9', bg: '#f0f9ff', icon: FileText },
    { label: 'Véhicules Loués', value: `${kpis.rentedCars ?? 0}`, unit: '/', total: kpis.totalCars ?? 0, color: '#f59e0b', bg: '#fffbeb', icon: Car },
    { label: 'Dépenses', value: `${(kpis.totalExpenses ?? 0).toFixed(0)}`, unit: 'TND', color: '#e11d48', bg: '#fff1f2', icon: Wallet },
  ];

  const SegmentTab = ({ seg }: { seg: typeof SEGMENTS[number] }) => {
    const active = segment === seg.key;
    const Icon = seg.icon;
    return (
      <TouchableOpacity
        onPress={() => setSegment(seg.key)}
        className="flex-1 flex-row items-center justify-center py-3 rounded-2xl"
        style={{ backgroundColor: active ? '#4f46e5' : 'transparent' }}
      >
        <Icon size={14} color={active ? 'white' : '#94a3b8'} strokeWidth={active ? 3 : 2} />
        <Text
          className="ml-2 text-[10px] font-black uppercase tracking-widest"
          style={{ color: active ? 'white' : '#94a3b8' }}
        >
          {seg.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        {/* Header */}
        <View style={{ marginTop: 32, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <MonitorPlay size={22} color="white" strokeWidth={2.5} />
              </View>
              <View>
                <Text style={{ fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 3, color: '#94a3b8' }}>Mode Spectateur</Text>
                <Text style={{ fontSize: 24, fontWeight: '900', letterSpacing: -1.5, color: '#0f172a', marginTop: 2 }}>
                  Surveillance <Text style={{ color: '#4f46e5' }}>Agence</Text>
                </Text>
              </View>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: connected ? '#ecfdf5' : '#fff1f2',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 100,
                borderWidth: 1,
                borderColor: connected ? '#a7f3d0' : '#ffe4e6',
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: connected ? '#10b981' : '#ef4444',
                  marginRight: 6,
                }}
              />
              <Text
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: connected ? '#059669' : '#e11d48' }}
              >
                {connected ? 'Live' : 'Hors Ligne'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleLogout}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginLeft: 10, width: 40, height: 40, borderRadius: 14, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffe4e6' }}
            >
              <LogOut size={18} color="#e11d48" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Segment Tabs */}
        <View className="flex-row bg-slate-50 border border-slate-100 rounded-2xl p-1 mb-6">
          {SEGMENTS.map((seg) => (
            <SegmentTab key={seg.key} seg={seg} />
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {segment === 'live' && (
            <View>
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Radio size={14} color="#4f46e5" strokeWidth={2.5} />
                  <Text className="ml-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Flux d'événements</Text>
                </View>
                {events.length > 0 && (
                  <TouchableOpacity onPress={clearEvents} className="flex-row items-center">
                    <Trash2 size={13} color="#cbd5e1" />
                    <Text className="ml-1 text-[9px] font-black uppercase tracking-widest text-slate-300">Effacer</Text>
                  </TouchableOpacity>
                )}
              </View>

              {events.length === 0 ? (
                <View className="items-center justify-center py-24 bg-slate-50 border border-slate-100 rounded-[2rem]">
                  <Activity size={40} color="#cbd5e1" strokeWidth={1.5} />
                  <Text className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400 text-center">
                    {connected ? "En attente d'événements..." : 'Connexion en cours...'}
                  </Text>
                </View>
              ) : (
                events.map((evt) => {
                  const color = evt.event.includes('contract') ? '#4f46e5' :
                    evt.event.includes('reservation') ? '#10b981' :
                      evt.event.includes('car') ? '#f59e0b' :
                        evt.event.includes('depense') ? '#e11d48' :
                          evt.event.includes('logout') ? '#64748b' : '#0ea5e9';
                  const bg = evt.event.includes('contract') ? '#eef2ff' :
                    evt.event.includes('reservation') ? '#ecfdf5' :
                      evt.event.includes('car') ? '#fffbeb' :
                        evt.event.includes('depense') ? '#fff1f2' :
                          evt.event.includes('logout') ? '#f8fafc' : '#f0f9ff';
                  const Icon = EVENT_ICONS[evt.event] || Activity;
                  return (
                    <View key={evt.id} className="bg-white border border-slate-100 rounded-[1.75rem] p-5 mb-4 shadow-sm flex-row">
                      <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                        <Icon size={20} color={color} strokeWidth={2.5} />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
                            {evt.label}
                          </Text>
                          <View className="flex-row items-center">
                            <Clock size={10} color="#cbd5e1" />
                            <Text className="ml-1 text-[9px] font-black text-slate-300 tabular-nums">{formatTime(evt.timestamp)}</Text>
                          </View>
                        </View>
                        <Text className="text-sm font-black text-slate-900 mt-1.5">{evt.action}</Text>
                        {evt.detail ? (
                          <Text className="text-xs font-bold text-slate-400 mt-1">{evt.detail}</Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {segment === 'online' && (
            <View>
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Wifi size={14} color="#10b981" strokeWidth={2.5} />
                  <Text className="ml-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Personnel en ligne ({onlineCount})
                  </Text>
                </View>
                <TouchableOpacity onPress={refreshOnline} className="p-2">
                  <RefreshCw size={15} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {onlineUsers.length === 0 ? (
                <View className="items-center justify-center py-24 bg-slate-50 border border-slate-100 rounded-[2rem]">
                  <Users size={40} color="#cbd5e1" strokeWidth={1.5} />
                  <Text className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">
                    Aucun utilisateur en ligne
                  </Text>
                </View>
              ) : (
                onlineUsers.map((u, idx) => (
                  <View key={`${u.userId}-${idx}`} className="bg-white border border-slate-100 rounded-[2rem] p-5 mb-4 shadow-sm flex-row items-center">
                    <View className="w-12 h-12 bg-emerald-50 rounded-2xl items-center justify-center mr-4 border border-emerald-100">
                      <Text className="text-emerald-600 font-black text-base">
                        {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-black text-slate-900 uppercase tracking-tight">{u.name}</Text>
                      <View className="flex-row items-center mt-1">
                        <Shield size={11} color="#94a3b8" />
                        <Text className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{u.role}</Text>
                      </View>
                    </View>
                    <View className="items-end mr-3">
                      <View className="flex-row items-center bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1 mb-1.5">
                        {(u.devices && u.devices.length ? u.devices : [u.device || 'pc']).map(
                          (d, di) => (
                            <View key={`${d}-${di}`} className="flex-row items-center">
                              {di > 0 ? <Text className="mx-1 text-[8px] text-emerald-400">·</Text> : null}
                              {d === 'phone' ? (
                                <Smartphone size={11} color="#059669" strokeWidth={2.5} />
                              ) : (
                                <Monitor size={11} color="#059669" strokeWidth={2.5} />
                              )}
                              <Text className="ml-1 text-[8px] font-black uppercase tracking-widest text-emerald-600">
                                {d === 'phone' ? 'Tél' : 'PC'}
                              </Text>
                            </View>
                          ),
                        )}
                      </View>
                      <View
                        style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981' }}
                      />
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {segment === 'stats' && (
            <View>
              {statsLoading && !stats ? (
                <View className="items-center justify-center py-24">
                  <ActivityIndicator color="#4f46e5" />
                </View>
              ) : (
                <View>
                  <View className="flex-row flex-wrap justify-between">
                    {statCards.map((card) => {
                      const Icon = card.icon;
                      return (
                        <View
                          key={card.label}
                          className="w-[48%] rounded-[2rem] p-5 mb-4 border"
                          style={{ backgroundColor: card.bg, borderColor: card.bg }}
                        >
                          <Icon size={20} color={card.color} strokeWidth={2.5} />
                          <Text className="mt-3 text-[9px] font-black uppercase tracking-widest text-slate-400">{card.label}</Text>
                          <Text className="mt-1 text-2xl font-black" style={{ color: card.color }}>
                            {card.value}
                            {card.total !== undefined ? <Text className="text-xs opacity-50">/{card.total}</Text> : null}
                            {card.unit ? <Text className="text-xs opacity-50"> {card.unit}</Text> : null}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <Text className="mt-2 mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Actions du jour ({todayActions.length})
                  </Text>
                  {todayActions.length === 0 ? (
                    <View className="items-center justify-center py-10 bg-slate-50 border border-slate-100 rounded-[2rem]">
                      <Text className="text-xs font-black uppercase tracking-widest text-slate-400">Aucune action aujourd'hui</Text>
                    </View>
                  ) : (
                    todayActions.map((action: any, idx: number) => (
                      <View key={`${action.id}-${idx}`} className="flex-row items-center bg-white border border-slate-100 rounded-3xl p-5 mb-3 shadow-sm">
                        <View
                          style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14,
                            backgroundColor: action.type === 'départ' ? '#eef2ff' : '#f0f9ff' }}
                        >
                          <CalendarCheck size={18} color={action.type === 'départ' ? '#4f46e5' : '#0ea5e9'} strokeWidth={2.5} />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center">
                            <Text className="text-[9px] font-black uppercase tracking-widest" style={{ color: action.type === 'départ' ? '#4f46e5' : '#0ea5e9' }}>
                              {action.type}
                            </Text>
                            <Text className="ml-2 text-[9px] font-black uppercase tracking-widest text-slate-300">{action.category}</Text>
                          </View>
                          <Text className="text-sm font-black text-slate-900 mt-1 uppercase">
                            {action.car?.brand} {action.car?.model}
                          </Text>
                          <Text className="text-[11px] font-bold text-slate-400 mt-0.5">{action.clientName}</Text>
                        </View>
                        <Clock size={14} color="#cbd5e1" />
                      </View>
                    ))
                  )}

                  <Text className="mt-4 mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Alertes ({alerts.length})
                  </Text>
                  {alerts.length === 0 ? (
                    <View className="items-center justify-center py-10 bg-slate-50 border border-slate-100 rounded-[2rem] mb-8">
                      <Text className="text-xs font-black uppercase tracking-widest text-slate-400">Aucune alerte</Text>
                    </View>
                  ) : (
                    alerts.map((alert: any, idx: number) => (
                      <View key={`${alert.code}-${idx}`} className="bg-amber-50 border border-amber-100 rounded-3xl p-5 mb-3 shadow-sm">
                        <View className="flex-row items-center">
                          <Text className="text-[9px] font-black uppercase tracking-widest text-amber-600">{alert.code}</Text>
                          {alert.type === 'critique' ? (
                            <Text className="ml-2 text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Critique</Text>
                          ) : null}
                        </View>
                        <Text className="text-xs font-bold text-slate-600 mt-2">{alert.message}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          )}

          <View className="h-20" />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
