<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { contratApi, depenseApi, carApi } from '@/api/index'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge/index'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Activity, Calendar, Wallet, FileText, TrendingDown, BarChart2, Car, Filter, Printer, Download, Check, Clock, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler } from 'chart.js'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler)

const contrats = ref<any[]>([])
const cars = ref<any[]>([])
const depenses = ref<any[]>([])

const loading = ref(true)
const showAnalytics = ref(false)
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

const chartData = computed(() => {
  const rawDates = new Set<string>()
  filteredContrats.value.forEach(c => rawDates.add(new Date(c.startDate).toISOString().split('T')[0]))
  filteredDepenses.value.forEach(d => rawDates.add(new Date(d.date || d.createdAt).toISOString().split('T')[0]))

  let sortedRaw = Array.from(rawDates).sort()
  if (sortedRaw.length === 0) {
    sortedRaw = [new Date().toISOString().split('T')[0]]
  }

  const labels = sortedRaw.map(d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }))

  const incomeData = sortedRaw.map(dateStr => {
    return filteredContrats.value
      .filter(c => new Date(c.startDate).toISOString().split('T')[0] === dateStr)
      .reduce((sum, c) => sum + (c.totalAmount || 0), 0)
  })

  const depenseData = sortedRaw.map(dateStr => {
    return filteredDepenses.value
      .filter(d => new Date(d.date || d.createdAt).toISOString().split('T')[0] === dateStr)
      .reduce((sum, d) => sum - (d.amount || 0), 0)
  })

  const netData = incomeData.map((inc, i) => inc - depenseData[i])

  return {
    labels,
    datasets: [
      {
        label: 'Revenus (TND)',
        data: incomeData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        tension: 0.4,
        fill: true
      },
      {
        label: 'Dépenses (TND)',
        data: depenseData,
        borderColor: '#f43f5e',
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#f43f5e',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        tension: 0.4,
        fill: true
      },
      {
        label: 'Revenu Net (TND)',
        data: netData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        tension: 0.4,
        fill: true
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: 'top' as const }
  },
  scales: {
    y: { grid: { color: 'rgba(0,0,0,0.05)' } },
    x: { grid: { display: false } }
  }
}

