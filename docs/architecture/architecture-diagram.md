# Architecture Diagram Description

**Document Type:** Architecture Reference
**Version:** 1.0
**Date:** February 2026
**Status:** POC Complete

---

## 1. Logical Architecture Layers

The system is organized into five logical layers, each with distinct responsibilities:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                          │
│  UI Controls  │  Status Display  │  Canvas (3D Viewport)           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                        ANIMATION LAYER                              │
│  Idle System  │  Lip Sync  │  Emotion Expressions  │  Gestures     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                     MEDIA PROCESSING LAYER                          │
│  Mic Capture  │  Audio Analyser (RMS)  │  Audio Playback            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                      COMMUNICATION LAYER                            │
│  WebRTC PeerConnection  │  Data Channel  │  HTTP Token Fetch        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                       EXTERNAL SERVICES                             │
│  Token Server (Express)  │  OpenAI Realtime API                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Diagram

### 2.1 Client-Side Components

```
Browser Client
├── React Application
│   ├── App Component (orchestrator)
│   ├── State: status, error, primed, mouthDriver
│   └── Refs: all mutable objects (renderer, scene, camera, VRM, audio nodes, WebRTC)
│
├── Three.js Scene
│   ├── WebGL Renderer (antialias, alpha, 2x pixel ratio cap)
│   ├── Perspective Camera (FOV 28, positioned at eye level)
│   ├── Lighting Rig
│   │   ├── Hemisphere Light (sky/ground ambient)
│   │   ├── Key Directional Light (main illumination)
│   │   └── Rim Directional Light (blue edge highlight)
│   ├── Floor Plane (dark, high roughness)
│   ├── Gradient Backdrop (custom shader, transparent)
│   └── VRM Avatar
│       ├── Humanoid Bone System (head, neck, spine, chest, arms)
│       ├── Expression Manager (blink, happy, sad, surprised, mouth presets)
│       └── Jaw Bone (fallback mouth driver)
│
├── Audio Pipeline
│   ├── AudioContext
│   ├── Local Analyser (mic input → VAD meter)
│   └── Remote Analyser (AI audio → RMS → lip sync)
│
├── Animation Engine (requestAnimationFrame loop)
│   ├── Idle Animator (breathing, head sway, arm sway)
│   ├── Blink Controller (randomized 3-5s interval, 0.2s duration)
│   ├── Mouth Driver (RMS → smoothed open value → expressions/jaw)
│   ├── Emotion Controller (text → emotion → expression presets, intensity decay)
│   ├── Gesture Controller (keyword/random → bone animation, timed duration)
│   └── Speaking Weight Blender (smooth transition idle ↔ speaking poses)
│
└── Session Manager
    ├── Audio Primer (user tap → AudioContext unlock)
    ├── Token Fetcher (HTTP POST to backend)
    ├── WebRTC Connector (PeerConnection, SDP offer/answer)
    ├── Auto-Retry (3-second timer on failure)
    └── Stop/Resume Handler
```

### 2.2 Server-Side Components

```
Token Server (Express)
├── CORS Middleware (origin-restricted)
├── POST /token
│   ├── Reads API key from environment
│   ├── Builds session config (model, voice, Urdu transcription, system prompt)
│   ├── Calls OpenAI /v1/realtime/client_secrets
│   └── Returns ephemeral client secret
└── GET /health
    └── Returns { ok: true }
```

---

## 3. Data Flow

### 3.1 Session Initialization Flow

```
User                Browser Client              Token Server           OpenAI API
 │                       │                          │                      │
 │  Tap screen           │                          │                      │
 │──────────────────────►│                          │                      │
 │                       │  Resume AudioContext      │                      │
 │                       │  Request mic permission   │                      │
 │                       │                          │                      │
 │                       │  POST /token             │                      │
 │                       │─────────────────────────►│                      │
 │                       │                          │  POST /client_secrets│
 │                       │                          │─────────────────────►│
 │                       │                          │  Ephemeral token     │
 │                       │                          │◄─────────────────────│
 │                       │  Token response          │                      │
 │                       │◄─────────────────────────│                      │
 │                       │                          │                      │
 │                       │  Create RTCPeerConnection│                      │
 │                       │  Add mic track           │                      │
 │                       │  Create data channel     │                      │
 │                       │  Generate SDP offer      │                      │
 │                       │                          │                      │
 │                       │  POST /v1/realtime/calls (SDP offer)           │
 │                       │───────────────────────────────────────────────►│
 │                       │  SDP answer                                    │
 │                       │◄───────────────────────────────────────────────│
 │                       │                          │                      │
 │                       │  Set remote description  │                      │
 │                       │  Status → "Live"         │                      │
 │  Avatar visible       │                          │                      │
 │◄──────────────────────│                          │                      │
```

### 3.2 Real-Time Conversation Flow

