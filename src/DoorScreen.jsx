// The start of the day: you stand at the studio doors. Above is the task of the day; below lie
// eight things, and your bag holds four. When you press Enter the doors swing open, you walk in,
// and the daemon gets to know what you packed and how long you took to decide (see enter() in game.js).

import { useRef, useState } from 'react'
import { enter, game } from './game.js'
import { BAG_SIZE, PACKABLE, PLAYER } from './belongings.js'
import { TASKS } from './tasks.js'
import { ICONS } from './Hud.jsx'
import { CLOCK_GREEN, CLOCK_HANDS, CONCRETE, GLASS, INK, MINT, OAK, POCHE, RED, SKIN, SUN, TRIM, YELLOW } from './palette.js'

const WALK_IN = 1300 // milliseconds the doors and the walk take before the studio appears

// The studio's front: a pale block with a coping, two tall windows, a round window and a pair of
// oak doors, with the cuckoo clock peeking out high on the right. You stand to the left of the doors.
// bag: what you have packed so far; your bag grows with it.
function Facade({ bag }) {
  return (
    <svg className="facade" viewBox="0 0 400 250" aria-hidden="true">
      <rect x="62" y="40" width="276" height="14" rx="5" fill={TRIM} />
      <rect x="70" y="52" width="260" height="190" fill={CONCRETE} />
      <rect x="96" y="84" width="34" height="112" rx="17" fill={GLASS} stroke={POCHE} strokeWidth="3" />
      <rect x="270" y="84" width="34" height="112" rx="17" fill={GLASS} stroke={POCHE} strokeWidth="3" />
      <circle cx="200" cy="98" r="18" fill={GLASS} stroke={POCHE} strokeWidth="3" />
      {/* the daemon's clock */}
      <circle cx="306" cy="66" r="9" fill={CLOCK_GREEN} />
      <path d="M306 66 V60 M306 66 h4" stroke={CLOCK_HANDS} strokeWidth="1.6" strokeLinecap="round" />
      <circle className="facade-cuckoo" cx="306" cy="78" r="2.6" fill={RED} />
      {/* the doorway, warm with sunlight inside, and its two leaves */}
      <rect x="164" y="136" width="72" height="106" rx="3" fill={POCHE} />
      <rect x="168" y="140" width="64" height="102" fill={SUN} />
      <rect className="door-leaf left" x="168" y="140" width="32" height="102" fill={OAK} />
      <rect className="door-leaf right" x="200" y="140" width="32" height="102" fill={OAK} />
      <rect x="150" y="240" width="100" height="7" rx="3.5" fill={TRIM} />
      <g transform="translate(118 242)">
        <g className="student">
          <circle cx="-10" cy="-24" r={bag.length ? 3.5 + bag.length * 1.2 : 0} fill={MINT} />
          <rect x="-9" y="-40" width="18" height="34" rx="9" fill={YELLOW} />
          <rect x="-6" y="-8" width="4" height="8" rx="2" fill={INK} />
          <rect x="2" y="-8" width="4" height="8" rx="2" fill={INK} />
          <circle cy="-48" r="8" fill={SKIN} />
          <path d="M-8.5 -49 a8.5 8.5 0 0 1 17 0 Z" fill={PLAYER.hair} />
        </g>
      </g>
    </svg>
  )
}

export default function DoorScreen() {
  const shownAt = useRef(performance.now())
  const [bag, setBag] = useState([])
  const [entering, setEntering] = useState(false)

  // a full bag takes nothing more until you take something out
  const toggle = (kind) =>
    setBag((b) => (b.includes(kind) ? b.filter((k) => k !== kind) : b.length < BAG_SIZE ? [...b, kind] : b))

  const go = () => {
    if (entering) return
    const seconds = (performance.now() - shownAt.current) / 1000
    setEntering(true)
    setTimeout(() => enter(bag, seconds), WALK_IN)
  }

  return (
    <div className={`door-screen${entering ? ' is-entering' : ''}`}>
      <span className="eyebrow">today</span>
      <h1>{game.brief}</h1>
      <p className="door-tasks">{TASKS.map((t) => t.name.toLowerCase()).join(' · ')}</p>
      <Facade bag={bag} />
      <ul className="pack" aria-label="Things you can pack">
        {PACKABLE.map((k) => {
          const packed = bag.includes(k.kind)
          return (
            <li key={k.kind}>
              <button className={packed ? 'pack-item is-packed' : 'pack-item'} onClick={() => toggle(k.kind)} title={k.label} aria-pressed={packed}>
                {ICONS[k.kind]}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="bag-dots" aria-label={`${bag.length} of ${BAG_SIZE} in your bag`}>
        {Array.from({ length: BAG_SIZE }, (_, i) => (
          <i key={i} className={i < bag.length ? 'on' : ''} />
        ))}
      </div>
      <button className="button" onClick={go}>
        Enter
      </button>
      <div className="keys" aria-label="Walk with W A S D or the arrow keys">
        <kbd>W</kbd>
        <kbd>A</kbd>
        <kbd>S</kbd>
        <kbd>D</kbd>
      </div>
    </div>
  )
}
