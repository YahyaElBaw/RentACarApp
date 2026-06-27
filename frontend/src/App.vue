<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
  LayoutDashboard, Car, FileText, Users, Calendar, Wallet, 
  LogOut, ShieldCheck, X, Calculator, Bell, AlertCircle, CheckCircle2,
  Rocket, RefreshCcw, ChevronRight, Search, Settings, WifiOff
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge/index'
import Toast from 'primevue/toast'
import { dashboardApi, vidangeApi, visiteApi, settingApi } from '@/api'
import { onMounted, onUnmounted, reactive } from 'vue'
import { useToast } from 'primevue/usetoast'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 as LoaderIcon } from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const user = computed(() => authStore.user)
const isMobileMenuOpen = ref(false)

// Close sidebar on route change
watch(() => route.path, () => {
  isMobileMenuOpen.value = false
})

const menuItems = computed(() => {
  const items = [
    { label: 'menu.dashboard', to: '/', icon: LayoutDashboard },
    { label: 'menu.availability', to: '/availability', icon: Search },
    { label: 'menu.cars', to: '/cars', icon: Car },
    { label: 'menu.contracts', to: '/contrats', icon: FileText },
    { label: 'menu.clients', to: '/clients', icon: Users },
    { label: 'menu.reservations', to: '/reservations', icon: Calendar },
  ];
  
  if (authStore.isAdmin) {
    items.push({ label: 'menu.accounting', to: '/comptabilite', icon: Calculator });
  }
  
  items.push({ label: 'menu.expenses', to: '/depenses', icon: Wallet });
  return items;
})

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

// App Versioning Logic
const APP_VERSION = '1.0.0'
const showUpdateDialog = ref(false)
const remoteVersion = ref('')

const checkVersion = async () => {
  try {
    const res = await dashboardApi.getAppVersion()
    const lastDismissed = localStorage.getItem('app_update_dismissed')
    
    if (res && res.version && res.version !== APP_VERSION && res.version !== lastDismissed) {
      remoteVersion.value = res.version
      showUpdateDialog.value = true
    }
  } catch (err) {
    console.warn('Silent: Version check failed')
  }
}

const reloadApp = () => {
  if (remoteVersion.value) {
    localStorage.setItem('app_update_dismissed', remoteVersion.value)
  }
  window.location.reload()
}

// Global Alerts Logic
const alerts = ref<any[]>([])
const showAlertsModal = ref(false)
const appSettings = ref<any>(null)

const fetchSettings = async () => {
  try {
    const res = await settingApi.get()
    appSettings.value = res
  } catch (err) {
    console.error('Failed to fetch settings', err)
  }
}

const fetchAlerts = async () => {
  if (!isAuthenticated.value) return
  try {
    const stats = await dashboardApi.getStats()
    alerts.value = stats.alerts || []
  } catch (err) {
    console.error('Failed to fetch alerts', err)
  }
}

let alertInterval: any = null

const isOffline = ref(!navigator.onLine)
const apiErrorCount = ref(0)
const retrying = ref(false)

const handleOnline = () => {
  isOffline.value = false
  apiErrorCount.value = 0
}

const handleOffline = () => {
  isOffline.value = true
}

const handleApiError = () => {
  if (!navigator.onLine) {
    isOffline.value = true
  } else {
    apiErrorCount.value++
    if (apiErrorCount.value >= 3) {
      isOffline.value = true
    }
  }
}

const retryConnection = async () => {
  retrying.value = true
  
  if (!navigator.onLine) {
    isOffline.value = true
    toast.add({ severity: 'warn', summary: 'Connexion hors ligne', detail: 'Votre connexion Internet est toujours coupée.', life: 3000 })
    retrying.value = false
    return
  }
  
  try {
    await dashboardApi.getAppVersion()
    isOffline.value = false
    apiErrorCount.value = 0
    toast.add({ severity: 'success', summary: 'Rétabli', detail: 'Connexion établie avec succès !', life: 3000 })
  } catch (err) {
    isOffline.value = true
    toast.add({ severity: 'error', summary: 'Serveur injoignable', detail: 'Le serveur de données ne répond pas ou est trop lent.', life: 3000 })
  } finally {
    retrying.value = false
  }
}

onMounted(() => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  window.addEventListener('api-network-error', handleApiError)
  checkVersion()
  if (isAuthenticated.value) {
    fetchSettings()
    fetchAlerts()
    alertInterval = setInterval(fetchAlerts, 60000 * 5) // Every 5 mins
  }
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener('api-network-error', handleApiError)
  if (alertInterval) clearInterval(alertInterval)
})