```
User                Browser Client                           OpenAI Realtime
 │                       │                                        │
 │  Speaks into mic      │                                        │
 │──────────────────────►│                                        │
 │                       │  Mic MediaStream ──(WebRTC)──────────►│
 │                       │  Local analyser updates VAD meter      │
 │                       │                                        │
 │                       │         (AI processes: transcribe →    │
 │                       │          reason → generate response)   │
 │                       │                                        │
 │                       │  ◄──(WebRTC audio stream)──────────────│
 │                       │  ◄──(Data channel: event messages)─────│
 │                       │                                        │
 │                       │  Remote audio → speaker playback       │
 │                       │  Remote audio → analyser → RMS         │
 │                       │  RMS → smoothed → lip sync values      │
 │                       │  Lip sync → VRM expressions + jaw      │
 │                       │                                        │
 │                       │  Data channel text → emotion detect    │
 │                       │  Emotion → VRM expression presets      │
 │                       │  Keywords → gesture triggers           │
 │                       │  Gesture → bone animation              │
 │                       │                                        │
 │  Sees avatar speak,   │                                        │
 │  move, emote          │                                        │
 │◄──────────────────────│                                        │
```

### 3.3 Animation Frame Flow (Per-Frame, ~60fps)

```
requestAnimationFrame tick
│
├── Update animation mixer (delta time)
│
├── animateIdle(delta)
│   ├── Update timers (idle, blink, gesture)
│   ├── Compute speaking weight (smooth blend 0↔1)
│   ├── Decay emotion intensity
│   ├── Animate spine (breathing sine wave)
│   ├── Animate head (blend idle sway ↔ speaking motion)
│   ├── Animate chest (blend idle ↔ speaking sway)
│   ├── Animate arms (blend idle pose ↔ speaking gesticulation)
│   ├── Check for random idle gesture trigger
│   ├── Execute active gesture (bone targets over duration)
│   ├── Apply emotion to VRM expression presets
│   └── Update blink (randomized interval, 0.2s close/open cycle)
│
├── driveMouth()
│   ├── Read remote analyser time-domain data
│   ├── Compute RMS from audio buffer
│   ├── Apply exponential smoothing (0.9/0.1 blend)
│   ├── Map to mouth-open target (clamped 0-1)
│   ├── Apply second smoothing pass (0.85/0.15 blend)
│   ├── Set VRM mouth expression presets (Aa, Ih, Ou, Ee, Oh)
│   └── Set jaw bone rotation (if available)
│
├── Update VRM internal state
│
├── updateVadMeter()
│   ├── Read local analyser time-domain data
│   ├── Compute RMS
│   └── Update meter CSS transform
│
└── Render scene to canvas
```

---

## 4. Real-Time Aspects

### 4.1 Latency-Critical Paths

| Path | Transport | Expected Latency | Notes |
|------|-----------|-------------------|-------|
| User voice → OpenAI | WebRTC (UDP) | ~50-150ms | Network-dependent, no intermediate server |
| OpenAI → Audio playback | WebRTC (UDP) | ~50-150ms | Direct peer-to-peer style |
| Audio → Lip sync | In-process | <1ms | Same animation frame, no async |
| Data channel → Emotion/Gesture | In-process | <1ms | Parsed in message handler, applied next frame |
| Animation frame | requestAnimationFrame | ~16ms (60fps) | Browser-native timing |

### 4.2 Smoothing and Blending

The system uses multiple levels of smoothing to prevent jitter while maintaining responsiveness:

- **RMS Smoothing**: Exponential moving average with factor 0.9 (90% previous, 10% new) prevents audio spikes from causing jaw snapping.
- **Mouth Smoothing**: Second pass with factor 0.85 creates natural-looking mouth movement.
- **Speaking Weight**: `THREE.MathUtils.damp` with factor 6 creates gradual transitions between idle and speaking body poses.
- **Bone Animation**: `THREE.MathUtils.damp` with factors 4-12 (varies by bone) ensures all bone movements are smooth, not instantaneous.
- **Emotion Decay**: Linear decay at 0.3 per second prevents facial expressions from snapping off.

---

## 5. State Diagram

### 5.1 Session States

```
                    ┌─────────┐
                    │  Idle   │◄──────────────────────┐
                    └────┬────┘                       │
                         │ User taps                  │ Stop button
                         ▼                            │ or cleanup
                    ┌────────────┐                    │
                    │ Connecting │──── Failure ───┐    │
                    └─────┬──────┘                │    │
                          │ Success               │    │
                          ▼                       ▼    │
                    ┌─────────┐              ┌───────┐ │
                    │  Live   │              │ Error │─┘
                    └────┬────┘              └───┬───┘
                         │ Connection lost       │ Auto-retry (3s)
                         ▼                       │
                    ┌─────────┐                  │
                    │  Error  │──────────────────┘
                    └─────────┘
```

### 5.2 Avatar Animation States

```
                    ┌──────────────┐
              ┌────►│  Idle Pose   │◄────────┐
              │     │ (breathing,  │         │
              │     │  blinking)   │         │
              │     └──────┬───────┘         │
              │            │                 │
              │     AI starts speaking       │ AI stops speaking
              │            │                 │
              │            ▼                 │
              │     ┌──────────────┐         │
              │     │Speaking Pose │─────────┘
              │     │(head motion, │
              │     │ arm gesture, │
              │     │ lip sync)    │
              │     └──────┬───────┘
              │            │
              │     Keyword or random trigger
              │            │
              │            ▼
              │     ┌──────────────┐
              └─────│   Gesture    │
                    │(wave, nod,   │
                    │ shrug, etc.) │
                    └──────────────┘
```
