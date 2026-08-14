<script setup lang="ts">
import { Lock } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Choose a new password — Streamify' })

const route = useRoute()
const token = computed(() => String(route.query.token ?? ''))

const password = ref('')
const confirm = ref('')
const error = ref('')
const done = ref(false)
const pending = ref(false)

const passwordError = computed(() =>
  password.value && password.value.length < 8 ? 'Use at least 8 characters.' : ''
)
const confirmError = computed(() =>
  confirm.value && confirm.value !== password.value ? 'Passwords do not match.' : ''
)
const invalid = computed(() => !!passwordError.value || !!confirmError.value || !password.value)

async function onSubmit() {
  if (invalid.value) return
  error.value = ''
  pending.value = true
  const { error: authError } = await authClient.resetPassword({
    newPassword: password.value,
    token: token.value
  })
  pending.value = false
  if (authError) {
    error.value = authError.message || 'That reset link is invalid or has expired.'
    return
  }
  done.value = true
}
</script>

<template>
  <AuthLayout title="Choose a new password" subtitle="Pick something you haven't used before.">
    <!-- A missing token means the link was mistyped or opened directly. -->
    <div v-if="!token" class="space-y-5">
      <AuthAlert message="This reset link is missing its token. Request a new one to continue." />
      <Button as-child size="lg" class="w-full">
        <NuxtLink to="/forgot-password">Request a new link</NuxtLink>
      </Button>
    </div>

    <div v-else-if="done" class="space-y-5">
      <AuthAlert tone="success" message="Your password has been changed. You can log in with it now." />
      <Button as-child size="lg" class="w-full">
        <NuxtLink to="/login">Continue to log in</NuxtLink>
      </Button>
    </div>

    <form v-else class="space-y-5" @submit.prevent="onSubmit">
      <AuthFormField
        id="password"
        v-model="password"
        label="New password"
        type="password"
        autocomplete="new-password"
        placeholder="At least 8 characters"
        :icon="Lock"
        :error="passwordError"
      />
      <AuthFormField
        id="confirm"
        v-model="confirm"
        label="Confirm new password"
        type="password"
        autocomplete="new-password"
        placeholder="Repeat your new password"
        :icon="Lock"
        :error="confirmError"
      />

      <AuthAlert v-if="error" :message="error" />

      <Button type="submit" size="lg" class="w-full" :disabled="pending || invalid">
        {{ pending ? 'Saving…' : 'Save new password' }}
      </Button>
    </form>

    <template #footer>
      <NuxtLink to="/login" class="font-medium text-primary hover:underline">Back to log in</NuxtLink>
    </template>
  </AuthLayout>
</template>
