<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api, { getImageUrl } from '@/api'
import { 
  UserPlus, Search, Pencil, 
  Phone, Mail, MapPin, User,
  CreditCard, Shield, Upload,
  ArrowRight, ArrowLeft, Check, X,
  Trash2, Eye, EyeOff, ChevronLeft, ChevronRight
} from 'lucide-vue-next'
import { 
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Avatar, AvatarFallback 
} from '@/components/ui/avatar'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const router = useRouter()
const authStore = useAuthStore()
const clients = ref<any[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingClient = ref<any>(null)

const filters = reactive({
  query: ''
})

const currentPage = ref(1)
const pageSize = 10

const currentStep = ref(1)
const isUploading = ref<Record<string, boolean>>({})
const showSecurityModal = ref(false)
const adminPassword = ref('')
const showPassword = ref(false)
const clientToDelete = ref<string | null>(null)
const pendingEdit = ref(false)
const submitting = ref(false)

interface ClientForm {
  firstName: string;
  lastName: string;
  birthday: string;
  lieuNaissance: string;
  cin: string;
  phone: string;
  phoneCountryCode: string;
  email: string;
  address: string;
  drivingLicense: string;
  lieuPermis: string;
  nationality: string;
  cinDate: string;
  licenseDate: string;
  status: string;
  description: string;
  cinFront: string;
  cinBack: string;
  licenseFront: string;
  licenseBack: string;
  idCardType: string;
}

const clientForm = reactive<ClientForm>({
  firstName: '',
  lastName: '',
  birthday: '',
  lieuNaissance: '',
  cin: '',
  phone: '',
  phoneCountryCode: '+216',
  email: '',
  address: '',
  drivingLicense: '',
  lieuPermis: '',
  nationality: '',
  cinDate: '',
  licenseDate: '',
  status: 'WHITE_LIST',
  description: '',
  cinFront: '',
  cinBack: '',
  licenseFront: '',
  licenseBack: '',
  idCardType: 'cin'
})

const loadClients = async () => {
  loading.value = true
  try {
    const res = await api.get('/clients', { params: { search: filters.query } })
    clients.value = res.data
  } catch (err) {
    console.error('Failed to load clients', err)
  } finally {
    loading.value = false
  }
}

onMounted(loadClients)
watch(() => filters.query, () => { currentPage.value = 1; loadClients() })

const openAddModal = () => {
  editingClient.value = null
  currentStep.value = 1
  Object.assign(clientForm, {
    firstName: '',
    lastName: '',
    birthday: '',
    lieuNaissance: '',
    cin: '',
    phone: '',
    phoneCountryCode: '+216',
    email: '',
    address: '',
    drivingLicense: '',
    lieuPermis: '',
    nationality: '',
    cinDate: '',
    licenseDate: '',
    status: 'WHITE_LIST',
    description: '',
    cinFront: '',
    cinBack: '',
    licenseFront: '',
    licenseBack: '',
    idCardType: 'cin'
  })
  showForm.value = true
}

const editClient = (client: any) => {
  editingClient.value = client
  currentStep.value = 1
  const clientData = { ...client }
  if (clientData.cinDate) clientData.cinDate = new Date(clientData.cinDate).toISOString().split('T')[0]
  if (clientData.licenseDate) clientData.licenseDate = new Date(clientData.licenseDate).toISOString().split('T')[0]
  if (clientData.birthday) clientData.birthday = new Date(clientData.birthday).toISOString().split('T')[0]
  clientData.idCardType = client.idCardType || 'cin'
  Object.assign(clientForm, clientData)
  showForm.value = true
}

const saveClient = async () => {
  if (editingClient.value) {
    pendingEdit.value = true
    adminPassword.value = ''
    showSecurityModal.value = true
    return
  }
  try {
    const payload: any = { ...clientForm }
    if (!payload.cinDate) delete payload.cinDate
    if (!payload.licenseDate) delete payload.licenseDate
    if (!payload.birthday) delete payload.birthday

    await api.post('/clients', payload)
    showForm.value = false
    loadClients()
  } catch (err) {
    console.error(err)
  }
}

const nextStep = () => {
  if (currentStep.value < 3) currentStep.value++
}

const prevStep = () => {
  if (currentStep.value > 1) currentStep.value--
}

const handleFileUpload = async (event: Event, field: keyof ClientForm) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const formData = new FormData()
  formData.append('file', file)

  isUploading.value[field] = true
  try {
    const res = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    clientForm[field] = res.data.url
  } catch (err) {
    console.error('Upload failed', err)
  } finally {
    isUploading.value[field] = false
  }
}

