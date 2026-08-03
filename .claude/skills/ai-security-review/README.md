# AI Security Review Skill

## Purpose
Review AI-specific security concerns.

## Review Areas
* API key exposure.
* Prompt injection.
* Sensitive data leakage.
* Excessive prompt size.
* Denial-of-wallet risks.
* Rate limiting.
* Abuse prevention.
* Input validation.
* Output handling.
* Sensitive logging.
* Provider errors.
* Secrets management.
* Environment variables.
* Server/client boundaries.

## Classification of Findings
* CRITICAL
* HIGH
* MEDIUM
* LOW
* INFO

## Important Rules
* The skill must never print or expose actual secrets.
* It should recommend fixes before making architectural changes.