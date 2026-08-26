<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { contratApi, carApi, clientApi, settingApi, getImageUrl, agenceApi } from '@/api';
import { formatDate } from '@/lib/utils';
import { 
  ArrowLeft, Download, 
  Car, Calendar, Phone, 
  Clock, CheckCircle2, 
  XCircle, AlertCircle,
  ChevronRight, ClipboardList,
  ShieldAlert, Lock, Eye, EyeOff, Printer,
  ChevronDown, User, MapPin, Fuel,
  CalendarClock, Banknote, NotepadText, X
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { PasswordConfirmDialog } from '@/components/ui/password-dialog';
import { useAuthStore } from '@/stores/auth';
import { usePasswordGuard, handlePasswordError } from '@/composables/usePasswordGuard';
import { useToast } from 'primevue/usetoast';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();
const guard = usePasswordGuard();
const contrat = ref<any>(null);
const loading = ref(true);
const cloturing = ref(false);
const deleting = ref(false);

// Deletion State
const showDeleteDialog = ref(false);
const deletePassword = ref('');
const showDeletePassword = ref(false);
const deleteError = ref('');

const openDeleteDialog = () => {
  deletePassword.value = '';
  deleteError.value = '';
  showDeleteDialog.value = true;
};

const submitDelete = async () => {
  if (!deletePassword.value) {
    deleteError.value = 'Le mot de passe est obligatoire.';
    return;
  }

  deleting.value = true;
  deleteError.value = '';
  try {
    await contratApi.remove(contrat.value._id, deletePassword.value);
    guard.reset();
    showDeleteDialog.value = false;
    router.push('/contrats');
  } catch (err: any) {
    console.error('Erreur lors de la suppression:', err);
    if (handlePasswordError(err, toast)) return;
    deleteError.value = err.response?.data?.message || 'Une erreur est survenue.';
  } finally {
    deleting.value = false;
  }
};

// Edit State
const showEditDialog = ref(false);
const editing = ref(false);
const editError = ref('');
const showEditPasswordDialog = ref(false);
const editPassword = ref('');
const showEditPwdInput = ref(false);
const editPasswordError = ref('');
const cars = ref<any[]>([]);
const clients = ref<any[]>([]);
const selectedClient1 = ref('');
const selectedClient2 = ref('');
const editForm = ref({
  car: '',
  carDailyRate: 0,
  clients: [] as string[],
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  depositAmount: 0,
  totalAmount: 0,
  paymentMethod: 'espece',
  chequeNumber: '',
  bankName: '',
  contractTaxValue: 0,
  tvaValue: 0,
  notes: '',
  status: '',
  agency: '',
  carburantLevel: 50,
  lieuDepart: 'Djerba',
  lieuRetour: 'Djerba',
  password: '',
});

const agencies = ref<string[]>([]);
const skipCarWatch = ref(false);

const openEditDialog = async () => {
  editError.value = '';
  
  if (contrat.value) {
    const startObj = new Date(contrat.value.startDate);
    const endObj = new Date(contrat.value.endDate);
    
    const pad = (n: number) => String(n).padStart(2, '0');
    const startDateStr = `${startObj.getFullYear()}-${pad(startObj.getMonth() + 1)}-${pad(startObj.getDate())}`;
    const startTimeStr = `${pad(startObj.getHours())}:${pad(startObj.getMinutes())}`;
    const endDateStr = `${endObj.getFullYear()}-${pad(endObj.getMonth() + 1)}-${pad(endObj.getDate())}`;
    const endTimeStr = `${pad(endObj.getHours())}:${pad(endObj.getMinutes())}`;

    skipCarWatch.value = true;
    editForm.value = {
      car: contrat.value.car?._id || '',
      carDailyRate: contrat.value.carDailyRate !== undefined ? contrat.value.carDailyRate : (contrat.value.car?.dailyRate || 0),
      clients: contrat.value.clients ? contrat.value.clients.map((c: any) => c._id) : [],
      startDate: startDateStr,
      startTime: startTimeStr,
      endDate: endDateStr,
      endTime: endTimeStr,
      depositAmount: contrat.value.depositAmount || 0,
      totalAmount: contrat.value.totalAmount || 0,
      paymentMethod: contrat.value.paymentMethod || 'espece',
      chequeNumber: contrat.value.chequeNumber || '',
      bankName: contrat.value.bankName || '',
      contractTaxValue: contrat.value.contractTaxValue || 0,
      tvaValue: contrat.value.tvaValue || 0,
      notes: contrat.value.notes || '',
      status: contrat.value.status || 'active',
      agency: contrat.value.agency || '',
      carburantLevel: contrat.value.carburantLevel ?? 50,
      lieuDepart: contrat.value.lieuDepart || 'Djerba',
      lieuRetour: contrat.value.lieuRetour || 'Djerba',
      password: '',
    };
    
    selectedClient1.value = editForm.value.clients[0] || '';
    selectedClient2.value = editForm.value.clients[1] || '';
    skipCarWatch.value = false;
  }
  
  showEditDialog.value = true;
  
  try {
    const [carsData, clientsData, settingsData] = await Promise.all([
      carApi.getAll(),
      clientApi.getAll(),
      settingApi.get()
    ]);
    cars.value = carsData.filter((c: any) => !c.disabled);
    clients.value = clientsData.filter((c: any) => !c.disabled);
    if (settingsData?.agencies) {
      agencies.value = settingsData.agencies;
    }
  } catch (err) {
    console.error('Erreur lors du chargement des voitures/clients:', err);
  }
};

watch(
  [
    () => editForm.value.startDate, 
    () => editForm.value.startTime, 
    () => editForm.value.endDate, 
    () => editForm.value.endTime, 
    () => editForm.value.car,
    () => editForm.value.carDailyRate,
    () => editForm.value.tvaValue
  ], 
  () => {
    if (!editForm.value.startDate || !editForm.value.startTime || !editForm.value.endDate || !editForm.value.endTime || !editForm.value.car) return;
    try {
      const start = new Date(`${editForm.value.startDate}T${editForm.value.startTime}:00`);
      const end = new Date(`${editForm.value.endDate}T${editForm.value.endTime}:00`);
      const diffTime = end.getTime() - start.getTime();
      if (diffTime <= 0) return;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const dailyRate = editForm.value.carDailyRate || 0;
      const baseAmount = diffDays * dailyRate;
      const tvaVal = editForm.value.tvaValue || 0;
      const tvaAmount = baseAmount * (tvaVal / 100);
      
      editForm.value.totalAmount = Math.round((baseAmount + tvaAmount) * 100) / 100;
    } catch (e) {
      console.error(e);
    }
  }
);

watch(() => editForm.value.car, (newCarId) => {
  if (skipCarWatch.value) return;
  const selectedCarObj = cars.value.find((c: any) => c._id === newCarId);
  if (selectedCarObj) {
    editForm.value.carDailyRate = selectedCarObj.dailyRate || 0;
  }
});

const openEditPasswordDialog = () => {
  editPassword.value = '';
  showEditPwdInput.value = false;
  editPasswordError.value = '';
  showEditPasswordDialog.value = true;
};

const confirmEditPassword = async () => {
  if (!editPassword.value) {
    editPasswordError.value = 'Le mot de passe est obligatoire.';
    return;
  }
  editForm.value.password = editPassword.value;
  showEditPasswordDialog.value = false;
  await submitEdit();
};

const submitEdit = async (force = false) => {
  const clientsArr = [];
  if (selectedClient1.value) clientsArr.push(selectedClient1.value);
  if (selectedClient2.value) clientsArr.push(selectedClient2.value);
  editForm.value.clients = clientsArr;

  if (editForm.value.clients.length === 0) {
    editError.value = 'Au moins un conducteur est obligatoire.';
    return;
  }

  if (!editForm.value.password) {
    openEditPasswordDialog();
    return;
  }

  editing.value = true;
  editError.value = '';
  try {
    const payload = {
      ...editForm.value,
      startDate: new Date(`${editForm.value.startDate}T${editForm.value.startTime}:00`).toISOString(),
      endDate: new Date(`${editForm.value.endDate}T${editForm.value.endTime}:00`).toISOString(),
      force: force
    };
    const updated = await contratApi.update(contrat.value._id, payload);
    if (updated) contrat.value = updated;
    showEditDialog.value = false;
    toast.add({
      severity: 'success',
      summary: 'Contrat modifié',
      detail: force ? 'Modification enregistrée (conflit forcé).' : 'Le contrat a été mis à jour avec succès.',
      life: 3000
    });
    await fetchContrat();
  } catch (err: any) {
    console.error('Erreur lors de la modification:', err);
    if (handlePasswordError(err, toast)) {
      editForm.value.password = '';
      openEditPasswordDialog();
      return;
    }
    if (err.response?.status === 409 && err.response?.data?.message === 'CAR_RESERVED_CONFLICT') {
      const confirmForce = confirm("Il y a un conflit de réservation/contrat pour cette période. Voulez-vous forcer la modification ?");
      if (confirmForce) {
        editing.value = false;
        await submitEdit(true);
      }
    } else {
      editError.value = err.response?.data?.message || 'Une erreur est survenue.';
    }
  } finally {
    editing.value = false;
  }
};

// Modals State
const showCarModal = ref(false);
const showClientModal = ref(false);
const showImageModal = ref(false);
const selectedImageUrl = ref('');
const zoomLevel = ref(1);
const activeClient = ref<any>(null);

// Panning & Dragging State
const isDragging = ref(false);
const position = ref({ x: 0, y: 0 });
const dragStart = ref({ x: 0, y: 0 });

const openImageModal = (url: string) => {
  selectedImageUrl.value = url;
  zoomLevel.value = 1; 
  position.value = { x: 0, y: 0 }; // Reset position
  showImageModal.value = true;
};

const handleZoom = (e: WheelEvent) => {
  const factor = 1.15; // Slightly faster for responsiveness
  const newZoom = e.deltaY < 0 ? zoomLevel.value * factor : zoomLevel.value / factor;
  zoomLevel.value = Math.min(Math.max(newZoom, 0.5), 10);
};

const toggleZoom = (e: MouseEvent) => {
  // Prevent closing the modal when clicking exactly on the image for zooming
  e.stopPropagation();
  if (zoomLevel.value > 1.1) {
    zoomLevel.value = 1;
    position.value = { x: 0, y: 0 };
  } else {
    zoomLevel.value = 2.5;
  }
};

const handleMouseDown = (e: MouseEvent) => {
  if (zoomLevel.value <= 1) return;
  isDragging.value = true;
  dragStart.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y
  };
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return;
  position.value = {
    x: e.clientX - dragStart.value.x,
    y: e.clientY - dragStart.value.y
  };
};

