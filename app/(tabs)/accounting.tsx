import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, RefreshControl } from 'react-native';
import { dashboardApi } from '../../src/api';
import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react-native';

export default function AccountingScreen() {
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Accounting stats failed', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  const StatBox = ({ label, value, icon: Icon, color, detail }: any) => (
    <View className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 mb-6">
       <View className="flex-row items-center gap-4 mb-6">
          <View className="w-12 h-12 bg-white rounded-2xl items-center justify-center shadow-sm">
             <Icon size={24} color={color} />
          </View>
          <View>
             <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</Text>
             <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{detail}</Text>
          </View>
       </View>
       <Text className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter">
          {value || '0'} <Text className="text-sm opacity-30">TND</Text>
       </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView 
        className="flex-1 px-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="mt-8 mb-10">
           <Text className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Suivi Financier</Text>
           <Text className="text-3xl font-black tracking-tighter text-slate-900 mt-1">Compta<Text className="text-indigo-600 italic">bilité</Text></Text>
        </View>

        <StatBox 
          label="Recettes Totales" 
          detail="Mois en cours"
          value={stats?.totalRevenue?.toFixed(0)} 
          icon={TrendingUp} 
          color="#10b981" 
        />

        <StatBox 
          label="Charges & Frais" 
          detail="Dépenses enregistrées"
          value={stats?.totalExpenses?.toFixed(0)} 
          icon={TrendingDown} 
          color="#f43f5e" 
        />

        <View className="bg-indigo-600 rounded-[2.5rem] p-8 mb-10 shadow-xl shadow-indigo-100">
           <View className="flex-row items-center gap-4 mb-6">
              <View className="w-12 h-12 bg-white/10 rounded-2xl items-center justify-center border border-white/20">
                 <DollarSign size={24} color="white" />
              </View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Bilan Net Estimé</Text>
           </View>
           <Text className="text-5xl font-black text-white tabular-nums tracking-tighter">
              {( (stats?.totalRevenue || 0) - (stats?.totalExpenses || 0) ).toFixed(0)} <Text className="text-base opacity-50">TND</Text>
           </Text>
        </View>

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
