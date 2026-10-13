<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { contratApi, depenseApi, authApi } from '@/api/index'
import { useDataCacheStore } from '@/stores/dataCache'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge/index'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Activity, Calendar, Wallet, FileText, TrendingDown, BarChart2, Car, Filter, Printer, Download, Check, Clock, ChevronLeft, ChevronRight, Lock, ShieldCheck, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-vue-next'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const contrats = ref<any[]>([])
const depenses = ref<any[]>([])

const loading = ref(true)
const currentPage = ref(1)
const pageSize = 10

const filterPeriod = ref('this_month')
const showFilterMenu = ref(false)
const filterHover = ref(false)
const printHover = ref(false)
const downloadHover = ref(false)
const customStartDate = ref(new Date().toISOString().split('T')[0])
const customEndDate = ref(new Date().toISOString().split('T')[0])

watch(filterPeriod, () => { currentPage.value = 1 })
watch([customStartDate, customEndDate], () => { currentPage.value = 1 })

interface Transaction {
  date: Date
  dateStr: string
  desc: string
  amount: number
  type: 'CONTRAT' | 'DEPENSE'
  reference?: string
  car?: string
}

const getPeriodLabel = () => {
  if (filterPeriod.value === 'this_month') return 'Ce Mois'
  if (filterPeriod.value === 'last_month') return 'Mois Dernier'
  if (filterPeriod.value === 'this_year') return 'Cette Année'
  if (filterPeriod.value === 'custom') {
    return `Du ${new Date(customStartDate.value).toLocaleDateString('fr-FR')} au ${new Date(customEndDate.value).toLocaleDateString('fr-FR')}`
  }
  return 'Tout'
}

const isDateInPeriod = (dateString: string | Date | undefined) => {
  if (!dateString) return false
  const d = new Date(dateString)
  const now = new Date()
  
  if (filterPeriod.value === 'this_month') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }
  if (filterPeriod.value === 'last_month') {
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    return d.getMonth() === lastMonth && d.getFullYear() === year
  }
  if (filterPeriod.value === 'this_year') {
    return d.getFullYear() === now.getFullYear()
  }
  if (filterPeriod.value === 'custom') {
    const start = new Date(customStartDate.value)
    const end = new Date(customEndDate.value)
    start.setHours(0,0,0,0)
    end.setHours(23,59,59,999)
    return d >= start && d <= end
  }
  return true
}

const filteredContrats = computed(() => contrats.value.filter(c => c.status !== 'cancelled' && isDateInPeriod(c.startDate)))
const filteredDepenses = computed(() => depenses.value.filter(d => isDateInPeriod(d.date || d.createdAt)))

const allTransactions = computed<Transaction[]>(() => {
  const txns: Transaction[] = []

  filteredContrats.value.forEach(c => {
    const dateObj = new Date(c.startDate)
    const dateStr = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const carMatricule = c.car?.matricule || ''
    txns.push({
      date: dateObj,
      dateStr,
      desc: `Contrat ${c.reference}`,
      amount: c.totalAmount || 0,
      type: 'CONTRAT',
      reference: c.reference,
      car: carMatricule
    })
  })

  filteredDepenses.value.forEach(d => {
    const dateObj = new Date(d.date || d.createdAt)
    const dateStr = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    txns.push({
      date: dateObj,
      dateStr,
      desc: d.description || d.category || 'Depense',
      amount: -(d.amount || 0),
      type: 'DEPENSE',
      car: d.car?.matricule || undefined
    })
  })

  txns.sort((a, b) => a.date.getTime() - b.date.getTime())
  return txns
})

interface DateGroup {
  dateKey: string
  dateStr: string
  transactions: Transaction[]
}

const groupedTransactions = computed<DateGroup[]>(() => {
  const groups = new Map<string, DateGroup>()
  for (const tx of allTransactions.value) {
    const key = tx.date.toISOString().split('T')[0]
    if (!groups.has(key)) {
      groups.set(key, { dateKey: key, dateStr: tx.dateStr, transactions: [] })
    }
    groups.get(key)!.transactions.push(tx)
  }
  return Array.from(groups.values())
})

const totalGroupPages = computed(() => Math.ceil(groupedTransactions.value.length / pageSize))
const paginatedGroups = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return groupedTransactions.value.slice(start, start + pageSize)
})

