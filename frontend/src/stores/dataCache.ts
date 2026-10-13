import { defineStore } from 'pinia';
import { ref } from 'vue';
import { carApi, agenceApi, reservationApi, contratApi, depenseApi, dashboardApi, settingApi } from '@/api';

export const useDataCacheStore = defineStore('dataCache', () => {
  // ── State ─────────────────────────────────────────────────────────
  const cars = ref<any[]>([]);
  const carsLoaded = ref(false);
  const carsLoading = ref(false);

  const agences = ref<any[]>([]);
  const agencesLoaded = ref(false);

  const reservations = ref<any[]>([]);
  const reservationsLoaded = ref(false);
  const reservationsLoading = ref(false);

  const depenses = ref<any[]>([]);
  const depensesLoaded = ref(false);
  const depensesLoading = ref(false);

  const contratsSummary = ref<any[]>([]);
  const contratsSummaryLoaded = ref(false);

  const dashboardData = ref<any>(null);
  const dashboardLoaded = ref(false);

  const depenseCategories = ref<string[]>([]);
  const depenseCategoriesLoaded = ref(false);

  // Availability query cache: key `${start}_${end}` -> cars array
  const availabilityCache = new Map<string, { data: any[]; timestamp: number }>();

  // ── Actions ───────────────────────────────────────────────────────
  async function getCars(force = false) {
    if (carsLoaded.value && !force) {
      // Trigger background silent revalidation
      silentRevalidateCars();
      return cars.value;
    }
    carsLoading.value = true;
    try {
      const data = await carApi.getAll();
      cars.value = data || [];
      carsLoaded.value = true;
      return cars.value;
    } catch (err) {
      console.error('DataCache: getCars failed', err);
      return cars.value;
    } finally {
      carsLoading.value = false;
    }
  }

  async function silentRevalidateCars() {
    try {
      const data = await carApi.getAll();
      if (Array.isArray(data)) {
        cars.value = data;
        carsLoaded.value = true;
      }
    } catch {
      // silent background failure
    }
  }

  async function getAgences(force = false) {
    if (agencesLoaded.value && !force) return agences.value;
    try {
      const data = await agenceApi.getAll();
      agences.value = data || [];
      agencesLoaded.value = true;
      return agences.value;
    } catch (err) {
      console.error('DataCache: getAgences failed', err);
      return agences.value;
    }
  }

  async function getReservations(force = false) {
    if (reservationsLoaded.value && !force) {
      silentRevalidateReservations();
      return reservations.value;
    }
    reservationsLoading.value = true;
    try {
      const data = await reservationApi.getAll();
      reservations.value = data || [];
      reservationsLoaded.value = true;
      return reservations.value;
    } catch (err) {
      console.error('DataCache: getReservations failed', err);
      return reservations.value;
    } finally {
      reservationsLoading.value = false;
    }
  }

  async function silentRevalidateReservations() {
    try {
      const data = await reservationApi.getAll();
      if (Array.isArray(data)) {
        reservations.value = data;
        reservationsLoaded.value = true;
      }
    } catch {
      // silent
    }
  }

  async function getDepenses(force = false) {
    if (depensesLoaded.value && !force) {
      silentRevalidateDepenses();
      return depenses.value;
    }
    depensesLoading.value = true;
    try {
      const data = await depenseApi.getAll();
      depenses.value = data || [];
      depensesLoaded.value = true;
      return depenses.value;
    } catch (err) {
      console.error('DataCache: getDepenses failed', err);
      return depenses.value;
    } finally {
      depensesLoading.value = false;
    }
  }

  async function silentRevalidateDepenses() {
    try {
      const data = await depenseApi.getAll();
      if (Array.isArray(data)) {
        depenses.value = data;
        depensesLoaded.value = true;
      }
    } catch {
      // silent
    }
  }

  async function getContratsSummary(force = false) {
    if (contratsSummaryLoaded.value && !force) {
      silentRevalidateContratsSummary();
      return contratsSummary.value;
    }
    try {
      const data = await contratApi.getAll({ summary: 'true' });
      contratsSummary.value = data || [];
      contratsSummaryLoaded.value = true;
      return contratsSummary.value;
    } catch (err) {
      console.error('DataCache: getContratsSummary failed', err);
      return contratsSummary.value;
    }
  }

  async function silentRevalidateContratsSummary() {
    try {
      const data = await contratApi.getAll({ summary: 'true' });
      if (Array.isArray(data)) {
        contratsSummary.value = data;
        contratsSummaryLoaded.value = true;
      }
    } catch {
      // silent
    }
  }

  async function getDashboardData(params?: any, force = false) {
    if (dashboardLoaded.value && dashboardData.value && !force) {
      silentRevalidateDashboard(params);
      return dashboardData.value;
    }
    try {
      const data = await dashboardApi.getStats(params);
      dashboardData.value = data;
      dashboardLoaded.value = true;
      return data;
    } catch (err) {
      console.error('DataCache: getDashboardData failed', err);
      return dashboardData.value;
    }
  }

  async function silentRevalidateDashboard(params?: any) {
    try {
      const data = await dashboardApi.getStats(params);
      if (data) {
        dashboardData.value = data;
        dashboardLoaded.value = true;
      }
    } catch {
      // silent
    }
  }

  async function getDepenseCategories(force = false) {
    if (depenseCategoriesLoaded.value && !force) return depenseCategories.value;
    try {
      const settings: any = await settingApi.get();
      if (Array.isArray(settings?.depenseCategories) && settings.depenseCategories.length > 0) {
        depenseCategories.value = settings.depenseCategories;
      }
      depenseCategoriesLoaded.value = true;
      return depenseCategories.value;
    } catch (err) {
      return depenseCategories.value;
    }
  }

  async function getAvailableCars(startDate: string, endDate: string, force = false) {
    const key = `${startDate}_${endDate}`;
    const cached = availabilityCache.get(key);
    const now = Date.now();
    if (cached && !force && (now - cached.timestamp < 30000)) {
      return cached.data;
    }
    const data = await carApi.getAvailableSearch(startDate, endDate);
    const list = (data || []).filter((c: any) => !c.disabled);
    availabilityCache.set(key, { data: list, timestamp: now });
    return list;
  }

  // ── Cache Invalidation & Mutations ─────────────────────────────────
  function invalidateCars() {
    carsLoaded.value = false;
    availabilityCache.clear();
  }

  function invalidateReservations() {
    reservationsLoaded.value = false;
    availabilityCache.clear();
  }

  function invalidateDepenses() {
    depensesLoaded.value = false;
  }

  function invalidateContrats() {
    contratsSummaryLoaded.value = false;
    availabilityCache.clear();
  }

  function invalidateDashboard() {
    dashboardLoaded.value = false;
  }

  return {
    cars,
    carsLoaded,
    carsLoading,
    agences,
    agencesLoaded,
    reservations,
    reservationsLoaded,
    reservationsLoading,
    depenses,
    depensesLoaded,
    depensesLoading,
    contratsSummary,
    contratsSummaryLoaded,
    dashboardData,
    dashboardLoaded,
    depenseCategories,
    depenseCategoriesLoaded,

    getCars,
    silentRevalidateCars,
    getAgences,
    getReservations,
    silentRevalidateReservations,
    getDepenses,
    silentRevalidateDepenses,
    getContratsSummary,
    getDashboardData,
    silentRevalidateDashboard,
    getDepenseCategories,
    getAvailableCars,

    invalidateCars,
    invalidateReservations,
    invalidateDepenses,
    invalidateContrats,
    invalidateDashboard,
  };
});
