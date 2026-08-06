<script setup lang="ts">
import { ref, watch, reactive, computed, onMounted, onUnmounted } from 'vue';
import { agenceApi, uploadApi, getImageUrl } from '@/api';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Upload, Plus, Trash2, Save, Move, Type, Eye, Palette, Layout, AlignLeft, AlignCenter, AlignRight, Bold, Search
} from 'lucide-vue-next';
import { useToast } from 'primevue/usetoast';

const props = defineProps<{
  open: boolean;
  agence: any;
}>();

const emit = defineEmits(['update:open', 'saved']);

const toast = useToast();
const loading = ref(false);
const uploading = ref(false);
const selectedFieldId = ref<string | null>(null);
const fieldSearch = ref('');

const filteredAvailableKeys = computed(() => {
  if (!fieldSearch.value) return availableKeys;
  const q = fieldSearch.value.toLowerCase();
  return availableKeys.filter(item => item.label.toLowerCase().includes(q) || item.key.toLowerCase().includes(q));
});

const agenceForm = reactive<{
  _id: string;
  name: string;
  templateImage: string;
  printBackground: boolean;
  templateFields: any[];
}>({
  _id: '',
  name: '',
  templateImage: '',
  printBackground: false,
  templateFields: [],
});

// Available Contract Elements to bind
const availableKeys = [
  { key: 'reference', label: 'N° Contrat (Ref)' },
  { key: 'agency', label: 'Nom Agence' },
  { key: 'startDate', label: 'Date Départ' },
  { key: 'startTime', label: 'Heure Départ' },
  { key: 'endDate', label: 'Date Retour' },
  { key: 'endTime', label: 'Heure Retour' },
  { key: 'rentDays', label: 'Durée (Jours)' },
  { key: 'lieuDepart', label: 'Lieu de Départ' },
  { key: 'lieuRetour', label: 'Lieu de Retour' },
  { key: 'carburantLevel', label: 'Niveau Carburant' },
  { key: 'carBrand', label: 'Marque Véhicule' },
  { key: 'carModel', label: 'Type / Modèle Véhicule' },
  { key: 'carBrandModel', label: 'Véhicule (Marque & Modèle)' },
  { key: 'carRegistration', label: 'Matricule Véhicule' },
  { key: 'client1Name', label: 'Client 1 - Nom & Prénom' },
  { key: 'client1FirstName', label: 'Client 1 - Prénom' },
  { key: 'client1LastName', label: 'Client 1 - Nom' },
  { key: 'client1Cin', label: 'Client 1 - CIN / Passeport' },
  { key: 'client1CinDate', label: 'Client 1 - Date CIN / Passeport' },
  { key: 'client1Phone', label: 'Client 1 - Téléphone' },
  { key: 'client1Birthday', label: 'Client 1 - Date de Naissance' },
  { key: 'client1LieuNaissance', label: 'Client 1 - Lieu de Naissance' },
  { key: 'client1License', label: 'Client 1 - N° Permis' },
  { key: 'client1LicenseDate', label: 'Client 1 - Date Permis' },
  { key: 'client1LieuPermis', label: 'Client 1 - Lieu de Permis' },
  { key: 'client1Address', label: 'Client 1 - Adresse' },
  { key: 'client1Nationality', label: 'Client 1 - Nationalité' },
  { key: 'client2Name', label: 'Client 2 - Nom & Prénom' },
  { key: 'client2FirstName', label: 'Client 2 - Prénom' },
  { key: 'client2LastName', label: 'Client 2 - Nom' },
  { key: 'client2Cin', label: 'Client 2 - CIN / Passeport' },
  { key: 'client2CinDate', label: 'Client 2 - Date CIN / Passeport' },
  { key: 'client2Phone', label: 'Client 2 - Téléphone' },
  { key: 'client2Birthday', label: 'Client 2 - Date de Naissance' },
  { key: 'client2LieuNaissance', label: 'Client 2 - Lieu de Naissance' },
  { key: 'client2License', label: 'Client 2 - N° Permis' },
  { key: 'client2LicenseDate', label: 'Client 2 - Date Permis' },
  { key: 'client2LieuPermis', label: 'Client 2 - Lieu de Permis' },
  { key: 'client2Address', label: 'Client 2 - Adresse' },
  { key: 'client2Nationality', label: 'Client 2 - Nationalité' },
  { key: 'carDailyRate', label: 'Tarif Journalier (TND)' },
  { key: 'subTotal', label: 'Sous-Total (TND)' },
  { key: 'contractTax', label: 'Frais Contrat (TND)' },
  { key: 'tva', label: 'Montant TVA (TND)' },
  { key: 'totalAmount', label: 'Montant Total (TND)' },
  { key: 'depositAmount', label: 'Montant Caution (TND)' },
  { key: 'paymentMethod', label: 'Méthode de Règlement' },
  { key: 'startMileage', label: 'Kilométrage Départ' },
  { key: 'returnMileage', label: 'Kilométrage Retour' },
  { key: 'notes', label: 'Observations / Remarques' },
  { key: 'currentDate', label: 'Date d\'Émission (Aujourd\'hui)' },
  { key: 'customText', label: 'Texte Fixe Personnalisé' }
];

