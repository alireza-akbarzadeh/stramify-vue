<script setup lang="ts">
import { Mail } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Reset your password — Streamify' })

const email = ref('')
const error = ref('')
const sent = ref(false)
const pending = ref(false)

async function onSubmit() {
  error.value = ''
  pending.value = true
  const { error: authError } = await authClient.requestPasswordReset({
    email: email.value,
    redirectTo: '/reset-password'
  })
  pending.value = false
  if (authError) {
    error.value = authError.message || 'Could not send the reset link. Try again.'
    return
  }
  sent.value = true
}
</script>

<template>
  <AuthLayout
    title="Reset your password"
    subtitle="We'll email you a link to choose a new one."
  >
    <!--
      Success copy is deliberately the same whether or not the address exists —
      confirming which emails have accounts would leak account existence.
    -->
    <AuthAlert
      v-if="sent"
      tone="success"
      message="If an account exists for that address, a reset link is on its way. The link expires in one hour."
    />

    <form v-else class="space-y-5" @submit.prevent="onSubmit">
      <AuthFormField
        id="email"
        v-model="email"
        label="Email"
        type="email"
        autocomplete="email"
        placeholder="you@example.com"
        :icon="Mail"
      />

      <AuthAlert v-if="error" :message="error" />

      <Button type="submit" size="lg" class="w-full" :disabled="pending">
        {{ pending ? 'Sending…' : 'Send reset link' }}
      </Button>
    </form>

    <template #footer>
      Remembered it?
      <NuxtLink to="/login" class="font-medium text-primary hover:underline">Back to log in</NuxtLink>
    </template>
  </AuthLayout>
</template>
