<template>
  <div class="availability-container space-y-12 p-8 max-w-7xl mx-auto">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-2">
        <h1 class="text-4xl font-black tracking-tight text-slate-900 uppercase">
          Planificateur <span class="text-indigo-600">Disponibilité</span>
        </h1>
        <p class="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] pl-1">Recherche temps réel & Réservation instantanée</p>
      </div>

      <div v-if="reservationStep > 0" class="flex gap-2">
        <Button variant="outline" size="sm" @click="reservationStep = 0" class="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 bg-white shadow-sm hover:bg-slate-50 transition-all">
          <ChevronLeft class="w-4 h-4" /> Retour à la Recherche
        </Button>
      </div>
    </div>

    <!-- Main Workflow Card -->
    <Card class="border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
      <CardContent class="p-8">
        <!-- Step 0: Search & Selection -->
        <div v-if="reservationStep === 0" class="space-y-10 animate-in fade-in slide-in-from-top-2 duration-500">
          <!-- Search Form -->
          <div class="flex flex-wrap items-end gap-4 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
            <div class="space-y-2 flex-1 min-w-[280px]">
              <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Date de Départ</label>
              <div class="flex gap-2">
                <Input type="date" v-model="availabilitySearch.startDate" class="h-12 rounded-xl border-slate-200 bg-white flex-1" />
                <Input type="time" v-model="availabilitySearch.startTime" class="h-12 rounded-xl w-28 border-slate-200 bg-white" />
              </div>
            </div>
            <div class="space-y-2 flex-1 min-w-[140px]">
              <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Durée (Jours)</label>
              <Input type="number" v-model="availabilitySearch.days" min="1" class="h-12 rounded-xl border-slate-200 font-bold bg-white" />
            </div>
            <div class="space-y-2 flex-1 min-w-[280px]">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Retour (Heure Verrouillée)</label>
              <div class="flex gap-2">
                <Input type="date" v-model="availabilitySearch.endDate" disabled class="h-12 rounded-xl bg-slate-100/50 border-slate-100 italic text-slate-400 flex-1" />
                <Input type="time" v-model="availabilitySearch.endTime" disabled class="h-12 rounded-xl w-28 bg-slate-100/50 border-slate-100 text-slate-400 font-medium" />
              </div>
            </div>
            <div class="flex items-center justify-center h-12">
              <Loader2 v-if="searching" class="w-6 h-6 text-indigo-600 animate-spin" />
              <div v-else class="flex flex-col items-center">
                <span class="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Mise à jour en direct</span>
                <div class="flex gap-1 mt-1">
                  <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-75"></div>
                  <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse delay-150"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Results Area -->
          <div v-if="searched" class="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <!-- Car Grid -->
            <div class="space-y-6">
              <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                    Véhicules Disponibles 
                    <Badge variant="outline" class="h-5 px-2 rounded-lg border-indigo-100 text-indigo-600">{{ filteredAvailableCars.length }}</Badge>
                  </h3>
                </div>
                <!-- Car Search Bar -->
                <div class="relative group">
                  <Input v-model="carQuery" placeholder="Rechercher un modèle ou matricule..." class="h-12 bg-white border-slate-100 rounded-xl font-bold pl-11 focus:ring-4 focus:ring-indigo-600/5 transition-all shadow-sm" />
                  <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-400 transition-colors" />
                </div>
              </div>

              <div class="flex flex-col gap-4 max-h-[600px] overflow-y-auto no-scrollbar pr-2 py-1">
                <div 
                  v-for="car in filteredAvailableCars" 
                  :key="car._id"
                  @click="selectedCar = car"
                  :class="[
                    'group p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex items-center gap-5 relative overflow-hidden',
                    selectedCar?._id === car._id ? 'border-indigo-600 bg-indigo-50/50 shadow-xl shadow-indigo-100' : 'border-slate-50 bg-white hover:border-indigo-100 hover:shadow-lg'
                  ]"
                >
                  <div class="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 group-hover:scale-105 transition-transform flex items-center justify-center p-1">
                    <img v-if="car.images?.[0]" :src="getImageUrl(car.images[0])" class="w-full h-full object-cover rounded-xl" />
                    <CarIcon v-else class="w-10 h-10 text-slate-200" />
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <h4 class="font-black text-slate-900 uppercase text-sm italic truncate">{{ car.brand }} {{ car.model }}</h4>
                    <div class="flex items-center gap-3 mt-1">
                      <span class="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{{ car.matricule }}</span>
                      <span class="w-1 h-1 rounded-full bg-slate-200"></span>
                      <span class="text-[10px] font-bold text-slate-400 uppercase">{{ car.fuelType || 'ESSENCE' }}</span>
                    </div>
                  </div>

                  <div class="flex flex-col items-end gap-1 shrink-0">
                    <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Prix/Jour</span>
                    <div class="flex items-baseline gap-1">
                      <span class="text-xl font-black text-slate-900 italic tabular-nums">{{ car.dailyRate || car.dailyPrice }}</span>
                      <span class="text-[9px] font-black text-slate-400 uppercase">TND</span>
                    </div>
                  </div>

                  <div v-if="selectedCar?._id === car._id" class="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600"></div>
                </div>
              </div>
            </div>

            <!-- Selection Details -->
            <div class="space-y-8 lg:border-l lg:pl-10 border-slate-100">
              <div v-if="selectedCar" class="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                <div class="flex items-center gap-6">
                  <div class="w-24 h-24 rounded-3xl bg-indigo-50 flex items-center justify-center p-2 border border-indigo-100 shadow-inner">
                    <img v-if="selectedCar.images?.[0]" :src="getImageUrl(selectedCar.images[0])" class="w-full h-full object-contain" />
                    <CarIcon v-else class="w-10 h-10 text-indigo-200" />
                  </div>
                  <div>
                    <h3 class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{{ selectedCar.brand }} {{ selectedCar.model }}</h3>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Spécifications du Véhicule</p>
                    <div class="flex gap-2 mt-4">
                      <Badge variant="outline" class="rounded-lg uppercase text-[8px] font-black border-slate-200 text-slate-400">{{ selectedCar.fuelType || 'Essence' }}</Badge>
                      <Badge variant="outline" class="rounded-lg uppercase text-[8px] font-black border-slate-200 text-slate-400">{{ selectedCar.transmission || 'Manuelle' }}</Badge>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Prix Journalier (Ajustable)</label>
                    <div class="relative group">
                      <Input type="number" v-model.number="overriddenDailyPrice" class="h-14 bg-white rounded-xl border-slate-200 font-black text-xl pl-12 text-indigo-600 shadow-sm transition-all focus:ring-4 focus:ring-indigo-600/5" />
                      <DollarSign class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300 group-hover:text-indigo-500" />
                      <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">TND</span>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Séjour ({{ availabilitySearch.days }}j)</label>
                    <div class="h-14 bg-indigo-600 rounded-xl flex items-center justify-center border border-indigo-500 shadow-lg shadow-indigo-100/50">
                      <span class="text-xl font-black text-white tabular-nums italic">{{ (overriddenDailyPrice * availabilitySearch.days).toLocaleString() }} <span class="text-xs not-italic text-indigo-200 ml-1">TND</span></span>
                    </div>
                  </div>

                  <!-- Multi-Currency Display -->
                  <div class="col-span-2 space-y-3">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Équivalents Devises</label>
                    <div class="grid grid-cols-3 gap-3">
                      <div v-for="res in convertedValues" :key="res.label" class="p-3 bg-white border border-slate-100 rounded-2xl flex flex-col items-center justify-center shadow-sm">
                        <span class="text-[8px] text-slate-400 font-black uppercase tracking-widest">{{ res.label }}</span>
                        <span class="text-xs font-black text-slate-700 tabular-nums">{{ res.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} {{ res.symbol }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button @click="reservationStep = 1" class="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-100 group gap-3">
                  Assigner le Client <ArrowRight class="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Button>
              </div>
              <div v-else class="h-full flex flex-col items-center justify-center text-center p-10 opacity-30">
                <CarIcon class="w-20 h-20 text-slate-300 mb-6 stroke-1" />
                <p class="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Aucun Véhicule Sélectionné</p>
                <p class="text-[9px] font-bold text-slate-400 uppercase italic mt-2">Choisissez une voiture dans la liste à gauche</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 1: Client Assignment -->
        <div v-else class="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <!-- Client Search & List -->
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <div class="space-y-1">
                  <h3 class="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">Sélection des Clients</h3>
                  <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Maximum 2 conducteurs autorisés</p>
                </div>
                <Button @click="isAddingNewClient = true" variant="outline" class="h-10 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2 hover:bg-indigo-50 hover:text-indigo-600 border-slate-200">
                  <UserPlus class="w-4 h-4" /> Nouveau Client
                </Button>
              </div>

              <div class="relative">
                <Input v-model="clientQuery" placeholder="Rechercher par Nom, Prénom ou CIN..." class="h-14 bg-slate-50 border-slate-100 rounded-2xl font-bold pl-12 pr-10 focus:ring-4 focus:ring-indigo-600/5 transition-all" />
                <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <Loader2 v-if="searchingClients" class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 animate-spin" />
              </div>

              <div class="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                <div 
                  v-for="client in clientResults" 
                  :key="client._id"
                  @click="toggleClientSelection(client)"
                  :class="[
                    'p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden',
                    selectedClients.some(c => c._id === client._id) ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-50 bg-white hover:border-indigo-100 shadow-sm'
                  ]"
                >
                  <div class="flex items-center gap-4">
                    <div :class="['w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors', selectedClients.some(c => c._id === client._id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600']">
                      {{ client.firstName?.[0] }}{{ client.lastName?.[0] }}
                    </div>
                    <div class="flex flex-col">
                      <span class="text-sm font-black text-slate-900 uppercase italic tracking-tight">{{ client.firstName }} {{ client.lastName }}</span>
                      <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest tabular-nums">{{ client.cin }}</span>
                    </div>
                  </div>
                  <CheckCircle2 v-if="selectedClients.some(c => c._id === client._id)" class="w-5 h-5 text-indigo-600" />
                </div>
              </div>
            </div>

            <!-- Summary & Confirmation -->
            <div class="space-y-8 lg:border-l lg:pl-10 border-slate-100">
              <div class="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-8 shadow-2xl relative overflow-hidden group">
                <div class="absolute -right-10 -top-10 opacity-10 scale-150 rotate-12 transition-transform group-hover:scale-[1.7]">
                  <Zap class="w-32 h-32 text-indigo-400" />
                </div>

                <div class="space-y-6 relative z-10">
                  <div class="space-y-1">
                    <p class="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">Résumé du Dossier</p>
                    <h4 class="text-xl font-black italic uppercase tracking-tighter">{{ selectedCar?.brand }} {{ selectedCar?.model }}</h4>
                  </div>

                  <div class="flex flex-col gap-3">
                    <div class="flex justify-between items-center text-slate-400">
                      <span class="text-[10px] font-black uppercase tracking-widest">Période</span>
                      <span class="text-xs font-bold text-white tabular-nums italic">{{ availabilitySearch.days }} Jours</span>
                    </div>
                    <div class="flex justify-between items-center text-slate-400">
                      <span class="text-[10px] font-black uppercase tracking-widest">Conducteurs</span>
                      <span class="text-xs font-bold text-white tabular-nums italic">{{ selectedClients.length }} Sélectionné(s)</span>
                    </div>

                    <!-- Selected Candidates List -->
                    <div v-if="selectedClients.length > 0" class="space-y-2 mt-4 pt-4 border-t border-slate-800">
                      <p class="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Détails des Conducteurs</p>
                      <div class="space-y-2">
                        <div v-for="client in selectedClients" :key="client._id" class="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 group">
                          <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-[10px] font-black uppercase">
                              {{ client.firstName?.[0] }}{{ client.lastName?.[0] }}
                            </div>
                            <div class="flex flex-col">
                              <span class="text-[10px] font-black uppercase italic">{{ client.firstName }} {{ client.lastName }}</span>
                              <span class="text-[8px] text-slate-500 tabular-nums uppercase">{{ client.cin }}</span>
                            </div>
                          </div>
                          <button @click="toggleClientSelection(client)" class="p-2 text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100">
                            <X class="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div class="h-px bg-slate-800 w-full my-2" />
                    <div class="flex justify-between items-end">
                      <span class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Total Net</span>
                      <span class="text-4xl font-black text-white tabular-nums italic tracking-tighter">{{ (overriddenDailyPrice * availabilitySearch.days).toLocaleString() }} <span class="text-sm not-italic opacity-40 ml-1">TND</span></span>
                    </div>
                  </div>



                  <Button @click="confirmFinalReservation()" :disabled="creatingReservation || selectedClients.length === 0" class="w-full h-20 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-900/50 group gap-4 text-sm mt-4">
                    <Loader2 v-if="creatingReservation" class="w-5 h-5 animate-spin" />
                    <CheckCircle2 v-else class="w-5 h-5 group-hover:scale-110 transition-transform" />
                    {{ creatingReservation ? 'Finalisation...' : 'Valider la Réservation' }}
                  </Button>
                </div>
              </div>

              <!-- New Client Dialog -->
              <Dialog v-model:open="isAddingNewClient">
                <DialogContent class="sm:max-w-2xl bg-white border-none shadow-2xl rounded-[2.5rem] p-10">
                  <DialogHeader>
                    <DialogTitle class="text-3xl font-black text-slate-900 uppercase tracking-tight">Nouveau <span class="text-indigo-600 italic">Profil</span></DialogTitle>
                    <DialogDescription class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Enregistrement d'un nouveau conducteur</DialogDescription>
                  </DialogHeader>

                  <div class="grid grid-cols-2 gap-6 mt-6">
                    <div class="space-y-2">
                      <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom</label>
                      <Input v-model="newClientForm.lastName" class="h-12 bg-slate-50 border-slate-100 rounded-xl" />
                    </div>
                    <div class="space-y-2">
                      <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prénom</label>
                      <Input v-model="newClientForm.firstName" class="h-12 bg-slate-50 border-slate-100 rounded-xl" />
                    </div>
                    <div class="space-y-2">
                      <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Téléphone</label>
                      <Input v-model="newClientForm.phone" class="h-12 bg-slate-50 border-slate-100 rounded-xl" />
                    </div>
                    <div class="space-y-2">
                      <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">CIN</label>
                      <Input v-model="newClientForm.cin" class="h-12 bg-slate-50 border-slate-100 rounded-xl" />
                    </div>
                    <div class="space-y-2">
                      <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">N° Permis</label>
                      <Input v-model="newClientForm.drivingLicense" class="h-12 bg-slate-50 border-slate-100 rounded-xl" />
                    </div>
                    <div class="space-y-2">
                      <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Date de Naissance</label>
                      <Input type="date" v-model="newClientForm.birthday" class="h-12 bg-slate-50 border-slate-100 rounded-xl" />
                    </div>
                    <div class="space-y-2 col-span-2">
                      <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Adresse</label>
                      <Input v-model="newClientForm.address" class="h-12 bg-slate-50 border-slate-100 rounded-xl" />
                    </div>
                  </div>

                  <div class="mt-8">
                    <Button @click="createNewClient" class="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100">
                      Enregistrer & Sélectionner
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <!-- Conflict Confirmation Dialog -->
              <Dialog v-model:open="showConflictDialog">
                <DialogContent class="sm:max-w-md bg-white border-none shadow-2xl rounded-[2rem] p-8">
                  <DialogHeader>
                    <DialogTitle class="text-2xl font-black text-rose-600 uppercase flex items-center gap-3">
                      <AlertCircle class="w-8 h-8" />
                      Conflit Détecté
                    </DialogTitle>
                    <DialogDescription class="text-slate-500 font-medium mt-2">
                      Ce véhicule est déjà occupé pour cette période :
                    </DialogDescription>
                  </DialogHeader>

                  <!-- Conflict Details -->
                  <div v-if="conflictsData" class="mt-4 space-y-3">
                    <div v-for="res in conflictsData.reservations" :key="res._id" class="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3">
                      <Calendar class="w-4 h-4 text-rose-500" />
                      <div class="flex-1">
                        <p class="text-[10px] font-black uppercase text-rose-900">Réservation par {{ res.clientName || 'Client' }}</p>
                        <p class="text-[8px] font-bold text-rose-400 uppercase">{{ new Date(res.startDate).toLocaleDateString() }} → {{ new Date(res.endDate).toLocaleDateString() }}</p>
                      </div>
                    </div>
                    <div v-for="ctr in conflictsData.contracts" :key="ctr._id" class="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3">
                      <FileText class="w-4 h-4 text-rose-500" />
                      <div class="flex-1">
                        <p class="text-[10px] font-black uppercase text-rose-900">Contrat N° {{ ctr.contractNumber || ctr._id.slice(-6) }}</p>
                        <p class="text-[8px] font-bold text-rose-400 uppercase">{{ new Date(ctr.startDate).toLocaleDateString() }} → {{ new Date(ctr.endDate).toLocaleDateString() }}</p>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col gap-3 mt-6">
                    <Button @click="confirmFinalReservation(true)" class="w-full h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-100">
                      Oui, Mettre en Attente & Forcer
                    </Button>
                    <Button variant="outline" @click="showConflictDialog = false" class="w-full h-12 rounded-xl font-bold text-slate-500">
                      Annuler
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { reservationApi, carApi, contratApi, clientApi, getImageUrl } from '@/api'
import { useToast } from 'primevue/usetoast'
import { 
  Car as CarIcon, Calendar, 
  Zap, CheckCircle2, DollarSign, Calculator, X,
  Search, Loader2, ArrowRight, UserPlus, ChevronLeft
} from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

const reservationStep = ref(0)
const searching = ref(false)
const searched = ref(false)
const creatingReservation = ref(false)
const showConflictDialog = ref(false)
const conflictsData = ref<any>(null)
const availableCars = ref<any[]>([])
const selectedCar = ref<any>(null)
const overriddenDailyPrice = ref(0)
const carQuery = ref('')

const clientQuery = ref('')
const clientResults = ref<any[]>([])
const selectedClients = ref<any[]>([])
const searchingClients = ref(false)
const isAddingNewClient = ref(false)

const newClientForm = reactive({
  firstName: '',
  lastName: '',
  phone: '',
  cin: '',
  drivingLicense: '',
  birthday: '',
  address: ''
})

const availabilitySearch = reactive({
  startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  startTime: '08:00',
  endDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
  endTime: '08:00',
  days: 1
})

const filteredAvailableCars = computed(() => {
  if (!carQuery.value) return availableCars.value
  const q = carQuery.value.toLowerCase()
  return availableCars.value.filter(car => 
    car.brand?.toLowerCase().includes(q) || 
    car.model?.toLowerCase().includes(q) || 
    car.matricule?.toLowerCase().includes(q)
  )
})

const rates = ref({ EUR: 0.296, USD: 0.342 })

const searchAvailability = async () => {
  searching.value = true
  searched.value = true
  // Preserve selection if possible
  const previousId = selectedCar.value?._id

  try {
    const startIso = `${availabilitySearch.startDate}T${availabilitySearch.startTime}:00`
    const endIso = `${availabilitySearch.endDate}T${availabilitySearch.endTime}:00`
    const searchStart = new Date(startIso)
    const searchEnd = new Date(endIso)
    
    const [allCars, allRes, allContrats] = await Promise.all([
      carApi.getAll(),
      reservationApi.getAll(),
      contratApi.getAll()
    ])

    const occupations = [
      ...allRes.map((r: any) => ({ ...r, type: 'reservation' })),
      ...allContrats.map((c: any) => ({ ...c, type: 'contract' }))
    ].filter((occ: any) => occ.status !== 'cancelled' && occ.status !== 'closed')

    const processedCars = allCars.map((car: any) => {
      const carOccupations = occupations.filter((occ: any) => 
        (occ.car?._id === car._id) || (occ.car === car._id)
      )
      const overlapping = carOccupations.filter(occ => {
        const occStart = new Date(occ.startDate)
        const occEnd = new Date(occ.endDate)
        return occStart < searchEnd && occEnd > searchStart
      })
      const returnsTomorrow = carOccupations.find(occ => {
        const occEnd = new Date(occ.endDate)
        const tomorrow = new Date(searchStart)
        tomorrow.setDate(searchStart.getDate() + 1)
        return occEnd.toDateString() === tomorrow.toDateString()
      })
      const prevOcc = carOccupations.find(occ => {
        const occEnd = new Date(occ.endDate)
        return occEnd.toDateString() === searchStart.toDateString()
      })

      return {
        ...car,
        isStrictlyAvailable: overlapping.length === 0,
        prevOcc,
        returnsTomorrow
      }
    })

    availableCars.value = processedCars.filter((car: any) => 
      car.isStrictlyAvailable
    )

    // Verify if previous selection is still valid
    if (previousId) {
      const stillAvailable = availableCars.value.find(c => c._id === previousId)
      if (!stillAvailable) {
        selectedCar.value = null
      } else {
        // Update selectedCar with fresh data (like bookingConflict status)
        selectedCar.value = stillAvailable
      }
    }
  } catch (err) {
    console.error('Search failed', err)
    toast.add({ severity: 'error', summary: "Erreur", detail: "Impossible d'effectuer la recherche", life: 3000 })
  } finally {
    searching.value = false
  }
}

// Sync endTime with startTime
watch(() => availabilitySearch.startTime, (newVal) => {
  availabilitySearch.endTime = newVal
})

let searchDebounce: any = null
watch([() => availabilitySearch.startDate, () => availabilitySearch.startTime, () => availabilitySearch.days], () => {
  if (!availabilitySearch.startDate || !availabilitySearch.startTime) return
  const start = new Date(`${availabilitySearch.startDate}T${availabilitySearch.startTime}`)
  const end = new Date(start.getTime() + availabilitySearch.days * 24 * 60 * 60 * 1000)
  availabilitySearch.endDate = end.toISOString().split('T')[0]
  
  // Trigger automatic search with debounce
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(searchAvailability, 500)
}, { immediate: true })

watch(selectedCar, (newCar) => {
  if (newCar) {
    overriddenDailyPrice.value = newCar.dailyPrice || newCar.dailyRate || 0
  }
})

const convertedValues = computed(() => {
  const tndPrice = (overriddenDailyPrice.value || 0) * availabilitySearch.days
  return [
    { label: 'TND', value: tndPrice, symbol: 'TND' },
    { label: 'EUR', value: tndPrice * rates.value.EUR, symbol: '€' },
    { label: 'USD', value: tndPrice * rates.value.USD, symbol: '$' }
  ]
})

const toggleClientSelection = (client: any) => {
  const index = selectedClients.value.findIndex(c => c._id === client._id)
  if (index === -1) {
    if (selectedClients.value.length >= 2) {
      toast.add({ severity: 'warn', summary: 'Limite atteinte', detail: 'Maximum 2 clients', life: 3000 })
      return
    }
    selectedClients.value.push(client)
  } else {
    selectedClients.value.splice(index, 1)
  }
}

const fetchInitialClients = async () => {
  searchingClients.value = true
  try {
    const data = await clientApi.getAll({ limit: 10 })
    clientResults.value = data
  } catch (err) {
    console.error('Failed to fetch initial clients', err)
  } finally {
    searchingClients.value = false
  }
}

const searchClients = async () => {
  if (!clientQuery.value || clientQuery.value.length < 2) {
    fetchInitialClients()
    return
  }
  searchingClients.value = true
  try {
    clientResults.value = await clientApi.getAll({ search: clientQuery.value })
  } catch (err) {
    console.error('Client search failed', err)
  } finally {
    searchingClients.value = false
  }
}

let searchTimeout: any = null
watch(clientQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(searchClients, 300)
})

