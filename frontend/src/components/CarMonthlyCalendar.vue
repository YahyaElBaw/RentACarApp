<template>
  <div class="p-6 space-y-5">
    <!-- Controls -->
    <div class="flex items-center gap-2.5 bg-slate-50/80 px-4 py-3 rounded-2xl border border-slate-100">
      <div class="flex items-center gap-2">
        <div class="flex items-center bg-white rounded-xl shadow-sm border border-slate-200 p-1">
          <Button variant="ghost" size="icon" class="w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100" @click="prevMonth">
            <ChevronLeft class="w-4 h-4" />
          </Button>
          <span class="px-3 text-xs font-black text-slate-900 uppercase tracking-wider min-w-[130px] text-center italic">
            {{ monthYearLabel }}
          </span>
          <Button variant="ghost" size="icon" class="w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-100" @click="nextMonth">
            <ChevronRight class="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" @click="goToday" class="h-9 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white border-slate-200 text-slate-600 hover:bg-slate-100">
          Aujourd'hui
        </Button>
      </div>

      <div class="flex items-center gap-2.5 ml-auto">
        <div class="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button
            @click="actionFilter = 'all'"
            :class="['px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all', actionFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900']"
          >
            Toutes
          </button>
          <button
            @click="actionFilter = 'reservation'"
            :class="[
              'px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5',
              actionFilter === 'reservation' ? 'bg-amber-400 text-amber-950 shadow-md' : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50'
            ]"
          >
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600/30"></span>
            <span>Réservation</span>
          </button>
          <button
            @click="actionFilter = 'contrat'"
            :class="[
              'px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5',
              actionFilter === 'contrat' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50'
            ]"
          >
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white"></span>
            <span>Contrat</span>
          </button>
        </div>

        <button
          @click="currentOnly = !currentOnly"
          :class="[
            'h-9 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border shadow-sm whitespace-nowrap',
            currentOnly ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white text-indigo-600 hover:bg-indigo-50 border-slate-200'
          ]"
          title="Afficher uniquement les contrats en cours"
        >
          <span :class="['w-2.5 h-2.5 rounded-full', currentOnly ? 'bg-white' : 'bg-indigo-500']"></span>
          Contrats en cours
        </button>

        <Button variant="ghost" size="icon" class="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-indigo-600 hover:bg-indigo-50" @click="loadData" :disabled="loading">
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
          <RotateCw v-else class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <!-- Grid -->
    <div class="border border-slate-200 rounded-3xl overflow-hidden shadow-sm bg-slate-200">
      <div class="grid grid-cols-7 bg-slate-900 text-white text-center font-black text-[10px] tracking-[0.2em] py-3 uppercase">
        <div>Lun</div><div>Mar</div><div>Mer</div><div>Jeu</div><div>Ven</div><div>Sam</div><div>Dim</div>
      </div>

      <div v-if="loading && !events.length" class="p-16 flex justify-center">
        <Loader2 class="w-6 h-6 animate-spin text-indigo-500" />
      </div>

      <div v-else class="grid grid-cols-7 gap-px bg-slate-200">
        <div
          v-for="day in calendarGrid"
          :key="day.dateStr"
          @click="openDayModal(day)"
          :class="[
            'min-h-[110px] p-2 flex flex-col justify-start gap-1 transition-all duration-200 relative cursor-pointer',
            day.isCurrentMonth ? 'bg-white hover:bg-indigo-50/30' : 'bg-slate-50/70',
            day.isToday ? 'ring-2 ring-indigo-600 ring-inset bg-indigo-50/40' : ''
          ]"
        >
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

          <div class="flex-1 flex flex-col gap-1 overflow-hidden">
            <div
              v-for="evt in getDayEvents(day.dateStr).slice(0, 3)"
              :key="evt.id + evt.dayType"
              @click.stop="navigateToEvent(evt)"
              :class="[
                'px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-tight flex items-center gap-1.5 transition-all duration-200 truncate cursor-pointer shadow-2xs hover:scale-[1.02]',
                evt.dayType === 'depart' ? 'bg-red-500/20 border-red-300 text-rose-950 hover:bg-red-500/40'
                  : evt.dayType === 'retour' ? 'bg-green-500/20 border-green-300 text-emerald-950 hover:bg-green-500/40'
                  : evt.dayType === 'rented' ? 'bg-indigo-500/20 border-indigo-300 text-indigo-950 hover:bg-indigo-500/40'
                  : 'bg-amber-400/20 border-amber-300 text-amber-950 hover:bg-amber-400/40'
              ]"
              :title="`${evt.dayType === 'depart' ? 'Départ' : evt.dayType === 'retour' ? 'Retour' : evt.dayType === 'rented' ? 'En location' : 'Réservation'}: ${evt.carLabel} — ${evt.clientName}`"
            >
              <span
                :class="[
                  'w-2 h-2 rounded-full shrink-0 shadow-2xs',
                  evt.dayType === 'depart' ? 'bg-red-500 ring-2 ring-white' : evt.dayType === 'retour' ? 'bg-green-500 ring-2 ring-white' : evt.dayType === 'rented' ? 'bg-indigo-500' : 'bg-amber-500'
                ]"
              ></span>

              <span class="truncate font-mono font-black">{{ evt.carLabel }}</span>

              <span v-if="evt.dayType === 'depart'" class="ml-auto text-[7px] font-black opacity-75 shrink-0 px-1 rounded bg-red-200 text-red-700">DEP</span>
              <span v-else-if="evt.dayType === 'retour'" class="ml-auto text-[7px] font-black opacity-75 shrink-0 px-1 rounded bg-green-200 text-emerald-700">RET</span>
              <span v-else-if="evt.dayType === 'rented'" class="ml-auto text-[7px] font-black opacity-75 shrink-0 px-1 rounded bg-indigo-200 text-indigo-700">LOUÉ</span>
            </div>

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

    <!-- Day Modal -->
    <Dialog v-model:open="showDayModal">
      <DialogContent v-if="selectedDayData" overlay-class="z-[2000]!" class="sm:max-w-xl bg-white border-none shadow-2xl rounded-[2.5rem] p-8 overflow-y-auto max-h-[85vh] no-scrollbar z-[2000]!">
        <div class="space-y-6">
          <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <DialogTitle class="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Actions du <span class="text-indigo-600 italic">{{ selectedDayData.dateFormatted }}</span>
            </DialogTitle>
          </div>
          <div class="space-y-3">
            <div
              v-for="evt in selectedDayData.events"
              :key="evt.id + evt.dayType"
              @click="navigateToEvent(evt)"
              class="p-4 rounded-2xl border bg-white hover:shadow-md transition-all cursor-pointer flex items-center gap-4"
            >
              <span :class="['text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shrink-0',
                evt.dayType === 'depart' ? 'bg-rose-100 text-rose-700' : evt.dayType === 'retour' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700']">
                {{ evt.dayType === 'depart' ? 'Départ' : evt.dayType === 'retour' ? 'Retour' : 'Réservation' }}
              </span>
              <div class="flex-1 min-w-0">
                <p class="font-mono font-black text-slate-900 text-sm">{{ evt.carLabel }}</p>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{{ evt.clientName }}<span v-if="evt.category === 'contrat' && evt.reference"> — {{ evt.reference }}</span></p>
              </div>
              <Badge :class="['text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border shrink-0',
                evt.category === 'contrat' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20']">
                {{ evt.category === 'contrat' ? 'Contrat' : 'Réserv.' }}
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, Loader2, RotateCw } from 'lucide-vue-next'
import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { contratApi, reservationApi } from '@/api'

