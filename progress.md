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
- Build, Pages build, lint, and 4 automated tests pass.

## TODO

- Completed: final tests (4/4), production build, Pages build, lint, push, deployment, and live behavioral verification.

## Suggestions

- Future Leo-specific work can tune behavior weights and timings from real videos of Leo rather than changing the scheduler architecture.
