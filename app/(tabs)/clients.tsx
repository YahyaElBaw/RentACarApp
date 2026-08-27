import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl, TextInput, ActivityIndicator } from 'react-native';
import { clientApi } from '../../src/api';
import { 
  Users, Search, ChevronRight, 
  Plus, CreditCard, Phone, 
  MapPin, Shield
} from 'lucide-react-native';
import { useRouter, Link } from 'expo-router';

export default function ClientsList() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchClients = useCallback(async (query: string) => {
    try {
      setError(false);
      const data = await clientApi.getAll({ search: query });
      setClients(data);
    } catch (err) {
      console.error('Failed to fetch clients', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetchClients(search);
    }, 400);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients(search);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'WHITE_LIST': return '#10b981';
      case 'BLACK_LIST': return '#f59e0b';
      case 'BLOCK_LIST': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        {/* Header */}
        <View style={{ marginTop: 32, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 3, color: '#94a3b8' }}>Base de Données</Text>
            <Text style={{ fontSize: 30, fontWeight: '900', letterSpacing: -1.5, color: '#0f172a', marginTop: 4 }}>
              Nos <Text style={{ color: '#4f46e5' }}>Clients</Text>
            </Text>
          </View>
          <Link href="/client/new" asChild>
            <TouchableOpacity 
              className="w-12 h-12 bg-indigo-600 rounded-2xl items-center justify-center shadow-lg shadow-indigo-200"
            >
              <Plus size={24} color="white" strokeWidth={3} />
            </TouchableOpacity>
          </Link>
        </View>

        {/* Search Bar */}
        <View className="relative mb-8">
           <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
              <Search size={18} color="#94a3b8" />
           </View>
           <TextInput
             placeholder="Rechercher un client..."
             value={search}
             onChangeText={setSearch}
             className="h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 font-bold text-slate-900"
             placeholderTextColor="#94a3b8"
           />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {loading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator color="#4f46e5" />
              <Text className="text-xs font-bold text-slate-400 mt-3">Chargement des clients...</Text>
            </View>
          ) : error ? (
            <View className="items-center justify-center py-20 bg-slate-50 rounded-[2rem] border border-slate-100">
              <Users size={40} color="#cbd5e1" strokeWidth={1.5} />
              <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mt-4">Erreur de connexion</Text>
              <Text className="text-[10px] font-bold text-slate-300 mt-1">Vérifiez que le serveur est accessible</Text>
              <TouchableOpacity 
                onPress={() => { setLoading(true); fetchClients(search); }}
                className="mt-4 bg-indigo-600 px-6 py-3 rounded-xl"
              >
                <Text className="text-white text-[10px] font-black uppercase tracking-widest">Réessayer</Text>
              </TouchableOpacity>
            </View>
          ) : clients.length === 0 ? (
            <View className="items-center justify-center py-20">
               <Users size={48} color="#e2e8f0" strokeWidth={1} />
               <Text className="text-xs font-black uppercase tracking-widest text-slate-300 mt-4">Aucun client trouvé</Text>
            </View>
          ) : (
            <>
              {clients.map((client) => (
                <TouchableOpacity 
                  key={client._id}
                  className="bg-white border border-slate-100 rounded-[2rem] p-5 mb-4 shadow-sm flex-row items-center"
                  onPress={() => router.push(`/client/${client._id}`)}
                >
                  <View className="w-14 h-14 bg-indigo-50 rounded-2xl items-center justify-center mr-4 border border-indigo-100">
                     <Text className="text-indigo-600 font-black text-lg">
                       {client.firstName?.[0]}{client.lastName?.[0]}
                     </Text>
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-base font-black text-slate-900 uppercase tracking-tight mr-2">
                        {client.lastName} {client.firstName}
                      </Text>
                      <View 
                        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getStatusColor(client.status) }} 
                      />
                    </View>
                    
                    <View className="flex-row items-center mt-1">
                      <CreditCard size={12} color="#94a3b8" />
                      <Text className="ml-1 text-[10px] font-black text-slate-400 tabular-nums uppercase tracking-widest">
                        CIN: {client.cin || 'N/A'}
                      </Text>
                    </View>

                    <View className="flex-row items-center mt-1">
                      <Phone size={12} color="#4f46e5" />
                      <Text className="ml-1 text-[11px] font-bold text-indigo-600 tabular-nums">
                        {client.phone}
                      </Text>
                    </View>
                  </View>

                  <ChevronRight size={20} color="#cbd5e1" />
                </TouchableOpacity>
              ))}
            </>
          )}

          <View className="h-20" />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
