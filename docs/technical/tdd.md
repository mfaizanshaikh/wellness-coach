# Technical Design Document (TDD)

**Document Type:** Technical Design
**Version:** 1.0
**Date:** February 2026
**Status:** POC Complete
**Audience:** Engineers, Technical Leads

---

## 1. Overview

This document provides a component-level technical overview of the Wellness Coach Avatar system. It covers the internal structure of both the client and server, describes API-level responsibilities, documents data flow and state handling patterns, and identifies error handling strategies and known constraints.

---

## 2. System Boundary

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SYSTEM BOUNDARY                                                        │
│                                                                         │
│  ┌─────────────────────┐         ┌─────────────────────┐               │
│  │   Browser Client    │  HTTP   │   Token Server      │               │
│  │   (port 5173)       │◄───────►│   (port 3001)       │               │
│  └─────────┬───────────┘         └──────────┬──────────┘               │
│            │                                │                           │
└────────────┼────────────────────────────────┼───────────────────────────┘
             │ WebRTC                         │ HTTPS
             │                                │
             ▼                                ▼
    ┌─────────────────────────────────────────────────────┐
    │              OpenAI Realtime API                     │
    │              (External Service)                      │
    └─────────────────────────────────────────────────────┘
```

**Inside system boundary**: Browser client, token server, all configuration.
**Outside system boundary**: OpenAI Realtime API, user's browser, user's microphone/speaker.

---

## 3. Component-Level Technical Overview

### 3.1 Token Server

**File**: `server/index.js`
**Runtime**: Node.js (ESM), Express 4
**Responsibility**: Securely broker ephemeral WebRTC tokens.

#### Endpoints

| Method | Path | Request | Response | Responsibility |
|--------|------|---------|----------|---------------|
| POST | /token | Empty body | `{ value: string, ... }` (OpenAI session object) | Authenticate with OpenAI using server-side API key. Build session configuration (model, voice, transcription, system prompt). Call `/v1/realtime/client_secrets`. Return ephemeral token. |
| GET | /health | None | `{ ok: true }` | Health check for monitoring |

#### Session Configuration (Built Server-Side)

The token endpoint constructs the following session object sent to OpenAI:

- **type**: `"realtime"`
- **model**: Configurable via `OPENAI_REALTIME_MODEL` (default: `gpt-realtime`)
- **instructions**: Hardcoded Urdu wellness coach system prompt (24 behavioral rules). Can be overridden via `OPENAI_REALTIME_INSTRUCTIONS` env var.
- **audio.input.transcription.model**: `gpt-4o-mini-transcribe`
- **audio.input.transcription.language**: `ur` (Urdu)
- **audio.output.voice**: Configurable via `OPENAI_REALTIME_VOICE` (default: `marin`)

#### Configuration Source Priority

1. Environment variable (if set and non-empty)
2. Hardcoded default in `server/index.js`

The system prompt is special: the hardcoded default is a comprehensive 24-rule wellness coach prompt. The env var `OPENAI_REALTIME_INSTRUCTIONS` replaces it entirely if set.

---

### 3.2 Browser Client

**File**: `src/App.jsx` (single component, ~915 lines)
**Runtime**: React 18, Three.js, @pixiv/three-vrm
**Responsibility**: All user-facing functionality.

#### Internal Component Structure

The monolithic `App` component is organized internally into logical subsystems, each managed through refs:

**3.2.1 Three.js Scene Subsystem**

- **Setup**: First `useEffect` (runs once). Creates renderer, scene, camera, lights, floor, backdrop, starts animation loop.
- **Objects managed via refs**: `rendererRef`, `sceneRef`, `cameraRef`
- **Renderer config**: WebGL, antialias, alpha, pixel ratio capped at 2x
- **Camera**: Perspective, FOV 28, positioned at (0, 1.4, 2.2) -- eye-level framing
- **Lighting**: Hemisphere (ambient), key directional (main), rim directional (blue edge)
- **Floor**: Dark plane, high roughness
- **Backdrop**: Custom ShaderMaterial with radial gradient, transparent, behind avatar

**3.2.2 VRM Avatar Subsystem**

- **Loading**: `loadVrm()` function, called in second `useEffect`. Uses GLTFLoader with VRMLoaderPlugin.
- **Post-load setup**:
  - Removes unnecessary joints (optimization)
  - Detects mouth driver: prefers expression presets (`aa`, `a`, `A`, `mouthOpen`), falls back to custom mouth expression, then jaw bone
  - Sets initial arm pose (from T-pose to relaxed: upper arm Z rotation ~1.1 rad)
  - Scales avatar to 1.25x, rotates 180 degrees to face camera
- **Objects managed via refs**: `vrmRef`, `jawRef`, `jawRestQuatRef`, `mouthExpressionRef`

**3.2.3 Audio Pipeline Subsystem**

- **AudioContext**: Created on demand via `ensureAudioContext()`. Shared by all audio processing.
- **Remote analyser** (`setupAudioAnalyser`): Processes AI audio output for lip sync. Connected via MediaStreamSource → AnalyserNode → silent GainNode → destination.
- **Local analyser** (`setupLocalAnalyser`): Processes mic input for VAD meter. Same topology as remote analyser.
- **Silent gain nodes**: Both analysers route through zero-gain nodes to prevent audio feedback loops while still allowing analysis.
- **Objects managed via refs**: `audioCtxRef`, `analyserRef`, `analyserDataRef`, `localAnalyserRef`, `localAnalyserDataRef`

**3.2.4 Animation Subsystem**

Runs inside the `requestAnimationFrame` loop, every frame (~60fps):

- **`animateIdle(delta)`**: Handles all body animation
  - Speaking weight: Smoothly blends 0 (idle) to 1 (speaking) using `THREE.MathUtils.damp` with factor 6
  - Breathing: Spine rotation X via sine wave (period ~4.2s, amplitude 0.01 rad)
  - Head: Blends between idle sway and speaking motion (faster, larger amplitude)
  - Chest: Blends between static idle and speaking sway
  - Arms: Blends between relaxed idle pose and speaking gesticulation
  - Idle gestures: Random trigger every 8-14 seconds when not speaking
  - Active gestures: Bone animations with per-gesture target poses and durations
  - Emotions: Maps detected emotion to VRM expression presets (happy, sad, surprised), intensity decays at 0.3/second
  - Blinking: Randomized 3-5 second interval, 0.2 second close/open cycle

- **`driveMouth()`**: Handles lip synchronization
  - Reads time-domain data from remote analyser (1024 samples)
  - Computes RMS: `sqrt(sum(((sample-128)/128)^2) / N)`
  - Applies first smoothing: `smoothed = smoothed * 0.9 + rms * 0.1`
  - Maps to mouth target: `min(1, smoothed * 3.2)`
  - Applies second smoothing: `mouth = mouth * 0.85 + target * 0.15`
  - Sets all VRM mouth presets (Aa, Ih, Ou, Ee, Oh) to smoothed value
  - Sets jaw bone rotation if available: open angle = smoothed * 0.35 rad

- **`updateVadMeter()`**: Handles mic level display
  - Same RMS calculation as lip sync, using local analyser
  - Maps to 0-1 range: `min(1, rms * 4.5)`
  - Sets CSS transform `scaleX` on meter element

**3.2.5 Emotion & Gesture Subsystem**

- **Emotion detection** (`detectEmotion`): Regex pattern matching on AI response text. Returns one of: `happy`, `surprised`, `sad`, `thinking`, `curious`, `greeting`, `neutral`
- **Gesture triggering** (`triggerGestureFromText`): Regex matching for gesture keywords (wave, dance, shrug, nod, tilt, etc.)
- **Data channel handler** (`handleAIMessage`): Parses JSON messages from the `oai-events` data channel. Extracts text from various event structures. Triggers emotion detection and gesture detection. Tracks speaking state from `response.audio.delta`/`response.audio.done` events.

**3.2.6 Session Management Subsystem**

- **Priming** (`primeAudio`): Resumes AudioContext, sets `primed` state. Runs once.
- **Session start** (`startSession`): Fetches token, gets mic stream, creates RTCPeerConnection, adds audio track, creates data channel, generates SDP offer, sends to OpenAI, sets remote description.
- **Session stop** (`stopSession`): Closes data channel, peer connection, mic stream, audio context. Resets all refs and state. Clears retry timer.
- **Auto-retry**: On connection failure, schedules retry after 3 seconds via `setTimeout`. Clears on successful connection or manual stop.
- **State**: `status` (Idle | Connecting | Live | Error), `error` (string), `primed` (boolean)

---

## 4. API-Level Responsibilities

### 4.1 Internal APIs (Client-Side Functions)

| Function | Responsibility | Called By |
|----------|---------------|----------|
| `loadVrm(url)` | Load VRM model, configure bones and expressions | `useEffect` on mount |
| `ensureAudioContext()` | Create or return shared AudioContext | `primeAudio`, `startSession`, `setupAudioAnalyser`, `setupLocalAnalyser` |
| `setupAudioAnalyser(stream)` | Create analyser for remote audio (lip sync) | `pc.ontrack` handler |
| `setupLocalAnalyser(stream)` | Create analyser for mic audio (VAD meter) | `startSession` |
| `primeAudio()` | Unlock AudioContext, set primed state | User tap |
| `startSession()` | Full session establishment (token → WebRTC → live) | `useEffect` when primed, `handleResume` |
| `stopSession()` | Tear down all connections and reset state | `handleStop`, component unmount |
| `animateIdle(delta)` | Per-frame body animation | `requestAnimationFrame` loop |
| `driveMouth()` | Per-frame lip sync | `requestAnimationFrame` loop |
| `updateVadMeter()` | Per-frame mic level update | `requestAnimationFrame` loop |
| `detectEmotion(text)` | Regex-based emotion classification | `handleAIMessage` |
| `triggerGestureFromText(text)` | Keyword-based gesture trigger | `handleAIMessage` |
| `handleAIMessage(data)` | Parse data channel messages, drive emotion/gesture | Data channel `onmessage` |
| `startGesture(name)` | Initialize a gesture animation | `triggerGestureFromText`, idle gesture trigger |

### 4.2 External APIs

| Endpoint | Direction | Responsibility |
|----------|-----------|---------------|
| `POST http://localhost:3001/token` | Client → Token Server | Request ephemeral session token |
| `POST https://api.openai.com/v1/realtime/client_secrets` | Token Server → OpenAI | Generate ephemeral client secret with session config |
| `POST https://api.openai.com/v1/realtime/calls` | Client → OpenAI | Establish WebRTC session with SDP offer |

