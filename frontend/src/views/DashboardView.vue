<template>
  <div class="dashboard-container space-y-12 p-8 max-w-7xl mx-auto">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-2">
        <h1 class="text-4xl font-black tracking-tight text-slate-900 uppercase">Panel de <span class="text-indigo-600">Pilotage</span></h1>
        <p class="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] pl-1">Tableau de Bord Stratégique & KPI</p>
      </div>

      <div class="flex items-center gap-3">
         <div v-if="lastUpdated" class="flex flex-col items-end">
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Dernière Mise à Jour</span>
            <span class="text-xs font-bold text-slate-600 tabular-nums">{{ lastUpdated }}</span>
         </div>
      </div>
    </div>

    <!-- KPI Cards Grid -->
    <div :class="['grid grid-cols-1 md:grid-cols-2 gap-8', authStore.isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2']">
      <Card 
        v-for="(kpi, index) in kpis" 
        :key="kpi.label"
        @mouseenter="() => {
          hoveredKpi = index;
          if (kpi.type === 'count') {
            if (kpi.label.includes('total')) startCountUp('totalCars', stats.totalCars);
            else startCountUp('availableCars', stats.availableCars);
          }
        }"
        @mouseleave="hoveredKpi = null"
        :class="['group relative border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] transition-all duration-500 cursor-default active:scale-[0.98]', revenueMenuOwner === kpi.label ? 'overflow-visible z-30' : 'overflow-hidden']"
      >
        <CardContent class="p-8 relative z-10">
          <div class="flex justify-between items-start mb-6">
            <div :class="['p-4 rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-xl border border-white ', kpi.bg]">
              <component :is="kpi.icon" :class="['w-6 h-6', kpi.color]" />
            </div>
            <div class="flex items-center gap-2">
              <div v-if="isPeriodKpi(kpi.label) && authStore.isAdmin" class="revenue-period-menu relative">
                <button
                  @click.stop="revenueMenuOwner = revenueMenuOwner === kpi.label ? null : kpi.label"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition-all outline-none"
                  :title="revenuePeriodLabel"
                >
                  <CalendarRange class="w-3.5 h-3.5" />
                </button>
              <div v-if="revenueMenuOwner === kpi.label" class="absolute right-0 top-10 w-60 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  @click="selectRevenuePeriod('month')"
                  :class="['w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all', revenuePeriod === 'month' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50']"
                >
                  Ce mois
                  <Check v-if="revenuePeriod === 'month'" class="w-3.5 h-3.5" />
                </button>
                <button
                  @click="selectRevenuePeriod('prevMonth')"
                  :class="['w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all', revenuePeriod === 'prevMonth' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50']"
                >
                  Mois dernier
                  <Check v-if="revenuePeriod === 'prevMonth'" class="w-3.5 h-3.5" />
                </button>
                <button
                  @click="revenuePeriod = 'custom'"
                  :class="['w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all', revenuePeriod === 'custom' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50']"
                >
                  Période personnalisée
                  <Check v-if="revenuePeriod === 'custom'" class="w-3.5 h-3.5" />
                </button>
                <div v-if="revenuePeriod === 'custom'" class="p-2 pt-3 space-y-2 border-t border-slate-100 mt-1">
                  <div class="space-y-1.5">
                    <label class="text-[8px] font-black uppercase tracking-widest text-slate-400 pl-1">Du</label>
                    <input type="date" v-model="customFrom" class="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-bold text-slate-700 focus:border-indigo-400" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[8px] font-black uppercase tracking-widest text-slate-400 pl-1">Au</label>
                    <input type="date" v-model="customTo" class="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-bold text-slate-700 focus:border-indigo-400" />
                  </div>
                  <Button
                    @click.stop="applyCustomPeriod"
                    :loading="loadingRevenue"
                    class="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/20"
                  >
                    Appliquer
                  </Button>
                </div>
              </div>
              </div>
              <div v-else-if="kpi.trend" class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest shadow-sm border border-emerald-100">
                <TrendingUp class="w-3.5 h-3.5" />
                {{ kpi.trend }}
              </div>
              <button
                v-if="kpi.sensitive"
                @click.stop="requestProfitReveal"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition-all outline-none"
                :title="profitVisible ? 'Masquer' : 'Afficher'"
              >
                <EyeOff v-if="!profitVisible" class="w-3.5 h-3.5" />
                <Eye v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <div class="space-y-1">
            <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 pl-0.5">{{ t(kpi.label) }}</p>
            <div class="flex items-baseline gap-2">
              <h3 class="text-4xl font-black tracking-tighter tabular-nums italic" :class="kpi.sensitive && !profitVisible ? 'text-slate-300' : 'text-slate-900'">
                <template v-if="kpi.type === 'currency'">
                   <template v-if="kpi.sensitive && !profitVisible">••••••••</template>
                   <template v-else>{{ formatBaseCurrency(kpi.value) }}<span class="text-xs font-black text-indigo-400 ml-1">TND</span></template>
                </template>
                <template v-else>
                  {{ (kpi.label.includes('total') ? displayStats.totalCars : displayStats.availableCars) || kpi.value }}
                </template>
              </h3>
            </div>
            <p v-if="isPeriodKpi(kpi.label) && authStore.isAdmin" class="text-[9px] font-black text-indigo-400 uppercase tracking-widest pl-0.5">{{ loadingRevenue ? 'Chargement...' : revenuePeriodLabel }}</p>
          </div>

          <div 
            v-if="kpi.type === 'currency'" 
            class="absolute bottom-0 left-0 right-0 h-20 opacity-30 group-hover:opacity-100 transition-all duration-1000 pointer-events-none"
          >
            <svg class="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <linearGradient :id="'gradient-' + index" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" :style="{ stopColor: '#6366f1', stopOpacity: 0.1 }" />
                  <stop offset="100%" :style="{ stopColor: '#6366f1', stopOpacity: 0 }" />
                </linearGradient>
              </defs>
              <path :d="kpi.path + ' L100,100 L0,100 Z'" :fill="`url(#gradient-${index})`" />
              <path :d="kpi.path" fill="none" stroke="#6366f1" stroke-width="3" stroke-linecap="round" class="animate-draw" />
            </svg>
          </div>
        </CardContent>
        <div class="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
      </Card>
    </div>

    <!-- Quick Launch Grid -->
    <div :class="['grid grid-cols-2 gap-6', quickActions.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-5']">
       <Button 
        v-for="action in quickActions" 
        :key="action.label"
        variant="secondary"
        @click="router.push(action.route)"
        class="h-28 flex-col gap-4 rounded-[1.8rem] bg-white border border-slate-100 shadow-xl shadow-slate-100/50 hover:bg-slate-50 transition-all group active:scale-95"
      >
        <div :class="['p-3 rounded-2xl text-white shadow-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-6', action.color]">
          <component :is="action.icon" class="w-6 h-6 stroke-[2.5]" />
        </div>
        <span class="text-[9px] font-black text-slate-900 uppercase tracking-widest">{{ action.label }}</span>
      </Button>
    </div>

    <!-- Daily Actions / Monthly Calendar Section -->
    <div class="space-y-6">
      <Card class="border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader class="p-8 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="space-y-1">
            <h2 class="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
              <template v-if="dashboardViewMode === 'today'">
                Actions du <span class="text-indigo-600 italic">Jour</span>
                <span class="relative flex h-3 w-3">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-white"></span>
                </span>
              </template>
              <template v-else>
                Calendrier <span class="text-indigo-600 italic">Mensuel</span>
                <Calendar class="w-6 h-6 text-indigo-600" />
              </template>
            </h2>
            <CardDescription class="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5">
              {{ dashboardViewMode === 'today' ? "Planning opérationnel de départ et retour (Aujourd'hui)" : "Planning mensuel des réservations et contrats par véhicule" }}
            </CardDescription>
          </div>

          <div class="flex flex-wrap items-center gap-3">
             <!-- Action Filter Tabs for Today (Toutes, Départs, Retours) -->
             <div v-if="dashboardViewMode === 'today'" class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                   @click="todayActionFilter = 'all'"
                   :class="['px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all', todayActionFilter === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900']"
                >
                   Toutes ({{ todayActions.length }})
                </button>
                <button
                   @click="todayActionFilter = 'départ'"
                   :class="['px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5', todayActionFilter === 'départ' ? 'bg-indigo-600 text-white shadow font-black' : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50']"
                >
                   <span class="w-2 h-2 rounded-full bg-indigo-400"></span>
                   Départs ({{ todayActions.filter(a => a.type?.toLowerCase() === 'départ').length }})
                </button>
                <button
                   @click="todayActionFilter = 'retour'"
                   :class="['px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5', todayActionFilter === 'retour' ? 'bg-emerald-600 text-white shadow font-black' : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50']"
                >
                   <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                   Retours ({{ todayActions.filter(a => a.type?.toLowerCase() === 'retour').length }})
                </button>
             </div>

             <!-- Calendar Toggle Button (Replaces "Tous les Contrats") -->
             <Button
                variant="outline"
                @click="dashboardViewMode = dashboardViewMode === 'today' ? 'calendar' : 'today'"
                class="h-10 px-5 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 transition-all shadow-sm border-indigo-100 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white"
             >
                <component :is="dashboardViewMode === 'today' ? Calendar : List" class="w-4 h-4" />
                <span>{{ dashboardViewMode === 'today' ? 'Vue Calendrier' : 'Actions du Jour' }}</span>
             </Button>
          </div>
        </CardHeader>

        <CardContent class="p-0">
          <div v-if="loading || (dashboardViewMode === 'calendar' && loadingCalendar)" class="p-20 flex flex-col items-center justify-center space-y-4">
             <Loader2 class="w-10 h-10 text-indigo-200 animate-spin" />
             <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Synchronisation de l'agenda...</p>
          </div>

          <!-- BIG MONTHLY CALENDAR VIEW -->
          <div v-else-if="dashboardViewMode === 'calendar'" class="p-6 space-y-6">
            <!-- Calendar Controls & Filters Header -->
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
              <!-- Month Navigation -->
              <div class="flex items-center gap-3">
                <div class="flex items-center bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                  <Button variant="ghost" size="icon" class="w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100" @click="prevCalendarMonth">
                    <ChevronLeft class="w-4 h-4" />
                  </Button>
                  <span class="px-4 text-xs font-black text-slate-900 uppercase tracking-wider min-w-[140px] text-center italic">
                    {{ calendarMonthYearLabel }}
                  </span>
                  <Button variant="ghost" size="icon" class="w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100" @click="nextCalendarMonth">
                    <ChevronRight class="w-4 h-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" @click="resetCalendarToToday" class="h-10 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white border-slate-200 text-slate-600 hover:bg-slate-100">
                  Aujourd'hui
                </Button>
              </div>

              <!-- Filters: Car Filter & Action Filter -->
              <div class="flex flex-wrap items-center gap-4">
                <!-- Vehicle Filter -->
                <div class="flex items-center gap-2">
                  <label class="text-[9px] font-black uppercase tracking-widest text-slate-400">Véhicule:</label>
                  <select
                    v-model="calendarCarFilter"
                    class="h-10 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all cursor-pointer"
                  >
                    <option value="all">Tous les véhicules ({{ allCars.length }})</option>
                    <option v-for="car in allCars" :key="car._id" :value="car._id">
                      {{ car.brand }} {{ car.model }} — N° Série: {{ car.matricule || 'Sans plaque' }}
                    </option>
                  </select>
                </div>

                <!-- Action Type Filter (Reservation = Yellow, Contrat = Green) -->
                <div class="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                  <button
                    @click="calendarActionFilter = 'all'"
                    :class="['px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all', calendarActionFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900']"
                  >
                    Toutes
                  </button>

                  <!-- Reservation Button (Yellow Color) -->
                  <button
                    @click="calendarActionFilter = 'reservation'"
                    :class="[
                      'px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5',
                      calendarActionFilter === 'reservation' ? 'bg-amber-400 text-amber-950 shadow-md font-black' : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50'
                    ]"
                  >
                    <span class="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600/30"></span>
                    <span>Réservation</span>
                  </button>

                  <!-- Contrat Button (Green Color) -->
                  <button
                    @click="calendarActionFilter = 'contrat'"
                    :class="[
                      'px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5',
                      calendarActionFilter === 'contrat' ? 'bg-emerald-600 text-white shadow-md font-black' : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50'
                    ]"
                  >
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white"></span>
                    <span>Contrat</span>
                  </button>
                </div>

              </div>
            </div>

            <!-- Big Calendar Grid -->
            <div class="border border-slate-200 rounded-3xl overflow-hidden shadow-sm bg-slate-200">
              <!-- Weekday Headers -->
              <div class="grid grid-cols-7 bg-slate-900 text-white text-center font-black text-[10px] tracking-[0.2em] py-3 uppercase">
                <div>Lun</div>
                <div>Mar</div>
                <div>Mer</div>
                <div>Jeu</div>
                <div>Ven</div>
                <div>Sam</div>
                <div>Dim</div>
              </div>

              <!-- Days Grid -->
              <div class="grid grid-cols-7 gap-px bg-slate-200">
                <div
                  v-for="day in calendarGrid"
                  :key="day.dateStr"
                  @click="openDayModal(day)"
                  :class="[
                    'min-h-[130px] p-2 flex flex-col justify-start gap-1 transition-all duration-200 relative group cursor-pointer',
                    day.isCurrentMonth ? 'bg-white hover:bg-indigo-50/30' : 'bg-slate-50/70 text-slate-300',
                    day.isToday ? 'ring-2 ring-indigo-600 ring-inset bg-indigo-50/40' : ''
                  ]"
                >
                  <!-- Day Header -->
                  <div class="flex items-center justify-between w-full mb-1">
                    <span
                      :class="[
                        'text-xs font-black tracking-tight',
                        day.isToday
                          ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200'
                          : (day.isCurrentMonth ? 'text-slate-700' : 'text-slate-300')
                      ]"
                    >
                      {{ day.dayNumber }}
                    </span>
                    <span v-if="getDayEvents(day.dateStr).length > 0" class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                      {{ getDayEvents(day.dateStr).length }} act.
                    </span>
                  </div>

                  <!-- Events in Day Cell -->
                  <div class="flex-1 flex flex-col gap-1 overflow-hidden">
                    <div
                      v-for="evt in getDayEvents(day.dateStr).slice(0, 3)"
                      :key="evt.id + evt.dayType"
                      @click.stop="navigateToEvent(evt)"
                      :class="[
                        'px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-tight flex items-center gap-1.5 transition-all duration-200 truncate cursor-pointer shadow-2xs hover:scale-[1.02]',
                        evt.dayType === 'depart' ? 'bg-rose-500/20 border-rose-300 text-rose-950 hover:bg-rose-500/40'
                          : evt.dayType === 'retour' ? 'bg-emerald-500/20 border-emerald-300 text-emerald-950 hover:bg-emerald-500/40'
                          : 'bg-amber-400/20 border-amber-300 text-amber-950 hover:bg-amber-400/40'
                      ]"
                      :title="`${evt.dayType === 'depart' ? 'Départ' : evt.dayType === 'retour' ? 'Retour' : 'Réservation'}: ${evt.carBrandModel} (${evt.carMatricule}) - ${evt.clientName}`"
                    >
                      <!-- Color Indicator Dot -->
                      <span
                        :class="[
                          'w-2 h-2 rounded-full shrink-0 shadow-2xs',
                          evt.dayType === 'depart' ? 'bg-rose-500' : evt.dayType === 'retour' ? 'bg-emerald-600' : 'bg-amber-500'
                        ]"
                      ></span>

                      <span class="truncate font-black flex items-center gap-1">
                        <span>{{ evt.carBrandModel }}</span>
                        <span v-if="evt.carMatricule && evt.carMatricule !== 'Sans Plaque'" class="text-[7.5px] font-mono text-slate-800 bg-white/70 px-1 rounded border border-slate-300 shrink-0">
                          {{ evt.carMatricule }}
                        </span>
                      </span>

                      <!-- Day Type Badge -->
                      <span v-if="evt.dayType === 'depart'" class="ml-auto text-[7px] font-black opacity-75 shrink-0 px-1 rounded bg-rose-200 text-rose-700">
                        DEP
                      </span>
                      <span v-else-if="evt.dayType === 'retour'" class="ml-auto text-[7px] font-black opacity-75 shrink-0 px-1 rounded bg-emerald-200 text-emerald-700">
                        RET
                      </span>
                    </div>

                    <!-- More indicator -->
                    <div
                      v-if="getDayEvents(day.dateStr).length > 3"
                      class="text-[8px] font-black text-indigo-600 uppercase tracking-widest pt-0.5 text-center hover:underline"
                    >
                      + {{ getDayEvents(day.dateStr).length - 3 }} autre(s)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TODAY ACTIONS TABLE (DEFAULT MODE) -->
          <template v-else-if="filteredTodayActions && filteredTodayActions.length">
            <Table>
              <TableHeader>
                <TableRow class="bg-slate-50/50 border-b border-slate-100">
                  <TableHead class="pl-10 py-5 text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">ACTION & HEURE</TableHead>
                  <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">CLIENTS & DOSSIER</TableHead>
                  <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">VÉHICULE & N° SÉRIE</TableHead>
                  <TableHead class="pr-10 text-right text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">STATUT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="action in filteredTodayActions" :key="action.id + action.type" class="group hover:bg-slate-50/50 transition-all duration-500 cursor-pointer border-slate-100" @click="router.push(action.category === 'contrat' ? `/contrats/${action.id}` : `/reservations?id=${action.id}`)">
                  <TableCell class="pl-10 py-6">
                    <div class="flex items-center gap-4">
                       <Badge :class="['h-10 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest border-2 flex items-center gap-2 shadow-2xs', action.type === 'départ' ? 'bg-indigo-600 text-white border-indigo-200' : 'bg-emerald-600 text-white border-emerald-200']">
                          <span :class="['w-2 h-2 rounded-full', action.type === 'départ' ? 'bg-indigo-300' : 'bg-emerald-300']"></span>
                          {{ action.type }}
                       </Badge>
                       <div class="flex flex-col">
                          <span class="text-sm font-black text-slate-900 tabular-nums italic">{{ new Date(action.date).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) }}</span>
                          <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">{{ action.category }}</span>
                       </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="flex flex-col">
                      <span class="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase text-sm italic">
                        {{ action.clientName }}
                      </span>
                      <div class="flex items-center gap-2 mt-0.5">
                         <Badge variant="outline" class="h-4 px-1.5 rounded-sm border-slate-200 text-[8px] font-black text-slate-400 uppercase tracking-tighter">{{ action.reference || 'REF' }}</Badge>
                         <span class="text-[9px] font-bold text-slate-400 tabular-nums">{{ action.clientPhone }}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div class="flex items-center gap-4">
                       <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-white transition-all overflow-hidden">
                          <img v-if="action.car?.images?.[0]" :src="getImageUrl(action.car.images[0])" class="w-full h-full object-cover" />
                          <CarIcon v-else class="w-5 h-5 text-slate-300" />
                       </div>
                       <div class="flex flex-col">
                          <span class="font-black text-slate-900 uppercase text-xs italic tracking-tight">{{ action.car?.brand }} {{ action.car?.model }}</span>
                          <span class="font-mono text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 w-fit mt-0.5">N° Série: {{ action.car?.matricule || 'Sans Plaque' }}</span>
                       </div>
                    </div>
                  </TableCell>
                  <TableCell class="pr-10 text-right">
                    <Badge :class="['text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm', getStatusBadgeClasses(action.status)]">
                      {{ getStatusLabel(action.status) }}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </template>
          <div v-else class="p-32 flex flex-col items-center justify-center text-center space-y-6">
             <div class="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-200 relative">
                <Calendar class="w-10 h-10" />
                <div class="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white"></div>
             </div>
             <div class="space-y-1">
                <p class="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Agenda Calme</p>
                <p class="text-[9px] font-bold text-slate-400 uppercase italic">Aucune action planifiée pour aujourd'hui</p>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Day Action Details Modal Dialog -->
    <Dialog v-model:open="showDayModal">
      <DialogContent v-if="selectedDayData" class="sm:max-w-xl bg-white border-none shadow-2xl rounded-[2.5rem] p-8 overflow-y-auto max-h-[85vh] no-scrollbar">
        <div class="space-y-6">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <DialogTitle class="text-2xl font-black text-slate-900 uppercase tracking-tight">
                Actions du <span class="text-indigo-600 italic">{{ selectedDayData.dateFormatted }}</span>
              </DialogTitle>
              <p class="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
                {{ selectedDayData.events.length }} action(s) répertoriée(s) pour cette date
              </p>
            </div>
          </div>

          <div class="space-y-3">
            <div
              v-for="evt in selectedDayData.events"
              :key="evt.id + evt.dayType"
              @click="navigateToEvent(evt)"
              :class="[
                'p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 group hover:shadow-lg',
                evt.dayType === 'depart' ? 'border-rose-200 bg-rose-50/40 hover:border-rose-400'
                  : evt.dayType === 'retour' ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400'
                  : 'border-amber-200 bg-amber-50/40 hover:border-amber-400'
              ]"
            >
              <div class="flex items-center gap-4">
                <div
                  :class="[
                    'w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs shadow-md shrink-0 uppercase',
                    evt.dayType === 'depart' ? 'bg-rose-600 text-white'
                      : evt.dayType === 'retour' ? 'bg-emerald-600 text-white'
                      : 'bg-amber-400 text-amber-950'
                  ]"
                >
                  {{ evt.dayType === 'depart' ? 'DEP' : evt.dayType === 'retour' ? 'RET' : 'RES' }}
                </div>

                <div class="flex flex-col">
                  <div class="flex items-center gap-2">
                    <span class="font-black text-slate-900 uppercase text-sm italic group-hover:text-indigo-600 transition-colors">
                      {{ evt.carBrandModel }}
                    </span>
                    <Badge variant="outline" class="text-[8px] font-black uppercase border-slate-200">
                      {{ evt.carMatricule }}
                    </Badge>
                  </div>

                  <span class="text-xs font-bold text-slate-600 uppercase mt-0.5">
                    Client: <span class="font-black text-slate-900">{{ evt.clientName }}</span>
                  </span>

                  <div class="flex items-center gap-3 text-[9px] font-bold text-slate-400 mt-1">
                    <span>Du {{ evt.startDateStr }}</span>
                    <span>•</span>
                    <span>Au {{ evt.endDateStr }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <!-- Action Type: Départ / Retour -->
                <Badge
                  v-if="evt.dayType === 'depart'"
                  class="text-[8px] font-black uppercase px-3 py-1 rounded-full bg-rose-600 text-white border border-rose-500 shadow-xs"
                >
                  DÉPART
                </Badge>
                <Badge
                  v-else-if="evt.dayType === 'retour'"
                  class="text-[8px] font-black uppercase px-3 py-1 rounded-full bg-emerald-600 text-white border border-emerald-500 shadow-xs"
                >
                  RETOUR
                </Badge>
                <Badge
                  v-else
                  class="text-[8px] font-black uppercase px-3 py-1 rounded-full bg-amber-400 text-amber-950 border border-amber-500 shadow-xs"
                >
                  RÉSERVATION
                </Badge>

                <!-- Category: Contrat / Réservation -->
                <Badge
                  :class="[
                    'text-[8px] font-black uppercase px-3 py-1 rounded-full border',
                    evt.category === 'reservation'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  ]"
                >
                  {{ evt.category === 'reservation' ? 'RÉSERVATION' : 'CONTRAT' }}
                </Badge>

                <ArrowRight class="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Floating Converter Button -->
    <Teleport to="body">
      <button @click="showConverterModal = true" class="fixed bottom-10 right-10 z-[100] w-16 h-16 bg-indigo-600 hover:bg-indigo-700 rounded-[2rem] shadow-[0_10px_40px_rgba(79,70,229,0.5)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all outline-none border-4 border-white backdrop-blur-md group">
        <Calculator class="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300 drop-shadow-md" />
      </button>
    </Teleport>

    <!-- Smart Converter Dialog -->
    <Dialog v-model:open="showConverterModal">
      <DialogContent class="sm:max-w-2xl bg-white border-none shadow-2xl rounded-[2.5rem] p-10 overflow-y-auto max-h-[90vh] no-scrollbar">
        <div class="flex flex-col space-y-8">
           <div class="flex items-center gap-5">
              <div class="p-4 bg-indigo-50 rounded-2xl">
                 <Calculator class="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                 <DialogTitle class="text-3xl font-black text-slate-900 uppercase tracking-tight">Convertisseur <span class="text-indigo-600 italic">Intelligent</span></DialogTitle>
                 <p class="text-[10px] font-black uppercase tracking-widest text-indigo-400">Cours du marché en temps réel</p>
              </div>
           </div>

           <div class="space-y-6">
              <!-- Currency Selector -->
              <div class="flex justify-center gap-2 p-1 bg-slate-100 rounded-2xl">
                 <button 
                  v-for="curr in currencies" 
                  :key="curr.label"
                  @click="converter.currency = curr.label"
                  :class="[
                    'flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300',
                    converter.currency === curr.label ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  ]"
                 >
                   {{ curr.label }}
                 </button>
              </div>

              <div class="relative group">
                <Input type="number" v-model="converter.amount" class="h-24 bg-slate-50 border-slate-100 text-slate-900 font-black text-5xl px-10 rounded-[2rem] text-center focus:ring-4 focus:ring-indigo-600/5 transition-all shadow-inner" />
                <div class="absolute right-8 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-100 transition-opacity">
                  <span class="text-2xl font-black text-indigo-600 italic uppercase">{{ converter.currency }}</span>
                </div>
              </div>
              
              <div class="grid grid-cols-3 gap-4 font-black">
                 <div v-for="res in convertedValues.converter" :key="res.label" 
                  :class="[
                    'p-6 rounded-[1.5rem] border-2 transition-all duration-500 flex flex-col items-center justify-center gap-1',
                    res.label === converter.currency ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 text-slate-900'
                  ]"
                 >
                    <span :class="['text-[9px] uppercase tracking-[0.2em]', res.label === converter.currency ? 'text-indigo-200' : 'text-slate-400']">{{ res.label }}</span>
                    <span class="text-lg tabular-nums italic">{{ res.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }} <span class="text-[10px] opacity-50 not-italic ml-1">{{ res.symbol }}</span></span>
                 </div>
              </div>
           </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Sensitive KPI Password Dialog -->
    <Dialog :open="showProfitPwdModal" @update:open="(val: boolean) => { if (!val) showProfitPwdModal = false }">
      <DialogContent class="sm:max-w-md bg-white border-none shadow-2xl rounded-[2rem] p-8">
        <DialogTitle class="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <EyeOff class="w-5 h-5 text-indigo-600" />
          Mot de passe requis
        </DialogTitle>
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Pour afficher les données financières</p>
        <div class="mt-4 space-y-3">
          <Input
            type="password"
            v-model="profitPwd"
            placeholder="Mot de passe"
            class="h-12 bg-slate-50 border-slate-100 rounded-xl font-bold"
            @keyup.enter="confirmProfitReveal"
          />
          <p v-if="profitPwdError" class="text-[10px] font-black text-rose-500 uppercase tracking-widest">Mot de passe incorrect</p>
          <div class="flex justify-end gap-2 pt-2">
            <Button variant="secondary" @click="showProfitPwdModal = false" class="rounded-xl h-10 px-5 text-[10px] font-black uppercase tracking-widest">
              Annuler
            </Button>
            <Button :loading="verifyingProfitPwd" @click="confirmProfitReveal" class="rounded-xl h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20">
              Valider
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { dashboardApi, contratApi, reservationApi, carApi, getImageUrl, authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import {
  Car as CarIcon, FileText, Users, Calendar, Wallet,
  TrendingUp, CheckCircle2,
  DollarSign, Calculator, CalendarRange, Check,
  Search, Loader2, ShieldAlert, Bell,
  ChevronLeft, ChevronRight, List, ArrowRight,
  Eye, EyeOff
} from 'lucide-vue-next'
import { 
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell 
} from '@/components/ui/table'
import { Card, CardHeader, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const stats = ref<any>({})
const alerts = ref<any[]>([])
const todayActions = ref<any[]>([])
const loading = ref(true)
const lastUpdated = ref<string>('')
const hoveredKpi = ref<number | null>(null)
const history = ref<any[]>([])
const showConverterModal = ref(false)

// Dashboard View Mode
const dashboardViewMode = ref<'today' | 'calendar'>('today')

// Today Actions State & Filter
const todayActionFilter = ref<'all' | 'départ' | 'retour'>('all')

const filteredTodayActions = computed(() => {
  if (!todayActions.value) return []
  if (todayActionFilter.value === 'all') return todayActions.value
  return todayActions.value.filter(a => a.type?.toLowerCase() === todayActionFilter.value)
})

// Big Calendar State
const allContrats = ref<any[]>([])
const allReservations = ref<any[]>([])
const allCars = ref<any[]>([])
const loadingCalendar = ref(false)
const calendarCurrentDate = ref(new Date())
const calendarCarFilter = ref<string>('all')
const calendarActionFilter = ref<'all' | 'reservation' | 'contrat'>('all')

// Selected Day Modal State
const selectedDayData = ref<{ dateStr: string; dateFormatted: string; events: any[] } | null>(null)
const showDayModal = ref(false)

// Revenue Period State
type RevenuePeriod = 'month' | 'prevMonth' | 'custom'
const revenuePeriod = ref<RevenuePeriod>('month')
const customFrom = ref('')
const customTo = ref('')
const revenueMenuOwner = ref<string | null>(null)
const loadingRevenue = ref(false)

const isPeriodKpi = (label: string) => label === 'dashboard.revenue' || label === 'dashboard.profit'

const toLocalDateTime = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`

const formatDateStr = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const calendarMonthYearLabel = computed(() => {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]
  const d = calendarCurrentDate.value
  return `${months[d.getMonth()]} ${d.getFullYear()}`
})

const prevCalendarMonth = () => {
  const d = calendarCurrentDate.value
  calendarCurrentDate.value = new Date(d.getFullYear(), d.getMonth() - 1, 1)
}

const nextCalendarMonth = () => {
  const d = calendarCurrentDate.value
  calendarCurrentDate.value = new Date(d.getFullYear(), d.getMonth() + 1, 1)
}

const resetCalendarToToday = () => {
  calendarCurrentDate.value = new Date()
}

interface CalendarGridDay {
  date: Date
  dateStr: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
}

const calendarGrid = computed<CalendarGridDay[]>(() => {
  const year = calendarCurrentDate.value.getFullYear()
  const month = calendarCurrentDate.value.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  let startDayOfWeek = firstDayOfMonth.getDay() - 1
  if (startDayOfWeek < 0) startDayOfWeek = 6

  const todayStr = formatDateStr(new Date())
  const days: CalendarGridDay[] = []

  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i)
    const dateStr = formatDateStr(d)
    days.push({
      date: d,
      dateStr,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === todayStr
    })
  }

  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const d = new Date(year, month, day)
    const dateStr = formatDateStr(d)
    days.push({
      date: d,
      dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr
    })
  }

  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      const dateStr = formatDateStr(d)
      days.push({
        date: d,
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr
      })
    }
  }

  return days
})

const calendarEvents = computed(() => {
  const events: any[] = []

  // Process Contrats (exclude cancelled)
  for (const c of allContrats.value) {
    if (!c.startDate || !c.endDate) continue
    const status = String(c.status || 'active').toLowerCase()
    if (status === 'cancelled' || status === 'annulé') continue

    const carObj = c.car || {}
    const clientsList = Array.isArray(c.clients) ? c.clients : []
    const firstClient = clientsList[0] || null
    const clientName = firstClient
      ? `${firstClient.lastName || ''} ${firstClient.firstName || ''}`.trim()
      : (c.clientName || 'Client')

    const startD = new Date(c.startDate)
    const endD = new Date(c.endDate)

    events.push({
      id: c._id || c.id,
      category: 'contrat',
      reference: c.reference || 'CTR',
      carId: carObj._id || carObj.id,
      carBrandModel: carObj.brand ? `${carObj.brand} ${carObj.model || ''}`.trim() : 'Véhicule',
      carMatricule: carObj.matricule || 'Sans Plaque',
      clientName,
      startDateStr: formatDateStr(startD),
      endDateStr: formatDateStr(endD),
      status: c.status || 'active',
      raw: c
    })
  }

  // Process Reservations (exclude cancelled and pending/planifiée)
  for (const r of allReservations.value) {
    if (!r.startDate || !r.endDate) continue
    const status = String(r.status || 'pending').toLowerCase()
    if (status === 'cancelled' || status === 'annulé' || status === 'pending' || status === 'planifié' || status === 'planifiee') continue

    const carObj = r.car || {}
    const clientsList = Array.isArray(r.clients) ? r.clients : []
    const firstClient = clientsList[0] || null
    const clientName = r.clientName || (firstClient ? `${firstClient.lastName || ''} ${firstClient.firstName || ''}`.trim() : 'Client')

    const startD = new Date(r.startDate)
    const endD = new Date(r.endDate)

    events.push({
      id: r._id || r.id,
      category: 'reservation',
      reference: 'RES',
      carId: carObj._id || carObj.id,
      carBrandModel: carObj.brand ? `${carObj.brand} ${carObj.model || ''}`.trim() : 'Non Assigné',
      carMatricule: carObj.matricule || 'Sans Plaque',
      clientName,
      startDateStr: formatDateStr(startD),
      endDateStr: formatDateStr(endD),
      status: r.status || 'pending',
      raw: r
    })
  }

  return events
})

const filteredCalendarEvents = computed(() => {
  return calendarEvents.value.filter(evt => {
    if (calendarActionFilter.value !== 'all' && evt.category !== calendarActionFilter.value) {
      return false
    }
    if (calendarCarFilter.value !== 'all') {
      if (evt.carId !== calendarCarFilter.value) return false
    }
    return true
  })
})

const getDayEvents = (dateStr: string) => {
  return filteredCalendarEvents.value.reduce<any[]>((acc, evt) => {
    if (dateStr < evt.startDateStr || dateStr > evt.endDateStr) return acc

    const isStart = dateStr === evt.startDateStr
    const isEnd = dateStr === evt.endDateStr

    if (evt.category === 'reservation') {
      acc.push({ ...evt, dayType: 'reservation' })
    } else if (isStart) {
      acc.push({ ...evt, dayType: 'depart' })
    } else if (isEnd) {
      acc.push({ ...evt, dayType: 'retour' })
    }

    return acc
  }, [])
}

const openDayModal = (day: CalendarGridDay) => {
  const events = getDayEvents(day.dateStr)
  if (!events.length) return

  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  const formatted = day.date.toLocaleDateString('fr-FR', options)

  selectedDayData.value = {
    dateStr: day.dateStr,
    dateFormatted: formatted.charAt(0).toUpperCase() + formatted.slice(1),
    events
  }
  showDayModal.value = true
}

const navigateToEvent = (evt: any) => {
  showDayModal.value = false
  if (evt.category === 'contrat') {
    router.push(`/contrats/${evt.id}`)
  } else {
    router.push(`/reservations?id=${evt.id}`)
  }
}

const getPeriodRange = (): { from?: string; to?: string } => {
  const now = new Date()
  if (revenuePeriod.value === 'month') {
    return {
      from: toLocalDateTime(new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)),
      to: toLocalDateTime(now)
    }
  }
  if (revenuePeriod.value === 'prevMonth') {
    return {
      from: toLocalDateTime(new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0)),
      to: toLocalDateTime(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59))
    }
  }
  return {
    from: customFrom.value ? toLocalDateTime(new Date(customFrom.value + 'T00:00:00')) : '',
    to: customTo.value ? toLocalDateTime(new Date(customTo.value + 'T23:59:59')) : ''
  }
}

const revenuePeriodLabel = computed(() => {
  const now = new Date()
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  if (revenuePeriod.value === 'month') {
    return `${months[now.getMonth()]} ${now.getFullYear()}`
  }
  if (revenuePeriod.value === 'prevMonth') {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return `${months[d.getMonth()]} ${d.getFullYear()}`
  }
  return customFrom.value && customTo.value ? `Du ${customFrom.value} au ${customTo.value}` : 'Période personnalisée'
})

const selectRevenuePeriod = (p: RevenuePeriod) => {
  revenuePeriod.value = p
  revenueMenuOwner.value = null
  loadRevenue()
}

const applyCustomPeriod = () => {
  if (!customFrom.value || !customTo.value) return
  revenueMenuOwner.value = null
  loadRevenue()
}

const loadRevenue = async () => {
  if (!authStore.isAdmin) return
  loadingRevenue.value = true
  try {
    const range = getPeriodRange()
    const data = await dashboardApi.getStats(range)
    if (stats.value) {
      stats.value.totalRevenue = data.kpis?.totalRevenue ?? 0
      stats.value.netProfit = data.kpis?.netProfit ?? 0
    }
  } catch (err) {
    console.error('Failed to load revenue for period', err)
  } finally {
    loadingRevenue.value = false
  }
}

const onDocClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (revenueMenuOwner.value && !target.closest('.revenue-period-menu')) {
    revenueMenuOwner.value = null
  }
}

// Animation State for Count-Up
const displayStats = reactive({
  totalCars: 0,
  availableCars: 0
})

const startCountUp = (key: 'totalCars' | 'availableCars', target: number) => {
  displayStats[key] = target
}

const currencies = ref([
  { label: 'TND', icon: 'Globe', rate: 1, symbol: 'TND' },
  { label: 'EUR', icon: 'Euro', rate: 0.296, symbol: '€' },
  { label: 'USD', icon: 'DollarSign', rate: 0.342, symbol: '$' }
])
const activeCurrency = ref(currencies.value[0])

const converter = reactive({
  amount: 1000,
  currency: 'TND'
})

const convertedValues = computed(() => {
  const amt = converter.amount || 0
  
  const eurRate = currencies.value.find(c => c.label === 'EUR')?.rate || 0.296
  const usdRate = currencies.value.find(c => c.label === 'USD')?.rate || 0.342

  let tnd = 0
  if (converter.currency === 'TND') tnd = amt
  else if (converter.currency === 'EUR') tnd = amt / eurRate
  else if (converter.currency === 'USD') tnd = amt / usdRate

  return {
    converter: [
      { label: 'TND', value: tnd, symbol: 'TND' },
      { label: 'EUR', value: tnd * eurRate, symbol: '€' },
      { label: 'USD', value: tnd * usdRate, symbol: '$' }
    ]
  }
})

const fetchLiveRates = async () => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/TND')
    const data = await response.json()
    if (data.result === 'success') {
      currencies.value = [
        { label: 'TND', icon: 'Globe', rate: 1, symbol: 'TND' },
        { label: 'EUR', icon: 'Euro', rate: data.rates.EUR, symbol: '€' },
        { label: 'USD', icon: 'DollarSign', rate: data.rates.USD, symbol: '$' }
      ]
      const currentActiveLabel = activeCurrency.value.label
      activeCurrency.value = currencies.value.find(c => c.label === currentActiveLabel) || currencies.value[0]
      lastUpdated.value = new Date().toLocaleTimeString('fr-TN')
    }
  } catch (err) {
    console.error('Failed to fetch live rates', err)
  }
}
const formatBaseCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-TN', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount || 0)
}

const generateSparklinePath = (data: number[]) => {
  if (!data || data.length < 2) return 'M0,80 Q50,20 100,80'
  const width = 100, height = 100
  const max = Math.max(...data, 1), min = Math.min(...data, 0), range = max - min || 1
  const points = data.map((val, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((val - min) / range) * 70 - 15
  }))
  let path = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p1 = points[i + 1]
    path += ` Q${p0.x},${p0.y} ${(p0.x + p1.x) / 2},${(p0.y + p1.y) / 2}`
  }
  path += ` L${points[points.length - 1].x},${points[points.length - 1].y}`
  return path
}

const kpis = computed(() => {
  const base: any[] = [
    { label: 'dashboard.totalCars', value: stats.value.totalCars || 0, icon: CarIcon, color: 'text-indigo-600', bg: 'bg-indigo-50  border-indigo-100 ', type: 'count' },
    { label: 'dashboard.available', value: stats.value.availableCars || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50  border-emerald-100 ', type: 'count' }
  ]
  if (authStore.isAdmin) {
    base.push(
      { label: 'dashboard.revenue', value: stats.value.totalRevenue || 0, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50  border-indigo-100 ', type: 'currency', sensitive: true, path: generateSparklinePath(history.value.map(h => h.revenue)) },
      { label: 'dashboard.profit', value: stats.value.netProfit || 0, icon: Wallet, color: 'text-rose-600', bg: 'bg-rose-50  border-rose-100 ', type: 'currency', sensitive: true, path: generateSparklinePath(history.value.map(h => h.profit)) }
    )
  }
  return base
})

const profitVisible = ref(false)
const showProfitPwdModal = ref(false)
const profitPwd = ref('')
const profitPwdError = ref(false)
const verifyingProfitPwd = ref(false)

const requestProfitReveal = () => {
  if (profitVisible.value) {
    profitVisible.value = false
    return
  }
  profitPwd.value = ''
  profitPwdError.value = false
  showProfitPwdModal.value = true
}

const confirmProfitReveal = async () => {
  verifyingProfitPwd.value = true
  try {
    const res = await authApi.verifyPassword(profitPwd.value)
    if (res?.valid) {
      profitVisible.value = true
      showProfitPwdModal.value = false
    } else {
      profitPwdError.value = true
    }
  } catch {
    profitPwdError.value = true
  } finally {
    verifyingProfitPwd.value = false
  }
}

const quickActions = computed(() => {
  const actions = [
    { label: 'Location Directe', icon: FileText, color: 'bg-indigo-600', route: '/contrats/new' },
    { label: 'Disponibilité', icon: Search, color: 'bg-emerald-600', route: '/availability' },
    { label: 'Réservation', icon: Calendar, color: 'bg-indigo-600', route: '/reservations?add=true' },
    { label: 'Nouveau Client', icon: Users, color: 'bg-slate-500', route: '/clients' },
  ]
  
  if (authStore.isAdmin) {
    actions.push({ label: 'Ajout Véhicule', icon: CarIcon, color: 'bg-indigo-400', route: '/cars?add=true' })
  }
  
  return actions
})

const getStatusLabel = (status: string) => {
  if (!status) return '---';
  const s = status.toLowerCase();
  switch (s) {
    case 'active':
    case 'confirmed': return 'ACTIF';
    case 'soon': return 'À VENIR';
    case 'pending': return 'EN ATTENTE';
    case 'closed':
    case 'terminé': return 'TERMINÉ';
    case 'clôturé': return 'CLÔTURÉ';
    case 'cancelled': return 'ANNULÉ';
    default: return s.toUpperCase();
  }
};

const getStatusBadgeClasses = (status: string) => {
  if (!status) return 'bg-slate-50 border-slate-100';
  const s = status.toLowerCase();
  switch (s) {
    case 'active':
    case 'confirmed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'soon': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'closed':
    case 'terminé': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    case 'clôturé': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
    case 'cancelled': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
    default: return 'bg-slate-50 border-slate-100';
  }
};

const loadCalendarData = async () => {
  loadingCalendar.value = true
  try {
    const [contrats, reservations, cars] = await Promise.all([
      contratApi.getAll(),
      reservationApi.getAll(),
      carApi.getAll()
    ])
    allContrats.value = contrats || []
    allReservations.value = reservations || []
    allCars.value = cars || []
  } catch (err) {
    console.error('Failed to load calendar data', err)
  } finally {
    loadingCalendar.value = false
  }
}

const loadDashboardData = async () => {
  try {
    const [dashData] = await Promise.all([
      dashboardApi.getStats(getPeriodRange()),
      fetchLiveRates(),
      loadCalendarData()
    ])
    stats.value = dashData.kpis || {}
    alerts.value = dashData.alerts || []
    todayActions.value = dashData.todayActions || []
    history.value = dashData.history || []
    setTimeout(() => {
      startCountUp('totalCars', stats.value.totalCars || 0)
      startCountUp('availableCars', stats.value.availableCars || 0)
    }, 400)
  } catch (err) {
    console.error('Failed to load dashboard data', err)
  }
}

// Live fleet tracking moved to FleetMapView.vue

onMounted(async () => {
  loading.value = true
  document.addEventListener('click', onDocClick)
  await loadDashboardData()
  loading.value = false
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
})
</script>


