<template>
  <div class="reservation-list-container space-y-10 p-8 max-w-7xl mx-auto">
    <!-- Header & Integrated Action Bar -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
      <div class="space-y-2">
        <h1 class="text-4xl font-black tracking-tight text-slate-900 uppercase italic">Registre des <span class="text-indigo-600">Réservations</span></h1>
        <p class="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] pl-1">Planification &amp; Flux Opérationnel</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <!-- Status filter tabs (icon only, expand on hover) -->
        <div class="group relative h-12 transition-all duration-300 overflow-hidden rounded-2xl bg-slate-100 border-2 border-slate-200/50 hover:border-indigo-300 flex items-center active:scale-95"
          :class="filterOpen ? 'w-72' : 'w-12'"
          @mouseenter="filterOpen = true"
          @mouseleave="filterOpen = false">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Filter class="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors duration-300 group-hover:rotate-[-20deg] group-hover:scale-110" />
            <span v-if="activeTab !== 'all'" class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
          </div>
          <div :class="[filterOpen ? 'opacity-100' : 'opacity-0', 'pl-11 pr-2 flex items-center gap-1 whitespace-nowrap transition-opacity duration-300']">
            <button
              v-for="tab in statusTabs"
              :key="tab.value"
              @click="activeTab = tab.value"
              :class="['px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all', activeTab === tab.value ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600']"
            >{{ tab.label }}</button>
          </div>
        </div>

        <div class="group relative h-12 w-12 transition-all duration-300 overflow-hidden rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-400 flex items-center cursor-text active:scale-95 hover:shadow-xl hover:shadow-indigo-200/50"
          :class="searchOpen ? 'w-80 border-indigo-500' : 'w-12'"
          @mouseenter="searchOpen = true"
          @mouseleave="searchOpen = false"
          @focusin="searchOpen = true"
          @focusout="searchOpen = false">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Search class="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors duration-300" />
          </div>
          <input
            v-model="filters.query"
            placeholder="Client ou Véhicule..."
            :class="[searchOpen ? 'opacity-100' : 'opacity-0', 'h-full w-full pl-10 pr-3 bg-transparent border-0 outline-none text-xs font-bold text-slate-900 placeholder:text-slate-400 transition-opacity duration-300']"
          />
        </div>

        <Button @click="openForm" @mouseenter="addOpen = true" @mouseleave="addOpen = false" class="group relative h-12 w-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-2xl shadow-indigo-200 transition-all duration-300 overflow-hidden flex items-center justify-start active:scale-95 hover:scale-105 hover:-translate-y-0.5 hover:shadow-indigo-400/40">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Plus class="w-4 h-4 stroke-[3] transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
          </div>
          <span :class="[addOpen ? 'opacity-100' : 'opacity-0', 'whitespace-nowrap transition-all duration-300 pl-10 pr-4 uppercase tracking-widest text-[10px]']">Nouvelle</span>
        </Button>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-white/70 border border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
        <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
          <Clock class="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">En Attente</p>
          <p class="text-2xl font-black text-slate-900">{{ pendingCount }}</p>
        </div>
      </div>
      <div class="bg-white/70 border border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
        <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 class="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Confirmées</p>
          <p class="text-2xl font-black text-slate-900">{{ confirmedCount }}</p>
        </div>
      </div>
    </div>

    <!-- Main Table Card -->
    <Card class="border border-slate-200/50 shadow-[0_20px_60px_rgba(15,23,42,0.08)] bg-white/70 backdrop-blur-3xl overflow-hidden rounded-[2.5rem]">
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow class="bg-slate-50/50 border-b border-slate-100">
                <TableHead class="pl-10 py-5 text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">PÉRIODE &amp; DATES</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">LOCATAIRE</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">VÉHICULE PRÉVU</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase text-center">STATUT</TableHead>
                <TableHead v-if="authStore.isAdmin" class="pr-10 text-right text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="res in filteredReservations"
                :key="res._id"
                @click="openDetail(res)"
                class="group border-slate-100 transition-all duration-300 cursor-pointer hover:bg-indigo-50/40 relative"
              >
                <!-- Dates -->
                <TableCell class="pl-10 py-6">
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-2">
                      <Calendar class="w-3.5 h-3.5 text-indigo-600" />
                      <span class="text-[13px] font-black text-slate-900 tabular-nums">{{ formatDate(res.startDate) }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 pl-0.5 opacity-50">
                      <ArrowRight class="w-3 h-3 text-slate-400" />
                      <span class="text-[11px] font-bold text-slate-500 tabular-nums">{{ formatDate(res.endDate) }}</span>
                      <span class="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{{ getDays(res.startDate, res.endDate) }}j</span>
                    </div>
                  </div>
                </TableCell>

                <!-- Client -->
                <TableCell>
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center flex-shrink-0">
                      <span class="text-[11px] font-black text-indigo-700">{{ initials(res) }}</span>
                    </div>
                    <div>
                      <p class="font-black text-slate-900 group-hover:text-indigo-600 transition-colors text-sm uppercase tracking-tight">
                        {{ res.clientName }}
                      </p>
                      <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ res.clientCin }}</p>
                    </div>
                  </div>
                </TableCell>

                <!-- Car -->
                <TableCell>
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <CarIcon class="w-4 h-4 text-slate-500" />
                    </div>
                    <div v-if="res.car">
                      <p class="font-black text-slate-800 uppercase italic text-sm">{{ res.car.brand }} {{ res.car.model }}</p>
                      <p class="text-[10px] font-bold text-slate-400 tabular-nums">{{ res.car.matricule }}</p>
                    </div>
                    <div v-else>
                      <p class="font-black text-slate-500 italic text-sm">Non Assigné</p>
                    </div>
                  </div>
                </TableCell>



                <!-- Status -->
                <TableCell class="text-center">
                  <Badge :class="['text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-2', getStatusBadgeStyle(res.status)]">
                    {{ getStatusLabel(res.status) }}
                  </Badge>
                </TableCell>

                <!-- Actions -->
                <TableCell v-if="authStore.isAdmin" class="pr-10 text-right">
                  <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 duration-300" @click.stop>
                    <Button
                      v-if="authStore.isAdmin && res.status === 'pending' && isToday(res.startDate)"
                      variant="secondary"
                      size="icon"
                      @click.stop="confirmReservation(res._id)"
                      title="Confirmer"
                      class="h-9 w-9 text-emerald-500 hover:text-white hover:bg-emerald-500 rounded-xl transition-all"
                    >
                      <CheckCircle2 class="w-4 h-4 stroke-[2.5]" />
                    </Button>
                    <Button
                      v-if="authStore.isAdmin && res.status === 'confirmed' && !res.contrat"
                      variant="secondary"
                      size="icon"
                      @click.stop="openContractRefDialog(res)"
                      title="Planifier Contrat"
                      class="h-9 w-9 text-indigo-500 hover:text-white hover:bg-indigo-500 rounded-xl transition-all"
                    >
                      <FileText class="w-4 h-4 stroke-[2.5]" />
                    </Button>
                    <Button
                      v-if="authStore.isAdmin"
                      variant="secondary"
                      size="icon"
                      @click.stop="deleteReservation(res._id)"
                      title="Annuler"
                      class="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                    >
                      <Trash2 class="w-4 h-4 stroke-[2.5]" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>

              <TableRow v-if="filteredReservations.length === 0 && !loading">
                <TableCell :colspan="authStore.isAdmin ? 5 : 4" class="h-60 text-center">
                  <div class="flex flex-col items-center gap-4 opacity-30">
                    <CalendarX class="w-16 h-16 stroke-[1]" />
                    <p class="font-black uppercase tracking-[0.3em] text-xs text-slate-500">Aucune réservation trouvée</p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- ===================== DETAIL DIALOG ===================== -->
    <Dialog :open="!!selectedReservation" @update:open="(val) => { if(!val) selectedReservation = null }">
      <DialogContent class="sm:max-w-2xl bg-white border-none shadow-2xl rounded-[2rem] p-0 flex flex-col max-h-[90vh]" hideClose>
        <div v-if="selectedReservation" class="flex flex-col h-full w-full overflow-y-auto rounded-[2rem]">

          <!-- Panel Header -->
          <div class="bg-gradient-to-br from-indigo-600 to-indigo-700 p-8 relative overflow-hidden flex-shrink-0">
            <div class="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
            <div class="absolute right-4 bottom-0 w-24 h-24 bg-indigo-500/30 rounded-full blur-xl"></div>

            <div class="flex items-start justify-between relative z-10">
              <div class="space-y-1">
                <p class="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-200">RÉSERVATION</p>
                <p class="text-[10px] font-bold text-white/60 font-mono">#{{ selectedReservation._id?.slice(-8).toUpperCase() }}</p>
              </div>
              <div class="flex items-center gap-2">
                <Badge :class="['text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border-2', getStatusBadgeStyleLight(selectedReservation.status)]">
                  {{ getStatusLabel(selectedReservation.status) }}
                </Badge>
                <button @click="selectedReservation = null" class="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all ml-2">
                  <X class="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            <!-- Period hero -->
            <div class="mt-6 flex items-center gap-4 relative z-10">
              <div class="text-center">
                <p class="text-3xl font-black text-white tabular-nums">{{ formatDateShort(selectedReservation.startDate) }}</p>
                <p class="text-[10px] font-black text-white/90 uppercase tracking-[0.2em] tabular-nums">{{ formatTime(selectedReservation.startDate) }}</p>
                <p class="text-[9px] font-bold text-indigo-200 uppercase tracking-widest mt-1">Départ</p>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1">
                <div class="h-px bg-white/30 w-full"></div>
                <span class="text-[10px] font-black text-white bg-white/20 px-2 py-0.5 rounded-full">
                  {{ getDays(selectedReservation.startDate, selectedReservation.endDate) }} JOURS
                </span>
                <div class="h-px bg-white/30 w-full"></div>
              </div>
              <div class="text-center">
                <p class="text-3xl font-black text-white tabular-nums">{{ formatDateShort(selectedReservation.endDate) }}</p>
                <p class="text-[10px] font-black text-white/90 uppercase tracking-[0.2em] tabular-nums">{{ formatTime(selectedReservation.endDate) }}</p>
                <p class="text-[9px] font-bold text-indigo-200 uppercase tracking-widest mt-1">Retour</p>
              </div>
            </div>
          </div>

          <!-- Panel Body -->
          <div class="flex-1 p-6 space-y-5">

            <!-- Client Info -->
            <div class="bg-slate-50 rounded-2xl p-5 space-y-3">
              <p class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                <User class="w-3 h-3" /> Locataire
              </p>
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center flex-shrink-0">
                  <span class="text-sm font-black text-indigo-700">{{ initials(selectedReservation) }}</span>
                </div>
                <div>
                  <p class="font-black text-slate-900 text-lg uppercase tracking-tight">
                    {{ (selectedReservation.client || selectedReservation.clients?.[0])?.lastName }} {{ (selectedReservation.client || selectedReservation.clients?.[0])?.firstName }}
                  </p>
                  <div class="flex items-center gap-3 mt-0.5">
                    <span class="text-[10px] font-bold text-slate-500">CIN: {{ (selectedReservation.client || selectedReservation.clients?.[0])?.cin || '—' }}</span>
                    <span class="text-[10px] font-bold text-slate-500">{{ (selectedReservation.client || selectedReservation.clients?.[0])?.phone || '—' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Car Info -->
            <div class="bg-slate-50 rounded-2xl p-5 space-y-3">
              <p class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                <CarIcon class="w-3 h-3" /> Véhicule Prévu
              </p>
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <CarIcon class="w-6 h-6 text-slate-500" />
                </div>
                <div v-if="selectedReservation.car" class="flex-1">
                  <p class="font-black text-slate-900 text-lg uppercase italic">{{ selectedReservation.car.brand }} {{ selectedReservation.car.model }}</p>
                  <div class="flex items-center gap-3 mt-0.5">
                    <span class="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">{{ selectedReservation.car.matricule }}</span>
                    <span class="text-[10px] font-bold text-indigo-600">{{ getEffectiveDailyRate(selectedReservation) || '—' }} TND/jour</span>
                  </div>
                </div>
                <div v-else class="flex-1">
                  <p class="font-black text-slate-500 text-lg uppercase italic">Non Assigné</p>
                  <p class="text-[10px] font-bold text-slate-400 mt-0.5">Veuillez assigner un véhicule pour confirmer</p>
                </div>
                <Button
                  v-if="authStore.isAdmin && selectedReservation.status !== 'cancelled'"
                  variant="ghost"
                  @click="openChangeCarDialog()"
                  class="h-10 px-3 text-indigo-600 hover:bg-indigo-50 font-black rounded-xl uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all flex-shrink-0"
                >
                  <ArrowLeftRight class="w-3.5 h-3.5" />
                  Changer
                </Button>
              </div>
            </div>

            <!-- Pricing Breakdown -->
            <div class="bg-slate-900 rounded-2xl p-5 relative overflow-hidden">
              <div class="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl"></div>
              <p class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 relative z-10">Récapitulatif Financier</p>

              <div class="space-y-3 relative z-10">
                <div class="flex justify-between items-center gap-4">
                  <span class="text-xs font-bold text-slate-400">Tarif journalier</span>
                  <div v-if="editingDailyRate !== null" class="flex items-center gap-2">
                    <input
                      type="number"
                      v-model.number="editingDailyRate"
                      class="w-24 h-8 bg-white/10 border border-white/20 rounded-lg px-2 text-sm font-black text-white text-right tabular-nums outline-none focus:ring-2 focus:ring-indigo-400"
                      @keyup.enter="saveDailyRate"
                      @keyup.escape="editingDailyRate = null"
                      autofocus
                    />
                    <span class="text-xs font-bold text-white/40">TND</span>
                    <button @click="saveDailyRate" class="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-all">
                      <CheckCircle2 class="w-3.5 h-3.5 text-white" />
                    </button>
                    <button @click="editingDailyRate = null" class="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                      <X class="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                  <div v-else class="flex items-center gap-2 cursor-pointer group/rate" @click="startEditDailyRate">
                    <span class="text-sm font-black text-white tabular-nums">{{ getEffectiveDailyRate(selectedReservation) }} TND</span>
                    <Pencil class="w-3 h-3 text-white/30 group-hover/rate:text-indigo-400 transition-colors" />
                  </div>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-xs font-bold text-slate-400">Durée</span>
                  <span class="text-sm font-black text-white tabular-nums">{{ getDays(selectedReservation.startDate, selectedReservation.endDate) }} jours</span>
                </div>
                <div class="h-px bg-white/10"></div>
                <div class="flex justify-between items-center">
                  <span class="text-xs font-black text-white uppercase tracking-widest">TOTAL LOCATION</span>
                  <span class="text-xl font-black text-white tabular-nums">{{ selectedReservation.car ? calcTotal(selectedReservation) : '—' }} <span v-if="selectedReservation.car" class="text-xs font-bold text-white/40">TND</span></span>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div v-if="selectedReservation.notes" class="bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <p class="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500 mb-2 flex items-center gap-2">
                <StickyNote class="w-3 h-3" /> Notes
              </p>
              <p class="text-sm font-bold text-slate-700 italic">{{ selectedReservation.notes }}</p>
            </div>

            <!-- Timestamps -->
            <div class="flex gap-4 text-[10px] text-slate-400 font-bold">
              <span>Créé: {{ formatDate(selectedReservation.createdAt) }}</span>
            </div>
          </div>

          <!-- Panel Footer Actions -->
          <div class="border-t border-slate-100 p-6 space-y-3 flex-shrink-0">
            <!-- Planifier Contrat (confirmed only and if no contract yet) -->
            <Button
              v-if="authStore.isAdmin && selectedReservation.status === 'confirmed' && !selectedReservation.contrat"
              @click="openContractRefDialog(selectedReservation)"
              class="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
              <FileText class="w-4 h-4" />
              Planifier Contrat
            </Button>

            <!-- Confirm (pending only) -->
            <Button
              v-if="selectedReservation.status === 'pending' && authStore.isAdmin"
              @click="selectedReservation.car ? confirmReservation(selectedReservation._id) : openAssignCarDialog()"
              :class="'w-full h-12 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all ' + (selectedReservation.car ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-95' : 'bg-amber-500 hover:bg-amber-600 active:scale-95')"
            >
              <CheckCircle2 v-if="selectedReservation.car" class="w-4 h-4" />
              <CarIcon v-else class="w-4 h-4" />
              {{ selectedReservation.car ? 'Confirmer la Réservation' : 'Assigner Voiture & Confirmer' }}
            </Button>

            <!-- Cancel -->
            <Button
              v-if="authStore.isAdmin"
              variant="ghost"
              @click="deleteReservation(selectedReservation._id)"
              class="w-full h-12 text-rose-500 hover:bg-rose-50 font-black rounded-2xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all"
            >
              <Trash2 class="w-4 h-4" />
              Annuler la Réservation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- ===================== CONTRACT REF DIALOG ===================== -->
    <Dialog v-model:open="showContractRefDialog">
      <DialogContent class="sm:max-w-md bg-white border-none shadow-2xl rounded-[2rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader class="mb-4">
          <DialogTitle class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Numéro du <span class="text-indigo-600">Contrat</span></DialogTitle>
          <p class="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Obligatoire pour planifier le contrat</p>
        </DialogHeader>
        <div class="space-y-4">
          <Input v-model="contractRefInput" placeholder="Ex: CTR-2026-001" class="h-14 bg-slate-50 border-slate-200 text-lg font-black uppercase text-center rounded-2xl" autofocus />
          <div class="flex gap-2">
            <Button variant="ghost" @click="showContractRefDialog = false" class="flex-1 h-12 uppercase text-[10px] tracking-widest font-black text-slate-500 rounded-xl">Annuler</Button>
            <Button @click="proceedToContract" :disabled="!contractRefInput || !contractRefInput.trim()" class="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl uppercase tracking-widest text-xs">Planifier Contrat</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- ===================== ASSIGN CAR DIALOG ===================== -->
    <Dialog v-model:open="showAssignCarDialog">
      <DialogContent class="sm:max-w-lg bg-white border-none shadow-2xl rounded-[2rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader class="mb-4">
          <DialogTitle class="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
            {{ assignCarMode === 'change' ? 'Changer le ' : 'Assigner un ' }}<span class="text-indigo-600">Véhicule</span>
          </DialogTitle>
          <p class="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{{ assignCarMode === 'change' ? 'Sélectionnez le nouveau véhicule disponible' : 'Choisissez le véhicule disponible' }}</p>
        </DialogHeader>
        
        <div v-if="assignCarInput !== 'NEW'" class="space-y-4">
          <select v-model="assignCarInput" class="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-4 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10">
            <option value="" disabled>Sélectionner le véhicule</option>
            <option value="NEW" class="text-indigo-600 font-black">+ Nouveau Véhicule</option>
            <option v-for="car in assignableCarsList" :key="car._id" :value="car._id">
              {{ car.brand }} {{ car.model }} ({{ car.matricule }})
            </option>
          </select>
          <Button v-if="assignCarMode === 'assign'" @click="proceedToAssignAndConfirm" :disabled="!assignCarInput" class="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs mt-2">Valider & Confirmer</Button>
          <Button v-else @click="proceedToChangeCar" :disabled="!assignCarInput || assignCarInput === selectedReservation?.car?._id" class="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl uppercase tracking-widest text-xs mt-2">Changer le Véhicule</Button>
        </div>

        <div v-else class="space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div class="grid grid-cols-2 gap-3">
            <Input v-model="newCarForm.brand" placeholder="Marque (ex: Clio)" class="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold" />
            <Input v-model="newCarForm.model" placeholder="Modèle" class="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold" />
            <Input v-model="newCarForm.matricule" placeholder="Matricule" class="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold" />
            <Input v-model="newCarForm.dailyRate" placeholder="Tarif journalier" type="number" class="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold" />
          </div>
          <div class="flex gap-2 pt-2">
            <Button variant="ghost" @click="assignCarInput = ''" class="flex-1 h-12 uppercase text-[10px] tracking-widest font-black text-slate-500 rounded-xl">Annuler</Button>
            <Button @click="handleQuickAddCar" :loading="isAddingCar" :disabled="!newCarForm.brand || !newCarForm.matricule || !newCarForm.dailyRate" class="flex-1 h-12 bg-indigo-600 text-white uppercase text-[10px] tracking-widest font-black rounded-xl">Sauvegarder & {{ assignCarMode === 'change' ? 'Changer' : 'Assigner' }}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- ===================== NEW RESERVATION FORM DIALOG ===================== -->
    <Dialog v-model:open="showForm">
      <DialogContent class="sm:max-w-xl bg-white border-none shadow-2xl rounded-[2rem] p-0 overflow-hidden flex flex-col max-h-[95vh]">
        <DialogHeader class="p-8 pb-4">
          <DialogTitle class="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Planifier une <span class="text-indigo-600">Réservation</span></DialogTitle>
        </DialogHeader>

        <form @submit.prevent="submitReservation()" class="flex-1 overflow-y-auto no-scrollbar flex flex-col p-8 pt-0">
          <div class="space-y-4">
            <div class="space-y-2">
              <Label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Locataire</Label>
              <select v-model="form.client" required class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all">
                <option value="" disabled>Sélectionner un client</option>
                <option v-for="client in clients" :key="client._id" :value="client._id">
                  {{ client.lastName }} {{ client.firstName }} ({{ client.cin }})
                </option>
              </select>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div class="md:col-span-2 space-y-2">
                <Label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Prise en Charge (Date & Heure)</Label>
                <div class="flex gap-3">
                   <div class="relative flex-[2]">
                     <Calendar class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600 pointer-events-none" />
                     <Input type="date" v-model="form.startDate" required class="h-14 pl-12 bg-slate-50 border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-500/5 transition-all w-full" />
                   </div>
                   <div class="relative flex-1">
                     <Clock class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600 pointer-events-none" />
                     <Input type="time" v-model="form.startTime" required class="h-14 pl-12 bg-slate-50 border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-500/5 transition-all w-full" />
                   </div>
                </div>
              </div>
              <div class="space-y-2">
                <Label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Durée (Jours)</Label>
                <div class="relative">
                   <TrendingUp class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600 pointer-events-none" />
                   <Input type="number" min="1" v-model="form.days" required class="h-14 pl-12 bg-slate-50 border-slate-200 rounded-2xl font-bold focus:ring-4 focus:ring-indigo-500/5 transition-all" />
                </div>
              </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date Retour (Saisie auto)</Label>
                <Input type="date" :value="calculatedEndDate" disabled class="h-12 bg-slate-100 border-slate-200 rounded-xl font-bold italic opacity-60 cursor-not-allowed" />
              </div>
              <div class="space-y-2">
                <Label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Heure de Retour</Label>
                <div class="relative">
                   <Clock class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                   <Input type="time" v-model="form.endTime" disabled class="h-12 pl-12 bg-slate-100 border-slate-200 rounded-xl font-bold italic opacity-60 cursor-not-allowed w-full" />
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <Label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Véhicule (Optionnel)</Label>
              <select v-model="form.car" class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" :disabled="!form.startDate || !form.days">
                <option value="">Non assigné (Véhicule au choix plus tard)</option>
                <option v-for="car in availableCarsList" :key="car._id" :value="car._id">
                  {{ car.brand }} {{ car.model }} ({{ car.matricule }}) — {{ car.dailyRate }} TND/j
                </option>
              </select>
            </div>

            <div v-if="form.car" class="space-y-2">
              <Label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Tarif Journalier (TND)</Label>
              <div class="relative">
                <Input type="number" min="0" v-model.number="form.dailyRate" :placeholder="`Défaut: ${selectedCarDetails?.dailyRate || 0}`" class="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold pr-12" />
                <span class="absolute right-4 top-1/2 -translate-y-1/2 font-black text-[10px] text-slate-400 uppercase">TND</span>
              </div>
            </div>

            <!-- Pricing Preview -->
            <div v-if="form.car && form.days" class="bg-slate-900 rounded-[1.5rem] p-5 shadow-2xl space-y-3 relative overflow-hidden">
              <div class="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl"></div>
              <div class="flex justify-between items-end relative z-10">
                <div class="space-y-1">
                  <p class="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Total Location</p>
                  <p class="text-sm font-black text-white uppercase italic">{{ form.days }} Jours × <span class="text-indigo-400">{{ form.dailyRate > 0 ? form.dailyRate : (selectedCarDetails?.dailyRate || 0) }} TND</span></p>
                </div>
                <div class="text-right">
                  <p class="text-2xl font-black tabular-nums text-white tracking-tighter">{{ totalRentPrice }} <span class="text-xs font-bold text-white/40">TND</span></p>
                </div>
              </div>
            </div>


            <div class="space-y-2">
              <Label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Notes (Optionnelles)</Label>
              <textarea v-model="form.notes" rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-300" placeholder="Heure d'arrivée, spécifications ou cautions..."></textarea>
            </div>
          </div>

          <DialogFooter class="pt-6 border-t border-slate-100">
            <Button type="button" variant="ghost" @click="showForm = false" class="rounded-xl font-bold uppercase tracking-widest text-[10px]">
              Annuler
            </Button>
            <Button type="submit" :disabled="submitting" class="rounded-xl font-black uppercase tracking-widest text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white px-8">
              {{ submitting ? 'Opération...' : 'Confirmer' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Conflict Warning Dialog -->
    <Dialog v-model:open="showConflictDialog">
      <DialogContent class="sm:max-w-[450px] bg-white/95 backdrop-blur-3xl rounded-[2.5rem] border-slate-200 shadow-3xl p-0 overflow-hidden text-slate-900 flex flex-col max-h-[90vh]">
        <DialogHeader class="bg-amber-500 p-8 text-white relative overflow-hidden">
          <div class="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-3xl opacity-50"></div>
          <DialogTitle class="text-2xl font-black uppercase tracking-tighter flex items-center gap-4 relative z-10 italic">
            <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner">
              <AlertTriangle class="w-7 h-7 text-white stroke-[3]" />
            </div>
            Conflit <span class="text-amber-100 italic font-black uppercase tracking-tight">Détecté</span>
          </DialogTitle>
          <DialogDescription class="text-white/80 font-black uppercase text-[9px] tracking-[0.3em] mt-2 ml-16 relative z-10">
            Véhicule déjà occupé sur cette période
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
            <!-- Show Contracts -->
            <div v-for="conflict in pendingConflicts.contracts" :key="conflict._id" class="flex flex-col p-4 bg-white border border-slate-100 rounded-2xl shadow-sm group">
               <div class="flex items-center justify-between mb-3">
                  <Badge class="bg-indigo-50 text-indigo-600 border-indigo-100 text-[8px] font-black px-2 py-0.5 rounded-lg shadow-none uppercase">Contrat Actif</Badge>
                  <span class="text-[10px] font-black text-slate-400 italic uppercase tracking-tighter">{{ conflict.reference }}</span>
               </div>
               <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-indigo-600">
                    <Calendar class="w-4 h-4" />
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
                  <span class="text-[10px] font-black text-slate-400 italic uppercase tracking-tighter" v-if="conflict.client || (conflict.clients && conflict.clients.length > 0)">
                    {{ (conflict.client || conflict.clients[0]).lastName }} {{ (conflict.client || conflict.clients[0]).firstName }}
                  </span>
               </div>
               <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-amber-500">
                    <Calendar class="w-4 h-4" />
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
          <Button variant="ghost" @click="showConflictDialog = false; pendingConfirmId = null" class="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all shadow-none">Annuler</Button>
          <Button @click="pendingConfirmId ? confirmReservation(pendingConfirmId, true) : submitReservation(true)" class="flex-1 h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-amber-500/20 active:scale-95 transition-all">Confirmer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useSocketStore } from '@/stores/socket';
import { clientApi, carApi, reservationApi } from '../api';
import {
  Search, Plus, Calendar, ArrowRight,
  Car as CarIcon, CheckCircle2, Trash2,
  FileText, X, User, StickyNote,
  CalendarX, Clock, TrendingUp, AlertTriangle,
  ArrowLeftRight, Pencil, Filter
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from '@/components/ui/table';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const socketStore = useSocketStore();
let unsubscribeSocket: Function | null = null;

// ─── State ────────────────────────────────────────────────────────────────────
const showForm = ref(false);
const submitting = ref(false);
const loading = ref(true);
const clients = ref<any[]>([]);
const cars = ref<any[]>([]);
const reservations = ref<any[]>([]);
const selectedReservation = ref<any>(null);
const activeTab = ref('all');
const showConflictDialog = ref(false);
const pendingConfirmId = ref<string | null>(null);
const pendingConflicts = ref<{ reservations: any[], contracts: any[] }>({ reservations: [], contracts: [] });

const statusTabs = [
  { label: 'Toutes', value: 'all' },
  { label: 'En Attente', value: 'pending' },
  { label: 'Planifiées', value: 'confirmed' },
];

const form = reactive({
  client: '',
  car: '',
  startDate: new Date().toISOString().split('T')[0],
  startTime: '10:00',
  days: 1,
  endTime: '10:00',
  dailyRate: 0,
  notes: ''
});

const editingDailyRate = ref<number | null>(null);

watch(() => form.startTime, (newVal) => {
  form.endTime = newVal;
});

watch(() => form.car, (newCarId) => {
  if (newCarId) {
    const car = cars.value.find(c => c._id === newCarId);
    if (car && form.dailyRate <= 0) {
      form.dailyRate = car.dailyRate;
    }
  }
});

const filters = reactive({ query: '' });
const filterOpen = ref(false);
const searchOpen = ref(false);
const addOpen = ref(false);

// Dialog states for Quick Actions
const showContractRefDialog = ref(false);
const contractRefInput = ref('');

const showAssignCarDialog = ref(false);
const assignCarInput = ref('');
const assignCarMode = ref<'assign' | 'change'>('assign');
const isAddingCar = ref(false);
const newCarForm = reactive({ brand: '', model: '', matricule: '', dailyRate: 100 });

// ─── Computed ─────────────────────────────────────────────────────────────────
const filteredReservations = computed(() => {
  let list = reservations.value;
  if (activeTab.value !== 'all') {
    list = list.filter(r => r.status === activeTab.value);
  }
  if (filters.query.trim()) {
    const q = filters.query.toLowerCase();
    list = list.filter(r =>
      r.clientName?.toLowerCase().includes(q) ||
      r.clientCin?.toLowerCase().includes(q) ||
      `${r.car?.brand} ${r.car?.model}`.toLowerCase().includes(q) ||
      r.car?.matricule?.toLowerCase().includes(q)
    );
  }
  return list;
});

const pendingCount = computed(() => reservations.value.filter(r => r.status === 'pending').length);
const confirmedCount = computed(() => reservations.value.filter(r => r.status === 'confirmed').length);

const calculatedEndDate = computed(() => {
  if (!form.startDate || !form.days || !form.startTime) return '';
  const date = new Date(`${form.startDate}T${form.startTime}:00`);
  date.setDate(date.getDate() + Number(form.days));
  return date.toISOString().split('T')[0];
});



const selectedCarDetails = computed(() => {
  if (!form.car) return null;
  return cars.value.find(c => c._id === form.car) || null;
});

const totalRentPrice = computed(() => {
  if (!selectedCarDetails.value || !form.days) return 0;
  const rate = form.dailyRate > 0 ? form.dailyRate : selectedCarDetails.value.dailyRate;
  return rate * Number(form.days);
});



const availableCarsList = computed(() => {
  if (!form.startDate || !form.days) return [];
  const reqStart = new Date(form.startDate).getTime();
  const reqEnd = new Date(calculatedEndDate.value).getTime();
  return cars.value.filter(car => {
    const isBooked = reservations.value.some(res => {
      if (res.status === 'cancelled') return false;
      if (res.car?._id !== car._id) return false;
      const resStart = new Date(res.startDate).getTime();
      const resEnd = new Date(res.endDate).getTime();
      return reqStart <= resEnd && reqEnd >= resStart;
    });
    return !isBooked;
  });
});

const assignableCarsList = computed(() => {
  if (!selectedReservation.value) return [];
  const reqStart = new Date(selectedReservation.value.startDate).getTime();
  const reqEnd = new Date(selectedReservation.value.endDate).getTime();
  return cars.value.filter(car => {
    const isBooked = reservations.value.some(res => {
      // don't conflict with itself
      if (res._id === selectedReservation.value?._id) return false;
      if (res.status === 'cancelled') return false;
      if (res.car?._id !== car._id) return false;
      const resStart = new Date(res.startDate).getTime();
      const resEnd = new Date(res.endDate).getTime();
      return reqStart <= resEnd && reqEnd >= resStart;
    });
    return !isBooked;
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getDays = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = e.getTime() - s.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  return days > 0 ? Math.ceil(days) : 0;
};

const formatDate = (date: string): string => {
  if (!date) return '—';
  return new Date(date).toLocaleString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatTime = (date: string): string => {
  if (!date) return '—';
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const formatDateShort = (date: string): string => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const isToday = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const todayStr = new Date().toLocaleDateString('en-CA');
  const startStr = dateStr.split('T')[0];
  return todayStr === startStr;
};

const initials = (res: any): string => {
  if (res.clientName && res.clientName !== '—') {
    const parts = res.clientName.split(' ');
    return parts.map((p: any) => p[0] || '').join('').substring(0, 2).toUpperCase();
  }
  const client = res.clients?.[0] || res.client;
  if (!client) return '?';
  return `${client.lastName?.[0] || ''}${client.firstName?.[0] || ''}`.toUpperCase();
};

const calcTotal = (res: any): number => {
  const days = getDays(res.startDate, res.endDate);
  const rate = (res.dailyRate > 0) ? res.dailyRate : (res.car?.dailyRate || 0);
  return rate * days;
};

const getEffectiveDailyRate = (res: any): number => {
  return (res.dailyRate > 0) ? res.dailyRate : (res.car?.dailyRate || 0);
};

const startEditDailyRate = () => {
  if (!selectedReservation.value) return;
  editingDailyRate.value = getEffectiveDailyRate(selectedReservation.value);
};

const saveDailyRate = async () => {
  if (!selectedReservation.value || editingDailyRate.value === null) return;
  try {
    await reservationApi.update(selectedReservation.value._id, { dailyRate: editingDailyRate.value });
    editingDailyRate.value = null;
    await loadReservations();
    selectedReservation.value = reservations.value.find(r => r._id === selectedReservation.value?._id) || null;
  } catch (err) {
    console.error('Failed to update daily rate', err);
    alert('Erreur lors de la mise à jour du tarif.');
  }
};



const getStatusLabel = (status: string): string => {
  return status === 'confirmed' ? 'Planifiée' : status === 'cancelled' ? 'Annulée' : 'En Attente';
};

const getStatusBadgeStyle = (status: string) => {
  if (status === 'confirmed') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  if (status === 'cancelled') return 'bg-slate-50 text-slate-400 border-slate-200';
  return 'bg-amber-50 text-amber-600 border-amber-100';
};

const getStatusBadgeStyleLight = (status: string) => {
  if (status === 'confirmed') return 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30';
  if (status === 'cancelled') return 'bg-white/10 text-white/60 border-white/20';
  return 'bg-amber-400/20 text-amber-100 border-amber-400/30';
};

// ─── Actions ──────────────────────────────────────────────────────────────────
const loadReservations = async () => {
  loading.value = true;
  try {
    reservations.value = await reservationApi.getAll();
  } catch (err) {
    console.error('Failed to load reservations', err);
  } finally {
    loading.value = false;
  }
};

const openDetail = (res: any) => {
  selectedReservation.value = res;
};

const openForm = async () => {
  form.client = '';
  form.car = '';
  form.startDate = '';
  form.days = 1;
  form.startTime = '10:00';
  form.endTime = '10:00';
  form.dailyRate = 0;
  form.notes = '';

  if (clients.value.length === 0) {
    try {
      const [resClients, resCars] = await Promise.all([clientApi.getAll(), carApi.getAll()]);
      clients.value = resClients;
      cars.value = resCars;
    } catch (err) {
      console.error('Failed to load resources', err);
    }
  }
  showForm.value = true;
};

const submitReservation = async (force = false) => {
  submitting.value = true;
  try {
    const payload = { 
      ...form, 
      startDate: new Date(`${form.startDate}T${form.startTime}:00`).toISOString(),
      endDate: new Date(`${calculatedEndDate.value}T${form.endTime}:00`).toISOString(),
      force: force
    };
    if (!payload.car) {
      delete (payload as any).car;
    }
    if (!payload.dailyRate || payload.dailyRate <= 0) {
      delete (payload as any).dailyRate;
    }
    await reservationApi.create(payload);
    showForm.value = false;
    showConflictDialog.value = false;
    await loadReservations();
  } catch (err: any) {
    if (err.response?.status === 409 && err.response?.data?.message === 'CAR_RESERVED_CONFLICT') {
      pendingConflicts.value = err.response.data.conflicts;
      showConflictDialog.value = true;
    } else {
      console.error('Failed to create reservation', err);
      alert('Erreur lors de la création de la réservation.');
    }
  } finally {
    submitting.value = false;
  }
};

const confirmReservation = async (id: string, force = false) => {
  try {
    await reservationApi.confirm(id, force);
    await loadReservations();
    if (selectedReservation.value?._id === id) {
      selectedReservation.value = reservations.value.find(r => r._id === id) || null;
    }
    showConflictDialog.value = false;
    pendingConfirmId.value = null;
  } catch (err: any) {
    if (err.response?.status === 409 && err.response?.data?.message === 'CAR_RESERVED_CONFLICT') {
      pendingConflicts.value = err.response.data.conflicts;
      pendingConfirmId.value = id;
      showConflictDialog.value = true;
    } else {
      console.error('Failed to confirm reservation', err);
      alert('Erreur lors de la confirmation.');
    }
  }
};

const deleteReservation = async (id: string) => {
  if (!confirm('Souhaitez-vous vraiment annuler cette réservation ?')) return;
  try {
    await reservationApi.delete(id);
    selectedReservation.value = null;
    await loadReservations();
  } catch (err) {
    console.error('Failed to delete reservation', err);
  }
};

const openContractRefDialog = (res: any) => {
  if (!res) return;
  if (res.contrat) {
    alert('Cette réservation a déjà été planifiée avec un contrat.');
    return;
  }
  selectedReservation.value = res;
  if (!res.car) {
    openAssignCarDialog();
    return;
  }
  contractRefInput.value = '';
  showContractRefDialog.value = true;
};

const proceedToContract = () => {
  const numContrat = contractRefInput.value ? contractRefInput.value.trim() : '';
  if (!selectedReservation.value || !numContrat) {
    alert('Le numéro de contrat est obligatoire pour planifier le contrat.');
    return;
  }
  const res = selectedReservation.value;
  router.push({
    name: 'contrat-new',
    query: {
      clientId: (res.clients?.[0]?._id || res.client?._id || res.clients?.[0]),
      carId: (res.car?._id || res.car),
      startDate: res.startDate?.split('T')[0],
      endDate: res.endDate?.split('T')[0],
      startTime: res.startDate ? new Date(res.startDate).toLocaleTimeString('en-GB') : undefined,
      endTime: res.endDate ? new Date(res.endDate).toLocaleTimeString('en-GB') : undefined,
      reservationId: res._id,
      contractNumber: numContrat
    }
  });
  showContractRefDialog.value = false;
};

const openAssignCarDialog = async () => {
  assignCarMode.value = 'assign';
  assignCarInput.value = '';
  if (cars.value.length === 0) {
    cars.value = await carApi.getAll();
  }
  showAssignCarDialog.value = true;
};

const openChangeCarDialog = async () => {
  assignCarMode.value = 'change';
  assignCarInput.value = selectedReservation.value?.car?._id || '';
  if (cars.value.length === 0) {
    cars.value = await carApi.getAll();
  }
  showAssignCarDialog.value = true;
};

const proceedToAssignAndConfirm = async () => {
  if (!selectedReservation.value || !assignCarInput.value) return;
  try {
    await reservationApi.update(selectedReservation.value._id, { car: assignCarInput.value });
    await confirmReservation(selectedReservation.value._id);
    showAssignCarDialog.value = false;
    
    // Automatically proceed to contract form after assigning car if it was triggered from conversion flow
    openContractRefDialog(reservations.value.find(r => r._id === selectedReservation.value?._id));
  } catch (err) {
    console.error('Failed to assign and confirm', err);
    alert('Erreur lors de l\'assignation du véhicule.');
  }
};

const proceedToChangeCar = async () => {
  if (!selectedReservation.value || !assignCarInput.value) return;
  try {
    await reservationApi.update(selectedReservation.value._id, { car: assignCarInput.value });
    showAssignCarDialog.value = false;
    await loadReservations();
    selectedReservation.value = reservations.value.find(r => r._id === selectedReservation.value?._id) || null;
  } catch (err) {
    console.error('Failed to change car', err);
    alert('Erreur lors du changement du véhicule.');
  }
};

const handleQuickAddCar = async () => {
  isAddingCar.value = true;
  try {
    const createdCar = await carApi.create({
      brand: newCarForm.brand,
      model: newCarForm.model,
      matricule: newCarForm.matricule,
      dailyRate: Number(newCarForm.dailyRate),
      isAvailable: true,
      color: 'Gris',
      fuelLevel: 'Full'
    });
    // refresh list
    cars.value = await carApi.getAll();
    assignCarInput.value = createdCar._id;
  } catch (err) {
    console.error('Failed to quick add car', err);
    alert('Erreur: Vérifiez si la matricule existe déjà.');
  } finally {
    isAddingCar.value = false;
  }
};

onMounted(async () => {
  await loadReservations();
  unsubscribeSocket = socketStore.onEvent('reservation:change', () => {
    loadReservations();
  });
  
  if (route.query.id) {
    const res = reservations.value.find(r => r._id === (route.query.id as string));
    if (res) {
      selectedReservation.value = res;
    }
  }

  // Handle automatic reservation flow from Dashboard
  if (route.query.auto === 'true' || route.query.add === 'true') {
    await openForm();
    if (route.query.startDate) {
      const dt = new Date(route.query.startDate as string);
      form.startDate = dt.toISOString().split('T')[0];
      form.startTime = dt.toTimeString().slice(0, 5);
    }
    if (route.query.endDate && route.query.startDate) {
      const start = new Date(route.query.startDate as string);
      const end = new Date(route.query.endDate as string);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      form.days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    }
    if (route.query.carId) {
      form.car = route.query.carId as string;
    }
  }
});

onUnmounted(() => {
  if (unsubscribeSocket) unsubscribeSocket();
});

watch(() => route.query.id, (newId) => {
  if (newId) {
    const res = reservations.value.find(r => r._id === (newId as string));
    if (res) {
      selectedReservation.value = res;
    }
  } else {
    selectedReservation.value = null;
  }
});
</script>


