# User-Action Detection Rules

> Source of truth for the `requiresUserAction` flag (v3.14+).
> Loaded by `create-spec.md`, `add-story.md`, `change-spec.md`, and
> `flag-user-actions.md` workflows. Single file → no drift between flows.

## Purpose

Some stories/tasks require a manual step the AI cannot perform autonomously
(obtaining external credentials, configuring 3rd-party services, signing
contracts, etc.). When auto-mode picks up such a ticket, the Cloud Code
session reports it cannot proceed and the ticket hangs in `in_progress`
without the user knowing.

The `requiresUserAction: true` flag prevents this:

- Auto-mode skips flagged items.
- Kanban UI shows a `⚠ Aktion nötig` badge and a `✓ Aktion erledigt`
  button on the card.
- User performs the action manually, clicks the button, ticket → `done`.

## When to flag

Set `requiresUserAction: true` when the task involves any of:

- **External credentials / API keys / OAuth client secrets** — Stripe API key,
  GitHub PAT, Sentry DSN, Mailgun token, etc.
- **Manual configuration in 3rd-party UIs** — DNS A-records, Stripe dashboard,
  OAuth consent screen, App Store Connect, Cloudflare, Sentry project setup.
- **Physical / human-only steps** — signing contracts, design approval, legal
  review, GDPR sign-off, customer interview booking.
- **Account creation requiring CAPTCHA, SMS, or email confirmation** — most
  SaaS sign-ups.
- **Uploading binary assets the user must produce** — logos, signed certs,
  screenshots, app icons, video clips.
- **Hardware / device interaction** — physical token registration, USB key
  enrollment, mobile-device-only steps.

## When NOT to flag

Be conservative. The following are NOT user-action — AI can do them:

- Coding, file creation, refactoring
- Config-file edits (`.env` placeholder commits — but `.env` value entry IS user-action)
- Package installs (`npm install`, `pip install`, etc.)
- Automated tests
- Database migrations (when run via tooling)
- Generating dev fixtures / seed data

When uncertain, **don't flag** — the user can flag later via
`/specwright:flag-user-actions`.

## Confirmation UX (consistent across workflows)

After classification, present a numbered list and let the user adjust:

```
Folgende Tasks scheinen User-Action zu benötigen:
  [1] TASK-003 "Stripe API Key beschaffen" — external credentials
  [2] TASK-007 "DNS A-Record setzen für app.example.com" — 3rd-party UI config

Antwort:
  - "ok" / "alle bestätigen"
  - Nummern deselektieren, z.B. "ohne 2"
  - weitere Tasks flaggen, z.B. "+ TASK-012"
  - "abbrechen"
```

Only after explicit user confirmation, persist the flags into `kanban.json`.

## Persistence (read for implementers)

- **V1 Classic** stories: nested under `classification.requiresUserAction`.
- **V2 Lean** tasks: top-level `requiresUserAction` field.
- The `hasUserActionFlag(item)` helper (in `kanban-validation.ts` and
  `specs-reader.ts`) abstracts over the asymmetry — always go through it.

## Convention (read for consumers)

`requiresUserAction === true` is **only meaningful when `status === 'ready'`**.

After the user confirms, the item lands in `done` with the flag still set
(audit trail). Filters that mean "needs user attention" must combine
`requiresUserAction === true` AND `status === 'ready'`.
