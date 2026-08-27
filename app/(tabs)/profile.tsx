import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useRouter } from 'expo-router';
import { LogOut, User as UserIcon, Shield, ChevronRight, Settings, Info } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const ProfileLink = ({ icon: Icon, label, color, last }: any) => (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20, borderBottomWidth: last ? 0 : 1, borderBottomColor: '#f8fafc' }}>
       <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={20} color={color} />
          </View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#334155', marginLeft: 8 }}>{label}</Text>
       </View>
       <ChevronRight size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ marginTop: 32, marginBottom: 40, alignItems: 'center' }}>
           <View style={{ width: 96, height: 96, backgroundColor: '#eef2ff', borderRadius: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 }}>
              <Text style={{ fontSize: 32, fontWeight: '900', color: '#4f46e5' }}>
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </Text>
           </View>
           <View style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: -1, marginTop: 16 }}>
                {user?.firstName} {user?.lastName}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100, marginTop: 8 }}>
                 <Shield size={10} color="white" />
                 <Text style={{ fontSize: 8, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: 1.5, marginLeft: 6 }}>
                   {user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Administrateur' : 'Employé'}
                 </Text>
              </View>
           </View>
        </View>

        {/* Section 1 */}
        <View style={{ backgroundColor: '#f8fafc', borderRadius: 32, paddingHorizontal: 20, marginBottom: 32, borderWidth: 1, borderColor: '#f1f5f9' }}>
           <ProfileLink icon={UserIcon} label="Informations Personnel" color="#6366f1" />
           <ProfileLink icon={Settings} label="Paramètres du Panel" color="#64748b" />
           <ProfileLink icon={Info} label="À propos de l'application" color="#94a3b8" last />
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          onPress={handleLogout}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff1f2', height: 64, borderRadius: 24, borderWidth: 1, borderColor: '#ffe4e6' }}
        >
          <LogOut size={18} color="#e11d48" />
          <Text style={{ marginLeft: 12, color: '#e11d48', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, fontSize: 11 }}>Déconnexion</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 40, alignItems: 'center' }}>
           <Text style={{ fontSize: 10, fontWeight: '700', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 2 }}>Version 1.0.0 (ADMIN-NATIVE)</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
