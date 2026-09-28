/**
 * Legacy import shim. The old dumb 401 handler (tokenStorage.clear +
 * window.location.href='/login') is gone — the unified client in `./http`
 * handles 401 via single-flight refresh, and terminal failure dispatches
 * LOGOUT (AuthContext + ProtectedRoute own the redirect). Pages importing
 * `{ api }` from here now get that unified authed client.
 */
export { api } from './http';
