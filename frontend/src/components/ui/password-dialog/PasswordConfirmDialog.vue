<template>
  <Dialog :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogContent class="sm:max-w-md bg-white border-none shadow-[0_20px_60px_rgba(0,0,0,0.3)] rounded-[2rem] p-8 no-scrollbar" hideClose>
      <DialogHeader class="space-y-4">
        <div class="w-14 h-14 rounded-2xl bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-200 shrink-0">
          <AlertTriangle class="w-7 h-7 text-white" />
        </div>
        <DialogTitle class="text-xl font-black text-slate-900 uppercase italic tracking-tighter text-left">
          {{ title }}<span v-if="subtitle" class="text-rose-600"> {{ subtitle }}</span>
        </DialogTitle>
        <p v-if="description" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left leading-relaxed -mt-2">{{ description }}</p>
      </DialogHeader>

      <div class="space-y-4 mt-1">
        <div v-if="guard.isLocked" class="flex items-center justify-center gap-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl px-4 py-3">
          <Lock class="w-4 h-4 shrink-0" />
          <span class="text-[10px] font-black uppercase tracking-widest">Trop de tentatives — réessayez dans {{ guard.remainingSeconds }}s</span>
        </div>

        <div class="relative">
          <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400 pointer-events-none" />
          <Input
            :type="showPwd ? 'text' : 'password'"
            :model-value="password ?? ''"
            @update:model-value="(v: any) => emit('update:password', String(v))"
            :disabled="disabled || guard.isLocked"
            :placeholder="placeholder"
            class="h-14 bg-rose-50 border-rose-100 placeholder:text-rose-300 text-rose-700 rounded-2xl font-black font-mono tracking-widest pl-12 pr-12 focus-visible:ring-rose-500/20 focus-visible:border-rose-400"
            @keydown.enter="tryConfirm"
          />
          <button type="button" @click="showPwd = !showPwd" tabindex="-1"
            class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 transition-colors outline-none">
            <Eye v-if="!showPwd" class="w-5 h-5" />
            <EyeOff v-else class="w-5 h-5" />
          </button>
        </div>

        <p v-if="error" class="text-[10px] font-black text-rose-500 uppercase italic">⚠ {{ error }}</p>
      </div>

      <DialogFooter class="flex gap-2 mt-6 flex-col sm:flex-row">
        <Button variant="ghost" @click="emit('update:open', false)"
          class="flex-1 h-12 font-black uppercase text-[10px] tracking-widest rounded-xl text-slate-400 hover:text-slate-900 transition-colors">
          Annuler
        </Button>
        <Button @click="tryConfirm" :disabled="loading || !password || disabled || guard.isLocked"
          class="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-rose-200 disabled:opacity-60 disabled:cursor-not-allowed">
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin mr-2" />
          {{ loading ? loadingLabel : confirmLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Eye, EyeOff, Lock, AlertTriangle, Loader2 } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { usePasswordGuard } from '@/composables/usePasswordGuard'

const props = withDefaults(
  defineProps<{
    open: boolean
    password?: string
    title?: string
    subtitle?: string
    description?: string
    placeholder?: string
    confirmLabel?: string
    loadingLabel?: string
    loading?: boolean
    disabled?: boolean
    error?: string
  }>(),
  {
    password: '',
    title: 'Confirmation',
    subtitle: '',
    description: '',
    placeholder: 'Votre mot de passe...',
    confirmLabel: 'Confirmer',
    loadingLabel: 'Traitement...',
    loading: false,
    disabled: false,
    error: '',
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:password', value: string): void
  (e: 'confirm'): void
}>()

const guard = usePasswordGuard()
const showPwd = ref(false)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) showPwd.value = false
  },
)

const tryConfirm = () => {
  if (!props.password || props.loading || props.disabled || guard.isLocked) return
  emit('confirm')
}
</script>
