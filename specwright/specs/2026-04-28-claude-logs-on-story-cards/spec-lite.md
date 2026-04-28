# Spec-Lite: Claude-Code-Logs auf Story-Cards

Live-Stream von Claude-Code-Output direkt am Story-Card im Kanban-Board als aufklappbares Inline-Panel pro Auto-Mode-Session. Nutzt existierenden `cloud-terminal:data` Broadcast + bounded Buffer aus `feature/parallel-auto-mode`-Branch — Backend-Erweiterung minimal (`SlotSnapshot.sessionId?` additiv); Hauptaufwand neue Lit-Komponente mit ANSI-Strip, RAF-Batching und Auto-Scroll.
