# Custom Team Members - Lite Summary

> Created: 2026-02-26
> Full Spec: @specwright/specs/2026-02-26-custom-team-members/spec.md

Erweiterung der Team-Seite um benutzerdefinierte Teammitglieder (Einzelpersonen und Teams) mit interaktivem `/add-team-member` Slash-Command, Markdown-Editor für Bearbeitung und REST DELETE für Löschung. Skills werden auf der Team-Seite gruppiert nach DevTeam, Custom Teams und Einzelpersonen dargestellt.

## Key Points

- Neuer `/add-team-member` Workflow mit interaktivem Dialog
- Erweiterte Frontmatter-Felder: `teamType` (individual/team) und `teamName`
- Gruppierte Team-Seite mit drei Sektionen
- Edit-Modal mit CodeMirror-basiertem Markdown-Editor
- Delete über REST API mit Confirmation Dialog
- Volle Rückwärtskompatibilität mit bestehenden Skills

## Quick Reference

- **Status**: Planning
- **Stories**: 6 reguläre + 3 System Stories
- **Dependencies**: Bestehende Team-View, SkillsReaderService, aos-file-editor
- **Integration Type**: Full-stack (Backend + Frontend)
