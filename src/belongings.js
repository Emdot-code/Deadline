// What everyone owns: four things each, lying on their own desk at the start of the day.
// You can only work with things you own; each task needs two of them (see tasks.js).
// Between tasks the daemon's new law hands them to new owners (see laws.js).

import { PEOPLE } from './studio.js'

// The four kinds of belongings, and where each one lies on a desk (measured from the middle
// of the desk, in real size, like the rest of the desk).
export const KINDS = [
  { kind: 'pencils', label: 'pencils', slot: [0.0, 0.6] },
  { kind: 'setsquare', label: 'set square', slot: [-0.6, 0.62] },
  { kind: 'ruler', label: 'scale ruler', slot: [0.75, 0.62] },
  { kind: 'book', label: 'reference book', slot: [0.95, -0.2] },
]
export const LABEL = Object.fromEntries(KINDS.map((k) => [k.kind, k.label]))

// Things you could also pack at the studio doors. They are no help with the drawings, but
// the daemon notices them.
export const EXTRAS = [
  { kind: 'coffee', label: 'coffee' },
  { kind: 'duck', label: 'rubber duck' },
  { kind: 'laptop', label: 'laptop' },
  { kind: 'croissant', label: 'croissant' },
]
// Everything at the doors, in the order it lies there, and how much fits in your bag.
export const PACKABLE = [KINDS[0], EXTRAS[0], KINDS[1], EXTRAS[1], KINDS[2], EXTRAS[2], KINDS[3], EXTRAS[3]]
export const BAG_SIZE = 4
export const PACK_LABEL = Object.fromEntries(PACKABLE.map((k) => [k.kind, k.label]))

export const PLAYER = PEOPLE.find((p) => p.player)

// Everyone's belongings: who brought each one (origin), who owns it now, and on which desk it lies.
// packed: the kinds you put in your bag at the doors (the rest of your tools stay at home);
// everyone else always brings all four.
export function createBelongings(packed = KINDS.map((k) => k.kind)) {
  return PEOPLE.flatMap((p) =>
    KINDS.filter((k) => !p.player || packed.includes(k.kind)).map((k) => ({
      id: `${p.id}-${k.kind}`,
      kind: k.kind,
      origin: p.id,
      owner: p.id,
      desk: p.desk,
    })),
  )
}

// The kinds of tools you have none of right now, because the daemon's law gave them away.
export function missingKinds(belongings) {
  return KINDS.map((k) => k.kind).filter((kind) => !belongings.some((b) => b.kind === kind && b.owner === PLAYER.id))
}
