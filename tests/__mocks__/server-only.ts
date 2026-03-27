// Stub for `server-only` — allows Vitest to import server-only modules without crashing.
// In production Next.js, this package throws if imported in a client bundle.
// In tests there is no client/server distinction, so we no-op it.
export {};
