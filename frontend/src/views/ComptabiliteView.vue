<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { journeeApi, type Journee } from '@/api/journee'
import { carApi, depenseApi, settingApi } from '@/api/index'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge/index'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from 'primevue/usetoast'
import { Activity, Calendar, Wallet, FileText, LayoutList, ChevronRight, Clock, Trash2, Eye, EyeOff, BarChart2, Car, TrendingDown, Filter, Download, Check, Settings, Loader2, Percent, DollarSign } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler } from 'chart.js'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale, Filler)

const authStore = useAuthStore()

const journees = ref<Journee[]>([])
const cars = ref<any[]>([])
const depenses = ref<any[]>([])

const toast = useToast()
const loading = ref(true)

// Sidebar Chart State
const showAnalytics = ref(false)

// Filter & Download State
const filterPeriod = ref('this_month')
const showFilterMenu = ref(false)

const customStartDate = ref(new Date().toISOString().split('T')[0])
const customEndDate = ref(new Date().toISOString().split('T')[0])

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
  return true // 'all'
}

const filteredJournees = computed(() => journees.value.filter(j => isDateInPeriod(j.date) && j.entries && j.entries.length > 0))
const filteredDepenses = computed(() => depenses.value.filter(dep => isDateInPeriod(dep.date || dep.createdAt)))

const downloadBilanPDF = () => {
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

  const safeFilenameDate = startStr && endStr 
      ? `${startStr.replace(/\//g, '-')}_Au_${endStr.replace(/\//g, '-')}`
      : 'Période_Complète'

  const doc = new jsPDF()

  // Header
  doc.setFontSize(22)
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.text("BILAN", 14, 20)

  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text("BILAN FINANCIER & COMPTABLE", 14, 28)

  doc.setFontSize(10)
  doc.setTextColor(79, 70, 229)
  doc.text(`Période: ${startStr} au ${endStr}`, 14, 34)

  // Build transaction list from journees + depenses
  const allTransactions: { date: Date; dateStr: string; desc: string; amount: number; type: string }[] = []

  filteredJournees.value.forEach(j => {
    const dateObj = new Date(j.date)
    const dateStr = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    if (j.entries && j.entries.length > 0) {
      j.entries.forEach((e: any) => {
        const t = (e.entryType || e.type || 'Opération').replace(/_/g, ' ')
        const d = e.description || 'Flux financier'
        const a = Number(e.amount) || 0
        allTransactions.push({
          date: dateObj,
          dateStr,
          desc: `${t}: ${d}`,
          amount: a,
          type: a >= 0 ? 'RECETTE' : 'DÉPENSE'
        })
      })
    }
  })

  filteredDepenses.value.forEach(d => {
    const dateObj = new Date(d.date || d.createdAt)
    const dateStr = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    allTransactions.push({
      date: dateObj,
      dateStr,
      desc: d.description || 'Dépense',
      amount: -(d.amount || 0),
      type: 'DÉPENSE'
    })
  })

  // Sort by date
  allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime())

  let prevDate = ''
  const tableRows = allTransactions.map(t => {
    const sameDate = t.dateStr === prevDate
    prevDate = t.dateStr
    return [
      sameDate ? '' : t.dateStr,
      t.desc,
      t.amount >= 0 ? `+ ${t.amount.toFixed(3)}` : `- ${Math.abs(t.amount).toFixed(3)}`
    ]
  })

  // Transaction table
  autoTable(doc, {
    startY: 42,
    head: [['Date', 'Détails Opérations', 'Montant (TND)']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 6
    },
    styles: {
      fontSize: 9,
      cellPadding: { top: 4, right: 6, bottom: 4, left: 6 },
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30, textColor: [15, 23, 42], halign: 'center', valign: 'middle' },
      1: { cellWidth: 'auto', valign: 'middle' },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 40, valign: 'middle' }
    },
    didDrawCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 0) {
          const raw = data.row.raw as string[]
          if (raw[0] && data.row.index > 0) {
            doc.setDrawColor(180, 180, 195)
            doc.setLineWidth(0.5)
            doc.line(data.cell.x, data.cell.y, doc.internal.pageSize.width - 14, data.cell.y)
          }
        }
        if (data.column.index === 1) {
          doc.setDrawColor(220, 220, 230)
          doc.setLineWidth(0.3)
          doc.line(data.cell.x, data.cell.y + data.cell.height, doc.internal.pageSize.width - 14, data.cell.y + data.cell.height)
        }
      }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const raw = data.row.raw as string[]
        if (raw[2]?.startsWith('+')) data.cell.styles.textColor = [16, 185, 129]
        if (raw[2]?.startsWith('-')) data.cell.styles.textColor = [244, 63, 94]
      }
    }
  })

  // Summary table at the right
  const finalY = (doc as any).lastAutoTable.finalY + 16
  const tableX = 130

  autoTable(doc, {
    startY: finalY,
    tableWidth: 66,
    margin: { left: tableX },
    head: [],
    body: [
      ['Recettes', { content: `${totalIncomeFiltered.value.toFixed(3)}`, styles: { textColor: [16, 185, 129], halign: 'center', fontStyle: 'bold' } }],
      ['Dépenses', { content: `${totalDepenseFiltered.value.toFixed(3)}`, styles: { textColor: [244, 63, 94], halign: 'center', fontStyle: 'bold' } }],
      ['Revenu Net', { content: `${netIncomeFiltered.value.toFixed(3)}`, styles: { textColor: [79, 70, 229], halign: 'center', fontStyle: 'bold' } }],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 3
    },
    styles: {
      fontSize: 9,
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: 'bold' },
      1: { cellWidth: 30 }
    }
  })

  doc.save(`Bilan_Financier_${safeFilenameDate}.pdf`)
}

