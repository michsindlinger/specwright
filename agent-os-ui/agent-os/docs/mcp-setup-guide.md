# MCP-Setup-Guide

> Anleitung zur Einrichtung von MCP-Tools für Browser-Tests und E2E-Verification
> Version: 1.0
> Created: 2026-01-12

## Übersicht

MCP (Model Context Protocol) Server ermöglichen Claude Code, mit externen Tools zu interagieren. Für Frontend-Stories und E2E-Tests wird häufig Browser-Automation benötigt.

---

## Playwright MCP

Playwright MCP ist das Standard-Tool für Browser-Automation mit Claude Code.

### Installation

1. **Prüfe, ob npx verfügbar ist:**
```bash
npx --version
```

2. **Füge Playwright MCP zu .mcp.json hinzu:**

Erstelle oder editiere `.mcp.json` im Projekt-Root:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-playwright"]
    }
  }
}
```

3. **Starte Claude Code neu** damit die MCP-Konfiguration geladen wird.

### Verification

Prüfe ob Playwright MCP korrekt geladen ist:

```bash
claude mcp list
```

Erwartete Ausgabe sollte `playwright` enthalten.

### Verfügbare Tools nach Installation

Nach erfolgreicher Installation stehen folgende Tools zur Verfügung:

| Tool | Beschreibung |
|------|--------------|
| `playwright_navigate` | Navigiere zu einer URL |
| `playwright_click` | Klicke auf ein Element |
| `playwright_fill` | Fülle ein Input-Feld aus |
| `playwright_screenshot` | Erstelle Screenshot |
| `playwright_get_text` | Extrahiere Text von Element |
| `playwright_evaluate` | Führe JavaScript aus |

---

## Andere MCP-Server (Optional)

### Chrome DevTools MCP

Für tiefere DOM-Inspection und Network-Analyse:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp"]
    }
  }
}
```

### Puppeteer MCP

Alternative zu Playwright:

```json
{
  "mcpServers": {
    "puppeteer": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "puppeteer-mcp"]
    }
  }
}
```

---

## Verwendung in User Stories

### Required MCP Tools Section

In User Stories, die Browser-Verification benötigen:

```markdown
### Required MCP Tools

| Tool | Purpose | Blocking |
|------|---------|----------|
| playwright | UI-Verification nach Implementation | Yes |

**Pre-Flight Check:**
\`\`\`bash
claude mcp list | grep -q "playwright"
\`\`\`

**If Missing:** Story wird als BLOCKED markiert
```

### Browser-Akzeptanzkriterien

Format für prüfbare Browser-Tests:

```markdown
**Browser-Prüfungen (erfordern MCP-Tool):**
- [ ] MCP_PLAYWRIGHT: Page "http://localhost:3000/feature" loads without errors
- [ ] MCP_PLAYWRIGHT: Element "[data-testid='submit-button']" is visible
- [ ] MCP_PLAYWRIGHT: Click on button shows success message
- [ ] MCP_SCREENSHOT: Visual comparison passes
```

---

## Blocking-Verhalten

Wenn eine Story ein MCP-Tool benötigt, aber das Tool nicht verfügbar ist:

1. **execute-tasks prüft** vor Story-Start die Tool-Requirements
2. **Story wird als BLOCKED markiert** im Kanban-Board
3. **Benutzer erhält Hinweis** mit Link zu diesem Guide
4. **Nach Installation:** Story wird automatisch "unblocked"

### Manueller Check

```bash
# Prüfe ob Tool verfügbar ist
claude mcp list | grep -q "playwright" && echo "OK" || echo "MISSING"
```

---

## Vollständige .mcp.json Beispielkonfiguration

```json
{
  "mcpServers": {
    "perplexity": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "perplexity-mcp"],
      "env": {
        "PERPLEXITY_API_KEY": "your-api-key"
      }
    },
    "mermaid-mcp": {
      "url": "https://mcp.mermaidchart.com/sse",
      "type": "sse"
    },
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-playwright"]
    }
  }
}
```

---

## Troubleshooting

### Tool wird nicht geladen

1. Prüfe `.mcp.json` Syntax (valides JSON?)
2. Starte Claude Code neu
3. Prüfe ob npx funktioniert: `npx --version`

### Playwright findet Browser nicht

```bash
# Installiere Browser für Playwright
npx playwright install chromium
```

### Timeout bei Browser-Operations

- Erhöhe Timeout in Test-Konfiguration
- Prüfe ob lokaler Dev-Server läuft
- Prüfe Netzwerkverbindung

---

## Referenzen

- [Playwright MCP GitHub](https://github.com/anthropics/mcp-server-playwright)
- [MCP Specification](https://modelcontextprotocol.io)
- **Story-Sizing:** Siehe story-sizing-guidelines.md
