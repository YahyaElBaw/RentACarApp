import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { User, ChevronDown, Check, X } from 'lucide-react-native';
import { clientApi } from '../../src/api';

const ACCENT = '#4F39F6';
const ACCENT_LIGHT = '#EEF2FF';
const BORDER = '#F1F5F9';
const BG = '#F8FAFC';
const TEXT = '#0F172A';
const MUTED = '#94A3B8';

const COUNTRY_CODES = [
  { label: '+216 Tunisie', value: '+216' },
  { label: '+33 France', value: '+33' },
  { label: '+39 Italie', value: '+39' },
  { label: '+49 Allemagne', value: '+49' },
  { label: '+34 Espagne', value: '+34' },
  { label: '+1 USA/Canada', value: '+1' },
  { label: '+44 UK', value: '+44' },
  { label: '+212 Maroc', value: '+212' },
  { label: '+213 Algérie', value: '+213' },
  { label: '+966 Arabie Saoudite', value: '+966' },
  { label: '+971 EAU', value: '+971' },
  { label: '+218 Libye', value: '+218' },
];

export default function AddClientScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phoneCountryCode: '+216',
    phone: '',
    cin: '',
  });

  const set = (key: string, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const isValid = !!(
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.phone.trim()
  );

  const onSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const payload: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phoneCountryCode: form.phoneCountryCode,
        phone: form.phone.trim(),
      };
      if (form.cin.trim()) payload.cin = form.cin.trim();
      await clientApi.create(payload);
      Alert.alert('Succès', 'Client créé avec succès.', [
        {
          text: 'OK',
          onPress: () => {
            setForm({
              firstName: '',
              lastName: '',
              phoneCountryCode: '+216',
              phone: '',
              cin: '',
            });
            router.back();
          },
        },
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erreur lors de la création.';
      Alert.alert('Erreur', Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: any = {
    height: 52,
    backgroundColor: BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '700',
    color: TEXT,
  };

  const labelStyle: any = {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase' as const,
    letterSpacing: 2,
    color: MUTED,
    marginBottom: 8,
    marginLeft: 4,
  };

  const optionalLabel = (text: string) => (
    <Text style={labelStyle}>
      {text} <Text style={{ color: '#CBD5E1', fontWeight: '700' }}>(optionnel)</Text>
    </Text>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} color={MUTED} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT, textTransform: 'uppercase', letterSpacing: 1 }}>
            Nouveau Client
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }}>
          <User size={18} color="white" strokeWidth={2} />
        </View>
      </View>

      {/* Content */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20 }}>
          <Text style={labelStyle}>Prénom *</Text>
          <TextInput
            style={inputStyle}
            placeholder="Ex: Ahmed"
            placeholderTextColor="#CBD5E1"
            value={form.firstName}
            onChangeText={(v) => set('firstName', v)}
          />

          <Text style={[labelStyle, { marginTop: 20 }]}>Nom *</Text>
          <TextInput
            style={inputStyle}
            placeholder="Ex: Ben Ali"
            placeholderTextColor="#CBD5E1"
            value={form.lastName}
            onChangeText={(v) => set('lastName', v)}
          />

          <Text style={[labelStyle, { marginTop: 20 }]}>Téléphone *</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[inputStyle, { width: 130, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              onPress={() => setShowCountryPicker(true)}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>
                {COUNTRY_CODES.find((c) => c.value === form.phoneCountryCode)?.value || form.phoneCountryCode}
              </Text>
              <ChevronDown size={14} color={MUTED} />
            </TouchableOpacity>
            <TextInput
              style={[inputStyle, { flex: 1 }]}
              placeholder="20 123 456"
              placeholderTextColor="#CBD5E1"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(v) => set('phone', v)}
            />
          </View>

          {optionalLabel('Numéro CIN')}
          <TextInput
            style={inputStyle}
            placeholder="Ex: 12345678"
            placeholderTextColor="#CBD5E1"
            value={form.cin}
            onChangeText={(v) => set('cin', v)}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 24, paddingTop: 12 }}>
        <TouchableOpacity
          onPress={onSubmit}
          disabled={loading || !isValid}
          style={{
            height: 56,
            borderRadius: 16,
            backgroundColor: isValid && !loading ? ACCENT : '#A9A3C3',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Check size={16} color="white" strokeWidth={3} />
              <Text style={{ fontSize: 11, fontWeight: '900', color: 'white', marginLeft: 8, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Enregistrer
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Country Code Picker Modal */}
      <Modal visible={showCountryPicker} transparent animationType="slide">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowCountryPicker(false)}
        >
          <View
            style={{
              backgroundColor: 'white',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '60%',
              paddingBottom: 40,
            }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT, textTransform: 'uppercase', letterSpacing: 1 }}>
                Sélectionnez un pays
              </Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color={MUTED} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
              {COUNTRY_CODES.map((c) => {
                const selected = c.value === form.phoneCountryCode;
                return (
                  <TouchableOpacity
                    key={c.value}
                    onPress={() => {
                      set('phoneCountryCode', c.value);
                      setShowCountryPicker(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 14,
                      backgroundColor: selected ? ACCENT_LIGHT : 'transparent',
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: selected ? ACCENT : TEXT }}>
                      {c.label}
                    </Text>
                    {selected && (
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={14} color="white" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
