<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { agenceApi, carApi, contratApi, lotContratApi, getImageUrl } from '@/api'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/card/Card.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Button from '@/components/ui/button/Button.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { PasswordConfirmDialog } from '@/components/ui/password-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'
import { usePasswordGuard, isPasswordError, LOCK_SECONDS } from '@/composables/usePasswordGuard'
import AgenceTemplateEditorModal from '@/components/AgenceTemplateEditorModal.vue'
import CarnetDetailModal from '@/components/CarnetDetailModal.vue'
import { 
  ChevronLeft, Building2, Palette, Pencil, Trash2, Loader2, Info, 
  CarFront, FileSignature, CalendarRange, Lock, BookOpen, Plus, 
  CheckCircle2, AlertTriangle, Layers, RotateCcw, XCircle, Hash, Eye,
  Coins, Receipt, Calendar, Printer, Sliders, Check, Sparkles, ArrowRight
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const guard = usePasswordGuard()

const agence = ref<any>(null)
const loading = ref(true)

const agenceCars = ref<any[]>([])
const allContrats = ref<any[]>([])
const loadingCars = ref(true)
const loadingContrats = ref(true)

// Navigation Tab
const activeTab = ref<'carnets' | 'vehicules' | 'contrats'>('carnets')

// --- Carnets de Contrats (Lots) ---
const carnets = ref<any[]>([])
const loadingCarnets = ref(true)
const activeCarnet = computed(() => carnets.value.find((c: any) => c.status === 'ouvert'))
const closedCarnets = computed(() => carnets.value.filter((c: any) => c.status === 'ferme'))

const selectedCarnetForDetail = ref<any>(null)
const showCarnetDetailModal = ref(false)
const openCarnetManager = (carnet: any) => {
  const id = typeof carnet === 'object' ? carnet._id : carnet;
  router.push(`/carnets/${id}`);
}

const togglingTimbreExpense = ref(false)
const toggleTimbreExpense = async () => {
  if (!agence.value?._id || togglingTimbreExpense.value) return
  togglingTimbreExpense.value = true
  try {
    const currentVal = agence.value.applyTimbreExpense !== false
    const newVal = !currentVal
    const updated = await agenceApi.update(agence.value._id, { applyTimbreExpense: newVal })
    agence.value = { ...agence.value, ...updated, applyTimbreExpense: newVal }
    toast.add({
      severity: 'success',
      summary: 'Timbre Fiscal Mis à Jour',
      detail: newVal ? 'Frais de timbre fiscal activés pour cette agence.' : 'Frais de timbre fiscal désactivés pour cette agence.',
      life: 2500
    })
  } catch (err) {
    console.error('Failed to toggle timbre expense', err)
  } finally {
    togglingTimbreExpense.value = false
  }
}

const togglingPrintBackground = ref(false)
const togglePrintBackground = async () => {
  if (!agence.value?._id || togglingPrintBackground.value) return
  togglingPrintBackground.value = true
  try {
    const currentVal = Boolean(agence.value.printBackground)
    const newVal = !currentVal
    const updated = await agenceApi.update(agence.value._id, { printBackground: newVal })
    agence.value = { ...agence.value, ...updated, printBackground: newVal }
    toast.add({
      severity: 'success',
      summary: 'Impression Fond Mise à Jour',
      detail: newVal ? 'Impression avec fond du modèle activée.' : 'Impression sur fond vierge activée.',
      life: 2500
    })
  } catch (err) {
    console.error('Failed to toggle print background', err)
  } finally {
    togglingPrintBackground.value = false
  }
}

const showCreateCarnetModal = ref(false)
const creatingCarnet = ref(false)
const confirmCloseActiveCarnet = ref(false)
const newCarnetForm = reactive({
  name: '',
  startNumber: '000001',
  endNumber: '000150',
  notes: ''
})

const loadCarnets = async () => {
  if (!agence.value?._id) return
  loadingCarnets.value = true
  try {
    carnets.value = await lotContratApi.getAll({ agenceId: agence.value._id })
  } catch (err) {
    console.error('Failed to load carnets', err)
  } finally {
    loadingCarnets.value = false
  }
}

const openNewCarnetModal = () => {
  confirmCloseActiveCarnet.value = false
  const count = carnets.value.length + 1
  newCarnetForm.name = `Carnet #${count}`
  newCarnetForm.startNumber = '000001'
  newCarnetForm.endNumber = '000150'
  newCarnetForm.notes = ''
  showCreateCarnetModal.value = true
}

const submitCreateCarnet = async () => {
  if (!newCarnetForm.name.trim()) return
  const start = parseInt(newCarnetForm.startNumber, 10)
  const end = parseInt(newCarnetForm.endNumber, 10)
  if (isNaN(start) || isNaN(end) || end < start || start < 0) {
    toast.add({ severity: 'error', summary: 'Erreur', detail: 'Plage de numéros invalide.', life: 3000 })
    return
  }

  // If an active carnet exists and hasn't been confirmed yet
  if (activeCarnet.value && !confirmCloseActiveCarnet.value) {
    confirmCloseActiveCarnet.value = true
    return
  }

  creatingCarnet.value = true
  try {
    await lotContratApi.create({
      name: newCarnetForm.name.trim(),
      agence: agence.value._id,
      startNumber: start,
      endNumber: end,
      numberPadding: 6,
      closePrevious: confirmCloseActiveCarnet.value,
      notes: newCarnetForm.notes
    })
    toast.add({
      severity: 'success',
      summary: 'Carnet Créé',
      detail: `Le carnet "${newCarnetForm.name}" est maintenant actif.`,
      life: 3000
    })
    showCreateCarnetModal.value = false
    await loadCarnets()
  } catch (err: any) {
    console.error('Create carnet failed', err)
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: err.response?.data?.detail || 'Impossible de créer le carnet.',
      life: 4000
    })
  } finally {
    creatingCarnet.value = false
  }
}

