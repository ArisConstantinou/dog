# Leo

Leo is a local-first interactive 3D companion inspired by a real older Jack Russell Terrier. The dog is rendered as live Three.js geometry — not a video, sprite sheet, or sequence of still images.

## What works

- A continuously rendered, orbitable 3D Leo using a smooth local mesh and a Leo-specific coat derived from the supplied Meshy texture and reference photos.
- 25 actions: come, sit, lie down, stay, paw, speak, spin, walk, run, jump, roll over, beg, sniff, dig, stretch, zoomies, shake, scratch, lick, look around, play, treat, sleep, wake and release.
- Typed, button and browser-supported voice commands all use the same action engine.
- Five separate interactive worlds: Sunroom, At the Door, Leo Trail, Constellation and Character Studio.
- Private on-device memories, state persistence and JSON export.
- Responsive desktop/mobile controls and reduced-motion support.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:5178/`. The port is fixed with strict-port behavior.

## Builds

```powershell
npm.cmd run build
npm.cmd run build:pages
npm.cmd test
npm.cmd run lint
```

`build:pages` produces the static GitHub Pages site in `pages-dist/` with the `/dog/` base path.

## Important boundary

This is an interactive likeness, not Leo's consciousness. The current character uses a smooth static Jack Russell mesh recolored from Leo's supplied Meshy texture and photographs. Its commands use safe finite whole-body motion; the mesh does not yet have a quadruped skeleton for realistic joint-level actions. A production-quality, photo-faithful avatar will need a Leo-specific retopologized mesh, rig, skin weights, and motion references.

## 3D asset attribution

The editable base mesh is adapted from [Jack Russell by FainoDS](https://sketchfab.com/3d-models/jack-russell-45f1bbf15b67488fba6bea6822d8a7c3), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Leo's coat treatment is customized from user-supplied references.
