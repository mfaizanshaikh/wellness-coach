# High-Level Design & Architecture

**Document Type:** Architecture Overview
**Version:** 1.0
**Date:** February 2026
**Status:** POC Complete

---

## 1. Executive Summary

The Wellness Coach Avatar is an always-on, real-time voice interaction system that presents a 3D animated avatar as an empathetic Urdu-speaking wellness coach. The system captures the user's voice, streams it to an AI reasoning engine, receives spoken responses, and drives a lifelike avatar with lip-sync, facial expressions, and body gestures -- all in real time.

The architecture is designed around four primary concerns: **low-latency audio streaming**, **AI-powered conversation**, **real-time 3D animation**, and **emotional responsiveness**.

---

## 2. Architectural Principles

- **Always-On Experience**: Once activated, the system maintains a persistent bidirectional audio connection. No button presses are required to speak or listen.
- **Real-Time First**: Every component is optimized for minimal latency. Audio streams via WebRTC (not HTTP). Animation runs at 60fps in the browser.
- **Client-Heavy, Server-Light**: The backend exists only to broker authentication tokens. All rendering, audio processing, and animation logic runs in the browser.
- **Emotional Intelligence**: The avatar is not a static speaker. It reacts to conversational content with appropriate facial expressions and body language.

---

## 3. Major Components

### 3.1 Client Application (Browser)

The client application is the core of the system. It runs entirely in the browser and is responsible for:

- **3D Scene Rendering**: Loads and renders a VRM-format 3D avatar using Three.js. The scene includes dynamic lighting, a floor plane, and a gradient backdrop. The avatar is positioned and scaled to appear as a conversational partner.

- **Voice Capture**: Requests microphone access from the user and captures audio as a MediaStream. This stream is fed into the WebRTC peer connection for transmission to the AI service.

- **Audio Playback & Analysis**: Receives the AI's spoken response as a remote audio stream. This stream is simultaneously played back to the user and routed through a Web Audio API analyser to extract real-time volume levels (RMS) for lip-sync.

- **Lip Synchronization**: Converts RMS audio levels into mouth-open values using exponential smoothing. These values drive VRM facial expression presets (Aa, Ih, Ou, Ee, Oh) and/or jaw bone rotation, creating realistic speech animation.

- **Idle Animation System**: When the AI is not speaking, the avatar exhibits lifelike idle behavior: gentle breathing (spine oscillation), subtle head movement, randomized blinking (3-5 second intervals), and periodic idle gestures (wave, tilt, shrug).

- **Emotion System**: Analyses text from the AI's responses using pattern matching to detect emotional tone (happy, sad, surprised, curious, thinking). Maps detected emotions to VRM facial expression presets with intensity decay over time.

- **Gesture System**: Triggers body gestures based on keywords in AI responses (e.g., "wave", "dance", "nod") or randomly during idle periods. Gestures animate upper body bones (arms, chest, head) over defined durations.

- **Session Management**: Handles the full connection lifecycle including audio priming (user tap to unlock AudioContext), WebRTC session establishment, automatic reconnection on failure (3-second retry), and manual stop/resume controls.

- **User Interface**: Displays connection status, a mic-level meter (VAD indicator), error messages, and provides stop/resume controls.

### 3.2 Token Server (Backend)

The backend is intentionally minimal. Its sole responsibility is to securely broker ephemeral authentication tokens:

- Receives token requests from the client.
- Calls the OpenAI Realtime API with the server-side API key to generate a short-lived client secret.
- Includes session configuration in the token request: model selection, voice selection, Urdu transcription settings, and the full system prompt (wellness coach personality and behavioral rules).
- Returns the ephemeral token to the client. The client never sees or stores the permanent API key.
- Provides a health-check endpoint for monitoring.

### 3.3 OpenAI Realtime API (External Service)

The AI reasoning and voice synthesis engine, operated by OpenAI:

