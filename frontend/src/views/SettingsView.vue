<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { settingApi, carApi, clientApi, userApi } from '@/api/index'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth'
import { Car, Users, Calculator, RefreshCw, AlertTriangle, FileText, Wrench, KeyRound, UserCircle2, Eye, EyeOff, Loader2, Gauge, Tags, X, Plus, Route } from 'lucide-vue-next'
import { useToast } from 'primevue/usetoast'

const authStore = useAuthStore()
const toast = useToast()

const activeTab = ref('compte')

const loading = ref(false)
const savingSettings = ref(false)
const savingProfile = ref(false)
const savingPassword = ref(false)

const profileForm = reactive({
  firstName: '',
  lastName: '',
  cin: '',
  phone: '',
})

const pwdForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const showPwd = reactive({
  current: false,
  new: false,
  confirm: false,
})

const appSettings = reactive({
  vidangeLimit: 10000,
  assuranceLimit: 12,
  visiteLimit: 6,
  speedAlertLimit: 130,
kmPerDayLimit: 200,
  tvaEnabled: false,
  tvaValue: 20,
  contractTaxEnabled: false,
  contractTaxValue: 0,
  depenseCategories: [] as string[],
})

const newCategoryLabel = ref('')

const addDepenseCategory = () => {
  const label = newCategoryLabel.value.trim()
  if (!label) return
  const exists = appSettings.depenseCategories.some(
    (c) => c.toLowerCase() === label.toLowerCase()
  )
  if (exists) {
    toast.add({ severity: 'warn', summary: 'Doublon', detail: 'Cette categorie existe deja.', life: 3000 })
    return
  }
  appSettings.depenseCategories.push(label)
  newCategoryLabel.value = ''
}

const removeDepenseCategory = (index: number) => {
  if (appSettings.depenseCategories.length <= 1) {
    toast.add({ severity: 'warn', summary: 'Impossible', detail: 'Au moins une categorie est requise.', life: 3000 })
    return
  }
  appSettings.depenseCategories.splice(index, 1)
}

const disabledCars = ref<any[]>([])
const disabledClients = ref<any[]>([])

