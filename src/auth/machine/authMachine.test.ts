import { describe, it, expect, beforeEach } from 'vitest';
import { AuthMachine } from './authMachine';
import { AuthState } from '../contracts/AuthContext';

describe('AuthMachine (FSM)', () => {
  let fsm: AuthMachine;

  beforeEach(() => {
    fsm = new AuthMachine();
  });

  it('starts in UNINITIALIZED state', () => {
    expect(fsm.state).toBe('UNINITIALIZED');
  });

  it('allows valid transitions', () => {
    fsm.transition('RESTORING');
    expect(fsm.state).toBe('RESTORING');
    
    fsm.transition('AUTHENTICATED');
    expect(fsm.state).toBe('AUTHENTICATED');
    
    fsm.transition('REFRESHING');
    expect(fsm.state).toBe('REFRESHING');
    
    fsm.transition('AUTHENTICATED'); // Refresh Success
    expect(fsm.state).toBe('AUTHENTICATED');
    
    fsm.transition('UNAUTHENTICATED'); // Logout
    expect(fsm.state).toBe('UNAUTHENTICATED');
    
    fsm.transition('AUTHENTICATED'); // Login Success
    expect(fsm.state).toBe('AUTHENTICATED');
  });

  it('rejects illegal transitions', () => {
    // Cannot jump straight from UNINITIALIZED to AUTHENTICATED
    expect(() => fsm.transition('AUTHENTICATED')).toThrowError('Illegal FSM transition');
    
    // Cannot go from UNAUTHENTICATED to REFRESHING
    fsm.transition('UNAUTHENTICATED');
    expect(() => fsm.transition('REFRESHING')).toThrowError('Illegal FSM transition');
  });

  it('notifies subscribers on state change', () => {
    const subscriber = { notify: () => {} };
    let calledWith: AuthState | null = null;
    
    const unsubscribe = fsm.subscribe((state) => {
      calledWith = state;
    });

    fsm.transition('RESTORING');
    expect(calledWith).toBe('RESTORING');
    
    unsubscribe();
    fsm.transition('UNAUTHENTICATED');
    // Shouldn't be called again since we unsubscribed
    expect(calledWith).toBe('RESTORING');
  });
});
