# Wellness Coach Avatar

Your personal AI wellness coach -- an always-on, Urdu-speaking 3D avatar that listens, understands, and helps you through stress, anxiety, and the emotional weight of daily life.

Built for the **millions of people in Pakistan** who deal with stress every day but have no affordable, stigma-free, private space to talk about it.

> No typing. No scheduling. No judgment. Just speak -- and your coach responds.

---

## Preview

### Desktop

![Desktop view of the Wellness Coach Avatar](public/website.png)

### Mobile

<p align="center">
  <img src="public/mobile_website.png" alt="Mobile view of the Wellness Coach Avatar" width="300" />
</p>

---

## The Problem

Mental health support in Pakistan is expensive, scarce, and carries deep social stigma. Most digital wellness tools are English-only and text-based -- they don't serve the people who need them most.

- **230 million** Urdu speakers worldwide with almost no digital wellness tools in their language
- **Stigma** prevents people from seeking help from family, friends, or professionals
- **Cost and access** put therapy out of reach for the majority
- **Text chatbots** feel cold and impersonal -- they don't create the trust needed for emotional conversations

## The Solution

A 3D animated avatar that you can **talk to naturally in Urdu**. It listens to your voice, responds with empathy, and expresses itself through facial expressions and body language -- creating a sense of presence that text alone cannot achieve.

- **Always listening** -- one tap to activate, then just speak freely
- **Speaks and understands Urdu** -- your mother tongue, not a translation
- **Emotionally expressive** -- the avatar smiles, nods, tilts its head, and reacts to what you say
- **Culturally aware** -- understands family pressure, financial stress, social anxiety, and loneliness common in Pakistan
- **Completely private** -- no conversations are recorded or stored. Ever.

---

## Features

| Feature | Description |
|---------|-------------|
| **Real-time Urdu voice conversation** | Speak naturally and hear responses instantly -- no typing required |
| **3D animated avatar** | A lifelike VRM avatar rendered in your browser with Three.js |
| **Lip synchronization** | Mouth moves in sync with the avatar's speech |
| **Facial expressions** | Avatar reacts with happiness, concern, surprise based on conversation |
| **Body gestures** | Nods, waves, shrugs, tilts head, and more -- triggered by context |
| **Idle animations** | Breathing, blinking, subtle movement -- the avatar feels alive even in silence |
| **Always-on listening** | No push-to-talk. After one tap, the coach is always ready |
| **Auto-reconnect** | If the connection drops, it automatically retries |
| **Zero data storage** | Nothing is saved -- your conversations stay between you and the avatar |

---

## How It Works

```
You speak (Urdu) ──► Microphone captures audio ──► Streams to AI via WebRTC
                                                           │
         You see and hear the avatar ◄── Avatar animates ◄─┘
         respond with speech, emotion,    (lip sync, expressions,
         and body language                 gestures, body movement)
```

1. **You speak** into your microphone in Urdu
2. **Audio streams** in real time to OpenAI's Realtime API via WebRTC
3. **AI understands** your speech, your emotion, and your context
4. **AI responds** with an empathetic Urdu voice response
5. **Avatar comes alive** -- lips sync to speech, face shows emotion, body gestures match the conversation
6. **You speak again** whenever you want -- no button needed

---

## Quick Start

### Prerequisites

- **Node.js** 18+
- **OpenAI API key** with Realtime API access
- **Chrome 90+** or **Edge 90+**
- A **microphone**

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/mfaizanshaikh/wellness-coach.git
cd wellness-coach

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env and add your OpenAI API key:
# OPENAI_API_KEY=sk-your-key-here

# 4. Start the backend (terminal 1)
npm run server

# 5. Start the frontend (terminal 2)
npm run dev
```

Open **http://localhost:5173** in your browser. Tap the screen, allow your microphone, and start talking.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | -- | Your OpenAI API key |
| `OPENAI_REALTIME_MODEL` | No | `gpt-realtime` | AI conversation model |
| `OPENAI_REALTIME_VOICE` | No | `marin` | Voice for AI responses |
| `OPENAI_REALTIME_INSTRUCTIONS` | No | Urdu wellness coach | Custom system prompt (overrides default) |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173` | CORS allowed origin |
| `PORT` | No | `3001` | Backend server port |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Three.js, @pixiv/three-vrm |
| **Backend** | Node.js, Express |
| **AI** | OpenAI Realtime API (WebRTC), gpt-4o-mini-transcribe (Urdu) |
| **Build** | Vite 5 |
| **Avatar** | VRM format (industry standard for 3D humanoid avatars) |

---

## Project Structure

```
wellness-coach/
├── src/
│   ├── App.jsx          # All frontend logic (scene, audio, animation, WebRTC)
│   ├── main.jsx         # React entry point
│   └── styles.css       # Dark theme UI styles
├── server/
│   └── index.js         # Token server (secure API key broker)
├── public/
│   └── avatar.vrm       # 3D avatar model (replace with your own)
├── docs/                # Full documentation suite (BRD, PRD, TDD, architecture)
├── .env.example         # Environment variable template
├── package.json
└── vite.config.js
```

---

## Documentation

Comprehensive professional documentation is available in the [`docs/`](docs/) folder:

| Document | Description |
|----------|-------------|
| [High-Level Design](docs/architecture/high-level-design.md) | System architecture and design decisions |
| [Architecture Diagrams](docs/architecture/architecture-diagram.md) | Data flow, control flow, and real-time pipeline |
| [Tools & Technologies](docs/architecture/tools-and-technologies.md) | Full tech inventory with production readiness |
| [Business Requirements (BRD)](docs/product/brd.md) | Business goals, market opportunity, success criteria |
| [Product Requirements (PRD)](docs/product/prd.md) | User personas, journeys, functional requirements |
| [POC Scope](docs/product/poc-scope.md) | Prioritized features and future roadmap |
| [Technical Design (TDD)](docs/technical/tdd.md) | Component internals, API design, error handling |
| [Integration Flow](docs/technical/integration-flow.md) | End-to-end interaction walkthrough |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Status stuck on "Connecting" | Check backend is running on port 3001 and API key is valid |
| "Failed to fetch client secret" | Verify `OPENAI_API_KEY` in `.env` has Realtime API access |
| No audio from avatar | Ensure you tapped the prime overlay; check browser tab isn't muted |
| Avatar not visible | Confirm `public/avatar.vrm` exists and is a valid VRM file |
| Microphone not working | Check browser permissions (click lock icon in address bar) |
| Repeated "Error" status | Network issue or API outage; auto-retries every 3 seconds |

---

## Current Status

This is a **Proof of Concept (POC)** -- a working demonstration that validates the core experience. It is not yet production-ready.

**What works today:**
- Real-time Urdu voice conversation with an animated avatar
- Lip sync, facial expressions, body gestures, idle animations
- Always-on listening with auto-reconnect
- Secure token brokering (API key never exposed to browser)

**What's next:**
- User authentication and session memory
- Mobile-optimized experience
- Crisis detection and helpline referral
- Multiple avatar choices
- Mood tracking over time
- Multi-language support (Punjabi, Sindhi, Pashto)

---

## Disclaimer

This application is a **wellness coach**, not a medical or clinical tool. It does not provide diagnoses, prescriptions, or emergency intervention. If you or someone you know is in crisis, please reach out to a trusted person or a professional helpline.

---

## License

This project is private and not currently licensed for public distribution.