// Sample placeholder data for visual editor preview
const sampleValues: Record<string, string> = {
  reference: '000123',
  agency: 'AGENCE PRINCIPALE',
  startDate: '15/08/2026',
  startTime: '09:00',
  endDate: '20/08/2026',
  endTime: '18:00',
  rentDays: '5 Jours',
  lieuDepart: 'Djerba',
  lieuRetour: 'Djerba',
  carburantLevel: '75%',
  carBrand: 'PEUGEOT',
  carModel: '208 AUTOMATIQUE',
  carBrandModel: 'PEUGEOT 208 AUTOMATIQUE',
  carRegistration: '220 TN 4567',
  client1Name: 'BEN ALI MOHAMED',
  client1FirstName: 'MOHAMED',
  client1LastName: 'BEN ALI',
  client1Cin: '08765432',
  client1CinDate: '10/01/2015',
  client1Phone: '+216 98 123 456',
  client1Birthday: '15/03/1990',
  client1LieuNaissance: 'Djerba',
  client1License: '12/345678',
  client1LicenseDate: '20/06/2010',
  client1LieuPermis: 'Djerba',
  client1Address: 'Avenue Habib Bourguiba, Tunis',
  client1Nationality: 'Tunisienne',
  client2Name: 'TRABELSI AHMED',
  client2FirstName: 'AHMED',
  client2LastName: 'TRABELSI',
  client2Cin: '05432109',
  client2CinDate: '05/06/2012',
  client2Phone: '+216 71 654 321',
  client2Birthday: '22/07/1985',
  client2LieuNaissance: 'Tunis',
  client2License: '98/765432',
  client2LicenseDate: '10/09/2008',
  client2LieuPermis: 'Tunis',
  client2Address: 'Rue de la Liberté, Sfax',
  client2Nationality: 'Tunisienne',
  carDailyRate: '120 TND',
  subTotal: '600 TND',
  contractTax: '10 TND',
  tva: '120 TND',
  totalAmount: '730 TND',
  depositAmount: '1000 TND',
  paymentMethod: 'Espèce',
  startMileage: '45,200 KM',
  returnMileage: '45,750 KM',
  notes: 'Véhicule propre, réservoir plein.',
  currentDate: '15/08/2026',
  customText: 'Texte Personnalisé'
};

watch(() => props.open, (newVal) => {
  if (newVal && props.agence) {
    agenceForm._id = props.agence._id;
    agenceForm.name = props.agence.name || '';
    agenceForm.templateImage = props.agence.templateImage || '';
    agenceForm.printBackground = false; // Always force false for print background as requested
    agenceForm.templateFields = Array.isArray(props.agence.templateFields) 
      ? JSON.parse(JSON.stringify(props.agence.templateFields))
      : [];
    selectedFieldId.value = null;
  }
}, { immediate: true });

const fileInputRef = ref<HTMLInputElement | null>(null);

const triggerUpload = () => {
  fileInputRef.value?.click();
};

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  const file = target.files[0];
  
  uploading.value = true;
  try {
    const res = await uploadApi.upload(file);
    agenceForm.templateImage = res.url;
    toast.add({
      severity: 'success',
      summary: 'Arrière-plan Téléversé',
      detail: 'Le design du contrat a été mis à jour.',
      life: 3000
    });
  } catch (err) {
    console.error('Upload failed:', err);
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Échec du téléversement de l\'image.',
      life: 3000
    });
  } finally {
    uploading.value = false;
  }
};

