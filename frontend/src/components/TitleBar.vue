<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Car, Minus, Square, Copy, X } from 'lucide-vue-next'

const route = useRoute()
const isMaximized = ref(true)
let cleanup: (() => void) | null = null

const electron = (window as any).electronAPI
const isElectron = !!electron

const pageLabels: Record<string, string> = {
  dashboard: 'Tableau de bord',
  availability: 'Disponibilité',
  cars: 'Voitures',
  'car-detail': 'Fiche Véhicule',
  'fleet-map': 'Suivi Flotte',
  clients: 'Clients',
  'client-detail': 'Dossier Client',
  contrats: 'Contrats',
  'contrat-detail': 'Dossier Contrat',
  'contrat-new': 'Nouveau Contrat',
  reservations: 'Réservations',
  depenses: 'Dépenses',
  accounting: 'Comptabilité',
  settings: 'Paramètres',
  users: 'Personnel',
  agences: 'Agences',
  'agence-detail': 'Dossier Agence',
  logs: 'Logs',
  login: 'RentACar'
}

const pageTitle = computed(() => {
  if (route.name === 'agence-detail') {
    return 'Dossier Agence'
  }
  return pageLabels[String(route.name)] || 'RentACar'
})

const minimize = () => electron?.windowMinimize()
const toggleMaximize = () => electron?.windowToggleMaximize()
const closeWindow = () => electron?.windowClose()

onMounted(() => {
  if (!electron) return
  electron.isMaximized?.().then((v: boolean) => (isMaximized.value = v))
  const handler = (v: boolean) => (isMaximized.value = v)
  electron.onMaximizeChange?.(handler)
  cleanup = () => {
    // no-op: ipcRenderer listeners are torn down with the window
    void handler
  }
})
onUnmounted(() => cleanup?.())
</script>

<template>
  <div
    v-if="isElectron"
    class="fixed top-0 left-0 right-0 h-[38px] z-[80] bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center select-none"
    style="-webkit-app-region: drag"
    @dblclick="toggleMaximize"
  >
    <!-- Left: Logo -->
    <div class="flex items-center gap-2 pl-3">
      <div class="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-600/30">
        <Car class="text-white w-3.5 h-3.5" />
      </div>
      <span class="text-[13px] font-black tracking-tighter text-slate-900 leading-none pt-px">
        Rent<span class="text-indigo-600">A</span>Car
      </span>
    </div>

    <!-- Center: Current page -->
    <div class="absolute left-1/2 -translate-x-1/2 pointer-events-none">
      <span class="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 whitespace-nowrap">{{ pageTitle }}</span>
    </div>

    <!-- Right: Window controls -->
    <div class="ml-auto flex items-stretch h-full" style="-webkit-app-region: no-drag">
      <button @click="minimize" title="Réduire"
        class="w-12 h-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
        <Minus class="w-4 h-4" />
      </button>
      <button @click="toggleMaximize" :title="isMaximized ? 'Restaurer' : 'Agrandir'"
        class="w-12 h-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
        <component :is="isMaximized ? Copy : Square" class="w-3.5 h-3.5" />
      </button>
      <button @click="closeWindow" title="Fermer"
        class="w-12 h-full flex items-center justify-center text-slate-400 hover:bg-rose-500 hover:text-white transition-colors">
        <X class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
