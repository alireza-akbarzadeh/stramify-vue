<script lang="ts" setup>
import {Lock, Mail, User} from '@lucide/vue'
import {Button} from '@/components/ui/button'
import {toast} from '@/components/ui/sonner'
import {authClient} from '@/lib/auth-client'
import {useAuthStore} from '@/stores/auth'

definePageMeta({layout: 'auth'})
useHead({title: 'Sign up — Streamify'})

const auth = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

// Mirrors the server's minPasswordLength so the user gets the rule before
// submitting rather than as a round-trip rejection.
const passwordError = computed(() =>
    password.value && password.value.length < 8 ? 'Use at least 8 characters.' : ''
)

async function onSubmit() {
  if (passwordError.value) return
  error.value = ''
  pending.value = true
  const {error: authError} = await authClient.signUp.email({
    name: name.value,
    email: email.value,
    password: password.value
  })
  pending.value = false
  if (authError) {
    error.value = authError.message || 'Could not create your account.'
    toast.error(error.value)
    return
  }
  await auth.completeSignIn()
}
</script>

<template>
  <AuthLayout subtitle="Free to start. No credit card required." title="Create your channel">
    <form class="space-y-5" @submit.prevent="onSubmit">
      <SocialAuthButtons @error="error = $event; toast.error($event)"/>

      <AuthFormField
          id="name"
          v-model="name"
          :icon="User"
          autocomplete="name"
          label="Name"
          placeholder="Your display name"
      />
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
          :error="passwordError"
          :icon="Lock"
          autocomplete="new-password"
          label="Password"
          placeholder="At least 8 characters"
          type="password"
      />

      <AuthAlert v-if="error" :message="error"/>

      <Button :disabled="pending || !!passwordError" class="w-full" size="lg" type="submit">
        {{ pending ? 'Creating account…' : 'Start streaming free' }}
      </Button>

      <p class="text-center text-xs leading-relaxed text-muted-foreground">
        By creating an account you agree to our
        <NuxtLink class="text-foreground hover:underline" to="/terms">Terms</NuxtLink>
        and
        <NuxtLink class="text-foreground hover:underline" to="/privacy">Privacy Policy</NuxtLink>
        .
      </p>
    </form>

    <template #footer>
      Already have an account?
      <NuxtLink class="font-medium text-primary hover:underline" to="/login">Log in</NuxtLink>
    </template>
  </AuthLayout>
</template>
