import { ref, computed, reactive } from 'vue'

const MAX_ATTEMPTS = 3
const LOCK_SECONDS = 60
const STORAGE_KEY = 'rcapp:password-guard'

type GuardState = { attempts: number; lockedUntil: number }

function readStored(): GuardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        attempts: Number(parsed.attempts) || 0,
        lockedUntil: Number(parsed.lockedUntil) || 0,
      }
    }
  } catch {
    // ignore
  }
  return { attempts: 0, lockedUntil: 0 }
}

function writeStored(state: GuardState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

const state = ref<GuardState>(readStored())
const now = ref(Date.now())

setInterval(() => {
  now.value = Date.now()
}, 1000)

function resetIfExpired() {
  if (state.value.lockedUntil && now.value >= state.value.lockedUntil) {
    state.value.lockedUntil = 0
    state.value.attempts = 0
    writeStored(state.value)
  }
}

export function usePasswordGuard() {
  resetIfExpired()

  const remainingSeconds = computed(() =>
    Math.max(0, Math.ceil((state.value.lockedUntil - now.value) / 1000))
  )

  const isLocked = computed(() => remainingSeconds.value > 0)

  const remainingAttempts = computed(() =>
    isLocked.value ? 0 : Math.max(0, MAX_ATTEMPTS - state.value.attempts)
  )

  function registerFailure(): boolean {
    state.value.attempts += 1
    let locked = false
    if (state.value.attempts >= MAX_ATTEMPTS) {
      state.value.lockedUntil = Date.now() + LOCK_SECONDS * 1000
      state.value.attempts = 0
      locked = true
    }
    writeStored(state.value)
    return locked
  }

  function reset() {
    state.value.attempts = 0
    state.value.lockedUntil = 0
    writeStored(state.value)
  }

  return reactive({
    isLocked,
    remainingSeconds,
    remainingAttempts,
    registerFailure,
    reset,
  })
}

export function isPasswordError(err: any): boolean {
  const msg = String(err?.response?.data?.message || '')
  return err?.response?.status === 400 && /password/i.test(msg)
}

export function handlePasswordError(err: any, toast: any): boolean {
  if (!isPasswordError(err)) return false
  const { registerFailure, remainingAttempts } = usePasswordGuard()
  const locked = registerFailure()
  if (locked) {
    toast.add({
      severity: 'error',
      summary: 'Compte Verrouillé',
      detail: `Trop de tentatives. Réessayez dans ${LOCK_SECONDS} secondes.`,
      life: 3000
    })
  } else {
    toast.add({
      severity: 'error',
      summary: 'Mot de passe incorrect',
      detail: `Il vous reste ${remainingAttempts} tentative(s).`,
      life: 3000
    })
  }
  return true
}

export { MAX_ATTEMPTS, LOCK_SECONDS }
