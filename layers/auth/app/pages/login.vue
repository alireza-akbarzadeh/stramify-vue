<script lang="ts" setup>
import {Lock, Mail, ShieldCheck} from '@lucide/vue'
import {Button} from '@/components/ui/button'
import {toast} from '@/components/ui/sonner'
import {authClient} from '@/lib/auth-client'
import {useAuthStore} from '@/stores/auth'

definePageMeta({layout: 'auth'})
useHead({title: 'Log in — Streamify'})

const auth = useAuthStore()

const email = ref('')
const password = ref('')
const remember = ref(true)
const error = ref('')
const pending = ref(false)

/** 'credentials' → email+password, 'twoFactor' → TOTP challenge. */
const step = ref<'credentials' | 'twoFactor'>('credentials')
const otp = ref<number[]>([])
const useBackupCode = ref(false)
const backupCode = ref('')

async function onSubmit() {
  error.value = ''
  pending.value = true
  const {data, error: authError} = await authClient.signIn.email({
    email: email.value,
    password: password.value,
    rememberMe: remember.value
  })
  pending.value = false

  if (authError) {
    error.value = authError.message || 'Those credentials did not match an account.'
    toast.error(error.value)
    return
  }
  // better-auth signals "password OK, now prove the second factor".
  if ((data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
    step.value = 'twoFactor'
    return
  }
  await auth.completeSignIn()
}

async function verifyTotp(code: string) {
  error.value = ''
  pending.value = true
  const {error: authError} = await authClient.twoFactor.verifyTotp({code})
  pending.value = false
  if (authError) {
    error.value = authError.message || 'That code was not valid. Try the next one.'
    toast.error(error.value)
    otp.value = []
    return
  }
  await auth.completeSignIn()
}

async function verifyBackup() {
  error.value = ''
  pending.value = true
  const {error: authError} = await authClient.twoFactor.verifyBackupCode({code: backupCode.value})
  pending.value = false
  if (authError) {
    error.value = authError.message || 'That backup code was not valid.'
    toast.error(error.value)
    return
  }
  await auth.completeSignIn()
}
</script>

<template>
  <AuthLayout
      :subtitle="
      step === 'credentials'
        ? 'Log in to keep streaming.'
        : 'Enter the 6-digit code from your authenticator app.'
    "
      :title="step === 'credentials' ? 'Welcome back' : 'Two-factor verification'"
  >
    <!-- Step 1 — credentials -->
    <form v-if="step === 'credentials'" class="space-y-5" @submit.prevent="onSubmit">
      <SocialAuthButtons @error="error = $event; toast.error($event)"/>

      <AuthFormField
          id="email"
          v-model="email"
          :icon="Mail"
          autocomplete="email"
          label="Email"
          placeholder="you@example.com"
          type="email"
      />
      <AuthFormField
          id="password"
          v-model="password"
          :icon="Lock"
          autocomplete="current-password"
          label="Password"
          placeholder="••••••••"
          type="password"
      />

      <div class="flex items-center justify-between">
        <label class="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
              v-model="remember"
              class="size-4 cursor-pointer rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              type="checkbox"
          >
          Remember me
        </label>
        <NuxtLink
            class="rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            to="/forgot-password"
        >
          Forgot password?
        </NuxtLink>
      </div>

      <AuthAlert v-if="error" :message="error"/>

      <Button :disabled="pending" class="w-full" size="lg" type="submit">
        {{ pending ? 'Logging in…' : 'Log in' }}
      </Button>
    </form>

    <!-- Step 2 — TOTP / backup code -->
    <div v-else class="space-y-5">
      <template v-if="!useBackupCode">
        <OtpInput v-model="otp" @complete="verifyTotp"/>
        <AuthAlert v-if="error" :message="error"/>
        <Button :disabled="pending || otp.length < 6" class="w-full" size="lg" @click="verifyTotp(otp.join(''))">
          {{ pending ? 'Verifying…' : 'Verify' }}
        </Button>
        <button
            class="w-full cursor-pointer rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
            @click="useBackupCode = true; error = ''"
        >
          Lost your device? Use a backup code
        </button>
      </template>

      <form v-else class="space-y-5" @submit.prevent="verifyBackup">
        <AuthFormField
            id="backup"
            v-model="backupCode"
            :icon="ShieldCheck"
            autocomplete="one-time-code"
            label="Backup code"
            placeholder="xxxxx-xxxxx"
        />
        <AuthAlert v-if="error" :message="error"/>
        <Button :disabled="pending" class="w-full" size="lg" type="submit">
          {{ pending ? 'Verifying…' : 'Verify backup code' }}
        </Button>
        <button
            class="w-full cursor-pointer rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
            @click="useBackupCode = false; error = ''"
        >
          Use your authenticator app instead
        </button>
      </form>
    </div>

    <template #footer>
      Don't have an account?
      <NuxtLink class="font-medium text-primary hover:underline" to="/signup">Sign up</NuxtLink>
    </template>
  </AuthLayout>
</template>
