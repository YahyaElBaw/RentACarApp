<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { agenceApi, settingApi, uploadApi, getImageUrl } from '@/api'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'
import { usePasswordGuard, isPasswordError, LOCK_SECONDS } from '@/composables/usePasswordGuard'
import { Building2, Trash2, Loader2, Upload, Plus, ChevronRight, Lock } from 'lucide-vue-next'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const guard = usePasswordGuard()

const loading = ref(false)
const hoverOpenNew = ref(false)

const agenciesList = ref<any[]>([])
const newAgency = ref('')

const showCreateModal = ref(false)
const creatingAgency = ref(false)
const uploadingImage = ref(false)
const newAgenceName = ref('')
const newAgenceImage = ref('')
const templateFileInput = ref<HTMLInputElement | null>(null)

const showDeleteModal = ref(false)
const deletingAgency = ref(false)
const deletePassword = ref('')
const agencyToDelete = ref<any>(null)

const loadData = async () => {
  loading.value = true
  try {
    agenciesList.value = await agenceApi.getAll()
  } catch (err) {
    console.error('Failed to load agences', err)
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Echec du chargement des agences.',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

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
      detail: 'Le design du contrat a été chargé.',
      life: 2000
    })
  } catch (err) {
    console.error('Upload failed', err)
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Echec du téléversement de l\'image.',
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
      summary: 'Agence Supprimee',
      detail: `"${agencyToDelete.value.name}" a ete supprimee.`,
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
      detail: 'Echec de la suppression de l\'agence.',
      life: 3000
    })
  } finally {
    deletingAgency.value = false
  }
}
</script>

