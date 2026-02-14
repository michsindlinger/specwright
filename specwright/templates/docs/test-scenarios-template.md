# Test-Szenarien: [SPEC_NAME]

> Generiert am [DATE] nach Abschluss der Implementierung
> Spec: [SPEC_PATH]

## Zweck

Dieses Dokument beschreibt Test-Szenarien zum manuellen Testen oder zur Weitergabe an eine KI für automatisierte E2E-Tests.

---

## Voraussetzungen

### Systemvoraussetzungen
- [ ] Anwendung läuft lokal / auf Staging
- [ ] Testdaten sind vorhanden
- [ ] [WEITERE_VORAUSSETZUNGEN]

### Test-Accounts / Daten
| Typ | Wert | Beschreibung |
|-----|------|--------------|
| [ACCOUNT_TYP] | [CREDENTIALS] | [BESCHREIBUNG] |

---

## Test-Szenarien

### Szenario 1: [STORY_ID] - [STORY_TITLE]

**Beschreibung:** [KURZE_BESCHREIBUNG_WAS_GETESTET_WIRD]

#### Happy Path

| Schritt | Aktion | Erwartetes Ergebnis |
|---------|--------|---------------------|
| 1 | [AKTION] | [ERWARTUNG] |
| 2 | [AKTION] | [ERWARTUNG] |
| 3 | [AKTION] | [ERWARTUNG] |

#### Edge Cases

| Case | Beschreibung | Erwartetes Verhalten |
|------|--------------|---------------------|
| [CASE_1] | [BESCHREIBUNG] | [ERWARTUNG] |
| [CASE_2] | [BESCHREIBUNG] | [ERWARTUNG] |

#### Fehlerfälle

| Fehlerfall | Auslöser | Erwartete Fehlermeldung |
|------------|----------|------------------------|
| [FEHLER_1] | [WIE_AUSLOESEN] | [ERWARTETE_MELDUNG] |

---

### Szenario 2: [STORY_ID] - [STORY_TITLE]

[GLEICHES_FORMAT_WIE_OBEN]

---

## Regressions-Checkliste

Bestehende Funktionalität, die nach der Implementierung noch funktionieren muss:

- [ ] [FUNKTION_1] - [WIE_TESTEN]
- [ ] [FUNKTION_2] - [WIE_TESTEN]
- [ ] [FUNKTION_3] - [WIE_TESTEN]

---

## Automatisierungs-Hinweise

Falls diese Szenarien automatisiert werden sollen:

### Selektoren / Identifikatoren
```
[KOMPONENTE_1]: data-testid="[ID]"
[KOMPONENTE_2]: data-testid="[ID]"
```

### API-Endpunkte
| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| [ENDPOINT] | [METHOD] | [BESCHREIBUNG] |

### Mock-Daten
```json
{
  "[ENTITY]": {
    "[FIELD]": "[VALUE]"
  }
}
```

---

## Notizen

[WEITERE_HINWEISE_FUER_TESTER]
