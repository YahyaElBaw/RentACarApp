<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { agenceApi, settingApi, uploadApi, carApi, lotContratApi, getImageUrl } from '@/api'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { PasswordConfirmDialog } from '@/components/ui/password-dialog'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'
import { usePasswordGuard, isPasswordError, LOCK_SECONDS } from '@/composables/usePasswordGuard'
import { 
  Building2, Trash2, Loader2, Upload, Plus, ChevronRight, Lock, 
  Search, X, LayoutGrid, List, CarFront, BookOpen, Receipt, Palette,
  ArrowRight, ShieldCheck, Check
} from 'lucide-vue-next'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const guard = usePasswordGuard()

const loading = ref(false)
const agenciesList = ref<any[]>([])
const allCars = ref<any[]>([])
const allCarnets = ref<any[]>([])

const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')

// Create Modal State
const showCreateModal = ref(false)
const creatingAgency = ref(false)
const uploadingImage = ref(false)
const newAgenceName = ref('')
const newAgenceImage = ref('')
const templateFileInput = ref<HTMLInputElement | null>(null)

// Delete Modal State
const showDeleteModal = ref(false)
const deletingAgency = ref(false)
const deletePassword = ref('')
const agencyToDelete = ref<any>(null)

const loadData = async () => {
  loading.value = true
  try {
    const [agenciesRes, carsRes, carnetsRes] = await Promise.all([
      agenceApi.getAll(),
      carApi.getAll().catch(() => []),
      lotContratApi.getAll().catch(() => [])
    ])
    agenciesList.value = agenciesRes || []
    allCars.value = carsRes || []
    allCarnets.value = carnetsRes || []
  } catch (err) {
    console.error('Failed to load agences', err)
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Échec du chargement des agences.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

const getAgencyCarsCount = (agencyId: string) => {
  return allCars.value.filter(c => {
    const aId = c.agence ? (typeof c.agence === 'object' ? c.agence._id : c.agence) : null
    return String(aId) === String(agencyId)
  }).length
}

const getAgencyActiveCarnet = (agencyId: string) => {
  return allCarnets.value.find(l => {
    const aId = l.agence ? (typeof l.agence === 'object' ? l.agence._id : l.agence) : null
    return l.status === 'ouvert' && String(aId) === String(agencyId)
  })
}

const filteredAgencies = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return agenciesList.value
  return agenciesList.value.filter(a => a.name?.toLowerCase().includes(q))
})

const agenciesWithTemplateCount = computed(() => {
  return agenciesList.value.filter(a => Boolean(a.templateImage)).length
})

const agenciesWithTimbreCount = computed(() => {
  return agenciesList.value.filter(a => a.applyTimbreExpense !== false).length
})

const openCreateModal = () => {
  newAgenceName.value = ''
  newAgenceImage.value = ''
  showCreateModal.value = true
}

const triggerTemplateUpload = () => {
  templateFileInput.value?.click()
}

const handleTemplateUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  uploadingImage.value = true
  try {
    const res = await uploadApi.upload(file)
    newAgenceImage.value = res.url
    toast.add({
      severity: 'success',
      summary: 'Image Téléversée',
      detail: 'Le modèle du contrat a été chargé.',
      life: 2000
    })
  } catch (err) {
    console.error('Upload failed', err)
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Échec du téléversement de l\'image.',
      life: 3000
    })
  } finally {
    uploadingImage.value = false
    target.value = ''
  }
}

const createAgence = async () => {
  const name = newAgenceName.value.trim()
  if (!name) return
  creatingAgency.value = true
  try {
    const created = await agenceApi.create({
      name,
      templateImage: newAgenceImage.value || ''
    })
    agenciesList.value.unshift(created)
    showCreateModal.value = false

    // Also sync string list with settingApi for backward compatibility
    const agencyNames = agenciesList.value.map(a => a.name)
    await settingApi.update({ agencies: agencyNames })

    toast.add({
      severity: 'success',
      summary: 'Agence Ajoutée',
      detail: `"${name}" a été ajoutée avec succès.`,
      life: 2000
    })
  } catch (err) {
    console.error('Failed to create agency', err)
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Échec de la création de l\'agence.',
      life: 3000
    })
  } finally {
    creatingAgency.value = false
  }
}

