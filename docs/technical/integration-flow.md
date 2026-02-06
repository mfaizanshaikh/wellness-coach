# High-Level Integration & End-to-End Flow

**Document Type:** Integration Reference
**Version:** 1.0
**Date:** February 2026
**Status:** POC Complete
**Audience:** Engineers, Product Managers, Stakeholders

---

## 1. Purpose

This document describes the complete end-to-end flow of the Wellness Coach Avatar system in a technology-agnostic, readable manner. It traces the journey from the moment a user speaks to the moment the avatar responds with speech, expression, and gesture.

---

## 2. System Participants

| Participant | Role |
|------------|------|
| **User** | Speaks into the device microphone and watches/listens to the avatar |
| **Browser Application** | Captures audio, manages the AI connection, renders the avatar, plays responses |
| **Token Server** | Provides secure, short-lived credentials for the AI service |
| **AI Voice Service** | Listens to the user's speech, understands it, and generates a spoken response |

---

## 3. End-to-End Flow

### Phase 1: Activation

```
USER                          BROWSER                         TOKEN SERVER
  │                              │                                │
  │  Opens application           │                                │
  │─────────────────────────────►│                                │
  │                              │                                │
  │  Sees 3D avatar in a         │                                │
  │  calming dark environment    │                                │
  │  with a prompt: "Tap to      │                                │
  │  let me listen"              │                                │
  │                              │                                │
  │  Taps the screen             │                                │
  │─────────────────────────────►│                                │
  │                              │  Activates audio system        │
  │                              │  Requests microphone access    │
  │                              │                                │
  │  Grants mic permission       │                                │
  │─────────────────────────────►│                                │
  │                              │                                │
  │                              │  Requests credentials          │
  │                              │───────────────────────────────►│
  │                              │                                │
  │                              │  Receives short-lived token    │
  │                              │◄───────────────────────────────│
```

**What happens**: The user opens the application and sees the avatar. A single tap activates the system. The browser requests microphone permission and obtains a secure, short-lived credential from the token server.

---

### Phase 2: Connection Establishment

```
BROWSER                                                    AI VOICE SERVICE
  │                                                              │
  │  Creates real-time audio connection                          │
  │  Attaches microphone audio stream                            │
  │  Opens event message channel                                 │
  │                                                              │
  │  Sends connection proposal (SDP offer)                       │
  │─────────────────────────────────────────────────────────────►│
  │                                                              │
  │  Receives connection acceptance (SDP answer)                 │
  │◄─────────────────────────────────────────────────────────────│
  │                                                              │
  │  Bidirectional audio stream established                      │
  │◄════════════════════════════════════════════════════════════►│
  │                                                              │
  │  Event message channel established                           │
  │◄─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
  │                                                              │
  │  Status: "Live"                                              │
  │  Avatar begins idle animation                                │
  │  AI greets user in Urdu                                      │
```

**What happens**: The browser establishes a direct, low-latency audio connection with the AI service. Two channels are created: one for bidirectional audio streaming, and one for event messages (text transcripts, status updates). The AI proactively greets the user in Urdu.

---

### Phase 3: User Speaks

```
USER                          BROWSER                      AI VOICE SERVICE
  │                              │                              │
  │  Speaks in Urdu              │                              │
  │─────── (voice) ────────────►│                              │
  │                              │                              │
  │                              │  Microphone captures audio   │
  │                              │  Mic level meter updates     │
  │                              │                              │
  │                              │  Audio streams to AI service │
  │                              │═══════ (audio) ════════════►│
  │                              │                              │
  │                              │                              │  AI receives audio
  │                              │                              │  Transcribes Urdu speech
  │                              │                              │  Understands meaning
  │                              │                              │  and emotional context
```

**What happens**: The user simply speaks. There is no button to press. The browser captures the audio and streams it continuously to the AI service. The mic level meter provides visual feedback that the system is hearing the user. The AI service transcribes the Urdu speech and processes its meaning.

---

### Phase 4: AI Reasons and Responds

```
AI VOICE SERVICE                                           BROWSER
  │                                                          │
  │  Generates empathetic Urdu response                      │
  │  Selects appropriate tone and emotional context           │
  │  Includes gesture cues if contextually appropriate        │
  │                                                          │
  │  Streams audio response                                  │
  │═══════════════ (audio stream) ══════════════════════════►│
  │                                                          │
  │  Sends event messages (text transcript, status)          │
  │─ ─ ─ ─ ─ ─ ─ (event messages) ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─►│
  │                                                          │
  │                                                          │  Receives audio
  │                                                          │  Receives text events
```

**What happens**: The AI service generates a response following its wellness coach personality. It speaks in Urdu with empathy and cultural sensitivity. The response is streamed as audio (for the user to hear and for lip sync) and as text events (for emotion detection and gesture triggering).

---

### Phase 5: Avatar Responds

