<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { userApi } from '@/api'
import { Plus, Search, UserPlus, Shield, User, Phone, ImageIcon, Trash2, Pencil, Loader2, X, Eye, EyeOff, KeyRound, CalendarDays, Lock } from 'lucide-vue-next'
import { 
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell 
} from '@/components/ui/table'
import { 
  Card, CardHeader, CardTitle, CardContent 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription 
} from '@/components/ui/dialog'
import { PasswordConfirmDialog } from '@/components/ui/password-dialog'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import { usePasswordGuard, handlePasswordError } from '@/composables/usePasswordGuard'
import { ShieldCheck as ShieldCheckIcon } from 'lucide-vue-next'

const authStore = useAuthStore()
const toast = useToast()
const guard = usePasswordGuard()

interface UserRecord {
  _id?: string
  firstName: string
  lastName: string
  cin: string
  phone: string
  role: string
  photos: string[]
  createdAt?: string
  updatedAt?: string
}

const users = ref<UserRecord[]>([])
const loading = ref(true)
const searchQuery = ref('')
const searchOpen = ref(false)
const addOpen = ref(false)
const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const editingUser = ref<UserRecord | null>(null)
const isProfileOpen = ref(false)
const profileUser = ref<UserRecord | null>(null)
const showProfilePwd = ref(false)
const revealedPassword = ref('')
const isSaving = ref(false)
const revealOpen = ref(false)
const revealAdminPassword = ref('')
const showRevealPassword = ref(false)
const isRevealing = ref(false)

const newUser = reactive<UserRecord>({
  firstName: '',
  lastName: '',
  cin: '',
  phone: '',
  role: 'user',
  photos: []
})

const editUser = reactive<UserRecord>({
  firstName: '',
  lastName: '',
  cin: '',
  phone: '',
  role: 'user',
  photos: []
})

const loadUsers = async () => {
  loading.value = true
  try {
    const data = await userApi.getAll()
    users.value = data
  } catch (error) {
    console.error('Failed to load users:', error)
  } finally {
    loading.value = false
  }
}

onMounted(loadUsers)

const handleAddUser = async () => {
  isSaving.value = true
  try {
    await userApi.create(newUser)
    isAddModalOpen.value = false
    // Reset form
    Object.assign(newUser, { firstName: '', lastName: '', cin: '', phone: '', role: 'user', photos: [] })
    loadUsers()
  } catch (error) {
    console.error('Failed to create user:', error)
  } finally {
    isSaving.value = false
  }
}

const openProfile = (user: UserRecord) => {
  profileUser.value = user
  showProfilePwd.value = false
  revealedPassword.value = ''
  revealOpen.value = false
  revealAdminPassword.value = ''
  isProfileOpen.value = true
}

const toggleReveal = () => {
  if (showProfilePwd.value) {
    showProfilePwd.value = false
    return
  }
  revealAdminPassword.value = ''
  showRevealPassword.value = false
  revealOpen.value = true
}

const submitReveal = async () => {
  if (!profileUser.value?._id || !revealAdminPassword.value.trim() || guard.isLocked) return
  isRevealing.value = true
  try {
    const data = await userApi.revealPassword(profileUser.value._id, revealAdminPassword.value.trim())
    revealedPassword.value = data?.passwordText || ''
    showProfilePwd.value = true
    revealOpen.value = false
    guard.reset()
  } catch (error: any) {
    if (handlePasswordError(error, toast)) return
    const msg = error?.response?.data?.message || "Erreur lors de la vérification du mot de passe."
    toast.add({ severity: 'error', summary: 'Erreur', detail: msg, life: 4000 })
  } finally {
    isRevealing.value = false
  }
}

const openEdit = (user: UserRecord) => {
  editingUser.value = user
  Object.assign(editUser, { ...user, photos: user.photos ? [...user.photos] : [] })
  isEditModalOpen.value = true
}

