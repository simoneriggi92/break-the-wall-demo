# Orders API

A small ASP.NET Core minimal API on .NET 10: orders placed, read and cancelled by clients that identify themselves with an API key.

## Layout

- `src/Orders.Api`: the API. `ApiKeys/` holds the middleware that checks the `X-Api-Key` header against the keys in configuration (`ApiKeys` section) and names the client; `Orders/` holds the endpoints and the in-memory store, every order scoped to its client.
- `tests/Orders.Api.Tests`: xUnit tests that drive the API through HTTP on an in-memory test host (`WebApplicationFactory`), with keys set in its configuration.

## Rules

- Build with `dotnet build`, test with `dotnet test`; warnings fail the build.
- A change in behaviour comes with a test at the HTTP seam that fails without it.
- Comments explain why, not what.

## Agent skills

### Issue tracker

Local markdown files under `.scratch/`, one folder per feature; specs are files, never GitHub issues. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage roles, recorded as a `Status:` line. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root, created lazily. See `docs/agents/domain.md`.
