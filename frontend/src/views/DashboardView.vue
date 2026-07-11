<template>
  <div class="dashboard-container space-y-12 p-8 max-w-7xl mx-auto">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-2">
        <h1 class="text-4xl font-black tracking-tight text-slate-900 uppercase">Panel de <span class="text-indigo-600">Pilotage</span></h1>
        <p class="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] pl-1">Tableau de Bord Stratégique & KPI</p>
      </div>

      <div class="flex items-center gap-3">
         <div v-if="lastUpdated" class="flex flex-col items-end">
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Dernière Mise à Jour</span>
            <span class="text-xs font-bold text-slate-600 tabular-nums">{{ lastUpdated }}</span>
         </div>
      </div>
    </div>

    <!-- KPI Cards Grid -->
    <div :class="['grid grid-cols-1 md:grid-cols-2 gap-8', authStore.isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2']">
      <Card 
        v-for="(kpi, index) in kpis" 
        :key="kpi.label"
        @mouseenter="() => {
          hoveredKpi = index;
          if (kpi.type === 'count') {
            if (kpi.label.includes('total')) startCountUp('totalCars', stats.totalCars);
            else startCountUp('availableCars', stats.availableCars);
          }
        }"
        @mouseleave="hoveredKpi = null"
        class="group relative overflow-hidden border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] transition-all duration-500 cursor-default active:scale-[0.98]"
      >
        <CardContent class="p-8 relative z-10">
          <div class="flex justify-between items-start mb-6">
            <div :class="['p-4 rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-xl border border-white ', kpi.bg]">
              <component :is="kpi.icon" :class="['w-6 h-6', kpi.color]" />
            </div>
            <div v-if="kpi.trend" class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest shadow-sm border border-emerald-100">
              <TrendingUp class="w-3.5 h-3.5" />
              {{ kpi.trend }}
            </div>
          </div>
          
          <div class="space-y-1">
            <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 pl-0.5">{{ t(kpi.label) }}</p>
            <div class="flex items-baseline gap-2">
              <h3 class="text-4xl font-black text-slate-900 tracking-tighter tabular-nums italic">
                <template v-if="kpi.type === 'currency'">
                   {{ formatBaseCurrency(kpi.value) }}
                  <span class="text-xs font-black text-indigo-400 ml-1">TND</span>
                </template>
                <template v-else>
                  {{ (kpi.label.includes('total') ? displayStats.totalCars : displayStats.availableCars) || kpi.value }}
                </template>
              </h3>
            </div>
          </div>

          <div 
            v-if="kpi.type === 'currency'" 
            class="absolute bottom-0 left-0 right-0 h-20 opacity-30 group-hover:opacity-100 transition-all duration-1000 pointer-events-none"
          >
            <svg class="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <linearGradient :id="'gradient-' + index" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" :style="{ stopColor: '#6366f1', stopOpacity: 0.1 }" />
                  <stop offset="100%" :style="{ stopColor: '#6366f1', stopOpacity: 0 }" />
                </linearGradient>
              </defs>
              <path :d="kpi.path + ' L100,100 L0,100 Z'" :fill="`url(#gradient-${index})`" />
              <path :d="kpi.path" fill="none" stroke="#6366f1" stroke-width="3" stroke-linecap="round" class="animate-draw" />
            </svg>
          </div>
        </CardContent>
        <div class="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
      </Card>
    </div>

    <!-- Quick Launch Grid -->
    <div :class="['grid grid-cols-2 gap-6', quickActions.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-5']">
       <Button 
        v-for="action in quickActions" 
        :key="action.label"
        variant="secondary"
        @click="router.push(action.route)"
        class="h-28 flex-col gap-4 rounded-[1.8rem] bg-white border border-slate-100 shadow-xl shadow-slate-100/50 hover:bg-slate-50 transition-all group active:scale-95"
      >
        <div :class="['p-3 rounded-2xl text-white shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-6', action.color]">
          <component :is="action.icon" class="w-6 h-6 stroke-[2.5]" />
        </div>
        <span class="text-[9px] font-black text-slate-900 uppercase tracking-widest">{{ action.label }}</span>
      </Button>
    </div>

    <!-- Daily Actions Section -->

    <!-- Daily Actions Section -->
    <div class="space-y-6">
      <Card class="border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader class="p-8 pb-4 flex flex-row items-center justify-between">
          <div class="space-y-1">
            <h2 class="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
              Actions du <span class="text-indigo-600 italic">Jour</span>
              <span class="relative flex h-3 w-3">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white"></span>
              </span>
            </h2>
            <CardDescription class="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Planning opérationnel de départ et retour (Aujourd'hui)</CardDescription>
          </div>
          <div class="flex items-center gap-4">
             <div class="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
                <div class="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span class="text-[9px] font-black text-slate-600 uppercase tracking-widest">Temps Réel</span>
             </div>
             <Button variant="ghost" class="h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all" @click="router.push('/contrats')">Tous les Contrats</Button>
          </div>
        </CardHeader>
        <CardContent class="p-0">
          <div v-if="loading" class="p-20 flex flex-col items-center justify-center space-y-4">
             <Loader2 class="w-10 h-10 text-indigo-200 animate-spin" />
             <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Synchronisation de l'agenda...</p>
          </div>
          <template v-else-if="todayActions && todayActions.length">
            <Table>
              <TableHeader>
                <TableRow class="bg-slate-50/50 border-b border-slate-100">
                  <TableHead class="pl-10 py-5 text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">TYPE & HEURE</TableHead>
                  <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">CLIENTS & DOSSIER</TableHead>
                  <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">VÉHICULE & MATRICULE</TableHead>
                  <TableHead class="pr-10 text-right text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">STATUT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="action in todayActions" :key="action.id + action.type" class="group hover:bg-slate-50/50 transition-all duration-500 cursor-pointer border-slate-100" @click="router.push(action.category === 'contrat' ? `/contrats/${action.id}` : `/reservations?id=${action.id}`)">
                  <TableCell class="pl-10 py-6">
                    <div class="flex items-center gap-4">
                       <Badge :variant="action.type === 'départ' ? 'default' : 'secondary'" :class="['h-10 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest border-2', action.type === 'départ' ? 'bg-indigo-600 border-indigo-100' : 'bg-slate-50 border-slate-200 text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors']">
                          {{ action.type }}
                       </Badge>
                       <div class="flex flex-col">
                          <span class="text-sm font-black text-slate-900 tabular-nums italic">{{ new Date(action.date).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) }}</span>
                          <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">{{ action.category }}</span>
                       </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="flex flex-col">
                      <span class="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase text-sm italic">
                        {{ action.clientName }}
                      </span>
                      <div class="flex items-center gap-2 mt-0.5">
                         <Badge variant="outline" class="h-4 px-1.5 rounded-sm border-slate-200 text-[8px] font-black text-slate-400 uppercase tracking-tighter">{{ action.reference || 'REF' }}</Badge>
                         <span class="text-[9px] font-bold text-slate-400 tabular-nums">{{ action.clientPhone }}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="flex items-center gap-4">
                       <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-white transition-all overflow-hidden">
                          <img v-if="action.car?.images?.[0]" :src="getImageUrl(action.car.images[0])" class="w-full h-full object-cover" />
                          <CarIcon v-else class="w-5 h-5 text-slate-300" />
                       </div>
                       <div class="flex flex-col">
                         <span class="font-black text-slate-900 uppercase text-xs italic tracking-tight">{{ action.car?.brand }} {{ action.car?.model }}</span>
                         <span class="font-mono text-[9px] font-black text-indigo-400 uppercase">{{ action.car?.matricule || 'Sans Plaque' }}</span>
                       </div>
                    </div>
                  </TableCell>
                  <TableCell class="pr-10 text-right">
                    <Badge :class="['text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm', getStatusBadgeClasses(action.status)]">
                      {{ getStatusLabel(action.status) }}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </template>
          <div v-else class="p-32 flex flex-col items-center justify-center text-center space-y-6">
             <div class="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-200 relative">
                <Calendar class="w-10 h-10" />
                <div class="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white"></div>
             </div>
             <div class="space-y-1">
                <p class="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Agenda Calme</p>
                <p class="text-[9px] font-bold text-slate-400 uppercase italic">Aucune action planifiée pour aujourd'hui</p>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Floating Converter Button -->
    <Teleport to="body">
      <button @click="showConverterModal = true" class="fixed bottom-10 right-10 z-[100] w-16 h-16 bg-indigo-600 hover:bg-indigo-700 rounded-[2rem] shadow-[0_10px_40px_rgba(79,70,229,0.5)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all outline-none border-4 border-white backdrop-blur-md group">
        <Calculator class="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300 drop-shadow-md" />
      </button>
    </Teleport>

    <!-- Smart Converter Dialog -->
    <Dialog v-model:open="showConverterModal">
      <DialogContent class="sm:max-w-2xl bg-white border-none shadow-2xl rounded-[2.5rem] p-10 overflow-y-auto max-h-[90vh] no-scrollbar">
        <div class="flex flex-col space-y-8">
           <div class="flex items-center gap-5">
              <div class="p-4 bg-indigo-50 rounded-2xl">
                 <Calculator class="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                 <DialogTitle class="text-3xl font-black text-slate-900 uppercase tracking-tight">Convertisseur <span class="text-indigo-600 italic">Intelligent</span></DialogTitle>
                 <p class="text-[10px] font-black uppercase tracking-widest text-indigo-400">Cours du marché en temps réel</p>
              </div>
           </div>

           <div class="space-y-6">
              <!-- Currency Selector -->
              <div class="flex justify-center gap-2 p-1 bg-slate-100 rounded-2xl">
                 <button 
                  v-for="curr in currencies" 
                  :key="curr.label"
                  @click="converter.currency = curr.label"
                  :class="[
                    'flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300',
                    converter.currency === curr.label ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  ]"
                 >
                   {{ curr.label }}
                 </button>
              </div>

              <div class="relative group">
                <Input type="number" v-model="converter.amount" class="h-24 bg-slate-50 border-slate-100 text-slate-900 font-black text-5xl px-10 rounded-[2rem] text-center focus:ring-4 focus:ring-indigo-600/5 transition-all shadow-inner" />
                <div class="absolute right-8 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-100 transition-opacity">
                  <span class="text-2xl font-black text-indigo-600 italic uppercase">{{ converter.currency }}</span>
                </div>
              </div>
              
              <div class="grid grid-cols-3 gap-4 font-black">
                 <div v-for="res in convertedValues.converter" :key="res.label" 
                  :class="[
                    'p-6 rounded-[1.5rem] border-2 transition-all duration-500 flex flex-col items-center justify-center gap-1',
                    res.label === converter.currency ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 text-slate-900'
                  ]"
                 >
                    <span :class="['text-[9px] uppercase tracking-[0.2em]', res.label === converter.currency ? 'text-indigo-200' : 'text-slate-400']">{{ res.label }}</span>
                    <span class="text-lg tabular-nums italic">{{ res.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} <span class="text-[10px] opacity-50 not-italic ml-1">{{ res.symbol }}</span></span>
                 </div>
              </div>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { dashboardApi, getImageUrl } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { 
  Car as CarIcon, FileText, Users, Calendar, Wallet, 
  TrendingUp, CheckCircle2, 
  DollarSign, Calculator,
  Search, Loader2, ShieldAlert, Bell
} from 'lucide-vue-next'
import { 
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell 
} from '@/components/ui/table'
import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const stats = ref<any>({})
const alerts = ref<any[]>([])
const todayActions = ref<any[]>([])
const loading = ref(true)
const lastUpdated = ref<string>('')
const hoveredKpi = ref<number | null>(null)
const history = ref<any[]>([])
const showConverterModal = ref(false)

// Animation State for Count-Up
const displayStats = reactive({
  totalCars: 0,
  availableCars: 0
})

const startCountUp = (key: 'totalCars' | 'availableCars', target: number) => {
  displayStats[key] = target
}

const currencies = ref([
  { label: 'TND', icon: 'Globe', rate: 1, symbol: 'TND' },
  { label: 'EUR', icon: 'Euro', rate: 0.296, symbol: '€' },
  { label: 'USD', icon: 'DollarSign', rate: 0.342, symbol: '$' }
])
const activeCurrency = ref(currencies.value[0])

const converter = reactive({
  amount: 1000,
  currency: 'TND'
})

const convertedValues = computed(() => {
  const amt = converter.amount || 0
  
  const eurRate = currencies.value.find(c => c.label === 'EUR')?.rate || 0.296
  const usdRate = currencies.value.find(c => c.label === 'USD')?.rate || 0.342

  let tnd = 0
  if (converter.currency === 'TND') tnd = amt
  else if (converter.currency === 'EUR') tnd = amt / eurRate
  else if (converter.currency === 'USD') tnd = amt / usdRate

  return {
    converter: [
      { label: 'TND', value: tnd, symbol: 'TND' },
      { label: 'EUR', value: tnd * eurRate, symbol: '€' },
      { label: 'USD', value: tnd * usdRate, symbol: '$' }
    ]
  }
})

const fetchLiveRates = async () => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/TND')
    const data = await response.json()
    if (data.result === 'success') {
      currencies.value = [
        { label: 'TND', icon: 'Globe', rate: 1, symbol: 'TND' },
        { label: 'EUR', icon: 'Euro', rate: data.rates.EUR, symbol: '€' },
        { label: 'USD', icon: 'DollarSign', rate: data.rates.USD, symbol: '$' }
      ]
      const currentActiveLabel = activeCurrency.value.label
      activeCurrency.value = currencies.value.find(c => c.label === currentActiveLabel) || currencies.value[0]
      lastUpdated.value = new Date().toLocaleTimeString('fr-TN')
    }
  } catch (err) {
    console.error('Failed to fetch live rates', err)
  }
}
const formatBaseCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-TN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount || 0)
}