const handleMouseUp = () => {
  isDragging.value = false;
};

// Closure Form State
const showCloseDialog = ref(false);
const closureForm = ref({
  closureType: 'terminé',
  returnMileage: 0,
  carStateAtReturn: 'disponible',
  closureNotes: '',
  isPaid: true
});

// Missing Return Mileage Alert
const showReturnMileageAlert = ref(false);
const returnMileageInput = ref(0);
const savingReturnMileage = ref(false);

const missingReturnMileage = computed(() => {
  if (!contrat.value) return false;
  return (contrat.value.status === 'terminé' || contrat.value.status === 'clôturé') && !contrat.value.returnMileage;
});

const submitReturnMileage = async () => {
  if (returnMileageInput.value < (contrat.value.startMileage || 0)) {
    alert(`Le kilométrage de retour ne peut pas être inférieur au kilométrage de départ (${contrat.value.startMileage} km).`);
    return;
  }
  savingReturnMileage.value = true;
  try {
    await contratApi.close(contrat.value._id, {
      closureType: contrat.value.closureType || 'terminé',
      returnMileage: returnMileageInput.value,
      carStateAtReturn: contrat.value.carStateAtReturn || 'disponible',
      closureNotes: contrat.value.closureNotes || '',
      isPaid: contrat.value.isPaid || false
    });
    showReturnMileageAlert.value = false;
    await fetchContrat();
  } catch (err) {
    console.error('Erreur lors de la sauvegarde du kilométrage:', err);
    alert('Une erreur est survenue lors de la sauvegarde.');
  } finally {
    savingReturnMileage.value = false;
  }
};

const openClientModal = (client: any) => {
  activeClient.value = client;
  showClientModal.value = true;
};

const fetchContrat = async () => {
  loading.value = true;
  try {
    const id = route.params.id as string;
    contrat.value = await contratApi.getOne(id);
    if (contrat.value) {
      closureForm.value.returnMileage = contrat.value.car?.mileage || 0;
      closureForm.value.isPaid = contrat.value.isPaid || false;
    }
  } catch (err) {
    console.error('Erreur lors du chargement du contrat:', err);
  } finally {
    loading.value = false;
  }
};

// Print State & Logic
const showPrintModal = ref(false);
const fullAgenciesList = ref<any[]>([]);
const selectedAgenceForPrint = ref<any>(null);

const fetchAgences = async () => {
  try {
    const data = await agenceApi.getAll();
    fullAgenciesList.value = data || [];
    agencies.value = fullAgenciesList.value.map((a: any) => a.name);
  } catch (err) {
    console.warn('Failed to fetch agences:', err);
  }
};

onMounted(async () => {
  await fetchContrat();
  await fetchAgences();
  if (missingReturnMileage.value && authStore.isAdmin) {
    returnMileageInput.value = contrat.value.car?.mileage || 0;
    showReturnMileageAlert.value = true;
  }
});

const openPrintModal = () => {
  if (!contrat.value) return;
  // Prefer the agency attached to the car, then the legacy text field
  const carAgencyId = contrat.value.car?.agence?._id;
  const matchById = carAgencyId
    ? fullAgenciesList.value.find((a: any) => String(a._id) === String(carAgencyId))
    : null;
  const matchByName = fullAgenciesList.value.find(
    (a: any) => a.name?.toLowerCase() === contrat.value.agency?.toLowerCase()
  );
  selectedAgenceForPrint.value =
    matchById || matchByName || fullAgenciesList.value[0] || null;
  showPrintModal.value = true;
};

const getPrintFieldValue = (fieldKey: string, customVal = '') => {
  if (!contrat.value) return '';
  if (fieldKey === 'customText') return customVal;

  const c = contrat.value;
  const client1 = c.clients?.[0];
  const client2 = c.clients?.[1];

  switch (fieldKey) {
    case 'reference': return c.reference || '';
    case 'agency': return c.car?.agence?.name || c.agency || selectedAgenceForPrint.value?.name || '';
    case 'startDate': return c.startDate ? formatDate(c.startDate) : '';
    case 'startTime': return c.startDate ? new Date(c.startDate).toTimeString().substring(0, 5) : '';
    case 'endDate': return c.endDate ? formatDate(c.endDate) : '';
    case 'endTime': return c.endDate ? new Date(c.endDate).toTimeString().substring(0, 5) : '';
    case 'rentDays': return c.startDate && c.endDate ? diffDays(c.startDate, c.endDate) + ' Jours' : '';
    case 'carBrandModel': return (c.car?.brand || '') + ' ' + (c.car?.model || '');
    case 'carBrand': return c.car?.brand || '';
    case 'carModel': return c.car?.model || '';
    case 'carRegistration': return c.car?.registrationNumber || c.car?.matricule || '';
    case 'client1Name': return client1 ? `${client1.firstName || ''} ${client1.lastName || ''}`.trim() : '';
    case 'client1FirstName': return client1?.firstName || '';
    case 'client1LastName': return client1?.lastName || '';
    case 'client1Cin': return client1?.cin || '';
    case 'client1CinDate': return client1?.cinDate ? formatDate(client1.cinDate) : '';
    case 'client1Phone': return (client1?.phoneCountryCode || '+216') + ' ' + (client1?.phone || '');
    case 'client1Birthday': return client1?.birthday ? formatDate(client1.birthday) : '';
    case 'client1License': return client1?.drivingLicense || '';
    case 'client1LicenseDate': return client1?.licenseDate ? formatDate(client1.licenseDate) : '';
    case 'client1Address': return client1?.address || '';
    case 'client1LieuNaissance': return client1?.lieuNaissance || '';
    case 'client1LieuPermis': return client1?.lieuPermis || '';
    case 'client1Nationality': return client1?.nationality || '';
    case 'client2Name': return client2 ? `${client2.firstName || ''} ${client2.lastName || ''}`.trim() : '';
    case 'client2FirstName': return client2?.firstName || '';
    case 'client2LastName': return client2?.lastName || '';
    case 'client2Cin': return client2?.cin || '';
    case 'client2CinDate': return client2?.cinDate ? formatDate(client2.cinDate) : '';
    case 'client2Phone': return client2 ? (client2.phoneCountryCode || '+216') + ' ' + (client2.phone || '') : '';
    case 'client2Birthday': return client2?.birthday ? formatDate(client2.birthday) : '';
    case 'client2License': return client2?.drivingLicense || '';
    case 'client2LicenseDate': return client2?.licenseDate ? formatDate(client2.licenseDate) : '';
    case 'client2LieuNaissance': return client2?.lieuNaissance || '';
    case 'client2LieuPermis': return client2?.lieuPermis || '';
    case 'client2Address': return client2?.address || '';
    case 'client2Nationality': return client2?.nationality || '';
    case 'carDailyRate': return (c.carDailyRate !== undefined ? c.carDailyRate : (c.car?.dailyRate || 0)) + ' TND';
    case 'subTotal': return ((c.totalAmount || 0) - (c.contractTaxValue || 0) - (c.tvaValue || 0)) + ' TND';
    case 'contractTax': return (c.contractTaxValue || 0) + ' TND';
    case 'tva': return (c.tvaValue || 0) + ' TND';
    case 'totalAmount': return (c.totalAmount || 0) + ' TND';
    case 'depositAmount': return (c.depositAmount || 0) + ' TND';
    case 'paymentMethod': return c.paymentMethod === 'cheque' ? 'Chèque' : 'Espèce';
    case 'startMileage': return c.startMileage ? c.startMileage + ' KM' : '';
    case 'returnMileage': return c.returnMileage ? c.returnMileage + ' KM' : '';
    case 'notes': return c.notes || '';
    case 'currentDate': return new Date().toLocaleDateString('fr-FR');
    case 'lieuDepart': return c.lieuDepart || 'Djerba';
    case 'lieuRetour': return c.lieuRetour || 'Djerba';
    case 'carburantLevel': return (c.carburantLevel ?? 50) + '%';
    default: return '';
  }
};

