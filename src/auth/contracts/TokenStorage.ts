export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  sessionId: string;
  userId: string;
}

export interface TokenStorage {
  /** Retrieves the current authentication tokens if they exist */
  get(): AuthTokens | null;
  
  /** Stores new authentication tokens */
  set(tokens: AuthTokens): void;
  
  /** Completely wipes all authentication data */
  clear(): void;
  
  /** Synchronously checks token presence and non-expiration (if JWT decoded) */
  isValid(): boolean;
  
  /** Retrieves the current active tenant ID */
  getTenantId(): string | null;
  
  /** Stores the active tenant ID */
  setTenantId(tenantId: string): void;
  
  /** Clears the active tenant ID */
  clearTenant(): void;
  
  /** Migrates storage schema if version changes */
  migrate(): void;
  
  /** Current storage schema version */
  readonly version: number;
}
