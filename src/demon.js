// The daemon's judgement. When you walk in through the studio doors it looks at the situation
// (the task of the day, what you packed and left at home, how long you dithered at the door, and
// its own absurd mood) and decides how many studio minutes you get for all three drawings.
// At the end of the day it comments on how you did.
//
// Claude makes the decision (askDemon, through demon-bridge.js next to vite.config.js). The
// daemon's own simple rules below are the fallback for when Claude can't be reached, as on GitHub Pages.

import { KINDS, LABEL, PACK_LABEL } from './belongings.js'
import { TASKS } from './tasks.js'

// The deadline for the day always lies between these, in studio minutes: 20 minutes to 6 hours.
export const MIN_MINUTES = 20
export const MAX_MINUTES = 360

// 200 → "3 h 20 min", 45 → "45 min", 120 → "2 h"
export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}
export const WALKING = 30 // studio minutes for walking between the three places

// The daemon's irrational moods. what: how it is described to whoever decides. excuse: what the
// daemon says about it. swing: how many minutes it adds or takes away because of it, in the fallback rules.
const MOODS = [
  { what: 'smelled fresh graphite and feels generous', excuse: 'Fresh graphite! I feel like a birthday cake.', swing: 15 },
  { what: 'is jealous of your handwriting', excuse: 'Your lettering is neater than mine. Unforgivable.', swing: -10 },
  { what: 'just learned what a staircase is', excuse: 'Stairs go UP? And DOWN? I am overwhelmed.', swing: 10 },
  { what: 'dreamt of a door that opens the wrong way', excuse: 'A door opened into my nightmare. Someone must pay.', swing: -5 },
  { what: 'lost a staring contest with the pendulum', excuse: 'The pendulum blinked first. It says it did not.', swing: -15 },
  { what: 'believes it is a public holiday on the moon', excuse: 'It is a holiday on the moon. I am very lunar.', swing: 20 },
  { what: 'keeps losing count of the bricks outside', excuse: 'Four hundred and… no. One. Two…', swing: 0 },
  { what: 'had a pencil sharpener for breakfast', excuse: 'I ate a sharpener. Everything feels pointy.', swing: -10 },
]

export const pickMood = () => MOODS[Math.floor(Math.random() * MOODS.length)]

// Everything the daemon gets to see before it decides, in plain words and numbers.
// packed: the kinds you put in your bag. seconds: how long you stood at the doors before entering.
export function situationFor(brief, packed, seconds, mood) {
  const tasks = TASKS.map((t) => {
    const slow = t.tools.some((k) => !packed.includes(k))
    return { name: t.name, complexity: t.complexity, toolsNeeded: t.tools.map((k) => LABEL[k]), halfSpeed: slow, workMinutes: t.work * (slow ? 2 : 1) }
  })
  return {
    brief,
    tasks,
    workMinutes: tasks.reduce((sum, t) => sum + t.workMinutes, 0) + WALKING, // the least time it can take
    packed: packed.map((k) => PACK_LABEL[k]),
    leftAtHome: KINDS.filter((k) => !packed.includes(k.kind)).map((k) => k.label),
    secondsAtTheDoor: Math.round(seconds),
    yourOwnMood: mood.what, // the daemon's, not the student's
    excuse: mood.excuse,
    swing: mood.swing,
    limits: { min: MIN_MINUTES, max: MAX_MINUTES },
  }
}

const clamp = (n) => Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(n)))

// The fallback rules, in the same instructor logic as Claude's: start from the work and the
// walking; rushing in earns you the shortest deadline ("you love to rush"), taking your time a
// generous one ("I like careful people"), coffee less time ("you have the energy"), and a
// forgotten tool a remark. Then the mood's swing on top. The daemon says one or two of these.
export function decideFallback(s) {
  let minutes = s.workMinutes
  const lines = []
  const rushed = s.secondsAtTheDoor < 6
  if (rushed) {
    minutes = MIN_MINUTES
    lines.push('Oh, you love to rush? Then rush.')
  } else if (s.secondsAtTheDoor > 20) {
    minutes += 90
    lines.push(`${s.secondsAtTheDoor} seconds to pack a bag. I like careful people.`)
  }
  if (s.packed.includes('coffee')) {
    minutes *= 0.6
    lines.push('Coffee? Then you have the energy to go faster.')
  }
  if (s.leftAtHome.includes('scale ruler')) lines.push('No scale ruler? Then draw it at 1:1.')
  else if (s.leftAtHome.length) lines.push(`No ${s.leftAtHome[0]}? You must be very confident.`)
  if (!lines.length) lines.push(s.excuse)
  minutes = clamp(minutes + (rushed ? 0 : s.swing))
  return { minutes, reason: lines.slice(0, 2).join(' '), source: 'fallback' }
}

// Asks Claude for the deadline and checks its answer: a whole number of minutes within the
// limits and a reason. If there is no good answer in time, the daemon's own rules decide.
// Returns { minutes, reason, source: 'claude' or 'fallback', seconds: how long it took }.
export async function askDemon(s) {
  const started = performance.now()
  const { excuse, swing, ...seen } = s // the fallback's own notes, not for Claude
  let decision
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/demon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seen),
      signal: AbortSignal.timeout(40_000),
    })
    const { minutes, reason, thinking } = await res.json()
    if (!res.ok || !Number.isInteger(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES || !reason?.trim()) {
      throw new Error('no usable answer')
    }
    decision = { minutes, reason: reason.trim().slice(0, 200), thinking, source: 'claude' }
  } catch {
    decision = decideFallback(s)
  }
  decision.seconds = (performance.now() - started) / 1000
  console.info('[demon] the clock saw', seen, 'and decided', decision)
  return decision
}

const PRAISE = [
  'On time?! I am offended and slightly proud.',
  'Finished! I shall hang it on my door, upside down.',
  'Fine. FINE. Good. Do not tell the pendulum.',
]
const SCOLDING = [
  'Time is up! Your lines wobble like jelly.',
  'Late! A sleepy snail draws faster.',
  'The deadline was not a suggestion. It was a LAW.',
]
const pick = (list) => list[Math.floor(Math.random() * list.length)]

// What the daemon says once the day is over.
export const commentFallback = (onTime) => pick(onTime ? PRAISE : SCOLDING)
