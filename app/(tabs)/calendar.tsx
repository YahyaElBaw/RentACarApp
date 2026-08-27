import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { dashboardApi, contratApi, reservationApi } from '../../src/api';
import {
  CalendarDays,
  CalendarClock,
  CalendarCheck,
  Users,
  ChevronLeft,
  ChevronRight,
  Calendar,
  List,
  X,
  Car,
  Fuel,
  Banknote,
  FileText,
  Search,
  ArrowRight,
} from 'lucide-react-native';

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAYS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 12;
const GRID_GAP = 4;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 48 - GRID_PADDING * 2 - GRID_GAP * 6) / 7);

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function dateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function CalendarScreen() {
  const router = useRouter();
  const [actions, setActions] = useState<any[]>([]);
  const [contrats, setContrats] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'today' | 'month'>('today');
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [showClosure, setShowClosure] = useState(false);
  const [closureLoading, setClosureLoading] = useState(false);
  const [closureForm, setClosureForm] = useState({
    closureType: 'terminé',
    returnMileage: 0,
    carStateAtReturn: 'disponible',
      closureNotes: '',
  });

  const fetchData = async () => {
    try {
      const [dashData, contratsData, resData] = await Promise.all([
        dashboardApi.getStats(),
        contratApi.getAll(),
        reservationApi.getAll(),
      ]);
      setActions(dashData.todayActions || []);
      setContrats(contratsData || []);
      setReservations(resData || []);
    } catch (err) {
      console.error('Failed to fetch calendar data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const now = new Date();
  const departures = actions.filter((a) => a.type === 'départ').length;
  const returns = actions.filter((a) => a.type === 'retour').length;

  const formatTime = (date: string) => {
    try {
      return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const sorted = [...actions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const calendarEvents = useMemo(() => {
    const events: Record<string, { departures: number; returns: number }> = {};
    for (const c of contrats) {
      if (c.status === 'cancelled' || c.status === 'closed') continue;
      const sd = c.startDate ? new Date(c.startDate) : null;
      const ed = c.endDate ? new Date(c.endDate) : null;
      if (sd) {
        const k = sd.toISOString().split('T')[0];
        if (!events[k]) events[k] = { departures: 0, returns: 0 };
        events[k].departures++;
      }
      if (ed) {
        const k = ed.toISOString().split('T')[0];
        if (!events[k]) events[k] = { departures: 0, returns: 0 };
        events[k].returns++;
      }
    }
    for (const r of reservations) {
      if (r.status === 'cancelled' || r.status === 'confirmed') continue;
      const sd = r.startDate ? new Date(r.startDate) : null;
      const ed = r.endDate ? new Date(r.endDate) : null;
      if (sd) {
        const k = sd.toISOString().split('T')[0];
        if (!events[k]) events[k] = { departures: 0, returns: 0 };
        events[k].departures++;
      }
      if (ed) {
        const k = ed.toISOString().split('T')[0];
        if (!events[k]) events[k] = { departures: 0, returns: 0 };
        events[k].returns++;
      }
    }
    return events;
  }, [contrats, reservations]);

  const calDaysInMonth = getDaysInMonth(calYear, calMonth);
  const calFirstDay = getFirstDayOfMonth(calYear, calMonth);
  const todayStr = now.toISOString().split('T')[0];

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCalMonth(now.getMonth());
    setCalYear(now.getFullYear());
    setSelectedDay(now.getDate());
  };

  const selectedDayActions = useMemo(() => {
    if (selectedDay === null) return [];
    const key = dateKey(calYear, calMonth, selectedDay);
    const items: any[] = [];

    for (const c of contrats) {
      if (c.status === 'cancelled' || c.status === 'closed') continue;
      if (c.startDate && new Date(c.startDate).toISOString().split('T')[0] === key) {
        items.push({ type: 'départ', category: 'contrat', date: c.startDate, endDate: c.endDate, car: c.car, clients: c.clients, client: c.client, reference: c.reference, raw: c });
      }
      if (c.endDate && new Date(c.endDate).toISOString().split('T')[0] === key) {
        items.push({ type: 'retour', category: 'contrat', date: c.endDate, startDate: c.startDate, car: c.car, clients: c.clients, client: c.client, reference: c.reference, raw: c });
      }
    }
    for (const r of reservations) {
      if (r.status === 'cancelled' || r.status === 'confirmed') continue;
      if (r.startDate && new Date(r.startDate).toISOString().split('T')[0] === key) {
        items.push({ type: 'départ', category: 'réservation', date: r.startDate, endDate: r.endDate, car: r.car, clients: r.clients, client: r.client, reference: r.reference, raw: r });
      }
      if (r.endDate && new Date(r.endDate).toISOString().split('T')[0] === key) {
        items.push({ type: 'retour', category: 'réservation', date: r.endDate, startDate: r.startDate, car: r.car, clients: r.clients, client: r.client, reference: r.reference, raw: r });
      }
    }
    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [contrats, reservations, calMonth, calYear, selectedDay]);

  const openClosure = (action: any, raw: any) => {
    const car = raw.car || action.car || {};
    setClosureForm({
      closureType: 'terminé',
      returnMileage: raw.startMileage || car.mileage || 0,
      carStateAtReturn: 'disponible',
      closureNotes: '',
    });
    setSelectedAction({ ...action, raw });
    setShowClosure(true);
  };

  const ActionCard = ({ action, idx }: { action: any; idx: number }) => {
    const isDeparture = action.type === 'départ';
    const isReservation = action.category === 'réservation';
    const color = isReservation ? '#d97706' : isDeparture ? '#4f46e5' : '#0ea5e9';
    const bg = isReservation ? '#fffbeb' : isDeparture ? '#eef2ff' : '#f0f9ff';
    const clientList = action.clients || (action.client ? [action.client] : []);
    const raw = action.raw || {};
    const isRetourContrat = action.type === 'retour' && action.category === 'contrat';
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isFutureOrToday = new Date(action.date) >= todayStart;
    const canClose = isRetourContrat && isFutureOrToday && raw._id && raw.status !== 'closed' && raw.status !== 'cancelled';

    return (
      <TouchableOpacity
        onPress={() => {
          if (canClose) {
            openClosure(action, raw);
          } else {
            setSelectedAction(action);
          }
        }}
        activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
      >
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          {isDeparture ? <CalendarCheck size={18} color={color} strokeWidth={2.5} /> : <CalendarClock size={18} color={color} strokeWidth={2.5} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 9, fontWeight: '900', color, textTransform: 'uppercase', letterSpacing: 1 }}>{action.type}</Text>
            <Text style={{ fontSize: 9, fontWeight: '900', color: '#cbd5e1', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{action.category}</Text>
            {canClose && (
              <View style={{ marginLeft: 6, backgroundColor: '#fef2f2', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ fontSize: 8, fontWeight: '900', color: '#dc2626', textTransform: 'uppercase' }}>à clôturer</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 12, fontWeight: '900', color: '#0f172a', marginTop: 2, textTransform: 'uppercase' }}>
            {action.car?.brand} {action.car?.model}
            {action.car?.matricule ? <Text style={{ color: '#94a3b8' }}> · {action.car.matricule}</Text> : null}
          </Text>
          {clientList.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
              <Users size={10} color="#94a3b8" />
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', marginLeft: 4 }} numberOfLines={1}>
                {clientList.map((c: any) => `${c.firstName} ${c.lastName}`).join(', ')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderMonthView = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Month Navigation */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' }}>
          <TouchableOpacity onPress={prevMonth} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={18} color="#64748b" />
          </TouchableOpacity>
          <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1, minWidth: 130, textAlign: 'center' }}>
            {MONTHS_FR[calMonth]} {calYear}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={goToToday} style={{ height: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 10, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: 1 }}>Aujourd'hui</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar Card */}
      <View style={{ backgroundColor: 'white', borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, padding: GRID_PADDING, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {DAYS_SHORT.map((d, i) => (
            <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: i >= 5 ? '#ef4444' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{d}</Text>
            </View>
          ))}
        </View>

        {(() => {
          const totalCells = calFirstDay + calDaysInMonth;
          const totalRows = Math.ceil(totalCells / 7);
          const rows: React.ReactNode[] = [];

          for (let r = 0; r < totalRows; r++) {
            const cells: React.ReactNode[] = [];
            for (let c = 0; c < 7; c++) {
              const idx = r * 7 + c;
              const dayNum = idx - calFirstDay + 1;

              if (dayNum < 1 || dayNum > calDaysInMonth) {
                cells.push(<View key={`empty-${r}-${c}`} style={{ flex: 1 }} />);
                continue;
              }

              const key = dateKey(calYear, calMonth, dayNum);
              const isToday = key === todayStr;
              const isSelected = selectedDay === dayNum;
              const event = calendarEvents[key];
              const hasEvent = !!event;
              const isWeekend = c >= 5;

              cells.push(
                <TouchableOpacity
                  key={dayNum}
                  onPress={() => setSelectedDay(isSelected ? null : dayNum)}
                  activeOpacity={0.6}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 }}
                >
                  <View style={{
                    width: CELL_SIZE, height: CELL_SIZE, borderRadius: 14,
                    backgroundColor: isSelected ? '#4f46e5' : isToday ? '#eef2ff' : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: isToday && !isSelected ? 1.5 : 0,
                    borderColor: isToday && !isSelected ? '#4f46e5' : 'transparent',
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: isSelected ? 'white' : isToday ? '#4f46e5' : isWeekend ? '#ef4444' : '#0f172a' }}>
                      {dayNum}
                    </Text>
                    {hasEvent && (
                      <View style={{ flexDirection: 'row', gap: 3, marginTop: 3 }}>
                        {event.departures > 0 && <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: isSelected ? '#c7d2fe' : '#4f46e5' }} />}
                        {event.returns > 0 && <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: isSelected ? '#bae6fd' : '#0ea5e9' }} />}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }
            rows.push(<View key={`row-${r}`} style={{ flexDirection: 'row' }}>{cells}</View>);
          }
          return rows;
        })()}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16, paddingLeft: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4f46e5' }} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8' }}>Départ</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0ea5e9' }} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8' }}>Retour</Text>
        </View>
      </View>

      {/* Selected Day Actions */}
      {selectedDay !== null && (
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <CalendarDays size={14} color="#4f46e5" strokeWidth={2.5} />
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginLeft: 8 }}>
              {selectedDay} {MONTHS_FR[calMonth]} — {selectedDayActions.length} action{selectedDayActions.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {selectedDayActions.length === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 32, backgroundColor: '#f8fafc', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' }}>
              <CalendarCheck size={32} color="#cbd5e1" strokeWidth={1.5} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', marginTop: 10 }}>Aucune action ce jour</Text>
            </View>
          ) : (
            selectedDayActions.map((action, idx) => <ActionCard key={`${action.reference}-${idx}`} action={action} idx={idx} />)
          )}
        </View>
      )}

      {/* All Month Actions */}
      {!selectedDay && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <CalendarDays size={14} color="#4f46e5" strokeWidth={2.5} />
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginLeft: 8 }}>
              Toutes les actions du mois
            </Text>
          </View>
          {(() => {
            const allMonthActions: any[] = [];
            for (const c of contrats) {
              if (c.status === 'cancelled' || c.status === 'closed') continue;
              const sd = c.startDate ? new Date(c.startDate) : null;
              const ed = c.endDate ? new Date(c.endDate) : null;
              if (sd && sd.getMonth() === calMonth && sd.getFullYear() === calYear) {
                allMonthActions.push({ type: 'départ', category: 'contrat', date: c.startDate, car: c.car, client: c.client, clients: c.clients, clientName: c.clientName, reference: c.reference, raw: c });
              }
              if (ed && ed.getMonth() === calMonth && ed.getFullYear() === calYear) {
                allMonthActions.push({ type: 'retour', category: 'contrat', date: c.endDate, car: c.car, client: c.client, clients: c.clients, clientName: c.clientName, reference: c.reference, raw: c });
              }
            }
            for (const r of reservations) {
              if (r.status === 'cancelled' || r.status === 'confirmed') continue;
              const sd = r.startDate ? new Date(r.startDate) : null;
              const ed = r.endDate ? new Date(r.endDate) : null;
              if (sd && sd.getMonth() === calMonth && sd.getFullYear() === calYear) {
                allMonthActions.push({ type: 'départ', category: 'réservation', date: r.startDate, car: r.car, client: r.client, clients: r.clients, clientName: r.clientName, reference: r.reference, raw: r });
              }
              if (ed && ed.getMonth() === calMonth && ed.getFullYear() === calYear) {
                allMonthActions.push({ type: 'retour', category: 'réservation', date: r.endDate, car: r.car, client: r.client, clients: r.clients, clientName: r.clientName, reference: r.reference, raw: r });
              }
            }
            allMonthActions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            if (allMonthActions.length === 0) {
              return (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 32, backgroundColor: '#f8fafc', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' }}>
                  <CalendarCheck size={32} color="#cbd5e1" strokeWidth={1.5} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', marginTop: 10 }}>Aucune action ce mois</Text>
                </View>
              );
            }

            return allMonthActions.map((action, idx) => <ActionCard key={`${action.reference}-${idx}`} action={action} idx={idx} />);
          })()}
        </>
      )}

      {/* Disponibilité Button */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/availability')}
        activeOpacity={0.8}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#059669', borderRadius: 20, paddingVertical: 18, marginTop: 8, shadowColor: '#059669', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, gap: 10 }}
      >
        <Search size={20} color="white" strokeWidth={2.5} />
        <Text style={{ fontSize: 12, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: 2 }}>Disponibilité</Text>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 100, padding: 6 }}>
          <ArrowRight size={14} color="white" strokeWidth={3} />
        </View>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderTodayView = () => (
    <>
      {/* Date Card */}
      <View style={{ backgroundColor: '#4f46e5', borderRadius: 24, padding: 24, marginBottom: 24, shadowColor: '#4f46e5', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 48, fontWeight: '900', color: 'white' }}>{now.getDate()}</Text>
            <Text style={{ fontSize: 12, fontWeight: '900', color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 }}>{MONTHS_FR[now.getMonth()]} {now.getFullYear()}</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#a5b4fc', marginTop: 4 }}>{DAYS_FULL[now.getDay()]}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 8 }}>
              <CalendarCheck size={14} color="#6ee7b7" />
              <Text style={{ marginLeft: 10, color: 'white', fontWeight: '900', fontSize: 20 }}>{departures}</Text>
              <Text style={{ marginLeft: 6, fontSize: 9, fontWeight: '900', color: '#a7f3d0', textTransform: 'uppercase' }}>Départs</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 }}>
              <CalendarClock size={14} color="#93c5fd" />
              <Text style={{ marginLeft: 10, color: 'white', fontWeight: '900', fontSize: 20 }}>{returns}</Text>
              <Text style={{ marginLeft: 6, fontSize: 9, fontWeight: '900', color: '#bfdbfe', textTransform: 'uppercase' }}>Retours</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <CalendarDays size={14} color="#4f46e5" strokeWidth={2.5} />
          <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginLeft: 8 }}>
            {actions.length} action{actions.length > 1 ? 's' : ''} programmée{actions.length > 1 ? 's' : ''}
          </Text>
        </View>

        {sorted.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: '#f8fafc', borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9' }}>
            <CalendarCheck size={40} color="#cbd5e1" strokeWidth={1.5} />
            <Text style={{ marginTop: 12, fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2 }}>Aucune action aujourd'hui</Text>
          </View>
        ) : (
          sorted.map((action, idx) => {
            const isDeparture = action.type === 'départ';
            const isReturn = action.type === 'retour';
            const color = isDeparture ? '#4f46e5' : '#0ea5e9';
            const bg = isDeparture ? '#eef2ff' : '#f0f9ff';

            const handlePress = () => {
              const todayStart2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const isFutureOrToday = new Date(action.date) >= todayStart2;
              if (isReturn && action.category === 'contrat' && isFutureOrToday) {
                const matched = contrats.find((c: any) => {
                  if (c.status === 'cancelled' || c.status === 'closed') return false;
                  const matchCar = (c.car?._id || c.car) === (action.car?._id || action.car);
                  const matchDate = c.endDate && new Date(c.endDate).toISOString().split('T')[0] === new Date(action.date).toISOString().split('T')[0];
                  return matchCar && matchDate;
                });
                if (matched) {
                  openClosure(action, matched);
                  return;
                }
              }
              setSelectedAction(action);
            };

            return (
              <TouchableOpacity
                key={`${action.id}-${idx}`}
                onPress={handlePress}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  {isDeparture ? <CalendarCheck size={20} color={color} strokeWidth={2.5} /> : <CalendarClock size={20} color={color} strokeWidth={2.5} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, fontWeight: '900', color, textTransform: 'uppercase', letterSpacing: 1 }}>{action.type}</Text>
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#cbd5e1', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{action.category}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a', marginTop: 3, textTransform: 'uppercase' }}>
                    {action.car?.brand} {action.car?.model}
                    {action.car?.matricule ? <Text style={{ color: '#94a3b8' }}> · {action.car.matricule}</Text> : null}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                    <Users size={11} color="#94a3b8" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', marginLeft: 4 }}>{action.clientName}</Text>
                    {action.clientPhone ? <Text style={{ fontSize: 10, fontWeight: '700', color: '#4f46e5', marginLeft: 8 }}>{action.clientPhone}</Text> : null}
                  </View>
                </View>
                <View style={{ backgroundColor: bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '900', color }}>{formatTime(action.date)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Disponibilité Button */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/availability')}
          activeOpacity={0.8}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#059669', borderRadius: 20, paddingVertical: 18, marginTop: 8, shadowColor: '#059669', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, gap: 10 }}
        >
          <Search size={20} color="white" strokeWidth={2.5} />
          <Text style={{ fontSize: 12, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: 2 }}>Disponibilité</Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 100, padding: 6 }}>
            <ArrowRight size={14} color="white" strokeWidth={3} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </>
  );

  const fmtDateTime = (d: string) => {
    if (!d) return '—';
    const dt = new Date(d);
    return `${dt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}  ${dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const renderDetailModal = () => {
    if (!selectedAction || showClosure) return null;
    const a = selectedAction;
    const isDeparture = a.type === 'départ';
    const isReservation = a.category === 'réservation';
    const color = isReservation ? '#d97706' : isDeparture ? '#4f46e5' : '#0ea5e9';
    const bg = isReservation ? '#fffbeb' : isDeparture ? '#eef2ff' : '#f0f9ff';
    const clientList = a.clients || (a.client ? [a.client] : []);
    const raw = a.raw || {};
    const car = a.car || {};

    return (
      <Modal visible={true} transparent animationType="slide">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setSelectedAction(null)}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: '80%' }} onStartShouldSetResponder={() => true}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                  {isDeparture ? <CalendarCheck size={18} color={color} strokeWidth={2.5} /> : <CalendarClock size={18} color={color} strokeWidth={2.5} />}
                </View>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }}>{a.type} — {a.category}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 2 }}>{a.reference}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedAction(null)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              {/* Car */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Car size={14} color={color} />
                  <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginLeft: 6 }}>Véhicule</Text>
                </View>
                <View style={{ backgroundColor: bg, borderRadius: 16, padding: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }}>{car.brand} {car.model}</Text>
                  {car.matricule ? <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 4 }}>Matricule: {car.matricule}</Text> : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {car.color ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: car.color === 'Blanc' ? '#e2e8f0' : car.color === 'Noir' ? '#1e293b' : car.color === 'Gris' ? '#94a3b8' : '#4f46e5' }} />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>{car.color}</Text>
                      </View>
                    ) : null}
                    {car.fuelType ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 4 }}>
                        <Fuel size={10} color="#94a3b8" />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>{car.fuelType}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Dates */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Calendar size={14} color={color} />
                  <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginLeft: 6 }}>Dates</Text>
                </View>
                <View style={{ backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, gap: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4f46e5', marginTop: 4 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Départ</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a', marginTop: 2 }}>{fmtDateTime(a.startDate || a.date)}</Text>
                    </View>
                  </View>
                  <View style={{ height: 1, backgroundColor: '#e2e8f0', marginLeft: 20 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0ea5e9', marginTop: 4 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Retour</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a', marginTop: 2 }}>{fmtDateTime(a.endDate || a.date)}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Clients */}
              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Users size={14} color={color} />
                  <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginLeft: 6 }}>
                    Client{clientList.length > 1 ? 's' : ''} ({clientList.length})
                  </Text>
                </View>
                {clientList.length === 0 ? (
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#cbd5e1', marginLeft: 20 }}>Aucun client associé</Text>
                ) : (
                  clientList.map((c: any, i: number) => (
                    <View key={c._id || i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '900', color }}>{c.firstName?.[0]}{c.lastName?.[0]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a' }}>{c.firstName} {c.lastName}</Text>
                        {c.phone ? <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', marginTop: 2 }}>{c.phoneCountryCode || ''} {c.phone}</Text> : null}
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Financial */}
              {raw.totalAmount ? (
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Banknote size={14} color={color} />
                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginLeft: 6 }}>Tarification</Text>
                  </View>
                  <View style={{ backgroundColor: '#f8fafc', borderRadius: 16, padding: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Montant total</Text>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a' }}>{raw.totalAmount} TND</Text>
                    </View>
                    {raw.carDailyRate ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Tarif journalier</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>{raw.carDailyRate} TND/j</Text>
                      </View>
                    ) : null}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Statut paiement</Text>
                      <View style={{ backgroundColor: raw.isPaid ? '#dcfce7' : '#fef2f2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: raw.isPaid ? '#16a34a' : '#dc2626' }}>{raw.isPaid ? 'Payé' : 'Non payé'}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Notes */}
              {raw.notes ? (
                <View style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <FileText size={14} color={color} />
                    <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginLeft: 6 }}>Notes</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, lineHeight: 18 }}>{raw.notes}</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderClosureModal = () => (
    <Modal visible={showClosure} transparent animationType="slide">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => { setShowClosure(false); setSelectedAction(null); }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, maxHeight: '85%' }} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1 }}>Finaliser Location</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', marginTop: 2 }}>Bilan de retour véhicule</Text>
            </View>
            <TouchableOpacity onPress={() => { setShowClosure(false); setSelectedAction(null); }} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
            {/* Reference */}
            {selectedAction?.reference && (
              <View style={{ backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <FileText size={16} color="#4f46e5" />
                <View>
                  <Text style={{ fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Contrat</Text>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a', marginTop: 1 }}>{selectedAction.reference}</Text>
                </View>
              </View>
            )}

            {/* Closure Type */}
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, marginLeft: 4 }}>Type de retour</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
              <TouchableOpacity onPress={() => setClosureForm((p) => ({ ...p, closureType: 'terminé' }))} style={{ flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 2, borderColor: closureForm.closureType === 'terminé' ? '#10b981' : '#f1f5f9', backgroundColor: closureForm.closureType === 'terminé' ? '#ecfdf5' : 'white', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: closureForm.closureType === 'terminé' ? '#d1fae5' : '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <CalendarCheck size={18} color={closureForm.closureType === 'terminé' ? '#10b981' : '#94a3b8'} />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '900', color: closureForm.closureType === 'terminé' ? '#059669' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Retour Normal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setClosureForm((p) => ({ ...p, closureType: 'cloture_forcee' }))} style={{ flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 2, borderColor: closureForm.closureType === 'cloture_forcee' ? '#ef4444' : '#f1f5f9', backgroundColor: closureForm.closureType === 'cloture_forcee' ? '#fef2f2' : 'white', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: closureForm.closureType === 'cloture_forcee' ? '#fee2e2' : '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <CalendarClock size={18} color={closureForm.closureType === 'cloture_forcee' ? '#ef4444' : '#94a3b8'} />
                </View>
                <Text style={{ fontSize: 10, fontWeight: '900', color: closureForm.closureType === 'cloture_forcee' ? '#dc2626' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Clôture Forcée</Text>
              </TouchableOpacity>
            </View>

            {/* KM Retour */}
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, marginLeft: 4 }}>KM Retour</Text>
            <View style={{ backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#f1f5f9', paddingHorizontal: 16, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>KM Départ: {selectedAction?.raw?.startMileage || 0}</Text>
              <TextInput style={{ flex: 1, textAlign: 'right', fontSize: 16, fontWeight: '900', color: '#0f172a' }} keyboardType="numeric" value={String(closureForm.returnMileage)} onChangeText={(v) => setClosureForm((p) => ({ ...p, returnMileage: parseInt(v) || 0 }))} />
            </View>

            {/* État */}
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, marginLeft: 4 }}>État du véhicule</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
              <TouchableOpacity onPress={() => setClosureForm((p) => ({ ...p, carStateAtReturn: 'disponible' }))} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: closureForm.carStateAtReturn === 'disponible' ? '#10b981' : '#f1f5f9', backgroundColor: closureForm.carStateAtReturn === 'disponible' ? '#ecfdf5' : 'white', alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: closureForm.carStateAtReturn === 'disponible' ? '#059669' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Disponible</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setClosureForm((p) => ({ ...p, carStateAtReturn: 'panne' }))} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 2, borderColor: closureForm.carStateAtReturn === 'panne' ? '#ef4444' : '#f1f5f9', backgroundColor: closureForm.carStateAtReturn === 'panne' ? '#fef2f2' : 'white', alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: closureForm.carStateAtReturn === 'panne' ? '#dc2626' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>En Panne</Text>
              </TouchableOpacity>
            </View>

            {/* Notes */}
            <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, marginLeft: 4 }}>Observations</Text>
            <TextInput style={{ backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#f1f5f9', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, fontSize: 12, fontWeight: '700', color: '#0f172a', textAlignVertical: 'top', height: 80, marginBottom: 24 }} placeholder="Notes de clôture..." placeholderTextColor="#cbd5e1" multiline value={closureForm.closureNotes} onChangeText={(v) => setClosureForm((p) => ({ ...p, closureNotes: v }))} />

            {/* Submit */}
            <TouchableOpacity
              onPress={async () => {
                if (closureForm.returnMileage < (selectedAction?.raw?.startMileage || 0)) {
                  Alert.alert('Erreur', 'Le kilométrage retour ne peut pas être inférieur au kilométrage de départ.');
                  return;
                }
                setClosureLoading(true);
                try {
                  await contratApi.close(selectedAction.raw._id, closureForm);
                  Alert.alert('Succès', 'Contrat clôturé avec succès.', [
                    { text: 'OK', onPress: () => {
                      setShowClosure(false);
                      setSelectedAction(null);
                      fetchData();
                    }},
                  ]);
                } catch (err: any) {
                  const msg = err.response?.data?.message || 'Erreur lors de la clôture.';
                  Alert.alert('Erreur', Array.isArray(msg) ? msg.join(', ') : msg);
                } finally {
                  setClosureLoading(false);
                }
              }}
              disabled={closureLoading}
              style={{ backgroundColor: closureForm.closureType === 'terminé' ? '#10b981' : '#dc2626', borderRadius: 16, paddingVertical: 16, alignItems: 'center', opacity: closureLoading ? 0.6 : 1 }}
            >
              {closureLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ fontSize: 11, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: 2 }}>
                  {closureForm.closureType === 'terminé' ? 'Confirmer le retour' : 'Clôturer le contrat'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        {/* Header */}
        <View style={{ marginTop: 32, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 3, color: '#94a3b8' }}>
              {viewMode === 'today' ? 'Calendrier Quotidien' : 'Calendrier Mensuel'}
            </Text>
            <Text style={{ fontSize: 30, fontWeight: '900', letterSpacing: -1.5, color: '#0f172a', marginTop: 4 }}>
              {viewMode === 'today' ? (
                <>Actions <Text style={{ color: '#4f46e5' }}>du Jour</Text></>
              ) : (
                <>Agenda <Text style={{ color: '#4f46e5' }}>du Mois</Text></>
              )}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { setViewMode(viewMode === 'today' ? 'month' : 'today'); setSelectedDay(null); }}
            style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: viewMode === 'month' ? '#4f46e5' : '#f8fafc', borderWidth: 1, borderColor: viewMode === 'month' ? '#4f46e5' : '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginTop: 4, shadowColor: viewMode === 'month' ? '#4f46e5' : 'transparent', shadowOpacity: viewMode === 'month' ? 0.3 : 0, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
          >
            {viewMode === 'today' ? <Calendar size={22} color="#64748b" /> : <List size={22} color="white" />}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color="#4f46e5" size="large" />
          </View>
        ) : viewMode === 'today' ? (
          renderTodayView()
        ) : (
          renderMonthView()
        )}
      </View>

      {renderDetailModal()}
      {renderClosureModal()}
    </SafeAreaView>
  );
}
