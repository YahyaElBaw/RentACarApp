import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, ActivityIndicator,
  Image, Alert, StyleSheet, Modal,
} from 'react-native';
import {
  Clock, Search, Car as CarIcon,
  CheckCircle2, X,
  ArrowRight, ChevronLeft, UserPlus, ChevronDown, Check,
} from 'lucide-react-native';
import { carApi, reservationApi, contratApi, clientApi } from '../../src/api';
import { getServerUrl } from '../../src/utils/serverDiscovery';
import { useRouter } from 'expo-router';
import DateInput from '../../src/components/DateInput';
import TimeInput from '../../src/components/TimeInput';

const C = {
  indigo: '#4f46e5',
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate800: '#1e293b',
  slate900: '#0f172a',
  white: '#ffffff',
};

const COUNTRY_CODES = [
  { label: '+216', value: '+216' },
  { label: '+33', value: '+33' },
  { label: '+39', value: '+39' },
  { label: '+49', value: '+49' },
  { label: '+34', value: '+34' },
  { label: '+1', value: '+1' },
  { label: '+44', value: '+44' },
  { label: '+212', value: '+212' },
  { label: '+213', value: '+213' },
  { label: '+966', value: '+966' },
  { label: '+971', value: '+971' },
  { label: '+218', value: '+218' },
];

