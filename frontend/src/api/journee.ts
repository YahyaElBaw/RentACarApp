import api from './index';

export interface JourneeEntry {
  type: string;
  description: string;
  amount: number;
  reference: string;
  time: string;
  _id?: string;
}

export interface Journee {
  _id: string;
  date: string;
  status: 'open' | 'closed';
  entries: JourneeEntry[];
  totalDaily: number;
  createdAt: string;
  updatedAt: string;
}

export const journeeApi = {
  getJournees: () => api.get<Journee[]>('/journees').then(res => res.data),
  deleteJournee: (id: string, password: string) => api.delete<void>(`/journees/${id}`, { data: { password } }).then(res => res.data),
};