const createNewClient = async () => {
  try {
    const created = await clientApi.create(newClientForm)
    if (selectedClients.value.length < 2) {
      selectedClients.value.push(created)
    } else {
      toast.add({ severity: 'warn', summary: 'Limite Sélection', detail: 'Client créé mais non sélectionné (max 2)', life: 3000 })
    }
    isAddingNewClient.value = false
    Object.assign(newClientForm, { 
      firstName: '', lastName: '', phone: '', cin: '', 
      drivingLicense: '', birthday: '', address: '' 
    })
    toast.add({ severity: 'success', summary: 'Succès', detail: 'Client créé', life: 3000 })
    fetchInitialClients() // Refresh the list to show the new client
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Erreur', detail: 'Échec création client', life: 3000 })
  }
}

const confirmFinalReservation = async (force = false) => {
  creatingReservation.value = true
  showConflictDialog.value = false
  try {
    const startIso = `${availabilitySearch.startDate}T${availabilitySearch.startTime}:00`
    const endIso = `${availabilitySearch.endDate}T${availabilitySearch.endTime}:00`
    
    await reservationApi.create({
      startDate: startIso,
      endDate: endIso,
      car: selectedCar.value._id,
      clients: selectedClients.value.map(c => c._id),
      totalAmount: overriddenDailyPrice.value * availabilitySearch.days,
      force: force
    })
    
    toast.add({ severity: 'success', summary: 'Succès', detail: force ? 'Réservation forcée (autres mises en attente)' : 'Réservation créée', life: 3000 })
    router.push('/reservations')
  } catch (err: any) {
    if (err.response?.status === 409) {
      conflictsData.value = err.response?.data?.conflicts
      showConflictDialog.value = true
      return
    }
    const errorDetail = err.response?.data?.message || 'Échec réservation';
    toast.add({ 
      severity: 'error', 
      summary: 'Erreur', 
      detail: typeof errorDetail === 'object' ? JSON.stringify(errorDetail) : errorDetail, 
      life: 5000 
    })
  } finally {
    creatingReservation.value = false
  }
}

onMounted(async () => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/TND')
    const data = await response.json()
    if (data.result === 'success') {
      rates.value = { EUR: data.rates.EUR, USD: data.rates.USD }
    }
  } catch (e) { console.warn('Rates failed') }
  
  // Initial data fetch
  fetchInitialClients()
  searchAvailability()
})
</script>

<style scoped>
.availability-container {
  font-family: 'Outfit', sans-serif;
}
</style>
