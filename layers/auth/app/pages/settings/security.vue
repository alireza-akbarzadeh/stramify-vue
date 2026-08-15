<script setup lang="ts">
import { Lock, LogOut, ShieldCheck } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { storeToRefs } from 'pinia'
import { authClient } from '@/lib/auth-client'
import { useAuthStore } from '@/stores/auth'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Security — Streamify' })

const auth = useAuthStore()
const { user } = storeToRefs(auth)
const { signOut } = auth

const current = ref('')
const next = ref('')
const revokeOthers = ref(true)
const error = ref('')
const saved = ref(false)
const pending = ref(false)

const nextError = computed(() =>
  next.value && next.value.length < 8 ? 'Use at least 8 characters.' : ''
)

async function changePassword() {
  if (nextError.value) return
  error.value = ''
  saved.value = false
  pending.value = true
  const { error: authError } = await authClient.changePassword({
    currentPassword: current.value,
    newPassword: next.value,
    revokeOtherSessions: revokeOthers.value
  })
  pending.value = false
  if (authError) {
    error.value = authError.message || 'Could not change your password.'
    return
  }
  saved.value = true
  current.value = ''
  next.value = ''
}
</script>

<template>
  <div class="relative min-h-dvh bg-background">
    <div class="mx-auto max-w-2xl px-4 pb-24 pt-28 sm:px-6 lg:px-8">
      <Reveal>
        <h1 class="text-3xl font-semibold tracking-tight text-foreground">Security</h1>
        <p class="mt-2 text-muted-foreground">
          Signed in as <span class="text-foreground">{{ user?.email }}</span>
        </p>
      </Reveal>

      <!-- Two-factor -->
      <Reveal :delay="0.06">
        <section class="mt-10 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-xl">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="flex gap-3.5">
              <span class="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-foreground/5 text-primary">
                <ShieldCheck class="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 class="text-base font-semibold text-foreground">Two-factor authentication</h2>
                <p class="mt-1 text-sm text-muted-foreground">
                  Require a code from your authenticator app at every login.
                </p>
              </div>
            </div>
            <Button as-child variant="outline">
              <NuxtLink to="/settings/two-factor">Manage</NuxtLink>
            </Button>
          </div>
        </section>
      </Reveal>

      <!-- Change password -->
      <Reveal :delay="0.12">
        <section class="mt-5 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-xl">
          <h2 class="text-base font-semibold text-foreground">Change password</h2>
          <form class="mt-5 space-y-5" @submit.prevent="changePassword">
            <AuthFormField
              id="current"
              v-model="current"
              label="Current password"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              :icon="Lock"
            />
            <AuthFormField
              id="next"
              v-model="next"
              label="New password"
              type="password"
              autocomplete="new-password"
              placeholder="At least 8 characters"
              :icon="Lock"
              :error="nextError"
            />

            <label class="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                v-model="revokeOthers"
                type="checkbox"
                class="size-4 cursor-pointer rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
              Log out other devices
            </label>

            <AuthAlert v-if="error" :message="error" />
            <AuthAlert v-if="saved" tone="success" message="Your password has been updated." />

            <Button type="submit" :disabled="pending || !!nextError">
              {{ pending ? 'Saving…' : 'Update password' }}
            </Button>
          </form>
        </section>
      </Reveal>

      <!-- Sign out -->
      <Reveal :delay="0.18">
        <section class="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-base font-semibold text-foreground">Log out</h2>
              <p class="mt-1 text-sm text-muted-foreground">End this session on this device.</p>
            </div>
            <Button variant="destructive" @click="signOut">
              <LogOut class="size-4" /> Log out
            </Button>
          </div>
        </section>
      </Reveal>
    </div>
  </div>
</template>
