import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useAuthStore } from '../../src/store/useAuthStore';
import { dashboardApi, authApi } from '../../src/api';
import { resolveCarColor } from '../../src/utils/carColor';
import {
  Users, Car, Calendar,
  TrendingUp, Wallet, Calculator,
  PlusCircle, FileText,   AlertTriangle,
  Bell, CircleAlert, Wrench, ShieldCheck,
  ChevronRight, Eye, EyeOff, X, MapPin, Navigation
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useGpsTracking } from '../../src/hooks/useGpsTracking';
import AlertToast from '../../src/components/AlertToast';
import DateInput from '../../src/components/DateInput';

const ALERT_CONFIG: Record<string, { color: string; bgColor: string; icon: any }> = {
  VIDANGE: { color: '#dc2626', bgColor: '#fef2f2', icon: Wrench },
  VISITE: { color: '#ea580c', bgColor: '#fff7ed', icon: ShieldCheck },
  ASSURANCE: { color: '#d97706', bgColor: '#fffbeb', icon: ShieldCheck },
  INCOMPLETE_CLIENT: { color: '#6366f1', bgColor: '#f5f3ff', icon: Users },
};

type Period = 'month' | 'prevMonth' | 'custom';

const buildRange = (period: Period, customFrom: string, customTo: string) => {
  const now = new Date();
  if (period === 'month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString(),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString(),
    };
  }
  if (period === 'prevMonth') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0).toISOString(),
      to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString(),
    };
  }
  return {
    from: customFrom ? new Date(`${customFrom}T00:00:00`).toISOString() : undefined,
    to: customTo ? new Date(`${customTo}T23:59:59`).toISOString() : undefined,
  };
};

