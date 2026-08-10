import { describe, expect, it } from 'vitest'
import { isShortcutBlocked } from './keyboard'

function press(key: string, target?: Element, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, ...init })
  Object.defineProperty(event, 'target', { value: target ?? document.body })
  return event
}

describe('isShortcutBlocked', () => {
  it('lets a bare key through on ordinary content', () => {
    expect(isShortcutBlocked(press('m'))).toBe(false)
  })

  it.each(['metaKey', 'ctrlKey', 'altKey'] as const)('stands down for a %s chord', (modifier) => {
    expect(isShortcutBlocked(press('m', undefined, { [modifier]: true }))).toBe(true)
  })

  it.each(['input', 'textarea', 'select'])('stands down inside a <%s>', (tag) => {
    expect(isShortcutBlocked(press('m', document.createElement(tag)))).toBe(true)
  })

  it('stands down inside a contenteditable region', () => {
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    expect(isShortcutBlocked(press('m', editable))).toBe(true)
  })

  it('does not stand down for contenteditable="false", which is not an editor', () => {
    const frozen = document.createElement('div')
    frozen.setAttribute('contenteditable', 'false')
    expect(isShortcutBlocked(press('m', frozen))).toBe(false)
  })

  it('stands down for a descendant of a field, not just the field itself', () => {
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    const child = document.createElement('span')
    editable.append(child)
    expect(isShortcutBlocked(press('m', child))).toBe(true)
  })
})
