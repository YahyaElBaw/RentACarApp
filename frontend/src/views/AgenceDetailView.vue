<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { agenceApi, carApi, contratApi, getImageUrl } from '@/api'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/card/Card.vue'
import CardContent from '@/components/ui/card/CardContent.vue'
import CardHeader from '@/components/ui/card/CardHeader.vue'
import CardTitle from '@/components/ui/card/CardTitle.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import Button from '@/components/ui/button/Button.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PasswordConfirmDialog } from '@/components/ui/password-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'
import { usePasswordGuard, isPasswordError, LOCK_SECONDS } from '@/composables/usePasswordGuard'
import AgenceTemplateEditorModal from '@/components/AgenceTemplateEditorModal.vue'
import { ChevronLeft, Building2, Palette, Pencil, Trash2, Loader2, Info, CarFront, FileSignature, CalendarRange, Lock } from 'lucide-vue-next'

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
  await Promise.all([loadCars(), loadContrats()])
})

const agenceCarIds = computed(() => new Set(agenceCars.value.map((c: any) => String(c._id))))

const agenceContrats = computed(() =>
  allContrats.value.filter((c: any) => {
    const carId = c.car ? (typeof c.car === 'string' ? c.car : String(c.car._id)) : ''
    return agenceCarIds.value.has(carId)
  })
)

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
    ? { label: 'DISPONIBLE', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' }
    : { label: 'LOUÉ', class: 'bg-rose-500/10 text-rose-500 border-rose-500/20' }
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
  <div class="agence-detail-container space-y-10 p-8 max-w-7xl mx-auto" v-if="agence">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        <Button @click="router.push('/agences')" variant="secondary" size="icon" class="h-12 w-12 rounded-2xl bg-white shadow-lg border border-slate-200 hover:bg-slate-50 transition-all active:scale-90">
          <ChevronLeft class="w-6 h-6 text-slate-600" />
        </Button>
        <div class="space-y-1">
          <div class="flex items-center gap-3">
            <div v-if="agence.templateImage" class="w-12 h-12 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm flex items-center justify-center">
              <img :src="getImageUrl(agence.templateImage)" class="w-full h-full object-contain" />
            </div>
            <div v-else class="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Building2 class="w-6 h-6" />
            </div>
            <Button @click="showInfoModal = true" variant="ghost" size="icon" class="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 transition-all active:scale-90" aria-label="Informations de l'agence">
              <Info class="w-4 h-4" />
            </Button>
            <h1 class="text-3xl font-black tracking-tight text-slate-900 uppercase italic">{{ agence.name }}</h1>
            <Badge v-if="agence.templateImage" class="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] font-black tracking-widest px-3 py-1 rounded-full">
              MODÈLE TÉLÉVERSÉ
            </Badge>
            <Badge v-else class="bg-amber-50 text-amber-600 border-amber-100 text-[9px] font-black tracking-widest px-3 py-1 rounded-full">
              AUCUN MODÈLE
            </Badge>
          </div>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-0.5">Profil de l'Agence — {{ fieldsCount }} champ(s) de contrat configuré(s)</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <Button @click="openEditName" variant="outline" class="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2">
          <Pencil class="w-4 h-4" /> Renommer
        </Button>
        <Button @click="openEditor" class="h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2">
          <Palette class="w-4 h-4" /> Personnaliser Contrat
        </Button>
        <Button @click="confirmDelete" v-if="authStore.isSuperAdmin" variant="destructive" size="icon" class="h-12 w-12 rounded-2xl shadow-xl shadow-rose-100 transition-all active:scale-95">
          <Trash2 class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <div class="space-y-8">
      <!-- Véhicules de l'Agence -->
        <Card class="border border-slate-200/50 shadow-2xl shadow-slate-200/20 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
          <CardHeader class="bg-indigo-50/50 p-8 pb-4 flex flex-row items-center justify-between">
            <CardTitle class="text-sm font-black text-indigo-900 uppercase flex items-center gap-3">
              <CarFront class="w-4 h-4 text-indigo-600" /> Véhicules de l'Agence
            </CardTitle>
            <Badge class="bg-white text-indigo-600 border-indigo-200 text-[9px] font-black px-3 py-1 rounded-full">
              {{ agenceCars.length }} VÉHICULE(S)
            </Badge>
          </CardHeader>
          <CardContent class="p-8">
            <div v-if="loadingCars" class="flex items-center justify-center py-12">
              <Loader2 class="w-6 h-6 animate-spin text-indigo-500" />
            </div>

            <div v-else-if="agenceCars.length > 0" class="overflow-x-auto -mx-4 px-4">
              <table class="w-full text-left">
                <thead>
                  <tr class="border-b border-slate-100">
                    <th class="py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Matricule</th>
                    <th class="py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Véhicule</th>
                    <th class="py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Couleur</th>
                    <th class="py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                    <th class="py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Tarif/Jour</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="car in agenceCars" :key="car._id" @click="goCar(car._id)" class="border-b border-slate-50 cursor-pointer hover:bg-indigo-50/40 transition-all group">
                    <td class="py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-indigo-100 transition-all">
                          <CarFront class="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                        </div>
                        <span class="font-mono font-black text-sm text-slate-900 uppercase">{{ car.matricule }}</span>
                      </div>
                    </td>
                    <td class="py-4">
                      <p class="font-black text-sm text-slate-800 uppercase">{{ car.brand }} {{ car.model }}</p>
                    </td>
                    <td class="py-4">
                      <span class="text-xs font-bold text-slate-500 capitalize">{{ car.color || '—' }}</span>
                    </td>
                    <td class="py-4">
                      <Badge :class="['text-[8px] font-black tracking-widest px-3 py-1 rounded-full border shadow-sm', getCarStatusBadge(car).class]">
                        {{ getCarStatusBadge(car).label }}
                      </Badge>
                    </td>
                    <td class="py-4 text-right">
                      <span class="font-black text-sm text-indigo-700 tabular-nums">{{ car.dailyRate }} <span class="text-[9px] text-slate-400 uppercase font-bold ml-0.5">TND</span></span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else class="text-center py-12 border-2 border-dashed border-slate-200 rounded-[2rem]">
              <CarFront class="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p class="text-slate-400 font-black uppercase tracking-widest text-[10px]">Aucun véhicule rattaché</p>
              <Button @click="router.push('/cars')" class="mt-4 h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-indigo-200">
                Gérer les Véhicules
              </Button>
            </div>
          </CardContent>
        </Card>

        <!-- Contrats de l'Agence -->
        <Card class="border border-slate-200/50 shadow-2xl shadow-slate-200/20 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
          <CardHeader class="bg-indigo-50/50 p-8 pb-4">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <CardTitle class="text-sm font-black text-indigo-900 uppercase flex items-center gap-3">
                <FileSignature class="w-4 h-4 text-indigo-600" /> Contrats de l'Agence
                <Badge class="bg-white text-indigo-600 border-indigo-200 text-[9px] font-black px-3 py-1 rounded-full">
                  {{ filteredSummary.count }} CONTRAT(S)
                </Badge>
              </CardTitle>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  v-for="opt in periodOptions"
                  :key="opt.value"
                  @click="periodFilter = opt.value"
                  :class="[
                    'px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all',
                    periodFilter === opt.value ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'
                  ]"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <div v-if="periodFilter === 'custom'" class="mt-4 flex flex-wrap items-end gap-4 bg-white rounded-2xl border border-slate-100 p-4">
              <div class="space-y-1">
                <Label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Du</Label>
                <Input v-model="customStart" type="date" class="h-11 bg-slate-50 border-slate-100 rounded-xl font-black text-xs" />
              </div>
              <div class="space-y-1">
                <Label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Au</Label>
                <Input v-model="customEnd" type="date" class="h-11 bg-slate-50 border-slate-100 rounded-xl font-black text-xs" />
              </div>
              <div class="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                <CalendarRange class="w-3.5 h-3.5" /> {{ filteredSummary.count }} contrat(s)
              </div>
            </div>
          </CardHeader>
          <CardContent class="p-8">
            <div v-if="loadingContrats" class="flex items-center justify-center py-12">
              <Loader2 class="w-6 h-6 animate-spin text-indigo-500" />
            </div>

            <div v-else-if="filteredContrats.length > 0" class="overflow-x-auto -mx-4 px-4">
              <table class="w-full text-left">
                <thead>
                  <tr class="border-b border-slate-100">
                    <th class="py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Réf</th>
                    <th class="py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Client(s)</th>
                    <th class="py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Véhicule</th>
                    <th class="py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Période</th>
                    <th class="py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                    <th class="py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in filteredContrats" :key="c._id" @click="goContrat(c._id)" class="border-b border-slate-50 cursor-pointer hover:bg-indigo-50/40 transition-all group">
                    <td class="py-4">
                      <span class="font-mono font-black text-sm text-slate-900 uppercase">{{ c.reference }}</span>
                    </td>
                    <td class="py-4">
                      <div class="flex flex-col">
                        <div class="flex items-center gap-2">
                          <span class="font-black text-xs text-slate-800 uppercase">{{ c.clients?.[0]?.firstName }} {{ c.clients?.[0]?.lastName }}</span>
                          <Badge v-if="c.clients?.length > 1" class="bg-indigo-600/10 text-indigo-600 border-indigo-200 text-[8px] font-black px-1.5 py-0 h-4 rounded-md">
                            +{{ c.clients.length - 1 }}
                          </Badge>
                        </div>
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Dossier: {{ c.clients?.[0]?.cin || 'N/A' }}</span>
                      </div>
                    </td>
                    <td class="py-4">
                      <p class="font-black text-xs text-slate-800 uppercase">{{ getCarLabel(c.car) }}</p>
                      <span v-if="c.car" class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 font-mono">{{ c.car.matricule }}</span>
                    </td>
                    <td class="py-4">
                      <span class="text-xs font-bold text-slate-500 tabular-nums">{{ formatDate(c.startDate) }} → {{ formatDate(c.endDate) }}</span>
                    </td>
                    <td class="py-4 text-right">
                      <span class="font-black text-sm text-indigo-700 tabular-nums">{{ c.totalAmount }} <span class="text-[9px] text-slate-400 uppercase font-bold ml-0.5">TND</span></span>
                    </td>
                    <td class="py-4">
                      <Badge :class="['text-[8px] font-black tracking-widest px-3 py-1 rounded-full border shadow-sm', getContratStatusBadge(c).class]">
                        {{ getContratStatusBadge(c).label }}
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-else class="text-center py-12 border-2 border-dashed border-slate-200 rounded-[2rem]">
              <FileSignature class="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p class="text-slate-400 font-black uppercase tracking-widest text-[10px]">Aucun contrat sur cette période</p>
              <Button @click="router.push('/contrats')" class="mt-4 h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-indigo-200">
                Voir les Contrats
              </Button>
            </div>
          </CardContent>
        </Card>
    </div>

    <!-- INFO MODAL -->
    <Dialog v-model:open="showInfoModal">
      <DialogContent class="sm:max-w-md bg-white border-none shadow-3xl rounded-[2.5rem] p-8">
        <DialogHeader class="mb-4 flex flex-col items-center text-center">
          <div class="w-16 h-16 rounded-2xl overflow-hidden bg-indigo-50 border border-slate-100 flex items-center justify-center mb-3">
            <img v-if="agence.templateImage" :src="getImageUrl(agence.templateImage)" class="w-full h-full object-contain" />
            <Building2 v-else class="w-8 h-8 text-indigo-600" />
          </div>
          <DialogTitle class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{{ agence.name }}</DialogTitle>
          <p class="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">Informations de l'Agence</p>
        </DialogHeader>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-3 border-b border-slate-50">
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Véhicules</span>
            <span class="font-black text-sm text-indigo-600">{{ agenceCars.length }}</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-slate-50">
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contrats</span>
            <span class="font-black text-sm text-indigo-600">{{ agenceContrats.length }}</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-slate-50">
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Éléments Contrat</span>
            <span class="font-black text-sm text-indigo-600">{{ fieldsCount }}</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-slate-50">
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Impression Fond</span>
            <span class="font-black text-sm text-slate-900 uppercase">{{ agence.printBackground ? 'OUI' : 'NON' }}</span>
          </div>
          <div class="flex justify-between items-center py-3 border-b border-slate-50">
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Créée le</span>
            <span class="font-black text-sm text-slate-900 tabular-nums">{{ formatDate(agence.createdAt) }}</span>
          </div>
        </div>
        <DialogFooter class="mt-6 border-t border-slate-100 pt-6">
          <Button @click="showInfoModal = false" class="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-indigo-200">
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- RENAME MODAL -->
    <Dialog v-model:open="showEditNameModal">
      <DialogContent class="sm:max-w-md bg-white border-none shadow-3xl rounded-[2.5rem] p-8">
        <DialogHeader class="mb-4">
          <DialogTitle class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Renommer <span class="text-indigo-600">l'Agence</span></DialogTitle>
        </DialogHeader>
        <div class="space-y-2">
          <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom de l'Agence</Label>
          <Input v-model="editName" @keydown.enter="saveName" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black" />
        </div>
        <DialogFooter class="mt-6 border-t border-slate-100 pt-6 flex gap-4">
          <Button variant="ghost" @click="showEditNameModal = false" class="flex-1 h-12 font-black uppercase text-[10px] tracking-widest rounded-xl text-slate-400">Annuler</Button>
          <Button @click="saveName" :disabled="savingName || !editName.trim()" class="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-indigo-200">
            <Loader2 v-if="savingName" class="w-4 h-4 animate-spin mr-2" />
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

    <AgenceTemplateEditorModal
      v-model:open="isEditorModalOpen"
      :agence="agence"
      @saved="loadAgence"
    />
  </div>

  <div v-else-if="loading" class="flex flex-col items-center justify-center p-20 space-y-6">
    <div class="relative flex items-center justify-center">
      <div class="w-16 h-16 border-[6px] border-indigo-100 rounded-full"></div>
      <div class="w-16 h-16 border-[6px] border-indigo-600 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
    </div>
    <div class="text-center space-y-1">
      <p class="text-indigo-600 font-black uppercase tracking-[0.4em] text-xs animate-pulse">Chargement du Profil</p>
    </div>
  </div>
</template>

<style scoped>
.agence-detail-container {
  font-family: 'Inter', sans-serif;
}
</style>
