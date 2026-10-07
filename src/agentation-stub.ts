// Prod stub for the dev-only agentation overlay. Aliased in via vite.config when
// the real package is absent, so production builds resolve (and DCE) cleanly.
export const Agentation = () => null;
