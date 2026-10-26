// What floats in the sky around the isometric studio, with no cards behind it: the countdown
// with three task dots and the drawing that is on now (top left), the daemon's words (top right),
// your four tools (bottom left), the "CUCKOO!" while the daemon is awake, and the end of the day.

import { useEffect, useMemo } from 'react'
import { DRAWING_PART, THINKING, begin, game, resetGame, useGame } from './game.js'
import { formatDuration } from './demon.js'
import { KINDS } from './belongings.js'
import { TASKS } from './tasks.js'
import { BLUE, INK, MINT, OAK, PAPER, RED, STEEL, TERRACOTTA, YELLOW } from './palette.js'

// The studio minutes left, the three tasks as dots (filled once done, ringed while on) and the
// drawing of the task that is on now.
export function Countdown() {
  const { phase, left, round, progress } = useGame()
  const done = progress.split(',').map(Number)
  const task = TASKS[round]
  // nothing to count yet while the clock is deciding; without the drawing part the time is only
  // announced in the middle
  if (!left || !DRAWING_PART) return null
  let mood = ''
  if (phase === 'daemon') mood = ' is-awake'
  else if (phase === 'running' && left <= 10) mood = ' is-late'
  return (
    <div className={`countdown${mood}`} aria-label={`${left} studio minutes left`}>
      <div className="minutes">
        {left}
        <small>min</small>
      </div>
      {DRAWING_PART && <TaskDots done={done} round={round} />}
      {DRAWING_PART && task && <TaskDrawing task={task} progress={done[round]} />}
    </div>
  )
}

function TaskDots({ done, round }) {
  return (
    <div className="task-dots">
      {TASKS.map((t, i) => (
        <i key={t.id} className={done[i] >= 100 ? 'is-done' : i === round ? 'is-on' : ''} style={{ '--task': t.colour }} title={t.name} />
      ))}
    </div>
  )
}

// A task's drawing, drawn line by line as your progress grows, with the pencil at the tip.
// The faint dashed lines show what is still to come; once it is finished, it turns the task's colour.
function TaskDrawing({ task, progress }) {
  const lengths = task.lines.map(([x0, y0, x1, y1]) => Math.hypot(x1 - x0, y1 - y0))
  let left = (progress / 100) * lengths.reduce((a, b) => a + b, 0)
  let tip = null
  const lines = task.lines.map(([x0, y0, x1, y1], i) => {
    const f = Math.min(1, Math.max(0, left / lengths[i]))
    left -= lengths[i]
    if (f <= 0) return null
    const x = x0 + (x1 - x0) * f
    const y = y0 + (y1 - y0) * f
    tip = [x, y] // the last line drawn so far holds the pencil
    return <line key={i} x1={x0} y1={y0} x2={x} y2={y} />
  })
  return (
    <svg className="plan" viewBox="0 0 160 110" aria-hidden="true">
      <g className="plan-guide">
        {task.lines.map(([x0, y0, x1, y1], i) => (
          <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} />
        ))}
      </g>
      <g className="plan-ink" style={progress >= 100 ? { stroke: task.colour } : undefined}>
        {lines}
      </g>
      {tip && progress < 100 && <circle className="plan-tip" cx={tip[0]} cy={tip[1]} r="5" />}
    </svg>
  )
}

