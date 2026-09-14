#!/usr/bin/env node
/**
 * Vitest-Regressionstor für ui/: schlägt an, wenn eine Testdatei rot wird, die es vorher nicht war.
 *
 *   cd ui && npx vitest run --reporter=json --outputFile=../vitest-results.json ; cd .. && node scripts/check-vitest-baseline.mjs vitest-results.json
 *
 * Vergleicht gegen ui/tests/known-failures.txt und meldet nur die DIFFERENZ (Muster: Applai
 * scripts/check-jest-regressions.mjs). NEU ROT → Exit 1. NEU GRÜN → Exit 0 mit Hinweis — die Zeile
 * gehört aus der Liste, aber erst nach einem grünen CI-Lauf (CI ist die Wahrheit).
 * Arbeitet auf Datei-Ebene, nicht auf Testfall-Ebene.
 * Exit 0 = keine neue rote Datei · 1 = Regression · 2 = Aufrufs-/Dateifehler.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const BASELINE = 'ui/tests/known-failures.txt';
const ergebnisDatei = process.argv[2] ?? 'vitest-results.json';

if (!existsSync(ergebnisDatei)) { console.error(`Vitest-Ergebnisdatei nicht gefunden: ${ergebnisDatei}`); process.exit(2); }
if (!existsSync(BASELINE)) { console.error(`Bezugsliste nicht gefunden: ${BASELINE}`); process.exit(2); }

const bekannt = new Set(); const flaky = new Set();
for (const roh of readFileSync(BASELINE, 'utf8').split('\n')) {
  const zeile = roh.trim();
  if (!zeile || zeile.startsWith('#')) continue;
  if (zeile.startsWith('flaky:')) { const p = zeile.slice(6); bekannt.add(p); flaky.add(p); } else bekannt.add(zeile);
}

let ergebnis;
try { ergebnis = JSON.parse(readFileSync(ergebnisDatei, 'utf8')); }
catch (e) { console.error(`${ergebnisDatei} ist kein lesbares JSON: ${e.message}`); process.exit(2); }

// Vitest schreibt absolute Pfade; relativ zu ui/ machen, damit Mac und Runner gleich vergleichen.
const uiWurzel = resolve('ui') + '/';
const relativ = name => (name.startsWith(uiWurzel) ? name.slice(uiWurzel.length) : name);

const rot = new Set(); const gruen = new Set();
for (const r of ergebnis.testResults ?? []) { const p = relativ(r.name); if (r.status === 'failed') rot.add(p); else gruen.add(p); }
if (rot.size === 0 && gruen.size === 0) { console.error('Keine Testdateien im Ergebnis — ist Vitest überhaupt gelaufen?'); process.exit(2); }

const neuRot = [...rot].filter(p => !bekannt.has(p)).sort();
const repariert = [...bekannt].filter(p => gruen.has(p) && !flaky.has(p)).sort();

console.log(`Vitest: ${gruen.size} grün, ${rot.size} rot, ${bekannt.size} als bekannt rot hinterlegt` + (flaky.size ? ` (davon ${flaky.size} flaky)` : '') + '.');
if (repariert.length) { console.log(`\n✅ ${repariert.length} Datei(en) repariert — nach grünem CI-Lauf aus ${BASELINE} streichen:`); for (const p of repariert) console.log(`   ${p}`); }
if (neuRot.length) {
  console.log(`\n❌ ${neuRot.length} NEUE rote Testdatei(en):`); for (const p of neuRot) console.log(`   ${p}`);
  console.log(`\nDiese Dateien waren vorher grün. Reparieren — oder mit Begründung im PR in ${BASELINE} aufnehmen, aber nur nach einem CI-Lauf.`);
  process.exit(1);
}
console.log('\n✅ Keine neue rote Testdatei.');
