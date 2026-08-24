<template>
  <div class="depense-list-container space-y-12 p-8 max-w-7xl mx-auto">
    <!-- Header & Integrated Action Bar -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
      <div class="space-y-2">
        <h1 class="text-4xl font-black tracking-tight text-slate-900 uppercase italic">Flux de <span class="text-rose-600">Trésorerie</span></h1>
        <p class="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] pl-1">Gestion des Dépenses & Maintenance</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="group relative h-12 w-12 transition-all duration-300 overflow-hidden rounded-2xl bg-white border-2 border-slate-200 hover:border-rose-400 flex items-center cursor-text active:scale-95 hover:shadow-xl hover:shadow-rose-200/50"
          :class="searchOpen ? 'w-80 border-rose-500' : 'w-12'"
          @mouseenter="searchOpen = true"
          @mouseleave="searchOpen = false"
          @focusin="searchOpen = true"
          @focusout="searchOpen = false">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Search class="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors duration-300" />
          </div>
          <input
            v-model="filters.query"
            placeholder="Rechercher une dépense..."
            :class="[searchOpen ? 'opacity-100' : 'opacity-0', 'h-full w-full pl-10 pr-3 bg-transparent border-0 outline-none text-xs font-bold text-slate-900 placeholder:text-slate-400 transition-opacity duration-300']"
          />
        </div>

        <div class="relative">
          <div class="group relative h-12 transition-all duration-300 overflow-hidden rounded-2xl bg-white border-2 border-slate-200 hover:border-rose-400 flex items-center active:scale-95 hover:shadow-xl hover:shadow-rose-200/50"
            :class="filterHover ? 'w-52' : 'w-12'"
            @mouseenter="filterHover = true"
            @mouseleave="filterHover = false">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Filter class="w-4 h-4 text-slate-400 group-hover:text-rose-600 transition-colors duration-300 group-hover:rotate-[-20deg] group-hover:scale-110" />
              <span v-if="filters.category" class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
            </div>
            <button @click="showFilterMenu = !showFilterMenu" class="w-full h-full pl-11 pr-2 flex items-center whitespace-nowrap cursor-pointer bg-transparent border-0 text-left">
              <span :class="[filterHover ? 'opacity-100' : 'opacity-0', 'transition-all duration-300 uppercase tracking-widest text-[10px] font-black text-slate-600 group-hover:text-rose-600']">
                {{ filters.category ? catLabel(filters.category) : 'Filtrer' }}
              </span>
            </button>
          </div>
          <div v-if="showFilterMenu" class="absolute right-0 top-14 w-48 bg-white border border-slate-100 rounded-3xl shadow-3xl overflow-hidden z-50 py-2">
            <button @click="filters.category = null; showFilterMenu = false" class="w-full text-left px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-rose-600 flex items-center justify-between">
              Toutes
              <Check v-if="!filters.category" class="w-4 h-4" />
            </button>
            <button v-for="cat in categoryOptions" :key="cat.value" @click="filters.category = cat.value; showFilterMenu = false" class="w-full text-left px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-between">
              {{ cat.label }}
              <Check v-if="filters.category === cat.value" class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div class="relative">
          <div class="group relative h-12 transition-all duration-300 overflow-hidden rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-400 flex items-center active:scale-95 hover:shadow-xl hover:shadow-indigo-200/50"
            :class="settingsOpen ? 'w-52' : 'w-12'"
            @mouseenter="settingsOpen = true"
            @mouseleave="settingsOpen = false">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <SettingsIcon class="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors duration-300 group-hover:rotate-90" />
            </div>
            <button @click="router.push('/settings')" class="w-full h-full pl-11 pr-2 flex items-center whitespace-nowrap cursor-pointer bg-transparent border-0 text-left">
              <span :class="[settingsOpen ? 'opacity-100' : 'opacity-0', 'transition-all duration-300 uppercase tracking-widest text-[10px] font-black text-slate-600 group-hover:text-indigo-600']">
                Parametres Depense
              </span>
            </button>
          </div>
        </div>

        <Button @click="openForm()" @mouseenter="addOpen = true" @mouseleave="addOpen = false" class="group relative h-12 w-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-2xl shadow-rose-600/20 transition-all duration-300 overflow-hidden flex items-center justify-start active:scale-95 hover:scale-105 hover:-translate-y-0.5 hover:shadow-rose-400/40">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Plus class="w-4 h-4 stroke-[3] transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
          </div>
          <span :class="[addOpen ? 'opacity-100' : 'opacity-0', 'whitespace-nowrap transition-all duration-300 pl-10 pr-4 uppercase tracking-widest text-[10px]']">Nouvelle Dépense</span>
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
                v-for="depense in filteredDepenses" 
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
                        {{ catLabel(depense.category) }}
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
                    <span v-else class="text-[10px] font-bold text-slate-300 italic uppercase">Depense Generale</span>
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
      <DialogContent class="sm:max-w-5xl bg-white border-none shadow-2xl rounded-[2rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader class="mb-4">
          <DialogTitle class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">{{ editingId ? 'Modifier la' : 'Nouvelle' }} <span class="text-rose-600">Dépense</span></DialogTitle>
          <p class="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Enregistrement comptable</p>
        </DialogHeader>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- LEFT: FORM -->
          <div class="space-y-4">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-8 h-8 rounded-xl bg-rose-600/10 flex items-center justify-center">
                <Plus class="w-4 h-4 text-rose-600" />
              </div>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saisie de la dépense</p>
            </div>

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
                <select
                  v-model="depenseForm.category"
                  :disabled="categoryDisabled"
                  :class="['w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-black text-slate-700 outline-none', categoryDisabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : '']"
                >
                  <option v-for="cat in categoryOptions" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
                </select>
                <p v-if="categoryDisabled" class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Depense generale — categorie fixe</p>
              </div>
            </div>
            <div class="space-y-2">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vehicule (Optionnel)</Label>
              <select v-model="depenseForm.car" class="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-black text-slate-700 outline-none">
                <option value="">Depense Generale (Aucun vehicule)</option>
                <option v-for="car in cars" :key="car._id" :value="car._id">{{ car.brand }} {{ car.model }} ({{ car.matricule }})</option>
              </select>
            </div>
            <div class="space-y-2">
              <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</Label>
              <Input v-model="depenseForm.description" placeholder="Détails de la dépense..." class="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
            </div>

            <Button 
              v-if="!editingId"
              @click="addToPending" 
              :disabled="!depenseForm.amount || !depenseForm.category"
              class="w-full h-12 bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all mt-2"
            >
              <Plus class="w-4 h-4" />
              Ajouter à la liste
            </Button>
          </div>

          <!-- RIGHT: PENDING LIST -->
          <div class="flex flex-col bg-slate-50/70 border border-slate-100 rounded-[1.5rem] overflow-hidden">
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/60">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
                  <ReceiptIcon class="w-4 h-4 text-white" />
                </div>
                <div>
                  <p class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Dépenses à enregistrer</p>
                  <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                    {{ editingId ? 'Dépense en cours de modification' : pendingDepenses.length + ' dépense(s) en file' }}
                  </p>
                </div>
              </div>
              <Badge v-if="!editingId" class="bg-rose-600 text-white border-none text-[10px] font-black tracking-widest">{{ pendingDepenses.length }}</Badge>
            </div>

            <!-- Pending list -->
            <div class="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2 max-h-[420px]">
              <template v-if="editingId">
                <div class="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                  <div class="flex items-start justify-between gap-3">
                    <div class="space-y-1.5 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                         <Badge class="bg-rose-600/10 text-rose-600 border-none text-[8px] font-black uppercase tracking-widest">{{ catLabel(depenseForm.category) }}</Badge>
                        <span class="text-[10px] font-black text-slate-400 tabular-nums">{{ formatDate(depenseForm.date) }}</span>
                      </div>
                      <p class="text-xs font-bold text-slate-600 leading-tight break-words">{{ depenseForm.description || 'Aucune description' }}</p>
                      <p v-if="depenseForm.car" class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ carById[depenseForm.car]?.brand }} {{ carById[depenseForm.car]?.model }} ({{ carById[depenseForm.car]?.matricule }})</p>
                      <p class="text-lg font-black text-rose-600 tabular-nums tracking-tighter">{{ Number(depenseForm.amount) || 0 }} <span class="text-[9px] opacity-60">TND</span></p>
                    </div>
                  </div>
                </div>
              </template>

              <template v-else>
                <div v-for="(item, index) in pendingDepenses" :key="index" class="group bg-white border border-slate-100 rounded-2xl p-4 shadow-sm transition-all hover:border-rose-100">
                  <div class="flex items-start justify-between gap-3">
                    <div class="space-y-1.5 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <Badge class="bg-rose-600/10 text-rose-600 border-none text-[8px] font-black uppercase tracking-widest">{{ catLabel(item.category) }}</Badge>
                        <span class="text-[10px] font-black text-slate-400 tabular-nums">{{ formatDate(item.date) }}</span>
                      </div>
                      <p class="text-xs font-bold text-slate-600 leading-tight break-words">{{ item.description || 'Aucune description' }}</p>
                      <p v-if="item.car" class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ carById[item.car]?.brand }} {{ carById[item.car]?.model }} ({{ carById[item.car]?.matricule }})</p>
                      <p v-else class="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Depense Generale</p>
                    </div>
                    <div class="flex flex-col items-end gap-2 shrink-0">
                      <button @click="removeFromPending(index)" class="w-7 h-7 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-all">
                        <Trash2 class="w-4 h-4" />
                      </button>
                      <p class="text-lg font-black text-rose-600 tabular-nums tracking-tighter">{{ Number(item.amount) || 0 }} <span class="text-[9px] opacity-60">TND</span></p>
                    </div>
                  </div>
                </div>

                <div v-if="pendingDepenses.length === 0" class="py-16 text-center space-y-3">
                  <ReceiptIcon class="w-10 h-10 mx-auto text-slate-200" />
                  <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Aucune dépense en file</p>
                </div>
              </template>
            </div>

            <!-- Bottom: save all -->
            <div class="px-4 py-4 border-t border-slate-100 bg-white/70 space-y-3">
              <div v-if="!editingId" class="flex items-center justify-between px-2">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                <span class="text-xl font-black text-slate-900 tabular-nums tracking-tighter">{{ pendingTotal.toFixed(3) }} <span class="text-[9px] uppercase opacity-50">TND</span></span>
              </div>
              <Button 
                v-if="!editingId"
                @click="saveAllPending" 
                :disabled="submitting || pendingDepenses.length === 0"
                class="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-rose-200 disabled:opacity-40"
              >
                {{ submitting ? 'Enregistrement...' : `Enregistrer tout (${pendingDepenses.length})` }}
              </Button>
              <Button 
                v-else
                @click="updateDepense" 
                :disabled="submitting || !depenseForm.amount || !depenseForm.category"
                class="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-rose-200"
              >
                {{ submitting ? 'Enregistrement...' : 'Modifier la dépense' }}
              </Button>
              <Button variant="ghost" @click="showForm = false" class="w-full h-11 font-black uppercase text-[10px] tracking-widest rounded-xl text-slate-400">
                Annuler
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';
import { formatDate } from '@/lib/utils';
import { useToast } from 'primevue/usetoast';
import {
  Search, Plus, Calendar,
  Car as CarIcon, Trash2, Pencil,
  Receipt as ReceiptIcon, Filter, Check,
  Settings as SettingsIcon
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell 
} from '@/components/ui/table';
import { depenseApi, carApi, settingApi } from '../api';
import { useSocketStore } from '@/stores/socket';

