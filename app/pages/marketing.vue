<script lang="ts" setup>
useHead({
  title: 'Streamify — Live streaming, built for creators who move fast',
  meta: [
    {
      name: 'description',
      content:
          'Sub-second ingest, adaptive playback, real-time chat with moderation built in, and a creator dashboard that respects your time. Free to start.'
    }
  ]
})
</script>

<template>
  <div>
    <LandingHero/>
    <TrustedBy/>
    <BentoFeatures/>
    <ChatShowcase/>
    <DashboardShowcase/>
    <StatsBand/>
    <Testimonials/>
    <PricingSection/>
    <FaqSection/>
    <FinalCta/>
  </div>
</template>
