# POC Scope & Minimum Features

**Document Type:** Scope Definition
**Version:** 1.0
**Date:** February 2026
**Status:** POC Complete

---

## 1. Purpose

This document defines the minimum viable feature set for the Proof of Concept (POC) of the Wellness Coach Avatar. Features are listed in priority order with justifications. The document clearly separates what is in scope for the POC from what is deferred to future iterations.

---

## 2. POC Objective

Demonstrate that a browser-based, always-on, Urdu-speaking AI wellness coach with an animated 3D avatar is **technically feasible**, **emotionally engaging**, and **worth further investment**.

The POC is not intended to be production-ready. It is intended to answer these questions:

1. Can we achieve low-latency voice conversation in Urdu through a browser?
2. Does an animated avatar meaningfully enhance the experience over text or audio alone?
3. Is the emotional expressiveness (lip sync, expressions, gestures) convincing enough to create a sense of presence?
4. Is the architecture viable for scaling to production?

---

## 3. Must-Have POC Features (Priority Order)

### P1: Real-Time Urdu Voice Conversation

**What**: Bidirectional voice streaming between the user and an AI that speaks and understands Urdu.

**Why**: This is the core value proposition. Without real-time voice in Urdu, there is no product. This validates the most critical technical dependency (OpenAI Realtime API with Urdu support).

**POC Implementation**: WebRTC connection to OpenAI Realtime API with Urdu transcription model (gpt-4o-mini-transcribe, language: ur).

---

### P2: 3D Avatar Rendering

**What**: A VRM-format 3D avatar rendered in the browser using Three.js, positioned in a visually appealing scene with lighting and backdrop.

**Why**: The avatar is the product's primary differentiator from text chatbots and voice-only assistants. Its visual presence is hypothesized to create a stronger emotional connection. The POC must validate this hypothesis.

**POC Implementation**: Three.js scene with VRM loader, hemisphere + directional lighting, floor plane, and gradient backdrop shader.

---

### P3: Lip Synchronization

**What**: The avatar's mouth moves in sync with the AI's spoken audio output.

**Why**: Lip sync is the minimum requirement for the avatar to feel "alive" during speech. Without it, the avatar appears static and the visual element adds no value.

**POC Implementation**: Web Audio API analyser extracts RMS from remote audio stream. RMS is smoothed and mapped to VRM mouth expression presets and jaw bone rotation.

---

### P4: Always-On Interaction (No Push-to-Talk)

**What**: After a single tap to activate, the system continuously listens and responds without requiring any further user action.

**Why**: Push-to-talk creates friction that undermines the "companion" experience. The wellness coach should feel like a present listener, not a transactional tool. This is a key UX differentiator.

**POC Implementation**: Persistent WebRTC audio tracks in both directions. Microphone remains active throughout the session.

---

### P5: Idle Animation System

**What**: When the AI is not speaking, the avatar exhibits subtle lifelike behavior: breathing, blinking, slight head movement.

**Why**: A static avatar during silence breaks immersion. Idle animation maintains the sense that the avatar is a living, present entity waiting attentively.

**POC Implementation**: Sine-wave-driven spine, head, and arm oscillations. Randomized blink timing (3-5 second interval, 0.2 second blink duration).

---

### P6: Session Management

**What**: Status display (Idle, Connecting, Live, Error), automatic reconnection on failure, and manual Stop/Resume controls.

**Why**: Network interruptions are inevitable, especially in Pakistan's connectivity landscape. Auto-reconnect prevents users from having to reload the page. Status display builds trust by keeping users informed.

**POC Implementation**: React state for status, 3-second auto-retry timer, Stop/Resume buttons, error display.

---

### P7: Audio Priming (One-Tap Activation)

**What**: A single-tap overlay that unlocks the browser's AudioContext and microphone.

**Why**: Modern browsers require a user gesture to activate audio. This is a technical necessity, but it is designed to feel intentional ("Tap to let me listen") rather than like a workaround.

**POC Implementation**: Overlay with prompt text. On tap: resume AudioContext, request microphone, set primed state, trigger session start.

---

### P8: Wellness Coach AI Personality

**What**: The AI behaves as an empathetic, culturally aware Urdu wellness coach, not a generic assistant.

**Why**: The AI personality is what transforms a generic voice chatbot into a wellness product. The system prompt must be carefully crafted to establish tone, cultural sensitivity, language constraints, and behavioral boundaries.

**POC Implementation**: Comprehensive system prompt configured server-side, including Urdu-only language rule, cultural sensitivity guidelines, wellness coaching boundaries, and gesture tag instructions.