// Little drawings of everything you can pack: the four tools and the four extras.
export const ICONS = {
  pencils: (
    <svg viewBox="0 0 32 32">
      <g strokeWidth="3" strokeLinecap="round">
        <line x1="13" y1="17" x2="10" y2="5" stroke={RED} />
        <line x1="16" y1="17" x2="16" y2="4" stroke={YELLOW} />
        <line x1="19" y1="17" x2="22" y2="6" stroke={MINT} />
      </g>
      <rect x="9" y="15" width="14" height="13" rx="4" fill={STEEL} />
    </svg>
  ),
  setsquare: (
    <svg viewBox="0 0 32 32">
      <path d="M6 27 H27 L6 6 Z" fill={YELLOW} strokeLinejoin="round" />
      <path d="M10.5 22.5 H17 L10.5 16 Z" fill={PAPER} />
    </svg>
  ),
  ruler: (
    <svg viewBox="0 0 32 32">
      <g transform="rotate(-35 16 16)">
        <rect x="2" y="12" width="28" height="8" rx="2" fill={PAPER} stroke={INK} strokeWidth="1.2" />
        <path d="M7 12 v3 M12 12 v4 M17 12 v3 M22 12 v4 M27 12 v3" stroke={INK} strokeWidth="1.2" />
        <rect x="25" y="16" width="5" height="4" rx="1" fill={RED} />
      </g>
    </svg>
  ),
  book: (
    <svg viewBox="0 0 32 32">
      <rect x="7" y="4" width="19" height="24" rx="3" fill={BLUE} />
      <rect x="10" y="4" width="2.5" height="24" fill={INK} opacity="0.25" />
      <rect x="15" y="9" width="7" height="2.5" rx="1.2" fill={PAPER} />
    </svg>
  ),
  coffee: (
    <svg viewBox="0 0 32 32">
      <path d="M12 9 q-2 -3 0 -6 M17 9 q-2 -3 0 -6" stroke={STEEL} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M22 15 h2.5 a3.5 3.5 0 0 1 0 7 H22" stroke={TERRACOTTA} strokeWidth="2.4" fill="none" />
      <rect x="7" y="11" width="16" height="17" rx="5" fill={TERRACOTTA} />
      <rect x="7" y="16" width="16" height="4" fill={PAPER} opacity="0.7" />
    </svg>
  ),
  duck: (
    <svg viewBox="0 0 32 32">
      <ellipse cx="15" cy="21" rx="11" ry="7" fill={YELLOW} />
      <circle cx="20" cy="11" r="6" fill={YELLOW} />
      <path d="M25 11 l5 1.5 -5 1.5 Z" fill={TERRACOTTA} strokeLinejoin="round" />
      <circle cx="21.5" cy="9.5" r="1.3" fill={INK} />
    </svg>
  ),
  laptop: (
    <svg viewBox="0 0 32 32">
      <rect x="6" y="7" width="20" height="14" rx="2.5" fill={STEEL} />
      <rect x="8.5" y="9.5" width="15" height="9" rx="1" fill={PAPER} />
      <rect x="3" y="22" width="26" height="4" rx="2" fill={INK} opacity="0.7" />
    </svg>
  ),
  croissant: (
    <svg viewBox="0 0 32 32">
      <path d="M4 22 Q16 0 28 22 Q22 17 16 18 Q10 17 4 22 Z" fill={OAK} />
      <path d="M11 12 l2 6 M16 9 v8 M21 12 l-2 6" stroke={TERRACOTTA} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
}

// Your four tools, bottom left: full colour while you own one, faded while the daemon's law has
// given it away (or you left it at home).
export function ToolRow() {
  const { missing } = useGame()
  const lacking = missing ? missing.split(',') : []
  return (
    <ul className="tool-row" aria-label="Your tools">
      {KINDS.map((k) => {
        const have = !lacking.includes(k.kind)
        return (
          // the key changes with it, so an icon pops whenever you lose or win it back
          <li key={k.kind + have} className={have ? '' : 'is-missing'} title={have ? k.label : `no ${k.label}`}>
            {ICONS[k.kind]}
          </li>
        )
      })}
    </ul>
  )
}

// What the daemon says, top right, while it is out of its door: first that it is thinking, then
// that it has decided; later each new law, which stays faintly until the next one.
export function DaemonLine() {
  const { line, phase } = useGame()
  if (!line || (phase !== 'daemon' && phase !== 'running')) return null
  let className = 'daemon-line'
  if (line === THINKING) className += ' is-thinking'
  if (phase === 'running') className += ' is-quiet'
  if (line !== THINKING && game.daemonT > 2) className += ' is-quick'
  return (
    // a new key for every line, so it pops up again each time
    <div key={line} className={className} aria-live="polite">
      <p>{line}</p>
    </div>
  )
}

// The deadline, announced loud and in the middle once the daemon is back in its clock: the time
// in big letters, the daemon's reason, who decided (Claude, or the house rules when Claude can't
// be reached) and a button. The browser also reads it out in a high little voice.
export function Announcement() {
  const { phase } = useGame()
  const decision = phase === 'announce' ? game.day?.decision : null
  useEffect(() => {
    if (!decision || !window.speechSynthesis) return
    const h = Math.floor(decision.minutes / 60)
    const m = decision.minutes % 60
    const time = [h && `${h} ${h === 1 ? 'hour' : 'hours'}`, m && `${m} minutes`].filter(Boolean).join(' and ')
    const voice = new SpeechSynthesisUtterance(`You have ${time}! ${decision.reason}`)
    voice.pitch = 1.8
    voice.rate = 1.05
    window.speechSynthesis.speak(voice)
    return () => window.speechSynthesis.cancel()
  }, [decision])
  if (!decision) return null
  return (
    <div className="announcement" aria-live="assertive">
      <span className="eyebrow">you have</span>
      <div className="announced-time">{formatDuration(decision.minutes)}</div>
      <p>“{decision.reason}”</p>
      <span className="eyebrow">
        {decision.source === 'claude' ? `decided by Claude · ${decision.seconds.toFixed(1)} s` : 'house rules · Claude was not reachable'}
      </span>
      <button className="button" onClick={DRAWING_PART ? begin : resetGame}>
        {DRAWING_PART ? 'Begin' : 'Again'}
      </button>
    </div>
  )
}

// While the daemon is awake the room goes dim at the edges and a big CUCKOO! appears.
export function DaemonOverlay() {
  const { phase } = useGame()
  if (phase !== 'daemon') return null
  return (
    <div className="daemon-overlay" aria-live="polite">
      <div className="cuckoo-stamp">CUCKOO!</div>
    </div>
  )
}

// A shower of confetti in the studio's colours, for when everything is done.
const CONFETTI_COLOURS = [RED, MINT, YELLOW, BLUE]
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => {
        const size = 6 + Math.random() * 7
        const dot = i % 3 === 0
        return {
          left: `${Math.random() * 100}%`,
          width: size,
          height: dot ? size : size * 0.45,
          background: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
          borderRadius: dot ? '50%' : 2,
          animationDelay: `${Math.random() * 3}s`,
          animationDuration: `${3 + Math.random() * 2.5}s`,
          '--drift': `${(Math.random() - 0.5) * 160}px`,
          '--spin': `${(Math.random() - 0.5) * 1080}deg`,
        }
      }),
    [],
  )
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((style, i) => (
        <i key={i} style={style} />
      ))}
    </div>
  )
}

// The end of the day: one big line, the daemon's verdict and the three task dots.
export function EndScreen({ onRestart }) {
  const { phase, line, progress, round } = useGame()
  if (phase !== 'done' && phase !== 'closed') return null
  const done = phase === 'done'
  return (
    <div className="end-backdrop">
      {done && <Confetti />}
      <div className="end">
        <h2>{done ? 'Hats off!' : 'The studio closes.'}</h2>
        <p>“{line}”</p>
        <TaskDots done={progress.split(',').map(Number)} round={round} />
        <button className="button" onClick={onRestart}>
          Again
        </button>
      </div>
    </div>
  )
}
