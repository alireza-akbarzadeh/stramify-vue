<script lang="ts" setup>
import StudioChoiceGroup from './StudioChoiceGroup.vue'
import type { Choice } from './StudioChoiceGroup.vue'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CATEGORY_DESCRIPTIONS, CLIP_CATEGORIES } from '#shared/utils/category'
import { STUDIO_TITLE_MAX } from '#shared/types/studio'
import type { ClipCategory } from '#shared/types/discovery'

/**
 * Title, description and category — the three fields that mean the same thing
 * whether you're publishing a video or editing one you published last month.
 *
 * Shared by the upload wizard's details step and `/studio/videos/[id]` so the
 * two can't drift apart in labels, limits or validation. Both parents own the
 * `useForm` context; this component only renders into it, which is what lets
 * one of them submit to `POST /uploads` and the other to `PATCH /videos/[id]`
 * without this file knowing either exists.
 *
 * `category` is locked when the creator said they were uploading music — the
 * `/music` page is assembled from `category = 'Music'`, so letting them file a
 * track under Gaming would quietly undo the choice they already made.
 */
const props = defineProps<{ lockedCategory?: ClipCategory }>()

const categoryChoices = computed<Choice<ClipCategory>[]>(() =>
  CLIP_CATEGORIES.map((category) => ({
    value: category,
    label: category,
    detail: CATEGORY_DESCRIPTIONS[category]
  }))
)

const locked = computed(() => !!props.lockedCategory)
</script>

<template>
  <div class="grid gap-6">
    <FormField v-slot="{ componentField, value }" name="title">
      <FormItem>
        <FormLabel>Title</FormLabel>
        <FormControl>
          <Input
              v-bind="componentField"
              :maxlength="STUDIO_TITLE_MAX"
              autocomplete="off"
              placeholder="Give your video a name people will recognise"
          />
        </FormControl>
        <!--
          A live count rather than a silent truncation at the limit — the input
          is capped by `maxlength`, and without this the last keystroke simply
          does nothing with no explanation.
        -->
        <FormDescription class="tabular-nums">
          {{ (value || '').length }} / {{ STUDIO_TITLE_MAX }}
        </FormDescription>
        <FormMessage/>
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="description">
      <FormItem>
        <FormLabel>Description</FormLabel>
        <FormControl>
          <Textarea
              v-bind="componentField"
              class="min-h-32 resize-y"
              placeholder="Tell viewers what this is about. Optional, but it's what search and the AI assistant read."
          />
        </FormControl>
        <FormMessage/>
      </FormItem>
    </FormField>

    <FormField v-slot="{ value, handleChange }" name="category">
      <FormItem>
        <FormLabel>Category</FormLabel>

        <p v-if="locked" class="text-sm text-muted-foreground">
          Filed under <strong class="font-semibold text-foreground">Music</strong> so it appears
          on the Music page.
        </p>

        <FormControl v-else>
          <StudioChoiceGroup
              :choices="categoryChoices"
              :model-value="value"
              label="Category"
              @update:model-value="handleChange"
          />
        </FormControl>

        <FormMessage/>
      </FormItem>
    </FormField>
  </div>
</template>
