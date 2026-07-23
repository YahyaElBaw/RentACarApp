<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { settingApi, carApi, clientApi, agenceApi } from '@/api/index'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth'
import { Car, Users, Calculator, RefreshCw, AlertTriangle, FileText, Wrench, Building2, Trash2, Palette, Layout } from 'lucide-vue-next'
import { useToast } from 'primevue/usetoast'
import AgenceTemplateEditorModal from '@/components/AgenceTemplateEditorModal.vue'

const authStore = useAuthStore()
const toast = useToast()

const activeTab = ref('voitures')

const loading = ref(false)
const savingSettings = ref(false)
const savingAgency = ref(false)

const appSettings = reactive({
  vidangeLimit: 10000,
  assuranceLimit: 12,
  visiteLimit: 6,
  tvaEnabled: false,
  tvaValue: 20,
  contractTaxEnabled: false,
  contractTaxValue: 0,
})

const agenciesList = ref<any[]>([])
const newAgency = ref('')

const isEditorModalOpen = ref(false)
const selectedAgenceForModal = ref<any>(null)

const disabledCars = ref<any[]>([])
const disabledClients = ref<any[]>([])

const loadData = async () => {
  loading.value = true
  try {
    const [settingsRes, carsRes, clientsRes, agencesRes] = await Promise.allSettled([
      settingApi.get(),
      carApi.getAll({ disabled: 'true' }),
      clientApi.getAll({ disabled: 'true' }),
      agenceApi.getAll()
    ])
    
    if (settingsRes.status === 'fulfilled' && settingsRes.value) {
      Object.assign(appSettings, settingsRes.value)
    }

    agenciesList.value = agencesRes.status === 'fulfilled' ? (agencesRes.value || []) : []
    disabledCars.value = carsRes.status === 'fulfilled' ? (carsRes.value || []) : []
    disabledClients.value = clientsRes.status === 'fulfilled' ? (clientsRes.value || []) : []
  } catch (err) {
    console.error('Failed to load settings data', err)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

const saveSettings = async () => {
  try {
    savingSettings.value = true
    await settingApi.update(appSettings)
    toast.add({
      severity: 'success',
      summary: 'Configuration Mise a Jour',
      detail: 'Les parametres ont ete enregistres avec succes.',
      life: 3000
    })
  } catch (err) {
    console.error('Failed to save settings', err)
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Echec de l\'enregistrement des parametres.',
      life: 3000
    })
  } finally {
    savingSettings.value = false
  }
}

const addAgency = async () => {
  const name = newAgency.value.trim()
  if (!name || agenciesList.value.some(a => a.name?.toLowerCase() === name.toLowerCase())) return
  savingAgency.value = true
  try {
    const created = await agenceApi.create({ name })
    agenciesList.value.unshift(created)
    newAgency.value = ''
    
    // Also sync string list with settingApi for backward compatibility
    const agencyNames = agenciesList.value.map(a => a.name)
    await settingApi.update({ agencies: agencyNames })

    toast.add({
      severity: 'success',
      summary: 'Agence Ajoutee',
      detail: `"${name}" a ete ajoutee avec succes.`,
      life: 2000
    })
  } catch (err) {
    console.error('Failed to create agency', err)
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Echec de la creation de l\'agence.',
      life: 3000
    })
  } finally {
    savingAgency.value = false
  }
}

const removeAgency = async (agency: any) => {
  savingAgency.value = true
  try {
    await agenceApi.delete(agency._id)
    agenciesList.value = agenciesList.value.filter(a => a._id !== agency._id)

    // Sync settingApi
    const agencyNames = agenciesList.value.map(a => a.name)
    await settingApi.update({ agencies: agencyNames })

    toast.add({
      severity: 'success',
      summary: 'Agence Supprimee',
      detail: `"${agency.name}" a ete supprimee.`,
      life: 2000
    })
  } catch (err) {
    console.error('Failed to delete agency', err)
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Echec de la suppression de l\'agence.',
      life: 3000
    })
  } finally {
    savingAgency.value = false
  }
}

const customizeAgency = (agency: any) => {
  selectedAgenceForModal.value = agency
  isEditorModalOpen.value = true
}

