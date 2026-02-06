# Product Requirements Document (PRD)

**Document Type:** Product Requirements
**Version:** 1.0
**Date:** February 2026
**Status:** POC Complete
**Prepared For:** Product Managers, Engineers, Designers

---

## 1. Overview

This document defines the user personas, user journeys, and functional and non-functional requirements for the **Always-On Urdu-Speaking Wellness Coach Avatar**. It covers the POC scope and identifies requirements for future iterations.

---

## 2. User Personas

### Persona 1: Aisha -- The Stressed Professional

| Attribute | Detail |
|-----------|--------|
| **Age** | 28 |
| **Location** | Karachi, Pakistan |
| **Occupation** | Marketing coordinator at a mid-size firm |
| **Language** | Native Urdu speaker; functional English |
| **Technology** | Uses a smartphone and laptop daily; comfortable with apps |
| **Situation** | Experiences daily work stress, pressure from family about marriage, difficulty sleeping. Feels she cannot discuss personal problems with colleagues or family. |
| **Need** | A private, judgment-free space to talk through her feelings in Urdu without scheduling an appointment or telling anyone. |
| **Behavior** | Would use the tool in the evening after work, speaking quietly in her room. Prefers voice over typing because she wants to "talk it out." |
| **Quote** | "I just want someone to listen without telling me what to do." |

### Persona 2: Hassan -- The Isolated Student

| Attribute | Detail |
|-----------|--------|
| **Age** | 21 |
| **Location** | Lahore, Pakistan (university hostel) |
| **Occupation** | University student (engineering) |
| **Language** | Native Urdu; uses English for academic work |
| **Technology** | Smartphone-primary; limited laptop access |
| **Situation** | Away from home for the first time. Feels lonely, homesick, and overwhelmed by academic pressure. Cultural norms discourage him from expressing vulnerability to peers. |
| **Need** | An always-available companion that feels present and engaging, not just a text chatbot. |
| **Behavior** | Would use the tool late at night when roommates are asleep. The avatar's visual presence matters -- it makes the experience feel less like talking to a machine. |
| **Quote** | "A chatbot feels empty. I want to feel like someone is actually there." |

### Persona 3: Fatima -- The Homemaker

| Attribute | Detail |
|-----------|--------|
| **Age** | 42 |
| **Location** | Rawalpindi, Pakistan |
| **Occupation** | Homemaker managing a household of six |
| **Language** | Urdu only; minimal English |
| **Technology** | Basic smartphone; uses WhatsApp and YouTube |
| **Situation** | Carries the emotional weight of the family. No time or social permission to seek personal support. Experiences chronic low-level anxiety about finances and children's futures. |
| **Need** | Something extremely simple to use in Urdu -- no English menus, no complex interfaces. Just speak and be heard. |
| **Behavior** | Would use the tool during quiet moments (early morning, afternoon rest). Voice interaction is essential because she is not comfortable typing. |
| **Quote** | "I take care of everyone else. No one asks how I am." |

---

## 3. User Journeys

### Journey 1: First-Time Activation

```
1. User opens the application in a web browser
2. User sees the 3D avatar in a dark, calming environment
3. A centered card prompts: "Tap to let me listen"
4. User taps the screen
5. Browser requests microphone permission; user grants it
6. Status changes from "Idle" to "Connecting" to "Live"
7. The avatar begins subtle idle movements (breathing, blinking)
8. The avatar greets the user proactively in Urdu
9. User is now in an active, always-on conversation
```

**Key Design Decision**: The single-tap activation is intentional. It satisfies the browser's audio autoplay policy while minimizing friction. After this single tap, no further user actions are needed to converse.

### Journey 2: Ongoing Conversation

```
1. User speaks naturally in Urdu
2. The mic-level meter shows their voice is being captured
3. After a brief pause, the avatar begins responding in Urdu
4. The avatar's mouth moves in sync with its speech
5. The avatar's facial expression reflects the emotional tone
   (e.g., gentle smile when greeting, concerned look when user is sad)
6. If the AI mentions a gesture-related concept, the avatar performs it
   (e.g., nodding when agreeing, waving when saying hello)
7. When the avatar finishes speaking, it returns to a calm idle pose
8. The user can speak again at any time -- no button press needed
```

### Journey 3: Connection Interruption

```
1. User is in an active conversation
2. Network connection drops
3. Status changes to "Error" with a brief error message
4. System automatically attempts to reconnect after 3 seconds
5. If reconnection succeeds, status returns to "Live"
6. If reconnection fails, system retries again
7. User can also manually press "Resume" to trigger reconnection
```

### Journey 4: Session End

```
1. User decides to stop the conversation
2. User presses the "Stop" button in the header
3. All audio streams and connections are closed
4. Status returns to "Idle"
5. Avatar returns to idle state (breathing, blinking)
6. User can press "Resume" to start a new session
7. Closing the browser tab ends the session completely
```

---

## 4. Functional Requirements

### 4.1 Voice Interaction

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-V1 | The system shall capture user voice input via the device microphone | Must-have | Implemented |
| FR-V2 | The system shall stream audio to the AI service in real time via WebRTC | Must-have | Implemented |
| FR-V3 | The system shall play AI audio responses through the device speaker | Must-have | Implemented |
| FR-V4 | The system shall operate in always-on mode -- no push-to-talk required | Must-have | Implemented |
| FR-V5 | All AI responses shall be in Urdu | Must-have | Implemented |
| FR-V6 | The system shall transcribe user speech using Urdu-optimized transcription | Must-have | Implemented |
| FR-V7 | If a user speaks in a non-Urdu language, the AI shall gently redirect to Urdu | Must-have | Implemented (via system prompt) |