const props = defineProps<{ carId: string }>()

const router = useRouter()
const loading = ref(false)
const contrats = ref<any[]>([])
const reservations = ref<any[]>([])
const currentDate = ref(new Date())
const actionFilter = ref<'all' | 'reservation' | 'contrat'>('all')
const currentOnly = ref(false)

const selectedDayData = ref<{ dateStr: string; dateFormatted: string; events: any[] } | null>(null)
const showDayModal = ref(false)

const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const monthYearLabel = computed(() => {
  const d = currentDate.value
  return `${months[d.getMonth()]} ${d.getFullYear()}`
})

const prevMonth = () => {
  const d = currentDate.value
  currentDate.value = new Date(d.getFullYear(), d.getMonth() - 1, 1)
}
const nextMonth = () => {
  const d = currentDate.value
  currentDate.value = new Date(d.getFullYear(), d.getMonth() + 1, 1)
}
const goToday = () => {
  currentDate.value = new Date()
}

const formatDateStr = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface CalendarGridDay {
  date: Date
  dateStr: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
}

const calendarGrid = computed<CalendarGridDay[]>(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  let startDayOfWeek = firstDayOfMonth.getDay() - 1
  if (startDayOfWeek < 0) startDayOfWeek = 6

  const todayStr = formatDateStr(new Date())
  const days: CalendarGridDay[] = []

  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i)
    days.push({ date: d, dateStr: formatDateStr(d), dayNumber: d.getDate(), isCurrentMonth: false, isToday: formatDateStr(d) === todayStr })
  }

  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    const d = new Date(year, month, day)
    days.push({ date: d, dateStr: formatDateStr(d), dayNumber: day, isCurrentMonth: true, isToday: formatDateStr(d) === todayStr })
  }

  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      days.push({ date: d, dateStr: formatDateStr(d), dayNumber: i, isCurrentMonth: false, isToday: formatDateStr(d) === todayStr })
    }
  }

  return days
})

