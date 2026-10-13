<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSocketStore } from '@/stores/socket'
import { 
  LayoutDashboard, Car, FileText, Users, Calendar, Wallet, MapPinned,
  LogOut, ShieldCheck, X, Calculator, Bell, AlertCircle, CheckCircle2,
  RefreshCcw, Search, Settings, WifiOff, ScrollText, Radio, Building2,
  Eye as EyeIcon, EyeOff as EyeOffIcon, Monitor, Smartphone,
  CheckSquare, Square, Trash2, Filter
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge/index'
import TitleBar from '@/components/TitleBar.vue'
import Toast from 'primevue/toast'
import { PasswordConfirmDialog } from '@/components/ui/password-dialog'
import { dashboardApi, vidangeApi, visiteApi, settingApi, userApi, gpsApi } from '@/api'
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
const socketStore = useSocketStore()
const toast = useToast()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const user = computed(() => authStore.user)
const isMobileMenuOpen = ref(false)
const isElectron = !!(window as any).electronAPI
const chromePad = computed(() => (isElectron ? 'pt-[38px]' : ''))

// Close sidebar on route change
watch(() => route.path, () => {
  isMobileMenuOpen.value = false
})

const menuItems = computed(() => {
  const items = [
    { label: 'menu.dashboard', to: '/', icon: LayoutDashboard },
    { label: 'menu.availability', to: '/availability', icon: Search },
    { label: 'menu.cars', to: '/cars', icon: Car },
    { label: 'menu.fleetMap', to: '/fleet-map', icon: MapPinned },
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

const currentRouteTitle = computed(() => {
  const p = route.path
  if (p === '/') return 'Tableau de Bord'
  if (p.startsWith('/availability')) return 'Disponibilité'
  if (p.startsWith('/cars')) return 'Parc Véhicules'
  if (p.startsWith('/fleet-map')) return 'Suivi Flotte GPS'
  if (p.startsWith('/contrats')) return 'Contrats'
  if (p.startsWith('/clients')) return 'Clients'
  if (p.startsWith('/reservations')) return 'Réservations'
  if (p.startsWith('/comptabilite')) return 'Comptabilité'
  if (p.startsWith('/depenses')) return 'Dépenses'
  if (p.startsWith('/users')) return 'Personnel'
  if (p.startsWith('/agences')) return 'Agences'
  if (p.startsWith('/settings')) return 'Paramètres'
  if (p.startsWith('/logs')) return 'Journaux d’Audit'
  return 'RentACar'
})

const refreshApp = () => {
  window.location.reload()
}

const handleLogout = async () => {
  socketStore.disconnect()
  await authStore.logout()
}

// Global Alerts Logic
const alerts = ref<any[]>([])
const showAlertsModal = ref(false)
const showOnlineUsersModal = ref(false)

const roleLabel = (r: string) => {
  if (r === 'super_admin') return 'Super Admin'
  if (r === 'admin') return 'Admin'
  return 'Opérateur'
}

const roleRank = (r: string) => r === 'super_admin' ? 0 : r === 'admin' ? 1 : 2

const allUsers = ref<any[]>([])
const loadDirectoryUsers = async () => {
  try {
    allUsers.value = await userApi.getAll()
  } catch (err) {
    // ignore
  }
}
const onlineIds = computed(() => new Set(socketStore.onlineUsers.map(u => u.userId)))
const directoryUsers = computed(() =>
  allUsers.value
    .map((u: any) => ({ ...u, online: onlineIds.value.has(u._id) }))
    .sort((a: any, b: any) => Number(b.online) - Number(a.online) || roleRank(a.role) - roleRank(b.role))
)
const onlineUsersCount = computed(() => directoryUsers.value.filter(u => u.online).length)

const devicesFor = (u: any): string[] => {
  const o = socketStore.onlineUsers.find(x => x.userId === (u._id || u.userId))
  return o?.devices?.length ? o.devices : [o?.device || 'pc']
}

watch(showOnlineUsersModal, (val) => {
  if (val) loadDirectoryUsers()
})

watch(showAlertsModal, (val) => {
  if (!val) {
    selectMode.value = false
    selectedAlertKeys.value = new Set()
    activeAlertFilter.value = 'all'
  }
})

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
    const data = await dashboardApi.getAlerts()
    alerts.value = Array.isArray(data) ? data : data?.alerts || []
  } catch (err) {
    console.error('Failed to fetch alerts', err)
  }
  await Promise.all([loadDismissedKeys(), loadSpeedAlerts()])
}

// ── Speed alerts (GPS) ───────────────────────────────────────────────────────
let unsubscribeSpeedAlerts: Function | null = null
const speedAlerts = ref<any[]>([])
let unsubscribeKmAlerts: Function | null = null

const formatAlertDateTime = (iso: string): string => {
  const d = new Date(iso)
  const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${date} à ${time}`
}

const handleSpeedAlertEvent = (payload: any) => {
  const a = payload?.data || payload || {}
  const carLabel = [a.brand, a.model].filter(Boolean).join(' ') || 'Véhicule'
  const when = formatAlertDateTime(a.alertAt || new Date().toISOString())
  const limitTxt = Number.isFinite(Number(a.limit)) ? ` (limite ${Number(a.limit)})` : ''
  toast.add({
    severity: 'warn',
    summary: 'Excès de Vitesse',
    detail: `${carLabel} (${a.matricule || '?'}) roule à ${Math.round(a.speed)} km/h${limitTxt} — ${when}`,
    life: 10000,
  })
  alerts.value = [
    {
      message: `${carLabel} (${a.matricule || '?'}) dépasse la limite: ${Math.round(a.speed)} km/h (limite ${a.limit || appSettings.value?.speedAlertLimit || '?'} km/h)`,
      type: 'critique',
      key: `gps:speed:${a.carId || a._id || Date.now()}`,
      code: 'SPEED',
      alertAt: a.alertAt,
    },
    ...alerts.value,
  ]
}

const handleKmAlertEvent = (payload: any) => {
  const a = payload?.data || payload || {}
  const carLabel = [a.brand, a.model].filter(Boolean).join(' ') || 'Véhicule'
  const when = formatAlertDateTime(a.alertAt || new Date().toISOString())
  toast.add({
    severity: 'warn',
    summary: 'Dépassement Kilométrique',
    detail: `${carLabel} (${a.matricule || '?'}) a parcouru ${Math.round(a.kmToday)} km aujourd'hui (max ${a.limit} km/jour) — ${when}`,
    life: 10000,
  })
  alerts.value = [
    {
      message: `${carLabel} (${a.matricule || '?'}) a dépassé le kilométrage journalier: ${Math.round(a.kmToday)} km (max ${a.limit} km/jour)`,
      type: 'urgent',
      key: `gps:km:${a.carId || a._id || Date.now()}`,
      code: 'KM',
      alertAt: a.alertAt,
    },
    ...alerts.value,
  ]
}