const triggerPrint = () => {
  const sheet = document.getElementById('printable-contract-sheet');
  if (!sheet) return;

  const printWindow = window.open('', '_blank', 'width=794,height=1123');
  if (!printWindow) return;

  const fields = selectedAgenceForPrint.value?.templateFields || [];
  const bgImage = selectedAgenceForPrint.value?.templateImage
    ? `url(${getImageUrl(selectedAgenceForPrint.value.templateImage)})`
    : 'none';

  let fieldsHtml = '';
  fields.forEach((field: any) => {
    const val = getPrintFieldValue(field.key, field.customValue);
    fieldsHtml += `<div style="position:absolute;left:${field.x}%;top:${field.y}%;font-size:${field.fontSize || 13}px;font-weight:${field.fontWeight || 'normal'};color:${field.color || '#000000'};text-align:${field.alignment || 'left'};white-space:nowrap;">${val}</div>`;
  });

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Impression Contrat</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; overflow: hidden; }
    @page { size: A4; margin: 0; }
    #sheet {
      position: relative;
      width: 210mm;
      height: 297mm;
      margin: 3mm 0 0 0;
      padding: 0;
      background-image: ${bgImage};
      background-size: contain;
      background-position: center;
      background-repeat: no-repeat;
      background-color: white;
      overflow: hidden;
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    @media print {
      html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; overflow: hidden; }
      #sheet { width: 210mm; height: 297mm; margin: 3mm 0 0 0;
      padding: 0; overflow: hidden; page-break-after: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div id="sheet">${fieldsHtml}</div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); window.close(); }, 300);
    };
  <\/script>