```
BROWSER (simultaneous processing)
  │
  │  ┌─────────────────────────────────────────────────┐
  │  │  AUDIO PLAYBACK                                  │
  │  │  AI audio plays through device speaker            │
  │  │  User hears the Urdu response                     │
  │  └─────────────────────────────────────────────────┘
  │
  │  ┌─────────────────────────────────────────────────┐
  │  │  LIP SYNCHRONIZATION                             │
  │  │  Audio volume analyzed in real time               │
  │  │  Volume → smoothed mouth-open value               │
  │  │  Mouth-open value → avatar mouth expressions      │
  │  │  Avatar lips move in sync with speech             │
  │  └─────────────────────────────────────────────────┘
  │
  │  ┌─────────────────────────────────────────────────┐
  │  │  BODY ANIMATION                                  │
  │  │  Avatar transitions from idle to speaking pose   │
  │  │  Head moves more actively                        │
  │  │  Arms gesture subtly                             │
  │  │  Transition is smooth, not abrupt                │
  │  └─────────────────────────────────────────────────┘
  │
  │  ┌─────────────────────────────────────────────────┐
  │  │  EMOTION EXPRESSION                              │
  │  │  Text events analyzed for emotional content       │
  │  │  Detected emotion → facial expression preset     │
  │  │  e.g., "happy" → gentle smile                    │
  │  │  e.g., "sad" → concerned expression              │
  │  │  Expression intensity fades gradually             │
  │  └─────────────────────────────────────────────────┘
  │
  │  ┌─────────────────────────────────────────────────┐
  │  │  GESTURE EXECUTION                               │
  │  │  Text events scanned for gesture keywords         │
  │  │  e.g., "nod" → avatar nods head                  │
  │  │  e.g., "wave" → avatar raises hand and waves     │
  │  │  Gesture animates over a natural duration         │
  │  └─────────────────────────────────────────────────┘
  │
  │                              USER
  │                                │
  │  Avatar speaks, moves,         │
  │  emotes, and gestures    ─────►│  Sees and hears the avatar
  │  simultaneously                │  responding naturally
```

**What happens**: Five things happen simultaneously in the browser, every frame (60 times per second):

1. **Audio plays** through the speaker so the user hears the response
2. **Lips move** in sync with the audio, driven by real-time volume analysis
3. **Body animates** with natural speaking motion (head movement, arm gestures)
4. **Face expresses** emotion appropriate to the conversation content
5. **Gestures execute** when contextually triggered (nodding, waving, etc.)

The user sees and hears a responsive, emotionally expressive avatar -- not a static model with audio.

---

### Phase 6: Return to Listening

```
AI VOICE SERVICE                  BROWSER                      USER
  │                                │                             │
  │  Audio stream ends             │                             │
  │  "Response done" event         │                             │
  │──────────────────────────────►│                             │
  │                                │                             │
  │                                │  Avatar transitions to      │
  │                                │  idle pose (smooth blend)   │
  │                                │                             │
  │                                │  Lip sync stops             │
  │                                │  Speaking gestures stop     │
  │                                │  Emotion fades gradually    │
  │                                │                             │
  │                                │  Avatar breathes, blinks,   │
  │                                │  sways gently               │
  │                                │                             │
  │                                │  System continues listening │
  │                                │  for user speech            │
  │                                │                             │
  │                                │                     ◄──────│  User speaks again
  │                                │                             │  (cycle repeats)
```

**What happens**: When the AI finishes speaking, the avatar smoothly transitions back to its idle state. It continues to breathe, blink, and sway gently -- maintaining a sense of presence. The system is immediately ready for the user to speak again. No action is required. The cycle repeats naturally.

---

## 4. Error Recovery Flow

```
BROWSER                           TOKEN SERVER / AI SERVICE
  │                                      │
  │  Connection fails or drops           │
  │  ◄──── error ──────────────────────  │
  │                                      │
  │  Status changes to "Error"           │
  │  Error message displayed             │
  │  3-second timer starts               │
  │                                      │
  │  ... 3 seconds ...                   │
  │                                      │
  │  Automatic reconnection attempt      │
  │  ─────────────────────────────────►  │
  │                                      │
  │  ┌─ If successful ─┐                │
  │  │ Status: "Live"   │                │
  │  │ Resume normal    │                │
  │  └─────────────────┘                 │
  │                                      │
  │  ┌─ If failed ─────┐                │
  │  │ Wait 3 seconds  │                │
  │  │ Try again       │                │
  │  └─────────────────┘                 │
```

**What happens**: If the connection fails at any point, the system displays an error and automatically attempts to reconnect after 3 seconds. This continues until the connection is restored or the user manually stops the session. The user does not need to reload the page.

---

## 5. Complete Lifecycle Summary

| Step | Action | Latency | Technology |
|------|--------|---------|-----------|
| 1 | User taps to activate | Instant | Browser event |
| 2 | Microphone activated | ~200ms | Browser MediaDevices API |
| 3 | Token fetched | ~300-500ms | HTTP to local server, then HTTPS to OpenAI |
| 4 | Audio connection established | ~500-1000ms | WebRTC SDP negotiation |
| 5 | User speaks | Continuous | Microphone → WebRTC audio track |
| 6 | Speech transcribed | ~100-300ms | OpenAI Urdu transcription |
| 7 | AI generates response | ~500-1500ms | OpenAI reasoning engine |
| 8 | Audio response streams | Continuous | WebRTC audio track |
| 9 | Lip sync driven | Per-frame (~16ms) | Web Audio API → Three.js |
| 10 | Emotion detected | Per-message | Regex text analysis |
| 11 | Gesture triggered | Per-message | Keyword matching |
| 12 | Avatar animates | Per-frame (~16ms) | Three.js bone manipulation |
| 13 | Response ends, return to idle | Smooth transition | Animation blending |

**Total perceived latency** (user stops speaking → avatar starts responding): **~1-2 seconds**, dominated by AI processing time. All other latencies are sub-frame or imperceptible.
