<script setup lang="ts">
import { MailCheck } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Verify your email — Streamify' })

const route = useRoute()
const email = computed(() => String(route.query.email ?? ''))
const failed = computed(() => route.query.error === 'true')

const sent = ref(false)
const error = ref('')
const pending = ref(false)

async function resend() {
  error.value = ''
  pending.value = true
  const { error: authError } = await authClient.sendVerificationEmail({
    email: email.value,
    callbackURL: '/'
  })
  pending.value = false
  if (authError) {
    error.value = authError.message || 'Could not resend the verification email.'
    return
  }
  sent.value = true
}
</script>

<template>
  <AuthLayout
    title="Confirm your email"
    subtitle="One link stands between you and your first stream."
  >
    <div class="space-y-5">
      <div class="flex justify-center">
        <span class="grid size-14 place-items-center rounded-2xl border border-border bg-glass text-primary backdrop-blur">
          <MailCheck class="size-6" aria-hidden="true" />
        </span>
      </div>

      <AuthAlert
        v-if="failed"
        message="That verification link is invalid or has expired. Send yourself a fresh one below."
      />
      <p v-else class="text-center text-sm leading-relaxed text-muted-foreground">
        We sent a confirmation link<template v-if="email"> to <span class="text-foreground">{{ email }}</span></template>.
        Open it to activate your account.
      </p>

      <AuthAlert v-if="sent" tone="success" message="Sent. Check your inbox — and your spam folder." />
      <AuthAlert v-if="error" :message="error" />

      <Button v-if="email" size="lg" class="w-full" :disabled="pending || sent" @click="resend">
        {{ pending ? 'Sending…' : sent ? 'Email sent' : 'Resend verification email' }}
      </Button>
    </div>

    <template #footer>
      <NuxtLink to="/login" class="font-medium text-primary hover:underline">Back to log in</NuxtLink>
    </template>
  </AuthLayout>
</template>
