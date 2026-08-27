import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Image, Modal, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { clientApi, uploadApi } from '../../src/api';
import { getServerUrl } from '../../src/utils/serverDiscovery';
import { useAuthStore } from '../../src/store/useAuthStore';
import DateInput from '../../src/components/DateInput';
import { 
  ChevronLeft, CreditCard, Phone, 
  MapPin, Calendar, Shield,
  Edit3, Trash2,
  FileText, Check, X, Lock, Pencil, Camera, ImageIcon, UploadCloud
} from 'lucide-react-native';

export default function ClientDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Edit state (admin/super-admin only)
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwdError, setPwdError] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchClient = async () => {
    try {
      const data = await clientApi.getOne(id as string);
      setClient(data);
    } catch (err) {
      console.error('Failed to fetch client', err);
      Alert.alert('Erreur', 'Impossible de charger les données du client.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [id]);

  const startEditing = () => {
    const c = client || {};
    setDraft({
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      phone: c.phone || '',
      phoneCountryCode: c.phoneCountryCode || '+216',
      nationality: c.nationality || '',
      lieuNaissance: c.lieuNaissance || '',
      address: c.address || '',
      description: c.description || '',
      cin: c.cin || '',
      cinDate: c.cinDate ? new Date(c.cinDate).toISOString().split('T')[0] : '',
      birthday: c.birthday ? new Date(c.birthday).toISOString().split('T')[0] : '',
      drivingLicense: c.drivingLicense || '',
      licenseDate: c.licenseDate ? new Date(c.licenseDate).toISOString().split('T')[0] : '',
      lieuPermis: c.lieuPermis || '',
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraft(null);
  };

  const completeSave = async () => {
    if (!pwd.trim()) { setPwdError(true); return; }
    setSaving(true);
    setPwdError(false);
    try {
      const payload: any = { ...draft };
      if (!payload.cinDate) delete payload.cinDate;
      if (!payload.licenseDate) delete payload.licenseDate;
      if (!payload.birthday) delete payload.birthday;
      ['cin', 'drivingLicense', 'address', 'nationality', 'lieuNaissance', 'lieuPermis', 'description'].forEach((k) => {
        if (payload[k] == null || !String(payload[k]).trim()) delete payload[k];
      });
      ['phone', 'phoneCountryCode'].forEach((k) => {
        if (payload[k] == null) delete payload[k];
      });
      payload.password = pwd.trim();
      const updated = await clientApi.update(id as string, payload);
      setClient(updated);
      setShowPwdModal(false);
      setPwd('');
      setIsEditing(false);
      setDraft(null);
      Alert.alert('Succès', 'Profil mis à jour avec succès.');
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400 || status === 401) {
        setPwdError(true);
      } else {
        const msg = err?.response?.data?.message || 'Impossible de mettre à jour le profil.';
        Alert.alert('Erreur', Array.isArray(msg) ? msg.join(', ') : msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const setDraftField = (key: string, value: string) =>
    setDraft((p: any) => ({ ...p, [key]: value }));

  // Document re-upload / delete (staged into draft, saved only on Done)
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [docPickingKey, setDocPickingKey] = useState<string | null>(null);

  const captureDoc = async (key: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission', 'Autorisation caméra requise.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true });
    if (result.canceled || !result.assets?.length) return;
    await uploadDoc(key, result.assets[0]);
  };

  const pickGalleryDoc = async (key: string) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission', 'Autorisation galerie requise.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true });
    if (result.canceled || !result.assets?.length) return;
    await uploadDoc(key, result.assets[0]);
  };

  const uploadDoc = async (key: string, asset: any) => {
    setUploadingDoc(key);
    try {
      const res = await uploadApi.upload(asset.uri, `${key}-${Date.now()}.jpg`);
      const url = res.url || res.secure_url || '';
      setDraftField(key, url);
      if (!url) Alert.alert('Erreur', "L'URL du document est vide.");
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Échec du téléchargement.';
      Alert.alert('Erreur', Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setUploadingDoc(null);
    }
  };

  const deleteDoc = async (key: string) => {
    Alert.alert('Supprimer', 'Supprimer ce document ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => setDraftField(key, '') },
    ]);
  };

  const formatDate = (date: any) => {
    if (!date) return 'Non renseignée';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const getImageUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const baseUrl = getServerUrl();
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBase}/${path.startsWith('/') ? path.slice(1) : path}`;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!client) return null;

  const InfoCard = ({ icon: Icon, label, value, color = "#4f46e5" }: any) => (
    <View className="bg-slate-50 rounded-3xl p-5 mb-4 border border-slate-100">
      <View className="flex-row items-center mb-2">
        <Icon size={16} color={color} className="mr-2" />
        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</Text>
      </View>
      <Text className="text-base font-black text-slate-900">{value || 'N/A'}</Text>
    </View>
  );

  const EditableCard = ({ icon: Icon, label, value, onValue, color = "#4f46e5", keyboardType }: any) => (
    <View className="bg-slate-50 rounded-3xl p-5 mb-4 border border-slate-100">
      <View className="flex-row items-center mb-2">
        <Icon size={16} color={color} className="mr-2" />
        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</Text>
        <Pencil size={11} color={color} className="ml-auto" />
      </View>
      <TextInput
        value={value ?? ''}
        onChangeText={onValue}
        placeholder="—"
        placeholderTextColor="#cbd5e1"
        keyboardType={keyboardType}
        style={{ fontSize: 15, fontWeight: '800', color: '#0f172a', padding: 0 }}
      />
    </View>
  );

  const DateEditableCard = ({ icon: Icon, label, value, onValue, color = "#f59e0b", maxDate }: any) => (
    <View className="bg-slate-50 rounded-3xl p-5 mb-4 border border-slate-100">
      <View className="flex-row items-center mb-2">
        <Icon size={16} color={color} className="mr-2" />
        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</Text>
        <Calendar size={12} color={color} className="ml-auto" />
      </View>
      <DateInput
        value={value ?? ''}
        onChange={onValue}
        maximumDate={maxDate}
        placeholder="—"
        compact
      />
    </View>
  );

  const DocumentPreview = ({ label, imagePath }: any) => {
    const url = getImageUrl(imagePath);
    return (
      <TouchableOpacity 
        className="mb-6"
        onPress={() => url && setPreviewImage(url)}
      >
        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-2">{label}</Text>
        <View className="w-full aspect-[16/10] bg-slate-100 rounded-3xl overflow-hidden border-2 border-slate-100">
          {url ? (
            <Image source={{ uri: url }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <FileText size={32} color="#cbd5e1" />
              <Text className="text-[10px] font-black text-slate-300 uppercase mt-2">Aucun document</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const EditableDocument = ({ label, imagePath, onEdit, onDelete, isUploading }: any) => {
    const url = getImageUrl(imagePath);
    return (
      <View className="mb-6">
        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-2">{label}</Text>
        <View className="w-full aspect-[16/10] bg-slate-100 rounded-3xl overflow-hidden border-2 border-slate-100">
          {isUploading ? (
            <View className="w-full h-full items-center justify-center">
              <ActivityIndicator color="#4f46e5" />
              <Text className="text-[10px] font-black text-slate-400 uppercase mt-2">Téléchargement…</Text>
            </View>
          ) : url ? (
            <TouchableOpacity onPress={() => setPreviewImage(url)} activeOpacity={0.8} className="w-full h-full">
              <Image source={{ uri: url }} className="w-full h-full" resizeMode="cover" />
            </TouchableOpacity>
          ) : (
            <View className="w-full h-full items-center justify-center">
              <FileText size={32} color="#cbd5e1" />
              <Text className="text-[10px] font-black text-slate-300 uppercase mt-2">Aucun document</Text>
            </View>
          )}
        </View>
        <View className="flex-row gap-2 mt-3">
          <TouchableOpacity
            onPress={onEdit}
            disabled={!!isUploading}
            className="flex-1 h-11 bg-indigo-600 rounded-xl items-center justify-center flex-row gap-2"
          >
            <UploadCloud size={15} color="white" />
            <Text className="text-[10px] font-black text-white uppercase tracking-widest">Uploader</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            disabled={!!isUploading}
            className="w-11 h-11 bg-rose-50 border border-rose-100 rounded-xl items-center justify-center"
          >
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDoc = (label: string, key: string) =>
    isEditing ? (
      <EditableDocument
        label={label}
        imagePath={draft?.[key]}
        isUploading={uploadingDoc === key}
        onEdit={() => setDocPickingKey(key)}
        onDelete={() => deleteDoc(key)}
      />
    ) : (
      <DocumentPreview label={label} imagePath={client[key]} />
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header */}
      <View className="px-6 py-4 flex-row justify-between items-center">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-12 h-12 bg-slate-50 rounded-2xl items-center justify-center border border-slate-100"
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-sm font-black uppercase tracking-widest text-slate-900">Dossier Client</Text>
        {isAdmin ? (
          isEditing ? (
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={cancelEditing}
                className="w-12 h-12 bg-slate-50 rounded-2xl items-center justify-center border border-slate-100"
              >
                <X size={22} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowPwdModal(true)}
                className="w-12 h-12 bg-indigo-600 rounded-2xl items-center justify-center"
              >
                <Check size={22} color="white" strokeWidth={3} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={startEditing}
              className="w-12 h-12 bg-slate-50 rounded-2xl items-center justify-center border border-slate-100"
            >
              <Edit3 size={22} color="#0f172a" />
            </TouchableOpacity>
          )
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile Summary */}
        <View className="items-center mt-6 mb-10 px-6">
           <View className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] items-center justify-center shadow-xl shadow-indigo-200 mb-4">
              <Text className="text-white text-3xl font-black">{client.firstName?.[0]}{client.lastName?.[0]}</Text>
           </View>
           <Text className="text-2xl font-black text-slate-900 uppercase tracking-tighter text-center">
             {client.lastName} {client.firstName}
           </Text>
           <View className="bg-indigo-50 px-4 py-1.5 rounded-full mt-2 border border-indigo-100">
              <Text className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{client.status}</Text>
           </View>
        </View>

        {/* Info Grid */}
        <View className="px-6">
           <View className="flex-row gap-4">
              <View className="flex-1">
                 {isEditing ? (
                   <EditableCard icon={CreditCard} label={client.idCardType === 'passport' ? 'Passeport' : client.idCardType === 'carte_sejour' ? 'Carte de Séjour' : 'CIN'} value={draft?.cin} onValue={(v: string) => setDraftField('cin', v)} />
                 ) : (
                   <InfoCard icon={CreditCard} label={client.idCardType === 'passport' ? 'Passeport' : client.idCardType === 'carte_sejour' ? 'Carte de Séjour' : 'CIN'} value={client.cin} />
                 )}
              </View>
              <View className="flex-1">
                 {isEditing ? (
                   <DateEditableCard icon={Calendar} label="Date Exp. CIN" value={draft?.cinDate} onValue={(v: string) => setDraftField('cinDate', v)} color="#f59e0b" />
                 ) : (
                   <InfoCard icon={Calendar} label="Date Exp. CIN" value={formatDate(client.cinDate)} color="#f59e0b" />
                 )}
              </View>
           </View>

           <View className="flex-row gap-4">
              <View className="flex-1">
                 {isEditing ? (
                   <EditableCard icon={Shield} label="Num. Permis" value={draft?.drivingLicense} onValue={(v: string) => setDraftField('drivingLicense', v)} color="#10b981" />
                 ) : (
                   <InfoCard icon={Shield} label="Num. Permis" value={client.drivingLicense} color="#10b981" />
                 )}
              </View>
              <View className="flex-1">
                 {isEditing ? (
                   <DateEditableCard icon={Calendar} label="Date Exp. Permis" value={draft?.licenseDate} onValue={(v: string) => setDraftField('licenseDate', v)} color="#f59e0b" />
                 ) : (
                   <InfoCard icon={Calendar} label="Date Exp. Permis" value={formatDate(client.licenseDate)} color="#f59e0b" />
                 )}
              </View>
           </View>

           <View className="flex-row gap-4">
              <View className="flex-1">
                 {isEditing ? (
                   <EditableCard icon={Phone} label="Téléphone" value={draft?.phone} onValue={(v: string) => setDraftField('phone', v)} color="#4f46e5" keyboardType="phone-pad" />
                 ) : (
                   <InfoCard icon={Phone} label="Téléphone" value={client.phone} color="#4f46e5" />
                 )}
              </View>
              <View className="flex-1">
                 {isEditing ? (
                   <EditableCard icon={Shield} label="Indicatif" value={draft?.phoneCountryCode} onValue={(v: string) => setDraftField('phoneCountryCode', v)} color="#4f46e5" keyboardType="phone-pad" />
                 ) : (
                   <InfoCard icon={Shield} label="Indicatif" value={client.phoneCountryCode || '+216'} color="#4f46e5" />
                 )}
              </View>
           </View>
           <View className="flex-row gap-4">
              <View className="flex-1">
                 {isEditing ? (
                   <EditableCard icon={FileText} label="Nationalité" value={draft?.nationality} onValue={(v: string) => setDraftField('nationality', v)} color="#64748b" />
                 ) : (
                   <InfoCard icon={FileText} label="Nationalité" value={client.nationality} color="#64748b" />
                 )}
              </View>
              <View className="flex-1">
                 {isEditing ? (
                   <DateEditableCard icon={FileText} label="Date Naiss." value={draft?.birthday} onValue={(v: string) => setDraftField('birthday', v)} color="#64748b" maxDate={new Date()} />
                 ) : (
                   <InfoCard icon={Calendar} label="Date de naissance" value={formatDate(client.birthday)} color="#64748b" />
                 )}
              </View>
           </View>

           {isEditing ? (
             <EditableCard icon={MapPin} label="Adresse" value={draft?.address} onValue={(v: string) => setDraftField('address', v)} color="#64748b" />
           ) : (
             <InfoCard icon={MapPin} label="Adresse" value={client.address} color="#64748b" />
           )}
           {isEditing ? (
             <EditableCard icon={Calendar} label="Lieu de Naissance" value={draft?.lieuNaissance} onValue={(v: string) => setDraftField('lieuNaissance', v)} color="#64748b" />
           ) : (
             <InfoCard icon={Calendar} label="Lieu de Naissance" value={client.lieuNaissance} color="#64748b" />
           )}
           {isEditing ? (
             <EditableCard icon={FileText} label="Lieu de Permis" value={draft?.lieuPermis} onValue={(v: string) => setDraftField('lieuPermis', v)} color="#64748b" />
           ) : (
             <InfoCard icon={FileText} label="Lieu de Permis" value={client.lieuPermis} color="#64748b" />
           )}
           {isEditing ? (
             <EditableCard icon={FileText} label="Notes Internes" value={draft?.description} onValue={(v: string) => setDraftField('description', v)} color="#64748b" />
           ) : (
             <InfoCard icon={FileText} label="Notes Internes" value={client.description} color="#64748b" />
           )}
        </View>

        {/* Documents */}
        <View className="mt-8 px-6">
           <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 ml-2">Pièces Justificatives</Text>
           
           {client.idCardType === 'passport' ? (
             renderDoc('Passeport', 'cinFront')
           ) : client.idCardType === 'carte_sejour' ? (
             <>
               {renderDoc('Carte de Séjour (Recto)', 'cinFront')}
               {renderDoc('Carte de Séjour (Verso)', 'cinBack')}
             </>
           ) : (
             <>
               {renderDoc('CIN (Recto)', 'cinFront')}
               {renderDoc('CIN (Verso)', 'cinBack')}
             </>
           )}

           {renderDoc('Permis de Conduire (Recto)', 'licenseFront')}
           {renderDoc('Permis de Conduire (Verso)', 'licenseBack')}
        </View>
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal visible={!!previewImage} transparent={true} animationType="fade">
        <View className="flex-1 bg-black/95 items-center justify-center">
          <TouchableOpacity 
            className="absolute top-12 right-6 z-10 w-12 h-12 bg-white/10 rounded-full items-center justify-center"
            onPress={() => setPreviewImage(null)}
          >
            <Text className="text-white font-bold text-xl">×</Text>
          </TouchableOpacity>
          {previewImage && (
            <Image source={{ uri: previewImage }} className="w-full h-[60%]" resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Doc source choice Modal */}
      <Modal
        visible={!!docPickingKey}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDocPickingKey(null)}
      >
        <View className="flex-1 bg-black/40 items-center justify-center px-10">
          <View className="w-full bg-white rounded-3xl p-6">
            <Text className="text-base font-black text-slate-900 uppercase tracking-wider mb-1 text-center">
              Uploader
            </Text>
            <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center mb-5">
              Choisissez une source
            </Text>
            <TouchableOpacity
              onPress={() => { const k = docPickingKey; setDocPickingKey(null); if (k) captureDoc(k); }}
              className="h-14 bg-indigo-600 rounded-2xl items-center justify-center flex-row gap-3 mb-3"
            >
              <Camera size={18} color="white" />
              <Text className="text-[11px] font-black text-white uppercase tracking-widest">Caméra</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { const k = docPickingKey; setDocPickingKey(null); if (k) pickGalleryDoc(k); }}
              className="h-14 bg-slate-100 border border-slate-200 rounded-2xl items-center justify-center flex-row gap-3"
            >
              <ImageIcon size={18} color="#0f172a" />
              <Text className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Galerie</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDocPickingKey(null)}
              className="mt-3 items-center py-2"
            >
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password confirmation Modal */}
      <Modal visible={showPwdModal} transparent={true} animationType="fade" onRequestClose={() => setShowPwdModal(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-8">
          <View className="w-full bg-white rounded-3xl p-6 shadow-2xl">
            <View className="flex-row items-center gap-3 mb-4">
              <View className="w-10 h-10 bg-indigo-50 rounded-xl items-center justify-center">
                <Lock size={18} color="#4f46e5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text className="text-base font-black text-slate-900 uppercase tracking-wider">Confirmation</Text>
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Mot de passe requis</Text>
              </View>
            </View>

            <Text className="text-xs font-bold text-slate-500 mb-3">
              Un mot de passe administrateur est requis pour enregistrer les modifications.
            </Text>

            <TextInput
              value={pwd}
              onChangeText={(v) => { setPwd(v); setPwdError(false); }}
              secureTextEntry
              placeholder="Mot de passe"
              placeholderTextColor="#cbd5e1"
              autoFocus
              className="h-14 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900"
            />

            {pwdError && (
              <Text className="text-[11px] font-bold text-rose-600 mt-2">Mot de passe incorrect.</Text>
            )}

            <View className="flex-row gap-3 mt-6">
              <TouchableOpacity
                onPress={() => { setShowPwdModal(false); setPwd(''); setPwdError(false); }}
                className="flex-1 h-13 py-4 bg-slate-100 rounded-xl items-center justify-center"
              >
                <Text className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={completeSave}
                disabled={saving}
                className="flex-1 py-4 bg-indigo-600 rounded-xl items-center justify-center flex-row"
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Check size={15} color="white" strokeWidth={3} />
                    <Text className="text-[11px] font-black text-white uppercase tracking-widest ml-1.5">Enregistrer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
