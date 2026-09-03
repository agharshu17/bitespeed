# Thursday Trainer — a Plethora Bit

A seven-level Thursday leg-and-core session with an animated coach. She
demonstrates every movement, shows the exact mistake next to the correct form,
paces your reps, suggests a starting weight and adjusts it from how each set
felt.

Built against the Plethora creator contract
`plethora-agent-context-2026-08-13.1` (`context.md`, `sdk.md`, `schema.json`
and `libraries.json` all agreed on that version at build time).

## The flow

1. **Intro** → a short setup (experience, equipment).
2. **Today's session** — all seven levels, sets and reps, with an estimated
   duration. Tap any level to jump to it.
3. **Each level** opens on two tabs: *How to start* (an animated setup
   walkthrough — where the weight begins, how you pick it up, what the start
   position is) and *Right vs wrong* (the correct rep beside the mistake).
4. **The set** — she paces the reps, the mistake is one tap away.
5. **RPE tap** after weighted sets, then rest with a motivational line.
6. **Finish** — recap of what was cleared, part-done or skipped.

The **☰ menu** is available on every screen: jump to any level, skip a set,
skip a level, or end the session early.

## The session

| Level | Exercise | Sets | Fault demonstrated |
|-------|----------|------|--------------------|
| 1 | Romanian Deadlift | 3 × 10 | Back rounds, bar drifts away |
| 2 | Leg Curl | 3 × 12 | Hips lift off the pad |
| 3 | Bulgarian Split Squat | 3 × 10 / side | Knee dives past the toes, chest folds |
| 4 | Sumo Squat | 3 × 12 | Knees pinch in, heels lift |
| 5 | Mountain Climbers | 3 × 30s | Hips sag or pike up |
| 6 | Shoulder Taps | 3 × 20 | Hips rock side to side |
| 7 | Suitcase Hold | 3 × 30s / side | Leaning toward the weight |

## How it is built

Packaged assets are disabled (`maxAssets: 0`) and remote images are blocked, so
nothing is loaded — the trainer is drawn from scratch every frame.

- **The rig** (`solve`) is a 2D skeleton driven by *absolute* segment angles, so
  a pose is a plain table of numbers. `0°` points straight down, `+90°` right.
- **Every exercise is a keyframe track** (`TRACKS`) with a `good` and a `bad`
  variant, sampled and eased per rep phase.
- **`SETUPS`** holds a second track per exercise for the get-into-position
  walkthrough, with captions keyed to the phase so the on-screen step
  highlights as she performs it.
- **`fitBox`** samples both variants to frame the figure identically in the
  right-hand and wrong-hand panels, so the two are directly comparable, and
  fixes the floor line at the height of her planted hands.
- **Annotations** (`drawAnnotation`) draw the alignment guide for each movement:
  spine line, hip line, knee-over-foot line, plank line, plumb line — green when
  correct, red with an arrow on the joint that is going wrong.
- Weight suggestions live in `WORKOUT[].weight`, keyed by equipment and
  experience, and are adjusted by the RPE tap after each set. They persist
  through `ctx.storage` with a `ctx.memory.local` fallback.

## Local preview

`dev/` is for development only and is never uploaded.

```
cd dev
npm i playwright
node shoot.mjs          # walks the whole session, screenshots every level
BUILT=1 node shoot.mjs  # same, against build/main.js
node posegrid.mjs shots/posegrid.png 0,0.5,1        # every pose, both variants
node posegrid.mjs shots/one.png 0,0.5,1 bss         # one exercise
```

`dev/harness.html` mocks the `ctx` surface from `sdk.md` and drives the frame
loop manually so a full session can be fast-forwarded. `posegrid.mjs` writes a
throwaway `_main.dev.js` that exports the drawing internals — the shipped
`main.js` stays clean.

## Building and uploading

    python3 dev/build.py     # main.js -> build/main.js

The draft validator has a source-size budget. The identical code is accepted
at ~78 KB and rejected above ~90 KB with a generic "unsupported remote
resources" error — the size, not any particular construct, is what trips it
(verified by padding a known-good source with comments until it failed).
`dev/build.py` strips comments and collapses indentation, nothing else, so
`main.js` stays readable here while the uploaded source stays inside the
budget.

One construct genuinely was rejected: an argument to `ctx.music.play()` that
was a member expression (`wantPreset.tempo`) rather than a literal or plain
local. Loader-style arguments have to stay simple.

Upload `build/main.js` as `source` with `plethora.json` as `manifest` to
`POST /v1/agent/bits/drafts`, after pairing once at
https://create.plethora.studio/agent-pair. Publishing stays manual.

## Sound

There is no speech synthesis in the Plethora SDK, so there is no spoken
coaching — every cue is on screen. Music and stings come from `ctx.music`
under the `backgroundMusic` permission; audio can only start from a user
gesture, so `musicPreset()` calls `unlock()` and `play()` synchronously inside
the tap handler. The ♪ button toggles it and the help sheet reports
`ctx.music.state()` and any error, including `host_paused` (Plethora mutes a
backgrounded Bit).

## Note

Weight suggestions are a conservative starting point, not coaching or medical
advice. The Bit says so on the first screen and in the instructions sheet.