const totalIncomeFiltered = computed(() => {
  return filteredContrats.value.reduce((acc, c) => acc + (c.totalAmount || 0), 0)
})

const totalDepenseFiltered = computed(() => {
  return filteredDepenses.value.reduce((acc, d) => acc + (d.amount || 0), 0)
})

const netIncomeFiltered = computed(() => totalIncomeFiltered.value - totalDepenseFiltered.value)

const cacheStore = useDataCacheStore()

const fetchDashboardData = async (force = false) => {
  // If cache is ready, load immediately
  if (cacheStore.contratsSummary.length > 0 && cacheStore.depenses.length > 0 && !force) {
    contrats.value = cacheStore.contratsSummary
    depenses.value = cacheStore.depenses
    loading.value = false
    // Background refresh
    Promise.all([
      cacheStore.getContratsSummary(true),
      cacheStore.getDepenses(true)
    ]).then(([resContrats, resDepenses]) => {
      contrats.value = resContrats
      depenses.value = resDepenses
    })
    return
  }

  loading.value = contrats.value.length === 0
  try {
    const [resContrats, resDepenses] = await Promise.all([
      cacheStore.getContratsSummary(force),
      cacheStore.getDepenses(force)
    ])
    contrats.value = resContrats
    depenses.value = resDepenses
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  } finally {
    loading.value = false
  }
}

const router = useRouter()
const isUnlocked = ref(false)
const accessPassword = ref('')
const passwordError = ref('')
const verifyingPassword = ref(false)
const showPassword = ref(false)
const passwordInputRef = ref<HTMLInputElement | null>(null)

const unlockComptabilite = async () => {
  if (!accessPassword.value) {
    passwordError.value = 'Veuillez saisir votre mot de passe'
    return
  }
  verifyingPassword.value = true
  passwordError.value = ''
  try {
    const res = await authApi.verifyPassword(accessPassword.value)
    if (res?.valid) {
      isUnlocked.value = true
      fetchDashboardData()
    } else {
      passwordError.value = 'Mot de passe incorrect'
    }
  } catch (err) {
    passwordError.value = 'Erreur lors de la vérification'
  } finally {
    verifyingPassword.value = false
  }
}

