<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { contratApi, carApi, clientApi } from '@/api'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { 
  Plus, Search, FileText, Eye, Download, ChevronLeft, ChevronRight, Filter, X
} from 'lucide-vue-next'
import { 
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const router = useRouter()
const authStore = useAuthStore()
const contrats = ref<any[]>([])
const cars = ref<any[]>([])
const clients = ref<any[]>([])
const loading = ref(true)
const currentPage = ref(1)
const pageSize = 10
const showFilters = ref(false)
const showSearch = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)

const closeSearch = () => {
  if (!filters.reference) {
    showSearch.value = false
  }
}

watch(showSearch, (val) => {
  if (val) {
    nextTick(() => searchInputRef.value?.focus())
  }
})

const filters = reactive({
  status: '',
  reference: '',
  car: '',
  client: '',
  dateStart: '',
  dateEnd: ''
})

const loadContrats = async () => {
  loading.value = true
  try {
    const data = await contratApi.getAll({ 
      status: filters.status || undefined
    })
    contrats.value = data
  } catch (err) {
    console.error('Failed to load contracts', err)
  } finally {
    loading.value = false
  }
}

const loadFilterData = async () => {
  try {
    const [carsData, clientsData] = await Promise.all([
      carApi.getAll(),
      clientApi.getAll()
    ])
    cars.value = carsData.filter((c: any) => !c.disabled)
    clients.value = clientsData.filter((c: any) => !c.disabled)
  } catch (err) {
    console.error('Failed to load filter data', err)
  }
}

onMounted(() => {
  loadContrats()
  loadFilterData()
})
watch(() => filters.status, () => { currentPage.value = 1; loadContrats() })

const filteredContrats = computed(() => {
  let result = contrats.value

  // Text search filter
  if (filters.reference) {
    const search = filters.reference.toLowerCase()
    result = result.filter(c => {
      const refMatch = c.reference?.toLowerCase().includes(search)
      const clientMatch = c.clients?.some((cl: any) => 
        cl.firstName?.toLowerCase().includes(search) || 
        cl.lastName?.toLowerCase().includes(search) || 
        cl.cin?.toLowerCase().includes(search)
      )
      const carMatch = c.car && (
        c.car.brand?.toLowerCase().includes(search) || 
        c.car.model?.toLowerCase().includes(search) || 
        c.car.matricule?.toLowerCase().includes(search)
      )
      return refMatch || clientMatch || carMatch
    })
  }

  // Car filter
  if (filters.car) {
    result = result.filter(c => c.car?._id === filters.car)
  }

  // Client filter
  if (filters.client) {
    result = result.filter(c => 
      c.clients?.some((cl: any) => cl._id === filters.client)
    )
  }

  // Date range filter
  if (filters.dateStart) {
    const start = new Date(filters.dateStart)
    result = result.filter(c => new Date(c.startDate) >= start)
  }
  if (filters.dateEnd) {
    const end = new Date(filters.dateEnd)
    end.setHours(23, 59, 59, 999)
    result = result.filter(c => new Date(c.startDate) <= end)
  }

  return result
})

const totalContratPages = computed(() => Math.ceil(filteredContrats.value.length / pageSize))
const paginatedContrats = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredContrats.value.slice(start, start + pageSize)
})

const viewContrat = (id: string) => {
  router.push(`/contrats/${id}`)
}

const downloadPdf = async (contrat: any) => {
  try {
     const blob = await contratApi.getPdf(contrat._id)
     const url = window.URL.createObjectURL(blob)
     const link = document.createElement('a')
     link.href = url
     link.setAttribute('download', `contrat-${contrat.reference}.pdf`)
     document.body.appendChild(link)
     link.click()
     link.remove()
  } catch (err) {
     console.error('Failed to download PDF', err)
  }
}

const activeFilterCount = computed(() => {
  let count = 0
  if (filters.status) count++
  if (filters.car) count++
  if (filters.client) count++
  if (filters.dateStart) count++
  if (filters.dateEnd) count++
  return count
})

const clearFilters = () => {
  filters.status = ''
  filters.car = ''
  filters.client = ''
  filters.dateStart = ''
  filters.dateEnd = ''
  currentPage.value = 1
}

