import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import Aura from '@primevue/themes/aura';
import App from './App.vue';
import router from './router';
import i18n from './i18n';
import { useAuthStore } from './stores/auth';

import 'primeicons/primeicons.css';
import './style.css';

async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);

  // Validate stored token before mounting — prevents stale-session blank dashboard
  const authStore = useAuthStore();
  if (authStore.token) {
    await Promise.race([
      authStore.fetchProfile(),
      new Promise<void>((resolve) => setTimeout(resolve, 4000)),
    ]);
  }

  app.use(router);
  app.use(i18n);
  app.use(ToastService);
  app.use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        prefix: 'p',
        darkModeSelector: '.my-app-dark',
        cssLayer: false,
      },
    },
  });
  app.mount('#app');
}

bootstrap();