const addField = (key: string) => {
  const item = availableKeys.find(k => k.key === key);
  if (!item) return;

  const newField = {
    id: 'f_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    key: item.key,
    label: item.label,
    x: 10,
    y: 10 + (agenceForm.templateFields.length * 4) % 70,
    fontSize: 13,
    fontWeight: 'normal',
    alignment: 'left',
    color: '#000000',
    customValue: item.key === 'customText' ? 'Texte' : ''
  };

  agenceForm.templateFields.push(newField);
  selectedFieldId.value = newField.id;
};

const removeField = (id: string) => {
  agenceForm.templateFields = agenceForm.templateFields.filter(f => f.id !== id);
  if (selectedFieldId.value === id) {
    selectedFieldId.value = null;
  }
};

const getSelectedField = () => {
  return agenceForm.templateFields.find(f => f.id === selectedFieldId.value) || null;
};

// Dragging logic on A4 Canvas
const canvasRef = ref<HTMLElement | null>(null);
const draggingFieldId = ref<string | null>(null);
const dragOffset = ref({ x: 0, y: 0 });

const startDrag = (event: MouseEvent, fieldId: string) => {
  event.stopPropagation();
  selectedFieldId.value = fieldId;
  draggingFieldId.value = fieldId;
  
  if (!canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const field = agenceForm.templateFields.find(f => f.id === fieldId);
  if (!field) return;

  const currentXpx = (field.x / 100) * rect.width;
  const currentYpx = (field.y / 100) * rect.height;

  dragOffset.value = {
    x: event.clientX - currentXpx,
    y: event.clientY - currentYpx
  };

  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
};

const onDrag = (event: MouseEvent) => {
  if (!draggingFieldId.value || !canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const field = agenceForm.templateFields.find(f => f.id === draggingFieldId.value);
  if (!field) return;

  let newXpx = event.clientX - dragOffset.value.x;
  let newYpx = event.clientY - dragOffset.value.y;

  let xPct = Math.min(Math.max((newXpx / rect.width) * 100, 0), 95);
  let yPct = Math.min(Math.max((newYpx / rect.height) * 100, 0), 98);

  field.x = Math.round(xPct * 10) / 10;
  field.y = Math.round(yPct * 10) / 10;
};

const stopDrag = () => {
  draggingFieldId.value = null;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
};

// Keyboard shortcuts for selected field
const handleKeydown = (e: KeyboardEvent) => {
  if (!selectedFieldId.value) return;
  const field = agenceForm.templateFields.find(f => f.id === selectedFieldId.value);
  if (!field) return;

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      field.fontWeight = field.fontWeight === 'bold' ? 'normal' : 'bold';
    } else if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      field.alignment = 'left';
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      field.alignment = 'right';
    }
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

const saveTemplate = async () => {
  loading.value = true;
  try {
    await agenceApi.update(agenceForm._id, {
      templateImage: agenceForm.templateImage,
      printBackground: false, // Ensure false for printing
      templateFields: agenceForm.templateFields
    });
    toast.add({
      severity: 'success',
      summary: 'Modèle Enregistré',
      detail: `Le modèle de contrat pour "${agenceForm.name}" a été sauvegardé.`,
      life: 3000
    });
    emit('saved');
    emit('update:open', false);
  } catch (err) {
    console.error('Failed to save template:', err);
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Impossible de sauvegarder le modèle.',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="val => emit('update:open', val)">
    <DialogContent class="sm:max-w-7xl bg-slate-900 text-white border-slate-800 rounded-[2.5rem] p-0 overflow-hidden max-h-[95vh] flex flex-col">
      
      <!-- HEADER -->
      <DialogHeader class="p-6 bg-slate-800/80 border-b border-slate-700/50 flex flex-row items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Layout class="w-6 h-6" />
          </div>
          <div>
            <DialogTitle class="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              Personnalisation du Contrat : <span class="text-indigo-400 italic">{{ agenceForm.name }}</span>
            </DialogTitle>
            <DialogDescription class="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">
              Placez les éléments du contrat aux endroits exacts sur votre papier pré-imprimé.
            </DialogDescription>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="handleFileUpload" />
          <Button @click="triggerUpload" :disabled="uploading" variant="outline" class="h-11 px-5 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white rounded-xl font-black uppercase tracking-wider text-[10px] gap-2">
            <Upload class="w-4 h-4 text-indigo-400" />
            <span v-if="uploading">Téléversement...</span>
            <span v-else>{{ agenceForm.templateImage ? 'Changer l\'image de fond' : 'Téléverser le design papier' }}</span>
          </Button>
          <Button @click="saveTemplate" :disabled="loading" class="h-11 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-wider text-[10px] shadow-lg shadow-indigo-600/30 gap-2">
            <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <Save v-else class="w-4 h-4" /> Sauvegarder
          </Button>
        </div>
      </DialogHeader>

      <!-- BODY GRID: LEFT SIDEBAR (Controls & Fields) + RIGHT CANVAS -->
      <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-950">
        
        <!-- CONTROL PANEL (4 Cols) -->
        <div class="lg:col-span-4 p-6 border-r border-slate-800 space-y-6 overflow-y-auto custom-scrollbar flex flex-col">
          
          <!-- ADD FIELD SELECTOR -->
          <div class="space-y-3 bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
            <Label class="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
              <Plus class="w-4 h-4" /> Ajouter un élément au contrat
            </Label>
            <div class="relative">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                v-model="fieldSearch"
                placeholder="Rechercher un champ..."
                class="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-xs outline-none focus:border-indigo-500 placeholder:text-slate-500"
              />
            </div>
            <div class="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
              <button
                v-for="item in filteredAvailableKeys"
                :key="item.key"
                @click="addField(item.key)"
                class="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-indigo-600/20 hover:text-indigo-300 transition-colors truncate"
              >
                {{ item.label }}
              </button>
              <p v-if="filteredAvailableKeys.length === 0" class="text-[10px] text-slate-500 italic text-center py-2">Aucun résultat</p>
            </div>
          </div>

          <!-- SELECTED FIELD INSPECTOR -->
          <div v-if="getSelectedField()" class="space-y-4 bg-indigo-950/40 p-5 rounded-2xl border border-indigo-500/30 animate-in fade-in duration-300">
            <div class="flex items-center justify-between border-b border-indigo-500/20 pb-3">
              <div class="space-y-0.5">
                <span class="text-[9px] font-black uppercase text-indigo-400 tracking-widest block">Propriétés de l'élément</span>
                <p class="font-black text-sm text-white uppercase italic">{{ getSelectedField()?.label }}</p>
              </div>
              <Button size="icon" variant="ghost" @click="removeField(getSelectedField()!.id)" class="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg">
                <Trash2 class="w-4 h-4" />
              </Button>
            </div>

            <div v-if="getSelectedField()?.key === 'customText'" class="space-y-2">
              <Label class="text-[10px] font-black uppercase text-slate-400">Texte Fixe</Label>
              <Input v-model="getSelectedField()!.customValue" class="h-10 bg-slate-900 border-slate-700 text-white font-bold text-xs rounded-xl" />
            </div>

            <!-- Position X & Y -->
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <Label class="text-[9px] font-black uppercase text-slate-400">Position X (% Gauche)</Label>
                <input type="number" step="0.5" min="0" max="100" v-model.number="getSelectedField()!.x" class="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-xl font-bold text-xs text-white outline-none focus:border-indigo-500" />
              </div>
              <div class="space-y-1.5">
                <Label class="text-[9px] font-black uppercase text-slate-400">Position Y (% Haut)</Label>
                <input type="number" step="0.5" min="0" max="100" v-model.number="getSelectedField()!.y" class="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-xl font-bold text-xs text-white outline-none focus:border-indigo-500" />
              </div>
            </div>

            <!-- Font Size & Weight & Alignment -->
            <div class="grid grid-cols-3 gap-3 pt-2">
              <div class="space-y-1.5">
                <Label class="text-[9px] font-black uppercase text-slate-400">Taille (px)</Label>
                <input type="number" min="8" max="36" v-model.number="getSelectedField()!.fontSize" class="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-xl font-bold text-xs text-white outline-none focus:border-indigo-500" />
              </div>

              <div class="space-y-1.5">
                <Label class="text-[9px] font-black uppercase text-slate-400">Style</Label>
                <button 
                  @click="getSelectedField()!.fontWeight = getSelectedField()!.fontWeight === 'bold' ? 'normal' : 'bold'"
                  :class="['w-full h-10 rounded-xl border flex items-center justify-center font-black text-xs transition-colors', getSelectedField()!.fontWeight === 'bold' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-700']"
                >
                  <Bold class="w-4 h-4" />
                </button>
              </div>

              <div class="space-y-1.5">
                <Label class="text-[9px] font-black uppercase text-slate-400">Couleur</Label>
                <input type="color" v-model="getSelectedField()!.color" class="w-full h-10 bg-slate-900 border border-slate-700 rounded-xl cursor-pointer p-1" />
              </div>
            </div>

            <!-- Alignments -->
            <div class="flex gap-2 pt-2">
              <button 
                v-for="align in ['left', 'center', 'right']" :key="align"
                @click="getSelectedField()!.alignment = align"
                :class="['flex-1 h-9 rounded-xl border flex items-center justify-center text-xs transition-colors', getSelectedField()!.alignment === align ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-700']"
              >
                <AlignLeft v-if="align === 'left'" class="w-4 h-4" />
                <AlignCenter v-else-if="align === 'center'" class="w-4 h-4" />
                <AlignRight v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- LIST OF PLACED FIELDS -->
          <div class="flex-1 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Éléments Placer ({{ agenceForm.templateFields.length }})</span>
            </div>
            
            <div v-if="agenceForm.templateFields.length > 0" class="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              <div 
                v-for="field in agenceForm.templateFields" :key="field.id"
                @click="selectedFieldId = field.id"
                :class="['flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer', selectedFieldId === field.id ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850']"
              >
                <div class="flex items-center gap-3 truncate">
                  <Move class="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span class="truncate uppercase tracking-wide">{{ field.label }}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-[9px] font-mono text-slate-400">X:{{ field.x }}% Y:{{ field.y }}%</span>
                  <button @click.stop="removeField(field.id)" class="text-slate-500 hover:text-rose-400 p-1">
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            
            <div v-else class="p-8 text-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs uppercase font-bold">
              Aucun élément ajouté. Utilisez le sélecteur ci-dessus.
            </div>
          </div>

        </div>

        <!-- CANVAS PREVIEW AREA (8 Cols) -->
        <div class="lg:col-span-8 p-8 overflow-auto bg-slate-950/80 relative">
          
          <!-- A4 SHEET REPRESENTATION (Scaled aspect-ratio 210mm x 297mm approx 1:1.414) -->
          <div 
            ref="canvasRef"
            class="relative bg-white text-slate-900 shadow-2xl rounded-sm overflow-hidden select-none border border-slate-300 mx-auto my-auto shrink-0"
            :style="{
              width: '680px',
              height: '962px',
              backgroundImage: agenceForm.templateImage ? `url(${getImageUrl(agenceForm.templateImage)})` : 'none',
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }"
          >
            <!-- Background missing fallback prompt -->
            <div v-if="!agenceForm.templateImage" class="absolute inset-0 flex flex-col items-center justify-center p-12 text-center pointer-events-none opacity-40 border-2 border-dashed border-slate-300">
              <Upload class="w-16 h-16 text-slate-400 mb-4" />
              <p class="font-black uppercase tracking-widest text-slate-600 text-sm">Arrière-plan Papier non téléversé</p>
              <p class="text-xs text-slate-500 mt-2 max-w-sm">Vous pouvez téléverser un scan de votre contrat physique pour ajuster la position des champs.</p>
            </div>

            <!-- RENDER DRAGGABLE TEXT FIELDS -->
            <div 
              v-for="field in agenceForm.templateFields" :key="field.id"
              @mousedown="e => startDrag(e, field.id)"
              :class="[
                'absolute cursor-move px-1.5 py-0.5 rounded transition-shadow group',
                selectedFieldId === field.id ? 'ring-2 ring-indigo-600 bg-indigo-500/20 z-30 shadow-lg' : 'hover:ring-1 hover:ring-indigo-400/50 z-20'
              ]"
              :style="{
                left: field.x + '%',
                top: field.y + '%',
                fontSize: (field.fontSize || 13) + 'px',
                fontWeight: field.fontWeight || 'normal',
                color: field.color || '#000000',
                textAlign: field.alignment || 'left',
                whiteSpace: 'nowrap'
              }"
            >
              {{ field.key === 'customText' ? (field.customValue || 'Texte Fixe') : (sampleValues[field.key] || field.label) }}
              
              <!-- Selection handles / badge -->
              <div v-if="selectedFieldId === field.id" class="absolute -top-5 left-0 bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded uppercase tracking-tighter pointer-events-none shadow-md">
                {{ field.label }}
              </div>
            </div>

          </div>

        </div>

      </div>

    </DialogContent>
  </Dialog>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
</style>