const socketStore = useSocketStore();
let unsubscribeSocket: Function | null = null;
const router = useRouter();

const toast = useToast();
const depenses = ref<any[]>([]);
const cars = ref<any[]>([]);
const loading = ref(true);
const showForm = ref(false);
const submitting = ref(false);
const editingId = ref<string | null>(null);
const pendingDepenses = ref<any[]>([]);
const depenseForm = reactive({
  date: '',
  amount: 0,
  category: 'mechanique',
  description: '',
  car: ''
});

const carById = computed<Record<string, any>>(() => {
  const map: Record<string, any> = {};
  cars.value.forEach(c => (map[c._id] = c));
  return map;
});

const pendingTotal = computed(() => {
  return pendingDepenses.value.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
});

const resetForm = () => {
  depenseForm.date = new Date().toISOString().split('T')[0];
  depenseForm.amount = 0;
  depenseForm.car = '';
  // car === '' means "Depense Generale" -> locked general category
  depenseForm.category = GENERAL_SLUG.value;
  depenseForm.description = '';
};

const isAdmin = computed(() => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return user.role === 'admin';
});

const filters = reactive<{ query: string; category: string | null }>({
  query: '',
  category: null
});

const showFilterMenu = ref(false);
const searchOpen = ref(false);
const filterHover = ref(false);
const addOpen = ref(false);
const settingsOpen = ref(false);

