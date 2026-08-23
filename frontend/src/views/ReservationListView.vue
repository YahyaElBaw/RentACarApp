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
    <div class="grid grid-cols-3 gap-4">
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
      <div class="bg-white/70 border border-slate-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
        <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
          <FileText class="w-5 h-5 text-indigo-500" />
        </div>
        <div>
          <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">En Contrat</p>
          <p class="text-2xl font-black text-slate-900">{{ convertedCount }}</p>
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
      <DialogContent class="sm:max-w-2xl bg-white border-border shadow-3xl rounded-[2.5rem] p-0 overflow-hidden max-h-[92vh] flex flex-col" hideClose>
        <div v-if="selectedReservation" class="flex flex-col h-full w-full min-h-0">

          <!-- Panel Header -->
          <div class="px-10 py-8 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white relative overflow-hidden shrink-0">
            <div class="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            <div class="absolute right-16 bottom-0 w-24 h-24 bg-violet-400/20 rounded-full blur-2xl"></div>

            <div class="flex items-start justify-between relative z-10">
              <div class="space-y-1">
                <p class="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-200">Réservation</p>
                <p class="text-[10px] font-bold text-white/60 font-mono">#{{ selectedReservation._id?.slice(-8).toUpperCase() }}</p>
              </div>
              <div class="flex items-center gap-2">
                <Badge :class="['text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border-2 backdrop-blur-sm', getStatusBadgeStyleLight(selectedReservation.status)]">
                  {{ getStatusLabel(selectedReservation.status) }}
                </Badge>
                <button
                  v-if="authStore.isSuperAdmin"
                  @click="openEditReservation(selectedReservation)"
                  title="Modifier la Réservation"
                  class="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all active:scale-90 ml-1"
                >
                  <PenLine class="w-4 h-4 text-white" />
                </button>
                <button @click="selectedReservation = null" class="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all active:scale-90">
                  <X class="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            <!-- Period hero -->
            <div class="mt-7 flex items-center gap-5 relative z-10">
              <div class="text-center">
                <p class="text-3xl font-black text-white tabular-nums tracking-tight">{{ formatDateShort(selectedReservation.startDate) }}</p>
                <p class="text-[10px] font-black text-white/90 uppercase tracking-[0.2em] tabular-nums mt-0.5">{{ formatTime(selectedReservation.startDate) }}</p>
                <p class="text-[8px] font-black text-indigo-200 uppercase tracking-[0.25em] mt-1">Départ</p>
              </div>
              <div class="flex-1 flex flex-col items-center gap-1.5">
                <span class="text-[10px] font-black text-white bg-white/15 border border-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                  {{ getDays(selectedReservation.startDate, selectedReservation.endDate) }} JOURS
                </span>
                <div class="h-px bg-gradient-to-r from-transparent via-white/40 to-transparent w-full"></div>
              </div>
              <div class="text-center">
                <p class="text-3xl font-black text-white tabular-nums tracking-tight">{{ formatDateShort(selectedReservation.endDate) }}</p>
                <p class="text-[10px] font-black text-white/90 uppercase tracking-[0.2em] tabular-nums mt-0.5">{{ formatTime(selectedReservation.endDate) }}</p>
                <p class="text-[8px] font-black text-indigo-200 uppercase tracking-[0.25em] mt-1">Retour</p>
              </div>
            </div>
          </div>

          <!-- Panel Body -->
          <div class="flex-1 overflow-y-auto px-10 py-8 space-y-7 min-h-0">

            <!-- Client Info -->
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <User class="w-3.5 h-3.5 text-slate-400" />
                <span class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Locataire</span>
                <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
                <button
                  v-if="canModifyReservationLinks"
                  @click="openChangeClientsDialog"
                  class="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Pencil class="w-3 h-3" />
                  Modifier
                </button>
              </div>
              <div class="flex items-center gap-4">
                <div class="w-13 h-13 p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200">
                  <span class="text-sm font-black text-white">{{ initials(selectedReservation) }}</span>
                </div>
                <div class="min-w-0">
                  <p class="font-black text-slate-900 text-lg uppercase tracking-tight truncate">
                    {{ (selectedReservation.client || selectedReservation.clients?.[0])?.lastName }} {{ (selectedReservation.client || selectedReservation.clients?.[0])?.firstName }}
                  </p>
                  <div class="flex items-center gap-2.5 mt-1">
                    <span class="text-[10px] font-bold text-slate-500 font-mono">CIN · {{ (selectedReservation.client || selectedReservation.clients?.[0])?.cin || '—' }}</span>
                    <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span class="text-[10px] font-bold text-slate-500 tabular-nums">{{ (selectedReservation.client || selectedReservation.clients?.[0])?.phone || '—' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Car Info -->
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <CarIcon class="w-3.5 h-3.5 text-slate-400" />
                <span class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Véhicule Prévu</span>
                <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
              </div>
              <div class="flex items-center gap-4">
                <div class="w-13 h-13 p-3.5 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <CarIcon class="w-6 h-6 text-slate-400" />
                </div>
                <div v-if="selectedReservation.car" class="flex-1 min-w-0">
                  <p class="font-black text-slate-900 text-lg uppercase italic truncate">{{ selectedReservation.car.brand }} {{ selectedReservation.car.model }}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-[10px] font-bold text-slate-600 font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">{{ selectedReservation.car.matricule }}</span>
                    <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span class="text-[10px] font-black text-indigo-600 tabular-nums">{{ getEffectiveDailyRate(selectedReservation) || '—' }} TND/jour</span>
                  </div>
                </div>
                <div v-else class="flex-1">
                  <p class="font-black text-slate-500 text-lg uppercase italic">Non Assigné</p>
                  <p class="text-[10px] font-bold text-slate-400 mt-0.5">Veuillez assigner un véhicule pour confirmer</p>
                </div>
                <Button
                  v-if="canModifyReservationLinks"
                  variant="ghost"
                  @click="openChangeCarDialog()"
                  class="h-10 px-3 text-indigo-600 hover:bg-indigo-50 font-black rounded-xl uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all flex-shrink-0"
                >
                  <ArrowLeftRight class="w-3.5 h-3.5" />
                  Changer
                </Button>
              </div>
            </div>

            <!-- Status Select (Super Admin only) -->
            <!-- moved to the reservation edit form -->

            <!-- Pricing Breakdown -->
            <div class="bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 rounded-[1.75rem] p-6 relative overflow-hidden shadow-lg shadow-indigo-200/60">
              <div class="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-3xl"></div>
              <div class="absolute right-10 bottom-0 w-20 h-20 bg-violet-400/20 rounded-full blur-2xl"></div>
              <div class="flex items-center gap-3 mb-5 relative z-10">
                <Banknote class="w-3.5 h-3.5 text-indigo-200" />
                <span class="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-100">Récapitulatif Financier</span>
              </div>

              <div class="space-y-3.5 relative z-10">
                <div class="flex justify-between items-center gap-4">
                  <span class="text-xs font-bold text-indigo-200">Tarif journalier</span>
                  <div v-if="editingDailyRate !== null" class="flex items-center gap-2">
                    <input
                      type="number"
                      v-model.number="editingDailyRate"
                      class="w-24 h-8 bg-white/10 border border-white/25 rounded-lg px-2 text-sm font-black text-white text-right tabular-nums outline-none focus:ring-2 focus:ring-white/40 placeholder:text-white/40"
                      @keyup.enter="saveDailyRate"
                      @keyup.escape="editingDailyRate = null"
                      autofocus
                    />
                    <span class="text-xs font-bold text-indigo-200">TND</span>
                    <button @click="saveDailyRate" class="w-7 h-7 rounded-lg bg-emerald-400 hover:bg-emerald-500 flex items-center justify-center transition-all active:scale-90">
                      <CheckCircle2 class="w-3.5 h-3.5 text-white" />
                    </button>
                    <button @click="editingDailyRate = null" class="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all active:scale-90">
                      <X class="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                  <div v-else class="flex items-center gap-2 cursor-pointer group/rate" @click="startEditDailyRate">
                    <span class="text-sm font-black text-white tabular-nums">{{ getEffectiveDailyRate(selectedReservation) }} TND</span>
                    <Pencil v-if="authStore.isAdmin && selectedReservation.status !== 'converted'" class="w-3 h-3 text-white/40 group-hover/rate:text-white transition-colors" />
                  </div>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-xs font-bold text-indigo-200">Durée</span>
                  <span class="text-sm font-black text-white tabular-nums">{{ getDays(selectedReservation.startDate, selectedReservation.endDate) }} jours</span>
                </div>
                <div class="h-px bg-white/20"></div>
                <div class="flex justify-between items-center">
                  <span class="text-xs font-black text-white uppercase tracking-widest">Total Location</span>
                  <span class="text-2xl font-black text-white tabular-nums">{{ selectedReservation.car ? calcTotal(selectedReservation) : '—' }} <span v-if="selectedReservation.car" class="text-xs font-bold text-white/50">TND</span></span>
                </div>
              </div>
            </div>

            <!-- Notes -->
            <div v-if="selectedReservation.notes" class="bg-amber-50/80 border border-amber-100 rounded-2xl p-5">
              <p class="text-[9px] font-black uppercase tracking-[0.25em] text-amber-500 mb-2 flex items-center gap-2">
                <StickyNote class="w-3 h-3" /> Notes
              </p>
              <p class="text-sm font-bold text-slate-700 italic">{{ selectedReservation.notes }}</p>
            </div>

            <!-- Timestamps -->
            <div class="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
              <Clock class="w-3 h-3" />
              <span>Créé le {{ formatDate(selectedReservation.createdAt) }}</span>
            </div>
          </div>

          <!-- Panel Footer Actions -->
          <div class="border-t border-slate-100 px-10 py-5 bg-slate-50/60 flex items-center gap-3 shrink-0">
            <!-- View linked contract -->
            <Button
              v-if="selectedReservation.contrat"
              @click="goToContrat(selectedReservation)"
              class="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-lg shadow-emerald-200 transition-all active:scale-95"
            >
              <FileText class="w-4 h-4" />
              Ouvrir le Contrat {{ contratRef(selectedReservation) }}
            </Button>

            <!-- Planifier Contrat (confirmed, no contract yet, non super-admin flow) -->
            <Button
              v-else-if="authStore.isAdmin && selectedReservation.status === 'confirmed'"
              @click="openContractRefDialog(selectedReservation)"
              class="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
              <FileText class="w-4 h-4" />
              Planifier Contrat
            </Button>

            <!-- Confirm (pending only) -->
            <Button
              v-if="selectedReservation.status === 'pending' && authStore.isAdmin"
              @click="selectedReservation.car ? confirmReservation(selectedReservation._id) : openAssignCarDialog()"
              :class="'h-12 text-white font-black rounded-2xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all flex-1 ' + (selectedReservation.car ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-95 shadow-lg shadow-emerald-200' : 'bg-amber-500 hover:bg-amber-600 active:scale-95 shadow-lg shadow-amber-200')"
            >
              <CheckCircle2 v-if="selectedReservation.car" class="w-4 h-4" />
              <CarIcon v-else class="w-4 h-4" />
              {{ selectedReservation.car ? 'Confirmer' : 'Assigner & Confirmer' }}
            </Button>

            <!-- Cancel (not possible once converted to a contract) -->
            <Button
              v-if="authStore.isAdmin && !selectedReservation.contrat"
              variant="ghost"
              @click="deleteReservation(selectedReservation._id)"
              class="h-12 px-5 text-rose-500 hover:bg-rose-100/60 font-black rounded-2xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all shrink-0"
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- ===================== CONTRAT PICKER DIALOG ===================== -->
    <Dialog :open="showContratPicker" @update:open="(val) => showContratPicker = val">
      <DialogContent class="sm:max-w-lg bg-white border-border shadow-3xl rounded-[2.5rem] p-0 overflow-hidden max-h-[88vh] flex flex-col" hideClose>
        <!-- Picker Header -->
        <div class="px-8 pt-8 pb-5 shrink-0 space-y-5">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <FileText class="w-6 h-6 text-white" />
              </div>
              <div>
                <p class="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-tight">Lier à un <span class="text-indigo-600">Contrat</span></p>
                <p class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 mt-0.5">
                  Réservation #{{ selectedReservation?._id?.slice(-8)?.toUpperCase() }}
                </p>
              </div>
            </div>
            <button @click="showContratPicker = false" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-90">
              <X class="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <!-- Search Bar -->
          <div class="relative">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              v-model="contratSearchQuery"
              placeholder="Rechercher par N° contrat, client ou véhicule..."
              class="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              autofocus
            />
          </div>
        </div>

        <!-- Picker List -->
        <div class="flex-1 overflow-y-auto px-8 pb-6 space-y-2 min-h-0 no-scrollbar">
          <div v-if="loadingContrats" class="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 class="w-6 h-6 animate-spin text-indigo-500" />
            <p class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Chargement des contrats...</p>
          </div>

          <template v-else>
            <button
              v-for="c in pickableContrats"
              :key="c._id"
              @click="selectedContratId = c._id"
              :class="[
                'w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 active:scale-[0.99]',
                selectedContratId === c._id
                  ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-md shadow-indigo-100'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/80'
              ]"
            >
              <div
                :class="[
                  'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                  selectedContratId === c._id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-400'
                ]"
              >
                <FileText class="w-4.5 h-4.5" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-mono font-black text-slate-900 text-sm truncate">{{ c.reference }}</p>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate mt-0.5">{{ contratClientLabel(c) }}</p>
              </div>
              <div class="text-right shrink-0 space-y-1">
                <p class="text-[10px] font-black text-slate-600 font-mono">{{ c.car?.matricule || '—' }}</p>
                <span class="inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                  :class="String(c.status) === 'active' ? 'bg-emerald-500/10 text-emerald-600' : String(c.status) === 'soon' ? 'bg-blue-500/10 text-blue-600' : 'bg-slate-500/10 text-slate-500'">
                  {{ contratStatusLabel(c.status) }}
                </span>
              </div>
            </button>

            <div v-if="!pickableContrats.length" class="py-14 flex flex-col items-center justify-center text-center space-y-2">
              <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Search class="w-6 h-6 text-slate-300" />
              </div>
              <p class="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Aucun contrat trouvé</p>
              <p class="text-[9px] font-bold text-slate-400">Essayez un autre numéro, client ou véhicule.</p>
            </div>
          </template>
        </div>

        <!-- Picker Footer -->
        <div class="border-t border-slate-100 px-8 py-5 bg-slate-50/60 flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            @click="showContratPicker = false"
            class="flex-1 h-12 text-slate-500 hover:bg-slate-200/60 font-black rounded-2xl uppercase tracking-widest text-[10px] transition-all active:scale-95"
          >
            Annuler
          </Button>
          <Button
            :disabled="!selectedContratId || linkingContrat"
            @click="linkContratToReservation"
            class="flex-[2] h-12 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white font-black rounded-2xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            <Loader2 v-if="linkingContrat" class="w-4 h-4 animate-spin" />
            <CheckCircle2 v-else class="w-4 h-4" />
            Lier le Contrat
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- ===================== CHANGE CLIENTS DIALOG ===================== -->
    <Dialog :open="showClientsDialog" @update:open="(val) => showClientsDialog = val">
      <DialogContent class="sm:max-w-lg bg-white border-border shadow-3xl rounded-[2.5rem] p-0 overflow-hidden max-h-[88vh] flex flex-col" hideClose>
        <!-- Header -->
        <div class="px-8 pt-8 pb-5 shrink-0 space-y-5">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <Users class="w-6 h-6 text-white" />
              </div>
              <div>
                <p class="text-lg font-black text-slate-900 uppercase italic tracking-tighter leading-tight">Modifier les <span class="text-indigo-600">Locataires</span></p>
                <p class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 mt-0.5">Maximum 2 clients · {{ selectedClientIds.length }}/2 sélectionné(s)</p>
              </div>
            </div>
            <button @click="showClientsDialog = false" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-90">
              <X class="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <!-- Search Bar -->
          <div class="relative">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              v-model="clientsSearchQuery"
              placeholder="Rechercher par nom ou CIN..."
              class="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
          </div>
        </div>

        <!-- Clients List -->
        <div class="flex-1 overflow-y-auto px-8 pb-6 space-y-2 min-h-0 no-scrollbar">
          <div v-if="loadingClientsPick" class="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 class="w-6 h-6 animate-spin text-indigo-500" />
            <p class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Chargement des clients...</p>
          </div>

          <template v-else>
            <button
              v-for="c in pickableClients"
              :key="c._id"
              @click="toggleClientPick(c)"
              :class="[
                'w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 active:scale-[0.99]',
                selectedClientIds.includes(c._id)
                  ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-md shadow-indigo-100'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/80'
              ]"
            >
              <div
                :class="[
                  'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black text-xs transition-colors',
                  selectedClientIds.includes(c._id) ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700'
                ]"
              >
                {{ (c.firstName?.[0] || '') + (c.lastName?.[0] || '') }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-black text-slate-900 text-sm uppercase tracking-tight truncate">{{ c.lastName }} {{ c.firstName }}</p>
                <p class="text-[10px] font-bold text-slate-400 font-mono mt-0.5">CIN · {{ c.cin || '—' }}</p>
              </div>
              <span
                v-if="selectedClientIds.includes(c._id)"
                class="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shrink-0"
              >
                <CheckCircle2 class="w-3.5 h-3.5 text-white" />
              </span>
            </button>

            <div v-if="!pickableClients.length" class="py-14 flex flex-col items-center justify-center text-center space-y-2">
              <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Search class="w-6 h-6 text-slate-300" />
              </div>
              <p class="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Aucun client trouvé</p>
              <p class="text-[9px] font-bold text-slate-400">Essayez un autre nom ou CIN.</p>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="border-t border-slate-100 px-8 py-5 bg-slate-50/60 flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            @click="showClientsDialog = false"
            class="flex-1 h-12 text-slate-500 hover:bg-slate-200/60 font-black rounded-2xl uppercase tracking-widest text-[10px] transition-all active:scale-95"
          >
            Annuler
          </Button>
          <Button
            :disabled="!selectedClientIds.length || savingClients"
            @click="saveClientsChange"
            class="flex-[2] h-12 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white font-black rounded-2xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            <Loader2 v-if="savingClients" class="w-4 h-4 animate-spin" />
            <CheckCircle2 v-else class="w-4 h-4" />
            Enregistrer
          </Button>
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

    <!-- ===================== NEW / EDIT RESERVATION FORM DIALOG ===================== -->
    <Dialog v-model:open="showForm">
      <DialogContent class="sm:max-w-xl bg-white border-none shadow-3xl rounded-[2.5rem] p-0 overflow-hidden flex flex-col max-h-[95vh]" hideClose>
        <!-- Gradient Header -->
        <div class="px-8 pt-8 pb-6 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white relative overflow-hidden shrink-0">
          <div class="absolute -right-10 -top-10 w-44 h-44 bg-white/10 rounded-full blur-3xl"></div>
          <div class="absolute right-20 bottom-0 w-24 h-24 bg-violet-400/20 rounded-full blur-2xl"></div>

          <div class="flex items-start justify-between relative z-10">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-sm shadow-lg">
                <CalendarDays v-if="!editingReservationId" class="w-6 h-6 text-white" />
                <PenLine v-else class="w-6 h-6 text-white" />
              </div>
              <div>
                <p class="text-lg font-black uppercase italic tracking-tighter leading-tight">
                  {{ editingReservationId ? 'Modifier la' : 'Planifier une' }}
                  <span class="text-indigo-200">Réservation</span>
                </p>
                <p class="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-200 mt-1 font-mono">
                  {{ editingReservationId ? '#' + editingReservationId.slice(-8).toUpperCase() : 'Nouvelle réservation' }}
                </p>
              </div>
            </div>
            <button @click="showForm = false" class="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all active:scale-90 rotate-0 hover:rotate-90 duration-300">
              <X class="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        <form @submit.prevent="submitReservation()" class="flex-1 overflow-y-auto no-scrollbar flex flex-col min-h-0">
          <div class="px-8 py-7 space-y-7 flex-1">

            <!-- ── Locataires ─────────────────────────────────────── -->
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <User class="w-3.5 h-3.5 text-slate-400" />
                <span class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Locataires</span>
                <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
              </div>
              <div class="relative grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Click-away layer -->
                <div v-if="openClientDropdown" class="fixed inset-0 z-40" @click="openClientDropdown = null"></div>

                <div class="space-y-2">
                  <Label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Locataire 1 <span class="text-rose-500">*</span></Label>
                  <div class="relative">
                    <button type="button" @click="toggleClientDropdown('client1')"
                      class="w-full h-12 bg-slate-50 border rounded-xl px-2.5 flex items-center gap-2.5 text-left transition-all hover:border-slate-300"
                      :class="openClientDropdown === 'client1' ? 'border-indigo-500 bg-white ring-4 ring-indigo-500/10' : 'border-slate-200'">
                      <template v-if="form.client">
                        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-[9px] font-black text-white shrink-0">{{ getClientInitials(form.client) }}</div>
                        <div class="flex-1 min-w-0">
                          <p class="text-xs font-black text-slate-800 truncate leading-tight">{{ getClientLabel(form.client) }}</p>
                          <p class="text-[9px] font-bold text-slate-400 font-mono">CIN {{ getSelectedClientCin(form.client) }}</p>
                        </div>
                      </template>
                      <template v-else>
                        <div class="w-8 h-8 rounded-lg bg-slate-200/70 border border-dashed border-slate-300 flex items-center justify-center shrink-0"><User class="w-4 h-4 text-slate-400" /></div>
                        <span class="flex-1 text-xs font-bold text-slate-400 truncate">Sélectionner un client…</span>
                      </template>
                      <ChevronDown class="w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300" :class="openClientDropdown === 'client1' ? 'rotate-180 text-indigo-500' : ''" />
                    </button>

                    <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 -translate-y-1 scale-[0.98]" enter-to-class="opacity-100 translate-y-0 scale-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0 -translate-y-1">
                      <div v-if="openClientDropdown === 'client1'" class="absolute z-50 mt-2 w-full bg-white rounded-2xl border border-slate-100 shadow-3xl overflow-hidden origin-top">
                        <div class="p-3 pb-0 relative">
                          <Search class="absolute left-6 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                          <input ref="clientSearchInput1" v-model="clientSearch.client1" placeholder="Rechercher (nom, CIN)…" class="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-300" />
                        </div>
                        <div class="max-h-52 overflow-y-auto no-scrollbar p-2 space-y-1">
                          <button v-for="c in getFormClientsPool('client1')" :key="c._id" type="button" @click="selectFormClient('client1', c._id)"
                            class="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors"
                            :class="form.client === c._id ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-50'">
                            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-[9px] font-black text-white shrink-0">{{ getClientInitials(c._id) }}</div>
                            <div class="flex-1 min-w-0">
                              <p class="text-xs font-black text-slate-800 truncate leading-tight">{{ c.lastName }} {{ c.firstName }}</p>
                              <p class="text-[9px] font-bold text-slate-400 font-mono">CIN {{ c.cin }}</p>
                            </div>
                            <CheckCircle2 v-if="form.client === c._id" class="w-4 h-4 text-indigo-600 shrink-0" />
                          </button>
                          <div v-if="!getFormClientsPool('client1').length" class="py-6 text-center">
                            <User class="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
                            <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Aucun client trouvé</p>
                          </div>
                        </div>
                      </div>
                    </transition>
                  </div>
                </div>

                <div class="space-y-2">
                  <Label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Locataire 2 <span class="text-slate-300">(Optionnel)</span></Label>
                  <div class="relative" :class="{ 'opacity-60': !form.client }">
                    <button type="button" @click="toggleClientDropdown('client2')" :disabled="!form.client"
                      class="w-full h-12 bg-slate-50 border rounded-xl px-2.5 flex items-center gap-2.5 text-left transition-all hover:border-slate-300 disabled:cursor-not-allowed disabled:hover:border-slate-200"
                      :class="openClientDropdown === 'client2' ? 'border-indigo-500 bg-white ring-4 ring-indigo-500/10' : 'border-slate-200'">
                      <template v-if="form.client2">
                        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-[9px] font-black text-white shrink-0">{{ getClientInitials(form.client2) }}</div>
                        <div class="flex-1 min-w-0">
                          <p class="text-xs font-black text-slate-800 truncate leading-tight">{{ getClientLabel(form.client2) }}</p>
                          <p class="text-[9px] font-bold text-slate-400 font-mono">CIN {{ getSelectedClientCin(form.client2) }}</p>
                        </div>
                      </template>
                      <template v-else>
                        <div class="w-8 h-8 rounded-lg bg-slate-200/70 border border-dashed border-slate-300 flex items-center justify-center shrink-0"><User class="w-4 h-4 text-slate-400" /></div>
                        <span class="flex-1 text-xs font-bold text-slate-400 truncate">{{ form.client ? 'Sélectionner un client…' : 'Choisissez le locataire 1 d\'abord' }}</span>
                      </template>
                      <ChevronDown class="w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300" :class="openClientDropdown === 'client2' ? 'rotate-180 text-indigo-500' : ''" />
                    </button>

                    <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 -translate-y-1 scale-[0.98]" enter-to-class="opacity-100 translate-y-0 scale-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0 -translate-y-1">
                      <div v-if="openClientDropdown === 'client2'" class="absolute z-50 mt-2 w-full bg-white rounded-2xl border border-slate-100 shadow-3xl overflow-hidden origin-top">
                        <div class="p-3 pb-0 relative">
                          <Search class="absolute left-6 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                          <input ref="clientSearchInput2" v-model="clientSearch.client2" placeholder="Rechercher (nom, CIN)…" class="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-300" />
                        </div>
                        <div class="max-h-52 overflow-y-auto no-scrollbar p-2 space-y-1">
                          <button v-for="c in getFormClientsPool('client2')" :key="c._id" type="button" @click="selectFormClient('client2', c._id)"
                            class="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors"
                            :class="form.client2 === c._id ? 'bg-violet-50 ring-1 ring-violet-200' : 'hover:bg-slate-50'">
                            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-[9px] font-black text-white shrink-0">{{ getClientInitials(c._id) }}</div>
                            <div class="flex-1 min-w-0">
                              <p class="text-xs font-black text-slate-800 truncate leading-tight">{{ c.lastName }} {{ c.firstName }}</p>
                              <p class="text-[9px] font-bold text-slate-400 font-mono">CIN {{ c.cin }}</p>
                            </div>
                            <CheckCircle2 v-if="form.client2 === c._id" class="w-4 h-4 text-violet-600 shrink-0" />
                          </button>
                          <div v-if="!getFormClientsPool('client2').length" class="py-6 text-center">
                            <User class="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
                            <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Aucun client trouvé</p>
                          </div>
                        </div>
                      </div>
                    </transition>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── Période ────────────────────────────────────────── -->
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <Calendar class="w-3.5 h-3.5 text-slate-400" />
                <span class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Période de Location</span>
                <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="md:col-span-2 space-y-2">
                  <Label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Prise en Charge</Label>
                  <div class="flex gap-3">
                    <div class="relative flex-[2]">
                      <Calendar class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                      <Input type="date" v-model="form.startDate" required class="h-13 py-3 pl-11 pr-3 bg-slate-50 border-slate-200 rounded-xl font-bold focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all w-full" />
                    </div>
                    <div class="relative flex-1">
                      <Clock class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                      <Input type="time" v-model="form.startTime" required class="h-13 py-3 pl-10 pr-3 bg-slate-50 border-slate-200 rounded-xl font-bold focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all w-full" />
                    </div>
                  </div>
                </div>
                <div class="space-y-2">
                  <Label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Durée (Jours)</Label>
                  <div class="relative">
                    <TrendingUp class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                    <Input type="number" min="1" v-model="form.days" required class="h-13 py-3 pl-10 pr-3 bg-slate-50 border-slate-200 rounded-xl font-bold focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all w-full" />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date Retour <span class="text-slate-300">(Auto)</span></Label>
                  <Input type="date" :value="calculatedEndDate" disabled class="h-12 bg-slate-100 border-slate-100 rounded-xl font-bold italic opacity-60 cursor-not-allowed" />
                </div>
                <div class="space-y-2">
                  <Label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Heure de Retour</Label>
                  <div class="relative">
                    <Clock class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <Input type="time" v-model="form.endTime" disabled class="h-12 pl-10 bg-slate-100 border-slate-100 rounded-xl font-bold italic opacity-60 cursor-not-allowed w-full" />
                  </div>
                </div>
              </div>
            </div>

            <!-- ── Véhicule & Tarif ───────────────────────────────── -->
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <CarIcon class="w-3.5 h-3.5 text-slate-400" />
                <span class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Véhicule & Tarif</span>
                <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
              </div>

              <select v-model="form.car" class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer hover:border-slate-300 disabled:opacity-50" :disabled="!form.startDate || !form.days">
                <option value="">Non assigné (Véhicule au choix plus tard)</option>
                <optgroup v-if="availableCarsList.length" label="Disponibles sur cette période">
                  <option v-for="car in availableCarsList" :key="car._id" :value="car._id">
                    {{ car.brand }} {{ car.model }} ({{ car.matricule }}) — {{ car.dailyRate }} TND/j
                  </option>
                </optgroup>
                <optgroup v-if="conflictedCarsList.length" label="Déjà réservés sur cette période">
                  <option v-for="car in conflictedCarsList" :key="car._id" :value="car._id">
                    {{ car.brand }} {{ car.model }} ({{ car.matricule }}) — Indisponible
                  </option>
                </optgroup>
              </select>

              <!-- Conflict Alert Box -->
              <transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0">
                <div v-if="form.car && selectedCarConflicts.length" class="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 space-y-3">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <AlertTriangle class="w-4 h-4 text-amber-600" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-[10px] font-black uppercase tracking-widest text-amber-700 leading-tight">Véhicule déjà réservé</p>
                      <p class="text-[9px] font-bold text-amber-500 italic">{{ selectedCarConflicts.length }} réservation{{ selectedCarConflicts.length > 1 ? 's' : '' }} sur cette période</p>
                    </div>
                    <button type="button" @click="form.car = ''" class="h-8 px-3 rounded-lg bg-white border border-amber-200 text-[9px] font-black uppercase tracking-widest text-amber-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all active:scale-95 flex items-center gap-1.5 shrink-0">
                      <X class="w-3 h-3" /> Retirer
                    </button>
                  </div>
                  <div class="space-y-1.5">
                    <div v-for="cf in selectedCarConflicts" :key="cf._id" class="bg-white/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-amber-100/80 flex items-center gap-2.5">
                      <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="conflictDotClass(cf)"></span>
                      <div class="flex-1 min-w-0">
                        <p class="text-[10px] font-black text-slate-700 truncate leading-tight">
                          {{ cf.clientName }}
                          <span class="ml-1 inline-flex items-center align-middle text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border" :class="cf.source === 'contrat' ? 'border-violet-200 bg-violet-50 text-violet-500' : 'border-slate-200 bg-white text-slate-400'">{{ conflictSourceLabel(cf) }}</span>
                        </p>
                        <p class="text-[9px] font-bold text-slate-400 font-mono">{{ formatDateShort(cf.startDate) }} · {{ formatTime(cf.startDate) }} → {{ formatDateShort(cf.endDate) }} · {{ formatTime(cf.endDate) }}</p>
                      </div>
                      <span class="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md shrink-0" :class="conflictPillClass(cf)">{{ conflictStatusLabel(cf) }}</span>
                    </div>
                  </div>
                  <p class="text-[9px] font-bold text-amber-600/80 italic">La confirmation finale vérifiera à nouveau les disponibilités.</p>
                </div>
              </transition>

              <transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0">
                <div v-if="form.car" class="grid grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <Label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tarif Journalier</Label>
                    <div class="relative">
                      <Banknote class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />
                      <Input type="number" min="0" step="0.5" v-model.number="form.dailyRate" :placeholder="`Défaut: ${selectedCarDetails?.dailyRate || 0}`" class="h-12 pl-10 pr-12 bg-slate-50 border-slate-200 rounded-xl font-black tabular-nums focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all" />
                      <span class="absolute right-4 top-1/2 -translate-y-1/2 font-black text-[10px] text-slate-400 uppercase">TND</span>
                    </div>
                  </div>
                  <div class="space-y-2 flex flex-col">
                    <Label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Total Estimé</Label>
                    <div class="flex-1 min-h-[3rem] px-4 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 flex items-center justify-between shadow-lg shadow-indigo-200/70">
                      <span class="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-200">{{ form.days }}J × {{ form.dailyRate > 0 ? form.dailyRate : (selectedCarDetails?.dailyRate || 0) }}</span>
                      <span class="text-base font-black tabular-nums text-white tracking-tight">{{ totalRentPrice }} <span class="text-[9px] text-indigo-200">TND</span></span>
                    </div>
                  </div>
                </div>
              </transition>
            </div>

            <!-- ── Notes ──────────────────────────────────────────── -->
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <StickyNote class="w-3.5 h-3.5 text-slate-400" />
                <span class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Notes</span>
                <span class="text-[8px] font-bold text-slate-300 italic">(Optionnel)</span>
                <div class="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent"></div>
              </div>
              <textarea v-model="form.notes" rows="2" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-300 resize-none" placeholder="Heure d'arrivée, spécifications ou cautions..."></textarea>
            </div>

            <!-- ── Statut (Super Admin, édition) ──────────────────── -->
            <transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0">
              <div v-if="authStore.isSuperAdmin && editingReservationId" class="space-y-4">
                <div class="flex items-center gap-3">
                  <ShieldCheck class="w-3.5 h-3.5 text-indigo-500" />
                  <span class="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-500">Statut de la Réservation</span>
                  <div class="h-px flex-1 bg-gradient-to-r from-indigo-200 to-transparent"></div>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    v-for="opt in statusOptions"
                    :key="opt.value"
                    type="button"
                    @click="editStatus = opt.value"
                    :class="[
                      'h-11 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all active:scale-95',
                      editStatus === opt.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 scale-[1.02]'
                        : 'bg-white text-slate-400 border-slate-200 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/40'
                    ]"
                  >
                    {{ opt.label }}
                  </button>
                </div>
                <p v-if="editStatus === 'converted'" class="text-[9px] font-bold text-amber-500 italic -mt-1">Le statut « Contrat » ouvrira la sélection d'un contrat existant après l'enregistrement.</p>
              </div>
            </transition>
          </div>

          <!-- Footer -->
          <div class="border-t border-slate-100 px-8 py-5 bg-slate-50/60 flex items-center gap-3 shrink-0 sticky bottom-0">
            <Button type="button" variant="ghost" @click="showForm = false" class="flex-1 h-12 text-slate-500 hover:bg-slate-200/60 font-black rounded-2xl uppercase tracking-widest text-[10px] transition-all active:scale-95">
              Annuler
            </Button>
            <Button type="submit" :disabled="submitting" class="flex-[2] h-12 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white font-black rounded-2xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 transition-all active:scale-95">
              <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
              <CheckCircle2 v-else class="w-4 h-4" />
              {{ editingReservationId ? 'Enregistrer' : 'Confirmer la Réservation' }}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <!-- ===================== PASSWORD CONFIRM DIALOG ===================== -->
    <Dialog :open="pwdDialogOpen" @update:open="(val) => { if (!val) cancelPasswordRequest() }">
      <DialogContent class="sm:max-w-md bg-white border-none shadow-2xl rounded-[2rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader class="mb-5">
          <DialogTitle class="text-xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
              <Lock class="w-5 h-5 text-white" />
            </div>
            Confirmation <span class="text-indigo-600">Requise</span>
          </DialogTitle>
          <p class="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-2 ml-14">Entrez votre mot de passe pour enregistrer</p>
        </DialogHeader>

        <div class="space-y-4">
          <div class="relative">
            <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              v-model="pwdValue"
              :type="pwdShow ? 'text' : 'password'"
              placeholder="Mot de passe"
              autofocus
              autocomplete="current-password"
              class="w-full h-13 py-3.5 pl-11 pr-12 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              @keydown.enter.prevent="confirmPasswordRequest"
            />
            <button
              type="button"
              @click="pwdShow = !pwdShow"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <EyeOff v-if="pwdShow" class="w-4 h-4" />
              <Eye v-else class="w-4 h-4" />
            </button>
          </div>

          <p v-if="guard.isLocked" class="text-[10px] font-black uppercase tracking-widest text-rose-500 text-center">
            Compte verrouillé — réessayez dans {{ guard.remainingSeconds }}s
          </p>
          <p v-else class="text-[9px] font-bold text-slate-400 text-center">{{ guard.remainingAttempts }} tentative(s) restante(s)</p>

          <div class="flex gap-2 pt-1">
            <Button type="button" variant="ghost" @click="cancelPasswordRequest" class="flex-1 h-12 uppercase text-[10px] tracking-widest font-black text-slate-500 rounded-xl">Annuler</Button>
            <Button
              type="button"
              @click="confirmPasswordRequest"
              :disabled="pwdBusy || guard.isLocked || !pwdValue"
              class="flex-[2] h-12 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white font-black rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            >
              <Loader2 v-if="pwdBusy" class="w-4 h-4 animate-spin" />
              Confirmer
            </Button>
          </div>
        </div>
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
import { ref, onMounted, onUnmounted, reactive, computed, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useSocketStore } from '@/stores/socket';
import { clientApi, carApi, reservationApi, contratApi } from '../api';
import {
  Search, Plus, Calendar, CalendarDays, ArrowRight,
  Car as CarIcon, CheckCircle2, Trash2,
  FileText, X, User, StickyNote,
  CalendarX, Clock, TrendingUp, AlertTriangle,
  ArrowLeftRight, Pencil, PenLine, Filter,
  Loader2, ShieldCheck, Banknote, Eye, EyeOff, Lock, ChevronDown
} from 'lucide-vue-next';
import { useToast } from 'primevue/usetoast';
import { usePasswordGuard, handlePasswordError } from '@/composables/usePasswordGuard';
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
const toast = useToast();
const guard = usePasswordGuard();
const socketStore = useSocketStore();
let unsubscribeSocket: Function | null = null;

