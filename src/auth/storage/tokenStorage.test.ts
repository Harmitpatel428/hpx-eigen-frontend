import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalTokenStorage, isStorageDegraded } from './tokenStorage';

describe('LocalTokenStorage', () => {
  let storage: LocalTokenStorage;

  beforeEach(() => {
    localStorage.clear();
    // Reset the singleton behavior for tests by instantiating fresh
    storage = new LocalTokenStorage();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should get null when no tokens exist', () => {
    expect(storage.get()).toBeNull();
  });

  it('should set and get tokens correctly', () => {
    const tokens = {
      accessToken: 'access-123',
      sessionId: 'session-456',
      userId: 'user-789'
    };
    storage.set(tokens);
    expect(storage.get()).toEqual(tokens);
  });

  it('should clear tokens and tenant correctly', () => {
    storage.set({ accessToken: 'a', sessionId: 's', userId: 'u' });
    storage.setTenantId('tenant-1');
    storage.clear();
    
    expect(storage.get()).toBeNull();
    expect(storage.getTenantId()).toBeNull();
    // Also asserts version is cleared by clear()
    expect(localStorage.getItem('auth:version')).toBeNull();
  });

  it('should migrate from legacy storage correctly', () => {
    localStorage.setItem('accessToken', 'legacy-access');
    localStorage.setItem('sessionId', 'legacy-session');
    localStorage.setItem('userId', 'legacy-user');
    localStorage.setItem('tenantId', 'legacy-tenant');
    localStorage.removeItem('auth:version'); // Force migration
    
    // Instantiate fresh, triggering migrate()
    const newStorage = new LocalTokenStorage();
    
    // Check if new format holds the migrated data
    const data = newStorage.get();
    
    expect(data).toEqual({
      accessToken: 'legacy-access',
      sessionId: 'legacy-session',
      userId: 'legacy-user'
    });
    expect(newStorage.getTenantId()).toEqual('legacy-tenant');
    
    // Check if legacy keys are cleared
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('sessionId')).toBeNull();
    
    // Check if version is set
    expect(localStorage.getItem('auth:version')).toBe('1');
  });



  it('isValid should return true for valid token strings', () => {
    storage.set({ accessToken: 'simple-opaque-token', sessionId: 's', userId: 'u' });
    expect(storage.isValid()).toBe(true);
  });

  it('isValid should return false if token is missing', () => {
    expect(storage.isValid()).toBe(false);
  });
  
  it('isValid should return false if JWT is expired', () => {
    // Create an expired JWT payload
    const expiredPayload = { exp: Math.floor(Date.now() / 1000) - 1000 };
    const base64Payload = btoa(JSON.stringify(expiredPayload));
    const expiredJwt = `header.${base64Payload}.signature`;
    
    storage.set({ accessToken: expiredJwt, sessionId: 's', userId: 'u' });
    expect(storage.isValid()).toBe(false);
  });

  it('isValid should return true if JWT is not expired', () => {
    // Create a valid JWT payload (expires in 1 hour)
    const validPayload = { exp: Math.floor(Date.now() / 1000) + 3600 };
    const base64Payload = btoa(JSON.stringify(validPayload));
    const validJwt = `header.${base64Payload}.signature`;

    storage.set({ accessToken: validJwt, sessionId: 's', userId: 'u' });
    expect(storage.isValid()).toBe(true);
  });

  describe('storage degradation', () => {
    it('[S1] throwing setItem -> write via fallback; get returns value; degraded true', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded'); });
      const s = new LocalTokenStorage();
      const tokens = { accessToken: 'a', sessionId: 's', userId: 'u' };

      expect(() => s.set(tokens)).not.toThrow();
      expect(s.get()).toEqual(tokens);
      expect(isStorageDegraded()).toBe(true);
      spy.mockRestore();
    });

    it('[S2] throwing removeItem -> no exception; value gone from fallback', () => {
      const setMock = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded'); });
      const rmMock = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('SecurityError'); });
      const s = new LocalTokenStorage();
      s.set({ accessToken: 'a', sessionId: 's', userId: 'u' });

      expect(() => s.clear()).not.toThrow();
      expect(s.get()).toBeNull();
      setMock.mockRestore();
      rmMock.mockRestore();
    });

    it('[S3] corrupted JSON on get -> null, no throw', () => {
      localStorage.setItem('auth:tokens', '{not valid json');
      expect(() => storage.get()).not.toThrow();
      expect(storage.get()).toBeNull();
    });

    it('[S4] non-throwing path unchanged (roundtrip via real localStorage)', () => {
      const tokens = { accessToken: 'x', sessionId: 'y', userId: 'z' };
      storage.set(tokens);
      expect(storage.get()).toEqual(tokens);
      expect(localStorage.getItem('auth:tokens')).toContain('x');
    });
  });
});
