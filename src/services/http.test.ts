import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { api, publicApi } from './http';
import { tokenStorage } from '../auth/storage/tokenStorage';
import { authEventBus, AUTH_EVENTS } from '../auth/events/authEvents';
import { AuthenticationError } from '../auth/errors';

// ─── 1. Structural guard: axios.create only in http.ts ──────────────────────
describe('structural: single axios.create', () => {
  it('axios.create appears only in src/services/http.ts', () => {
    const srcDir = join(process.cwd(), 'src');
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
          if (readFileSync(full, 'utf8').includes('axios.create(')) {
            offenders.push(full.replace(process.cwd(), '').replace(/\\/g, '/'));
          }
        }
      }
    };
    walk(srcDir);

    expect(offenders).toEqual(['/src/services/http.ts']);
  });
});

// ─── 2. Behavioral: authed client interceptor ───────────────────────────────
describe('http authed client', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(api);
    tokenStorage.clear();
  });

  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it('injects Authorization + x-tenant-id only when present, X-Correlation-ID always', async () => {
    // No token / tenant → headers absent, correlation still set.
    mock.onGet('/anon').reply(200, { ok: true });
    const anon = await api.get('/anon');
    expect(anon.config.headers.get('Authorization')).toBeFalsy();
    expect(anon.config.headers.get('x-tenant-id')).toBeFalsy();
    expect(anon.config.headers.has('X-Correlation-ID')).toBe(true);

    // With token + tenant → both present.
    tokenStorage.set({ accessToken: 'acc', refreshToken: 'ref', sessionId: 's1', userId: 'u1' });
    tokenStorage.setTenantId('tenant-9');
    mock.onGet('/authed').reply(200, { ok: true });
    const authed = await api.get('/authed');
    expect(authed.config.headers.get('Authorization')).toBe('Bearer acc');
    expect(authed.config.headers.get('x-tenant-id')).toBe('tenant-9');
    expect(authed.config.headers.has('X-Correlation-ID')).toBe(true);
  });

  it('does NOT refresh on auth-endpoint 401 (login/refresh) — rejects AuthenticationError', async () => {
    tokenStorage.set({ accessToken: 'acc', refreshToken: 'ref', sessionId: 's1', userId: 'u1' });
    const postSpy = vi.spyOn(axios, 'post');

    mock.onPost('/api/v1/auth/login').reply(401);
    await expect(api.post('/api/v1/auth/login', {})).rejects.toBeInstanceOf(AuthenticationError);

    mock.onPost('/api/v1/auth/refresh').reply(401);
    await expect(api.post('/api/v1/auth/refresh', {})).rejects.toBeInstanceOf(AuthenticationError);

    expect(postSpy).not.toHaveBeenCalled();
  });
});

// ─── 2b. Behavioral: auth-scope headers omitted on /auth/login & /auth/refresh ──
describe('http authed client: auth-endpoint header omission', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(api);
    tokenStorage.set({ accessToken: 'acc', refreshToken: 'ref', sessionId: 's1', userId: 'u1' });
    tokenStorage.setTenantId('tenant-9');
    localStorage.setItem('hpx:active-department', 'dept-5');
  });

  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
    tokenStorage.clear();
    localStorage.removeItem('hpx:active-department');
  });

  it('omits Authorization, x-tenant-id, X-Department-Id on /auth/login but keeps X-Correlation-ID', async () => {
    mock.onPost('/api/v1/auth/login').reply(200, { ok: true });
    const res = await api.post('/api/v1/auth/login', {});
    expect(res.config.headers.has('Authorization')).toBe(false);
    expect(res.config.headers.has('x-tenant-id')).toBe(false);
    expect(res.config.headers.has('X-Department-Id')).toBe(false);
    expect(res.config.headers.has('X-Correlation-ID')).toBe(true);
  });

  it('omits Authorization, x-tenant-id, X-Department-Id on /auth/refresh but keeps X-Correlation-ID', async () => {
    mock.onPost('/api/v1/auth/refresh').reply(200, { ok: true });
    const res = await api.post('/api/v1/auth/refresh', {});
    expect(res.config.headers.has('Authorization')).toBe(false);
    expect(res.config.headers.has('x-tenant-id')).toBe(false);
    expect(res.config.headers.has('X-Department-Id')).toBe(false);
    expect(res.config.headers.has('X-Correlation-ID')).toBe(true);
  });

  it('still attaches Authorization, x-tenant-id, X-Department-Id on a non-auth url (control)', async () => {
    mock.onGet('/api/v1/users/me').reply(200, { ok: true });
    const res = await api.get('/api/v1/users/me');
    expect(res.config.headers.get('Authorization')).toBe('Bearer acc');
    expect(res.config.headers.get('x-tenant-id')).toBe('tenant-9');
    expect(res.config.headers.get('X-Department-Id')).toBe('dept-5');
    expect(res.config.headers.has('X-Correlation-ID')).toBe(true);
  });
});

// ─── 3. Public client: no auth teardown on 401 ──────────────────────────────
describe('http public client', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(publicApi);
    tokenStorage.set({ accessToken: 'acc', refreshToken: 'ref', sessionId: 's1', userId: 'u1' });
  });

  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
    tokenStorage.clear();
  });

  it('a 401 does NOT dispatch LOGOUT and does NOT clear tokens', async () => {
    const logoutSpy = vi.fn();
    const unsub = authEventBus.subscribe(AUTH_EVENTS.LOGOUT, logoutSpy);
    const postSpy = vi.spyOn(axios, 'post');

    mock.onPost('/api/v1/mandate/upload-url').reply(401);
    await expect(publicApi.post('/api/v1/mandate/upload-url', {})).rejects.toBeTruthy();

    expect(logoutSpy).not.toHaveBeenCalled();
    expect(postSpy).not.toHaveBeenCalled(); // no refresh attempted
    expect(tokenStorage.get()?.accessToken).toBe('acc'); // tokens intact
    unsub();
  });
});

// ─── 4. Fail-fast module-load gate (dev/test only) ──────────────────────────
describe('http fail-fast on missing VITE_API_URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('throws in test mode when VITE_API_URL is empty', async () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.resetModules();
    await expect(import('./http')).rejects.toThrow(/VITE_API_URL/);
  });

  it('does NOT throw in production mode when VITE_API_URL is empty', async () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('DEV', false);
    vi.resetModules();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(import('./http')).resolves.toBeDefined();
    errSpy.mockRestore();
  });
});
