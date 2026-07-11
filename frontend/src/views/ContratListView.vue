<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { contratApi } from '@/api'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { 
  Plus, Search, FileText, Eye, Download
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
const loading = ref(true)

const filters = reactive({
  status: '',
  reference: ''
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

onMounted(loadContrats)
watch(() => filters.status, loadContrats)

const filteredContrats = computed(() => {
  if (!filters.reference) return contrats.value
  
  const search = filters.reference.toLowerCase()
  return contrats.value.filter(c => {
    const refMatch = c.reference?.toLowerCase().includes(search)
    
    // Client search (Name and CIN)
    const clientMatch = c.clients?.some((cl: any) => 
      cl.firstName?.toLowerCase().includes(search) || 
      cl.lastName?.toLowerCase().includes(search) || 
      cl.cin?.toLowerCase().includes(search)
    )
    
    // Car search (Brand, Model, Matricule)
    const carMatch = c.car && (
      c.car.brand?.toLowerCase().includes(search) || 
      c.car.model?.toLowerCase().includes(search) || 
      c.car.matricule?.toLowerCase().includes(search)
    )
    
    return refMatch || clientMatch || carMatch
  })
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
  <div class="contrat-list-container space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-1000 p-8 max-w-7xl mx-auto">
    <!-- Header & Integrated Search Bar -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
      <div class="space-y-2">
        <h1 class="text-4xl font-black tracking-tight text-slate-900 uppercase">Registre <span class="text-indigo-600 italic">des Contrats</span></h1>
        <p class="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] pl-1">Tableau de bord de gestion opérationnelle</p>
      </div>

      <div class="flex flex-wrap items-center gap-4">
        <div class="relative w-full md:w-80 group">
          <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search class="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          </div>
          <Input 
            v-model="filters.reference" 
            placeholder="Référence ou Client..." 
            class="h-14 pl-12 bg-white/50 border-slate-200 backdrop-blur-xl focus:ring-4 focus:ring-indigo-600/5 rounded-2xl font-bold transition-all text-slate-900"
          />
        </div>

        <Button @click="router.push('/contrats/new')" class="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-2xl shadow-indigo-200 transition-all active:scale-95 flex items-center gap-3">
          <Plus class="w-5 h-5 stroke-[3]" />
          <span class="uppercase tracking-widest text-[10px]">Nouveau Contrat</span>
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
                v-for="contrat in filteredContrats" 
                :key="contrat._id"
                @click="viewContrat(contrat._id)"
                class="group border-slate-100 transition-all duration-500 cursor-pointer hover:bg-white :bg-slate-800/50 hover:shadow-2xl relative active:scale-[0.998]"
              >
                <TableCell class="pl-10 py-7">
                  <div class="flex flex-col gap-2">
                    <span class="font-black text-slate-900 group-hover:text-indigo-600 :text-indigo-400 transition-colors tracking-tight text-base italic uppercase tabular-nums">{{ contrat.reference }}</span>
                    <Badge 
                      :class="['text-[8px] font-black tracking-widest px-3 py-1 rounded-full border shadow-sm flex items-center gap-1 w-fit', getStatusBadge(contrat).class]"
                    >
                      {{ getStatusBadge(contrat).label }}
                    </Badge>
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
      </CardContent>
    </Card>
  </div>
</template>


