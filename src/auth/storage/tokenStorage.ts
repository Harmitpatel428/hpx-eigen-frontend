import { AuthTokens, TokenStorage } from '../contracts/TokenStorage';

const STORAGE_VERSION = 1;
const VERSION_KEY = 'auth:version';
const TOKENS_KEY = 'auth:tokens';
const TENANT_KEY = 'auth:tenant';

const fallback = new Map<string, string>();
let degraded = false;

function safeSet(key: string, value: string) {
  try { localStorage.setItem(key, value); }
  catch { fallback.set(key, value); degraded = true; }
}

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) ?? fallback.get(key) ?? null; }
  catch { return fallback.get(key) ?? null; }
}

function safeRemove(key: string) {
  try { localStorage.removeItem(key); } catch {}
  fallback.delete(key);
}

export function isStorageDegraded(): boolean { return degraded; }

export class LocalTokenStorage implements TokenStorage {
  readonly version = STORAGE_VERSION;

  constructor() {
    this.migrate();
  }

  get(): AuthTokens | null {
    try {
      const data = safeGet(TOKENS_KEY);
      if (!data) return null;
      return JSON.parse(data) as AuthTokens;
    } catch {
      return null;
    }
  }

  set(tokens: AuthTokens): void {
    safeSet(TOKENS_KEY, JSON.stringify(tokens));
  }

  clear(): void {
    safeRemove(TOKENS_KEY);
    safeRemove(TENANT_KEY);
    safeRemove(VERSION_KEY);
    safeRemove('hpx:access-token');
    safeRemove('hpx:refresh-token');
    safeRemove('accessToken');
  }

  isValid(): boolean {
    const tokens = this.get();
    if (!tokens?.accessToken) return false;

    try {
      const parts = tokens.accessToken.split('.');
      if (parts.length === 3) {
        const payloadBase64 = parts[1];
        const payload = JSON.parse(atob(payloadBase64));
        if (payload.exp && payload.exp * 1000 <= Date.now()) {
          return false;
        }
      }
    } catch {
      // Not a JWT or malformed — fall back to checking presence
    }

    return true;
  }

  getTenantId(): string | null {
    return safeGet(TENANT_KEY);
  }

  setTenantId(tenantId: string): void {
    safeSet(TENANT_KEY, tenantId);
  }

  clearTenant(): void {
    safeRemove(TENANT_KEY);
  }

  migrate(): void {
    try {
      const storedVersionStr = safeGet(VERSION_KEY);
      const storedVersion = storedVersionStr ? parseInt(storedVersionStr, 10) : 0;

      if (storedVersion === this.version) {
        return;
      }

      this.migrateFromLegacy();

      safeSet(VERSION_KEY, this.version.toString());
    } catch {
      this.clear();
      this.clearLegacyKeys();
    }
  }

  private migrateFromLegacy(): void {
    try {
      const accessToken = safeGet('accessToken');
      const sessionId = safeGet('sessionId');
      const userId = safeGet('userId');
      const tenantId = safeGet('tenantId');

      if (accessToken && sessionId && userId) {
        this.set({ accessToken, sessionId, userId });
        if (tenantId) this.setTenantId(tenantId);
      }
    } finally {
      this.clearLegacyKeys();
    }
  }

  private clearLegacyKeys(): void {
    safeRemove('accessToken');
    safeRemove('sessionId');
    safeRemove('userId');
    safeRemove('tenantId');
  }
}

export const tokenStorage = new LocalTokenStorage();