const removeFile = (field: keyof ClientForm) => {
  clientForm[field] = ''
}

const viewDetail = (id: string) => {
   router.push(`/clients/${id}`)
}

const deleteClient = (id: string) => {
  clientToDelete.value = id
  adminPassword.value = ''
  showSecurityModal.value = true
}

const executeDelete = async () => {
  if (!adminPassword.value) return
  submitting.value = true
  try {
    if (pendingEdit.value) {
      const payload: any = { ...clientForm, password: adminPassword.value }
      if (!payload.cinDate) delete payload.cinDate
      if (!payload.licenseDate) delete payload.licenseDate
      if (!payload.birthday) delete payload.birthday
      await api.patch(`/clients/${editingClient.value._id}`, payload)
      pendingEdit.value = false
    } else {
      await api.delete(`/clients/${clientToDelete.value}`, {
        data: { password: adminPassword.value }
      })
    }
    showSecurityModal.value = false
    showForm.value = false
    loadClients()
  } catch (err: any) {
    console.error(err)
    if (err.response?.status === 401) alert("Mot de passe incorrect.")
    else alert("Erreur lors de l'opération.")
  } finally {
    submitting.value = false
  }
}

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
}

const sortedClients = computed(() => {
  return [...clients.value];
});

const totalClientPages = computed(() => Math.ceil(sortedClients.value.length / pageSize))
const paginatedClients = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return sortedClients.value.slice(start, start + pageSize)
})

