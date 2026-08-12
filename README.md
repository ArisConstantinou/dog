# Leo

Leo is a local-first interactive 3D companion inspired by a real older Jack Russell Terrier. The dog is rendered as live Three.js geometry — not a video, sprite sheet, or sequence of still images.

## What works

- A continuously rendered, orbitable 3D Leo with articulated head, jaw, tail and legs.
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

This is an interactive likeness, not Leo's consciousness. The current character is a custom procedural 3D model shaped and colored from the supplied reference photos. A future production-quality, photo-faithful avatar will need clean front/left/right/back captures and walking, sitting, lying and facial-expression video to build and validate a dedicated textured mesh and motion library.