const dismissedKeys = ref<Set<string>>(new Set())

const loadDismissedKeys = async () => {
  if (!isAuthenticated.value) return
  try {
    const keys = await dashboardApi.getDismissedKeys()
    dismissedKeys.value = new Set(keys || [])
  } catch {
    // ignore
  }
}

const loadSpeedAlerts = async () => {
  if (!isAuthenticated.value) return
  try {
    const data = await gpsApi.getSpeedAlerts(20)
    speedAlerts.value = data || []
    const gpsAlerts = (data || [])
      .filter((a: any) => !dismissedKeys.value.has(`gps:speed:${a._id}`))
      .map((a: any) => ({
        message: `${[a.brand, a.model].filter(Boolean).join(' ')} (${a.matricule || '?'}) dépasse la limite: ${Math.round(a.speed)} km/h (limite ${a.limit || appSettings.value?.speedAlertLimit || '?'} km/h)`,
        type: 'critique' as const,
        key: `gps:speed:${a._id}`,
        code: 'SPEED',
        alertAt: a.alertAt,
      }))
    const existingKeys = new Set(alerts.value.map((x: any) => x.key))
    const newGpsAlerts = gpsAlerts.filter((x: any) => !existingKeys.has(x.key))
    alerts.value = [...newGpsAlerts, ...alerts.value]
  } catch {
    // ignore
  }
}

const connectSpeedAlertListener = () => {
  if (!unsubscribeSpeedAlerts && isAuthenticated.value) {
    unsubscribeSpeedAlerts = socketStore.onEvent('gps:speed-alert', handleSpeedAlertEvent)
    loadDismissedKeys().then(() => loadSpeedAlerts())
  }
  if (!unsubscribeKmAlerts && isAuthenticated.value) {
    unsubscribeKmAlerts = socketStore.onEvent('gps:km-alert', handleKmAlertEvent)
  }
}

const disconnectSpeedAlertListener = () => {
  if (unsubscribeSpeedAlerts) {
    unsubscribeSpeedAlerts()
    unsubscribeSpeedAlerts = null
  }
  if (unsubscribeKmAlerts) {
    unsubscribeKmAlerts()
    unsubscribeKmAlerts = null
  }
}

// Alert dismissal (admin only, password required)
const showDismissPwd = ref(false)
const dismissPwd = ref('')
const dismissError = ref(false)
const dismissServerError = ref(false)
const dismissing = ref(false)
const pendingDismissKey = ref<string | null>(null)
const showDismissText = ref(false)
const alertForDismiss = ref<any>(null)
const isBulkDismiss = ref(false)

// Alert filters
const activeAlertFilter = ref('all')
const alertFilterOptions = [
  { key: 'all', label: 'Tous', code: null },
  { key: 'VIDANGE', label: 'Vidange', code: 'VIDANGE' },
  { key: 'VISITE', label: 'Visite', code: 'VISITE' },
  { key: 'ASSURANCE', label: 'Assurance', code: 'ASSURANCE' },
  { key: 'INCOMPLETE_CLIENT', label: 'Client', code: 'INCOMPLETE_CLIENT' },
  { key: 'SPEED', label: 'Vitesse', code: 'SPEED' },
  { key: 'KM', label: 'Kilometrage', code: 'KM' },
]

const filteredAlerts = computed(() => {
  if (activeAlertFilter.value === 'all') return alerts.value
  return alerts.value.filter((a: any) => a.code === activeAlertFilter.value)
})

const alertFilterCount = computed(() => {
  const counts: Record<string, number> = { all: alerts.value.length }
  for (const a of alerts.value) {
    const code = a.code || 'other'
    counts[code] = (counts[code] || 0) + 1
  }
  return counts
})

const sortedAlertFilterOptions = computed(() => {
  const allOption = alertFilterOptions.find(f => f.key === 'all') || alertFilterOptions[0]
  const otherOptions = alertFilterOptions.filter(f => f.key !== 'all')
  const sortedOthers = [...otherOptions].sort((a, b) => {
    const countA = alertFilterCount.value[a.key] || 0
    const countB = alertFilterCount.value[b.key] || 0
    return countB - countA
  })
  return [allOption, ...sortedOthers]
})