const removeAgency = (agency: any) => {
  agencyToDelete.value = agency
  deletePassword.value = ''
  showDeleteModal.value = true
}

const executeDelete = async () => {
  if (!agencyToDelete.value) return
  deletingAgency.value = true
  try {
    await agenceApi.delete(agencyToDelete.value._id, deletePassword.value)
    guard.reset()
    agenciesList.value = agenciesList.value.filter(a => a._id !== agencyToDelete.value._id)

    // Sync settingApi
    const agencyNames = agenciesList.value.map(a => a.name)
    await settingApi.update({ agencies: agencyNames })

    toast.add({
      severity: 'success',
      summary: 'Agence Supprimée',
      detail: `"${agencyToDelete.value.name}" a été supprimée.`,
      life: 2000
    })
    showDeleteModal.value = false
  } catch (err) {
    console.error('Failed to delete agency', err)
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
      detail: 'Échec de la suppression de l\'agence.',
      life: 3000
    })
  } finally {
    deletingAgency.value = false
  }
}
</script>

<template>
  <div class="agence-view p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto space-y-8">
    
    <!-- 1. HEADER SECTION -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-5">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Building2 class="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 class="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900">
              Gestion <span class="text-indigo-600">des Agences</span>
            </h1>
            <p class="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              Réseau d'agences, carnets de numérotation & personnalisation des contrats
            </p>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-3">
        <Button 
          @click="openCreateModal" 
          class="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/25 flex items-center gap-2 active:scale-95 transition-all"
        >
          <Plus class="w-4 h-4 stroke-[3]" /> Nouvelle Agence
        </Button>
      </div>
    </div>

    <!-- 2. KPI METRICS CARDS -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Agences -->
      <div class="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Agences Actives</span>
          <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building2 class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-black text-slate-900 font-mono">
          {{ agenciesList.length }} <span class="text-xs font-bold text-slate-400">agences</span>
        </div>
        <div class="text-[10px] font-bold text-slate-500">
          Réseau d'exploitation principal
        </div>
      </div>

      <!-- Véhicules Réseau -->
      <div class="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Flotte du Réseau</span>
          <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CarFront class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-black text-slate-900 font-mono">
          {{ allCars.length }} <span class="text-xs font-bold text-slate-400">véhicules</span>
        </div>
        <div class="text-[10px] font-bold text-slate-500">
          Répartis sur toutes les agences
        </div>
      </div>

      <!-- Modèles Configurés -->
      <div class="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Modèles Personnalisés</span>
          <div class="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Palette class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-black text-slate-900 font-mono">
          {{ agenciesWithTemplateCount }} / {{ agenciesList.length }}
        </div>
        <div class="text-[10px] font-bold text-slate-500">
          Avec feuille de contrat téléversée
        </div>
      </div>

      <!-- Timbre Fiscal Actif -->
      <div class="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Timbre Fiscal</span>
          <div class="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Receipt class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-black text-slate-900 font-mono">
          {{ agenciesWithTimbreCount }} <span class="text-xs font-bold text-slate-400">actives</span>
        </div>
        <div class="text-[10px] font-bold text-slate-500">
          Agences soumises au timbre
        </div>
      </div>
    </div>

    <!-- 3. SEARCH & CONTROLS TOOLBAR -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
      <!-- Search Input -->
      <div class="relative flex-1 max-w-md">
        <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher une agence par nom..."
          class="w-full h-10 pl-10 pr-9 bg-slate-50 hover:bg-slate-100/60 focus:bg-white rounded-xl text-xs font-bold text-slate-900 outline-none border border-slate-200 focus:border-indigo-600 transition-all placeholder:text-slate-400"
        />
        <button 
          v-if="searchQuery" 
          @click="searchQuery = ''"
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Controls: Counter & View Switcher -->
      <div class="flex items-center gap-3 self-end sm:self-auto">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {{ filteredAgencies.length }} agence(s) trouvée(s)
        </span>

        <div class="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60">
          <button 
            type="button" 
            @click="viewMode = 'grid'" 
            :class="['p-1.5 rounded-lg transition-all', viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-700']"
            title="Affichage en Grille"
          >
            <LayoutGrid class="w-4 h-4" />
          </button>
          <button 
            type="button" 
            @click="viewMode = 'list'" 
            :class="['p-1.5 rounded-lg transition-all', viewMode === 'list' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-700']"
            title="Affichage en Liste"
          >
            <List class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- 4. MAIN AGENCIES LIST / GRID -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24 space-y-4">
      <div class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <p class="text-indigo-600 font-black uppercase tracking-[0.3em] text-xs">Chargement des Agences</p>
    </div>

    <div v-else-if="filteredAgencies.length > 0">
      
      <!-- GRID VIEW -->
      <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="agency in filteredAgencies"
          :key="agency._id"
          @click="router.push('/agences/' + agency._id)"
          class="group bg-white rounded-3xl border border-slate-200/80 hover:border-indigo-400 p-6 space-y-5 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
        >
          <!-- Top Row: Icon + Name + Delete -->
          <div class="space-y-4">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3.5">
                <div v-if="agency.templateImage" class="w-14 h-14 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200/80 shadow-xs shrink-0 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
                  <img :src="getImageUrl(agency.templateImage)" class="w-full h-full object-contain" :alt="agency.name" />
                </div>
                <div v-else class="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-105 transition-transform">
                  <Building2 class="w-7 h-7" />
                </div>
                <div>
                  <h3 class="text-base font-black uppercase tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {{ agency.name }}
                  </h3>
                  <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">
                    {{ agency.templateFields?.length || 0 }} champ(s) configuré(s)
                  </span>
                </div>
              </div>

              <!-- Delete Action for SuperAdmin -->
              <button 
                v-if="authStore.isSuperAdmin" 
                @click.stop="removeAgency(agency)" 
                class="w-8 h-8 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shrink-0"
                title="Supprimer l'agence"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>

            <!-- Badges Row -->
            <div class="flex flex-wrap items-center gap-1.5 pt-1">
              <Badge 
                v-if="agency.templateImage" 
                class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-black uppercase px-2 py-0.5 rounded-md"
              >
                Modèle Prêt
              </Badge>
              <Badge 
                v-else 
                class="bg-amber-50 text-amber-700 border border-amber-200 text-[8px] font-black uppercase px-2 py-0.5 rounded-md"
              >
                Sans Modèle
              </Badge>

              <Badge 
                :class="[
                  'text-[8px] font-black uppercase px-2 py-0.5 rounded-md border',
                  agency.applyTimbreExpense !== false 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                ]"
              >
                Timbre : {{ agency.applyTimbreExpense !== false ? 'Actif' : 'Non' }}
              </Badge>

              <Badge 
                v-if="agency.printBackground"
                class="bg-blue-50 text-blue-700 border border-blue-200 text-[8px] font-black uppercase px-2 py-0.5 rounded-md"
              >
                Fond Imprimé
              </Badge>
            </div>

            <!-- Quick Metrics Grid inside Card -->
            <div class="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[11px]">
              <div>
                <span class="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Véhicules</span>
                <span class="font-black text-slate-900 font-mono text-sm">
                  {{ getAgencyCarsCount(agency._id) }} <span class="text-[9px] font-bold text-slate-400 font-sans">autos</span>
                </span>
              </div>
              <div>
                <span class="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Carnet Actif</span>
                <span v-if="getAgencyActiveCarnet(agency._id)" class="font-black text-indigo-600 font-mono text-xs truncate block" :title="getAgencyActiveCarnet(agency._id).name">
                  N° {{ String(getAgencyActiveCarnet(agency._id).currentNumber).padStart(6, '0') }}
                </span>
                <span v-else class="font-bold text-slate-400 text-xs">
                  Aucun
                </span>
              </div>
            </div>
          </div>

          <!-- Bottom Card Action -->
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black uppercase tracking-wider text-indigo-600 group-hover:text-indigo-700">
            <span>Accéder au Profil</span>
            <div class="w-8 h-8 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 flex items-center justify-center transition-all">
              <ArrowRight class="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </div>

      <!-- LIST VIEW -->
      <div v-else class="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/60">
                <th class="py-3.5 px-6">Agence</th>
                <th class="py-3.5 px-4">Véhicules</th>
                <th class="py-3.5 px-4">Carnet Actif</th>
                <th class="py-3.5 px-4">Modèle Contrat</th>
                <th class="py-3.5 px-4">Timbre Fiscal</th>
                <th class="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr 
                v-for="agency in filteredAgencies"
                :key="agency._id"
                @click="router.push('/agences/' + agency._id)"
                class="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
              >
                <!-- Name & Thumbnail -->
                <td class="py-4 px-6">
                  <div class="flex items-center gap-3.5">
                    <div v-if="agency.templateImage" class="w-11 h-11 rounded-xl overflow-hidden bg-slate-50 border border-slate-200/80 shadow-2xs shrink-0 flex items-center justify-center p-0.5">
                      <img :src="getImageUrl(agency.templateImage)" class="w-full h-full object-contain" />
                    </div>
                    <div v-else class="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <Building2 class="w-5 h-5" />
                    </div>
                    <div>
                      <span class="font-black text-sm text-slate-900 uppercase block group-hover:text-indigo-600 transition-colors">
                        {{ agency.name }}
                      </span>
                      <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        {{ agency.templateFields?.length || 0 }} champ(s)
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Cars Count -->
                <td class="py-4 px-4 font-mono font-black text-sm text-slate-800">
                  {{ getAgencyCarsCount(agency._id) }} <span class="text-[10px] font-bold text-slate-400 font-sans">véhicules</span>
                </td>

                <!-- Active Carnet -->
                <td class="py-4 px-4">
                  <div v-if="getAgencyActiveCarnet(agency._id)">
                    <span class="font-mono font-black text-indigo-600 text-xs block">
                      N° {{ String(getAgencyActiveCarnet(agency._id).currentNumber).padStart(6, '0') }}
                    </span>
                    <span class="text-[9px] font-bold text-slate-400 uppercase truncate block">
                      {{ getAgencyActiveCarnet(agency._id).name }}
                    </span>
                  </div>
                  <span v-else class="text-slate-400 italic text-[11px]">Aucun</span>
                </td>

                <!-- Template Status -->
                <td class="py-4 px-4">
                  <Badge 
                    v-if="agency.templateImage" 
                    class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-black uppercase px-2 py-0.5 rounded-md"
                  >
                    Prêt ({{ agency.templateFields?.length || 0 }})
                  </Badge>
                  <Badge 
                    v-else 
                    class="bg-amber-50 text-amber-700 border border-amber-200 text-[8px] font-black uppercase px-2 py-0.5 rounded-md"
                  >
                    Vierge
                  </Badge>
                </td>

                <!-- Timbre Fiscal -->
                <td class="py-4 px-4">
                  <Badge 
                    :class="[
                      'text-[8px] font-black uppercase px-2 py-0.5 rounded-md border',
                      agency.applyTimbreExpense !== false 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    ]"
                  >
                    {{ agency.applyTimbreExpense !== false ? 'Actif' : 'Désactivé' }}
                  </Badge>
                </td>

                <!-- Actions -->
                <td class="py-4 px-6 text-right">
                  <div class="flex items-center justify-end gap-2" @click.stop>
                    <Button 
                      @click="router.push('/agences/' + agency._id)"
                      variant="outline"
                      size="sm"
                      class="h-9 px-3 rounded-xl border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5"
                    >
                      Consulter <ChevronRight class="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      v-if="authStore.isSuperAdmin" 
                      @click="removeAgency(agency)"
                      variant="ghost"
                      size="icon"
                      class="h-9 w-9 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                      title="Supprimer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- EMPTY STATE -->
    <div v-else class="text-center py-20 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white space-y-4">
      <div class="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
        <Building2 class="w-8 h-8 stroke-[1.8]" />
      </div>
      <div class="space-y-1">
        <p class="font-black uppercase tracking-wider text-sm text-slate-800">
          {{ searchQuery ? 'Aucune agence ne correspond à votre recherche' : 'Aucune agence configurée' }}
        </p>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
          {{ searchQuery ? `Aucun résultat pour « ${searchQuery} ». Vérifiez l'orthographe ou réinitialisez la recherche.` : 'Créez votre première agence pour associer des véhicules et gérer vos contrats.' }}
        </p>
      </div>
      <Button 
        v-if="searchQuery" 
        @click="searchQuery = ''" 
        variant="outline" 
        class="h-10 px-5 rounded-xl font-black uppercase text-[10px] tracking-wider"
      >
        Réinitialiser la Recherche
      </Button>
      <Button 
        v-else 
        @click="openCreateModal" 
        class="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md shadow-indigo-600/20"
      >
        <Plus class="w-4 h-4 mr-1.5" /> Créer une Agence
      </Button>
    </div>

    <!-- CREATE AGENCE MODAL -->
    <Dialog v-model:open="showCreateModal">
      <DialogContent class="sm:max-w-lg bg-white rounded-3xl p-0 overflow-hidden text-slate-900 border border-slate-200 shadow-2xl">
        <DialogHeader class="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white">
              <Building2 class="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-xl font-black uppercase tracking-tight text-white">
                Nouvelle Agence
              </DialogTitle>
              <DialogDescription class="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                Création et configuration du modèle de contrat
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="p-6 space-y-5">
          <div class="space-y-1.5">
            <Label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom de l'Agence</Label>
            <Input 
              v-model="newAgenceName" 
              placeholder="Ex : Agence Tunis Centre" 
              @keydown.enter="createAgence" 
              class="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-xs" 
            />
          </div>

          <div class="space-y-1.5">
            <Label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Image du Contrat (Feuille Pré-imprimée - Optionnel)
            </Label>
            <input ref="templateFileInput" type="file" accept="image/*" class="hidden" @change="handleTemplateUpload" />
            <div
              @click="triggerTemplateUpload"
              :class="['relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden p-4', newAgenceImage ? 'border-indigo-400 bg-indigo-50/20' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50']"
            >
              <div v-if="newAgenceImage" class="aspect-[16/9] relative rounded-xl overflow-hidden bg-white border border-slate-200">
                <img :src="getImageUrl(newAgenceImage)" class="w-full h-full object-contain" />
                <span class="absolute top-2 left-2 bg-indigo-600 text-white px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider shadow-sm">
                  Modèle Téléversé
                </span>
              </div>
              <div v-else class="h-32 flex flex-col items-center justify-center gap-2 text-center">
                <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <Upload class="w-5 h-5" />
                </div>
                <div>
                  <p class="text-[11px] font-black text-slate-700 uppercase tracking-wide">Cliquer pour charger le modèle</p>
                  <p class="text-[9px] text-slate-400">PNG, JPG — Vous pourrez également le configurer plus tard</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter class="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <Button variant="ghost" @click="showCreateModal = false" class="flex-1 h-12 font-black uppercase tracking-widest text-[10px] rounded-xl text-slate-400 hover:text-slate-900">
            Annuler
          </Button>
          <Button 
            @click="createAgence" 
            :disabled="creatingAgency || !newAgenceName.trim()" 
            class="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
          >
            <Loader2 v-if="creatingAgency" class="w-4 h-4 animate-spin mr-2" />
            {{ creatingAgency ? 'Création...' : 'Créer l\'Agence' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- DELETE AGENCE MODAL -->
    <PasswordConfirmDialog
      v-model:open="showDeleteModal"
      v-model:password="deletePassword"
      title="Supprimer"
      subtitle="l'Agence"
      :description="`${agencyToDelete?.name || ''} — Cette action est définitive et irréversible.`"
      placeholder="Mot de passe Super Admin..."
      confirm-label="Confirmer la Suppression"
      loading-label="Suppression..."
      :loading="deletingAgency"
      @confirm="executeDelete"
    />

  </div>
</template>

<style scoped>
.agence-view {
  font-family: 'Inter', sans-serif;
}
</style>
