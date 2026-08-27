import { create } from 'zustand';

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  birthday: '',
  phoneCountryCode: '+216',
  phone: '',
  nationality: '',
  lieuNaissance: '',
  address: '',
  description: '',
  idCardType: 'cin',
  cin: '',
  cinDate: '',
  drivingLicense: '',
  licenseDate: '',
  lieuPermis: '',
  cinFront: '',
  cinBack: '',
  licenseFront: '',
  licenseBack: '',
};

interface AddClientFormState {
  form: typeof INITIAL_FORM;
  setField: (key: string, value: string) => void;
  resetForm: () => void;
}

export const useAddClientFormStore = create<AddClientFormState>((set) => ({
  form: { ...INITIAL_FORM },
  setField: (key, value) => set((state) => ({ form: { ...state.form, [key]: value } })),
  resetForm: () => set({ form: { ...INITIAL_FORM } }),
}));