---

## 5. Data Flow and State Handling

### 5.1 React State (UI-Visible)

| State Variable | Type | Purpose | Updated By |
|---------------|------|---------|-----------|
| `status` | string (enum) | Connection status display | `startSession`, `stopSession` |
| `error` | string | Error message display | `startSession`, `loadVrm` |
| `mouthDriver` | string | Debug info: which mouth mechanism is active | `loadVrm` |
| `primed` | boolean | Whether audio has been unlocked by user tap | `primeAudio` |

### 5.2 Ref-Based Mutable State

All rapidly-changing state is stored in refs to avoid React re-renders:

| Category | Refs | Update Frequency |
|----------|------|-----------------|
| Three.js objects | renderer, scene, camera, VRM, mixer, clock | Once (setup) |
| Avatar bones | jaw, jawRestQuat, mouthExpression | Once (VRM load) |
| Audio nodes | audioCtx, analyser, analyserData, localAnalyser, localAnalyserData, audioEl | Once (session start) |
| WebRTC | peer, dataChannel, localStream, remoteStream | Once (session start) |
| Animation timers | idleTime, blinkTime, gestureTime, nextBlink, blinkProgress | Every frame |
| Animation state | isSpeaking, speakingWeight, rmsSmoothed, mouthSmoothed | Every frame |
| Emotion state | emotion, emotionIntensity | On AI message |
| Gesture state | currentGesture, gestureProgress, gestureDuration, nextIdleGesture | On trigger / every frame |
| Session guards | sessionStarting, retryTimer, primeOnce | On session events |

