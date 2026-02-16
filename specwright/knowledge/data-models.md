# Data Models

> Verfügbare Datenmodelle, Schemas und Types im Projekt.
> Zuletzt aktualisiert: 2026-02-16

## Modelle-Übersicht

| Modell/Type | Pfad | Typ | Erstellt in Spec |
|-------------|------|-----|------------------|
| file.protocol.ts | ui/src/shared/types/file.protocol.ts | Shared Types | File Editor (2026-02-16) |

---

## Domain Models

### file.protocol.ts

**Pfad:** `ui/src/shared/types/file.protocol.ts`
**Typ:** Shared Protocol Types
**Erstellt:** File Editor (2026-02-16)

**Beschreibung:** TypeScript-Interfaces für alle datei-bezogenen WebSocket-Messages zwischen Frontend und Backend.

**Message Types:**
| Message | Direction | Description |
|---------|-----------|-------------|
| files:list | Client → Server | Verzeichnisinhalt anfordern |
| files:list:response | Server → Client | Verzeichnisinhalt |
| files:list:error | Server → Client | Fehler beim Auflisten |
| files:read | Client → Server | Dateiinhalt anfordern |
| files:read:response | Server → Client | Dateiinhalt |
| files:read:error | Server → Client | Fehler beim Lesen |
| files:write | Client → Server | Dateiinhalt speichern |
| files:write:response | Server → Client | Speichererfolg |
| files:write:error | Server → Client | Fehler beim Speichern |
| files:create | Client → Server | Neue Datei erstellen |
| files:mkdir | Client → Server | Neues Verzeichnis erstellen |
| files:rename | Client → Server | Datei/Ordner umbenennen |
| files:delete | Client → Server | Datei/Ordner löschen |

**Key Interfaces:**
```typescript
interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
}

interface FileTab {
  path: string;
  filename: string;
  isModified: boolean;
}
```

---

*Template Version: 1.0*
