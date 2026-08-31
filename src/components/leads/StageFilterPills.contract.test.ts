import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { PILL_CLASS, PILL_ACTIVE_CLASS } from './StageFilterPills';

const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf-8');

describe('StageFilterPills CSS contract', () => {
  it('[C1] ::after on active pill has infinite 2s animation', () => {
    const re = new RegExp(
      `\\.${PILL_ACTIVE_CLASS.replace(/[-]/g, '\\-')}::after\\s*\\{[^}]*animation:[^}]*pill-pulse-active[^}]*2s[^}]*infinite`,
    );
    expect(css).toMatch(re);
  });

  it('[C2] keyframes pill-pulse-active contains ONLY transform and opacity', () => {
    const kf = css.match(/@keyframes pill-pulse-active\s*\{[\s\S]*?\n\}/);
    expect(kf).not.toBeNull();
    const props = [...kf![0].matchAll(/\d+%[^{]*\{([^}]+)\}/g)]
      .flatMap(m => m[1].split(';').map(s => s.trim().split(':')[0].trim()))
      .filter(Boolean);
    expect(props.length).toBeGreaterThan(0);
    for (const prop of props) {
      expect(['opacity', 'transform']).toContain(prop);
    }
  });

  it('[C3] no prefers-reduced-motion block references stage-pill (override regression guard)', () => {
    const blocks = [...css.matchAll(/@media\s*\(prefers-reduced-motion[^)]*\)\s*\{([\s\S]*?\n\})/g)];
    for (const block of blocks) {
      expect(block[1]).not.toMatch(/stage-pill/);
    }
  });

  it('[C4] active rule only changes visual properties (whitelist)', () => {
    const allowed = new Set(['color', 'background', 'background-color', 'border-color', 'box-shadow', 'filter']);
    const activeBlock = css.match(new RegExp(
      `\\.${PILL_ACTIVE_CLASS.replace(/[-]/g, '\\-')}\\s*\\{([^}]+)\\}`
    ));
    expect(activeBlock).not.toBeNull();
    const declarations = activeBlock![1]
      .split(';')
      .map(s => s.trim().split(':')[0].trim())
      .filter(Boolean);
    for (const prop of declarations) {
      expect(allowed).toContain(prop);
    }
  });

  it('[C5] base rule declares box-sizing border-box and border with transparent', () => {
    const baseBlock = css.match(new RegExp(
      `\\.${PILL_CLASS.replace(/[-]/g, '\\-')}\\s*\\{([^}]+)\\}`
    ));
    expect(baseBlock).not.toBeNull();
    expect(baseBlock![1]).toMatch(/box-sizing:\s*border-box/);
    expect(baseBlock![1]).toMatch(/border:\s*1px\s+solid\s+transparent/);
  });

  it('[C6] PRODUCT OVERRIDE marker present; one-shot keyframes absent', () => {
    expect(css).toContain('PRODUCT OVERRIDE 2026-08-31');
    expect(css).not.toMatch(/@keyframes pill-pulse\s*\{/);
    expect(css).not.toMatch(/@keyframes pill-pulse-reduced/);
  });

  it('[C7] no .stage-pill__ring class remains in src/', () => {
    const srcDir = resolve(__dirname, '../..');
    function walk(dir: string): string[] {
      const files: string[] = [];
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (entry === 'node_modules' || entry === '.git') continue;
        if (statSync(full).isDirectory()) files.push(...walk(full));
        else if (/\.(tsx?|css|jsx?)$/.test(entry)) files.push(full);
      }
      return files;
    }
    for (const file of walk(srcDir)) {
      const content = readFileSync(file, 'utf-8');
      if (file.includes('.contract.test.')) continue;
      expect(content, `Found stage-pill__ring in ${file}`).not.toMatch(/stage-pill__ring/);
    }
  });
});