// Select mode
const selectMode = ref(false)
const selectedAlertKeys = ref<Set<string>>(new Set())

const toggleSelectMode = () => {
  selectMode.value = !selectMode.value
  if (!selectMode.value) {
    selectedAlertKeys.value = new Set()
  }
}

const toggleAlertSelection = (key: string) => {
  const s = new Set(selectedAlertKeys.value)
  if (s.has(key)) s.delete(key)
  else s.add(key)
  selectedAlertKeys.value = s
}

const allFilteredSelected = computed(() => {
  const keys = filteredAlerts.value.map((a: any) => a.key)
  return keys.length > 0 && keys.every((k: string) => selectedAlertKeys.value.has(k))
})

const toggleSelectAll = () => {
  if (allFilteredSelected.value) {
    selectedAlertKeys.value = new Set()
  } else {
    const keys = filteredAlerts.value.map((a: any) => a.key)
    selectedAlertKeys.value = new Set(keys)
  }
}

const selectedCount = computed(() => selectedAlertKeys.value.size)

const askBulkDismiss = () => {
  if (!selectedCount.value || !authStore.isAdmin) return
  isBulkDismiss.value = true
  alertForDismiss.value = null
  pendingDismissKey.value = null
  dismissPwd.value = ''
  dismissError.value = false
  dismissServerError.value = false
  showDismissText.value = false
  showDismissPwd.value = true
}

const askDismissAlert = (alert: any) => {
  if (!authStore.isAdmin || !alert?.key) return
  isBulkDismiss.value = false
  alertForDismiss.value = alert
  pendingDismissKey.value = alert.key
  dismissPwd.value = ''
  dismissError.value = false
  dismissServerError.value = false
  showDismissText.value = false
  showDismissPwd.value = true
}

const cancelDismiss = () => {
  showDismissPwd.value = false
  pendingDismissKey.value = null
  alertForDismiss.value = null
  isBulkDismiss.value = false
  dismissPwd.value = ''
  dismissError.value = false
  dismissServerError.value = false
}

const confirmDismiss = async () => {
  if (dismissing.value) return
  if (!dismissPwd.value) return
  dismissError.value = false
  dismissServerError.value = false
  dismissing.value = true
  try {
    if (isBulkDismiss.value && selectedAlertKeys.value.size > 0) {
      const alertPayloads = alerts.value
        .filter((a: any) => selectedAlertKeys.value.has(a.key))
        .map((a: any) => ({
          key: a.key,
          code: a.code || '',
          type: a.type || '',
          message: a.message || '',
          metadata: a.metadata || {},
        }))
      await dashboardApi.bulkDismissAlert(alertPayloads, dismissPwd.value)
      const removedKeys = new Set(selectedAlertKeys.value)
      alerts.value = alerts.value.filter((a: any) => !removedKeys.has(a.key))
      selectedAlertKeys.value = new Set()
      selectMode.value = false
      showDismissPwd.value = false
      isBulkDismiss.value = false
      dismissPwd.value = ''
      toast.add({ severity: 'success', summary: 'Succes', detail: `${removedKeys.size} notification(s) supprimee(s)`, life: 3000 })
      return
    }

    if (!pendingDismissKey.value) return
    const a = alertForDismiss.value
    await dashboardApi.dismissAlert(pendingDismissKey.value, dismissPwd.value, {
      code: a?.code,
      type: a?.type,
      message: a?.message,
      metadata: a?.metadata,
    })
    showDismissPwd.value = false
    const removedKey = pendingDismissKey.value
    pendingDismissKey.value = null
    alertForDismiss.value = null
    dismissPwd.value = ''
    alerts.value = alerts.value.filter((x) => x.key !== removedKey)
    toast.add({ severity: 'success', summary: 'Succes', detail: 'Notification supprimee', life: 3000 })
  } catch (err: any) {
    if (err?.response?.status === 401) {
      dismissError.value = true
    } else {
      dismissServerError.value = true
    }
  } finally {
    dismissing.value = false
  }
}

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
  if (isAuthenticated.value) {
    fetchSettings()
    fetchAlerts()
    socketStore.connect()
    socketStore.startPresence()
    connectSpeedAlertListener()
  }
})

onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener('api-network-error', handleApiError)
  disconnectSpeedAlertListener()
  socketStore.stopPresence()
  socketStore.disconnect()
})

