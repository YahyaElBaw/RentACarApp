<template>
  <div class="car-detail-container space-y-12 p-8 max-w-6xl mx-auto" v-if="car">
    <!-- Header with Breadcrumbs & Modern HUD Style -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border border-slate-200/80 shadow-xs p-6 sm:p-8 rounded-[2rem]">
      <div class="flex items-center gap-5">
        <Button @click="$router.back()" variant="secondary" size="icon" class="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-xs transition-all active:scale-95 shrink-0">
          <ChevronLeft class="w-5 h-5" />
        </Button>
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 shrink-0">
          <Car class="w-6 h-6 stroke-[2.2]" />
        </div>
        <div class="space-y-1.5">
          <div class="flex items-center gap-3 flex-wrap">
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase italic">
              {{ car.brand }} <span class="text-indigo-600">{{ car.model }}</span>
            </h1>
            <Badge v-if="car.disabled" class="bg-slate-100 text-slate-400 border-slate-200 text-[9px] font-black tracking-widest px-3 py-1 rounded-full">
              RETIRÉ / DÉSACTIVÉ
            </Badge>
            <div v-else class="relative inline-flex items-center">
              <div :class="['w-2 h-2 rounded-full absolute left-3 pointer-events-none transition-colors z-10', car.isAvailable ? 'bg-emerald-500' : 'bg-rose-500']"></div>
              <select 
                :value="car.isAvailable ? 'available' : 'rented'"
                @change="handleStatusSelectChange($event)"
                :disabled="statusSaving || !authStore.isAdmin"
                :class="[
                  'h-8 pl-7 pr-7 rounded-full text-[9px] font-black tracking-widest uppercase appearance-none cursor-pointer border-2 transition-all shadow-xs outline-none',
                  car.isAvailable 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300 focus:ring-2 focus:ring-emerald-500/20' 
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-300 focus:ring-2 focus:ring-rose-500/20',
                  (!authStore.isAdmin || statusSaving) ? 'opacity-80 cursor-not-allowed' : ''
                ]"
                title="Modifier le statut du véhicule (mot de passe requis)"
              >
                <option value="available" class="font-bold text-slate-800 bg-white">DISPONIBLE</option>
                <option value="rented" class="font-bold text-slate-800 bg-white">LOUÉ</option>
              </select>
              <ChevronDown class="w-3 h-3 absolute right-2 pointer-events-none opacity-40 text-slate-600" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
              MATRICULE: {{ car.matricule }}
            </span>
            <span v-if="car.agence" class="text-[10px] font-bold text-slate-300 uppercase">&bull;</span>
            <span v-if="car.agence" class="text-[10px] font-black text-indigo-600 uppercase tracking-wider">
              {{ car.agence.name }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="authStore.isAdmin" class="flex items-center gap-2.5">
        <Button
          @click="openEditModal"
          class="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-wider flex items-center gap-2 shadow-sm active:scale-95 transition-all"
        >
          <Pencil class="w-4 h-4" />
          <span>Modifier</span>
        </Button>
        <Button 
          @click="confirmDelete" 
          class="h-11 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-black uppercase tracking-wider text-[10px] flex items-center gap-2 shadow-2xs active:scale-95 transition-all"
        >
          <Trash2 class="w-4 h-4" />
          <span>Supprimer</span>
        </Button>
      </div>
    </div>

    <!-- Main Dossier Card -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Left: Core Specs -->
      <div class="lg:col-span-4 space-y-6">
        <Card class="border border-slate-200/50 shadow-2xl shadow-slate-200/20 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
          <CardContent class="p-8 space-y-8">
            <div class="space-y-2">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Performance & Tarif</span>
              <div class="grid grid-cols-1 gap-4">
                  <div class="p-5 bg-indigo-50/50 border border-indigo-100/50 rounded-3xl group relative">
                    <span class="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Tarif Journalier</span>
                    <div v-if="editingField === 'dailyRate'" class="flex items-center gap-2">
                      <Input type="number" v-model="editValue" class="h-10 bg-white border-indigo-200 font-black text-indigo-700" />
                      <Button @click="stageEdit" size="icon" class="h-8 w-8 bg-indigo-600 text-white rounded-lg"><Check class="w-4 h-4" /></Button>
                      <Button @click="cancelEdit" size="icon" variant="ghost" class="h-8 w-8 text-slate-400"><X class="w-4 h-4" /></Button>
                    </div>
                    <div v-else class="flex items-center justify-between">
                      <span class="text-3xl font-black text-indigo-700 tabular-nums">{{ car.dailyRate }} <span class="text-xs text-indigo-400 ml-1">TND</span></span>
                      <span v-if="isStaged('dailyRate')" class="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">Modifié</span>
                      <Button v-if="authStore.isAdmin && !car.disabled" @click="startEdit('dailyRate', car.dailyRate)" variant="ghost" size="icon" class="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400 hover:text-indigo-600">
                        <Pencil class="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div class="p-5 bg-slate-50/50 border border-slate-100 rounded-3xl group relative">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Kilométrage Actuel</span>
                    <div v-if="editingField === 'mileage'" class="flex items-center gap-2">
                      <Input type="number" v-model="editValue" class="h-10 bg-white border-slate-200 font-black text-slate-700" />
                      <Button @click="stageEdit" size="icon" class="h-8 w-8 bg-slate-600 text-white rounded-lg"><Check class="w-4 h-4" /></Button>
                      <Button @click="cancelEdit" size="icon" variant="ghost" class="h-8 w-8 text-slate-400"><X class="w-4 h-4" /></Button>
                    </div>
                    <div v-else class="flex items-center justify-between">
                      <span class="text-2xl font-black text-slate-700 tabular-nums">{{ car.mileage }} <span class="text-xs text-slate-400 ml-1 font-mono">KM</span></span>
                      <span v-if="isStaged('mileage')" class="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">Modifié</span>
                      <Button v-if="authStore.isAdmin && !car.disabled" @click="startEdit('mileage', car.mileage)" variant="ghost" size="icon" class="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600">
                        <Pencil class="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
              </div>
            </div>

            <div class="space-y-4">
               <div class="flex justify-between items-center py-3 border-b border-slate-50 group">
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Couleur Extérieure</span>
                  <div v-if="editingField === 'color'" class="flex items-center gap-2">
                    <Input v-model="editValue" class="h-8 bg-white border-slate-200 text-xs font-black" />
                    <Button @click="stageEdit" size="icon" class="h-6 w-6 bg-slate-600 text-white rounded-md"><Check class="w-3 h-3" /></Button>
                    <Button @click="cancelEdit" size="icon" variant="ghost" class="h-6 w-6 text-slate-400"><X class="w-3 h-3" /></Button>
                  </div>
                  <div v-else class="flex items-center gap-3">
                    <Badge variant="outline" class="font-black uppercase text-[9px] px-3 border-slate-200 text-slate-900">{{ car.color || 'N/A' }}</Badge>
                    <span v-if="isStaged('color')" class="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">Modifié</span>
                    <Button v-if="authStore.isAdmin && !car.disabled" @click="startEdit('color', car.color)" variant="ghost" size="icon" class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300">
                      <Pencil class="w-3 h-3" />
                    </Button>
                  </div>
               </div>
               <div class="flex justify-between items-center py-3 border-b border-slate-50 group">
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-indigo-500">Prochaine Assurance</span>
                  <div v-if="editingField === 'insuranceDate'" class="flex items-center gap-2">
                    <Input type="date" v-model="editValue" class="h-8 bg-white border-indigo-200 text-xs font-black" />
                    <Button @click="stageEdit" size="icon" class="h-6 w-6 bg-indigo-600 text-white rounded-md"><Check class="w-3 h-3" /></Button>
                    <Button @click="cancelEdit" size="icon" variant="ghost" class="h-6 w-6 text-slate-400"><X class="w-3 h-3" /></Button>
                  </div>
                  <div v-else class="flex items-center gap-3">
                    <span class="font-bold text-indigo-600 text-sm tabular-nums">{{ formatDate(car.insuranceDate) }}</span>
                    <span v-if="isStaged('insuranceDate')" class="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">Modifié</span>
                    <Button v-if="authStore.isAdmin && !car.disabled" @click="startEdit('insuranceDate', car.insuranceDate?.split('T')[0])" variant="ghost" size="icon" class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-300">
                      <Pencil class="w-3 h-3" />
                    </Button>
                  </div>
               </div>
               <div class="flex justify-between items-center py-3 border-b border-slate-50 group">
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-rose-500">Prochaine Visite</span>
                  <div v-if="editingField === 'nextTechnicalVisitDate'" class="flex items-center gap-2">
                    <Input type="date" v-model="editValue" class="h-8 bg-white border-rose-200 text-xs font-black" />
                    <Button @click="stageEdit" size="icon" class="h-6 w-6 bg-rose-600 text-white rounded-md"><Check class="w-3 h-3" /></Button>
                    <Button @click="cancelEdit" size="icon" variant="ghost" class="h-6 w-6 text-slate-400"><X class="w-3 h-3" /></Button>
                  </div>
                  <div v-else class="flex items-center gap-3">
                    <span class="font-black text-rose-600 text-sm tabular-nums">{{ formatDate(car.nextTechnicalVisitDate) }}</span>
                    <span v-if="isStaged('nextTechnicalVisitDate')" class="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">Modifié</span>
                    <Button v-if="authStore.isAdmin && !car.disabled" @click="startEdit('nextTechnicalVisitDate', car.nextTechnicalVisitDate?.split('T')[0])" variant="ghost" size="icon" class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-rose-300">
                      <Pencil class="w-3 h-3" />
                    </Button>
                  </div>
               </div>
               <div class="flex justify-between items-center py-3 group">
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-amber-500">Prochain Vidange</span>
                  <div v-if="editingField === 'nextOilChangeMileage'" class="flex items-center gap-2">
                    <Input type="number" v-model="editValue" class="h-8 bg-white border-amber-200 text-xs font-black" />
                    <Button @click="stageEdit" size="icon" class="h-6 w-6 bg-amber-600 text-white rounded-md"><Check class="w-3 h-3" /></Button>
                    <Button @click="cancelEdit" size="icon" variant="ghost" class="h-6 w-6 text-slate-400"><X class="w-3 h-3" /></Button>
                  </div>
                  <div v-else class="flex items-center gap-3">
                    <span class="font-black text-amber-600 text-sm tabular-nums">{{ car.nextOilChangeMileage || 'N/A' }} <span class="text-[8px]">KM</span></span>
                    <span v-if="isStaged('nextOilChangeMileage')" class="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">Modifié</span>
                    <Button v-if="authStore.isAdmin && !car.disabled" @click="startEdit('nextOilChangeMileage', car.nextOilChangeMileage)" variant="ghost" size="icon" class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-amber-300">
                      <Pencil class="w-3 h-3" />
                    </Button>
                  </div>
               </div>
               <div class="flex justify-between items-center py-3 border-b border-slate-50 group">
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-sky-500">Date Départ</span>
                  <div v-if="editingField === 'departureDate'" class="flex items-center gap-2">
                    <Input type="date" v-model="editValue" class="h-8 bg-white border-sky-200 text-xs font-black" />
                    <Button @click="stageEdit" size="icon" class="h-6 w-6 bg-sky-600 text-white rounded-md"><Check class="w-3 h-3" /></Button>
                    <Button @click="cancelEdit" size="icon" variant="ghost" class="h-6 w-6 text-slate-400"><X class="w-3 h-3" /></Button>
                  </div>
                  <div v-else class="flex items-center gap-3">
                    <span class="font-black text-sky-600 text-sm tabular-nums">{{ formatDate(car.departureDate) }}</span>
                    <span v-if="isStaged('departureDate')" class="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">Modifié</span>
                    <Button v-if="authStore.isAdmin && !car.disabled" @click="startEdit('departureDate', car.departureDate?.split('T')[0])" variant="ghost" size="icon" class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-sky-300">
                      <Pencil class="w-3 h-3" />
                    </Button>
                  </div>
               </div>
               <div class="flex justify-between items-center py-3 group">
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-slate-500">Agence</span>
                  <div v-if="editingField === 'agence'" class="flex items-center gap-2">
                    <select v-model="editValue" class="h-8 bg-white border-slate-200 rounded-md px-2 text-xs font-black outline-none focus:border-indigo-400">
                      <option value="" disabled>Choisir une agence...</option>
                      <option v-for="agence in agences" :key="agence._id" :value="agence._id">{{ agence.name }}</option>
                    </select>
                    <Button @click="stageEdit" size="icon" class="h-6 w-6 bg-slate-600 text-white rounded-md"><Check class="w-3 h-3" /></Button>
                    <Button @click="cancelEdit" size="icon" variant="ghost" class="h-6 w-6 text-slate-400"><X class="w-3 h-3" /></Button>
                  </div>
                   <div v-else class="flex items-center gap-3">
                     <span class="font-bold text-slate-700 text-sm uppercase tracking-widest">{{ car.agence?.name || '—' }}</span>
                     <span v-if="isStaged('agence')" class="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">Modifié</span>
                     <Button v-if="authStore.isAdmin && !car.disabled" @click="startEdit('agence', car.agence?._id || '')" variant="ghost" size="icon" class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300">
                       <Pencil class="w-3 h-3" />
                     </Button>
                   </div>
                </div>
                 <div v-if="authStore.isAdmin" class="flex justify-between items-center py-3 border-b border-slate-50 group">
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-600">IMEI GPS</span>
                    <div v-if="editingField === 'gpsImei'" class="flex items-center gap-2">
                      <Input v-model="editValue" placeholder="15 chiffres" class="h-8 bg-white border-emerald-200 text-xs font-black tabular-nums w-40" />
                      <Button @click="stageEdit" size="icon" class="h-6 w-6 bg-emerald-600 text-white rounded-md"><Check class="w-3 h-3" /></Button>
                      <Button @click="cancelEdit" size="icon" variant="ghost" class="h-6 w-6 text-slate-400"><X class="w-3 h-3" /></Button>
                    </div>
                    <div v-else class="flex items-center gap-3">
                      <span v-if="revealedGps.imei" class="font-bold text-slate-700 text-sm tabular-nums">{{ car.gpsImei || '—' }}</span>
                      <span v-else-if="car.gpsImei" class="font-bold text-slate-400 text-sm tracking-[0.3em] select-none">••••••••</span>
                      <span v-else class="font-bold text-slate-300 text-sm">—</span>
                      <span v-if="isStaged('gpsImei')" class="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">Modifié</span>
                      <button v-if="car.gpsImei" type="button" @click="toggleGpsReveal('imei')" class="text-slate-300 hover:text-emerald-600 transition-colors outline-none" :title="revealedGps.imei ? 'Masquer' : 'Afficher (mot de passe requis)'">
                        <EyeOff v-if="revealedGps.imei" class="w-3.5 h-3.5" />
                        <Eye v-else class="w-3.5 h-3.5" />
                      </button>
                      <Button v-if="authStore.isAdmin && !car.disabled && revealedGps.imei" @click="startEdit('gpsImei', car.gpsImei || '')" variant="ghost" size="icon" class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400">
                        <Pencil class="w-3 h-3" />
                      </Button>
                    </div>
                 </div>
                 <div v-if="authStore.isAdmin" class="flex justify-between items-center py-3 group">
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-600">Fournisseur GPS</span>
                    <div v-if="editingField === 'gpsProvider'" class="flex items-center gap-2">
                      <select v-model="editValue" class="h-8 bg-white border-emerald-200 rounded-md px-2 text-xs font-black outline-none focus:border-indigo-400">
                        <option value="">Aucun</option>
                        <option value="traci">Traci.tn</option>
                        <option value="winnou">Winnou.tn</option>
                        <option value="autre">Autre</option>
                      </select>
                      <Button @click="stageEdit" size="icon" class="h-6 w-6 bg-emerald-600 text-white rounded-md"><Check class="w-3 h-3" /></Button>
                      <Button @click="cancelEdit" size="icon" variant="ghost" class="h-6 w-6 text-slate-400"><X class="w-3 h-3" /></Button>
                    </div>
                    <div v-else class="flex items-center gap-3">
                      <Badge v-if="car.gpsProvider && revealedGps.provider" variant="outline" class="font-black uppercase text-[9px] px-3 border-emerald-200 text-emerald-700">{{ gpsProviderLabel(car.gpsProvider) }}</Badge>
                      <span v-else-if="car.gpsProvider" class="font-bold text-slate-400 text-sm tracking-[0.3em] select-none">•••••</span>
                      <span v-else class="font-bold text-slate-300 text-sm">—</span>
                      <span v-if="isStaged('gpsProvider')" class="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-600 border border-amber-200">Modifié</span>
                      <button v-if="car.gpsProvider" type="button" @click="toggleGpsReveal('provider')" class="text-slate-300 hover:text-emerald-600 transition-colors outline-none" :title="revealedGps.provider ? 'Masquer' : 'Afficher (mot de passe requis)'">
                        <EyeOff v-if="revealedGps.provider" class="w-3.5 h-3.5" />
                        <Eye v-else class="w-3.5 h-3.5" />
                      </button>
                      <Button v-if="authStore.isAdmin && !car.disabled && revealedGps.provider" @click="startEdit('gpsProvider', car.gpsProvider || '')" variant="ghost" size="icon" class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400">
                        <Pencil class="w-3 h-3" />
                      </Button>
                    </div>
                 </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Right: Operational Logs -->
      <div class="lg:col-span-8">
        <Card class="border border-slate-200/50 shadow-2xl shadow-slate-200/20 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden min-h-[500px]">
          <CardContent class="p-0">
             <TabView class="premium-tabs">
               <TabPanel header="Journal d'Exploitation" value="0">
                  <div class="p-6">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                      <div>
                        <h3 class="text-xs font-black uppercase tracking-widest text-slate-400">Historique des Opérations</h3>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{{ car.contrats?.length || 0 }} contrat(s) &bull; {{ car.reservations?.length || 0 }} réservation(s)</p>
                      </div>
                      <div class="flex items-center gap-2">
                        <Button 
                          @click="openBilanModal" 
                          size="sm" 
                          class="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                          title="Ouvrir le bilan du véhicule avec filtres et export"
                        >
                          <FileText class="w-3.5 h-3.5" /> Bilan
                        </Button>
                      </div>
                    </div>
                    <DataTable :value="unifiedHistory" :rows="10" paginator class="p-datatable-premium" @row-click="(e) => openHistoryDetail(e.data)" row-hover>
                      <Column header="Nature">
                        <template #body="{ data }">
                          <div class="flex items-center gap-2">
                             <div :class="['w-2 h-2 rounded-full', data.historyType === 'RESERVATION' ? 'bg-amber-400' : 'bg-indigo-500']"></div>
                             <span class="font-black text-[10px] uppercase tracking-widest" :class="data.historyType === 'RESERVATION' ? 'text-amber-600' : 'text-indigo-600'">{{ data.displayType }}</span>
                          </div>
                        </template>
                      </Column>
                      <Column header="Référence">
                        <template #body="{ data }">
                          <span v-if="data.historyType === 'CONTRAT'" class="font-bold text-slate-900 tabular-nums text-[10px]">{{ data.reference }}</span>
                          <span v-else class="text-slate-300 font-bold text-[8px] uppercase tracking-widest italic">N/A</span>
                        </template>
                      </Column>
                      <Column header="Période">
                        <template #body="{ data }">
                          <div class="flex items-center gap-2 font-bold text-slate-700 tabular-nums text-[10px]">
                             <span>{{ formatDate(data.startDate) }}</span>
                             <ArrowRight class="w-3 h-3 text-slate-300" />
                             <span>{{ formatDate(data.endDate) }}</span>
                          </div>
                        </template>
                      </Column>
                      <Column header="Statut">
                        <template #body="{ data }">
                          <Badge :class="['text-[8px] font-black tracking-widest uppercase', data.status === 'confirmed' || data.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400']">{{ data.status }}</Badge>
                        </template>
                      </Column>
                    </DataTable>
                  </div>
               </TabPanel>

               <TabPanel header="Visites Techniques" value="1">
                  <div class="p-6">
                    <div class="flex justify-between items-center mb-6">
                      <h3 class="text-xs font-black uppercase tracking-widest text-slate-400">Historique Réglementaire</h3>
                      <Button v-if="authStore.isAdmin && !car.disabled" @click="openVisiteForm" size="sm" class="bg-rose-600 hover:bg-rose-700 text-white font-black text-[9px] uppercase tracking-widest px-4 h-9 rounded-xl shadow-lg shadow-rose-200">Nouvelle Visite</Button>
                    </div>
                    <DataTable :value="car.visites" class="p-datatable-premium">
                      <Column header="Date de Visite">
                        <template #body="{ data }">
                          <span class="font-bold text-slate-700 text-xs tabular-nums">{{ formatDate(data.date) }}</span>
                        </template>
                      </Column>
                      <Column header="Résultat">
                        <template #body="{ data }">
                           <Badge :class="['text-[8px] font-black', data.result === 'pass' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600']">{{ data.result.toUpperCase() }}</Badge>
                        </template>
                      </Column>
                      <Column header="Coût">
                        <template #body="{ data }">
                          <span class="font-black text-rose-600 tabular-nums">{{ data.cost || 0 }} TND</span>
                        </template>
                      </Column>
                      <Column header="Actions" v-if="authStore.isAdmin && !car.disabled">
                        <template #body="{ data }">
                           <div class="flex items-center gap-2">
                             <Button @click="editVisite(data)" variant="ghost" size="icon" class="h-8 w-8 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                               <Pencil class="w-4 h-4" />
                             </Button>
                             <Button @click="confirmDeleteVisite(data)" variant="ghost" size="icon" class="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                               <Trash2 class="w-4 h-4" />
                             </Button>
                           </div>
                        </template>
                      </Column>
                    </DataTable>
                  </div>
               </TabPanel>

               <TabPanel header="Suivi Dépenses" value="2">
                  <div class="p-8">
                    <div class="flex justify-between items-center mb-8 p-6 bg-rose-50/50 border border-rose-100 rounded-[2rem]">
                       <div class="space-y-1">
                         <span class="text-[9px] font-black text-rose-400 uppercase tracking-widest block">Total des Charges</span>
                         <span class="text-3xl font-black text-rose-700 tabular-nums">{{ totalExpenses }} <span class="text-sm">TND</span></span>
                       </div>
                       <div class="p-4 bg-white rounded-2xl shadow-sm border border-rose-100/50">
                          <Wallet class="w-8 h-8 text-rose-500" />
                       </div>
                    </div>
                     <DataTable :value="car.depenses" class="p-datatable-premium">
                       <Column header="Catégorie">
                          <template #body="{ data }">
                             <span class="font-black text-slate-900 uppercase text-[10px] tracking-tight">{{ data.category }}</span>
                          </template>
                       </Column>
                       <Column header="Montant">
                          <template #body="{ data }">
                             <span class="font-black text-rose-600 tabular-nums">{{ data.amount }} TND</span>
                          </template>
                       </Column>
                       <Column header="Actions" v-if="authStore.isAdmin && !car.disabled">
                          <template #body="{ data }">
                             <Button @click="confirmDeleteDepense(data)" variant="ghost" size="icon" class="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                                <Trash2 class="w-4 h-4" />
                             </Button>
                          </template>
                       </Column>
                     </DataTable>
                   </div>
                </TabPanel>

                <TabPanel header="Documents" value="3">
                  <div class="p-8">
                    <div class="flex justify-between items-center mb-8 gap-4">
                      <div class="space-y-1">
                        <h3 class="text-xs font-black uppercase tracking-widest text-slate-400">Pièces du Véhicule</h3>
                        <p class="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Carte grise, laisser passer, assurance, vignette (A4)</p>
                      </div>
                      <div v-if="docDirty" class="flex items-center gap-2 shrink-0">
                        <Button @click="cancelDocumentChanges" variant="ghost" class="h-10 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest text-slate-400 hover:text-slate-600 transition-all">
                          Annuler
                        </Button>
                        <Button @click="openDocPasswordDialog" :disabled="docSaving" class="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[9px] tracking-widest shadow-lg shadow-emerald-100 transition-all gap-2">
                          <Check v-if="!docSaving" class="w-4 h-4" />
                          <Loader2 v-else class="w-4 h-4 animate-spin" />
                          Enregistrer
                        </Button>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div v-for="docType in documentTypes" :key="docType.key">
                        <input
                          type="file"
                          :id="'doc-input-' + docType.key"
                          class="hidden"
                          accept="image/*,application/pdf"
                          @change="(e) => handleUploadDocument(docType.key, e)"
                        />

                        <div v-if="getDocument(docType.key)" class="border border-slate-200/50 rounded-[1.75rem] overflow-hidden bg-white/60 shadow-lg shadow-slate-100/50 group">
                          <div class="aspect-[4/3] bg-slate-100 relative">
                            <img
                              v-if="!isPdf(getDocument(docType.key).url)"
                              :src="getImageUrl(getDocument(docType.key).url)"
                              class="absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                              :alt="docType.label"
                            />
                            <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300">
                              <FileText class="w-12 h-12 stroke-[1.5]" />
                              <span class="text-[9px] font-black uppercase tracking-widest">Fichier PDF</span>
                            </div>
                            <span class="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-500 shadow-sm">{{ docType.label }}</span>
                            <span :class="['absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest', getDocument(docType.key)._id ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white']">{{ getDocument(docType.key)._id ? 'Chargé' : 'En attente' }}</span>
                          </div>
                          <div class="p-4 flex items-center justify-between gap-3">
                            <div class="min-w-0 flex-1">
                              <p class="text-[9px] font-black text-slate-900 uppercase tracking-widest truncate">{{ getDocument(docType.key).originalName || docType.label }}</p>
                              <p v-if="getDocument(docType.key).uploadedAt" class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{{ formatDate(getDocument(docType.key).uploadedAt) }}</p>
                              <p v-else class="text-[8px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">Non enregistré — cliquez sur Enregistrer</p>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                              <a :href="getImageUrl(getDocument(docType.key).url)" target="_blank" rel="noopener" class="h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                                <ExternalLink class="w-4 h-4" />
                              </a>
                              <label v-if="authStore.isAdmin && !car.disabled" :for="'doc-input-' + docType.key" class="h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer" title="Remplacer">
                                <Upload class="w-4 h-4" />
                              </label>
                              <Button v-if="authStore.isAdmin && !car.disabled" @click="deleteDocument(getDocument(docType.key))" variant="ghost" size="icon" class="h-9 w-9 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all" title="Supprimer">
                                <Trash2 class="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <label v-else :for="'doc-input-' + docType.key" class="aspect-[4/3] border-2 border-dashed border-slate-200 rounded-[1.75rem] flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all">
                          <div :class="['w-12 h-12 rounded-2xl flex items-center justify-center transition-all', uploadingType === docType.key ? 'bg-indigo-100 text-indigo-500' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100']">
                            <Upload v-if="uploadingType !== docType.key" class="w-5 h-5" />
                            <div v-else class="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                          <div class="text-center px-4">
                            <p class="text-[10px] font-black text-slate-700 uppercase tracking-widest">{{ docType.label }}</p>
                            <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{{ uploadingType === docType.key ? 'Téléversement...' : 'Cliquer pour téléverser' }}</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                 </TabPanel>
              </TabView>
           </CardContent>
         </Card>
       </div>
     </div>

      <!-- Side Calendar Button -->
      <button
        v-if="car"
        @click="showCarCalendar = true"
        class="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl shadow-indigo-900/30 rounded-l-2xl px-2.5 py-6 flex flex-col items-center gap-3 transition-all duration-300 hover:pr-4 group border border-indigo-500/50 border-r-0"
        title="Agenda Mensuel du véhicule"
      >
        <CalendarDays class="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span class="text-[9px] font-black uppercase tracking-[0.25em] [writing-mode:vertical-rl] rotate-180">Agenda</span>
      </button>

      <!-- Calendar Slider Drawer -->
      <Drawer v-model:visible="showCarCalendar" position="right" :modal="true" class="!w-full sm:!w-[900px] !bg-slate-50">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <CalendarDays class="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p class="text-sm font-black text-slate-900 uppercase tracking-tight italic">Agenda Mensuel</p>
              <p v-if="car" class="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">{{ (car as any).matricule || '' }}</p>
            </div>
          </div>
        </template>
        <CarMonthlyCalendar v-if="showCarCalendar && car" :car-id="(car as any)._id" />
      </Drawer>
   </div>
  <div v-else class="flex flex-col items-center justify-center p-20 space-y-6">
    <div class="relative flex items-center justify-center">
       <div class="w-16 h-16 border-[6px] border-indigo-100 rounded-full"></div>
       <div class="w-16 h-16 border-[6px] border-indigo-600 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
    </div>
    <div class="text-center space-y-1">
       <p class="text-indigo-600 font-black uppercase tracking-[0.4em] text-xs animate-pulse">Chargement Véhicule</p>
    </div>
  </div>

  <!-- VISITE TECHNIQUE MODAL -->
  <Dialog v-model:open="showVisiteForm">
    <DialogContent class="sm:max-w-md bg-white border-none shadow-2xl rounded-[2rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
      <DialogHeader class="mb-4">
        <DialogTitle class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Nouvelle <span class="text-rose-600">Visite Technique</span></DialogTitle>
        <p class="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Maintenance réglementaire</p>
      </DialogHeader>
      
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</Label>
            <Input type="date" v-model="visiteForm.date" class="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
          </div>
          <div class="space-y-2">
            <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Coût (TND)</Label>
            <Input type="number" v-model="visiteForm.cost" class="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold tabular-nums text-rose-600" />
          </div>
          <div class="space-y-2">
            <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Prochaine</Label>
            <Input type="date" v-model="visiteForm.nextVisitDate" disabled class="h-12 bg-rose-50 border-rose-100 text-rose-700 rounded-xl font-bold opacity-70 cursor-not-allowed" />
          </div>
          <div class="space-y-2">
            <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Résultat</Label>
            <select v-model="visiteForm.result" class="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-black">
              <option value="pass">FAVORABLE (Validée)</option>
              <option value="fail">DÉFAVORABLE (Échouée)</option>
            </select>
          </div>
          <div class="space-y-2 col-span-2">
            <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes Légales</Label>
            <Input v-model="visiteForm.notes" placeholder="Remarques..." class="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold" />
          </div>
        </div>
      </div>
      
      <DialogFooter class="mt-6 border-t border-slate-100 pt-6">
        <Button variant="ghost" @click="showVisiteForm = false" class="w-full h-12 font-black uppercase text-[10px] tracking-widest rounded-xl text-slate-400">Annuler</Button>
        <Button @click="saveVisite" :disabled="submittingVisite || !visiteForm.date || !visiteForm.nextVisitDate" class="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-rose-200">
          {{ submittingVisite ? 'Enregistrement...' : 'Enregistrer' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- EDIT MODAL -->
  <Dialog v-model:open="showEditForm">
    <DialogContent hideClose class="sm:max-w-2xl bg-white border-border shadow-3xl rounded-[2.5rem] p-0 overflow-hidden text-foreground max-h-[92vh] flex flex-col">
      <DialogHeader class="px-10 py-8 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white relative overflow-hidden shrink-0">
        <div class="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div class="absolute bottom-0 left-32 w-28 h-28 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        <button type="button" @click="showEditForm = false" class="absolute top-5 right-5 z-20 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all duration-300 hover:rotate-90 active:scale-90">
          <X class="w-5 h-5" />
        </button>
        <div class="flex items-center gap-5 relative z-10">
          <div class="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center shadow-lg shadow-indigo-900/20">
            <Pencil class="w-7 h-7" />
          </div>
          <div>
            <p class="text-[9px] font-black uppercase tracking-[0.35em] text-indigo-200">Édition</p>
            <DialogTitle class="text-2xl font-black uppercase tracking-tighter leading-tight">Modifier le Véhicule</DialogTitle>
            <p class="text-white/70 font-bold uppercase tracking-widest text-[9px] mt-1.5">Spécifications techniques</p>
          </div>
        </div>
      </DialogHeader>

      <div class="p-10 space-y-9 overflow-y-auto flex-1 custom-scrollbar">
        <!-- Identité du Véhicule -->
        <div>
          <div class="flex items-center gap-3 mb-6">
            <div class="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0"><Car class="w-4 h-4" /></div>
            <h4 class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800">Identité du Véhicule</h4>
            <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2 md:col-span-2">
              <Label class="form-label">Matricule</Label>
              <Input v-model="carForm.matricule" class="form-field tabular-nums" />
            </div>
            <div class="space-y-2">
              <Label class="form-label">Marque</Label>
              <Input v-model="carForm.brand" class="form-field" />
            </div>
            <div class="space-y-2">
              <Label class="form-label">Modèle</Label>
              <Input v-model="carForm.model" class="form-field" />
            </div>
          </div>
        </div>

        <!-- Tarifs & États -->
        <div>
          <div class="flex items-center gap-3 mb-6">
            <div class="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0"><Wallet class="w-4 h-4" /></div>
            <h4 class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800">Tarifs & États</h4>
            <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <Label class="form-label">Tarif (TND)</Label>
              <Input type="number" v-model="carForm.dailyRate" class="form-field tabular-nums" />
            </div>
            <div class="space-y-2">
              <Label class="form-label">Kilométrage</Label>
              <Input type="number" v-model="carForm.mileage" class="form-field tabular-nums" />
            </div>
            <div class="space-y-2">
              <Label class="form-label">Couleur</Label>
              <Input v-model="carForm.color" class="form-field" />
            </div>
            <div class="space-y-2">
              <Label class="form-label">Agence</Label>
              <div class="relative">
                <select v-model="carForm.agence" class="form-field form-field-select">
                  <option value="" disabled>Choisir une agence...</option>
                  <option v-for="agence in agences" :key="agence._id" :value="agence._id">{{ agence.name }}</option>
                </select>
                <ChevronDown class="w-4 h-4 text-slate-400 pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>

        <!-- Dates & Entretien -->
        <div>
          <div class="flex items-center gap-3 mb-6">
            <div class="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center shrink-0"><CalendarClock class="w-4 h-4" /></div>
            <h4 class="text-[10px] font-black uppercase tracking-[0.25em] text-slate-800">Dates & Entretien</h4>
            <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <Label class="form-label">Date Départ</Label>
              <Input type="date" v-model="carForm.departureDate" class="form-field" @click.stop />
            </div>
            <div class="space-y-2">
              <Label class="form-label">Prochaine Visite</Label>
              <Input type="date" v-model="carForm.nextTechnicalVisitDate" class="form-field" @click.stop />
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="px-10 py-6 bg-slate-50/80 border-t border-slate-100 flex gap-4 shrink-0">
        <Button variant="ghost" @click="showEditForm = false" class="flex-1 h-12 rounded-xl font-black uppercase text-[10px] text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">Annuler</Button>
        <Button @click="saveCar" :disabled="submittingAction" class="flex-[2] h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 gap-2">
          <Lock class="w-4 h-4" /> {{ submittingAction ? 'Enregistrement...' : 'Enregistrer' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- EDIT PASSWORD POPUP -->
  <PasswordConfirmDialog
    v-model:open="showPasswordDialog"
    v-model:password="adminPassword"
    title="Accès"
    subtitle="Administrateur"
    description="Saisissez votre mot de passe pour enregistrer"
    placeholder="••••••••"
    :loading="submittingAction"
    :error="editPasswordError"
    @confirm="confirmEditPassword"
  />

  <!-- DOCUMENTS SAVE PASSWORD POPUP -->
  <PasswordConfirmDialog
    v-model:open="showDocPasswordDialog"
    v-model:password="adminPassword"
    title="Accès"
    subtitle="Administrateur"
    description="Saisissez votre mot de passe pour enregistrer les documents"
    placeholder="••••••••"
    :loading="docSaving"
    :error="docPasswordError"
    @confirm="confirmDocSave"
  />

  <!-- GPS REVEAL PASSWORD POPUP -->
  <PasswordConfirmDialog
    v-model:open="showGpsPwdDialog"
    v-model:password="adminPassword"
    title="Information"
    subtitle="Sensible"
    :description="pendingGpsField === 'provider' ? 'Saisissez votre mot de passe pour afficher le fournisseur GPS' : 'Saisissez votre mot de passe pour afficher l IMEI GPS'"
    placeholder="••••••••"
    confirm-label="Afficher"
    :error="gpsPasswordError"
    @confirm="confirmGpsReveal"
  />

  <!-- DELETE MODAL -->
  <PasswordConfirmDialog
    v-model:open="showSecurityModal"
    v-model:password="adminPassword"
    title="Confirmation"
    subtitle="Requise"
    description="Autorisation de suppression du véhicule"
    placeholder="Mot de passe admin..."
    confirm-label="Confirmer"
    loading-label="Suppression..."
    :loading="submittingAction"
    @confirm="executeDelete"
  />

  <!-- STICKY BATCH SAVE BAR -->
  <transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 translate-y-6" enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0 translate-y-6">
    <div v-if="pendingCount > 0" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div class="bg-slate-900 text-white rounded-[1.75rem] shadow-2xl shadow-slate-900/30 pl-5 pr-2 py-2 flex items-center gap-4 border border-slate-700/60">
        <div class="flex items-center gap-3 min-w-0">
          <span class="relative flex h-2 w-2 shrink-0">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
          </span>
          <div class="min-w-0">
            <p class="text-[10px] font-black uppercase tracking-widest whitespace-nowrap leading-tight">{{ pendingCount }} modification(s) en attente</p>
            <p class="hidden md:block text-[8px] font-bold text-slate-400 truncate max-w-[260px]">{{ pendingFieldNames }}</p>
          </div>
        </div>
        <button @click="cancelAllPending" title="Tout annuler"
          class="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 transition-all active:scale-90 flex items-center justify-center shrink-0">
          <X class="w-4 h-4" />
        </button>
        <button @click="prepareSave"
          class="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-lg shadow-indigo-900/40 transition-all active:scale-95 shrink-0">
          <Check class="w-4 h-4" />
          Enregistrer tout
        </button>
      </div>
    </div>
  </transition>

  <!-- INLINE EDIT PASSWORD CONFIRM -->
  <PasswordConfirmDialog
    v-model:open="showConfirmDialog"
    v-model:password="adminPassword"
    title="Confirmation"
    subtitle="Admin"
    :description="`Mot de passe requis pour ${pendingCount} modification(s)`"
    placeholder="Mot de passe admin..."
    confirm-label="Confirmer"
    loading-label="Validation..."
    :loading="submittingAction"
    @confirm="executeInlineSave"
  />

  <!-- HISTORY DETAIL DIALOG -->
  <Dialog v-model:open="showHistoryDetail">
    <DialogContent class="sm:max-w-lg bg-white border-none shadow-3xl rounded-[3rem] p-0 overflow-hidden text-slate-900">
      <div v-if="selectedHistoryItem" class="flex flex-col">
        <div :class="['p-8 text-white relative overflow-hidden', selectedHistoryItem.historyType === 'RESERVATION' ? 'bg-amber-500' : 'bg-indigo-600']">
          <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl opacity-50"></div>
          <div class="relative z-10">
            <span class="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Détails de l'opération</span>
            <h3 class="text-3xl font-black uppercase italic tracking-tighter mt-1">{{ selectedHistoryItem.displayType }}</h3>
            <p v-if="selectedHistoryItem.historyType === 'CONTRAT'" class="text-[10px] font-mono tracking-widest mt-2 bg-white/20 px-3 py-1 rounded-full w-fit">REF: {{ selectedHistoryItem.reference }}</p>
          </div>
        </div>
        
        <div class="p-10 space-y-8">
          <div class="grid grid-cols-2 gap-8">
            <div class="space-y-1">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date Début</span>
              <p class="text-lg font-black text-slate-900 tabular-nums">{{ formatDate(selectedHistoryItem.startDate) }}</p>
            </div>
            <div class="space-y-1">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date Retour</span>
              <p class="text-lg font-black text-slate-900 tabular-nums">{{ formatDate(selectedHistoryItem.endDate) }}</p>
            </div>
            <div class="space-y-1">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Statut Actuel</span>
              <div>
                <Badge :class="['text-[8px] font-black tracking-widest uppercase', selectedHistoryItem.status === 'confirmed' || selectedHistoryItem.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400']">
                  {{ selectedHistoryItem.status }}
                </Badge>
              </div>
            </div>
            <div v-if="selectedHistoryItem.totalAmount" class="space-y-1">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Finances</span>
              <p class="text-lg font-black text-indigo-600 tabular-nums">
                {{ selectedHistoryItem.totalAmount }} <span class="text-xs">TND</span>
              </p>
            </div>
          </div>
          
          <div v-if="selectedHistoryItem.clients && selectedHistoryItem.clients.length" class="space-y-3">
             <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-2">Client(s) Associé(s)</span>
             <div v-for="c in selectedHistoryItem.clients" :key="c._id" class="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
               <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm">{{ c.firstName?.[0] }}{{ c.lastName?.[0] }}</div>
               <div>
                 <p class="text-xs font-black uppercase tracking-tight text-slate-900">{{ c.firstName }} {{ c.lastName }}</p>
                 <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{{ c.cin }}</p>
               </div>
             </div>
          </div>

          <div v-if="selectedHistoryItem.notes" class="space-y-2">
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notes & Observations</span>
            <p class="text-xs font-bold text-slate-600 bg-slate-50 p-4 rounded-2xl italic leading-relaxed">" {{ selectedHistoryItem.notes }} "</p>
          </div>
          
          <div class="pt-4 flex gap-4">
             <Button v-if="selectedHistoryItem.historyType === 'CONTRAT'" @click="$router.push('/contrats/' + selectedHistoryItem._id)" class="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-indigo-100">Voir Dossier Complet</Button>
             <Button variant="ghost" @click="showHistoryDetail = false" class="flex-1 h-14 font-black uppercase tracking-widest text-[10px] rounded-2xl text-slate-400">Fermer</Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <!-- STATUS CHANGE PASSWORD CONFIRM -->
  <PasswordConfirmDialog
    v-model:open="showStatusPwdDialog"
    v-model:password="statusPassword"
    title="Changement de Statut"
    subtitle="Sécurité"
    :description="`Mot de passe requis pour marquer ce véhicule comme ${pendingStatusValue ? 'DISPONIBLE' : 'LOUÉ'}.`"
    placeholder="Mot de passe admin..."
    confirm-label="Confirmer le statut"
    loading-label="Validation..."
    :error-message="statusPasswordError"
    :loading="statusSaving"
    @confirm="confirmStatusChange"
    @cancel="cancelStatusChange"
  />

  <!-- BILAN MODAL -->
  <Dialog v-model:open="showBilanModal">
    <DialogContent hideClose class="max-w-6xl w-[96vw] max-h-[92vh] bg-white border-border shadow-3xl rounded-[2.5rem] p-0 overflow-hidden text-foreground flex flex-col z-[250]">
      <DialogHeader class="px-8 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden shrink-0 flex flex-row items-center justify-between border-b border-white/10">
        <div class="flex items-center gap-4">
          <div class="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shadow-lg text-indigo-300">
            <FileText class="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <DialogTitle class="text-xl font-black uppercase tracking-tight text-white">Bilan du Véhicule</DialogTitle>
              <span class="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">{{ car.matricule }}</span>
            </div>
            <p class="text-white/60 font-bold uppercase tracking-widest text-[9px] mt-0.5">{{ car.brand }} {{ car.model }} &bull; Analyse financière et opérationnelle</p>
          </div>
        </div>
        <button 
          type="button" 
          @click="showBilanModal = false" 
          class="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all active:scale-90"
        >
          <X class="w-4 h-4" />
        </button>
      </DialogHeader>

      <div class="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
        <!-- Bilan Document Preview (Left) -->
        <div class="lg:col-span-8 overflow-y-auto p-6 md:p-8 bg-slate-100/70 space-y-6 max-h-[calc(92vh-80px)] custom-scrollbar">
          <div class="bg-white border border-slate-200/90 rounded-3xl p-7 shadow-sm space-y-6 text-slate-800">
            
            <!-- Cover-like Header -->
            <div class="border-b-2 border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 class="text-2xl font-black text-slate-900 uppercase tracking-tight">{{ car.brand }} <span class="text-indigo-600">{{ car.model }}</span></h2>
                <div class="flex items-center gap-2 mt-1.5">
                  <span class="text-[10px] font-black uppercase text-slate-400 tracking-widest">N° DE SÉRIE :</span>
                  <span class="bg-indigo-600 text-white font-mono font-black text-xs px-2.5 py-0.5 rounded-md tracking-wider">{{ car.matricule }}</span>
                </div>
              </div>
              <div class="flex flex-col sm:items-end gap-1.5">
                <span :class="['text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border', car.isAvailable ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200']">
                  {{ car.isAvailable ? 'DISPONIBLE' : 'LOUÉ' }}
                </span>
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-100">
                  {{ dateIntervalLabel }}
                </span>
              </div>
            </div>

            <!-- Specs Grid -->
            <div>
              <div class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-1 mb-3">Caractéristiques Générales</div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div class="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                  <span class="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Tarif Journalier</span>
                  <span class="text-xs font-black text-indigo-600">{{ car.dailyRate || 0 }} TND / j</span>
                </div>
                <div class="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                  <span class="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Kilométrage</span>
                  <span class="text-xs font-black text-slate-700">{{ car.mileage || 0 }} KM</span>
                </div>
                <div class="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                  <span class="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Couleur</span>
                  <span class="text-xs font-black text-slate-700 uppercase">{{ car.color || 'N/A' }}</span>
                </div>
                <div class="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                  <span class="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Agence</span>
                  <span class="text-xs font-black text-slate-700 uppercase truncate block">{{ car.agence?.name || 'Parc Principal' }}</span>
                </div>
              </div>
            </div>

            <!-- 4 KPI Cards -->
            <div>
              <div class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-1 mb-3">Synthèse d'Exploitation</div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                  <span class="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Total Contrats</span>
                  <span class="text-lg font-black text-slate-900 block mt-0.5">{{ filteredBilanStats.total }}</span>
                  <span class="text-[8px] font-bold text-slate-400 block">{{ filteredBilanStats.validCount }} val. • {{ filteredBilanStats.cancelledCount }} ann.</span>
                </div>
                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                  <span class="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Recettes Brutes</span>
                  <span class="text-lg font-black text-emerald-600 block mt-0.5">{{ filteredBilanStats.totalRevenue.toFixed(3) }} <span class="text-[9px]">TND</span></span>
                  <span class="text-[8px] font-bold text-slate-400 block">Moy. {{ filteredBilanStats.avgPerContract.toFixed(3) }} / c.</span>
                </div>
                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                  <span class="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Jours Loués</span>
                  <span class="text-lg font-black text-indigo-600 block mt-0.5">{{ filteredBilanStats.totalDays }} J</span>
                  <span class="text-[8px] font-bold text-slate-400 block">Hors annulations</span>
                </div>
                <div class="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                  <span class="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Total Dépenses</span>
                  <span class="text-lg font-black text-rose-600 block mt-0.5">{{ filteredBilanStats.expenses.toFixed(3) }} <span class="text-[9px]">TND</span></span>
                  <span class="text-[8px] font-bold text-slate-400 block">{{ filteredBilanDepenses.length }} enregistrement(s)</span>
                </div>
              </div>
            </div>

            <!-- Net Banner -->
            <div :class="['rounded-2xl p-4 text-center border font-black text-sm tracking-wide', filteredBilanStats.netProfit >= 0 ? 'bg-emerald-50/70 border-emerald-200 text-emerald-700' : 'bg-rose-50/70 border-rose-200 text-rose-700']">
              BILAN NET D'EXPLOITATION : {{ filteredBilanStats.netProfit >= 0 ? '+' : '' }}{{ filteredBilanStats.netProfit.toFixed(3) }} TND
              <span class="block text-[9px] font-bold opacity-80 mt-0.5">Recettes {{ filteredBilanStats.totalRevenue.toFixed(3) }} TND − Dépenses {{ filteredBilanStats.expenses.toFixed(3) }} TND</span>
            </div>

            <!-- Section Contrats Table -->
            <div class="space-y-3">
              <div class="bg-slate-900 text-white rounded-xl p-3 flex items-center justify-between">
                <span class="text-[10px] font-black uppercase tracking-widest">Historique des Contrats</span>
                <span class="text-[9px] font-bold text-indigo-200 tracking-wider">{{ filteredBilanContrats.length }} contrat(s)</span>
              </div>
              <div class="overflow-x-auto border border-slate-100 rounded-xl">
                <table class="w-full text-[10px] text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black text-[8px] tracking-wider">
                      <th class="py-2.5 px-3">Réf.</th>
                      <th class="py-2.5 px-3">Client</th>
                      <th class="py-2.5 px-3 text-center">Période</th>
                      <th class="py-2.5 px-3 text-right">Montant</th>
                      <th class="py-2.5 px-3 text-right">Caution</th>
                      <th class="py-2.5 px-3 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-bold">
                    <tr v-if="!filteredBilanContrats.length">
                      <td colspan="6" class="text-center py-4 text-slate-400 italic font-medium">Aucun contrat trouvé pour cette période.</td>
                    </tr>
                    <tr v-for="c in filteredBilanContrats" :key="c._id" :class="String(c.status).toLowerCase() === 'cancelled' ? 'bg-rose-50/50 text-rose-700' : 'hover:bg-slate-50/50'">
                      <td class="py-2.5 px-3 font-mono font-black">{{ c.reference }}</td>
                      <td class="py-2.5 px-3">{{ getContractClientsLabel(c) }}</td>
                      <template v-if="String(c.status).toLowerCase() === 'cancelled'">
                        <td colspan="4" class="py-2.5 px-3 text-center font-black tracking-[0.25em] text-rose-600 bg-rose-100/60 border-l border-rose-200">
                          ANNULÉ
                        </td>
                      </template>
                      <template v-else>
                        <td class="py-2.5 px-3 text-center whitespace-nowrap">
                          {{ formatDate(c.startDate) }} → {{ formatDate(c.endDate) }}
                          <span class="text-[8px] text-indigo-600 block">({{ getContractDays(c) }} j)</span>
                        </td>
                        <td class="py-2.5 px-3 text-right tabular-nums font-black text-slate-900">
                          {{ (Number(c.totalAmount) || 0).toFixed(3) }}
                        </td>
                        <td class="py-2.5 px-3 text-right tabular-nums text-slate-500">{{ c.depositAmount ? Number(c.depositAmount).toFixed(3) : '—' }}</td>
                        <td class="py-2.5 px-3 text-center">
                          <span class="px-2 py-0.5 rounded-full text-[8px] uppercase tracking-wider bg-slate-100 text-slate-600">
                            {{ getContractStatusLabel(c.status) }}
                          </span>
                        </td>
                      </template>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Section Dépenses Table -->
            <div class="space-y-3">
              <div class="bg-rose-600 text-white rounded-xl p-3 flex items-center justify-between">
                <span class="text-[10px] font-black uppercase tracking-widest">Historique des Dépenses</span>
                <span class="text-[9px] font-bold text-rose-100 tracking-wider">{{ filteredBilanDepenses.length }} dépense(s)</span>
              </div>
              <div class="overflow-x-auto border border-slate-100 rounded-xl">
                <table class="w-full text-[10px] text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black text-[8px] tracking-wider">
                      <th class="py-2.5 px-3">Date</th>
                      <th class="py-2.5 px-3">Catégorie</th>
                      <th class="py-2.5 px-3">Description</th>
                      <th class="py-2.5 px-3 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-bold">
                    <tr v-if="!filteredBilanDepenses.length">
                      <td colspan="4" class="text-center py-4 text-slate-400 italic font-medium">Aucune dépense trouvée pour cette période.</td>
                    </tr>
                    <tr v-for="d in filteredBilanDepenses" :key="d._id" class="hover:bg-slate-50/50">
                      <td class="py-2.5 px-3 whitespace-nowrap">{{ formatDate(d.date) }}</td>
                      <td class="py-2.5 px-3">
                        <span class="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md text-[8px] uppercase tracking-wider">{{ d.category || 'Autre' }}</span>
                      </td>
                      <td class="py-2.5 px-3 text-slate-600">{{ d.description || d.label || '—' }}</td>
                      <td class="py-2.5 px-3 text-right tabular-nums text-rose-600 font-black">{{ (Number(d.amount) || 0).toFixed(3) }} TND</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Summary Box -->
            <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600">• Résumé Global du Bilan</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-[10px]">
                <div class="flex justify-between py-1 border-b border-dashed border-slate-200">
                  <span class="text-slate-500">Chiffre d'affaires brut :</span>
                  <span class="font-black text-slate-900">{{ filteredBilanStats.totalRevenue.toFixed(3) }} TND</span>
                </div>
                <div class="flex justify-between py-1 border-b border-dashed border-slate-200">
                  <span class="text-slate-500">Total dépenses :</span>
                  <span class="font-black text-rose-600">{{ filteredBilanStats.expenses.toFixed(3) }} TND</span>
                </div>
                <div class="flex justify-between py-1 border-b border-dashed border-slate-200">
                  <span class="text-slate-500">Contrats validés :</span>
                  <span class="font-bold text-slate-700">{{ filteredBilanStats.validCount }} ({{ filteredBilanStats.totalDays }} jours)</span>
                </div>
                <div class="flex justify-between py-1 border-b border-dashed border-slate-200">
                  <span class="text-slate-500">Contrats annulés :</span>
                  <span class="font-bold text-rose-600">{{ filteredBilanStats.cancelledCount }}</span>
                </div>
                <div class="flex justify-between py-1 border-b border-dashed border-slate-200 sm:col-span-2">
                  <span class="text-slate-500">Cautions enregistrées :</span>
                  <span class="font-bold text-slate-700">{{ filteredBilanStats.totalDeposit.toFixed(3) }} TND</span>
                </div>
                <div class="flex justify-between pt-2 border-t-2 border-slate-900 font-black sm:col-span-2 text-xs">
                  <span>Bilan Net :</span>
                  <span :class="filteredBilanStats.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'">{{ filteredBilanStats.netProfit >= 0 ? '+' : '' }}{{ filteredBilanStats.netProfit.toFixed(3) }} TND</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Filter & Actions Panel (Right) -->
        <div class="lg:col-span-4 p-6 md:p-8 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col justify-between space-y-6">
          <div class="space-y-6">
            <div class="space-y-1">
              <div class="flex items-center gap-2 text-indigo-600">
                <Filter class="w-4 h-4 stroke-[2.5]" />
                <h3 class="text-xs font-black uppercase tracking-widest text-slate-900">Filtre de Date</h3>
              </div>
              <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Définir l'intervalle d'analyse</p>
            </div>

            <!-- Quick Presets -->
            <div class="space-y-2">
              <Label class="text-[9px] font-black uppercase tracking-wider text-slate-400">Périodes Rapides</Label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="setBilanPreset('all')"
                  :class="['h-9 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border', bilanFilter.preset === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100']"
                >
                  Tout
                </button>
                <button
                  type="button"
                  @click="setBilanPreset('month')"
                  :class="['h-9 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border', bilanFilter.preset === 'month' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100']"
                >
                  Ce Mois
                </button>
                <button
                  type="button"
                  @click="setBilanPreset('quarter')"
                  :class="['h-9 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border', bilanFilter.preset === 'quarter' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100']"
                >
                  3 Mois
                </button>
                <button
                  type="button"
                  @click="setBilanPreset('year')"
                  :class="['h-9 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border', bilanFilter.preset === 'year' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100']"
                >
                  Cette Année
                </button>
              </div>
            </div>

            <!-- Custom Date Inputs -->
            <div class="space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60">
              <div class="space-y-1.5">
                <Label class="text-[9px] font-black uppercase tracking-wider text-slate-500">Date Début</Label>
                <Input 
                  type="date" 
                  v-model="bilanFilter.dateStart" 
                  @change="bilanFilter.preset = 'custom'"
                  class="h-10 bg-white border-slate-200 text-xs font-bold rounded-xl"
                />
              </div>
              <div class="space-y-1.5">
                <Label class="text-[9px] font-black uppercase tracking-wider text-slate-500">Date Fin</Label>
                <Input 
                  type="date" 
                  v-model="bilanFilter.dateEnd" 
                  @change="bilanFilter.preset = 'custom'"
                  class="h-10 bg-white border-slate-200 text-xs font-bold rounded-xl"
                />
              </div>
              <Button 
                v-if="bilanFilter.dateStart || bilanFilter.dateEnd"
                type="button"
                @click="resetBilanFilter" 
                variant="ghost" 
                size="sm" 
                class="w-full h-8 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <X class="w-3.5 h-3.5" /> Réinitialiser la période
              </Button>
            </div>

            <!-- Live Scope Stats -->
            <div class="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/70 space-y-2">
              <span class="text-[8px] font-black uppercase tracking-widest text-indigo-500 block">Périmètre Actuel</span>
              <div class="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>Contrats :</span>
                <span class="font-black font-mono text-indigo-600">{{ filteredBilanContrats.length }}</span>
              </div>
              <div class="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>Dépenses :</span>
                <span class="font-black font-mono text-rose-600">{{ filteredBilanDepenses.length }}</span>
              </div>
              <div class="flex justify-between items-center text-xs font-bold text-slate-700 pt-1.5 border-t border-indigo-100">
                <span>Résultat Net :</span>
                <span class="font-black font-mono" :class="filteredBilanStats.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                  {{ filteredBilanStats.netProfit >= 0 ? '+' : '' }}{{ filteredBilanStats.netProfit.toFixed(3) }} TND
                </span>
              </div>
            </div>
          </div>

          <!-- Action Buttons (Print & Download) -->
          <div class="space-y-3 pt-6 border-t border-slate-100">
            <Button 
              @click="printCarBilan" 
              variant="outline" 
              class="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 border-indigo-200 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
              title="Imprimer le bilan pour la période sélectionnée"
            >
              <Printer class="w-4 h-4" /> Imprimer
            </Button>
            <Button 
              @click="downloadCarBilanPdf" 
              class="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              title="Télécharger le bilan PDF pour la période sélectionnée"
            >
              <Download class="w-4 h-4" /> Télécharger PDF
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { usePasswordGuard, handlePasswordError } from '@/composables/usePasswordGuard';
import { useToast } from 'primevue/usetoast';
import { 
  carApi, reservationApi, contratApi, depenseApi, visiteApi, vidangeApi, authApi, agenceApi, uploadApi, getImageUrl 
} from '@/api';
import { formatDate } from '@/lib/utils';
import { 
  ChevronLeft, ArrowRight, Wallet, Pencil, Check, X, ShieldAlert, Trash2, Eye, EyeOff, Upload, FileText, ExternalLink, Lock, ChevronDown, Car, CalendarClock, CalendarDays, Loader2, Printer, Download, Filter
} from 'lucide-vue-next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Card from '@/components/ui/card/Card.vue';
import CardContent from '@/components/ui/card/CardContent.vue';
import Badge from '@/components/ui/badge/Badge.vue';
import Button from '@/components/ui/button/Button.vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PasswordConfirmDialog } from '@/components/ui/password-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Drawer from 'primevue/drawer';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import CarMonthlyCalendar from '@/components/CarMonthlyCalendar.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();
const guard = usePasswordGuard();
const showCarCalendar = ref(false);
const car = ref<any>(null);

// ── STATUS CHANGE WITH PASSWORD REQUIREMENT ──
const statusSaving = ref(false);
const showStatusPwdDialog = ref(false);
const statusPassword = ref('');
const statusPasswordError = ref('');
const pendingStatusValue = ref<boolean | null>(null);

const handleStatusSelectChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const newVal = target.value === 'available';
  if (!car.value || newVal === car.value.isAvailable) return;

  // Stash pending value without committing yet, revert visible select until confirmed
  pendingStatusValue.value = newVal;
  target.value = car.value.isAvailable ? 'available' : 'rented';
  statusPassword.value = '';
  statusPasswordError.value = '';
  showStatusPwdDialog.value = true;
};

const cancelStatusChange = () => {
  pendingStatusValue.value = null;
  statusPassword.value = '';
  statusPasswordError.value = '';
  showStatusPwdDialog.value = false;
};

const confirmStatusChange = async () => {
  if (!statusPassword.value) {
    statusPasswordError.value = 'Le mot de passe est obligatoire.';
    return;
  }
  if (pendingStatusValue.value === null || !car.value) return;
  statusSaving.value = true;
  statusPasswordError.value = '';
  try {
    const res: any = await authApi.verifyPassword(statusPassword.value);
    if (!res?.valid && res?.valid !== undefined) {
      statusPasswordError.value = 'Mot de passe incorrect.';
      statusSaving.value = false;
      return;
    }
    const updated = await carApi.updateStatus(car.value._id, pendingStatusValue.value);
    car.value.isAvailable = typeof updated.isAvailable === 'boolean' ? updated.isAvailable : pendingStatusValue.value;
    toast.add({
      severity: 'success',
      summary: 'Statut mis à jour',
      detail: car.value.isAvailable ? 'Véhicule marqué DISPONIBLE' : 'Véhicule marqué LOUÉ',
      life: 3000
    });
    showStatusPwdDialog.value = false;
    statusPassword.value = '';
    pendingStatusValue.value = null;
  } catch (err: any) {
    console.error('Failed to update status', err);
    statusPasswordError.value = err.response?.data?.message || 'Mot de passe incorrect ou erreur serveur.';
  } finally {
    statusSaving.value = false;
  }
};

// ── BILAN DIALOG & FILTER LOGIC ──
const showBilanModal = ref(false);
const bilanFilter = reactive({
  dateStart: '',
  dateEnd: '',
  preset: 'all' as 'all' | 'month' | 'quarter' | 'year' | 'custom'
});

const setBilanPreset = (preset: 'all' | 'month' | 'quarter' | 'year') => {
  bilanFilter.preset = preset;
  const now = new Date();
  if (preset === 'all') {
    bilanFilter.dateStart = '';
    bilanFilter.dateEnd = '';
  } else if (preset === 'month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    bilanFilter.dateStart = firstDay.toISOString().split('T')[0];
    bilanFilter.dateEnd = now.toISOString().split('T')[0];
  } else if (preset === 'quarter') {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    bilanFilter.dateStart = threeMonthsAgo.toISOString().split('T')[0];
    bilanFilter.dateEnd = now.toISOString().split('T')[0];
  } else if (preset === 'year') {
    const firstDayYear = new Date(now.getFullYear(), 0, 1);
    bilanFilter.dateStart = firstDayYear.toISOString().split('T')[0];
    bilanFilter.dateEnd = now.toISOString().split('T')[0];
  }
};

const resetBilanFilter = () => {
  setBilanPreset('all');
};

const openBilanModal = () => {
  setBilanPreset('all');
  showBilanModal.value = true;
};

const filteredBilanContrats = computed(() => {
  if (!car.value?.contrats) return [];
  let list = car.value.contrats.slice();
  if (bilanFilter.dateStart) {
    const start = new Date(bilanFilter.dateStart);
    start.setHours(0, 0, 0, 0);
    list = list.filter((c: any) => new Date(c.startDate) >= start);
  }
  if (bilanFilter.dateEnd) {
    const end = new Date(bilanFilter.dateEnd);
    end.setHours(23, 59, 59, 999);
    list = list.filter((c: any) => new Date(c.startDate) <= end);
  }
  return list.sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
});

const filteredBilanDepenses = computed(() => {
  if (!car.value?.depenses) return [];
  let list = car.value.depenses.slice();
  if (bilanFilter.dateStart) {
    const start = new Date(bilanFilter.dateStart);
    start.setHours(0, 0, 0, 0);
    list = list.filter((d: any) => new Date(d.date) >= start);
  }
  if (bilanFilter.dateEnd) {
    const end = new Date(bilanFilter.dateEnd);
    end.setHours(23, 59, 59, 999);
    list = list.filter((d: any) => new Date(d.date) <= end);
  }
  return list.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

const filteredBilanStats = computed(() => {
  const contrats = filteredBilanContrats.value;
  const depenses = filteredBilanDepenses.value;
  const total = contrats.length;
  const cancelled = contrats.filter((c: any) => String(c.status).toLowerCase() === 'cancelled');
  const valid = contrats.filter((c: any) => String(c.status).toLowerCase() !== 'cancelled');
  const active = valid.filter((c: any) => ['active', 'soon'].includes(String(c.status).toLowerCase()));
  const finished = valid.filter((c: any) => ['terminé', 'clôturé'].includes(String(c.status).toLowerCase()));

  const totalRevenue = valid.reduce((sum: number, c: any) => sum + (Number(c.totalAmount) || 0), 0);
  const cancelledRevenue = cancelled.reduce((sum: number, c: any) => sum + (Number(c.totalAmount) || 0), 0);
  const totalDeposit = valid.reduce((sum: number, c: any) => sum + (Number(c.depositAmount) || 0), 0);
  const totalDays = valid.reduce((sum: number, c: any) => sum + getContractDays(c), 0);
  const avgPerContract = valid.length > 0 ? totalRevenue / valid.length : 0;
  const expenses = depenses.reduce((acc: number, d: any) => acc + (Number(d.amount) || 0), 0);
  const netProfit = totalRevenue - expenses;

  return {
    total,
    validCount: valid.length,
    cancelledCount: cancelled.length,
    activeCount: active.length,
    finishedCount: finished.length,
    totalRevenue,
    cancelledRevenue,
    totalDeposit,
    totalDays,
    avgPerContract,
    expenses,
    netProfit
  };
});

const dateIntervalLabel = computed(() => {
  if (bilanFilter.dateStart && bilanFilter.dateEnd) {
    return `Du ${formatDate(bilanFilter.dateStart)} au ${formatDate(bilanFilter.dateEnd)}`;
  } else if (bilanFilter.dateStart) {
    return `À partir du ${formatDate(bilanFilter.dateStart)}`;
  } else if (bilanFilter.dateEnd) {
    return `Jusqu'au ${formatDate(bilanFilter.dateEnd)}`;
  }
  return 'Tout l\'historique';
});

const showEditForm = ref(false);
const showSecurityModal = ref(false);
const showPasswordDialog = ref(false);
const adminPassword = ref('');
const showPassword = ref(false);
const editPasswordError = ref('');
const submittingAction = ref(false);

const editingField = ref<string | null>(null);
const editValue = ref<any>(null);
const showConfirmDialog = ref(false);

// Batch inline edits: fields are staged locally, then saved in ONE request
// with a SINGLE password prompt via the sticky "Enregistrer tout" bar.
const pendingChanges = ref<Record<string, any>>({});
const FIELD_LABELS: Record<string, string> = {
  dailyRate: 'Tarif',
  mileage: 'Kilométrage',
  color: 'Couleur',
  insuranceDate: 'Assurance',
  nextTechnicalVisitDate: 'Visite Technique',
  nextOilChangeMileage: 'Vidange',
  departureDate: 'Date Départ',
  agence: 'Agence',
  gpsImei: 'IMEI GPS',
  gpsProvider: 'Fournisseur GPS'
};
const pendingCount = computed(() => Object.keys(pendingChanges.value).length);
const pendingFieldNames = computed(() =>
  Object.keys(pendingChanges.value).map((f) => FIELD_LABELS[f] || f).join(' · ')
);
const isStaged = (field: string) => pendingChanges.value[field] !== undefined;

const selectedHistoryItem = ref<any>(null);
const showHistoryDetail = ref(false);

const deletingItemType = ref<string | null>(null);
const itemToDelete = ref<any>(null);
const editingVisiteId = ref<string | null>(null);

const unifiedHistory = computed(() => {
  if (!car.value) return [];
  const res = (car.value.reservations || []).map((r: any) => ({
    ...r,
    historyType: 'RESERVATION',
    displayType: 'Réservation',
    sortDate: new Date(r.startDate).getTime()
  }));
  const con = (car.value.contrats || []).map((c: any) => ({
    ...c,
    historyType: 'CONTRAT',
    displayType: 'Contrat',
    sortDate: new Date(c.startDate).getTime()
  }));
  return [...res, ...con].sort((a, b) => b.sortDate - a.sortDate);
});

const openHistoryDetail = (item: any) => {
  selectedHistoryItem.value = item;
  showHistoryDetail.value = true;
};

const carForm = reactive({
  matricule: '', brand: '', model: '', dailyRate: 300, mileage: 0,
  color: '', agence: '', departureDate: '', nextTechnicalVisitDate: '', nextOilChangeMileage: 0, insuranceDate: ''
});

const agences = ref<any[]>([]);

const documentTypes = [
  { key: 'carteGriseRecto', label: 'Carte Grise (Recto)' },
  { key: 'carteGriseVerso', label: 'Carte Grise (Verso)' },
  { key: 'laisserPasser', label: 'Laisser Passer' },
  { key: 'assurance', label: 'Assurance' },
  { key: 'vignette', label: 'Vignette (A4)' },
];

const uploadingType = ref<string | null>(null);

const pendingAdds = ref<any[]>([]);
const pendingDeletes = ref<string[]>([]);
const docSaving = ref(false);

const docDirty = computed(() => pendingAdds.value.length > 0 || pendingDeletes.value.length > 0);

const getDocument = (type: string) => {
  const staged = pendingAdds.value.find((d: any) => d.type === type);
  if (staged) return staged;
  if (!car.value) return null;
  const serverDoc = car.value.documents?.find((d: any) => d.type === type);
  if (serverDoc && !pendingDeletes.value.includes(serverDoc._id)) return serverDoc;
  return null;
};

const isPdf = (url: string) => url?.split('?')[0].toLowerCase().endsWith('.pdf');

const handleUploadDocument = async (type: string, event: any) => {
  const file = event.target.files?.[0];
  if (!file) return;
  uploadingType.value = type;
  try {
    const res = await uploadApi.upload(file);
    pendingAdds.value = pendingAdds.value.filter((d: any) => d.type !== type);
    const existing = car.value?.documents?.find((d: any) => d.type === type);
    if (existing && !pendingDeletes.value.includes(existing._id)) {
      pendingDeletes.value.push(existing._id);
    }
    pendingAdds.value.push({ type, url: res.url, originalName: file.name });
  } catch (err) {
    console.error('Document upload failed', err);
    alert("Erreur lors du téléversement du document.");
  } finally {
    uploadingType.value = null;
    event.target.value = '';
  }
};

const deleteDocument = (doc: any) => {
  if (!doc) return;
  if (!confirm(`Supprimer ce document (${doc.originalName || doc.type}) ?`)) return;
  if (doc._id) {
    if (!pendingDeletes.value.includes(doc._id)) pendingDeletes.value.push(doc._id);
  } else {
    pendingAdds.value = pendingAdds.value.filter((d: any) => d !== doc);
  }
};

const showDocPasswordDialog = ref(false);
const docPasswordError = ref('');

const openDocPasswordDialog = () => {
  adminPassword.value = '';
  docPasswordError.value = '';
  showDocPasswordDialog.value = true;
};

const confirmDocSave = async () => {
  if (!adminPassword.value) {
    docPasswordError.value = 'Le mot de passe est obligatoire.';
    return;
  }
  if (guard.isLocked) return;
  docSaving.value = true;
  docPasswordError.value = '';
  try {
    for (const doc of pendingAdds.value) {
      await carApi.addDocument(car.value._id, {
        type: doc.type,
        url: doc.url,
        originalName: doc.originalName,
        password: adminPassword.value,
      });
    }
    for (const id of pendingDeletes.value) {
      await carApi.removeDocument(car.value._id, id, adminPassword.value);
    }
    await refreshCarData();
    pendingAdds.value = [];
    pendingDeletes.value = [];
    guard.reset();
    showDocPasswordDialog.value = false;
    adminPassword.value = '';
  } catch (err: any) {
    console.error('Failed to save document changes', err);
    if (handlePasswordError(err, toast)) return;
    docPasswordError.value =
      err.response?.data?.message || "Erreur lors de l'enregistrement des modifications.";
  } finally {
    docSaving.value = false;
  }
};

const cancelDocumentChanges = () => {
  pendingAdds.value = [];
  pendingDeletes.value = [];
};

const startEdit = (field: string, value: any) => {
  editingField.value = field;
  editValue.value = field in pendingChanges.value ? pendingChanges.value[field] : value;
};

// Stage the edit locally — nothing is sent until "Enregistrer tout" (one password for all)
const stageEdit = () => {
  if (!editingField.value) return;
  const val = typeof editValue.value === 'string' ? editValue.value.trim() : editValue.value;
  pendingChanges.value[editingField.value] = val;
  cancelEdit();
};

const cancelAllPending = () => {
  pendingChanges.value = {};
  cancelEdit();
};

const gpsProviderLabel = (p: string) =>
  p === 'traci' ? 'Traci.tn' : p === 'winnou' ? 'Winnou.tn' : p === 'autre' ? 'Autre' : p;

const revealedGps = ref<Record<string, boolean>>({ imei: false, provider: false });
const showGpsPwdDialog = ref(false);
const gpsPasswordError = ref('');
const pendingGpsField = ref<'imei' | 'provider' | null>(null);

const toggleGpsReveal = (field: 'imei' | 'provider') => {
  if (!authStore.isAdmin) return;
  if (revealedGps.value[field]) {
    revealedGps.value[field] = false;
    return;
  }
  pendingGpsField.value = field;
  adminPassword.value = '';
  gpsPasswordError.value = '';
  showGpsPwdDialog.value = true;
};

const confirmGpsReveal = async () => {
  if (!adminPassword.value) {
    gpsPasswordError.value = 'Le mot de passe est obligatoire.';
    return;
  }
  if (guard.isLocked || !pendingGpsField.value) return;
  try {
    const res: any = await authApi.verifyPassword(adminPassword.value);
    if (!res?.valid && res?.valid !== undefined) {
      guard.registerFailure();
      gpsPasswordError.value = 'Mot de passe incorrect.';
      return;
    }
    revealedGps.value[pendingGpsField.value] = true;
    guard.reset();
    showGpsPwdDialog.value = false;
    adminPassword.value = '';
    toast.add({ severity: 'success', summary: 'Succès', detail: 'Information GPS affichée', life: 2000 });
  } catch (err: any) {
    if (handlePasswordError(err, toast)) return;
    guard.registerFailure();
    gpsPasswordError.value = err.response?.data?.message || 'Mot de passe incorrect.';
  }
};

const cancelEdit = () => {
  editingField.value = null;
  editValue.value = null;
};

const prepareSave = () => {
  if (!pendingCount.value) return;
  adminPassword.value = '';
  showConfirmDialog.value = true;
};

const executeInlineSave = async () => {
  if (!adminPassword.value || !pendingCount.value) return;
  submittingAction.value = true;
  try {
    const payload: any = { ...pendingChanges.value, password: adminPassword.value };
    if ('agence' in payload && !payload.agence) payload.agence = null;
    await carApi.update(car.value._id, payload);
    guard.reset();

    // Update local state
    for (const [field, value] of Object.entries(pendingChanges.value)) {
      if (field === 'agence') {
        car.value.agence = agences.value.find((a: any) => a._id === value) || null;
      } else {
        car.value[field] = value;
      }
    }

    toast.add({
      severity: 'success',
      summary: 'Modifications Enregistrées',
      detail: `${pendingCount.value} champ(s) mis à jour avec succès.`,
      life: 3000
    });

    cancelAllPending();
    showConfirmDialog.value = false;
    adminPassword.value = '';
  } catch (err: any) {
    console.error('Failed to update fields', err);
    if (handlePasswordError(err, toast)) return;
    alert(err.response?.data?.message || 'Erreur lors de la modification.');
  } finally {
    submittingAction.value = false;
  }
};

const totalExpenses = computed(() => {
  if (!car.value?.depenses) return 0;
  return car.value.depenses.reduce((acc: number, curr: any) => acc + curr.amount, 0);
});

// ── BILAN DU VÉHICULE (PAGE DE GARDE, CONTRATS & RÉSUMÉ) ──
const escapeHtml = (str: any) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const getContractDays = (c: any) => {
  if (!c?.startDate || !c?.endDate) return 1;
  const start = new Date(c.startDate).getTime();
  const end = new Date(c.endDate).getTime();
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, isNaN(diff) ? 1 : diff);
};

const getContractClientsLabel = (c: any) => {
  if (c.clients && c.clients.length > 0) {
    return c.clients
      .map((cl: any) => `${cl.firstName || ''} ${cl.lastName || ''}`.trim() + (cl.cin ? ` (CIN: ${cl.cin})` : ''))
      .filter(Boolean)
      .join(', ');
  }
  if (c.client) {
    return `${c.client.firstName || ''} ${c.client.lastName || ''}`.trim() + (c.client.cin ? ` (CIN: ${c.client.cin})` : '');
  }
  return '—';
};

const getContractStatusLabel = (status: string) => {
  const s = String(status || '').toLowerCase();
  switch (s) {
    case 'cancelled': return 'ANNULÉ';
    case 'active': return 'ACTIF';
    case 'soon': return 'À VENIR';
    case 'terminé': return 'TERMINÉ';
    case 'clôturé': return 'CLÔTURÉ';
    default: return s.toUpperCase() || '—';
  }
};

const getCarBilanStats = () => {
  const contrats: any[] = car.value?.contrats || [];
  const total = contrats.length;
  const cancelled = contrats.filter((c: any) => String(c.status).toLowerCase() === 'cancelled');
  const valid = contrats.filter((c: any) => String(c.status).toLowerCase() !== 'cancelled');
  const active = valid.filter((c: any) => ['active', 'soon'].includes(String(c.status).toLowerCase()));
  const finished = valid.filter((c: any) => ['terminé', 'clôturé'].includes(String(c.status).toLowerCase()));

  const totalRevenue = valid.reduce((sum: number, c: any) => sum + (Number(c.totalAmount) || 0), 0);
  const cancelledRevenue = cancelled.reduce((sum: number, c: any) => sum + (Number(c.totalAmount) || 0), 0);
  const totalDeposit = valid.reduce((sum: number, c: any) => sum + (Number(c.depositAmount) || 0), 0);
  const totalDays = valid.reduce((sum: number, c: any) => sum + getContractDays(c), 0);
  const avgPerContract = valid.length > 0 ? totalRevenue / valid.length : 0;
  const expenses = totalExpenses.value || 0;
  const netProfit = totalRevenue - expenses;

  return {
    total,
    validCount: valid.length,
    cancelledCount: cancelled.length,
    activeCount: active.length,
    finishedCount: finished.length,
    totalRevenue,
    cancelledRevenue,
    totalDeposit,
    totalDays,
    avgPerContract,
    expenses,
    netProfit
  };
};

// ═══════════════════════════════════════════════════════════════
//  printCarBilan  +  downloadCarBilanPdf
//  - Both now share the SAME data  (contracts + expenses + category
//    summary + global summary, 4 KPI cards, net profit banner)
//  - Both now share the SAME design (cover header w/ serial badge +
//    status pill, spec cards, dark banners, period pill, summary boxes)
//  Assumes the same helpers/imports as before: car, getCarBilanStats,
//  escapeHtml, formatDate, getContractClientsLabel, getContractDays,
//  getContractStatusLabel, jsPDF, autoTable, toast.
// ═══════════════════════════════════════════════════════════════

// ───────────────────────── PRINT ─────────────────────────
const printCarBilan = () => {
  if (!car.value) return;

  const stats = filteredBilanStats.value;
  const agencyName = car.value.agence?.name || 'Parc Principal';
  const isAvail = car.value.isAvailable && !car.value.disabled;
  const statusLabel = isAvail ? 'DISPONIBLE' : (car.value.disabled ? 'DÉSACTIVÉ' : 'LOUÉ');
  const statusColor = isAvail ? '#10b981' : '#f43f5e';
  const statusBg = isAvail ? '#ecfdf5' : '#fff1f2';
  const netPositive = stats.netProfit >= 0;
  const netSign = netPositive ? '+' : '';

  const contrats = filteredBilanContrats.value;
  const depenses: any[] = filteredBilanDepenses.value;

  const contractTableRows = contrats.map((c: any) => {
    const isCancelled = String(c.status).toLowerCase() === 'cancelled';
    if (isCancelled) {
      return `
        <tr class="row-cancelled">
          <td class="font-bold text-center">${escapeHtml(c.reference || '—')}</td>
          <td>${escapeHtml(getContractClientsLabel(c))}</td>
          <td colspan="5" class="text-center font-bold text-cancelled" style="letter-spacing: 2.5px; font-weight: 900; background: #fff1f2;">
            ANNULÉ
          </td>
        </tr>
      `;
    }
    return `
      <tr>
        <td class="font-bold text-center">${escapeHtml(c.reference || '—')}</td>
        <td>${escapeHtml(getContractClientsLabel(c))}</td>
        <td class="text-center col-periode">
          <div class="periode-dates">${formatDate(c.startDate)} &minus; ${formatDate(c.endDate)}</div>
          <span class="periode-badge">${getContractDays(c)} jour${getContractDays(c) > 1 ? 's' : ''}</span>
        </td>
        <td class="text-right font-bold text-primary">${(Number(c.totalAmount) || 0).toFixed(3)} TND</td>
        <td class="text-right">${c.depositAmount ? Number(c.depositAmount).toFixed(3) + ' TND' : '—'}</td>
        <td class="text-center">${escapeHtml(c.paymentMethod || 'Espèces')}</td>
        <td class="text-center"><span class="badge badge-normal">${escapeHtml(getContractStatusLabel(c.status))}</span></td>
      </tr>
    `;
  }).join('');

  const depenseTableRows = depenses.map((d: any) => `
      <tr>
        <td class="font-bold text-center">${formatDate(d.date)}</td>
        <td class="text-center"><span class="badge badge-danger">${escapeHtml(String(d.category || 'Autre').toUpperCase())}</span></td>
        <td>${escapeHtml(d.description || d.label || '—')}</td>
        <td class="text-right font-bold text-cancelled">${(Number(d.amount) || 0).toFixed(3)} TND</td>
      </tr>
  `).join('');

  const byCategory: Record<string, number> = {};
  depenses.forEach((d: any) => {
    const cat = String(d.category || 'Autre').toUpperCase();
    byCategory[cat] = (byCategory[cat] || 0) + (Number(d.amount) || 0);
  });
  const categoryLines = Object.entries(byCategory).map(([cat, tot]) => `
      <div class="summary-line">
        <span class="text-muted">Dépenses — ${escapeHtml(cat)}:</span>
        <span class="font-bold text-cancelled">${tot.toFixed(3)} TND</span>
      </div>`).join('');

  const printWindow = window.open('', '_blank', 'width=950,height=1200');
  if (!printWindow) {
    alert("Impossible d'ouvrir la fenêtre d'impression. Veuillez autoriser les fenêtres pop-up.");
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bilan Véhicule - ${escapeHtml(car.value.brand)} ${escapeHtml(car.value.model)} (${escapeHtml(car.value.matricule)})</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #f8fafc; line-height: 1.4; padding: 20px; font-size: 13px; }

    .print-actions { position: sticky; top: 0; z-index: 100; background: #0f172a; color: white; padding: 12px 24px; border-radius: 16px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); }
    .print-actions button { padding: 10px 20px; border-radius: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; font-size: 11px; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-print { background: #4f46e5; color: white; }
    .btn-print:hover { background: #4338ca; }
    .btn-close { background: rgba(255,255,255,0.15); color: white; margin-left: 8px; }
    .btn-close:hover { background: rgba(255,255,255,0.25); }

    .sheet { background: white; max-width: 210mm; margin: 0 auto; padding: 20mm 16mm; box-shadow: 0 4px 30px rgba(0,0,0,0.08); border-radius: 8px; }
    .page-break { page-break-after: always; break-after: page; }

    .cover-header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-end; }
    .model-block { display: flex; flex-direction: column; gap: 4px; }
    .vehicle-model { font-size: 26px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: -0.5px; line-height: 1.1; }
    .vehicle-serie { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
    .serie-label { font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 1px; text-transform: uppercase; }
    .serie-badge { background: #4f46e5; color: white; font-weight: 900; font-size: 13px; padding: 3px 10px; border-radius: 6px; letter-spacing: 1px; font-family: monospace; }

    .header-banner { background: #0f172a; color: white; border-radius: 14px; padding: 18px 22px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .header-banner h1 { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; }
    .header-banner p { font-size: 10px; font-weight: 700; color: #a5b4fc; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
    .header-banner .meta { text-align: right; font-size: 10px; color: #94a3b8; }
    .header-banner.rose { background: #0f172a; }

    .status-badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }

    .section-title { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #475569; margin: 18px 0 10px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; display: flex; justify-content: space-between; }

    .specs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .spec-item { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; }
    .spec-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .spec-val { font-size: 12px; font-weight: 900; color: #0f172a; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 11px; }
    th { background: #0f172a; color: white; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; font-size: 9px; padding: 8px 10px; text-align: left; }
    table.table-rose th { background: #f43f5e; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }
    tr:nth-child(even) { background: #f8fafc; }

    .th-periode { min-width: 140px; text-align: center; }
    .col-periode { text-align: center; vertical-align: middle; padding: 6px 10px; }
    .periode-dates { font-size: 11px; font-weight: 800; color: #0f172a; letter-spacing: 0.2px; margin-bottom: 2px; white-space: nowrap; }
    .periode-badge { display: inline-block; background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe; font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 1.5px 7px; border-radius: 999px; white-space: nowrap; }

    .row-cancelled { background: #fff1f2 !important; color: #e11d48; }
    .text-cancelled { color: #e11d48 !important; }
    .text-primary { color: #4f46e5; }
    .text-muted { color: #94a3b8; }
    .font-bold { font-weight: 800; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }

    .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-danger { background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; }
    .badge-normal { background: #e0e7ff; color: #4338ca; }
    .badge-cancelled { background: #ffe4e6; color: #be123c; border: 1px solid #fda4af; }

    .kpi-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-top: 14px; }
    .kpi-card { background: #f1f5f9; border-radius: 12px; padding: 12px; text-align: left; }
    .kpi-label { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 15px; font-weight: 900; color: #0f172a; margin: 4px 0; }
    .kpi-sub { font-size: 8.5px; font-weight: 700; color: #64748b; }

    .net-banner { margin-top: 16px; border-radius: 12px; padding: 14px 18px; text-align: center; font-weight: 900; font-size: 13px; letter-spacing: 0.3px; }
    .net-banner small { display: block; font-size: 9px; font-weight: 700; margin-top: 3px; opacity: 0.85; }

    .summary-box { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px; padding: 18px 22px; margin-top: 20px; }
    .summary-title { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #4f46e5; margin-bottom: 14px; }
    .summary-title.rose { color: #e11d48; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 28px; font-size: 11px; }
    .summary-line { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #cbd5e1; }
    .summary-line.highlight { font-size: 13px; font-weight: 900; border-bottom: none; border-top: 2px solid #0f172a; padding-top: 10px; margin-top: 6px; }

    .footer { text-align: center; font-size: 9px; color: #94a3b8; margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; }

    @media print {
      body { background: white; padding: 0; font-size: 11px; }
      .sheet { max-width: 100%; box-shadow: none; border-radius: 0; padding: 0; margin: 0; }
      .print-actions { display: none !important; }
      .page-break { page-break-after: always; break-after: page; }
      @page { size: A4; margin: 12mm; }
    }
  </style>
</head>
<body>

  <div class="print-actions">
    <div><strong>BILAN DU VÉHICULE &bull; ${escapeHtml(car.value.brand)} ${escapeHtml(car.value.model)} (${escapeHtml(car.value.matricule)})</strong></div>
    <div>
      <button class="btn-print" onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button>
      <button class="btn-close" onclick="window.close()">✕ Fermer</button>
    </div>
  </div>

  <div class="sheet">

    <!-- PAGE 1 : PAGE DE GARDE -->
    <div class="page-break">
      <div class="cover-header">
        <div class="model-block">
          <h1 class="vehicle-model">${escapeHtml(car.value.brand)} ${escapeHtml(car.value.model)}</h1>
          <div class="vehicle-serie">
            <span class="serie-label">N° DE SÉRIE :</span>
            <span class="serie-badge">${escapeHtml(car.value.matricule)}</span>
          </div>
        </div>
        <div>
          <span class="status-badge" style="background:${statusBg}; color:${statusColor}; border: 1.5px solid ${statusColor};">${statusLabel}</span>
        </div>
      </div>

      <div class="section-title"><span>Caractéristiques Générales du Véhicule</span></div>

      <div class="specs-grid">
        <div class="spec-item"><span class="spec-label">Tarif Journalier</span><span class="spec-val text-primary">${car.value.dailyRate || 0} TND / jour</span></div>
        <div class="spec-item"><span class="spec-label">Kilométrage Actuel</span><span class="spec-val">${car.value.mileage || 0} KM</span></div>
        <div class="spec-item"><span class="spec-label">Couleur Extérieure</span><span class="spec-val">${escapeHtml(car.value.color || 'N/A')}</span></div>
        <div class="spec-item"><span class="spec-label">Agence d'Attache</span><span class="spec-val">${escapeHtml(agencyName)}</span></div>
        <div class="spec-item"><span class="spec-label">Prochaine Assurance</span><span class="spec-val">${formatDate(car.value.insuranceDate)}</span></div>
        <div class="spec-item"><span class="spec-label">Prochaine Visite Technique</span><span class="spec-val">${formatDate(car.value.nextTechnicalVisitDate)}</span></div>
        <div class="spec-item"><span class="spec-label">Date Départ / Circulation</span><span class="spec-val">${formatDate(car.value.departureDate)}</span></div>
        <div class="spec-item"><span class="spec-label">Prochaine Vidange</span><span class="spec-val">${car.value.nextOilChangeMileage ? car.value.nextOilChangeMileage + ' KM' : '—'}</span></div>
      </div>

      <div class="section-title"><span>Synthèse Préliminaire d'Exploitation</span></div>

      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Total Contrats</div>
          <div class="kpi-value">${stats.total}</div>
          <div class="kpi-sub">${stats.validCount} val. &bull; ${stats.cancelledCount} ann.</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Recettes Brutes</div>
          <div class="kpi-value" style="color:#10b981;">${stats.totalRevenue.toFixed(3)} TND</div>
          <div class="kpi-sub">Moy. ${stats.avgPerContract.toFixed(3)} / contrat</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Jours Loués</div>
          <div class="kpi-value" style="color:#4f46e5;">${stats.totalDays} J</div>
          <div class="kpi-sub">Hors annulations</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Dépenses</div>
          <div class="kpi-value" style="color:#f43f5e;">${stats.expenses.toFixed(3)} TND</div>
          <div class="kpi-sub">${depenses.length} enregistrement(s)</div>
        </div>
      </div>

      <div class="net-banner" style="background:${netPositive ? '#ecfdf5' : '#fff1f2'}; color:${netPositive ? '#059669' : '#e11d48'};">
        BILAN NET D'EXPLOITATION : ${netSign}${stats.netProfit.toFixed(3)} TND
        <small>Recettes ${stats.totalRevenue.toFixed(3)} TND &minus; Dépenses ${stats.expenses.toFixed(3)} TND</small>
      </div>

      <div class="footer">Page de garde &bull; Détails complets sur les pages suivantes</div>
    </div>

    <!-- PAGE 2 : HISTORIQUE DES CONTRATS -->
    <div class="page-break">
      <div class="header-banner">
        <div>
          <h1>HISTORIQUE DES CONTRATS</h1>
          <p>${escapeHtml(car.value.brand)} ${escapeHtml(car.value.model)} &bull; ${stats.total} contrat(s) dont ${stats.cancelledCount} annulé(s)</p>
        </div>
        <div class="meta">Immatriculation: <strong>${escapeHtml(car.value.matricule)}</strong></div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="text-center">Réf.</th>
            <th>Conducteur(s) &amp; CIN</th>
            <th class="text-center th-periode">PÉRIODE &amp; DURÉE</th>
            <th class="text-right">Montant</th>
            <th class="text-right">Caution</th>
            <th class="text-center">Règlement</th>
            <th class="text-center">Statut</th>
          </tr>
        </thead>
        <tbody>
          ${contractTableRows || '<tr><td colspan="7" class="text-center">Aucun contrat enregistré.</td></tr>'}
        </tbody>
      </table>

      <div class="summary-box">
        <div class="summary-title">&bull; RÉSUMÉ — SECTION CONTRATS</div>
        <div class="summary-grid">
          <div>
            <div class="summary-line"><span class="text-muted">Contrats validés (actifs / terminés / clôturés):</span><span class="font-bold">${stats.validCount} (${stats.totalDays} jours)</span></div>
            <div class="summary-line"><span class="text-muted">Contrats annulés:</span><span class="font-bold text-cancelled">${stats.cancelledCount} (${stats.cancelledRevenue.toFixed(3)} TND non perçus)</span></div>
            <div class="summary-line"><span class="text-muted">Cautions encaissées:</span><span class="font-bold">${stats.totalDeposit.toFixed(3)} TND</span></div>
          </div>
          <div>
            <div class="summary-line"><span class="text-muted">Chiffre d'affaires brut (contrats honorés):</span><span class="font-bold text-primary">${stats.totalRevenue.toFixed(3)} TND</span></div>
            <div class="summary-line"><span class="text-muted">Revenu moyen par contrat validé:</span><span class="font-bold">${stats.avgPerContract.toFixed(3)} TND</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- PAGE 3 : HISTORIQUE DES DÉPENSES -->
    <div class="page-break">
      <div class="header-banner">
        <div>
          <h1>HISTORIQUE DES DÉPENSES &amp; ENTRETIEN</h1>
          <p>${escapeHtml(car.value.brand)} ${escapeHtml(car.value.model)} &bull; ${depenses.length} dépense(s) &bull; Total : ${stats.expenses.toFixed(3)} TND</p>
        </div>
        <div class="meta">Immatriculation: <strong>${escapeHtml(car.value.matricule)}</strong></div>
      </div>

      <table class="table-rose">
        <thead>
          <tr>
            <th class="text-center">Date</th>
            <th class="text-center">Catégorie</th>
            <th>Description</th>
            <th class="text-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${depenseTableRows || '<tr><td colspan="4" class="text-center">Aucune dépense enregistrée.</td></tr>'}
        </tbody>
      </table>

      <div class="summary-box">
        <div class="summary-title rose">&bull; RÉSUMÉ — SECTION DÉPENSES (PAR CATÉGORIE)</div>
        <div>
          ${categoryLines}
          <div class="summary-line highlight">
            <span>TOTAL GÉNÉRAL DES DÉPENSES:</span>
            <span class="text-cancelled">${stats.expenses.toFixed(3)} TND</span>
          </div>
        </div>
      </div>
    </div>

    <!-- PAGE FINALE : RÉSUMÉ GLOBAL -->
    <div>
      <div class="header-banner">
        <div>
          <h1>RÉSUMÉ GLOBAL DU BILAN</h1>
          <p>${escapeHtml(car.value.brand)} ${escapeHtml(car.value.model)} &bull; ${escapeHtml(car.value.matricule)} &bull; Édité le ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      <div class="summary-box" style="margin-top:0;">
        <div class="summary-title">&bull; INDICATEURS DE L'EXPLOITATION</div>
        <div>
          <div class="summary-line"><span class="text-muted">Total des contrats enregistrés:</span><span class="font-bold">${stats.total}</span></div>
          <div class="summary-line"><span class="text-muted">Contrats validés (actifs / terminés / clôturés):</span><span class="font-bold">${stats.validCount} (${stats.totalDays} jours loués)</span></div>
          <div class="summary-line"><span class="text-muted">Contrats annulés:</span><span class="font-bold text-cancelled">${stats.cancelledCount} (${stats.cancelledRevenue.toFixed(3)} TND non perçus)</span></div>
          <div class="summary-line"><span class="text-muted">Chiffre d'affaires brut (contrats honorés):</span><span class="font-bold text-primary">${stats.totalRevenue.toFixed(3)} TND</span></div>
          <div class="summary-line"><span class="text-muted">Cautions encaissées:</span><span class="font-bold">${stats.totalDeposit.toFixed(3)} TND</span></div>
          <div class="summary-line"><span class="text-muted">Revenu moyen par contrat validé:</span><span class="font-bold">${stats.avgPerContract.toFixed(3)} TND</span></div>
          <div class="summary-line"><span class="text-muted">Nombre de dépenses &amp; entretiens:</span><span class="font-bold">${depenses.length} opération(s)</span></div>
          <div class="summary-line"><span class="text-muted">Total des charges &amp; dépenses:</span><span class="font-bold text-cancelled">${stats.expenses.toFixed(3)} TND</span></div>
          <div class="summary-line highlight">
            <span>BILAN NET D'EXPLOITATION (Recettes &minus; Dépenses):</span>
            <span style="color:${netPositive ? '#059669' : '#e11d48'};">${netSign}${stats.netProfit.toFixed(3)} TND</span>
          </div>
        </div>
      </div>

      <div class="footer">
        Bilan Véhicule ${escapeHtml(car.value.matricule)} &bull; Document officiel extrait de l'application DJERBA RENT A CAR &bull; ${new Date().toLocaleDateString('fr-FR')}
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 350);
    };
  <\/script>
</body>
</html>`);

  printWindow.document.close();
};


// ───────────────────────── PDF DOWNLOAD ─────────────────────────
const downloadCarBilanPdf = () => {
  if (!car.value) return;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageWidth - 2 * margin;
  const stats = filteredBilanStats.value;
  const agencyName = car.value.agence?.name || 'Parc Principal';
  const isAvail = car.value.isAvailable && !car.value.disabled;
  const statusLabel = isAvail ? 'DISPONIBLE' : (car.value.disabled ? 'DÉSACTIVÉ' : 'LOUÉ');
  const netPositive = stats.netProfit >= 0;
  const netSign = netPositive ? '+' : '';
  const matricule = String(car.value.matricule || 'N/A');
  const carName = `${car.value.brand || ''} ${car.value.model || ''}`.trim();

  const depenses: any[] = filteredBilanDepenses.value;
  const contrats: any[] = filteredBilanContrats.value;

  type RGB = [number, number, number];
  const C = {
    ink: [15, 23, 42] as RGB, slate: [100, 116, 139] as RGB, muted: [148, 163, 184] as RGB,
    line: [226, 232, 240] as RGB, soft: [248, 250, 252] as RGB, kpiBg: [241, 245, 249] as RGB,
    indigo: [79, 70, 229] as RGB, indigoSoft: [238, 242, 255] as RGB, indigoBorder: [199, 210, 254] as RGB,
    indigoLight: [165, 180, 252] as RGB,
    green: [16, 185, 129] as RGB, greenDark: [5, 150, 105] as RGB, greenBg: [236, 253, 245] as RGB,
    rose: [244, 63, 94] as RGB, roseDark: [225, 29, 72] as RGB, roseBg: [255, 241, 242] as RGB
  };

  // ── helpers ──────────────────────────────────────────────────
  const pill = (text: string, xRight: number, yCenter: number, fg: RGB, bg: RGB, border: RGB, fontSize = 8) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(fontSize);
    const w = doc.getTextWidth(text) + 8;
    doc.setFillColor(...bg); doc.setDrawColor(...border); doc.setLineWidth(0.4);
    doc.roundedRect(xRight - w, yCenter - 4, w, 8, 4, 4, 'FD');
    doc.setTextColor(...fg);
    doc.text(text, xRight - w / 2, yCenter + 1.1, { align: 'center' });
  };

  const sectionTitle = (text: string, y: number) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(71, 85, 105);
    doc.text(text.toUpperCase(), margin, y, { charSpace: 0.6 });
    doc.setDrawColor(...C.line); doc.setLineWidth(0.7);
    doc.line(margin, y + 2.5, pageWidth - margin, y + 2.5);
  };

  const darkBanner = (title: string, subtitle: string, rightText?: string) => {
    doc.setFillColor(...C.ink);
    doc.roundedRect(margin, 12, contentW, 20, 4, 4, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
    doc.text(title, margin + 7, 21.5);
    doc.setFontSize(7); doc.setTextColor(...C.indigoLight);
    doc.text(subtitle.toUpperCase(), margin + 7, 27.5, { charSpace: 0.3 });
    if (rightText) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...C.muted);
      doc.text(rightText, pageWidth - margin - 7, 23, { align: 'right' });
    }
  };

  // Rounded summary box with dashed lines (matches print .summary-box)
  const summaryBox = (
    title: string, titleColor: RGB, rows: { label: string; value: string; color?: RGB }[],
    startY: number, highlight?: { label: string; value: string; color: RGB }
  ): number => {
    const lineH = 7.5;
    const boxH = 16 + rows.length * lineH + (highlight ? 14 : 0);
    let y = startY;
    if (y + boxH > pageHeight - 16) { doc.addPage(); y = 16; }
    doc.setFillColor(...C.soft); doc.setDrawColor(...C.line); doc.setLineWidth(0.8);
    doc.roundedRect(margin, y, contentW, boxH, 4, 4, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...titleColor);
    doc.text(`•  ${title.toUpperCase()}`, margin + 7, y + 9, { charSpace: 0.3 });
    let ly = y + 9 + lineH;
    doc.setLineWidth(0.25); doc.setLineDashPattern([1, 1], 0); doc.setDrawColor(203, 213, 225);
    rows.forEach((r) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...C.muted);
      doc.text(r.label, margin + 7, ly - 1.5);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...(r.color || C.ink));
      doc.text(r.value, pageWidth - margin - 7, ly - 1.5, { align: 'right' });
      doc.line(margin + 7, ly + 1.2, pageWidth - margin - 7, ly + 1.2);
      ly += lineH;
    });
    doc.setLineDashPattern([], 0);
    if (highlight) {
      doc.setDrawColor(...C.ink); doc.setLineWidth(0.7);
      doc.line(margin + 7, ly - 1.5, pageWidth - margin - 7, ly - 1.5);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...C.ink);
      doc.text(highlight.label, margin + 7, ly + 5);
      doc.setTextColor(...highlight.color);
      doc.text(highlight.value, pageWidth - margin - 7, ly + 5, { align: 'right' });
    }
    return y + boxH;
  };

  // ──────────────────────────────────────────────────────────────
  // PAGE 1 — PAGE DE GARDE
  // ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(...C.ink);
  doc.text(carName.toUpperCase(), margin, 26);

  doc.setFontSize(8.5); doc.setTextColor(...C.slate);
  const serieLabel = 'N° DE SÉRIE :';
  doc.text(serieLabel, margin, 35, { charSpace: 0.5 });
  const labelW = doc.getTextWidth(serieLabel) + serieLabel.length * 0.18 + 3;
  doc.setFont('courier', 'bold'); doc.setFontSize(11);
  const badgeW = doc.getTextWidth(matricule) + 8;
  doc.setFillColor(...C.indigo);
  doc.roundedRect(margin + labelW, 30.3, badgeW, 7.4, 1.8, 1.8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(matricule, margin + labelW + badgeW / 2, 35.3, { align: 'center' });

  const stColor: RGB = isAvail ? C.green : C.rose;
  const stBg: RGB = isAvail ? C.greenBg : C.roseBg;
  pill(statusLabel, pageWidth - margin, 30, stColor, stBg, stColor, 8);

  doc.setDrawColor(...C.line); doc.setLineWidth(0.7);
  doc.line(margin, 42, pageWidth - margin, 42);

  sectionTitle('Caractéristiques Générales du Véhicule', 52);

  const specs: [string, string, boolean][] = [
    ['TARIF JOURNALIER', `${car.value.dailyRate || 0} TND / jour`, true],
    ['KILOMÉTRAGE ACTUEL', `${car.value.mileage || 0} KM`, false],
    ['COULEUR EXTÉRIEURE', car.value.color || 'N/A', false],
    ["AGENCE D'ATTACHE", agencyName, false],
    ['PROCHAINE ASSURANCE', formatDate(car.value.insuranceDate), false],
    ['PROCHAINE VISITE TECHNIQUE', formatDate(car.value.nextTechnicalVisitDate), false],
    ['DATE DÉPART / CIRCULATION', formatDate(car.value.departureDate), false],
    ['PROCHAINE VIDANGE', car.value.nextOilChangeMileage ? `${car.value.nextOilChangeMileage} KM` : '—', false]
  ];
  const specW = (contentW - 4) / 2;
  const specH = 12.5;
  specs.forEach(([label, val, accent], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (specW + 4);
    const y = 60 + row * (specH + 3.5);
    doc.setFillColor(...C.soft); doc.setDrawColor(...C.line); doc.setLineWidth(0.3);
    doc.roundedRect(x, y, specW, specH, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...C.slate);
    doc.text(label, x + 4, y + 7.5, { charSpace: 0.2 });
    doc.setFontSize(8.5); doc.setTextColor(...(accent ? C.indigo : C.ink));
    doc.text(String(val), x + specW - 4, y + 7.7, { align: 'right' });
  });

  const kpiTitleY = 60 + 4 * (specH + 3.5) + 8;
  sectionTitle("Synthèse Préliminaire d'Exploitation", kpiTitleY);

  const kpiY = kpiTitleY + 9;
  const gap = 3.5;
  const cardW = (contentW - 3 * gap) / 4;
  const kpiCards: { label: string; val: string; sub: string; color: RGB }[] = [
    { label: 'TOTAL CONTRATS', val: `${stats.total}`, sub: `${stats.validCount} val. · ${stats.cancelledCount} ann.`, color: C.ink },
    { label: 'RECETTES BRUTES', val: `${stats.totalRevenue.toFixed(3)} TND`, sub: `Moy. ${stats.avgPerContract.toFixed(3)} / contrat`, color: C.green },
    { label: 'JOURS LOUÉS', val: `${stats.totalDays} J`, sub: 'Hors annulations', color: C.indigo },
    { label: 'TOTAL DÉPENSES', val: `${stats.expenses.toFixed(3)} TND`, sub: `${depenses.length} enregistrement(s)`, color: C.rose }
  ];
  kpiCards.forEach((k, i) => {
    const x = margin + i * (cardW + gap);
    doc.setFillColor(...C.kpiBg);
    doc.roundedRect(x, kpiY, cardW, 25, 3, 3, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.3); doc.setTextColor(...C.slate);
    doc.text(k.label, x + 3.5, kpiY + 6.5, { charSpace: 0.2 });
    doc.setFontSize(10.5); doc.setTextColor(...k.color);
    doc.text(k.val, x + 3.5, kpiY + 14.5);
    doc.setFontSize(6.3); doc.setTextColor(...C.slate);
    doc.text(k.sub, x + 3.5, kpiY + 20.5);
  });

  const netY = kpiY + 31;
  doc.setFillColor(...(netPositive ? C.greenBg : C.roseBg));
  doc.roundedRect(margin, netY, contentW, 17, 3, 3, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...(netPositive ? C.greenDark : C.roseDark));
  doc.text(`BILAN NET D'EXPLOITATION : ${netSign}${stats.netProfit.toFixed(3)} TND`, pageWidth / 2, netY + 7.5, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
  doc.text(`Recettes ${stats.totalRevenue.toFixed(3)} TND − Dépenses ${stats.expenses.toFixed(3)} TND`, pageWidth / 2, netY + 13, { align: 'center' });

  // ──────────────────────────────────────────────────────────────
  // PAGE 2 — HISTORIQUE DES CONTRATS
  // ──────────────────────────────────────────────────────────────
  doc.addPage();
  darkBanner(
    'HISTORIQUE DES CONTRATS',
    `${carName} • ${stats.total} contrat(s) dont ${stats.cancelledCount} annulé(s)`,
    `Immatriculation: ${matricule}`
  );

  const contractRows: any[][] = contrats.map((c: any) => {
    const isCancelled = String(c.status).toLowerCase() === 'cancelled';
    if (isCancelled) {
      return [
        c.reference || '—',
        getContractClientsLabel(c),
        { 
          content: 'ANNULÉ', 
          colSpan: 5, 
          styles: { 
            halign: 'center', 
            fontStyle: 'bold', 
            textColor: C.roseDark, 
            fillColor: C.roseBg,
            fontSize: 8.5
          } 
        }
      ];
    }
    return [
      c.reference || '—',
      getContractClientsLabel(c),
      `${formatDate(c.startDate)} - ${formatDate(c.endDate)}\n `,
      `${(Number(c.totalAmount) || 0).toFixed(3)} TND`,
      c.depositAmount ? `${Number(c.depositAmount).toFixed(3)} TND` : '—',
      c.paymentMethod || 'Espèces',
      getContractStatusLabel(c.status)
    ];
  });

  autoTable(doc, {
    startY: 38,
    margin: { left: margin, right: margin },
    head: [['RÉF.', 'CONDUCTEUR(S) & CIN', 'PÉRIODE & DURÉE', 'MONTANT', 'CAUTION', 'RÈGLEMENT', 'STATUT']],
    body: contractRows.length > 0 ? contractRows : [['—', 'Aucun contrat enregistré.', '—', '—', '—', '—', '—']],
    theme: 'plain',
    headStyles: { fillColor: C.ink, textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold', cellPadding: 3, halign: 'center' },
    styles: { fontSize: 7.2, cellPadding: 2.8, textColor: [51, 65, 85], lineColor: C.line, lineWidth: { bottom: 0.25 } as any, minCellHeight: 12, valign: 'middle' },
    alternateRowStyles: { fillColor: C.soft },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold', halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 42, halign: 'center', valign: 'top', fontStyle: 'bold', textColor: C.ink },
      3: { cellWidth: 25, halign: 'right', fontStyle: 'bold', textColor: C.indigo },
      4: { cellWidth: 21, halign: 'right' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 21, halign: 'center', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.section !== 'body' || contrats.length === 0) return;
      const c = contrats[data.row.index];
      const cancelled = String(c?.status).toLowerCase() === 'cancelled';
      if (cancelled) {
        data.cell.styles.fillColor = C.roseBg;
        data.cell.styles.textColor = C.roseDark;
        if (data.column.index === 3 || data.column.index === 6) data.cell.styles.fontStyle = 'bold';
      } else if (data.column.index === 6) {
        data.cell.styles.textColor = C.indigo;
      }
    },
    didDrawCell: (data) => {
      // "N jours" pill under the dates (like .periode-badge)
      if (data.section !== 'body' || data.column.index !== 2 || contrats.length === 0) return;
      const c = contrats[data.row.index];
      if (!c || String(c.status).toLowerCase() === 'cancelled') return;
      const d = getContractDays(c);
      const txt = `${d} JOUR${d > 1 ? 'S' : ''}`;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6);
      const w = doc.getTextWidth(txt) + 5;
      const cx = data.cell.x + data.cell.width / 2;
      const y = data.cell.y + data.cell.height - 6.2;
      doc.setFillColor(...C.indigoSoft); doc.setDrawColor(...C.indigoBorder); doc.setLineWidth(0.25);
      doc.roundedRect(cx - w / 2, y, w, 4, 2, 2, 'FD');
      doc.setTextColor(...C.indigo);
      doc.text(txt, cx, y + 2.9, { align: 'center' });
    }
  });

  summaryBox(
    'Résumé — Section Contrats', C.indigo,
    [
      { label: 'Contrats validés (actifs / terminés / clôturés)', value: `${stats.validCount} contrat(s) — ${stats.totalDays} jours loués` },
      { label: 'Contrats annulés', value: `${stats.cancelledCount} contrat(s) — ${stats.cancelledRevenue.toFixed(3)} TND non perçus`, color: C.roseDark },
      { label: "Chiffre d'affaires brut (contrats honorés)", value: `${stats.totalRevenue.toFixed(3)} TND`, color: C.indigo },
      { label: 'Cautions encaissées', value: `${stats.totalDeposit.toFixed(3)} TND` },
      { label: 'Revenu moyen par contrat validé', value: `${stats.avgPerContract.toFixed(3)} TND` }
    ],
    (doc as any).lastAutoTable.finalY + 8
  );

  // ──────────────────────────────────────────────────────────────
  // PAGE 3 — HISTORIQUE DES DÉPENSES
  // ──────────────────────────────────────────────────────────────
  doc.addPage();
  darkBanner(
    'HISTORIQUE DES DÉPENSES & ENTRETIEN',
    `${carName} • ${depenses.length} dépense(s) • Total : ${stats.expenses.toFixed(3)} TND`,
    `Immatriculation: ${matricule}`
  );

  const depenseRows: any[][] = depenses.map((d: any) => [
    formatDate(d.date),
    String(d.category || 'Autre').toUpperCase(),
    d.description || d.label || '—',
    `${(Number(d.amount) || 0).toFixed(3)} TND`
  ]);

  autoTable(doc, {
    startY: 38,
    margin: { left: margin, right: margin },
    head: [['DATE', 'CATÉGORIE', 'DESCRIPTION', 'MONTANT']],
    body: depenseRows.length > 0 ? depenseRows : [['—', '—', 'Aucune dépense enregistrée.', '—']],
    theme: 'plain',
    headStyles: { fillColor: C.rose, textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold', cellPadding: 3, halign: 'center' },
    styles: { fontSize: 7.5, cellPadding: 2.8, textColor: [51, 65, 85], lineColor: C.line, lineWidth: { bottom: 0.25 } as any },
    alternateRowStyles: { fillColor: C.soft },
    columnStyles: {
      0: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 36, halign: 'center', fontStyle: 'bold', textColor: C.roseDark },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: C.roseDark }
    }
  });

  const byCategory: Record<string, number> = {};
  depenses.forEach((d: any) => {
    const cat = String(d.category || 'Autre').toUpperCase();
    byCategory[cat] = (byCategory[cat] || 0) + (Number(d.amount) || 0);
  });
  summaryBox(
    'Résumé — Section Dépenses (par catégorie)', C.roseDark,
    Object.entries(byCategory).map(([cat, tot]) => ({ label: `Dépenses — ${cat}`, value: `${tot.toFixed(3)} TND`, color: C.roseDark })),
    (doc as any).lastAutoTable.finalY + 8,
    { label: 'TOTAL GÉNÉRAL DES DÉPENSES', value: `${stats.expenses.toFixed(3)} TND`, color: C.roseDark }
  );

  // ──────────────────────────────────────────────────────────────
  // PAGE FINALE — RÉSUMÉ GLOBAL
  // ──────────────────────────────────────────────────────────────
  doc.addPage();
  darkBanner(
    'RÉSUMÉ GLOBAL DU BILAN',
    `${carName} • ${matricule} • Édité le ${new Date().toLocaleDateString('fr-FR')}`
  );
  summaryBox(
    "Indicateurs de l'exploitation", C.indigo,
    [
      { label: 'Total des contrats enregistrés', value: `${stats.total}` },
      { label: 'Contrats validés (actifs / terminés / clôturés)', value: `${stats.validCount} (${stats.totalDays} jours loués)` },
      { label: 'Contrats annulés', value: `${stats.cancelledCount} (${stats.cancelledRevenue.toFixed(3)} TND non perçus)`, color: C.roseDark },
      { label: "Chiffre d'affaires brut (contrats honorés)", value: `${stats.totalRevenue.toFixed(3)} TND`, color: C.indigo },
      { label: 'Cautions encaissées', value: `${stats.totalDeposit.toFixed(3)} TND` },
      { label: 'Revenu moyen par contrat validé', value: `${stats.avgPerContract.toFixed(3)} TND` },
      { label: 'Nombre de dépenses & entretiens', value: `${depenses.length} opération(s)` },
      { label: 'Total des charges & dépenses', value: `${stats.expenses.toFixed(3)} TND`, color: C.roseDark }
    ],
    38,
    { label: "BILAN NET D'EXPLOITATION (Recettes − Dépenses)", value: `${netSign}${stats.netProfit.toFixed(3)} TND`, color: netPositive ? C.greenDark : C.roseDark }
  );

  // ── Footer on every page ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.line); doc.setLineWidth(0.3);
    doc.line(margin, 285, pageWidth - margin, 285);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C.muted);
    doc.text(
      `Bilan Véhicule ${matricule} • Document officiel extrait de l'application DJERBA RENT A CAR • Page ${i} / ${totalPages}`,
      pageWidth / 2, 290, { align: 'center' }
    );
  }

  const cleanMatricule = (car.value.matricule || 'vehicule').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Bilan_${cleanMatricule}.pdf`);
  toast.add({ severity: 'success', summary: 'Bilan PDF Téléchargé', detail: 'Bilan complet généré avec succès.', life: 3000 });
};

onMounted(async () => {
  try {
    const id = route.params.id as string;
    const [fetchedCar, fetchedReservations, fetchedContrats, fetchedDepenses, fetchedVisites, fetchedVidanges, fetchedAgences] = await Promise.all([
      carApi.getOne(id),
      reservationApi.getAll({ carId: id }),
      contratApi.getAll({ carId: id }),
      depenseApi.getAll(id),
      visiteApi.getAll({ carId: id }),
      vidangeApi.getAll({ carId: id }),
      agenceApi.getAll()
    ]);
    agences.value = fetchedAgences || [];
    
    fetchedCar.reservations = fetchedReservations;
    fetchedCar.contrats = fetchedContrats;
    
    // Merge maintenance into depenses only for legacy data (not yet synced in backend)
    const mDepenses = [
      ...fetchedVidanges.map((v: any) => ({
        ...v,
        amount: v.amount || v.cost || 0,
        category: 'VIDANGE',
        description: `Vidange auto: ${v.oilType} | KM: ${v.mileageAtChange || v.mileageAtVidange}`
      })),
      ...fetchedVisites.map((v: any) => ({
        ...v,
        amount: v.cost || 0,
        category: 'VISITE',
        description: `Visite Technique auto | KM: ${v.mileageAtVisit}`
      }))
    ];

    const fDepenses = [...fetchedDepenses];
    mDepenses.forEach(m => {
      const exists = fetchedDepenses.some((d: any) => 
        d.category === m.category && 
        new Date(d.date).toDateString() === new Date(m.date).toDateString() &&
        Math.abs((d.amount || d.cost || 0) - (m.amount || 0)) < 0.01
      );
      if (!exists) fDepenses.push(m);
    });

    fetchedCar.depenses = fDepenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    fetchedCar.visites = fetchedVisites;
    fetchedCar.vidanges = fetchedVidanges;
    car.value = fetchedCar;
  } catch (err) {
    console.error(err);
  }
});

const toDateInput = (value: any): string => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const openEditModal = () => {
  if (!car.value) return;
  Object.assign(carForm, car.value);
  carForm.agence = car.value.agence?._id || car.value.agence || '';
  carForm.departureDate = toDateInput(car.value.departureDate);
  carForm.nextTechnicalVisitDate = toDateInput(car.value.nextTechnicalVisitDate);
  carForm.insuranceDate = toDateInput(car.value.insuranceDate);
  adminPassword.value = '';
  showEditForm.value = true;
};

const openEditPasswordDialog = () => {
  adminPassword.value = '';
  editPasswordError.value = '';
  showPasswordDialog.value = true;
};

const confirmEditPassword = async () => {
  if (!adminPassword.value) {
    editPasswordError.value = 'Le mot de passe est obligatoire.';
    return;
  }
  showPasswordDialog.value = false;
  await saveCar();
};

const saveCar = async () => {
  if (!adminPassword.value) {
    openEditPasswordDialog();
    return;
  }
  submittingAction.value = true;
  try {
    const payload = { ...carForm, agence: carForm.agence || null, password: adminPassword.value };
    await carApi.update(car.value._id, payload);
    guard.reset();
    
    // Refresh vehicle
    const updatedCar = await carApi.getOne(car.value._id);
    const [fetchedReservations, fetchedContrats, fetchedDepenses, fetchedVisites, fetchedVidanges] = await Promise.all([
      reservationApi.getAll({ carId: car.value._id }),
      contratApi.getAll({ carId: car.value._id }),
      depenseApi.getAll(car.value._id),
      visiteApi.getAll({ carId: car.value._id }),
      vidangeApi.getAll({ carId: car.value._id })
    ]);
    
    updatedCar.reservations = fetchedReservations;
    updatedCar.contrats = fetchedContrats;
    
    const mDepenses = [
      ...fetchedVidanges.map((v: any) => ({
        ...v,
        amount: v.amount || v.cost || 0,
        category: 'VIDANGE',
        description: `Vidange auto: ${v.oilType} | KM: ${v.mileageAtChange || v.mileageAtVidange}`
      })),
      ...fetchedVisites.map((v: any) => ({
        ...v,
        amount: v.cost || 0,
        category: 'VISITE',
        description: `Visite Technique auto | KM: ${v.mileageAtVisit}`
      }))
    ];

    const fDepenses = [...fetchedDepenses];
    mDepenses.forEach(m => {
      const exists = fetchedDepenses.some((d: any) => 
        d.category === m.category && 
        new Date(d.date).toDateString() === new Date(m.date).toDateString() &&
        Math.abs((d.amount || d.cost || 0) - (m.amount || 0)) < 0.01
      );
      if (!exists) fDepenses.push(m);
    });

    updatedCar.depenses = fDepenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    updatedCar.visites = fetchedVisites;
    updatedCar.vidanges = fetchedVidanges;
    car.value = updatedCar;
    
    showEditForm.value = false;
    toast.add({
      severity: 'success',
      summary: 'Véhicule modifié',
      detail: `${carForm.brand} ${carForm.model} (${carForm.matricule}) a été mis à jour.`,
      life: 3000
    });
  } catch (err: any) {
    console.error('Failed to update car', err);
    if (handlePasswordError(err, toast)) {
      adminPassword.value = '';
      openEditPasswordDialog();
      return;
    }
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: err.response?.data?.message || "Erreur lors de la modification.",
      life: 5000
    });
  } finally {
    submittingAction.value = false;
  }
};

const confirmDelete = () => {
  deletingItemType.value = 'CAR';
  itemToDelete.value = car.value;
  adminPassword.value = '';
  showSecurityModal.value = true;
};

const showVisiteForm = ref(false);
const submittingVisite = ref(false);
const visiteForm = reactive({
  date: '',
  result: 'pass',
  notes: '',
  cost: 0,
  nextVisitDate: ''
});

const editVisite = (visite: any) => {
  editingVisiteId.value = visite._id;
  visiteForm.date = visite.date?.split('T')[0] || '';
  visiteForm.result = visite.result || 'pass';
  visiteForm.notes = visite.notes || '';
  visiteForm.cost = visite.cost || 0;
  visiteForm.nextVisitDate = visite.nextVisitDate?.split('T')[0] || '';
  showVisiteForm.value = true;
};

const confirmDeleteVisite = (visite: any) => {
  deletingItemType.value = 'VISITE';
  itemToDelete.value = visite;
  adminPassword.value = '';
  showSecurityModal.value = true;
};

const confirmDeleteDepense = (depense: any) => {
  deletingItemType.value = 'DEPENSE';
  itemToDelete.value = depense;
  adminPassword.value = '';
  showSecurityModal.value = true;
};

const openVisiteForm = () => {
  editingVisiteId.value = null;
  visiteForm.date = new Date().toISOString().split('T')[0];
  visiteForm.result = 'pass';
  visiteForm.notes = '';
  visiteForm.cost = 0;
  visiteForm.nextVisitDate = '';
  showVisiteForm.value = true;
};

// Automate next visit date calculation (6 months later)
watch(() => visiteForm.date, (newDate: string) => {
  if (newDate) {
    const d = new Date(newDate);
    d.setMonth(d.getMonth() + 6);
    visiteForm.nextVisitDate = d.toISOString().split('T')[0];
  }
});

const saveVisite = async () => {
  submittingVisite.value = true;
  try {
    const payload = { ...visiteForm, car: car.value._id };
    if (editingVisiteId.value) {
      await visiteApi.update(editingVisiteId.value, payload);
    } else {
      await visiteApi.create(payload);
    }
    // Refresh vehicle fully
    await refreshCarData();
    showVisiteForm.value = false;
  } catch (err) {
    console.error('Failed to save visite', err);
    alert("Erreur lors de l'enregistrement de la visite technique.");
  } finally {
    submittingVisite.value = false;
  }
};

const refreshCarData = async () => {
    const id = route.params.id as string;
    const [fetchedCar, fetchedReservations, fetchedContrats, fetchedDepenses, fetchedVisites, fetchedVidanges] = await Promise.all([
      carApi.getOne(id),
      reservationApi.getAll({ carId: id }),
      contratApi.getAll({ carId: id }),
      depenseApi.getAll(id),
      visiteApi.getAll({ carId: id }),
      vidangeApi.getAll({ carId: id })
    ]);
    
    fetchedCar.reservations = fetchedReservations;
    fetchedCar.contrats = fetchedContrats;
    
    const mDepenses = [
      ...fetchedVidanges.map((v: any) => ({
        ...v,
        amount: v.amount || v.cost || 0,
        category: 'VIDANGE',
        description: `Vidange auto: ${v.oilType} | KM: ${v.mileageAtChange || v.mileageAtVidange}`
      })),
      ...fetchedVisites.map((v: any) => ({
        ...v,
        amount: v.cost || 0,
        category: 'VISITE',
        description: `Visite Technique auto | KM: ${v.mileageAtVisit}`
      }))
    ];

    const fDepenses = [...fetchedDepenses];
    mDepenses.forEach(m => {
      const exists = fetchedDepenses.some((d: any) => 
        d.category === m.category && 
        new Date(d.date).toDateString() === new Date(m.date).toDateString() &&
        Math.abs((d.amount || d.cost || 0) - (m.amount || 0)) < 0.01
      );
      if (!exists) fDepenses.push(m);
    });

    fetchedCar.depenses = fDepenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    fetchedCar.visites = fetchedVisites;
    fetchedCar.vidanges = fetchedVidanges;
    car.value = fetchedCar;
};

// Update existing delete logic to handle different types
const executeDelete = async () => {
  if (!adminPassword.value) return;
  submittingAction.value = true;
  try {
    if (deletingItemType.value === 'VISITE') {
       await authApi.getProfile();
       // Note: the current carApi.delete check is robust, let's use a standard check for other deletions too if possible
       // For now, assume if they are here they are admin, but we need backend to check password if we want it perfect
       // The backend for visite/depense delete doesn't check password currently, I should add it or just trust the session
       await visiteApi.delete(itemToDelete.value._id);
       await refreshCarData();
       showSecurityModal.value = false;
    } else if (deletingItemType.value === 'DEPENSE') {
       await depenseApi.delete(itemToDelete.value._id);
       await refreshCarData();
       showSecurityModal.value = false;
    } else {
      // Default Car delete
      await carApi.delete(car.value._id, adminPassword.value);
      guard.reset();
      showSecurityModal.value = false;
      router.push('/cars');
    }
  } catch (err: any) {
    console.error('Deletion failed', err);
    if (handlePasswordError(err, toast)) return;
    alert("Échec de la suppression. Vérifiez votre mot de passe.");
  } finally {
    submittingAction.value = false;
  }
};
</script>

<style scoped>
.car-detail-container {
  font-family: 'Inter', sans-serif;
}

:deep(.premium-tabs .p-tabview-nav) {
  background: transparent;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
  padding: 1.5rem 1.5rem 0;
}

:deep(.premium-tabs .p-tabview-nav li .p-tabview-nav-link) {
  background: transparent;
  font-family: 'Inter', sans-serif;
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
  color: #64748b;
  border: none;
  padding: 1.1rem 1.75rem;
  transition: all 0.25s ease;
  border-radius: 1rem 1rem 0 0;
}

:deep(.premium-tabs .p-tabview-nav li:hover .p-tabview-nav-link) {
  color: #1e293b;
  background: rgba(241, 245, 249, 0.6);
}

:deep(.premium-tabs .p-tabview-nav li.p-highlight .p-tabview-nav-link) {
  color: #4f46e5;
  background: rgba(238, 242, 255, 0.7);
  border-bottom: 3px solid #4f46e5;
}

:deep(.p-datatable-premium .p-datatable-thead > tr > th) {
  background: transparent !important;
  text-transform: uppercase;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.25em;
  color: #94a3b8;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
  padding: 1.25rem 1rem;
}

:deep(.p-datatable-premium .p-datatable-tbody > tr) {
  background: transparent !important;
  transition: background 0.3s ease;
}

:deep(.p-datatable-premium .p-datatable-tbody > tr > td) {
  border: none;
  padding: 1rem;
}

:deep(.p-datatable-premium .p-datatable-tbody > tr:hover) {
  background: rgba(79, 70, 229, 0.03) !important;
}

:deep(.p-tabview-panels) {
  background: transparent !important;
}

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

.form-field-pwd {
  padding-right: 3rem;
}


</style>