onMounted(() => {
  // Wait for user to enter password before fetching or revealing any financial data
  nextTick(() => {
    passwordInputRef.value?.focus()
  })
})

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const buildBilanPDF = () => {
  let startStr = ''
  let endStr = ''
  const now = new Date()
  
  if (filterPeriod.value === 'this_month') {
    startStr = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('fr-FR')
    endStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('fr-FR')
  } else if (filterPeriod.value === 'last_month') {
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    startStr = new Date(year, lastMonth, 1).toLocaleDateString('fr-FR')
    endStr = new Date(year, lastMonth + 1, 0).toLocaleDateString('fr-FR')
  } else if (filterPeriod.value === 'this_year') {
    startStr = new Date(now.getFullYear(), 0, 1).toLocaleDateString('fr-FR')
    endStr = new Date(now.getFullYear(), 11, 31).toLocaleDateString('fr-FR')
  } else if (filterPeriod.value === 'custom') {
    startStr = new Date(customStartDate.value).toLocaleDateString('fr-FR')
    endStr = new Date(customEndDate.value).toLocaleDateString('fr-FR')
  }

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14

  // ── Header ──
  doc.setFontSize(24)
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.text('BILAN', margin, 20)

  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text('BILAN FINANCIER & COMPTABLE', margin, 28)

  doc.setFontSize(10)
  doc.setTextColor(79, 70, 229)
  doc.setFont('helvetica', 'bold')
  doc.text(`Periode: ${startStr || '---'} au ${endStr || '---'}`, margin, 35)

  doc.setFontSize(9)
  doc.setTextColor(148, 163, 184)
  doc.setFont('helvetica', 'normal')
  doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')} - ${allTransactions.value.length} operation(s)`, margin, 40)

  // ── Separator ──
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(margin, 43, pageWidth - margin, 43)

  // ── Build grouped rows (same as comptabilite view) ──
  const groups = groupedTransactions.value
  const bodyRows: any[][] = []

  for (const group of groups) {
    for (let i = 0; i < group.transactions.length; i++) {
      const tx = group.transactions[i]
      const dateCell = i === 0 ? group.dateStr : ''
      const typeLabel = tx.type === 'CONTRAT' ? 'Contrat' : 'Depense'
      const amountStr = tx.amount >= 0
        ? `+ ${tx.amount.toFixed(3)}`
        : `- ${Math.abs(tx.amount).toFixed(3)}`
      bodyRows.push([
        dateCell,
        typeLabel,
        tx.desc + (tx.car ? `  (${tx.car})` : ''),
        amountStr
      ])
    }
  }

  autoTable(doc, {
    startY: 48,
    head: [['DATE', 'TYPE', 'DETAILS OPERATIONS', 'MONTANT (TND)']],
    body: bodyRows,
    theme: 'grid',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 5
    },
    styles: {
      fontSize: 8,
      cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
      textColor: [51, 65, 85],
      lineColor: [241, 245, 249],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold', halign: 'center', textColor: [15, 23, 42] },
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 36, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const raw = data.row.raw as string[]

        if (data.column.index === 1) {
          if (raw[1] === 'Contrat') {
            data.cell.styles.textColor = [16, 185, 129]
            data.cell.styles.fontStyle = 'bold'
          } else {
            data.cell.styles.textColor = [244, 63, 94]
            data.cell.styles.fontStyle = 'bold'
          }
        }

        if (data.column.index === 3) {
          if (raw[3]?.startsWith('+')) data.cell.styles.textColor = [16, 185, 129]
          if (raw[3]?.startsWith('-')) data.cell.styles.textColor = [244, 63, 94]
        }
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const raw = data.row.raw as string[]
        if (raw[0]) {
          doc.setDrawColor(79, 70, 229)
          doc.setLineWidth(0.8)
          doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y)
        }
      }
    }
  })

  // ── Results Summary Section ──
  let finalY = (doc as any).lastAutoTable.finalY + 10
  const summaryWidth = 80
  const summaryX = pageWidth - margin - summaryWidth

  if (finalY + 40 > pageHeight) {
    doc.addPage()
    finalY = 20
  }

  autoTable(doc, {
    startY: finalY,
    tableWidth: summaryWidth,
    margin: { left: summaryX },
    head: [],
    body: [
      [
        { content: 'Total Recettes', styles: { fontStyle: 'bold', textColor: [30, 30, 30], fontSize: 7 } },
        { content: `${totalIncomeFiltered.value.toFixed(3)} TND`, styles: { halign: 'right', fontStyle: 'bold', textColor: [30, 30, 30], fontSize: 7 } }
      ],
      [
        { content: 'Total Depenses', styles: { fontStyle: 'bold', textColor: [30, 30, 30], fontSize: 7 } },
        { content: `${totalDepenseFiltered.value.toFixed(3)} TND`, styles: { halign: 'right', fontStyle: 'bold', textColor: [30, 30, 30], fontSize: 7 } }
      ],
      [
        { content: 'NET', styles: { fontStyle: 'bold', textColor: [79, 70, 229], fontSize: 8 } },
        { content: `${netIncomeFiltered.value.toFixed(3)} TND`, styles: { halign: 'right', fontStyle: 'bold', textColor: [79, 70, 229], fontSize: 8 } }
      ]
    ],
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 3,
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
      textColor: [30, 30, 30]
    },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: 'bold' },
      1: { cellWidth: 44 }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === 2) {
        data.cell.styles.fillColor = [238, 242, 255]
      }
    }
  })

  // ── Footer ──
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.setFont('helvetica', 'normal')
    doc.text(`DJERBA RENT A CAR - Bilan Financier`, margin, pageHeight - 8)
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' })
  }

  const safeFilenameDate = startStr && endStr 
    ? `${startStr.replace(/\//g, '-')}_Au_${endStr.replace(/\//g, '-')}`
    : 'Période_Complète'

  return { doc, safeFilenameDate }
}

const printBilanPDF = () => {
  const { doc } = buildBilanPDF()
  doc.autoPrint()
  doc.output('dataurlnewwindow')
}

const downloadBilanPDF = () => {
  const { doc, safeFilenameDate } = buildBilanPDF()
  doc.save(`Bilan_Financier_${safeFilenameDate}.pdf`)
}
</script>