watch(isAuthenticated, (val) => {
  if (val) {
    fetchSettings()
    fetchAlerts()
    if (!alertInterval) alertInterval = setInterval(fetchAlerts, 60000 * 5)
  } else {
    if (alertInterval) {
      clearInterval(alertInterval)
      alertInterval = null
    }
    alerts.value = []
  }
})

// Quick Vidange State
const showVidangeDialog = ref(false)
const submittingVidange = ref(false)
const selectedCarForVidange = ref<any>(null)
const vidangeForm = reactive({
  date: new Date().toISOString().split('T')[0],
  mileageAtChange: 0,
  oilType: '5W40 Premium',
  amount: 0,
  nextChangeMileage: 0,
  notes: ''
})

// Quick Visite State
const showVisiteDialog = ref(false)
const submittingVisite = ref(false)
const selectedCarForVisite = ref<any>(null)
const visiteForm = reactive({
  date: new Date().toISOString().split('T')[0],
  mileageAtVisit: 0,
  cost: 0,
  result: 'pass',
  nextVisitDate: '',
  notes: ''
})

const handleAlertClick = (alert: any) => {
  const msg = alert.message?.toLowerCase() || ''
  const isVidange = alert.code === 'VIDANGE' || msg.includes('vidange')
  const isVisite = alert.code === 'VISITE' || msg.includes('visite technique')

  if (isVidange) {
    selectedCarForVidange.value = alert
    vidangeForm.mileageAtChange = alert.currentMileage || 0
    vidangeForm.nextChangeMileage = (alert.currentMileage || 0) + (appSettings.value?.vidangeLimit || 10000)
    vidangeForm.date = new Date().toISOString().split('T')[0]
    vidangeForm.amount = 0
    vidangeForm.notes = ''
    showVidangeDialog.value = true
    showAlertsModal.value = false
    return
  }

  if (isVisite) {
    selectedCarForVisite.value = alert
    visiteForm.date = new Date().toISOString().split('T')[0]
    visiteForm.mileageAtVisit = alert.currentMileage || 0
    visiteForm.cost = 0
    visiteForm.result = 'pass'
    
    const d = new Date()
    d.setMonth(d.getMonth() + (appSettings.value?.visiteLimit || 6))
    visiteForm.nextVisitDate = d.toISOString().split('T')[0]
    
    showVisiteDialog.value = true
    showAlertsModal.value = false
    return
  }
  
  showAlertsModal.value = false
  if (alert.clientId) {
    router.push(`/clients/${alert.clientId}`)
  } else {
    router.push('/cars')
  }
}

const submitVisite = async () => {
  if (!selectedCarForVisite.value?.carId) return
  submittingVisite.value = true
  try {
    const payload = {
      ...visiteForm,
      car: selectedCarForVisite.value.carId
    }
    await visiteApi.create(payload)
    toast.add({ 
      severity: 'success', 
      summary: 'Maintenance Enregistrée', 
      detail: `La visite technique pour ${selectedCarForVisite.value.carBrand} a été enregistrée.`, 
      life: 5000 
    })
    showVisiteDialog.value = false
    fetchAlerts() 
  } catch (err: any) {
    console.error('Failed to create visite', err)
    toast.add({ 
      severity: 'error', 
      summary: 'Erreur', 
      detail: err.response?.data?.message || "Échec de l'enregistrement", 
      life: 5000 
    })
  } finally {
    submittingVisite.value = false
  }
}

watch(() => visiteForm.date, (newDate) => {
  if (newDate) {
    const d = new Date(newDate)
    d.setMonth(d.getMonth() + (appSettings.value?.visiteLimit || 6))
    visiteForm.nextVisitDate = d.toISOString().split('T')[0]
  }
})

const submitVidange = async () => {
  if (!selectedCarForVidange.value?.carId) return
  submittingVidange.value = true
  try {
    const payload = {
      ...vidangeForm,
      car: selectedCarForVidange.value.carId
    }
    await vidangeApi.create(payload)
    toast.add({ 
      severity: 'success', 
      summary: 'Maintenance Enregistrée', 
      detail: `La vidange pour ${selectedCarForVidange.value.carBrand} a été enregistrée.`, 
      life: 5000 
    })
    showVidangeDialog.value = false
    fetchAlerts() // Refresh alerts immediately
  } catch (err: any) {
    console.error('Failed to create vidange', err)
    toast.add({ 
      severity: 'error', 
      summary: 'Erreur', 
      detail: err.response?.data?.message || "Échec de l'enregistrement", 
      life: 5000 
    })
  } finally {
    submittingVidange.value = false
  }
}

