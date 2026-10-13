<template>
  <Dialog :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogContent 
      class="sm:max-w-md bg-white/95 backdrop-blur-2xl border border-white/80 shadow-[0_25px_70px_-15px_rgba(15,23,42,0.25)] rounded-[2.25rem] p-8 no-scrollbar z-[300]" 
      hideClose
    >
      <DialogHeader class="space-y-4 text-left">
        <!-- Floating Ambient Icon -->
        <div class="flex items-center justify-between">
          <div 
            :class="[
              'w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-transform duration-300 hover:scale-105',
              variantClasses.iconContainer
            ]"
          >
            <component :is="activeIcon" class="w-7 h-7 text-white stroke-[2.2]" />
          </div>

          <div class="px-3 py-1 rounded-full bg-slate-100 border border-slate-200/60 text-slate-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-xs">
            <ShieldCheck class="w-3.5 h-3.5 text-indigo-600" />
            <span>Sécurité Requise</span>
          </div>
        </div>

        <div>
          <DialogTitle class="text-2xl font-black text-slate-900 uppercase tracking-tight text-left">
            {{ title }}
            <span v-if="subtitle" :class="variantClasses.subtitleText"> {{ subtitle }}</span>
          </DialogTitle>
          <DialogDescription v-if="description" class="text-xs font-bold text-slate-400 uppercase tracking-wider text-left leading-relaxed mt-1">
            {{ description }}
          </DialogDescription>
        </div>
      </DialogHeader>

      <div class="space-y-4 mt-3">
        <!-- Rate-limit Warning -->
        <div v-if="guard.isLocked" class="flex items-center gap-2.5 bg-rose-50 text-rose-600 border border-rose-200/80 rounded-2xl px-4 py-3 shadow-xs">
          <Lock class="w-4 h-4 shrink-0 animate-bounce" />
          <span class="text-[11px] font-black uppercase tracking-wider">
            Trop de tentatives — réessayez dans {{ guard.remainingSeconds }}s
          </span>
        </div>

        <!-- Password Input -->
        <div class="relative group">
          <div class="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200" :class="variantClasses.inputIcon">
            <Lock class="w-5 h-5" />
          </div>
          
          <Input
            :type="showPwd ? 'text' : 'password'"
            :model-value="password ?? ''"
            @update:model-value="(v: any) => emit('update:password', String(v))"
            :disabled="disabled || guard.isLocked"
            :placeholder="placeholder"
            :class="[
              'h-14 bg-slate-50/80 border border-slate-200/80 text-slate-900 rounded-2xl font-bold font-mono tracking-widest pl-12 pr-12 text-sm shadow-xs transition-all duration-200',
              'placeholder:text-slate-400 placeholder:font-sans placeholder:tracking-normal',
              'focus-visible:bg-white focus-visible:ring-4',
              variantClasses.inputFocus,
              error ? 'border-rose-400 ring-4 ring-rose-500/10' : ''
            ]"
            @keydown.enter.prevent="tryConfirm"
          />

          <button 
            type="button" 
            @click="showPwd = !showPwd" 
            tabindex="-1"
            class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors outline-none cursor-pointer p-1"
          >
            <Eye v-if="!showPwd" class="w-5 h-5" />
            <EyeOff v-else class="w-5 h-5" />
          </button>
        </div>

        <!-- Error Message -->
        <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0">
          <p v-if="error" class="text-xs font-black text-rose-500 uppercase tracking-wide flex items-center gap-1.5 pl-1">
            <AlertTriangle class="w-3.5 h-3.5 shrink-0" />
            {{ error }}
          </p>
        </transition>
      </div>

      <DialogFooter class="flex gap-3 mt-6 flex-col-reverse sm:flex-row">
        <Button 
          variant="outline" 
          @click="emit('update:open', false)"
          class="flex-1 h-12 font-black uppercase text-[11px] tracking-widest rounded-xl border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
        >
          Annuler
        </Button>
        <Button 
          @click="tryConfirm" 
          :disabled="loading || !password || disabled || guard.isLocked"
          :class="cn(
            'flex-1 h-12 font-black uppercase tracking-widest text-[11px] rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
            variantClasses.confirmButton
          )"
        >
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin mr-2" />
          {{ loading ? loadingLabel : confirmLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Eye, EyeOff, Lock, AlertTriangle, ShieldCheck, KeyRound, Loader2 } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { usePasswordGuard } from '@/composables/usePasswordGuard'
import { cn } from '@/lib/utils'

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
    variant?: 'default' | 'danger' | 'warning' | 'indigo'
  }>(),
  {
    password: '',
    title: 'Confirmation',
    subtitle: '',
    description: '',
    placeholder: 'Saisissez votre mot de passe...',
    confirmLabel: 'Confirmer',
    loadingLabel: 'Vérification...',
    loading: false,
    disabled: false,
    error: '',
    variant: 'default',
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:password', value: string): void
  (e: 'confirm'): void
}>()

const guard = usePasswordGuard()
const showPwd = ref(false)

const activeIcon = computed(() => {
  if (props.variant === 'danger') return AlertTriangle
  return KeyRound
})

const variantClasses = computed(() => {
  if (props.variant === 'danger') {
    return {
      iconContainer: 'bg-gradient-to-tr from-rose-600 to-rose-500 shadow-rose-500/25',
      subtitleText: 'text-rose-600',
      inputIcon: 'text-rose-400 group-focus-within:text-rose-600',
      inputFocus: 'focus-visible:ring-rose-500/15 focus-visible:border-rose-400',
      confirmButton: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25',
    }
  }
  if (props.variant === 'warning') {
    return {
      iconContainer: 'bg-gradient-to-tr from-amber-500 to-amber-400 shadow-amber-500/25',
      subtitleText: 'text-amber-600',
      inputIcon: 'text-amber-400 group-focus-within:text-amber-600',
      inputFocus: 'focus-visible:ring-amber-500/15 focus-visible:border-amber-400',
      confirmButton: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/25',
    }
  }
  // Default / Indigo Theme (Executive Luxury look)
  return {
    iconContainer: 'bg-gradient-to-tr from-indigo-600 to-primary shadow-indigo-600/25',
    subtitleText: 'text-indigo-600',
    inputIcon: 'text-indigo-400 group-focus-within:text-indigo-600',
    inputFocus: 'focus-visible:ring-indigo-600/15 focus-visible:border-indigo-400',
    confirmButton: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25',
  }
})

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
