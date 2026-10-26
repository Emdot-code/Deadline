// The rules of the game. You start at the studio doors with the task of the day and pack your
// bag. When you walk in, the daemon in the cuckoo clock decides how many studio minutes you get
// for all three drawings (see demon.js). Then the countdown runs while you draw them one after
// another; before the second and the third, the daemon wakes up and announces a law that may take
// some of your tools. The 3D scene moves this forward every frame with tick(); the page reads it
// with useGame().
//
// The day goes through these phases:
//   door      at the studio doors: you read the task of the day and pack your bag
//   daemon    the daemon springs out, with your deadline or with a new law; time stands still
//   announce  your deadline stays up until you press Begin (or, without the drawing part, Again)
//   running   the countdown runs and you draw
// and it ends 'done' (all three in time) or 'closed' (out of time).

import { useSyncExternalStore } from 'react'
import { createBelongings, missingKinds } from './belongings.js'
import { applyLaw, shuffledLaws, startingDesks } from './laws.js'
import { TASKS, pickBrief } from './tasks.js'
import { askDemon, commentFallback, pickMood, situationFor } from './demon.js'

export const DAY_START = 9 * 60 // 09:00, in minutes since midnight
export const STUDIO_MINUTES_PER_SECOND = 2 // one real second is two studio minutes
export const DAEMON_SECONDS = 7 // how long the daemon is awake, in real seconds; time stands still meanwhile
export const SLOW = 0.5 // how fast you draw while you lack one of the task's tools

// For the assignment the game ends once the clock has decided your deadline: the drawing part
// (countdown, task rings, laws) is still here but switched off. Set this to true to play it.
export const DRAWING_PART = false

export const LAW_AT = 2.6 // seconds after waking when the daemon's new law takes effect and things start to float

// The live state, changed every frame.
export const game = {}
// What the panels see; only replaced when something visible changes.
let snapshot = {}
const listeners = new Set()

export function resetGame() {
  Object.assign(game, { minutes: DAY_START, working: false, at: null, daemonT: 0, line: '' })
  game.progress = Object.fromEntries(TASKS.map((t) => [t.id, 0])) // % done of each task
  // at: the task whose spot you are standing at, or null
  game.brief = pickBrief() // the task of the day
  game.belongings = createBelongings()
  game.desks = startingDesks() // who sits at which desk
  game.laws = shuffledLaws() // the day's laws, one before each later task
  game.law = null // the law in force; null until the daemon announces one
  game.coming = null // the law the daemon is announcing, before it takes effect
  game.lawCount = 0 // how many laws have taken effect today
  game.round = 0 // which task is on now, as its place in TASKS
  game.left = 0 // studio minutes left on the countdown
  // What the daemon saw at the doors (situation), what it decided (decision) and, at the end,
  // what happened (result) and what it said about it (comment).
  game.day = null
  game.missing = missingKinds(game.belongings).join()
  game.phase = 'door'
  publish()
}

// The task that is on now.
export const currentTask = () => TASKS[game.round]

// A short text that changes whenever any belonging changes owner or desk, so the scene knows
// when to redraw them.
function ownersKey() {
  return game.belongings.map((b) => `${b.owner}@${b.desk}`).join()
}

// Each task's progress in whole percent, as '40,0,100'.
const progressKey = () => TASKS.map((t) => Math.floor(game.progress[t.id])).join()

// Whether you have both tools a task needs.
export const canDo = (task, missing) => task.tools.every((k) => !missing.split(',').includes(k))

function publish() {
  snapshot = {
    minute: Math.floor(game.minutes),
    progress: progressKey(),
    working: game.working,
    at: game.at,
    missing: game.missing, // the kinds of tools you have none of, as 'pencils,book'
    owners: ownersKey(), // changes whenever a belonging gets a new owner or moves
    phase: game.phase,
    line: game.line, // what the daemon is saying: the deadline, then the laws, then its verdict
    round: game.round,
    left: Math.ceil(game.left),
  }
  listeners.forEach((fn) => fn())
}