const DEFAULT_CATEGORIES = ['Mechanique', 'Vidange', 'Lavage', 'Depense Generale', 'Autre'];

const slugifyCategory = (label: string) =>
  label
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const categoryLabels = ref<string[]>([...DEFAULT_CATEGORIES]);

const GENERAL_SLUG = computed(() => {
  const general = categoryLabels.value.find(l => slugifyCategory(l).includes('general'));
  return general ? slugifyCategory(general) : 'depense_generale';
});

const categoryOptions = computed(() =>
  categoryLabels.value.map(label => ({ value: slugifyCategory(label), label })),
);

const catLabel = (value: string) =>
  categoryOptions.value.find(c => c.value === value)?.label || value;

// "Depense Generale" selected (no vehicle) -> category select locked on the general category
const categoryDisabled = computed(() => depenseForm.car === '');

watch(
  () => depenseForm.car,
  (carVal) => {
    if (carVal === '') {
      depenseForm.category = GENERAL_SLUG.value;
    } else if (depenseForm.category === GENERAL_SLUG.value) {
      const first = categoryOptions.value.find(c => c.value !== GENERAL_SLUG.value);
      depenseForm.category = first?.value || '';
    }
  },
);

const filteredDepenses = computed(() => {
  let result = depenses.value;
  if (filters.query.trim()) {
    const q = filters.query.toLowerCase();
    result = result.filter(d => {
      const desc = (d.description || '').toLowerCase();
      const cat = (d.category || '').toLowerCase();
      const car = d.car && carById.value[d.car] ? `${carById.value[d.car].brand} ${carById.value[d.car].model} ${carById.value[d.car].matricule}`.toLowerCase() : '';
      return desc.includes(q) || cat.includes(q) || car.includes(q);
    });
  }
  if (filters.category) {
    result = result.filter(d => d.category === filters.category);
  }
  return result;
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
    toast.add({ severity: 'success', summary: 'Dépense supprimée', detail: 'La dépense a été supprimée.', life: 3000 });
    loadDepenses();
  } catch (err) {
    console.error('Failed to delete expense', err);
    toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer la dépense.', life: 3000 });
  }
};

