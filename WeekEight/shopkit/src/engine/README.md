# Kikan: how an engine works

## Setup

1. Put this `engine` folder in `src/engine`. If an older copy is there, replace it.
2. Install three.js and its types. You already have three, so you only need the types. Your TypeScript 7 clashes with typescript-eslint's peer range, so keep `--force`:

   ```
   npm install three --force
   npm install -D @types/three --force
   ```

3. In `main.tsx`:

   ```tsx
   import EngineAtlas from './engine/EngineAtlas.tsx'
   // ...
   <StrictMode>
     <EngineAtlas />
   </StrictMode>
   ```

4. Run `npm run dev`.

Fonts load from Google Fonts, so the first load needs internet.

## Controls

- **陰 / 陽** in the header switches between dark (the default) and light, with a katana cut across the page.
- **音** turns sound on and off. Browsers only allow audio after your first click or key press, so the engine note starts then.
- In the hero, click a part or press Open the engine. Drag the tachometer needle to set the revs. The picture runs 50× slower, but the sound is at the real speed.
- In the layouts section, hold the Hold to rev button to hear each engine's real firing order.

## Folders

- `three/`: the 3D engine, layouts, materials and lighting.
- `sections/`: the hero and the strokes, camshaft, layouts and theory sections.
- `audio/`: every sound, synthesised live with Web Audio.
- `data/`: the text for the parts and the layouts.
- `ui/`: the shared pieces: cuts, tachometer, ornaments and preferences.
