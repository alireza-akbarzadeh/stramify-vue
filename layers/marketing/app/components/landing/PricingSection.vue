<script setup lang="ts">
// Plans, prices and checkout all come from `BillingPlanGrid` — this section is
// only the marketing frame around them, so the landing page and
// `/settings/billing` can never advertise different things (ADR-026).
const yearly = ref(false)
const interval = computed(() => (yearly.value ? 'yearly' : 'monthly') as const)
</script>

<template>
  <section id="pricing" class="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
    <Reveal>
      <SectionHeading
        eyebrow="Pricing"
        title="Priced for creators, not enterprises"
        subtitle="Start free and stay free until streaming is actually part of your week. Every plan includes chat, moderation and VOD."
      />
    </Reveal>

    <Reveal :delay="0.06">
      <BillingIntervalToggle v-model="yearly" class="mt-10" />
    </Reveal>

    <BillingPlanGrid :interval="interval" class="mt-14" />
  </section>
</template>