### 5.3 Why Refs Over State

React state triggers re-renders. At 60fps, the animation system updates 20+ values per frame. Using React state for these would cause 60 re-renders per second, destroying performance. Refs allow mutation without re-renders, which is the correct pattern for real-time graphics and audio processing in React.

---

## 6. Error Handling

### 6.1 Error Scenarios and Responses

| Scenario | Detection | Response | User Feedback |
|----------|-----------|----------|--------------|
| VRM model not found / invalid | `loadVrm` catch block | Set error state, log to console | Error message displayed |
| Token server unreachable | `fetch` failure in `startSession` | Set error status, schedule 3s retry | Status: "Error", error message shown |
| Token server returns error | Non-200 response | Same as unreachable | Same as unreachable |
| OpenAI SDP negotiation fails | `fetch` failure or non-200 | Same as unreachable | Same as unreachable |
| WebRTC connection drops | Implicit (audio stops) | Speaking detection threshold triggers idle state | Status may show error if peer connection fires error |
| Microphone permission denied | `getUserMedia` rejection | Set error status | Error message displayed |
| AudioContext suspended | Check state before operations | Call `resume()` | Transparent to user |
| Data channel message parse error | JSON.parse catch block | Silently ignored | None (non-critical) |
| Audio prime fails | `primeAudio` catch block | Reset `primeOnce` flag, allowing retry | User can tap again |

