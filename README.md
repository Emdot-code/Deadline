# going cuckoo

A small, funny browser game set in an open-plan architecture studio. You are a student who must finish a floor-plan drawing, but you may only use your own tools, books and drafting equipment. A tiny daemon lives in the cuckoo clock on the wall. Every simulated hour it wakes up for one minute, invents a new and absurd law of ownership (hair colour, height, age, shoe size, arrival time…), and rearranges everyone's desks and belongings. Then it forgets the law again.

## Run it

```
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

## Plan

1. **The studio** (done): a small, tall, cube-like studio floating in a sunset, with six big desks, tall sunny windows, a drafting table, a bookshelf, plants and art; the cuckoo clock; you walking around; 5 fellow students (Noor, Isa, Roy, Nari, Tuk) wandering.
2. **Clock and task** (done): a sped-up day from 09:00 to 18:00 (1 real second = 1 studio minute) with a digital clock panel; a floor-plan task that draws itself while you stand at your desk; every full hour the daemon wakes (time stands still, it springs out of the clock, yawns and mumbles) and goes back to sleep; an end-of-day card.
3. **Belongings** (done): everyone has pencils, a set square, a scale ruler and a reference book on their desk; yours glow mint, theirs are faded and locked (point at anything to see whose it is). You only draw while all four of your own things are on your desk; the task panel shows what is missing.
   A tray along the bottom shows your four things: bright when you own one, locked with the new owner's name when you don't.
4. **The daemon** (done): every hour it forgets the last law and announces a new absurd one in a speech bubble under the cuckoo close-up, which stays up until the next hour. Each of the 12 laws in `src/laws.js` is a silly test (odd shoe size, prime-number age, an "o" in your name…): whoever fails hands over one or two kinds of tools, shared out among those who pass. Seven laws catch you. Things float in an arc to their new owners' desks and pile up there, and desk laws send everyone, you included, to a new desk.
   The work is split into three tasks (`src/tasks.js`), each at its own coloured ring with its own pair of tools: the floor plan at your desk (pencils + scale ruler), a section at the drafting table (set square + scale ruler) and a precedent study in the reading corner (book + pencils). Losing a tool locks only the tasks that need it. Each task takes 90 studio minutes; finish all three before 18:00.
5. **Polish**: win/lose screen, funnier announcements, sounds, phone controls, publishing online.

### Going Cuckoo: the demon decides your deadline

6. **Studio doors and a minimal screen** (done): the day starts at the studio doors with the task of the day (`BRIEFS` in `src/tasks.js`). Eight things lie in front of you (your four tools plus coffee, a rubber duck, a laptop and a croissant) and your bag holds four. Tools you leave at home are missing all day (half speed). When you enter, the daemon decides one deadline for all three drawings from what you packed and how many seconds you took (`src/demon.js`, simple rules for now). Laws only come before the second and third drawing. No cards around the studio: countdown and task dots top left, the daemon's words top right, your tools bottom left.
7. **Claude decides the deadline** (done): when you enter, the game sends what the clock saw to `/api/demon`, a small bridge in the Vite dev server (`demon-bridge.js`). It asks Claude through the Claude Code program on your computer, with your own login and no API key, and Claude answers `{ minutes, reason }` in the demon's voice. The page says "decided by Claude" or "house rules" (the fallback in `src/demon.js`, always used on GitHub Pages). The terminal running `npm run dev` prints what the clock saw and what Claude decided.
   For the assignment the game ends here: the drawing part (countdown, rings, laws) is switched off with `DRAWING_PART = false` in `src/game.js`.

## How the AI agent works

1. **It observes**: the task of the day, what you packed and left at home, how many seconds you took at the door, how much drawing work that means, and a random mood of its own.
2. **It reasons**: Claude gets a short persona (an irrational demon who must base its reason on something real it saw) and first writes down its private thinking: what it noticed and how it weighed it.
3. **It decides with its own judgement**: a deadline between 20 minutes and 6 hours. The rules of the game only fix the limits.
4. **It announces**: the time appears big in the middle of the screen with one or two absurd sentences in the demon's voice, and the browser reads it aloud.
5. **It keeps a log**: every decision is added to `demon-log.md` in this folder (what it saw, its thinking, the time, what it said, how long it took). The file is created at the first decision.
6. **The game checks it**: a whole number inside the limits and a reason. Anything else, or no answer within 40 s, means the house rules decide instead (and the log says so).
