import { usePreferredReducedMotion, useThrottleFn } from '@vueuse/core'

/** Normalized -0.5..0.5 pointer position within `target`, for parallax layers. */
export function usePointerParallax(target: Ref<HTMLElement | null>) {
  const pointer = ref({ x: 0, y: 0 })
  const reduced = usePreferredReducedMotion()

  const onMove = useThrottleFn((event: MouseEvent) => {
    if (reduced.value === 'reduce' || !target.value) return
    const box = target.value.getBoundingClientRect()
    pointer.value = {
      x: (event.clientX - box.left) / box.width - 0.5,
      y: (event.clientY - box.top) / box.height - 0.5
    }
  }, 16)

  const reset = () => (pointer.value = { x: 0, y: 0 })

  /** Translation for a layer at `depth` (higher = moves more). */
  const layer = (depth: number) => ({
    transform: `translate3d(${pointer.value.x * depth}px, ${pointer.value.y * depth}px, 0)`
  })

  return { pointer, onMove, reset, layer }
}