const loadCategories = async () => {
  try {
    const settings: any = await settingApi.get();
    if (Array.isArray(settings?.depenseCategories) && settings.depenseCategories.length > 0) {
      categoryLabels.value = settings.depenseCategories;
    }
  } catch (err) {
    // Non-admin or fetch failure -> keep default categories
    console.warn('Using default depense categories', err);
  }
};

onMounted(async () => {
  loadCategories();
  await loadDepenses();
  unsubscribeSocket = socketStore.onEvent('depense:change', () => {
    loadDepenses();
  });
});

onUnmounted(() => {
  if (unsubscribeSocket) unsubscribeSocket();
});
watch(filters, loadDepenses, { deep: true });

const openForm = async (depense?: any) => {
  pendingDepenses.value = [];
  if (depense) {
    editingId.value = depense._id;
    depenseForm.date = depense.date ? new Date(depense.date).toISOString().split('T')[0] : '';
    depenseForm.amount = depense.amount;
    depenseForm.car = depense.car?._id || depense.car || '';
    depenseForm.category = depense.category;
    depenseForm.description = depense.description;
    if (!depenseForm.car) depenseForm.category = GENERAL_SLUG.value;
  } else {
    editingId.value = null;
    resetForm();
  }
  
  if (cars.value.length === 0) {
    cars.value = await carApi.getAll();
  }
  showForm.value = true;
};

const addToPending = () => {
  if (!depenseForm.amount || !depenseForm.category) return;
  const payload: any = {
    date: depenseForm.date,
    amount: Number(depenseForm.amount),
    category: depenseForm.category,
    description: depenseForm.description,
  };
  if (depenseForm.car) payload.car = depenseForm.car;
  pendingDepenses.value.push(payload);
  resetForm();
};

const removeFromPending = (index: number) => {
  pendingDepenses.value.splice(index, 1);
};

const saveAllPending = async () => {
  if (pendingDepenses.value.length === 0) return;
  submitting.value = true;
  try {
    await depenseApi.bulkCreate(pendingDepenses.value);
    const count = pendingDepenses.value.length;
    showForm.value = false;
    pendingDepenses.value = [];
    toast.add({ severity: 'success', summary: 'Dépenses enregistrées', detail: `${count} dépense(s) ajoutée(s) avec succès`, life: 3000 });
    await loadDepenses();
  } catch (err) {
    console.error('Failed to save depenses', err);
    alert('Erreur lors de l\'enregistrement des dépenses.');
  } finally {
    submitting.value = false;
  }
};

const updateDepense = async () => {
  if (!editingId.value) return;
  submitting.value = true;
  try {
    const payload = { ...depenseForm };
    if (!payload.car) delete (payload as any).car;
    await depenseApi.update(editingId.value, payload);
    showForm.value = false;
    toast.add({ severity: 'success', summary: 'Dépense modifiée', detail: 'Modification enregistrée avec succès', life: 3000 });
    await loadDepenses();
  } catch (err) {
    console.error('Failed to update depense', err);
    alert('Erreur lors de la modification de la dépense.');
  } finally {
    submitting.value = false;
  }
};
</script>