const restoreCar = async (id: string) => {
  const password = prompt("Veuillez saisir votre mot de passe administrateur pour restaurer ce vehicule :")
  if (!password) return
  
  try {
    await carApi.update(id, { disabled: false, password })
    await loadData()
    toast.add({ severity: 'success', summary: 'Vehicule Restaure', detail: 'Le vehicule est a nouveau disponible.', life: 3000 })
  } catch (err: any) {
    alert(err.response?.status === 401 ? "Mot de passe incorrect." : "Erreur lors de la restauration.")
  }
}

const restoreClient = async (id: string) => {
  try {
    await clientApi.update(id, { disabled: false, status: 'WHITE_LIST' })
    await loadData()
    toast.add({ severity: 'success', summary: 'Client Restaure', detail: 'Le client est a nouveau actif.', life: 3000 })
  } catch (err) {
    alert("Erreur lors de la restauration.")
  }
}
</script>

<template>
  <div class="settings-view p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
    <div class="space-y-2">
      <h1 class="text-4xl font-black uppercase tracking-tighter flex items-center gap-4">
        Parametres <span class="text-indigo-600">Globaux</span>
      </h1>
      <p class="text-[10px] uppercase tracking-widest font-black opacity-60">Configuration et Maintenance du Systeme</p>
    </div>

    <!-- TABS -->
    <div class="flex gap-4 border-b border-slate-200/50 pb-4 flex-wrap">
      <button 
        @click="activeTab = 'voitures'"
        :class="['px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3', activeTab === 'voitures' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-900 border border-slate-100']"
      >
        <Car class="w-4 h-4" /> Flotte & Vehicules
      </button>
      <button 
        @click="activeTab = 'clients'"
        :class="['px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3', activeTab === 'clients' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-900 border border-slate-100']"
      >
        <Users class="w-4 h-4" /> Base Clients
      </button>
      <button 
        @click="activeTab = 'comptabilite'"
        :class="['px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3', activeTab === 'comptabilite' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-900 border border-slate-100']"
      >
        <Calculator class="w-4 h-4" /> Comptabilite
      </button>
      <button 
        @click="activeTab = 'agences'"
        :class="['px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3', activeTab === 'agences' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-900 border border-slate-100']"
      >
        <Building2 class="w-4 h-4" /> Agences
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else class="space-y-8">
      
      <!-- VOITURES TAB -->
      <div v-if="activeTab === 'voitures'" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
        <Card class="border-slate-100 shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader class="bg-indigo-50/50 p-8">
            <CardTitle class="text-xl font-black text-indigo-900 uppercase flex items-center gap-3">
              <Wrench class="w-5 h-5 text-indigo-600" /> Seuils d'Alertes Maintenance
            </CardTitle>
            <CardDescription class="text-[10px] font-black uppercase tracking-widest text-indigo-600/60 mt-2">Definir les valeurs par defaut pour les alertes de vidange, assurance et visite technique.</CardDescription>
          </CardHeader>
          <CardContent class="p-8">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div class="space-y-3">
                <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vidange (+ KM)</Label>
                <div class="relative">
                  <Input type="number" v-model="appSettings.vidangeLimit" class="h-14 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-2xl font-black text-slate-900 pr-12" />
                  <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest">KM</span>
                </div>
              </div>
              <div class="space-y-3">
                <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assurance (+ Mois)</Label>
                <div class="relative">
                  <Input type="number" v-model="appSettings.assuranceLimit" class="h-14 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-2xl font-black text-slate-900 pr-16" />
                  <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest">MOIS</span>
                </div>
              </div>
              <div class="space-y-3">
                <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visite Technique (+ Mois)</Label>
                <div class="relative">
                  <Input type="number" v-model="appSettings.visiteLimit" class="h-14 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-2xl font-black text-slate-900 pr-16" />
                  <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest">MOIS</span>
                </div>
              </div>
            </div>
            <div class="mt-8 flex justify-end">
              <Button @click="saveSettings" :disabled="savingSettings" class="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-600/20">
                <span v-if="savingSettings" class="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Sauvegarder les Seuils
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card class="border border-slate-100 shadow-2xl shadow-rose-200/30 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader class="p-8 pb-4">
            <CardTitle class="text-xl font-black text-slate-900 uppercase flex items-center gap-3">
              <AlertTriangle class="w-5 h-5 text-rose-500" /> Vehicules Desactives
            </CardTitle>
          </CardHeader>
          <CardContent class="p-0">
            <Table v-if="disabledCars.length > 0">
              <TableHeader>
                <TableRow class="bg-slate-50/50">
                  <TableHead class="pl-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Vehicule</TableHead>
                  <TableHead class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Matricule</TableHead>
                  <TableHead class="text-right pr-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="car in disabledCars" :key="car._id">
                  <TableCell class="pl-8 font-black uppercase text-sm">{{ car.brand }} {{ car.model }}</TableCell>
                  <TableCell class="font-bold text-slate-500">{{ car.registrationNumber }}</TableCell>
                  <TableCell class="pr-8 text-right">
                    <Button @click="restoreCar(car._id)" variant="outline" class="h-8 px-4 rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-[10px] font-black uppercase tracking-widest">
                      <RefreshCw class="w-3 h-3 mr-2" /> Restaurer
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div v-else class="p-12 text-center text-slate-400 font-black uppercase tracking-widest text-xs">Aucun vehicule desactive.</div>
          </CardContent>
        </Card>
      </div>

      <!-- CLIENTS TAB -->
      <div v-if="activeTab === 'clients'" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
        <Card class="border border-slate-100 shadow-2xl shadow-rose-200/30 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader class="p-8 pb-4">
            <CardTitle class="text-xl font-black text-slate-900 uppercase flex items-center gap-3">
              <Users class="w-5 h-5 text-rose-500" /> Clients Desactives
            </CardTitle>
          </CardHeader>
          <CardContent class="p-0">
            <Table v-if="disabledClients.length > 0">
              <TableHeader>
                <TableRow class="bg-slate-50/50">
                  <TableHead class="pl-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Client</TableHead>
                  <TableHead class="text-[9px] font-black text-slate-400 uppercase tracking-widest">CIN</TableHead>
                  <TableHead class="text-right pr-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="client in disabledClients" :key="client._id">
                  <TableCell class="pl-8 font-black uppercase text-sm">{{ client.firstName }} {{ client.lastName }}</TableCell>
                  <TableCell class="font-bold text-slate-500">{{ client.cin }}</TableCell>
                  <TableCell class="pr-8 text-right">
                    <Button @click="restoreClient(client._id)" variant="outline" class="h-8 px-4 rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-[10px] font-black uppercase tracking-widest">
                      <RefreshCw class="w-3 h-3 mr-2" /> Restaurer
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div v-else class="p-12 text-center text-slate-400 font-black uppercase tracking-widest text-xs">Aucun client desactive.</div>
          </CardContent>
        </Card>
      </div>

      <!-- COMPTABILITE TAB -->
      <div v-if="activeTab === 'comptabilite'" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
        <Card class="border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader class="bg-slate-50/50 p-8">
            <CardTitle class="text-xl font-black text-slate-900 uppercase flex items-center gap-3">
              <FileText class="w-5 h-5 text-indigo-600" /> Taxes & Frais Additionnels
            </CardTitle>
          </CardHeader>
          <CardContent class="p-8">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div class="space-y-6">
                <div class="flex items-center justify-between">
                  <div class="space-y-1">
                    <Label class="text-xs font-black uppercase tracking-widest text-slate-900">Activer la TVA</Label>
                    <p class="text-[10px] text-slate-500 font-bold">Appliquer la TVA sur les factures et contrats.</p>
                  </div>
                  <button 
                    @click="appSettings.tvaEnabled = !appSettings.tvaEnabled"
                    :class="['w-14 h-8 rounded-full transition-colors relative flex items-center', appSettings.tvaEnabled ? 'bg-indigo-600' : 'bg-slate-200']"
                  >
                    <div :class="['w-6 h-6 bg-white rounded-full transition-transform absolute shadow-sm', appSettings.tvaEnabled ? 'translate-x-7' : 'translate-x-1']"></div>
                  </button>
                </div>
                <div v-if="appSettings.tvaEnabled" class="space-y-3 animate-in fade-in duration-300">
                  <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valeur TVA (%)</Label>
                  <Input type="number" v-model="appSettings.tvaValue" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black text-slate-900" />
                </div>
              </div>
              
              <div class="space-y-6">
                <div class="flex items-center justify-between">
                  <div class="space-y-1">
                    <Label class="text-xs font-black uppercase tracking-widest text-slate-900">Frais de Contrat (Timbre)</Label>
                    <p class="text-[10px] text-slate-500 font-bold">Ajouter des frais fixes d'edition de contrat.</p>
                  </div>
                  <button 
                    @click="appSettings.contractTaxEnabled = !appSettings.contractTaxEnabled"
                    :class="['w-14 h-8 rounded-full transition-colors relative flex items-center', appSettings.contractTaxEnabled ? 'bg-indigo-600' : 'bg-slate-200']"
                  >
                    <div :class="['w-6 h-6 bg-white rounded-full transition-transform absolute shadow-sm', appSettings.contractTaxEnabled ? 'translate-x-7' : 'translate-x-1']"></div>
                  </button>
                </div>
                <div v-if="appSettings.contractTaxEnabled" class="space-y-3 animate-in fade-in duration-300">
                  <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant (TND)</Label>
                  <Input type="number" v-model="appSettings.contractTaxValue" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black text-slate-900" />
                </div>
              </div>
            </div>
            
            <div class="mt-12 flex justify-end border-t border-slate-100 pt-8">
              <Button @click="saveSettings" :disabled="savingSettings" class="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-600/20">
                <span v-if="savingSettings" class="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Enregistrer la Comptabilite
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- AGENCES TAB -->
      <div v-if="activeTab === 'agences'" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
        <Card class="border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader class="bg-indigo-50/50 p-8">
            <CardTitle class="text-xl font-black text-indigo-900 uppercase flex items-center gap-3">
              <Building2 class="w-5 h-5 text-indigo-600" /> Gestion des Agences
            </CardTitle>
            <CardDescription class="text-[10px] font-black uppercase tracking-widest text-indigo-600/60 mt-2">Gerer la liste des agences disponibles lors de la creation d'un contrat. Les modifications sont sauvegardees automatiquement.</CardDescription>
          </CardHeader>
          <CardContent class="p-8">
            <div class="flex gap-3 mb-8">
              <Input v-model="newAgency" @keydown.enter="addAgency" placeholder="Nom de l'agence..." class="h-14 flex-1 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-2xl font-bold text-slate-900 text-sm" />
              <Button @click="addAgency" :disabled="!newAgency.trim() || savingAgency" class="h-14 px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-600/20 disabled:opacity-40">
                <span v-if="savingAgency" class="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Ajouter
              </Button>
            </div>

            <div v-if="agenciesList.length > 0" class="space-y-3">
              <div v-for="agency in agenciesList" :key="agency._id" class="flex items-center justify-between bg-slate-50/80 hover:bg-slate-100 rounded-2xl px-6 py-4 transition-all group border border-slate-100">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Building2 class="w-5 h-5" />
                  </div>
                  <div>
                    <span class="font-black text-sm text-slate-800 uppercase tracking-wide block">{{ agency.name }}</span>
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {{ agency.templateFields?.length || 0 }} champ(s) configuré(s)
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <button @click="customizeAgency(agency)" class="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border border-indigo-200/60 shadow-sm transition-all">
                    <Palette class="w-3.5 h-3.5" /> Personnaliser Contrat
                  </button>
                  <button @click="removeAgency(agency)" :disabled="savingAgency" class="flex items-center gap-2 text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl hover:bg-rose-50">
                    <Trash2 class="w-3.5 h-3.5" /> Supprimer
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="text-center py-16 border-2 border-dashed border-slate-200 rounded-[2rem]">
              <Building2 class="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p class="text-slate-400 font-black uppercase tracking-widest text-xs">Aucune agence configuree</p>
              <p class="text-slate-300 font-bold text-[10px] mt-2">Ajoutez votre premiere agence ci-dessus</p>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>

    <!-- AGENCE TEMPLATE EDITOR MODAL -->
    <AgenceTemplateEditorModal 
      v-model:open="isEditorModalOpen"
      :agence="selectedAgenceForModal"
      @saved="loadData"
    />
  </div>
</template>
<style scoped>
.settings-view {
  font-family: 'Inter', sans-serif;
}
</style>