---

### P9: Secure Token Brokering

**What**: A backend endpoint that issues ephemeral client tokens without exposing the API key to the browser.

**Why**: Security is non-negotiable even in a POC. Exposing the API key in client-side code would allow abuse.

**POC Implementation**: Express endpoint calls OpenAI's client_secrets API with the server-side key, returns ephemeral token to client.

---

## 4. Should-Have POC Features (Implemented)

These features were implemented in the POC because they were achievable with low effort and significantly enhance the demonstration:

### S1: Emotion-Reactive Facial Expressions

**What**: The avatar's facial expression changes based on the emotional content of the AI's responses (happy, sad, surprised).

**Why**: Demonstrates the avatar's capacity for emotional intelligence beyond lip sync. Validates that expression-based engagement is feasible.

**Implementation**: Regex-based text analysis of AI data channel messages. Detected emotions mapped to VRM expression presets with intensity decay.

---

### S2: Gesture System

**What**: The avatar performs body gestures (wave, nod, tilt, shrug, dance, eyes closed, cover eyes) triggered by AI response keywords or randomly during idle.

**Why**: Body language significantly enhances the avatar's personality and sense of presence. Demonstrates a path to richer avatar behavior.

**Implementation**: Keyword detection in AI text, gesture definitions with duration, bone animation with damped transitions.

---

### S3: Microphone Level Meter

**What**: A visual meter showing real-time microphone input level.

**Why**: Provides immediate feedback that the system is hearing the user, building confidence that the always-on listening is working.

**Implementation**: Local Web Audio analyser, RMS extraction, CSS transform on a meter element.

---

### S4: Speaking/Idle Pose Blending

**What**: Smooth animated transition between idle body pose and active speaking body pose (more head movement, arm gesticulation).

**Why**: Without blending, the avatar would snap between poses. Smooth transitions are essential for believability.

**Implementation**: `THREE.MathUtils.damp` with configurable smoothing factors per bone.

---

## 5. Out of Scope (Future Features)

These features are explicitly excluded from the POC. They are captured here for future planning.

### Tier 1: Next Iteration (High Value)

| Feature | Rationale for Deferral |
|---------|----------------------|
| **User authentication** | POC is single-user, local-only. Auth adds complexity without POC value. |
| **Conversation memory** | Requires persistent storage and session management. Deferred to validate core experience first. |
| **Mobile optimization** | POC targets desktop browsers. Mobile requires touch UX, performance optimization, and testing. |
| **Crisis detection and escalation** | Requires careful design, legal review, and partnership with crisis services. Too sensitive for an unvalidated POC. |
| **Phoneme-based lip sync** | Current RMS-based sync is adequate for POC. Phoneme sync requires additional ML pipeline. |
| **NLP-based emotion detection** | Current regex approach is sufficient for demo. Production needs proper sentiment analysis. |

### Tier 2: Medium-Term (Product Growth)

| Feature | Rationale for Deferral |
|---------|----------------------|
| **Multiple avatar options** | Single avatar sufficient for POC validation |
| **Mood tracking and journaling** | Requires data persistence, UI, and analytics |
| **Multi-language support** | Urdu-only is the POC constraint; expanding later |
| **Configurable AI personalities** | Single personality validates the concept |
| **Push notifications** | Requires native app or PWA infrastructure |
| **Analytics dashboard** | No operators or administrators in POC |

### Tier 3: Long-Term (Platform)

| Feature | Rationale for Deferral |
|---------|----------------------|
| **Offline mode** | Requires on-device AI, far beyond current scope |
| **Group sessions** | Fundamentally different product architecture |
| **Third-party integrations** (health apps, calendars) | Requires partnerships and API development |
| **Custom avatar creation** | Requires 3D modeling pipeline |
| **Therapist handoff** | Requires healthcare partner ecosystem |

---

## 6. POC Deliverables Summary

| Deliverable | Status |
|-------------|--------|
| Working browser application with 3D avatar | Complete |
| Real-time Urdu voice conversation | Complete |
| Lip-synced avatar animation | Complete |
| Idle animations (breathing, blinking) | Complete |
| Emotion-reactive facial expressions | Complete |
| Body gesture system | Complete |
| Always-on interaction (no push-to-talk) | Complete |
| Auto-reconnect on failure | Complete |
| Session controls (Stop/Resume) | Complete |
| Secure token brokering backend | Complete |
| Documentation suite | Complete |
