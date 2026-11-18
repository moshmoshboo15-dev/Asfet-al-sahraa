# Ashfront

Mobile-first 3D combined-arms WW1 & WW2 shooter built with Three.js, React, Tailwind CSS, and Node.js.

## Project Structure

- `client/` — Static WebGL2/WebGL1 Three.js client (`client/index.html`, `client/src/engine/`, `client/src/ui/`). Builds into a Capacitor/APK-ready static bundle in `dist/`.
- `server/` — Node.js + Express server (`server/server.js`) that prints LAN/WiFi/Hotspot join URLs on port `3000` (Socket.io multiplayer coming in Phase 2).
- `shared/` — Shared TypeScript types, weapon definitions, settings defaults, and English/Arabic translations.

## Development Run Instructions

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in Chrome on desktop or Android.

## Production Build & LAN Hosting

```bash
npm run build
node server/server.js
```

The server prints all local IPv4 join URLs (e.g. `http://192.168.1.42:3000`) for players on the same WiFi or mobile hotspot.

## Android APK (Capacitor) Notes

`npm run build` outputs a self-contained static bundle inside `dist/` using relative `./` asset paths so it can be wrapped directly with Capacitor (`webDir: "dist"`).