<template>
  <!-- LOCKED STATE: Nothing is visible until correct password is submitted -->
  <div v-if="!isUnlocked" class="min-h-[80vh] flex items-center justify-center p-6">
    <div class="w-full max-w-md bg-white/90 backdrop-blur-3xl border border-slate-200/80 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-indigo-500/10 space-y-8 animate-in fade-in zoom-in-95 duration-500">
      
      <!-- Icon & Header -->
      <div class="flex flex-col items-center text-center space-y-4">
        <div class="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-inner relative group">
          <div class="absolute inset-0 rounded-3xl bg-indigo-500/10 blur-xl"></div>
          <Lock class="w-9 h-9 text-indigo-600 relative z-10 transition-transform duration-300 group-hover:scale-110" />
        </div>
        
        <div class="space-y-1.5">
          <h2 class="text-2xl font-black uppercase tracking-tight text-slate-900">
            Accès <span class="text-indigo-600 italic">Comptabilité</span>
          </h2>
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest max-w-xs">
            Veuillez saisir votre mot de passe pour déverrouiller le registre comptable
          </p>
        </div>
      </div>

      <!-- Password Form -->
      <form @submit.prevent="unlockComptabilite" class="space-y-4">
        <div class="space-y-2">
          <div class="relative">
            <Input
              ref="passwordInputRef"
              :type="showPassword ? 'text' : 'password'"
              v-model="accessPassword"
              placeholder="Mot de passe..."
              class="h-14 bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl pl-5 pr-12 font-bold text-sm text-slate-800 transition-all"
              :disabled="verifyingPassword"
              @keydown.enter="unlockComptabilite"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1"
            >
              <EyeOff v-if="showPassword" class="w-5 h-5" />
              <Eye v-else class="w-5 h-5" />
            </button>
          </div>

          <p v-if="passwordError" class="text-xs font-bold text-rose-500 pl-2 animate-in fade-in slide-in-from-top-1">
            {{ passwordError }}
          </p>
        </div>

        <Button
          type="submit"
          :disabled="verifyingPassword || !accessPassword"
          class="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-600/25 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          <Loader2 v-if="verifyingPassword" class="w-5 h-5 animate-spin" />
          <ShieldCheck v-else class="w-5 h-5" />
          <span>{{ verifyingPassword ? 'Vérification...' : 'Déverrouiller l\'Accès' }}</span>
        </Button>

        <button
          type="button"
          @click="router.push('/dashboard')"
          class="w-full py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1.5"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          Retour au tableau de bord
        </button>
      </form>
    </div>
  </div>

  <!-- UNLOCKED STATE: Full Comptabilité Dashboard -->
  <div v-else class="comptabilite-view p-8 lg:p-12 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500">
    
    <!-- HEADER & MASTER DASHBOARD -->
    <div class="flex flex-col gap-8">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white shrink-0">
            <BarChart2 class="w-7 h-7" />
          </div>
          <div>
            <h1 class="text-3xl font-black uppercase tracking-tight text-slate-900">
              Compta<span class="text-indigo-600">bilité</span>
            </h1>
            <p class="text-[11px] uppercase tracking-widest font-bold text-slate-400 mt-0.5">
              Registre des Contrats &amp; Dépenses
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <Button
            @click="printBilanPDF"
            class="h-11 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Printer class="w-4 h-4" />
            <span>Imprimer Bilan</span>
          </Button>

          <Button
            @click="downloadBilanPDF"
            variant="outline"
            class="h-11 px-5 rounded-xl border-slate-200 hover:border-emerald-500 hover:text-emerald-600 bg-white font-black text-xs uppercase tracking-wider text-slate-700 shadow-sm flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Download class="w-4 h-4" />
            <span>Télécharger PDF</span>
          </Button>

          <Button
            @click="isUnlocked = false; accessPassword = ''"
            variant="outline"
            class="h-11 w-11 rounded-xl border-slate-200 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center shadow-sm text-slate-500 transition-all"
            title="Verrouiller la comptabilité"
          >
            <Lock class="w-4 h-4" />
          </Button>
        </div>
      </div>

      <!-- Quick Period Switcher Toolbar -->
      <div class="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            v-for="p in [
              { id: 'this_month', label: 'Ce Mois' },
              { id: 'last_month', label: 'Mois Dernier' },
              { id: 'this_year', label: 'Cette Année' },
              { id: 'all', label: 'Tout le Temps' },
              { id: 'custom', label: 'Personnalisé' }
            ]"
            :key="p.id"
            @click="filterPeriod = p.id"
            :class="[
              'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0',
              filterPeriod === p.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            ]"
          >
            {{ p.label }}
          </button>
        </div>

        <div v-if="filterPeriod === 'custom'" class="flex items-center gap-2 w-full md:w-auto animate-in fade-in duration-300">
          <Input type="date" v-model="customStartDate" class="h-10 w-36 rounded-xl border-slate-200 text-xs font-bold text-slate-700 bg-slate-50" />
          <span class="text-slate-400 font-bold text-xs">au</span>
          <Input type="date" v-model="customEndDate" class="h-10 w-36 rounded-xl border-slate-200 text-xs font-bold text-slate-700 bg-slate-50" />
        </div>
      </div>

      <!-- KPI GRID -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
         <!-- INCOME -->
         <Card class="bg-indigo-600 border-none shadow-2xl shadow-indigo-600/30 rounded-[2.5rem] text-white relative overflow-hidden">
            <div class="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <CardContent class="p-8 relative z-10 flex flex-col justify-between h-full">
               <div class="flex items-center gap-4 mb-8">
                  <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                     <Wallet class="w-5 h-5 text-white" />
                  </div>
                  <div>
                     <p class="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Recettes (Contrats)</p>
                  </div>
               </div>
               <div>
                  <div v-if="loading" class="h-12 w-32 bg-white/20 rounded-xl animate-pulse mb-1"></div>
                  <div v-else class="text-5xl font-black tabular-nums tracking-tighter">{{ totalIncomeFiltered.toFixed(0) }}</div>
                  <span class="text-xs uppercase font-bold tracking-widest opacity-60">TND</span>
                </div>
            </CardContent>
         </Card>

         <!-- EXPENSES -->
         <Card class="bg-rose-50 border-none shadow-xl shadow-rose-100/50 rounded-[2.5rem] relative overflow-hidden">
            <CardContent class="p-8 flex flex-col justify-between h-full">
               <div class="flex items-center gap-4 mb-8">
                  <div class="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center">
                     <TrendingDown class="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                     <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Depenses Cumulees</p>
                  </div>
               </div>
               <div>
                  <div v-if="loading" class="h-10 w-28 bg-rose-200/60 rounded-xl animate-pulse mb-1"></div>
                  <div v-else class="text-4xl font-black tabular-nums tracking-tighter text-slate-800">{{ totalDepenseFiltered.toFixed(0) }}</div>
                  <span class="text-xs uppercase font-bold tracking-widest text-slate-400">TND</span>
               </div>
            </CardContent>
         </Card>

         <!-- NET -->
         <Card class="bg-emerald-50 border-none shadow-xl shadow-emerald-100/50 rounded-[2.5rem] relative overflow-hidden group">
            <CardContent class="p-8 flex flex-col justify-between h-full">
               <div class="flex items-center gap-4 mb-8">
                  <div class="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                     <Wallet class="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                     <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Revenu Net</p>
                  </div>
               </div>
               <div>
                  <div v-if="loading" class="h-10 w-28 bg-emerald-200/60 rounded-xl animate-pulse mb-1"></div>
                  <div v-else class="text-4xl font-black tabular-nums tracking-tighter text-slate-800">{{ netIncomeFiltered.toFixed(0) }}</div>
                  <span class="text-xs uppercase font-bold tracking-widest text-slate-400">TND</span>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>

    <!-- MAIN LIST -->
    <div v-if="loading" class="space-y-4">
       <div v-for="i in 3" :key="i" class="h-24 bg-slate-100 rounded-[2rem] animate-pulse"></div>
    </div>
    
    <div v-else class="space-y-6">
      <Card class="border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader class="p-8 pb-4 flex flex-row items-center justify-between">
          <div class="space-y-1">
            <CardTitle class="text-xl font-black text-slate-900 uppercase">Registre <span class="text-indigo-600 italic">Comptable</span></CardTitle>
            <CardDescription class="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Contrats & Depenses classes par date</CardDescription>
          </div>
          <Badge class="bg-slate-100 text-slate-500 border-none font-black text-[10px] tracking-widest">
            {{ allTransactions.length }} Operations
          </Badge>
        </CardHeader>
        <CardContent class="p-0">
          <Table>
            <TableHeader>
              <TableRow class="bg-slate-50/50 border-b border-slate-100">
                <TableHead class="pl-10 py-5 text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase w-[15%]">DATE</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase w-[12%] text-center">TYPE</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase w-[43%]">DETAILS</TableHead>
                <TableHead class="pr-10 text-right text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase w-[15%]">MONTANT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-for="(group, gIdx) in paginatedGroups" :key="group.dateKey">
                <TableRow 
                  v-for="(tx, tIdx) in group.transactions" 
                  :key="`${group.dateKey}-${tIdx}`"
                  :class="[
                    'group transition-all duration-300',
                    tIdx === 0 && gIdx > 0 ? 'border-t-2 border-indigo-200' : 'border-slate-100',
                    tx.type === 'CONTRAT' ? 'hover:bg-emerald-50/50' : 'hover:bg-rose-50/50'
                  ]"
                >
                  <!-- DATE (merged via rowspan) -->
                  <TableCell v-if="tIdx === 0" :rowspan="group.transactions.length" class="pl-10 py-5 border-r border-slate-100 bg-slate-50/30">
                    <div class="flex flex-col items-center gap-2">
                       <div class="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
                          <Calendar class="w-5 h-5" />
                       </div>
                       <span class="font-black text-slate-900 tabular-nums uppercase text-[11px] tracking-tighter text-center leading-tight">{{ tx.dateStr }}</span>
                       <Badge class="bg-indigo-600/10 text-indigo-600 text-[8px] font-black tracking-widest border-none px-2 py-0.5">
                         {{ group.transactions.length }} op.
                       </Badge>
                    </div>
                  </TableCell>
                  
                  <!-- TYPE -->
                  <TableCell class="text-center">
                    <Badge 
                      :class="[
                        'text-[9px] uppercase tracking-widest font-black px-3 py-1 border-none',
                        tx.type === 'CONTRAT' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'
                      ]"
                    >
                      {{ tx.type === 'CONTRAT' ? 'Contrat' : 'Depense' }}
                    </Badge>
                  </TableCell>
                  
                  <!-- DETAILS -->
                  <TableCell>
                    <div class="flex items-center gap-3">
                      <div :class="[
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110',
                        tx.type === 'CONTRAT' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-400'
                      ]">
                        <Car v-if="tx.type === 'CONTRAT'" class="w-5 h-5" />
                        <TrendingDown v-else class="w-5 h-5" />
                      </div>
                      <div>
                        <p class="text-sm font-bold text-slate-700 leading-tight">{{ tx.desc }}</p>
                        <p v-if="tx.car" class="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-widest">{{ tx.car }}</p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <!-- AMOUNT -->
                  <TableCell class="pr-10 text-right">
                    <p :class="['text-xl font-black tabular-nums tracking-tighter', tx.amount > 0 ? 'text-emerald-500' : 'text-rose-400']">
                      {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount.toFixed(0) }}
                      <span class="text-[9px] uppercase ml-1 opacity-60">TND</span>
                    </p>
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>

          <!-- Empty State -->
          <div v-if="allTransactions.length === 0" class="py-20 text-center space-y-6 bg-slate-50 border-t border-slate-100">
            <Activity class="w-12 h-12 mx-auto text-slate-300" />
            <p class="text-[10px] font-black uppercase tracking-widest opacity-40">Aucune operation comptable pour cette periode</p>
          </div>
          <div v-if="groupedTransactions.length > pageSize" class="flex items-center justify-between px-10 py-5 border-t border-slate-100 bg-slate-50/50">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Page {{ currentPage }} / {{ totalGroupPages }} — {{ groupedTransactions.length }} jours
            </p>
            <div class="flex items-center gap-2">
              <Button variant="outline" size="sm" :disabled="currentPage <= 1" @click="currentPage--" class="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-slate-200 disabled:opacity-30">
                <ChevronLeft class="w-4 h-4 mr-1" /> Precedent
              </Button>
              <Button variant="outline" size="sm" :disabled="currentPage >= totalGroupPages" @click="currentPage++" class="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-slate-200 disabled:opacity-30">
                Suivant <ChevronRight class="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.comptabilite-view {
  font-family: 'Outfit', sans-serif;
}
</style>
