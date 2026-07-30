import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { api } from './api';
import { tokenStorage } from '../storage/tokenStorage';
import { authEventBus, AUTH_EVENTS } from '../events/authEvents';

describe('Auth API Service', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(api);
    tokenStorage.clear();
  });

  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  it('adds Authorization and x-tenant-id headers if available', async () => {
    tokenStorage.set({ accessToken: 'test-access', refreshToken: 'test-refresh', sessionId: 's1', userId: 'u1' });
    tokenStorage.setTenantId('tenant-123');

    mock.onGet('/test').reply(200, { ok: true });

    const response = await api.get('/test');
    
    expect(response.config.headers.get('Authorization')).toBe('Bearer test-access');
    expect(response.config.headers.get('x-tenant-id')).toBe('tenant-123');
    expect(response.config.headers.has('X-Correlation-ID')).toBe(true);
  });

  it('triggers exactly one refresh request for concurrent 401s', async () => {
    // Ensure we have a refresh token
    tokenStorage.set({ accessToken: 'old-access', refreshToken: 'valid-refresh', sessionId: 's1', userId: 'u1' });

    // Mock original request to fail with 401
    mock.onGet('/resource1').replyOnce(401);
    mock.onGet('/resource2').replyOnce(401);
    
    // Once retried with new token, succeed
    mock.onGet('/resource1').reply(200, { data: 'r1' });
    mock.onGet('/resource2').reply(200, { data: 'r2' });

    // The refresh endpoint needs to be mocked on the GLOBAL axios since our interceptor uses standard axios.post to bypass interceptors
    // We'll mock the global axios to intercept the refresh call.
    // Wait, axios-mock-adapter normally intercepts the instance. 
    // We need to mock the global one or ensure the URL matches exactly.
    // Let's use vi.mock for axios, or we can use another mock instance.
    // A simpler way: The interceptor uses `axios.post`. We can mock it directly.
    const axios = await import('axios');
    const postSpy = vi.spyOn(axios.default, 'post').mockResolvedValue({
      data: { accessToken: 'new-access', refreshToken: 'new-refresh' }
    });

    const eventSpy = vi.fn();
    authEventBus.subscribe(AUTH_EVENTS.REFRESH_SUCCESS, eventSpy);

    // Fire two requests concurrently
    const p1 = api.get('/resource1');
    const p2 = api.get('/resource2');

    const [res1, res2] = await Promise.all([p1, p2]);

    expect(res1.data.data).toBe('r1');
    expect(res2.data.data).toBe('r2');
    
    // Assert exactly ONE refresh call was made
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith(expect.stringContaining('/api/v1/auth/refresh'), { refreshToken: 'valid-refresh' });
    
    // Assert event was fired
    expect(eventSpy).toHaveBeenCalledTimes(1);
    
    // Assert tokens were updated
    expect(tokenStorage.get()?.accessToken).toBe('new-access');
    
    // Also assert that the retried requests had the NEW token
    expect(res1.config.headers.get('Authorization')).toBe('Bearer new-access');
    expect(res2.config.headers.get('Authorization')).toBe('Bearer new-access');
  });
  
  it('clears storage and dispatches logout on refresh failure', async () => {
    tokenStorage.set({ accessToken: 'old-access', refreshToken: 'bad-refresh', sessionId: 's1', userId: 'u1' });

    mock.onGet('/resource').replyOnce(401);

    const axios = await import('axios');
    const postSpy = vi.spyOn(axios.default, 'post').mockRejectedValue({
      response: { status: 401 }
    });

    const logoutSpy = vi.fn();
    authEventBus.subscribe(AUTH_EVENTS.LOGOUT, logoutSpy);

    await expect(api.get('/resource')).rejects.toThrow('Session expired');

    // Storage should be cleared
    expect(tokenStorage.get()).toBeNull();
    
    // LOGOUT event should be dispatched
    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });
});
