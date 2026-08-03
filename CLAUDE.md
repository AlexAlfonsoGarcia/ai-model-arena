# 21. CLAUDE.md

The root `CLAUDE.md` defines the project's permanent rules.

It should include:

## Project identity

AI Model Arena is a full-stack platform for comparing foundation AI models.

## Stack

* Next.js.
* React.
* TypeScript.
* Tailwind CSS.
* Vercel.
* Vercel AI SDK where appropriate.
* Vitest.

## Architecture rules

* Use strict TypeScript.
* Avoid `any`.
* Keep AI provider logic isolated.
* Never expose API keys.
* Never call AI providers from client components.
* Validate API input server-side.
* Execute provider requests concurrently.
* Isolate provider failures.
* Never fabricate metrics.

## Development rules

Before modifying code:

1. Inspect existing implementation.
2. Understand current architecture.
3. Reuse existing abstractions.
4. Avoid unnecessary dependencies.
5. Make the smallest maintainable change.
6. Run relevant tests.
7. Run lint.
8. Run build when appropriate.

## Git rules

Use conventional commits.

Never commit secrets.

## AI provider rules

Every new provider must include:

* Provider implementation.
* Configuration.
* Registration.
* Error handling.
* Tests.
* Documentation.

**Note for MVP:** The initial provider adapter is for OpenRouter, which acts as a gateway to multiple model providers (including OpenAI, Anthropic, Google, etc.). This allows the MVP to support a wide range of models while maintaining the provider abstraction layer. Direct provider adapters (e.g., OpenAI, Anthropic, Google) can be added in future phases following the same interface.

## Security rules

* API keys are server-only.
* Validate client input.
* Never expose secrets.
* Do not expose stack traces.

## Testing rules

* External AI APIs must be mocked.
* No real AI API calls in unit tests.

---