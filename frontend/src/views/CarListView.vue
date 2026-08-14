<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { carApi, agenceApi, uploadApi, getImageUrl } from '@/api'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useSocketStore } from '@/stores/socket'
import { usePasswordGuard, handlePasswordError } from '@/composables/usePasswordGuard'
import { useToast } from 'primevue/usetoast'
import { 
  Plus, Search, Trash, 
  Car as CarIcon, Eye, EyeOff, ChevronLeft, ChevronRight, Lock, X, ChevronDown, Wallet, CalendarClock, Upload, FileText, Trash2, ArrowLeft, ArrowRight, RotateCw, Check, Loader2, Pencil
} from 'lucide-vue-next'
import { 
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const socketStore = useSocketStore()
const toast = useToast()
const guard = usePasswordGuard()
const cars = ref<any[]>([])
const agences = ref<any[]>([])
const loading = ref(true)
const showForm = ref(false)
const adminPassword = ref('')
const showPassword = ref(false)
const showSecurityModal = ref(false)
const carToDelete = ref<any>(null)
const submitting = ref(false)
let unsubscribeSocket: Function | null = null

const currentPage = ref(1)
const pageSize = 10

const sortedCars = computed(() => {
  return [...cars.value];
});

const totalCarPages = computed(() => Math.ceil(sortedCars.value.length / pageSize))
const paginatedCars = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return sortedCars.value.slice(start, start + pageSize)
})

const filters = reactive({
  brand: '',
  availableOnly: null as boolean | null
})
const searchOpen = ref(false)
const addOpen = ref(false)

const carForm = reactive({
  matricule: '',
  brand: '',
  model: '',
  dailyRate: 300,
  mileage: 0,
  color: '',
  agence: '',
  departureDate: '',
  nextTechnicalVisitDate: '',
  nextOilChangeMileage: 0,
  insuranceDate: ''
})

const loadCars = async () => {
  loading.value = true
  try {
    const data = await carApi.getAll({ 
      brand: filters.brand, 
      isAvailable: filters.availableOnly === null ? undefined : filters.availableOnly
    })
    cars.value = data
  } catch (err) {
    console.error('Failed to load cars', err)
  } finally {
    loading.value = false
  }
}

const loadAgences = async () => {
  try {
    agences.value = await agenceApi.getAll()
  } catch (err) {
    console.error('Failed to load agences', err)
  }
}

onMounted(() => {
  loadCars()
  loadAgences()
  if (route.query.add === 'true') {
    openAddModal()
  }
  unsubscribeSocket = socketStore.onEvent('car:change', () => {
    loadCars()
  })
})

onUnmounted(() => {
  if (unsubscribeSocket) unsubscribeSocket()
})
watch(() => filters.brand, () => { currentPage.value = 1; loadCars() })
watch(() => filters.availableOnly, () => { currentPage.value = 1; loadCars() })

const saveCar = async () => {
  submitting.value = true
  try {
    const documents = Object.values(pendingDocs).filter((d: any) => d.url).map((d: any) => ({
      type: d.type,
      url: d.url,
      originalName: d.originalName
    }))
    const payload = { ...carForm, agence: carForm.agence || null, documents }
    await carApi.create(payload)
    showForm.value = false
    loadCars()
  } catch (err: any) {
    console.error(err)
    alert("Une erreur est survenue.")
  } finally {
    submitting.value = false
  }
}

const documentTypes = [
  { key: 'carteGriseRecto', label: 'Carte Grise (Recto)' },
  { key: 'carteGriseVerso', label: 'Carte Grise (Verso)' },
  { key: 'laisserPasser', label: 'Laisser Passer' },
  { key: 'assurance', label: 'Assurance' },
  { key: 'vignette', label: 'Vignette (A4)' },
]

const carStep = ref(0)
const addSteps = [
  { label: 'Identité', icon: CarIcon },
  { label: 'Tarifs & États', icon: Wallet },
  { label: 'Dates & Entretien', icon: CalendarClock },
  { label: 'Documents', icon: Upload },
]

const goNextStep = () => {
  if (carStep.value === 0 && (!carForm.matricule || !carForm.brand || !carForm.model)) {
    alert('Veuillez remplir la matricule, la marque et le modèle du véhicule.')
    return
  }
  if (carStep.value < addSteps.length - 1) carStep.value++
}