const isStepValid = computed(() => {
  if (currentStep.value === 1) {
    return !!(clientForm.firstName && clientForm.lastName && clientForm.phone);
  }
  if (currentStep.value === 2) {
    return !!(clientForm.cin && clientForm.drivingLicense);
  }
  return true;
});
</script><template>
  <div class="client-list-container space-y-12 p-8 max-w-7xl mx-auto">
    <!-- Header & Integrated Action Bar -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
      <div class="space-y-2">
        <h1 class="text-4xl font-black tracking-tight text-slate-900 uppercase">Portefeuille <span class="text-indigo-600">Clients</span></h1>
        <p class="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] pl-1">Base de Données Locataires & Dossiers</p>
      </div>

      <div class="flex wrap items-center gap-4">
        <div class="relative w-full md:w-80 group">
          <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search class="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          </div>
          <Input 
            v-model="filters.query" 
            placeholder="Nom, CIN ou Téléphone..." 
            class="h-14 pl-12 bg-white/50 border-slate-200 backdrop-blur-xl focus:ring-4 focus:ring-indigo-600/5 rounded-2xl font-bold transition-all text-slate-900"
          />
        </div>

        <Button @click="openAddModal" class="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-2xl shadow-indigo-200 transition-all active:scale-95 flex items-center gap-3">
          <UserPlus class="w-5 h-5 stroke-[3]" />
          <span class="uppercase tracking-widest text-[10px]">Nouveau Client</span>
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
                <TableHead class="pl-10 py-6 text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">LOCATAIRE</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">IDENTITÉ / CIN</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">CONTACT & CANAUX</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">ADRESSE</TableHead>
                <TableHead v-if="authStore.isAdmin" class="pr-10 text-right text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow 
                v-for="client in paginatedClients" 
                :key="client._id"
                @click="viewDetail(client._id)"
                :class="[
                  'group border-slate-100 transition-all duration-500 cursor-pointer hover:bg-indigo-50/40 relative active:scale-[0.998]'
                ]"
              >
                <TableCell class="pl-10 py-7">
                  <div class="flex items-center gap-4">
                    <div class="relative">
                      <Avatar class="w-12 h-12 border-2 border-white shadow-xl group-hover:border-indigo-200 :border-indigo-400 transition-all duration-500">
                        <AvatarFallback class="bg-indigo-50 text-indigo-600 font-black text-[10px] uppercase">
                          {{ getInitials(client.firstName, client.lastName) }}
                        </AvatarFallback>
                      </Avatar>
                      <div 
                        v-if="!client.disabled"
                        :class="[ 'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white shadow-sm', client.status === 'WHITE_LIST' ? 'bg-emerald-500' : client.status === 'BLACK_LIST' ? 'bg-amber-500' : 'bg-rose-500' ]"
                      ></div>
                    </div>
                    <div class="flex flex-col gap-0.5">
                      <span class="font-black text-slate-900 group-hover:text-indigo-600 :text-indigo-400 transition-colors tracking-tight text-base uppercase">{{ client.lastName }} {{ client.firstName }}</span>
                      <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Client #{{ client._id.slice(-6).toUpperCase() }}</span>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div class="flex flex-col gap-1.5">
                    <div class="flex items-center gap-2">
                       <CreditCard class="w-3.5 h-3.5 text-slate-300" />
                       <span class="text-[11px] font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md tabular-nums tracking-widest">{{ client.cin }}</span>
                    </div>
                    <div class="flex items-center gap-2 pl-0.5">
                       <Shield class="w-3 h-3 text-indigo-400/50" />
                       <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter tabular-nums">PERMIS: {{ client.drivingLicense || 'N/A' }}</span>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                   <div class="flex flex-col gap-1.5">
                      <div class="flex items-center gap-2">
                        <Phone class="w-3.5 h-3.5 text-indigo-400" />
                        <span class="text-sm font-black text-slate-900 tabular-nums">{{ client.phone }}</span>
                      </div>
                      <div v-if="client.email" class="flex items-center gap-2 pl-0.5">
                        <Mail class="w-3 h-3 text-slate-300" />
                        <span class="text-[10px] font-bold text-slate-400 italic lowercase">{{ client.email }}</span>
                      </div>
                   </div>
                </TableCell>

                <TableCell>
                  <div class="flex items-center gap-2 max-w-[180px]">
                    <MapPin class="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    <span class="text-[11px] font-bold text-slate-500 leading-tight">{{ client.address || 'Non spécifiée' }}</span>
                  </div>
                </TableCell>



                <TableCell v-if="authStore.isAdmin" class="pr-10 text-right">
                  <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 duration-500">
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      @click.stop="editClient(client)"
                      class="h-11 w-11 text-slate-400 hover:text-indigo-600 :text-indigo-400 hover:bg-indigo-50 :bg-indigo-900/40 rounded-xl"
                    >
                      <Pencil class="w-4 h-4 stroke-[2.5]" />
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      @click.stop="deleteClient(client._id)"
                      class="h-11 w-11 text-slate-400 hover:text-rose-500 :text-rose-400 hover:bg-rose-500/10 :bg-rose-900/40 rounded-xl"
                    >
                      <Trash2 class="w-4 h-4 stroke-[2.5]" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              
              <TableRow v-if="clients.length === 0 && !loading">
                <TableCell :colspan="authStore.isAdmin ? 6 : 5" class="h-60 text-center">
                  <div class="flex flex-col items-center gap-4 opacity-30">
                    <User class="w-16 h-16 stroke-[1]" />
                    <p class="font-black uppercase tracking-[0.3em] text-xs">Aucun client répertorié</p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div v-if="sortedClients.length > pageSize" class="flex items-center justify-between px-10 py-5 border-t border-slate-100 bg-slate-50/50">
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Page {{ currentPage }} / {{ totalClientPages }} — {{ sortedClients.length }} résultats
          </p>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" :disabled="currentPage <= 1" @click="currentPage--" class="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-slate-200 disabled:opacity-30">
              <ChevronLeft class="w-4 h-4 mr-1" /> Précédent
            </Button>
            <Button variant="outline" size="sm" :disabled="currentPage >= totalClientPages" @click="currentPage++" class="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-slate-200 disabled:opacity-30">
              Suivant <ChevronRight class="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Add/Edit Modal -->
    <Dialog v-model:open="showForm">
      <DialogContent class="!top-0 !translate-y-0 !left-0 !translate-x-0 w-full h-full max-w-full max-h-full bg-white/95 backdrop-blur-3xl border-0 shadow-3xl rounded-none p-0 gap-0 overflow-hidden flex flex-col text-slate-900 sm:!top-[2%] sm:!left-1/2 sm:!-translate-x-1/2 sm:max-w-4xl sm:max-h-[96vh] sm:rounded-[2rem] sm:border sm:border-slate-200">
        <DialogHeader class="p-5 sm:p-6 bg-indigo-600 text-white relative overflow-hidden shrink-0">
          <div class="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-[100px]"></div>
          <div class="flex items-center gap-3 sm:gap-4 relative z-10">
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center shadow-inner rotate-3 shrink-0">
              <User class="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div class="min-w-0">
              <DialogTitle class="text-lg sm:text-xl font-black uppercase tracking-tighter text-white italic truncate">
                {{ editingClient ? 'Modification' : 'Enregistrement' }} <span class="text-indigo-200">Client</span>
              </DialogTitle>
              <DialogDescription class="text-white/60 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] mt-1 italic truncate">
                Dossier Identité & Qualification Locataire
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="px-5 sm:px-6 pt-3 sm:pt-4 pb-1 sm:pb-2 shrink-0 bg-slate-50/50">
          <div class="flex items-center justify-between mb-3 sm:mb-4 relative px-4 sm:px-6">
            <div class="absolute top-1/2 left-0 w-full h-px bg-slate-200 -translate-y-1/2 z-0"></div>
            <div 
              v-for="step in [1, 2, 3]" 
              :key="step"
              class="relative z-10 flex flex-col items-center gap-1"
            >
              <div 
                :class="[ 'w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs transition-all duration-700 border-2', currentStep >= step ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-600/20 scale-110 rotate-3' : 'bg-white text-slate-400 border-slate-100 ' ]"
              >
                <Check v-if="currentStep > step" class="w-3 h-3 sm:w-4 sm:h-4 stroke-[3]" />
                <span v-else>{{ step }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="p-5 sm:p-6 pt-1 sm:pt-2 space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <!-- Step 1: Personal Info -->
          <div v-if="currentStep === 1" class="space-y-4 animate-in slide-in-from-right-4 duration-500">
             <div class="grid grid-cols-2 gap-4">
                <div v-if="editingClient" class="space-y-2 col-span-2">
                  <Label class="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">SÉCURITÉ & VIGILANCE</Label>
                  <div class="flex gap-2">
                    <button 
                      v-for="s in [
                        { id: 'WHITE_LIST', label: 'White List', color: 'bg-emerald-500' },
                        { id: 'BLACK_LIST', label: 'Black List', color: 'bg-amber-500' },
                        { id: 'BLOCK_LIST', label: 'Block List', color: 'bg-rose-500' }
                      ]"
                      :key="s.id"
                      type="button"
                      @click="clientForm.status = s.id"
                      :class="[ 'flex-1 py-3 px-3 rounded-xl border-2 transition-all duration-500 flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-[0.1em]', clientForm.status === s.id ? 'border-indigo-600 bg-indigo-600/5 text-indigo-600 shadow-lg shadow-indigo-600/5' : 'border-slate-100 bg-slate-50 text-slate-400 grayscale opacity-40 hover:opacity-100' ]"
                    >
                      <div :class="['w-1.5 h-1.5 rounded-full', s.color]"></div>
                      {{ s.label }}
                    </button>
                  </div>
                </div>

                <div class="space-y-1.5 sm:space-y-2">
                  <Label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Prénom</Label>
                  <Input v-model="clientForm.firstName" class="h-10 sm:h-11 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-xl font-black text-slate-900 text-sm" />
                </div>
                <div class="space-y-1.5 sm:space-y-2">
                  <Label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Nom de Famille</Label>
                  <Input v-model="clientForm.lastName" class="h-10 sm:h-11 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-xl font-black text-slate-900 text-sm" />
                </div>
                <div class="space-y-1.5 sm:space-y-2">
                  <Label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Date de Naissance</Label>
                  <Input type="date" v-model="clientForm.birthday" class="h-10 sm:h-11 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-xl font-black text-slate-900 text-sm" />
                </div>
                <div class="space-y-1.5 sm:space-y-2">
                  <Label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Numéro de Téléphone</Label>
                  <div class="flex gap-2">
                    <select v-model="clientForm.phoneCountryCode" class="h-10 sm:h-11 w-24 shrink-0 bg-slate-50 border border-slate-100 rounded-xl font-black text-slate-900 text-sm px-2 outline-none">
                      <option value="+216">🇹🇳 +216</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+39">🇮🇹 +39</option>
                      <option value="+49">🇩🇪 +49</option>
                      <option value="+34">🇪🇸 +34</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+212">🇲🇦 +212</option>
                      <option value="+213">🇩🇿 +213</option>
                      <option value="+966">🇸🇦 +966</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+218">🇱🇾 +218</option>
                    </select>
                    <Input v-model="clientForm.phone" class="h-10 sm:h-11 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-xl font-black text-indigo-600 tabular-nums text-sm flex-1" />
                  </div>
                </div>
                <div class="space-y-1.5 sm:space-y-2">
                  <Label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Nationalité</Label>
                  <Input v-model="clientForm.nationality" placeholder="Ex: Tunisienne" class="h-10 sm:h-11 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-xl font-black text-slate-900 text-sm" />
                </div>
                <div class="space-y-1.5 sm:space-y-2">
                  <Label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Lieu de Naissance</Label>
                  <Input v-model="clientForm.lieuNaissance" placeholder="Ex: Djerba" class="h-10 sm:h-11 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-xl font-black text-slate-900 text-sm" />
                </div>
                <div class="space-y-1.5 sm:space-y-2 col-span-2">
                  <Label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Adresse de Résidence</Label>
                  <Input v-model="clientForm.address" placeholder="Ex: Rue 123, Tunis..." class="h-10 sm:h-11 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-xl font-black text-slate-900 text-sm" />
                </div>
                <div class="space-y-1.5 sm:space-y-2 col-span-2">
                  <Label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Notes Internes / Description</Label>
                  <textarea v-model="clientForm.description" placeholder="Détails supplémentaires sur le client..." class="w-full h-20 sm:h-24 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-xl font-black text-slate-900 p-2.5 sm:p-3 resize-none text-sm"></textarea>
                </div>
             </div>
          </div>

          <!-- Step 2: Identifiers -->
          <div v-if="currentStep === 2" class="space-y-3 sm:space-y-4 animate-in slide-in-from-right-4 duration-500">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div class="space-y-1.5 sm:space-y-2 col-span-1 sm:col-span-2">
                  <Label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">TYPE DE PIÈCE D'IDENTITÉ</Label>
                  <select v-model="clientForm.idCardType" class="w-full h-10 sm:h-12 rounded-xl border-2 border-slate-100 px-4 text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50">
                     <option value="cin">Carte d'Identité Nationale (CIN)</option>
                     <option value="passport">Passeport</option>
                     <option value="carte_sejour">Carte de Séjour</option>
                  </select>
                </div>
                <div class="space-y-1.5 sm:space-y-2">
                  <Label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">
                    {{ clientForm.idCardType === 'passport' ? 'NUMÉRO DE PASSEPORT' : (clientForm.idCardType === 'carte_sejour' ? 'NUMÉRO CARTE DE SÉJOUR' : 'IDENTIFIANT NATIONAL (CIN)') }}
                  </Label>
                  <div class="relative group">
                    <CreditCard class="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600/30 group-focus-within:text-indigo-600 transition-colors" />
                    <Input v-model="clientForm.cin" class="pl-10 h-10 sm:h-12 bg-slate-50 border-2 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-xl text-sm sm:text-base font-black tracking-[0.1em] text-slate-900 tabular-nums placeholder:text-slate-200" :placeholder="clientForm.idCardType === 'passport' ? 'Passeport' : '00000000'" />
                  </div>
                </div>
                <div class="space-y-1.5 sm:space-y-2">
                  <Label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">
                    {{ clientForm.idCardType === 'passport' ? 'DATE DE DÉLIVRANCE PASSEPORT' : (clientForm.idCardType === 'carte_sejour' ? "DATE D'ÉMISSION CARTE DE SÉJOUR" : "DATE D'EXPORTATION CIN") }}
                  </Label>
                  <Input type="date" v-model="clientForm.cinDate" class="h-10 sm:h-12 bg-slate-50 border-2 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-xl font-black text-slate-900 text-sm" />
                </div>
                <div class="space-y-1.5 sm:space-y-2">
                  <Label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">NUMÉRO PERMIS DE CONDUIRE</Label>
                  <div class="relative group">
                    <Shield class="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600/30 group-focus-within:text-indigo-600 transition-colors" />
                    <Input v-model="clientForm.drivingLicense" class="pl-10 h-10 sm:h-12 bg-slate-50 border-2 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-xl text-sm sm:text-base font-black tracking-[0.1em] text-slate-900 tabular-nums placeholder:text-slate-200" placeholder="00/000000" />
                  </div>
                </div>
                <div class="space-y-1.5 sm:space-y-2">
                  <Label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">DATE D'EXPORTATION PERMIS</Label>
                  <Input type="date" v-model="clientForm.licenseDate" class="h-10 sm:h-12 bg-slate-50 border-2 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-xl font-black text-slate-900 text-sm" />
                </div>
                <div class="space-y-1.5 sm:space-y-2">
                  <Label class="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">LIEU DE PERMIS</Label>
                  <Input v-model="clientForm.lieuPermis" placeholder="Ex: Djerba" class="h-10 sm:h-12 bg-slate-50 border-2 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 rounded-xl font-black text-slate-900 text-sm" />
                </div>
              </div>
          </div>

          <!-- Step 3: Document Uploads -->
          <div v-if="currentStep === 3" class="space-y-4 animate-in slide-in-from-right-4 duration-500">
            <!-- CIN Documents -->
            <div class="space-y-3">
                  <h3 class="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-600 flex items-center gap-2">
                    <CreditCard class="w-3 h-3" /> SCANS D'IDENTITÉ ({{ clientForm.idCardType === 'passport' ? 'PASSEPORT' : (clientForm.idCardType === 'carte_sejour' ? 'CARTE DE SÉJOUR' : 'CIN') }})
                  </h3>
              <div class="grid gap-4 sm:gap-6" :class="clientForm.idCardType === 'passport' ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-1 sm:grid-cols-2'">
                <div 
                  v-for="field in (clientForm.idCardType === 'passport' ? ['cinFront'] : ['cinFront', 'cinBack'])" 
                  :key="field"
                  class="relative group"
                >
                  <Label class="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase mb-1.5 sm:mb-2 block tracking-widest pl-1">
                    {{ clientForm.idCardType === 'passport' ? 'Passeport (Recto / Page principale)' : (field.includes('Front') ? 'Recto Officiel' : 'Verso Officiel') }}
                  </Label>
                  <div class="h-28 sm:h-32 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-2 relative overflow-hidden group-hover:border-indigo-600/50 group-hover:bg-indigo-50/20 :bg-indigo-900/10 transition-all duration-500">
                    <template v-if="clientForm[field as keyof ClientForm]">
                      <img :src="getImageUrl(clientForm[field as keyof ClientForm])" class="w-full h-full object-cover rounded-2xl grayscale group-hover:grayscale-0 transition-all duration-700" />
                      <button @click="removeFile(field as keyof ClientForm)" class="absolute top-4 right-4 h-10 w-10 bg-rose-500 text-white rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 flex items-center justify-center">
                        <X class="w-5 h-5 stroke-[3]" />
                      </button>
                    </template>
                    <template v-else>
                      <input 
                        type="file" 
                        class="absolute inset-0 opacity-0 cursor-pointer z-10" 
                        @change="handleFileUpload($event, field as keyof ClientForm)"
                        accept="image/*"
                      />
                      <div class="flex flex-col items-center gap-3 text-slate-400">
                        <div class="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-slate-100 shadow-sm group-hover:rotate-12 transition-all">
                          <Upload v-if="!isUploading[field]" class="w-5 h-5" />
                          <div v-else class="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <span class="text-[9px] font-black uppercase tracking-widest">Importer Scan</span>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </div>
            <!-- License Documents -->
            <div class="space-y-3 pt-4 border-t border-slate-100">
              <h3 class="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-600 flex items-center gap-2">
                <Shield class="w-3 h-3" /> SCANS DU PERMIS DE CONDUIRE
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div 
                  v-for="field in ['licenseFront', 'licenseBack']" 
                  :key="field"
                  class="relative group"
                >
                  <Label class="text-[8px] font-black text-slate-400 uppercase mb-2 block tracking-widest pl-1">
                    {{ field.includes('Front') ? 'Recto Officiel' : 'Verso Officiel' }}
                  </Label>
                  <div class="h-32 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-2 relative overflow-hidden group-hover:border-indigo-600/50 group-hover:bg-indigo-50/20 transition-all duration-500">
                    <template v-if="clientForm[field as keyof ClientForm]">
                      <img :src="getImageUrl(clientForm[field as keyof ClientForm])" class="w-full h-full object-cover rounded-2xl grayscale group-hover:grayscale-0 transition-all duration-700" />
                      <button @click="removeFile(field as keyof ClientForm)" class="absolute top-4 right-4 h-10 w-10 bg-rose-500 text-white rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 flex items-center justify-center">
                        <X class="w-5 h-5 stroke-[3]" />
                      </button>
                    </template>
                    <template v-else>
                      <input 
                        type="file" 
                        class="absolute inset-0 opacity-0 cursor-pointer z-10" 
                        @change="handleFileUpload($event, field as keyof ClientForm)"
                        accept="image/*"
                      />
                      <div class="flex flex-col items-center gap-3 text-slate-400">
                        <div class="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-slate-100 shadow-sm group-hover:rotate-12 transition-all">
                          <Upload v-if="!isUploading[field]" class="w-5 h-5" />
                          <div v-else class="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <span class="text-[9px] font-black uppercase tracking-widest">Importer Scan</span>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter class="p-3 sm:p-4 bg-slate-50/80 border-t border-slate-100 flex gap-2 sm:gap-3 shrink-0">
          <Button variant="ghost" @click="showForm = false" class="h-9 sm:h-10 font-black rounded-xl px-3 sm:px-5 text-slate-500 uppercase tracking-widest text-[8px] sm:text-[9px] italic">Abandonner</Button>
          <div class="flex-1"></div>
          
          <Button 
            v-if="editingClient"
            variant="outline" 
            @click="saveClient" 
            class="h-9 sm:h-10 font-black rounded-xl px-3 sm:px-5 border-indigo-100 bg-white text-indigo-600 hover:bg-indigo-50 flex items-center gap-1 sm:gap-2 uppercase tracking-widest text-[8px] sm:text-[9px] shadow-sm"
          >
            Sauvegarder
          </Button>

          <Button 
            v-if="currentStep > 1"
            variant="outline" 
            @click="prevStep" 
            class="h-9 sm:h-10 font-black rounded-xl px-3 sm:px-5 border-slate-200 bg-white hover:bg-slate-100 :bg-slate-800 text-slate-900 flex items-center gap-1 sm:gap-2 uppercase tracking-widest text-[8px] sm:text-[9px]"
          >
            <ArrowLeft class="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Précédent
          </Button>
          <Button 
            v-if="currentStep < 3"
            @click="nextStep" 
            :disabled="!isStepValid"
            class="h-9 sm:h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl px-4 sm:px-6 shadow-xl shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 uppercase tracking-widest text-[8px] sm:text-[9px]"
          >
            Continuer <ArrowRight class="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
          </Button>
          <Button 
            v-if="currentStep === 3"
            @click="saveClient" 
            :disabled="!isStepValid"
            class="h-9 sm:h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl px-4 sm:px-6 shadow-xl shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2 uppercase tracking-widest text-[8px] sm:text-[9px]"
          >
            <Check class="w-3 h-3 sm:w-4 sm:h-4 stroke-[3]" /> Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Security Modal for Admin Password -->
    <Dialog v-model:open="showSecurityModal">
      <DialogContent class="sm:max-w-[400px] bg-white/95 backdrop-blur-3xl border border-slate-200 shadow-3xl rounded-[2.5rem] p-0 overflow-hidden text-slate-900">
        <DialogHeader class="p-8 bg-rose-600 text-white relative overflow-hidden">
          <div class="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-[60px]"></div>
          <div class="flex items-center gap-4 relative z-10">
            <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner">
              <Shield class="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle class="text-xl font-black uppercase tracking-tighter text-white italic">Confirmation <span class="text-rose-200">{{ pendingEdit ? 'Admin' : 'Requise' }}</span></DialogTitle>
              <DialogDescription class="text-white/60 text-[8px] font-black uppercase tracking-[0.3em] mt-1">Action Administrative Sécurisée</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="p-8 space-y-6">
          <div class="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
             <div class="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0"></div>
              <p class="text-[11px] font-bold text-rose-700 leading-relaxed italic">{{ pendingEdit ? 'Cette action va modifier les informations du client. Veuillez saisir votre mot de passe administrateur pour confirmer.' : 'Cette action va désactiver le client. Veuillez saisir votre mot de passe administrateur pour confirmer.' }}</p>
          </div>
          
          <div class="space-y-3">
            <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mot de Passe Admin</Label>
            <div class="relative">
              <Input 
                :type="showPassword ? 'text' : 'password'" 
                v-model="adminPassword" 
                placeholder="••••••••" 
                class="h-14 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-rose-500/5 rounded-2xl font-black text-center text-xl tracking-widest pr-12"
                @keyup.enter="executeDelete"
              />
              <button type="button" @click="showPassword = !showPassword" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors outline-none">
                <Eye v-if="!showPassword" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <DialogFooter class="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-3">
          <Button 
            @click="executeDelete" 
            :disabled="!adminPassword || submitting"
            class="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl shadow-xl shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]"
          >
            <template v-if="submitting">
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Traitement...
            </template>
            <template v-else>
              {{ pendingEdit ? 'Confirmer la Modification' : 'Confirmer la Désactivation' }}
            </template>
          </Button>
          <Button variant="ghost" @click="showSecurityModal = false" class="w-full h-12 font-black rounded-xl text-slate-400 uppercase tracking-widest text-[9px]">Annuler</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.client-list-container {
  font-family: 'Inter', sans-serif;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.1);
  border-radius: 10px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
}

</style>
