<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePasswordGuard, handlePasswordError } from '@/composables/usePasswordGuard'
import { useToast } from 'primevue/usetoast'
import api, { uploadApi, getImageUrl } from '@/api'
import { 
  UserPlus, Search, Pencil, 
  Phone, Mail, MapPin, User,
  CreditCard, Shield, Upload,
  ArrowRight, ArrowLeft, Check, X,
  Trash2, Eye, EyeOff, ChevronLeft, ChevronRight, ChevronDown, Lock, RotateCw, Loader2
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
import { PasswordConfirmDialog } from '@/components/ui/password-dialog'
import { Label } from '@/components/ui/label'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()
const guard = usePasswordGuard()
const clients = ref<any[]>([])
const loading = ref(true)
const showForm = ref(false)
const editingClient = ref<any>(null)

const filters = reactive({
  query: ''
})
const searchOpen = ref(false)
const addOpen = ref(false)

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
    if (!payload.cin?.trim()) delete payload.cin
    if (!payload.drivingLicense?.trim()) delete payload.drivingLicense

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

const handleGlobalEnter = (event?: KeyboardEvent) => {
  if (submitting.value) return
  if (event && event.target instanceof HTMLButtonElement) {
    const text = (event.target.textContent || '').toLowerCase()
    if (text.includes('précédent')) { prevStep(); return }
    if (text.includes('annuler')) { showForm.value = false; return }
  }
  if (currentStep.value < 3) nextStep()
  else saveClient()
}

const addSteps = computed(() => [
  { icon: User, label: 'Identité' },
  { icon: CreditCard, label: "Pièces d'Identité" },
  { icon: Upload, label: 'Documents' }
])

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

const showCropper = ref(false)
const croppingField = ref<keyof ClientForm | null>(null)
const cropperRef = ref<any>(null)

const croppingImage = computed(() => {
  if (!croppingField.value) return ''
  return getImageUrl(clientForm[croppingField.value])
})

const croppingUploading = computed(() => {
  return croppingField.value ? !!isUploading.value[croppingField.value] : false
})

const openCropper = (field: keyof ClientForm) => {
  if (!clientForm[field]) return
  croppingField.value = field
  showCropper.value = true
}

const rotate = () => {
  if (cropperRef.value) {
    cropperRef.value.rotate(90)
  }
}

const applyCroppedDocument = async () => {
  if (!cropperRef.value || !croppingField.value) return
  const field = croppingField.value
  const { canvas } = cropperRef.value.getResult()
  if (!canvas) return
  isUploading.value[field] = true
  try {
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    const file = new File([blob], `${field}.jpg`, { type: 'image/jpeg' })
    const res = await uploadApi.upload(file)
    clientForm[field] = res.url
    croppingField.value = null
    showCropper.value = false
  } catch (err) {
    console.error('Failed to crop/upload image', err)
    alert("Erreur lors du traitement de l'image.")
  } finally {
    isUploading.value[field] = false
  }
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
    guard.reset()
    loadClients()
  } catch (err: any) {
    console.error(err)
    if (handlePasswordError(err, toast)) return
    alert("Erreur lors de l'opération.")
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

      <div class="flex wrap items-center gap-3">
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
            v-model="filters.query"
            placeholder="Nom, CIN ou Téléphone..."
            :class="[searchOpen ? 'opacity-100' : 'opacity-0', 'h-full w-full pl-10 pr-3 bg-transparent border-0 outline-none text-xs font-bold text-slate-900 placeholder:text-slate-400 transition-opacity duration-300']"
          />
        </div>

        <Button @click="openAddModal" @mouseenter="addOpen = true" @mouseleave="addOpen = false" class="group relative h-12 w-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-2xl shadow-indigo-200 transition-all duration-300 overflow-hidden flex items-center justify-start active:scale-95 hover:scale-105 hover:-translate-y-0.5 hover:shadow-indigo-400/40">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3.5">
            <UserPlus class="w-4 h-4 stroke-[3] transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
          </div>
          <span :class="[addOpen ? 'opacity-100' : 'opacity-0', 'whitespace-nowrap transition-all duration-300 pl-10 pr-4 uppercase tracking-widest text-[10px]']">Nouveau Client</span>
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
      <DialogContent hideClose @keydown.enter.prevent @keyup.enter="handleGlobalEnter" class="sm:max-w-3xl bg-white border-border shadow-3xl rounded-[2.5rem] p-0 overflow-hidden text-foreground max-h-[92vh] flex flex-col">
        <DialogHeader class="px-10 py-7 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white relative overflow-hidden shrink-0">
          <div class="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div class="absolute bottom-0 left-32 w-28 h-28 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          <button type="button" @click="showForm = false" class="absolute top-5 right-5 z-20 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all duration-300 hover:rotate-90 active:scale-90">
            <X class="w-5 h-5" />
          </button>
          <div class="flex items-center gap-5 relative z-10">
            <div class="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center shadow-lg shadow-indigo-900/20">
              <UserPlus class="w-7 h-7" />
            </div>
            <div>
              <p class="text-[9px] font-black uppercase tracking-[0.35em] text-indigo-200">{{ editingClient ? 'Modification' : 'Création' }}</p>
              <DialogTitle class="text-2xl font-black uppercase tracking-tighter leading-tight">{{ editingClient ? 'Modifier le Client' : 'Ajouter un Client' }}</DialogTitle>
              <p class="text-white/70 font-bold uppercase tracking-widest text-[9px] mt-1.5">Dossier identité & qualification locataire</p>
            </div>
          </div>
        </DialogHeader>

        <!-- Stepper -->
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
          <template v-for="(step, index) in addSteps" :key="index">
            <div class="flex items-center gap-2 cursor-pointer shrink-0 transition-all" @click="currentStep > index + 1 ? currentStep = index + 1 : null">
              <div :class="['w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 border-2', currentStep === index + 1 ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-110 rotate-3' : currentStep > index + 1 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-white border-slate-200 text-slate-400']">
                <component :is="step.icon" class="w-4 h-4 stroke-[2.5]" />
              </div>
              <div class="hidden md:block">
                <div :class="['text-[8px] font-black uppercase tracking-[0.2em] leading-none whitespace-nowrap', currentStep >= index + 1 ? 'text-slate-900' : 'text-slate-400']">
                  <span class="font-mono text-[8px] opacity-60 mr-1">0{{ index + 1 }}</span>{{ step.label }}
                </div>
              </div>
            </div>
            <div v-if="index < addSteps.length - 1" class="hidden md:block flex-1 h-px bg-slate-200 mx-2"></div>
          </template>
        </div>

        <!-- Step Content -->
        <div class="p-8 overflow-y-auto flex-1 custom-scrollbar">
          <!-- STEP 1: Informations Personnelles -->
          <div v-if="currentStep === 1" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0"><User class="w-4 h-4" /></div>
              <h4 class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800">Informations Personnelles</h4>
              <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div v-if="editingClient" class="md:col-span-2">
                <Label class="form-label">Sécurité & Vigilance</Label>
                <div class="flex gap-3">
                  <button
                    v-for="s in [
                      { id: 'WHITE_LIST', label: 'White List', color: 'bg-emerald-500' },
                      { id: 'BLACK_LIST', label: 'Black List', color: 'bg-amber-500' },
                      { id: 'BLOCK_LIST', label: 'Block List', color: 'bg-rose-500' }
                    ]"
                    :key="s.id"
                    type="button"
                    @click="clientForm.status = s.id"
                    :class="[ 'flex-1 py-3.5 px-4 rounded-xl border-2 transition-all duration-500 flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-[0.15em]', clientForm.status === s.id ? 'border-indigo-600 bg-indigo-600/5 text-indigo-600 shadow-lg shadow-indigo-600/10' : 'border-slate-100 bg-slate-50 text-slate-400 grayscale opacity-40 hover:opacity-100' ]"
                  >
                    <div :class="['w-1.5 h-1.5 rounded-full', s.color]"></div>
                    {{ s.label }}
                  </button>
                </div>
              </div>

              <div class="space-y-2">
                <Label class="form-label">Prénom</Label>
                <Input v-model="clientForm.firstName" class="form-field" />
              </div>
              <div class="space-y-2">
                <Label class="form-label">Nom de Famille</Label>
                <Input v-model="clientForm.lastName" class="form-field" />
              </div>
              <div class="space-y-2">
                <Label class="form-label">Date de Naissance</Label>
                <Input type="date" v-model="clientForm.birthday" class="form-field" @click.stop />
              </div>
              <div class="space-y-2">
                <Label class="form-label">Numéro de Téléphone</Label>
                <div class="flex gap-3">
                  <div class="relative shrink-0">
                    <select v-model="clientForm.phoneCountryCode" class="form-field form-field-select form-field-code w-24 text-center">
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
                    <ChevronDown class="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <Input v-model="clientForm.phone" class="form-field flex-1 tabular-nums text-indigo-600 font-black" placeholder="20 000 000" />
                </div>
              </div>
              <div class="space-y-2">
                <Label class="form-label">Nationalité</Label>
                <Input v-model="clientForm.nationality" placeholder="Ex: Tunisienne" class="form-field" />
              </div>
              <div class="space-y-2">
                <Label class="form-label">Lieu de Naissance</Label>
                <Input v-model="clientForm.lieuNaissance" placeholder="Ex: Djerba" class="form-field" />
              </div>
              <div class="space-y-2 md:col-span-2">
                <Label class="form-label">Adresse de Résidence</Label>
                <Input v-model="clientForm.address" placeholder="Ex: Rue 123, Tunis..." class="form-field" />
              </div>
              <div class="space-y-2 md:col-span-2">
                <Label class="form-label">Notes Internes / Description</Label>
                <textarea v-model="clientForm.description" placeholder="Détails supplémentaires sur le client..." class="form-field min-h-[6rem] resize-none py-3"></textarea>
              </div>
            </div>
          </div>

          <!-- STEP 2: Pièces d'Identité -->
          <div v-if="currentStep === 2" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0"><CreditCard class="w-4 h-4" /></div>
              <h4 class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800">Pièces d'Identité</h4>
              <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div class="space-y-2 md:col-span-2">
                <Label class="form-label">Type de Pièce d'Identité</Label>
                <div class="relative">
                  <select v-model="clientForm.idCardType" class="form-field form-field-select">
                    <option value="cin">Carte d'Identité Nationale (CIN)</option>
                    <option value="passport">Passeport</option>
                    <option value="carte_sejour">Carte de Séjour</option>
                  </select>
                  <ChevronDown class="w-4 h-4 text-slate-400 pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div class="space-y-2">
                <Label class="form-label">{{ clientForm.idCardType === 'passport' ? 'Numéro de Passeport' : (clientForm.idCardType === 'carte_sejour' ? 'Numéro Carte de Séjour' : 'Identifiant National (CIN)') }}</Label>
                <div class="relative">
                  <CreditCard class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600/30" />
                  <Input v-model="clientForm.cin" class="form-field form-field-icon tabular-nums tracking-widest" :placeholder="clientForm.idCardType === 'passport' ? 'Passeport' : '00000000'" />
                </div>
              </div>
              <div class="space-y-2">
                <Label class="form-label">{{ clientForm.idCardType === 'passport' ? 'Date de Délivrance Passeport' : (clientForm.idCardType === 'carte_sejour' ? "Date d'Émission Carte de Séjour" : "Date d'Exportation CIN") }}</Label>
                <Input type="date" v-model="clientForm.cinDate" class="form-field" @click.stop />
              </div>
              <div class="space-y-2">
                <Label class="form-label">Numéro Permis de Conduire</Label>
                <div class="relative">
                  <Shield class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600/30" />
                  <Input v-model="clientForm.drivingLicense" class="form-field form-field-icon tabular-nums tracking-widest" placeholder="00/000000" />
                </div>
              </div>
              <div class="space-y-2">
                <Label class="form-label">Date d'Exportation Permis</Label>
                <Input type="date" v-model="clientForm.licenseDate" class="form-field" @click.stop />
              </div>
              <div class="space-y-2 md:col-span-2">
                <Label class="form-label">Lieu de Permis</Label>
                <Input v-model="clientForm.lieuPermis" placeholder="Ex: Djerba" class="form-field" />
              </div>
            </div>
          </div>

          <!-- STEP 3: Documents -->
          <div v-if="currentStep === 3" class="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0"><Upload class="w-4 h-4" /></div>
              <h4 class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800">Scans des Documents</h4>
              <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
            </div>

            <!-- CIN Documents -->
            <div class="space-y-4">
              <h3 class="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-600 flex items-center gap-2">
                <CreditCard class="w-3 h-3" /> Scans d'Identité ({{ clientForm.idCardType === 'passport' ? 'Passeport' : (clientForm.idCardType === 'carte_sejour' ? 'Carte de Séjour' : 'CIN') }})
              </h3>
              <div class="grid gap-5" :class="clientForm.idCardType === 'passport' ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-1 sm:grid-cols-2'">
                <div v-for="field in (clientForm.idCardType === 'passport' ? ['cinFront'] : ['cinFront', 'cinBack'])" :key="field" class="relative group">
                  <Label class="form-label">{{ clientForm.idCardType === 'passport' ? 'Passeport (Recto / Page principale)' : (field.includes('Front') ? 'Recto Officiel' : 'Verso Officiel') }}</Label>
                  <input type="file" :id="'client-doc-' + field" class="hidden" accept="image/*" @change="handleFileUpload($event, field as keyof ClientForm)" />
                  <div class="aspect-[4/3] border-2 border-dashed border-slate-200 rounded-[1.5rem] overflow-hidden bg-slate-50/60 relative transition-all duration-500 group-hover:border-indigo-400 group-hover:bg-indigo-50/20">
                    <template v-if="clientForm[field as keyof ClientForm]">
                      <img :src="getImageUrl(clientForm[field as keyof ClientForm])" class="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                      <div class="absolute bottom-0 inset-x-0 p-2.5 bg-white/85 backdrop-blur flex items-center justify-between border-t border-slate-100">
                        <label :for="'client-doc-' + field" class="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 cursor-pointer">
                          <Upload class="w-3 h-3" /> Remplacer
                        </label>
                        <div class="flex items-center gap-3">
                          <button type="button" @click="openCropper(field as keyof ClientForm)" class="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-600 transition-colors">
                            <Pencil class="w-3 h-3" /> Recadrer
                          </button>
                          <button type="button" @click="removeFile(field as keyof ClientForm)" class="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors">
                            <Trash2 class="w-3 h-3" /> Retirer
                          </button>
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <label :for="'client-doc-' + field" class="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer">
                        <div :class="['w-12 h-12 rounded-2xl flex items-center justify-center border border-slate-100 bg-white shadow-sm transition-all', isUploading[field] ? 'bg-indigo-50 text-indigo-500' : 'text-slate-400']">
                          <Upload v-if="!isUploading[field]" class="w-5 h-5" />
                          <div v-else class="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <div class="text-center px-3">
                          <p class="text-[10px] font-black text-slate-700 uppercase tracking-widest">{{ isUploading[field] ? 'Téléversement...' : 'Cliquer pour téléverser' }}</p>
                        </div>
                      </label>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <!-- License Documents -->
            <div class="space-y-4 pt-6 border-t border-slate-100">
              <h3 class="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-600 flex items-center gap-2">
                <Shield class="w-3 h-3" /> Scans du Permis de Conduire
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div v-for="field in ['licenseFront', 'licenseBack']" :key="field" class="relative group">
                  <Label class="form-label">{{ field.includes('Front') ? 'Recto Officiel' : 'Verso Officiel' }}</Label>
                  <input type="file" :id="'client-doc-' + field" class="hidden" accept="image/*" @change="handleFileUpload($event, field as keyof ClientForm)" />
                  <div class="aspect-[4/3] border-2 border-dashed border-slate-200 rounded-[1.5rem] overflow-hidden bg-slate-50/60 relative transition-all duration-500 group-hover:border-indigo-400 group-hover:bg-indigo-50/20">
                    <template v-if="clientForm[field as keyof ClientForm]">
                      <img :src="getImageUrl(clientForm[field as keyof ClientForm])" class="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                      <div class="absolute bottom-0 inset-x-0 p-2.5 bg-white/85 backdrop-blur flex items-center justify-between border-t border-slate-100">
                        <label :for="'client-doc-' + field" class="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 cursor-pointer">
                          <Upload class="w-3 h-3" /> Remplacer
                        </label>
                        <div class="flex items-center gap-3">
                          <button type="button" @click="openCropper(field as keyof ClientForm)" class="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-600 transition-colors">
                            <Pencil class="w-3 h-3" /> Recadrer
                          </button>
                          <button type="button" @click="removeFile(field as keyof ClientForm)" class="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors">
                            <Trash2 class="w-3 h-3" /> Retirer
                          </button>
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <label :for="'client-doc-' + field" class="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer">
                        <div :class="['w-12 h-12 rounded-2xl flex items-center justify-center border border-slate-100 bg-white shadow-sm transition-all', isUploading[field] ? 'bg-indigo-50 text-indigo-500' : 'text-slate-400']">
                          <Upload v-if="!isUploading[field]" class="w-5 h-5" />
                          <div v-else class="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <div class="text-center px-3">
                          <p class="text-[10px] font-black text-slate-700 uppercase tracking-widest">{{ isUploading[field] ? 'Téléversement...' : 'Cliquer pour téléverser' }}</p>
                        </div>
                      </label>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter class="px-10 py-5 bg-slate-50/80 border-t border-slate-100 flex gap-4 shrink-0">
          <Button variant="ghost" @click="showForm = false" class="flex-1 h-12 rounded-xl font-black uppercase text-[10px] text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">Annuler</Button>
          <Button
            v-if="editingClient"
            variant="outline"
            @click="saveClient"
            class="flex-1 h-12 rounded-xl font-black uppercase text-[10px] border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
          >
            Sauvegarder
          </Button>
          <Button v-if="currentStep > 1" @click="prevStep" variant="outline" class="flex-1 h-12 rounded-xl font-black uppercase text-[10px] border-slate-200 text-slate-500 hover:bg-white hover:text-slate-900 transition-all flex items-center justify-center gap-2">
            <ArrowLeft class="w-4 h-4" /> Précédent
          </Button>
          <Button v-if="currentStep < 3" @click="nextStep" :disabled="!isStepValid" class="flex-[2] h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:-translate-y-0">
            Continuer <ArrowRight class="w-4 h-4" />
          </Button>
          <Button v-else @click="saveClient" :disabled="!isStepValid || submitting" class="flex-[2] h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-emerald-600/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:-translate-y-0">
            <Check class="w-4 h-4" /> Valider
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
             <Button @click="applyCroppedDocument" :disabled="croppingUploading" class="h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-indigo-100 transition-all gap-2">
                <Check v-if="!croppingUploading" class="w-4 h-4" />
                <Loader2 v-else class="w-4 h-4 animate-spin" />
                Appliquer les Modifications
             </Button>
             <Button variant="ghost" @click="showCropper = false" class="text-slate-400 font-black uppercase text-[9px] tracking-widest">Annuler</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Security Modal for Admin Password -->
    <PasswordConfirmDialog
      v-model:open="showSecurityModal"
      v-model:password="adminPassword"
      :title="pendingEdit ? 'Confirmation' : 'Accès'"
      :subtitle="pendingEdit ? 'Admin' : 'Requis'"
      :description="pendingEdit ? 'Cette action va modifier les informations du client.' : 'Cette action va désactiver le client. Action administrative sécurisée.'"
      placeholder="Mot de passe admin..."
      :confirm-label="pendingEdit ? 'Confirmer la Modification' : 'Confirmer la Désactivation'"
      loading-label="Traitement..."
      :loading="submitting"
      @confirm="executeDelete"
    />
  </div>
</template>

<style scoped>
.client-list-container {
  font-family: 'Inter', sans-serif;
}

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

.form-field-icon {
  padding-left: 2.75rem !important;
}

.form-field-code {
  padding-left: 0.5rem !important;
  padding-right: 2rem !important;
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
