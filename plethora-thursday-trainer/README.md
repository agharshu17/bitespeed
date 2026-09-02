# Thursday Trainer — a Plethora Bit

A seven-level Thursday leg-and-core session with an animated coach. She
demonstrates every movement, shows the exact mistake next to the correct form,
paces your reps, suggests a starting weight and adjusts it from how each set
felt.

Built against the Plethora creator contract
`plethora-agent-context-2026-08-13.1` (`context.md`, `sdk.md`, `schema.json`
and `libraries.json` all agreed on that version at build time).

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
node posegrid.mjs shots/posegrid.png 0,0.5,1        # every pose, both variants
node posegrid.mjs shots/one.png 0,0.5,1 bss         # one exercise
```

`dev/harness.html` mocks the `ctx` surface from `sdk.md` and drives the frame
loop manually so a full session can be fast-forwarded. `posegrid.mjs` writes a
throwaway `_main.dev.js` that exports the drawing internals — the shipped
`main.js` stays clean.

## Uploading

`main.js` and `plethora.json` are the Bit. Pair once at
https://create.plethora.studio/agent-pair, then `POST /v1/agent/bits/drafts`
with `source` and `manifest`. Publishing stays manual.

## Note

Weight suggestions are a conservative starting point, not coaching or medical
advice. The Bit says so on the first screen and in the instructions sheet.