<template>
  <div class="agence-view p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div class="space-y-2">
        <h1 class="text-4xl font-black uppercase tracking-tighter flex items-center gap-4">
          Gestion <span class="text-indigo-600">des Agences</span>
        </h1>
        <p class="text-[10px] uppercase tracking-widest font-black opacity-60">Agences de location et personnalisation des contrats</p>
      </div>

      <Button @click="openCreateModal" @mouseenter="hoverOpenNew = true" @mouseleave="hoverOpenNew = false" :class="'group relative h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-2xl shadow-indigo-200 transition-all duration-300 overflow-hidden flex items-center justify-start active:scale-95 hover:scale-105 hover:-translate-y-0.5 hover:shadow-indigo-400/40 ' + (hoverOpenNew ? 'w-48' : 'w-12')">
        <div class="absolute inset-y-0 left-0 flex items-center pl-3.5">
          <Plus class="w-4 h-4 stroke-[3] transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
        </div>
        <span :class="[hoverOpenNew ? 'opacity-100' : 'opacity-0', 'whitespace-nowrap transition-all duration-300 pl-10 pr-4 uppercase tracking-widest text-[10px]']">
          Nouvelle Agence
        </span>
      </Button>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else class="space-y-8">
      <Card class="border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader class="bg-indigo-50/50 p-8">
          <CardTitle class="text-xl font-black text-indigo-900 uppercase flex items-center gap-3">
            <Building2 class="w-5 h-5 text-indigo-600" /> Liste des Agences
          </CardTitle>
          <CardDescription class="text-[10px] font-black uppercase tracking-widest text-indigo-600/60 mt-2">Cliquez sur une agence pour consulter son profil et son modèle de contrat.</CardDescription>
        </CardHeader>
        <CardContent class="p-8">
          <div v-if="agenciesList.length > 0" class="space-y-3">
            <div
              v-for="agency in agenciesList"
              :key="agency._id"
              @click="router.push('/agences/' + agency._id)"
              class="flex items-center justify-between bg-slate-50/80 hover:bg-indigo-50/60 hover:border-indigo-200 rounded-2xl px-6 py-4 transition-all group border border-slate-100 cursor-pointer"
            >
              <div class="flex items-center gap-4 min-w-0">
                <div v-if="agency.templateImage" class="w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-200 shadow-sm shrink-0 flex items-center justify-center">
                  <img :src="getImageUrl(agency.templateImage)" class="w-full h-full object-contain" />
                </div>
                <div v-else class="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Building2 class="w-5 h-5" />
                </div>
                <div class="min-w-0">
                  <span class="font-black text-sm text-slate-800 uppercase tracking-wide block truncate">{{ agency.name }}</span>
                  <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {{ agency.templateFields?.length || 0 }} champ(s) configuré(s) · {{ agency.templateImage ? 'Modèle téléversé' : 'Aucun modèle' }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-3 shrink-0">
                <button v-if="authStore.isSuperAdmin" @click.stop="removeAgency(agency)" :disabled="deletingAgency" class="flex items-center gap-2 text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl hover:bg-rose-50">
                  <Trash2 class="w-3.5 h-3.5" /> Supprimer
                </button>
                <ChevronRight class="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>

          <div v-else class="text-center py-16 border-2 border-dashed border-slate-200 rounded-[2rem]">
            <Building2 class="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p class="text-slate-400 font-black uppercase tracking-widest text-xs">Aucune agence configuree</p>
            <p class="text-slate-300 font-bold text-[10px] mt-2">Ajoutez votre premiere agence via le bouton "Nouvelle Agence"</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- CREATE AGENCE MODAL -->
    <Dialog v-model:open="showCreateModal">
      <DialogContent class="sm:max-w-[520px] bg-white/95 backdrop-blur-3xl border border-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.3)] rounded-[3rem] p-0 overflow-hidden text-slate-900 max-h-[90vh] flex flex-col">
        <DialogHeader class="p-10 bg-indigo-600 text-white relative overflow-hidden">
          <div class="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl opacity-50"></div>
          <div class="flex items-center gap-4 relative z-10">
            <div class="p-3 bg-white/20 rounded-2xl shadow-inner backdrop-blur-md">
              <Building2 class="w-7 h-7 text-white stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle class="text-2xl font-black uppercase tracking-tight text-white italic">
                Nouvelle <span class="text-indigo-200">Agence</span>
              </DialogTitle>
              <DialogDescription class="text-white/60 text-[10px] font-black uppercase tracking-widest mt-1">
                Informations et design du contrat.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="p-10 space-y-8 overflow-y-auto max-h-[65vh] bg-transparent">
          <div class="space-y-2">
            <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom de l'Agence</Label>
            <Input v-model="newAgenceName" placeholder="Ex: Agence Djerba" @keydown.enter="createAgence" class="h-14 bg-slate-50 border-slate-100 focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600/50 rounded-2xl font-black transition-all" />
          </div>

          <div class="space-y-2">
            <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Image du Contrat (Papier Pré-imprimé)</Label>
            <input ref="templateFileInput" type="file" accept="image/*" class="hidden" @change="handleTemplateUpload" />
            <div
              @click="triggerTemplateUpload"
              :class="['relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden', newAgenceImage ? 'border-indigo-300' : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30']"
            >
              <div v-if="newAgenceImage" class="aspect-[4/3] relative">
                <img :src="getImageUrl(newAgenceImage)" class="absolute inset-0 w-full h-full object-contain p-3 bg-slate-50" />
                <span class="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-indigo-600 shadow-sm">Modèle chargé</span>
              </div>
              <div v-else class="h-40 flex flex-col items-center justify-center gap-3">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100 text-slate-400">
                  <Upload class="w-5 h-5" />
                </div>
                <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cliquer pour téléverser l'image du contrat</p>
                <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">PNG, JPG — A4 / A4 paysage</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter class="p-10 bg-slate-50/50 border-t border-slate-100 flex gap-4 shrink-0">
          <Button variant="ghost" @click="showCreateModal = false" class="flex-1 h-14 font-black uppercase tracking-widest text-[10px] rounded-2xl text-slate-400 hover:text-slate-900 transition-all">Annuler</Button>
          <Button @click="createAgence" :disabled="creatingAgency || !newAgenceName.trim()" class="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-40">
            <Loader2 v-if="creatingAgency" class="w-4 h-4 animate-spin mr-2" />
            {{ creatingAgency ? 'Creation...' : 'Créer l\'Agence' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- DELETE AGENCE MODAL -->
    <Dialog v-model:open="showDeleteModal">
      <DialogContent class="sm:max-w-md bg-white border-none shadow-[0_20px_60px_rgba(0,0,0,0.3)] rounded-[2.5rem] p-8">
        <DialogHeader class="mb-4 text-center">
          <DialogTitle class="text-xl font-black text-rose-600 uppercase italic tracking-tighter">Supprimer <span class="text-slate-900">l'Agence</span></DialogTitle>
          <DialogDescription class="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">
            {{ agencyToDelete?.name }} — Cette action est définitive et irréversible.
          </DialogDescription>
        </DialogHeader>
        <div v-if="guard.isLocked" class="flex items-center justify-center gap-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl px-4 py-3 mb-4">
          <Lock class="w-4 h-4" />
          <span class="text-[10px] font-black uppercase tracking-widest">Trop de tentatives — réessayez dans {{ guard.remainingSeconds }}s</span>
        </div>
        <div class="space-y-2 mb-4">
          <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mot de passe Super Admin</Label>
          <div class="relative">
            <Lock class="w-4 h-4 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
            <Input type="password" v-model="deletePassword" :disabled="guard.isLocked" placeholder="Configuration requise..." class="h-14 bg-rose-50 border-rose-100 placeholder:text-rose-300 text-rose-700 rounded-2xl font-black font-mono tracking-widest pl-12" @keydown.enter="executeDelete" />
          </div>
        </div>
        <DialogFooter class="mt-6 border-t border-slate-100 pt-6">
          <Button variant="ghost" @click="showDeleteModal = false" class="w-full h-12 font-black uppercase text-[10px] tracking-widest rounded-xl text-slate-400">Annuler</Button>
          <Button @click="executeDelete" :disabled="deletingAgency || !deletePassword || guard.isLocked" class="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-rose-200">
            <Loader2 v-if="deletingAgency" class="w-4 h-4 animate-spin mr-2" />
            {{ deletingAgency ? 'Suppression...' : 'Confirmer la Suppression' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.agence-view {
  font-family: 'Inter', sans-serif;
}
</style>
