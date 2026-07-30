import { AuthState } from '../contracts/AuthContext';

type TransitionMap = {
  [State in AuthState]: AuthState[];
};

/**
 * Defines the strictly allowed transitions in the Auth State Machine.
 * Any transition not listed here will be rejected by the machine.
 */
const ALLOWED_TRANSITIONS: TransitionMap = {
  UNINITIALIZED: ['RESTORING', 'UNAUTHENTICATED'],
  RESTORING: ['AUTHENTICATED', 'UNAUTHENTICATED', 'RESTORE_ERROR'],
  AUTHENTICATED: ['REFRESHING', 'UNAUTHENTICATED'],
  REFRESHING: ['AUTHENTICATED', 'UNAUTHENTICATED', 'AUTH_ERROR'],
  UNAUTHENTICATED: ['AUTHENTICATED'],
  RESTORE_ERROR: ['RESTORING', 'UNAUTHENTICATED'],
  AUTH_ERROR: ['UNAUTHENTICATED'],
  NETWORK_ERROR: ['RESTORING', 'UNAUTHENTICATED'],
};

export class AuthMachine {
  private _state: AuthState = 'UNINITIALIZED';
  private subscribers: Array<(state: AuthState) => void> = [];

  get state(): AuthState {
    return this._state;
  }

  /**
   * Attempts to transition the FSM to a new state.
   * Throws an Error if the transition is illegal.
   */
  transition(newState: AuthState): void {
    const allowed = ALLOWED_TRANSITIONS[this._state];
    
    if (!allowed.includes(newState) && this._state !== newState) {
      throw new Error(`Illegal FSM transition: Cannot move from ${this._state} to ${newState}`);
    }

    if (this._state !== newState) {
      this._state = newState;
      this.notify();
    }
  }

  subscribe(callback: (state: AuthState) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notify(): void {
    this.subscribers.forEach(sub => sub(this._state));
  }
}
