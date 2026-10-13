<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { lotContratApi, contratApi, carApi, clientApi } from '@/api';
import { formatDate } from '@/lib/utils';
import { 
  BookOpen, Hash, Calendar, Car as CarIcon, User as UserIcon, 
  Check, X, Edit, Eye, Shield, Lock, Layers, Save, AlertCircle, RefreshCw,
  Clock, MapPin, Gauge, CreditCard, ChevronRight, Plus, Search, Loader2, Link, Unlink,
  ArrowDownAZ, ArrowUpAZ, CheckSquare, Square, CheckCircle2, Printer
} from 'lucide-vue-next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PasswordConfirmDialog } from '@/components/ui/password-dialog';
import { useAuthStore } from '@/stores/auth';

const props = withDefaults(
  defineProps<{
    open: boolean;
    lotId?: string;
    initialLot?: any;
    initialTab?: 'details' | 'contrats';
    editContratId?: string;
  }>(),
  {
    initialTab: 'details',
  }
);

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void;
  (e: 'updated', lot: any): void;
}>();

const router = useRouter();
const authStore = useAuthStore();

const isOpen = computed({
  get: () => props.open,
  set: (val: boolean) => emit('update:open', val),
});

const activeTab = ref<'details' | 'contrats'>('details');
const loading = ref(false);
const savingLot = ref(false);
const lotData = ref<any>(null);

// Lot Edit Form
const lotForm = reactive({
  name: '',
  startNumber: 0,
  endNumber: 0,
  currentNumber: 0,
  status: 'ouvert',
  notes: '',
});

// Contract Quick Edit Modal State
const showEditContratModal = ref(false);
const editingContrat = ref<any>(null);
const savingContrat = ref(false);
const showPasswordDialog = ref(false);
const editPassword = ref('');
const availableCars = ref<any[]>([]);
const availableClients = ref<any[]>([]);

const contratEditForm = reactive({
  car: '',
  clients: [] as string[],
  startDate: '',
  startTime: '10:00',
  endDate: '',
  endTime: '10:00',
  carDailyRate: 0,
  depositAmount: 0,
  totalAmount: 0,
  status: 'active',
  paymentMethod: 'cash',
  chequeNumber: '',
  bankName: '',
  contractTaxValue: 0,
  tvaValue: 0,
  lieuDepart: '',
  lieuRetour: '',
  carburantLevel: 100,
  notes: '',
});

const hydrateLotContrats = async (lot: any) => {
  if (!lot) return lot;

  if (lot.contrats && lot.contrats.length > 0) {
    const needsHydration = lot.contrats.some(
      (c: any) => typeof c === 'string' || !c.reference || !c.car
    );
    if (needsHydration) {
      try {
        const allContracts = await contratApi.getAll();
        const contractMap = new Map(allContracts.map((c: any) => [String(c._id), c]));
        lot.contrats = lot.contrats.map((c: any) => {
          const cId = typeof c === 'string' ? c : String(c._id);
          return contractMap.get(cId) || c;
        });
      } catch (e) {
        console.warn('Failed to hydrate carnet contracts from contratApi', e);
      }
    }
  }
  return lot;
};

const loadLotDetails = async () => {
  if (!props.lotId && !props.initialLot?._id) return;
  const id = props.lotId || props.initialLot?._id;
  loading.value = true;
  try {
    const data = await lotContratApi.getOne(id);
    const hydrated = await hydrateLotContrats(data);
    lotData.value = hydrated;
    syncLotForm(hydrated);
    checkTargetEditContrat();
  } catch (err) {
    console.error('Failed to load lot details', err);
    if (props.initialLot) {
      const hydratedInitial = await hydrateLotContrats(props.initialLot);
      lotData.value = hydratedInitial;
      syncLotForm(hydratedInitial);
      checkTargetEditContrat();
    }
  } finally {
    loading.value = false;
  }
};

const checkTargetEditContrat = () => {
  if (props.editContratId && lotData.value?.contrats) {
    const target = lotData.value.contrats.find(
      (c: any) => String(c._id) === String(props.editContratId)
    );
    if (target) {
      activeTab.value = 'contrats';
      openEditContrat(target);
    }
  }
};

const syncLotForm = (data: any) => {
  if (!data) return;
  lotForm.name = data.name || '';
  lotForm.startNumber = Number(data.startNumber) || 0;
  lotForm.endNumber = Number(data.endNumber) || 0;
  lotForm.currentNumber = Number(data.currentNumber) || 0;
  lotForm.status = data.status || 'ouvert';
  lotForm.notes = data.notes || '';
};

watch(
  () => props.open,
  (open) => {
    if (open) {
      if (props.initialTab) {
        activeTab.value = props.initialTab;
      }
      if (props.initialLot) {
        lotData.value = props.initialLot;
        syncLotForm(props.initialLot);
      }
      loadLotDetails();
    }
  },
  { immediate: true }
);

