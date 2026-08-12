Original prompt: Yes but now dog feels still, make him to change behaviors once a while each time something different from before to feel real. Now it is just standing still.

## Progress

- Confirmed the current live branch includes the rigged 3D Leo and the one-shot action loop fix.
- Implementing a non-repeating autonomous idle behavior scheduler that yields to user commands, Stay, Sleep, and hidden tabs.
- Added six autonomous behaviors with a two-item no-repeat memory, 5–9 second idle scheduling, protected-state guards, reduced-motion filtering, and deterministic browser inspection hooks.
- Updated `advanceTime(ms)` to accumulate deterministic idle time, allowing the required Playwright game client to trigger the same autonomous path without waiting on random wall-clock timers.
- Required web-game client completed four autonomous cycles with `look-around`, `sniff`, `lick`, and `shake`; no immediate repeats and no console-error artifact.
- Normal browser wall-clock proof completed two different autonomous behaviors (`scratch` then `look-around`) without test-time advancement.
- Manual `Come` interrupted an active autonomous behavior; `Stay` remained protected after advancing nine seconds.
- Visually inspected the realistic rigged Leo at 1440×900 and 390×844; mobile has no horizontal overflow.
- GitHub Pages deployment `44c1643` succeeded; the live site autonomously performed `sniff` followed by `look-around` in real wall-clock time, with no runtime errors.
- Build, Pages build, lint, and 7 automated tests pass.
- Follow-up bug identified: `Ready` always selected the standing idle animation even when a completed command had set `sit`, `down`, or another resting pose.
- Updated clip selection so `Ready` resolves from the current pose rather than the generic standing action hint; added the selected clip as inspectable 3D state for end-to-end verification.
- Autonomous micro-behaviors now remember and restore the last user-requested pose instead of ending in their own hard-coded posture.
- Removed endless Ready/Stay loops: resting poses now play once and hold; only sleep keeps its breathing loop. Standing Ready now selects `Idle_1` instead of accidentally looping `Crouch_Idle_end`.
- The local rigged fallback also uses a single clamped animation pass rather than Three.js's default infinite repeat.
- Sleep now plays its entry once before switching to the dedicated breathing loop; the sleep-entry transition itself never repeats.
- End-to-end browser proof: Ready uses `Idle_1 / one`; Come uses `Walk_F_IP / one` then `Idle_1 / one`; Sit holds `Sitting_loop / one`; an autonomous look-around returns to that sitting pose; Sleep alone transitions from `Lie_Sleep_start / one` to `Lie_Sleep_loop / loopOne`.
- Final mobile check at 390x844 holds Sit with `cycle=one`, has no horizontal overflow, and the browser console has zero errors.
- Commit `abe18ff` deployed successfully to GitHub Pages. The live bundle `index-CN1vmfzg.js` reports `Idle_1 / one`, keeps `Sit` at `Sitting_loop / one`, and returns there after an autonomous look-around with zero console errors.

## TODO

- Completed: 7/7 tests, production build, Pages build, lint, desktop/mobile browser verification, commit, push, Pages deployment, and live behavioral verification.

## Suggestions

- Future Leo-specific work can tune behavior weights and timings from real videos of Leo rather than changing the scheduler architecture.
