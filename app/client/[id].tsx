import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Image, Modal, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { clientApi } from '../../src/api';
import { getServerUrl } from '../../src/utils/serverDiscovery';
import { 
  ChevronLeft, CreditCard, Phone, 
  MapPin, Calendar, Shield,
  MoreVertical, Edit3, Trash2,
  FileText, Download, RotateCcw
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ClientDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
        <TouchableOpacity className="w-12 h-12 bg-slate-50 rounded-2xl items-center justify-center border border-slate-100">
          <MoreVertical size={24} color="#0f172a" />
        </TouchableOpacity>
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
                 <InfoCard icon={CreditCard} label={client.idCardType === 'passport' ? 'Passeport' : client.idCardType === 'carte_sejour' ? 'Carte de Séjour' : 'CIN'} value={client.cin} />
              </View>
              <View className="flex-1">
                 <InfoCard icon={Calendar} label="Date Exp. CIN" value={formatDate(client.cinDate)} color="#f59e0b" />
              </View>
           </View>

           <View className="flex-row gap-4">
              <View className="flex-1">
                 <InfoCard icon={Shield} label="Num. Permis" value={client.drivingLicense} color="#10b981" />
              </View>
              <View className="flex-1">
                 <InfoCard icon={Calendar} label="Date Exp. Permis" value={formatDate(client.licenseDate)} color="#f59e0b" />
              </View>
           </View>

           <InfoCard icon={Phone} label="Téléphone" value={client.phone} color="#4f46e5" />
           <InfoCard icon={MapPin} label="Adresse" value={client.address} color="#64748b" />
           <InfoCard icon={Calendar} label="Date de naissance" value={formatDate(client.birthday)} color="#64748b" />
        </View>

        {/* Documents */}
        <View className="mt-8 px-6">
           <Text className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 ml-2">Pièces Justificatives</Text>
           
           {client.idCardType === 'passport' ? (
             <DocumentPreview label="Passeport" imagePath={client.cinFront} />
           ) : client.idCardType === 'carte_sejour' ? (
             <>
               <DocumentPreview label="Carte de Séjour (Recto)" imagePath={client.cinFront} />
               <DocumentPreview label="Carte de Séjour (Verso)" imagePath={client.cinBack} />
             </>
           ) : (
             <>
               <DocumentPreview label="CIN (Recto)" imagePath={client.cinFront} />
               <DocumentPreview label="CIN (Verso)" imagePath={client.cinBack} />
             </>
           )}

           <DocumentPreview label="Permis de Conduire (Recto)" imagePath={client.licenseFront} />
           <DocumentPreview label="Permis de Conduire (Verso)" imagePath={client.licenseBack} />
        </View>

        {/* Actions */}
        <View className="px-6 mt-6 gap-4">
           <TouchableOpacity className="bg-slate-900 h-16 rounded-2xl flex-row items-center justify-center gap-3">
              <Download size={20} color="white" />
              <Text className="text-white font-black uppercase tracking-widest text-xs">Télécharger PDF</Text>
           </TouchableOpacity>
           
           <TouchableOpacity 
             className="bg-white border-2 border-slate-900 h-16 rounded-2xl flex-row items-center justify-center gap-3"
             onPress={() => Alert.alert('Information', 'Modification disponible bientôt sur mobile.')}
           >
              <Edit3 size={20} color="#0f172a" />
              <Text className="text-slate-900 font-black uppercase tracking-widest text-xs">Modifier le Profil</Text>
           </TouchableOpacity>
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
    </SafeAreaView>
  );
}
