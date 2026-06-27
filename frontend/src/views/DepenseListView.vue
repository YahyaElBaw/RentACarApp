<template>
  <div class="depense-list-container space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-1000 p-8 max-w-7xl mx-auto">
    <!-- Header & Integrated Action Bar -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
      <div class="space-y-2">
        <h1 class="text-4xl font-black tracking-tight text-slate-900 uppercase italic">Flux de <span class="text-rose-600">Trésorerie</span></h1>
        <p class="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] pl-1">Gestion des Dépenses & Maintenance</p>
      </div>

      <div class="flex flex-wrap items-center gap-4">
        <div class="relative w-full md:w-80 group">
          <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search class="w-4 h-4 text-slate-400 group-focus-within:text-rose-600 transition-colors" />
          </div>
          <Input 
            v-model="filters.query" 
            placeholder="Rechercher une dépense..." 
            class="h-14 pl-12 bg-white/50 border-slate-200 backdrop-blur-xl focus:ring-4 focus:ring-rose-600/5 rounded-2xl font-bold transition-all text-slate-900 placeholder:text-slate-400 :text-slate-600 outline-none"
          />
        </div>

        <Button @click="openForm()" class="h-14 px-8 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl shadow-2xl shadow-rose-600/20 transition-all active:scale-95 flex items-center gap-3">
          <Plus class="w-5 h-5 stroke-[3]" />
          <span class="uppercase tracking-widest text-[10px]">Nouvelle Dépense</span>
        </Button>
      </div>
    </div>

    <!-- Main Table Card (Glass Design) -->
    <Card class="border border-slate-200/50 shadow-3xl bg-white/70 backdrop-blur-3xl overflow-hidden rounded-[2.5rem]">
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow class="bg-slate-50/50 border-b border-slate-100">
                <TableHead class="pl-10 py-6 text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">DATE & CATÉGORIE</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">VÉHICULE CONCERNÉ</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">DESCRIPTION</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase text-right">MONTANT</TableHead>
                <TableHead class="pr-10 text-right text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">GESTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow 
                v-for="depense in depenses" 
                :key="depense._id"
                class="group border-slate-100 transition-all duration-500 cursor-pointer hover:bg-rose-50/40 :bg-rose-900/10 relative active:scale-[0.998]"
              >
                <TableCell class="pl-10 py-7">
                  <div class="flex flex-col gap-1.5">
                    <div class="flex items-center gap-2">
                       <Calendar class="w-3.5 h-3.5 text-rose-600" />
                       <span class="text-[13px] font-black text-slate-900 tabular-nums lowercase">{{ formatDate(depense.date) }}</span>
                    </div>
                    <Badge variant="outline" class="w-fit text-[8px] font-black uppercase tracking-tighter px-2 py-0 border-slate-200 bg-white/50 shadow-sm text-slate-900 font-mono">
                       {{ depense.category }}
                    </Badge>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div class="flex flex-col gap-0.5">
                    <div class="flex items-center gap-2" v-if="depense.car">
                      <CarIcon class="w-3.5 h-3.5 text-slate-400" />
                      <span class="font-black text-slate-800 uppercase italic text-sm">{{ depense.car.brand }} {{ depense.car.model }}</span>
                    </div>
                    <span class="text-[10px] font-bold text-slate-400 tabular-nums pl-5" v-if="depense.car">{{ depense.car.matricule }}</span>
                    <span v-else class="text-[10px] font-bold text-slate-300 italic uppercase">Frais Généraux</span>
                  </div>
                </TableCell>

                <TableCell>
                  <p class="text-xs font-bold text-slate-500 max-w-xs leading-relaxed">{{ depense.description || 'Aucune description' }}</p>
                </TableCell>

                <TableCell class="text-right">
                   <div class="flex flex-col items-end">
                      <span class="text-lg font-black text-rose-600 tabular-nums tracking-tighter group-hover:scale-110 transition-transform duration-500">{{ depense.amount }} <span class="text-[9px] opacity-60">TND</span></span>
                      <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest">Payé / ESPÈCES</span>
                   </div>
                </TableCell>

                <TableCell class="pr-10 text-right">
                  <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 duration-500">
                    <Button 
                      v-if="isAdmin"
                      variant="secondary" 
                      size="icon" 
                      @click.stop="openForm(depense)"
                      class="h-11 w-11 text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-all"
                    >
                      <Pencil class="w-4 h-4 stroke-[2.5]" />
                    </Button>
                    <Button 
                      v-if="isAdmin"
                      variant="secondary" 
                      size="icon" 
                      @click.stop="deleteDepense(depense._id)"
                      class="h-11 w-11 text-slate-400 hover:text-rose-500 :text-rose-400 hover:bg-rose-500/10 :bg-rose-900/40 rounded-xl transition-all"
                    >
                      <Trash2 class="w-4 h-4 stroke-[2.5]" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              
              <TableRow v-if="depenses.length === 0 && !loading">
                <TableCell colspan="5" class="h-60 text-center">
                  <div class="flex flex-col items-center gap-4 opacity-30">
                    <ReceiptIcon class="w-16 h-16 stroke-[1]" />
                    <p class="font-black uppercase tracking-[0.3em] text-xs text-slate-500">Aucune dépense enregistrée</p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Form Modal -->
    <Dialog v-model:open="showForm">
      <DialogContent class="sm:max-w-md bg-white border-none shadow-2xl rounded-[2rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader class="mb-4">
          <DialogTitle class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{{ editingId ? 'Modifier la' : 'Nouvelle' }} <span class="text-rose-600">Dépense</span></DialogTitle>
          <p class="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Enregistrement comptable</p>
        </DialogHeader>
        
        <div class="space-y-4">
          <div class="space-y-2">
            <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</Label>
            <Input type="date" v-model="depenseForm.date" class="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Montant (TND)</Label>
              <Input type="number" v-model="depenseForm.amount" class="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold tabular-nums text-rose-600" />
            </div>
            <div class="space-y-2">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catégorie</Label>
              <select v-model="depenseForm.category" class="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-black text-slate-700 outline-none">
                <option value="mechanique">Mechanique</option>
                <option value="vidange">Vidange</option>
                <option value="lavage">Lavage</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>
          <div class="space-y-2">
            <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Véhicule (Optionnel)</Label>
            <select v-model="depenseForm.car" class="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-black text-slate-700 outline-none">
              <option value="">Frais Généraux (Aucun véhicule)</option>
              <option v-for="car in cars" :key="car._id" :value="car._id">{{ car.brand }} {{ car.model }} ({{ car.matricule }})</option>
            </select>
          </div>
          <div class="space-y-2">
            <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</Label>
            <Input v-model="depenseForm.description" placeholder="Détails de la dépense..." class="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
          </div>
        </div>
        
        <DialogFooter class="mt-6 border-t border-slate-100 pt-6">
          <Button variant="ghost" @click="showForm = false" class="w-full h-12 font-black uppercase text-[10px] tracking-widest rounded-xl text-slate-400">Annuler</Button>
          <Button @click="saveDepense" :disabled="submitting || !depenseForm.amount || !depenseForm.category" class="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-rose-200">
            {{ submitting ? 'Enregistrement...' : 'Enregistrer' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed } from 'vue';
import api from '../api';
import { formatDate } from '@/lib/utils';
import { 
  Search, Plus, Calendar, 
  Car as CarIcon, Trash2, Pencil,
  Receipt as ReceiptIcon 
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell 
} from '@/components/ui/table';
import { depenseApi, carApi } from '../api';

const depenses = ref<any[]>([]);
const cars = ref<any[]>([]);
const loading = ref(true);
const showForm = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);
const depenseForm = reactive({
  date: '',
  amount: 0,
  category: 'mechanique',
  description: '',
  car: ''
});

