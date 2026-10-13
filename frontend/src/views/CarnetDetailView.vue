<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { lotContratApi, contratApi, settingApi } from '@/api';
import { formatDate } from '@/lib/utils';
import {
  BookOpen, Hash, Calendar, Car as CarIcon, User as UserIcon, Building2,
  Printer, Download, Plus, Link, Unlink, RotateCcw, CheckCircle2,
  ChevronLeft, Edit, Eye, Layers, Search, ArrowDownAZ, ArrowUpAZ,
  FileText, Receipt, Coins, Clock, AlertCircle, Loader2, CheckSquare, Square,
  Check, X, Lock
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const lotId = computed(() => route.params.id as string);
const loading = ref(true);
const lot = ref<any>(null);
const settings = ref<any>(null);

// Edit Lot Modal State
const showEditLotModal = ref(false);
const savingLot = ref(false);
const lotEditForm = reactive({
  name: '',
  startNumber: 0,
  endNumber: 0,
  currentNumber: 0,
  status: 'ouvert',
  notes: '',
});

// Clôture Confirmation Modal State
const showCloseConfirmModal = ref(false);
const closingLot = ref(false);

// Filter & Sort state
const contractSearchQuery = ref('');
const contractSortOrder = ref<'asc' | 'desc'>('asc');

// Attach Existing Contracts Modal (Super Admin)
const showAttachModal = ref(false);
const searchingAttachContracts = ref(false);
const searchAttachQuery = ref('');
const attachModalSortOrder = ref<'asc' | 'desc'>('asc');
const allExistingContracts = ref<any[]>([]);
const selectedContratIdsToAttach = ref<string[]>([]);
const attachingContratId = ref<string | null>(null);
const batchAttaching = ref(false);
const detachingContratId = ref<string | null>(null);

const loadCarnetData = async () => {
  if (!lotId.value) return;
  loading.value = true;
  try {
    const [lotData, appSettings] = await Promise.all([
      lotContratApi.getOne(lotId.value),
      settingApi.get().catch(() => null)
    ]);
    lot.value = lotData;
    settings.value = appSettings;

    if (lotData) {
      lotEditForm.name = lotData.name || '';
      lotEditForm.startNumber = Number(lotData.startNumber) || 0;
      lotEditForm.endNumber = Number(lotData.endNumber) || 0;
      lotEditForm.currentNumber = Number(lotData.currentNumber) || 0;
      lotEditForm.status = lotData.status || 'ouvert';
      lotEditForm.notes = lotData.notes || '';
    }
  } catch (err) {
    console.error('Failed to load carnet detail', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadCarnetData();
});

// Contracts list for this carnet
const rawContrats = computed(() => {
  return Array.isArray(lot.value?.contrats) ? lot.value.contrats : [];
});

const calculateContractDays = (c: any) => {
  if (!c?.startDate || !c?.endDate) return 1;
  const start = new Date(c.startDate).getTime();
  const end = new Date(c.endDate).getTime();
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
};

const isContractCancelled = (c: any) => {
  if (!c) return false;
  const status = String(c.status || '').toLowerCase().trim();
  return status === 'cancelled' || status === 'annulé' || status === 'annule';
};

const getContractClients = (c: any): any[] => {
  if (Array.isArray(c?.clients) && c.clients.length > 0) {
    return c.clients;
  }
  if (c?.client) {
    return [c.client];
  }
  return [];
};

// Summary metrics
const carnetStats = computed(() => {
  const contrats = rawContrats.value;
  let totalRevenue = 0;
  let totalDays = 0;
  let cashTotal = 0;
  let chequeTotal = 0;
  let cardTotal = 0;
  let transferTotal = 0;
  let depositTotal = 0;
  let activeCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;

  for (const c of contrats) {
    const amount = Number(c.totalAmount) || 0;
    const deposit = Number(c.depositAmount) || 0;
    const days = calculateContractDays(c);

    if (isContractCancelled(c)) {
      cancelledCount++;
      continue;
    }

    const status = String(c.status || '').toLowerCase().trim();
    if (status === 'active') activeCount++;
    if (status === 'terminé' || status === 'clôturé') completedCount++;

    totalRevenue += amount;
    totalDays += days;
    depositTotal += deposit;

    const method = String(c.paymentMethod || '').toLowerCase();
    if (method === 'cash' || method === 'espèces') cashTotal += amount;
    else if (method === 'cheque' || method === 'chèque') chequeTotal += amount;
    else if (method === 'card' || method === 'carte') cardTotal += amount;
    else if (method === 'transfer' || method === 'virement') transferTotal += amount;
  }

  const validCount = contrats.length - cancelledCount;
  const avgDuration = validCount > 0 ? (totalDays / validCount).toFixed(1) : '0';

  // Timbre fiscal calculation
  const timbreRate = Number(settings.value?.contractTaxValue) || 0;
  const timbreEnabledInSettings = Boolean(settings.value?.contractTaxEnabled && timbreRate > 0);
  const agencyAppliesTimbre = lot.value?.agence?.applyTimbreExpense !== false;
  const timbreTotal = (timbreEnabledInSettings && agencyAppliesTimbre) ? Math.round(totalDays * timbreRate * 100) / 100 : 0;

  return {
    totalCount: contrats.length,
    validCount,
    activeCount,
    completedCount,
    cancelledCount,
    totalRevenue,
    totalDays,
    avgDuration,
    cashTotal,
    chequeTotal,
    cardTotal,
    transferTotal,
    depositTotal,
    timbreRate,
    timbreEnabledInSettings,
    agencyAppliesTimbre,
    timbreTotal,
  };
});

const calculateContractTimbre = (c: any) => {
  if (isContractCancelled(c)) return 0;
  if (!carnetStats.value.agencyAppliesTimbre) return 0;
  const days = calculateContractDays(c);
  const rate = carnetStats.value.timbreRate || 0;
  return Math.round(days * rate * 100) / 100;
};

// Capacity and progression
const capacityStats = computed(() => {
  const start = Number(lot.value?.startNumber) || 0;
  const end = Number(lot.value?.endNumber) || 0;
  const curr = Number(lot.value?.currentNumber) || start;
  const totalSlots = Math.max(1, end - start + 1);
  const usedSlots = Math.min(totalSlots, Math.max(0, curr - start));
  const remainingSlots = Math.max(0, end - curr + 1);
  const progressPercent = Math.min(100, Math.round((usedSlots / totalSlots) * 100));

  return {
    start,
    end,
    curr,
    totalSlots,
    usedSlots,
    remainingSlots,
    progressPercent,
  };
});

// Filtered and sorted contracts in carnet
const filteredCarnetContrats = computed(() => {
  const q = contractSearchQuery.value.trim().toLowerCase();
  let list = [...rawContrats.value];

  if (q) {
    list = list.filter((c: any) => {
      const refMatch = String(c.reference || '').toLowerCase().includes(q);
      const carMatch = c.car
        ? `${c.car.brand || ''} ${c.car.model || ''} ${c.car.matricule || ''}`.toLowerCase().includes(q)
        : false;
      const clientMatch = c.clients?.some((cl: any) =>
        `${cl.firstName || ''} ${cl.lastName || ''} ${cl.phone || ''} ${cl.cin || ''}`.toLowerCase().includes(q)
      );
      return refMatch || carMatch || clientMatch;
    });
  }

  return list.sort((a: any, b: any) => {
    const numA = parseInt(String(a?.reference || a?._id || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(String(b?.reference || b?._id || '').replace(/\D/g, ''), 10) || 0;
    return contractSortOrder.value === 'asc' ? numA - numB : numB - numA;
  });
});

// Print resume & PDF Export
const printCarnetResume = () => {
  const originalTitle = document.title;
  const lotName = (lot.value?.name || 'Carnet').replace(/[^a-zA-Z0-9_-]/g, '_');
  const agenceName = (lot.value?.agence?.name || 'Agence').replace(/[^a-zA-Z0-9_-]/g, '_');
  document.title = `Resume_${lotName}_${agenceName}_${new Date().toISOString().slice(0, 10)}`;
  window.print();
  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
};

// Download / Print as PDF (Standard browser print triggering Save to PDF)
const downloadCarnetResume = () => {
  printCarnetResume();
};

// Actions on Carnet: Save Changes, Close, Reopen
const handleSaveLotChanges = async () => {
  if (!lot.value?._id || savingLot.value) return;
  savingLot.value = true;
  try {
    const updated = await lotContratApi.update(lot.value._id, {
      name: lotEditForm.name.trim(),
      startNumber: Number(lotEditForm.startNumber),
      endNumber: Number(lotEditForm.endNumber),
      currentNumber: Number(lotEditForm.currentNumber),
      status: lotEditForm.status,
      notes: lotEditForm.notes,
    });
    lot.value = updated;
    showEditLotModal.value = false;
    alert('Informations du carnet mises à jour avec succès.');
  } catch (err: any) {
    console.error('Failed to update lot', err);
    alert(err.response?.data?.message || 'Erreur lors de la modification du carnet.');
  } finally {
    savingLot.value = false;
  }
};

const promptCloseCarnet = () => {
  showCloseConfirmModal.value = true;
};

const handleConfirmCloseCarnet = async () => {
  if (!lot.value?._id || closingLot.value) return;
  closingLot.value = true;
  try {
    const updated = await lotContratApi.close(lot.value._id);
    lot.value = updated;
    showCloseConfirmModal.value = false;
    alert('Le carnet a été clôturé avec succès.');
  } catch (err: any) {
    console.error('Failed to close carnet', err);
    alert(err.response?.data?.message || 'Erreur lors de la clôture du carnet.');
  } finally {
    closingLot.value = false;
  }
};

const handleReopenCarnet = async () => {
  if (!lot.value?._id) return;
  if (!confirm(`Êtes-vous sûr de vouloir rouvrir le carnet « ${lot.value.name} » ?`)) return;
  try {
    const updated = await lotContratApi.reopen(lot.value._id, true);
    lot.value = updated;
    alert('Le carnet a été réouvert.');
  } catch (err: any) {
    console.error('Failed to reopen carnet', err);
    alert(err.response?.data?.message || 'Erreur lors de la réouverture du carnet.');
  }
};

// --- Super Admin Attach Contracts Modal Logic ---
const openAttachModal = async () => {
  searchAttachQuery.value = '';
  selectedContratIdsToAttach.value = [];
  showAttachModal.value = true;
  searchingAttachContracts.value = true;
  try {
    allExistingContracts.value = (await contratApi.getAll()) || [];
  } catch (err) {
    console.error('Failed to fetch existing contracts', err);
  } finally {
    searchingAttachContracts.value = false;
  }
};

const filteredAvailableContracts = computed(() => {
  const q = searchAttachQuery.value.trim().toLowerCase();
  const currentIds = new Set(rawContrats.value.map((c: any) => String(c._id || c)));
  const start = Number(lot.value?.startNumber) || 0;
  const end = Number(lot.value?.endNumber) || 0;

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
        isAlreadyInThisLot: currentIds.has(String(c._id)),
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
  if (idx >= 0) selectedContratIdsToAttach.value.splice(idx, 1);
  else selectedContratIdsToAttach.value.push(id);
};

const handleAttachContrat = async (contrat: any) => {
  if (!lot.value?._id || attachingContratId.value) return;
  attachingContratId.value = contrat._id;
  try {
    const updated = await lotContratApi.attachContrat(lot.value._id, contrat._id);
    lot.value = updated;
    const idx = selectedContratIdsToAttach.value.indexOf(contrat._id);
    if (idx >= 0) selectedContratIdsToAttach.value.splice(idx, 1);
    allExistingContracts.value = (await contratApi.getAll()) || [];
  } catch (err: any) {
    console.error('Failed to attach contract', err);
    alert(err.response?.data?.message || 'Erreur lors du rattachement du contrat.');
  } finally {
    attachingContratId.value = null;
  }
};

const handleBatchAttach = async () => {
  if (!lot.value?._id || selectedContratIdsToAttach.value.length === 0 || batchAttaching.value) return;
  batchAttaching.value = true;
  try {
    const updated = await lotContratApi.attachContrat(lot.value._id, selectedContratIdsToAttach.value);
    lot.value = updated;
    selectedContratIdsToAttach.value = [];
    allExistingContracts.value = (await contratApi.getAll()) || [];
  } catch (err: any) {
    console.error('Failed to batch attach contracts', err);
    alert(err.response?.data?.message || 'Erreur lors du rattachement des contrats.');
  } finally {
    batchAttaching.value = false;
  }
};

const handleDetachContrat = async (contrat: any) => {
  if (!lot.value?._id || detachingContratId.value) return;
  if (!confirm(`Êtes-vous sûr de vouloir détacher le contrat N° ${contrat.reference} de ce carnet ?`)) return;
  detachingContratId.value = contrat._id;
  try {
    const updated = await lotContratApi.detachContrat(lot.value._id, contrat._id);
    lot.value = updated;
    if (showAttachModal.value) {
      allExistingContracts.value = (await contratApi.getAll()) || [];
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
  <div class="min-h-screen bg-slate-50/60 p-4 md:p-8 space-y-8 max-w-7xl mx-auto print:p-0 print:bg-white print:max-w-none">
    <!-- Top Action & Navigation Bar (Hidden in Print) -->
    <!-- Header Section -->
    <div class="space-y-4 print:hidden">
      <!-- Top Sub-row: Navigation Breadcrumbs & Quick Export/Utility Tools -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- Breadcrumb & Back Button -->
        <div class="flex items-center gap-3">
          <Button 
            @click="lot?.agence?._id ? router.push(`/agences/${lot.agence._id}`) : router.push('/agences')" 
            variant="ghost" 
            size="icon" 
            class="h-10 w-10 rounded-xl bg-white shadow-xs border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all active:scale-95 shrink-0"
            title="Retour à l'agence"
          >
            <ChevronLeft class="w-5 h-5 text-slate-700" />
          </Button>
          <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span class="hover:text-slate-600 cursor-pointer" @click="router.push('/agences')">Agences</span>
            <span>/</span>
            <span class="text-indigo-600 font-black cursor-pointer hover:underline" @click="lot?.agence?._id && router.push(`/agences/${lot.agence._id}`)">
              {{ lot?.agence?.name || 'Agence' }}
            </span>
            <span>/</span>
            <span class="text-slate-700">Détails Carnet</span>
          </div>
        </div>

        <!-- Utility Buttons: Print, PDF, Edit -->
        <div class="flex items-center gap-2">
          <Button
            @click="printCarnetResume"
            variant="outline"
            class="h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-2xs flex items-center gap-1.5 active:scale-95"
          >
            <Printer class="w-3.5 h-3.5 text-indigo-600" />
            <span class="hidden sm:inline">Imprimer</span>
          </Button>

          <Button
            @click="downloadCarnetResume"
            variant="outline"
            class="h-9 px-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200/60 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-2xs flex items-center gap-1.5 active:scale-95"
          >
            <Download class="w-3.5 h-3.5 text-indigo-600" />
            <span class="hidden sm:inline">Télécharger PDF</span>
          </Button>

          <Button
            @click="showEditLotModal = true"
            variant="ghost"
            size="icon"
            class="h-9 w-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95"
            title="Modifier les paramètres du carnet"
          >
            <Edit class="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <!-- Main Title & Operational Actions Card -->
      <div class="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <!-- Title & Status Badge -->
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <BookOpen class="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div class="flex items-center gap-3 flex-wrap">
              <h1 class="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-tight">
                {{ lot?.name || 'Carnet de Contrats' }}
              </h1>
              <span 
                :class="[
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 whitespace-nowrap border',
                  lot?.status === 'ouvert' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                ]"
              >
                <span 
                  :class="[
                    'w-2 h-2 rounded-full', 
                    lot?.status === 'ouvert' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  ]"
                ></span>
                {{ lot?.status === 'ouvert' ? 'Actif / En service' : 'Clôturé / Fermé' }}
              </span>
            </div>
            <p class="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
              Plage : {{ capacityStats.start }} → {{ capacityStats.end }} &bull; Prochain : <strong class="text-indigo-600">{{ capacityStats.curr }}</strong>
            </p>
          </div>
        </div>

        <!-- Primary Operational Buttons -->
        <div class="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
          <Button
            v-if="authStore.isSuperAdmin"
            @click="openAttachModal"
            class="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-indigo-600/20 flex items-center gap-2 active:scale-95 transition-all"
          >
            <Plus class="w-4 h-4 stroke-[3]" />
            Rattacher Contrats
          </Button>

          <Button
            v-if="lot?.status === 'ouvert'"
            @click="promptCloseCarnet"
            variant="outline"
            class="h-11 px-5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-2xs active:scale-95 transition-all flex items-center gap-2"
          >
            Clôturer le Carnet
          </Button>

          <Button
            v-else-if="lot?.status === 'ferme' && authStore.isSuperAdmin"
            @click="handleReopenCarnet"
            variant="outline"
            class="h-11 px-5 border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-300 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-2xs flex items-center gap-2 active:scale-95 transition-all"
            title="Restaurer le carnet clôturé"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            Restaurer le Carnet
          </Button>

          <div
            v-else-if="lot?.status === 'ferme' && !authStore.isSuperAdmin"
            class="h-11 px-4 rounded-xl bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-wider border border-slate-200 flex items-center gap-1.5 shrink-0"
            title="Seul le Super Admin peut restaurer un carnet clôturé"
          >
            <Lock class="w-3.5 h-3.5 text-slate-400" />
            Clôturé (Restauration Super Admin)
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
      <Loader2 class="w-8 h-8 animate-spin text-indigo-600" />
      <span class="text-xs font-black uppercase tracking-wider">Chargement des données du carnet...</span>
    </div>

    <div v-else class="space-y-8">
      <!-- 1. Hero Overview & Capacity Card (Hidden in Print) -->
      <div class="p-6 md:p-8 bg-gradient-to-br from-indigo-900 via-indigo-850 to-slate-900 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden print:hidden">
        <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="space-y-3">
            <div class="flex items-center gap-3 flex-wrap">
              <span class="px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-[10px] font-black uppercase tracking-widest text-indigo-200 flex items-center gap-1.5">
                <Building2 class="w-3.5 h-3.5" /> {{ lot?.agence?.name || 'Agence Principale' }}
              </span>
              <span class="px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-[10px] font-black uppercase tracking-widest text-white/80">
                Intervalle : {{ capacityStats.start }} → {{ capacityStats.end }}
              </span>
            </div>

            <h2 class="text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
              {{ lot?.name }}
            </h2>

            <p v-if="lot?.notes" class="text-xs text-white/70 max-w-xl font-medium">
              {{ lot.notes }}
            </p>
          </div>

          <!-- Capacity Badge & Next Contract Metric -->
          <div class="flex items-center gap-4 bg-white/10 backdrop-blur border border-white/20 p-5 rounded-3xl shrink-0">
            <div>
              <span class="text-[9px] font-black uppercase tracking-widest text-white/60 block">Prochain N° à émettre</span>
              <span class="text-3xl font-black font-mono text-emerald-400">
                {{ capacityStats.curr }}
              </span>
            </div>
            <div class="w-px h-10 bg-white/20"></div>
            <div>
              <span class="text-[9px] font-black uppercase tracking-widest text-white/60 block">Contrats Restants</span>
              <span class="text-2xl font-black font-mono text-white">
                {{ capacityStats.remainingSlots }} <span class="text-xs text-white/60 font-bold">/ {{ capacityStats.totalSlots }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Progression Bar -->
        <div class="mt-8 pt-6 border-t border-white/10 space-y-2">
          <div class="flex justify-between items-center text-xs font-black uppercase tracking-wider text-white/70">
            <span>Progression du carnet</span>
            <span class="font-mono text-emerald-300">
              {{ capacityStats.usedSlots }} / {{ capacityStats.totalSlots }} émis ({{ capacityStats.progressPercent }}%)
            </span>
          </div>
          <div class="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
            <div 
              class="h-full bg-gradient-to-r from-emerald-400 to-indigo-400 rounded-full transition-all duration-700 shadow-sm"
              :style="{ width: `${capacityStats.progressPercent}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 2. KPI Cards Grid (Financials, Timbre, Jours de Location) -->
      <div 
        :class="[
          'grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden',
          (carnetStats.agencyAppliesTimbre && carnetStats.timbreEnabledInSettings) ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        ]"
      >
        <!-- Card 1: Total Revenue -->
        <div class="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-slate-400">
            <span class="text-[10px] font-black uppercase tracking-wider">Chiffre d'Affaires</span>
            <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Coins class="w-4 h-4" />
            </div>
          </div>
          <div class="text-2xl font-black text-slate-900 font-mono">
            {{ carnetStats.totalRevenue.toLocaleString() }} <span class="text-xs font-bold text-slate-400">TND</span>
          </div>
          <div class="text-[10px] text-slate-500 font-bold">
            Espèces: {{ carnetStats.cashTotal }} TND • Autres: {{ carnetStats.totalRevenue - carnetStats.cashTotal }} TND
          </div>
        </div>

        <!-- Card 2: Total Rental Days -->
        <div class="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-slate-400">
            <span class="text-[10px] font-black uppercase tracking-wider">Jours de Location</span>
            <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar class="w-4 h-4" />
            </div>
          </div>
          <div class="text-2xl font-black text-slate-900 font-mono">
            {{ carnetStats.totalDays }} <span class="text-xs font-bold text-slate-400">Jours</span>
          </div>
          <div class="text-[10px] text-slate-500 font-bold">
            Moyenne : {{ carnetStats.avgDuration }} jours par contrat
          </div>
        </div>

        <!-- Card 3: Contracts Count -->
        <div class="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-slate-400">
            <span class="text-[10px] font-black uppercase tracking-wider">Contrats Rattachés</span>
            <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText class="w-4 h-4" />
            </div>
          </div>
          <div class="text-2xl font-black text-slate-900 font-mono">
            {{ carnetStats.totalCount }} <span class="text-xs font-bold text-slate-400">Contrats</span>
          </div>
          <div class="text-[10px] text-slate-500 font-bold">
            {{ carnetStats.activeCount }} actif(s) • {{ carnetStats.completedCount }} terminé(s)
          </div>
        </div>

        <!-- Card 4: Frais de Timbre Fiscal (Depense) - only shown when timbre is active for this agency -->
        <div 
          v-if="carnetStats.agencyAppliesTimbre && carnetStats.timbreEnabledInSettings" 
          class="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-2"
        >
          <div class="flex items-center justify-between text-slate-400">
            <span class="text-[10px] font-black uppercase tracking-wider">Timbre Fiscal (Dépense)</span>
            <div class="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Receipt class="w-4 h-4" />
            </div>
          </div>
          <div class="text-2xl font-black font-mono text-rose-600">
            {{ carnetStats.timbreTotal.toLocaleString() }} <span class="text-xs font-bold text-slate-400">TND</span>
          </div>
          <div class="text-[10px] font-bold">
            <span v-if="lot?.status === 'ferme' && lot?.timbreDepense" class="text-emerald-600 flex items-center gap-1">
              <CheckCircle2 class="w-3 h-3" /> Dépense enregistrée à la clôture
            </span>
            <span v-else class="text-slate-500">
              {{ carnetStats.totalDays }} jours × {{ carnetStats.timbreRate }} TND/j (à clôture)
            </span>
          </div>
        </div>
      </div>

      <!-- 3. Contracts List Table Section (Screen Display) -->
      <div class="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-6 print:hidden">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
              <FileText class="w-5 h-5 text-indigo-600" />
              Contrats du Carnet
              <Badge class="bg-slate-100 text-slate-800 border-none text-xs font-black">
                {{ filteredCarnetContrats.length }}
              </Badge>
            </h3>
            <p class="text-xs text-slate-400 font-bold mt-0.5">
              Consultez tous les contrats enregistrés ou rattachés à ce carnet.
            </p>
          </div>

          <!-- Search & Sorting Controls -->
          <div class="flex flex-wrap items-center gap-3">
            <div class="relative w-full sm:w-64">
              <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                v-model="contractSearchQuery"
                placeholder="Rechercher contrat, client..."
                class="h-10 pl-10 pr-3 rounded-xl border-slate-200 text-xs font-bold bg-slate-50/50"
              />
            </div>

            <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                @click="contractSortOrder = 'asc'"
                :class="[
                  'px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1',
                  contractSortOrder === 'asc' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                ]"
              >
                <ArrowDownAZ class="w-3.5 h-3.5" /> N° Croissant
              </button>
              <button
                type="button"
                @click="contractSortOrder = 'desc'"
                :class="[
                  'px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1',
                  contractSortOrder === 'desc' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                ]"
              >
                <ArrowUpAZ class="w-3.5 h-3.5" /> N° Décroissant
              </button>
            </div>
          </div>
        </div>

        <!-- Contracts Table -->
        <div v-if="filteredCarnetContrats.length === 0" class="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl">
          <FileText class="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p class="text-xs font-black uppercase text-slate-600">Aucun contrat trouvé</p>
          <p class="text-[10px] text-slate-400 mt-1">Aucun contrat ne correspond à votre recherche pour ce carnet.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th class="py-3 px-4">N° Référence</th>
                <th class="py-3 px-4">Client(s)</th>
                <th class="py-3 px-4">Véhicule</th>
                <th class="py-3 px-4">Période & Durée</th>
                <th class="py-3 px-4">{{ (carnetStats.agencyAppliesTimbre && carnetStats.timbreEnabledInSettings) ? 'Timbre & Montant' : 'Montant Contrat' }}</th>
                <th class="py-3 px-4">Statut</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr 
                v-for="c in filteredCarnetContrats" 
                :key="c._id"
                :class="[
                  'hover:bg-slate-50/70 transition-colors group',
                  isContractCancelled(c) ? 'bg-rose-50/30' : ''
                ]"
              >
                <!-- Reference -->
                <td class="py-3.5 px-4 font-mono font-black text-indigo-950 align-top">
                  N° {{ c.reference }}
                </td>

                <!-- Client(s) (Display both if 2) -->
                <td class="py-3.5 px-4 align-top">
                  <div v-if="getContractClients(c).length === 1">
                    <div class="font-bold text-slate-900">
                      {{ getContractClients(c)[0].firstName }} {{ getContractClients(c)[0].lastName }}
                    </div>
                    <div class="text-[10px] text-slate-400 font-medium">
                      {{ getContractClients(c)[0].phone || getContractClients(c)[0].cin || '' }}
                    </div>
                  </div>
                  <div v-else-if="getContractClients(c).length >= 2" class="space-y-1">
                    <div class="leading-tight">
                      <span class="font-bold text-slate-900 text-xs">1. {{ getContractClients(c)[0].firstName }} {{ getContractClients(c)[0].lastName }}</span>
                      <span v-if="getContractClients(c)[0].phone" class="text-[9px] text-slate-400 font-medium block">{{ getContractClients(c)[0].phone }}</span>
                    </div>
                    <div class="leading-tight pt-1 border-t border-slate-100">
                      <span class="font-bold text-slate-800 text-xs">2. {{ getContractClients(c)[1].firstName }} {{ getContractClients(c)[1].lastName }}</span>
                      <span v-if="getContractClients(c)[1].phone" class="text-[9px] text-slate-400 font-medium block">{{ getContractClients(c)[1].phone }}</span>
                    </div>
                  </div>
                  <div v-else class="text-slate-400 font-medium">—</div>
                </td>

                <!-- Car -->
                <td class="py-3.5 px-4 align-top">
                  <div v-if="c.car">
                    <div class="font-bold text-slate-800">
                      {{ c.car.brand }} {{ c.car.model }}
                    </div>
                    <div class="text-[10px] font-mono text-slate-400">
                      {{ c.car.matricule || '—' }}
                    </div>
                  </div>
                  <div v-else class="text-slate-400 font-medium">—</div>
                </td>

                <!-- Cancelled Span for On-Screen Table -->
                <template v-if="isContractCancelled(c)">
                  <td colspan="2" class="py-3.5 px-4 text-center align-middle">
                    <span class="inline-block px-3 py-1 bg-rose-100/80 text-rose-800 font-black text-[10px] uppercase tracking-wider rounded-lg border border-rose-200">
                      ANNULÉ
                    </span>
                  </td>
                  <td class="py-3.5 px-4 align-middle">
                    <Badge class="text-[8px] font-black uppercase px-2 py-0.5 rounded-md border-none bg-rose-100 text-rose-800">
                      Annulé
                    </Badge>
                  </td>
                </template>

                <!-- Valid Contract columns -->
                <template v-else>
                  <!-- Period -->
                  <td class="py-3.5 px-4 align-top">
                    <div class="font-bold text-slate-700">
                      {{ formatDate(c.startDate) }} → {{ formatDate(c.endDate) }}
                    </div>
                    <div class="text-[10px] font-bold text-indigo-600">
                      {{ calculateContractDays(c) }} jour(s) de location
                    </div>
                  </td>

                  <!-- Amount (Timbre Fiscal & Total Contrat) -->
                  <td class="py-3.5 px-4 align-top">
                    <template v-if="carnetStats.agencyAppliesTimbre && carnetStats.timbreEnabledInSettings">
                      <div class="font-mono font-black text-rose-700">
                        {{ calculateContractTimbre(c) }} TND
                      </div>
                      <div class="text-[10px] text-slate-500 font-bold">
                        Timbre ({{ calculateContractDays(c) }} j × {{ carnetStats.timbreRate }} TND)
                      </div>
                      <div class="text-[9px] text-slate-400 font-medium mt-0.5">
                        Contrat : {{ c.totalAmount || 0 }} TND
                      </div>
                    </template>
                    <template v-else>
                      <div class="font-mono font-black text-slate-900 text-sm">
                        {{ c.totalAmount || 0 }} TND
                      </div>
                      <div class="text-[9px] text-slate-400 font-medium mt-0.5">
                        Durée : {{ calculateContractDays(c) }} jour(s)
                      </div>
                    </template>
                  </td>

                  <!-- Status -->
                  <td class="py-3.5 px-4 align-top">
                    <Badge class="text-[8px] font-black uppercase px-2 py-0.5 rounded-md border-none bg-slate-100 text-slate-700">
                      {{ c.status }}
                    </Badge>
                  </td>
                </template>

                <!-- Actions -->
                <td class="py-3.5 px-4 text-right align-top">
                  <div class="flex items-center justify-end gap-1.5">
                    <Button
                      @click="router.push(`/contrats/${c._id}`)"
                      size="sm"
                      variant="ghost"
                      class="h-8 px-2.5 rounded-xl text-indigo-600 hover:bg-indigo-50 font-black text-[10px] uppercase"
                    >
                      <Eye class="w-3.5 h-3.5 mr-1" /> Voir
                    </Button>
                    <Button
                      v-if="authStore.isSuperAdmin"
                      @click="handleDetachContrat(c)"
                      size="sm"
                      variant="ghost"
                      class="h-8 w-8 p-0 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                      title="Détacher du carnet"
                    >
                      <Unlink class="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 4. PRINTABLE RESUME SHEET (Visible in Print or PDF Export) -->
      <div id="printable-carnet-sheet" class="hidden print:block p-8 bg-white text-slate-900 space-y-6">
        <!-- Print Header -->
        <div class="flex justify-between items-start border-b-2 border-slate-900 pb-4">
          <div>
            <div class="text-[10px] font-black uppercase tracking-widest text-indigo-700 mb-0.5">
              {{ lot?.agence?.name || 'Agence de Location' }}
            </div>
            <h1 class="text-xl font-black uppercase tracking-tight text-slate-900">
              RÉSUMÉ D'EXPLOITATION & CLÔTURE DE CARNET
            </h1>
            <p class="text-xs font-bold text-slate-600 uppercase tracking-wider mt-1">
              Carnet : <span class="font-black text-slate-900">« {{ lot?.name }} »</span> • Intervalle : <span class="font-mono font-black text-slate-900">[{{ capacityStats.start }} - {{ capacityStats.end }}]</span>
            </p>
          </div>
          <div v-if="lot?.agence?.phone" class="text-right text-xs">
            <p class="text-[10px] text-slate-500 font-mono">Tél : {{ lot.agence.phone }}</p>
          </div>
        </div>

        <!-- Info & Recap Grid -->
        <div class="grid grid-cols-4 gap-3 text-xs border border-slate-300 p-3.5 rounded-xl bg-slate-50/50 print-avoid-break">
          <div>
            <span class="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Capacité & Numérotation</span>
            <span class="font-mono font-black text-slate-900 text-xs">{{ capacityStats.start }} → {{ capacityStats.end }}</span>
            <span class="text-[9px] text-slate-500 block mt-0.5">{{ capacityStats.totalSlots }} numéros alloués</span>
          </div>
          <div>
            <span class="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Contrats Inscrits</span>
            <span class="font-mono font-black text-slate-900 text-xs">{{ carnetStats.totalCount }} contrat(s)</span>
            <span class="text-[9px] text-slate-600 font-bold block mt-0.5">
              {{ carnetStats.validCount }} valide(s) • <span class="text-rose-600">{{ carnetStats.cancelledCount }} annulé(s)</span>
            </span>
          </div>
          <div>
            <span class="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Jours Loués (Valides)</span>
            <span class="font-mono font-black text-slate-900 text-xs">{{ carnetStats.totalDays }} jours</span>
            <span class="text-[9px] text-slate-500 block mt-0.5">Moyenne : {{ carnetStats.avgDuration }} j / contrat</span>
          </div>
          <div v-if="carnetStats.agencyAppliesTimbre && carnetStats.timbreEnabledInSettings" class="text-right">
            <span class="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Dépense Timbre Total</span>
            <span class="font-mono font-black text-rose-700 text-sm">
              {{ carnetStats.timbreTotal.toLocaleString() }} TND
            </span>
            <span class="text-[9px] text-slate-500 block mt-0.5">Tarif : {{ carnetStats.timbreRate }} TND/j</span>
          </div>
        </div>

        <!-- Timbre Fiscal Depense Recap Box - only shown when timbre is applied -->
        <div v-if="carnetStats.agencyAppliesTimbre && carnetStats.timbreEnabledInSettings" class="p-3.5 rounded-xl border border-slate-300 bg-slate-50 text-xs space-y-1.5 print-avoid-break">
          <div class="flex justify-between items-center">
            <h3 class="text-[10px] font-black uppercase tracking-wider text-slate-900">
              Décompte Frais de Timbre Fiscal (Dépense d'Agence à la Clôture)
            </h3>
            <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-800">
              Applicable
            </span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-[10px]">
            <div>
              <span class="text-slate-500 block">Base jours de location valides :</span>
              <span class="font-black text-slate-900 font-mono">{{ carnetStats.totalDays }} jours</span>
            </div>
            <div>
              <span class="text-slate-500 block">Barème journalier :</span>
              <span class="font-black text-slate-900 font-mono">{{ carnetStats.timbreRate }} TND / jour</span>
            </div>
            <div class="text-right">
              <span class="text-slate-500 block">Total Dépense Timbre Fiscal :</span>
              <span class="font-black text-xs text-rose-700 font-mono">
                {{ carnetStats.timbreTotal.toLocaleString() }} TND
              </span>
            </div>
          </div>
        </div>

        <!-- Print Contracts Table -->
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <h4 class="text-[11px] font-black uppercase text-slate-900 tracking-wider">
              État récapitulatif des contrats du carnet
            </h4>
            <span class="text-[9px] text-slate-500 font-bold">
              {{ filteredCarnetContrats.length }} contrat(s) listé(s)
            </span>
          </div>

          <table class="w-full text-left text-[10px] border-collapse border border-slate-300">
            <thead>
              <tr class="bg-slate-100 border border-slate-300 font-black text-slate-800 text-[9px] uppercase tracking-wider">
                <th class="p-2 border border-slate-300 w-[14%]">N° Contrat</th>
                <th class="p-2 border border-slate-300 w-[26%]">Client(s)</th>
                <th class="p-2 border border-slate-300 w-[20%]">Véhicule</th>
                <th class="p-2 border border-slate-300 w-[18%]">Période</th>
                <th class="p-2 border border-slate-300 w-[10%] text-center">Nbres Jours</th>
                <th class="p-2 border border-slate-300 w-[12%] text-right">{{ (carnetStats.agencyAppliesTimbre && carnetStats.timbreEnabledInSettings) ? 'Montant (Timbre)' : 'Montant Contrat' }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-300">
              <tr 
                v-for="c in filteredCarnetContrats" 
                :key="c._id"
                class="print-avoid-break"
                :class="isContractCancelled(c) ? 'bg-rose-50/50' : 'hover:bg-slate-50/50'"
              >
                <!-- N° Contrat -->
                <td class="p-2 border border-slate-300 font-mono font-bold align-middle">
                  N° {{ c.reference }}
                </td>

                <!-- Client(s) (If 2, add both) -->
                <td class="p-2 border border-slate-300 align-middle">
                  <div v-if="getContractClients(c).length === 1">
                    <div class="font-bold text-slate-900">
                      {{ getContractClients(c)[0].firstName }} {{ getContractClients(c)[0].lastName }}
                    </div>
                    <div v-if="getContractClients(c)[0].phone || getContractClients(c)[0].cin" class="text-[8px] text-slate-500 font-mono">
                      {{ getContractClients(c)[0].phone || getContractClients(c)[0].cin }}
                    </div>
                  </div>
                  <div v-else-if="getContractClients(c).length >= 2" class="space-y-1">
                    <div class="leading-tight">
                      <span class="font-bold text-slate-900 block">1. {{ getContractClients(c)[0].firstName }} {{ getContractClients(c)[0].lastName }}</span>
                      <span v-if="getContractClients(c)[0].phone || getContractClients(c)[0].cin" class="text-[8px] text-slate-500 font-mono block">
                        {{ getContractClients(c)[0].phone || getContractClients(c)[0].cin }}
                      </span>
                    </div>
                    <div class="leading-tight pt-0.5 border-t border-slate-200">
                      <span class="font-bold text-slate-800 block">2. {{ getContractClients(c)[1].firstName }} {{ getContractClients(c)[1].lastName }}</span>
                      <span v-if="getContractClients(c)[1].phone || getContractClients(c)[1].cin" class="text-[8px] text-slate-500 font-mono block">
                        {{ getContractClients(c)[1].phone || getContractClients(c)[1].cin }}
                      </span>
                    </div>
                  </div>
                  <div v-else class="text-slate-400 italic">—</div>
                </td>

                <!-- Car -->
                <td class="p-2 border border-slate-300 align-middle">
                  <div v-if="c.car">
                    <div class="font-bold text-slate-900">{{ c.car.brand }} {{ c.car.model }}</div>
                    <div class="text-[8px] font-mono text-slate-500">{{ c.car.matricule || '—' }}</div>
                  </div>
                  <div v-else class="text-slate-400 italic">—</div>
                </td>

                <!-- For Cancelled contracts: col span 3 from Periode to Montant and show "ANNULÉ" -->
                <template v-if="isContractCancelled(c)">
                  <td 
                    colspan="3" 
                    class="p-2 border border-slate-300 text-center font-black uppercase tracking-widest text-rose-700 bg-rose-100/70 align-middle"
                  >
                    ANNULÉ
                  </td>
                </template>

                <!-- For Valid contracts: Periode, Nbres jours, Montant (Total Frais Timbre Fiscal) OR Contract Amount -->
                <template v-else>
                  <!-- Periode -->
                  <td class="p-2 border border-slate-300 align-middle">
                    <div class="font-medium text-slate-900">
                      {{ formatDate(c.startDate) }} → {{ formatDate(c.endDate) }}
                    </div>
                  </td>

                  <!-- Nombres jours -->
                  <td class="p-2 border border-slate-300 text-center font-bold align-middle">
                    {{ calculateContractDays(c) }} j
                  </td>

                  <!-- Montant -->
                  <td class="p-2 border border-slate-300 text-right align-middle">
                    <template v-if="carnetStats.agencyAppliesTimbre && carnetStats.timbreEnabledInSettings">
                      <div class="font-mono font-bold text-slate-900">
                        {{ calculateContractTimbre(c) }} TND
                      </div>
                      <div class="text-[8px] text-slate-500 font-medium">
                        ({{ calculateContractDays(c) }} j × {{ carnetStats.timbreRate }} TND)
                      </div>
                    </template>
                    <template v-else>
                      <div class="font-mono font-bold text-slate-900">
                        {{ c.totalAmount || 0 }} TND
                      </div>
                    </template>
                  </td>
                </template>
              </tr>
            </tbody>

            <!-- Table Footer Totals -->
            <tfoot class="bg-slate-100/90 font-black text-[9px] uppercase text-slate-800 border-t-2 border-slate-400 print-avoid-break">
              <tr class="border border-slate-300">
                <td colspan="3" class="p-2 border border-slate-300 text-slate-700">
                  TOTAL ({{ carnetStats.validCount }} CONTRAT{{ carnetStats.validCount > 1 ? 'S' : '' }} VALIDE{{ carnetStats.validCount > 1 ? 'S' : '' }}<span v-if="carnetStats.cancelledCount > 0" class="text-rose-600 font-bold"> • {{ carnetStats.cancelledCount }} ANNULÉ{{ carnetStats.cancelledCount > 1 ? 'S' : '' }}</span>)
                </td>
                <td class="p-2 border border-slate-300 text-slate-600 font-bold text-right">
                  {{ (carnetStats.agencyAppliesTimbre && carnetStats.timbreEnabledInSettings) ? 'TOTAL TIMBRE :' : 'TOTAL :' }}
                </td>
                <td class="p-2 border border-slate-300 text-center font-mono font-black text-slate-900">
                  {{ carnetStats.totalDays }} j
                </td>
                <td class="p-2 border border-slate-300 text-right font-mono font-black" :class="(carnetStats.agencyAppliesTimbre && carnetStats.timbreEnabledInSettings) ? 'text-rose-800' : 'text-slate-900'">
                  <template v-if="carnetStats.agencyAppliesTimbre && carnetStats.timbreEnabledInSettings">
                    {{ carnetStats.timbreTotal.toLocaleString() }} TND
                  </template>
                  <template v-else>
                    {{ carnetStats.totalRevenue.toLocaleString() }} TND
                  </template>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Footer watermark -->
        <div class="pt-2 text-center text-[8px] text-slate-400 font-mono">
          Fiche générée automatiquement par RentCarApp le {{ new Date().toLocaleDateString('fr-FR') }} à {{ new Date().toLocaleTimeString('fr-FR') }}
        </div>
      </div>
    </div>

    <!-- Modal: Edit Carnet Parameters -->
    <Dialog v-model:open="showEditLotModal">
      <DialogContent class="max-w-md bg-white rounded-3xl p-6 text-slate-900">
        <DialogHeader>
          <DialogTitle class="text-lg font-black uppercase text-slate-900">
            Modifier le Carnet
          </DialogTitle>
          <DialogDescription class="text-xs text-slate-400 font-bold">
            Mettre à jour les informations du carnet.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 my-4">
          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase text-slate-500">Nom du Carnet</label>
            <Input v-model="lotEditForm.name" class="h-11 rounded-xl text-xs font-bold" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-slate-500">N° Début</label>
              <Input type="number" v-model.number="lotEditForm.startNumber" class="h-11 rounded-xl text-xs font-bold" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-slate-500">N° Fin</label>
              <Input type="number" v-model.number="lotEditForm.endNumber" class="h-11 rounded-xl text-xs font-bold" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-slate-500">Prochain N°</label>
              <Input type="number" v-model.number="lotEditForm.currentNumber" class="h-11 rounded-xl text-xs font-bold" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase text-slate-500">Statut</label>
              <select v-model="lotEditForm.status" class="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-bold bg-white">
                <option value="ouvert">Actif (Ouvert)</option>
                <option value="ferme">Clôturé (Fermé)</option>
              </select>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase text-slate-500">Notes & Remarques</label>
            <textarea v-model="lotEditForm.notes" rows="2" class="w-full p-2.5 rounded-xl border border-slate-200 text-xs"></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <Button @click="showEditLotModal = false" variant="ghost" class="h-10 px-4 rounded-xl text-xs font-bold">
            Annuler
          </Button>
          <Button @click="handleSaveLotChanges" :disabled="savingLot" class="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider">
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Modal: Confirmation de Clôture avec Détail Timbre -->
    <Dialog v-model:open="showCloseConfirmModal">
      <DialogContent class="max-w-lg bg-white rounded-3xl p-6 text-slate-900">
        <DialogHeader>
          <DialogTitle class="text-xl font-black uppercase text-slate-900 flex items-center gap-2">
            <AlertCircle class="w-5 h-5 text-rose-600" /> Clôturer le Carnet
          </DialogTitle>
          <DialogDescription class="text-xs text-slate-500 font-bold mt-1">
            Êtes-vous sûr de vouloir clôturer le carnet « {{ lot?.name }} » ?
          </DialogDescription>
        </DialogHeader>

        <div class="my-4 space-y-4">
          <!-- Timbre Fiscal Depense Preview Box (only if enabled) -->
          <div v-if="carnetStats.agencyAppliesTimbre && carnetStats.timbreEnabledInSettings" class="p-4 rounded-2xl border border-rose-100 bg-rose-50/60 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black uppercase text-rose-900">Dépense Timbre Fiscal</span>
              <Badge class="text-[8px] font-black uppercase px-2 py-0.5 rounded-md border-none bg-rose-200 text-rose-800">
                Automatique
              </Badge>
            </div>

            <div class="space-y-1.5 text-xs text-slate-700">
              <div class="flex justify-between">
                <span>Total jours de location cumulés :</span>
                <span class="font-black">{{ carnetStats.totalDays }} jours</span>
              </div>
              <div class="flex justify-between">
                <span>Tarif timbre fiscal journalier :</span>
                <span class="font-black">{{ carnetStats.timbreRate }} TND / jour</span>
              </div>
              <div class="flex justify-between pt-2 border-t border-rose-200/60 font-black text-rose-900 text-sm">
                <span>Dépense générée à la clôture :</span>
                <span>{{ carnetStats.timbreTotal }} TND</span>
              </div>
            </div>
          </div>

          <p class="text-xs text-slate-500">
            Une fois clôturé, aucun nouveau contrat ne sera incrémenté sur ce carnet. Vous pourrez rouvrir ce carnet ultérieurement si nécessaire.
          </p>
        </div>

        <div class="flex justify-end gap-2.5">
          <Button @click="showCloseConfirmModal = false" variant="ghost" class="h-10 px-4 rounded-xl text-xs font-bold">
            Annuler
          </Button>
          <Button 
            @click="handleConfirmCloseCarnet" 
            :disabled="closingLot"
            class="h-10 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider"
          >
            <Loader2 v-if="closingLot" class="w-4 h-4 animate-spin mr-1.5" />
            Confirmer la Clôture
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Modal: Super Admin Attach Existing Contracts (Single & Batch) -->
    <Dialog v-model:open="showAttachModal">
      <DialogContent class="max-w-2xl bg-white border-none shadow-2xl rounded-3xl p-0 overflow-hidden text-slate-900 max-h-[88vh] flex flex-col">
        <DialogHeader class="p-6 bg-slate-900 text-white shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Link class="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle class="text-xl font-black uppercase tracking-tight text-white">
                Rattacher des Contrats Existants
              </DialogTitle>
              <DialogDescription class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                Associer au carnet « {{ lot?.name }} »
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div class="p-6 overflow-y-auto space-y-4 flex-1">
          <!-- Filter Controls -->
          <div class="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div class="relative flex-1">
              <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                v-model="searchAttachQuery"
                placeholder="Rechercher par N° référence, client, ou matricule..."
                class="h-11 pl-10 pr-4 text-xs font-bold rounded-xl border-slate-200 bg-slate-50/50"
              />
            </div>

            <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                @click="attachModalSortOrder = 'asc'"
                :class="[
                  'px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1',
                  attachModalSortOrder === 'asc' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                ]"
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

          <div v-if="searchingAttachContracts" class="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
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
                      Dans l'intervalle [{{ lot?.startNumber }} - {{ lot?.endNumber }}]
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

              <!-- Action buttons -->
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
  </div>
</template>

<style>
@media print {
  @page {
    size: A4 portrait;
    margin: 15mm;
  }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    color: black !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Hide app navigation, sidebars, headers, dialogs, buttons */
  body * {
    visibility: hidden !important;
  }

  /* Only make the printable sheet and its contents visible */
  #printable-carnet-sheet,
  #printable-carnet-sheet * {
    visibility: visible !important;
  }

  #printable-carnet-sheet {
    display: block !important;
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    box-sizing: border-box !important;
    margin: 0 !important;
    padding: 16mm 20mm 20mm 20mm !important;
    background: white !important;
    color: black !important;
  }

  #printable-carnet-sheet table {
    width: 100% !important;
    border-collapse: collapse !important;
  }

  #printable-carnet-sheet thead {
    display: table-header-group !important;
  }

  #printable-carnet-sheet tfoot {
    display: table-footer-group !important;
  }

  #printable-carnet-sheet tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .print-avoid-break {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}
</style>
