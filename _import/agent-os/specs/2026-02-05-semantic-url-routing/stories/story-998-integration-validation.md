# SUR-998: Integration Validation

## System Story
End-to-End Validierung aller implementierten Routes und Deep-Links.

## Test-Szenarien
- [ ] Fresh Page Load auf jeder URL: /specs, /specs/{id}/kanban, /specs/{id}/stories/{storyId}, /backlog, /backlog/{storyId}, /docs, /chat, /workflows, /workflows/{id}, /settings, /settings/models, /settings/general, /settings/appearance
- [ ] Browser Back/Forward: specs → kanban → story → back → back
- [ ] Legacy Hash Redirect: /#/dashboard → /specs
- [ ] Unknown URL → Not-Found-View
- [ ] Bookmark Test: Kanban URL bookmarken, Tab schließen, wiedereröffnen
- [ ] Workflow-Start via Query-Parameter
- [ ] Project-Switch während Deep-Link → Reset auf /specs
- [ ] WebSocket Reconnect während Deep-Link → Daten werden nachgeladen

## Dependencies
- SUR-997 (Code Review)
