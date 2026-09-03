# Work in progress: the Monday–Friday rewrite

These are the parts of the **next** `main.js`, not the shipped one. The Bit in
`../../main.js` is still the original single-day Thursday Trainer and is the
version that works; nothing in here is wired up yet.

The rewrite turns the Thursday session into a five-day week and drops the rep
counter, the countdown and the right-vs-wrong compare panel, because the Bit
now teaches form rather than pacing a set.

| file | what it is |
| --- | --- |
| `p1.js` | palette, body proportions, pose model and the compact pose DSL |
| `p2a.js` | Monday's seven exercises (done); Tue/Wed/Thu/Fri still to author |
| `p3_head.js` | figure solving and drawing, taken from the shipped rig |
| `p3_mid.js` | prop rigs and alignment guides, rewritten for correct-form-only |
| `p3_tail.js` | framing, background and panel drawing |

## Why the pose DSL

`dev/build.py` documents an ~80 KB source ceiling on the draft validator, and
the shipped seven-exercise Bit already builds to 77.7 KB. Thirty-three
exercises do not fit in the old `pose({ torso: 4, nau: 72, ... })` form, so a
pose is now a string:

    tr('0|to4 na72 nb-58 nt2 ns1', '0.5|y0.20 to16 nt44 ns-52 no86')

That is about half the bytes. Codes are in `CODES` in `p1.js`.

## Authoring rules, learned by getting them wrong

1. **She faces +x.** Anything travelling forward is a *positive* angle. A
   negative forearm angle curls the bar up behind her head.
2. **A foot's toe must end below the ankle.** Inverting this stands her on her
   heels instead of up on her toes.
3. **Seated is side-view only.** The rig has no depth, so a seated front view
   has nowhere to put the thighs and renders as a splayed float.
4. **Every setup reel must move**: squat to the floor, grip, stand, set
   position. Three standing frames teach nothing, and the setup phase is the
   whole point of the Bit.
5. **Exaggerate small movements.** A true-scale calf raise is invisible at
   phone size; it also needs a step prop so the heel has something to drop
   below.

None of these are detectable by reading the numbers — every one was found by
rendering. Author a day, then shoot a contact sheet before trusting it.

## Contact sheets

    ./mkgrid.sh                                    # assemble + node --check
    node shoot.mjs goblet,legext 0,0.5,1 out.png   # setup and train
    node shoot.mjs calf 0,0.25,0.5,0.75 out.png train   # one reel only

`../../docs/screens/monday-qa.png` is the current Monday sheet.
