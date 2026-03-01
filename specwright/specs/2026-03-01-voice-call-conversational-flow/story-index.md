# Story Index

> Spec: Voice Call Conversational Flow
> Created: 2026-03-01
> Last Updated: 2026-03-01 (Technical Refinement complete)

## Overview

This document provides an overview of all user stories for the Voice Call Conversational Flow specification.

**Total Stories**: 14 (11 Feature + 3 System)
**Estimated Effort**: 43 SP

---

## Story Summary

| Story ID | Title | Type | Priority | Dependencies | Status | Points |
|----------|-------|------|----------|--------------|--------|--------|
| VCF-001 | Voice Configuration & API Key Management | Full-stack | High | None | Ready | 3 |
| VCF-002 | Audio Adapters Setup | Backend | High | VCF-001 | Ready | 3 |
| VCF-003 | STT Pipeline | Full-stack | Critical | VCF-002 | Ready | 5 |
| VCF-004 | TTS Pipeline | Full-stack | Critical | VCF-002 | Ready | 5 |
| VCF-005 | Agent Conversation Engine | Backend | Critical | VCF-003, VCF-004 | Ready | 5 |
| VCF-006 | Voice Call View & Navigation | Frontend | High | VCF-005 | Ready | 5 |
| VCF-007 | Audio Visualizer & Call Controls | Frontend | High | VCF-006 | Ready | 3 |
| VCF-008 | Live Action Log & Transcript UI | Frontend | High | VCF-006 | Ready | 3 |
| VCF-009 | Team Card Call Integration | Frontend | High | VCF-006 | Ready | 2 |
| VCF-010 | Text Fallback & Input Mode Switching | Frontend | Medium | VCF-007 | Ready | 3 |
| VCF-011 | Transcript Storage & Voice Personas | Full-stack | Medium | VCF-005 | Ready | 3 |
| VCF-997 | Code Review | System | - | All regular stories | Ready | 1 |
| VCF-998 | Integration Validation | System | - | VCF-997 | Ready | 1 |
| VCF-999 | Finalize PR | System | - | VCF-998 | Ready | 1 |

---

## Dependency Graph

```
Phase 1: Infrastructure
VCF-001 (Config)
    |
    v
VCF-002 (Adapters)
    |
    +--------+
    v        v
Phase 2: Core Pipeline
VCF-003    VCF-004
(STT)      (TTS)
    \       /
     v     v
VCF-005 (Conversation Engine)
    |
    +--------+--------+--------+
    v        v        v        v
Phase 3: Call UI
VCF-006  VCF-011
(View)   (Transcript Storage)
    |
    +--------+--------+
    v        v        v
VCF-007  VCF-008  VCF-009
(Visual) (Logs)   (Team Card)
    |
    v
Phase 4: Polish
VCF-010 (Text Fallback)

System Stories (after all regular):
VCF-997 (Code Review) → VCF-998 (Integration) → VCF-999 (Finalize PR)
```

---

## Execution Plan

### Phase 1: Infrastructure (Sequential)
1. VCF-001: Voice Configuration & API Key Management
2. VCF-002: Audio Adapters Setup

### Phase 2: Core Pipeline (Partially Parallel)
3. VCF-003: STT Pipeline (depends on VCF-002)
4. VCF-004: TTS Pipeline (depends on VCF-002, parallel with VCF-003)
5. VCF-005: Agent Conversation Engine (depends on VCF-003 + VCF-004)

### Phase 3: Call UI (Partially Parallel)
6. VCF-006: Voice Call View & Navigation (depends on VCF-005)
7. VCF-007: Audio Visualizer & Call Controls (depends on VCF-006)
8. VCF-008: Live Action Log & Transcript UI (depends on VCF-006, parallel with VCF-007)
9. VCF-009: Team Card Call Integration (depends on VCF-006, parallel with VCF-007/008)
10. VCF-011: Transcript Storage & Voice Personas (depends on VCF-005, parallel with Phase 3)

### Phase 4: Polish (Sequential)
11. VCF-010: Text Fallback & Input Mode Switching (depends on VCF-007)

### System Stories (Sequential, after all regular)
12. VCF-997: Code Review
13. VCF-998: Integration Validation
14. VCF-999: Finalize PR

---

## Story Files

Individual story files are located in the `stories/` subdirectory:

- `stories/story-001-voice-configuration-api-key-management.md`
- `stories/story-002-audio-adapters-setup.md`
- `stories/story-003-stt-pipeline.md`
- `stories/story-004-tts-pipeline.md`
- `stories/story-005-agent-conversation-engine.md`
- `stories/story-006-voice-call-view-navigation.md`
- `stories/story-007-audio-visualizer-call-controls.md`
- `stories/story-008-live-action-log-transcript-ui.md`
- `stories/story-009-team-card-call-integration.md`
- `stories/story-010-text-fallback-input-mode-switching.md`
- `stories/story-011-transcript-storage-voice-personas.md`
- `stories/story-997-code-review.md`
- `stories/story-998-integration-validation.md`
- `stories/story-999-finalize-pr.md`

---

## Blocked Stories

Keine blockierten Stories. Alle Stories haben vollstaendige DoR (Technical Refinement abgeschlossen).

---

## Technical Refinement Summary

Alle 11 regulaeren Stories wurden technisch verfeinert mit:
- DoR: Alle Checkboxen [x] complete
- DoD: Definiert pro Story
- Betroffene Layer & Komponenten: Identifiziert
- WAS/WIE/WO: Ausgefuellt
- Completion Checks: Bash-Kommandos definiert
- Relevante Skills: 1-2 pro Story zugeordnet
- Creates Reusable: Markiert (7 Stories erzeugen wiederverwendbare Artefakte)

**Neue Backend-Artefakte:** VoiceConfigService, DeepgramAdapter, ElevenLabsAdapter, VoiceCallService, TranscriptService, voice.protocol.ts
**Neue Frontend-Artefakte:** AudioCaptureService, AudioPlaybackService, aos-voice-call-view, aos-audio-visualizer, aos-call-controls, aos-action-log, aos-call-transcript