export default function AvailabilityScreen() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [days, setDays] = useState('1');

  const [availableCars, setAvailableCars] = useState<any[]>([]);
  const [selectedCar, setSelectedCar] = useState<any>(null);
  const [carQuery, setCarQuery] = useState('');

  const [clients, setClients] = useState<any[]>([]);
  const [clientQuery, setClientQuery] = useState('');
  const [selectedClients, setSelectedClients] = useState<any[]>([]);
  const [searchingClients, setSearchingClients] = useState(false);

  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    firstName: '',
    lastName: '',
    phoneCountryCode: '+216',
    phone: '',
    cin: '',
  });
  const [creatingClient, setCreatingClient] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const getImageUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const baseUrl = getServerUrl();
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBase}/${path.startsWith('/') ? path.slice(1) : path}`;
  };

  const searchAvailability = async () => {
    setLoading(true);
    try {
      const searchStart = new Date(`${startDate}T${startTime}:00`);
      const searchEnd = new Date(searchStart.getTime() + parseInt(days) * 24 * 60 * 60 * 1000);

      const [allCars, allRes, allContrats] = await Promise.all([
        carApi.getAll(),
        reservationApi.getAll(),
        contratApi.getAll(),
      ]);

      const occupations = [
        ...allRes.map((r: any) => ({ ...r, type: 'reservation' })),
        ...allContrats.map((c: any) => ({ ...c, type: 'contract' })),
      ].filter((occ: any) => occ.status !== 'cancelled' && occ.status !== 'closed');

      const filtered = allCars.filter((car: any) => {
        const carOccupations = occupations.filter(
          (occ: any) => occ.car?._id === car._id || occ.car === car._id,
        );
        const overlapping = carOccupations.filter((occ) => {
          const occStart = new Date(occ.startDate);
          const occEnd = new Date(occ.endDate);
          return occStart < searchEnd && occEnd > searchStart;
        });
        return overlapping.length === 0;
      });

      setAvailableCars(filtered);
    } catch (err) {
      console.error('Search failed', err);
      Alert.alert('Erreur', 'Impossible de vérifier la disponibilité.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchAvailability();
  }, [startDate, startTime, days]);

  const fetchClients = async () => {
    setSearchingClients(true);
    try {
      const data = await clientApi.getAll({ search: clientQuery });
      setClients(data);
    } catch (err) {
      console.error('Client fetch failed', err);
    } finally {
      setSearchingClients(false);
    }
  };

  useEffect(() => {
    if (step === 1) fetchClients();
  }, [step, clientQuery]);

  const toggleClientSelection = (client: any) => {
    const isSelected = selectedClients.some((c) => c._id === client._id);
    if (isSelected) {
      setSelectedClients(selectedClients.filter((c) => c._id !== client._id));
    } else {
      if (selectedClients.length >= 2) return;
      setSelectedClients([...selectedClients, client]);
    }
  };

  const createNewClient = async () => {
    if (
      !newClientForm.firstName.trim() ||
      !newClientForm.lastName.trim() ||
      !newClientForm.phone.trim()
    ) {
      Alert.alert('Erreur', 'Le prénom, le nom et le téléphone sont requis.');
      return;
    }
    setCreatingClient(true);
    try {
      const payload: any = {
        firstName: newClientForm.firstName.trim(),
        lastName: newClientForm.lastName.trim(),
        phoneCountryCode: newClientForm.phoneCountryCode,
        phone: newClientForm.phone.trim(),
      };
      if (newClientForm.cin.trim()) payload.cin = newClientForm.cin.trim();
      const created = await clientApi.create(payload);
      if (selectedClients.length < 2) {
        setSelectedClients([...selectedClients, created]);
      }
      setShowNewClient(false);
      setNewClientForm({
        firstName: '',
        lastName: '',
        phoneCountryCode: '+216',
        phone: '',
        cin: '',
      });
      fetchClients();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erreur lors de la création.';
      Alert.alert('Erreur', Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setCreatingClient(false);
    }
  };

  const createReservation = async () => {
    if (selectedClients.length === 0) return;
    setLoading(true);
    try {
      const startIso = `${startDate}T${startTime}:00`;
      const end = new Date(new Date(startIso).getTime() + parseInt(days) * 24 * 60 * 60 * 1000);

      await reservationApi.create({
        startDate: startIso,
        endDate: end.toISOString(),
        car: selectedCar._id,
        clients: selectedClients.map((c) => c._id),
        totalAmount: (selectedCar.dailyRate || 0) * parseInt(days),
        status: 'pending',
      });

      Alert.alert('Succès', 'La réservation a été créée avec succès.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/reservation') },
      ]);
    } catch (err) {
      console.error('Reservation failed', err);
      Alert.alert('Erreur', 'Échec de la création de la réservation.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCars = availableCars.filter(
    (car) =>
      !carQuery ||
      `${car.brand} ${car.model} ${car.matricule}`.toLowerCase().includes(carQuery.toLowerCase()),
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          {step > 0 && (
            <TouchableOpacity onPress={() => setStep(0)} style={{ marginRight: 16 }}>
              <ChevronLeft size={24} color={C.slate900} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={s.headerLabel}>Planificateur</Text>
            <Text style={s.headerTitle}>
              Disponi<Text style={{ color: C.indigo }}>bilité</Text>
            </Text>
          </View>
        </View>

        {step === 0 ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Search Controls */}
            <View style={s.searchCard}>
              <View style={s.searchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Date</Text>
                  <DateInput value={startDate} onChange={setStartDate} placeholder="Sélectionnez une date" />
                </View>
                <View style={{ width: 96 }}>
                  <Text style={s.fieldLabel}>Heure</Text>
                  <TimeInput value={startTime} onChange={setStartTime} />
                </View>
              </View>

              <View>
                <Text style={s.fieldLabel}>Durée (Jours)</Text>
                <View style={s.inputBox}>
                  <TextInput
                    value={days}
                    onChangeText={setDays}
                    keyboardType="numeric"
                    style={s.inputText}
                  />
                </View>
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={s.fieldLabel}>Date de Retour</Text>
                <View style={[s.inputBox, { backgroundColor: C.slate100, opacity: 0.7 }]}>
                  <TextInput
                    value={(() => {
                      const end = new Date(new Date(startDate).getTime() + parseInt(days || '1') * 24 * 60 * 60 * 1000);
                      const y = end.getFullYear();
                      const m = String(end.getMonth() + 1).padStart(2, '0');
                      const d = String(end.getDate()).padStart(2, '0');
                      return `${y}-${m}-${d}`;
                    })()}
                    editable={false}
                    style={[s.inputText, { color: C.slate500 }]}
                  />
                </View>
              </View>
            </View>

            {/* Results Header */}
            <View style={s.resultsHeader}>
              <Text style={s.resultsHeaderText}>Véhicules Libres ({filteredCars.length})</Text>
              {loading && <ActivityIndicator size="small" color={C.indigo} />}
            </View>

            {/* Car List */}
            {filteredCars.map((car) => {
              const isSelected = selectedCar?._id === car._id;
              return (
                <TouchableOpacity
                  key={car._id}
                  onPress={() => setSelectedCar(car)}
                  activeOpacity={0.7}
                  style={[s.carCard, isSelected && s.carCardSelected]}
                >
                  <View style={s.carImageBox}>
                    {car.images?.[0] ? (
                      <Image
                        source={{ uri: getImageUrl(car.images?.[0]) || undefined }}
                        style={s.carImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <CarIcon size={24} color="#cbd5e1" />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={s.carTitle}>
                      {car.brand} {car.model}
                    </Text>
                    <Text style={s.carMatricule}>{car.matricule}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.carPrice}>{car.dailyRate || car.dailyPrice} TND</Text>
                    <Text style={s.carPriceLabel}>/ Jour</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {selectedCar && (
              <TouchableOpacity
                onPress={() => setStep(1)}
                activeOpacity={0.8}
                style={s.nextBtn}
              >
                <Text style={s.nextBtnText}>Assigner Client</Text>
                <ArrowRight size={18} color="white" />
              </TouchableOpacity>
            )}

            <View style={{ height: 80 }} />
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Client Search + New Client Button */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 32, alignItems: 'center' }}>
              <View style={[s.clientSearchWrap, { flex: 1, marginBottom: 0 }]}>
                <View style={s.clientSearchIcon}>
                  <Search size={18} color={C.slate400} />
                </View>
                <TextInput
                  placeholder="Nom, Prénom ou CIN..."
                  placeholderTextColor="#cbd5e1"
                  value={clientQuery}
                  onChangeText={setClientQuery}
                  style={s.clientSearchInput}
                />
                {searchingClients && (
                  <View style={s.clientSearchSpinner}>
                    <ActivityIndicator size="small" color={C.indigo} />
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setShowNewClient(true)}
                activeOpacity={0.8}
                style={s.newClientBtn}
              >
                <UserPlus size={20} color="white" />
              </TouchableOpacity>
            </View>

            {/* Selected Clients */}
            {selectedClients.length > 0 && (
              <View style={{ marginBottom: 32 }}>
                <Text style={s.sectionLabel}>Conducteurs Sélectionnés</Text>
                <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                  {selectedClients.map((client) => (
                    <TouchableOpacity
                      key={client._id}
                      onPress={() => toggleClientSelection(client)}
                      style={s.selectedChip}
                    >
                      <Text style={s.selectedChipText}>
                        {client.firstName} {client.lastName}
                      </Text>
                      <X size={12} color="white" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Client List */}
            {clients.map((client) => {
              const isSel = selectedClients.some((c) => c._id === client._id);
              return (
                <TouchableOpacity
                  key={client._id}
                  onPress={() => toggleClientSelection(client)}
                  activeOpacity={0.7}
                  style={[s.clientCard, isSel && s.clientCardSelected]}
                >
                  <View style={[s.clientAvatar, isSel && s.clientAvatarSelected]}>
                    <Text style={[s.clientAvatarText, isSel && s.clientAvatarTextSelected]}>
                      {client.firstName?.[0]}
                      {client.lastName?.[0]}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.clientName}>
                      {client.firstName} {client.lastName}
                    </Text>
                    {client.cin ? (
                      <Text style={s.clientCin}>CIN: {client.cin}</Text>
                    ) : null}
                  </View>
                  {isSel && <CheckCircle2 size={20} color={C.indigo} />}
                </TouchableOpacity>
              );
            })}

            {/* Summary Card */}
            {selectedClients.length > 0 && (
              <View style={s.summaryCard}>
                <View style={{ marginBottom: 24 }}>
                  <Text style={s.summaryLabel}>Résumé Dossier</Text>
                  <Text style={s.summaryTitle}>
                    {selectedCar.brand} {selectedCar.model}
                  </Text>
                </View>

                <View style={s.summaryRow}>
                  <Text style={s.summaryRowLabel}>Durée</Text>
                  <Text style={s.summaryRowValue}>{days} Jours</Text>
                </View>

                <View style={s.summaryDivider} />

                <View style={[s.summaryRow, { alignItems: 'flex-end' }]}>
                  <Text style={s.summaryTotalLabel}>Total Net</Text>
                  <Text style={s.summaryTotalValue}>
                    {(selectedCar.dailyRate || 0) * parseInt(days)} TND
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={createReservation}
                  disabled={loading}
                  style={[s.confirmBtn, loading && { opacity: 0.6 }]}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <CheckCircle2 size={20} color="white" />
                      <Text style={s.confirmBtnText}>Confirmer la Réservation</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </View>

      {/* New Client Modal */}
      <Modal visible={showNewClient} transparent animationType="slide">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowNewClient(false)}
        >
          <View
            style={s.modalContent}
            onStartShouldSetResponder={() => true}
          >
            {/* Header */}
            <View style={s.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={18} color={C.indigo} />
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: C.slate900, textTransform: 'uppercase', letterSpacing: 1 }}>Nouveau Client</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: C.slate400, marginTop: 2 }}>Création rapide</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowNewClient(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.slate50, alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color={C.slate400} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              {/* First Name */}
              <View style={{ marginBottom: 16 }}>
                <Text style={s.fieldLabel}>Prénom *</Text>
                <TextInput
                  placeholder="Ex: Ahmed"
                  placeholderTextColor="#cbd5e1"
                  value={newClientForm.firstName}
                  onChangeText={(v) => setNewClientForm((p) => ({ ...p, firstName: v }))}
                  style={s.modalInput}
                />
              </View>

              {/* Last Name */}
              <View style={{ marginBottom: 16 }}>
                <Text style={s.fieldLabel}>Nom *</Text>
                <TextInput
                  placeholder="Ex: Ben Ali"
                  placeholderTextColor="#cbd5e1"
                  value={newClientForm.lastName}
                  onChangeText={(v) => setNewClientForm((p) => ({ ...p, lastName: v }))}
                  style={s.modalInput}
                />
              </View>

              {/* Phone with country code */}
              <View style={{ marginBottom: 16 }}>
                <Text style={s.fieldLabel}>Téléphone *</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setShowCountryPicker(true)}
                    style={[s.modalInput, { width: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: C.slate900 }}>
                      {newClientForm.phoneCountryCode}
                    </Text>
                    <ChevronDown size={14} color={C.slate400} />
                  </TouchableOpacity>
                  <TextInput
                    placeholder="20 123 456"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="phone-pad"
                    value={newClientForm.phone}
                    onChangeText={(v) => setNewClientForm((p) => ({ ...p, phone: v }))}
                    style={[s.modalInput, { flex: 1 }]}
                  />
                </View>
              </View>

              {/* CIN */}
              <View style={{ marginBottom: 24 }}>
                <Text style={s.fieldLabel}>CIN (Optionnel)</Text>
                <TextInput
                  placeholder="Numéro CIN"
                  placeholderTextColor="#cbd5e1"
                  value={newClientForm.cin}
                  onChangeText={(v) => setNewClientForm((p) => ({ ...p, cin: v }))}
                  style={s.modalInput}
                />
              </View>

              {/* Submit */}
              <TouchableOpacity
                onPress={createNewClient}
                disabled={creatingClient}
                style={[s.confirmBtn, creatingClient && { opacity: 0.6 }]}
                activeOpacity={0.8}
              >
                {creatingClient ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <CheckCircle2 size={18} color="white" />
                    <Text style={s.confirmBtnText}>Enregistrer & Sélectionner</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>

            {/* Country Code Picker */}
            <Modal visible={showCountryPicker} transparent animationType="slide">
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
                activeOpacity={1}
                onPress={() => setShowCountryPicker(false)}
              >
                <View
                  style={{ backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '50%', paddingBottom: 40 }}
                  onStartShouldSetResponder={() => true}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.slate100 }}>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: C.slate900, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Indicatif
                    </Text>
                    <TouchableOpacity onPress={() => setShowCountryPicker(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.slate50, alignItems: 'center', justifyContent: 'center' }}>
                      <X size={16} color={C.slate400} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
                    {COUNTRY_CODES.map((c) => {
                      const selected = c.value === newClientForm.phoneCountryCode;
                      return (
                        <TouchableOpacity
                          key={c.value}
                          onPress={() => {
                            setNewClientForm((p) => ({ ...p, phoneCountryCode: c.value }));
                            setShowCountryPicker(false);
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderRadius: 12,
                            backgroundColor: selected ? '#eef2ff' : 'transparent',
                            marginBottom: 4,
                          }}
                        >
                          <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: selected ? C.indigo : C.slate900 }}>
                            {c.label}
                          </Text>
                          {selected && <Check size={14} color={C.indigo} strokeWidth={3} />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.white },
  container: { flex: 1, paddingHorizontal: 24 },
  header: { marginTop: 32, marginBottom: 24, flexDirection: 'row', alignItems: 'center' },
  headerLabel: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 3, color: C.slate400 },
  headerTitle: { fontSize: 30, fontWeight: '900', letterSpacing: -1.5, color: C.slate900, marginTop: 4 },

  searchCard: { backgroundColor: C.slate50, padding: 24, borderRadius: 32, borderWidth: 1, borderColor: C.slate100, marginBottom: 32 },
  searchRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  fieldLabel: { fontSize: 9, fontWeight: '900', color: C.slate400, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, marginLeft: 4 },
  inputBox: { backgroundColor: C.white, borderRadius: 12, height: 48, borderWidth: 1, borderColor: C.slate200, justifyContent: 'center', paddingHorizontal: 12 },
  inputText: { fontSize: 14, fontWeight: '700', color: C.slate900 },

  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  resultsHeaderText: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.2, color: C.slate400 },

  carCard: { backgroundColor: C.white, borderWidth: 2, borderRadius: 32, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderColor: C.slate50, shadowColor: C.slate900, shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  carCardSelected: { borderColor: C.indigo, shadowColor: C.indigo, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  carImageBox: { width: 64, height: 64, backgroundColor: C.slate50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: C.slate100, overflow: 'hidden' },
  carImage: { width: '100%', height: '100%' },
  carTitle: { fontSize: 14, fontWeight: '900', color: C.slate900, textTransform: 'uppercase', fontStyle: 'italic' },
  carMatricule: { fontSize: 10, fontWeight: '900', color: C.indigo, textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 },
  carPrice: { fontSize: 16, fontWeight: '900', color: C.slate900, fontVariant: ['tabular-nums'] },
  carPriceLabel: { fontSize: 8, fontWeight: '900', color: C.slate400, textTransform: 'uppercase', letterSpacing: 2 },

  nextBtn: { backgroundColor: C.indigo, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 40, shadowColor: C.indigo, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  nextBtnText: { color: C.white, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, fontSize: 12 },

  clientSearchWrap: { marginBottom: 32, position: 'relative' },
  clientSearchIcon: { position: 'absolute', left: 16, top: '50%', zIndex: 10, marginTop: -9 },
  clientSearchInput: { height: 56, backgroundColor: C.slate50, borderWidth: 1, borderColor: C.slate100, borderRadius: 24, paddingLeft: 48, paddingRight: 16, fontWeight: '700', color: C.slate900, fontSize: 14 },
  clientSearchSpinner: { position: 'absolute', right: 16, top: '50%', marginTop: -10 },

  sectionLabel: { fontSize: 10, fontWeight: '900', color: C.slate400, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16, marginLeft: 8 },
  selectedChip: { backgroundColor: C.indigo, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedChipText: { color: C.white, fontWeight: '700', fontSize: 10, textTransform: 'uppercase' },

  clientCard: { backgroundColor: C.white, borderWidth: 2, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderColor: C.slate50, shadowColor: C.slate900, shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  clientCardSelected: { borderColor: C.indigo, backgroundColor: 'rgba(79,70,229,0.03)' },
  clientAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.slate100, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  clientAvatarSelected: { backgroundColor: C.indigo },
  clientAvatarText: { fontSize: 12, fontWeight: '900', color: C.slate400 },
  clientAvatarTextSelected: { color: C.white },
  clientName: { fontSize: 14, fontWeight: '900', color: C.slate900, textTransform: 'uppercase', fontStyle: 'italic' },
  clientCin: { fontSize: 9, fontWeight: '900', color: C.slate400, textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 },

  summaryCard: { backgroundColor: C.slate900, borderRadius: 40, padding: 32, marginTop: 40, marginBottom: 80, shadowColor: C.slate900, shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  summaryLabel: { fontSize: 9, fontWeight: '900', color: C.indigo, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  summaryTitle: { fontSize: 20, fontWeight: '900', color: C.white, textTransform: 'uppercase', fontStyle: 'italic' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  summaryRowLabel: { fontSize: 10, fontWeight: '900', color: C.slate400, textTransform: 'uppercase', letterSpacing: 2 },
  summaryRowValue: { fontSize: 14, fontWeight: '700', color: C.white, textTransform: 'uppercase', fontStyle: 'italic' },
  summaryDivider: { height: 1, backgroundColor: C.slate800, width: '100%', marginVertical: 16 },
  summaryTotalLabel: { fontSize: 10, fontWeight: '900', color: C.indigo, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
  summaryTotalValue: { fontSize: 32, fontWeight: '900', color: C.white, fontVariant: ['tabular-nums'], fontStyle: 'italic' },

  confirmBtn: { backgroundColor: C.indigo, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12, marginTop: 32 },
  confirmBtnText: { color: C.white, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, fontSize: 12 },

  newClientBtn: { width: 56, height: 56, borderRadius: 24, backgroundColor: C.indigo, alignItems: 'center', justifyContent: 'center', shadowColor: C.indigo, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },

  modalContent: { backgroundColor: C.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.slate100 },
  modalInput: { backgroundColor: C.slate50, borderRadius: 14, borderWidth: 1, borderColor: C.slate100, paddingHorizontal: 16, height: 52, fontSize: 14, fontWeight: '700', color: C.slate900 },
});