const closeCarnet = async (id: string) => {
  try {
    await lotContratApi.close(id)
    toast.add({ severity: 'info', summary: 'Carnet Clôturé', detail: 'Le carnet a été fermé.', life: 2000 })
    await loadCarnets()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erreur', detail: 'Échec de la fermeture du carnet.', life: 3000 })
  }
}

const reopenCarnet = async (id: string) => {
  try {
    await lotContratApi.reopen(id, true)
    toast.add({ severity: 'success', summary: 'Carnet Réactivé', detail: 'Le carnet est de nouveau ouvert.', life: 2000 })
    await loadCarnets()
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Erreur', detail: 'Échec de la réouverture du carnet.', life: 3000 })
  }
}

const isEditorModalOpen = ref(false)
const showEditNameModal = ref(false)
const savingName = ref(false)
const editName = ref('')

const showDeleteModal = ref(false)
const deleting = ref(false)
const deletePassword = ref('')

const showInfoModal = ref(false)

type PeriodFilter = 'all' | 'thisMonth' | 'lastMonth' | 'custom'
const periodFilter = ref<PeriodFilter>('thisMonth')
const customStart = ref('')
const customEnd = ref('')

const periodOptions: { value: PeriodFilter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'thisMonth', label: 'Ce Mois' },
  { value: 'lastMonth', label: 'Mois Dernier' },
  { value: 'custom', label: 'Période' },
]

const fieldsCount = computed(() => agence.value?.templateFields?.length || 0)

const loadAgence = async () => {
  loading.value = true
  try {
    const id = route.params.id as string
    agence.value = await agenceApi.getOne(id)
  } catch (err) {
    console.error('Failed to load agence', err)
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Impossible de charger le profil de l\'agence.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

const loadCars = async () => {
  loadingCars.value = true
  try {
    const cars = await carApi.getAll()
    const id = String(agence.value?._id)
    agenceCars.value = cars.filter((c: any) => c.agence && String(c.agence._id) === id)
  } catch (err) {
    console.error('Failed to load agence cars', err)
  } finally {
    loadingCars.value = false
  }
}

const loadContrats = async () => {
  loadingContrats.value = true
  try {
    allContrats.value = await contratApi.getAll()
  } catch (err) {
    console.error('Failed to load agence contrats', err)
  } finally {
    loadingContrats.value = false
  }
}

onMounted(async () => {
  await loadAgence()
  await Promise.all([loadCars(), loadContrats(), loadCarnets()])
})

const agenceCarIds = computed(() => new Set(agenceCars.value.map((c: any) => String(c._id))))

const agenceContrats = computed(() =>
  allContrats.value.filter((c: any) => {
    const carId = c.car ? (typeof c.car === 'string' ? c.car : String(c.car._id)) : ''
    return agenceCarIds.value.has(carId)
  })
)

const availableCarsCount = computed(() => agenceCars.value.filter((c: any) => c.isAvailable).length)
const rentedCarsCount = computed(() => agenceCars.value.filter((c: any) => !c.isAvailable).length)
const activeContractsCount = computed(() => agenceContrats.value.filter((c: any) => String(c.status || '').toLowerCase() === 'active').length)

const periodRange = computed(() => {
  const now = new Date()
  if (periodFilter.value === 'thisMonth') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    }
  }
  if (periodFilter.value === 'lastMonth') {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    }
  }
  if (periodFilter.value === 'all') {
    return { start: null, end: null }
  }
  return {
    start: customStart.value ? new Date(customStart.value + 'T00:00:00') : null,
    end: customEnd.value ? new Date(customEnd.value + 'T23:59:59') : null
  }
})

const filteredContrats = computed(() => {
  const { start, end } = periodRange.value
  return agenceContrats.value.filter((c: any) => {
    const d = new Date(c.startDate)
    if (start && d < start) return false
    if (end && d > end) return false
    return true
  })
})

const filteredSummary = computed(() => {
  const count = filteredContrats.value.length
  const total = filteredContrats.value.reduce((s: number, c: any) => s + (Number(c.totalAmount) || 0), 0)
  return { count, total }
})

const getCarLabel = (car: any) => {
  if (!car) return '—'
  const label = `${car.brand || ''} ${car.model || ''}`.trim()
  return label || car.matricule || '—'
}

const getCarStatusBadge = (car: any) => {
  return car.isAvailable
    ? { label: 'DISPONIBLE', class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' }
    : { label: 'LOUÉ', class: 'bg-rose-500/10 text-rose-600 border-rose-500/20' }
}

const getContratStatusBadge = (contrat: any) => {
  const status = String(contrat.status || '').toLowerCase()
  switch (status) {
    case 'soon':
      return { label: 'À VENIR', class: 'bg-blue-50 text-blue-600 border-blue-200/50' }
    case 'active':
      return { label: 'ACTIF', class: 'bg-emerald-50 text-emerald-600 border-emerald-200/50' }
    case 'terminé':
      return { label: 'TERMINÉ', class: 'bg-slate-50 text-slate-500 border-slate-200/50' }
    case 'clôturé':
      return { label: 'CLÔTURÉ', class: 'bg-amber-50 text-amber-600 border-amber-200/50' }
    case 'cancelled':
      return { label: 'ANNULÉ', class: 'bg-rose-50 text-rose-600 border-rose-200/50' }
    default:
      return { label: String(contrat.status || '—').toUpperCase(), class: 'bg-amber-50 text-amber-600 border-amber-200/50' }
  }
}

const goCar = (id: string) => router.push(`/cars/${id}`)
const goContrat = (id: string) => router.push(`/contrats/${id}`)

const openEditor = () => {
  isEditorModalOpen.value = true
}

const openEditName = () => {
  if (!agence.value) return
  editName.value = agence.value.name || ''
  showEditNameModal.value = true
}

const saveName = async () => {
  const name = editName.value.trim()
  if (!name || !agence.value) return
  savingName.value = true
  try {
    const updated = await agenceApi.update(agence.value._id, { name })
    agence.value = { ...agence.value, ...updated }
    showEditNameModal.value = false
    toast.add({
      severity: 'success',
      summary: 'Agence Modifiée',
      detail: `Le nom de l'agence a été mis à jour.`,
      life: 2000
    })
  } catch (err) {
    console.error('Failed to rename agence', err)
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Echec de la modification du nom.',
      life: 3000
    })
  } finally {
    savingName.value = false
  }
}

