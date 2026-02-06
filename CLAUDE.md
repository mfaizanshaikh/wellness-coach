# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An Urdu-speaking wellness coach with a 3D VRM avatar, designed for people in Pakistan. Uses OpenAI's Realtime API (WebRTC) for always-on voice interaction and Three.js + @pixiv/three-vrm for 3D rendering. The avatar has lip-sync driven by audio RMS analysis, emotion-reactive facial expressions, idle animations (breathing, blinking), and gesture support (wave, nod, shrug, dance, etc.).

## Development Commands

```bash
# Start frontend dev server (port 5173)
npm run dev

# Start backend token server (port 3001)
npm run server

# Build for production
npm run build
```

Both servers must run concurrently for the app to work.

## Tech Stack

- **Frontend**: React 18, Three.js (r164), @pixiv/three-vrm 2.x, Vite 5
- **Backend**: Express 4, Node.js (ESM)
- **API**: OpenAI Realtime API via WebRTC (SDP offer/answer flow)
- **Font**: Space Grotesk (Google Fonts)
- **Testing**: Playwright (installed but no tests yet)

## Architecture

### Frontend (`src/App.jsx`)
Single monolithic React component (~915 lines) managing everything via refs:
- **Three.js scene**: VRM avatar (scaled 1.25x, rotated to face camera), hemisphere + directional lighting, floor plane, gradient backdrop shader
- **WebRTC**: RTCPeerConnection to OpenAI Realtime API with data channel (`oai-events`) for AI event messages
- **Audio pipeline**: Web Audio API with separate analysers for mic input (VAD meter) and remote output (mouth sync)
- **Lip sync**: Drives VRM mouth expressions (`aa`, `Aa`, `Ih`, `Ou`, `Ee`, `Oh`) and/or jaw bone rotation based on smoothed RMS
- **Idle animation system**: Breathing (spine), head sway, arm sway, blinking (randomized 3-5s interval), speaking-weight blending between idle and speaking poses
- **Emotion detection**: Regex-based text analysis of AI responses to set VRM expressions (happy, sad, surprised) with decay
- **Gesture system**: Triggered by AI text keywords or randomly during idle. Supported: `wave`, `dance`, `nod`, `tilt`, `shrug`, `eyesClosed`, `coverEyes`
- **Session lifecycle**: Tap-to-prime audio -> auto-connect -> auto-retry on failure (3s) -> stop/resume controls

### Backend (`server/index.js`)
Express server with two endpoints:
- `GET /health`: Health check
- `POST /token`: Fetches ephemeral client secret from OpenAI `/v1/realtime/client_secrets`. Sends full session config including model, voice, Urdu transcription (`gpt-4o-mini-transcribe`, language `ur`), and hardcoded wellness coach instructions in the request body.

### UI (`src/styles.css`, `index.html`)
Dark-themed single-page layout with:
- Header: title ("Your wellness coach"), status badge (Idle/Connecting/Live/Error), Stop/Resume buttons
- Stage: Canvas with VRM avatar, tap-to-prime overlay
- Control bar: Listening status pill, mic level meter (VAD), error display

### Data Flow
1. User taps to prime AudioContext and mic
2. Frontend requests `POST /token` from backend
3. Backend calls OpenAI to get ephemeral client secret (includes Urdu-only wellness coach instructions)
4. Frontend creates RTCPeerConnection + data channel, sends SDP offer to OpenAI `/v1/realtime/calls`
5. OpenAI returns SDP answer, bidirectional audio streams established
6. Remote audio drives lip sync; data channel messages drive emotion expressions and gestures
7. On connection failure, auto-retries after 3 seconds

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `OPENAI_API_KEY` - Required
- `OPENAI_REALTIME_MODEL` - Default: `gpt-realtime`
- `OPENAI_REALTIME_VOICE` - Default: `marin`
- `OPENAI_REALTIME_INSTRUCTIONS` - AI personality prompt (overrides the hardcoded Urdu wellness coach instructions in `server/index.js`)
- `FRONTEND_ORIGIN` - CORS origin (default: `http://localhost:5173`)
- `PORT` - Backend port (default: `3001`)

## Key Files

- `src/App.jsx` - All frontend logic (Three.js scene, WebRTC, audio analysis, animation, gestures, UI)
- `src/styles.css` - Dark theme styles, layout, component styling
- `src/main.jsx` - React entry point
- `server/index.js` - Token endpoint with hardcoded Urdu wellness coach system prompt
- `public/avatar.vrm` - VRM avatar model (place your own)
- `index.html` - HTML shell with Space Grotesk font
- `vite.config.js` - Vite config with React plugin, port 5173

## Code Patterns

- All mutable state (Three.js objects, audio nodes, WebRTC connections, animation timers) lives in `useRef` -- not React state. Only UI-visible values (`status`, `error`, `primed`) use `useState`.
- Animation runs in a `requestAnimationFrame` loop set up in the first `useEffect`.
- Mouth smoothing uses exponential moving average: `smoothed = smoothed * 0.85 + target * 0.15`.
- Gesture-from-text detection uses regex matching on AI response text.
- The token endpoint URL is hardcoded to `http://localhost:3001/token` in `App.jsx`.