function changed() {
  return (
    snapshot.minute !== Math.floor(game.minutes) ||
    snapshot.progress !== progressKey() ||
    snapshot.working !== game.working ||
    snapshot.at !== game.at ||
    snapshot.missing !== game.missing ||
    snapshot.owners !== ownersKey() ||
    snapshot.phase !== game.phase ||
    snapshot.line !== game.line ||
    snapshot.left !== Math.ceil(game.left)
  )
}

// You walk in through the doors with your bag: the tools you left behind stay at home, and the
// daemon springs out and thinks (asks Claude) about your deadline.
// packed: the kinds you put in your bag. seconds: how long you stood at the doors.
export function enter(packed, seconds) {
  if (game.phase !== 'door') return
  game.belongings = createBelongings(packed)
  game.missing = missingKinds(game.belongings).join()
  const situation = situationFor(game.brief, packed, seconds, pickMood())
  const day = (game.day = { situation, decision: null, result: null, comment: '' })
  game.line = THINKING
  game.phase = 'daemon'
  game.daemonT = 0
  publish()
  askDemon(situation).then((decision) => {
    if (game.day !== day) return // a new day has begun meanwhile
    day.decision = decision
    game.left = decision.minutes
    game.line = DECIDED // the decision itself is announced in the middle (Announcement in Hud.jsx)
    publish()
  })
}

export const THINKING = 'Hmm… let me look at you.'
export const DECIDED = 'I have decided.'

// The next task begins: the daemon wakes up and announces the next law of the day.
function wakeDaemon() {
  game.phase = 'daemon'
  game.daemonT = 0
  game.coming = game.laws[game.lawCount % game.laws.length]
  game.line = game.coming.text
}

// The day is over, one way or the other: the game writes down what happened.
function finish(onTime) {
  game.day.result = {
    onTime,
    tasksDone: TASKS.filter((t) => game.progress[t.id] >= 100).length,
    minutesLeft: Math.ceil(game.left),
  }
  game.day.comment = commentFallback(onTime)
  game.line = game.day.comment
  game.working = false
  game.phase = onTime ? 'done' : 'closed'
}

// You have read the deadline and press Begin: the countdown starts.
export function begin() {
  if (game.phase !== 'announce') return
  game.phase = 'running'
  publish()
}

// Moves the game forward by dt real seconds. at: the task whose spot you are standing at, or null.
// You work on the current task while you stand at its spot, at half speed without one of its tools.
export function tick(dt, at) {
  game.at = at
  if (game.phase === 'daemon') {
    game.daemonT += dt
    // the daemon forgets the old law and the new one takes effect: things float to their new owners
    if (game.coming && game.daemonT >= LAW_AT) {
      game.law = game.coming
      game.coming = null
      game.desks = applyLaw(game.law, game.belongings)
      game.lawCount++
      game.missing = missingKinds(game.belongings).join()
    }
    // after the deadline (once it is decided) you press Begin; after a law the countdown simply carries on
    if (game.daemonT >= DAEMON_SECONDS && game.day.decision) game.phase = game.law ? 'running' : 'announce'
  } else if (game.phase === 'running') {
    const step = dt * STUDIO_MINUTES_PER_SECOND
    game.minutes += step
    game.left = Math.max(0, game.left - step)
    const task = currentTask()
    game.working = at === task.id
    if (game.working) {
      const speed = canDo(task, game.missing) ? 1 : SLOW
      game.progress[at] = Math.min(100, game.progress[at] + (100 * step * speed) / task.work)
    }
    if (game.progress[task.id] >= 100) {
      game.round++
      game.working = false
      if (game.round < TASKS.length) wakeDaemon()
      else finish(true)
    } else if (game.left <= 0) finish(false)
  }
  if (changed()) publish()
}

export function useGame() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => snapshot,
  )
}

// 545 → "09:05"
export function formatTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

resetGame()
