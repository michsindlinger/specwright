# Spec Lite: Workflow Terminal Tabs

Workflow-Ausfuehrungen werden von der blockierenden Execution-View auf interaktive xterm.js Terminal-Tabs im Cloud Terminal migriert. Jeder Workflow startet als eigenstaendige Claude CLI PTY-Session -- nicht-blockierend, parallel moeglich, mit Tab-Notifications bei Input-Bedarf. Die alten Execution-Tab und Workflow-Chat Komponenten werden komplett entfernt.
