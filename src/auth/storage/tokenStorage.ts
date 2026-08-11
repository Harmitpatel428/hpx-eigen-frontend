import { AuthTokens, TokenStorage } from '../contracts/TokenStorage';

const STORAGE_VERSION = 1;
const VERSION_KEY = 'auth:version';
const TOKENS_KEY = 'auth:tokens';
const TENANT_KEY = 'auth:tenant';

export class LocalTokenStorage implements TokenStorage {
  readonly version = STORAGE_VERSION;

  constructor() {
    this.migrate();
  }

  get(): AuthTokens | null {
    try {
      const data = localStorage.getItem(TOKENS_KEY);
      if (!data) return null;
      return JSON.parse(data) as AuthTokens;
    } catch {
      return null;
    }
  }

  set(tokens: AuthTokens): void {
    try {
      localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    } catch (e) {
      console.error('Failed to save tokens', e);
      throw e;
    }
  }

  clear(): void {
    localStorage.removeItem(TOKENS_KEY);
    localStorage.removeItem(TENANT_KEY);
    localStorage.removeItem(VERSION_KEY);
    localStorage.removeItem('hpx:access-token');
    localStorage.removeItem('hpx:refresh-token');
    localStorage.removeItem('accessToken');
  }

  isValid(): boolean {
    const tokens = this.get();
    if (!tokens?.accessToken) return false;
    
    // Best-effort JWT expiration check. If it's a JWT, parse and check exp.
    try {
      const parts = tokens.accessToken.split('.');
      if (parts.length === 3) {
        const payloadBase64 = parts[1];
        const payload = JSON.parse(atob(payloadBase64));
        if (payload.exp && payload.exp * 1000 <= Date.now()) {
          return false; // Expired
        }
      }
    } catch {
      // If parsing fails (not a JWT or malformed), fall back to checking presence
    }
    
    return true;
  }

  getTenantId(): string | null {
    return localStorage.getItem(TENANT_KEY);
  }

  setTenantId(tenantId: string): void {
    localStorage.setItem(TENANT_KEY, tenantId);
  }

  clearTenant(): void {
    localStorage.removeItem(TENANT_KEY);
  }

  migrate(): void {
    try {
      const storedVersionStr = localStorage.getItem(VERSION_KEY);
      const storedVersion = storedVersionStr ? parseInt(storedVersionStr, 10) : 0;
      
      if (storedVersion === this.version) {
        return; // Up to date
      }
      
      // Migrate from legacy format (V0) to V1
      this.migrateFromLegacy();
      
      localStorage.setItem(VERSION_KEY, this.version.toString());
    } catch (error) {
      // Migration Failure Policy: wipe storage completely, force login.
      this.clear();
      this.clearLegacyKeys();
    }
  }

  private migrateFromLegacy(): void {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const sessionId = localStorage.getItem('sessionId');
      const userId = localStorage.getItem('userId');
      const tenantId = localStorage.getItem('tenantId');
      
      if (accessToken && sessionId && userId) {
        this.set({ accessToken, sessionId, userId });
        if (tenantId) this.setTenantId(tenantId);
      }
    } finally {
      this.clearLegacyKeys();
    }
  }
  
  private clearLegacyKeys(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('userId');
    localStorage.removeItem('tenantId');
  }
}

export const tokenStorage = new LocalTokenStorage();
