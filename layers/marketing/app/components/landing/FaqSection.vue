<script setup lang="ts">
import { AccordionContent, AccordionHeader, AccordionItem, AccordionRoot, AccordionTrigger } from 'reka-ui'
import { ChevronDown } from '@lucide/vue'

const faqs = [
  {
    q: 'What do I need to start streaming?',
    a: 'Any RTMPS-capable encoder — OBS, Streamlabs, or your hardware encoder. Create a channel, copy the ingest URL and stream key into your encoder, and go live. Nothing to install on your machine from us.'
  },
  {
    q: 'How low is the latency really?',
    a: 'RTMPS ingest with HLS playback lands around 3–6 seconds, which is standard for the format. WHIP ingest with WHEP playback targets sub-second glass-to-glass and is rolling out during early access.'
  },
  {
    q: 'Do my streams get recorded automatically?',
    a: 'Yes. Every broadcast is recorded to a VOD when it ends — 14 days of retention on the free plan, unlimited on paid plans. You can delete any recording at any time.'
  },
  {
    q: 'Is my stream key safe?',
    a: 'Your stream key is generated server-side and shown once in your dashboard for you to copy into your encoder. It is never embedded in the page for viewers, never logged, and can be rotated whenever you want.'
  },
  {
    q: 'Can I moderate chat with a team?',
    a: 'Yes. Assign per-channel moderators with their own permissions. Bans, timeouts, slow mode and subscriber-only mode are all enforced on the server, so they take effect immediately rather than only hiding messages in the sender’s browser.'
  },
  {
    q: 'What happens when my connection drops mid-stream?',
    a: 'Viewers see a reconnecting state rather than an error, and the session resumes into the same VOD if your encoder reconnects within the grace window. Chat history is preserved and backfilled on reconnect.'
  }
]
</script>

<template>
  <section class="mx-auto max-w-3xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
    <Reveal>
      <SectionHeading eyebrow="FAQ" title="Questions worth asking" />
    </Reveal>

    <Reveal :delay="0.08">
      <AccordionRoot type="single" collapsible class="mt-14 divide-y divide-border border-y border-border">
        <AccordionItem v-for="(f, i) in faqs" :key="i" :value="String(i)">
          <AccordionHeader>
            <AccordionTrigger
              class="group flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left text-[15px] font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {{ f.q }}
              <ChevronDown
                class="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent
            class="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
          >
            <p class="pb-5 pr-8 text-sm leading-relaxed text-muted-foreground">{{ f.a }}</p>
          </AccordionContent>
        </AccordionItem>
      </AccordionRoot>
    </Reveal>
  </section>
</template>
