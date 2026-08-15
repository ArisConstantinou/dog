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
- Audited all 25 commands plus petting across 130 available model clips with early, middle, and late screenshots. Broken framing was confirmed for Jump, Sleep/Wake, and low actions; Paw, Beg, and Roll over were mapped to unrelated transition clips.
- Added action-aware standard/low/jump camera framing, safe full-clip mappings, and removed premature internal pose resets. Sleep keeps its deliberate transition to the breathing loop.
- Aligned long command timers to actual clip duration, retained finite locomotion loops only while their command is active, and auto-collapsed the More panel so it no longer hides low actions.
- Final local QA covers the problematic animation families on desktop and 390x844 mobile: Jump remains fully framed, low/sleep actions stay visible, the command panel collapses, locomotion loops only while active, no horizontal overflow, and zero browser console errors.

## TODO

- Completed: 7/7 tests, production build, Pages build, lint, desktop/mobile browser verification, commit, push, Pages deployment, and live behavioral verification.

## Suggestions

- Future Leo-specific work can tune behavior weights and timings from real videos of Leo rather than changing the scheduler architecture.

## 2026-08-15 — Leo likeness references

- Received 10 additional photos covering Leo's face, right profile, underside, top/back, tail, collar, and several body markings.
- Confirmed the primary viewer model is a non-downloadable externally hosted Sketchfab asset; it cannot be converted into the requested locally editable Leo mesh from this repository.
- Confirmed the bundled fallback is locally editable: one skinned mesh, 34 bones, with Idle and Walking clips.
- Next: visually inspect both the hosted and local models, then make the local rig the customization path and add Leo-specific coat/anatomy treatment without changing photos as frames.

### Reference and runtime findings

- The new photos establish Leo's narrow muzzle, black/tan head with a slim white blaze, folded black ears, white freckled back, right shoulder spot, dark tail base, white tail tip, underside, paws, and teal collar.
- Still missing for high-fidelity anatomy: level full-body front, rear, left, and right standing views plus diagonal standing views. Several supplied close-ups contain motion blur or hand/pose occlusion, so they are useful for markings but not photogrammetric shape reconstruction.
- Implemented a local experimental coat pass on the bundled skinned mesh using bone-aware vertex colors, smoothed normals, a tracked teal collar, and corrected fallback camera framing. User photos remain outside the public repository.
- Added `render_game_to_text` state output and non-repeating autonomous behaviors that respect busy, stay, and sleep states.
- Verified `npm run lint`, `npm run test` (3/3), and `npm run build:pages`. Desktop Playwright screenshot confirms the complete actor is in frame and the state hook records commands.
- Important blocker: the local fallback has only Idle and Walking clips. A Sit test correctly reached persisted `pose: sit` in state, but the local mesh remained visually standing. The hosted 130-animation model is non-downloadable and its embedded viewer fell back locally/live under automated Chromium. Do not call this advanced or complete.
- Found a downloadable CC-BY Jack Russell base with 8.1k vertices, but it is static, requires Sketchfab login to download, and would still need a complete quadruped rig and animation library. No download or login was performed.
- No commit/push yet: the experimental fallback is not the requested photorealistic, fully animated Leo.

### Old hosted dog removal

- Verified in the user's open mobile localhost tab that the RedDeer Sketchfab iframe was still the visible actor.
- Disabled the hosted model path, removed its visible credit from the local-only state, rebuilt Pages, and reloaded the exact open tab.
- Browser evidence after reload: zero `.leo-viewer-frame` iframes, one local WebGL canvas, and zero old RedDeer credit labels.
- Reverted this display decision after visual review: the local low-poly fallback is visibly unacceptable as Leo. The hosted realistic rig is restored temporarily; the fallback must not be presented as the customized result.
- Added the missing large black rear-flank patch to both relevant sides of the hidden local mesh, based on the user's marked reference.
- Rendered the local fallback directly and visually confirmed the new rear-flank patch at the hip; the first QA render exposed a stale duplicate autonomy effect that referenced an undefined ref and blacked out the scene.
- Removed that duplicate scheduler, rebuilt, and reran the render with no page-error artifact. The restored hosted primary was then checked at 2560px and 390x844: one viewer iframe, no horizontal overflow, all visible buttons at least 44px, and zero console errors.

### Permanent removal of the old hosted dog

- Found two local checkouts: port 5178 was serving `Documents/ChatGPT/Dog`, while this checkout had not yet fast-forwarded to commit `3c9adef`.
- Fast-forwarded this checkout and disabled the hosted Sketchfab model again. The old RedDeer dog must no longer appear locally or on GitHub Pages.
- The local editable prototype is intentionally used instead; it is still not the final high-detail Leo model.
- Rebuilt Pages and moved the fixed `5178` preview from the stale `Documents/ChatGPT/Dog` checkout to this checkout. The exact listener now resolves to this project path.
- Required web-game client and the actual in-app browser both confirm `iframeCount: 0`, `canvasCount: 1`, no RedDeer/Sketchfab credit, and no console errors. Mobile 390x844 has no horizontal overflow and no visible button below 44px.

