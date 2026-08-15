<script setup lang="ts">
import { AlertCircle, Check, ShieldCheck } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const { user } = storeToRefs(useAuthStore())

const checklist = computed(() => [
  {
    key: 'email',
    label: 'Verify your email',
    description: 'Confirms account recovery and notification delivery.',
    done: !!user.value?.emailVerified,
    to: '/verify-email',
    cta: 'Verify email'
  },
  {
    key: '2fa',
    label: 'Enable two-factor authentication',
    description: 'Adds a second step at sign-in to protect your channel.',
    done: !!user.value?.twoFactorEnabled,
    to: '/settings/two-factor',
    cta: 'Set up 2FA'
  }
])

const total = computed(() => checklist.value.length)
const done = computed(() => checklist.value.filter((item) => item.done).length)
const complete = computed(() => done.value === total.value)

/** Ring geometry for the completion indicator (r=26 circle, 64x64 viewBox). */
const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const dashoffset = computed(() => CIRCUMFERENCE - (done.value / total.value) * CIRCUMFERENCE)
</script>

<template>
  <div class="rounded-2xl border border-border bg-card p-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h3 class="flex items-center gap-2 text-base font-semibold text-foreground">
          <ShieldCheck class="size-4.5 text-foreground" aria-hidden="true" />
          Account security
        </h3>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ complete ? 'Your account is fully secured.' : `${done} of ${total} protections enabled.` }}
        </p>
      </div>

      <div class="relative grid size-16 shrink-0 place-items-center" role="img" :aria-label="`${done} of ${total} security steps complete`">
        <svg viewBox="0 0 64 64" class="size-16 -rotate-90">
          <circle cx="32" cy="32" :r="RADIUS" fill="none" stroke="var(--surface-2)" stroke-width="6" />
          <circle
            cx="32"
            cy="32"
            :r="RADIUS"
            fill="none"
            :stroke="complete ? 'var(--success)' : 'var(--warning)'"
            stroke-width="6"
            stroke-linecap="round"
            :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="dashoffset"
          />
        </svg>
        <span class="absolute text-sm font-semibold text-foreground">{{ done }}/{{ total }}</span>
      </div>
    </div>

    <ul class="mt-6 flex flex-col gap-3">
      <li
        v-for="item in checklist"
        :key="item.key"
        class="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/60 px-4 py-3"
      >
        <div class="flex items-start gap-3">
          <span
            class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full"
            :class="item.done ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'"
            aria-hidden="true"
          >
            <Check v-if="item.done" class="size-3.5" />
            <AlertCircle v-else class="size-3.5" />
          </span>
          <div>
            <p class="text-sm font-medium text-foreground">{{ item.label }}</p>
            <p class="text-xs text-muted-foreground">{{ item.description }}</p>
          </div>
        </div>

        <Button v-if="!item.done" as-child size="sm" variant="outline" class="shrink-0">
          <NuxtLink :to="item.to">{{ item.cta }}</NuxtLink>
        </Button>
      </li>
    </ul>

    <NuxtLink
      to="/settings/security"
      class="mt-5 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline"
    >
      Manage account &amp; security →
    </NuxtLink>
  </div>
</template>
