<script setup lang="ts">
import { ref, onMounted, reactive, watch, computed } from 'vue'
import { logApi, userApi } from '@/api'
import { Search, ScrollText, X, ShieldCheck, User, Activity, Filter, Calendar, Clock, ChevronDown, Printer, Download } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface LogEntry {
  _id: string
  action: string
  actorId: string
  actorName: string
  role: string
  detail: string
  createdAt: string
}

const logs = ref<LogEntry[]>([])
const users = ref<any[]>([])
const loading = ref(true)
const showFilters = ref(false)
const searchOpen = ref(false)
const userSelectOpen = ref(false)
const filterHover = ref(false)
const resetHover = ref(false)
const printHover = ref(false)
const downloadHover = ref(false)

const filters = reactive({
  search: '',
  actorId: '',
  role: '',
  from: '',
  to: ''
})

const activeFilterCount = computed(() => {
  let count = 0
  if (filters.search) count++
  if (filters.actorId) count++
  if (filters.role) count++
  if (filters.from || filters.to) count++
  return count
})

const actionLabels: Record<string, { label: string; cls: string }> = {
  LOGIN: { label: 'Connexion', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  LOGIN_FAILED: { label: 'Échec connexion', cls: 'bg-rose-50 text-rose-600 border-rose-100' },
  LOGOUT: { label: 'Déconnexion', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  USER_CREATED: { label: 'Création personnel', cls: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  USER_UPDATED: { label: 'Modification personnel', cls: 'bg-amber-50 text-amber-600 border-amber-100' },
  USER_DELETED: { label: 'Suppression personnel', cls: 'bg-rose-50 text-rose-600 border-rose-100' },
  PASSWORD_CHANGED: { label: 'Mot de passe changé', cls: 'bg-amber-50 text-amber-600 border-amber-100' },
  PROFILE_UPDATED: { label: 'Profil mis à jour', cls: 'bg-sky-50 text-sky-600 border-sky-100' },
  CONTRAT_CREATED: { label: 'Contrat créé', cls: 'bg-sky-50 text-sky-600 border-sky-100' },
  CONTRAT_UPDATED: { label: 'Contrat modifié', cls: 'bg-amber-50 text-amber-600 border-amber-100' },
  CONTRAT_CLOSED: { label: 'Contrat clôturé', cls: 'bg-violet-50 text-violet-600 border-violet-100' },
  CONTRAT_CANCELLED: { label: 'Contrat annulé', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  DEPENSE_CREATED: { label: 'Dépense créée', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  DEPENSE_DELETED: { label: 'Dépense supprimée', cls: 'bg-rose-50 text-rose-600 border-rose-100' },
}

const actionInfo = (action: string) => actionLabels[action] || { label: action.replace(/_/g, ' '), cls: 'bg-slate-50 text-slate-500 border-slate-200' }

const roleCls: Record<string, string> = {
  super_admin: 'bg-amber-50 text-amber-600 border-amber-200',
  admin: 'bg-rose-50 text-rose-600 border-rose-100',
  user: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  unknown: 'bg-slate-100 text-slate-400 border-slate-200'
}

const loadLogs = async () => {
  loading.value = true
  try {
    const params: any = {}
    if (filters.search) params.search = filters.search
    if (filters.actorId) params.actorId = filters.actorId
    if (filters.role) params.role = filters.role
    if (filters.from) params.from = filters.from
    if (filters.to) params.to = filters.to
    logs.value = await logApi.getAll(params)
  } catch (error) {
    console.error('Failed to load logs:', error)
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(filters, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(loadLogs, 400)
}, { deep: true })

const loadUsers = async () => {
  try {
    users.value = await userApi.getAll()
  } catch (error) {
    console.error('Failed to load users:', error)
  }
}

const clearFilters = () => {
  filters.search = ''
  filters.actorId = ''
  filters.role = ''
  filters.from = ''
  filters.to = ''
}

const formatDateTime = (dateString: string) => {
  const d = new Date(dateString)
  return {
    date: d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
}

const roleLabel = (r: string) => {
  if (r === 'super_admin') return 'Super Admin'
  if (r === 'admin') return 'Admin'
  if (r === 'user') return 'Opérateur'
  return '—'
}

const isCin = (value: string) => /^\d+$/.test(String(value).trim())

const resolveUser = (log: LogEntry) => {
  if (!log) return null
  const byId = users.value.find((u) => u._id === log.actorId)
  if (byId) return byId
  if (log.actorName && isCin(log.actorName)) {
    return users.value.find((u) => String(u.cin) === log.actorName.trim()) || null
  }
  return null
}

const userName = (log: LogEntry) => {
  const u = resolveUser(log)
  if (u) return `${u.lastName} ${u.firstName}`
  if (log.actorName && !isCin(log.actorName)) return log.actorName
  return '—'
}

const userRole = (log: LogEntry) => {
  const u = resolveUser(log)
  return (u?.role || log.role || '').trim()
}

const filterSummary = () => {
  const parts: string[] = []
  if (filters.search) parts.push(`Recherche: "${filters.search}"`)
  if (filters.actorId) {
    const u = users.value.find((item) => item._id === filters.actorId)
    parts.push(`Utilisateur: ${u ? `${u.lastName} ${u.firstName}` : filters.actorId}`)
  }
  if (filters.role) parts.push(`Rôle: ${filters.role}`)
  if (filters.from && filters.to) parts.push(`Du ${filters.from} au ${filters.to}`)
  else if (filters.from) parts.push(`Depuis le ${filters.from}`)
  else if (filters.to) parts.push(`Jusqu'au ${filters.to}`)
  return parts.length ? parts.join('  |  ') : 'Tous les événements'
}

const buildLogsPdf = () => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14

  doc.setFontSize(20)
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.text('JOURNAL DES LOGS', margin, 20)

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text('DJERBA RENT A CAR - TRAÇABILITÉ DES ACTIONS', margin, 27)

  doc.setFontSize(9)
  doc.setTextColor(79, 70, 229)
  doc.setFont('helvetica', 'bold')
  doc.text(`Filtres: ${filterSummary()}`, margin, 34)

  doc.setFontSize(9)
  doc.setTextColor(148, 163, 184)
  doc.setFont('helvetica', 'normal')
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} - ${logs.value.length} événement(s)`, margin, 40)

  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(margin, 43, pageWidth - margin, 43)

  autoTable(doc, {
    startY: 47,
    head: [['DATE', 'HEURE', 'ACTION', 'UTILISATEUR', 'RÔLE', 'DÉTAILS']],
    body: logs.value.map((log) => {
      const dt = formatDateTime(log.createdAt)
      return [
        dt.date,
        dt.time,
        actionInfo(log.action).label,
        userName(log),
        roleLabel(userRole(log)),
        log.detail || '—'
      ]
    }),
    theme: 'grid',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 4
    },
    styles: {
      fontSize: 7,
      cellPadding: 3,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 34, fontStyle: 'bold', halign: 'center', textColor: [15, 23, 42] },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 30, fontStyle: 'bold' },
      3: { cellWidth: 30 },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 'auto' }
    }
  })

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.setFont('helvetica', 'normal')
    doc.text('DJERBA RENT A CAR - Journal des Logs', margin, pageHeight - 8)
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' })
  }

  const safeFilenameDate = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-')
  return { doc, safeFilenameDate }
}

const exportLogsPdf = () => {
  const { doc, safeFilenameDate } = buildLogsPdf()
  doc.save(`Journal_Logs_${safeFilenameDate}.pdf`)
}

const printLogsPdf = () => {
  const { doc } = buildLogsPdf()
  doc.autoPrint()
  doc.output('dataurlnewwindow')
}

onMounted(() => {
  loadLogs()
  loadUsers()
})
</script>

<template>
  <div class="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
    <!-- HEADER -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="space-y-2">
        <h1 class="text-4xl font-black uppercase tracking-tighter flex items-center gap-4">
          <span class="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center">
            <ScrollText class="w-6 h-6 text-amber-500" />
          </span>
          Journal des <span class="text-amber-500 italic">Logs</span>
        </h1>
        <p class="text-[10px] uppercase tracking-widest font-black opacity-60 pl-1">Traçabilité des actions utilisateurs & administrateurs</p>
      </div>
      <div class="flex items-center gap-2">
        <Badge class="bg-amber-500/10 text-amber-600 border-none font-black tracking-widest uppercase text-[10px]">{{ logs.length }} Événements</Badge>
        <Button
          @click="printLogsPdf"
          @mouseenter="printHover = true"
          @mouseleave="printHover = false"
          :class="'group relative h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black tracking-widest uppercase text-[10px] overflow-hidden flex items-center justify-start shadow-xl shadow-amber-500/20 transition-all duration-300 active:scale-95 hover:scale-105 hover:-translate-y-0.5 ' + (printHover ? 'w-44' : 'w-12')"
        >
          <div class="absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Printer class="w-4 h-4 transition-transform duration-300 group-hover:rotate-[-15deg] group-hover:scale-110" />
          </div>
          <span :class="[printHover ? 'opacity-100' : 'opacity-0', 'whitespace-nowrap transition-all duration-300 pl-10 pr-4']">Imprimer</span>
        </Button>
        <Button
          @click="exportLogsPdf"
          @mouseenter="downloadHover = true"
          @mouseleave="downloadHover = false"
          variant="outline"
          :class="'group relative h-12 rounded-2xl font-black tracking-widest uppercase text-[10px] overflow-hidden flex items-center justify-start border-2 border-slate-200 hover:border-amber-400 transition-all duration-300 active:scale-95 hover:shadow-xl hover:shadow-amber-100 ' + (downloadHover ? 'w-56' : 'w-12')"
        >
          <div class="absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Download class="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5 group-hover:scale-110" />
          </div>
          <span :class="[downloadHover ? 'opacity-100' : 'opacity-0', 'whitespace-nowrap transition-all duration-300 pl-10 pr-4 text-slate-600 group-hover:text-amber-600']">Télécharger PDF</span>
        </Button>
      </div>
    </div>

    <!-- FILTER BAR -->
    <Card class="border border-slate-200/60 shadow-xl bg-white/80 backdrop-blur-xl rounded-[2rem] overflow-hidden">
      <CardContent class="p-6 space-y-5">
        <div class="flex flex-col lg:flex-row gap-4">
          <div class="group relative h-12 transition-all duration-300 overflow-hidden rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-amber-400 flex items-center cursor-text active:scale-95 hover:shadow-xl hover:shadow-amber-100"
            :class="searchOpen ? 'w-full border-amber-500' : 'w-12'"
            @mouseenter="searchOpen = true"
            @mouseleave="searchOpen = false"
            @focusin="searchOpen = true"
            @focusout="searchOpen = false">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search class="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors duration-300" />
            </div>
            <input v-model="filters.search" placeholder="Rechercher une action, un détail, un nom..." :class="[searchOpen ? 'opacity-100' : 'opacity-0', 'h-full w-full pl-10 pr-3 bg-transparent border-0 outline-none text-xs font-bold text-slate-900 placeholder:text-slate-400 transition-opacity duration-300']" />
          </div>
          <div class="group relative h-12 transition-all duration-300 overflow-hidden rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-amber-400 flex items-center cursor-pointer active:scale-95 hover:shadow-xl hover:shadow-amber-100"
            :class="userSelectOpen ? 'w-full lg:w-64 border-amber-500' : 'w-12'"
            @mouseenter="userSelectOpen = true"
            @mouseleave="userSelectOpen = false"
            @focusin="userSelectOpen = true"
            @focusout="userSelectOpen = false">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <User class="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors duration-300" />
            </div>
            <select v-model="filters.actorId" :class="[userSelectOpen ? 'opacity-100' : 'opacity-0 pointer-events-none', 'h-full w-full pl-11 pr-10 bg-transparent border-0 outline-none font-black text-xs text-slate-900 appearance-none cursor-pointer transition-opacity duration-300']">
              <option value="" class="text-slate-400">Tous les utilisateurs</option>
              <option v-for="u in users" :key="u._id" :value="u._id" class="text-slate-900">
                {{ u.lastName }} {{ u.firstName }} ({{ u.cin }})
              </option>
            </select>
            <ChevronDown :class="[userSelectOpen ? 'opacity-100' : 'opacity-0', 'absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none transition-opacity duration-300']" />
          </div>
          <Button @click="showFilters = !showFilters" @mouseenter="filterHover = true" @mouseleave="filterHover = false" variant="outline" :class="'group relative h-12 rounded-2xl font-black tracking-widest uppercase text-[10px] overflow-hidden flex items-center justify-start border-2 border-slate-200 hover:border-amber-400 transition-all duration-300 active:scale-95 hover:shadow-xl hover:shadow-amber-100 ' + (filterHover ? 'w-44' : 'w-12')">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Filter class="w-4 h-4 transition-transform duration-300 group-hover:rotate-[-20deg] group-hover:scale-110" />
              <span v-if="activeFilterCount" class="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white rounded-full text-[8px] flex items-center justify-center">{{ activeFilterCount }}</span>
            </div>
            <span :class="[filterHover ? 'opacity-100' : 'opacity-0', 'whitespace-nowrap transition-all duration-300 pl-10 pr-4 text-slate-600 group-hover:text-amber-600']">Filtres</span>
          </Button>
          <Button @click="clearFilters" @mouseenter="resetHover = true" @mouseleave="resetHover = false" variant="ghost" :class="'group relative h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 overflow-hidden flex items-center justify-start transition-all duration-300 active:scale-95 ' + (resetHover ? 'w-44' : 'w-12')" :disabled="activeFilterCount === 0">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3.5">
              <X class="w-4 h-4" />
            </div>
            <span :class="[resetHover ? 'opacity-100' : 'opacity-0', 'whitespace-nowrap transition-all duration-300 pl-10 pr-4']">Réinitialiser</span>
          </Button>
        </div>

        <div v-if="showFilters" class="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div class="space-y-2">
            <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rôle</Label>
            <div class="relative">
              <ShieldCheck class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select v-model="filters.role" class="w-full h-12 pl-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-black text-slate-700 outline-none appearance-none">
                <option value="">Tous les rôles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="user">Opérateur</option>
                <option value="unknown">Non identifié</option>
              </select>
              <ChevronDown class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div class="space-y-2">
            <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Du</Label>
            <div class="relative">
              <Calendar class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <Input type="date" v-model="filters.from" class="h-12 pl-12 bg-slate-50 border-slate-100 rounded-2xl font-bold" />
            </div>
          </div>
          <div class="space-y-2">
            <Label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Au</Label>
            <div class="relative">
              <Calendar class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <Input type="date" v-model="filters.to" class="h-12 pl-12 bg-slate-50 border-slate-100 rounded-2xl font-bold" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- LOGS TABLE -->
    <Card class="border border-slate-200/50 shadow-3xl bg-white/70 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow class="bg-slate-50/50 border-b border-slate-100">
                <TableHead class="pl-10 py-5 text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase w-[18%]">DATE & HEURE</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase w-[16%]">ACTION</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase w-[16%]">UTILISATEUR</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase w-[12%]">RÔLE</TableHead>
                <TableHead class="pr-10 text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase">DÉTAILS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="log in logs" :key="log._id" class="group border-slate-100 hover:bg-amber-50/30 transition-all duration-300">
                <TableCell class="pl-10 py-5">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-amber-500 group-hover:text-white transition-all">
                      <Clock class="w-4 h-4" />
                    </div>
                    <div>
                      <p class="font-black text-slate-900 text-xs tabular-nums">{{ formatDateTime(log.createdAt).date }}</p>
                      <p class="text-[10px] font-black text-slate-400 tabular-nums">{{ formatDateTime(log.createdAt).time }}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge :class="['text-[8px] uppercase tracking-widest font-black px-3 py-1 border', actionInfo(log.action).cls]">
                    {{ actionInfo(log.action).label }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span class="font-black text-slate-800 uppercase text-sm">{{ userName(log) }}</span>
                </TableCell>
                <TableCell>
                  <Badge :class="['text-[8px] uppercase tracking-widest font-black px-3 py-1 border', roleCls[userRole(log)] || roleCls.unknown]">
                    {{ userRole(log) === 'super_admin' ? 'Super Admin' : userRole(log) === 'admin' ? 'Admin' : userRole(log) === 'user' ? 'Opérateur' : '—' }}
                  </Badge>
                </TableCell>
                <TableCell class="pr-10">
                  <p class="text-xs font-bold text-slate-500 leading-relaxed max-w-md">{{ log.detail || '—' }}</p>
                </TableCell>
              </TableRow>

              <TableRow v-if="logs.length === 0 && !loading">
                <TableCell colspan="5" class="h-72 text-center">
                  <div class="flex flex-col items-center gap-4 opacity-30">
                    <Activity class="w-16 h-16 stroke-[1]" />
                    <p class="font-black uppercase tracking-[0.3em] text-xs text-slate-500">Aucun log pour ces critères</p>
                  </div>
                </TableCell>
              </TableRow>

              <TableRow v-if="loading">
                <TableCell colspan="5" class="h-72 text-center">
                  <div class="flex flex-col items-center gap-4">
                    <Activity class="w-12 h-12 animate-pulse text-amber-500 opacity-50" />
                    <p class="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">Chargement des logs...</p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
