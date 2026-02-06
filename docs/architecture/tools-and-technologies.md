# Tools, Technologies & Services

**Document Type:** Technology Inventory
**Version:** 1.0
**Date:** February 2026
**Status:** POC Complete

---

## 1. Overview

This document catalogues every tool, library, SDK, API, and service used in the Wellness Coach Avatar POC. Each entry is classified by its role, its suitability for production, and any alternatives worth considering for scaling.

---

## 2. Frontend / Client-Side

| Technology | Version | Purpose | POC / Production |
|-----------|---------|---------|-----------------|
| **React** | 18.3 | UI framework. Manages component lifecycle, state for UI-visible values (status, errors), and refs for mutable objects. | Production-ready |
| **Three.js** | 0.164 | 3D rendering engine. Creates and manages the WebGL scene, camera, lighting, floor, backdrop, and render loop. | Production-ready |
| **@pixiv/three-vrm** | 2.1 | VRM avatar loader and runtime. Loads VRM files, provides access to humanoid bones, expression presets, and the expression manager. | Production-ready (widely used in VTuber tooling) |
| **Web Audio API** | Browser-native | Audio processing. Creates AudioContext, AnalyserNodes for both mic input and remote audio, and extracts time-domain data for RMS calculation. | Production-ready (browser standard) |
| **WebRTC (RTCPeerConnection)** | Browser-native | Real-time audio streaming. Establishes peer connection to OpenAI, handles SDP offer/answer negotiation, and manages audio tracks and data channels. | Production-ready (browser standard) |
| **MediaDevices API** | Browser-native | Microphone access. Requests user permission and provides MediaStream for audio capture. | Production-ready (browser standard) |
| **requestAnimationFrame** | Browser-native | Animation timing. Drives the 60fps render and animation loop. | Production-ready (browser standard) |

### Frontend Build Tools

| Technology | Version | Purpose | POC / Production |
|-----------|---------|---------|-----------------|
| **Vite** | 5.4 | Development server and production bundler. Provides hot module replacement during development and optimized builds for production. | Production-ready |
| **@vitejs/plugin-react** | 4.3 | React integration for Vite. Enables JSX transformation and React Fast Refresh. | Production-ready |

### Frontend Assets

| Asset | Format | Purpose | Notes |
|-------|--------|---------|-------|
| **VRM Avatar** | `.vrm` (glTF-based) | 3D avatar model with humanoid bone rig and facial expression presets | User-supplied; placed at `public/avatar.vrm` |
| **Space Grotesk** | Google Fonts (WOFF2) | UI typography | Loaded via Google Fonts CDN |

---

## 3. Backend Services

| Technology | Version | Purpose | POC / Production |
|-----------|---------|---------|-----------------|
| **Node.js** | 18+ (ESM) | Runtime for the token server. | Production-ready |
| **Express** | 4.19 | HTTP framework. Serves the `/token` and `/health` endpoints with JSON parsing and CORS middleware. | Production-ready (consider Fastify for higher throughput at scale) |
| **cors** | 2.8 | CORS middleware. Restricts token endpoint access to the configured frontend origin. | Production-ready |
| **dotenv** | 16.4 | Environment variable loader. Reads `.env` file for API keys and configuration. | POC-suitable (use platform secrets management in production) |

---

## 4. AI / ML Models and APIs

| Service / Model | Provider | Purpose | Integration Method |
|----------------|----------|---------|-------------------|
| **OpenAI Realtime API** | OpenAI | Core AI engine. Handles speech-to-text, conversational reasoning, and text-to-speech in a single real-time pipeline. | WebRTC (audio) + Data Channel (events). Authenticated via ephemeral client secrets. |
| **gpt-realtime** | OpenAI | Realtime conversation model. Processes audio input and generates audio responses with low latency. | Configured in session parameters via `/v1/realtime/client_secrets` |
| **gpt-4o-mini-transcribe** | OpenAI | Urdu speech transcription. Configured with `language: "ur"` for accurate Urdu recognition. | Configured server-side in session parameters |
| **marin** (voice) | OpenAI | Text-to-speech voice. Produces the AI's spoken responses. | Configured server-side in session parameters |

### AI Integration Points