const fetchDashboardData = async () => {
  try {
    const [resContrats, resCars, resDepenses] = await Promise.all([
      contratApi.getAll(),
      carApi.getAll({}),
      depenseApi.getAll()
    ])
    contrats.value = resContrats
    cars.value = resCars
    depenses.value = resDepenses
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboardData()
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
  <div class="comptabilite-view p-8 lg:p-12 max-w-7xl mx-auto space-y-12">
    
    <!-- HEADER & MASTER DASHBOARD -->
    <div class="flex flex-col gap-10">
      <div class="space-y-2 flex-col items-start gap-4 flex md:flex-row md:items-end justify-between">
        <div>
           <div class="flex items-center gap-4">
              <h1 class="text-4xl font-black uppercase tracking-tighter flex items-center gap-4">
                 Compta<span class="text-primary">bilite</span>
              </h1>
              <Badge class="bg-indigo-600/10 text-indigo-600 border-none font-black tracking-widest uppercase text-[10px] mt-1">{{ getPeriodLabel() }}</Badge>
           </div>
           <p class="text-[10px] uppercase tracking-widest font-black opacity-60">Registre des Contrats & Depenses</p>
        </div>

        <div class="flex items-center gap-2">
           <div v-if="filterPeriod === 'custom'" class="flex items-center gap-2 mr-2 animate-in fade-in slide-in-from-right-4 duration-500">
              <Input type="date" v-model="customStartDate" class="h-12 w-36 rounded-2xl border-slate-200 text-xs font-bold text-slate-600 bg-white shadow-sm" />
              <span class="text-slate-300 font-bold">-</span>
              <Input type="date" v-model="customEndDate" class="h-12 w-36 rounded-2xl border-slate-200 text-xs font-bold text-slate-600 bg-white shadow-sm" />
           </div>

           <div class="relative">
              <Button 
                @click="showFilterMenu = !showFilterMenu"
                @mouseenter="filterHover = true"
                @mouseleave="filterHover = false"
                variant="outline" 
                :class="'group relative h-12 rounded-2xl font-black tracking-widest uppercase text-[10px] overflow-hidden flex items-center justify-start border-2 border-slate-200 hover:border-indigo-400 transition-all duration-300 active:scale-95 hover:shadow-xl hover:shadow-indigo-200/50 ' + (filterHover ? 'w-44' : 'w-12')"
              >
                <div class="absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Filter class="w-4 h-4 transition-transform duration-300 group-hover:rotate-[-20deg] group-hover:scale-110" />
                </div>
                <span :class="[filterHover ? 'opacity-100' : 'opacity-0', 'whitespace-nowrap transition-all duration-300 pl-10 pr-4 text-slate-600 group-hover:text-indigo-600']">Filtres</span>
              </Button>
              <div v-if="showFilterMenu" class="absolute right-0 top-14 w-52 bg-white border border-slate-100 rounded-3xl shadow-3xl overflow-hidden z-50 py-2">
                  <button @click="filterPeriod = 'this_month'; showFilterMenu = false" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center justify-between">
                      Ce Mois
                      <Check v-if="filterPeriod === 'this_month'" class="w-4 h-4" />
                  </button>
                  <button @click="filterPeriod = 'last_month'; showFilterMenu = false" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center justify-between">
                      Mois Dernier
                      <Check v-if="filterPeriod === 'last_month'" class="w-4 h-4" />
                  </button>
                  <button @click="filterPeriod = 'this_year'; showFilterMenu = false" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center justify-between">
                      Cette Annee
                      <Check v-if="filterPeriod === 'this_year'" class="w-4 h-4" />
                  </button>
                  <button @click="filterPeriod = 'all'; showFilterMenu = false" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center justify-between">
                      Tout le Temps
                      <Check v-if="filterPeriod === 'all'" class="w-4 h-4" />
                  </button>
                  <div class="h-px bg-slate-100 my-1 mx-3"></div>
                  <button @click="filterPeriod = 'custom'; showFilterMenu = false" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-between">
                      Periode Personnalisee
                      <Check v-if="filterPeriod === 'custom'" class="w-4 h-4" />
                  </button>
              </div>
           </div>
           
           <Button 
             @click="printBilanPDF"
             @mouseenter="printHover = true"
             @mouseleave="printHover = false"
             :class="'group relative h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black tracking-widest uppercase text-[10px] overflow-hidden flex items-center justify-start shadow-xl shadow-slate-900/20 transition-all duration-300 active:scale-95 hover:scale-105 hover:-translate-y-0.5 ' + (printHover ? 'w-44' : 'w-12')"
           >
             <div class="absolute inset-y-0 left-0 flex items-center pl-3.5">
               <Printer class="w-4 h-4 transition-transform duration-300 group-hover:rotate-[-15deg] group-hover:scale-110" />
             </div>
             <span :class="[printHover ? 'opacity-100' : 'opacity-0', 'whitespace-nowrap transition-all duration-300 pl-10 pr-4']">Imprimer</span>
           </Button>
           <Button 
             @click="downloadBilanPDF"
             @mouseenter="downloadHover = true"
             @mouseleave="downloadHover = false"
             variant="outline"
             :class="'group relative h-12 rounded-2xl font-black tracking-widest uppercase text-[10px] overflow-hidden flex items-center justify-start border-2 border-slate-200 hover:border-emerald-400 transition-all duration-300 active:scale-95 hover:shadow-xl hover:shadow-emerald-200/50 ' + (downloadHover ? 'w-52' : 'w-12')"
           >
             <div class="absolute inset-y-0 left-0 flex items-center pl-3.5">
               <Download class="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5 group-hover:scale-110" />
             </div>
             <span :class="[downloadHover ? 'opacity-100' : 'opacity-0', 'whitespace-nowrap transition-all duration-300 pl-10 pr-4 text-slate-600 group-hover:text-emerald-600']">Télécharger</span>
           </Button>
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
                  <div class="text-5xl font-black tabular-nums tracking-tighter">{{ totalIncomeFiltered.toFixed(0) }}</div>
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
                  <div class="text-4xl font-black tabular-nums tracking-tighter text-slate-800">{{ totalDepenseFiltered.toFixed(0) }}</div>
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
                  <div class="text-4xl font-black tabular-nums tracking-tighter text-slate-800">{{ netIncomeFiltered.toFixed(0) }}</div>
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

    <!-- FLOATING ACTION BUTTON -->
    <button 
      @click="showAnalytics = !showAnalytics"
      class="fixed bottom-10 right-10 z-[100] w-16 h-16 bg-slate-900 hover:bg-indigo-600 text-white rounded-full shadow-2xl shadow-slate-900/40 flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95 group"
    >
      <BarChart2 class="w-6 h-6 group-hover:animate-pulse" />
    </button>

    <!-- SLIDING ANALYTICS PANEL -->
    <div 
      :class="[
        'fixed inset-y-0 right-0 z-[90] w-full max-w-4xl bg-white border-l border-slate-100 shadow-3xl transform transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col',
        showAnalytics ? 'translate-x-0' : 'translate-x-full'
      ]"
    >
      <div class="p-8 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
         <div class="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center flex-shrink-0">
             <BarChart2 class="w-6 h-6 text-indigo-600" />
         </div>
         <div class="flex-1">
             <h2 class="text-xl font-black text-slate-900 uppercase tracking-tighter">Bilan <span class="text-indigo-600 italic">Financier</span></h2>
             <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{{ getPeriodLabel() }}</p>
         </div>
      </div>
      
      <div class="flex-1 overflow-y-auto p-8 space-y-10">
         <!-- MINI KPI -->
         <div class="grid grid-cols-3 gap-4">
            <div class="bg-indigo-50/50 border border-indigo-100/50 p-5 rounded-[2rem]">
               <p class="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2">Revenu Net</p>
               <p class="text-3xl font-black tabular-nums tracking-tighter text-indigo-600">{{ netIncomeFiltered.toFixed(0) }}</p>
            </div>
            <div class="bg-emerald-50/50 border border-emerald-100/50 p-5 rounded-[2rem]">
               <p class="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2">Recettes</p>
               <p class="text-3xl font-black tabular-nums tracking-tighter text-emerald-600">{{ totalIncomeFiltered.toFixed(0) }}</p>
            </div>
            <div class="bg-rose-50/50 border border-rose-100/50 p-5 rounded-[2rem]">
               <p class="text-[9px] font-black uppercase tracking-[0.2em] text-rose-400 mb-2">Depenses</p>
               <p class="text-3xl font-black tabular-nums tracking-tighter text-rose-600">{{ totalDepenseFiltered.toFixed(0) }}</p>
            </div>
         </div>

         <!-- CHART SECTION -->
         <div class="space-y-4">
             <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Tableau de Bord Visuel</h3>
             <div class="bg-slate-50 border border-slate-100 p-8 rounded-[3rem] w-full aspect-[2/1] relative">
                <Line v-if="showAnalytics" :data="chartData" :options="chartOptions" />
             </div>
         </div>
      </div>
    </div>
    
    <!-- BACKDROP -->
    <div 
      v-if="showAnalytics" 
      @click="showAnalytics = false"
      class="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[80] transition-opacity animate-in fade-in duration-500"
    ></div>

  </div>
</template>

<style scoped>
.comptabilite-view {
  font-family: 'Outfit', sans-serif;
}
</style>