const saveLotChanges = async () => {
  if (!lotData.value?._id || savingLot.value) return;
  savingLot.value = true;
  try {
    const updated = await lotContratApi.update(lotData.value._id, {
      name: lotForm.name.trim(),
      startNumber: Number(lotForm.startNumber),
      endNumber: Number(lotForm.endNumber),
      currentNumber: Number(lotForm.currentNumber),
      status: lotForm.status,
      notes: lotForm.notes,
    });
    lotData.value = updated;
    syncLotForm(updated);
    emit('updated', updated);
    alert('Modifications du carnet enregistrées avec succès.');
  } catch (err: any) {
    console.error('Failed to update lot', err);
    alert(err.response?.data?.message || 'Erreur lors de la modification du carnet.');
  } finally {
    savingLot.value = false;
  }
};

// Contract editing functions (Oriented from Carnet to Contrat)
const openEditContrat = async (contrat: any) => {
  editingContrat.value = contrat;
  contratEditForm.car = typeof contrat.car === 'object' ? contrat.car?._id : (contrat.car || '');
  contratEditForm.clients = Array.isArray(contrat.clients) 
    ? contrat.clients.map((c: any) => typeof c === 'object' ? c._id : c)
    : [];
  
  if (contrat.startDate) {
    const d = new Date(contrat.startDate);
    contratEditForm.startDate = d.toISOString().split('T')[0];
    contratEditForm.startTime = d.toTimeString().slice(0, 5);
  }
  if (contrat.endDate) {
    const d = new Date(contrat.endDate);
    contratEditForm.endDate = d.toISOString().split('T')[0];
    contratEditForm.endTime = d.toTimeString().slice(0, 5);
  }
  contratEditForm.carDailyRate = contrat.carDailyRate || 0;
  contratEditForm.depositAmount = contrat.depositAmount || 0;
  contratEditForm.totalAmount = contrat.totalAmount || 0;
  contratEditForm.status = contrat.status || 'active';
  contratEditForm.paymentMethod = contrat.paymentMethod || 'cash';
  contratEditForm.chequeNumber = contrat.chequeNumber || '';
  contratEditForm.bankName = contrat.bankName || '';
  contratEditForm.contractTaxValue = contrat.contractTaxValue || 0;
  contratEditForm.tvaValue = contrat.tvaValue || 0;
  contratEditForm.lieuDepart = contrat.lieuDepart || '';
  contratEditForm.lieuRetour = contrat.lieuRetour || '';
  contratEditForm.carburantLevel = contrat.carburantLevel ?? 100;
  contratEditForm.notes = contrat.notes || '';

  // Load cars and clients for select dropdowns if not already cached
  if (availableCars.value.length === 0) {
    try {
      const [cars, clients] = await Promise.all([carApi.getAll(), clientApi.getAll()]);
      availableCars.value = cars;
      availableClients.value = clients;
    } catch (e) {
      console.warn('Failed to load auxiliary cars/clients');
    }
  }

  showEditContratModal.value = true;
};

const promptConfirmContratEdit = () => {
  showPasswordDialog.value = true;
};

const handleConfirmEditPassword = async () => {
  showPasswordDialog.value = false;
  await submitContratEdit();
};

const submitContratEdit = async () => {
  if (!editingContrat.value?._id || savingContrat.value) return;
  savingContrat.value = true;
  try {
    const payload = {
      ...contratEditForm,
      startDate: new Date(`${contratEditForm.startDate}T${contratEditForm.startTime}:00`).toISOString(),
      endDate: new Date(`${contratEditForm.endDate}T${contratEditForm.endTime}:00`).toISOString(),
      password: editPassword.value,
    };
    await contratApi.update(editingContrat.value._id, payload);
    showEditContratModal.value = false;
    alert('Contrat mis à jour avec succès depuis le carnet.');
    await loadLotDetails();
    emit('updated', lotData.value);
  } catch (err: any) {
    console.error('Failed to update contract from carnet', err);
    alert(err.response?.data?.message || 'Erreur lors de la mise à jour du contrat.');
  } finally {
    savingContrat.value = false;
    editPassword.value = '';
  }
};

const goToContratDetail = (id: string) => {
  isOpen.value = false;
  router.push(`/contrats/${id}`);
};

const goToFullView = () => {
  const id = lotData.value?._id || props.lotId;
  if (!id) return;
  isOpen.value = false;
  router.push(`/carnets/${id}`);
};

const printResume = () => {
  window.print();
};

// --- Super Admin: Attach Existing Contract to Carnet ---
const showAttachModal = ref(false);
const searchingContracts = ref(false);
const searchContractQuery = ref('');
const allExistingContracts = ref<any[]>([]);
const attachingContratId = ref<string | null>(null);
const detachingContratId = ref<string | null>(null);

// Order filters: 'asc' (smaller first: 000001 -> ...) or 'desc' (latest/larger first: ... -> 000001)
const carnetSortOrder = ref<'asc' | 'desc'>('asc');
const attachModalSortOrder = ref<'asc' | 'desc'>('asc');