// ─── State ────────────────────────────────────────────────────────────────────
const showForm = ref(false);
const submitting = ref(false);
const loading = ref(true);
const clients = ref<any[]>([]);
const cars = ref<any[]>([]);
const allContrats = ref<any[]>([]);
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
  { label: 'Contrat', value: 'converted' },
];

const form = reactive({
  client: '',
  client2: '',
  car: '',
  startDate: new Date().toISOString().split('T')[0],
  startTime: '10:00',
  days: 1,
  endTime: '10:00',
  dailyRate: 0,
  notes: ''
});

const editingReservationId = ref<string | null>(null);
const editStatus = ref('pending');

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
    const conflicts = formCarConflicts.value[newCarId];
    if (conflicts?.length) {
      toast.add({
        severity: 'warn',
        summary: 'Conflit de Réservation',
        detail: `${car?.brand || ''} ${car?.model || ''} est déjà réservé sur cette période (${conflicts.length} réservation${conflicts.length > 1 ? 's' : ''}).`,
        life: 6000
      });
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
const convertedCount = computed(() => reservations.value.filter(r => r.status === 'converted').length);

// Car/clients swap buttons: hidden for admin/user once the reservation is linked to a contract.
// Super admin keeps full control.
const canModifyReservationLinks = computed(() => {
  const res = selectedReservation.value;
  if (!res || !authStore.isAdmin) return false;
  if (res.status === 'cancelled') return false;
  if (res.status === 'converted' && !authStore.isSuperAdmin) return false;
  return true;
});

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



// Cars grouped by availability for the form period: available ones are selectable,
// conflicted ones stay visible (marked) so the user can knowingly pick them.
// Both reservations AND contracts occupy cars — contracts can have dates that
// differ from their source reservation (or exist without any reservation).
type ConflictEntry = { _id: string; source: 'reservation' | 'contrat'; clientName: string; startDate: string; endDate: string; status: string };

const formCarConflicts = computed<Record<string, ConflictEntry[]>>(() => {
  const map: Record<string, ConflictEntry[]> = {};
  if (!form.startDate || !form.days || !form.startTime) return map;
  const reqStart = new Date(`${form.startDate}T${form.startTime}:00`).getTime();
  const reqEnd = new Date(`${calculatedEndDate.value || form.startDate}T${form.endTime || '23:59'}:00`).getTime();
  const overlaps = (s: string, e: string): boolean => {
    if (!s || !e) return false;
    return new Date(s).getTime() <= reqEnd && new Date(e).getTime() >= reqStart;
  };
  const carKey = (car: any): string => (typeof car === 'object' ? car?._id : car);
  const push = (carId: any, entry: ConflictEntry) => {
    const key = carKey(carId);
    if (!key) return;
    if (!map[key]) map[key] = [];
    map[key].push(entry);
  };

  for (const res of reservations.value) {
    if (res.status === 'cancelled' || !res.car) continue;
    if (editingReservationId.value && res._id === editingReservationId.value) continue;
    // Converted reservations are represented by their linked contract below
    if (res.status === 'converted' && res.contrat) continue;
    if (!overlaps(res.startDate, res.endDate)) continue;
    push(res.car, {
      _id: res._id,
      source: 'reservation',
      clientName: res.clientName
        || [res.clients?.[0]?.lastName, res.clients?.[0]?.firstName].filter(Boolean).join(' ')
        || 'Client',
      startDate: res.startDate,
      endDate: res.endDate,
      status: res.status
    });
  }

  for (const ct of allContrats.value) {
    if (!ct.car || (ct.status !== 'active' && ct.status !== 'soon')) continue;
    if (editingReservationId.value && ct.reservation === editingReservationId.value) continue;
    if (!overlaps(ct.startDate, ct.endDate)) continue;
    const firstClient = Array.isArray(ct.clients) ? ct.clients[0] : ct.client;
    push(ct.car, {
      _id: ct._id,
      source: 'contrat',
      clientName: [firstClient?.lastName, firstClient?.firstName].filter(Boolean).join(' ') || 'Client',
      startDate: ct.startDate,
      endDate: ct.endDate,
      status: ct.status
    });
  }
  return map;
});

const availableCarsList = computed(() => {
  if (!form.startDate || !form.days) return [];
  return cars.value.filter(car => !formCarConflicts.value[car._id]);
});

const conflictedCarsList = computed(() => {
  if (!form.startDate || !form.days) return [];
  return cars.value.filter(car => !!formCarConflicts.value[car._id]);
});

const selectedCarConflicts = computed<ConflictEntry[]>(() => {
  return (form.car && formCarConflicts.value[form.car]) || [];
});

const conflictSourceLabel = (cf: ConflictEntry): string => cf.source === 'contrat' ? 'Contrat' : 'Réservation';

const conflictStatusLabel = (cf: ConflictEntry): string => {
  if (cf.source === 'contrat') {
    if (cf.status === 'active') return 'En Cours';
    if (cf.status === 'soon') return 'Bientôt';
    return cf.status;
  }
  return getStatusLabel(cf.status);
};

const conflictDotClass = (cf: ConflictEntry): string => {
  if (cf.source === 'contrat') return cf.status === 'active' ? 'bg-emerald-500' : 'bg-blue-500';
  return cf.status === 'converted' ? 'bg-emerald-500' : cf.status === 'confirmed' ? 'bg-blue-500' : 'bg-amber-400';
};

const conflictPillClass = (cf: ConflictEntry): string => {
  if (cf.source === 'contrat') return cf.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600';
  return cf.status === 'converted' ? 'bg-emerald-100 text-emerald-600' : cf.status === 'confirmed' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600';
};

const assignableCarsList = computed(() => {
  if (!selectedReservation.value) return [];
  const reqStart = new Date(selectedReservation.value.startDate).getTime();
  const reqEnd = new Date(selectedReservation.value.endDate).getTime();
  const carKey = (car: any): string => (typeof car === 'object' ? car?._id : car);
  const isBusy = (carId: any): boolean => {
    const key = carKey(carId);
    if (!key) return true;
    for (const res of reservations.value) {
      // don't conflict with itself
      if (res._id === selectedReservation.value?._id) continue;
      if (res.status === 'cancelled' || !res.car) continue;
      if (res.status === 'converted' && res.contrat) continue;
      if (carKey(res.car) !== key) continue;
      const resStart = new Date(res.startDate).getTime();
      const resEnd = new Date(res.endDate).getTime();
      if (resStart <= reqEnd && resEnd >= reqStart) return true;
    }
    for (const ct of allContrats.value) {
      if (!ct.car || (ct.status !== 'active' && ct.status !== 'soon')) continue;
      if (ct.reservation === selectedReservation.value?._id) continue;
      if (carKey(ct.car) !== key) continue;
      const ctStart = new Date(ct.startDate).getTime();
      const ctEnd = new Date(ct.endDate).getTime();
      if (ctStart <= reqEnd && ctEnd >= reqStart) return true;
    }
    return false;
  };
  return cars.value.filter(car => !isBusy(car._id));
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

const saveDailyRate = () => {
  if (!selectedReservation.value || editingDailyRate.value === null) return;
  const id = selectedReservation.value._id;
  const rate = editingDailyRate.value;

  requestAdminPassword(async (password: string) => {
    await reservationApi.update(id, { dailyRate: rate, password });
    guard.reset();
    editingDailyRate.value = null;
    await loadReservations();
    selectedReservation.value = reservations.value.find(r => r._id === id) || null;
    toast.add({ severity: 'success', summary: 'Tarif modifié', detail: 'Le tarif journalier a été mis à jour.', life: 3000 });
  });
};



const getStatusLabel = (status: string): string => {
  return status === 'converted' ? 'Contrat' : status === 'confirmed' ? 'Planifiée' : status === 'cancelled' ? 'Annulée' : 'En Attente';
};

const getStatusBadgeStyle = (status: string) => {
  if (status === 'converted') return 'bg-indigo-50 text-indigo-600 border-indigo-100';
  if (status === 'confirmed') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  if (status === 'cancelled') return 'bg-slate-50 text-slate-400 border-slate-200';
  return 'bg-amber-50 text-amber-600 border-amber-100';
};

const getStatusBadgeStyleLight = (status: string) => {
  if (status === 'converted') return 'bg-white/20 text-white border-white/30';
  if (status === 'confirmed') return 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30';
  if (status === 'cancelled') return 'bg-white/10 text-white/60 border-white/20';
  return 'bg-amber-400/20 text-amber-100 border-amber-400/30';
};

const contratRef = (res: any): string => {
  const c = res?.contrat;
  if (!c) return '';
  if (typeof c === 'object') return c.reference || `#${c._id?.slice(-8)?.toUpperCase() || ''}`;
  return `#${String(c).slice(-8).toUpperCase()}`;
};

const goToContrat = (res: any) => {
  const c = res?.contrat;
  if (!c) return;
  router.push(`/contrats/${typeof c === 'object' ? c._id : c}`);
};

// ─── Super Admin Status Change ───────────────────────────────────────────────
const statusOptions = [
  { label: 'En Attente', value: 'pending' },
  { label: 'Planifiée', value: 'confirmed' },
  { label: 'Contrat', value: 'converted' },
  { label: 'Annulée', value: 'cancelled' },
];

// ─── Shared Password Confirmation ────────────────────────────────────────────
const pwdDialogOpen = ref(false);
const pwdValue = ref('');
const pwdShow = ref(false);
const pwdBusy = ref(false);
let pendingPwdAction: ((pwd: string) => Promise<void>) | null = null;

const requestAdminPassword = (action: (pwd: string) => Promise<void>) => {
  pendingPwdAction = action;
  pwdValue.value = '';
  pwdShow.value = false;
  pwdDialogOpen.value = true;
};

const cancelPasswordRequest = () => {
  if (pwdBusy.value) return;
  pendingPwdAction = null;
  pwdDialogOpen.value = false;
};

const confirmPasswordRequest = async () => {
  if (!pendingPwdAction || pwdBusy.value || guard.isLocked) return;
  if (!pwdValue.value) {
    toast.add({ severity: 'warn', summary: 'Mot de passe requis', detail: 'Veuillez saisir votre mot de passe.', life: 3000 });
    return;
  }
  pwdBusy.value = true;
  const action = pendingPwdAction;
  try {
    await action(pwdValue.value);
    pendingPwdAction = null;
    pwdDialogOpen.value = false;
  } catch (err: any) {
    console.error('Password-confirmed action failed', err);
    handlePasswordError(err, toast);
  } finally {
    pwdBusy.value = false;
  }
};
const showContratPicker = ref(false);
const contratSearchQuery = ref('');
const contratsForPick = ref<any[]>([]);
const loadingContrats = ref(false);
const selectedContratId = ref('');
const linkingContrat = ref(false);

const applyUpdatedReservation = (updated: any) => {
  if (!updated) return;
  const idx = reservations.value.findIndex(r => r._id === updated._id);
  if (idx !== -1) reservations.value.splice(idx, 1, updated);
  if (selectedReservation.value?._id === updated._id) {
    selectedReservation.value = updated;
  }
};

const openContratPicker = () => {
  contratSearchQuery.value = '';
  selectedContratId.value = '';
  contratsForPick.value = [];
  showContratPicker.value = true;
  loadContratsForPick();
};

const loadContratsForPick = async () => {
  loadingContrats.value = true;
  try {
    contratsForPick.value = await contratApi.getAll();
  } catch (err) {
    console.error('Failed to load contracts for picker', err);
    toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les contrats.', life: 4000 });
  } finally {
    loadingContrats.value = false;
  }
};

const contratClientLabel = (c: any): string => {
  const list = Array.isArray(c.clients) ? c.clients : c.client ? [c.client] : [];
  if (!list.length) return 'Client —';
  const first = list[0];
  const name = `${first?.lastName || ''} ${first?.firstName || ''}`.trim();
  return list.length > 1 ? `${name} +${list.length - 1}` : name || 'Client —';
};

const contratStatusLabel = (s: string): string => {
  return s === 'active' ? 'En cours' : s === 'soon' ? 'À venir' : s === 'terminé' ? 'Terminé' : s === 'clôturé' ? 'Clôturé' : s === 'cancelled' ? 'Annulé' : (s || '—');
};

const pickableContrats = computed(() => {
  const currentId = String(selectedReservation.value?._id || '');
  const q = contratSearchQuery.value.trim().toLowerCase();
  return contratsForPick.value.filter(c => {
    // Skip cancelled contracts and contracts already linked to another reservation
    if (String(c.status).toLowerCase() === 'cancelled') return false;
    const linkedTo = c.reservation ? String(typeof c.reservation === 'object' ? c.reservation._id : c.reservation) : '';
    if (linkedTo && linkedTo !== currentId) return false;

    if (!q) return true;
    const clientNames = (Array.isArray(c.clients) ? c.clients : []).map((cl: any) => `${cl?.lastName || ''} ${cl?.firstName || ''}`).join(' ').toLowerCase();
    const carLabel = c.car ? `${c.car.brand || ''} ${c.car.model || ''} ${c.car.matricule || ''}`.toLowerCase() : '';
    return (
      String(c.reference || '').toLowerCase().includes(q) ||
      clientNames.includes(q) ||
      carLabel.includes(q)
    );
  });
});

const linkContratToReservation = async () => {
  const res = selectedReservation.value;
  if (!res || !selectedContratId.value || linkingContrat.value) return;

  linkingContrat.value = true;
  try {
    const updated = await reservationApi.updateStatus(res._id, 'converted', selectedContratId.value);
    applyUpdatedReservation(updated);
    showContratPicker.value = false;
    toast.add({
      severity: 'success',
      summary: 'Réservation convertie',
      detail: `Liée au contrat ${contratRef(updated)} avec succès.`,
      life: 3500
    });
  } catch (err: any) {
    console.error('Failed to link contract to reservation', err);
    toast.add({ severity: 'error', summary: 'Erreur', detail: err.response?.data?.message || 'Impossible de lier le contrat.', life: 4000 });
  } finally {
    linkingContrat.value = false;
  }
};

// ─── Date helpers ────────────────────────────────────────────────────────────
const splitDateTime = (iso: any): { date: string; time: string } => {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`
  };
};

// ─── Client Combobox (reservation form) ─────────────────────────────────────
const openClientDropdown = ref<'client1' | 'client2' | null>(null);
const clientSearch = reactive({ client1: '', client2: '' });
const clientSearchInput1 = ref<HTMLInputElement | null>(null);
const clientSearchInput2 = ref<HTMLInputElement | null>(null);

watch(openClientDropdown, async (val) => {
  if (!val) return;
  await nextTick();
  (val === 'client1' ? clientSearchInput1 : clientSearchInput2).value?.focus();
});

const toggleClientDropdown = (which: 'client1' | 'client2') => {
  if (which === 'client2' && !form.client) return;
  if (openClientDropdown.value === which) {
    openClientDropdown.value = null;
    return;
  }
  clientSearch[which] = '';
  openClientDropdown.value = which;
};

const getFormClientsPool = (which: 'client1' | 'client2'): any[] => {
  let pool = clients.value.filter((c: any) => !c.disabled);
  pool = which === 'client2'
    ? pool.filter((c: any) => c._id !== form.client)
    : pool.filter((c: any) => c._id !== form.client2);
  const q = clientSearch[which].trim().toLowerCase();
  if (!q) return pool;
  return pool.filter((c: any) =>
    `${c.lastName} ${c.firstName} ${c.cin}`.toLowerCase().includes(q)
  );
};

const getClientLabel = (id: string): string => {
  if (!id) return '';
  const c = clients.value.find((x: any) => x._id === id);
  return c ? `${c.lastName} ${c.firstName}` : '';
};

const getClientInitials = (id: string): string => {
  if (!id) return '?';
  const c = clients.value.find((x: any) => x._id === id);
  return `${c?.lastName?.[0] || ''}${c?.firstName?.[0] || ''}`.toUpperCase() || '?';
};

const getSelectedClientCin = (id: string): string => {
  const c = clients.value.find((x: any) => x._id === id);
  return c?.cin || '—';
};

const selectFormClient = (which: 'client1' | 'client2', id: string) => {
  if (which === 'client1') {
    form.client = id;
    if (form.client2 && form.client2 === id) form.client2 = '';
  } else {
    form.client2 = id;
  }
  openClientDropdown.value = null;
};

// ─── Change Clients ──────────────────────────────────────────────────────────
const showClientsDialog = ref(false);
const clientsSearchQuery = ref('');
const allClientsForPick = ref<any[]>([]);
const loadingClientsPick = ref(false);
const selectedClientIds = ref<string[]>([]);
const savingClients = ref(false);

const openChangeClientsDialog = async () => {
  const res = selectedReservation.value;
  if (!res) return;
  clientsSearchQuery.value = '';
  showClientsDialog.value = true;
  loadingClientsPick.value = true;

  // Pre-select current reservation clients
  const current = Array.isArray(res.clients) && res.clients.length ? res.clients : (res.client ? [res.client] : []);
  selectedClientIds.value = current.map((c: any) => (typeof c === 'object' ? c._id : c)).filter(Boolean);

  try {
    if (!clients.value.length) {
      const resClients = await clientApi.getAll();
      clients.value = resClients || [];
    }
    allClientsForPick.value = clients.value.filter((c: any) => !c.disabled);
  } catch (err) {
    console.error('Failed to load clients', err);
    toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les clients.', life: 4000 });
  } finally {
    loadingClientsPick.value = false;
  }
};

const pickableClients = computed(() => {
  const q = clientsSearchQuery.value.trim().toLowerCase();
  if (!q) return allClientsForPick.value;
  return allClientsForPick.value.filter(c =>
    `${c.lastName || ''} ${c.firstName || ''}`.toLowerCase().includes(q) ||
    String(c.cin || '').toLowerCase().includes(q)
  );
});

const toggleClientPick = (client: any) => {
  const idx = selectedClientIds.value.indexOf(client._id);
  if (idx !== -1) {
    selectedClientIds.value.splice(idx, 1);
  } else {
    if (selectedClientIds.value.length >= 2) {
      toast.add({ severity: 'warn', summary: 'Limite atteinte', detail: 'Maximum 2 clients par réservation.', life: 3000 });
      return;
    }
    selectedClientIds.value.push(client._id);
  }
};

const saveClientsChange = () => {
  const res = selectedReservation.value;
  if (!res || !selectedClientIds.value.length || savingClients.value) return;
  const id = res._id;
  const clientList = [...selectedClientIds.value];

  requestAdminPassword(async (password: string) => {
    savingClients.value = true;
    try {
      await reservationApi.update(id, { clients: clientList, password });
      guard.reset();
      const fresh = await reservationApi.getOne(id);
      applyUpdatedReservation(fresh);
      showClientsDialog.value = false;
      toast.add({ severity: 'success', summary: 'Locataires modifiés', detail: 'La liste des locataires a été mise à jour.', life: 3000 });
    } finally {
      savingClients.value = false;
    }
  });
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

const ensureFormResources = async () => {
  const tasks: Promise<any>[] = [];
  if (clients.value.length === 0 || cars.value.length === 0) {
    tasks.push(
      Promise.all([clientApi.getAll(), carApi.getAll()]).then(([resClients, resCars]) => {
        clients.value = resClients;
        cars.value = resCars;
      })
    );
  }
  // Contracts occupy cars for availability checks — always refresh (dates change often)
  tasks.push(
    contratApi.getAll().then((list: any[]) => { allContrats.value = list || []; })
  );
  try {
    await Promise.all(tasks);
  } catch (err) {
    console.error('Failed to load resources', err);
  }
};

const openForm = async () => {
  editingReservationId.value = null;
  form.client = '';
  form.client2 = '';
  form.car = '';
  form.startDate = '';
  form.days = 1;
  form.startTime = '10:00';
  form.endTime = '10:00';
  form.dailyRate = 0;
  form.notes = '';

  await ensureFormResources();
  showForm.value = true;
};

const openEditReservation = async (res: any) => {
  if (!res) return;
  selectedReservation.value = res;
  editingReservationId.value = res._id;

  await ensureFormResources();

  const s = splitDateTime(res.startDate);
  const e = splitDateTime(res.endDate);
  const durationMs = new Date(res.endDate).getTime() - new Date(res.startDate).getTime();

  form.client = res.clients?.[0]?._id || res.client?._id || (typeof res.clients?.[0] === 'string' ? res.clients[0] : '');
  form.client2 = res.clients?.[1]?._id || '';
  form.car = res.car?._id || '';
  form.startDate = s.date;
  form.startTime = s.time;
  form.days = Math.max(1, Math.ceil(durationMs / 86400000));
  form.endTime = e.time;
  form.dailyRate = res.dailyRate > 0 ? res.dailyRate : 0;
  form.notes = res.notes || '';
  editStatus.value = res.status || 'pending';

  showForm.value = true;
};

const submitReservation = async (force = false) => {
  if (editingReservationId.value) {
    submitReservationEdit();
    return;
  }
  if (!form.client) {
    toast.add({ severity: 'warn', summary: 'Locataire requis', detail: 'Veuillez sélectionner le locataire principal.', life: 3000 });
    return;
  }
  submitting.value = true;
  try {
    const payload: any = {
      client: form.client,
      clients: form.client2 ? [form.client, form.client2] : [form.client],
      startDate: new Date(`${form.startDate}T${form.startTime}:00`).toISOString(),
      endDate: new Date(`${calculatedEndDate.value}T${form.endTime}:00`).toISOString(),
      days: Number(form.days),
      notes: form.notes,
      force: force
    };
    if (form.car) {
      payload.car = form.car;
    }
    if (form.dailyRate && form.dailyRate > 0) {
      payload.dailyRate = form.dailyRate;
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

const submitReservationEdit = () => {
  const id = editingReservationId.value;
  if (!id || submitting.value) return;

  if (!form.client) {
    toast.add({ severity: 'warn', summary: 'Locataire requis', detail: 'Veuillez sélectionner le locataire principal.', life: 3000 });
    return;
  }
  if (form.client2 && form.client2 === form.client) {
    toast.add({ severity: 'warn', summary: 'Doublon', detail: 'Le second locataire doit être différent du premier.', life: 3000 });
    return;
  }
  if (!form.startDate) {
    toast.add({ severity: 'warn', summary: 'Date requise', detail: 'La date de prise en charge est obligatoire.', life: 3000 });
    return;
  }

  // Password is requested only AFTER clicking "Enregistrer"
  requestAdminPassword(async (password: string) => {
    submitting.value = true;
    try {
      const payload: any = {
        client: form.client,
        clients: form.client2 ? [form.client, form.client2] : [form.client],
        startDate: new Date(`${form.startDate}T${form.startTime}:00`).toISOString(),
        endDate: new Date(`${calculatedEndDate.value}T${form.endTime}:00`).toISOString(),
        days: Number(form.days),
        notes: form.notes,
        password
      };
      if (form.car) {
        payload.car = form.car;
      }
      if (form.dailyRate && form.dailyRate > 0) {
        payload.dailyRate = form.dailyRate;
      }

      await reservationApi.update(id, payload);
      guard.reset();

      // Super-admin status handling after the main update
      if (authStore.isSuperAdmin) {
        const fresh = await reservationApi.getOne(id);
        if (editStatus.value === 'converted') {
          if (fresh.status !== 'converted') {
            openContratPicker();
          }
        } else if (fresh.status !== editStatus.value) {
          const updated = await reservationApi.updateStatus(id, editStatus.value);
          applyUpdatedReservation(updated);
        }
      }

      showForm.value = false;
      editingReservationId.value = null;

      await loadReservations();
      selectedReservation.value = reservations.value.find(r => r._id === id) || null;
      toast.add({ severity: 'success', summary: 'Réservation modifiée', detail: 'Les modifications ont été enregistrées avec succès.', life: 3500 });
    } finally {
      submitting.value = false;
    }
  });
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

const proceedToAssignAndConfirm = () => {
  if (!selectedReservation.value || !assignCarInput.value) return;
  const id = selectedReservation.value._id;
  const carId = assignCarInput.value;

  requestAdminPassword(async (password: string) => {
    await reservationApi.update(id, { car: carId, password });
    guard.reset();
    showAssignCarDialog.value = false;
    await confirmReservation(id);

    // Automatically proceed to contract form after assigning car if it was triggered from conversion flow
    openContractRefDialog(reservations.value.find(r => r._id === id));
    toast.add({ severity: 'success', summary: 'Véhicule assigné', detail: 'Le véhicule a été assigné avec succès.', life: 3000 });
  });
};

const proceedToChangeCar = () => {
  if (!selectedReservation.value || !assignCarInput.value) return;
  const id = selectedReservation.value._id;
  const carId = assignCarInput.value;

  requestAdminPassword(async (password: string) => {
    await reservationApi.update(id, { car: carId, password });
    guard.reset();
    showAssignCarDialog.value = false;
    await loadReservations();
    selectedReservation.value = reservations.value.find(r => r._id === id) || null;
    toast.add({ severity: 'success', summary: 'Véhicule modifié', detail: 'Le véhicule a été changé avec succès.', life: 3000 });
  });
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


