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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  User, ChevronDown, Check, X, Camera, ImageIcon, FileText, ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react-native';
import { clientApi, uploadApi } from '../../src/api';
import { useAddClientFormStore } from '../../src/store/useAddClientFormStore';

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

const ID_CARD_TYPES = [
  { label: 'CIN', value: 'cin' },
  { label: 'Passeport', value: 'passport' },
  { label: 'Carte de Séjour', value: 'carte_sejour' },
];

const DOC_FIELDS: { key: string; label: string; isLicense?: boolean }[] = [
  { key: 'cinFront', label: 'Recto Officiel' },
  { key: 'cinBack', label: 'Verso Officiel' },
  { key: 'licenseFront', label: 'Recto Permis', isLicense: true },
  { key: 'licenseBack', label: 'Verso Permis', isLicense: true },
];

const STEPS = ['Identité', "Pièces d'Identité", 'Documents'];

export default function AddClientScreen() {
  const router = useRouter();
  const { form, setField, resetForm } = useAddClientFormStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const set = (key: string, value: string) => setField(key, value);

  const stepValid = (idx: number): boolean => {
    if (idx === 0) return !!(form.firstName.trim() && form.lastName.trim() && form.phone.trim());
    return true;
  };

  const captureDocument = async (key: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission', 'Autorisation caméra requise pour scanner les documents.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets?.length) return;
    await uploadDocument(key, result.assets[0]);
  };

  const pickDocument = async (key: string) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission', 'Autorisation galerie requise pour charger les documents.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets?.length) return;
    await uploadDocument(key, result.assets[0]);
  };

  const resizeDocument = async (key: string) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission', 'Autorisation galerie requise pour redimensionner le document.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [16, 10],
    });
    if (result.canceled || !result.assets?.length) return;
    await uploadDocument(key, result.assets[0]);
  };


  const uploadDocument = async (key: string, asset: any) => {
    const filename = `${key}-${Date.now()}.jpg`;
    setUploading(key);
    try {
      const res = await uploadApi.upload(asset.uri, filename);
      set(key, res.url || res.secure_url || '');
      if (!res.url && !res.secure_url) {
        Alert.alert('Erreur', "L'URL du document est vide.");
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Échec du téléchargement du document.';
      Alert.alert('Erreur', Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setUploading(null);
    }
  };

  const onSubmit = async () => {
    setLoading(true);
    try {
      const payload: any = { ...form };
      delete payload.addedBy;
      ['cinDate', 'licenseDate', 'birthday'].forEach((k) => {
        if (!payload[k]) delete payload[k];
      });
      ['cin', 'drivingLicense', 'email'].forEach((k) => {
        if (payload[k] != null && !String(payload[k]).trim()) delete payload[k];
      });
      ['cinFront', 'cinBack', 'licenseFront', 'licenseBack'].forEach((k) => {
        if (!payload[k] || !payload[k].trim()) delete payload[k];
      });
      await clientApi.create(payload);
      Alert.alert('Succès', 'Client créé avec succès.', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            router.back();
          },
        },
      ]);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        Alert.alert('Erreur', 'CIN ou Permis de conduire existe déjà.');
      } else {
        const msg = err?.response?.data?.message || 'Erreur lors de la création.';
        Alert.alert('Erreur', Array.isArray(msg) ? msg.join(', ') : msg);
      }
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

  const docLabel = (key: string, isLicense?: boolean) => {
    const passport = form.idCardType === 'passport';
    if (key === 'cinFront') return passport ? 'Passeport (Recto)' : 'Recto Officiel';
    if (key === 'cinBack') return passport ? 'Verso Passeport' : 'Verso Officiel';
    if (key === 'licenseFront') return isLicense ? 'Recto Permis' : 'Recto';
    return 'Verso';
  };

  const renderStep0 = () => (
    <>
      <Text style={labelStyle}>Prénom *</Text>
      <TextInput style={inputStyle} placeholder="Ex: Ahmed" placeholderTextColor="#CBD5E1" value={form.firstName} onChangeText={(v) => set('firstName', v)} />

      <Text style={[labelStyle, { marginTop: 18 }]}>Nom *</Text>
      <TextInput style={inputStyle} placeholder="Ex: Ben Ali" placeholderTextColor="#CBD5E1" value={form.lastName} onChangeText={(v) => set('lastName', v)} />

      <Text style={[labelStyle, { marginTop: 18 }]}>Téléphone *</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          style={[inputStyle, { width: 120, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
          onPress={() => setShowCountryPicker(true)}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>{form.phoneCountryCode}</Text>
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

      {optionalLabel('Date de Naissance')}
      <TextInput style={inputStyle} placeholder="AAAA-MM-JJ" placeholderTextColor="#CBD5E1" value={form.birthday} onChangeText={(v) => set('birthday', v)} />

      {optionalLabel('Nationalité')}
      <TextInput style={inputStyle} placeholder="Ex: Tunisienne" placeholderTextColor="#CBD5E1" value={form.nationality} onChangeText={(v) => set('nationality', v)} />

      {optionalLabel('Lieu de Naissance')}
      <TextInput style={inputStyle} placeholder="Ex: Tunis" placeholderTextColor="#CBD5E1" value={form.lieuNaissance} onChangeText={(v) => set('lieuNaissance', v)} />

      {optionalLabel('Adresse de Résidence')}
      <TextInput style={inputStyle} placeholder="Ex: 12 rue ..." placeholderTextColor="#CBD5E1" value={form.address} onChangeText={(v) => set('address', v)} />

      {optionalLabel('Notes Internes')}
      <TextInput
        style={[inputStyle, { height: 90, textAlignVertical: 'top', paddingTop: 14 }]}
        placeholder="Description / notes"
        placeholderTextColor="#CBD5E1"
        multiline
        value={form.description}
        onChangeText={(v) => set('description', v)}
      />
    </>
  );

  const renderStep1 = () => {
    const idLabel =
      form.idCardType === 'passport' ? 'Numéro de Passeport' :
      form.idCardType === 'carte_sejour' ? 'Numéro Carte de Séjour' : 'Identifiant National (CIN)';
    const idDateLabel =
      form.idCardType === 'passport' ? "Date de Délivrance Passeport" :
      form.idCardType === 'carte_sejour' ? "Date d'Émission Carte de Séjour" : "Date d'Exportation CIN";
    return (
      <>
        <Text style={labelStyle}>Type de Pièce d'Identité</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {ID_CARD_TYPES.map((t) => {
            const selected = form.idCardType === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                onPress={() => set('idCardType', t.value)}
                style={{
                  flex: 1,
                  height: 46,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? ACCENT : BG,
                  borderWidth: 1,
                  borderColor: selected ? ACCENT : BORDER,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '900', color: selected ? 'white' : TEXT, textAlign: 'center' }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {optionalLabel(idLabel)}
        <TextInput style={inputStyle} placeholder={form.idCardType === 'cin' ? 'Ex: 12345678' : 'Ex: AB123456'} placeholderTextColor="#CBD5E1" value={form.cin} onChangeText={(v) => set('cin', v)} />

        {optionalLabel(idDateLabel)}
        <TextInput style={inputStyle} placeholder="AAAA-MM-JJ" placeholderTextColor="#CBD5E1" value={form.cinDate} onChangeText={(v) => set('cinDate', v)} />

        {optionalLabel('Numéro Permis de Conduire')}
        <TextInput style={inputStyle} placeholder="Ex: 98765421" placeholderTextColor="#CBD5E1" value={form.drivingLicense} onChangeText={(v) => set('drivingLicense', v)} />

        {optionalLabel("Date d'Exportation Permis")}
        <TextInput style={inputStyle} placeholder="AAAA-MM-JJ" placeholderTextColor="#CBD5E1" value={form.licenseDate} onChangeText={(v) => set('licenseDate', v)} />

        {optionalLabel('Lieu de Permis')}
        <TextInput style={inputStyle} placeholder="Ex: Tunis" placeholderTextColor="#CBD5E1" value={form.lieuPermis} onChangeText={(v) => set('lieuPermis', v)} />
      </>
    );
  };

  const renderStep2 = () => {
    const visibleDocs = DOC_FIELDS.filter((d) => !(d.key === 'cinBack' && form.idCardType === 'passport'));
    return (
      <>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: ACCENT_LIGHT, alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={18} color={ACCENT} />
          </View>
          <Text style={{ fontSize: 11, fontWeight: '800', color: MUTED, flex: 1 }}>
            Scannez ou importez les documents du client.
          </Text>
        </View>

        {visibleDocs.map((doc) => {
          const uri = (form as any)[doc.key];
          const isUploading = uploading === doc.key;
          return (
            <View key={doc.key} style={{ marginBottom: 18 }}>
              <Text style={labelStyle}>{docLabel(doc.key, doc.isLicense)}</Text>
              {uri ? (
                <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: BORDER }}>
                  <Image source={{ uri }} style={{ width: '100%', height: 160, resizeMode: 'cover' }} />
                  <View style={{ flexDirection: 'row', gap: 8, padding: 10 }}>
                    <TouchableOpacity
                      onPress={() => captureDocument(doc.key)}
                      style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                    >
                      <Camera size={14} color="white" />
                      <Text style={{ fontSize: 9, fontWeight: '900', color: 'white', textTransform: 'uppercase' }}>Refaire</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => pickDocument(doc.key)}
                      style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: BORDER }}
                    >
                      <ImageIcon size={14} color={TEXT} />
                      <Text style={{ fontSize: 9, fontWeight: '900', color: TEXT, textTransform: 'uppercase' }}>Galerie</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => set(doc.key, '')}
                      style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => captureDocument(doc.key)}
                    disabled={!!isUploading}
                    style={{ flex: 1, height: 56, borderRadius: 14, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                  >
                    {isUploading ? <ActivityIndicator color="white" /> : <Camera size={18} color="white" />}
                    <Text style={{ fontSize: 10, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: 1 }}>Caméra</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => pickDocument(doc.key)}
                    disabled={!!isUploading}
                    style={{ flex: 1, height: 56, borderRadius: 14, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: BORDER }}
                  >
                    {isUploading ? <ActivityIndicator color={ACCENT} /> : <ImageIcon size={18} color={TEXT} />}
                    <Text style={{ fontSize: 10, fontWeight: '900', color: TEXT, textTransform: 'uppercase', letterSpacing: 1 }}>Galerie</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
        <TouchableOpacity
          onPress={() => (step === 0 ? router.back() : setStep(step - 1))}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}
        >
          {step === 0 ? <X size={18} color={MUTED} /> : <ChevronLeft size={18} color={MUTED} />}
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT, textTransform: 'uppercase', letterSpacing: 1 }}>
            Nouveau Client
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Stepper */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12 }}>
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <View key={s} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                <View style={{ flex: 1, height: 2, backgroundColor: i === 0 ? 'transparent' : (done ? ACCENT : BORDER) }} />
                <TouchableOpacity
                  onPress={() => i < step && setStep(i)}
                  style={{
                    width: 26, height: 26, borderRadius: 13,
                    backgroundColor: done || active ? ACCENT : BG,
                    borderWidth: 1, borderColor: done || active ? ACCENT : BORDER,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {done ? <Check size={13} color="white" strokeWidth={3} /> : <Text style={{ fontSize: 10, fontWeight: '900', color: active ? 'white' : MUTED }}>{i + 1}</Text>}
                </TouchableOpacity>
                <View style={{ flex: 1, height: 2, backgroundColor: active ? ACCENT : (i < step ? ACCENT : BORDER) }} />
              </View>
              <Text style={{ fontSize: 8, fontWeight: '900', color: active || done ? ACCENT : MUTED, marginTop: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                {s}
              </Text>
            </View>
          );
        })}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} color="white" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: '900', color: TEXT, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {STEPS[step]}
            </Text>
          </View>

          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer navigation */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 24, paddingTop: 12, flexDirection: 'row', gap: 10 }}>
        {step < 2 ? (
          <TouchableOpacity
            onPress={() => setStep(step + 1)}
            disabled={!stepValid(step)}
            style={{
              flex: 1,
              height: 56,
              borderRadius: 16,
              backgroundColor: stepValid(step) ? ACCENT : '#A9A3C3',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '900', color: 'white', marginRight: 8, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Continuer
            </Text>
            <ChevronRight size={16} color="white" strokeWidth={3} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onSubmit}
            disabled={loading}
            style={{
              flex: 1,
              height: 56,
              borderRadius: 16,
              backgroundColor: loading ? '#A9A3C3' : ACCENT,
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
        )}
      </View>

      {/* Country Code Picker Modal */}
      <Modal visible={showCountryPicker} transparent animationType="slide">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowCountryPicker(false)}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', paddingBottom: 40 }} onStartShouldSetResponder={() => true}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: TEXT, textTransform: 'uppercase', letterSpacing: 1 }}>Sélectionnez un pays</Text>
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
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: selected ? ACCENT_LIGHT : 'transparent', marginBottom: 4 }}
                  >
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: selected ? ACCENT : TEXT }}>{c.label}</Text>
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
