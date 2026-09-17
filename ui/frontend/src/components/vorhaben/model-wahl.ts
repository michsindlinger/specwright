/**
 * model-wahl — the model preselection of a step (INT-2026-004, FA-40), shared
 * by `aos-naechster-schritt` and `aos-neue-absicht` (INT-2026-010, FA-10):
 * last model of (Vorhaben, step) → step default of the settings → general
 * default. Pure functions plus one loader; no Lit.
 */

import { vorhabenService, type ModelListInfo } from '../../services/vorhaben.service.js';
import type { ModelSelection, VorhabenStep } from '../../../../src/shared/types/vorhaben.protocol.js';

/**
 * Providers, defaults and step defaults as the settings know them (`model.list`),
 * reduced to providers that start Claude Code (`nurClaudeSitzungen`).
 */
export function ladeModelle(): Promise<ModelListInfo> {
  return vorhabenService.modelList().then(nurClaudeSitzungen);
}

/**
 * INT-2026-012 (D1): a step starts `/specwright:<step> …`, which only a Claude
 * session understands — a foreign agent CLI (Codex nativ, `cliKind: 'foreign'`)
 * is not offered here. Fail-open on a missing field (older backend, E6); the
 * backend guard (`isClaudeSessionModel`) catches the rest with a naming error.
 */
export function nurClaudeSitzungen(models: ModelListInfo): ModelListInfo {
  return { ...models, providers: models.providers.filter((p) => p.cliKind !== 'foreign') };
}

/** True when the selection names a configured provider and model. */
export function modellVorhanden(models: ModelListInfo, sel: ModelSelection | undefined): sel is ModelSelection {
  return !!sel && models.providers.some((p) => p.id === sel.providerId && p.models.some((m) => m.id === sel.modelId));
}

/** FA-40: last model of (Vorhaben, step) → step default → general default. */
export function vorauswahl(models: ModelListInfo, step: VorhabenStep, lastModel: ModelSelection | undefined): ModelSelection {
  if (modellVorhanden(models, lastModel)) return lastModel;
  const stepDefault = models.stepDefaults?.[step];
  if (modellVorhanden(models, stepDefault)) return stepDefault;
  return models.defaultSelection;
}

/** The selection is the step default and no last model overrode it (label „(Standard <Schritt>)"). */
export function istSchrittStandard(models: ModelListInfo, step: VorhabenStep, sel: ModelSelection | null, lastModel: ModelSelection | undefined): boolean {
  const stepDefault = models.stepDefaults?.[step];
  return !!sel && !!stepDefault && stepDefault.providerId === sel.providerId && stepDefault.modelId === sel.modelId && !lastModel;
}
