<script setup lang="ts">
import { authClient } from '@/lib/auth-client'

const emit = defineEmits<{ (e: 'error', message: string): void }>()

const { data } = await useFetch('/api/auth-providers')
const pending = ref('')

const LABELS: Record<string, string> = {
  google: 'Google',
  apple: 'Apple',
  facebook: 'Facebook',
  github: 'GitHub'
}

const providers = computed(() =>
  (data.value?.all ?? []).map((id) => ({
    id,
    label: LABELS[id] ?? id,
    configured: (data.value?.configured ?? []).includes(id)
  }))
)

async function signIn(provider: string, configured: boolean) {
  if (!configured) {
    emit('error', `${LABELS[provider] ?? provider} sign-in isn't configured on this deployment yet.`)
    return
  }
  pending.value = provider
  const { error } = await authClient.signIn.social({ provider, callbackURL: '/' })
  pending.value = ''
  if (error) emit('error', error.message || `Could not continue with ${LABELS[provider] ?? provider}.`)
}
</script>

<template>
  <!--
    A row of icon buttons rather than stacked full-width rows: four labelled
    bars pushed the email fields below the fold and nested an icon "card"
    inside a button inside the auth card (card-in-card). Icon-only keeps the
    primary path — email — dominant; each button still carries an accessible
    name via aria-label.
  -->
  <div v-if="providers.length" class="space-y-4">
    <div class="grid grid-cols-4 gap-2.5">
      <button
        v-for="p in providers"
        :key="p.id"
        type="button"
        :disabled="!!pending"
        :title="p.configured ? `Continue with ${p.label}` : `${p.label} is not configured yet`"
        :aria-label="p.configured ? `Continue with ${p.label}` : `${p.label} sign-in is not configured yet`"
        class="grid h-12 cursor-pointer place-items-center rounded-xl border border-border bg-surface transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :class="{ 'opacity-50': !p.configured }"
        @click="signIn(p.id, p.configured)"
      >
        <svg
          v-if="pending === p.id"
          class="size-4.5 animate-spin text-primary"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity=".2" />
          <path d="M22 12A10 10 0 0 0 12 2" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
        </svg>
        <AuthProviderIcon v-else :provider="p.id" />
      </button>
    </div>

    <div class="flex items-center gap-3">
      <span class="h-px flex-1 bg-border" />
      <span class="text-xs text-muted-foreground">or continue with email</span>
      <span class="h-px flex-1 bg-border" />
    </div>
  </div>
</template>
