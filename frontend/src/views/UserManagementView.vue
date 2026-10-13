<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { userApi } from '@/api'
import { 
  Plus, Search, UserPlus, Shield, User, Phone, ImageIcon, Trash2, Pencil, 
  Loader2, X, Eye, EyeOff, KeyRound, CalendarDays, Lock, LayoutGrid, List,
  Users, UserCheck, ShieldAlert, ArrowRight, Check, ShieldCheck as ShieldCheckIcon
} from 'lucide-vue-next'
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
const roleFilter = ref<'all' | 'user' | 'admin' | 'super_admin'>('all')
const viewMode = ref<'grid' | 'list'>('grid')

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
    users.value = data || []
  } catch (error) {
    console.error('Failed to load users:', error)
  } finally {
    loading.value = false
  }
}

onMounted(loadUsers)

const totalUsersCount = computed(() => users.value.length)
const operatorsCount = computed(() => users.value.filter(u => u.role === 'user').length)
const adminsCount = computed(() => users.value.filter(u => u.role === 'admin').length)
const superAdminsCount = computed(() => users.value.filter(u => u.role === 'super_admin').length)

const filteredUsers = computed(() => {
  let list = users.value
  if (roleFilter.value !== 'all') {
    list = list.filter(u => u.role === roleFilter.value)
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
    `${u.lastName} ${u.firstName}`.toLowerCase().includes(q) ||
    u.cin?.toLowerCase().includes(q) ||
    u.phone?.toLowerCase().includes(q)
  )
})

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'super_admin':
      return { label: 'Super Admin', class: 'bg-amber-50 text-amber-700 border-amber-200' }
    case 'admin':
      return { label: 'Administrateur', class: 'bg-rose-50 text-rose-700 border-rose-200' }
    default:
      return { label: 'Opérateur Standard', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  }
}

