<template>
  <div ref="pageRoot" :class="['flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 overflow-hidden', isFullScreen ? 'h-screen' : (isElectron ? 'h-[calc(100vh-7.375rem)]' : 'h-[calc(100vh-5rem)]')]">
    <!-- Header (page-level controls) -->
    <header class="shrink-0 px-4 md:px-10 pt-5 pb-4 flex items-center gap-4 flex-wrap">
      <div class="min-w-0">
        <h1 class="text-3xl md:text-4xl font-black tracking-tight text-slate-900 uppercase flex items-center gap-2.5 truncate">
          Suivi <span class="text-indigo-600 italic">Flotte</span>
          <span class="relative flex h-2.5 w-2.5 shrink-0">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
          </span>
        </h1>
        <p class="hidden md:block text-[8px] font-black text-slate-400 uppercase tracking-widest pl-0.5 truncate">
          Tracker live · chaque seconde · dernière mise à jour {{ lastUpdateLabel }}
        </p>
      </div>

      <div class="ml-auto flex items-center gap-2 md:gap-3 flex-wrap justify-end">
        <!-- Following chip -->
        <div v-if="followedCar" class="bg-indigo-600 text-white rounded-full pl-4 pr-2 py-2 shadow-lg shadow-indigo-600/25 flex items-center gap-2.5">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
          </span>
          <span class="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Suivi · {{ followedCar.matricule }}</span>
          <button @click="stopFollowing" class="w-6 h-6 rounded-full bg-white/20 hover:bg-white/35 transition-colors flex items-center justify-center shrink-0">
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Map style toggle -->
        <div v-if="gpsPositions.length" class="bg-white rounded-full p-1 shadow-lg border border-slate-100 flex items-center gap-1">
          <button @click="mapStyle = 'satellite'"
            :class="['flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all',
              mapStyle === 'satellite' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900']">
            <Satellite class="w-3.5 h-3.5" /> Satellite
          </button>
          <button @click="mapStyle = 'plan'"
            :class="['flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all',
              mapStyle === 'plan' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-900']">
            <MapIcon class="w-3.5 h-3.5" /> Plan
          </button>
        </div>

        <!-- Flotte rectangle button -->
        <button @click="toggleList"
          :class="['h-11 pl-4 pr-2.5 rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg border flex items-center gap-2 active:scale-95 transition-all',
            showList ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50']">
          <CarIcon :class="['w-4 h-4', showList ? 'text-emerald-400' : 'text-indigo-600']" />
          Flotte
          <span class="min-w-[20px] h-5 px-1 rounded-lg bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center">{{ gpsPositions.length }}</span>
        </button>

        <!-- Fullscreen -->
        <button @click="toggleFullScreen" :title="isFullScreen ? 'Quitter le plein écran' : 'Plein écran'"
          class="w-11 h-11 rounded-2xl bg-white shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all shrink-0">
          <component :is="isFullScreen ? Minimize2 : Maximize2" class="w-4 h-4 text-slate-600" />
        </button>

        <!-- Refresh -->
        <button @click="fetchGpsPositions()" class="w-11 h-11 rounded-2xl bg-white shadow-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all shrink-0">
          <RefreshCw :class="['w-4 h-4 text-slate-600', loading ? 'animate-spin' : '']" />
        </button>
      </div>
    </header>

    <!-- Map view area (sliders constrained here, below the top bar) -->
    <div class="relative flex-1 min-h-0">
      <main class="w-full h-full px-4 md:px-10 pb-6">
      <div class="relative w-full h-full rounded-[2.5rem] overflow-hidden border-[3px] border-slate-200 shadow-2xl shadow-slate-300/40 bg-slate-900 z-0">
        <div ref="mapEl" class="absolute inset-0"></div>

        <div v-if="loading" class="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10">
          <LoaderIcon class="w-10 h-10 animate-spin text-indigo-600" />
        </div>
        <div v-else-if="!gpsPositions.length" class="absolute inset-0 bg-slate-50/95 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
          <MapPin class="w-14 h-14 text-slate-300 stroke-1" />
          <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Aucune position GPS pour le moment</p>
          <p class="text-[9px] font-bold uppercase tracking-widest text-slate-300">Vérifiez l'IMEI ou la plaque des véhicules</p>
        </div>

        <!-- ── Online / En mouvement — bottom-left widget ─────────────────── -->
        <div v-if="movingCars.length" class="absolute left-4 bottom-4 z-[450] w-[230px] flex flex-col gap-2 items-stretch">
          <button v-for="p in movingCarsPreview" :key="p.carId" @click="selectOnlineCar(p)"
            class="group bg-white/95 backdrop-blur-md rounded-2xl pl-2.5 pr-3 py-2 shadow-xl shadow-slate-900/10 border border-slate-100 flex items-center gap-2.5 text-left transition-all hover:border-emerald-300 hover:shadow-2xl active:scale-[0.97]">
            <span class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" :style="{ background: colorFor(p) }">
              <span v-html="carIconSvg(colorFor(p))"></span>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-[10px] font-black text-slate-900 uppercase tracking-wider leading-none truncate">{{ p.matricule }}</span>
              <span class="flex items-center gap-1.5 mt-1">
                <span class="text-[9px] font-black tabular-nums text-slate-900">{{ Math.round(p.speed || 0) }} km/h</span>
              </span>
            </span>
            <span class="relative flex h-2 w-2 shrink-0">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>

          <button v-if="movingCars.length > 3" @click="showMovingSheet = true"
            class="bg-slate-900/90 backdrop-blur-md text-white rounded-2xl px-3.5 py-2.5 shadow-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all hover:bg-slate-900 active:scale-[0.97]">
            Voir tout · {{ movingCars.length }}
            <ChevronUp class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- ── Bottom slider (all moving cars) ────────────────────────────── -->
        <transition enter-active-class="transition-transform duration-300 ease-out" enter-from-class="translate-y-full" enter-to-class="translate-y-0"
          leave-active-class="transition-transform duration-250 ease-in" leave-from-class="translate-y-0" leave-to-class="translate-y-full">
          <div v-if="showMovingSheet" class="absolute inset-x-0 bottom-0 z-[550] bg-white rounded-t-[2rem] shadow-2xl border-t border-slate-200 flex flex-col max-h-[62%]">
            <div class="shrink-0 pt-3 pb-2 flex justify-center">
              <span class="w-10 h-1.5 rounded-full bg-slate-200"></span>
            </div>
            <div class="shrink-0 px-6 pb-3 flex items-center gap-3">
              <div class="min-w-0">
                <p class="text-sm font-black uppercase italic tracking-tighter text-slate-900 leading-tight">
                  En <span class="text-emerald-500">Mouvement</span>
                </p>
                <p class="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{{ movingCars.length }} véhicule(s) actif(s)</p>
              </div>
              <button @click="showMovingSheet = false" class="ml-auto w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center shrink-0">
                <X class="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div class="flex-1 overflow-y-auto no-scrollbar px-4 pb-5 pt-1 space-y-2">
              <button v-for="p in movingCars" :key="p.carId" @click="selectOnlineCar(p)"
                :class="['w-full flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-2xl border transition-all active:scale-[0.98]',
                  String(selectedCar?._id) === String(p.carId) ? 'border-indigo-400 bg-indigo-50' : 'border-slate-100 hover:border-emerald-200 hover:bg-slate-50']">
                <span class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" :style="{ background: colorFor(p) }">
                  <span v-html="carIconSvg(colorFor(p))"></span>
                </span>
                <span class="text-left min-w-0 flex-1">
                  <span class="block text-[11px] font-black text-slate-900 uppercase tracking-wider leading-none truncate">{{ p.matricule }}</span>
                  <span class="block text-[8px] font-bold text-slate-400 mt-1 truncate">{{ p.brand }} {{ p.model }}</span>
                </span>
                <span class="text-[10px] font-black tabular-nums text-slate-900 shrink-0">{{ Math.round(p.speed || 0) }} km/h</span>
                <span class="relative flex h-2 w-2 shrink-0">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </button>
            </div>
          </div>
        </transition>

      </div>
    </main>

      <!-- Right slider (car list) -->
      <transition enter-active-class="transition-transform duration-300 ease-out" enter-from-class="translate-x-full" enter-to-class="translate-x-0"
        leave-active-class="transition-transform duration-200 ease-in" leave-from-class="translate-x-0" leave-to-class="translate-x-full">
        <div v-if="showList" class="absolute top-0 bottom-0 right-0 z-[600] w-[340px] max-w-[88vw] bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div class="flex items-center justify-between px-5 pt-5 pb-1 shrink-0">
          <span class="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
            <CarIcon class="w-4 h-4 text-indigo-600" /> Flotte
          </span>
          <button @click="showList = false" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center">
            <X class="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <p class="px-5 pb-3 text-[8px] font-black uppercase tracking-widest text-slate-400">{{ gpsPositions.length }} véhicule(s) suivis</p>

        <div class="flex-1 overflow-y-auto no-scrollbar px-3 pb-4 space-y-2">
          <button v-for="p in sortedPositions" :key="p.carId" @click="selectFromList(p)"
            :class="['w-full flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-2xl border transition-all active:scale-[0.98]',
              String(selectedCar?._id) === String(p.carId) ? 'border-indigo-400 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50']">
            <span class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" :style="{ background: colorFor(p) }">
              <span v-html="carIconSvg(colorFor(p))"></span>
            </span>
            <span class="text-left min-w-0 flex-1">
              <span class="block text-[11px] font-black text-slate-900 uppercase tracking-wider leading-none truncate">{{ p.matricule }}</span>
              <span class="flex items-center gap-2 mt-1">
                <span class="text-[10px] font-black tabular-nums text-slate-900">{{ Math.round(p.speed || 0) }} km/h</span>
                <span :class="['text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border', statusClass(p)]">{{ statusLabel(p) }}</span>
              </span>
            </span>
            <span v-if="p.rental" class="w-2 h-2 rounded-full bg-indigo-500 shrink-0" title="Loué"></span>
          </button>
          <p v-if="!gpsPositions.length" class="text-[9px] font-black uppercase tracking-widest text-slate-300 px-3 py-6 text-center">Aucun véhicule</p>
        </div>

        <div class="shrink-0 px-5 py-4 border-t border-slate-100 space-y-2 bg-slate-50/60">
          <p class="text-[8px] font-black uppercase tracking-widest text-slate-400">Légende</p>
          <div v-for="item in legend" :key="item.label" class="flex items-center gap-2.5">
            <span class="w-3 h-3 rounded-full border-2 border-white shadow" :style="{ background: item.color }"></span>
            <span class="text-[8px] font-black uppercase tracking-widest text-slate-500">{{ item.label }}</span>
          </div>
        </div>
      </div>
    </transition>

      <!-- Right slider (car details) -->
      <transition enter-active-class="transition-transform duration-300 ease-out" enter-from-class="translate-x-full" enter-to-class="translate-x-0"
        leave-active-class="transition-transform duration-200 ease-in" leave-from-class="translate-x-0" leave-to-class="translate-x-full">
        <div v-if="selectedCar" class="absolute top-0 bottom-0 right-0 z-[700] w-[340px] max-w-[90vw] bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div class="flex items-start justify-between gap-2 px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
          <div class="min-w-0 flex items-center gap-3">
            <span class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :style="{ background: colorFor(selectedCar) }">
              <span v-html="carIconSvg(colorFor(selectedCar))"></span>
            </span>
            <div class="min-w-0">
              <p class="text-base font-black text-slate-900 uppercase tracking-wider truncate">{{ selectedCar.matricule }}</p>
              <p class="text-[9px] font-bold uppercase tracking-widest text-slate-400 truncate mt-0.5">{{ selectedCar.brand }} {{ selectedCar.model }}</p>
            </div>
          </div>
          <button @click="closeDetails" class="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center shrink-0">
            <X class="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-4">
          <div class="flex items-end justify-between gap-3">
            <div>
              <p class="text-[8px] font-black uppercase tracking-widest text-slate-400">Vitesse</p>
              <p class="text-3xl font-black leading-none mt-1 text-slate-900">
                {{ Math.round(selectedCar.speed || 0) }}<span class="text-xs font-black text-slate-400 ml-1">km/h</span>
              </p>
            </div>
            <span class="px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border" :class="statusClass(selectedCar)">
              {{ statusLabel(selectedCar) }}
            </span>
          </div>

          <!-- Statut du véhicule (super admin uniquement) -->
          <div v-if="authStore.isSuperAdmin" class="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 flex items-center justify-between gap-3">
            <div>
              <p class="text-[8px] font-black uppercase tracking-widest text-slate-400">Statut du véhicule</p>
              <p class="text-[10px] font-black mt-0.5" :class="selectedCar.isAvailable ? 'text-emerald-600' : 'text-rose-600'">
                {{ selectedCar.isAvailable ? 'Disponible' : 'Louée' }}
              </p>
            </div>
            <button v-if="selectedCar.isAvailable" @click="setCarStatus" :disabled="statusSaving"
              class="h-9 px-4 rounded-xl text-[8px] font-black uppercase tracking-widest text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-200 transition-all active:scale-95 disabled:opacity-60 shrink-0">
              {{ statusSaving ? '...' : 'Marquer louée' }}
            </button>
          </div>

          <div class="grid grid-cols-2 gap-x-3 gap-y-2 pt-1">
            <div>
              <p class="text-[8px] font-black uppercase tracking-widest text-slate-400">Dernière vue</p>
              <p class="text-[10px] font-black text-slate-700">{{ timeLabel(selectedCar) }}</p>
            </div>
            <div>
              <p class="text-[8px] font-black uppercase tracking-widest text-slate-400">Fournisseur</p>
              <p class="text-[10px] font-black text-slate-700 capitalize">{{ selectedCar.provider || '-' }}</p>
            </div>
            <div class="col-span-2">
              <p class="text-[8px] font-black uppercase tracking-widest text-slate-400">Position</p>
              <p class="text-[10px] font-bold text-slate-500">{{ Number(selectedCar.lat).toFixed(5) }}, {{ Number(selectedCar.lng).toFixed(5) }}</p>
            </div>
          </div>

          <!-- Contrat en cours -->
          <template v-if="selectedCar.rental">
            <div class="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-[8px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1.5">
                  <FileText class="w-3 h-3" /> Contrat en cours
                </span>
                <span :class="['px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-white', selectedCar.rental.isPaid ? 'bg-emerald-500' : 'bg-amber-500']">
                  {{ selectedCar.rental.isPaid ? 'Payé' : 'Impayé' }}
                </span>
              </div>
              <button @click="goContrat(selectedCar.rental._id)"
                class="w-full flex items-center justify-between gap-2 bg-white/80 hover:bg-white rounded-xl px-3 py-2 border border-indigo-100 transition-colors group">
                <span class="text-sm font-black text-slate-900 italic tracking-tight">{{ selectedCar.rental.reference }}</span>
                <span class="text-[8px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1 opacity-70 group-hover:opacity-100">
                  Voir contrat <ChevronRight class="w-3 h-3" />
                </span>
              </button>

              <div class="grid grid-cols-2 gap-x-3 gap-y-2.5">
                <div class="col-span-2">
                  <p class="text-[8px] font-black uppercase tracking-widest text-slate-400">Période · {{ rentalDays(selectedCar.rental) }} jour(s)</p>
                  <p class="text-[10px] font-black text-slate-700">{{ fmtDate(selectedCar.rental.startDate) }} → {{ fmtDate(selectedCar.rental.endDate) }}</p>
                </div>
                <div>
                  <p class="text-[8px] font-black uppercase tracking-widest text-slate-400">Tarif / jour</p>
                  <p class="text-[10px] font-black text-slate-700 tabular-nums">{{ Number(selectedCar.rental.carDailyRate || 0).toFixed(0) }} TND</p>
                </div>
                <div>
                  <p class="text-[8px] font-black uppercase tracking-widest text-slate-400">Total</p>
                  <p class="text-[10px] font-black tabular-nums" :class="selectedCar.rental.isPaid ? 'text-emerald-600' : 'text-amber-600'">
                    {{ Number(selectedCar.rental.totalAmount || 0).toFixed(0) }} TND
                  </p>
                </div>
                <div>
                  <p class="text-[8px] font-black uppercase tracking-widest text-slate-400">Caution</p>
                  <p class="text-[10px] font-black text-slate-700 tabular-nums">{{ Number(selectedCar.rental.depositAmount || 0).toFixed(0) }} TND</p>
                </div>
                <div>
                  <p class="text-[8px] font-black uppercase tracking-widest text-slate-400">Paiement</p>
                  <p class="text-[10px] font-black text-slate-700">{{ payLabel(selectedCar.rental.paymentMethod) }}</p>
                </div>
                <div v-if="selectedCar.rental.lieuDepart || selectedCar.rental.lieuRetour" class="col-span-2">
                  <p class="text-[8px] font-black uppercase tracking-widest text-slate-400">Départ / Retour</p>
                  <p class="text-[10px] font-bold text-slate-500 capitalize">{{ selectedCar.rental.lieuDepart || '-' }} → {{ selectedCar.rental.lieuRetour || '-' }}</p>
                </div>
              </div>
            </div>

            <!-- Locataire(s) -->
            <div class="space-y-2">
              <p class="text-[8px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                <Users class="w-3 h-3" /> Locataire(s)
              </p>
              <div v-for="(cl, idx) in selectedCar.rental.clients || []" :key="idx"
                @click="goClient(cl._id)"
                class="rounded-xl border border-slate-100 bg-white p-3 space-y-2 shadow-sm cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors">
                <div class="flex items-center gap-2.5">
                  <span class="w-7 h-7 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                    {{ String(cl.firstName || '?')[0].toUpperCase() }}
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-[11px] font-black text-slate-900 truncate leading-none">{{ cl.firstName }} {{ cl.lastName }}</span>
                    <a :href="'tel:' + (cl.phoneCountryCode || '+216') + cl.phone" @click.stop
                      class="block text-[9px] font-black text-indigo-600 hover:text-indigo-800 mt-1">{{ cl.phone }}</a>
                  </span>
                  <ChevronRight class="w-3.5 h-3.5 text-slate-300 shrink-0" />
                </div>
                <div class="space-y-1 pt-1.5 border-t border-slate-50">
                  <div v-if="cl.cin" class="flex items-center justify-between gap-2">
                    <span class="text-[8px] font-black uppercase tracking-widest text-slate-400 shrink-0">CIN / Passeport</span>
                    <span class="text-[9px] font-bold text-slate-600 uppercase">{{ cl.cin }}</span>
                  </div>
                  <div v-if="cl.email" class="flex items-center justify-between gap-2">
                    <span class="text-[8px] font-black uppercase tracking-widest text-slate-400 shrink-0">Email</span>
                    <a :href="'mailto:' + cl.email" @click.stop class="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 truncate">{{ cl.email }}</a>
                  </div>
                  <div v-if="cl.address" class="flex items-start justify-between gap-2">
                    <span class="text-[8px] font-black uppercase tracking-widest text-slate-400 shrink-0">Adresse</span>
                    <span class="text-[9px] font-bold text-slate-600 text-right">{{ cl.address }}</span>
                  </div>
                </div>
              </div>
              <p v-if="!(selectedCar.rental.clients || []).length" class="text-[9px] font-black uppercase tracking-widest text-slate-300 text-center py-2">Aucun locataire</p>
            </div>
          </template>
          <div v-else-if="!selectedCar.isAvailable" class="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-center">
            <p class="text-[8px] font-black uppercase tracking-widest text-amber-600">Véhicule loué — contrat actif introuvable</p>
          </div>
          <div v-else class="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
            <p class="text-[8px] font-black uppercase tracking-widest text-slate-400">Aucune location en cours</p>
          </div>
        </div>

        <div class="shrink-0 px-5 pb-5 pt-3 border-t border-slate-100">
          <button @click="toggleFollow(selectedCar)"
            :class="['w-full h-11 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2',
              isFollowing(selectedCar) ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700']">
            <component :is="isFollowing(selectedCar) ? PauseCircle : LocateFixed" class="w-4 h-4" />
            {{ isFollowing(selectedCar) ? 'Ne plus suivre' : 'Suivre ce véhicule' }}
          </button>
        </div>
      </div>
    </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  RefreshCw, Loader2 as LoaderIcon, MapPin,
  X, LocateFixed, PauseCircle, Satellite, Map as MapIcon,
  FileText, Car as CarIcon, Users, ChevronRight, ChevronUp,
  Maximize2, Minimize2
} from 'lucide-vue-next'
import { gpsApi, carApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { resolveCarColor } from '@/utils/carColor'

const router = useRouter()
const authStore = useAuthStore()
const isElectron = !!(window as any).electronAPI
const pageRoot = ref<HTMLElement | null>(null)
const isFullScreen = ref(false)

const syncFullScreen = () => {
  isFullScreen.value = !!document.fullscreenElement
  requestAnimationFrame(() => leafletMap?.invalidateSize())
}
const toggleFullScreen = async () => {
  try {
    if (!document.fullscreenElement) await pageRoot.value?.requestFullscreen()
    else await document.exitFullscreen()
  } catch {
    /* fullscreen denied */
  }
}

const REFRESH_MS = 1000

const loading = ref(true)
const mapEl = ref<HTMLElement | null>(null)
const gpsPositions = ref<any[]>([])
const showList = ref(false)
const selectedCarId = ref('')
const followingId = ref('')
const lastUpdate = ref<Date | null>(null)

const legend = [
  { label: 'En mouvement', color: '#10b981' },
  { label: 'Garé', color: '#ef4444' },
  { label: 'Inactif (>30 min)', color: '#94a3b8' }
]

let leafletMap: L.Map | null = null
let markersGroup: L.LayerGroup | null = null
let gpsTimer: any = null
let didFitBounds = false

const mapStyle = ref<'satellite' | 'plan'>('satellite')
let tileLayers: { satellite: L.TileLayer[]; plan: L.TileLayer } | null = null

const applyMapStyle = () => {
  if (!leafletMap || !tileLayers) return
  if (mapStyle.value === 'satellite') {
    tileLayers.plan.remove()
    tileLayers.satellite.forEach((l) => leafletMap!.addLayer(l))
  } else {
    tileLayers.satellite.forEach((l) => leafletMap!.removeLayer(l))
    tileLayers.plan.addTo(leafletMap)
  }
}

watch(mapStyle, applyMapStyle)

const carIconSvg = (bgColor: string) => {
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16) || 0
  const g = parseInt(hex.slice(2, 4), 16) || 0
  const b = parseInt(hex.slice(4, 6), 16) || 0
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  const stroke = luminance > 186 ? '#334155' : '#ffffff'
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="' +
    stroke +
    '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.3-.7-2.8-.7s-2.3.3-2.8.7C7.3 8.6 5.3 10 5.3 10s-2.7.6-4.5 1.1C0 11.3 0 12.1 0 13v3c0 .6.4 1 1 1h2"/>' +
    '<circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>'
  )
}