watch(isAuthenticated, (val) => {
  if (val) {
    fetchSettings()
    fetchAlerts()
    socketStore.connect()
    socketStore.startPresence()
    connectSpeedAlertListener()
  } else {
    socketStore.stopPresence()
    socketStore.disconnect()
    disconnectSpeedAlertListener()
    alerts.value = []
    dismissedKeys.value = new Set()
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
    <div v-if="isAuthenticated && route.name !== 'login'" class="flex min-h-screen" :class="chromePad">
      <TitleBar />
      
      <!-- Backdrop for Mobile -->
      <div 
        v-if="isMobileMenuOpen" 
        class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm xl:hidden transition-opacity duration-300"
        @click="isMobileMenuOpen = false"
      ></div>

      <!-- Premium Glassmorphic Sidebar -->
      <aside 
        :class="[
          'fixed left-0 z-50 w-72 flex flex-col transition-all duration-300 transform border-r bg-white/95 backdrop-blur-2xl border-slate-200/80 text-slate-600 shadow-[0_20px_50px_rgba(15,23,42,0.06)] xl:translate-x-0',
          isElectron ? 'top-[38px] bottom-0' : 'inset-y-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        ]"
      >
        <!-- Logo Branding Header -->
        <div class="p-6 pb-4 flex items-center justify-between border-b border-slate-100">
          <div class="flex items-center gap-3.5 cursor-pointer group" @click="refreshApp">
            <div class="w-11 h-11 bg-gradient-to-tr from-indigo-600 via-primary to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform duration-300">
              <Car class="text-white w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span class="text-xl font-black tracking-tight text-slate-900 block leading-none">
                Rent<span class="text-indigo-600 font-extrabold">A</span>Car
              </span>
              <span class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 block mt-1">
                v2.0.1
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" class="xl:hidden rounded-xl text-slate-400 hover:text-slate-900" @click="isMobileMenuOpen = false">
             <X class="w-5 h-5" />
          </Button>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto no-scrollbar">
          <router-link 
            v-for="item in menuItems" 
            :key="item.to" 
            :to="item.to" 
            v-slot="{ isActive }"
          >
            <div :class="[
              'flex items-center gap-3.5 px-4 py-3 rounded-2xl font-extrabold text-sm tracking-tight transition-all duration-200 group cursor-pointer', 
              isActive 
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/25 scale-[1.01]' 
                : 'hover:bg-slate-100/80 text-slate-600 hover:text-slate-900'
            ]">
              <component :is="item.icon" :class="['w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0', isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600']" />
              <span class="truncate">{{ t(item.label) }}</span>
              <div v-if="isActive" class="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-xs animate-pulse"></div>
            </div>
          </router-link>

          <!-- Administration Section -->
          <template v-if="authStore.isAdmin">
            <div class="pt-6 pb-2 px-4 uppercase text-[9px] font-black tracking-[0.25em] text-slate-400 flex items-center gap-2">
               <span>Administration</span>
               <div class="h-px bg-slate-100 flex-1"></div>
            </div>

            <router-link to="/users" v-slot="{ isActive }">
              <div :class="[
                'flex items-center gap-3.5 px-4 py-3 rounded-2xl font-extrabold text-sm tracking-tight transition-all duration-200 group cursor-pointer', 
                isActive 
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/25 scale-[1.01]' 
                  : 'hover:bg-slate-100/80 text-slate-600 hover:text-slate-900'
              ]">
                <ShieldCheck :class="['w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0', isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600']" />
                <span>Personnel</span>
              </div>
            </router-link>

            <router-link to="/agences" v-slot="{ isActive }">
              <div :class="[
                'flex items-center gap-3.5 px-4 py-3 rounded-2xl font-extrabold text-sm tracking-tight transition-all duration-200 group cursor-pointer', 
                isActive 
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/25 scale-[1.01]' 
                  : 'hover:bg-slate-100/80 text-slate-600 hover:text-slate-900'
              ]">
                <Building2 :class="['w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0', isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600']" />
                <span>Agences</span>
              </div>
            </router-link>

            <router-link to="/settings" v-slot="{ isActive }">
              <div :class="[
                'flex items-center gap-3.5 px-4 py-3 rounded-2xl font-extrabold text-sm tracking-tight transition-all duration-200 group cursor-pointer', 
                isActive 
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/25 scale-[1.01]' 
                  : 'hover:bg-slate-100/80 text-slate-600 hover:text-slate-900'
              ]">
                <Settings :class="['w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0', isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600']" />
                <span>Paramètres</span>
              </div>
            </router-link>

            <router-link v-if="authStore.isSuperAdmin" to="/logs" v-slot="{ isActive }">
              <div :class="[
                'flex items-center gap-3.5 px-4 py-3 rounded-2xl font-extrabold text-sm tracking-tight transition-all duration-200 group cursor-pointer', 
                isActive 
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/25 scale-[1.01]' 
                  : 'hover:bg-slate-100/80 text-slate-600 hover:text-slate-900'
              ]">
                <ScrollText :class="['w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0', isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600']" />
                <span>Logs d'Audit</span>
              </div>
            </router-link>
          </template>
        </nav>

        <!-- User Profile Card in Sidebar Footer -->
        <div class="p-4 border-t border-slate-100">
          <div class="rounded-2xl p-3 flex items-center gap-3 border border-slate-200/70 bg-slate-50/80 shadow-xs">
             <div class="relative">
               <Avatar class="w-10 h-10 border border-white shadow-xs">
                  <AvatarFallback class="bg-indigo-600 text-white font-black text-xs">
                     {{ (user?.lastName?.[0] || 'U').toUpperCase() }}
                  </AvatarFallback>
               </Avatar>
               <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
             </div>
             <div class="flex-1 min-w-0">
                <p class="text-xs font-black truncate text-slate-900">{{ user?.lastName }} {{ user?.firstName }}</p>
                <span class="inline-block text-[9px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-extrabold uppercase tracking-wider mt-0.5">
                   {{ roleLabel(user?.role) }}
                </span>
             </div>
             <button @click="handleLogout" class="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer group" title="Déconnexion">
                <LogOut class="w-4 h-4 transition-transform group-hover:scale-110" />
             </button>
          </div>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col min-w-0 bg-background transition-colors duration-400 xl:pl-72">
        <!-- Top Navigation / Header -->
        <header :class="['border-b border-slate-200/70 flex items-center justify-between px-8 bg-white/80 backdrop-blur-xl sticky z-30 shadow-xs', isElectron ? 'top-[38px] h-20' : 'top-0 h-20']">
           <div class="flex items-center gap-4">
              <Button variant="ghost" size="icon" class="xl:hidden rounded-xl text-slate-500 hover:bg-slate-100" @click="isMobileMenuOpen = true">
                 <LayoutDashboard class="w-5 h-5" />
              </Button>
           </div>
           
           <div class="flex items-center gap-3.5">
               <!-- Active Operators Badge -->
               <div v-if="authStore.isSuperAdmin" @click="showOnlineUsersModal = true"
                 class="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 font-black text-[10px] shadow-xs cursor-pointer hover:bg-emerald-100/70 hover:scale-[1.02] active:scale-95 transition-all">
                 <span class="relative flex h-2 w-2">
                   <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                   <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                 </span>
                 <span class="uppercase tracking-widest font-black">
                    {{ socketStore.onlineCount }} Opérateur{{ socketStore.onlineCount !== 1 ? 's' : '' }}
                 </span>
               </div>

              <!-- Global Notification Bell -->
              <button 
                @click="showAlertsModal = true; loadDismissedKeys().then(() => fetchAlerts())" 
                class="relative group outline-none hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Notifications"
              >
                <div class="w-10 h-10 rounded-2xl bg-slate-100/80 flex items-center justify-center border border-slate-200/60 shadow-xs group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all duration-300">
                  <Bell :class="['w-4 h-4 transition-colors duration-300', alerts.length > 0 ? 'text-indigo-600 group-hover:text-white' : 'text-slate-500 group-hover:text-white']" />
                </div>
                <div v-if="alerts.length" class="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-rose-600 rounded-full border-2 border-white flex items-center justify-center shadow-md">
                  <span class="text-[9px] font-black text-white leading-none tabular-nums">{{ alerts.length }}</span>
                </div>
              </button>
           </div>
        </header>

        <!-- Route Content -->
        <div class="flex-1 p-0 overflow-x-hidden">
           <router-view v-slot="{ Component }">
               <component :is="Component" />
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
          <div v-if="showAlertsModal" class="fixed inset-y-0 right-0 z-[100] w-full max-w-xl bg-white/95 backdrop-blur-2xl border-l border-slate-200/80 shadow-[-25px_0_70px_rgba(15,23,42,0.15)] flex flex-col p-7 overflow-hidden">
             <!-- Header -->
             <div class="flex items-center justify-between mb-4 shrink-0">
               <div>
                 <h2 class="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2.5">
                   <span class="relative flex h-2.5 w-2.5">
                     <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                     <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                   </span>
                   Centre d'<span class="text-indigo-600">Alertes</span>
                 </h2>
                 <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mt-0.5">Notifications & Rappels</p>
               </div>
               <button @click="showAlertsModal = false" class="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors rounded-xl cursor-pointer">
                 <X class="w-5 h-5"/>
               </button>
             </div>

             <!-- Filter Pills -->
             <div class="flex gap-2 mb-3.5 shrink-0 overflow-x-auto no-scrollbar pb-1">
               <button
                 v-for="f in sortedAlertFilterOptions"
                 :key="f.key"
                 @click="activeAlertFilter = f.key"
                 :class="[
                   'px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 shrink-0 cursor-pointer border',
                   activeAlertFilter === f.key
                     ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/25'
                     : (alertFilterCount[f.key] || 0) > 0
                       ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 shadow-xs'
                       : 'bg-slate-100/80 text-slate-400 border-transparent hover:bg-slate-200/70 hover:text-slate-700'
                 ]"
               >
                 <span>{{ f.label }}</span>
                 <span :class="[
                   'min-w-[18px] h-4.5 px-1.5 rounded-full text-[8px] font-black flex items-center justify-center tabular-nums transition-all',
                   activeAlertFilter === f.key
                     ? 'bg-white/20 text-white'
                     : (alertFilterCount[f.key] || 0) > 0
                       ? 'bg-indigo-600 text-white'
                       : 'bg-slate-200/80 text-slate-400'
                 ]">{{ alertFilterCount[f.key] || 0 }}</span>
               </button>
             </div>

             <!-- Select Mode Controls -->
             <div v-if="authStore.isAdmin && filteredAlerts.length" class="flex items-center justify-between mb-3 shrink-0">
               <button
                 @click="toggleSelectMode"
                 :class="[
                   'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer',
                   selectMode ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                 ]"
               >
                 <CheckSquare class="w-3.5 h-3.5" />
                 {{ selectMode ? 'Annuler' : 'Sélectionner' }}
               </button>

               <transition
                 enter-active-class="transition duration-200"
                 enter-from-class="opacity-0 scale-95"
                 enter-to-class="opacity-100 scale-100"
                 leave-active-class="transition duration-150"
                 leave-from-class="opacity-100 scale-100"
                 leave-to-class="opacity-0 scale-95"
               >
                 <button
                   v-if="selectMode && selectedCount > 0"
                   @click="askBulkDismiss"
                   class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest shadow-md shadow-rose-600/25 hover:bg-rose-700 transition-all cursor-pointer"
                 >
                   <Trash2 class="w-3.5 h-3.5" />
                   Supprimer ({{ selectedCount }})
                 </button>
               </transition>
             </div>

             <!-- Select All (in select mode) -->
             <div v-if="selectMode && filteredAlerts.length" class="flex items-center gap-2 mb-2 shrink-0 px-1">
               <button @click="toggleSelectAll" class="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors cursor-pointer">
                 <component :is="allFilteredSelected ? CheckSquare : Square" class="w-4 h-4" />
                 Tout sélectionner
               </button>
             </div>

             <!-- Alert List -->
             <div class="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pb-8">
                <template v-if="filteredAlerts.length">
                   <div v-for="(alert, idx) in filteredAlerts" :key="alert.key || idx" 
                     @click="selectMode ? toggleAlertSelection(alert.key) : handleAlertClick(alert)"
                     :class="[
                     'p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 cursor-pointer',
                     selectedAlertKeys.has(alert.key) ? 'bg-indigo-50/80 border-indigo-200 shadow-sm' : 'hover:bg-slate-50 hover:shadow-xs',
                     !selectedAlertKeys.has(alert.key) && (alert.type === 'critique' || alert.type === 'urgent') ? 'bg-rose-50/40 border-rose-100' : '',
                     !selectedAlertKeys.has(alert.key) && alert.type !== 'critique' && alert.type !== 'urgent' ? 'bg-slate-50/50 border-slate-100' : '',
                   ]">
                      <!-- Checkbox (select mode) -->
                      <button v-if="selectMode" @click.stop="toggleAlertSelection(alert.key)" class="shrink-0 mt-0.5 cursor-pointer">
                        <component :is="selectedAlertKeys.has(alert.key) ? CheckSquare : Square" :class="['w-4 h-4', selectedAlertKeys.has(alert.key) ? 'text-indigo-600' : 'text-slate-300']" />
                      </button>

                      <div :class="[
                        'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs',
                        alert.type === 'critique' || alert.type === 'urgent' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                      ]">
                        <AlertCircle class="w-4 h-4 stroke-[2.2]" />
                      </div>

                       <div class="space-y-1 flex-1 min-w-0">
                          <p class="text-xs font-bold text-slate-900 leading-snug">{{ alert.message }}</p>
                          <p v-if="alert.alertAt" class="text-[9px] font-bold text-slate-400 tabular-nums">{{ formatAlertDateTime(alert.alertAt) }}</p>
                          <div class="flex items-center gap-2 mt-1">
                            <span :class="['text-[8px] font-black uppercase tracking-[0.2em]', alert.type === 'critique' || alert.type === 'urgent' ? 'text-rose-600' : 'text-amber-600']">{{ alert.type || 'Avertissement' }}</span>
                            <span v-if="alert.code" class="text-[7px] font-black uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-full bg-slate-200/60 text-slate-600">{{ alert.code }}</span>
                          </div>
                       </div>
                       <button v-if="authStore.isAdmin && alert.key && !selectMode" @click.stop="askDismissAlert(alert)" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer" title="Supprimer">
                          <X class="w-3.5 h-3.5" />
                       </button>
                    </div>
                </template>
                <div v-else class="flex flex-col items-center justify-center py-20 opacity-40 text-center space-y-3">
                   <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                     <CheckCircle2 class="w-6 h-6 stroke-[2]" />
                   </div>
                   <p class="text-[10px] font-black text-slate-600 uppercase tracking-[0.25em]">Aucune alerte en attente</p>
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
    <PasswordConfirmDialog
      :open="showDismissPwd"
      @update:open="(val: boolean) => { if (!val) cancelDismiss() }"
      v-model:password="dismissPwd"
      title="Sécurité"
      subtitle="Autorisation Requise"
      :description="isBulkDismiss ? `Entrez votre mot de passe pour supprimer ${selectedCount} notification(s).` : 'Entrez votre mot de passe pour supprimer cette notification.'"
      :confirm-label="isBulkDismiss ? `Supprimer (${selectedCount})` : 'Supprimer'"
      variant="danger"
      :loading="dismissing"
      :error="dismissError ? 'Mot de passe incorrect.' : (dismissServerError ? 'Erreur serveur. Réessayez.' : '')"
      @confirm="confirmDismiss"
    />
    <Dialog v-model:open="showOnlineUsersModal">
      <DialogContent class="sm:max-w-md bg-white/95 backdrop-blur-2xl border border-white/80 shadow-[0_25px_70px_-15px_rgba(15,23,42,0.25)] rounded-[2.5rem] p-0 overflow-hidden text-foreground">
        <DialogHeader class="p-7 bg-gradient-to-r from-emerald-600 to-teal-600 text-white relative">
          <div class="flex items-center gap-4 relative z-10">
            <div class="w-13 h-13 bg-white/15 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-950/20">
              <Radio class="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <DialogTitle class="text-xl font-black uppercase tracking-tight">Opérateurs en Ligne</DialogTitle>
              <DialogDescription class="text-white/80 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">
                {{ socketStore.onlineCount }} connecté{{ socketStore.onlineCount !== 1 ? 's' : '' }} en temps réel
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div class="p-6 max-h-[60vh] overflow-y-auto no-scrollbar space-y-4">
          <template v-if="directoryUsers.length">
            <div>
              <p class="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600 mb-2 flex items-center gap-2">
                <span class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                En ligne — {{ onlineUsersCount }}
              </p>
              <div class="space-y-2">
                <div v-for="u in directoryUsers.filter(x => x.online)" :key="u._id"
                  class="flex items-center gap-3.5 p-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/40 hover:bg-white hover:shadow-xs transition-all">
                  <Avatar class="w-10 h-10 shrink-0 border border-white shadow-xs">
                    <AvatarFallback class="bg-emerald-500/15 text-emerald-700 font-black text-xs">
                      {{ (u.firstName || u.name || '?').charAt(0).toUpperCase() }}
                    </AvatarFallback>
                  </Avatar>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-black text-slate-900 truncate">{{ u.firstName }} {{ u.lastName }}</p>
                    <p class="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-0.5">{{ roleLabel(u.role) }}</p>
                  </div>
                  <div class="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase tracking-wider">
                    <span class="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-emerald-100 shadow-xs">
                      <Smartphone v-if="devicesFor(u).includes('phone')" class="w-3 h-3" />
                      <Monitor v-else class="w-3 h-3" />
                      <span class="text-[9px]">{{ devicesFor(u).includes('phone') ? 'Tél' : 'PC' }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="directoryUsers.length - onlineUsersCount > 0">
              <p class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 mb-2 flex items-center gap-2 pt-2">
                <span class="inline-flex rounded-full h-2 w-2 bg-slate-300"></span>
                Hors ligne — {{ directoryUsers.length - onlineUsersCount }}
              </p>
              <div class="space-y-2">
                <div v-for="u in directoryUsers.filter(x => !x.online)" :key="u._id"
                  class="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 opacity-60 transition-all">
                  <Avatar class="w-10 h-10 shrink-0">
                    <AvatarFallback class="bg-slate-200 text-slate-500 font-black text-xs">
                      {{ (u.firstName || u.name || '?').charAt(0).toUpperCase() }}
                    </AvatarFallback>
                  </Avatar>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold text-slate-600 truncate">{{ u.firstName }} {{ u.lastName }}</p>
                    <p class="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{{ roleLabel(u.role) }}</p>
                  </div>
                  <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Hors ligne</span>
                </div>
              </div>
            </div>
          </template>
          <div v-else class="flex flex-col items-center justify-center py-12 opacity-30 text-center space-y-2">
            <Radio class="w-8 h-8 text-slate-500 stroke-1" />
            <p class="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Aucun utilisateur trouvé</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showVidangeDialog">
      <DialogContent class="sm:max-w-xl bg-white/95 backdrop-blur-2xl border border-white/80 shadow-[0_25px_70px_-15px_rgba(15,23,42,0.25)] rounded-[2.5rem] p-0 overflow-hidden">
        <DialogHeader class="p-7 bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 text-white relative">
          <div class="flex items-center gap-4 relative z-10">
            <div class="w-13 h-13 bg-indigo-600/30 border border-white/20 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/25">
              <Calculator class="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle class="text-xl font-black uppercase tracking-tight">Nouvelle <span class="text-indigo-400">Vidange</span></DialogTitle>
              <DialogDescription class="text-slate-300 font-bold uppercase text-[9px] tracking-wider mt-0.5">
                {{ selectedCarForVidange?.carBrand }} {{ selectedCarForVidange?.carModel }} — {{ selectedCarForVidange?.carMatricule }}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="p-7 space-y-5">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label class="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Date du service</Label>
              <Input type="date" v-model="vidangeForm.date" class="h-12 bg-slate-50/80 border-slate-200/80 rounded-2xl font-bold" />
            </div>
            <div class="space-y-1.5">
              <Label class="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Type d'huile</Label>
              <Input v-model="vidangeForm.oilType" placeholder="ex: 5W40 Synthetic" class="h-12 bg-slate-50/80 border-slate-200/80 rounded-2xl font-bold" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label class="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">KM au Compteur</Label>
              <Input type="number" v-model.number="vidangeForm.mileageAtChange" class="h-12 bg-slate-50/80 border-slate-200/80 rounded-2xl font-black" />
            </div>
            <div class="space-y-1.5">
              <Label class="text-[9px] font-black uppercase tracking-widest text-indigo-600 pl-1">Prochaine Vidange</Label>
              <Input type="number" v-model.number="vidangeForm.nextChangeMileage" class="h-12 rounded-2xl bg-indigo-50 border-indigo-200/80 text-indigo-700 font-black" />
            </div>
          </div>

          <div class="space-y-1.5">
            <Label class="text-[9px] font-black uppercase tracking-widest text-emerald-600 pl-1">Coût du service (TND)</Label>
            <Input type="number" v-model.number="vidangeForm.amount" placeholder="0.00" class="h-13 rounded-2xl text-base font-black bg-emerald-50/70 border-emerald-200/80 text-emerald-800" />
          </div>

          <div class="space-y-1.5">
            <Label class="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Notes additionnelles</Label>
            <textarea v-model="vidangeForm.notes" class="w-full h-20 p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 text-xs font-medium focus:bg-white focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-400 outline-none transition-all" placeholder="Détails sur les filtres, huile..."></textarea>
          </div>

          <Button 
            @click="submitVidange" 
            :disabled="submittingVidange"
            class="w-full h-14 bg-gradient-to-r from-indigo-600 to-primary hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98] gap-2.5 cursor-pointer"
          >
            <LoaderIcon v-if="submittingVidange" class="w-4 h-4 animate-spin" />
            {{ submittingVidange ? 'Enregistrement...' : 'Confirmer la Maintenance' }}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showVisiteDialog">
      <DialogContent class="sm:max-w-xl bg-white/95 backdrop-blur-2xl border border-white/80 shadow-[0_25px_70px_-15px_rgba(15,23,42,0.25)] rounded-[2.5rem] p-0 overflow-hidden">
        <DialogHeader class="p-7 bg-gradient-to-r from-rose-600 to-rose-700 text-white relative">
          <div class="flex items-center gap-4 relative z-10">
            <div class="w-13 h-13 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg border border-white/30">
              <ShieldCheck class="w-6 h-6 text-white stroke-[2.2]" />
            </div>
            <div>
              <DialogTitle class="text-xl font-black uppercase tracking-tight">Visite <span class="text-rose-200">Technique</span></DialogTitle>
              <DialogDescription class="text-rose-100 font-bold uppercase text-[9px] tracking-wider mt-0.5">
                {{ selectedCarForVisite?.carBrand }} {{ selectedCarForVisite?.carModel }} — {{ selectedCarForVisite?.carMatricule }}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="p-7 space-y-5">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label class="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Date du service</Label>
              <Input type="date" v-model="visiteForm.date" class="h-12 bg-slate-50/80 border-slate-200/80 rounded-2xl font-bold" />
            </div>
            <div class="space-y-1.5">
              <Label class="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Résultat</Label>
              <select v-model="visiteForm.result" class="w-full h-12 bg-slate-50/80 border border-slate-200/80 rounded-2xl px-3 text-xs font-bold text-slate-800 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400">
                <option value="pass">FAVORABLE (Validée)</option>
                <option value="fail">DÉFAVORABLE (Échouée)</option>
              </select>
            </div>
          </div>

          <div class="space-y-1.5">
            <Label class="text-[9px] font-black uppercase tracking-widest text-rose-600 pl-1">Prochaine Visite</Label>
            <Input type="date" v-model="visiteForm.nextVisitDate" class="h-12 rounded-2xl bg-rose-50 border-rose-200 text-rose-700 font-black" />
          </div>

          <div class="space-y-1.5">
            <Label class="text-[9px] font-black uppercase tracking-widest text-emerald-600 pl-1">Coût (TND)</Label>
            <Input type="number" v-model.number="visiteForm.cost" placeholder="0.00" class="h-13 rounded-2xl text-base font-black bg-emerald-50/70 border-emerald-200/80 text-emerald-800" />
          </div>

          <div class="space-y-1.5">
            <Label class="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Notes & Observations</Label>
            <textarea v-model="visiteForm.notes" class="w-full h-20 p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 text-xs font-medium focus:bg-white focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all" placeholder="Détails sur la visite..."></textarea>
          </div>

          <Button 
            @click="submitVisite" 
            :disabled="submittingVisite || !visiteForm.date || !visiteForm.nextVisitDate"
            class="w-full h-14 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-rose-600/25 transition-all active:scale-[0.98] gap-2.5 cursor-pointer"
          >
            <LoaderIcon v-if="submittingVisite" class="w-4 h-4 animate-spin" />
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

    <Toast position="top-center" />
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

/* ── Modern top-center Toast ─────────────────────────── */
.p-toast {
  width: min(24rem, 92vw) !important;
  max-width: 92vw !important;
  z-index: 9999 !important;
}

.p-toast-message {
  border-radius: 1rem !important;
  box-shadow: 0 12px 32px -8px rgb(2 6 23 / 0.14), 0 4px 12px -4px rgb(2 6 23 / 0.08) !important;
}

.p-toast-message-content {
  padding: 0.875rem 1rem !important;
  gap: 0.75rem !important;
  align-items: flex-start !important;
  border-radius: 1rem !important;
  border: 1px solid rgb(226 232 240 / 0.95) !important;
  background: rgb(255 255 255 / 0.97) !important;
  color: #0f172a !important;
  backdrop-filter: blur(12px);
}

.p-toast-message-success .p-toast-message-content { border-left: 4px solid #10b981 !important; }
.p-toast-message-error .p-toast-message-content { border-left: 4px solid #f43f5e !important; }
.p-toast-message-warn .p-toast-message-content { border-left: 4px solid #f59e0b !important; }
.p-toast-message-info .p-toast-message-content { border-left: 4px solid #0ea5e9 !important; }

.p-toast-message-icon {
  flex-shrink: 0 !important;
  width: 2rem !important;
  height: 2rem !important;
  margin-top: 0.125rem !important;
  border-radius: 9999px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 0.9rem !important;
}
.p-toast-message-success .p-toast-message-icon { background: rgb(16 185 129 / 0.12); color: #059669 !important; }
.p-toast-message-error .p-toast-message-icon { background: rgb(244 63 94 / 0.12); color: #e11d48 !important; }
.p-toast-message-warn .p-toast-message-icon { background: rgb(245 158 11 / 0.14); color: #d97706 !important; }
.p-toast-message-info .p-toast-message-icon { background: rgb(14 165 233 / 0.12); color: #0284c7 !important; }

.p-toast-summary {
  font-weight: 700 !important;
  font-size: 0.875rem !important;
  color: #0f172a !important;
  letter-spacing: -0.01em;
}

.p-toast-detail {
  font-size: 0.8125rem !important;
  line-height: 1.45 !important;
  color: #64748b !important;
  margin-top: 0.125rem !important;
}

.p-toast-close-button {
  align-self: flex-start !important;
  margin-left: 0.25rem !important;
}
.p-toast-close-icon {
  color: rgb(100 116 139 / 0.55) !important;
}

.p-toast-message-enter-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease !important;
}
.p-toast-message-enter-from {
  opacity: 0 !important;
  transform: translateY(-16px) scale(0.96) !important;
}
.p-toast-message-leave-active {
  transition: transform 0.2s ease-in, opacity 0.2s ease-in !important;
}
.p-toast-message-leave-to {
  opacity: 0 !important;
  transform: translateY(-8px) scale(0.98) !important;
}
</style>