const goPrevStep = () => {
  if (carStep.value > 0) carStep.value--
}

const handleGlobalEnter = (event?: KeyboardEvent) => {
  if (submitting.value) return
  const target = event?.target as HTMLElement | null
  const btn = target && target.closest('button')
  if (btn) {
    const text = (btn.textContent || '').toLowerCase()
    if (text.includes('précédent')) { goPrevStep(); return }
    if (text.includes('annuler')) { showForm.value = false; return }
  }
  if (carStep.value < addSteps.length - 1) {
    goNextStep()
  } else {
    saveCar()
  }
}

const pendingDocs = reactive<Record<string, any>>({})
const uploadingType = ref<string | null>(null)

const isPdf = (url: string) => url?.split('?')[0].toLowerCase().endsWith('.pdf')

const getDocPreviewUrl = (doc: any) => {
  if (!doc) return ''
  if (doc.preview) return doc.preview
  return getImageUrl(doc.url)
}

const handleDocSelect = async (type: string, event: any) => {
  const file = event.target.files?.[0]
  if (!file) return
  const existing = pendingDocs[type]
  const preview = URL.createObjectURL(file)
  pendingDocs[type] = {
    type,
    preview,
    url: existing?.url || '',
    originalName: file.name
  }
  uploadingType.value = type
  try {
    const res = await uploadApi.upload(file)
    pendingDocs[type] = { ...pendingDocs[type], url: res.url, preview }
  } catch (err) {
    console.error('Document upload failed', err)
    alert("Erreur lors du téléversement du document.")
  } finally {
    uploadingType.value = null
    event.target.value = ''
  }
}

const removePendingDoc = (type: string) => {
  if (pendingDocs[type]?.preview) URL.revokeObjectURL(pendingDocs[type].preview)
  delete pendingDocs[type]
}

const showCropper = ref(false)
const croppingType = ref<string | null>(null)
const cropperRef = ref<any>(null)

const croppingImage = computed(() => {
  if (!croppingType.value) return ''
  return pendingDocs[croppingType.value]?.preview || ''
})

const openCropper = (type: string) => {
  const doc = pendingDocs[type]
  if (!doc || isPdf(doc.url || doc.originalName)) return
  croppingType.value = type
  showCropper.value = true
}

const rotate = () => {
  if (cropperRef.value) {
    cropperRef.value.rotate(90)
  }
}

const applyCroppedDocument = async () => {
  if (!cropperRef.value || !croppingType.value) return
  const type = croppingType.value
  const { canvas } = cropperRef.value.getResult()
  if (!canvas) return
  uploadingType.value = type
  try {
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    const file = new File([blob], `document-${type}.jpg`, { type: 'image/jpeg' })
    const res = await uploadApi.upload(file)
    if (pendingDocs[type]?.preview) URL.revokeObjectURL(pendingDocs[type].preview)
    pendingDocs[type] = {
      ...pendingDocs[type],
      preview: res.url,
      url: res.url,
      originalName: `document-${type}.jpg`
    }
    showCropper.value = false
  } catch (err) {
    console.error('Failed to crop/upload document', err)
    alert("Erreur lors du traitement de l'image.")
  } finally {
    uploadingType.value = null
  }
}

const openAddModal = () => {
  adminPassword.value = ''
  Object.assign(carForm, {
    matricule: '',
    brand: '',
    model: '',
    dailyRate: 300,
    mileage: 0,
    color: '',
    agence: '',
    departureDate: '',
    nextTechnicalVisitDate: '',
    nextOilChangeMileage: 0,
    insuranceDate: ''
  })
  Object.keys(pendingDocs).forEach((k) => {
    if (pendingDocs[k]?.preview) URL.revokeObjectURL(pendingDocs[k].preview)
    delete pendingDocs[k]
  })
  uploadingType.value = null
  carStep.value = 0
  showForm.value = true
}


const deleteCar = (car: any) => {
  carToDelete.value = car
  adminPassword.value = ''
  showSecurityModal.value = true
}

