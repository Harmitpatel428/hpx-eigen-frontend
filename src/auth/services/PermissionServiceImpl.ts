import { PermissionManifest, PermissionService } from '../contracts/PermissionService';

export class PermissionServiceImpl implements PermissionService {
  private manifest: Set<string> = new Set();
  private roles: Set<string> = new Set();

  can(slug: string): boolean {
    return this.manifest.has(slug);
  }

  canAny(slugs: string[]): boolean {
    if (slugs.length === 0) return false;
    return slugs.some(slug => this.manifest.has(slug));
  }

  canAll(slugs: string[]): boolean {
    if (slugs.length === 0) return false;
    return slugs.every(slug => this.manifest.has(slug));
  }

  hasRole(role: string): boolean {
    return this.roles.has(role);
  }

  hasAnyRole(roles: string[]): boolean {
    if (roles.length === 0) return false;
    return roles.some(role => this.roles.has(role));
  }

  setManifest(manifest: PermissionManifest, roles: string[]): void {
    this.manifest = new Set(Object.keys(manifest));
    this.roles = new Set(roles);
  }

  clear(): void {
    this.manifest.clear();
    this.roles.clear();
  }
}
