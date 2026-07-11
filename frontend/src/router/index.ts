import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import DashboardView from '../views/DashboardView.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { public: true, title: 'Connexion' }
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { title: 'Tableau de Bord' }
    },
    {
      path: '/availability',
      name: 'availability',
      component: () => import('../views/AvailabilityView.vue'),
      meta: { title: 'Disponibilité' }
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../views/UserManagementView.vue'),
      meta: { admin: true, title: 'Personnel' }
    },
    {
      path: '/cars',
      name: 'cars',
      component: () => import('../views/CarListView.vue'),
      meta: { title: 'Flotte' }
    },
    {
      path: '/cars/:id',
      name: 'car-detail',
      component: () => import('../views/CarDetailView.vue')
    },
    {
      path: '/clients',
      name: 'clients',
      component: () => import('../views/ClientListView.vue'),
      meta: { title: 'Clients' }
    },
    {
      path: '/clients/:id',
      name: 'client-detail',
      component: () => import('../views/ClientDetailView.vue')
    },
    {
      path: '/contrats',
      name: 'contrats',
      component: () => import('../views/ContratListView.vue'),
      meta: { title: 'Contrats' }
    },
    {
      path: '/contrats/new',
      name: 'contrat-new',
      component: () => import('../views/ContratFormView.vue')
    },
    {
      path: '/contrats/:id',
      name: 'contrat-detail',
      component: () => import('../views/ContratDetailView.vue')
    },
    {
      path: '/reservations',
      name: 'reservations',
      component: () => import('../views/ReservationListView.vue'),
      meta: { title: 'Réservations' }
    },
    {
      path: '/depenses',
      name: 'depenses',
      component: () => import('../views/DepenseListView.vue')
    },
    {
      path: '/comptabilite',
      name: 'accounting',
      component: () => import('../views/ComptabiliteView.vue'),
      meta: { title: 'Comptabilité' }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { admin: true, title: 'Paramètres' }
    }
  ]
});

router.beforeEach((to) => {
  const authStore = useAuthStore();
  const isAuthenticated = authStore.isAuthenticated;
  const isAdmin = authStore.isAdmin;

  // Set page title
  const baseTitle = 'RentCar';
  const pageTitle = to.meta.title as string;
  document.title = pageTitle ? `${pageTitle} | ${baseTitle}` : baseTitle;

  if (to.meta.public) {
    if (isAuthenticated) return { name: 'dashboard' };
    return true;
  } else {
    if (!isAuthenticated) return { name: 'login' };
    if (to.meta.admin && !isAdmin) return { name: 'dashboard' };
    return true;
  }
});

export default router;