</body>
</html>`);
  printWindow.document.close();
};



const getStatusBadge = (contrat: any) => {
  const status = contrat?.status?.toLowerCase();

  switch (status) {
    case 'soon':
      return { label: 'À VENIR', class: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Clock };
    case 'active': 
      return { label: 'ACTIF', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle2 };
    case 'terminé': 
      return { label: 'TERMINÉ', class: 'bg-slate-500/10 text-slate-500 border-slate-500/20', icon: CheckCircle2 };
    case 'clôturé': 
      return { label: 'CLÔTURÉ', class: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Lock };
    case 'cancelled': 
      return { label: 'ANNULÉ', class: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle };
    default: 
      return { label: status?.toUpperCase(), class: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: AlertCircle };
  }
};

const downloadPdf = async () => {
  try {
     const blob = await contratApi.getPdf(contrat.value._id);
     const url = window.URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.setAttribute('download', `contrat-${contrat.value.reference}.pdf`);
     document.body.appendChild(link);
     link.click();
     link.remove();
  } catch (err) {
     console.error('Failed to download PDF', err);
  }
};

const diffDays = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  const diff = e.getTime() - s.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const formatTime = (date: string) => {
  if (!date) return '--';
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const drivenDistance = computed(() => {
  if (!contrat.value || (contrat.value.status !== 'terminé' && contrat.value.status !== 'clôturé')) return 0;
  return (contrat.value.returnMileage || 0) - (contrat.value.startMileage || 0);
});

const submitCloture = async () => {
  if (closureForm.value.returnMileage < (contrat.value.startMileage || 0)) {
    alert(`Le kilométrage de retour ne peut pas être inférieur au kilométrage de départ (${contrat.value.startMileage} km).`);
    return;
  }
  cloturing.value = true;
  try {
    await contratApi.close(contrat.value._id, closureForm.value);
    showCloseDialog.value = false;
    await fetchContrat();
  } catch (err) {
    console.error('Erreur lors de la clôture du contrat:', err);
    alert('Une erreur est survenue lors de la clôture.');
  } finally {
    cloturing.value = false;
  }
};

</script>

<template>
  <div class="contrat-detail-view p-8 max-w-7xl mx-auto">
    
    <!-- Skeleton Loading -->
    <div v-if="loading" class="space-y-8">
       <div class="h-20 bg-muted/50 rounded-3xl animate-pulse"></div>
       <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div class="lg:col-span-12 h-[500px] bg-muted/30 rounded-[3rem] animate-pulse"></div>
       </div>
    </div>

    <!-- Main Content -->
    <template v-else-if="contrat">
      <div class="space-y-8">
        
        <!-- HEADER SECTION -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border border-border shadow-sm p-8 rounded-[2.5rem] relative overflow-hidden">
           <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
           <div class="flex items-center gap-6 relative z-10">
              <Button variant="ghost" size="icon" @click="router.back()" class="h-12 w-12 rounded-2xl">
                 <ArrowLeft class="w-6 h-6" />
              </Button>
              <div class="space-y-1">
                 <h1 class="text-4xl font-black tracking-tighter uppercase leading-none italic">
                    Contrat <span class="text-primary">{{ contrat.reference }}</span>
                 </h1>
                 <div class="flex items-center gap-3">
                    <Badge :class="['px-3 py-1 text-[9px] font-black tracking-[0.2em] border rounded-full uppercase', getStatusBadge(contrat).class]">
                       {{ getStatusBadge(contrat).label }}
                    </Badge>
                    <Badge v-if="contrat.isPaid" class="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 text-[9px] font-black tracking-[0.2em] border rounded-full uppercase">
                       Payé
                    </Badge>
                    <Badge v-else class="bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 py-1 text-[9px] font-black tracking-[0.2em] border rounded-full uppercase">
                       En attente
                    </Badge>
                 </div>
              </div>
           </div>
           <div class="relative z-10 flex items-center gap-3">
              <Button @click="openPrintModal" class="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-lg shadow-indigo-600/20">
                <Printer class="w-4 h-4" /> Imprimer Contrat
              </Button>
              <Button @click="downloadPdf" variant="outline" class="h-12 px-6 border-2 border-border rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                <Download class="w-4 h-4" /> PDF
              </Button>
           </div>
        </div>

        <!-- BILAN SECTION (Only if closed or finished) -->
        <section v-if="contrat.status === 'terminé' || contrat.status === 'clôturé'" class="animate-in fade-in slide-in-from-top-4 duration-1000">
           <Card class="bg-emerald-600 border-none shadow-3xl rounded-[3rem] overflow-hidden text-white relative">
              <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <CardContent class="p-12 relative z-10">
                 <div class="flex flex-col lg:flex-row gap-12 items-start justify-between">
                    <div class="space-y-10 flex-1">
                       <div class="flex items-center gap-4">
                          <CheckCircle2 class="w-12 h-12" />
                          <div>
                             <h2 class="text-3xl font-black uppercase tracking-tighter leading-none">Bilan de Location</h2>
                             <p class="text-[10px] uppercase font-black tracking-widest opacity-60">Dossier de retour archivé</p>
                          </div>
                       </div>
                       <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div class="space-y-4">
                             <div v-for="client in contrat.clients" :key="client._id" class="flex items-center gap-4 bg-white/10 p-3 rounded-[1.5rem] border border-white/5">
                                <Avatar class="w-10 h-10 border-2 border-white/20">
                                   <AvatarFallback class="bg-white text-emerald-600 font-bold text-xs">{{ client.firstName?.[0] }}</AvatarFallback>
                                </Avatar>
                                <div>
                                   <p class="text-[8px] font-black opacity-60 uppercase tracking-widest">Locataire</p>
                                   <p class="font-black text-xs uppercase italic">{{ client.firstName }} {{ client.lastName }}</p>
                                </div>
                             </div>
                             <div class="flex items-center gap-4 bg-white/10 p-4 rounded-3xl border border-white/5">
                                <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border-2 border-white/10"><Car class="w-6 h-6" /></div>
                                <div>
                                   <p class="text-[9px] font-black opacity-60 uppercase tracking-widest">Véhicule</p>
                                   <p class="font-black text-sm uppercase italic">{{ contrat.car?.brand }} {{ contrat.car?.model }}</p>
                                </div>
                             </div>
                          </div>
                          <div class="grid grid-cols-2 gap-6">
                             <div class="bg-white/10 p-5 rounded-3xl border border-white/5">
                                <p class="text-[9px] font-black opacity-60 uppercase tracking-widest leading-none mb-1">Distance</p>
                                <p class="text-2xl font-black tabular-nums">{{ drivenDistance }} KM</p>
                             </div>
                             <div class="bg-black/10 p-5 rounded-3xl border border-white/5">
                                <p class="text-[9px] font-black opacity-60 uppercase tracking-widest leading-none mb-1">État</p>
                                <p class="text-lg font-black uppercase italic">{{ contrat.carStateAtReturn }}</p>
                             </div>
                             <div class="bg-black/10 p-5 rounded-3xl border border-white/5">
                                <p class="text-[9px] font-black opacity-60 uppercase tracking-widest leading-none mb-1">Durée</p>
                                <p class="text-2xl font-black tabular-nums">{{ diffDays(contrat.startDate, contrat.endDate) }} J</p>
                             </div>
                             <div class="bg-black/10 p-5 rounded-3xl border border-white/5">
                                <p class="text-[9px] font-black opacity-60 uppercase tracking-widest leading-none mb-1">Type</p>
                                <p class="text-lg font-black uppercase italic">{{ contrat.closureType?.split('_')[0] }}</p>
                             </div>
                          </div>
                       </div>
                    </div>
                    <div class="lg:w-80 bg-white rounded-[3rem] p-10 text-emerald-900 shadow-2xl flex flex-col justify-between self-stretch">
                       <div class="space-y-6">
                          <div class="text-center border-b pb-6 border-emerald-50">
                             <p class="text-[10px] font-black opacity-40 uppercase tracking-widest underline underline-offset-4 decoration-emerald-100">Total encaissé</p>
                             <p class="text-6xl font-black tabular-nums tracking-tighter text-emerald-600 mt-2">{{ contrat.totalAmount }}<span class="text-xl ml-2 font-black">TND</span></p>
                          </div>
                          <div class="space-y-4">
                             <div class="flex justify-between items-center text-xs">
                                <span class="font-black opacity-40 uppercase tracking-tighter">Caution</span>
                                <span class="font-black text-primary italic">{{ (contrat.depositAmount || 0).toFixed(2) }}</span>
                             </div>
                          </div>
                       </div>
                       <Button @click="downloadPdf" class="mt-8 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[11px] h-14 rounded-2xl w-full">PDF Bilan</Button>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </section>

         <!-- MASTER CARD -->
         <Card class="bg-white border text-foreground border-border shadow-2xl rounded-[3rem] overflow-hidden">
            <!-- Card Header -->
            <div class="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 class="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Dossier de Location</h3>
            </div>
            
            <CardContent class="p-0">
               <div class="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                  
                  <!-- LEFT PANEL: Entities (Span 5) -->
                  <div class="lg:col-span-5 flex flex-col divide-y divide-slate-100">
                     
                     <!-- LOCATAIRES -->
                     <div class="p-8">
                        <h4 class="text-[9px] font-black opacity-40 uppercase tracking-widest mb-6">Locataires</h4>
                        <div class="space-y-3">
                           <button v-for="client in contrat.clients" :key="client._id" @click="openClientModal(client)" class="w-full flex items-center justify-between gap-4 hover:bg-slate-50 p-3 rounded-2xl transition-colors group">
                              <div class="flex items-center gap-4">
                                 <Avatar class="w-12 h-12 shadow-sm border border-slate-200">
                                    <AvatarFallback class="bg-primary/10 text-primary font-bold text-[10px]">{{ client.firstName?.[0] }}</AvatarFallback>
                                 </Avatar>
                                 <div class="text-left">
                                    <p class="text-sm font-black uppercase tracking-tight">{{ client.firstName }} {{ client.lastName }}</p>
                                    <p class="text-[10px] font-bold text-muted-foreground font-mono mt-0.5 tracking-widest opacity-70">CIN: {{ client.cin }}</p>
                                 </div>
                              </div>
                              <ChevronRight class="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                           </button>
                        </div>
                     </div>

                     <!-- VEHICLE -->
                     <div class="p-8">
                        <h4 class="text-[9px] font-black opacity-40 uppercase tracking-widest mb-6">Véhicule Assigné</h4>
                        <button @click="showCarModal = true" class="w-full flex items-center justify-between gap-4 hover:bg-slate-50 p-3 rounded-2xl transition-colors group">
                           <div class="flex items-center gap-5">
                              <div class="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100">
                                 <Car class="w-7 h-7"/>
                              </div>
                              <div class="text-left">
                                 <p class="text-lg font-black uppercase tracking-tight leading-none">{{ contrat.car?.brand }} {{ contrat.car?.model }}</p>
                                 <p class="text-[10px] font-mono font-bold text-emerald-600 underline decoration-emerald-200 mt-1.5 tracking-widest">MATRICULE: {{ contrat.car?.matricule }}</p>
                              </div>
                           </div>
                           <ChevronRight class="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                        </button>
                     </div>
                  </div>

                  <!-- RIGHT PANEL: Financials (Span 7) -->
                  <div :class="['lg:col-span-7 flex flex-col justify-between p-10 relative overflow-hidden', contrat.status === 'active' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-foreground']">
                     <!-- Background pattern for active status -->
                     <div v-if="contrat.status === 'active'" class="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -mt-48 -mr-48"></div>

                     <div>
                        <h4 class="text-[9px] font-black opacity-40 uppercase tracking-widest mb-8 border-b border-current/10 pb-4">Bilan Financier</h4>
                        
                        <!-- Details Grid -->
                         <div class="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 mb-12">
                            <div class="space-y-1">
                                <p class="text-[9px] font-black opacity-40 uppercase tracking-widest">Période</p>
                                <p :class="['text-xs font-bold leading-relaxed', contrat.status === 'active' ? 'text-primary' : 'text-primary']">
                                   {{ formatDate(contrat.startDate) }} <br/><span class="opacity-50">⎯</span> {{ formatDate(contrat.endDate) }}
                                </p>
                             </div>
                             <div class="space-y-1">
                                <p class="text-[9px] font-black opacity-40 uppercase tracking-widest">Heure Départ</p>
                                <p class="text-sm font-black tabular-nums">{{ formatTime(contrat.startDate) }}</p>
                             </div>
                             <div class="space-y-1">
                                <p class="text-[9px] font-black opacity-40 uppercase tracking-widest">Heure Retour</p>
                                <p class="text-sm font-black tabular-nums">{{ formatTime(contrat.endDate) }}</p>
                             </div>
                            <div class="space-y-1">
                                <p class="text-[9px] font-black opacity-40 uppercase tracking-widest">Tarif / Jour</p>
                                <p class="text-lg font-black tabular-nums">{{ contrat.carDailyRate !== undefined ? contrat.carDailyRate : (contrat.car?.dailyRate || 0) }} <span class="text-[10px]">TND</span></p>
                            </div>
                            <div v-if="contrat.agency" class="space-y-1">
                                <p class="text-[9px] font-black opacity-40 uppercase tracking-widest">Agence</p>
                                <p class="text-sm font-black uppercase italic">{{ contrat.agency }}</p>
                            </div>
                             <div class="space-y-1">
                                <p class="text-[9px] font-black opacity-40 uppercase tracking-widest">Distance</p>
                                <p class="text-xl font-black tabular-nums">{{ (contrat.status === 'terminé' || contrat.status === 'clôturé') ? drivenDistance : '--' }} <span class="text-[9px] opacity-40">KM</span></p>
                             </div>
                             <div class="space-y-1">
                                <p class="text-[9px] font-black opacity-40 uppercase tracking-widest">KM Départ</p>
                                <p class="text-lg font-black tabular-nums">{{ contrat.startMileage ?? '--' }} <span class="text-[9px] opacity-40">KM</span></p>
                             </div>
                             <div class="space-y-1">
                                <p class="text-[9px] font-black opacity-40 uppercase tracking-widest">KM Retour</p>
                                <p :class="['text-lg font-black tabular-nums', !contrat.returnMileage && (contrat.status === 'terminé' || contrat.status === 'clôturé') ? 'text-red-500' : '']">{{ contrat.returnMileage ?? '--' }} <span class="text-[9px] opacity-40">KM</span></p>
                             </div>
                             <div class="space-y-1">
                                <p class="text-[9px] font-black opacity-40 uppercase tracking-widest">Caution Restante</p>
                               <p class="text-lg font-black tabular-nums">{{ (contrat.depositAmount || 0).toFixed(0) }} <span class="text-[10px]">TND</span></p>
                            </div>
                            <div v-if="contrat.lieuDepart" class="space-y-1">
                               <p class="text-[9px] font-black opacity-40 uppercase tracking-widest">Départ</p>
                               <p class="text-sm font-black uppercase italic">{{ contrat.lieuDepart }}</p>
                            </div>
                            <div v-if="contrat.lieuRetour" class="space-y-1">
                               <p class="text-[9px] font-black opacity-40 uppercase tracking-widest">Retour</p>
                               <p class="text-sm font-black uppercase italic">{{ contrat.lieuRetour }}</p>
                            </div>
                            <div class="space-y-1">
                               <p class="text-[9px] font-black opacity-40 uppercase tracking-widest">Carburant</p>
                               <div class="flex items-center gap-2">
                                  <div class="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                     <div class="h-full rounded-full" :class="contrat.carburantLevel > 50 ? 'bg-emerald-500' : contrat.carburantLevel > 20 ? 'bg-amber-500' : 'bg-red-500'" :style="{ width: (contrat.carburantLevel || 0) + '%' }"></div>
                                  </div>
                                  <p class="text-sm font-black tabular-nums">{{ contrat.carburantLevel ?? '--' }}%</p>
                               </div>
                            </div>
                         </div>
                     </div>

                     <!-- Totals Bottom -->
                     <div class="pt-8 border-t border-current/10">
                        <div v-if="contrat.notes" :class="['mb-6 p-4 rounded-2xl flex items-start gap-3 border', contrat.status === 'active' ? 'bg-amber-400/10 border-amber-400/20' : 'bg-amber-50 border-amber-100']">
                           <AlertCircle :class="['w-5 h-5 shrink-0 mt-0.5', contrat.status === 'active' ? 'text-amber-400' : 'text-amber-500']" />
                           <div>
                              <p :class="['text-[9px] font-black uppercase tracking-widest', contrat.status === 'active' ? 'text-amber-400' : 'text-amber-600']">Message / Description du contrat</p>
                              <p :class="['text-sm font-bold italic leading-relaxed', contrat.status === 'active' ? 'text-amber-200' : 'text-amber-900']">{{ contrat.notes }}</p>
                           </div>
                        </div>
                        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                            <div>
                               <p class="text-[9px] font-black opacity-40 uppercase tracking-widest mb-2">Total Dossier</p>
                               <div :class="['text-5xl lg:text-6xl font-black tabular-nums tracking-tighter leading-none', (contrat.status === 'cancelled' || contrat.status === 'annulé') ? 'text-slate-300 line-through' : '']">
                                  {{ (contrat.totalAmount || 0).toFixed(0) }}<span :class="['text-xl ml-2 font-black uppercase', (contrat.status === 'cancelled' || contrat.status === 'annulé') ? 'text-slate-300' : 'text-current/50']">TND</span>
                               </div>
                            </div>
                           <div v-if="contrat.status === 'active' && !contrat.isPaid" :class="['p-4 rounded-2xl border text-right', 'bg-white/5 border-white/10']">
                               <p class="text-[9px] font-black opacity-60 uppercase tracking-widest mb-1">Montant à Régler</p>
                               <p class="text-2xl font-black text-emerald-400 tabular-nums italic">{{ (contrat.totalAmount || 0).toFixed(0) }} TND</p>
                            </div>
                            <div v-else-if="contrat.status === 'active' && contrat.isPaid" :class="['p-4 rounded-2xl border text-right border-emerald-500/20 text-emerald-400']">
                               <p class="text-[9px] font-black opacity-60 uppercase tracking-widest mb-1">Paiement</p>
                               <p class="text-2xl font-black tabular-nums italic">Entièrement Réglé</p>
                            </div>
                           <div v-else class="flex items-center gap-2">
                               <CheckCircle2 class="w-4 h-4 text-emerald-500" />
                               <span class="text-[9px] font-black uppercase italic tracking-widest text-emerald-500">Archivé le {{ formatDate(contrat.updatedAt) }}</span>
                           </div>
                        </div>
                     </div>
                  </div>
                  
               </div>
            </CardContent>
         </Card>

         <!-- ACTION FOOTER SECTION -->
         <div class="flex flex-col md:flex-row justify-end gap-4 mt-8">
            <Button 
               v-if="authStore.isAdmin && contrat.status === 'active'" 
               @click="showCloseDialog = true" 
               class="h-16 px-8 md:w-[300px] bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/20 transition-transform active:scale-95"
            >
               Clôturer
            </Button>
            
            <Button 
               v-if="authStore.isAdmin && (contrat.status !== 'terminé' && contrat.status !== 'clôturé' || authStore.isSuperAdmin)" 
               @click="openEditDialog" 
               class="h-16 px-8 md:w-[200px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-600/20 gap-3 active:scale-95"
            >
               <ClipboardList class="w-4 h-4"/> Modifier
            </Button>
            
            <Button 
               v-if="authStore.isAdmin" 
               @click="openDeleteDialog" 
               variant="destructive" 
               class="h-16 px-8 md:w-[200px] rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-destructive/20 gap-3 active:scale-95"
            >
               <ShieldAlert class="w-4 h-4"/> Supprimer
            </Button>
         </div>

      </div>
      <!-- DIALOGS -->
      <PasswordConfirmDialog
        v-model:open="showDeleteDialog"
        v-model:password="deletePassword"
        title="Accès"
        subtitle="Administrateur"
        description="Saisissez votre mot de passe pour supprimer ce contrat"
        placeholder="••••••••"
        confirm-label="Confirmer"
        loading-label="Suppression..."
        :loading="deleting"
        :error="deleteError"
        @confirm="submitDelete"
      />

      <!-- EDIT CONTRAT DIALOG -->
      <Dialog v-model:open="showEditDialog">
         <DialogContent hideClose class="max-w-3xl bg-white border-border shadow-3xl rounded-[2.5rem] p-0 overflow-hidden text-foreground max-h-[92vh] flex flex-col">
            <DialogHeader class="px-10 py-8 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white relative shrink-0 overflow-hidden">
               <div class="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
               <div class="absolute bottom-0 left-32 w-28 h-28 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
               <button type="button" @click="showEditDialog = false" class="absolute top-5 right-5 z-20 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all duration-300 hover:rotate-90 active:scale-90">
                  <X class="w-5 h-5" />
               </button>
               <div class="flex items-center gap-5 relative z-10">
                  <div class="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center shadow-lg shadow-indigo-900/20">
                     <ClipboardList class="w-7 h-7" />
                  </div>
                  <div>
                     <p class="text-[9px] font-black uppercase tracking-[0.35em] text-indigo-200">Édition</p>
                     <DialogTitle class="text-2xl font-black uppercase tracking-tighter leading-tight">Modifier le Contrat</DialogTitle>
                     <DialogDescription class="text-white/70 font-bold uppercase tracking-widest text-[9px] mt-1.5">Session Administrateur</DialogDescription>
                  </div>
               </div>
            </DialogHeader>

            <!-- Form Body -->
            <div class="p-10 space-y-9 overflow-y-auto flex-1 custom-scrollbar">

               <!-- Affectation -->
               <div>
                  <div class="flex items-center gap-3 mb-6">
                     <div class="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0"><Car class="w-4 h-4" /></div>
                     <h4 class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800">Affectation</h4>
                     <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div class="space-y-2">
                        <label class="form-label">Véhicule</label>
                        <div class="relative">
                           <select v-model="editForm.car" class="form-field form-field-select">
                              <option v-for="car in cars" :key="car._id" :value="car._id">
                                 {{ car.brand }} {{ car.model }} ({{ car.matricule }})
                              </option>
                           </select>
                           <ChevronDown class="w-4 h-4 text-slate-400 pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
                        </div>
                     </div>
                     <div class="space-y-2">
                        <label class="form-label">Cond. Principal</label>
                        <div class="relative">
                           <select v-model="selectedClient1" class="form-field form-field-select">
                              <option v-for="client in clients" :key="client._id" :value="client._id">
                                 {{ client.lastName }} {{ client.firstName }} ({{ client.cin }})
                              </option>
                           </select>
                           <ChevronDown class="w-4 h-4 text-slate-400 pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
                        </div>
                     </div>
                     <div class="space-y-2">
                        <label class="form-label">Cond. Secondaire</label>
                        <div class="relative">
                           <select v-model="selectedClient2" class="form-field form-field-select">
                              <option value="">Aucun</option>
                              <option v-for="client in clients" :key="client._id" :value="client._id">
                                 {{ client.lastName }} {{ client.firstName }} ({{ client.cin }})
                              </option>
                           </select>
                           <ChevronDown class="w-4 h-4 text-slate-400 pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
                        </div>
                     </div>
                  </div>
               </div>

               <!-- Planification -->
               <div>
                  <div class="flex items-center gap-3 mb-6">
                     <div class="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0"><CalendarClock class="w-4 h-4" /></div>
                     <h4 class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800">Planification</h4>
                     <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div class="space-y-2">
                        <label class="form-label">Date Départ</label>
                        <div class="flex gap-3">
                           <input type="date" v-model="editForm.startDate" class="form-field" style="flex: 2;" />
                           <input type="time" v-model="editForm.startTime" class="form-field" style="flex: 1;" />
                        </div>
                     </div>
                     <div class="space-y-2">
                        <label class="form-label">Date Retour</label>
                        <div class="flex gap-3">
                           <input type="date" v-model="editForm.endDate" class="form-field" style="flex: 2;" />
                           <input type="time" v-model="editForm.endTime" class="form-field" style="flex: 1;" />
                        </div>
                     </div>
                  </div>
               </div>

               <!-- Tarification & Règlement -->
               <div>
                  <div class="flex items-center gap-3 mb-6">
                     <div class="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0"><Banknote class="w-4 h-4" /></div>
                     <h4 class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800">Tarification & Règlement</h4>
                     <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                  </div>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                     <div class="space-y-2">
                        <label class="form-label">Tarif / Jour (TND)</label>
                        <input type="number" v-model.number="editForm.carDailyRate" class="form-field tabular-nums" />
                     </div>
                     <div class="space-y-2">
                        <label class="form-label">Caution (TND)</label>
                        <input type="number" v-model.number="editForm.depositAmount" class="form-field tabular-nums" />
                     </div>
                     <div class="space-y-2">
                        <label class="form-label">Total (TND)</label>
                        <input type="number" v-model.number="editForm.totalAmount" class="form-field tabular-nums" />
                     </div>
                     <div class="space-y-2">
                        <label class="form-label">Statut</label>
                        <div class="relative">
                           <select v-model="editForm.status" class="form-field form-field-select uppercase">
                              <option value="soon">À venir</option>
                              <option value="active">Actif</option>
                              <option value="terminé">Terminé</option>
                              <option value="clôturé">Clôturé</option>
                              <option value="cancelled">Annulé</option>
                           </select>
                           <ChevronDown class="w-4 h-4 text-slate-400 pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
                        </div>
                     </div>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                     <div class="space-y-2">
                        <label class="form-label">Mode de Règlement</label>
                        <div class="relative">
                           <select v-model="editForm.paymentMethod" class="form-field form-field-select">
                              <option value="espece">Espèce</option>
                              <option value="cheque">Chèque</option>
                           </select>
                           <ChevronDown class="w-4 h-4 text-slate-400 pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
                        </div>
                     </div>
                     <div class="space-y-2">
                        <label class="form-label">Frais Agence (TND)</label>
                        <input type="number" v-model.number="editForm.contractTaxValue" class="form-field tabular-nums" />
                     </div>
                     <div class="space-y-2">
                        <label class="form-label">TVA (%)</label>
                        <input type="number" v-model.number="editForm.tvaValue" class="form-field tabular-nums" />
                     </div>
                  </div>
                  <div v-if="editForm.paymentMethod === 'cheque'" class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 animate-in fade-in duration-300">
                     <div class="space-y-2">
                        <label class="form-label">Numéro Chèque</label>
                        <input v-model="editForm.chequeNumber" class="form-field" />
                     </div>
                     <div class="space-y-2">
                        <label class="form-label">Banque</label>
                        <input v-model="editForm.bankName" class="form-field" />
                     </div>
                  </div>
                  <div v-if="agencies.length > 0" class="mt-6 space-y-2">
                     <label class="form-label">Agence</label>
                     <div class="relative">
                        <select v-model="editForm.agency" class="form-field form-field-select">
                           <option value="">Aucune</option>
                           <option v-for="a in agencies" :key="a" :value="a">{{ a }}</option>
                        </select>
                        <ChevronDown class="w-4 h-4 text-slate-400 pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
                     </div>
                  </div>
               </div>

               <!-- Lieux & Carburant -->
               <div>
                  <div class="flex items-center gap-3 mb-6">
                     <div class="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0"><MapPin class="w-4 h-4" /></div>
                     <h4 class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800">Lieux & Carburant</h4>
                     <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div class="space-y-2">
                        <label class="form-label">Lieu de Départ</label>
                        <input v-model="editForm.lieuDepart" class="form-field" />
                     </div>
                     <div class="space-y-2">
                        <label class="form-label">Lieu de Retour</label>
                        <input v-model="editForm.lieuRetour" class="form-field" />
                     </div>
                     <div class="space-y-2">
                        <label class="form-label">Carburant — {{ editForm.carburantLevel }}%</label>
                        <input type="range" v-model.number="editForm.carburantLevel" min="0" max="100" step="5" class="w-full mt-3 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600" />
                     </div>
                  </div>
               </div>

               <!-- Observations -->
               <div>
                  <div class="flex items-center gap-3 mb-6">
                     <div class="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0"><NotepadText class="w-4 h-4" /></div>
                     <h4 class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800">Observations</h4>
                     <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                  </div>
                  <textarea v-model="editForm.notes" rows="3" class="form-field resize-none py-4" placeholder="Observations générales..."></textarea>
               </div>

               <p v-if="editError" class="text-[10px] font-black text-destructive uppercase italic text-center">⚠ {{ editError }}</p>
            </div>

            <!-- Footer -->
            <div class="px-10 py-6 bg-slate-50/80 border-t border-slate-100 shrink-0 flex gap-4">
               <Button @click="showEditDialog = false" variant="ghost" class="flex-1 h-12 rounded-xl font-black uppercase text-[10px] text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">Annuler</Button>
               <Button @click="submitEdit()" :loading="editing" class="flex-[2] h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-[10px] shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 gap-2">
                  <Lock class="w-4 h-4" /> Enregistrer les modifications
               </Button>
            </div>
         </DialogContent>
      </Dialog>

      <!-- EDIT PASSWORD POPUP -->
      <PasswordConfirmDialog
        v-model:open="showEditPasswordDialog"
        v-model:password="editPassword"
        title="Accès"
        subtitle="Administrateur"
        description="Saisissez votre mot de passe pour enregistrer"
        placeholder="••••••••"
        :loading="editing"
        :error="editPasswordError"
        @confirm="confirmEditPassword"
      />

      <Dialog v-model:open="showCloseDialog">
         <DialogContent class="max-w-xl bg-white border-border shadow-3xl rounded-[3rem] p-0 overflow-hidden text-foreground max-h-[90vh] flex flex-col">
            <DialogHeader class="p-10 bg-slate-900 text-white">
               <div class="flex items-center gap-5">
                  <div class="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30"><ClipboardList class="w-7 h-7" /></div>
                  <div>
                    <DialogTitle class="text-2xl font-black uppercase tracking-tight">Finaliser Location</DialogTitle>
                    <DialogDescription class="text-slate-400 font-bold uppercase text-[9px] mt-1">Bilan de retour véhicule</DialogDescription>
                  </div>
               </div>
            </DialogHeader>
            <div class="flex-1 overflow-y-auto p-10 space-y-8 no-scrollbar">
                <div class="grid grid-cols-2 gap-4">
                   <button v-for="t in [['terminé','Retour Normal'],['cloture_forcee','Clôture Forcée']]" :key="t[0]" @click="closureForm.closureType = t[0]" :class="['p-4 rounded-3xl border-2 transition-all font-black uppercase text-[10px]', closureForm.closureType === t[0] ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 opacity-40']">{{ t[1] }}</button>
                </div>
               <div class="grid grid-cols-2 gap-6">
                  <div class="space-y-2">
                     <label class="text-[9px] font-black uppercase pl-2 opacity-40">KM Retour</label>
                     <input v-model.number="closureForm.returnMileage" type="number" class="w-full h-14 px-6 rounded-2xl bg-muted border-2 border-border focus:border-primary outline-none font-black tabular-nums" />
                  </div>
                  <div class="space-y-2">
                     <label class="text-[9px] font-black uppercase pl-2 opacity-40">État</label>
                     <select v-model="closureForm.carStateAtReturn" class="w-full h-14 px-6 rounded-2xl bg-muted border-2 border-border focus:border-primary outline-none font-black uppercase text-[10px]">
                        <option value="disponible">Disponible</option>
                        <option value="panne">En Panne</option>
                     </select>
                  </div>
               </div>
               <textarea v-model="closureForm.closureNotes" rows="2" class="w-full p-6 rounded-[2rem] bg-muted/50 border-2 border-border focus:border-primary outline-none font-bold text-sm" placeholder="Observations..."></textarea>
            </div>
               <Button @click="submitCloture" :loading="cloturing" class="flex-[2] h-14 bg-emerald-600 text-white rounded-2xl uppercase text-[10px] font-black">Clôturer</Button>
         </DialogContent>
      </Dialog>

      <!-- RETURN MILEAGE ALERT DIALOG -->
      <Dialog v-model:open="showReturnMileageAlert">
         <DialogContent class="max-w-lg bg-white border-border shadow-3xl rounded-[3rem] p-0 overflow-hidden text-foreground" @interact-outside.prevent @pointer-down-outside.prevent>
            <DialogHeader class="p-10 bg-red-50 border-b border-red-100">
               <div class="flex items-center gap-5">
                  <div class="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30"><AlertCircle class="w-7 h-7 text-white" /></div>
                  <div>
                    <DialogTitle class="text-2xl font-black uppercase tracking-tight text-red-900">Kilométrage Retour Manquant</DialogTitle>
                    <DialogDescription class="text-red-500/70 font-bold uppercase text-[9px] mt-1">Ce contrat a été clôturé automatiquement</DialogDescription>
                  </div>
               </div>
            </DialogHeader>
            <div class="p-10 space-y-6">
               <div class="bg-red-50 border border-red-200 rounded-3xl p-6">
                  <p class="text-[10px] font-black text-red-700 uppercase tracking-widest mb-2">Attention</p>
                  <p class="text-sm text-red-600 font-bold">Le kilométrage de retour n'a pas été enregistré pour ce contrat. Veuillez saisir le kilométrage actuel du véhicule pour compléter le dossier.</p>
               </div>
               <div class="space-y-2">
                  <label class="text-[9px] font-black uppercase pl-2 opacity-40">KM Départ</label>
                  <p class="text-lg font-black tabular-nums text-slate-900">{{ contrat.startMileage || 0 }} KM</p>
               </div>
               <div class="space-y-2">
                  <label class="text-[9px] font-black uppercase pl-2 opacity-40">KM Retour</label>
                  <input v-model.number="returnMileageInput" type="number" class="w-full h-14 px-6 rounded-2xl bg-muted border-2 border-red-300 focus:border-red-500 outline-none font-black tabular-nums text-lg" placeholder="Saisir le kilométrage de retour" />
               </div>
            </div>
            <div class="p-10 pt-0 flex gap-4">
               <Button @click="showReturnMileageAlert = false" variant="ghost" class="flex-1 h-14 rounded-2xl font-black uppercase text-[10px]">Plus tard</Button>
               <Button @click="submitReturnMileage" :loading="savingReturnMileage" class="flex-[2] h-14 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl shadow-red-600/20">Enregistrer le Kilométrage</Button>
            </div>
         </DialogContent>
      </Dialog>

      <!-- CAR INFORMATION MODAL -->
      <Dialog v-model:open="showCarModal">
         <DialogContent class="max-w-xl bg-white border-border shadow-3xl rounded-[3rem] p-0 overflow-hidden text-foreground max-h-[90vh] flex flex-col">
            <DialogHeader class="p-10 bg-emerald-600 text-white relative">
               <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
               <div class="flex items-center gap-6 relative z-10">
                  <div class="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center shadow-lg"><Car class="w-8 h-8" /></div>
                  <div>
                    <DialogTitle class="text-3xl font-black uppercase tracking-tighter">{{ contrat.car?.brand }} {{ contrat.car?.model }}</DialogTitle>
                    <DialogDescription class="text-white/60 font-black font-mono tracking-widest uppercase mt-1">{{ contrat.car?.matricule }}</DialogDescription>
                  </div>
               </div>
            </DialogHeader>
            <div class="flex-1 overflow-y-auto p-10 no-scrollbar">
               <div class="grid grid-cols-2 gap-6 mb-10">
                  <div class="p-6 rounded-3xl bg-muted/30 border border-border">
                     <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Catégorie</p>
                     <p class="text-sm font-black uppercase italic">{{ contrat.car?.category || 'Standard' }}</p>
                  </div>
                  <div class="p-6 rounded-3xl bg-muted/30 border border-border">
                     <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Teinte</p>
                     <p class="text-sm font-black uppercase italic">{{ contrat.car?.color }}</p>
                  </div>
                  <div class="p-6 rounded-3xl bg-muted/30 border border-border">
                     <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Prix Journalier</p>
                     <p class="text-xl font-black text-emerald-600 tabular-nums">{{ contrat.car?.dailyRate }} <span class="text-[10px]">TND/J</span></p>
                  </div>
                  <div class="p-6 rounded-3xl bg-muted/30 border border-border">
                     <p class="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Kilométrage Actuel</p>
                     <p class="text-xl font-black tabular-nums">{{ (contrat.car?.mileage || 0).toLocaleString() }} <span class="text-[10px]">KM</span></p>
                  </div>
               </div>
               <Button @click="showCarModal = false" variant="outline" class="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2">Fermer la fiche</Button>
            </div>
         </DialogContent>
      </Dialog>

      <!-- CLIENT INFORMATION MODAL -->
      <Dialog v-model:open="showClientModal">
         <DialogContent class="max-w-2xl bg-white border-border shadow-3xl rounded-[3rem] p-0 overflow-hidden text-foreground max-h-[90vh] flex flex-col">
            <DialogHeader class="p-10 bg-primary text-white relative shrink-0">
               <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
               <div class="flex items-center gap-8 relative z-10">
                  <Avatar class="w-20 h-20 border-4 border-white/20 shadow-xl">
                    <AvatarFallback class="bg-white text-primary text-2xl font-black">
                       {{ activeClient?.firstName?.[0] }}{{ activeClient?.lastName?.[0] }}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle class="text-3xl font-black uppercase tracking-tighter">{{ activeClient?.firstName }} {{ activeClient?.lastName }}</DialogTitle>
                    <DialogDescription class="text-white/60 font-black uppercase tracking-widest text-[9px] mt-1 italic">Locataire Enregistré</DialogDescription>
                  </div>
               </div>
            </DialogHeader>

            <div class="p-10 space-y-10 overflow-y-auto flex-1 custom-scrollbar">
               <!-- Contact & Stats -->
               <div class="grid grid-cols-2 gap-6">
                  <div class="p-6 rounded-[2rem] bg-muted/30 border border-border flex items-center gap-4">
                     <div class="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg"><Phone class="w-5 h-5" /></div>
                     <div>
                        <p class="text-[9px] font-black opacity-40 uppercase">Téléphone</p>
                        <p class="font-black text-sm tabular-nums">{{ activeClient?.phone }}</p>
                     </div>
                  </div>
                  <div class="p-6 rounded-[2rem] bg-muted/30 border border-border flex items-center gap-4">
                     <div class="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg"><Calendar class="w-5 h-5" /></div>
                     <div>
                        <p class="text-[9px] font-black opacity-40 uppercase">Né(e) le</p>
                        <p class="font-black text-sm tabular-nums">{{ activeClient?.birthday ? formatDate(activeClient.birthday) : 'N/A' }}</p>
                     </div>
                  </div>
               </div>

               <!-- Identification Details -->
               <div class="space-y-6">
                  <h4 class="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground pl-2 border-l-2 border-primary">Pièces d'identité</h4>
                  <div class="grid grid-cols-2 gap-6">
                     <div class="bg-muted p-6 rounded-[2rem] space-y-1 border-b-4 border-primary/20">
                        <p class="text-[9px] font-black opacity-60 uppercase">
                          {{ activeClient?.idCardType === 'passport' ? 'N° Passeport' : (activeClient?.idCardType === 'carte_sejour' ? 'N° Carte de Séjour' : 'N° CIN') }}
                        </p>
                        <p class="text-lg font-black tracking-widest">{{ activeClient?.cin }}</p>
                     </div>
                     <div class="bg-muted p-6 rounded-[2rem] space-y-1 border-b-4 border-emerald-500/20">
                        <p class="text-[9px] font-black opacity-60 uppercase">N° Permis</p>
                        <p class="text-lg font-black tracking-widest">{{ activeClient?.drivingLicense }}</p>
                     </div>
                  </div>
               </div>

               <!-- Documents Visuals -->
               <div class="space-y-6">
                  <h4 class="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground pl-2 border-l-2 border-emerald-500">Justificatifs Visuels</h4>
                  <div class="grid grid-cols-2 gap-8">
                     <div class="space-y-3">
                        <p class="text-[10px] font-black uppercase text-center opacity-40">
                          {{ activeClient?.idCardType === 'passport' ? 'Passeport' : (activeClient?.idCardType === 'carte_sejour' ? 'Carte de Séjour (Recto)' : 'CIN Recto') }}
                        </p>
                        <div 
                           @click="openImageModal(getImageUrl(activeClient.cinFront))"
                           class="aspect-[1.6/1] rounded-3xl bg-muted border-2 border-dashed border-border overflow-hidden group cursor-zoom-in relative"
                        >
                           <img v-if="activeClient?.cinFront" :src="getImageUrl(activeClient.cinFront)" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                           <div v-else class="w-full h-full flex items-center justify-center"><ShieldAlert class="w-8 h-8 opacity-10" /></div>
                        </div>
                     </div>
                     <div class="space-y-3">
                        <p class="text-[10px] font-black uppercase text-center opacity-40">Permis Recto</p>
                        <div 
                           @click="openImageModal(getImageUrl(activeClient.licenseFront))"
                           class="aspect-[1.6/1] rounded-3xl bg-muted border-2 border-dashed border-border overflow-hidden group cursor-zoom-in relative"
                        >
                           <img v-if="activeClient?.licenseFront" :src="getImageUrl(activeClient.licenseFront)" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                           <div v-else class="w-full h-full flex items-center justify-center"><ShieldAlert class="w-8 h-8 opacity-10" /></div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div class="p-10 pt-0 shrink-0">
               <Button @click="showClientModal = false" variant="outline" class="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2">Fermer le profil</Button>
            </div>
         </DialogContent>
      </Dialog>

      <!-- IMAGE LIGHTBOX DIALOG -->
      <Dialog v-model:open="showImageModal">
         <DialogContent 
            class="max-w-[95vw] max-h-[95vh] bg-black/95 border-none shadow-none p-0 overflow-hidden flex items-center justify-center select-none" 
         >
            <div 
               class="w-full h-full flex items-center justify-center relative select-none"
               @click="showImageModal = false"
               @wheel.prevent="handleZoom"
               @mousemove="handleMouseMove"
               @mouseup="handleMouseUp"
               @mouseleave="handleMouseUp"
            >
               <div 
                  class="relative will-change-transform flex items-center justify-center cursor-move"
                  :style="{ 
                     transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)` 
                  }"
                  @mousedown.prevent="handleMouseDown"
                  @click.stop="toggleZoom"
               >
                  <img 
                     :src="selectedImageUrl" 
                     class="max-w-full max-h-full object-contain pointer-events-none shadow-2xl" 
                  />
               </div>

               <Button @click="showImageModal = false" variant="ghost" class="absolute top-6 right-6 text-white hover:bg-white/20 h-12 w-12 p-0 rounded-full border border-white/20 z-50">
                  <XCircle class="w-8 h-8" />
               </Button>
               
               <!-- Zoom Indicator -->
               <div class="absolute bottom-12 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.3em] pointer-events-none shadow-2xl z-50">
                  Loupe: {{ (zoomLevel * 100).toFixed(0) }}% <span v-if="zoomLevel > 1" class="ml-4 opacity-50 italic">— Cliquer pour réinitialiser</span>
               </div>
            </div>
          </DialogContent>
      </Dialog>

      <!-- PRINT CONTRACT MODAL -->
      <Dialog v-model:open="showPrintModal">
        <DialogContent class="sm:max-w-5xl bg-white text-slate-900 border-none shadow-3xl rounded-[2.5rem] p-0 overflow-hidden max-h-[95vh] flex flex-col no-print-dialog">
          <DialogHeader class="p-6 bg-indigo-50 border-b border-indigo-100 flex flex-row items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <Printer class="w-5 h-5" />
              </div>
              <div>
                <DialogTitle class="text-xl font-black uppercase text-indigo-950">Impression du Contrat</DialogTitle>
                <DialogDescription class="text-[10px] font-black uppercase tracking-widest text-indigo-600/70">
                  Impression des informations sur papier pré-imprimé selon le modèle agence.
                </DialogDescription>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div v-if="fullAgenciesList.length > 0" class="flex items-center gap-2">
                <label class="text-[10px] font-black text-slate-400 uppercase">Modèle Agence:</label>
                <select 
                  :value="selectedAgenceForPrint?._id"
                  :disabled="!authStore.isSuperAdmin"
                  :title="authStore.isSuperAdmin ? '' : 'Seul le super admin peut changer le modèle'"
                  @change="(e: Event) => { selectedAgenceForPrint = fullAgenciesList.find((a: any) => a._id === (e.target as HTMLSelectElement).value) }"
                  class="h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option v-for="a in fullAgenciesList" :key="a._id" :value="a._id">{{ a.name }}</option>
                </select>
              </div>
              <Button @click="triggerPrint" class="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 gap-2">
                <Printer class="w-4 h-4" /> Lancer l'impression
              </Button>
            </div>
          </DialogHeader>

          <div class="p-8 overflow-y-auto bg-slate-100 flex justify-center custom-scrollbar">
            <!-- A4 PREVIEW CANVAS -->
            <div 
              id="printable-contract-sheet"
              class="relative bg-white text-slate-900 shadow-xl overflow-hidden border border-slate-200"
              :style="{
                width: '680px',
                height: '962px',
                backgroundImage: selectedAgenceForPrint?.templateImage ? `url(${getImageUrl(selectedAgenceForPrint.templateImage)})` : 'none',
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }"
            >
              <div 
                v-for="field in (selectedAgenceForPrint?.templateFields || [])" :key="field.id"
                class="absolute field-print-item"
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
                {{ getPrintFieldValue(field.key, field.customValue) }}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </template>
  </div>