watch(() => vidangeForm.mileageAtChange, (newVal) => {
  vidangeForm.nextChangeMileage = newVal + (appSettings.value?.vidangeLimit || 10000)
})
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-outfit relative">
    
    <!-- Authenticated Layout -->
    <div v-if="isAuthenticated && route.name !== 'login'" class="flex min-h-screen">
      
      <!-- Backdrop for Mobile -->
      <div 
        v-if="isMobileMenuOpen" 
        class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm xl:hidden transition-opacity duration-300"
        @click="isMobileMenuOpen = false"
      ></div>

      <!-- Premium Sidebar -->
      <aside 
        :class="[
          'fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-all duration-500 transform border-r bg-white border-border text-muted-foreground shadow-2xl xl:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        ]"
      >
        <div class="p-8 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Car class="text-white w-6 h-6" />
            </div>
            <span class="text-2xl font-black tracking-tighter text-slate-900">
              Rent<span class="text-primary">A</span>Car
            </span>
          </div>
          <Button variant="ghost" size="icon" class="xl:hidden" @click="isMobileMenuOpen = false">
             <X class="w-6 h-6" />
          </Button>
        </div>

        <nav class="flex-1 px-4 space-y-2 mt-4 overflow-y-auto no-scrollbar">
          <router-link 
            v-for="item in menuItems" 
            :key="item.to" 
            :to="item.to" 
            v-slot="{ isActive }"
          >
            <div :class="[
              'flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 group', 
              isActive 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' 
                : 'hover:bg-accent text-muted-foreground hover:text-foreground'
            ]">
              <component :is="item.icon" :class="['w-5 h-5 transition-transform group-hover:scale-110', isActive ? 'text-primary-foreground' : 'text-muted-foreground/60 group-hover:text-primary']" />
              <span>{{ t(item.label) }}</span>
              <div v-if="isActive" class="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse"></div>
            </div>
          </router-link>

          <!-- Admin Only Section -->
          <div v-if="authStore.isAdmin" class="pt-8 pb-2 px-4 uppercase text-[10px] font-black tracking-[0.2em] text-slate-400">
             Authority Control
          </div>
          <router-link 
            v-if="authStore.isAdmin"
            to="/users" 
            v-slot="{ isActive }"
          >
            <div :class="[
              'flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 group', 
              isActive 
                ? 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20 scale-[1.02]' 
                : 'hover:bg-accent text-muted-foreground hover:text-foreground'
            ]">
              <ShieldCheck :class="['w-5 h-5 transition-transform group-hover:scale-110', isActive ? 'text-white' : 'text-slate-500']" />
              <span>Personnel</span>
            </div>
          </router-link>

          <router-link 
            v-if="authStore.isAdmin"
            to="/settings" 
            v-slot="{ isActive }"
          >
            <div :class="[
              'flex items-center gap-4 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 group', 
              isActive 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-[1.02]' 
                : 'hover:bg-accent text-muted-foreground hover:text-foreground'
            ]">
              <Settings :class="['w-5 h-5 transition-transform group-hover:scale-110', isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-600']" />
              <span>Paramètres</span>
            </div>
          </router-link>
        </nav>

        <div class="px-6 py-2 space-y-3">
          <!-- Update Alert (Sidebar Version) -->
          <transition 
            enter-active-class="transition duration-500 ease-out" 
            enter-from-class="opacity-0 -translate-y-4" 
            enter-to-class="opacity-100 translate-y-0" 
            leave-active-class="transition duration-300 ease-in" 
            leave-from-class="opacity-100 translate-y-0" 
            leave-to-class="opacity-0 -translate-y-4"
          >
            <div v-if="showUpdateDialog" class="bg-primary/5 border border-primary/20 rounded-2xl p-4 relative overflow-hidden group">
              <div class="absolute -right-2 -top-2 opacity-5 scale-150 rotate-12 transition-transform group-hover:scale-[1.7]">
                <Rocket class="w-12 h-12 text-primary" />
              </div>
              
              <div class="relative flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <RefreshCcw class="w-4 h-4 text-primary animate-spin-slow" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Mise à jour {{ remoteVersion }}</p>
                  <p class="text-[9px] font-medium text-slate-500 leading-tight mb-2">Une nouvelle version est disponible.</p>
                  <button 
                    @click="reloadApp" 
                    class="text-[9px] font-black uppercase tracking-tighter text-primary hover:text-primary/70 transition-colors flex items-center gap-1.5"
                  >
                    Actualiser maintenant <ChevronRight class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </transition>

          <div class="rounded-2xl p-4 flex items-center gap-3 border bg-muted/30 border-border">
             <Avatar class="w-10 h-10 border border-border">
                <AvatarFallback class="bg-primary/20 text-primary font-bold">
                   {{ user?.lastName?.[0] }}
                </AvatarFallback>
             </Avatar>
             <div class="flex-1 min-w-0">
                <p class="text-sm font-bold truncate text-foreground">{{ user?.lastName }} {{ user?.firstName }}</p>
                <Badge variant="outline" class="text-[9px] h-4 px-1.5 border-primary/30 text-primary uppercase font-black">
                   {{ user?.role }}
                </Badge>
             </div>
             <button @click="handleLogout" class="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors group" title="Logout">
                <LogOut class="w-5 h-5 transition-transform group-hover:scale-110 text-muted-foreground/50" />
             </button>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col min-w-0 bg-background transition-colors duration-400 xl:pl-72">
        <!-- Top Navigation / Header -->
        <header class="h-20 border-b flex items-center justify-between px-8 bg-white/50 backdrop-blur-md sticky top-0 z-30">
           <div class="flex items-center gap-4">
              <Button variant="ghost" size="icon" class="xl:hidden" @click="isMobileMenuOpen = true">
                 <LayoutDashboard class="w-6 h-6" />
              </Button>
           </div>
           
           <div class="flex items-center gap-4">
              <!-- Global Notification Bell -->
              <button @click="showAlertsModal = true" class="relative group outline-none hover:scale-105 active:scale-95 transition-all">
                <div class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm group-hover:bg-primary group-hover:border-primary transition-colors duration-300">
                  <Bell :class="['w-5 h-5 transition-colors duration-300', alerts.length > 0 ? 'text-primary group-hover:text-white' : 'text-slate-400 group-hover:text-white']" />
                </div>
                <div v-if="alerts.length" class="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                  <span class="text-[8px] font-black text-white leading-none tabular-nums mt-[1px]">{{ alerts.length }}</span>
                </div>
              </button>
           </div>
        </header>

        <!-- Route Content -->
        <div class="flex-1 p-0 overflow-x-hidden">
           <router-view v-slot="{ Component }">
              <transition name="fade" mode="out-in">
                 <component :is="Component" />
              </transition>
           </router-view>
        </div>
      </main>
    </div>

    <div v-else class="bg-background text-foreground transition-colors duration-400 min-h-screen">
      <router-view />
    </div>

    <!-- Centralized Alert Sidebar -->
    <Teleport to="body">
       <transition 
          enter-active-class="transition duration-300 ease-out" 
          enter-from-class="translate-x-full opacity-0" 
          enter-to-class="translate-x-0 opacity-100" 
          leave-active-class="transition duration-200 ease-in" 
          leave-from-class="translate-x-0 opacity-100" 
          leave-to-class="translate-x-full opacity-0"
       >
          <div v-if="showAlertsModal" class="fixed inset-y-0 right-0 z-[100] w-full max-w-sm bg-white border-l border-slate-100 shadow-[-20px_0_60px_rgba(0,0,0,0.1)] flex flex-col p-8 overflow-hidden">
             <button @click="showAlertsModal = false" class="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-colors rounded-full"><X class="w-5 h-5"/></button>
             
             <h2 class="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3 mb-8 shrink-0">
               <span class="relative flex h-3 w-3">
                 <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                 <span class="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
               </span>
               Centre d'<span class="text-primary italic">Alertes</span>
             </h2>

             <div class="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-10">
                <template v-if="alerts.length">
                   <div v-for="(alert, idx) in alerts" :key="idx" 
                     @click="handleAlertClick(alert)"
                     :class="[
                     'p-5 rounded-[1.5rem] border transition-all hover:scale-[1.02] flex items-start gap-4 cursor-pointer',
                     alert.type === 'critique' || alert.type === 'urgent' ? 'bg-destructive/5 border-destructive/10 shadow-lg shadow-destructive/5' : 'bg-muted/30 border-border shadow-sm'
                   ]">
                      <AlertCircle :class="['w-5 h-5 shrink-0 mt-0.5', alert.type === 'critique' || alert.type === 'urgent' ? 'text-destructive' : 'text-amber-500']" />
                      <div class="space-y-1">
                         <p class="text-xs font-black text-foreground leading-tight">{{ alert.message }}</p>
                         <p :class="['text-[8px] font-black uppercase tracking-[0.2em] mt-1', alert.type === 'critique' || alert.type === 'urgent' ? 'text-destructive' : 'text-amber-500']">{{ alert.type || 'Avertissement' }}</p>
                      </div>
                   </div>
                </template>
                <div v-else class="flex flex-col items-center justify-center py-20 opacity-30 text-center space-y-4">
                   <CheckCircle2 class="w-12 h-12 text-foreground stroke-1" />
                   <p class="text-[9px] font-black text-foreground uppercase tracking-[0.3em]">Tout est en ordre</p>
                </div>
             </div>
          </div>
       </transition>
       <transition 
          enter-active-class="transition duration-300" 
          enter-from-class="opacity-0" 
          enter-to-class="opacity-100" 
          leave-active-class="transition duration-200" 
          leave-from-class="opacity-100" 
          leave-to-class="opacity-0"
       >
          <div v-if="showAlertsModal" @click="showAlertsModal = false" class="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-[90]"></div>
       </transition>
    </Teleport>
    <Dialog v-model:open="showVidangeDialog">
      <DialogContent class="sm:max-w-xl bg-white border-none shadow-3xl rounded-[2.5rem] p-0 overflow-hidden">
        <DialogHeader class="p-8 bg-slate-900 text-white relative">
          <div class="flex items-center gap-5 relative z-10">
            <div class="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Calculator class="w-7 h-7 text-white" />
            </div>
            <div>
              <DialogTitle class="text-2xl font-black uppercase tracking-tight">Nouvelle <span class="text-primary italic">Vidange</span></DialogTitle>
              <DialogDescription class="text-slate-400 font-bold uppercase text-[9px] mt-1">
                {{ selectedCarForVidange?.carBrand }} {{ selectedCarForVidange?.carModel }} — {{ selectedCarForVidange?.carMatricule }}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="p-8 space-y-6">
          <div class="grid grid-cols-2 gap-6">
            <div class="space-y-2">
              <Label class="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Date du service</Label>
              <Input type="date" v-model="vidangeForm.date" class="h-12 rounded-xl" />
            </div>
            <div class="space-y-2">
              <Label class="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Type d'huile</Label>
              <Input v-model="vidangeForm.oilType" placeholder="ex: 5W40 Synthetic" class="h-12 rounded-xl" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <div class="space-y-2">
              <Label class="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">KM au Compteur</Label>
              <Input type="number" v-model.number="vidangeForm.mileageAtChange" class="h-12 rounded-xl font-black" />
            </div>
            <div class="space-y-2">
              <Label class="text-[10px] font-black uppercase tracking-widest ml-1 text-primary">Prochaine Vidange</Label>
              <Input type="number" v-model.number="vidangeForm.nextChangeMileage" class="h-12 rounded-xl bg-primary/5 text-primary border-primary/20 font-black" />
            </div>
          </div>

          <div class="space-y-2">
            <Label class="text-[10px] font-black uppercase tracking-widest ml-1 text-emerald-600">Coût du service (TND)</Label>
            <Input type="number" v-model.number="vidangeForm.amount" placeholder="0.00" class="h-14 rounded-xl text-lg font-black bg-emerald-50 border-emerald-100 text-emerald-700" />
          </div>

          <div class="space-y-2">
            <Label class="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Notes additionnelles</Label>
            <textarea v-model="vidangeForm.notes" class="w-full h-24 p-4 rounded-xl border border-input bg-background text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="Détails sur les filtres, marque d'huile..."></textarea>
          </div>

          <Button 
            @click="submitVidange" 
            :disabled="submittingVidange"
            class="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] gap-3"
          >
            <LoaderIcon v-if="submittingVidange" class="w-5 h-5 animate-spin" />
            {{ submittingVidange ? 'Enregistrement...' : 'Confirmer la Maintenance' }}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showVisiteDialog">
      <DialogContent class="sm:max-w-xl bg-white border-none shadow-3xl rounded-[2.5rem] p-0 overflow-hidden">
        <DialogHeader class="p-8 bg-rose-600 text-white relative">
          <div class="flex items-center gap-5 relative z-10">
            <div class="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg border border-white/30">
              <ShieldCheck class="w-7 h-7 text-white" />
            </div>
            <div>
              <DialogTitle class="text-2xl font-black uppercase tracking-tight">Visite <span class="text-rose-200 italic">Technique</span></DialogTitle>
              <DialogDescription class="text-rose-100 font-bold uppercase text-[9px] mt-1">
                {{ selectedCarForVisite?.carBrand }} {{ selectedCarForVisite?.carModel }} — {{ selectedCarForVisite?.carMatricule }}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="p-8 space-y-6">
          <div class="grid grid-cols-2 gap-6">
            <div class="space-y-2">
              <Label class="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Date du service</Label>
              <Input type="date" v-model="visiteForm.date" class="h-12 rounded-xl" />
            </div>
            <div class="space-y-2">
              <Label class="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Résultat</Label>
              <select v-model="visiteForm.result" class="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-black">
                <option value="pass">FAVORABLE (Validée)</option>
                <option value="fail">DÉFAVORABLE (Échouée)</option>
              </select>
            </div>
          </div>

          <div class="space-y-2">
            <Label class="text-[10px] font-black uppercase tracking-widest ml-1 text-rose-600">Prochaine Visite</Label>
            <Input type="date" v-model="visiteForm.nextVisitDate" class="h-12 rounded-xl bg-rose-50 border-rose-100 text-rose-700 font-black" />
          </div>

          <div class="space-y-2">
            <Label class="text-[10px] font-black uppercase tracking-widest ml-1 text-emerald-600">Coût (TND)</Label>
            <Input type="number" v-model.number="visiteForm.cost" placeholder="0.00" class="h-14 rounded-xl text-lg font-black bg-emerald-50 border-emerald-100 text-emerald-700" />
          </div>

          <div class="space-y-2">
            <Label class="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-400">Notes & Observations</Label>
            <textarea v-model="visiteForm.notes" class="w-full h-24 p-4 rounded-xl border border-input bg-background text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none transition-all" placeholder="Détails sur la visite..."></textarea>
          </div>

          <Button 
            @click="submitVisite" 
            :disabled="submittingVisite || !visiteForm.date || !visiteForm.nextVisitDate"
            class="w-full h-16 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] gap-3"
          >
            <LoaderIcon v-if="submittingVisite" class="w-5 h-5 animate-spin" />
            {{ submittingVisite ? 'Enregistrement...' : 'Valider la Visite' }}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <div 
      v-if="isOffline" 
      class="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md text-white px-6 text-center animate-in fade-in duration-500 animate-out fade-out"
    >
      <div class="relative max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-[3rem] p-10 shadow-2xl overflow-hidden flex flex-col items-center">
         <div class="absolute -right-16 -top-16 w-36 h-36 bg-destructive/10 rounded-full blur-[40px]"></div>
         <div class="absolute -left-16 -bottom-16 w-36 h-36 bg-primary/10 rounded-full blur-[40px]"></div>

         <!-- Wifi Off Animated Icon -->
         <div class="w-24 h-24 bg-destructive/10 border-2 border-destructive/20 text-destructive rounded-[2.5rem] flex items-center justify-center mb-8 rotate-3 shadow-inner relative group">
           <WifiOff class="w-12 h-12 stroke-[2] animate-pulse" />
         </div>

         <h2 class="text-3xl font-black uppercase tracking-tight mb-2 italic">
           Connexion <span class="text-primary">Perdue</span>
         </h2>
         <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 mb-6">
           Impossible de charger les données système
         </p>

         <div class="bg-slate-950/50 border border-slate-850 p-6 rounded-2xl w-full text-left space-y-3 mb-8">
            <p v-if="isOffline" class="text-xs text-slate-400 font-bold leading-relaxed flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-destructive shrink-0"></span>
              Votre appareil est hors ligne. Veuillez vérifier votre Wi-Fi ou vos données mobiles.
            </p>
            <p v-else class="text-xs text-slate-400 font-bold leading-relaxed flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-destructive shrink-0"></span>
              Le serveur de l'application est injoignable ou temporairement indisponible.
            </p>
         </div>

         <Button 
           @click="retryConnection" 
           :disabled="retrying"
           class="w-full h-16 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
         >
           <RefreshCcw :class="['w-5 h-5', retrying ? 'animate-spin' : '']" />
           {{ retrying ? 'Tentative de reconnexion...' : 'Réessayer de charger' }}
         </Button>
      </div>
    </div>

    <Toast />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&display=swap');

.font-outfit {
  font-family: 'Outfit', sans-serif;
}

body {
  margin: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.rtl {
  direction: rtl;
}

/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
</style>