// Batch multi-select in attach modal
const selectedContratIdsToAttach = ref<string[]>([]);
const batchAttaching = ref(false);

const isOutOfInterval = (c: any) => {
  const refStr = String(c?.reference || '').trim();
  const start = Number(lotData.value?.startNumber) || 0;
  const end = Number(lotData.value?.endNumber) || 0;
  if (/^\d+$/.test(refStr)) {
    const num = parseInt(refStr, 10);
    return num < start || num > end;
  }
  return true;
};

const sortedCarnetContrats = computed(() => {
  if (!lotData.value?.contrats) return [];
  const list = [...lotData.value.contrats];

  return list.sort((a: any, b: any) => {
    const numA = parseInt(String(a?.reference || a?._id || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(String(b?.reference || b?._id || '').replace(/\D/g, ''), 10) || 0;
    return carnetSortOrder.value === 'asc' ? numA - numB : numB - numA;
  });
});

const loadAllExistingContracts = async () => {
  searchingContracts.value = true;
  try {
    const list = await contratApi.getAll();
    allExistingContracts.value = list || [];
  } catch (err) {
    console.error('Failed to load contracts for attach modal', err);
  } finally {
    searchingContracts.value = false;
  }
};

const openAttachContractModal = async () => {
  searchContractQuery.value = '';
  selectedContratIdsToAttach.value = [];
  showAttachModal.value = true;
  await loadAllExistingContracts();
};

const filteredAvailableContracts = computed(() => {
  const q = searchContractQuery.value.trim().toLowerCase();
  const currentLotContratIds = new Set(
    (lotData.value?.contrats || []).map((c: any) => String(c._id || c))
  );
  const start = Number(lotData.value?.startNumber) || 0;
  const end = Number(lotData.value?.endNumber) || 0;

  const list = allExistingContracts.value
    .map((c: any) => {
      const refStr = String(c.reference || '').trim();
      let isInInterval = false;
      let refNum: number | null = null;
      if (/^\d+$/.test(refStr)) {
        refNum = parseInt(refStr, 10);
        isInInterval = refNum >= start && refNum <= end;
      }
      return {
        ...c,
        isAlreadyInThisLot: currentLotContratIds.has(String(c._id)),
        isInInterval,
        refNum,
      };
    })
    .filter((c: any) => {
      if (!q) return true;
      const refMatch = String(c.reference || '').toLowerCase().includes(q);
      const carMatch = c.car
        ? `${c.car.brand || ''} ${c.car.model || ''} ${c.car.matricule || ''}`.toLowerCase().includes(q)
        : false;
      const clientMatch = c.clients?.some((cl: any) =>
        `${cl.firstName || ''} ${cl.lastName || ''} ${cl.cin || ''}`.toLowerCase().includes(q)
      );
      return refMatch || carMatch || clientMatch;
    });

  return list.sort((a: any, b: any) => {
    const numA = parseInt(String(a.reference || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(String(b.reference || '').replace(/\D/g, ''), 10) || 0;
    return attachModalSortOrder.value === 'asc' ? numA - numB : numB - numA;
  });
});

const toggleSelectAllAttach = () => {
  const attachable = filteredAvailableContracts.value.filter(c => !c.isAlreadyInThisLot);
  if (selectedContratIdsToAttach.value.length === attachable.length && attachable.length > 0) {
    selectedContratIdsToAttach.value = [];
  } else {
    selectedContratIdsToAttach.value = attachable.map(c => c._id);
  }
};

const toggleContratSelection = (id: string) => {
  const idx = selectedContratIdsToAttach.value.indexOf(id);
  if (idx >= 0) {
    selectedContratIdsToAttach.value.splice(idx, 1);
  } else {
    selectedContratIdsToAttach.value.push(id);
  }
};

const handleAttachContrat = async (contrat: any) => {
  if (!lotData.value?._id || attachingContratId.value) return;
  attachingContratId.value = contrat._id;
  try {
    const updatedLot = await lotContratApi.attachContrat(lotData.value._id, contrat._id);
    const hydrated = await hydrateLotContrats(updatedLot);
    lotData.value = hydrated;
    emit('updated', hydrated);
    const idx = selectedContratIdsToAttach.value.indexOf(contrat._id);
    if (idx >= 0) selectedContratIdsToAttach.value.splice(idx, 1);
    await loadAllExistingContracts();
  } catch (err: any) {
    console.error('Failed to attach contract', err);
    alert(err.response?.data?.message || 'Erreur lors du rattachement du contrat.');
  } finally {
    attachingContratId.value = null;
  }
};

const handleBatchAttach = async () => {
  if (!lotData.value?._id || selectedContratIdsToAttach.value.length === 0 || batchAttaching.value) return;
  batchAttaching.value = true;
  try {
    const updatedLot = await lotContratApi.attachContrat(
      lotData.value._id,
      selectedContratIdsToAttach.value
    );
    const hydrated = await hydrateLotContrats(updatedLot);
    lotData.value = hydrated;
    emit('updated', hydrated);
    selectedContratIdsToAttach.value = [];
    await loadAllExistingContracts();
  } catch (err: any) {
    console.error('Failed to batch attach contracts', err);
    alert(err.response?.data?.message || 'Erreur lors du rattachement des contrats.');
  } finally {
    batchAttaching.value = false;
  }
};

const handleDetachContrat = async (contrat: any) => {
  if (!lotData.value?._id || detachingContratId.value) return;
  if (!confirm(`Êtes-vous sûr de vouloir détacher le contrat N° ${contrat.reference} de ce carnet ?`)) {
    return;
  }
  detachingContratId.value = contrat._id;
  try {
    const updatedLot = await lotContratApi.detachContrat(lotData.value._id, contrat._id);
    const hydrated = await hydrateLotContrats(updatedLot);
    lotData.value = hydrated;
    emit('updated', hydrated);
    const idx = selectedContratIdsToAttach.value.indexOf(contrat._id);
    if (idx >= 0) selectedContratIdsToAttach.value.splice(idx, 1);
    if (showAttachModal.value) {
      await loadAllExistingContracts();
    }
  } catch (err: any) {
    console.error('Failed to detach contract', err);
    alert(err.response?.data?.message || 'Erreur lors du détachement du contrat.');
  } finally {
    detachingContratId.value = null;
  }
};
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-3xl bg-white border-none shadow-[0_50px_100px_rgba(0,0,0,0.25)] rounded-[2.5rem] p-0 overflow-hidden text-slate-900 max-h-[92vh] flex flex-col">
      <!-- Header -->
      <DialogHeader class="p-8 pb-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white relative shrink-0">
        <div class="flex items-center justify-between relative z-10">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-white shadow-lg">
              <BookOpen class="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <DialogTitle class="text-2xl font-black uppercase tracking-tight text-white">
                  {{ lotData?.name || 'Carnet de Contrats' }}
                </DialogTitle>
                <Badge :class="['text-[9px] font-black uppercase px-2 py-0.5 rounded-full border-none', lotForm.status === 'ouvert' ? 'bg-emerald-400 text-emerald-950' : 'bg-slate-300 text-slate-800']">
                  {{ lotForm.status === 'ouvert' ? 'Actif' : 'Fermé' }}
                </Badge>
              </div>
              <DialogDescription class="text-white/70 font-bold uppercase tracking-widest text-[10px] mt-0.5">
                Agence : {{ lotData?.agence?.name || 'Agence Principale' }}
              </DialogDescription>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Button
              v-if="lotData?._id"
              @click="goToFullView"
              variant="outline"
              size="sm"
              class="h-9 px-3 rounded-xl bg-white/15 hover:bg-white/25 border-white/20 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 backdrop-blur shadow-xs"
            >
              <Eye class="w-3.5 h-3.5" /> Fiche Complète
            </Button>
            <Button
              @click="printResume"
              variant="outline"
              size="sm"
              class="h-9 px-3 rounded-xl bg-white/15 hover:bg-white/25 border-white/20 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 backdrop-blur shadow-xs"
            >
              <Printer class="w-3.5 h-3.5" /> Imprimer
            </Button>
          </div>
        </div>

        <!-- Navigation Tabs: Carnet settings vs Contrats contained in Carnet -->
        <div class="flex gap-2 mt-6 pt-4 border-t border-white/10">
          <button
            type="button"
            @click="activeTab = 'details'"
            :class="[
              'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2',
              activeTab === 'details' ? 'bg-white text-indigo-900 shadow-md' : 'text-white/70 hover:text-white hover:bg-white/10'
            ]"
          >
            <Layers class="w-3.5 h-3.5" /> Paramètres du Carnet
          </button>
          <button
            type="button"
            @click="activeTab = 'contrats'"
            :class="[
              'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2',
              activeTab === 'contrats' ? 'bg-white text-indigo-900 shadow-md' : 'text-white/70 hover:text-white hover:bg-white/10'
            ]"
          >
            <Hash class="w-3.5 h-3.5" /> Contrats du Carnet ({{ lotData?.contrats?.length || 0 }})
          </button>
        </div>
      </DialogHeader>

      <!-- Content Area -->
      <div class="p-8 overflow-y-auto flex-1 space-y-6">
        <!-- TAB 1: CARNET DETAILS & EDIT -->
        <div v-if="activeTab === 'details'" class="space-y-6">
          <div class="flex items-center justify-between bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100">
            <div>
              <span class="text-[9px] font-black text-indigo-600 uppercase tracking-widest block">Prochain Numéro de Contrat</span>
              <span class="text-2xl font-black font-mono text-indigo-950 tracking-wider">
                N° {{ String(lotForm.currentNumber).padStart(6, '0') }}
              </span>
            </div>
            <div class="text-right">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Plage Attribuée</span>
              <span class="text-sm font-black font-mono text-slate-700">
                {{ String(lotForm.startNumber).padStart(6, '0') }} → {{ String(lotForm.endNumber).padStart(6, '0') }}
              </span>
            </div>
          </div>

          <!-- Edit Carnet Fields -->
          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Nom du carnet</label>
                <Input v-model="lotForm.name" class="h-12 rounded-xl font-bold border-slate-200" />
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Statut</label>
                <select v-model="lotForm.status" class="h-12 w-full px-4 rounded-xl font-black border border-slate-200 bg-white text-slate-800 outline-none">
                  <option value="ouvert">Ouvert (Actif)</option>
                  <option value="ferme">Fermé (Clôturé)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="space-y-1.5">
                <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Début plage</label>
                <Input type="number" v-model.number="lotForm.startNumber" class="h-12 rounded-xl font-mono font-bold border-slate-200" />
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Fin plage</label>
                <Input type="number" v-model.number="lotForm.endNumber" class="h-12 rounded-xl font-mono font-bold border-slate-200" />
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] font-black text-indigo-600 uppercase tracking-wider ml-1 flex items-center gap-1">
                  <Shield class="w-3 h-3" /> Numéro Actuel
                </label>
                <Input 
                  type="number" 
                  v-model.number="lotForm.currentNumber" 
                  class="h-12 rounded-xl font-mono font-black text-indigo-600 border-indigo-200 bg-indigo-50/30"
                  :disabled="!authStore.isSuperAdmin"
                  :title="authStore.isSuperAdmin ? 'Modifier le numéro courant du carnet' : 'Seul le Super Admin peut ajuster ce numéro'"
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Notes / Remarques</label>
              <textarea v-model="lotForm.notes" rows="2" class="w-full p-3 rounded-xl font-bold border border-slate-200 text-xs outline-none focus:border-indigo-600 resize-none"></textarea>
            </div>
          </div>

          <Button 
            v-if="authStore.isSuperAdmin"
            @click="saveLotChanges" 
            :disabled="savingLot"
            class="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Save class="w-4 h-4" /> Enregistrer les modifications du Carnet
          </Button>
        </div>

        <!-- TAB 2: CONTRATS DU CARNET (Orientation: Carnet -> Contrats) -->
        <div v-else-if="activeTab === 'contrats'" class="space-y-4">
          <!-- Header Actions & Sorting for Tab 2 -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <span class="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Contrats du carnet</span>
              <span class="text-xs font-black uppercase text-slate-800">
                {{ sortedCarnetContrats.length }} contrat(s)
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <!-- Sort Order Filter: Smaller first (asc) or Latest first (desc) -->
              <div class="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  @click="carnetSortOrder = 'asc'"
                  :class="[
                    'px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1',
                    carnetSortOrder === 'asc' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  ]"
                  title="Afficher du plus petit numéro au plus grand (croissant)"
                >
                  <ArrowDownAZ class="w-3 h-3" /> N° Plus Petit
                </button>
                <button
                  type="button"
                  @click="carnetSortOrder = 'desc'"
                  :class="[
                    'px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1',
                    carnetSortOrder === 'desc' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  ]"
                  title="Afficher du dernier numéro au plus petit (décroissant)"
                >
                  <ArrowUpAZ class="w-3 h-3" /> Dernier N°
                </button>
              </div>

              <Button
                v-if="authStore.isSuperAdmin"
                @click="openAttachContractModal"
                size="sm"
                class="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
              >
                <Plus class="w-3.5 h-3.5 stroke-[3]" /> Rattacher des Contrats
              </Button>
            </div>
          </div>

          <div v-if="sortedCarnetContrats.length === 0" class="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl opacity-70">
            <Hash class="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p class="font-black text-xs uppercase tracking-wider text-slate-600">Aucun contrat rattaché à ce carnet</p>
            <p class="text-[10px] text-slate-400 mt-1">Cliquez sur « Rattacher des Contrats » pour associer des contrats existants.</p>
          </div>

          <div v-else class="space-y-3">
            <div 
              v-for="c in sortedCarnetContrats" 
              :key="c._id || c"
              class="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="font-mono font-black text-sm text-indigo-950">
                    N° {{ c.reference || (c._id ? String(c._id).slice(-6) : c) }}
                  </span>
                  <Badge 
                    v-if="c.status"
                    class="text-[8px] font-black uppercase px-2 py-0.5 rounded-md border-none bg-indigo-100 text-indigo-700"
                  >
                    {{ c.status }}
                  </Badge>
                  <Badge 
                    v-if="isOutOfInterval(c)"
                    class="text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700"
                  >
                    Hors intervalle
                  </Badge>
                </div>
                <div v-if="c.car || (c.clients && c.clients.length > 0)" class="text-[10px] font-bold text-slate-500 flex items-center gap-3">
                  <span v-if="c.car" class="flex items-center gap-1">
                    <CarIcon class="w-3 h-3 text-slate-400" /> {{ c.car.brand }} {{ c.car.model }} ({{ c.car.matricule }})
                  </span>
                  <span v-if="c.clients && c.clients.length > 0" class="flex items-center gap-1">
                    <UserIcon class="w-3 h-3 text-slate-400" /> {{ c.clients[0].firstName }} {{ c.clients[0].lastName }}
                  </span>
                </div>
                <div class="text-[9px] text-slate-400 font-bold">
                  <template v-if="c.startDate && c.endDate">
                    {{ formatDate(c.startDate) }} → {{ formatDate(c.endDate) }} • <span class="font-black text-slate-800">{{ c.totalAmount || 0 }} TND</span>
                  </template>
                  <template v-else-if="c.totalAmount !== undefined && c.totalAmount !== null">
                    <span class="font-black text-slate-800">{{ c.totalAmount }} TND</span>
                  </template>
                </div>
              </div>

              <!-- Actions from Carnet -->
              <div class="flex items-center gap-2 self-end sm:self-center">
                <Button 
                  v-if="authStore.isAdmin && c._id"
                  @click="openEditContrat(c)" 
                  size="sm" 
                  variant="outline"
                  class="h-9 px-3 rounded-xl border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Edit class="w-3.5 h-3.5" /> Modifier
                </Button>
                <Button 
                  v-if="c._id"
                  @click="goToContratDetail(c._id)" 
                  size="sm" 
                  class="h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Eye class="w-3.5 h-3.5" /> Voir Fiche
                </Button>
                <Button
                  v-if="authStore.isSuperAdmin && c._id"
                  @click="handleDetachContrat(c)"
                  size="sm"
                  variant="ghost"
                  class="h-9 w-9 p-0 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 font-black"
                  title="Détacher ce contrat du carnet"
                >
                  <Unlink class="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <!-- Contract Quick Edit Modal (Fully executed from within Carnet) -->
  <Dialog v-model:open="showEditContratModal">
    <DialogContent class="max-w-2xl bg-white border-none shadow-3xl rounded-[2.5rem] p-0 overflow-hidden text-slate-900 max-h-[90vh] flex flex-col">
      <DialogHeader class="p-6 bg-slate-900 text-white shrink-0">
        <DialogTitle class="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
          <Edit class="w-5 h-5 text-indigo-400" /> Modifier le Contrat N° {{ editingContrat?.reference }}
        </DialogTitle>
        <DialogDescription class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
          Édition depuis le Carnet « {{ lotData?.name }} »
        </DialogDescription>
      </DialogHeader>

      <div class="p-6 overflow-y-auto space-y-4 flex-1">
        <!-- Véhicule -->
        <div class="space-y-1.5">
          <label class="text-[9px] font-black uppercase text-slate-500 tracking-wider">Véhicule Assigné</label>
          <select 
            v-model="contratEditForm.car" 
            class="h-11 w-full px-4 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-800 outline-none focus:border-indigo-600"
          >
            <option value="">Sélectionner un véhicule...</option>
            <option v-for="car in availableCars" :key="car._id" :value="car._id">
              {{ car.brand }} {{ car.model }} ({{ car.matricule }})
            </option>
          </select>
        </div>

        <!-- Dates & Times -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
          <div class="space-y-1">
            <label class="text-[9px] font-black uppercase text-slate-500 flex items-center gap-1">
              <Calendar class="w-3 h-3 text-indigo-500" /> Date & Heure Départ
            </label>
            <div class="flex gap-2">
              <Input type="date" v-model="contratEditForm.startDate" class="h-10 text-xs rounded-xl flex-2" />
              <Input type="time" v-model="contratEditForm.startTime" class="h-10 text-xs rounded-xl flex-1" />
            </div>
          </div>
          <div class="space-y-1">
            <label class="text-[9px] font-black uppercase text-slate-500 flex items-center gap-1">
              <Calendar class="w-3 h-3 text-indigo-500" /> Date & Heure Retour
            </label>
            <div class="flex gap-2">
              <Input type="date" v-model="contratEditForm.endDate" class="h-10 text-xs rounded-xl flex-2" />
              <Input type="time" v-model="contratEditForm.endTime" class="h-10 text-xs rounded-xl flex-1" />
            </div>
          </div>
        </div>

        <!-- Financials -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="space-y-1">
            <label class="text-[9px] font-black uppercase text-slate-500">Tarif / Jour (TND)</label>
            <Input type="number" v-model.number="contratEditForm.carDailyRate" class="h-10 text-xs rounded-xl font-bold" />
          </div>
          <div class="space-y-1">
            <label class="text-[9px] font-black uppercase text-slate-500">Caution (TND)</label>
            <Input type="number" v-model.number="contratEditForm.depositAmount" class="h-10 text-xs rounded-xl font-bold" />
          </div>
          <div class="space-y-1">
            <label class="text-[9px] font-black uppercase text-emerald-600">Montant Total (TND)</label>
            <Input type="number" v-model.number="contratEditForm.totalAmount" class="h-10 text-xs rounded-xl font-black text-emerald-600 bg-emerald-50/40 border-emerald-200" />
          </div>
        </div>

        <!-- Status & Mode de Paiement -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="text-[9px] font-black uppercase text-slate-500">Statut Contrat</label>
            <select v-model="contratEditForm.status" class="h-10 w-full px-3 rounded-xl text-xs font-black border border-slate-200 bg-white">
              <option value="active">Actif (En cours)</option>
              <option value="soon">À venir</option>
              <option value="terminé">Terminé</option>
              <option value="clôturé">Clôturé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-[9px] font-black uppercase text-slate-500">Mode de Règlement</label>
            <select v-model="contratEditForm.paymentMethod" class="h-10 w-full px-3 rounded-xl text-xs font-bold border border-slate-200 bg-white">
              <option value="cash">Espèces</option>
              <option value="cheque">Chèque</option>
              <option value="card">Carte bancaire</option>
              <option value="transfer">Virement</option>
            </select>
          </div>
        </div>

        <!-- Lieux & Carburant -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="space-y-1">
            <label class="text-[9px] font-black uppercase text-slate-500">Lieu Départ</label>
            <Input v-model="contratEditForm.lieuDepart" placeholder="Agence" class="h-10 text-xs rounded-xl" />
          </div>
          <div class="space-y-1">
            <label class="text-[9px] font-black uppercase text-slate-500">Lieu Retour</label>
            <Input v-model="contratEditForm.lieuRetour" placeholder="Agence" class="h-10 text-xs rounded-xl" />
          </div>
          <div class="space-y-1">
            <label class="text-[9px] font-black uppercase text-slate-500">Carburant (%)</label>
            <Input type="number" v-model.number="contratEditForm.carburantLevel" min="0" max="100" class="h-10 text-xs rounded-xl font-bold" />
          </div>
        </div>

        <div class="space-y-1">
          <label class="text-[9px] font-black uppercase text-slate-500">Notes & Remarques</label>
          <textarea v-model="contratEditForm.notes" rows="2" class="w-full p-2.5 rounded-xl border border-slate-200 text-xs resize-none"></textarea>
        </div>

        <Button 
          @click="promptConfirmContratEdit" 
          :disabled="savingContrat"
          class="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20"
        >
          Valider la modification du contrat
        </Button>
      </div>
    </DialogContent>
  </Dialog>

  <!-- Password Confirm for Contract Edit -->
  <PasswordConfirmDialog
    v-model:open="showPasswordDialog"
    v-model:password="editPassword"
    title="Confirmation Sécurité Administrateur"
    description="Entrez votre mot de passe administrateur pour enregistrer les modifications de ce contrat depuis le carnet."
    confirmLabel="Confirmer la Modification"
    variant="indigo"
    @confirm="handleConfirmEditPassword"
  />

  <!-- Modal: Super Admin Attach Existing Contract (Single & Batch) -->
  <Dialog v-model:open="showAttachModal">
    <DialogContent class="max-w-2xl bg-white border-none shadow-[0_50px_100px_rgba(0,0,0,0.25)] rounded-[2.5rem] p-0 overflow-hidden text-slate-900 max-h-[88vh] flex flex-col">
      <DialogHeader class="p-6 bg-slate-900 text-white shrink-0">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Link class="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle class="text-xl font-black uppercase tracking-tight text-white">
                Rattacher des Contrats Existants
              </DialogTitle>
              <DialogDescription class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                Associer au carnet « {{ lotData?.name }} »
              </DialogDescription>
            </div>
          </div>
        </div>
      </DialogHeader>

      <div class="p-6 overflow-y-auto space-y-4 flex-1">
        <!-- Filter Controls: Search & Sort Order & Select All -->
        <div class="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div class="relative flex-1">
            <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              v-model="searchContractQuery"
              placeholder="Rechercher par N° référence, client, ou matricule..."
              class="h-11 pl-10 pr-4 text-xs font-bold rounded-xl border-slate-200 bg-slate-50/50"
            />
          </div>

          <!-- Sort Order in Attach Modal -->
          <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              @click="attachModalSortOrder = 'asc'"
              :class="[
                'px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1',
                attachModalSortOrder === 'asc' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              ]"
              title="Trier du plus petit numéro au plus grand"
            >
              <ArrowDownAZ class="w-3 h-3" /> Plus Petit
            </button>
            <button
              type="button"
              @click="attachModalSortOrder = 'desc'"
              :class="[
                'px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1',
                attachModalSortOrder === 'desc' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              ]"
              title="Trier du plus grand / dernier au plus petit"
            >
              <ArrowUpAZ class="w-3 h-3" /> Dernier N°
            </button>
          </div>
        </div>

        <!-- Select All & Batch Action Bar -->
        <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/80">
          <button
            type="button"
            @click="toggleSelectAllAttach"
            class="text-[10px] font-black uppercase tracking-wider text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
          >
            <component 
              :is="selectedContratIdsToAttach.length > 0 && selectedContratIdsToAttach.length === filteredAvailableContracts.filter(c => !c.isAlreadyInThisLot).length ? CheckSquare : Square" 
              class="w-4 h-4 text-indigo-600" 
            />
            Tout Sélectionner ({{ filteredAvailableContracts.filter(c => !c.isAlreadyInThisLot).length }})
          </button>

          <Button
            v-if="selectedContratIdsToAttach.length > 0"
            @click="handleBatchAttach"
            :disabled="batchAttaching"
            size="sm"
            class="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95"
          >
            <Loader2 v-if="batchAttaching" class="w-3.5 h-3.5 animate-spin" />
            <Link v-else class="w-3.5 h-3.5 stroke-[2.5]" />
            Rattacher la Sélection ({{ selectedContratIdsToAttach.length }})
          </Button>
          <span v-else class="text-[9px] font-bold text-slate-400 uppercase">
            Cochez des contrats pour les rattacher en lot
          </span>
        </div>

        <div v-if="searchingContracts" class="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 class="w-6 h-6 animate-spin text-indigo-600" />
          <span class="text-[10px] font-black uppercase tracking-wider">Chargement des contrats...</span>
        </div>

        <div v-else-if="filteredAvailableContracts.length === 0" class="py-10 text-center border-2 border-dashed border-slate-200 rounded-2xl">
          <p class="text-xs font-black uppercase text-slate-500">Aucun contrat trouvé</p>
          <p class="text-[10px] text-slate-400 mt-1">Aucun contrat ne correspond à votre recherche.</p>
        </div>

        <div v-else class="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
          <div
            v-for="c in filteredAvailableContracts"
            :key="c._id"
            :class="[
              'p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all',
              c.isAlreadyInThisLot 
                ? 'bg-emerald-50/40 border-emerald-200' 
                : selectedContratIdsToAttach.includes(c._id) 
                  ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300 cursor-pointer' 
                  : 'bg-white hover:bg-slate-50/80 border-slate-200/80 cursor-pointer'
            ]"
            @click="!c.isAlreadyInThisLot && toggleContratSelection(c._id)"
          >
            <div class="flex items-center gap-3">
              <input
                type="checkbox"
                :checked="selectedContratIdsToAttach.includes(c._id)"
                :disabled="c.isAlreadyInThisLot"
                @click.stop="toggleContratSelection(c._id)"
                :class="[
                  'w-4 h-4 rounded text-indigo-600',
                  c.isAlreadyInThisLot ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
                ]"
              />
              <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-mono font-black text-xs text-indigo-950">N° {{ c.reference }}</span>
                  <Badge class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border-none bg-slate-200 text-slate-700">
                    {{ c.status }}
                  </Badge>
                  <Badge 
                    v-if="c.isAlreadyInThisLot" 
                    class="text-[8px] font-black uppercase px-2 py-0.5 rounded-md border-none bg-emerald-100 text-emerald-800 flex items-center gap-1"
                  >
                    <CheckCircle2 class="w-3 h-3" /> Dans ce carnet
                  </Badge>
                  <Badge 
                    v-else-if="c.isInInterval" 
                    class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700"
                  >
                    Dans l'intervalle [{{ lotData?.startNumber }} - {{ lotData?.endNumber }}]
                  </Badge>
                  <Badge 
                    v-else 
                    class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700"
                  >
                    Hors intervalle
                  </Badge>
                </div>
                <div class="text-[10px] font-bold text-slate-500">
                  <span v-if="c.clients && c.clients.length > 0">{{ c.clients[0].firstName }} {{ c.clients[0].lastName }}</span>
                  <span v-if="c.car"> • {{ c.car.brand }} {{ c.car.model }} ({{ c.car.matricule }})</span>
                </div>
                <div class="text-[9px] text-slate-400 font-bold">
                  {{ formatDate(c.startDate) }} → {{ formatDate(c.endDate) }} • {{ c.totalAmount || 0 }} TND
                </div>
              </div>
            </div>

            <!-- Action buttons: Détacher if already in lot, Rattacher if not -->
            <div class="flex items-center gap-2 shrink-0">
              <Button
                v-if="c.isAlreadyInThisLot"
                @click.stop="handleDetachContrat(c)"
                :disabled="detachingContratId === c._id"
                size="sm"
                variant="outline"
                class="h-9 px-3 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded-xl font-black text-[10px] uppercase tracking-wider shrink-0 shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
                title="Détacher ce contrat du carnet"
              >
                <Loader2 v-if="detachingContratId === c._id" class="w-3 h-3 animate-spin" />
                <Unlink v-else class="w-3 h-3 stroke-[2.5]" />
                Détacher
              </Button>
              <Button
                v-else
                @click.stop="handleAttachContrat(c)"
                :disabled="attachingContratId === c._id"
                size="sm"
                class="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider shrink-0 shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Loader2 v-if="attachingContratId === c._id" class="w-3 h-3 animate-spin mr-1" />
                <Link v-else class="w-3 h-3 stroke-[2.5] mr-1" /> Rattacher
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