const isAdmin = computed(() => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.role === 'admin';
});

const filters = reactive({
  query: '',
  category: null
});

const loadDepenses = async () => {
  loading.value = true;
  try {
    const res = await api.get('/depenses');
    depenses.value = res.data;
  } catch (err) {
    console.error('Failed to load expenses', err);
  } finally {
    loading.value = false;
  }
};

const deleteDepense = async (id: string) => {
  if (!confirm('Souhaitez-vous vraiment supprimer ce frais ?')) return;
  try {
    await api.delete(`/depenses/${id}`);
    loadDepenses();
  } catch (err) {
    console.error('Failed to delete expense', err);
  }
};

onMounted(async () => {
  await loadDepenses();
});
watch(filters, loadDepenses, { deep: true });

const openForm = async (depense?: any) => {
  if (depense) {
    editingId.value = depense._id;
    depenseForm.date = depense.date ? new Date(depense.date).toISOString().split('T')[0] : '';
    depenseForm.amount = depense.amount;
    depenseForm.category = depense.category;
    depenseForm.description = depense.description;
    depenseForm.car = depense.car?._id || depense.car || '';
  } else {
    editingId.value = null;
    depenseForm.date = new Date().toISOString().split('T')[0];
    depenseForm.amount = 0;
    depenseForm.category = 'mechanique';
    depenseForm.description = '';
    depenseForm.car = '';
  }
  
  if (cars.value.length === 0) {
    cars.value = await carApi.getAll();
  }
  showForm.value = true;
};

const saveDepense = async () => {
  submitting.value = true;
  try {
    const payload = { ...depenseForm };
    if (!payload.car) delete (payload as any).car;
    
    if (editingId.value) {
      await depenseApi.update(editingId.value, payload);
    } else {
      await depenseApi.create(payload);
    }
    
    showForm.value = false;
    await loadDepenses();
  } catch (err) {
    console.error('Failed to save depense', err);
    alert('Erreur lors de l\'enregistrement de la dépense.');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.depense-list-container {
  font-family: 'Inter', sans-serif;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-in {
  animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