const executeDelete = async () => {
  if (!adminPassword.value) return
  submitting.value = true
  try {
    await carApi.delete(carToDelete.value._id, adminPassword.value)
    guard.reset()
    showSecurityModal.value = false
    loadCars()
  } catch (err: any) {
    console.error(err)
    if (handlePasswordError(err, toast)) return
    alert("Erreur lors de la suppression.")
  } finally {
    submitting.value = false
  }
}

const getStatusBadge = (car: any) => {
  return car.isAvailable 
    ? { label: 'DISPONIBLE', class: 'bg-emerald-500/10  text-emerald-500  border-emerald-500/20 ' }
    : { label: 'LOUÉ', class: 'bg-rose-500/10  text-rose-500  border-rose-500/20 ' }
}
</script>

<template>
  <div class="car-list-container space-y-12 p-8 max-w-7xl mx-auto">
    <!-- Header & Integrated Action Bar -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
      <div class="space-y-2">
        <h1 class="text-4xl font-black tracking-tight text-slate-900 uppercase">Gestion <span class="text-indigo-600">de la Flotte</span></h1>
        <p class="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] pl-1">Inventaire Technique & Disponibilité</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="group relative h-12 w-12 transition-all duration-300 overflow-hidden rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-400 flex items-center cursor-text active:scale-95 hover:shadow-xl hover:shadow-indigo-200/50"
          :class="searchOpen ? 'w-80 border-indigo-500' : 'w-12'"
          @mouseenter="searchOpen = true"
          @mouseleave="searchOpen = false"
          @focusin="searchOpen = true"
          @focusout="searchOpen = false">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Search class="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors duration-300" />
          </div>
          <input
            v-model="filters.brand"
            placeholder="Rechercher par marque ou matricule..."
            :class="[searchOpen ? 'opacity-100' : 'opacity-0', 'h-full w-full pl-10 pr-3 bg-transparent border-0 outline-none text-xs font-bold text-slate-900 placeholder:text-slate-400 transition-opacity duration-300']"
          />
        </div>

        <Button v-if="authStore.isAdmin" @click="openAddModal" @mouseenter="addOpen = true" @mouseleave="addOpen = false" class="group relative h-12 w-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-2xl shadow-indigo-200 transition-all duration-300 overflow-hidden flex items-center justify-start active:scale-95 hover:scale-105 hover:-translate-y-0.5 hover:shadow-indigo-400/40">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Plus class="w-4 h-4 stroke-[3] transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
          </div>
          <span :class="[addOpen ? 'opacity-100' : 'opacity-0', 'whitespace-nowrap transition-all duration-300 pl-10 pr-4 uppercase tracking-widest text-[10px]']">Ajouter un Véhicule</span>
        </Button>
      </div>
    </div>

    <!-- Main Table Card (Glass Design) -->
    <Card class="border border-slate-200/50 shadow-[0_20px_60px_rgba(15,23,42,0.08)] [0_20px_60px_rgba(0,0,0,0.3)] bg-white/70 backdrop-blur-3xl overflow-hidden rounded-[2.5rem]">
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow class="bg-slate-50/50 border-b border-slate-100">
                <TableHead class="pl-10 py-6 text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">VÉHICULE & MODÈLE</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">MATRICULE / COULEUR</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">AGENCE</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase text-center">KM / ÉTAT</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase text-center">TARIF JOURNALIER</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase text-center">STATUT</TableHead>
                <TableHead v-if="authStore.isAdmin" class="pr-10 text-right text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">GESTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow 
                v-for="car in paginatedCars" 
                :key="car._id"
                @click="router.push(`/cars/${car._id}`)"
                :class="[
                  'group border-slate-100 transition-all duration-500 cursor-pointer hover:bg-indigo-50/40 relative active:scale-[0.998]'
                ]"
              >
                <TableCell class="pl-10 py-7">
                  <div class="flex flex-col gap-1">
                    <span class="font-black text-slate-900 group-hover:text-indigo-600 :text-indigo-400 transition-colors tracking-tight text-base uppercase italic">{{ car.brand }} {{ car.model }}</span>
                    <span class="text-[9px] font-black text-indigo-400/80 uppercase tracking-widest leading-none">Dernière Maintenance: {{ formatDate(car.departureDate) }}</span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div class="flex flex-col gap-1">
                    <span class="text-[11px] font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md w-fit tabular-nums">{{ car.matricule }}</span>
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5">{{ car.color || 'N/A' }}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">{{ car.agence?.name || '—' }}</span>
                </TableCell>

                <TableCell class="text-center">
                  <div class="flex flex-col items-center">
                    <span class="text-sm font-black text-slate-900 group-hover:scale-110 transition-transform duration-500 tabular-nums">{{ car.mileage }} <span class="text-[9px] text-slate-400/80">KM</span></span>
                    <div v-if="car.nextTechnicalVisitDate" class="flex items-center gap-1 mt-1">
                       <div class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                       <span class="text-[8px] font-black text-rose-500 uppercase tracking-tighter">Prochaine Visite: {{ formatDate(car.nextTechnicalVisitDate) }}</span>
                    </div>
                  </div>
                </TableCell>

                <TableCell class="text-center font-black text-slate-900 text-lg tracking-tighter tabular-nums">
                  {{ car.dailyRate }} <span class="text-[10px] text-slate-400 uppercase font-bold ml-0.5 tracking-widest font-mono">TND</span>
                </TableCell>

                <TableCell class="text-center">
                  <Badge 
                    :class="['text-[9px] font-black tracking-[0.15em] px-3 py-1 rounded-full border-2 flex items-center gap-1.5 w-fit mx-auto transition-all duration-500 group-hover:shadow-lg', getStatusBadge(car).class]"
                  >
                    {{ getStatusBadge(car).label }}
                  </Badge>
                </TableCell>

                <TableCell v-if="authStore.isAdmin" class="pr-10 text-right">
                  <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 duration-500">
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      @click.stop="deleteCar(car)"
                      class="h-11 w-11 text-slate-400 hover:text-rose-500 :text-rose-400 hover:bg-rose-500/10 :bg-rose-900/40 rounded-xl"
                    >
                      <Trash class="w-4 h-4 stroke-[2.5]" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              
              <TableRow v-if="cars.length === 0 && !loading">
                <TableCell :colspan="authStore.isAdmin ? 7 : 6" class="h-60 text-center">
                  <div class="flex flex-col items-center gap-4 opacity-30">
                    <CarIcon class="w-16 h-16 stroke-[1]" />
                    <p class="font-black uppercase tracking-[0.3em] text-xs">Aucun véhicule disponible</p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div v-if="sortedCars.length > pageSize" class="flex items-center justify-between px-10 py-5 border-t border-slate-100 bg-slate-50/50">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Page {{ currentPage }} / {{ totalCarPages }} — {{ sortedCars.length }} résultats
          </p>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" :disabled="currentPage <= 1" @click="currentPage--" class="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-slate-200 disabled:opacity-30">
              <ChevronLeft class="w-4 h-4 mr-1" /> Précédent
            </Button>
            <Button variant="outline" size="sm" :disabled="currentPage >= totalCarPages" @click="currentPage++" class="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-slate-200 disabled:opacity-30">
              Suivant <ChevronRight class="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Add/Edit Modal -->
    <Dialog v-model:open="showForm">
      <DialogContent hideClose @keydown.enter.prevent @keyup.enter="handleGlobalEnter" class="sm:max-w-3xl bg-white border-border shadow-3xl rounded-[2.5rem] p-0 overflow-hidden text-foreground max-h-[92vh] flex flex-col">
        <DialogHeader class="px-10 py-8 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white relative overflow-hidden shrink-0">
          <div class="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div class="absolute bottom-0 left-32 w-28 h-28 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          <button type="button" @click="showForm = false" class="absolute top-5 right-5 z-20 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all duration-300 hover:rotate-90 active:scale-90">
            <X class="w-5 h-5" />
          </button>
          <div class="flex items-center gap-5 relative z-10">
            <div class="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center shadow-lg shadow-indigo-900/20">
              <CarIcon class="w-7 h-7" />
            </div>
            <div>
              <p class="text-[9px] font-black uppercase tracking-[0.35em] text-indigo-200">Création</p>
              <DialogTitle class="text-2xl font-black uppercase tracking-tighter leading-tight">Ajouter un Véhicule</DialogTitle>
              <p class="text-white/70 font-bold uppercase tracking-widest text-[9px] mt-1.5">Spécifications techniques</p>
            </div>
          </div>
        </DialogHeader>

        <!-- Stepper -->
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
          <template v-for="(step, index) in addSteps" :key="index">
            <div class="flex items-center gap-2 cursor-pointer shrink-0 transition-all" @click="carStep > index ? carStep = index : null">
              <div :class="['w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 border-2', carStep === index ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-110 rotate-3' : carStep > index ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-white border-slate-200 text-slate-400']">
                <component :is="step.icon" class="w-4 h-4 stroke-[2.5]" />
              </div>
              <div class="hidden md:block">
                <div :class="['text-[8px] font-black uppercase tracking-[0.2em] leading-none whitespace-nowrap', carStep >= index ? 'text-slate-900' : 'text-slate-400']">
                  <span class="font-mono text-[8px] opacity-60 mr-1">0{{ index + 1 }}</span>{{ step.label }}
                </div>
              </div>
            </div>
            <div v-if="index < addSteps.length - 1" class="hidden md:block flex-1 h-px bg-slate-200 mx-2"></div>
          </template>
        </div>

        <!-- Step Content -->
        <div class="p-10 overflow-y-auto flex-1 custom-scrollbar">
          <!-- STEP 1: Identité du Véhicule -->
          <div v-if="carStep === 0" class="space-y-9 animate-in slide-in-from-right-4 duration-500">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0"><CarIcon class="w-4 h-4" /></div>
              <h4 class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800">Identité du Véhicule</h4>
              <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2 md:col-span-2">
                <Label class="form-label">Matricule (Identifiant Unique)</Label>
                <Input v-model="carForm.matricule" class="form-field tabular-nums" />
              </div>
              <div class="space-y-2">
                <Label class="form-label">Marque</Label>
                <Input v-model="carForm.brand" class="form-field" />
              </div>
              <div class="space-y-2">
                <Label class="form-label">Modèle</Label>
                <Input v-model="carForm.model" class="form-field" />
              </div>
            </div>
          </div>

          <!-- STEP 2: Tarifs & États -->
          <div v-else-if="carStep === 1" class="animate-in slide-in-from-right-4 duration-500">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0"><Wallet class="w-4 h-4" /></div>
              <h4 class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800">Tarifs & États</h4>
              <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <Label class="form-label">Tarif (TND/Jour)</Label>
                <Input type="number" v-model="carForm.dailyRate" class="form-field tabular-nums" />
              </div>
              <div class="space-y-2">
                <Label class="form-label">Kilométrage</Label>
                <Input type="number" v-model="carForm.mileage" class="form-field tabular-nums" />
              </div>
              <div class="space-y-2">
                <Label class="form-label">Couleur</Label>
                <Input v-model="carForm.color" class="form-field" @click.stop />
              </div>
              <div class="space-y-2">
                <Label class="form-label">Agence</Label>
                <div class="relative">
                  <select v-model="carForm.agence" class="form-field form-field-select">
                    <option value="" disabled>Choisir une agence...</option>
                    <option v-for="agence in agences" :key="agence._id" :value="agence._id">{{ agence.name }}</option>
                  </select>
                  <ChevronDown class="w-4 h-4 text-slate-400 pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>

          <!-- STEP 3: Dates & Entretien -->
          <div v-else-if="carStep === 2" class="animate-in slide-in-from-right-4 duration-500">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0"><CalendarClock class="w-4 h-4" /></div>
              <h4 class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800">Dates & Entretien</h4>
              <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <Label class="form-label">Date Départ</Label>
                <Input type="date" v-model="carForm.departureDate" class="form-field" @click.stop />
              </div>
              <div class="space-y-2">
                <Label class="form-label">Prochaine Visite</Label>
                <Input type="date" v-model="carForm.nextTechnicalVisitDate" class="form-field" @click.stop />
              </div>
              <div class="space-y-2">
                <Label class="form-label">Vidange (KM)</Label>
                <Input type="number" v-model="carForm.nextOilChangeMileage" class="form-field tabular-nums" @click.stop />
              </div>
              <div class="space-y-2">
                <Label class="form-label">Prochaine Assurance (Date)</Label>
                <Input type="date" v-model="carForm.insuranceDate" class="form-field" @click.stop />
              </div>
            </div>
          </div>

          <!-- STEP 4: Documents -->
          <div v-else class="animate-in slide-in-from-right-4 duration-500">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0"><Upload class="w-4 h-4" /></div>
              <h4 class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800">Documents du Véhicule</h4>
              <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div v-for="docType in documentTypes" :key="docType.key">
                <input
                  type="file"
                  :id="'add-doc-input-' + docType.key"
                  class="hidden"
                  accept="image/*,application/pdf"
                  @change="(e) => handleDocSelect(docType.key, e)"
                />

                <div v-if="pendingDocs[docType.key]" class="border border-slate-200/50 rounded-[1.75rem] overflow-hidden bg-white/60 shadow-lg shadow-slate-100/50 group">
                  <div class="aspect-[4/3] bg-slate-100 relative">
                    <img
                      v-if="!isPdf(pendingDocs[docType.key].url || pendingDocs[docType.key].originalName)"
                      :src="getDocPreviewUrl(pendingDocs[docType.key])"
                      class="absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                      :alt="docType.label"
                    />
                    <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300">
                      <FileText class="w-12 h-12 stroke-[1.5]" />
                      <span class="text-[9px] font-black uppercase tracking-widest">Fichier PDF</span>
                    </div>
                    <span class="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-500 shadow-sm">{{ docType.label }}</span>
                    <span :class="['absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest', pendingDocs[docType.key].url ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white']">{{ pendingDocs[docType.key].url ? 'Chargé' : 'En attente' }}</span>
                  </div>
                  <div class="p-4 flex items-center justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <p class="text-[9px] font-black text-slate-900 uppercase tracking-widest truncate">{{ pendingDocs[docType.key].originalName || docType.label }}</p>
                      <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Aperçu avant enregistrement</p>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                      <label :for="'add-doc-input-' + docType.key" class="h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer" title="Remplacer">
                        <Upload class="w-4 h-4" />
                      </label>
                      <Button v-if="!isPdf(pendingDocs[docType.key].url || pendingDocs[docType.key].originalName)" @click="openCropper(docType.key)" variant="ghost" size="icon" class="h-9 w-9 rounded-xl text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Recadrer / Pivoter">
                        <Pencil class="w-4 h-4" />
                      </Button>
                      <Button @click="removePendingDoc(docType.key)" variant="ghost" size="icon" class="h-9 w-9 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all" title="Retirer">
                        <Trash2 class="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <label v-else :for="'add-doc-input-' + docType.key" class="aspect-[4/3] border-2 border-dashed border-slate-200 rounded-[1.75rem] flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all">
                  <div :class="['w-12 h-12 rounded-2xl flex items-center justify-center transition-all', uploadingType === docType.key ? 'bg-indigo-100 text-indigo-500' : 'bg-slate-100 text-slate-400']">
                    <Upload v-if="uploadingType !== docType.key" class="w-5 h-5" />
                    <div v-else class="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div class="text-center px-4">
                    <p class="text-[10px] font-black text-slate-700 uppercase tracking-widest">{{ docType.label }}</p>
                    <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{{ uploadingType === docType.key ? 'Téléversement...' : 'Cliquer pour téléverser' }}</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter class="px-10 py-6 bg-slate-50/80 border-t border-slate-100 flex gap-4 shrink-0">
          <Button variant="ghost" @click="showForm = false" class="flex-1 h-12 rounded-xl font-black uppercase text-[10px] text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">Annuler</Button>
          <Button v-if="carStep > 0" @click="goPrevStep" variant="outline" class="flex-1 h-12 rounded-xl font-black uppercase text-[10px] border-slate-200 text-slate-500 hover:bg-white hover:text-slate-900 transition-all flex items-center justify-center gap-2">
            <ArrowLeft class="w-4 h-4" /> Précédent
          </Button>
          <Button v-if="carStep < addSteps.length - 1" @click="goNextStep" class="flex-[2] h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 gap-2">
            Suivant <ArrowRight class="w-4 h-4" />
          </Button>
          <Button v-else @click="saveCar" :disabled="submitting" class="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-emerald-600/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 gap-2">
            <CarIcon class="w-4 h-4" /> {{ submitting ? 'Enregistrement...' : 'Enregistrer' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- CROPPER DIALOG -->
    <Dialog v-model:open="showCropper">
      <DialogContent class="max-w-[95vw] md:max-w-4xl h-[90vh] flex flex-col bg-white border-none shadow-2xl rounded-[2.5rem] p-6 md:p-10 overflow-hidden">
        <div class="space-y-6 flex flex-col h-full">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <div class="flex items-center gap-4">
              <div class="p-3 bg-indigo-50 rounded-2xl">
                <Upload class="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <DialogTitle class="text-2xl font-black text-slate-900 uppercase tracking-tight">Ajuster le <span class="text-indigo-600 italic">Document</span></DialogTitle>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Recadrer ou pivoter l'image</p>
              </div>
            </div>
            <Button @click="rotate" variant="secondary" class="rounded-2xl h-12 w-12 p-0 hover:bg-indigo-100 transition-all active:rotate-90">
               <RotateCw class="w-5 h-5 text-indigo-600" />
            </Button>
          </div>

          <div class="flex-1 min-h-0 rounded-3xl overflow-hidden border-2 border-slate-100 bg-slate-50">
            <Cropper
              ref="cropperRef"
              :src="croppingImage"
              class="h-full w-full"
            />
          </div>

          <div class="flex flex-col gap-3 pt-4">
             <Button @click="applyCroppedDocument" :disabled="uploadingType !== null" class="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-indigo-100 transition-all gap-2">
                <Check v-if="uploadingType === null" class="w-4 h-4" />
                <Loader2 v-else class="w-4 h-4 animate-spin" />
                Appliquer les Modifications
             </Button>
             <Button variant="ghost" @click="showCropper = false" class="text-slate-400 font-black uppercase text-[9px] tracking-widest">Annuler</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- DELETE SECURITY DIALOG -->
    <Dialog v-model:open="showSecurityModal">
      <DialogContent class="sm:max-w-md bg-white border-none shadow-[0_20px_60px_rgba(0,0,0,0.3)] rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader class="mb-4 text-center">
          <DialogTitle class="text-xl font-black text-rose-600 uppercase italic tracking-tighter">Confirmation <span class="text-slate-900">Requise</span></DialogTitle>
          <p class="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">Autorisation de suppression définitive</p>
        </DialogHeader>
        
        <div v-if="guard.isLocked" class="flex items-center justify-center gap-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl px-4 py-3 mb-4">
          <Lock class="w-4 h-4" />
          <span class="text-[10px] font-black uppercase tracking-widest">Trop de tentatives — réessayez dans {{ guard.remainingSeconds }}s</span>
        </div>
        <div class="space-y-4">
           <div class="relative">
             <Input :type="showPassword ? 'text' : 'password'" v-model="adminPassword" :disabled="guard.isLocked" placeholder="Mot de passe admin..." class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black font-mono tracking-widest text-center pr-12" @keyup.enter="executeDelete" />
             <button type="button" @click="showPassword = !showPassword" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors outline-none">
               <Eye v-if="!showPassword" class="w-5 h-5" />
               <EyeOff v-else class="w-5 h-5" />
             </button>
           </div>
        </div>
        
        <DialogFooter class="mt-6 border-t border-slate-100 pt-6">
          <Button variant="ghost" @click="showSecurityModal = false" class="w-full h-12 font-black uppercase text-[10px] tracking-widest rounded-xl text-slate-400">Annuler</Button>
          <Button @click="executeDelete" :disabled="!adminPassword || submitting || guard.isLocked" class="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-rose-200">
            {{ submitting ? 'Suppression...' : 'Confirmer' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.form-label {
  display: block;
  font-size: 9px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #64748b;
  margin-bottom: 0.5rem;
  padding-left: 0.25rem;
}

.form-field {
  width: 100%;
  height: 3rem;
  padding-left: 1rem;
  padding-right: 1rem;
  border-radius: 0.75rem;
  background-color: rgb(248 250 252 / 0.8);
  border: 1px solid #e2e8f0;
  outline: none;
  font-weight: 600;
  font-size: 0.875rem;
  color: #1e293b;
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.form-field:hover {
  border-color: #cbd5e1;
}

.form-field:focus {
  border-color: #6366f1;
  background-color: #ffffff;
  box-shadow: 0 0 0 4px rgb(99 102 241 / 0.12);
}

.form-field::placeholder {
  color: #94a3b8;
}

.form-field-select {
  padding-right: 2.5rem;
  appearance: none;
  cursor: pointer;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}
</style>


