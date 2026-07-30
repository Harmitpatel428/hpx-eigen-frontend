export const AUTH_EVENTS = {
  LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  LOGIN_FAILURE: 'AUTH_LOGIN_FAILED',
  REFRESH_STARTED: 'AUTH_REFRESH_STARTED',
  REFRESH_SUCCESS: 'AUTH_REFRESH_SUCCESS',
  REFRESH_FAILED: 'AUTH_REFRESH_FAILED',
  SESSION_RESTORED: 'AUTH_SESSION_RESTORED',
  LOGOUT: 'AUTH_LOGOUT',
  PERMISSIONS_UPDATED: 'AUTH_PERMISSION_UPDATED',
} as const;

export type AuthEventType = typeof AUTH_EVENTS[keyof typeof AUTH_EVENTS];

type EventCallback = (payload?: any) => void;

class AuthEventBus {
  private target = new EventTarget();

  subscribe(event: AuthEventType, callback: EventCallback): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      callback(customEvent.detail);
    };
    this.target.addEventListener(event, handler);
    
    // Return unsubscribe function
    return () => {
      this.target.removeEventListener(event, handler);
    };
  }

  dispatch(event: AuthEventType, payload?: any): void {
    const customEvent = new CustomEvent(event, { detail: payload });
    this.target.dispatchEvent(customEvent);
  }
}

export const authEventBus = new AuthEventBus();