### Supplied high-detail model integration

- Received `jack_russell.glb` (5.09 MB) and verified it contains a smooth textured Jack Russell mesh, 8,643 uploaded vertices, and a 2048×2048 coat texture.
- Confirmed the supplied file has no skeleton and no embedded animation clips. A local fox-quadruped auto-rig and a manually repositioned rig were both visually rejected because Walk and Sit tore the body mesh.
- Replaced the 158 KB low-poly fallback with the supplied 5.09 MB model and preserved its smooth normals and fur texture.
- Added finite, whole-body procedural motion for commands and four non-repeating idle variations. Movement ends after its command window; Sit/Stay and resting actions hold a distinct stable transform without replaying an animation loop.
- Local browser proof at `http://127.0.0.1:5178/dog/` shows the supplied dog in the Sunroom with no low-poly facets or mesh tearing. The honest limitation remains that leg-level realistic actions require a professionally authored rig and skin weights for this exact mesh.

### Meshy color transfer

- Received `Meshy_AI_Curious_Little_Compan_0815130733_texture.glb` as a color and marking reference for Leo. The Meshy geometry was deliberately not shipped: it is an unrigged 59.75 MB model with 987,949 uploaded vertices and no animation clips.
- Extracted its 2048x2048 base-color texture and used it together with Leo's photographs as the authoritative palette for repainting the UV atlas of the smoother local Jack Russell model.
- Added `leo-coat-meshy-colors.png` as the editable coat source and packed the final runtime asset as `leo-detailed-v3.glb`. Leo now has an off-white freckled body, black folded ears and cap, narrow white facial blaze, muted tan face markings, dark side markings, and a black tail base with a white tip.
- Visually verified the final texture on the actual WebGL model at desktop and 390x844 mobile. The model loads without low-poly facets, mesh tearing, horizontal overflow, or console errors, and the Sit command still reaches the expected UI state.
- `npm run lint`, `npm run test` (9/9), `npm run build:pages`, and the required Playwright web-game render all pass.
- Honest remaining limitation: the coat now follows Leo, but the underlying head/body proportions are still those of the supplied generic static Jack Russell mesh. True anatomical likeness and realistic joint motion require a Leo-specific retopologized mesh, quadruped rig, and authored skin weights.

### Asymmetric coat-patch correction

- Added geometry-anchored coat masks rather than another UV guess: Leo's large rear-flank patch is constrained to the left side and the smaller tail-base patch wraps only across the top of the rump. The existing photographed right-shoulder marking remains in the coat texture without a duplicate shader patch.
- The masks operate in the model's local 3D coordinates, so they remain attached to the correct anatomy while the user rotates Leo or commands move the whole model.
- Verified the two sides independently by orbiting the real WebGL model 180 degrees. The left view shows the two rear markings; the right view shows the shoulder marking; the rejected debug texture and unwanted tail-base color are absent.
- User clarified that the mesh's apparent left/right orientation was reversed. Swapped the rear-flank and shoulder markings between the positive and negative model-space sides, while keeping the tail-base marking centered across the top of the rump.
- A rear-view reference then confirmed that Leo has no black rump patch and exposed a red texture artifact on his back. Removed the tail-base/rump patch entirely and added a narrowly bounded white-fur correction over the body artifact without recoloring the black tail itself.
- Another rear/head reference confirmed that Leo's neck and central back of head are white. Added separate white-fur masks for the neck and central rear skull while leaving the lateral ear geometry black.
- Rear-view QA showed a remaining black bridge across the central rear skull. Expanded the white correction only along the head centerline, with a lateral cutoff that preserves both black ears and a front-to-back cutoff that preserves Leo's facial markings.
- The first expanded skull mask reached too far toward the eye and cheek in the default view. Pulled its front cutoff back to the original safe plane while retaining the wider central rear-skull coverage.
- Default-angle QA still showed whitening near the eye, so the skull mask's longitudinal cutoff was moved fully behind the facial plane; the widened central coverage now applies only to the rear skull and neck transition.
- The required final interaction screenshot exposed a tiny pink texture remap at the tail root that the broad back correction missed. Located the affected rear-surface coordinates from the model UVs and added a small dedicated white-fur mask that does not reach the black tail base.
- The first tail-root correction covered only one lateral half of the symmetrical UV seam. Centered and widened it across the white rump surface while keeping its vertical extent below the black tail shaft.
- Final QA passed on the real WebGL render: default face markings preserved, rear neck/skull white with only the two ears black, clean white rump with no pink/red artifact, black tail band preserved, both side patches on the corrected sides, desktop and 390x844 mobile usable, zero browser console errors, lint clean, 10/10 tests, Pages build and required interaction client successful.
