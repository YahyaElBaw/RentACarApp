<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { userApi } from '@/api'
import { Plus, Search, UserPlus, Shield, User, Phone, ImageIcon, Trash2, Pencil, Loader2, X } from 'lucide-vue-next'
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
import { Label } from '@/components/ui/label'

interface UserRecord {
  _id?: string
  firstName: string
  lastName: string
  cin: string
  phone: string
  role: string
  photos: string[]
}

const users = ref<UserRecord[]>([])
const loading = ref(true)
const searchQuery = ref('')
const isAddModalOpen = ref(false)
const isSaving = ref(false)

const newUser = reactive<UserRecord>({
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

const onFileChange = (e: any) => {
  const files = e.target.files
  if (!files.length) return
  
  // Base64 conversion
  Array.from(files).forEach((file: any) => {
    const reader = new FileReader()
    reader.onload = (event: any) => {
      newUser.photos.push(event.target.result)
    }
    reader.readAsDataURL(file)
  })
}

const removePhoto = (index: number) => {
  newUser.photos.splice(index, 1)
}
</script>

<template>
  <div class="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
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
          <Button class="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-3">
            <UserPlus class="w-5 h-5" />
            <span class="uppercase tracking-widest text-[10px] font-black">Nouvel Opérateur</span>
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
                <Label for="phone" class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tél (Password)</Label>
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
                <button type="button" @click="newUser.role = 'admin'" 
                        :class="['flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2', newUser.role === 'admin' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700']">
                  <Shield class="w-4 h-4" /> Admin
                </button>
              </div>
            </div>

            <div class="space-y-4">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Documents (Base64 Photos)</Label>
              <div class="flex flex-wrap gap-4">
                 <div v-for="(photo, idx) in newUser.photos" :key="idx" class="relative group w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img :src="photo" class="w-full h-full object-cover" />
                    <button @click="removePhoto(idx)" type="button" class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                       <X class="w-6 h-6" />
                    </button>
                 </div>
                 <label class="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-600/50 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-indigo-600 group">
                    <ImageIcon class="w-7 h-7 mb-1 transition-transform group-hover:scale-110" />
                    <span class="text-[8px] uppercase font-black tracking-widest">Ajouter</span>
                    <input type="file" class="hidden" multiple accept="image/*" @change="onFileChange" />
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
    </div>

    <!-- Main Content Card (Glass Design) -->
    <Card class="border border-slate-200/50 shadow-3xl rounded-[3rem] overflow-hidden bg-white/70 backdrop-blur-3xl">
      <CardHeader class="border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between py-10 px-12 relative overflow-hidden">
        <div class="absolute -top-12 -right-12 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl opacity-50"></div>
        <CardTitle class="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] relative z-10 italic">Répertoire Opérateurs</CardTitle>
        <div class="relative w-80 z-10 group">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          <Input v-model="searchQuery" placeholder="Nom ou identifiant..." class="pl-12 h-12 rounded-2xl border-slate-200 bg-white/50 font-bold text-slate-900 focus:ring-4 focus:ring-indigo-600/5 transition-all shadow-sm" />
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
                    userIter.role === 'admin' 
                      ? 'bg-rose-50 text-rose-600 border-rose-100' 
                      : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  ]">
                     {{ userIter.role === 'admin' ? 'Adminsitrateur' : 'Opérateur Standard' }}
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
                      <Button variant="secondary" size="icon" class="h-11 w-11 rounded-xl bg-slate-100 hover:bg-indigo-600 text-slate-400 hover:text-white transition-all">
                         <Pencil class="w-4 h-4 stroke-[2.5]" />
                      </Button>
                      <Button variant="secondary" size="icon" class="h-11 w-11 rounded-xl bg-slate-100 hover:bg-rose-500 text-slate-400 hover:text-white transition-all">
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
  </div>
</template>

<style scoped>
.font-outfit {
  font-family: 'Outfit', sans-serif;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-in {
  animation: fade-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

:deep(.dialog-blur) {
  backdrop-filter: blur(20px);
}
</style>