const generateSparklinePath = (data: number[]) => {
  if (!data || data.length < 2) return 'M0,80 Q50,20 100,80'
  const width = 100, height = 100
  const max = Math.max(...data, 1), min = Math.min(...data, 0), range = max - min || 1
  const points = data.map((val, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((val - min) / range) * 70 - 15
  }))
  let path = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p1 = points[i + 1]
    path += ` Q${p0.x},${p0.y} ${(p0.x + p1.x) / 2},${(p0.y + p1.y) / 2}`
  }
  path += ` L${points[points.length - 1].x},${points[points.length - 1].y}`
  return path
}

const kpis = computed(() => {
  const base: any[] = [
    { label: 'dashboard.totalCars', value: stats.value.totalCars || 0, icon: CarIcon, color: 'text-indigo-600', bg: 'bg-indigo-50  border-indigo-100 ', type: 'count' },
    { label: 'dashboard.available', value: stats.value.availableCars || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50  border-emerald-100 ', type: 'count' }
  ]
  if (authStore.isAdmin) {
    base.push(
      { label: 'dashboard.revenue', value: stats.value.totalRevenue || 0, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50  border-indigo-100 ', type: 'currency', trend: '+14.2%', path: generateSparklinePath(history.value.map(h => h.revenue)) },
      { label: 'dashboard.profit', value: stats.value.netProfit || 0, icon: Wallet, color: 'text-rose-600', bg: 'bg-rose-50  border-rose-100 ', type: 'currency', path: generateSparklinePath(history.value.map(h => h.profit)) }
    )
  }
  return base
})

const quickActions = computed(() => {
  const actions = [
    { label: 'Location Directe', icon: FileText, color: 'bg-indigo-600', route: '/contrats/new' },
    { label: 'Disponibilité', icon: Search, color: 'bg-emerald-600', route: '/availability' },
    { label: 'Réservation', icon: Calendar, color: 'bg-indigo-600', route: '/reservations?add=true' },
    { label: 'Nouveau Client', icon: Users, color: 'bg-slate-500', route: '/clients' },
  ]
  
  if (authStore.isAdmin) {
    actions.push({ label: 'Ajout Véhicule', icon: CarIcon, color: 'bg-indigo-400', route: '/cars?add=true' })
  }
  
  return actions
})

const getStatusLabel = (status: string) => {
  if (!status) return '---';
  const s = status.toLowerCase();
  switch (s) {
    case 'active':
    case 'confirmed': return 'ACTIF';
    case 'soon': return 'À VENIR';
    case 'pending': return 'EN ATTENTE';
    case 'closed':
    case 'terminé': return 'TERMINÉ';
    case 'clôturé': return 'CLÔTURÉ';
    case 'cancelled': return 'ANNULÉ';
    default: return s.toUpperCase();
  }
};

const getStatusBadgeClasses = (status: string) => {
  if (!status) return 'bg-slate-50 border-slate-100';
  const s = status.toLowerCase();
  switch (s) {
    case 'active':
    case 'confirmed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'soon': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'closed':
    case 'terminé': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    case 'clôturé': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
    case 'cancelled': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
    default: return 'bg-slate-50 border-slate-100';
  }
};


const loadDashboardData = async () => {
  try {
    const [dashData] = await Promise.all([
      dashboardApi.getStats(),
      fetchLiveRates()
    ])
    stats.value = dashData.kpis || {}
    alerts.value = dashData.alerts || []
    todayActions.value = dashData.todayActions || []
    history.value = dashData.history || []
    setTimeout(() => {
      startCountUp('totalCars', stats.value.totalCars || 0)
      startCountUp('availableCars', stats.value.availableCars || 0)
    }, 400)
  } catch (err) {
    console.error('Failed to load dashboard data', err)
  }
}

onMounted(async () => {
  loading.value = true
  await loadDashboardData()
  loading.value = false
})
</script>


