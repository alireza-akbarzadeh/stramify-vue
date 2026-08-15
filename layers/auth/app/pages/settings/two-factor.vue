<script setup lang="ts">
import { Lock, ShieldCheck } from '@lucide/vue'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Two-factor authentication — Streamify' })

type Step = 'password' | 'scan' | 'done'
const step = ref<Step>('password')

const password = ref('')
const otp = ref<number[]>([])
const qrDataUrl = ref('')
const backupCodes = ref<string[]>([])
const error = ref('')
const pending = ref(false)

/** Enabling requires re-entering the password — better-auth enforces this too. */
async function enable() {
  error.value = ''
  pending.value = true
  const { data, error: authError } = await authClient.twoFactor.enable({ password: password.value })
  pending.value = false
  if (authError || !data) {
    error.value = authError?.message || 'Could not start two-factor setup.'
    return
  }
  backupCodes.value = data.backupCodes
  qrDataUrl.value = await QRCode.toDataURL(data.totpURI, { margin: 1, width: 220 })
  step.value = 'scan'
}

/** 2FA is only actually active once a generated code verifies. */
async function verify(code: string) {
  error.value = ''
  pending.value = true
  const { error: authError } = await authClient.twoFactor.verifyTotp({ code })
  pending.value = false
  if (authError) {
    error.value = authError.message || 'That code was not valid. Try the next one.'
    otp.value = []
    return
  }
  step.value = 'done'
}
</script>

<template>
  <AuthLayout
    title="Two-factor authentication"
    :subtitle="
      step === 'password'
        ? 'Add a second step to every login.'
        : step === 'scan'
          ? 'Scan the code, then enter the 6 digits it shows.'
          : 'Two-factor authentication is now on.'
    "
  >
    <!-- Step 1 — confirm identity -->
    <form v-if="step === 'password'" class="space-y-5" @submit.prevent="enable">
      <p class="text-sm leading-relaxed text-muted-foreground">
        You'll need an authenticator app such as 1Password, Bitwarden, Aegis or Google
        Authenticator. Confirm your password to begin.
      </p>
      <AuthFormField
        id="password"
        v-model="password"
        label="Current password"
        type="password"
        autocomplete="current-password"
        placeholder="••••••••"
        :icon="Lock"
      />
      <AuthAlert v-if="error" :message="error" />
      <Button type="submit" size="lg" class="w-full" :disabled="pending">
        {{ pending ? 'Starting…' : 'Continue' }}
      </Button>
    </form>

    <!-- Step 2 — scan + verify -->
    <div v-else-if="step === 'scan'" class="space-y-5">
      <div class="flex justify-center rounded-xl border border-border bg-surface p-4">
        <img :src="qrDataUrl" alt="QR code for enrolling Streamify in your authenticator app" width="220" height="220">
      </div>

      <div>
        <p class="mb-2 text-sm font-medium text-foreground">Enter the 6-digit code</p>
        <OtpInput v-model="otp" @complete="verify" />
      </div>

      <AuthAlert v-if="error" :message="error" />

      <Button size="lg" class="w-full" :disabled="pending || otp.length < 6" @click="verify(otp.join(''))">
        {{ pending ? 'Verifying…' : 'Turn on two-factor' }}
      </Button>
    </div>

    <!-- Step 3 — backup codes -->
    <div v-else class="space-y-5">
      <AuthAlert tone="success" message="Two-factor authentication is on. You'll be asked for a code at every login." />
      <div>
        <p class="text-sm font-medium text-foreground">Save your backup codes</p>
        <p class="mb-3 mt-1 text-sm text-muted-foreground">
          Each code works once, and they're the only way in if you lose your device. This is the
          only time they're shown.
        </p>
        <BackupCodeList :codes="backupCodes" />
      </div>
      <Button as-child size="lg" class="w-full">
        <NuxtLink to="/">
          <ShieldCheck class="size-4" /> Done
        </NuxtLink>
      </Button>
    </div>

    <template #footer>
      <NuxtLink to="/" class="font-medium text-primary hover:underline">Back to Streamify</NuxtLink>
    </template>
  </AuthLayout>
</template>