</template>

<style>
@media print {
  body * {
    visibility: hidden !important;
  }
  #printable-contract-sheet,
  #printable-contract-sheet * {
    visibility: visible !important;
  }
  #printable-contract-sheet {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 210mm !important;
    height: 297mm !important;
    background-image: none !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    border: none !important;
    overflow: hidden !important;
    background-color: white !important;
    page-break-after: avoid !important;
    page-break-inside: avoid !important;
  }
  .field-print-item {
    color: #000000 !important;
  }
  @page {
    size: A4 !important;
    margin: 0 !important;
  }
}
</style>

<style scoped>
.form-label {
  display: block;
  font-size: 9px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #64748b;
  margin-bottom: 0.5rem;
  padding-left: 0.25rem;
}

.form-field {
  width: 100%;
  height: 3rem;
  padding-left: 1rem;
  padding-right: 1rem;
  border-radius: 0.75rem;
  background-color: rgb(248 250 252 / 0.8);
  border: 1px solid #e2e8f0;
  outline: none;
  font-weight: 600;
  font-size: 0.875rem;
  color: #1e293b;
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.form-field:hover {
  border-color: #cbd5e1;
}

.form-field:focus {
  border-color: #6366f1;
  background-color: #ffffff;
  box-shadow: 0 0 0 4px rgb(99 102 241 / 0.12);
}

.form-field::placeholder {
  color: #94a3b8;
}

.form-field-select {
  padding-right: 2.5rem;
  appearance: none;
  cursor: pointer;
}
</style>