- Accepts WebRTC connections authenticated with ephemeral client secrets.
- Receives raw audio input, transcribes it (using Urdu-configured transcription), reasons over the conversation, and generates a spoken response.
- Returns the response as a real-time audio stream over the same WebRTC connection.
- Sends structured event data over a WebRTC data channel, including text transcripts that the client uses for emotion detection and gesture triggering.

---

## 4. Component Interaction Model

The system follows a **hub-and-spoke model** with the browser client as the hub:

```
                    ┌─────────────────────┐
                    │   OpenAI Realtime    │
                    │       API            │
                    │  (Voice AI Engine)   │
                    └─────────┬───────────┘
                         WebRTC
                    (Audio + Data Channel)
                              │
                              ▼
┌──────────────┐      ┌──────────────────────────────────────┐
│ Token Server │◄────►│           Browser Client              │
│  (Backend)   │ HTTP │                                      │
│              │      │  ┌──────────┐  ┌───────────────────┐ │
└──────────────┘      │  │  Audio    │  │   3D Rendering    │ │
                      │  │ Pipeline  │  │   & Animation     │ │
                      │  └──────────┘  └───────────────────┘ │
                      │  ┌──────────┐  ┌───────────────────┐ │
                      │  │ Emotion  │  │   Session &        │ │
                      │  │ & Gesture│  │   UI Management    │ │
                      │  └──────────┘  └───────────────────┘ │
                      └──────────────────────────────────────┘
                                      │
                                      ▼
                              ┌──────────────┐
                              │     User     │
                              │ (Microphone  │
                              │  & Speaker)  │
                              └──────────────┘
```

---

## 5. Key Architectural Decisions

### 5.1 Why WebRTC Instead of WebSockets

WebRTC provides sub-100ms latency for audio streaming, built-in echo cancellation, and browser-native support. WebSocket-based audio streaming would add encoding/decoding overhead and higher latency, which is unacceptable for a real-time conversational experience.

### 5.2 Why Client-Side Rendering

Running Three.js in the browser eliminates server-side GPU costs and allows the avatar to render at the device's native frame rate. For a POC targeting individual users, this is the most cost-effective and lowest-latency approach.

### 5.3 Why a Minimal Backend

The backend exists only because the OpenAI API key must not be exposed to the client. By issuing ephemeral tokens, the backend keeps credentials secure while allowing the client to establish direct WebRTC connections to OpenAI. This also means the backend has no state and can be trivially scaled.

### 5.4 Why a Monolithic Frontend Component

For the POC, a single React component with refs manages all state. This avoids the complexity of state management libraries and inter-component communication. For production, this should be decomposed into separate modules (see Technical Design Document).

### 5.5 Why Urdu-Only with Server-Side Instructions

The wellness coach personality, language constraint, and behavioral rules are embedded in the token server's session configuration. This ensures the AI always receives the correct system prompt, regardless of client-side changes. The Urdu transcription model is also configured server-side for consistency.

---

## 6. Security Considerations

- **API Key Protection**: The OpenAI API key is stored server-side only (`.env` file, gitignored). The client never receives or stores it.
- **Ephemeral Tokens**: Client secrets issued by OpenAI are short-lived and scoped to a single session.
- **CORS**: The backend enforces origin-based CORS to prevent unauthorized token requests.
- **Microphone Access**: Requires explicit user permission via browser's native permission prompt.
- **No Data Persistence**: Neither the client nor the backend stores conversation data, audio recordings, or user information.

---

## 7. Scalability Considerations (Post-POC)

| Concern | Current POC Approach | Production Recommendation |
|---------|---------------------|--------------------------|
| Backend scaling | Single Express process | Containerized, stateless, horizontally scalable behind a load balancer |
| Avatar rendering | Client-side Three.js | Remains client-side; consider progressive loading for low-end devices |
| AI service | Direct OpenAI API | Add usage monitoring, rate limiting, and fallback handling |
| Configuration | Hardcoded instructions | Move to a configuration service or database for multi-persona support |
| Monitoring | Console logging only | Add structured logging, APM, and real-time dashboards |
| Authentication | None (open token endpoint) | Add user authentication and session management |
