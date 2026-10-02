// INT-2026-030 E2E-Helfer: eine WebSocket-Aktion gegen ein Branch-Backend.
// Aufruf (aus ui/):  node ../intent/INT-2026-030-sitzung-von-aussen/e2e/ws-op.mjs <op> [args]
//   open <pfad> <name>        workspace:open-project
//   close-project <pfad>      workspace:close-project (Projekt bleibt in den Recents)
//   shell <pfad>              cloud-terminal:create (Shell, UI-Sitzung zum Vergleich)
//   close <sessionId>         cloud-terminal:close
//   state                     workspace:state ausgeben
// Umgebung: EINGANG_PORT (Standard 3111). Braucht `ws` aus ui/node_modules.
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(join(process.cwd(), 'package.json'));
const WebSocket = require('ws');

const port = process.env.EINGANG_PORT ?? '3111';
const [op, a, b] = process.argv.slice(2);
let geschickt = false;
const ws = new WebSocket(`ws://127.0.0.1:${port}`, { headers: { origin: `http://localhost:${port}` } });
const send = (m) => ws.send(JSON.stringify({ ...m, timestamp: new Date().toISOString() }));
const fertig = (out) => {
  if (out !== undefined) console.log(typeof out === 'string' ? out : JSON.stringify(out));
  ws.close();
  process.exit(0);
};
setTimeout(() => { console.error('timeout'); process.exit(1); }, 15000);

ws.on('message', (raw) => {
  const m = JSON.parse(String(raw));
  if (op === 'state' && m.type === 'workspace:state') fertig(m.state);
  if (op === 'open' && m.type === 'workspace:ack') fertig(m.projectId);
  if (op === 'close-project' && m.type === 'workspace:state') {
    const p = m.state.openProjects.find((x) => x.path === a);
    if (!p) fertig(geschickt ? 'closed' : 'not-open');
    else if (!geschickt) { geschickt = true; send({ type: 'workspace:close-project', id: p.id }); }
  }
  if (op === 'shell' && m.type === 'cloud-terminal:created') fertig(m.sessionId ?? m.session?.sessionId);
  if (m.type === 'cloud-terminal:error' || m.type === 'workspace:error') { console.error(JSON.stringify(m)); process.exit(1); }
});

ws.on('open', () => {
  if (op === 'state') send({ type: 'workspace:get' });
  else if (op === 'open') send({ type: 'workspace:open-project', path: a, name: b, requestId: 'e2e-open' });
  else if (op === 'close-project') send({ type: 'workspace:get' });
  else if (op === 'shell') send({ type: 'cloud-terminal:create', projectPath: a, terminalType: 'shell', requestId: 'e2e-shell', cols: 100, rows: 30 });
  else if (op === 'close') { send({ type: 'cloud-terminal:close', sessionId: a }); setTimeout(() => fertig('sent'), 500); }
  else { console.error('unbekannte Aktion'); process.exit(2); }
});
