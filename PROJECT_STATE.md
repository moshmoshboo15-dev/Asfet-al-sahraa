# Ashfront — Project State

## Current Phase: Phase 1 Complete

### Done (Phase 1)
- Project directory structure established: `client/`, `server/`, `shared/`, `README.md`, `PROJECT_STATE.md`.
- Full-viewport Game Shell with live 3D WW1 trench panoramic camera sweep, bespoke SVG `ASHFRONT` title lockup, Callsign input, Deploy CTA, Host Guide modal, and Pause menu.
- Complete tabbed Settings Menu persisted in `localStorage` (`ashfront_settings_v1`, `ashfront_profile_v1`):
  - **Graphics**: Preset (`Low`/`Medium`/`High`/`Ultra`/`Auto`), Resolution Scale (50%–100%), FPS Cap (30/45/60/90/120), Shadows & Shadow Quality, Draw Distance, Texture Quality, Anti-Aliasing, Fog, Bloom, Motion Blur, Foliage Density, Particle Density, FPS & Ping Counter, plus Auto-Quality adaptive scaler.
  - **Controls**: Separate Hip/ADS/Scope/Vehicle/Aircraft/Ship sensitivities, Invert Y, Aim Assist, Joystick Size/Opacity/Dynamic-vs-Fixed mode, Fire Button Side, Auto-Fire, Auto-Sprint, Tilt Controls toggle, Haptics, Force Touch HUD toggle, and interactive drag-and-drop **HUD Layout Editor**.
  - **Audio**: Master, Music, Effects, Voice, Ambient sliders wired to procedural Web Audio buses.
  - **Gameplay**: English / Arabic (`ar` with RTL layout) localization, FOV (65°–105°), Crosshair Style & Color, Hit Markers, Damage Numbers, Colorblind modes (`Standard`/`Protanopia`/`Deuteranopia`/`Tritanopia`), and Reset to Default.
- WW1 Test Map (**Somme Sector 4 — Mud & Wire**):
  - Deterministic terrain heightfield with zigzag frontline trench, communication trench, shell craters, and natural rising valley perimeter.
  - PBR procedural textures (mud, wood planks/duckboards, sandbags, concrete pillbox, rusted corrugated iron, walnut, blued steel), low-angle warm sun + cool hemisphere fill + horizon-matched `FogExp2`, sky dome shader, crater water puddles, instanced barbed wire & shattered trees, and 5 interactive steel/amber shooting range targets.
  - ACES Filmic tone mapping, `RoomEnvironment` IBL, `UnrealBloomPass`, Vignette + Film Grain + WW1 Color Grading shader, optional `SSAOPass` (High/Ultra), and Software WebGL guard (`afterDraw`).
- Infantry Movement & Touch HUD:
  - WASD + Mouse PointerLock on desktop + Landscape Virtual Joystick + Right-half swipe-to-look + Touch action buttons (Fire, ADS, Reload, Crouch, Jump, Pause).
- First Rifle (**M.14 Trench Rifle**):
  - Composite 14-part 3D rifle & gloved infantry arms with idle sway, walk/sprint bob, ADS iron-sight alignment, recoil kick, full 5-stage bolt-action cycling + spinning brass shell casing ejection, stripper-clip reload animation, muzzle flash + smoke, tracers, surface decals, and layered procedural Web Audio gunshot/bolt/reload/footsteps/impact/wind/artillery sounds.

### File List
- `metadata.json`
- `vite.config.ts`
- `tsconfig.json`
- `README.md`
- `PROJECT_STATE.md`
- `shared/types.ts`
- `shared/settingsDefaults.ts`
- `shared/i18n.ts`
- `shared/weapons/ww1Rifles.ts`
- `server/server.js`
- `client/index.html`
- `client/src/index.css`
- `client/src/main.tsx`
- `client/src/App.tsx`
- `client/src/engine/AudioEngine.ts`
- `client/src/engine/ProceduralTextures.ts`
- `client/src/engine/ParticlesAndDecals.ts`
- `client/src/engine/WW1TrenchMap.ts`
- `client/src/engine/FirstPersonRifle.ts`
- `client/src/engine/PlayerController.ts`
- `client/src/engine/RendererPipeline.ts`
- `client/src/engine/GameEngine.ts`
- `client/src/ui/TitleScreen.tsx`
- `client/src/ui/SettingsModal.tsx`
- `client/src/ui/TouchHud.tsx`
- `client/src/ui/PauseModal.tsx`
- `client/src/ui/HostHelpModal.tsx`

### Known Issues
- Multiplayer networking, rooms, and Connect screen are scheduled for Phase 2 (Ping currently shows `0 ms` in solo field test).
- `Sensitivity (Scope/Vehicle/Aircraft/Ship)`, `Aim Assist`, and `Tilt Controls` UI settings are stored and persisted now and will hook into scopes/vehicles/aircraft/ships in Phases 3–9.

### Next Step
- **Phase 2**: Socket.io multiplayer authoritative 20 Hz server, rooms (create/join/password), Connect screen (`IP:port` + last 5 servers), lobby, team balance, delta compression, client prediction, interpolation, and in-game chat.