const events = computed(() => {
  const out: any[] = []
  for (const c of contrats.value) {
    if (!c.startDate || !c.endDate) continue
    const status = String(c.status || 'active').toLowerCase()
    if (status === 'cancelled' || status === 'annulé') continue
    const carObj = c.car || {}
    const carIdStr = String(carObj._id || carObj.id || '')
    if (!props.carId || carIdStr !== String(props.carId)) continue

    const clientsList = Array.isArray(c.clients) ? c.clients : []
    const firstClient = clientsList[0] || null
    const clientName = firstClient
      ? `${firstClient.lastName || ''} ${firstClient.firstName || ''}`.trim()
      : (c.clientName || 'Client')

    out.push({
      id: c._id,
      category: 'contrat',
      reference: c.reference || '',
      carLabel: carObj.matricule || 'Sans Plaque',
      clientName,
      startDateStr: formatDateStr(new Date(c.startDate)),
      endDateStr: formatDateStr(new Date(c.endDate)),
      status: c.status || 'active'
    })
  }
  for (const r of reservations.value) {
    if (!r.startDate || !r.endDate) continue
    const status = String(r.status || 'pending').toLowerCase()
    if (status === 'cancelled' || status === 'annulé' || status === 'pending' || status === 'planifié' || status === 'planifiee' || status === 'converted') continue
    const carObj = r.car || {}
    const carIdStr = String(carObj._id || carObj.id || '')
    if (!props.carId || carIdStr !== String(props.carId)) continue

    const clientsList = Array.isArray(r.clients) ? r.clients : []
    const firstClient = clientsList[0] || null
    const clientName = r.clientName || (firstClient ? `${firstClient.lastName || ''} ${firstClient.firstName || ''}`.trim() : 'Client')

    out.push({
      id: r._id,
      category: 'reservation',
      reference: '',
      carLabel: carObj.matricule || 'Sans Plaque',
      clientName,
      startDateStr: formatDateStr(new Date(r.startDate)),
      endDateStr: formatDateStr(new Date(r.endDate)),
      status: r.status || 'pending'
    })
  }
  return out
})

const filteredEvents = computed(() => {
  return events.value.filter(evt => {
    if (actionFilter.value !== 'all' && evt.category !== actionFilter.value) return false
    if (currentOnly.value && evt.category !== 'contrat') return false
    if (currentOnly.value && String(evt.status).toLowerCase() !== 'active') return false
    return true
  })
})

const getDayEvents = (dateStr: string) => {
  return filteredEvents.value.reduce<any[]>((acc, evt) => {
    if (dateStr < evt.startDateStr || dateStr > evt.endDateStr) return acc
    const isStart = dateStr === evt.startDateStr
    const isEnd = dateStr === evt.endDateStr
    if (evt.category === 'reservation') {
      acc.push({ ...evt, dayType: 'reservation' })
    } else if (isStart && isEnd) {
      acc.push({ ...evt, dayType: 'depart' })
      acc.push({ ...evt, dayType: 'retour' })
    } else if (isStart) {
      acc.push({ ...evt, dayType: 'depart' })
    } else if (isEnd) {
      acc.push({ ...evt, dayType: 'retour' })
    } else {
      acc.push({ ...evt, dayType: 'rented' })
    }
    return acc
  }, [])
}

const openDayModal = (day: CalendarGridDay) => {
  const evts = getDayEvents(day.dateStr).filter(e => e.dayType !== 'rented')
  if (!evts.length) return
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  const formatted = day.date.toLocaleDateString('fr-FR', options)
  selectedDayData.value = {
    dateStr: day.dateStr,
    dateFormatted: formatted.charAt(0).toUpperCase() + formatted.slice(1),
    events: evts
  }
  showDayModal.value = true
}

const navigateToEvent = (evt: any) => {
  showDayModal.value = false
  if (evt.category === 'contrat') router.push(`/contrats/${evt.id}`)
  else router.push(`/reservations?id=${evt.id}`)
}

const loadData = async () => {
  loading.value = true
  try {
    const [cts, res] = await Promise.all([
      contratApi.getAll(),
      reservationApi.getAll()
    ])
    contrats.value = cts || []
    reservations.value = res || []
  } catch (err) {
    console.error('Failed to load car calendar data', err)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
