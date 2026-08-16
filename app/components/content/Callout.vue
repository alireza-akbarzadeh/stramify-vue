<script setup lang="ts">
import { Info, TriangleAlert } from '@lucide/vue'

/**
 * An aside inside an article — `::callout{type="warning" title="…"}` in MDC.
 *
 * Lives in `components/content/` rather than beside the rest of the news
 * components because that is the one directory Nuxt Content adds to its
 * component manifest. `<ContentRenderer>` resolves MDC tags by name at
 * runtime, so a component it can't find in that manifest renders as nothing
 * at all — silently, with the callout's text vanishing from the article.
 *
 * Two types only. A third ("tip", "danger", "success") would be a colour
 * looking for a meaning; these two map to the only distinction the articles
 * actually make — context you may want, versus a caveat you need.
 */
const props = withDefaults(
  defineProps<{ type?: 'note' | 'warning'; title?: string }>(),
  { type: 'note', title: '' }
)

const isWarning = computed(() => props.type === 'warning')
</script>

<template>
  <aside
    class="my-6 flex gap-3 rounded-xl border border-l-4 p-4"
    :class="
      isWarning
        ? 'border-warning/30 border-l-warning bg-warning/5'
        : 'border-border border-l-accent bg-surface-2/60'
    "
  >
    <component
      :is="isWarning ? TriangleAlert : Info"
      class="mt-0.5 size-4 shrink-0"
      :class="isWarning ? 'text-warning' : 'text-accent'"
      aria-hidden="true"
    />

    <div class="min-w-0">
      <p v-if="title" class="text-sm font-semibold text-foreground">{{ title }}</p>
      <!-- `callout-body` drops the prose margins on the first and last child so
           the panel's own padding isn't doubled by a paragraph's. -->
      <div class="callout-body text-sm leading-relaxed text-muted-foreground">
        <slot />
      </div>
    </div>
  </aside>
</template>