const loadData = async () => {
  loading.value = true
  try {
    const [settingsRes, carsRes, clientsRes, profileRes] = await Promise.allSettled([
      settingApi.get(),
      carApi.getAll({ disabled: 'true' }),
      clientApi.getAll({ disabled: 'true' }),
      userApi.profile()
    ])
    
    if (settingsRes.status === 'fulfilled' && settingsRes.value) {
      Object.assign(appSettings, settingsRes.value)
    }

    disabledCars.value = carsRes.status === 'fulfilled' ? (carsRes.value || []) : []
    disabledClients.value = clientsRes.status === 'fulfilled' ? (clientsRes.value || []) : []

    if (profileRes.status === 'fulfilled' && profileRes.value) {
      profileForm.firstName = profileRes.value.firstName || ''
      profileForm.lastName = profileRes.value.lastName || ''
      profileForm.cin = profileRes.value.cin || ''
      profileForm.phone = profileRes.value.phone || ''
    }
  } catch (err) {
    console.error('Failed to load settings data', err)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

const saveProfile = async () => {
  savingProfile.value = true
  try {
    const updated = await userApi.updateProfile({
      firstName: profileForm.firstName,
      lastName: profileForm.lastName,
      phone: profileForm.phone,
    })
    profileForm.cin = updated?.cin || profileForm.cin
    toast.add({
      severity: 'success',
      summary: 'Profil Mis a Jour',
      detail: 'Vos informations personnelles ont ete enregistrees.',
      life: 3000
    })
  } catch (err: any) {
    const msg = err?.response?.data?.message || "Erreur lors de la mise a jour du profil."
    toast.add({ severity: 'error', summary: 'Erreur', detail: msg, life: 4000 })
  } finally {
    savingProfile.value = false
  }
}

const savePassword = async () => {
  if (!pwdForm.currentPassword || !pwdForm.newPassword) {
    toast.add({ severity: 'warn', summary: 'Champs Requis', detail: 'Saisissez votre mot de passe actuel et le nouveau.', life: 3000 })
    return
  }
  if (pwdForm.newPassword !== pwdForm.confirmPassword) {
    toast.add({ severity: 'warn', summary: 'Confirmation', detail: 'Le nouveau mot de passe et sa confirmation ne correspondent pas.', life: 3000 })
    return
  }
  savingPassword.value = true
  try {
    await userApi.changePassword({
      currentPassword: pwdForm.currentPassword,
      newPassword: pwdForm.newPassword,
    })
    pwdForm.currentPassword = ''
    pwdForm.newPassword = ''
    pwdForm.confirmPassword = ''
    toast.add({
      severity: 'success',
      summary: 'Mot de passe Modifie',
      detail: 'Votre mot de passe a ete change avec succes.',
      life: 3000
    })
  } catch (err: any) {
    const msg = err?.response?.data?.message || "Erreur lors du changement de mot de passe."
    toast.add({ severity: 'error', summary: 'Erreur', detail: msg, life: 4000 })
  } finally {
    savingPassword.value = false
  }
}

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
        @click="activeTab = 'compte'"
        :class="['px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3', activeTab === 'compte' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-900 border border-slate-100']"
      >
        <KeyRound class="w-4 h-4" /> Mon Compte
      </button>
      <template v-if="authStore.isAdmin">
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
      </template>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else class="space-y-8">
      
      <!-- COMPTE TAB (all users) -->
      <div v-if="activeTab === 'compte'" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
        <Card class="border-slate-100 shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader class="bg-indigo-50/50 p-8">
            <CardTitle class="text-xl font-black text-indigo-900 uppercase flex items-center gap-3">
              <UserCircle2 class="w-5 h-5 text-indigo-600" /> Mon Profil
            </CardTitle>
            <CardDescription class="text-[10px] font-black uppercase tracking-widest text-indigo-600/60 mt-2">Vos informations personnelles et votre identifiant de connexion.</CardDescription>
          </CardHeader>
          <CardContent class="p-8">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="space-y-3">
                <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prénom</Label>
                <Input v-model="profileForm.firstName" class="h-14 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-2xl font-black text-slate-900" />
              </div>
              <div class="space-y-3">
                <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom</Label>
                <Input v-model="profileForm.lastName" class="h-14 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-2xl font-black text-slate-900" />
              </div>
              <div class="space-y-3">
                <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">UID / CIN (Identifiant)</Label>
                <Input v-model="profileForm.cin" disabled class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black font-mono tracking-widest text-slate-400 uppercase opacity-70 cursor-not-allowed" />
              </div>
              <div class="space-y-3">
                <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Téléphone</Label>
                <Input v-model="profileForm.phone" class="h-14 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-2xl font-black text-slate-900" />
              </div>
            </div>
            <div class="mt-8 flex justify-end">
              <Button @click="saveProfile" :disabled="savingProfile" class="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-indigo-600/20">
                <span v-if="savingProfile" class="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Enregistrer le Profil
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card class="border border-slate-100 shadow-2xl shadow-amber-200/30 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader class="bg-amber-50/50 p-8">
            <CardTitle class="text-xl font-black text-amber-900 uppercase flex items-center gap-3">
              <KeyRound class="w-5 h-5 text-amber-500" /> Changer le Mot de Passe
            </CardTitle>
            <CardDescription class="text-[10px] font-black uppercase tracking-widest text-amber-600/60 mt-2">Mettez a jour votre mot de passe de connexion.</CardDescription>
          </CardHeader>
          <CardContent class="p-8">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div class="space-y-3">
                <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mot de passe actuel</Label>
                <div class="relative">
                  <Input :type="showPwd.current ? 'text' : 'password'" v-model="pwdForm.currentPassword" placeholder="••••••••" class="h-14 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-amber-500/5 rounded-2xl font-black pr-12" />
                  <button type="button" @click="showPwd.current = !showPwd.current" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-600 transition-colors">
                    <EyeOff v-if="showPwd.current" class="w-5 h-5" />
                    <Eye v-else class="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div class="space-y-3">
                <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nouveau mot de passe</Label>
                <div class="relative">
                  <Input :type="showPwd.new ? 'text' : 'password'" v-model="pwdForm.newPassword" placeholder="••••••••" class="h-14 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-amber-500/5 rounded-2xl font-black pr-12" />
                  <button type="button" @click="showPwd.new = !showPwd.new" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-600 transition-colors">
                    <EyeOff v-if="showPwd.new" class="w-5 h-5" />
                    <Eye v-else class="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div class="space-y-3">
                <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirmer le nouveau</Label>
                <div class="relative">
                  <Input :type="showPwd.confirm ? 'text' : 'password'" v-model="pwdForm.confirmPassword" placeholder="••••••••" class="h-14 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-amber-500/5 rounded-2xl font-black pr-12" />
                  <button type="button" @click="showPwd.confirm = !showPwd.confirm" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-600 transition-colors">
                    <EyeOff v-if="showPwd.confirm" class="w-5 h-5" />
                    <Eye v-else class="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            <div class="mt-8 flex justify-end">
              <Button @click="savePassword" :disabled="savingPassword" class="h-12 px-8 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-amber-500/20">
                <Loader2 v-if="savingPassword" class="w-4 h-4 animate-spin mr-2" />
                Modifier le Mot de Passe
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- VOITURES TAB -->
      <div v-if="authStore.isAdmin && activeTab === 'voitures'" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
        <Card class="border-slate-100 shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader class="bg-indigo-50/50 p-8">
            <CardTitle class="text-xl font-black text-indigo-900 uppercase flex items-center gap-3">
              <Wrench class="w-5 h-5 text-indigo-600" /> Seuils d'Alertes Maintenance
            </CardTitle>
            <CardDescription class="text-[10px] font-black uppercase tracking-widest text-indigo-600/60 mt-2">Definir les valeurs par defaut pour les alertes de vidange, assurance et visite technique.</CardDescription>
          </CardHeader>
          <CardContent class="p-8">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
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
              <div class="space-y-3">
                <Label class="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Gauge class="w-3.5 h-3.5" /> Limite de Vitesse
                </Label>
                <div class="relative">
                  <Input type="number" step="any" min="1" v-model.number="appSettings.speedAlertLimit" class="h-14 bg-rose-50/40 border-rose-100 focus:ring-4 focus:ring-rose-500/5 rounded-2xl font-black text-slate-900 pr-14" />
                  <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-400 uppercase tracking-widest">KM/H</span>
                </div>
                <p class="text-[9px] font-bold text-slate-400 italic">Alerte GPS dès que ce seuil est dépassé.</p>
              </div>
              <div class="space-y-3">
                <Label class="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Route class="w-3.5 h-3.5" /> Kilometrage Max / Jour
                </Label>
                <div class="relative">
                  <Input type="number" step="any" min="1" v-model.number="appSettings.kmPerDayLimit" class="h-14 bg-indigo-50/40 border-indigo-100 focus:ring-4 focus:ring-indigo-600/5 rounded-2xl font-black text-slate-900 pr-12" />
                  <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">KM</span>
                </div>
                <p class="text-[9px] font-bold text-slate-400 italic">Alerte GPS si une voiture louee depasse ce kilometrage en une journee.</p>
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
      <div v-if="authStore.isAdmin && activeTab === 'clients'" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
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
      <div v-if="authStore.isAdmin && activeTab === 'comptabilite'" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
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

        <!-- DEPENSE CATEGORIES -->
        <Card class="border border-slate-100 shadow-2xl shadow-rose-200/30 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader class="bg-slate-50/50 p-8">
            <CardTitle class="text-xl font-black text-slate-900 uppercase flex items-center gap-3">
              <Tags class="w-5 h-5 text-rose-500" /> Categories de Depense
            </CardTitle>
          </CardHeader>
          <CardContent class="p-8 space-y-6">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Utilisees dans le formulaire et les filtres des depenses.</p>
            <div class="flex flex-wrap gap-3">
              <div v-for="(cat, index) in appSettings.depenseCategories" :key="cat" class="group flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-2 py-2">
                <span class="text-xs font-black text-slate-700 uppercase tracking-wide">{{ cat }}</span>
                <button v-if="authStore.isSuperAdmin" @click="removeDepenseCategory(index)" class="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all" title="Supprimer">
                  <X class="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
              <span v-if="appSettings.depenseCategories.length === 0" class="text-[10px] font-black text-slate-300 uppercase tracking-widest py-2">Aucune categorie</span>
            </div>
            <div class="flex gap-3 max-w-lg">
              <Input
                v-model="newCategoryLabel"
                placeholder="Nouvelle categorie..."
                class="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold"
                @keyup.enter="addDepenseCategory"
              />
              <Button @click="addDepenseCategory" variant="outline" class="h-12 px-5 rounded-xl border-slate-200 hover:border-rose-300 hover:text-rose-600 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">
                <Plus class="w-4 h-4 mr-1" /> Ajouter
              </Button>
            </div>
            <div class="flex justify-end border-t border-slate-100 pt-6">
              <Button @click="saveSettings" :disabled="savingSettings" class="h-12 px-8 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-rose-600/20">
                <span v-if="savingSettings" class="mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Enregistrer les Categories
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
