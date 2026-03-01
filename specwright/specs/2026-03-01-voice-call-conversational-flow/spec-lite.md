# Voice Call Conversational Flow - Lite Summary

> Created: 2026-03-01
> Full Spec: specwright/specs/2026-03-01-voice-call-conversational-flow/spec.md

1:1 Voice Calls mit Specwright Agents in der Web UI. User kann Teammitglieder direkt anrufen, per Sprache kommunizieren, und der Agent kann waehrend des Gespraechs Aktionen ausfuehren. Nutzt Deepgram STT, ElevenLabs TTS, und bestehende Claude CLI Integration.

## Key Points

- Vollbild Call-View mit Agent-Avatar und Audio-Wellenform
- Deepgram Nova-3 STT + ElevenLabs Streaming TTS (serverseitig)
- Agent fuehrt waehrend des Calls Aktionen aus (Code, Dateien, Specs)
- Text-Fallback bei fehlendem Mikrofon
- Rollenbasierte Stimm-Personas pro Agent-Typ

## Quick Reference

- **Status**: Planning
- **Stories**: 11 Feature Stories + 3 System Stories
- **Dependencies**: Keine (nutzt bestehende WebSocket + Claude CLI Infrastruktur)
- **External APIs**: Deepgram, ElevenLabs

## Context Links

- Full Specification: specwright/specs/2026-03-01-voice-call-conversational-flow/spec.md
- Story Index: specwright/specs/2026-03-01-voice-call-conversational-flow/story-index.md
- Implementation Plan: specwright/specs/2026-03-01-voice-call-conversational-flow/implementation-plan.md
