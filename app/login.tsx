import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator, 
  StatusBar 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';
import { 
  Car, 
  Lock, 
  User, 
  ArrowRight, 
  ShieldAlert,
  Eye,
  EyeOff
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  
  const [cin, setCin] = useState('');
  const [phone, setPhone] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!cin || !phone) {
      setError('Identifiants requis');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const success = await login({ cin, phone });
      if (success) router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Login failed:', err);
      if (err.message === 'Network Error') {
        setError('Erreur Réseau : Serveur introuvable');
      } else {
        setError(err.response?.data?.message || 'Identifiants incorrects');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <StatusBar barStyle="dark-content" />
      
      {/* Simple Background Header */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '25%' }}>
        <LinearGradient
          colors={['#4338ca', '#6366f1']}
          style={{ flex: 1, borderBottomLeftRadius: 60, borderBottomRightRadius: 60 }}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View 
            style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}
          >
            {/* Branding */}
            <View style={{ alignItems: 'center', marginTop: -40, marginBottom: 32 }}>
              <View style={{ width: 72, height: 72, backgroundColor: 'white', borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5, marginBottom: 16 }}>
                <Car size={36} color="#4338ca" strokeWidth={2.5} />
              </View>
              <Text style={{ fontSize: 32, fontWeight: '900', color: 'white', letterSpacing: -1.5, textTransform: 'uppercase', fontStyle: 'italic' }}>
                Rent<Text style={{ color: 'rgba(255,255,255,0.7)' }}>A</Text>Car
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 4, marginTop: 4 }}>
                Fleet Management Platform
              </Text>
            </View>

            {/* Login Card */}
            <View style={{ backgroundColor: 'white', borderRadius: 48, padding: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.1, shadowRadius: 40, elevation: 10 }}>
              <View style={{ marginBottom: 40, alignItems: 'center' }}>
                 <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', fontStyle: 'italic' }}>Authentification</Text>
                 <View style={{ width: 48, height: 6, backgroundColor: '#4f46e5', borderRadius: 3, marginTop: 12 }} />
              </View>

              <View>
                {/* CIN Input */}
                <View style={{ marginBottom: 32 }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginLeft: 8, marginBottom: 12 }}>Identifiant CIN</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, height: 64, paddingHorizontal: 24, borderWidth: 1, borderColor: '#f1f5f9' }}>
                    <User size={22} color="#4f46e5" strokeWidth={2} style={{ opacity: 0.6 }} />
                    <TextInput 
                      style={{ flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: 2 }}
                      placeholder="Identifiant"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={cin}
                      onChangeText={setCin}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={{ marginBottom: 40 }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginLeft: 8, marginBottom: 12 }}>Clé d'Accès Sécurisée</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, height: 64, paddingHorizontal: 24, borderWidth: 1, borderColor: '#f1f5f9' }}>
                    <Lock size={22} color="#4f46e5" strokeWidth={2} style={{ opacity: 0.6 }} />
                    <TextInput 
                      style={{ flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '700', color: '#0f172a', letterSpacing: 4 }}
                      placeholder="••••••••"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showPwd}
                      value={phone}
                      onChangeText={setPhone}
                    />
                    <TouchableOpacity onPress={() => setShowPwd(!showPwd)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      {showPwd ? <EyeOff size={22} color="#94a3b8" strokeWidth={2} /> : <Eye size={22} color="#94a3b8" strokeWidth={2} />}
                    </TouchableOpacity>
                  </View>
                </View>

                {error ? (
                  <View style={{ backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#ffe4e6', padding: 16, borderRadius: 16, marginBottom: 32, flexDirection: 'row', alignItems: 'center' }}>
                    <ShieldAlert size={18} color="#e11d48" />
                    <Text style={{ marginLeft: 12, color: '#e11d48', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}>{error}</Text>
                  </View>
                ) : null}

                {/* Submit Button */}
                <TouchableOpacity 
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#4338ca', '#4f46e5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ height: 72, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 3, fontSize: 12 }}>Ouvrir la session</Text>
                        <View style={{ marginLeft: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 100, padding: 8 }}>
                          <ArrowRight size={18} color="white" strokeWidth={3} />
                        </View>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
