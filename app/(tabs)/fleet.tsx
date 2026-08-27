import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView, RefreshControl, Image } from 'react-native';
import { carApi } from '../../src/api';
import { Search, Filter, Car as CarIcon, MapPin, Gauge } from 'lucide-react-native';

export default function FleetScreen() {
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCars = async () => {
    try {
      const data = await carApi.getAll();
      setCars(data);
    } catch (err) {
      console.error('Failed to fetch cars', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchCars();
  }, []);

  const CarCard = ({ item }: { item: any }) => (
    <TouchableOpacity className="bg-white border border-slate-100 rounded-[2.5rem] p-6 mb-6 shadow-sm">
       <View className="flex-row justify-between items-start mb-4">
          <View>
             <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.brand}</Text>
             <Text className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{item.model}</Text>
          </View>
          <View className={`px-3 py-1.5 rounded-full ${item.isAvailable ? 'bg-emerald-50' : 'bg-rose-50'}`}>
             <Text className={`text-[8px] font-black tracking-widest uppercase ${item.isAvailable ? 'text-emerald-600' : 'text-rose-600'}`}>
                {item.isAvailable ? 'Disponible' : 'Loué'}
             </Text>
          </View>
       </View>

       <View className="flex-row items-center gap-6 mb-4">
          <View className="flex-row items-center gap-2">
             <Gauge size={14} color="#94a3b8" />
             <Text className="text-xs font-bold text-slate-600 tabular-nums">{item.mileage} KM</Text>
          </View>
          <View className="flex-row items-center gap-2">
             <MapPin size={14} color="#94a3b8" />
             <Text className="text-xs font-bold text-slate-600 uppercase">{item.matricule}</Text>
          </View>
       </View>

       <View className="h-px bg-slate-50 w-full mb-4" />

       <View className="flex-row justify-between items-center">
          <View>
             <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tarif Journalier</Text>
             <Text className="text-lg font-black text-indigo-600 tabular-nums">{item.dailyRate} <Text className="text-[10px]">TND</Text></Text>
          </View>
          <TouchableOpacity className="bg-slate-900 px-6 h-10 rounded-xl items-center justify-center">
             <Text className="text-white text-[9px] font-black uppercase tracking-widest">Détails</Text>
          </TouchableOpacity>
       </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        {/* Header */}
        <View style={{ marginTop: 32, marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
           <View>
              <Text style={{ fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 3, color: '#94a3b8' }}>Gestion de la Flotte</Text>
              <Text style={{ fontSize: 30, fontWeight: '900', letterSpacing: -1.5, color: '#0f172a', marginTop: 4 }}>
                Ma <Text style={{ color: '#4f46e5', fontStyle: 'italic' }}>Flotte</Text>
              </Text>
           </View>
           <TouchableOpacity style={{ width: 48, height: 48, backgroundColor: '#f8fafc', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }}>
              <Search size={20} color="#64748b" />
           </TouchableOpacity>
        </View>

        <FlatList
          data={cars}
          renderItem={({ item }) => <CarCard item={item} />}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View className="py-20 items-center">
               <CarIcon size={48} color="#e2e8f0" strokeWidth={1} />
               <Text className="text-[10px] font-black uppercase tracking-widest text-slate-300 mt-4">Aucun véhicule trouvé</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}
