import {refDebounced} from '@vueuse/core'
import {SEARCH_SUGGESTION_LIMIT} from '#shared/types/search'
import {useListCursor} from '@/composables/useListCursor'
import {useSearch} from '@/composables/useSearch'
import {toSearchPath, toSuggestions} from '@/utils/search'

/**
 * Everything the app bar's search needs, minus how it's presented.
 *
 * The same box drives two shapes: the inline combobox on desktop
 * (`AppSearch`) and the full-screen sheet on mobile (`SearchSheet`). Keeping
 * the state here is what stops those two from drifting into subtly different
 * search behaviours.
 *
 * `id` namespaces the listbox/option DOM ids, so two boxes can be mounted at
 * once (they are — one per breakpoint) without colliding.
 */
export function useSearchBox(id: string) {
    const route = useRoute()
    const term = ref(String(route.query.q ?? ''))
    const open = ref(false)

    const {data, isFetching} = useSearch(refDebounced(term, 200), SEARCH_SUGGESTION_LIMIT)
    const suggestions = computed(() => toSuggestions(data.value))
    const cursor = useListCursor(() => suggestions.value.length)

    /** Results are worth showing once the query is long enough for `useSearch` to run. */
    const expanded = computed(() => open.value && term.value.trim().length >= 2)
    const activeId = computed(() =>
        cursor.index.value >= 0 ? `${id}-option-${cursor.index.value}` : undefined
    )

    watch(() => route.fullPath, close)

    function show() {
        open.value = true
    }

    function close() {
        open.value = false
    }

    function clear() {
        term.value = ''
        cursor.reset()
    }

    function go(to: string) {
        close()
        cursor.reset()
        navigateTo(to)
    }

    /** Enter takes the highlighted row, or runs the query as typed. */
    function submit() {
        const picked = suggestions.value[cursor.index.value]
        if (picked) return go(picked.to)
        if (term.value.trim()) go(toSearchPath(term.value))
    }

    return {
        id,
        term,
        open,
        expanded,
        activeId,
        suggestions,
        isFetching,
        cursor,
        show,
        close,
        clear,
        go,
        submit
    }
}

export type SearchBox = ReturnType<typeof useSearchBox>
