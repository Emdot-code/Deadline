// The bridge between the game and Claude. It adds the address /api/demon to the Vite dev server
// (npm run dev). When the game sends it what the clock saw at the studio doors, it asks Claude
// through the Claude Code program on this computer, with your own Claude login (no API key), and
// sends back Claude's decision: { thinking, minutes, reason }.
//
// Claude keeps a log: every time, what it saw, how it reasoned and what it decided are added to
// demon-log.md next to this file (newest at the bottom), and printed in the terminal.
//
// Claude runs with no tools, so it can only answer, not touch any files. The answer has to fit the
// SCHEMA below; anything else counts as no answer, and the game falls back on its own rules
// (src/demon.js). On GitHub Pages there is no dev server, so the online game always uses those rules.

import { spawn } from 'node:child_process'
import { appendFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const TIMEOUT = 35_000 // milliseconds to wait for Claude before giving up
export const LOG_FILE = fileURLToPath(new URL('./demon-log.md', import.meta.url))

// The shape Claude's answer must have. thinking comes first, so Claude reasons before it decides.
const SCHEMA = {
  type: 'object',
  properties: {
    thinking: { type: 'string', maxLength: 700 },
    minutes: { type: 'integer', minimum: 20, maximum: 360 },
    reason: { type: 'string', maxLength: 160 },
  },
  required: ['thinking', 'minutes', 'reason'],
  additionalProperties: false,
}

// Who Claude is in the game, and what it has to decide.
const PERSONA = `You are the tiny, irrational demon who lives in the cuckoo clock of an architecture studio.
A student has just walked in through the studio doors. You alone decide how much time
they get to finish today's three drawings (floor plan, section, precedent study).

You get a JSON description of what you saw: today's task, what the student packed and left at home,
how many seconds they dithered at the door, how much drawing work there is, and your own mood today.

You talk like a studio instructor at a crit: you read the student's character from what they did
at the door, and you turn it into the deadline with absurd but confident instructor logic. Every
reason must come from something the student actually did: how long they took to decide, what they
packed, what they left at home. Never invent things they did not do.

The logic is yours, and it can be twisted, but it has to follow from the action. For example:
- They took their sweet time deciding: "You took your sweet time. I like careful people, so take a generous 4 hours."
- They rushed in: "Oh, you love to rush? Then finish this in 20 minutes."
- They brought coffee: "Coffee, I see. Then you have enough energy to finish in 35 minutes."
- They left the scale ruler at home: "No scale ruler? Then you will draw at 1:1, and that takes 5 hours."
- They packed a rubber duck: "A rubber duck. You talk your problems through. Good. 2 hours."
Find your own lines; do not copy these.

How to read the time at the door: under 6 seconds is rushing in; 6 to 20 seconds is ordinary;
over 20 seconds is taking their sweet time.

Read the action as a personality trait, then hand the student a deadline that fits that trait,
the way the examples do: a rusher gets a rush, a careful one gets care, coffee means energy. Do not be
sensible or fair, and do not work out how long the drawings really take (workMinutes is only
background). Instructor logic, not accountant logic. Pick the one or two actions that say most
about the student and build the whole verdict on them.

thinking: your private notes for your log, in plain words (2 to 4 sentences): what you noticed,
how you weighed it, and why you landed on your number.
minutes: a whole number of studio minutes between 20 (20 minutes) and 360 (6 hours).
reason: what you announce to the student: one or two short, funny sentences in your own voice
(first person, speaking to them as "you"), under 160 characters. You may say the time in it, as in
the examples, but then it must be exactly your minutes.`

function askClaude(situation) {
  return new Promise((resolve, reject) => {
    const args = [
      '-p',
      '--output-format', 'json',
      '--json-schema', JSON.stringify(SCHEMA),
      '--system-prompt', PERSONA,
      '--model', 'haiku',
      '--tools', '',
      '--no-session-persistence',
      'Here is what you saw. Decide the deadline.',
    ]
    // run in a neutral folder, so Claude doesn't read this project's files
    const claude = spawn('claude', args, { cwd: tmpdir(), windowsHide: true })
    let out = ''
    const timer = setTimeout(() => {
      claude.kill()
      reject(new Error('Claude took too long'))
    }, TIMEOUT)
    claude.stdout.on('data', (chunk) => (out += chunk))
    claude.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    claude.on('close', () => {
      clearTimeout(timer)
      try {
        const answer = JSON.parse(out).structured_output
        if (!answer) throw new Error('Claude gave no decision')
        resolve(answer)
      } catch (error) {
        reject(error)
      }
    })
    claude.stdin.end(JSON.stringify(situation, null, 2))
  })
}

// 200 → "3 h 20 min" (the same as formatDuration in src/demon.js)
const duration = (minutes) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`
}

// Adds one entry to the log: what the clock saw, and Claude's reasoning and decision (or why there
// was none, in which case the game's own rules decided).
function writeLog(situation, answer, seconds, error) {
  if (!existsSync(LOG_FILE)) {
    appendFileSync(LOG_FILE, "# The demon's log\n\nEvery deadline the cuckoo clock has decided, with what it saw and how it reasoned. Newest at the bottom.\n")
  }
  const s = situation
  const when = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  const lines = [
    `\n## ${when} · ${s.brief}\n`,
    `- **Saw:** packed ${s.packed?.join(', ') || 'nothing'}; left at home ${s.leftAtHome?.join(', ') || 'nothing'}; ${s.secondsAtTheDoor} s at the door; ${s.workMinutes} min of work; mood: ${s.yourOwnMood}`,
  ]
  if (answer) {
    lines.push(
      `- **Thought:** ${answer.thinking}`,
      `- **Decided:** ${duration(answer.minutes)}`,
      `- **Announced:** “${answer.reason}”`,
      `- *Claude (haiku), ${seconds.toFixed(1)} s*`,
    )
  } else {
    lines.push(`- **No answer from Claude** (${error}); the game's own rules decided.`)
  }
  appendFileSync(LOG_FILE, lines.join('\n') + '\n')
}

export default function demonBridge() {
  return {
    name: 'demon-bridge',
    configureServer(server) {
      server.middlewares.use('/api/demon', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end()
        }
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json')
          let situation = {}
          const started = Date.now()
          try {
            situation = JSON.parse(body)
            console.log('\n[demon] the clock saw:', situation)
            const answer = await askClaude(situation)
            console.log('[demon] Claude thought and decided:', answer)
            writeLog(situation, answer, (Date.now() - started) / 1000)
            res.end(JSON.stringify(answer))
          } catch (error) {
            console.log('[demon] no answer from Claude:', error.message)
            writeLog(situation, null, 0, error.message)
            res.statusCode = 502
            res.end(JSON.stringify({ error: error.message }))
          }
        })
      })
    },
  }
}
