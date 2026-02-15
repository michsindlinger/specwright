# Story: UI Chat Component Basics

## Feature
Als User möchte ich eine Chat-Komponente (`aos-spec-chat`) sehen, die Nachrichten anzeigt und Eingaben annimmt, damit ich mit der Spec interagieren kann.

## Akzeptanzkriterien

**Scenario: Chat Darstellung**
Given die Komponente ist in den DOM eingebunden
Then sehe ich ein Nachrichten-Fenster (Scroll-Bereich)
And sehe ich eine Eingabezeile mit Senden-Button

**Scenario: Nachricht senden**
Given ich habe Text eingegeben
When ich auf "Senden" klicke
Then wird ein Event gefeuert (für den Parent zum Behandeln)
And das Eingabefeld wird geleert

---

## Technisches Refinement (vom Architect)

**DoR (Definition of Ready)**
- [x] Fachliche Requirements klar
- [x] Technical Approach defined
- [x] Dependencies identified

**DoD (Definition of Done)**
- [x] Component implemented
- [x] Styles adapted from `chat-message.ts`
- [x] Lint free

**Integration:**
- Integration Type: **Frontend-only**

**Betroffene Layer & Komponenten:**
| Layer | Komponenten | Änderung |
|-------|-------------|----------|
| Frontend | `components/chat/aos-spec-chat.ts` | Neue Lit Component |

**Technical Details:**
**WAS:** Erstelle `aos-spec-chat` als dumme UI-Komponente (Presentational).
**WIE:** Nutze Lit `html` und `css`. Übernimm Styles von bestehendem `chat-message.ts` für Konsistenz. Props: `messages` (Array), `isLoading`. Events: `send-message`.
**WO:** `agent-os-ui/ui/src/components/chat/aos-spec-chat.ts`
**WER:** dev-team__frontend-developer

**Relevante Skills:**
- frontend-lit
- frontend-ui-component-architecture

**Creates Reusable Artifacts:**
- YES: `aos-spec-chat` component

**Completion Check:**
```bash
test -f agent-os-ui/ui/src/components/chat/aos-spec-chat.ts && echo "Component file created"
```
