# Product Secrets & Credentials

> [!CAUTION]
> This file is intended for environment-independent secret keys, API credentials, and sensitive configurations.
> **DO NOT COMMIT THIS FILE TO VERSION CONTROL.**
> Use this template to track which secrets are needed for the project.

## Critical Credentials

### Backend / API
- **API_KEY_NAME**: [DESCRIPTION/SECRET_HINT]
- **DATABASE_PASSWORD**: [DESCRIPTION/SECRET_HINT]
- **JWT_SECRET**: [DESCRIPTION/SECRET_HINT]

### Third-Party Services
- **STRIPE_SECRET_KEY**: [DESCRIPTION/SECRET_HINT]
- **AWS_ACCESS_KEY**: [DESCRIPTION/SECRET_HINT]
- **AWS_SECRET_ACCESS_KEY**: [DESCRIPTION/SECRET_HINT]
- **SENDGRID_API_KEY**: [DESCRIPTION/SECRET_HINT]

### Environment specific overrides
- **PRODUCTION_URL**: [VALUE]
- **STAGING_URL**: [VALUE]

## Rotation Schedule
- **Last Rotation**: [DATE]
- **Next Planned Rotation**: [DATE]
- **Frequency**: [e.g., 90 days]

## Storage Reference
- **Vault/Manager**: [e.g., 1Password, Bitwarden, AWS Secrets Manager]
- **Path/Link**: [LINK_OR_PATH]

---
*Created with Specwright*
