import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { FileText } from 'lucide-react-native';

export default function ReservationsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
      <FileText size={64} color="#10b981" strokeWidth={1} />
      <Text className="text-sm font-black uppercase tracking-widest text-slate-400 mt-4">Réservations</Text>
      <Text className="text-slate-900 font-bold mt-2">Bientôt disponible</Text>
    </SafeAreaView>
  );
}