// Modal State
const selectedJournee = ref<Journee | null>(null)
const showDetailsDialog = ref(false)

// Password Challenge State
const showPasswordChallenge = ref(false)
const adminPassword = ref('')
const showPassword = ref(false)
const deleteError = ref('')
const submittingDelete = ref(false)

const getSafeEntry = (entry: any) => {
    const t = entry.entryType || entry.type || 'TRANSACTION'
    const d = entry.description || 'Flux financier'
    const a = Number(entry.amount) || 0
    return {
       rawType: t,
       displayType: t.replace(/_/g, ' '),
       description: d,
       amount: a,
       reference: entry.reference || '',
       time: entry.time
    }
}

const fetchDashboardData = async () => {
  try {
    const [resJournees, resCars, resDepenses] = await Promise.all([
      journeeApi.getJournees(),
      carApi.getAll({}),
      depenseApi.getAll()
    ])
    journees.value = resJournees
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

const openDetails = (journee: Journee) => {
  selectedJournee.value = journee
  showDetailsDialog.value = true
}

const triggerDeleteChallenge = () => {
  if (!selectedJournee.value?._id) return
  adminPassword.value = ''
  deleteError.value = ''
  showPassword.value = false
  showPasswordChallenge.value = true
}

const confirmDeleteJournee = async () => {
  if (!selectedJournee.value?._id) return
  if (!adminPassword.value) {
    deleteError.value = "Le mot de passe est obligatoire."
    return
  }
  
  submittingDelete.value = true
  deleteError.value = ''
  
  try {
    await journeeApi.deleteJournee(selectedJournee.value._id, adminPassword.value)
    showPasswordChallenge.value = false
    showDetailsDialog.value = false
    loading.value = true
    await fetchDashboardData()
  } catch (error) {
    console.error('Failed to delete journee:', error)
    deleteError.value = "❌ Action refusée : Mot de passe incorrect ou manque d'autorisation."
  } finally {
    submittingDelete.value = false
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const totalIncomeFiltered = computed(() => {
  return filteredJournees.value.reduce((acc, curr) => acc + (curr.totalDaily || 0), 0)
})

const totalDepenseFiltered = computed(() => {
  return filteredDepenses.value.reduce((acc, curr) => acc + (curr.amount || 0), 0)
})

const activeCarsCount = computed(() => {
  return cars.value.filter(c => c.isAvailable).length
})

const netIncomeFiltered = computed(() => totalIncomeFiltered.value - totalDepenseFiltered.value)

const chartData = computed(() => {
  const monthJournees = filteredJournees.value
  const monthDepenses = filteredDepenses.value
  
  // Aggregate unique dates natively and sort chronological
  const rawDates = new Set<string>()
  monthJournees.forEach(j => rawDates.add(new Date(j.date).toISOString().split('T')[0]))
  monthDepenses.forEach(dep => rawDates.add(new Date(dep.date || dep.createdAt).toISOString().split('T')[0]))
  
  let sortedRaw = Array.from(rawDates).sort()
  
  if (sortedRaw.length === 0) {
    sortedRaw = [new Date().toISOString().split('T')[0]] // Force fallback baseline
  }
  
  const labels = sortedRaw.map(d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }))
  
  // Project vectors
  const incomeData = sortedRaw.map(dateStr => {
    return monthJournees
      .filter(j => new Date(j.date).toISOString().split('T')[0] === dateStr)
      .reduce((sum, j) => sum + (j.totalDaily || 0), 0)
  })
  
  const depenseData = sortedRaw.map(dateStr => {
    return monthDepenses
      .filter(dep => new Date(dep.date || dep.createdAt).toISOString().split('T')[0] === dateStr)
      .reduce((sum, dep) => sum + (dep.amount || 0), 0)
  })
  
  const netData = incomeData.map((inc, i) => inc - depenseData[i])

  return {
    labels,
    datasets: [
      {
        label: 'Revenus (TND)',
        data: incomeData,
        borderColor: '#10b981', // Emerald/Green
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
        borderColor: '#f43f5e', // Rose/Red
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
        borderColor: '#3b82f6', // Blue
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
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
    x: { grid: { display: false } }
  }
}

const getTransactionIcon = (type: any) => {
  if (!type || typeof type !== 'string') return Activity
  if (type.includes('CONTRAT')) return FileText
  if (type.includes('PAIEMENT')) return Wallet
  return Activity
}
</script>

<template>
  <div class="comptabilite-view p-8 lg:p-12 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500">
    
    <!-- HEADER & MASTER DASHBOARD -->
    <div class="flex flex-col gap-10">
      <div class="space-y-2 flex-col items-start gap-4 flex md:flex-row md:items-end justify-between">
        <div>
           <div class="flex items-center gap-4">
              <h1 class="text-4xl font-black uppercase tracking-tighter flex items-center gap-4">
                 Compta<span class="text-primary">bilité</span>
              </h1>
              <Badge class="bg-indigo-600/10 text-indigo-600 border-none font-black tracking-widest uppercase text-[10px] mt-1">{{ getPeriodLabel() }}</Badge>
           </div>
           <p class="text-[10px] uppercase tracking-widest font-black opacity-60">Grand Livre & Balance</p>
        </div>
        

            <div class="flex items-center gap-2">
               <!-- Conditional Custom Date Pickers -->
               <div v-if="filterPeriod === 'custom'" class="flex items-center gap-2 mr-2 animate-in fade-in slide-in-from-right-4 duration-500">
                  <Input type="date" v-model="customStartDate" class="h-12 w-36 rounded-2xl border-slate-200 text-xs font-bold text-slate-600 bg-white shadow-sm" />
                  <span class="text-slate-300 font-bold">-</span>
                  <Input type="date" v-model="customEndDate" class="h-12 w-36 rounded-2xl border-slate-200 text-xs font-bold text-slate-600 bg-white shadow-sm" />
               </div>

               <div class="relative">
                  <Button 
                    @click="showFilterMenu = !showFilterMenu"
                    variant="outline" 
                    class="h-12 px-6 rounded-2xl font-black tracking-widest uppercase text-[10px] flex items-center gap-2 border-slate-200"
                  >
                    <Filter class="w-4 h-4" />
                    Filtres
                  </Button>
                  <!-- Dropdown Menu -->
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
                          Cette Année
                          <Check v-if="filterPeriod === 'this_year'" class="w-4 h-4" />
                      </button>
                      <button @click="filterPeriod = 'all'; showFilterMenu = false" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-indigo-600 flex items-center justify-between">
                          Tout le Temps
                          <Check v-if="filterPeriod === 'all'" class="w-4 h-4" />
                      </button>
                      <div class="h-px bg-slate-100 my-1 mx-3"></div>
                      <button @click="filterPeriod = 'custom'; showFilterMenu = false" class="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-between">
                          Période Personnalisée
                          <Check v-if="filterPeriod === 'custom'" class="w-4 h-4" />
                      </button>
                  </div>
               </div>
               
               <Button 
                 @click="downloadBilanPDF"
                 class="h-12 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black tracking-widest uppercase text-[10px] flex items-center gap-2 shadow-xl shadow-slate-900/20 ml-2"
               >
                 <Download class="w-4 h-4" />
                 Bilan
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
                     <p class="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Recettes Mensuelles</p>
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
                     <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Dépenses Cumulées</p>
                  </div>
               </div>
               <div>
                  <div class="text-4xl font-black tabular-nums tracking-tighter text-slate-800">{{ totalDepenseFiltered.toFixed(0) }}</div>
                  <span class="text-xs uppercase font-bold tracking-widest text-slate-400">TND</span>
               </div>
            </CardContent>
         </Card>

         <!-- FLEET -->
         <Card class="bg-slate-50 border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] relative overflow-hidden group">
            <CardContent class="p-8 flex flex-col justify-between h-full">
               <div class="flex items-center gap-4 mb-8">
                  <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                     <Car class="w-5 h-5 text-slate-700 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <div>
                     <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Parc Actif</p>
                  </div>
               </div>
               <div>
                  <div class="text-4xl font-black tabular-nums tracking-tighter text-slate-800">{{ activeCarsCount }}</div>
                  <span class="text-xs uppercase font-bold tracking-widest text-slate-400">Véhicules Disponibles</span>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>

    <!-- MAIN LIST -->
    <div v-if="loading" class="space-y-4">
       <!-- Skeletons -->
       <div v-for="i in 3" :key="i" class="h-24 bg-slate-100 rounded-[2rem] animate-pulse"></div>
    </div>
    
    <div v-else class="space-y-6">
      <Card class="border border-slate-100 shadow-2xl shadow-slate-200/50 bg-white rounded-[2.5rem] overflow-hidden">
        <CardHeader class="p-8 pb-4 flex flex-row items-center justify-between">
          <div class="space-y-1">
            <CardTitle class="text-xl font-black text-slate-900 uppercase">Archives <span class="text-indigo-600 italic">Comptables</span></CardTitle>
            <CardDescription class="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Registre des opérations journalières</CardDescription>
          </div>
        </CardHeader>
        <CardContent class="p-0">
          <Table>
            <TableHeader>
              <TableRow class="bg-slate-50/50 border-b border-slate-100">
                <TableHead class="pl-10 py-5 text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase w-1/3">DATE D'OUVERTURE</TableHead>
                <TableHead class="text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase w-1/3 text-center">STATUT & MOUVEMENTS</TableHead>
                <TableHead class="pr-10 text-right text-slate-400 font-black text-[9px] tracking-[0.3em] uppercase w-1/3">RECETTE JOURNALIÈRE</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow 
                v-for="journee in filteredJournees" 
                :key="journee._id" 
                @click="openDetails(journee)"
                :class="[
                  'group transition-all duration-300 cursor-pointer border-slate-100',
                  journee.status === 'open' ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-slate-50/50'
                ]"
              >
                <!-- DATE -->
                <TableCell class="pl-10 py-6">
                  <div class="flex items-center gap-4">
                     <div :class="[
                        'w-10 h-10 rounded-[1rem] flex items-center justify-center shrink-0 border transition-all', 
                        journee.status === 'open' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30 group-hover:scale-110' : 'bg-slate-50 border-slate-200 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 group-hover:scale-110'
                     ]">
                        <Calendar class="w-5 h-5" />
                     </div>
                     <span class="font-black text-slate-900 tabular-nums uppercase text-sm tracking-tighter">{{ formatDate(journee.date) }}</span>
                  </div>
                </TableCell>
                
                <!-- STATUS & MOVEMENTS -->
                <TableCell class="text-center">
                  <div class="flex flex-col items-center justify-center gap-1.5">
                     <Badge v-if="journee.status === 'open'" class="bg-primary hover:bg-primary text-white text-[9px] uppercase tracking-widest font-black px-3 py-0.5 border-none shadow-sm">En Cours</Badge>
                     <Badge v-else class="bg-slate-100 text-slate-500 hover:bg-slate-100 text-[9px] uppercase tracking-widest font-black px-3 py-0.5 border-none">Clôturée</Badge>
                     
                     <span :class="['text-[9px] font-black uppercase tracking-widest italic', journee.status === 'open' ? 'text-primary animate-pulse' : 'text-slate-400']">
                        {{ journee.entries.length }} Mouvements
                     </span>
                  </div>
                </TableCell>
                
                <!-- RECETTE -->
                <TableCell class="pr-10 text-right">
                  <div class="flex items-center justify-end gap-6">
                    <div>
                      <p class="text-2xl font-black tabular-nums tracking-tighter leading-none text-slate-900 group-hover:scale-105 transition-transform origin-right">
                        {{ (journee.totalDaily || 0).toFixed(0) }} 
                      </p>
                      <span class="text-[9px] text-emerald-500 font-black uppercase tracking-widest">TND</span>
                    </div>
                    <ChevronRight :class="['w-5 h-5 transition-transform group-hover:translate-x-1', journee.status === 'open' ? 'text-primary' : 'text-slate-300 group-hover:text-primary']" />
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <!-- Empty State -->
          <div v-if="journees.length === 0" class="py-20 text-center space-y-6 bg-slate-50 border-t border-slate-100">
            <Activity class="w-12 h-12 mx-auto text-slate-300" />
            <p class="text-[10px] font-black uppercase tracking-widest opacity-40">Aucune donnée comptable disponible</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- DETAILS DIALOG -->
    <Dialog v-model:open="showDetailsDialog">
      <DialogContent class="max-w-3xl bg-slate-50 border-none shadow-3xl rounded-[3rem] p-0 overflow-hidden text-foreground flex flex-col max-h-[90vh]">
        
        <!-- Dialog Header -->
        <div class="px-10 py-10 shrink-0 text-white relative overflow-hidden bg-slate-900">
           <!-- Decor -->
           <div class="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

           <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
              <div class="space-y-4">
                 <div class="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-xl">
                    <LayoutList class="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <DialogTitle class="text-2xl font-black uppercase tracking-tight">Registre Journalier</DialogTitle>
                    <DialogDescription class="text-[11px] font-black uppercase tracking-widest text-white/50 mt-1">
                      {{ selectedJournee ? formatDate(selectedJournee.date) : '' }}
                    </DialogDescription>
                 </div>
              </div>

              <div class="text-right pb-1">
                 <p class="text-[9px] font-black uppercase tracking-[0.2em] opacity-50 mb-2 text-emerald-400">Balance Totale Arrêtée</p>
                 <div class="flex items-center justify-end gap-4">
                   <p class="text-5xl font-black tabular-nums tracking-tighter leading-none">{{ (selectedJournee?.totalDaily || 0).toFixed(0) }} <span class="text-base uppercase ml-1 opacity-50">TND</span></p>
                   <button 
                     v-if="authStore.isAdmin"
                     @click="triggerDeleteChallenge"
                     class="w-12 h-12 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 flex items-center justify-center rounded-2xl transition-all hover:scale-105 active:scale-95 ml-4"
                     title="Supprimer la grille"
                   >
                     <Trash2 class="w-5 h-5" />
                   </button>
                 </div>
              </div>
           </div>
        </div>

        <!-- Dialog Body: Entries List -->
        <div class="p-10 overflow-y-auto flex-1 bg-white">
          <h3 class="text-[10px] font-black uppercase tracking-widest opacity-40 mb-8 border-b border-slate-100 pb-4">Extrait des Transactions ({{ selectedJournee?.entries.length }})</h3>
          
          <div class="space-y-4">
            <div 
              v-for="(entry, index) in (selectedJournee?.entries || []).map(getSafeEntry)" 
              :key="index"
              class="group flex flex-col md:flex-row gap-6 p-6 rounded-[2rem] bg-slate-50/50 hover:bg-slate-50 border border-slate-100 transition-all hover:shadow-lg hover:shadow-slate-200/40 hover:-translate-y-0.5"
            >
              <div class="flex items-center md:items-start gap-5 md:w-1/3 shrink-0">
                <div class="w-14 h-14 bg-white shadow-sm border border-slate-200 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <component :is="getTransactionIcon(entry.rawType)" class="w-5 h-5 text-indigo-600" />
                </div>
                <div class="pt-1.5 space-y-1">
                  <p class="text-[10px] font-black uppercase tracking-widest text-slate-800">{{ entry.displayType }}</p>
                  <div class="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                     <Clock class="w-3 h-3 text-indigo-400"/> {{ formatDateTime(entry.time) }}
                  </div>
                </div>
              </div>

              <div class="flex-1 md:border-l border-slate-200 md:pl-8 pt-2 md:pt-1">
                <p class="text-sm font-bold text-slate-700 leading-tight">{{ entry.description }}</p>
                <p v-if="entry.reference" class="text-[9px] font-black font-mono text-slate-400 mt-3 uppercase tracking-widest">REF: <span class="text-indigo-500">{{ entry.reference }}</span></p>
              </div>

              <div class="md:text-right pt-4 md:pt-1 md:w-1/4 flex flex-col justify-center">
                <p :class="['text-2xl font-black tabular-nums tracking-tighter', (entry.amount || 0) > 0 ? 'text-emerald-500' : 'text-slate-400']">
                  {{ (entry.amount || 0) > 0 ? '+' : '' }}{{ (entry.amount || 0).toFixed(0) }} <span class="text-[9px] uppercase ml-1">TND</span>
                </p>
              </div>
            </div>

            <div v-if="selectedJournee?.entries.length === 0" class="text-center py-16 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
              <Activity class="w-10 h-10 mx-auto text-slate-300 mb-4" />
              <p class="text-[10px] font-black uppercase tracking-widest opacity-40">Aucun flux financier enregistré</p>
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>

    <!-- PASSWORD CHALLENGE DIALOG -->
    <Dialog v-model:open="showPasswordChallenge">
      <DialogContent class="sm:max-w-md bg-white border-none shadow-3xl rounded-[2.5rem] p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
        <DialogHeader class="mb-6 space-y-3">
          <div class="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-inner">
             <Trash2 class="w-8 h-8 text-rose-500" />
          </div>
          <DialogTitle class="text-2xl font-black text-rose-600 uppercase italic tracking-tighter text-center">Zone de Danger</DialogTitle>
          <DialogDescription class="text-center font-bold text-slate-500 text-xs leading-relaxed px-4">
             Vous êtes sur le point de purger un registre comptable. <br/>Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>

        <form @submit.prevent="confirmDeleteJournee" class="space-y-6">
          <div class="space-y-3">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Autorisation Administrateur</label>
            <div class="relative w-full">
               <Input 
                 :type="showPassword ? 'text' : 'password'" 
                 v-model="adminPassword" 
                 placeholder="Saisissez votre mot de passe..." 
                 required 
                 class="h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold tracking-widest text-center text-lg pr-12 focus:ring-rose-500/20 focus:border-rose-500" 
               />
               <button 
                 type="button" 
                 @click="showPassword = !showPassword" 
                 class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
               >
                 <Eye v-if="!showPassword" class="w-5 h-5" />
                 <EyeOff v-else class="w-5 h-5" />
               </button>
            </div>
            <p v-if="deleteError" class="text-[10px] font-black uppercase tracking-widest text-rose-500 text-center animate-in slide-in-from-top-1 mt-2">
               {{ deleteError }}
            </p>
          </div>

          <DialogFooter class="flex sm:flex-row flex-col gap-3 pt-4 sm:justify-between border-t border-slate-100">
            <Button 
              type="button" 
              variant="outline" 
              @click="showPasswordChallenge = false" 
              class="h-12 flex-1 rounded-xl bg-slate-50 border-slate-200 text-slate-500 font-black uppercase tracking-widest text-[10px]"
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              :disabled="submittingDelete" 
              class="h-12 flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-500/30 transition-all active:scale-95"
            >
              {{ submittingDelete ? 'Destruction...' : 'Archiver la Grille' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>



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
         <div class="grid grid-cols-2 gap-4">
            <div class="bg-indigo-50/50 border border-indigo-100/50 p-5 rounded-[2rem]">
               <p class="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2">Revenu Net</p>
               <p class="text-3xl font-black tabular-nums tracking-tighter text-indigo-600">{{ netIncomeFiltered.toFixed(0) }}</p>
            </div>
            <div class="bg-emerald-50/50 border border-emerald-100/50 p-5 rounded-[2rem]">
               <p class="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2">Recettes</p>
               <p class="text-3xl font-black tabular-nums tracking-tighter text-emerald-600">{{ totalIncomeFiltered.toFixed(0) }}</p>
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
    
    <!-- BACKDROP (Optional, if you want click-outside behavior) -->
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