const handleUpdateUser = async () => {
  if (!editingUser.value?._id) return
  isSaving.value = true
  try {
    const payload: any = {
      firstName: editUser.firstName,
      lastName: editUser.lastName,
      cin: editUser.cin,
      photos: editUser.photos,
    }
    if (authStore.isSuperAdmin) payload.role = editUser.role
    await userApi.update(editingUser.value._id, payload)
    isEditModalOpen.value = false
    toast.add({ severity: 'success', summary: 'Personnel modifié', detail: `${editUser.lastName} ${editUser.firstName} a été mis à jour.`, life: 3000 })
    loadUsers()
  } catch (error: any) {
    const msg = error?.response?.data?.message || "Erreur lors de la modification."
    toast.add({ severity: 'error', summary: 'Erreur', detail: msg, life: 4000 })
  } finally {
    isSaving.value = false
  }
}

const onFileChange = (e: any, photos: string[]) => {
  const files = e.target.files
  if (!files.length) return
  
  // Base64 conversion
  Array.from(files).forEach((file: any) => {
    const reader = new FileReader()
    reader.onload = (event: any) => {
      photos.push(event.target.result)
    }
    reader.readAsDataURL(file)
  })
}

const removePhoto = (photos: string[], index: number) => {
  photos.splice(index, 1)
}

const deleteUser = async (user: UserRecord) => {
  if (!user._id) return
  if (!confirm(`Voulez-vous vraiment supprimer ${user.lastName} ${user.firstName} ?`)) return
  try {
    await userApi.delete(user._id)
    toast.add({ severity: 'success', summary: 'Personnel supprimé', detail: `${user.lastName} ${user.firstName} a été supprimé.`, life: 3000 })
    loadUsers()
  } catch (error: any) {
    const msg = error?.response?.data?.message || "Erreur lors de la suppression."
    toast.add({ severity: 'error', summary: 'Erreur', detail: msg, life: 4000 })
  }
}
</script>

