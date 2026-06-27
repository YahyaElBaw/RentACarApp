<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { settingApi, carApi, clientApi } from '@/api/index'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth'
import { Car, Users, Calculator, RefreshCw, AlertTriangle, FileText, Wrench } from 'lucide-vue-next'
import { useToast } from 'primevue/usetoast'

const authStore = useAuthStore()
const toast = useToast()

const activeTab = ref('voitures')

const loading = ref(false)
const savingSettings = ref(false)

const appSettings = reactive({
  vidangeLimit: 10000,
  assuranceLimit: 12,
  visiteLimit: 6,
  tvaEnabled: false,
  tvaValue: 20,
  contractTaxEnabled: false,
  contractTaxValue: 0
})

const disabledCars = ref<any[]>([])
const disabledClients = ref<any[]>([])

const loadData = async () => {
  loading.value = true
  try {
    const [settingsRes, carsRes, clientsRes] = await Promise.all([
      settingApi.get(),
      carApi.getAll({ disabled: 'true' }),
      clientApi.getAll({ disabled: 'true' })
    ])
    
    if (settingsRes) {
      Object.assign(appSettings, settingsRes)
    }

    disabledCars.value = carsRes
    disabledClients.value = clientsRes
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
      summary: 'Configuration Mise à Jour',
      detail: 'Les paramètres ont été enregistrés avec succès.',
      life: 3000
    })
  } catch (err) {
    console.error('Failed to save settings', err)
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Échec de l\'enregistrement des paramètres.',
      life: 3000
    })
  } finally {
    savingSettings.value = false
  }
}

const restoreCar = async (id: string) => {
  const password = prompt("Veuillez saisir votre mot de passe administrateur pour restaurer ce véhicule :")
  if (!password) return
  
  try {
    await carApi.update(id, { disabled: false, password })
    await loadData()
    toast.add({ severity: 'success', summary: 'Véhicule Restauré', detail: 'Le véhicule est à nouveau disponible.', life: 3000 })
  } catch (err: any) {
    alert(err.response?.status === 401 ? "Mot de passe incorrect." : "Erreur lors de la restauration.")
  }
}

const restoreClient = async (id: string) => {
  try {
    await clientApi.update(id, { disabled: false, status: 'WHITE_LIST' })
    await loadData()
    toast.add({ severity: 'success', summary: 'Client Restauré', detail: 'Le client est à nouveau actif.', life: 3000 })
  } catch (err) {
    alert("Erreur lors de la restauration.")
  }
}
</script>

<template>
  <div class="settings-view p-8 lg:p-12 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500">
    <div class="space-y-2">
      <h1 class="text-4xl font-black uppercase tracking-tighter flex items-center gap-4">
        Paramètres <span class="text-indigo-600">Globaux</span>
      </h1>
      <p class="text-[10px] uppercase tracking-widest font-black opacity-60">Configuration et Maintenance du Système</p>
    </div>

    <!-- TABS -->
    <div class="flex gap-4 border-b border-slate-200/50 pb-4">
      <button 
        @click="activeTab = 'voitures'"
        :class="['px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3', activeTab === 'voitures' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-900 border border-slate-100']"
      >
        <Car class="w-4 h-4" /> Flotte & Véhicules
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
        <Calculator class="w-4 h-4" /> Comptabilité
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
            <CardDescription class="text-[10px] font-black uppercase tracking-widest text-indigo-600/60 mt-2">Définir les valeurs par défaut pour les alertes de vidange, assurance et visite technique.</CardDescription>
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
              <AlertTriangle class="w-5 h-5 text-rose-500" /> Véhicules Désactivés
            </CardTitle>
          </CardHeader>
          <CardContent class="p-0">
            <Table v-if="disabledCars.length > 0">
              <TableHeader>
                <TableRow class="bg-slate-50/50">
                  <TableHead class="pl-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Véhicule</TableHead>
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
            <div v-else class="p-12 text-center text-slate-400 font-black uppercase tracking-widest text-xs">Aucun véhicule désactivé.</div>
          </CardContent>
        </Card>
      </div>

      <!-- CLIENTS TAB -->
      <div v-if="activeTab === 'clients'" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
        <Card class="border border-slate-100 shadow-2xl shadow-rose-200/30 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader class="p-8 pb-4">
            <CardTitle class="text-xl font-black text-slate-900 uppercase flex items-center gap-3">
              <Users class="w-5 h-5 text-rose-500" /> Clients Désactivés
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
            <div v-else class="p-12 text-center text-slate-400 font-black uppercase tracking-widest text-xs">Aucun client désactivé.</div>
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
                    <p class="text-[10px] text-slate-500 font-bold">Ajouter des frais fixes d'édition de contrat.</p>
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
                Enregistrer la Comptabilité
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  </div>
</template>
<style scoped>
.settings-view {
  font-family: 'Inter', sans-serif;
}
</style>