### 4.2 Avatar & Animation

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-A1 | The system shall render a 3D VRM avatar in the browser | Must-have | Implemented |
| FR-A2 | The avatar shall display lip synchronization matched to AI audio output | Must-have | Implemented |
| FR-A3 | The avatar shall exhibit idle animations (breathing, blinking) when not speaking | Must-have | Implemented |
| FR-A4 | The avatar shall display facial expressions based on detected conversation emotion | Should-have | Implemented |
| FR-A5 | The avatar shall perform body gestures triggered by conversation content | Should-have | Implemented |
| FR-A6 | Transitions between idle and speaking states shall be visually smooth | Must-have | Implemented |
| FR-A7 | The avatar shall perform random idle gestures during periods of silence | Nice-to-have | Implemented |

### 4.3 Session Management

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-S1 | The system shall require a single user tap to activate audio and microphone | Must-have | Implemented |
| FR-S2 | The system shall automatically reconnect on connection failure | Must-have | Implemented |
| FR-S3 | The system shall provide a "Stop" button to end the session | Must-have | Implemented |
| FR-S4 | The system shall provide a "Resume" button to restart a stopped session | Must-have | Implemented |
| FR-S5 | The system shall display current connection status (Idle, Connecting, Live, Error) | Must-have | Implemented |
| FR-S6 | The system shall display error messages when connection fails | Must-have | Implemented |

### 4.4 Audio Feedback

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-AF1 | The system shall display a real-time microphone level meter | Should-have | Implemented |

### 4.5 AI Personality

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-P1 | The AI shall behave as a calm, empathetic wellness coach | Must-have | Implemented (via system prompt) |
| FR-P2 | The AI shall be sensitive to culturally common stressors (family, finance, social) | Must-have | Implemented (via system prompt) |
| FR-P3 | The AI shall not provide clinical diagnoses or medical advice | Must-have | Implemented (via system prompt) |
| FR-P4 | The AI shall proactively greet the user when a session begins | Should-have | Implemented (via system prompt) |
| FR-P5 | The AI shall include gesture tags in responses when contextually appropriate | Should-have | Implemented (via system prompt) |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-P1 | Perceived response latency (user stops speaking → avatar starts responding) | < 2 seconds | Met (dependent on OpenAI API) |
| NFR-P2 | Avatar animation frame rate | 60fps on modern devices | Met |
| NFR-P3 | Lip sync latency (audio playback → visible mouth movement) | < 1 frame (16ms) | Met |
| NFR-P4 | Initial page load time (excluding VRM model) | < 3 seconds | Met |
| NFR-P5 | VRM model load time | < 5 seconds (model-size dependent) | Met |

### 5.2 Reliability

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-R1 | Automatic reconnection on connection failure | Within 3 seconds of detection | Implemented |
| NFR-R2 | Graceful handling of missing microphone | Display clear error message | Implemented |
| NFR-R3 | Graceful handling of missing VRM model | Display clear error message | Implemented |

### 5.3 Security & Privacy

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-S1 | API key must never be exposed to the client | Server-side only | Implemented |
| NFR-S2 | No conversation data shall be persisted | Zero storage | Implemented |
| NFR-S3 | No audio recordings shall be stored | Zero storage | Implemented |
| NFR-S4 | CORS shall restrict token endpoint access | Origin-based restriction | Implemented |

### 5.4 Usability

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-U1 | Single action to activate (one tap) | One tap | Implemented |
| NFR-U2 | No text input required | Voice-only interaction | Implemented |
| NFR-U3 | Visually calming, dark-themed interface | Dark color scheme | Implemented |
| NFR-U4 | Responsive layout for different screen sizes | Desktop + tablet | Partially (CSS responsive, not mobile-optimized) |

### 5.5 Compatibility

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-C1 | Browser support | Chrome 90+, Edge 90+ | Met |
| NFR-C2 | WebRTC support | Required | Met (browser-native) |
| NFR-C3 | WebGL support | Required for avatar rendering | Met |

---

## 6. Future Requirements (Out of POC Scope)

| ID | Requirement | Rationale |
|----|-------------|-----------|
| FUT-1 | User authentication and accounts | Enable personalized experiences and session history |
| FUT-2 | Conversation memory across sessions | Build deeper rapport and continuity |
| FUT-3 | Multiple avatar choices | Personalization and user preference |
| FUT-4 | Mood tracking and visualization | Show users their emotional patterns over time |
| FUT-5 | Mobile-native application | Better performance and push notification support |
| FUT-6 | Offline fallback mode | Basic functionality without internet |
| FUT-7 | Multi-language support (Punjabi, Sindhi, Pashto) | Broader reach across Pakistan's linguistic diversity |
| FUT-8 | Crisis detection and escalation | Detect severe distress and provide helpline information |
| FUT-9 | Analytics dashboard for operators | Usage patterns, engagement metrics, common topics |
| FUT-10 | Configurable AI personalities | Different coaching styles for different needs |