const handleAddUser = async () => {
  isSaving.value = true
  try {
    await userApi.create(newUser)
    isAddModalOpen.value = false
    Object.assign(newUser, { firstName: '', lastName: '', cin: '', phone: '', role: 'user', photos: [] })
    toast.add({ severity: 'success', summary: 'Opérateur Créé', detail: 'Le nouveau membre du personnel a été ajouté.', life: 3000 })
    loadUsers()
  } catch (error: any) {
    console.error('Failed to create user:', error)
    const msg = error?.response?.data?.message || "Erreur lors de la création de l'opérateur."
    toast.add({ severity: 'error', summary: 'Erreur', detail: msg, life: 4000 })
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
  <div class="user-management p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto space-y-8">
    
    <!-- 1. HEADER SECTION -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-5">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Users class="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 class="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900">
              Gestion <span class="text-indigo-600">du Personnel</span>
            </h1>
            <p class="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              Contrôle d'accès, opérateurs système & rôles administratifs
            </p>
          </div>
        </div>
      </div>

      <!-- Action Button -->
      <div class="flex items-center gap-3">
        <Button 
          @click="isAddModalOpen = true"
          class="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/25 flex items-center gap-2 active:scale-95 transition-all"
        >
          <UserPlus class="w-4 h-4 stroke-[3]" /> Nouvel Opérateur
        </Button>
      </div>
    </div>

    <!-- 2. KPI METRICS CARDS -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Personnel -->
      <div 
        @click="roleFilter = 'all'"
        :class="[
          'p-5 rounded-3xl bg-white border shadow-xs space-y-2 cursor-pointer transition-all',
          roleFilter === 'all' ? 'border-indigo-400 ring-2 ring-indigo-500/10' : 'border-slate-200/80 hover:border-slate-300'
        ]"
      >
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Personnel Total</span>
          <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-black text-slate-900 font-mono">
          {{ totalUsersCount }} <span class="text-xs font-bold text-slate-400">comptes</span>
        </div>
        <div class="text-[10px] font-bold text-slate-500">
          Tous les rôles confondus
        </div>
      </div>

      <!-- Opérateurs Standards -->
      <div 
        @click="roleFilter = 'user'"
        :class="[
          'p-5 rounded-3xl bg-white border shadow-xs space-y-2 cursor-pointer transition-all',
          roleFilter === 'user' ? 'border-emerald-400 ring-2 ring-emerald-500/10' : 'border-slate-200/80 hover:border-slate-300'
        ]"
      >
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Opérateurs</span>
          <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-black text-slate-900 font-mono">
          {{ operatorsCount }} <span class="text-xs font-bold text-slate-400">opérateurs</span>
        </div>
        <div class="text-[10px] font-bold text-slate-500">
          Gestion quotidienne des contrats
        </div>
      </div>

      <!-- Administrateurs -->
      <div 
        @click="roleFilter = 'admin'"
        :class="[
          'p-5 rounded-3xl bg-white border shadow-xs space-y-2 cursor-pointer transition-all',
          roleFilter === 'admin' ? 'border-rose-400 ring-2 ring-rose-500/10' : 'border-slate-200/80 hover:border-slate-300'
        ]"
      >
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Administrateurs</span>
          <div class="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Shield class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-black text-slate-900 font-mono">
          {{ adminsCount }} <span class="text-xs font-bold text-slate-400">admins</span>
        </div>
        <div class="text-[10px] font-bold text-slate-500">
          Gestion des véhicules & validation
        </div>
      </div>

      <!-- Super Admins -->
      <div 
        @click="roleFilter = 'super_admin'"
        :class="[
          'p-5 rounded-3xl bg-white border shadow-xs space-y-2 cursor-pointer transition-all',
          roleFilter === 'super_admin' ? 'border-amber-400 ring-2 ring-amber-500/10' : 'border-slate-200/80 hover:border-slate-300'
        ]"
      >
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Super Admins</span>
          <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldAlert class="w-4 h-4" />
          </div>
        </div>
        <div class="text-2xl font-black text-slate-900 font-mono">
          {{ superAdminsCount }} <span class="text-xs font-bold text-slate-400">super admin</span>
        </div>
        <div class="text-[10px] font-bold text-slate-500">
          Accès total au système
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
          placeholder="Rechercher par nom, prénom, CIN ou tél..."
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

      <!-- Controls: Role Filter & View Switcher -->
      <div class="flex items-center gap-3 self-end sm:self-auto">
        <!-- Role Filter Select Pills -->
        <div class="hidden md:flex items-center gap-1.5">
          <button 
            type="button"
            @click="roleFilter = 'all'"
            :class="[
              'px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all',
              roleFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
            ]"
          >
            Tous
          </button>
          <button 
            type="button"
            @click="roleFilter = 'user'"
            :class="[
              'px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all',
              roleFilter === 'user' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
            ]"
          >
            Opérateurs
          </button>
          <button 
            type="button"
            @click="roleFilter = 'admin'"
            :class="[
              'px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all',
              roleFilter === 'admin' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
            ]"
          >
            Admins
          </button>
        </div>

        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {{ filteredUsers.length }} membre(s)
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

    <!-- 4. MAIN PERSONNEL LIST / GRID -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24 space-y-4">
      <div class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <p class="text-indigo-600 font-black uppercase tracking-[0.3em] text-xs">Chargement du Personnel</p>
    </div>

    <div v-else-if="filteredUsers.length > 0">
      
      <!-- GRID VIEW -->
      <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="u in filteredUsers" 
          :key="u._id"
          class="bg-white rounded-3xl border border-slate-200/80 hover:border-indigo-400 p-6 space-y-5 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 transition-all group flex flex-col justify-between"
        >
          <div class="space-y-4">
            <!-- Header: Avatar + Names + Role Badge -->
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3.5">
                <Avatar class="w-14 h-14 border-2 border-slate-100 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                  <AvatarImage v-if="u.photos?.[0]" :src="u.photos?.[0]" />
                  <AvatarFallback class="bg-indigo-50 text-indigo-600 font-black text-lg">
                    {{ u.lastName?.[0] }}{{ u.firstName?.[0] }}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 class="text-base font-black uppercase tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {{ u.lastName }} {{ u.firstName }}
                  </h3>
                  <span class="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block mt-0.5">
                    CIN : {{ u.cin || '—' }}
                  </span>
                </div>
              </div>

              <!-- Role Badge -->
              <Badge :class="['text-[8px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0', getRoleBadge(u.role).class]">
                {{ getRoleBadge(u.role).label }}
              </Badge>
            </div>

            <!-- Details Box inside Card -->
            <div class="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[11px]">
              <div>
                <span class="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Téléphone</span>
                <span class="font-bold text-slate-800 font-mono text-xs flex items-center gap-1.5 mt-0.5">
                  <Phone class="w-3 h-3 text-slate-400" /> {{ u.phone || '—' }}
                </span>
              </div>
              <div>
                <span class="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Documents</span>
                <span class="font-bold text-slate-700 text-xs flex items-center gap-1.5 mt-0.5">
                  <ImageIcon class="w-3 h-3 text-slate-400" /> {{ u.photos?.length || 0 }} photo(s)
                </span>
              </div>
            </div>
          </div>

          <!-- Bottom Actions -->
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
            <Button 
              v-if="authStore.isSuperAdmin" 
              @click="openProfile(u)" 
              variant="outline" 
              size="sm" 
              class="h-9 px-3 rounded-xl border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5"
            >
              <Eye class="w-3.5 h-3.5" /> Fiche & Pwd
            </Button>
            <div v-else class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Actif
            </div>

            <div class="flex items-center gap-2">
              <Button 
                @click="openEdit(u)" 
                variant="outline" 
                size="sm" 
                class="h-9 px-3 rounded-xl border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5"
              >
                <Pencil class="w-3 h-3" /> Modifier
              </Button>
              <Button 
                v-if="authStore.isSuperAdmin && u.role !== 'super_admin'" 
                @click="deleteUser(u)" 
                variant="ghost" 
                size="icon" 
                class="h-9 w-9 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                title="Supprimer"
              >
                <Trash2 class="w-4 h-4" />
              </Button>
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
                <th class="py-3.5 px-6">Personnel</th>
                <th class="py-3.5 px-4">Rôle / Accès</th>
                <th class="py-3.5 px-4">Contact</th>
                <th class="py-3.5 px-4">Documents</th>
                <th class="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr 
                v-for="u in filteredUsers" 
                :key="u._id"
                class="hover:bg-indigo-50/40 transition-colors group"
              >
                <!-- Name & Avatar -->
                <td class="py-4 px-6">
                  <div class="flex items-center gap-3.5">
                    <Avatar class="w-11 h-11 border border-slate-200 shadow-2xs shrink-0">
                      <AvatarImage v-if="u.photos?.[0]" :src="u.photos?.[0]" />
                      <AvatarFallback class="bg-indigo-50 text-indigo-600 font-black text-sm">
                        {{ u.lastName?.[0] }}{{ u.firstName?.[0] }}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span class="font-black text-sm text-slate-900 uppercase block group-hover:text-indigo-600 transition-colors">
                        {{ u.lastName }} {{ u.firstName }}
                      </span>
                      <span class="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                        CIN : {{ u.cin || '—' }}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Role Badge -->
                <td class="py-4 px-4">
                  <Badge :class="['text-[8px] font-black uppercase px-2 py-0.5 rounded-md border', getRoleBadge(u.role).class]">
                    {{ getRoleBadge(u.role).label }}
                  </Badge>
                </td>

                <!-- Contact -->
                <td class="py-4 px-4 font-mono font-bold text-slate-700">
                  <div class="flex items-center gap-1.5">
                    <Phone class="w-3.5 h-3.5 text-slate-400" />
                    <span>{{ u.phone || '—' }}</span>
                  </div>
                </td>

                <!-- Documents -->
                <td class="py-4 px-4 text-slate-500 font-bold">
                  <span v-if="u.photos?.length" class="text-xs">
                    {{ u.photos.length }} pièce(s)
                  </span>
                  <span v-else class="text-slate-400 italic text-[11px]">—</span>
                </td>

                <!-- Actions -->
                <td class="py-4 px-6 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <Button 
                      v-if="authStore.isSuperAdmin" 
                      @click="openProfile(u)" 
                      variant="outline" 
                      size="sm" 
                      class="h-9 px-3 rounded-xl border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <Eye class="w-3.5 h-3.5" /> Fiche
                    </Button>
                    <Button 
                      @click="openEdit(u)" 
                      variant="outline" 
                      size="sm" 
                      class="h-9 px-3 rounded-xl border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <Pencil class="w-3 h-3" /> Modifier
                    </Button>
                    <Button 
                      v-if="authStore.isSuperAdmin && u.role !== 'super_admin'" 
                      @click="deleteUser(u)" 
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
        <Users class="w-8 h-8 stroke-[1.8]" />
      </div>
      <div class="space-y-1">
        <p class="font-black uppercase tracking-wider text-sm text-slate-800">
          {{ searchQuery ? 'Aucun membre ne correspond à votre recherche' : 'Aucun opérateur enregistré' }}
        </p>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
          {{ searchQuery ? `Aucun résultat pour « ${searchQuery} ». Vérifiez l'orthographe ou réinitialisez la recherche.` : 'Inscrivez vos premiers opérateurs et administrateurs pour leur donner accès à la plateforme.' }}
        </p>
      </div>
      <Button 
        v-if="searchQuery" 
        @click="searchQuery = ''; roleFilter = 'all'" 
        variant="outline" 
        class="h-10 px-5 rounded-xl font-black uppercase text-[10px] tracking-wider"
      >
        Réinitialiser la Recherche
      </Button>
      <Button 
        v-else 
        @click="isAddModalOpen = true" 
        class="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md shadow-indigo-600/20"
      >
        <Plus class="w-4 h-4 mr-1.5" /> Nouvel Opérateur
      </Button>
    </div>

    <!-- ADD USER MODAL -->
    <Dialog v-model:open="isAddModalOpen">
      <DialogContent class="sm:max-w-lg bg-white rounded-3xl p-0 overflow-hidden text-slate-900 border border-slate-200 shadow-2xl max-h-[92vh] flex flex-col">
        <DialogHeader class="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative shrink-0">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white">
              <UserPlus class="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-xl font-black uppercase tracking-tight text-white">
                Inscription Opérateur
              </DialogTitle>
              <DialogDescription class="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                Identité et rôle d'accès système
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form @submit.prevent="handleAddUser" class="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label for="firstName" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prénom</Label>
              <Input id="firstName" v-model="newUser.firstName" placeholder="Prénom" class="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-xs" required />
            </div>
            <div class="space-y-1.5">
              <Label for="lastName" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom</Label>
              <Input id="lastName" v-model="newUser.lastName" placeholder="Nom" class="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-xs" required />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label for="cin" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">CIN (Identifiant)</Label>
              <Input id="cin" v-model="newUser.cin" placeholder="00000000" class="h-11 bg-slate-50 border-slate-200 rounded-xl font-mono font-bold text-xs uppercase" required />
            </div>
            <div class="space-y-1.5">
              <Label for="phone" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Téléphone</Label>
              <Input id="phone" v-model="newUser.phone" placeholder="Numéro..." class="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-xs" required />
            </div>
          </div>

          <!-- Role Selection -->
          <div class="space-y-2">
            <Label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Rôle d'Accès</Label>
            <div class="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-full">
              <button 
                type="button" 
                @click="newUser.role = 'user'" 
                :class="['flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2', newUser.role === 'user' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500 hover:text-slate-900']"
              >
                <User class="w-3.5 h-3.5" /> Opérateur
              </button>
              <button 
                v-if="authStore.isSuperAdmin" 
                type="button" 
                @click="newUser.role = 'admin'" 
                :class="['flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2', newUser.role === 'admin' ? 'bg-white shadow-xs text-rose-700' : 'text-slate-500 hover:text-slate-900']"
              >
                <Shield class="w-3.5 h-3.5" /> Admin
              </button>
              <button 
                v-if="authStore.isSuperAdmin" 
                type="button" 
                @click="newUser.role = 'super_admin'" 
                :class="['flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2', newUser.role === 'super_admin' ? 'bg-white shadow-xs text-amber-700' : 'text-slate-500 hover:text-slate-900']"
              >
                <ShieldCheckIcon class="w-3.5 h-3.5" /> Super Admin
              </button>
            </div>
            <p v-if="!authStore.isSuperAdmin" class="text-[9px] text-slate-400 ml-1">
              Les droits d'administrateur sont réservés au Super Admin.
            </p>
          </div>

          <!-- Documents / Photos -->
          <div class="space-y-2">
            <Label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Photos / Pièces d'Identité (Optionnel)</Label>
            <div class="flex flex-wrap gap-3">
              <div v-for="(photo, idx) in newUser.photos" :key="idx" class="relative group w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                <img :src="photo" class="w-full h-full object-cover" />
                <button @click="removePhoto(newUser.photos, idx)" type="button" class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <X class="w-5 h-5" />
                </button>
              </div>
              <label class="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-indigo-600">
                <ImageIcon class="w-5 h-5 mb-1" />
                <span class="text-[8px] uppercase font-black tracking-wider">Ajouter</span>
                <input type="file" class="hidden" multiple accept="image/*" @change="(e) => onFileChange(e, newUser.photos)" />
              </label>
            </div>
          </div>

          <DialogFooter class="pt-4 border-t border-slate-100 flex gap-3">
            <Button variant="ghost" type="button" @click="isAddModalOpen = false" class="flex-1 h-12 font-black uppercase tracking-widest text-[10px] rounded-xl text-slate-400 hover:text-slate-900">
              Annuler
            </Button>
            <Button type="submit" class="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50" :disabled="isSaving">
              <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin mr-2" />
              Inscrire l'Opérateur
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- EDIT USER MODAL -->
    <Dialog v-model:open="isEditModalOpen">
      <DialogContent class="sm:max-w-lg bg-white rounded-3xl p-0 overflow-hidden text-slate-900 border border-slate-200 shadow-2xl max-h-[92vh] flex flex-col">
        <DialogHeader class="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative shrink-0">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white">
              <Pencil class="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <DialogTitle class="text-xl font-black uppercase tracking-tight text-white">
                Modifier Opérateur
              </DialogTitle>
              <DialogDescription class="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                Mise à jour des coordonnées et privilèges
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form @submit.prevent="handleUpdateUser" class="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label for="editFirstName" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prénom</Label>
              <Input id="editFirstName" v-model="editUser.firstName" class="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-xs" required />
            </div>
            <div class="space-y-1.5">
              <Label for="editLastName" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom</Label>
              <Input id="editLastName" v-model="editUser.lastName" class="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-xs" required />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label for="editCin" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">CIN (Identifiant)</Label>
              <Input id="editCin" v-model="editUser.cin" class="h-11 bg-slate-50 border-slate-200 rounded-xl font-mono font-bold text-xs uppercase" required />
            </div>
            <div class="space-y-1.5">
              <Label for="editPhone" class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Téléphone</Label>
              <Input id="editPhone" v-model="editUser.phone" disabled class="h-11 bg-slate-50 border-slate-200 rounded-xl font-bold text-xs opacity-60 cursor-not-allowed" />
            </div>
          </div>

          <!-- Role Edit -->
          <div class="space-y-2">
            <Label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Rôle Système</Label>
            <div v-if="authStore.isSuperAdmin" class="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-full">
              <button 
                type="button" 
                @click="editUser.role = 'user'" 
                :class="['flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2', editUser.role === 'user' ? 'bg-white shadow-xs text-indigo-700' : 'text-slate-500 hover:text-slate-900']"
              >
                <User class="w-3.5 h-3.5" /> Opérateur
              </button>
              <button 
                type="button" 
                @click="editUser.role = 'admin'" 
                :class="['flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2', editUser.role === 'admin' ? 'bg-white shadow-xs text-rose-700' : 'text-slate-500 hover:text-slate-900']"
              >
                <Shield class="w-3.5 h-3.5" /> Admin
              </button>
              <button 
                type="button" 
                @click="editUser.role = 'super_admin'" 
                :class="['flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2', editUser.role === 'super_admin' ? 'bg-white shadow-xs text-amber-700' : 'text-slate-500 hover:text-slate-900']"
              >
                <ShieldCheckIcon class="w-3.5 h-3.5" /> Super Admin
              </button>
            </div>
            <div v-else class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
              Rôle actuel : {{ editUser.role }} (réservé au Super Admin)
            </div>
          </div>

          <!-- Photos -->
          <div class="space-y-2">
            <Label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Documents / Photos</Label>
            <div class="flex flex-wrap gap-3">
              <div v-for="(photo, idx) in editUser.photos" :key="idx" class="relative group w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                <img :src="photo" class="w-full h-full object-cover" />
                <button @click="removePhoto(editUser.photos, idx)" type="button" class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <X class="w-5 h-5" />
                </button>
              </div>
              <label class="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 transition-all flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-indigo-600">
                <ImageIcon class="w-5 h-5 mb-1" />
                <span class="text-[8px] uppercase font-black tracking-wider">Ajouter</span>
                <input type="file" class="hidden" multiple accept="image/*" @change="(e) => onFileChange(e, editUser.photos)" />
              </label>
            </div>
          </div>

          <DialogFooter class="pt-4 border-t border-slate-100 flex gap-3">
            <Button variant="ghost" type="button" @click="isEditModalOpen = false" class="flex-1 h-12 font-black uppercase tracking-widest text-[10px] rounded-xl text-slate-400 hover:text-slate-900">
              Annuler
            </Button>
            <Button type="submit" class="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50" :disabled="isSaving">
              <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- PROFILE MODAL (Super Admin) -->
    <Dialog v-model:open="isProfileOpen">
      <DialogContent class="sm:max-w-md bg-white rounded-3xl p-0 overflow-hidden text-slate-900 border border-slate-200 shadow-2xl">
        <DialogHeader class="p-6 bg-gradient-to-r from-amber-600 to-amber-700 text-white relative">
          <div class="flex items-center gap-4">
            <Avatar class="w-14 h-14 border-2 border-white/40 shadow-sm shrink-0">
              <AvatarImage v-if="profileUser?.photos?.[0]" :src="profileUser?.photos?.[0]" />
              <AvatarFallback class="bg-white/20 text-white font-black text-xl">
                {{ profileUser?.lastName?.[0] }}{{ profileUser?.firstName?.[0] }}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle class="text-xl font-black uppercase tracking-tight text-white">
                {{ profileUser?.lastName }} {{ profileUser?.firstName }}
              </DialogTitle>
              <DialogDescription class="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                Fiche détaillée & Identifiants d'accès
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="p-6 space-y-5">
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Identifiant / CIN</span>
              <span class="font-mono font-bold text-slate-900 text-sm mt-0.5 block uppercase">{{ profileUser?.cin || '—' }}</span>
            </div>
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Téléphone</span>
              <span class="font-bold text-slate-900 text-sm mt-0.5 block">{{ profileUser?.phone || '—' }}</span>
            </div>
          </div>

          <!-- Password Revelation Box -->
          <div class="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase tracking-wider text-amber-900">Mot de Passe du Compte</span>
              <Badge class="bg-amber-200 text-amber-800 border-none text-[8px] font-black uppercase px-2 py-0.5 rounded-md">
                Confidentiel
              </Badge>
            </div>
            <div class="flex items-center justify-between bg-white p-3 rounded-xl border border-amber-200">
              <div class="flex items-center gap-2 min-w-0">
                <KeyRound class="w-4 h-4 text-amber-600 shrink-0" />
                <span class="font-mono font-black text-sm tracking-widest text-slate-900 truncate">
                  {{ showProfilePwd ? revealedPassword : '••••••••' }}
                </span>
              </div>
              <button 
                type="button" 
                @click="toggleReveal"
                class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600 transition-all shrink-0"
                :disabled="isRevealing"
              >
                <EyeOff v-if="showProfilePwd" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
            <p class="text-[9px] text-amber-800">
              Cliquez sur l'icône pour révéler le mot de passe (mot de passe Super Admin requis).
            </p>
          </div>

          <DialogFooter class="pt-2">
            <Button type="button" @click="isProfileOpen = false" class="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase tracking-widest text-[10px]">
              Fermer
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>

    <!-- PASSWORD CONFIRM FOR REVEAL -->
    <PasswordConfirmDialog
      v-model:open="revealOpen"
      v-model:password="revealAdminPassword"
      title="Autorisation"
      subtitle="Requise"
      :description="`Mot de passe requis pour révéler les accès de ${profileUser?.lastName || ''} ${profileUser?.firstName || ''}.`"
      placeholder="••••••••"
      confirm-label="Révéler"
      loading-label="Vérification..."
      :loading="isRevealing"
      @confirm="submitReveal"
    />

  </div>
</template>

<style scoped>
.user-management {
  font-family: 'Inter', sans-serif;
}
</style>
