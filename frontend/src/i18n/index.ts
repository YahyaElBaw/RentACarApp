import { createI18n } from 'vue-i18n';

const messages = {
  fr: {
    menu: {
      dashboard: 'Tableau de bord',
      cars: 'Voitures',
      clients: 'Clients',
      contracts: 'Contrats',
      reservations: 'Réservations',
      availability: 'Disponibilité',
      expenses: 'Dépenses',
      settings: 'Paramètres',
      users: 'Personnel',
      accounting: 'Comptabilité',
      undefined: 'RentACar'
    },
    dashboard: {
      totalCars: 'Total Voitures',
      available: 'Disponible',
      rented: 'Loué',
      revenue: 'Chiffre d\'affaires',
      expenses: 'Dépenses',
      profit: 'Bénéfice Net'
    }
  }
};

const i18n = createI18n({
  legacy: false,
  locale: 'fr',
  fallbackLocale: 'fr',
  messages
});

export default i18n;
