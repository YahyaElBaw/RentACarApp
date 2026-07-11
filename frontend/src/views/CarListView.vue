<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { carApi } from '@/api'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { 
  Plus, Search, Pencil, Trash, 
  Car as CarIcon, Eye, EyeOff
} from 'lucide-vue-next'
import { 
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const cars = ref<any[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingCar = ref<any>(null)
const adminPassword = ref('')
const showPassword = ref(false)
const showSecurityModal = ref(false)
const carToDelete = ref<any>(null)
const submitting = ref(false)

const sortedCars = computed(() => {
  return [...cars.value];
});

const filters = reactive({
  brand: '',
  availableOnly: null as boolean | null
})

const carForm = reactive({
  matricule: '',
  brand: '',
  model: '',
  dailyRate: 300,
  mileage: 0,
  color: '',
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

onMounted(() => {
  loadCars()
  if (route.query.add === 'true') {
    openAddModal()
  }
})
watch(() => filters.brand, loadCars)
watch(() => filters.availableOnly, loadCars)

const saveCar = async () => {
  if (editingCar.value && !adminPassword.value) {
    alert("Mot de passe admin requis pour modifier un véhicule.")
    return
  }
  
  submitting.value = true
  try {
    const payload = { ...carForm }
    if (editingCar.value) {
      Object.assign(payload, { password: adminPassword.value })
      await carApi.update(editingCar.value._id, payload)
    } else {
      await carApi.create(carForm)
    }
    showForm.value = false
    loadCars()
  } catch (err: any) {
    console.error(err)
    if (err.response?.status === 401) alert("Mot de passe incorrect.")
    else alert("Une erreur est survenue.")
  } finally {
    submitting.value = false
  }
}

const openAddModal = () => {
  editingCar.value = null
  adminPassword.value = ''
  Object.assign(carForm, {
    matricule: '',
    brand: '',
    model: '',
    dailyRate: 300,
    mileage: 0,
    color: '',
    departureDate: '',
    nextTechnicalVisitDate: '',
    nextOilChangeMileage: 0,
    insuranceDate: ''
  })
  showForm.value = true
}

const editCar = (car: any) => {
  editingCar.value = car
  adminPassword.value = ''
  Object.assign(carForm, car)
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
    showSecurityModal.value = false
    loadCars()
  } catch (err: any) {
    console.error(err)
    if (err.response?.status === 401) alert("Mot de passe incorrect.")
    else alert("Erreur lors de la suppression.")
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
  <div class="car-list-container space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-1000 p-8 max-w-7xl mx-auto">
    <!-- Header & Integrated Action Bar -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
      <div class="space-y-2">
        <h1 class="text-4xl font-black tracking-tight text-slate-900 uppercase">Gestion <span class="text-indigo-600">de la Flotte</span></h1>
        <p class="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] pl-1">Inventaire Technique & Disponibilité</p>
      </div>

      <div class="flex flex-wrap items-center gap-4">
        <div class="relative w-full md:w-80 group">
          <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search class="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          </div>
          <Input 
            v-model="filters.brand" 
            placeholder="Rechercher par marque ou matricule..." 
            class="h-14 pl-12 bg-white/50 border-slate-200 backdrop-blur-xl focus:ring-4 focus:ring-indigo-600/5 rounded-2xl font-bold transition-all text-slate-900"
          />
        </div>

        <Button v-if="authStore.isAdmin" @click="openAddModal" class="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-2xl shadow-indigo-200 transition-all active:scale-95 flex items-center gap-3">
          <Plus class="w-5 h-5 stroke-[3]" />
          <span class="uppercase tracking-widest text-[10px]">Ajouter un Véhicule</span>
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
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase text-center">KM / ÉTAT</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase text-center">TARIF JOURNALIER</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase text-center">STATUT</TableHead>
                <TableHead v-if="authStore.isAdmin" class="pr-10 text-right text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">GESTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow 
                v-for="car in sortedCars" 
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
                      @click.stop="editCar(car)"
                      class="h-11 w-11 text-slate-400 hover:text-indigo-600 :text-indigo-400 hover:bg-indigo-50 :bg-indigo-900/40 rounded-xl"
                    >
                      <Pencil class="w-4 h-4 stroke-[2.5]" />
                    </Button>
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
                <TableCell :colspan="authStore.isAdmin ? 6 : 5" class="h-60 text-center">
                  <div class="flex flex-col items-center gap-4 opacity-30">
                    <CarIcon class="w-16 h-16 stroke-[1]" />
                    <p class="font-black uppercase tracking-[0.3em] text-xs">Aucun véhicule disponible</p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Add/Edit Modal -->
    <Dialog v-model:open="showForm">
      <DialogContent class="sm:max-w-[500px] bg-white/95 backdrop-blur-3xl border border-slate-200 shadow-3xl rounded-[3rem] p-0 overflow-hidden text-slate-900 max-h-[90vh] flex flex-col">
        <DialogHeader class="p-10 bg-indigo-600 text-white relative overflow-hidden">
          <div class="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl opacity-50"></div>
          <div class="flex items-center gap-4 relative z-10">
            <div class="p-3 bg-white/20 rounded-2xl shadow-inner backdrop-blur-md">
              <CarIcon class="w-7 h-7 text-white stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle class="text-2xl font-black uppercase tracking-tight text-white italic">
                {{ editingCar ? 'Modifier' : 'Forger' }} <span class="text-indigo-200">Véhicule</span>
              </DialogTitle>
              <DialogDescription class="text-white/60 text-[10px] font-black uppercase tracking-widest mt-1">
                Spécifications techniques du système.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="p-10 space-y-6 overflow-y-auto max-h-[65vh] bg-transparent">
          <div class="grid grid-cols-2 gap-8">
            <div class="space-y-2 col-span-2">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Matricule (Identifiant Unique)</Label>
              <Input v-model="carForm.matricule" class="h-14 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/50 rounded-2xl font-black tabular-nums transition-all" />
            </div>
            <div class="space-y-2">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marque</Label>
              <Input v-model="carForm.brand" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black transition-all" />
            </div>
            <div class="space-y-2">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modèle</Label>
              <Input v-model="carForm.model" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black transition-all" />
            </div>
            <div class="space-y-2">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tarif (TND/Jour)</Label>
              <Input type="number" v-model="carForm.dailyRate" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black tabular-nums transition-all" />
            </div>
            <div class="space-y-2">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kilométrage</Label>
              <Input type="number" v-model="carForm.mileage" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black tabular-nums transition-all" />
            </div>

            <div class="space-y-2">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Couleur</Label>
              <Input v-model="carForm.color" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black transition-all" @click.stop />
            </div>
            <div class="space-y-2">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Départ</Label>
              <Input type="date" v-model="carForm.departureDate" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black transition-all" @click.stop />
            </div>
            <div class="space-y-2">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prochaine Visite</Label>
              <Input type="date" v-model="carForm.nextTechnicalVisitDate" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black transition-all" @click.stop />
            </div>
            <div class="space-y-2">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vidange (KM)</Label>
              <Input type="number" v-model="carForm.nextOilChangeMileage" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black tabular-nums transition-all" @click.stop />
            </div>
            <div class="space-y-2">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prochaine Assurance (Date)</Label>
              <Input type="date" v-model="carForm.insuranceDate" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black transition-all" @click.stop />
            </div>

            <div v-if="editingCar" class="space-y-2 col-span-2 mt-4">
              <Label class="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Mot De Passe Admin (Requis pour modifier)</Label>
              <div class="relative">
                <Input :type="showPassword ? 'text' : 'password'" v-model="adminPassword" placeholder="Configuration requise..." class="h-14 bg-rose-50 border-rose-100 placeholder:text-rose-300 text-rose-700 rounded-2xl font-black font-mono tracking-widest transition-all pr-12" @click.stop />
                <button type="button" @click="showPassword = !showPassword" class="absolute right-4 top-1/2 -translate-y-1/2 text-rose-400 hover:text-rose-600 transition-colors outline-none">
                  <Eye v-if="!showPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter class="p-10 bg-slate-50/50 border-t border-slate-100 flex gap-4 shrink-0">
          <Button variant="ghost" @click="showForm = false" class="flex-1 h-16 font-black uppercase tracking-widest text-[10px] rounded-2xl text-slate-400 hover:text-slate-900 :text-white transition-all">Abandonner</Button>
          <Button @click="saveCar" :disabled="submitting || (editingCar && !adminPassword)" class="flex-1 h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all">
            {{ submitting ? 'Traitement...' : 'Enregistrer' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- DELETE SECURITY DIALOG -->
    <Dialog v-model:open="showSecurityModal">
      <DialogContent class="sm:max-w-md bg-white border-none shadow-[0_20px_60px_rgba(0,0,0,0.3)] rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader class="mb-4 text-center">
          <DialogTitle class="text-xl font-black text-rose-600 uppercase italic tracking-tighter">Confirmation <span class="text-slate-900">Requise</span></DialogTitle>
          <p class="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">Autorisation de suppression définitive</p>
        </DialogHeader>
        
        <div class="space-y-4">
           <div class="relative">
             <Input :type="showPassword ? 'text' : 'password'" v-model="adminPassword" placeholder="Mot de passe admin..." class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black font-mono tracking-widest text-center pr-12" @keyup.enter="executeDelete" />
             <button type="button" @click="showPassword = !showPassword" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors outline-none">
               <Eye v-if="!showPassword" class="w-5 h-5" />
               <EyeOff v-else class="w-5 h-5" />
             </button>
           </div>
        </div>
        
        <DialogFooter class="mt-6 border-t border-slate-100 pt-6">
          <Button variant="ghost" @click="showSecurityModal = false" class="w-full h-12 font-black uppercase text-[10px] tracking-widest rounded-xl text-slate-400">Annuler</Button>
          <Button @click="executeDelete" :disabled="!adminPassword || submitting" class="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-rose-200">
            {{ submitting ? 'Suppression...' : 'Confirmer' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>


