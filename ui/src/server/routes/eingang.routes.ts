/**
 * Eingang von außen (INT-2026-030, Plan D1, ADR-0007).
 *
 * POST /api/eingang/sitzung            { projekt, satz, titel? } → 201 { zustand: 'startet', sessionId, projekt }
 * GET  /api/eingang/sitzung/:sessionId → 200 { zustand: 'startet'|'aktiv'|'fehler'|'unbekannt', grund? }
 *
 * Montiert VOR dem globalen Body-Parser (`index.ts`): zuerst die Berechtigung,
 * erst danach wird der Body geparst (8 KB) — Unberechtigte werden nie geparst,
 * Parser-Fehler landen im Protokoll (FA-17). Jede Absage der Berechtigung
 * lautet gleich „nicht berechtigt" (FA-12). Antworten nennen nie einen Host-Pfad.
 */

import express, { Router, type Request, type Response, type NextFunction } from 'express';
import type { EingangService } from '../services/eingang-service.js';
import { EINGANG_AN, GRUND } from '../services/eingang-regeln.js';

const art = (req: Request): 'start' | 'status' => (req.method === 'GET' ? 'status' : 'start');
const absender = (req: Request): string => req.socket.remoteAddress ?? '';

export function createEingangRouter(
  getService: () => EingangService | undefined,
  schalter: () => string | undefined = () => process.env.SPECWRIGHT_EINGANG
): Router {
  const router = Router();

  router.use((req: Request, res: Response, next: NextFunction) => {
    const svc = getService();
    if (!svc) {
      // Dienst noch nicht gebaut (Sekundenbruchteil nach listen): ohne Schalter gleich „nicht berechtigt".
      if (schalter() === EINGANG_AN) res.status(503).json({ fehler: GRUND.backendStartet });
      else res.status(403).json({ fehler: GRUND.nichtBerechtigt });
      return;
    }
    if (!svc.berechtigt(req)) {
      svc.protokolliereAbweisung(art(req), absender(req), 403, GRUND.nichtBerechtigt);
      res.status(403).json({ fehler: GRUND.nichtBerechtigt });
      return;
    }
    next();
  });

  // Nur `application/json` (D1) — sonst bliebe der Body leer und die Absage hieße fälschlich „Satz fehlt".
  const nurJson = (req: Request, res: Response, next: NextFunction): void => {
    if (req.is('application/json')) {
      next();
      return;
    }
    getService()?.protokolliereAbweisung('start', absender(req), 400, GRUND.anfrageUngueltig);
    res.status(400).json({ fehler: GRUND.anfrageUngueltig });
  };

  router.post('/sitzung', nurJson, express.json({ limit: '8kb' }), (req: Request, res: Response) => {
    const svc = getService();
    if (!svc) {
      res.status(503).json({ fehler: GRUND.backendStartet });
      return;
    }
    svc.starte(req.body, absender(req)).then(
      (a) => res.status(a.status).json(a.body),
      (err: unknown) => {
        console.warn('[Eingang] Start fehlgeschlagen:', err instanceof Error ? err.name : 'Fehler');
        svc.protokolliereAbweisung('start', absender(req), 500, 'interner Fehler');
        res.status(500).json({ fehler: 'interner Fehler' });
      }
    );
  });

  router.get('/sitzung/:sessionId', (req: Request, res: Response) => {
    const svc = getService();
    if (!svc) {
      res.status(503).json({ fehler: GRUND.backendStartet });
      return;
    }
    const a = svc.status(String(req.params.sessionId), absender(req));
    res.status(a.status).json(a.body);
  });

  // Berechtigt, aber Parser-Fehler (zu groß, kaputtes JSON) → 400 mit Protokollzeile.
  router.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    getService()?.protokolliereAbweisung(art(req), absender(req), 400, GRUND.anfrageUngueltig);
    res.status(400).json({ fehler: GRUND.anfrageUngueltig });
  });

  return router;
}
