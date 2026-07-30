import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { tokenStorage } from '../storage/tokenStorage';
import { authEventBus, AUTH_EVENTS } from '../events/authEvents';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const TestComponent = () => {
  const { status, user, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="user">{user ? user.id : 'none'}</div>
      <button data-testid="login" onClick={() => login('test@test.com', 'pw')}>Login</button>
      <button data-testid="logout" onClick={() => logout()}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    tokenStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('App startup restores session successfully', async () => {
    tokenStorage.set({ accessToken: 'a', refreshToken: 'r', sessionId: 's', userId: 'u' });
    vi.mocked(api.get).mockResolvedValueOnce({ data: { id: 'user1' } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial state -> then RESTORING -> then AUTHENTICATED
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('AUTHENTICATED');
    });
    expect(screen.getByTestId('user').textContent).toBe('user1');
    expect(api.get).toHaveBeenCalledWith('/api/v1/users/me');
  });

  it('App startup with corrupt storage logs out', async () => {
    tokenStorage.set({ accessToken: 'a', refreshToken: 'r', sessionId: 's', userId: 'u' });
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network or 401'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('UNAUTHENTICATED');
    });
    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('Login updates FSM and sets user', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        accessToken: 'new-a',
        refreshToken: 'new-r',
        sessionId: 'new-s',
        user: { id: 'user2' }
      }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('UNAUTHENTICATED');
    });

    act(() => {
      screen.getByTestId('login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('AUTHENTICATED');
    });
    expect(screen.getByTestId('user').textContent).toBe('user2');
    expect(tokenStorage.get()?.accessToken).toBe('new-a');
  });

  it('Logout updates FSM and clears user', async () => {
    tokenStorage.set({ accessToken: 'a', refreshToken: 'r', sessionId: 's', userId: 'u' });
    vi.mocked(api.get).mockResolvedValueOnce({ data: { id: 'user1' } });
    vi.mocked(api.post).mockResolvedValueOnce({}); // logout api call

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('AUTHENTICATED');
    });

    act(() => {
      screen.getByTestId('logout').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('UNAUTHENTICATED');
    });
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(tokenStorage.get()).toBeNull();
  });

  it('Storage event triggers logout (Cross-tab sync)', async () => {
    tokenStorage.set({ accessToken: 'a', refreshToken: 'r', sessionId: 's', userId: 'u' });
    vi.mocked(api.get).mockResolvedValueOnce({ data: { id: 'user1' } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('AUTHENTICATED');
    });

    // Simulate cross-tab logout (key is removed)
    act(() => {
      const event = new StorageEvent('storage', {
        key: 'auth:tokens',
        newValue: null,
      });
      window.dispatchEvent(event);
    });

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('UNAUTHENTICATED');
    });
  });

  it('Duplicate storage events debounced', async () => {
    tokenStorage.set({ accessToken: 'a', refreshToken: 'r', sessionId: 's', userId: 'u' });
    vi.mocked(api.get).mockResolvedValueOnce({ data: { id: 'user1' } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('AUTHENTICATED');
    });

    const logoutSpy = vi.fn();
    authEventBus.subscribe(AUTH_EVENTS.LOGOUT, logoutSpy);

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'auth:tokens',
        newValue: null,
      });
      // Dispatch 3 times in quick succession
      window.dispatchEvent(event);
      window.dispatchEvent(event);
      window.dispatchEvent(event);
    });

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('Context value remains referentially stable', async () => {
    let renders = 0;
    
    const RenderCounter = () => {
      const auth = useAuth();
      renders++;
      return <div data-testid="renders">{renders}</div>;
    };

    render(
      <AuthProvider>
        <RenderCounter />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(renders).toBeGreaterThan(0);
    });
    
    const countAfterMount = renders;
    
    // Dispatch an unrelated storage event
    act(() => {
      const event = new StorageEvent('storage', {
        key: 'some-other-key',
        newValue: 'xyz',
      });
      window.dispatchEvent(event);
    });
    
    // Renders should not increase from unrelated events because state did not change
    expect(renders).toBe(countAfterMount);
  });
});