export default function AdminDashboard() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [period, setPeriod] = useState<Period>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [profitVisible, setProfitVisible] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwdError, setPwdError] = useState(false);
  const [pwdServerError, setPwdServerError] = useState(false);
  const [showPwdText, setShowPwdText] = useState(false);
  const [pwdAction, setPwdAction] = useState<'profit' | 'alert'>('profit');
  const [pendingAlertKey, setPendingAlertKey] = useState<string | null>(null);
  const [reopenAlertsAfterPwd, setReopenAlertsAfterPwd] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);

  // Smart Converter (same as web "Convertisseur Intelligent")
  const [showConverter, setShowConverter] = useState(false);
  const [convAmount, setConvAmount] = useState('1000');
  const [convCurrency, setConvCurrency] = useState<'TND' | 'EUR' | 'USD'>('TND');
  const [convRates, setConvRates] = useState({ EUR: 0.296, USD: 0.342 });
  const [ratesLoading, setRatesLoading] = useState(false);

  // Live fleet tracking via shared hook (Socket.IO + 5s polling)
  const { positions, alerts: gpsAlerts, dismissAlert: dismissGpsAlert, getStatus } = useGpsTracking();

  const fetchStats = async (
    p: Period = period,
    cFrom: string = customFrom,
    cTo: string = customTo,
  ) => {
    try {
      const data = await dashboardApi.getStats(buildRange(p, cFrom, cTo));
      setStats(data);
    } catch (err) {
      console.error('Stats fetch failed', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(period); }, [period]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  const handleVerifyPwd = async () => {
    if (pwdBusy) return;
    if (pwdAction === 'alert' && !pendingAlertKey) return;
    setPwdBusy(true);
    try {
      if (pwdAction === 'profit') {
        const res = await authApi.verifyPassword(pwd);
        if (res?.valid) {
          setProfitVisible(true);
          setShowPwdModal(false);
          setPwd('');
          setPwdError(false);
          setPwdServerError(false);
        } else {
          setPwdError(true);
        }
      } else {
        await dashboardApi.dismissAlert(pendingAlertKey!, pwd);
        setShowPwdModal(false);
        const wasFromAlerts = reopenAlertsAfterPwd;
        setPendingAlertKey(null);
        setReopenAlertsAfterPwd(false);
        setPwd('');
        setPwdError(false);
        setPwdServerError(false);
        await fetchStats();
        if (wasFromAlerts) setShowAlerts(true);
      }
    } catch (e: any) {
      console.error('pwd action failed:', e?.response?.status, e?.response?.data, e?.message);
      if (e?.response?.status === 401 || e?.response?.data?.message === 'Mot de passe incorrect.') {
        setPwdError(true);
      } else {
        setPwdServerError(true);
      }
    } finally {
      setPwdBusy(false);
    }
  };

  const toggleProfit = () => {
    if (profitVisible) {
      setProfitVisible(false);
      return;
    }
    openPwdModal('profit');
  };

  const openPwdModal = (action: 'profit' | 'alert', alertKey?: string) => {
    setPwdAction(action);
    setPendingAlertKey(alertKey ?? null);
    setPwd('');
    setPwdError(false);
    setPwdServerError(false);
    setShowPwdText(false);
    setPwdBusy(false);
    if (action === 'alert') {
      setShowAlerts(false);
      setReopenAlertsAfterPwd(true);
    }
    setShowPwdModal(true);
  };

  const closePwdModal = () => {
    setShowPwdModal(false);
    if (pwdAction === 'alert') {
      setPendingAlertKey(null);
      if (reopenAlertsAfterPwd) {
        setReopenAlertsAfterPwd(false);
        setShowAlerts(true);
      }
    }
  };

  const fetchLiveRates = async () => {
    try {
      setRatesLoading(true);
      const res = await fetch('https://open.er-api.com/v6/latest/TND');
      const data = await res.json();
      if (data?.result === 'success' && data?.rates?.EUR && data?.rates?.USD) {
        setConvRates({ EUR: data.rates.EUR, USD: data.rates.USD });
      }
    } catch (err) {
      console.error('Failed to fetch live rates', err);
    } finally {
      setRatesLoading(false);
    }
  };

  const openConverter = () => {
    setShowConverter(true);
    fetchLiveRates();
  };

  const fmtMoney = (v: number) =>
    v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const fmtTime = (d: string | Date) => {
    const dt = new Date(d);
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:${String(dt.getSeconds()).padStart(2, '0')}`;
  };

  const tndBase = (() => {
    const amt = parseFloat(convAmount.replace(',', '.')) || 0;
    if (convCurrency === 'TND') return amt;
    if (convCurrency === 'EUR') return amt / convRates.EUR;
    return amt / convRates.USD;
  })();

  const convResults = [
    { label: 'TND', value: tndBase, symbol: 'TND' },
    { label: 'EUR', value: tndBase * convRates.EUR, symbol: '€' },
    { label: 'USD', value: tndBase * convRates.USD, symbol: '$' },
  ];

  const ActionCard = ({ icon: Icon, label, color, bgColor, onPress }: any) => (
    <TouchableOpacity 
      onPress={onPress}
      className="w-[45%] aspect-square rounded-[2.5rem] p-6 mb-6 shadow-sm border border-slate-100 items-center justify-center" 
      style={{ backgroundColor: bgColor }}
    >
       <View className="mb-3">
          <Icon size={28} color={color} strokeWidth={2.5} />
       </View>
       <Text className="text-[10px] font-black uppercase text-center tracking-widest" style={{ color: color }}>{label}</Text>
    </TouchableOpacity>
  );

  const alerts = stats?.alerts || [];
  const recentContracts = stats?.recentContracts || [];
  const unpaidContracts = recentContracts.filter((c: any) => c.isPaid === false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={{ marginTop: 32, marginBottom: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
           <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 3, color: '#94a3b8' }}>Panel d'Administration</Text>
              <Text style={{ fontSize: 30, fontWeight: '900', letterSpacing: -1.5, color: '#0f172a', marginTop: 4 }}>
                Hello, <Text style={{ color: '#4f46e5' }}>{user?.firstName}</Text> 👋
              </Text>
           </View>
           <TouchableOpacity
             onPress={() => setShowAlerts(true)}
             style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
           >
             <Bell size={22} color="#64748b" />
             {alerts.length > 0 && (
               <View style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }}>
                 <Text style={{ fontSize: 9, fontWeight: '900', color: 'white' }}>{alerts.length > 9 ? '9+' : alerts.length}</Text>
               </View>
             )}
           </TouchableOpacity>
        </View>

        {/* Period Filter */}
        {isAdmin && (
          <View className="flex-row items-center gap-2 mb-4">
            {([
              { key: 'month', label: 'Ce mois' },
              { key: 'prevMonth', label: 'Mois dernier' },
              { key: 'custom', label: 'Personnalisé' },
            ] as { key: Period; label: string }[]).map((p) => (
              <TouchableOpacity
                key={p.key}
                onPress={() => setPeriod(p.key)}
                className={`px-4 py-2 rounded-full border ${period === p.key ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-50 border-slate-100'}`}
              >
                <Text className={`text-[9px] font-black uppercase tracking-widest ${period === p.key ? 'text-white' : 'text-slate-400'}`}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {isAdmin && period === 'custom' && (
          <View className="flex-row items-center gap-2 mb-4">
            <DateInput value={customFrom} onChange={setCustomFrom} placeholder="Du" style={{ flex: 1 }} />
            <DateInput value={customTo} onChange={setCustomTo} placeholder="Au" style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={() => {
                if (customFrom && customTo) fetchStats('custom', customFrom, customTo);
              }}
              className={`px-5 py-3.5 rounded-xl ${customFrom && customTo ? 'bg-indigo-600' : 'bg-slate-100'}`}
            >
              <Text className={`text-[10px] font-black uppercase tracking-widest ${customFrom && customTo ? 'text-white' : 'text-slate-400'}`}>OK</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Grid */}
        <View className="flex-row justify-between mb-10">
           <View className="bg-indigo-600 rounded-3xl p-5 flex-1 mr-3 shadow-lg shadow-indigo-100">
              <Text className="text-[9px] font-black uppercase tracking-widest text-indigo-200 mb-1">Dispo</Text>
              <Text className="text-2xl font-black text-white">{stats?.kpis?.availableCars ?? 0} <Text className="text-xs opacity-50">VÉH.</Text></Text>
           </View>
           <View className={`bg-slate-50 border border-slate-100 rounded-3xl p-5 flex-1 shadow-sm ${isAdmin ? 'mr-3' : ''}`}>
              <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Louées</Text>
              <Text className="text-2xl font-black text-slate-900">{stats?.kpis?.rentedCars ?? 0} <Text className="text-xs opacity-50">VÉH.</Text></Text>
           </View>
           {isAdmin && (
             <View className="bg-slate-50 border border-slate-100 rounded-3xl p-5 flex-1 shadow-sm">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex-1" numberOfLines={1}>Bénéfice Net</Text>
                  <TouchableOpacity onPress={toggleProfit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    {profitVisible
                      ? <Eye size={14} color="#64748b" />
                      : <EyeOff size={14} color="#94a3b8" />}
                  </TouchableOpacity>
                </View>
                {profitVisible ? (
                  <Text className={`text-2xl font-black ${(stats?.kpis?.netProfit ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {(stats?.kpis?.netProfit ?? 0).toFixed(0)} <Text className="text-xs opacity-50">TND</Text>
                  </Text>
                ) : (
                  <Text className="text-2xl font-black text-slate-300 tracking-widest">••••••</Text>
                )}
             </View>
           )}
        </View>

        {/* Unpaid Bills */}
        {unpaidContracts.length > 0 && (
          <View className="mb-10">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2">
                <FileText size={16} color="#f59e0b" />
                <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Factures Impayées</Text>
              </View>
              <View className="bg-amber-500 px-2.5 py-0.5 rounded-full">
                <Text className="text-[10px] font-black text-white">{unpaidContracts.length}</Text>
              </View>
            </View>

            {unpaidContracts.slice(0, 3).map((contrat: any, i: number) => (
              <TouchableOpacity
                key={i}
                className="flex-row items-center bg-amber-50 rounded-2xl p-4 mb-3 border border-amber-100"
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-xl bg-amber-100 items-center justify-center mr-3">
                  <FileText size={18} color="#f59e0b" />
                </View>
                <View className="flex-1 mr-2">
                  <Text className="text-xs font-bold text-slate-900">
                    {contrat.reference}
                  </Text>
                  <Text className="text-[10px] font-bold text-slate-400 mt-0.5">
                    {contrat.client?.firstName} {contrat.client?.lastName}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-black text-amber-600">
                    {contrat.totalAmount?.toFixed(0)} TND
                  </Text>
                  <Text className="text-[10px] font-bold text-amber-400">
                    Non payé
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Actions Title */}
        <View className="mb-6">
           <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Gestion Prioritaire</Text>
        </View>

        {/* Actions Grid */}
        <View className="flex-row flex-wrap justify-between">
           <ActionCard
              icon={Calendar}
              label="Dispo"
              color="#10b981"
              bgColor="#ecfdf5"
              onPress={() => router.push('/(tabs)/availability')}
           />
           <ActionCard
              icon={Calculator}
              label="Convertisseur"
              color="#4f46e5"
              bgColor="#eef2ff"
              onPress={openConverter}
           />
        </View>

        {/* Suivi Flotte GPS */}
        <View className="mb-4 mt-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Suivi Flotte</Text>
            {positions.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/fleet-tracking')}
                className="flex-row items-center gap-1.5 bg-indigo-600 px-3 py-1.5 rounded-full"
              >
                <Navigation size={12} color="white" />
                <Text className="text-[9px] font-black uppercase tracking-widest text-white">Voir la carte</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {positions.length === 0 ? (
          <View style={{ borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', backgroundColor: '#f8fafc', paddingVertical: 40, alignItems: 'center' }}>
            <MapPin size={28} color="#cbd5e1" />
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#94a3b8', marginTop: 10 }}>
              Aucune position GPS pour le moment
            </Text>
          </View>
        ) : (
          (() => {
            const lats = positions.map((p) => p.lat);
            const lngs = positions.map((p) => p.lng);
            const minLat = Math.min(...lats), maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
            const region = {
              latitude: (minLat + maxLat) / 2,
              longitude: (minLng + maxLng) / 2,
              latitudeDelta: Math.max(0.04, (maxLat - minLat) * 1.8),
              longitudeDelta: Math.max(0.04, (maxLng - minLng) * 1.8),
            };
            return (
              <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' }}>
                <MapView style={{ width: '100%', height: 280 }} initialRegion={region}>
                  {positions.map((p) => {
                    const stale = Date.now() - new Date(p.positionAt).getTime() > 30 * 60 * 1000;
                    return (
                      <Marker
                        key={String(p.carId)}
                        coordinate={{ latitude: p.lat, longitude: p.lng }}
                        title={`${p.brand} ${p.model} — ${p.matricule}`}
                        description={`${Math.round(p.speed || 0)} km/h · vu à ${fmtTime(p.positionAt)}${stale ? ' (inactif)' : ''}`}
                        pinColor={(Date.now() - new Date(p.positionAt).getTime() > 30 * 60 * 1000)
                          ? '#94a3b8'
                          : (resolveCarColor(p.carColor) ?? (p.speed > 2 ? '#10b981' : '#ef4444'))}
                      />
                    );
                  })}
                </MapView>
                <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'white' }}>
                  {[
                    { c: '#ef4444', l: 'À l\'arrêt' },
                    { c: '#10b981', l: 'En mouvement' },
                    { c: '#94a3b8', l: 'Inactif >30min' },
                  ].map(({ c, l }) => (
                    <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748b' }}>{l}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()
        )}

        <View className="h-10" />
      </ScrollView>

      {/* GPS Alert Toast */}
      <AlertToast alerts={gpsAlerts} onDismiss={dismissGpsAlert} />

      {/* Alerts Modal */}
      <Modal visible={showAlerts} transparent animationType="slide">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowAlerts(false)}
        >
          <View
            style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 40 }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Bell size={18} color="#ef4444" />
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }}>Alertes</Text>
                {alerts.length > 0 && (
                  <View style={{ backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: '900', color: 'white' }}>{alerts.length}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowAlerts(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#94a3b8' }}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
              {alerts.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Bell size={32} color="#e2e8f0" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8', marginTop: 12 }}>Aucune alerte pour le moment</Text>
                </View>
              ) : (
                alerts.map((alert: any, i: number) => {
                  const config = ALERT_CONFIG[alert.code] || { color: '#64748b', bgColor: '#f8fafc', icon: AlertTriangle };
                  const Icon = config.icon;
                  return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9', backgroundColor: config.bgColor }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: `${config.color}12` }}>
                        <Icon size={18} color={config.color} />
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }} numberOfLines={2}>
                          {alert.message}
                        </Text>
                        {alert.carMatricule && (
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 2 }}>
                            {alert.carBrand} {alert.carModel} — {alert.carMatricule}
                          </Text>
                        )}
                      </View>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: `${config.color}12` }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: config.color, textTransform: 'uppercase' }}>
                          {alert.type === 'critique' ? 'Critique' : alert.type === 'urgent' ? 'Urgent' : 'Info'}
                        </Text>
                      </View>
                      {isAdmin && !!alert.key && (
                        <TouchableOpacity
                          onPress={() => openPwdModal('alert', alert.key)}
                          style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <X size={14} color="#94a3b8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Profit Password Modal */}
      <Modal visible={showPwdModal} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 32 }}
          activeOpacity={1}
          onPress={closePwdModal}
        >
          <View
            style={{ backgroundColor: 'white', borderRadius: 24, padding: 24 }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <EyeOff size={16} color="#4f46e5" />
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }}>
                Mot de passe requis
              </Text>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', marginBottom: 16 }}>
              {pwdAction === 'profit'
                ? 'Entrez votre mot de passe pour afficher le bénéfice net.'
                : "Entrez votre mot de passe pour supprimer cette notification."}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: pwdError ? '#ef4444' : '#f1f5f9',
                marginBottom: 8,
              }}
            >
              <TextInput
                value={pwd}
                onChangeText={(t) => { setPwd(t); setPwdError(false); setPwdServerError(false); }}
                placeholder="Mot de passe"
                secureTextEntry={!showPwdText}
                autoFocus
                onSubmitEditing={handleVerifyPwd}
                style={{
                  flex: 1,
                  height: 48,
                  paddingHorizontal: 16,
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#0f172a',
                }}
              />
              <TouchableOpacity
                onPress={() => setShowPwdText((v) => !v)}
                style={{ paddingHorizontal: 14, paddingVertical: 12 }}
              >
                {showPwdText
                  ? <EyeOff size={18} color="#94a3b8" />
                  : <Eye size={18} color="#64748b" />}
              </TouchableOpacity>
            </View>
            {pwdError && (
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Mot de passe incorrect
              </Text>
            )}
            {pwdServerError && (
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Erreur de connexion au serveur
              </Text>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
              <TouchableOpacity
                onPress={closePwdModal}
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#f8fafc' }}
              >
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleVerifyPwd}
                disabled={pwdBusy || !pwd}
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: pwdBusy || !pwd ? '#a5b4fc' : '#4f46e5' }}
              >
                <Text style={{ fontSize: 11, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {pwdBusy ? '...' : 'Valider'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Smart Converter Modal */}
      <Modal visible={showConverter} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 }}
            activeOpacity={1}
            onPress={() => setShowConverter(false)}
          >
          <View
            style={{ backgroundColor: 'white', borderRadius: 28, paddingBottom: 24 }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Calculator size={18} color="#4f46e5" />
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Convertisseur <Text style={{ color: '#4f46e5' }}>Intelligent</Text>
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' }} />
                  <Text style={{ fontSize: 8, fontWeight: '900', color: '#10b981', letterSpacing: 2 }}>LIVE</Text>
                </View>
                <TouchableOpacity onPress={() => setShowConverter(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, paddingHorizontal: 20, paddingTop: 10 }}>
              {ratesLoading ? 'Actualisation des cours...' : 'Cours du marché en temps réel'}
            </Text>

            <View style={{ flexDirection: 'row', marginHorizontal: 20, marginTop: 14, backgroundColor: '#f8fafc', borderRadius: 16, padding: 4 }}>
              {(['TND', 'EUR', 'USD'] as const).map((curr) => (
                <TouchableOpacity
                  key={curr}
                  onPress={() => setConvCurrency(curr)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: 'center',
                    backgroundColor: convCurrency === curr ? 'white' : 'transparent',
                    shadowColor: convCurrency === curr ? '#000' : 'transparent',
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: convCurrency === curr ? 2 : 0,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '900', letterSpacing: 2, color: convCurrency === curr ? '#4f46e5' : '#94a3b8' }}>{curr}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={convAmount}
              onChangeText={(t) => setConvAmount(t.replace(/[^0-9.,]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="Montant"
              style={{
                marginHorizontal: 20,
                marginTop: 16,
                height: 72,
                backgroundColor: '#f8fafc',
                borderRadius: 24,
                borderWidth: 1,
                borderColor: '#f1f5f9',
                textAlign: 'center',
                fontSize: 32,
                fontWeight: '900',
                color: '#0f172a',
              }}
            />

            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 16 }}>
              {convResults.map((res) => {
                const active = res.label === convCurrency;
                return (
                  <View
                    key={res.label}
                    style={{
                      flex: 1,
                      paddingVertical: 18,
                      borderRadius: 20,
                      borderWidth: 2,
                      borderColor: active ? '#4f46e5' : '#f1f5f9',
                      backgroundColor: active ? '#4f46e5' : 'white',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, color: active ? '#c7d2fe' : '#94a3b8' }}>
                      {res.label}
                    </Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 15, fontWeight: '900', color: active ? 'white' : '#0f172a' }}>
                      {fmtMoney(res.value)} <Text style={{ fontSize: 10, opacity: 0.6 }}>{res.symbol}</Text>
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
