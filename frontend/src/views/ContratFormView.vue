<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { carApi, clientApi, contratApi, getImageUrl, settingApi } from '@/api';
import { formatDate } from '@/lib/utils';
import { 
  Car as CarIcon, User as UserIcon, Calendar as CalendarIcon, 
  ArrowRight, ArrowLeft, Check, Search, Eye, 
  Clock, Hash, FileText, MapPin, ShieldCheck, FileWarning, AlertTriangle, Percent, DollarSign
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const router = useRouter();
const route = useRoute();
const activeStep = ref(0);
const loading = ref(false);
const submitting = ref(false);
const showConflictDialog = ref(false);
const pendingConflicts = ref<{ reservations: any[], contracts: any[] }>({ reservations: [], contracts: [] });
const isRefModalOpen = ref(!route.query.contractNumber);

const steps = [
  { label: 'Véhicule', description: 'Sélectionnez un véhicule', icon: CarIcon },
  { label: 'Conducteurs', description: 'Sélectionnez les conducteurs', icon: UserIcon },
  { label: 'Période', description: 'Dates & Règlement', icon: CalendarIcon },
  { label: 'Validation', description: 'Vérifiez les informations', icon: ShieldCheck }
];
const appSettings = ref<any>(null);
const fetchAppSettings = async () => {
  try {
    const data = await settingApi.get();
    appSettings.value = data;
    if (data) {
      form.contractTaxValue = data.contractTaxValue || 0;
      form.tvaValue = data.tvaValue || 0;
    }
  } catch (err) {
    console.warn('Failed to fetch settings, using defaults');
  }
};

// --- Step 0 & Payload ---
const manualReference = ref('');

// --- Step 1: Car Selection ---
const availableCars = ref<any[]>([]);
const selectedCar = ref<any>(null);
const carSearch = ref('');

const filteredCars = computed(() => {
  if (!carSearch.value) return availableCars.value;
  return availableCars.value.filter(car => 
    car.brand.toLowerCase().includes(carSearch.value.toLowerCase()) ||
    car.model.toLowerCase().includes(carSearch.value.toLowerCase()) ||
    car.matricule.toLowerCase().includes(carSearch.value.toLowerCase())
  );
});

// --- Step 2: Client Selection ---
const clientQuery = ref('');
const clientResults = ref<any[]>([]);
const selectedClients = ref<any[]>([]);
const searchingClients = ref(false);
const isClientDetailOpen = ref(false);
const clientShowingDetails = ref<any>(null);

const searchClients = async () => {
  if (!clientQuery.value || clientQuery.value.length < 2) {
    clientResults.value = [];
    return;
  }
  searchingClients.value = true;
  try {
    const data = await clientApi.getAll({ search: clientQuery.value });
    clientResults.value = data.filter((c: any) => !c.disabled);
  } catch (err) {
    console.error('Erreur lors de la recherche clients:', err);
  } finally {
    searchingClients.value = false;
  }
};

let searchTimeout: any = null;
watch(clientQuery, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(searchClients, 300);
});

const showClientDetails = (client: any) => {
  clientShowingDetails.value = client;
  isClientDetailOpen.value = true;
};

const selectClient = (client: any) => {
  const index = selectedClients.value.findIndex(c => c._id === client._id);
  if (index === -1) {
    if (selectedClients.value.length >= 2) return; // Limit to 2 clients
    selectedClients.value.push(client);
  } else {
    selectedClients.value.splice(index, 1);
  }
};

// --- Step 3: Details & Dates ---
const form = reactive({
  startDate: new Date().toISOString().split('T')[0],
  startTime: '10:00',
  endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  endTime: '10:00',
  rentDays: 1,
  depositAmount: 500,
  paymentMethod: 'espece',
  chequeNumber: '',
  bankName: '',
  contractTaxValue: 0,
  tvaValue: 0,
});

const showSuccessDialog = ref(false);

const diffDays = computed(() => {
  if (!form.startDate || !form.endDate || !form.startTime || !form.endTime) return 0;
  const start = new Date(`${form.startDate}T${form.startTime}:00`);
  const end = new Date(`${form.endDate}T${form.endTime}:00`);
  const diffTime = end.getTime() - start.getTime();
  const days = diffTime / (1000 * 60 * 60 * 24);
  return days > 0 ? Math.ceil(days) : 0;
});

// Sync rentDays when dates change
watch([() => form.startDate, () => form.endDate, () => form.startTime, () => form.endTime], () => {
  const days = diffDays.value;
  if (form.rentDays !== days) {
    form.rentDays = days;
  }
});

// AUTO-SYNC RETURN TIME WITH START TIME
watch(() => form.startTime, (newVal) => {
  form.endTime = newVal;
});

