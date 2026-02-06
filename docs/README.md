# Wellness Coach Avatar - POC Documentation

## Document Index

This repository contains all professional documentation for the **Always-On Urdu-Speaking Wellness Coach Avatar** Proof of Concept (POC).

---

### Architecture Documentation

| Document | Path | Description |
|----------|------|-------------|
| High-Level Design & Architecture | [architecture/high-level-design.md](architecture/high-level-design.md) | System design, component responsibilities, and architectural decisions |
| Architecture Diagram Description | [architecture/architecture-diagram.md](architecture/architecture-diagram.md) | Logical architecture, data flow, control flow, and real-time pipeline |
| Tools, Technologies & Services | [architecture/tools-and-technologies.md](architecture/tools-and-technologies.md) | Complete inventory of tools, SDKs, APIs, and services with POC vs. production suitability |

### Product Documentation

| Document | Path | Description |
|----------|------|-------------|
| Business Requirements Document (BRD) | [product/brd.md](product/brd.md) | Business goals, target users, problem statement, success criteria |
| Product Requirements Document (PRD) | [product/prd.md](product/prd.md) | User personas, journeys, functional and non-functional requirements |
| POC Scope & Minimum Features | [product/poc-scope.md](product/poc-scope.md) | Prioritized feature list, must-haves vs. future scope |

### Technical Documentation

| Document | Path | Description |
|----------|------|-------------|
| Technical Design Document (TDD) | [technical/tdd.md](technical/tdd.md) | Component-level overview, API responsibilities, data flow, error handling |
| Integration & End-to-End Flow | [technical/integration-flow.md](technical/integration-flow.md) | Step-by-step walkthrough of the complete user interaction pipeline |

---

### Folder Structure

```
docs/
├── README.md                              # This file - document index
├── architecture/
│   ├── high-level-design.md               # System design & architecture
│   ├── architecture-diagram.md            # Architecture diagram description
│   └── tools-and-technologies.md          # Tools, technologies & services
├── product/
│   ├── brd.md                             # Business Requirements Document
│   ├── prd.md                             # Product Requirements Document
│   └── poc-scope.md                       # POC scope & minimum features
└── technical/
    ├── tdd.md                             # Technical Design Document
    └── integration-flow.md                # Integration & end-to-end flow
```

---

### Audience

- **Non-technical stakeholders**: Start with [product/brd.md](product/brd.md) and [product/poc-scope.md](product/poc-scope.md)
- **Product managers**: Read [product/prd.md](product/prd.md) and [architecture/high-level-design.md](architecture/high-level-design.md)
- **Engineers**: Focus on [technical/tdd.md](technical/tdd.md), [technical/integration-flow.md](technical/integration-flow.md), and [architecture/](architecture/) docs

---

## Setup & Run (POC)

- **Prerequisites**: Node.js 18+ and npm; OpenAI API access with realtime + TTS + Whisper endpoints enabled.
- **Environment**: create `.env` in repo root with at minimum `OPENAI_API_KEY=<your-key>`. Optional: `FRONTEND_ORIGIN=http://localhost:5173`, `OPENAI_REALTIME_MODEL=gpt-realtime`, `OPENAI_REALTIME_VOICE=marin`.
- **Install dependencies**: `npm install`
- **Start backend (token/orchestration server)**: `npm run server` (defaults to port 3001)
- **Start frontend (Vite dev server)**: in a second terminal run `npm run dev` (defaults to http://localhost:5173)
- **Avatar asset**: ensure `public/avatar.vrm` exists; replace with your VRM to change the character.
- **First interaction**: on page load, tap the “Tap to let me listen” overlay once to unlock AudioContext (browser gesture requirement). The avatar should greet in Urdu automatically and stay always-listening.

### Document Version

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Date | February 2026 |
| Status | POC Complete |
| Author | Engineering Team |
