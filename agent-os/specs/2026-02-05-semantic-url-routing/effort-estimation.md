# Effort Estimation: Semantic URL Routing

## Story-Level Estimation

| ID | Title | Complexity | Human Only | Human + AI |
|----|-------|-----------|-----------|------------|
| SUR-001 | Router Module | S | 1.5h | 0.5h |
| SUR-002 | App Shell Migration | M | 2.0h | 1.0h |
| SUR-003 | Dashboard Deep-Linking | L | 3.0h | 1.5h |
| SUR-004 | Backlog & Docs Routes | S | 0.5h | 0.25h |
| SUR-005 | Settings Sub-Routes | S | 0.5h | 0.25h |
| SUR-006 | Workflow Deep-Linking | M | 1.5h | 0.75h |
| SUR-007 | Vite SPA Fallback | S | 0.5h | 0.25h |
| **Subtotal Implementation** | | | **9.5h** | **4.5h** |
| SUR-997 | Code Review | S | 0.5h | 0.25h |
| SUR-998 | Integration Validation | S | 1.0h | 0.5h |
| SUR-999 | Finalize PR | S | 0.25h | 0.15h |
| **Total** | | | **11.25h** | **5.4h** |

## Risk Buffer
- +20% für unvorhergesehene Race Conditions: ~1h
- **Gesamtschätzung**: ~6.5h (Human + AI)

## Complexity Rationale

- **SUR-003 (L)**: Größte Story - 8 Akzeptanzszenarien, State Restoration mit Race Condition Guards, 8+ Navigation-Calls ersetzen
- **SUR-002 (M)**: Zentraler Umbau der App-Shell, aber gut abgegrenzt
- **SUR-006 (M)**: sessionStorage Migration + Query-Param Handling + 3 Dateien betroffen
- **Rest (S)**: Klar abgegrenzte, überschaubare Änderungen