- **Token Generation**: `POST https://api.openai.com/v1/realtime/client_secrets` -- Server-side only, requires API key.
- **Session Establishment**: `POST https://api.openai.com/v1/realtime/calls` -- Client-side, uses ephemeral token, sends SDP offer.
- **Ongoing Communication**: WebRTC audio tracks (bidirectional) + `oai-events` data channel (AI → client, JSON event messages).

---

## 5. Media Pipeline

| Component | Technology | Purpose | Notes |
|-----------|-----------|---------|-------|
| **Audio Capture** | MediaDevices.getUserMedia | Captures microphone audio | Browser-native, requires user permission |
| **Audio Streaming** | WebRTC audio track | Sends mic audio to OpenAI | Low-latency, UDP-based |
| **Audio Playback** | HTML5 Audio element | Plays AI response audio | `autoplay` + `playsInline` for mobile compatibility |
| **Audio Analysis (Remote)** | Web Audio AnalyserNode | Extracts RMS for lip sync | fftSize 1024, connected via MediaStreamSource |
| **Audio Analysis (Local)** | Web Audio AnalyserNode | Extracts RMS for VAD meter | Separate analyser, silent gain node (no feedback) |
| **3D Rendering** | Three.js WebGLRenderer | Renders avatar scene | Antialias enabled, alpha enabled, 2x pixel ratio cap |
| **Avatar Format** | VRM (via @pixiv/three-vrm) | Humanoid avatar with expressions | Industry standard for anime-style 3D avatars |

### Audio Pipeline Topology

```
Microphone
    │
    ▼
MediaStream ──────────────────────► RTCPeerConnection ──► OpenAI
    │                                      │
    ▼                                      ▼
Local AnalyserNode                   Remote Audio Stream
    │                                      │
    ▼                                      ├──► Audio Element (playback)
VAD Meter (CSS)                            │
                                           ▼
                                   Remote AnalyserNode
                                           │
                                           ▼
                                   RMS → Smoothing → Lip Sync
```

---

## 6. Infrastructure & DevOps

| Tool | Purpose | POC / Production |
|------|---------|-----------------|
| **npm** | Package management | Production-ready |
| **Git** | Version control | Production-ready |
| **Playwright** | End-to-end testing framework (installed, no tests written yet) | Production-ready (tests need to be authored) |
| **Vite dev server** | Local development with HMR | Development-only |

### POC Infrastructure

The POC runs entirely on a developer's local machine:

- Frontend: `localhost:5173` (Vite dev server)
- Backend: `localhost:3001` (Express)
- No containerization, CI/CD, or cloud deployment

### Production Infrastructure Recommendations

| Concern | Recommendation |
|---------|---------------|
| **Hosting** | Static frontend on CDN (Vercel, Cloudflare Pages); backend on containerized platform (AWS ECS, Google Cloud Run) |
| **Secrets** | Platform secrets manager (AWS Secrets Manager, GCP Secret Manager) instead of `.env` files |
| **Monitoring** | Application performance monitoring (Datadog, New Relic) with structured logging |
| **CDN** | Serve VRM avatar and static assets via CDN for global low-latency loading |
| **CI/CD** | GitHub Actions or similar for automated testing, building, and deployment |
| **Rate Limiting** | Add rate limiting to the token endpoint to prevent abuse |
| **Authentication** | Add user authentication before issuing tokens |
| **Load Balancing** | Horizontal scaling of the stateless token server behind a load balancer |

---

## 7. POC vs. Production Suitability Summary

| Component | POC Status | Production Readiness |
|-----------|-----------|---------------------|
| React + Three.js + VRM rendering | Functional | Ready (consider code splitting) |
| WebRTC audio pipeline | Functional | Ready (add error recovery) |
| Lip sync via RMS | Functional | Adequate (consider phoneme-based sync for higher fidelity) |
| Emotion detection (regex) | Functional | Needs upgrade (use NLP/sentiment analysis) |
| Gesture system | Functional | Needs expansion (more gestures, smoother blending) |
| Token server | Functional | Needs auth, rate limiting, monitoring |
| Hardcoded config | Functional | Needs configuration management |
| No tests | Acceptable for POC | Must add unit, integration, and e2e tests |
| No monitoring | Acceptable for POC | Must add logging, metrics, alerting |
| No authentication | Acceptable for POC | Must add before any public deployment |
