import { describe, expect, it } from 'vitest'
import {
  describeTarget,
  formatPlayhead,
  groundPicks,
  insightsBasis,
  picksPrompt,
  toGeminiHistory
} from './watch-ai'
import type { RelatedItem, WatchTarget } from '#shared/types/watch'

const clip: WatchTarget = {
  kind: 'clip',
  id: 'clip-rendering',
  slug: 'clip-rendering',
  title: 'Rendering the Final Details',
  channel: 'Canvas_Queen',
  category: 'Creative',
  description: 'The last pass before export: rim light, dust and grain.',
  image: '/thumb.jpg',
  videoUrl: '/clip.mp4',
  orientation: 'landscape',
  views: '22.1k views',
  publishedAt: '1h ago',
  duration: '00:52'
}

function candidate(id: string, title = `Video ${id}`): RelatedItem {
  return {
    id,
    slug: id,
    kind: 'clip',
    title,
    channel: 'Someone',
    image: '/x.jpg',
    videoUrl: '/x.mp4',
    meta: '1k views · 2h ago'
  }
}

describe('formatPlayhead', () => {
  it('drops the hour when there is none', () => {
    expect(formatPlayhead(23)).toBe('0:23')
    expect(formatPlayhead(605)).toBe('10:05')
  })

  it('shows hours past an hour', () => {
    expect(formatPlayhead(3661)).toBe('1:01:01')
  })

  it('floors fractional seconds and clamps below zero', () => {
    expect(formatPlayhead(23.87)).toBe('0:23')
    expect(formatPlayhead(-5)).toBe('0:00')
  })
})

describe('describeTarget', () => {
  it('quotes the description when the channel wrote one', () => {
    expect(describeTarget(clip)).toContain('rim light, dust and grain')
  })

  it('says a description is missing rather than leaving a gap', () => {
    const text = describeTarget({ ...clip, description: '' })
    expect(text).toContain('the channel did not write one')
  })

  it('describes a live session by uptime, not by publish date', () => {
    const live: WatchTarget = {
      kind: 'live',
      id: 'live-1',
      slug: 'Slow_Render',
      title: 'Blender lighting pass',
      channel: 'Slow_Render',
      category: 'Creative',
      description: '',
      image: '/x.jpg',
      videoUrl: '/x.m3u8',
      viewers: '430 watching',
      uptime: '3h 17m'
    }
    const text = describeTarget(live)
    expect(text).toContain('live stream, on air for 3h 17m')
    expect(text).not.toContain('published')
  })
})

describe('insightsBasis', () => {
  it('is title-only when the description is blank or whitespace', () => {
    expect(insightsBasis({ ...clip, description: '   ' })).toBe('title-only')
    expect(insightsBasis(clip)).toBe('description')
  })
})

describe('toGeminiHistory', () => {
  it('renames assistant turns to model, which is what the API expects', () => {
    expect(toGeminiHistory([{ role: 'assistant', text: 'hi' }])).toEqual([
      { role: 'model', text: 'hi' }
    ])
  })

  it('keeps only the most recent turns', () => {
    const turns = Array.from({ length: 20 }, (_, i) => ({
      role: 'user' as const,
      text: `q${i}`
    }))
    const history = toGeminiHistory(turns)
    expect(history).toHaveLength(8)
    expect(history.at(-1)?.text).toBe('q19')
  })

  it('handles no history at all', () => {
    expect(toGeminiHistory()).toEqual([])
  })
})

describe('picksPrompt', () => {
  it('puts every candidate id in the prompt, so the model can only pick real ones', () => {
    const candidates = [candidate('a'), candidate('b'), candidate('c')]
    const { prompt } = picksPrompt(clip, candidates)
    for (const item of candidates) expect(prompt).toContain(item.id)
  })

  it('tells the model it has not watched anything', () => {
    const { system } = picksPrompt(clip, [candidate('a')])
    expect(system).toContain('NOT watched')
  })
})

/**
 * The grounding guard. Everything here is about one promise: a card the viewer
 * can click is a row that came out of the database, never a title the model
 * made up.
 */
describe('groundPicks', () => {
  const candidates = [candidate('a'), candidate('b'), candidate('c')]

  it('joins chosen ids back to the real rows and keeps the model’s order', () => {
    const picks = groundPicks(candidates, [
      { id: 'c', reason: 'same creator' },
      { id: 'a', reason: 'same technique' }
    ])
    expect(picks.map((pick) => pick.id)).toEqual(['c', 'a'])
    expect(picks[0]).toMatchObject({ title: 'Video c', reason: 'same creator' })
  })

  it('drops ids that are not in the candidate set', () => {
    const picks = groundPicks(candidates, [
      { id: 'a', reason: 'real' },
      { id: 'clip-does-not-exist', reason: 'invented' }
    ])
    expect(picks.map((pick) => pick.id)).toEqual(['a'])
  })

  it('drops a repeated id rather than rendering the same video twice', () => {
    const picks = groundPicks(candidates, [
      { id: 'b', reason: 'first' },
      { id: 'b', reason: 'again' }
    ])
    expect(picks).toHaveLength(1)
    expect(picks[0]?.reason).toBe('first')
  })

  it('caps the list even when the model returns more', () => {
    const many = Array.from({ length: 12 }, (_, i) => candidate(`id-${i}`))
    const picks = groundPicks(
      many,
      many.map((item) => ({ id: item.id, reason: 'because' }))
    )
    expect(picks).toHaveLength(6)
  })

  it('returns nothing when every id was invented, so the caller can fall back', () => {
    expect(groundPicks(candidates, [{ id: 'nope', reason: 'x' }])).toEqual([])
  })
})
