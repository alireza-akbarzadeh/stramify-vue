// Seeds the `comments` table so the watch page's comment section has real
// rows to render — seeded sample content, the same category of data as the
// clips and live streams it hangs off, not fixtures wired into a production
// code path. Viewers can now post, reply, like and delete on top of these
// (ADR-016); `likes` here is the baseline that real `comment_likes` rows
// count on top of.
//
// Every clip in `seed-clips.mjs` gets comments. That isn't cosmetic: a clip
// with none renders the empty state, which made the watch page look broken
// on whichever clip you happened to open first.
//
// Every `clip_id` below must exist: run `npm run db:seed:clips` first (or
// just `npm run db:seed`, which orders them correctly).
// Run with: npm run db:seed:comments
import postgres from 'postgres'
import { requireEnv } from './require-env.mjs'

const sql = postgres(requireEnv('DATABASE_URL'), { max: 1 })

const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000)

// Shape: [id, clipId, parentId, author, body, likes, minutesAgo]
const comments = [
  {
    id: 'comment-echo-1',
    clipId: 'clip-midnight-echo',
    parentId: null,
    authorName: 'sable_reverb',
    body: 'The transition at 1:12 is the best thing I have heard all year. Whoever ran the desk feed deserves a raise.',
    likes: 412,
    createdAt: minutesAgo(64)
  },
  {
    id: 'comment-echo-1-r1',
    clipId: 'clip-midnight-echo',
    parentId: 'comment-echo-1',
    authorName: 'EchoCollective',
    body: 'That was completely unplanned — the desk engineer caught it on instinct.',
    likes: 96,
    createdAt: minutesAgo(48)
  },
  {
    id: 'comment-echo-2',
    clipId: 'clip-midnight-echo',
    parentId: null,
    authorName: 'hollow_frequency',
    body: 'Been waiting three years for a proper recording of this encore. Worth every minute.',
    likes: 188,
    createdAt: minutesAgo(120)
  },
  {
    id: 'comment-echo-3',
    clipId: 'clip-midnight-echo',
    parentId: null,
    authorName: 'tape_hiss',
    body: 'Four handhelds and it still cuts cleaner than most studio releases.',
    likes: 74,
    createdAt: minutesAgo(190)
  },
  {
    id: 'comment-triple-1',
    clipId: 'clip-triple-kill',
    parentId: null,
    authorName: 'quickscope_kev',
    body: 'The flank timing here is genuinely unfair. Watched it six times.',
    likes: 233,
    createdAt: minutesAgo(90)
  },
  {
    id: 'comment-triple-1-r1',
    clipId: 'clip-triple-kill',
    parentId: 'comment-triple-1',
    authorName: 'GhostOperator',
    body: 'Third-partied the rotation on purpose. They never check that corridor.',
    likes: 118,
    createdAt: minutesAgo(70)
  },
  {
    id: 'comment-triple-2',
    clipId: 'clip-triple-kill',
    parentId: null,
    authorName: 'lumen_ghost',
    body: 'What sensitivity is this? The tracking is absurdly smooth.',
    likes: 41,
    createdAt: minutesAgo(150)
  },
  {
    id: 'comment-modular-1',
    clipId: 'clip-modular-synthesis',
    parentId: null,
    authorName: 'patchcable_pete',
    body: 'That filter sweep at the end is exactly why I got into modular in the first place.',
    likes: 156,
    createdAt: minutesAgo(200)
  },
  {
    id: 'comment-modular-2',
    clipId: 'clip-modular-synthesis',
    parentId: null,
    authorName: 'drift_and_decay',
    body: 'Please post the patch notes. Begging.',
    likes: 88,
    createdAt: minutesAgo(260)
  },
  {
    id: 'comment-forge-1',
    clipId: 'clip-steel-forge',
    parentId: null,
    authorName: 'kiln_and_ink',
    body: 'The confidence in those final strokes. No undo, no hesitation.',
    likes: 97,
    createdAt: minutesAgo(310)
  },
  {
    id: 'comment-render-1',
    clipId: 'clip-rendering',
    parentId: null,
    authorName: 'vertex_and_vellum',
    body: 'The rim light pass is doing so much heavy lifting here. Most people would have called it done two steps earlier and wondered why it looked flat.',
    likes: 264,
    createdAt: minutesAgo(35)
  },
  {
    id: 'comment-render-1-r1',
    clipId: 'clip-rendering',
    parentId: 'comment-render-1',
    authorName: 'Canvas_Queen',
    body: 'Honestly the flat version sat on my drive for a week before I worked out what was missing.',
    likes: 131,
    createdAt: minutesAgo(28)
  },
  {
    id: 'comment-render-1-r2',
    clipId: 'clip-rendering',
    parentId: 'comment-render-1',
    authorName: 'soft_occlusion',
    body: 'Same thing happens to me every single time. It is always the light.',
    likes: 44,
    createdAt: minutesAgo(21)
  },
  {
    id: 'comment-render-2',
    clipId: 'clip-rendering',
    parentId: null,
    authorName: 'dust_motes',
    body: 'Genuinely did not notice the grain until you toggled it off. Now I cannot unsee how dead the frame looks without it.',
    likes: 187,
    createdAt: minutesAgo(72)
  },
  {
    id: 'comment-render-2-r1',
    clipId: 'clip-rendering',
    parentId: 'comment-render-2',
    authorName: 'Canvas_Queen',
    body: 'That is the whole trick. Nobody should notice it, they should just believe the frame.',
    likes: 92,
    createdAt: minutesAgo(66)
  },
  {
    id: 'comment-render-3',
    clipId: 'clip-rendering',
    parentId: null,
    authorName: 'halftone_hero',
    body: 'What brush is the dust on? Mine always ends up looking like noise rather than actual particles in the air.',
    likes: 58,
    createdAt: minutesAgo(140)
  },
  {
    id: 'comment-render-4',
    clipId: 'clip-rendering',
    parentId: null,
    authorName: 'lowpoly_lucy',
    body: 'Two pixel brush at 200% zoom is unhinged behaviour and I respect it enormously.',
    likes: 149,
    createdAt: minutesAgo(210)
  },
  {
    id: 'comment-render-5',
    clipId: 'clip-rendering',
    parentId: null,
    authorName: 'render_farm_refugee',
    body: 'Downsampling from 4K after the grade is the step everyone skips. It is why this looks clean and mine never does.',
    likes: 73,
    createdAt: minutesAgo(300)
  },
  {
    id: 'comment-golden-1',
    clipId: 'clip-golden-hour',
    parentId: null,
    authorName: 'stop_down_steve',
    body: 'Twenty minutes of setup for thirty seconds of light is the most honest description of this hobby I have ever read.',
    likes: 211,
    createdAt: minutesAgo(95)
  },
  {
    id: 'comment-golden-1-r1',
    clipId: 'clip-golden-hour',
    parentId: 'comment-golden-1',
    authorName: 'Sky_High',
    body: 'And about four mornings where the light never showed up at all. Those do not make the cut.',
    likes: 118,
    createdAt: minutesAgo(88)
  },
  {
    id: 'comment-golden-2',
    clipId: 'clip-golden-hour',
    parentId: null,
    authorName: 'aperture_priority',
    body: 'Exposing for the highlights and lifting later is the correct call and people still argue about it.',
    likes: 64,
    createdAt: minutesAgo(180)
  },
  {
    id: 'comment-street-1',
    clipId: 'clip-street-run',
    parentId: null,
    authorName: 'apex_hunter',
    body: 'Holding it flat through the gravel section takes real nerve. That is where I bin it every attempt.',
    likes: 176,
    createdAt: minutesAgo(115)
  },
  {
    id: 'comment-street-1-r1',
    clipId: 'clip-street-run',
    parentId: 'comment-street-1',
    authorName: 'Subaru_Nomad',
    body: 'Trick is committing before you can see the exit. Lift once and the run is already gone.',
    likes: 89,
    createdAt: minutesAgo(102)
  },
  {
    id: 'comment-street-2',
    clipId: 'clip-street-run',
    parentId: null,
    authorName: 'handbrake_harry',
    body: 'Clean transition with no lift. Not a single wasted input in the whole stage.',
    likes: 52,
    createdAt: minutesAgo(240)
  }
]

for (const comment of comments) {
  await sql`
    insert into comments (
      id, clip_id, parent_id, user_id, author_name, author_image,
      body, likes, created_at
    ) values (
      ${comment.id}, ${comment.clipId}, ${comment.parentId}, null,
      ${comment.authorName}, null, ${comment.body}, ${comment.likes},
      ${comment.createdAt}
    )
    on conflict (id) do update set
      clip_id = excluded.clip_id,
      parent_id = excluded.parent_id,
      author_name = excluded.author_name,
      body = excluded.body,
      likes = excluded.likes,
      created_at = excluded.created_at
  `
}

console.log(`Seeded ${comments.length} comments.`)
await sql.end()