const confirmDelete = () => {
  deletePassword.value = ''
  showDeleteModal.value = true
}

const executeDelete = async () => {
  if (!agence.value) return
  deleting.value = true
  try {
    await agenceApi.delete(agence.value._id, deletePassword.value)
    guard.reset()
    toast.add({
      severity: 'success',
      summary: 'Agence Supprimée',
      detail: `"${agence.value.name}" a été supprimée.`,
      life: 2000
    })
    router.push('/agences')
  } catch (err) {
    console.error('Failed to delete agence', err)
    if (isPasswordError(err)) {
      const locked = guard.registerFailure()
      if (locked) {
        toast.add({
          severity: 'error',
          summary: 'Compte Verrouillé',
          detail: `Trop de tentatives. Réessayez dans ${LOCK_SECONDS} secondes.`,
          life: 3000
        })
      } else {
        toast.add({
          severity: 'error',
          summary: 'Mot de passe incorrect',
          detail: `Il vous reste ${guard.remainingAttempts} tentative(s).`,
          life: 3000
        })
      }
      return
    }
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Echec de la suppression de l\'agence.',
      life: 3000
    })
    showDeleteModal.value = false
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="agence-detail-container space-y-8 p-6 sm:p-8 max-w-7xl mx-auto" v-if="agence">
    
    <!-- 1. HERO HEADER BANNER -->
    <div class="p-6 sm:p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl shadow-indigo-950/20 border border-slate-800 relative overflow-hidden">
      <!-- Decorative Glow -->
      <div class="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <!-- Left: Logo & Agency Identity -->
        <div class="flex items-start sm:items-center gap-5">
          <Button 
            @click="router.push('/agences')" 
            variant="ghost" 
            size="icon" 
            class="h-12 w-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all active:scale-95 shrink-0"
            title="Retour à la liste des agences"
          >
            <ChevronLeft class="w-6 h-6" />
          </Button>

          <!-- Agency Avatar / Logo -->
          <div class="relative group shrink-0">
            <div v-if="agence.templateImage" class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-white/10 backdrop-blur border border-white/20 shadow-xl flex items-center justify-center p-1">
              <img :src="getImageUrl(agence.templateImage)" class="w-full h-full object-contain" alt="Modèle" />
            </div>
            <div v-else class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 border border-white/20 shadow-xl flex items-center justify-center text-white">
              <Building2 class="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
          </div>

          <!-- Titles & Metadata Badges -->
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                {{ agence.name }}
              </h1>
              <button 
                @click="openEditName"
                type="button"
                class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all"
                title="Renommer l'agence"
              >
                <Pencil class="w-3.5 h-3.5" />
              </button>
              <button 
                @click="showInfoModal = true"
                type="button"
                class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all"
                title="Informations détaillées"
              >
                <Info class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- Badges Row -->
            <div class="flex flex-wrap items-center gap-2">
              <Badge v-if="agence.templateImage" class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                Modèle Configuré ({{ fieldsCount }} champs)
              </Badge>
              <Badge v-else class="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                Aucun Modèle Téléversé
              </Badge>

              <Badge :class="['text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border', agence.applyTimbreExpense !== false ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30' : 'bg-slate-700/50 text-slate-400 border-slate-600/30']">
                Timbre Fiscal : {{ agence.applyTimbreExpense !== false ? 'Actif' : 'Désactivé' }}
              </Badge>

              <Badge :class="['text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border', agence.printBackground ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30' : 'bg-slate-700/50 text-slate-400 border-slate-600/30']">
                Fond Contrat : {{ agence.printBackground ? 'Imprimé' : 'Vierge' }}
              </Badge>
            </div>
          </div>
        </div>

        <!-- Right: Actions -->
        <div class="flex flex-wrap items-center gap-3 pt-2 lg:pt-0">
          <Button 
            @click="openEditor" 
            class="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 border border-indigo-400/30 transition-all flex items-center gap-2 active:scale-95"
          >
            <Palette class="w-4 h-4 stroke-[2.5]" /> Personnaliser Contrat
          </Button>
          <Button 
            @click="confirmDelete" 
            v-if="authStore.isSuperAdmin" 
            variant="destructive" 
            size="icon" 
            class="h-12 w-12 rounded-2xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 shadow-lg transition-all active:scale-95"
            title="Supprimer l'agence"
          >
            <Trash2 class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>

    <!-- 2. KPI METRICS CARDS -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Card 1: Véhicules -->
      <div 
        @click="activeTab = 'vehicules'"
        class="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group space-y-2"
      >
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Flotte Véhicules</span>
          <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <CarFront class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-black text-slate-900 font-mono">
          {{ agenceCars.length }} <span class="text-xs font-bold text-slate-400">véhicule(s)</span>
        </div>
        <div class="text-[10px] font-bold text-slate-500">
          <span class="text-emerald-600">{{ availableCarsCount }} dispo</span> &bull; 
          <span class="text-rose-600">{{ rentedCarsCount }} en cours</span>
        </div>
      </div>

      <!-- Card 2: Contrats -->
      <div 
        @click="activeTab = 'contrats'"
        class="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group space-y-2"
      >
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Contrats Émis</span>
          <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileSignature class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-black text-slate-900 font-mono">
          {{ agenceContrats.length }} <span class="text-xs font-bold text-slate-400">contrats</span>
        </div>
        <div class="text-[10px] font-bold text-slate-500">
          {{ activeContractsCount }} en cours d'exécution
        </div>
      </div>

      <!-- Card 3: Chiffre d'Affaires -->
      <div class="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Chiffre d'Affaires</span>
          <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Coins class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-black text-slate-900 font-mono">
          {{ filteredSummary.total.toLocaleString() }} <span class="text-xs font-bold text-slate-400">TND</span>
        </div>
        <div class="text-[10px] font-bold text-slate-500 truncate">
          {{ filteredSummary.count }} contrat(s) sur la période
        </div>
      </div>

      <!-- Card 4: Carnet Actif -->
      <div 
        @click="activeTab = 'carnets'"
        class="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group space-y-2"
      >
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Carnet en Service</span>
          <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <BookOpen class="w-4 h-4" />
          </div>
        </div>
        <div class="text-lg font-black text-slate-900 truncate uppercase">
          {{ activeCarnet ? activeCarnet.name : 'Aucun carnet' }}
        </div>
        <div class="text-[10px] font-mono font-bold" :class="activeCarnet ? 'text-indigo-600' : 'text-slate-400'">
          {{ activeCarnet ? `Prochain N° ${String(activeCarnet.currentNumber).padStart(6, '0')}` : 'Cliquer pour ouvrir' }}
        </div>
      </div>
    </div>

    <!-- 3. NAVIGATION TABS (Carnets & Réglages / Véhicules / Contrats) -->
    <div class="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 w-fit overflow-x-auto">
      <button
        type="button"
        @click="activeTab = 'carnets'"
        :class="[
          'px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center gap-2 shrink-0',
          activeTab === 'carnets'
            ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/60'
            : 'text-slate-500 hover:text-slate-900'
        ]"
      >
        <BookOpen class="w-3.5 h-3.5 text-indigo-600" />
        Carnets & Fiscalité
        <span class="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[9px] font-black">
          {{ carnets.length }}
        </span>
      </button>

      <button
        type="button"
        @click="activeTab = 'vehicules'"
        :class="[
          'px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center gap-2 shrink-0',
          activeTab === 'vehicules'
            ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/60'
            : 'text-slate-500 hover:text-slate-900'
        ]"
      >
        <CarFront class="w-3.5 h-3.5 text-indigo-600" />
        Flotte Véhicules
        <span class="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[9px] font-black">
          {{ agenceCars.length }}
        </span>
      </button>

      <button
        type="button"
        @click="activeTab = 'contrats'"
        :class="[
          'px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center gap-2 shrink-0',
          activeTab === 'contrats'
            ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/60'
            : 'text-slate-500 hover:text-slate-900'
        ]"
      >
        <FileSignature class="w-3.5 h-3.5 text-indigo-600" />
        Contrats de Location
        <span class="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[9px] font-black">
          {{ filteredSummary.count }}
        </span>
      </button>
    </div>

    <!-- TAB 1: CARNETS DE CONTRATS & PARAMÈTRES FISCAUX -->
    <div v-show="activeTab === 'carnets'" class="space-y-6">

      <!-- 1. Dedicated Settings & Fiscalité Card -->
      <Card class="border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader class="bg-slate-50/80 p-6 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle class="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2.5">
            <Sliders class="w-4 h-4 text-indigo-600" /> Options de Facturation & Fiscalité de l'Agence
          </CardTitle>
          <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Configuration En Direct</span>
        </CardHeader>
        <CardContent class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <!-- Timbre Fiscal Setting Box -->
          <div class="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between gap-4 transition-all hover:bg-slate-50">
            <div class="flex items-start gap-3.5">
              <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Receipt class="w-5 h-5" />
              </div>
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-black uppercase text-slate-900 tracking-wide">Frais de Timbre Fiscal</span>
                  <Badge :class="['text-[8px] font-black uppercase px-2 py-0.5 rounded-md border-none', agence.applyTimbreExpense !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600']">
                    {{ agence.applyTimbreExpense !== false ? 'Actif' : 'Désactivé' }}
                  </Badge>
                </div>
                <p class="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Calculer la dépense de timbre fiscal par jour lors de la clôture des carnets et l'afficher dans les PDF.
                </p>
              </div>
            </div>

            <button
              type="button"
              @click="toggleTimbreExpense"
              :disabled="togglingTimbreExpense"
              :class="[
                'w-14 h-8 rounded-full transition-colors relative flex items-center shrink-0 p-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/30',
                agence.applyTimbreExpense !== false ? 'bg-indigo-600' : 'bg-slate-300'
              ]"
              :title="agence.applyTimbreExpense !== false ? 'Désactiver le timbre fiscal pour cette agence' : 'Activer le timbre fiscal pour cette agence'"
            >
              <div 
                :class="[
                  'w-6 h-6 bg-white rounded-full transition-transform shadow-md flex items-center justify-center text-[10px]',
                  agence.applyTimbreExpense !== false ? 'translate-x-6 text-indigo-600' : 'translate-x-0 text-slate-400'
                ]"
              >
                <Loader2 v-if="togglingTimbreExpense" class="w-3.5 h-3.5 animate-spin" />
                <Check v-else-if="agence.applyTimbreExpense !== false" class="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </button>
          </div>

          <!-- Print Background Setting Box -->
          <div class="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between gap-4 transition-all hover:bg-slate-50">
            <div class="flex items-start gap-3.5">
              <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                <Printer class="w-5 h-5" />
              </div>
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-black uppercase text-slate-900 tracking-wide">Impression de l'Arrière-Plan</span>
                  <Badge :class="['text-[8px] font-black uppercase px-2 py-0.5 rounded-md border-none', agence.printBackground ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600']">
                    {{ agence.printBackground ? 'Imprimé' : 'Vierge' }}
                  </Badge>
                </div>
                <p class="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Imprimer l'image de fond du contrat (désactivez si vos feuilles physiques contiennent déjà l'en-tête).
                </p>
              </div>
            </div>

            <button
              type="button"
              @click="togglePrintBackground"
              :disabled="togglingPrintBackground"
              :class="[
                'w-14 h-8 rounded-full transition-colors relative flex items-center shrink-0 p-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/30',
                agence.printBackground ? 'bg-indigo-600' : 'bg-slate-300'
              ]"
              :title="agence.printBackground ? 'Désactiver l\'impression de l\'arrière-plan' : 'Activer l\'impression de l\'arrière-plan'"
            >
              <div 
                :class="[
                  'w-6 h-6 bg-white rounded-full transition-transform shadow-md flex items-center justify-center text-[10px]',
                  agence.printBackground ? 'translate-x-6 text-indigo-600' : 'translate-x-0 text-slate-400'
                ]"
              >
                <Loader2 v-if="togglingPrintBackground" class="w-3.5 h-3.5 animate-spin" />
                <Check v-else-if="agence.printBackground" class="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </button>
          </div>

        </CardContent>
      </Card>

      <!-- 2. Carnets de Contrats Section -->
      <Card class="border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader class="bg-indigo-50/50 p-6 flex flex-row items-center justify-between border-b border-indigo-100/60">
          <div class="flex items-center gap-3">
            <CardTitle class="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2.5">
              <BookOpen class="w-4 h-4 text-indigo-600" /> Carnets de Contrats (Lots Numérotés)
            </CardTitle>
            <Badge v-if="activeCarnet" class="bg-emerald-600 text-white border-none text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase">
              1 Carnet Actif
            </Badge>
            <Badge v-else class="bg-slate-200 text-slate-600 border-none text-[8px] font-black px-2.5 py-0.5 rounded-full uppercase">
              Aucun Actif
            </Badge>
          </div>
          
          <Button 
            @click="openNewCarnetModal" 
            size="sm" 
            class="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus class="w-4 h-4 stroke-[3]" /> Nouveau Carnet
          </Button>
        </CardHeader>
        <CardContent class="p-6 sm:p-8 space-y-6">
          <div v-if="loadingCarnets" class="flex items-center justify-center py-10">
            <Loader2 class="w-6 h-6 animate-spin text-indigo-500" />
          </div>

          <!-- Active Carnet Highlight Card -->
          <div 
            v-else-if="activeCarnet" 
            @click="openCarnetManager(activeCarnet)" 
            class="p-6 rounded-3xl bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 border-2 border-indigo-200 hover:border-indigo-400 shadow-lg shadow-indigo-100/50 space-y-5 cursor-pointer transition-all"
          >
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
                  <BookOpen class="w-7 h-7 stroke-[2]" />
                </div>
                <div>
                  <div class="flex items-center gap-2.5">
                    <h3 class="text-xl font-black text-slate-900 uppercase tracking-tight">{{ activeCarnet.name }}</h3>
                    <Badge class="bg-emerald-600 text-white border-none text-[8px] font-black px-2 py-0.5 rounded-md uppercase">EN SERVICE</Badge>
                  </div>
                  <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                    Numérotation : de <span class="font-mono text-indigo-600 font-black">{{ String(activeCarnet.startNumber).padStart(6, '0') }}</span> à <span class="font-mono text-indigo-600 font-black">{{ String(activeCarnet.endNumber).padStart(6, '0') }}</span>
                  </p>
                </div>
              </div>

              <!-- Next Number Counter Box -->
              <div class="flex items-center gap-5 bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs" @click.stop>
                <div>
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Prochain N° à émettre</span>
                  <span class="font-mono font-black text-2xl text-indigo-600 tracking-wider">
                    {{ String(activeCarnet.currentNumber).padStart(6, '0') }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <Button 
                    @click="openCarnetManager(activeCarnet)" 
                    size="sm" 
                    class="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-[9px] tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95"
                  >
                    <BookOpen class="w-3.5 h-3.5" /> Gérer ({{ activeCarnet.contrats?.length || 0 }})
                  </Button>
                  <Button 
                    @click="closeCarnet(activeCarnet._id)" 
                    variant="outline" 
                    size="sm" 
                    class="h-10 px-4 rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200 font-black uppercase text-[9px] tracking-wider transition-all active:scale-95"
                  >
                    Clôturer
                  </Button>
                </div>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="space-y-1.5 pt-3 border-t border-indigo-100/70">
              <div class="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-500">
                <span>Progression du carnet</span>
                <span class="font-mono text-indigo-600 font-bold">
                  {{ activeCarnet.currentNumber - activeCarnet.startNumber }} / {{ activeCarnet.endNumber - activeCarnet.startNumber + 1 }} contrats
                  ({{ Math.min(100, Math.round(((activeCarnet.currentNumber - activeCarnet.startNumber) / Math.max(1, activeCarnet.endNumber - activeCarnet.startNumber + 1)) * 100)) }}%)
                </span>
              </div>
              <div class="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                <div 
                  class="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-700 shadow-xs"
                  :style="{ width: `${Math.min(100, Math.round(((activeCarnet.currentNumber - activeCarnet.startNumber) / Math.max(1, activeCarnet.endNumber - activeCarnet.startNumber + 1)) * 100))}%` }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Empty State when no active carnet -->
          <div v-else class="border-2 border-dashed border-slate-200 rounded-3xl py-12 flex flex-col items-center justify-center gap-3 text-center bg-slate-50/50">
            <div class="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
              <BookOpen class="w-7 h-7 stroke-[1.8]" />
            </div>
            <div>
              <p class="font-black uppercase tracking-wider text-xs text-slate-800">Aucun carnet ouvert actuellement</p>
              <p class="text-[11px] text-slate-400 mt-1 max-w-sm">
                Ouvrez un carnet de numérotation pour que vos nouveaux contrats soient automatiquement indexés.
              </p>
            </div>
            <Button @click="openNewCarnetModal" size="sm" class="mt-2 h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-md shadow-indigo-600/20">
              <Plus class="w-4 h-4 mr-1" /> Ouvrir un Carnet
            </Button>
          </div>

          <!-- Previous / Closed Carnets -->
          <div v-if="closedCarnets.length > 0" class="space-y-3 pt-6 border-t border-slate-100">
            <h4 class="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Layers class="w-3.5 h-3.5 text-slate-400" /> Carnets Précédents (Fermés & Clôturés)
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div 
                v-for="c in closedCarnets" 
                :key="c._id" 
                @click="openCarnetManager(c)" 
                class="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 flex items-center justify-between gap-4 cursor-pointer transition-all hover:border-slate-300"
              >
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-black text-xs text-slate-800 uppercase">{{ c.name }}</span>
                    <Badge variant="outline" class="text-[8px] font-black border-slate-300 text-slate-400 uppercase">Clôturé</Badge>
                  </div>
                  <span class="font-mono text-[10px] font-bold text-slate-500 mt-1 block">
                    {{ String(c.startNumber).padStart(6, '0') }} → {{ String(c.endNumber).padStart(6, '0') }} 
                    <span class="text-slate-400">(dernier émis : {{ String(Math.min(c.currentNumber - 1, c.endNumber)).padStart(6, '0') }})</span>
                  </span>
                </div>
                <div class="flex items-center gap-2" @click.stop>
                  <Button 
                    @click="openCarnetManager(c)" 
                    variant="outline" 
                    size="sm" 
                    class="h-9 px-3 rounded-xl border-slate-300 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <BookOpen class="w-3 h-3" /> Contrats ({{ c.contrats?.length || 0 }})
                  </Button>
                  <Button 
                    v-if="authStore.isSuperAdmin"
                    @click="reopenCarnet(c._id)" 
                    variant="ghost" 
                    size="sm" 
                    class="h-9 px-3 rounded-xl text-emerald-600 hover:bg-emerald-50 font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5"
                    title="Restaurer le carnet clôturé (Super Admin)"
                  >
                    <RotateCcw class="w-3 h-3" /> Restaurer
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>

    <!-- TAB 2: VÉHICULES DE L'AGENCE -->
    <div v-show="activeTab === 'vehicules'">
      <Card class="border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader class="bg-slate-50/80 p-6 flex flex-row items-center justify-between border-b border-slate-100">
          <CardTitle class="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2.5">
            <CarFront class="w-4 h-4 text-indigo-600" /> Flotte des Véhicules Rattachés
          </CardTitle>
          <div class="flex items-center gap-3">
            <Badge class="bg-indigo-100 text-indigo-800 border-none text-[9px] font-black px-3 py-1 rounded-full uppercase">
              {{ agenceCars.length }} Véhicule(s)
            </Badge>
            <Button @click="router.push('/cars')" size="sm" class="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-[9px] tracking-wider shadow-sm">
              Gérer la Flotte
            </Button>
          </div>
        </CardHeader>
        <CardContent class="p-6">
          <div v-if="loadingCars" class="flex items-center justify-center py-12">
            <Loader2 class="w-6 h-6 animate-spin text-indigo-500" />
          </div>

          <div v-else-if="agenceCars.length > 0" class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th class="py-3 px-3">Matricule</th>
                  <th class="py-3 px-3">Marque & Modèle</th>
                  <th class="py-3 px-3">Couleur</th>
                  <th class="py-3 px-3">Statut</th>
                  <th class="py-3 px-3 text-right">Tarif Journalier</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr 
                  v-for="car in agenceCars" 
                  :key="car._id" 
                  @click="goCar(car._id)" 
                  class="cursor-pointer hover:bg-indigo-50/40 transition-colors group"
                >
                  <td class="py-3.5 px-3">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors shrink-0">
                        <CarFront class="w-4 h-4 text-slate-500 group-hover:text-indigo-600" />
                      </div>
                      <span class="font-mono font-black text-xs text-slate-900 uppercase">{{ car.matricule }}</span>
                    </div>
                  </td>
                  <td class="py-3.5 px-3">
                    <span class="font-black text-xs text-slate-800 uppercase">{{ car.brand }} {{ car.model }}</span>
                  </td>
                  <td class="py-3.5 px-3">
                    <span class="font-medium text-slate-500 capitalize">{{ car.color || '—' }}</span>
                  </td>
                  <td class="py-3.5 px-3">
                    <Badge :class="['text-[8px] font-black tracking-widest px-2.5 py-0.5 rounded-full border shadow-2xs', getCarStatusBadge(car).class]">
                      {{ getCarStatusBadge(car).label }}
                    </Badge>
                  </td>
                  <td class="py-3.5 px-3 text-right">
                    <span class="font-black font-mono text-xs text-indigo-700">{{ car.dailyRate }} <span class="text-[9px] text-slate-400 uppercase font-bold">TND</span></span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <CarFront class="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p class="text-slate-400 font-black uppercase tracking-widest text-[10px]">Aucun véhicule rattaché à cette agence</p>
            <Button @click="router.push('/cars')" class="mt-3 h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest text-[9px]">
              Ajouter un Véhicule
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- TAB 3: CONTRATS DE L'AGENCE -->
    <div v-show="activeTab === 'contrats'">
      <Card class="border border-slate-200/80 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader class="bg-slate-50/80 p-6 border-b border-slate-100">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle class="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2.5">
              <FileSignature class="w-4 h-4 text-indigo-600" /> Historique des Contrats Émis
              <Badge class="bg-indigo-100 text-indigo-800 border-none text-[9px] font-black px-2.5 py-0.5 rounded-full">
                {{ filteredSummary.count }} Contrat(s)
              </Badge>
            </CardTitle>
            
            <div class="flex flex-wrap items-center gap-2">
              <button
                v-for="opt in periodOptions"
                :key="opt.value"
                @click="periodFilter = opt.value"
                :class="[
                  'px-3.5 py-1.5 rounded-xl font-black uppercase text-[9px] tracking-wider transition-all',
                  periodFilter === opt.value ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                ]"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Custom Period Date Range Pickers -->
          <div v-if="periodFilter === 'custom'" class="mt-4 flex flex-wrap items-end gap-3 bg-white rounded-2xl border border-slate-200 p-3">
            <div class="space-y-1">
              <Label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Du</Label>
              <Input v-model="customStart" type="date" class="h-10 bg-slate-50 border-slate-200 rounded-xl font-bold text-xs" />
            </div>
            <div class="space-y-1">
              <Label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Au</Label>
              <Input v-model="customEnd" type="date" class="h-10 bg-slate-50 border-slate-200 rounded-xl font-bold text-xs" />
            </div>
            <div class="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 pb-2">
              <CalendarRange class="w-3.5 h-3.5 text-indigo-600" /> {{ filteredSummary.count }} contrat(s) trouvés
            </div>
          </div>
        </CardHeader>

        <CardContent class="p-6">
          <div v-if="loadingContrats" class="flex items-center justify-center py-12">
            <Loader2 class="w-6 h-6 animate-spin text-indigo-500" />
          </div>

          <div v-else-if="filteredContrats.length > 0" class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th class="py-3 px-3">Réf</th>
                  <th class="py-3 px-3">Client(s)</th>
                  <th class="py-3 px-3">Véhicule</th>
                  <th class="py-3 px-3">Période</th>
                  <th class="py-3 px-3 text-right">Montant</th>
                  <th class="py-3 px-3">Statut</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr 
                  v-for="c in filteredContrats" 
                  :key="c._id" 
                  @click="goContrat(c._id)" 
                  class="cursor-pointer hover:bg-indigo-50/40 transition-colors group"
                >
                  <td class="py-3.5 px-3">
                    <span class="font-mono font-black text-xs text-slate-900 uppercase">N° {{ c.reference }}</span>
                  </td>
                  <td class="py-3.5 px-3">
                    <div class="flex flex-col">
                      <div class="flex items-center gap-1.5">
                        <span class="font-black text-xs text-slate-800 uppercase">{{ c.clients?.[0]?.firstName }} {{ c.clients?.[0]?.lastName }}</span>
                        <Badge v-if="c.clients?.length > 1" class="bg-indigo-100 text-indigo-700 border-none text-[8px] font-black px-1.5 py-0 h-4 rounded-md">
                          +{{ c.clients.length - 1 }}
                        </Badge>
                      </div>
                      <span class="text-[9px] font-mono text-slate-400 uppercase mt-0.5">{{ c.clients?.[0]?.cin || '—' }}</span>
                    </div>
                  </td>
                  <td class="py-3.5 px-3">
                    <p class="font-black text-xs text-slate-800 uppercase">{{ getCarLabel(c.car) }}</p>
                    <span v-if="c.car" class="text-[9px] font-mono text-slate-400 block mt-0.5">{{ c.car.matricule }}</span>
                  </td>
                  <td class="py-3.5 px-3">
                    <span class="font-medium text-slate-600 tabular-nums">{{ formatDate(c.startDate) }} → {{ formatDate(c.endDate) }}</span>
                  </td>
                  <td class="py-3.5 px-3 text-right">
                    <span class="font-black font-mono text-xs text-indigo-700 tabular-nums">{{ c.totalAmount }} <span class="text-[9px] text-slate-400 font-bold uppercase">TND</span></span>
                  </td>
                  <td class="py-3.5 px-3">
                    <Badge :class="['text-[8px] font-black tracking-widest px-2.5 py-0.5 rounded-full border shadow-2xs', getContratStatusBadge(c).class]">
                      {{ getContratStatusBadge(c).label }}
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <FileSignature class="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p class="text-slate-400 font-black uppercase tracking-widest text-[10px]">Aucun contrat sur cette période</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- INFO MODAL -->
    <Dialog v-model:open="showInfoModal">
      <DialogContent class="sm:max-w-md bg-white rounded-3xl p-6 border border-slate-200 text-slate-900">
        <DialogHeader class="mb-4 flex flex-col items-center text-center">
          <div class="w-16 h-16 rounded-2xl overflow-hidden bg-indigo-50 border border-slate-100 flex items-center justify-center mb-2">
            <img v-if="agence.templateImage" :src="getImageUrl(agence.templateImage)" class="w-full h-full object-contain" />
            <Building2 v-else class="w-8 h-8 text-indigo-600" />
          </div>
          <DialogTitle class="text-xl font-black text-slate-900 uppercase tracking-tight">{{ agence.name }}</DialogTitle>
          <p class="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">Fiche Récapitulative de l'Agence</p>
        </DialogHeader>
        <div class="space-y-3 text-xs">
          <div class="flex justify-between items-center py-2.5 border-b border-slate-100">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Véhicules Rattachés</span>
            <span class="font-black text-sm text-indigo-600 font-mono">{{ agenceCars.length }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-slate-100">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contrats Historiques</span>
            <span class="font-black text-sm text-indigo-600 font-mono">{{ agenceContrats.length }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-slate-100">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Champs du Modèle</span>
            <span class="font-black text-sm text-indigo-600 font-mono">{{ fieldsCount }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-slate-100">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Frais de Timbre Fiscal</span>
            <span class="font-black uppercase text-xs" :class="agence.applyTimbreExpense !== false ? 'text-emerald-600' : 'text-slate-400'">
              {{ agence.applyTimbreExpense !== false ? 'ACTIVÉS' : 'DÉSACTIVÉS' }}
            </span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-slate-100">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Impression Fond</span>
            <span class="font-black text-xs uppercase" :class="agence.printBackground ? 'text-indigo-600' : 'text-slate-400'">
              {{ agence.printBackground ? 'OUI' : 'NON' }}
            </span>
          </div>
          <div class="flex justify-between items-center py-2.5">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Créée le</span>
            <span class="font-bold text-slate-700 tabular-nums">{{ formatDate(agence.createdAt) }}</span>
          </div>
        </div>
        <DialogFooter class="mt-4 pt-4 border-t border-slate-100">
          <Button @click="showInfoModal = false" class="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-md shadow-indigo-600/20">
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- RENAME MODAL -->
    <Dialog v-model:open="showEditNameModal">
      <DialogContent class="sm:max-w-md bg-white rounded-3xl p-6 border border-slate-200 text-slate-900">
        <DialogHeader class="mb-3">
          <DialogTitle class="text-xl font-black text-slate-900 uppercase tracking-tight">Renommer l'Agence</DialogTitle>
          <DialogDescription class="text-xs text-slate-400">Modifier le libellé officiel de l'agence.</DialogDescription>
        </DialogHeader>
        <div class="space-y-2 py-2">
          <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom de l'Agence</Label>
          <Input v-model="editName" @keydown.enter="saveName" class="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold" />
        </div>
        <DialogFooter class="mt-4 pt-4 border-t border-slate-100 flex gap-3">
          <Button variant="ghost" @click="showEditNameModal = false" class="flex-1 h-11 font-black uppercase text-[10px] tracking-widest rounded-xl text-slate-400">Annuler</Button>
          <Button @click="saveName" :disabled="savingName || !editName.trim()" class="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-md shadow-indigo-600/20">
            <Loader2 v-if="savingName" class="w-4 h-4 animate-spin mr-1.5" />
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- DELETE MODAL -->
    <PasswordConfirmDialog
      v-model:open="showDeleteModal"
      v-model:password="deletePassword"
      title="Supprimer"
      subtitle="l'Agence"
      description="Cette action est définitive et irréversible."
      placeholder="Mot de passe Super Admin..."
      confirm-label="Confirmer la Suppression"
      loading-label="Suppression..."
      :loading="deleting"
      @confirm="executeDelete"
    />

    <!-- TEMPLATE EDITOR MODAL -->
    <AgenceTemplateEditorModal
      v-model:open="isEditorModalOpen"
      :agence="agence"
      @saved="loadAgence"
    />

    <!-- NOUVEAU CARNET MODAL -->
    <Dialog v-model:open="showCreateCarnetModal">
      <DialogContent class="sm:max-w-lg bg-white rounded-3xl p-6 border border-slate-200 text-slate-900 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader class="space-y-1 pb-3 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen class="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-xl font-black uppercase tracking-tight text-slate-900">Nouveau Carnet</DialogTitle>
              <DialogDescription class="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Série de numérotation pour {{ agence?.name }}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <!-- Warning Alert if an active carnet already exists -->
        <div v-if="activeCarnet" class="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 mt-4">
          <div class="flex items-center gap-2 text-amber-800 font-black text-xs uppercase">
            <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0" />
            Un carnet est déjà ouvert pour cette agence
          </div>
          <p class="text-[11px] text-amber-700 leading-relaxed">
            L'agence possède actuellement le carnet actif <strong>« {{ activeCarnet.name }} »</strong> (prochain numéro : <span class="font-mono font-bold">{{ String(activeCarnet.currentNumber).padStart(6, '0') }}</span>).
          </p>
          <div class="pt-2 flex items-center gap-2.5">
            <input type="checkbox" id="confirmClose" v-model="confirmCloseActiveCarnet" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
            <label for="confirmClose" class="text-[11px] font-black uppercase tracking-wide text-amber-900 cursor-pointer select-none">
              Confirmer la clôture automatique de l'ancien carnet
            </label>
          </div>
        </div>

        <div class="space-y-4 py-4">
          <div class="space-y-1.5">
            <Label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom du Carnet</Label>
            <Input v-model="newCarnetForm.name" placeholder="Ex: Carnet 2024 - Série A" class="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-xs" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Numéro de Début</Label>
              <Input v-model="newCarnetForm.startNumber" placeholder="000001" class="h-11 bg-slate-50 border-slate-200 rounded-xl font-mono font-bold text-center text-xs" />
            </div>
            <div class="space-y-1.5">
              <Label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Numéro de Fin</Label>
              <Input v-model="newCarnetForm.endNumber" placeholder="000150" class="h-11 bg-slate-50 border-slate-200 rounded-xl font-mono font-bold text-center text-xs" />
            </div>
          </div>

          <div class="space-y-1.5">
            <Label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Notes (Optionnel)</Label>
            <Input v-model="newCarnetForm.notes" placeholder="Remarques..." class="h-11 bg-slate-50 border-slate-200 rounded-xl text-xs" />
          </div>
        </div>

        <DialogFooter class="pt-4 border-t border-slate-100 flex gap-3">
          <Button @click="showCreateCarnetModal = false" variant="outline" class="flex-1 h-11 rounded-xl font-black uppercase text-[10px] tracking-widest">
            Annuler
          </Button>
          <Button 
            @click="submitCreateCarnet" 
            :disabled="creatingCarnet || !newCarnetForm.name.trim() || (activeCarnet && !confirmCloseActiveCarnet)"
            class="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            <Loader2 v-if="creatingCarnet" class="w-4 h-4 animate-spin mr-1.5" />
            {{ activeCarnet ? 'Clôturer & Ouvrir' : 'Créer le Carnet' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Carnet Detail & Contrats Manager Modal -->
    <CarnetDetailModal
      v-model:open="showCarnetDetailModal"
      :initial-lot="selectedCarnetForDetail"
      :lot-id="selectedCarnetForDetail?._id"
      @updated="loadCarnets"
    />

  </div>

  <!-- Loading State -->
  <div v-else-if="loading" class="flex flex-col items-center justify-center p-20 space-y-4">
    <div class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
    <p class="text-indigo-600 font-black uppercase tracking-[0.3em] text-xs">Chargement du Profil Agence</p>
  </div>
</template>

<style scoped>
.agence-detail-container {
  font-family: 'Inter', sans-serif;
}
</style>
