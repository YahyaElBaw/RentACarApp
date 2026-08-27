import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Image, Modal, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { carApi, uploadApi } from '../../src/api';
import { getServerUrl } from '../../src/utils/serverDiscovery';
import { useAuthStore } from '../../src/store/useAuthStore';
import {
  ChevronLeft, Gauge, MapPin, Calendar, Wrench, Droplets, ShieldCheck,
  FileText, Satellite, Edit3, Check, X, Lock, Camera, ImageIcon, UploadCloud, Trash2
} from 'lucide-react-native';

const DOC_TYPES = [
  { type: 'carteGriseRecto', label: 'Carte Grise (Recto)' },
  { type: 'carteGriseVerso', label: 'Carte Grise (Verso)' },
  { type: 'laisserPasser', label: 'Laisser-Passer' },
  { type: 'assurance', label: 'Assurance' },
  { type: 'vignette', label: 'Vignette' },
];

export default function CarDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [car, setCar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Edit state (admin/super-admin only) — document pics
  const [isEditing, setIsEditing] = useState(false);
  const [docsDraft, setDocsDraft] = useState<Record<string, string>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [docPickingKey, setDocPickingKey] = useState<string | null>(null);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwdError, setPwdError] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchCar = async () => {
    try {
      const data = await carApi.getOne(id as string);
      setCar(data);
    } catch (err) {
      console.error('Failed to fetch car', err);
      Alert.alert('Erreur', 'Impossible de charger les données du véhicule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCar();
  }, [id]);

  const getImageUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const baseUrl = getServerUrl();
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBase}/${path.startsWith('/') ? path.slice(1) : path}`;
  };

  const startEditing = () => {
    const draft: Record<string, string> = {};
    (car.documents || []).forEach((d: any) => {
      if (d?.type) draft[d.type] = d.url || '';
    });
    setDocsDraft(draft);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDocsDraft({});
  };

  const captureDoc = async (type: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission', 'Autorisation caméra requise.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true });
    if (result.canceled || !result.assets?.length) return;
    await uploadDoc(type, result.assets[0]);
  };

  const pickGalleryDoc = async (type: string) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission', 'Autorisation galerie requise.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, allowsEditing: true });
    if (result.canceled || !result.assets?.length) return;
    await uploadDoc(type, result.assets[0]);
  };

  const uploadDoc = async (type: string, asset: any) => {
    setUploadingDoc(type);
    try {
      const res = await uploadApi.upload(asset.uri, `${type}-${Date.now()}.jpg`);
      const url = res.url || res.secure_url || '';
      setDocsDraft((p) => ({ ...p, [type]: url }));
      if (!url) Alert.alert('Erreur', "L'URL du document est vide.");
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Échec du téléchargement.';
      Alert.alert('Erreur', Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setUploadingDoc(null);
    }
  };

  const deleteDoc = (type: string) => {
    Alert.alert('Supprimer', 'Supprimer ce document ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => setDocsDraft((p) => ({ ...p, [type]: '' })) },
    ]);
  };

  const completeSave = async () => {
    if (!pwd.trim()) { setPwdError(true); return; }
    setSaving(true);
    setPwdError(false);
    try {
      const documents = DOC_TYPES
        .map(({ type }) => ({ type, url: (docsDraft[type] || '').trim() }))
        .filter((d) => !!d.url);
      const payload: any = { documents, password: pwd.trim() };
      const updated = await carApi.update(id as string, payload);
      setCar(updated);
      setShowPwdModal(false);
      setPwd('');
      setIsEditing(false);
      setDocsDraft({});
      Alert.alert('Succès', 'Documents mis à jour avec succès.');
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400 || status === 401) {
        setPwdError(true);
      } else {
        const msg = err?.response?.data?.message || 'Impossible de mettre à jour les documents.';
        Alert.alert('Erreur', Array.isArray(msg) ? msg.join(', ') : msg);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!car) return null;

  const InfoCard = ({ icon: Icon, label, value, color = "#4f46e5" }: any) => (
    <View className="bg-slate-50 rounded-3xl p-5 mb-4 border border-slate-100">
      <View className="flex-row items-center mb-2">
        <Icon size={16} color={color} className="mr-2" />
        <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</Text>
      </View>
      <Text className="text-base font-black text-slate-900">{value || 'N/A'}</Text>
    </View>
  );

  const fmtDate = (d: any) => {
    if (!d) return 'N/A';
    const date = new Date(d);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const DocumentPreview = ({ label, imagePath }: any) => {
    const url = getImageUrl(imagePath);
    return (
      <TouchableOpacity className="mb-6" onPress={() => url && setPreviewImage(url)}>
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

  const EditableDocument = ({ type, label, imagePath, onEdit, onDelete, isUploading }: any) => {
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
            onPress={() => onEdit(type)}
            disabled={!!isUploading}
            className="flex-1 h-11 bg-indigo-600 rounded-xl items-center justify-center flex-row gap-2"
          >
            <UploadCloud size={15} color="white" />
            <Text className="text-[10px] font-black text-white uppercase tracking-widest">Uploader</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onDelete(type)}
            disabled={!!isUploading}
            className="w-11 h-11 bg-rose-50 border border-rose-100 rounded-xl items-center justify-center"
          >
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
        <Text className="text-sm font-black uppercase tracking-widest text-slate-900">Détails Véhicule</Text>
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
        {/* Summary */}
        <View className="px-6 mb-8">
          <View className="bg-slate-900 rounded-[2.5rem] p-6">
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-1 pr-4">
                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">{car.brand}</Text>
                <Text className="text-2xl font-black text-white uppercase italic tracking-tighter">{car.model}</Text>
              </View>
              <View className={`px-3 py-1.5 rounded-full ${car.isAvailable ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                <Text className={`text-[9px] font-black tracking-widest uppercase ${car.isAvailable ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {car.isAvailable ? 'Disponible' : 'Loué'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="flex-row items-center gap-2">
                <Gauge size={14} color="#94a3b8" />
                <Text className="text-sm font-bold text-slate-300 tabular-nums">{car.mileage} KM</Text>
              </View>
              <View className="w-px h-4 bg-slate-700" />
              <View className="flex-row items-center gap-2">
                <MapPin size={14} color="#94a3b8" />
                <Text className="text-sm font-bold text-slate-300 uppercase">{car.matricule}</Text>
              </View>
              {car.color ? (
                <>
                  <View className="w-px h-4 bg-slate-700" />
                  <View className="flex-row items-center gap-2">
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: car.color }} />
                    <Text className="text-sm font-bold text-slate-300 capitalize">{car.color}</Text>
                  </View>
                </>
              ) : null}
            </View>
            <View className="h-px bg-slate-700 w-full my-4" />
            <View className="flex-row justify-between items-center">
              <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tarif Journalier</Text>
              <Text className="text-xl font-black text-indigo-400 tabular-nums">{car.dailyRate} <Text className="text-[11px]">TND</Text></Text>
            </View>
          </View>
        </View>

        {/* Maintenance */}
        <View className="px-6">
          <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-5 ml-2">Maintenance</Text>
          <InfoCard icon={Calendar} label="Date de Mise en Circulation" value={fmtDate(car.departureDate)} color="#4f46e5" />
          <InfoCard icon={Wrench} label="Prochaine Visite Technique" value={fmtDate(car.nextTechnicalVisitDate)} color="#64748b" />
          <InfoCard icon={Droplets} label="Prochaine Vidange (km)" value={car.nextOilChangeMileage ? `${car.nextOilChangeMileage} KM` : 'N/A'} color="#0891b2" />
          <InfoCard icon={ShieldCheck} label="Assurance (date)" value={fmtDate(car.insuranceDate)} color="#059669" />
        </View>

        {/* GPS */}
        <View className="mt-8 px-6">
          <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-5 ml-2">GPS</Text>
          <InfoCard icon={Satellite} label="IMEI" value={car.gpsImei || 'N/A'} color="#7c3aed" />
          <InfoCard icon={Satellite} label="Fournisseur" value={car.gpsProvider || 'N/A'} color="#7c3aed" />
        </View>

        {/* Documents */}
        <View className="mt-8 px-6">
          <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 ml-2">Documents</Text>
          {DOC_TYPES.map(({ type, label }) =>
            isEditing ? (
              <EditableDocument
                key={type}
                type={type}
                label={label}
                imagePath={docsDraft[type]}
                isUploading={uploadingDoc === type}
                onEdit={setDocPickingKey}
                onDelete={deleteDoc}
              />
            ) : (
              <DocumentPreview key={type} label={label} imagePath={car.documents?.find((d: any) => d.type === type)?.url} />
            )
          )}
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
            <TouchableOpacity onPress={() => setDocPickingKey(null)} className="mt-3 items-center py-2">
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
                className="flex-1 py-4 bg-slate-100 rounded-xl items-center justify-center"
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