const isStale = (p: any) => Date.now() - new Date(p.positionAt).getTime() > 30 * 60 * 1000
const colorFor = (p: any) => {
  if (isStale(p)) return '#94a3b8'
  const custom = resolveCarColor(p.carColor)
  return custom ?? (p.speed > 2 ? '#10b981' : '#ef4444')
}
const timeLabel = (p: any) => {
  const d = new Date(p.positionAt)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const fmtDate = (d: any) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const rentalDays = (r: any) =>
  Math.max(1, Math.round((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 86400000))
const payLabel = (m?: string) => (m === 'cheque' ? 'Chèque' : m === 'espece' ? 'Espèces' : '-')
const statusLabel = (p: any) => (isStale(p) ? 'Inactif' : p.speed > 2 ? 'En mouvement' : 'Garé')
const statusClass = (p: any) =>
  isStale(p)
    ? 'bg-slate-100 text-slate-500 border-slate-200'
    : p.speed > 2
      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
      : 'bg-rose-50 text-rose-600 border-rose-200'
const sortedPositions = computed(() =>
  [...gpsPositions.value].sort((a, b) => String(a.matricule).localeCompare(String(b.matricule)))
)

// ─── Online (en mouvement) — bottom-left widget + bottom sheet ──────────────
const showMovingSheet = ref(false)
const isMoving = (p: any) => !isStale(p) && (p.speed || 0) > 2
const movingCars = computed(() =>
  gpsPositions.value.filter(isMoving).sort((a, b) => (b.speed || 0) - (a.speed || 0))
)
const movingCarsPreview = computed(() => movingCars.value.slice(0, 3))
watch(movingCars, (list) => {
  if (!list.length) showMovingSheet.value = false
})
const selectOnlineCar = (p: any) => {
  followCar(p)
  showMovingSheet.value = false
}
const selectedCar = computed(
  () => gpsPositions.value.find((p) => String(p.carId) === selectedCarId.value) ?? null
)
const followedCar = computed(
  () => gpsPositions.value.find((p) => String(p.carId) === followingId.value) ?? null
)
const isFollowing = (p: any) => String(followingId.value) === String(p.carId)
const lastUpdateLabel = computed(() =>
  lastUpdate.value ? timeLabel({ positionAt: lastUpdate.value.toISOString() }) : '--:--'
)

const stopFollowing = () => {
  followingId.value = ''
  const pts = gpsPositions.value.map((p) => [p.lat, p.lng] as [number, number])
  if (pts.length && leafletMap) {
    flyUntil = Date.now() + 1100
    leafletMap.flyToBounds(L.latLngBounds(pts).pad(0.35), { duration: 0.8 })
  }
}

const goContrat = (id?: string) => {
  if (id) router.push(`/contrats/${id}`)
}
const goClient = (id?: string) => {
  if (id) router.push(`/clients/${id}`)
}

const closeDetails = () => {
  selectedCarId.value = ''
}

const statusSaving = ref(false)
const setCarStatus = async () => {
  const car = selectedCar.value
  if (!car || statusSaving.value || !car.isAvailable) return
  statusSaving.value = true
  try {
    await carApi.updateStatus(String(car.carId), false)
    selectedCarId.value = String(car.carId)
    await fetchGpsPositions()
  } catch (err) {
    console.error('Failed to update car status', err)
    alert('Impossible de changer le statut du véhicule.')
  } finally {
    statusSaving.value = false
  }
}

const toggleList = () => {
  showList.value = !showList.value
  if (showList.value) selectedCarId.value = ''
}

const toggleFollow = (p: any) => {
  if (isFollowing(p)) {
    stopFollowing()
  } else {
    followingId.value = String(p.carId)
    flyUntil = Date.now() + 800
    leafletMap?.panTo([p.lat, p.lng], { animate: true, duration: 0.6 })
  }
}

let flyUntil = 0
const followCar = (p: any) => {
  selectedCarId.value = String(p.carId)
  followingId.value = String(p.carId)
  flyUntil = Date.now() + 1100
  leafletMap?.flyTo([p.lat, p.lng], Math.max(leafletMap.getZoom(), 16), { duration: 0.8 })
  void fetchGpsPositions()
}

const selectFromList = (p: any) => {
  followCar(p)
  showList.value = false
}

const renderGpsMarkers = () => {
  if (!leafletMap || !markersGroup) return
  const previousMarkers = new Map<string, L.Marker>()
  markersGroup.eachLayer((layer: any) => {
    if (layer.__carKey) previousMarkers.set(layer.__carKey, layer as L.Marker)
  })
  markersGroup.clearLayers()

  for (const p of gpsPositions.value) {
    const key = String(p.carId)
    const color = colorFor(p)
    const icon = L.divIcon({
      className: '',
      html:
        '<div style="position:relative;width:34px;height:40px">' +
        `<div style="width:34px;height:34px;border-radius:11px;background:${color};border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">${carIconSvg(color)}</div>` +
        `<div style="position:absolute;left:50%;bottom:-1px;width:10px;height:10px;background:${color};border-right:3px solid #fff;border-bottom:3px solid #fff;transform:translateX(-50%) rotate(45deg);border-radius:0 0 2px 0"></div>` +
        '</div>',
      iconSize: [34, 40],
      iconAnchor: [17, 39]
    })
    const existing = previousMarkers.get(key)
    let marker: L.Marker
    if (existing) {
      existing.setIcon(icon)
      existing.setLatLng([p.lat, p.lng])
      marker = existing
    } else {
      marker = L.marker([p.lat, p.lng], { icon })
      marker.on('click', () => {
        const current = gpsPositions.value.find((x) => String(x.carId) === key)
        if (current) {
          followCar(current)
          showList.value = false
        }
      })
    }
    marker.bindPopup(
      `<b>${p.brand} ${p.model} — ${p.matricule}</b><br/>` +
      `${Math.round(p.speed || 0)} km/h · vu à ${timeLabel(p)}` +
      (isStale(p) ? ' (inactif)' : '')
    )
    marker.bindTooltip(String(p.matricule || ''), {
      direction: 'top',
      offset: [0, -46],
      opacity: 1,
      className: 'car-plate-tip'
    })
    ;(marker as any).__carKey = key
    marker.addTo(markersGroup)
  }
}

const fetchGpsPositions = async () => {
  try {
    gpsPositions.value = await gpsApi.getPositions()
    lastUpdate.value = new Date()
    renderGpsMarkers()
    if (!didFitBounds && leafletMap && gpsPositions.value.length) {
      didFitBounds = true
      const bounds = L.latLngBounds(gpsPositions.value.map((p) => [p.lat, p.lng] as [number, number]))
      leafletMap.fitBounds(bounds.pad(0.35), { maxZoom: 15 })
    }
    if (followingId.value && leafletMap && Date.now() >= flyUntil) {
      const p = gpsPositions.value.find((x) => String(x.carId) === followingId.value)
      if (p && p.speed > 2) {
        const center = leafletMap.getCenter()
        const moved = Math.abs(center.lat - p.lat) > 0.00005 || Math.abs(center.lng - p.lng) > 0.00005
        if (moved) leafletMap.panTo([p.lat, p.lng], { animate: true, duration: 1.2, easeLinearity: 0.3 })
      }
    }
  } catch (err) {
    console.error('Failed to load GPS positions', err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (mapEl.value && !leafletMap) {
    leafletMap = L.map(mapEl.value, {
      attributionControl: false,
      zoomControl: false,
      maxZoom: 30
    }).setView([36.8, 10.18], 8)
    tileLayers = {
      satellite: [
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 19, maxZoom: 30 }),
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 19, maxZoom: 30 }),
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 19, maxZoom: 30 })
      ],
      plan: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxNativeZoom: 19,
        maxZoom: 30
      })
    }
    applyMapStyle()
    L.control.zoom({ position: 'topright' }).addTo(leafletMap)
    markersGroup = L.layerGroup().addTo(leafletMap)
    leafletMap.on('dragstart', () => {
      followingId.value = ''
    })
    setTimeout(() => leafletMap?.invalidateSize(), 150)
  }
  document.addEventListener('fullscreenchange', syncFullScreen)
  await fetchGpsPositions()
  gpsTimer = setInterval(() => fetchGpsPositions(), REFRESH_MS)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', syncFullScreen)
  if (gpsTimer) clearInterval(gpsTimer)
  if (leafletMap) {
    leafletMap.remove()
    leafletMap = null
  }
})
</script>

<style>
.car-plate-tip {
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 6px 12px;
  font-weight: 900;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}
.car-plate-tip::before {
  border-top-color: rgba(15, 23, 42, 0.92);
}
</style>
