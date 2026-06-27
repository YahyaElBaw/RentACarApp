<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Car, IdCard, Loader2, ArrowRight, ShieldCheck, Lock } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const router = useRouter()
const authStore = useAuthStore()

const credentials = reactive({
  cin: '',
  phone: '',
})

const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    const success = await authStore.login(credentials)
    if (success) {
      router.push('/')
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Identifiants invalides. Veuillez vérifier votre CIN et Téléphone.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="relative min-h-screen w-full flex items-center justify-center bg-background overflow-hidden font-outfit transition-colors duration-700">
    <!-- Dynamic background elements -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute -top-48 -left-48 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px]"></div>
      <div class="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-bounce-slow"></div>
    </div>

    <!-- Login Container -->
    <transition appear>
      <div class="relative z-10 w-full max-w-md px-6 animate-in fade-in zoom-in-95 duration-1000">
        
        <!-- Branding -->
        <div class="text-center mb-10 space-y-2">
            <div class="mx-auto w-20 h-20 bg-primary rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary/20 rotate-3 transition-transform hover:rotate-0 duration-500">
                <Car class="w-10 h-10 text-white stroke-[2.5]" />
            </div>
            <h1 class="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">
                Rent<span class="text-primary italic">A</span>Car
            </h1>
            <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Fleet Management Ecosystem</p>
        </div>

        <Card class="bg-white/70 backdrop-blur-3xl border-slate-200/60 shadow-3xl rounded-[3rem] overflow-hidden">
          <CardHeader class="p-10 pb-0 text-center">
            <CardTitle class="text-xl font-black text-slate-900 uppercase tracking-tight italic">Authentification</CardTitle>
          </CardHeader>

          <CardContent class="p-10 space-y-8">
            <form @submit.prevent="handleLogin" class="space-y-6">
              <div class="space-y-3">
                <Label for="cin" class="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-2">Identifiant CIN</Label>
                <div class="relative group">
                  <IdCard class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-600/50 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    id="cin" 
                    v-model="credentials.cin" 
                    placeholder="CIN de l'opérateur" 
                    class="w-full h-14 pl-12 pr-4 bg-white/50 border border-slate-200 rounded-2xl font-black text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all uppercase tracking-widest text-sm"
                    required 
                  />
                </div>
              </div>

              <div class="space-y-3">
                <Label for="phone" class="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-2">Mot de Passe Sécurisé</Label>
                <div class="relative group">
                  <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-600/50 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    id="phone" 
                    type="password"
                    v-model="credentials.phone" 
                    placeholder="••••••••" 
                    class="w-full h-14 pl-12 pr-4 bg-white/50 border border-slate-200 rounded-2xl font-black text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all tracking-[0.5em]"
                    required 
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                class="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all duration-300 shadow-2xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-[11px]"
                :disabled="loading"
              >
                <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
                <span v-else>Autoriser l'Accès</span>
                <ArrowRight v-if="!loading" class="w-5 h-5 stroke-[3]" />
              </Button>

              <transition name="fade">
                <div v-if="error" class="bg-rose-500/10 border-2 border-rose-500/20 text-rose-600 text-[10px] font-black uppercase tracking-widest py-4 px-5 rounded-2xl flex items-center gap-3">
                  <ShieldCheck class="w-4 h-4 shrink-0" />
                  {{ error }}
                </div>
              </transition>
            </form>
          </CardContent>

          <CardFooter class="bg-slate-50/50 p-8 flex flex-col items-center border-t border-slate-100">
            <p class="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] text-center leading-relaxed italic">
              Environnement Sécurisé • Accès Restreint<br/>
              © 2026 Fleet Authority System
            </p>
          </CardFooter>
        </Card>
      </div>
    </transition>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&display=swap');

.font-outfit {
  font-family: 'Outfit', sans-serif;
}

.animate-bounce-slow {
  animation: bounce-float 8s infinite ease-in-out;
}

@keyframes bounce-float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-30px) scale(1.05); }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