### 6.2 Retry Strategy

- **Mechanism**: `setTimeout` with 3-second delay
- **Guard**: Only one retry timer active at a time (`retryTimerRef`)
- **Cancellation**: Timer cleared on manual stop or component unmount
- **Limit**: None (retries indefinitely). This is acceptable for POC; production should implement exponential backoff with a maximum retry count.

### 6.3 Cleanup Strategy

The `stopSession` function performs comprehensive cleanup:

1. Close data channel
2. Close peer connection
3. Stop all mic tracks
4. Close AudioContext
5. Null all refs (peer, dataChannel, localStream, analysers, audioCtx)
6. Reset animation state (isSpeaking, emotion)
7. Clear retry timer
8. Reset session guard flag
9. Set status to Idle

Component unmount triggers `stopSession` via `useEffect` cleanup.

---

## 7. Known Constraints and Limitations

### 7.1 Technical Constraints

| Constraint | Impact | Mitigation Path |
|-----------|--------|----------------|
| **Monolithic component** (~915 lines) | Difficult to maintain, test, or extend | Decompose into modules: SceneManager, AudioPipeline, AnimationEngine, SessionManager |
| **Hardcoded token URL** (`localhost:3001`) | Cannot deploy frontend and backend separately without code change | Use environment variable or relative URL |
| **No TypeScript** | No type safety, harder to refactor | Migrate to TypeScript |
| **No tests** | No regression safety | Add unit tests (animation math), integration tests (session flow), e2e tests (Playwright) |
| **Regex emotion detection** | Limited accuracy, English-only patterns (doesn't match Urdu text) | Replace with NLP-based sentiment analysis or use AI-provided emotion metadata |
| **Single VRM model** | No avatar customization | Support model selection |
| **No audio echo cancellation control** | Potential echo on speakers (not headphones) | WebRTC provides some AEC; consider additional processing |
| **60fps assumption** | May not achieve 60fps on low-end devices | Add frame rate monitoring and quality scaling |

### 7.2 Operational Constraints

| Constraint | Impact | Mitigation Path |
|-----------|--------|----------------|
| **No authentication** | Anyone can request tokens | Add user auth before token issuance |
| **No rate limiting** | Token endpoint vulnerable to abuse | Add rate limiting middleware |
| **No monitoring** | No visibility into production behavior | Add structured logging, APM, error tracking |
| **No usage tracking** | Cannot measure engagement or costs | Add analytics events |
| **Console-only logging** | Logs lost when browser tab closes | Implement remote logging for critical events |

---

## 8. Recommended Decomposition (Post-POC)

For production, the monolithic `App.jsx` should be decomposed:

```
src/
├── App.jsx                    # Thin orchestrator
├── components/
│   ├── AvatarCanvas.jsx       # Three.js scene setup and render loop
│   ├── ControlBar.jsx         # Status pill, VAD meter, error display
│   ├── Header.jsx             # Title, status badge, Stop/Resume
│   └── PrimeOverlay.jsx       # Tap-to-activate overlay
├── systems/
│   ├── SceneManager.js        # Three.js scene, camera, lighting, resize
│   ├── VrmLoader.js           # VRM loading, bone/expression detection
│   ├── AudioPipeline.js       # AudioContext, analysers, RMS extraction
│   ├── AnimationEngine.js     # Idle, speaking, blink, emotion, gesture
│   ├── LipSync.js             # RMS → mouth expressions/jaw
│   ├── EmotionDetector.js     # Text → emotion classification
│   ├── GestureController.js   # Gesture definitions, trigger, execution
│   └── SessionManager.js      # Token fetch, WebRTC, retry, lifecycle
├── config/
│   └── constants.js           # Smoothing factors, timing, thresholds
└── styles/
    └── styles.css
```