// Sync endDate when rentDays changes
const handleRentDaysInput = () => {
  if (!form.startDate || !form.startTime || form.rentDays < 1) return;
  const start = new Date(`${form.startDate}T${form.startTime}:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + parseInt(form.rentDays.toString()));
  form.endDate = end.toISOString().split('T')[0];
  form.endTime = end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const subTotal = computed(() => {
  if (!selectedCar.value || diffDays.value <= 0) return 0;
  return diffDays.value * selectedCar.value.dailyRate;
});

const contractTaxAmount = computed(() => {
  if (!appSettings.value || !appSettings.value.contractTaxEnabled) return 0;
  return form.contractTaxValue || 0;
});

const tvaAmount = computed(() => {
  if (!appSettings.value || !appSettings.value.tvaEnabled) return 0;
  // TVA is now only on the base (subTotal), contract fees are not billed to client
  const base = subTotal.value;
  return Math.round((base * (form.tvaValue / 100)) * 100) / 100;
});

const estimatedTotal = computed(() => {
  // Client pays only subTotal + TVA
  return Math.round((subTotal.value + tvaAmount.value) * 100) / 100;
});

// --- Global Logic ---
onMounted(async () => {
  loading.value = true;
  await fetchAppSettings();
  try {
    const [carsData, clientsData] = await Promise.all([
      carApi.getAll({ available: true }),
      clientApi.getAll()
    ]);
    availableCars.value = carsData.filter((c: any) => !c.disabled);
    clientResults.value = clientsData.filter((c: any) => !c.disabled);

    // Pre-fill from query params if available (e.g. from Reservation to Contract flow)
    // Pre-fill from query params if available (e.g. from Reservation to Contract flow)
    if (route.query.contractNumber) {
      manualReference.value = route.query.contractNumber as string;
    }
    
    // Explicitly fetch car and client if IDs are provided but not in the lists
    // (This ensures selection works even if a car is marked as booked/unavailable)
    if (route.query.carId) {
      const carId = route.query.carId as string;
      selectedCar.value = carsData.find((c: any) => c._id === carId) || null;
      if (!selectedCar.value) {
        try {
          selectedCar.value = await carApi.getOne(carId);
        } catch (e) {
          console.error('Failed to fetch car from query', e);
        }
      }
    }
    
    if (route.query.clientId) {
      const clientId = route.query.clientId as string;
      const client = clientsData.find((c: any) => c._id === clientId);
      if (client) {
        selectedClients.value = [client];
      } else {
        try {
          const fetchedClient = await clientApi.getOne(clientId);
          if (fetchedClient) selectedClients.value = [fetchedClient];
        } catch (e) {
          console.error('Failed to fetch client from query', e);
        }
      }
    }

    if (route.query.startDate) {
      form.startDate = route.query.startDate as string;
    }
    if (route.query.endDate) {
      form.endDate = route.query.endDate as string;
    }

    if (route.query.startTime) {
      form.startTime = (route.query.startTime as string).substring(0, 5);
    }
    if (route.query.endTime) {
      form.endTime = (route.query.endTime as string).substring(0, 5);
    }
    if (route.query.depositAmount) {
      form.depositAmount = Number(route.query.depositAmount);
    }
    
    // Auto-advance to last step if all critical data is provided
    if (selectedCar.value && selectedClients.value.length > 0) {
      activeStep.value = 2;
    }
  } finally {
    loading.value = false;
  }
});

const prevStep = () => { if (activeStep.value > 0) activeStep.value--; };
const nextStep = () => { if (activeStep.value < steps.length - 1) activeStep.value++; };

const handleGlobalEnter = () => {
  // Prevent enter from triggering if we are in a dialog or if the initialization modal is open
  if (isRefModalOpen.value || showConflictDialog.value || isClientDetailOpen.value) return;
  
  if (activeStep.value === 0 && selectedCar.value) {
    nextStep();
  } else if (activeStep.value === 1 && selectedClients.value.length > 0) {
    nextStep();
  } else if (activeStep.value === 2 && !submitting.value && estimatedTotal.value > 0) {
    if (form.paymentMethod === 'cheque' && (!form.chequeNumber || !form.bankName)) {
       alert('Veuillez remplir les informations du chèque.');
       return;
    }
    nextStep();
  } else if (activeStep.value === 3 && !submitting.value) {
    submitContrat();
  }
};

const submitContrat = async (force = false) => {
  if (submitting.value) return;
  submitting.value = true;
  try {
    const payload = {
      reference: manualReference.value || undefined,
      car: selectedCar.value._id,
      carDailyRate: selectedCar.value.dailyRate || selectedCar.value.dailyPrice || 0,
      clients: selectedClients.value.map(c => c._id),
      startDate: new Date(`${form.startDate}T${form.startTime}:00`).toISOString(),
      endDate: new Date(`${form.endDate}T${form.endTime}:00`).toISOString(),
      depositAmount: form.depositAmount,
      totalAmount: estimatedTotal.value,
      paymentMethod: form.paymentMethod,
      chequeNumber: form.chequeNumber,
      bankName: form.bankName,
      contractTaxValue: form.contractTaxValue,
      tvaValue: form.tvaValue,
      isPaid: true,
      reservation: route.query.reservationId || undefined,
      force: force
    };
    await contratApi.create(payload);
    showSuccessDialog.value = true;
  } catch (err: any) {
    if (err.response?.status === 409 && err.response?.data?.message === 'CAR_RESERVED_CONFLICT') {
      pendingConflicts.value = err.response.data.conflicts;
      showConflictDialog.value = true;
    } else {
      console.error('Erreur lors de la création du contrat:', err);
      alert(err.response?.data?.message || 'Erreur lors de la création du contrat');
    }
  } finally {
    submitting.value = false;
  }
};

const closeSuccessAndRedirect = () => {
  showSuccessDialog.value = false;
  router.push('/contrats');
};

const startConfiguration = () => {
  if (manualReference.value && manualReference.value.toString().length === 6) {
    isRefModalOpen.value = false;
  }
};

// Auto-redirect if modal closed without reference
watch(isRefModalOpen, (isOpen) => {
  if (!isOpen && !manualReference.value && !route.query.contractNumber) {
    router.push('/contrats');
  }
});
</script>

<template>
  <div @keyup.enter="handleGlobalEnter" class="contract-form-view space-y-8 animate-in fade-in duration-700 p-6 max-w-[1400px] mx-auto text-slate-900">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="space-y-1">
        <div class="flex items-center gap-2 text-indigo-600 font-black uppercase text-xs tracking-widest">
          <FileText class="w-4 h-4" />
          <span>Nouveau Contrat</span>
        </div>
        <h1 class="text-3xl font-black tracking-tight text-slate-900 uppercase italic">Configuration <span class="text-indigo-600 italic">du Contrat</span></h1>
        <p class="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] pl-1">Paramétrez les détails de votre nouvelle location opérationnelle.</p>
      </div>
    </div>

    <!-- MAIN GRID LAYOUT -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <!-- LEFT: FORM STEPS (8 Columns) -->
      <div class="lg:col-span-8 space-y-8">
        
        <!-- Stepper Indicator -->
        <div class="flex items-center justify-between bg-white/70 backdrop-blur-3xl border border-slate-200/50 p-6 rounded-[2rem] shadow-xl">
          <div 
            v-for="(step, index) in steps" 
            :key="index"
            class="flex items-center gap-4 group cursor-pointer transition-all"
            @click="index < activeStep ? activeStep = index : null"
          >
            <div 
              :class="[ 'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2', activeStep === index ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-600/20 scale-110 rotate-3' : activeStep > index ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 ' : 'bg-slate-50 border-slate-100 text-slate-400 ' ]"
            >
              <component :is="step.icon" class="w-5 h-5 stroke-[2.5]" />
            </div>
            <div class="hidden xl:block">
              <div :class="['text-[11px] font-black uppercase tracking-[0.2em] leading-none', activeStep >= index ? 'text-slate-900 ' : 'text-slate-400 ']">
                {{ step.label }}
              </div>
            </div>
            <div v-if="index < steps.length - 1" class="hidden md:block w-8 lg:w-16 h-px bg-slate-100 mx-4"></div>
          </div>
        </div>

        <!-- Step Content -->
        <div class="min-h-[400px]">
          <!-- STEP 1: CAR -->
          <div v-if="activeStep === 0" class="space-y-6 animate-in slide-in-from-left-4 duration-500">
            <div class="flex items-center justify-between">
              <h3 class="text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-3 italic">
                 <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 rotate-[-10deg]">01</div>
                 Véhicule
              </h3>
              <div class="relative w-full max-w-xs group">
                <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <Input v-model="carSearch" placeholder="Filtre rapide..." class="h-12 pl-12 bg-white/50 border-slate-200 rounded-2xl font-bold text-slate-900" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div 
                 v-for="car in filteredCars" 
                 :key="car._id" 
                 @click="selectedCar = car"
                 :class="[
                   'relative p-6 rounded-[2rem] border-2 transition-all duration-500 cursor-pointer group',
                   selectedCar?._id === car._id 
                     ? 'bg-indigo-600 border-indigo-600 shadow-2xl shadow-indigo-600/20' 
                     : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-xl'
                 ]"
               >
                 <!-- Selection Badge -->
                 <div 
                   class="absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500"
                   :class="selectedCar?._id === car._id ? 'bg-white border-white scale-110' : 'border-slate-200 group-hover:border-indigo-300'"
                 >
                   <Check v-if="selectedCar?._id === car._id" class="w-3 h-3 text-indigo-600 stroke-[4]" />
                 </div>

                 <div class="space-y-4">
                   <div class="flex items-center gap-4">
                     <div 
                       :class="[
                         'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                         selectedCar?._id === car._id ? 'bg-white/10 text-white' : 'bg-slate-50 text-indigo-600'
                       ]"
                     >
                       <CarIcon class="w-6 h-6" />
                     </div>
                     <div class="min-w-0">
                       <h4 :class="['font-black uppercase italic tracking-tight truncate', selectedCar?._id === car._id ? 'text-white' : 'text-slate-900']">
                         {{ car.brand }} {{ car.model }}
                       </h4>
                       <div class="flex items-center gap-2 mt-1">
                          <span :class="['px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border', selectedCar?._id === car._id ? 'bg-white/10 border-white/20 text-indigo-100' : 'bg-slate-50 border-slate-100 text-slate-400']">
                             {{ car.category || 'Économique' }}
                          </span>
                       </div>
                     </div>
                   </div>

                   <div class="flex items-center justify-between pt-2 border-t" :class="selectedCar?._id === car._id ? 'border-white/10' : 'border-slate-50'">
                     <div class="flex flex-col">
                        <span :class="['text-[8px] font-black uppercase tracking-[0.2em]', selectedCar?._id === car._id ? 'text-white/40' : 'text-slate-400']">Matricule</span>
                        <span :class="['font-mono font-black text-[13px] tracking-widest uppercase', selectedCar?._id === car._id ? 'text-white' : 'text-indigo-600']">{{ car.matricule }}</span>
                     </div>
                     <div class="text-right">
                        <span :class="['text-[8px] font-black uppercase tracking-[0.2em]', selectedCar?._id === car._id ? 'text-white/40' : 'text-slate-400']">Par Jour</span>
                        <div :class="['font-black text-xl tabular-nums', selectedCar?._id === car._id ? 'text-white' : 'text-slate-900']">
                           {{ car.dailyRate }} <span class="text-xs opacity-50 ml-0.5">TND</span>
                        </div>
                     </div>
                   </div>
                 </div>
               </div>
            </div>

            <div class="flex justify-end pt-4">
              <Button :disabled="!selectedCar" @click="nextStep" class="h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black gap-3 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
                Étape Suivante <ArrowRight class="w-5 h-5 stroke-[3]" />
              </Button>
            </div>
          </div>

          <!-- STEP 2: CLIENT -->
          <div v-else-if="activeStep === 1" class="space-y-6 animate-in slide-in-from-left-4 duration-500">
            <h3 class="text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-3 italic">
               <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 rotate-[-10deg]">02</div>
               Conducteurs
                                <Badge v-if="selectedClients.length > 0" :class="['ml-auto text-white h-8 px-4 rounded-full font-black text-[10px] tracking-widest uppercase', selectedClients.length >= 2 ? 'bg-amber-500 shadow-xl shadow-amber-500/20 border-none' : 'bg-indigo-600 shadow-xl shadow-indigo-600/20 border-none']">
                   {{ selectedClients.length }} / 2 Dossiers
                </Badge>
            </h3>
            
            <div class="relative group">
              <Search class="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input v-model="clientQuery" placeholder="Nom, CIN ou Téléphone..." class="w-full h-16 pl-14 pr-6 bg-white/70 backdrop-blur-xl border border-slate-200 shadow-xl rounded-3xl font-black text-slate-900 placeholder:text-slate-400 :text-slate-600 outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all" />
            </div>

            <div class="grid grid-cols-1 gap-4 overflow-y-auto max-h-[500px] custom-scrollbar pr-2">
               <Card 
                  v-for="client in clientResults" 
                  :key="client._id" 
                  @click="selectClient(client)"
                  :class="['border-2 cursor-pointer transition-all duration-500 rounded-[2rem] shadow-sm hover:shadow-xl relative overflow-hidden group', selectedClients.find(c => c._id === client._id) ? 'border-indigo-600 bg-indigo-50/30 shadow-indigo-600/10' : 'border-slate-100 bg-white/50 ']"
               >
                  <CardContent class="p-6 flex items-center justify-between">
                     <div class="flex items-center gap-5">
                        <div class="relative">
                          <Avatar class="w-16 h-16 border-4 border-white shadow-2xl group-hover:scale-105 transition-transform duration-500">
                             <AvatarFallback class="font-black bg-indigo-50 text-indigo-600 text-xl italic tabular-nums">{{ client.firstName[0] }}{{ client.lastName[0] }}</AvatarFallback>
                          </Avatar>
                          <div v-if="selectedClients.find(c => c._id === client._id)" class="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 border-2 border-white rounded-full flex items-center justify-center text-white shadow-lg animate-in zoom-in-50 duration-300">
                            <Check class="w-3 h-3 stroke-[3]" />
                          </div>
                        </div>
                        <div class="space-y-1">
                           <div class="flex items-center gap-3">
                              <span class="font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 :text-indigo-400 transition-colors">{{ client.firstName }} {{ client.lastName }}</span>
                              <Badge v-if="client.totalRents > 0" class="h-5 px-2 text-[8px] font-black bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shrink-0 uppercase tracking-tighter">
                                 {{ client.totalRents }} LOCATIONS
                              </Badge>
                           </div>
                           <div class="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                              <span class="flex items-center gap-1.5"><Hash class="w-3 h-3" /> {{ client.cin }}</span>
                              <span class="flex items-center gap-1.5"><MapPin class="w-3 h-3" /> {{ client.phone }}</span>
                           </div>
                        </div>
                     </div>
                     <div class="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 duration-500">
                        <Button variant="ghost" size="icon" @click.stop="showClientDetails(client)" class="rounded-xl h-11 w-11 bg-slate-100 hover:bg-indigo-600 dark:bg-indigo-500 hover:text-white transition-all"><Eye class="w-5 h-5 stroke-[2.5]" /></Button>
                     </div>
                  </CardContent>
               </Card>
            </div>

            <div class="flex justify-between pt-4">
              <Button @click="prevStep" variant="outline" class="h-14 px-8 border-2 border-slate-100 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 flex items-center gap-2">
                <ArrowLeft class="w-4 h-4 stroke-[3]" /> Précédent
              </Button>
              <Button :disabled="selectedClients.length === 0" @click="nextStep" class="h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black gap-3 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">Suivant <ArrowRight class="w-5 h-5 stroke-[3]" /></Button>
            </div>
          </div>

          <!-- STEP 3: DETAILS -->
          <div v-else-if="activeStep === 2" class="space-y-8 animate-in slide-in-from-left-4 duration-500">
             <h3 class="text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-3 italic">
               <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 rotate-[-10deg]">03</div>
               Planification & Caution
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/70 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-slate-200/50 shadow-2xl">
              <div class="space-y-3">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Date Sortie (Départ)</label>
                <div class="flex gap-2 relative group">
                  <CalendarIcon class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-600 z-10" />
                  <input type="date" v-model="form.startDate" disabled class="h-14 w-full pl-12 pr-4 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-slate-500 cursor-not-allowed italic" style="flex: 2;" />
                  <input type="time" v-model="form.startTime" class="h-14 w-full px-4 bg-slate-50/50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all" style="flex: 1;" />
                </div>
              </div>
              <div class="space-y-3">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Durée en Jours</label>
                <div class="relative group">
                   <Clock class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-600" />
                   <input type="number" v-model="form.rentDays" @input="handleRentDaysInput" min="1" class="h-14 w-full pl-12 pr-6 bg-slate-50/50 border border-slate-100 rounded-2xl font-black text-indigo-600 tabular-nums outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all" />
                </div>
              </div>
              <div class="space-y-3">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Date Retour (Automatique)</label>
                <div class="flex gap-2 relative">
                  <CalendarIcon class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 z-10" />
                  <input type="date" v-model="form.endDate" disabled class="h-14 w-full pl-12 pr-4 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-slate-500 cursor-not-allowed italic" style="flex: 2;" />
                  <input type="time" v-model="form.endTime" disabled class="h-14 w-full px-4 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-slate-500 cursor-not-allowed italic" style="flex: 1;" />
                </div>
              </div>
              <div class="space-y-3">
                 <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Montant Caution (Bloquée)</label>
                 <div class="relative">
                    <ShieldCheck class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
                    <input type="number" v-model="form.depositAmount" class="h-14 w-full pl-12 pr-12 bg-slate-50/50 border border-slate-100 rounded-2xl font-black text-emerald-600 tabular-nums outline-none focus:ring-4 focus:ring-emerald-600/5 transition-all" />
                    <span class="absolute right-4 top-1/2 -translate-y-1/2 font-black text-[10px] text-emerald-600/40 uppercase">TND</span>
                 </div>
               </div>
               <div class="space-y-3 md:col-span-2">
                 <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Méthode de Règlement</label>
                 <div class="grid grid-cols-2 gap-4">
                    <button v-for="m in [['espece','Espèce'],['cheque','Chèque']]" :key="m[0]" @click="form.paymentMethod = m[0]" :class="['h-14 rounded-2xl border-2 font-black uppercase text-[10px] transition-all', form.paymentMethod === m[0] ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-lg shadow-indigo-600/10' : 'border-slate-100 bg-slate-50 text-slate-400']">{{ m[1] }}</button>
                 </div>
               </div>
               
               <template v-if="form.paymentMethod === 'cheque'">
                  <div class="space-y-3">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Numéro du Chèque</label>
                    <input v-model="form.chequeNumber" class="h-14 w-full px-6 bg-slate-50/50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all" />
                  </div>
                  <div class="space-y-3">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Banque Émettrice</label>
                    <input v-model="form.bankName" class="h-14 w-full px-6 bg-slate-50/50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all" />
                  </div>
               </template>

               <div v-if="appSettings?.contractTaxEnabled" class="space-y-3">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Frais sur contrat (TND)</label>
                  <div class="relative">
                    <DollarSign class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-600" />
                    <input type="number" v-model="form.contractTaxValue" class="h-14 w-full pl-12 pr-6 bg-slate-50/50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all" />
                  </div>
                </div>

                <div v-if="appSettings?.tvaEnabled" class="space-y-3">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">TVA (%)</label>
                  <div class="relative">
                    <Percent class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-600" />
                    <input type="number" v-model="form.tvaValue" class="h-14 w-full pl-12 pr-6 bg-slate-50/50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all" />
                  </div>
                </div>

               <div class="md:col-span-2 p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex items-center gap-4">
                  <div class="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20"><FileWarning class="w-5 h-5" /></div>
                  <p class="text-[10px] font-black text-rose-600 uppercase leading-relaxed tracking-wide">
                     Le contrat doit être intégralement réglé au moment de l'émission. <br/>
                     <span class="opacity-60 italic">Toute validation confirme l'encaissement de {{ estimatedTotal }} TND.</span>
                  </p>
               </div>
            </div>

            <div class="flex justify-between pt-4">
              <Button @click="prevStep" variant="outline" class="h-14 px-8 border-2 border-slate-100 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 flex items-center gap-2">
                <ArrowLeft class="w-4 h-4 stroke-[3]" /> Précédent
              </Button>
              <Button @click="nextStep" class="h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black gap-3 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
                 Suivant <ArrowRight class="w-5 h-5 stroke-[3]" />
              </Button>
            </div>
          </div>

          <!-- STEP 4: VALIDATION -->
          <div v-else-if="activeStep === 3" class="space-y-8 animate-in slide-in-from-left-4 duration-500">
             <h3 class="text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-3 italic">
               <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 rotate-[-10deg]">04</div>
               Vérification & Confirmation
             </h3>

             <div class="space-y-6 bg-white/70 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-slate-200/50 shadow-2xl">
               <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <!-- Car details -->
                 <div class="space-y-2">
                   <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Véhicule</span>
                   <div v-if="selectedCar" class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <p class="font-black text-slate-900 uppercase italic text-sm">{{ selectedCar.brand }} {{ selectedCar.model }}</p>
                     <p class="text-xs font-bold text-slate-500 mt-1">Matricule: <span class="font-mono text-indigo-600 font-bold">{{ selectedCar.matricule }}</span></p>
                     <p class="text-xs font-bold text-slate-500">Prix Journalier: <span class="font-black text-slate-800">{{ selectedCar.dailyRate || selectedCar.dailyPrice }} TND/J</span></p>
                   </div>
                 </div>

                 <!-- Client details -->
                 <div class="space-y-2">
                   <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Conducteur(s)</span>
                   <div class="space-y-2">
                     <div v-for="client in selectedClients" :key="client._id" class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p class="font-black text-slate-900 uppercase text-sm">{{ client.firstName }} {{ client.lastName }}</p>
                       <p class="text-[10px] font-bold text-slate-500 mt-1">CIN/ID: <span class="font-black text-slate-700">{{ client.cin }}</span> | Tél: <span class="font-black text-slate-700">{{ client.phone }}</span></p>
                     </div>
                   </div>
                 </div>

                 <!-- Period Details -->
                 <div class="space-y-2 md:col-span-2">
                   <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-bold">Période de Location</span>
                   <div class="p-5 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <div>
                       <span class="text-[8px] font-black text-slate-400 uppercase block">Date Départ</span>
                       <span class="text-xs font-black text-slate-900">{{ formatDate(new Date(`${form.startDate}T${form.startTime}:00`)) }}</span>
                     </div>
                     <div>
                       <span class="text-[8px] font-black text-slate-400 uppercase block">Date Retour (Est.)</span>
                       <span class="text-xs font-black text-slate-900">{{ formatDate(new Date(`${form.endDate}T${form.endTime}:00`)) }}</span>
                     </div>
                     <div>
                       <span class="text-[8px] font-black text-slate-400 uppercase block">Durée Totale</span>
                       <span class="text-xs font-black text-indigo-600 uppercase">{{ diffDays }} Jours</span>
                     </div>
                   </div>
                 </div>

                 <!-- Pricing details -->
                 <div class="space-y-2 md:col-span-2">
                   <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-bold">Bilan Financier</span>
                   <div class="p-5 bg-slate-900 text-white rounded-2xl space-y-3">
                     <div class="flex justify-between text-xs">
                       <span class="opacity-60 uppercase">Base Location ({{ diffDays }} jours × {{ selectedCar?.dailyRate || selectedCar?.dailyPrice }} TND)</span>
                       <span class="font-black">{{ subTotal }} TND</span>
                     </div>
                     <div v-if="appSettings?.contractTaxEnabled" class="flex justify-between text-xs text-rose-300">
                       <span class="opacity-60 uppercase">Frais de contrat</span>
                       <span class="font-black">+ {{ contractTaxAmount }} TND</span>
                     </div>
                     <div v-if="appSettings?.tvaEnabled" class="flex justify-between text-xs">
                       <span class="opacity-60 uppercase">TVA ({{ appSettings.tvaValue }}%)</span>
                       <span class="font-black">+ {{ tvaAmount }} TND</span>
                     </div>
                     <div class="h-px bg-white/10 my-2"></div>
                     <div class="flex justify-between items-center text-sm font-black">
                       <span class="uppercase tracking-widest text-indigo-300">Total à Régler</span>
                       <span class="text-xl text-emerald-400 tabular-nums">{{ estimatedTotal }} TND</span>
                     </div>
                     <div class="flex justify-between text-xs text-slate-400 pt-1">
                       <span class="uppercase">Garantie / Caution</span>
                       <span class="font-black">{{ form.depositAmount }} TND ({{ form.paymentMethod === 'espece' ? 'Espèce' : 'Chèque' }})</span>
                     </div>
                   </div>
                 </div>
               </div>

               <div class="p-6 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] flex items-center gap-4">
                 <div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/20"><ShieldCheck class="w-5 h-5" /></div>
                 <p class="text-[10px] font-black text-indigo-700 uppercase leading-relaxed tracking-wide">
                    Veuillez confirmer que toutes les informations ci-dessus sont exactes. <br/>
                    <span class="opacity-75">L'émission du contrat enregistrera un nouveau document officiel.</span>
                 </p>
               </div>
             </div>

             <div class="flex justify-between pt-4">
               <Button @click="prevStep" variant="outline" class="h-14 px-8 border-2 border-slate-100 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 flex items-center gap-2">
                 <ArrowLeft class="w-4 h-4 stroke-[3]" /> Précédent
               </Button>
               <Button :loading="submitting" @click="submitContrat()" class="h-14 px-10 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 text-white rounded-2xl font-black gap-3 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">
                  Confirmer & Émettre <Check class="w-5 h-5 stroke-[3]" />
               </Button>
             </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: PERSISTENT SUMMARY (4 Columns) -->
      <div class="lg:col-span-4 sticky top-6">
         <Card class="border-none shadow-[0_40px_80px_rgba(15,23,42,0.1)] [0_40px_80px_rgba(0,0,0,0.8)] bg-white/90 backdrop-blur-3xl overflow-hidden rounded-[3.5rem] relative min-h-[550px] flex flex-col transition-all duration-700">
            <!-- Glassy background effects -->
            <div class="absolute -top-12 -right-12 w-48 h-48 bg-indigo-600/20 rounded-full blur-[100px]"></div>
            <div class="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-[100px]"></div>

            <CardHeader class="pt-10 px-10 relative z-10">
               <div class="flex items-center justify-between mb-6">
                  <Badge class="bg-indigo-600/10 text-indigo-600 border-none text-[9px] font-black tracking-[0.3em] h-7 px-3 rounded-full">APERÇU FINAL</Badge>
                  <span class="text-[10px] font-bold text-slate-400 italic uppercase tracking-widest">Réf: #{{ manualReference || '------' }}</span>
               </div>
               <CardTitle class="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">Forge <span class="text-indigo-600">Contrat</span></CardTitle>
            </CardHeader>

            <CardContent class="px-10 py-6 space-y-10 relative z-10 flex-1">
               <!-- Car Brief -->
               <div class="space-y-4">
                  <div class="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">VÉHICULE SELECTIONNÉ</div>
                  <div v-if="selectedCar" class="flex items-center gap-5 bg-slate-50 p-5 rounded-[2rem] border border-slate-100 animate-in slide-in-from-right-4 duration-700">
                     <div class="w-14 h-14 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-600 shrink-0 shadow-inner">
                        <CarIcon class="w-7 h-7" />
                     </div>
                     <div>
                        <div class="font-black text-slate-900 uppercase text-sm italic tracking-tight">{{ selectedCar.brand }} {{ selectedCar.model }}</div>
                        <div class="text-[11px] font-mono font-black text-indigo-600/60 uppercase tracking-[0.2em] mt-1">{{ selectedCar.matricule }}</div>
                     </div>
                  </div>
                  <div v-else class="h-24 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center opacity-40 transition-all">
                    <CarIcon class="w-6 h-6 mb-2 stroke-[1.5] text-slate-400" />
                    <span class="italic text-[10px] font-bold uppercase tracking-widest text-slate-400">En attente de sélection</span>
                  </div>
               </div>

               <!-- Client Brief -->
               <div class="space-y-4">
                  <div class="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">LOCATAIRES ENGAGÉS</div>
                  <div v-if="selectedClients.length > 0" class="space-y-3">
                    <div v-for="client in selectedClients" :key="client._id" class="flex items-center gap-5 bg-slate-50 p-4 rounded-[2rem] border border-slate-100 animate-in slide-in-from-right-4 duration-700">
                       <div class="w-11 h-11 rounded-2xl bg-emerald-600/10 flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
                          <UserIcon class="w-5 h-5" />
                       </div>
                       <div class="min-w-0 flex-1">
                          <div class="font-black text-slate-900 uppercase text-xs truncate italic tracking-tight">{{ client.firstName }} {{ client.lastName }}</div>
                          <div class="text-[9px] font-mono font-black text-emerald-600/50 uppercase tracking-widest mt-0.5">ID: {{ client.cin }}</div>
                       </div>
                    </div>
                  </div>
                  <div v-else class="h-24 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center opacity-40 transition-all">
                    <UserIcon class="w-6 h-6 mb-2 stroke-[1.5] text-slate-400" />
                    <span class="italic text-[10px] font-bold uppercase tracking-widest text-slate-400">En attente de sélection</span>
                  </div>
               </div>

               <!-- Financials -->
               <div class="pt-10 border-t border-slate-100 space-y-8">
                  <div class="flex justify-between items-center">
                     <div class="space-y-1">
                        <div class="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">DURÉE TOTALE</div>
                        <div class="font-black text-3xl tabular-nums text-slate-900 italic tracking-tighter">{{ diffDays }} <span class="text-xs font-bold opacity-30 tracking-widest ml-1">JOURS</span></div>
                     </div>
                     <div class="text-right space-y-1">
                        <div class="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">CAUTION + TOTAL PAYÉ</div>
                        <div class="font-black text-2xl tabular-nums text-emerald-600 tracking-tighter">{{ form.depositAmount }} / <span class="text-indigo-600">{{ estimatedTotal }}</span></div>
                     </div>
                  </div>
                  
                  <div v-if="appSettings && (appSettings.tvaEnabled || appSettings.contractTaxEnabled)" class="space-y-2 border-y border-slate-50 py-4 animate-in fade-in duration-500">
                     <div class="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Base HT ({{ diffDays }} jours)</span>
                        <span>{{ subTotal }} TND</span>
                     </div>
                     <div v-if="appSettings.contractTaxEnabled" class="flex justify-between text-[10px] font-bold uppercase tracking-wider text-rose-400">
                        <span>Frais sur contrat (Charge Agence)</span>
                        <span>{{ contractTaxAmount }} TND</span>
                     </div>
                     <div v-if="appSettings.tvaEnabled" class="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span>TVA ({{ appSettings.tvaValue }}%)</span>
                        <span>{{ tvaAmount }} TND</span>
                     </div>
                  </div>
                  
                  <div class="bg-indigo-600 p-8 rounded-[2.5rem] border border-indigo-500/10 flex flex-col items-center text-center space-y-2 group hover:bg-indigo-700 transition-all duration-700 shadow-xl shadow-indigo-600/20">
                      <div class="text-[10px] font-black text-white/60 uppercase tracking-[0.5em] transition-colors">NET À PAYER ESTIMÉ</div>
                      <div class="font-black text-6xl tabular-nums text-white tracking-tighter drop-shadow-2xl">
                         {{ estimatedTotal }}<span class="text-xl ml-2 font-black text-white/60 transition-colors">TND</span>
                      </div>
                  </div>
               </div>
            </CardContent>

            <!-- Bottom Progress -->
            <div class="p-10 pt-0 relative z-10 mt-auto">
               <div class="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div class="h-full bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-all duration-1000 ease-out" :style="`width: ${((activeStep + 1) / steps.length) * 100}%`"></div>
               </div>
               <div class="text-[9px] font-black text-center text-slate-400 uppercase tracking-[0.6em]">Configuration • {{ activeStep + 1 }} / 3</div>
            </div>
         </Card>
      </div>
    </div>

    <!-- IDENTIFICATION MODAL (Flotten Input) -->
    <Dialog v-model:open="isRefModalOpen">
      <DialogContent class="sm:max-w-md bg-white border-none shadow-[0_50px_100px_rgba(0,0,0,0.2)] [0_50px_100px_rgba(0,0,0,0.8)] p-0 overflow-hidden text-slate-900 rounded-[3rem] max-h-[90vh] flex flex-col">
        <div class="absolute -top-12 -left-12 w-48 h-48 bg-indigo-600/30 rounded-full blur-[100px] opacity-50"></div>
        <CardHeader class="p-10 pb-6 relative z-10 text-center">
            <div class="w-24 h-24 bg-indigo-600/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-indigo-600 shadow-inner rotate-3">
                <Hash class="w-12 h-12 stroke-[2.5]" />
            </div>
            <DialogTitle class="text-4xl font-black tracking-tighter uppercase italic mb-3 text-slate-900">Initialisation</DialogTitle>
            <DialogDescription class="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] max-w-[200px] mx-auto leading-relaxed">
                Entrez le numéro du nouveau contrat système.
            </DialogDescription>
        </CardHeader>
        <div class="px-10 py-10 relative z-10">
            <div class="space-y-6">
                <div class="relative group">
                    <input 
                        v-model="manualReference" 
                        type="text"
                        inputmode="numeric"
                        maxlength="6"
                        placeholder="000000" 
                        autofocus
                        @input="manualReference = manualReference.replace(/\D/g, '').slice(0, 6)"
                        @keyup.enter="startConfiguration"
                        class="h-28 w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-center text-6xl font-black text-slate-900 focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all tabular-nums placeholder:text-slate-200 :text-white/5 outline-none"
                    />
                </div>
                <Button 
                    :disabled="!manualReference || manualReference.toString().length !== 6" 
                    @click="startConfiguration"
                    class="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xl uppercase tracking-widest shadow-2xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
                >
                    Forger <ArrowRight class="w-7 h-7 stroke-[3]" />
                </Button>
                <button 
                    @click="router.push('/contrats')"
                    class="w-full h-12 text-slate-400 hover:text-slate-900 :text-white font-black uppercase text-[10px] tracking-[0.4em] transition-all flex items-center justify-center gap-2"
                >
                    <ArrowLeft class="w-3 h-3" /> Annuler & Retourner
                </button>
            </div>
        </div>

      </DialogContent>
    </Dialog>

    <!-- Client Detail Preview Dialog -->
    <Dialog v-model:open="isClientDetailOpen">
      <DialogContent v-if="clientShowingDetails" class="sm:max-w-xl bg-white border-none shadow-3xl rounded-[3rem] p-0 overflow-hidden text-slate-900 max-h-[90vh] flex flex-col">
        <DialogHeader class="p-10 bg-indigo-600 text-white relative">
           <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
           <div class="flex items-center gap-6 relative z-10">
              <Avatar class="w-20 h-20 border-4 border-white/20 shadow-2xl">
                 <AvatarFallback class="text-3xl font-black bg-indigo-600 text-white italic tabular-nums">
                    {{ clientShowingDetails.firstName[0] }}{{ clientShowingDetails.lastName[0] }}
                 </AvatarFallback>
              </Avatar>
              <div>
                 <DialogTitle class="text-3xl font-black uppercase tracking-tighter text-white">{{ clientShowingDetails.firstName }} {{ clientShowingDetails.lastName }}</DialogTitle>
                 <DialogDescription class="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mt-2 italic">Dossier Identité Client</DialogDescription>
              </div>
           </div>
        </DialogHeader>
        <div class="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
           <div class="space-y-6">
              <div v-if="clientShowingDetails.cinFront" class="aspect-[1.618/1] bg-slate-100 rounded-3xl border-2 border-slate-50 overflow-hidden shadow-inner group relative">
                 <img :src="getImageUrl(clientShowingDetails.cinFront)" class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                 <div class="absolute inset-0 bg-indigo-600/50 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div v-else class="aspect-[1.618/1] bg-slate-100 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center opacity-40">
                 <FileWarning class="w-8 h-8 mb-2" />
                 <span class="text-[9px] font-black uppercase tracking-widest">CIN Manquant</span>
              </div>
              <div class="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Droit de Conduite</div>
                  <div class="font-black text-indigo-600 uppercase tracking-tighter">{{ clientShowingDetails.drivingLicense || 'N/A' }}</div>
              </div>
           </div>
           <div class="space-y-6">
              <div class="space-y-4">
                 <div>
                    <div class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Ligne Directe</div>
                    <div class="font-black text-slate-900 tabular-nums">{{ clientShowingDetails.phone }}</div>
                 </div>
                 <div class="pt-4 border-t border-slate-100">
                    <div class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Résidence</div>
                    <div class="font-bold text-slate-600 leading-relaxed text-sm">{{ clientShowingDetails.address || 'Non spécifiée' }}</div>
                 </div>
              </div>
           </div>
        </div>
        <div class="p-10 pt-0">
           <Button @click="isClientDetailOpen = false" class="w-full h-14 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl transition-all">Fermer le Dossier</Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Conflict Warning Dialog -->
    <Dialog v-model:open="showConflictDialog">
      <DialogContent class="sm:max-w-[450px] bg-white/95 backdrop-blur-3xl rounded-[2.5rem] border-slate-200 shadow-3xl p-0 overflow-hidden text-slate-900 max-h-[90vh] flex flex-col">
        <DialogHeader class="bg-amber-500 p-8 text-white relative overflow-hidden">
          <div class="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-3xl opacity-50"></div>
          <DialogTitle class="text-2xl font-black uppercase tracking-tighter flex items-center gap-4 relative z-10 italic">
            <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner">
              <AlertTriangle class="w-7 h-7 text-white stroke-[3]" />
            </div>
            Conflit <span class="text-amber-100 italic font-black uppercase tracking-tight">Détecté</span>
          </DialogTitle>
          <DialogDescription class="text-white/80 font-black uppercase text-[9px] tracking-[0.3em] mt-2 ml-16 relative z-10">
            Véhicule déjà réservé sur cette période
          </DialogDescription>
        </DialogHeader>
        
        <div class="p-8 space-y-6">
          <div class="bg-amber-50 border border-amber-100 p-5 rounded-2xl">
            <p class="text-[11px] font-bold text-amber-700 leading-relaxed uppercase tracking-wide">
              Ce véhicule possède des chevauchements avec :
            </p>
            <div class="mt-3 flex gap-4">
               <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-indigo-600/20">{{ pendingConflicts.contracts?.length || 0 }}</div>
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contrats</span>
               </div>
               <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-amber-500/20">{{ pendingConflicts.reservations?.length || 0 }}</div>
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Résérv.</span>
               </div>
            </div>
          </div>

          <div class="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            <!-- Show Contracts first -->
            <div v-for="conflict in pendingConflicts.contracts" :key="conflict._id" class="flex flex-col p-4 bg-white border border-slate-100 rounded-2xl shadow-sm group">
               <div class="flex items-center justify-between mb-3">
                  <Badge class="bg-indigo-50 text-indigo-600 border-indigo-100 text-[8px] font-black px-2 py-0.5 rounded-lg shadow-none uppercase">Contrat Actif</Badge>
                  <span class="text-[10px] font-black text-slate-400 italic uppercase tracking-tighter">{{ conflict.reference }}</span>
               </div>
               <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-indigo-600">
                    <CalendarIcon class="w-4 h-4" />
                  </div>
                  <span class="text-[12px] font-black tabular-nums text-slate-700">{{ formatDate(conflict.startDate) }} — {{ formatDate(conflict.endDate) }}</span>
               </div>
            </div>

            <!-- Show Reservations -->
            <div v-for="conflict in pendingConflicts.reservations" :key="conflict._id" class="flex flex-col p-4 bg-white border border-slate-100 rounded-2xl shadow-sm group">
               <div class="flex items-center justify-between mb-3">
                  <Badge :class="[
                    'text-[8px] font-black px-2 py-0.5 rounded-lg shadow-none uppercase border',
                    conflict.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                  ]">
                    {{ conflict.status === 'confirmed' ? 'Réserv. Confirmée' : 'En Planification' }}
                  </Badge>
                  <span class="text-[10px] font-black text-slate-400 italic uppercase tracking-tighter" v-if="conflict.client">{{ conflict.client.lastName }} {{ conflict.client.firstName }}</span>
               </div>
               <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-amber-500">
                    <CalendarIcon class="w-4 h-4" />
                  </div>
                  <span class="text-[12px] font-black tabular-nums text-slate-700">{{ formatDate(conflict.startDate) }} — {{ formatDate(conflict.endDate) }}</span>
               </div>
            </div>
          </div>

          <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center leading-relaxed">
              En confirmant, les "Réservations" seront remises en "Planning". Les "Contrats" resteront actifs mais en chevauchement.
            </p>
          </div>
        </div>

        <DialogFooter class="p-8 pt-0 flex gap-4">
          <Button variant="ghost" @click="showConflictDialog = false" class="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all shadow-none">Annuler</Button>
          <Button @click="submitContrat(true)" class="flex-1 h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-amber-500/20 active:scale-95 transition-all">Confirmer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Success Confirmation Dialog -->
    <Dialog v-model:open="showSuccessDialog">
      <DialogContent class="sm:max-w-md bg-white border-none shadow-3xl p-0 overflow-hidden text-slate-900 rounded-[3rem]">
        <div class="p-10 text-center space-y-6">
          <div class="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 animate-bounce">
            <Check class="w-10 h-10 stroke-[3]" />
          </div>
          <div class="space-y-2">
            <h3 class="text-2xl font-black uppercase tracking-tight italic">Paiement Validé</h3>
            <p class="text-slate-400 font-bold uppercase text-[10px] tracking-widest leading-relaxed">
              Le contrat a été émis avec succès. <br/>
              Le règlement total a été enregistré.
            </p>
          </div>
          <Button @click="closeSuccessAndRedirect" class="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl uppercase tracking-widest text-xs transition-all active:scale-95 shadow-xl shadow-emerald-600/20">
            Terminer & Voir la Liste
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script lang="ts">
export default {
  name: 'ContratFormView'
}
</script>

<style scoped>
.contract-form-view {
  min-height: calc(100vh - 100px);
}
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
</style>