<template>
  <div class="p-8 max-w-7xl mx-auto space-y-8">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-1">
        <h1 class="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3 uppercase italic">
          Contrôle <span class="text-indigo-600">d'Accès</span>
        </h1>
        <p class="text-slate-500 font-bold uppercase text-[11px] tracking-[0.2em] pl-1">Gestion du personnel et des administrateurs système.</p>
      </div>

      <Dialog v-model:open="isAddModalOpen">
        <DialogTrigger asChild>
          <Button @mouseenter="addOpen = true" @mouseleave="addOpen = false" class="group relative h-12 w-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-300 overflow-hidden flex items-center justify-start active:scale-95 hover:scale-105 hover:-translate-y-0.5">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3.5">
              <UserPlus class="w-4 h-4 stroke-[3] transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
            </div>
            <span :class="[addOpen ? 'opacity-100' : 'opacity-0', 'whitespace-nowrap transition-all duration-300 pl-10 pr-4 uppercase tracking-widest text-[10px] font-black']">Nouvel Opérateur</span>
          </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-[550px] bg-white/95 backdrop-blur-3xl rounded-[3rem] border-slate-200 shadow-3xl p-0 overflow-y-auto max-h-[90vh] text-slate-900 no-scrollbar">
          <DialogHeader class="bg-indigo-600 p-10 text-white relative overflow-hidden">
            <div class="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-3xl opacity-50"></div>
            <DialogTitle class="text-3xl font-black uppercase tracking-tighter flex items-center gap-4 relative z-10 italic">
              <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner">
                <Plus class="w-7 h-7 text-white stroke-[3]" />
              </div>
              Inscription <span class="text-indigo-200">Personnel</span>
            </DialogTitle>
            <DialogDescription class="text-white/60 font-black uppercase text-[10px] tracking-[0.3em] mt-2 ml-16 relative z-10 leading-relaxed">
              Détails d'identité de l'opérateur système.
            </DialogDescription>
          </DialogHeader>
          
          <form @submit.prevent="handleAddUser" class="p-10 space-y-8 bg-transparent">
            <div class="grid grid-cols-2 gap-8">
              <div class="space-y-2">
                <Label for="firstName" class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</Label>
                <Input id="firstName" v-model="newUser.firstName" placeholder="Prénom" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black transition-all" required />
              </div>
              <div class="space-y-2">
                <Label for="lastName" class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</Label>
                <Input id="lastName" v-model="newUser.lastName" placeholder="Nom" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black transition-all" required />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-8">
              <div class="space-y-2">
                <Label for="cin" class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CIN (Username)</Label>
                <Input id="cin" v-model="newUser.cin" placeholder="AB000000" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black font-mono tracking-widest transition-all uppercase" required />
              </div>
              <div class="space-y-2">
                <Label for="phone" class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</Label>
                <div class="relative group">
                   <Phone class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-indigo-600" />
                   <Input id="phone" v-model="newUser.phone" placeholder="Numéro" class="h-14 pl-12 bg-slate-50 border-slate-100 rounded-2xl font-black transition-all" required />
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rôle Système</Label>
              <div class="flex gap-4 p-1.5 bg-slate-100 rounded-2xl w-full">
                <button type="button" @click="newUser.role = 'user'" 
                        :class="['flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2', newUser.role === 'user' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700']">
                  <User class="w-4 h-4" /> Opérateur
                </button>
                <button v-if="authStore.isSuperAdmin" type="button" @click="newUser.role = 'admin'" 
                        :class="['flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2', newUser.role === 'admin' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700']">
                  <Shield class="w-4 h-4" /> Admin
                </button>
                <button v-if="authStore.isSuperAdmin" type="button" @click="newUser.role = 'super_admin'" 
                        :class="['flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2', newUser.role === 'super_admin' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-700']">
                  <ShieldCheckIcon class="w-4 h-4" /> Super Admin
                </button>
              </div>
              <p v-if="!authStore.isSuperAdmin" class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Le rôle est fixé à Opérateur pour votre session. Seul un Super Admin peut attribuer des rôles Admin.
              </p>
            </div>

            <div class="space-y-4">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Documents (Base64 Photos)</Label>
              <div class="flex flex-wrap gap-4">
                 <div v-for="(photo, idx) in newUser.photos" :key="idx" class="relative group w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img :src="photo" class="w-full h-full object-cover" />
                    <button @click="removePhoto(newUser.photos, idx)" type="button" class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                       <X class="w-6 h-6" />
                    </button>
                 </div>
                 <label class="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-600/50 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-indigo-600 group">
                    <ImageIcon class="w-7 h-7 mb-1 transition-transform group-hover:scale-110" />
                    <span class="text-[8px] uppercase font-black tracking-widest">Ajouter</span>
                    <input type="file" class="hidden" multiple accept="image/*" @change="(e) => onFileChange(e, newUser.photos)" />
                 </label>
              </div>
            </div>

            <DialogFooter class="pt-6 flex gap-4">
               <DialogTrigger asChild>
                 <Button variant="ghost" class="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">Abandonner</Button>
               </DialogTrigger>
               <Button type="submit" class="flex-1 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all" :disabled="isSaving">
                  <Loader2 v-if="isSaving" class="w-5 h-5 animate-spin mr-2" />
                  Finaliser Inscription
               </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog v-model:open="isEditModalOpen">
        <DialogContent class="sm:max-w-[550px] bg-white/95 backdrop-blur-3xl rounded-[3rem] border-slate-200 shadow-3xl p-0 overflow-y-auto max-h-[90vh] text-slate-900 no-scrollbar">
          <DialogHeader class="bg-indigo-600 p-10 text-white relative overflow-hidden">
            <div class="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-3xl opacity-50"></div>
            <DialogTitle class="text-3xl font-black uppercase tracking-tighter flex items-center gap-4 relative z-10 italic">
              <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner">
                <Pencil class="w-7 h-7 text-white stroke-[3]" />
              </div>
              Modification <span class="text-indigo-200">Personnel</span>
            </DialogTitle>
            <DialogDescription class="text-white/60 font-black uppercase text-[10px] tracking-[0.3em] mt-2 ml-16 relative z-10 leading-relaxed">
              Mise à jour des informations de l'opérateur système.
            </DialogDescription>
          </DialogHeader>
          
          <form @submit.prevent="handleUpdateUser" class="p-10 space-y-8 bg-transparent">
            <div class="grid grid-cols-2 gap-8">
              <div class="space-y-2">
                <Label for="editFirstName" class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prénom</Label>
                <Input id="editFirstName" v-model="editUser.firstName" placeholder="Prénom" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black transition-all" required />
              </div>
              <div class="space-y-2">
                <Label for="editLastName" class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom</Label>
                <Input id="editLastName" v-model="editUser.lastName" placeholder="Nom" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black transition-all" required />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-8">
              <div class="space-y-2">
                <Label for="editCin" class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CIN (Username)</Label>
                <Input id="editCin" v-model="editUser.cin" placeholder="AB000000" class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black font-mono tracking-widest transition-all uppercase" required />
              </div>
              <div class="space-y-2">
                <Label for="editPhone" class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</Label>
                <div class="relative group">
                   <Phone class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                   <Input id="editPhone" v-model="editUser.phone" disabled placeholder="Numéro" class="h-14 pl-12 bg-slate-50 border-slate-100 rounded-2xl font-black transition-all opacity-60 cursor-not-allowed" />
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rôle Système</Label>
              <template v-if="authStore.isSuperAdmin">
                <div class="flex gap-4 p-1.5 bg-slate-100 rounded-2xl w-full">
                  <button type="button" @click="editUser.role = 'user'" 
                          :class="['flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2', editUser.role === 'user' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700']">
                    <User class="w-4 h-4" /> Opérateur
                  </button>
                  <button type="button" @click="editUser.role = 'admin'" 
                          :class="['flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2', editUser.role === 'admin' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700']">
                    <Shield class="w-4 h-4" /> Admin
                  </button>
                  <button type="button" @click="editUser.role = 'super_admin'" 
                          :class="['flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2', editUser.role === 'super_admin' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-700']">
                    <ShieldCheckIcon class="w-4 h-4" /> Super Admin
                  </button>
                </div>
              </template>
              <template v-else>
                <div class="flex items-center gap-3 p-4 bg-slate-100 rounded-2xl">
                  <Badge :class="[
                    'px-4 py-1.5 rounded-full uppercase tracking-tighter font-black text-[9px] border',
                    editUser.role === 'admin' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  ]">
                    {{ editUser.role === 'admin' ? 'Adminsitrateur' : 'Opérateur Standard' }}
                  </Badge>
                  <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Le rôle ne peut pas être modifié par un Admin.</span>
                </div>
              </template>
            </div>

            <div class="space-y-4">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Documents (Base64 Photos)</Label>
              <div class="flex flex-wrap gap-4">
                 <div v-for="(photo, idx) in editUser.photos" :key="idx" class="relative group w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img :src="photo" class="w-full h-full object-cover" />
                    <button @click="removePhoto(editUser.photos, idx)" type="button" class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                       <X class="w-6 h-6" />
                    </button>
                 </div>
                 <label class="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-600/50 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-indigo-600 group">
                    <ImageIcon class="w-7 h-7 mb-1 transition-transform group-hover:scale-110" />
                    <span class="text-[8px] uppercase font-black tracking-widest">Ajouter</span>
                    <input type="file" class="hidden" multiple accept="image/*" @change="(e) => onFileChange(e, editUser.photos)" />
                 </label>
              </div>
            </div>

            <DialogFooter class="pt-6 flex gap-4">
               <Button variant="ghost" type="button" @click="isEditModalOpen = false" class="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">Abandonner</Button>
               <Button type="submit" class="flex-1 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all" :disabled="isSaving">
                  <Loader2 v-if="isSaving" class="w-5 h-5 animate-spin mr-2" />
                  Enregistrer Modifications
               </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>

    <!-- Main Content Card (Glass Design) -->
    <Card class="border border-slate-200/50 shadow-3xl rounded-[3rem] overflow-hidden bg-white/70 backdrop-blur-3xl">
      <CardHeader class="border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between py-10 px-12 relative overflow-hidden">
        <div class="absolute -top-12 -right-12 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl opacity-50"></div>
        <CardTitle class="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] relative z-10 italic">Répertoire Opérateurs</CardTitle>
        <div class="group relative h-12 w-12 transition-all duration-300 overflow-hidden rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-400 flex items-center cursor-text z-10 active:scale-95 hover:shadow-xl hover:shadow-indigo-200/50"
          :class="searchOpen ? 'w-80 border-indigo-500' : 'w-12'"
          @mouseenter="searchOpen = true"
          @mouseleave="searchOpen = false"
          @focusin="searchOpen = true"
          @focusout="searchOpen = false">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Search class="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors duration-300" />
          </div>
          <input v-model="searchQuery" placeholder="Nom ou identifiant..." :class="[searchOpen ? 'opacity-100' : 'opacity-0', 'h-full w-full pl-10 pr-3 bg-transparent border-0 outline-none text-xs font-bold text-slate-900 placeholder:text-slate-400 transition-opacity duration-300']" />
        </div>
      </CardHeader>
      
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <Table>
            <TableHeader class="bg-slate-50/30">
              <TableRow class="border-b border-slate-100">
                <TableHead class="px-10 py-5 font-black text-slate-400 uppercase text-[9px] tracking-[0.3em]">PERSONNEL</TableHead>
                <TableHead class="font-black text-slate-400 uppercase text-[9px] tracking-[0.3em]">ACCÈS SYSTÈME</TableHead>
                <TableHead class="font-black text-slate-400 uppercase text-[9px] tracking-[0.3em]">CONTACT</TableHead>
                <TableHead class="font-black text-slate-400 uppercase text-[9px] tracking-[0.3em] text-right px-10">ADMINISTRATION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="userIter in users" :key="userIter._id" class="hover:bg-indigo-50/30 transition-colors group border-b border-slate-50/50">
                <TableCell class="px-10 py-6">
                  <div class="flex items-center gap-4">
                    <Avatar class="w-14 h-14 border-2 border-white shadow-xl group-hover:scale-105 transition-transform duration-500">
                      <AvatarImage v-if="userIter.photos?.[0]" :src="userIter.photos?.[0]" />
                      <AvatarFallback class="bg-indigo-50 text-indigo-600 font-black text-xl italic tabular-nums">
                        {{ userIter.lastName?.[0] }}{{ userIter.firstName?.[0] }}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div class="font-black text-slate-900 text-lg uppercase italic tracking-tight">{{ userIter.lastName }} {{ userIter.firstName }}</div>
                      <div class="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest mt-0.5">UID: {{ userIter.cin }}</div>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <Badge :class="[
                    'px-4 py-1.5 rounded-full uppercase tracking-tighter font-black text-[9px] border',
                    userIter.role === 'super_admin' 
                      ? 'bg-amber-50 text-amber-600 border-amber-200' 
                      : userIter.role === 'admin' 
                        ? 'bg-rose-50 text-rose-600 border-rose-100' 
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  ]">
                     {{ userIter.role === 'super_admin' ? 'Super Admin' : userIter.role === 'admin' ? 'Adminsitrateur' : 'Opérateur Standard' }}
                  </Badge>
                </TableCell>
                
                <TableCell>
                  <div class="flex items-center gap-3 text-slate-600">
                    <div class="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <Phone class="w-4 h-4" />
                    </div>
                    <span class="font-black tabular-nums tracking-tight">{{ userIter.phone }}</span>
                  </div>
                </TableCell>

                <TableCell class="text-right px-10 py-6">
                   <div class="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 duration-500">
                      <Button v-if="authStore.isSuperAdmin" variant="secondary" size="icon" @click="openProfile(userIter)" class="h-11 w-11 rounded-xl bg-slate-100 hover:bg-amber-500 text-slate-400 hover:text-white transition-all">
                         <Eye class="w-4 h-4 stroke-[2.5]" />
                      </Button>
                      <Button variant="secondary" size="icon" @click="openEdit(userIter)" class="h-11 w-11 rounded-xl bg-slate-100 hover:bg-indigo-600 text-slate-400 hover:text-white transition-all">
                         <Pencil class="w-4 h-4 stroke-[2.5]" />
                      </Button>
                      <Button 
                        v-if="authStore.isSuperAdmin && userIter.role !== 'super_admin'"
                        variant="secondary" 
                        size="icon" 
                        @click="deleteUser(userIter)"
                        class="h-11 w-11 rounded-xl bg-slate-100 hover:bg-rose-500 text-slate-400 hover:text-white transition-all"
                      >
                         <Trash2 class="w-4 h-4 stroke-[2.5]" />
                      </Button>
                   </div>
                </TableCell>
              </TableRow>
              
              <TableRow v-if="users.length === 0 && !loading">
                <TableCell colspan="4" class="h-72 text-center">
                  <div class="flex flex-col items-center gap-4 opacity-30 translate-y-[-10%]">
                    <User class="w-20 h-20 stroke-[1]" />
                    <p class="font-black uppercase tracking-[0.4em] text-xs">Répertoire des Opérateurs Vide</p>
                  </div>
                </TableCell>
              </TableRow>
              
              <TableRow v-if="loading">
                <TableCell colspan="4" class="h-72 text-center">
                   <div class="flex flex-col items-center gap-4">
                     <Loader2 class="w-12 h-12 animate-spin text-indigo-600 opacity-50" />
                     <p class="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">Initialisation des Données Personnel...</p>
                   </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Profile Popup (Super Admin) -->
    <Dialog v-model:open="isProfileOpen">
      <DialogContent class="sm:max-w-[500px] bg-white/95 backdrop-blur-3xl rounded-[3rem] border-slate-200 shadow-3xl p-0 overflow-y-auto max-h-[90vh] text-slate-900 no-scrollbar">
        <DialogHeader class="bg-amber-500 p-10 text-white relative overflow-hidden">
          <div class="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl opacity-50"></div>
          <div class="flex items-center gap-5 relative z-10">
            <Avatar class="w-16 h-16 border-4 border-white/40 shadow-xl">
              <AvatarImage v-if="profileUser?.photos?.[0]" :src="profileUser?.photos?.[0]" />
              <AvatarFallback class="bg-white/20 text-white font-black text-2xl italic">
                {{ profileUser?.lastName?.[0] }}{{ profileUser?.firstName?.[0] }}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle class="text-3xl font-black uppercase tracking-tighter italic">
                {{ profileUser?.lastName }} {{ profileUser?.firstName }}
              </DialogTitle>
              <DialogDescription class="text-white/70 font-black uppercase text-[10px] tracking-[0.3em] mt-1">
                Profil complet de l'opérateur système
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="p-10 space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">UID / CIN</p>
              <p class="text-sm font-black font-mono text-slate-900 tracking-widest uppercase">{{ profileUser?.cin || '—' }}</p>
            </div>
            <div class="space-y-1">
              <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Téléphone</p>
              <p class="text-sm font-black text-slate-900">{{ profileUser?.phone || '—' }}</p>
            </div>
            <div class="space-y-1">
              <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rôle</p>
              <Badge :class="[
                'px-4 py-1 rounded-full uppercase tracking-tighter font-black text-[9px] border',
                profileUser?.role === 'super_admin' ? 'bg-amber-50 text-amber-600 border-amber-200' : profileUser?.role === 'admin' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
              ]">
                {{ profileUser?.role === 'super_admin' ? 'Super Admin' : profileUser?.role === 'admin' ? 'Administrateur' : 'Opérateur Standard' }}
              </Badge>
            </div>
            <div class="space-y-1">
              <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Créé le</p>
              <p class="text-sm font-bold text-slate-900">{{ profileUser?.createdAt ? new Date(profileUser.createdAt).toLocaleDateString('fr-FR') : '—' }}</p>
            </div>
          </div>

          <div class="pt-5 border-t border-slate-100">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Mot de passe</p>
            <div class="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4">
              <KeyRound class="w-5 h-5 text-amber-500 shrink-0" />
              <span class="flex-1 font-black font-mono tracking-widest text-slate-700 break-all">
                {{ showProfilePwd ? revealedPassword : '••••••••' }}
              </span>
              <button type="button" @click="toggleReveal" class="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-amber-600" :disabled="isRevealing">
                <EyeOff v-if="showProfilePwd" class="w-5 h-5" />
                <Eye v-else class="w-5 h-5" />
              </button>
            </div>
            <p class="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2 ml-1">Cliquez sur l'œil pour révéler le mot de passe (autorisation requise).</p>
          </div>

          <DialogFooter class="pt-6">
            <Button type="button" @click="isProfileOpen = false" class="w-full h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] transition-all">Fermer</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Reveal Password Popup (Admin Password Required) -->
    <PasswordConfirmDialog
      v-model:open="revealOpen"
      v-model:password="revealAdminPassword"
      title="Autorisation"
      subtitle="Requise"
      :description="`Mot de passe admin requis pour révéler le mot de passe de ${profileUser?.lastName || ''} ${profileUser?.firstName || ''}.`"
      placeholder="••••••••"
      confirm-label="Révéler"
      loading-label="Vérification..."
      :loading="isRevealing"
      @confirm="submitReveal"
    />
  </div>
</template>

<style scoped>
.font-outfit {
  font-family: 'Outfit', sans-serif;
}

:deep(.dialog-blur) {
  backdrop-filter: blur(20px);
}
</style>
