# Workflow Terminal Integration - Lite Summary

> Created: 2026-02-02
> Full Spec: agent-os/specs/2026-02-02-workflow-terminal-integration/spec.md

Replace the faulty text-based output mapping with native terminal integration (xterm.js + node-pty) that provides 1:1 CLI mirroring, full interactivity, and eliminates UI bugs (missing/duplicate questions). Terminal auto-starts on workflow execution, replaces chat area, and remains open for review.

## Key Points

- **Eliminates bugs:** No more missing/duplicate questions from faulty Ask Question UI
- **Native terminal:** xterm.js (VSCode-proven) + node-pty for true CLI experience
- **Full interactivity:** Read/write during workflow, copy-paste, ANSI colors
- **Auto-start:** Terminal appears automatically when workflow executes
- **Multi-workflow:** Isolated terminals for parallel executions, session persistence
- **Binary WebSocket:** Sub-100ms latency, 1000+ lines no performance hit

## Quick Reference

- **Status**: Planning
- **Timeline**: 6 stories (PTY-001 to PTY-999)
- **Dependencies**: WorkflowExecutor (existing), WebSocket protocol (existing)
- **Tech Stack**: xterm.js 5.x, node-pty 1.x, Binary WebSocket frames

## Context Links

- Full Specification: agent-os/specs/2026-02-02-workflow-terminal-integration/spec.md
- Requirements Clarification: agent-os/specs/2026-02-02-workflow-terminal-integration/requirements-clarification.md
- Implementation Plan: agent-os/specs/2026-02-02-workflow-terminal-integration/implementation-plan.md
- Story Index: agent-os/specs/2026-02-02-workflow-terminal-integration/story-index.md
