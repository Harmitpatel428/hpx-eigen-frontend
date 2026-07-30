import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionServiceImpl } from './PermissionServiceImpl';
import { PermissionManifest } from '../contracts/PermissionService';

describe('PermissionServiceImpl', () => {
  let service: PermissionServiceImpl;

  beforeEach(() => {
    service = new PermissionServiceImpl();
  });

  it('initially denies all permissions and roles', () => {
    expect(service.can('read:users')).toBe(false);
    expect(service.hasRole('admin')).toBe(false);
  });

  it('grants access when manifest is set', () => {
    const manifest: PermissionManifest = {
      'read:users': 'Can read users',
      'write:users': 'Can write users'
    };
    const roles = ['admin', 'manager'];
    
    service.setManifest(manifest, roles);

    expect(service.can('read:users')).toBe(true);
    expect(service.can('delete:users')).toBe(false);
    
    expect(service.hasRole('admin')).toBe(true);
    expect(service.hasRole('user')).toBe(false);
  });

  it('correctly evaluates canAny and canAll', () => {
    service.setManifest({ 'read:data': '' }, []);

    expect(service.canAny(['read:data', 'write:data'])).toBe(true);
    expect(service.canAny(['write:data', 'delete:data'])).toBe(false);
    expect(service.canAny([])).toBe(false);

    expect(service.canAll(['read:data'])).toBe(true);
    expect(service.canAll(['read:data', 'write:data'])).toBe(false);
    expect(service.canAll([])).toBe(false);
  });

  it('correctly evaluates hasAnyRole', () => {
    service.setManifest({}, ['user', 'moderator']);

    expect(service.hasAnyRole(['admin', 'moderator'])).toBe(true);
    expect(service.hasAnyRole(['admin', 'guest'])).toBe(false);
    expect(service.hasAnyRole([])).toBe(false);
  });

  it('clears permissions correctly', () => {
    service.setManifest({ 'read:data': '' }, ['admin']);
    expect(service.can('read:data')).toBe(true);
    
    service.clear();
    
    expect(service.can('read:data')).toBe(false);
    expect(service.hasRole('admin')).toBe(false);
  });
});
