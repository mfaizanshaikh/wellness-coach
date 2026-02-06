# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A real-time voice AI companion with a 3D VRM avatar. Uses OpenAI's Realtime API for voice interaction and Three.js for 3D rendering with mouth synchronization driven by audio analysis.

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

## Architecture

### Frontend (`src/App.jsx`)
Single React component managing:
- **Three.js scene**: VRM avatar, lighting, floor, camera
- **WebRTC connection**: RTCPeerConnection to OpenAI Realtime API
- **Audio analysis**: Web Audio API analyzers for both microphone input and remote audio output
- **Mouth sync**: Drives VRM expressions (`aa`, `a`, `A`, `mouthOpen`) or jaw bone rotation based on audio RMS

Uses extensive refs to manage WebGL objects, audio context, and peer connections outside React's render cycle.

### Backend (`server/index.js`)
Express server with single endpoint:
- `POST /token`: Fetches ephemeral client secret from OpenAI's `/v1/realtime/client_secrets` endpoint

### Data Flow
1. Frontend requests `/token` from backend
2. Backend calls OpenAI to get ephemeral client secret
3. Frontend creates RTCPeerConnection, sends SDP offer to OpenAI `/v1/realtime/calls`
4. OpenAI returns SDP answer, WebRTC audio streams established
5. Remote audio drives avatar mouth animation via RMS analysis

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `OPENAI_API_KEY` - Required
- `OPENAI_REALTIME_MODEL` - Default: `gpt-realtime`
- `OPENAI_REALTIME_VOICE` - Default: `marin`
- `OPENAI_REALTIME_INSTRUCTIONS` - AI personality prompt
- `FRONTEND_ORIGIN` - CORS origin (default: `http://localhost:5173`)
- `PORT` - Backend port (default: `3001`)

## Key Files

- `src/App.jsx` - All frontend logic (Three.js, WebRTC, audio)
- `server/index.js` - Token generation endpoint
- `public/avatar.vrm` - VRM avatar model (place your own)
