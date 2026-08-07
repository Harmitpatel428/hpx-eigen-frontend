export interface PermissionManifest {
  [slug: string]: string;
}

export interface PermissionService {
  /**
   * Evaluates if the current user has the required permission slug.
   * Execution must be completely synchronous (O(1)).
   */
  can(slug: string): boolean;

  /** Evaluates if the user has any of the provided slugs. */
  canAny(slugs: string[]): boolean;

  /** Evaluates if the user has all of the provided slugs. */
  canAll(slugs: string[]): boolean;

  /** Evaluates if the current user has the required role. */
  hasRole(role: string): boolean;

  /** Evaluates if the user has any of the provided roles. */
  hasAnyRole(roles: string[]): boolean;

  /**
   * Initializes or updates the permission manifest and roles cache.
   */
  setManifest(manifest: PermissionManifest, roles: string[]): void;

  /**
   * Clears the internal permission and roles cache.
   */
  clear(): void;
}