const needsReturnMileage = (contrat: any) => {
  return (contrat.status === 'terminé' || contrat.status === 'clôturé') && !contrat.returnMileage
}

const getStatusBadge = (contrat: any) => {
  const status = contrat.status.toLowerCase()
  
  switch (status) {
    case 'soon':
      return { label: 'À VENIR', class: 'bg-blue-50  text-blue-600  border-blue-200/50 ' }
    case 'active': 
      return { label: 'ACTIF', class: 'bg-emerald-50  text-emerald-600  border-emerald-200/50 ' }
    case 'terminé': 
      return { label: 'TERMINÉ', class: 'bg-slate-50  text-slate-500  border-slate-200/50 ' }
    case 'clôturé': 
      return { label: 'CLÔTURÉ', class: 'bg-amber-50  text-amber-600  border-amber-200/50 ' }
    case 'cancelled': 
      return { label: 'ANNULÉ', class: 'bg-rose-50  text-rose-600  border-rose-200/50 ' }
    default: 
      return { label: status.toUpperCase(), class: 'bg-amber-50  text-amber-600  border-amber-200/50 ' }
  }
}
</script>

<template>
  <div class="contrat-list-container space-y-12 p-8 max-w-7xl mx-auto">
    <!-- Header & Integrated Search Bar -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
      <div class="space-y-2">
        <h1 class="text-4xl font-black tracking-tight text-slate-900 uppercase">Registre <span class="text-indigo-600 italic">des Contrats</span></h1>
        <p class="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] pl-1">Tableau de bord de gestion opérationnelle</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="relative">
          <div v-if="!showSearch" @click="showSearch = true" class="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-300 cursor-pointer transition-all">
            <Search class="w-4 h-4 text-slate-400" />
          </div>
          <div v-else class="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
            <div class="relative">
              <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search class="w-4 h-4 text-indigo-600" />
              </div>
              <input 
                ref="searchInputRef"
                v-model="filters.reference" 
                placeholder="Référence, Client, Véhicule..." 
                class="h-12 pl-10 pr-4 w-64 rounded-2xl bg-white border-2 border-indigo-200 focus:border-indigo-500 outline-none font-bold text-xs text-slate-900 transition-all"
                @keyup.escape="closeSearch"
                @blur="!filters.reference && (showSearch = false)"
              />
            </div>
            <div @click="closeSearch" class="h-12 w-12 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 cursor-pointer transition-all">
              <X class="w-4 h-4 text-slate-500" />
            </div>
          </div>
        </div>

        <Button 
          @click="showFilters = !showFilters" 
          :class="'h-12 px-5 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 transition-all flex items-center gap-2 ' + (showFilters ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300')"
        >
          <Filter class="w-4 h-4" />
          <span class="hidden sm:inline">Filtres</span>
          <span v-if="activeFilterCount > 0" class="ml-1 w-5 h-5 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center">{{ activeFilterCount }}</span>
        </Button>

        <Button @click="router.push('/contrats/new')" class="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-2xl shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2">
          <Plus class="w-4 h-4 stroke-[3]" />
          <span class="uppercase tracking-widest text-[10px]">Nouveau Contrat</span>
        </Button>
      </div>
    </div>

    <!-- Filters Panel -->
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      leave-active-class="transition-all duration-200 ease-in"
      enter-from-class="opacity-0 -translate-y-2 max-h-0"
      enter-to-class="opacity-100 translate-y-0 max-h-96"
      leave-from-class="opacity-100 translate-y-0 max-h-96"
      leave-to-class="opacity-0 -translate-y-2 max-h-0"
    >
      <div v-if="showFilters" class="overflow-hidden">
        <Card class="border border-slate-200/50 bg-white/70 backdrop-blur-3xl rounded-[2rem] shadow-lg">
          <CardContent class="p-6">
            <div class="flex flex-col lg:flex-row lg:items-end gap-5">
              <!-- Status -->
              <div class="flex-1 min-w-0 space-y-2">
                <label class="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Statut</label>
                <select v-model="filters.status" class="w-full h-11 px-4 rounded-xl bg-slate-50/80 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold text-xs text-slate-700 transition-all">
                  <option value="">Tous les statuts</option>
                  <option value="soon">À venir</option>
                  <option value="active">Actif</option>
                  <option value="terminé">Terminé</option>
                  <option value="clôturé">Clôturé</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>

              <!-- Car -->
              <div class="flex-1 min-w-0 space-y-2">
                <label class="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Véhicule</label>
                <select v-model="filters.car" class="w-full h-11 px-4 rounded-xl bg-slate-50/80 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold text-xs text-slate-700 transition-all truncate">
                  <option value="">Tous les véhicules</option>
                  <option v-for="car in cars" :key="car._id" :value="car._id">{{ car.brand }} {{ car.model }} ({{ car.matricule }})</option>
                </select>
              </div>

              <!-- Client -->
              <div class="flex-1 min-w-0 space-y-2">
                <label class="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Client</label>
                <select v-model="filters.client" class="w-full h-11 px-4 rounded-xl bg-slate-50/80 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold text-xs text-slate-700 transition-all truncate">
                  <option value="">Tous les clients</option>
                  <option v-for="cl in clients" :key="cl._id" :value="cl._id">{{ cl.firstName }} {{ cl.lastName }}</option>
                </select>
              </div>

              <!-- Date Start -->
              <div class="flex-1 min-w-0 space-y-2">
                <label class="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Date début</label>
                <input type="date" v-model="filters.dateStart" class="w-full h-11 px-4 rounded-xl bg-slate-50/80 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold text-xs text-slate-700 transition-all" />
              </div>

              <!-- Date End -->
              <div class="flex-1 min-w-0 space-y-2">
                <label class="block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Date fin</label>
                <input type="date" v-model="filters.dateEnd" class="w-full h-11 px-4 rounded-xl bg-slate-50/80 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none font-bold text-xs text-slate-700 transition-all" />
              </div>
            </div>

            <div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <template v-if="activeFilterCount > 0">{{ activeFilterCount }} filtre(s) actif(s)</template>
                <template v-else>Aucun filtre actif</template>
              </p>
              <Button 
                @click="clearFilters" 
                :class="'h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ' + (activeFilterCount > 0 ? 'text-red-500 hover:bg-red-50 bg-red-50/50' : 'text-slate-400 hover:bg-slate-100')"
              >
                <X class="w-3 h-3" /> Effacer les filtres
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </transition>

    <!-- Main Table Card (Glass Design) -->
    <Card class="border border-slate-200/50 shadow-[0_20px_60px_rgba(15,23,42,0.08)] [0_20px_60px_rgba(0,0,0,0.3)] bg-white/70 backdrop-blur-3xl overflow-hidden rounded-[2.5rem]">
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow class="bg-slate-50/50 border-b border-slate-100">
                <TableHead class="pl-10 py-6 text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">Réf / Statut</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">Locataire & Dossier</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">VÉHICULE & MATRICULE</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase text-center">PÉRIODE DE LOCATION</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase text-center">NET À PAYER</TableHead>
                <TableHead v-if="authStore.isAdmin" class="pr-10 text-right text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">OPTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow 
                v-for="contrat in paginatedContrats" 
                :key="contrat._id"
                @click="viewContrat(contrat._id)"
                :class="[
                  'group border-slate-100 transition-all duration-500 cursor-pointer hover:shadow-2xl relative active:scale-[0.998]',
                  needsReturnMileage(contrat) ? 'bg-red-50 hover:bg-red-100/80 border-l-4 border-l-red-500' : 'hover:bg-white'
                ]"
              >
                <TableCell class="pl-10 py-7">
                  <div class="flex flex-col gap-2">
                    <span class="font-black text-slate-900 group-hover:text-indigo-600 :text-indigo-400 transition-colors tracking-tight text-base italic uppercase tabular-nums">{{ contrat.reference }}</span>
                    <div class="flex items-center gap-2">
                      <Badge 
                        :class="['text-[8px] font-black tracking-widest px-3 py-1 rounded-full border shadow-sm flex items-center gap-1 w-fit', getStatusBadge(contrat).class]"
                      >
                        {{ getStatusBadge(contrat).label }}
                      </Badge>
                      <span v-if="needsReturnMileage(contrat)" class="text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full bg-red-500 text-white border border-red-600 shadow-sm flex items-center gap-1">
                        KM RETOUR MANQUANT
                      </span>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div class="flex flex-col" v-if="contrat.clients?.length">
                    <div class="flex items-center gap-2">
                      <span class="font-black text-slate-900 group-hover:underline decoration-indigo-600/30 underline-offset-4 uppercase italic">
                        {{ contrat.clients[0]?.firstName }} {{ contrat.clients[0]?.lastName }}
                      </span>
                      <Badge v-if="contrat.clients.length > 1" class="bg-indigo-600/10 text-indigo-600 border-indigo-200 text-[8px] font-black px-1.5 py-0 h-4 rounded-md">
                        +{{ contrat.clients.length - 1 }}
                      </Badge>
                    </div>
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 tabular-nums">Dossier: {{ contrat.clients[0]?.cin || 'N/A' }}</span>
                  </div>
                  <span v-else class="text-[10px] font-bold text-slate-300 italic uppercase">Inconnu</span>
                </TableCell>

                <TableCell>
                   <div class="flex flex-col" v-if="contrat.car">
                    <span class="font-black text-slate-900 uppercase italic">{{ contrat.car?.brand }} {{ contrat.car?.model }}</span>
                    <div class="flex items-center gap-1.5 mt-1">
                       <div :class="['w-1.5 h-1.5 rounded-full bg-emerald-500', contrat.status !== 'active' && 'bg-slate-300 opacity-50']"></div>
                       <span class="text-[10px] font-mono font-black text-indigo-400/80 uppercase tracking-tight tabular-nums">{{ contrat.car?.matricule }}</span>
                    </div>
                  </div>
                  <span v-else class="text-[10px] font-bold text-slate-300 italic uppercase">Indisponible</span>
                </TableCell>

                <TableCell class="text-center">
                  <div class="inline-flex items-center gap-3 bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-2 group-hover:bg-indigo-50/50 :bg-indigo-900/20 transition-all">
                    <span class="text-[11px] font-black text-slate-700 tabular-nums">{{ formatDate(contrat.startDate) }}</span>
                    <span class="text-[8px] text-slate-300 uppercase font-black tracking-tighter">⎯</span>
                    <span class="text-[11px] font-black text-slate-700 tabular-nums">{{ formatDate(contrat.endDate) }}</span>
                  </div>
                </TableCell>

                <TableCell class="text-center font-black text-slate-900 text-lg tracking-tighter tabular-nums italic">
                  {{ contrat.totalAmount }} <span class="text-[10px] text-slate-400 uppercase font-bold ml-0.5 tracking-widest">TND</span>
                </TableCell>

                <TableCell v-if="authStore.isAdmin" class="pr-10 text-right">
                  <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 duration-500">
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      @click.stop="viewContrat(contrat._id)"
                      class="h-11 w-11 bg-white shadow-lg text-slate-400 hover:text-indigo-600 :text-indigo-400 hover:bg-slate-50 :bg-slate-700 rounded-xl transition-all"
                    >
                      <Eye class="w-4 h-4 stroke-[2.5]" />
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      @click.stop="downloadPdf(contrat)"
                      class="h-11 w-11 bg-white shadow-lg text-slate-400 hover:text-emerald-600 :text-emerald-400 hover:bg-slate-50 :bg-slate-700 rounded-xl transition-all"
                    >
                      <Download class="w-4 h-4 stroke-[2.5]" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              
              <TableRow v-if="filteredContrats.length === 0 && !loading">
                <TableCell :colspan="authStore.isAdmin ? 6 : 5" class="h-60 text-center">
                  <div class="flex flex-col items-center gap-4 opacity-30">
                    <FileText class="w-16 h-16 stroke-[1]" />
                    <p class="font-black uppercase tracking-[0.3em] text-xs text-slate-500">Aucun contrat trouvé</p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div v-if="filteredContrats.length > pageSize" class="flex items-center justify-between px-10 py-5 border-t border-slate-100 bg-slate-50/50">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Page {{ currentPage }} / {{ totalContratPages }} — {{ filteredContrats.length }} résultats
          </p>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" :disabled="currentPage <= 1" @click="currentPage--" class="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-slate-200 disabled:opacity-30">
              <ChevronLeft class="w-4 h-4 mr-1" /> Précédent
            </Button>
            <Button variant="outline" size="sm" :disabled="currentPage >= totalContratPages" @click="currentPage++" class="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-slate-200 disabled:opacity-30">
              Suivant <ChevronRight class="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>


