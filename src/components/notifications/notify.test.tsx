import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppToast } from './AppToast';

const custom = vi.fn(() => 'id');
const dismiss = vi.fn();
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { custom, dismiss }) }));

// imported after the mock so notify binds to the mocked sonner
const { toast } = await import('./notify');

// Run the element-factory sonner.custom received, to inspect what it would render.
function lastRendered(id: string | number = 'id-1') {
  const factory = custom.mock.calls.at(-1)![0] as (id: string | number) => { type: unknown; props: Record<string, unknown> };
  return factory(id);
}

describe('notify wrapper', () => {
  beforeEach(() => { custom.mockClear(); dismiss.mockClear(); });

  it('maps each type to the matching AppToast variant + message', () => {
    toast.success('s'); expect(lastRendered()).toMatchObject({ type: AppToast, props: { variant: 'success', message: 's' } });
    toast.error('e');   expect(lastRendered()).toMatchObject({ type: AppToast, props: { variant: 'error', message: 'e' } });
    toast.warning('w'); expect(lastRendered()).toMatchObject({ type: AppToast, props: { variant: 'warning', message: 'w' } });
    toast.info('i');    expect(lastRendered()).toMatchObject({ type: AppToast, props: { variant: 'info', message: 'i' } });
  });

  it('a bare toast() call is an info notification (legacy default)', () => {
    toast('hello');
    expect(lastRendered().props).toMatchObject({ variant: 'info', message: 'hello' });
  });

  it('AppToast onDismiss dismisses that specific toast id', () => {
    toast.success('s');
    lastRendered('xyz').props.onDismiss();
    expect(dismiss).toHaveBeenCalledWith('xyz');
  });

  it('exposes a dismiss passthrough', () => {
    toast.dismiss('q');
    expect(dismiss).toHaveBeenCalledWith('q');
  });

  it('forwards action/cancel to AppToast and keeps them out of the sonner options', () => {
    const action = { label: 'Open', onClick: vi.fn() };
    const cancel = { label: 'Later', onClick: vi.fn() };
    toast.success('s', { action, cancel, duration: 10000 });
    const el = lastRendered();
    expect(el.props).toMatchObject({ action, cancel });
    const opts = custom.mock.calls.at(-1)![1] as Record<string, unknown>;
    expect(opts.duration).toBe(10000);
    expect(opts.action).toBeUndefined();
    expect(opts.cancel).toBeUndefined();
  });

  it('loading is persistent (Infinity), renders the loading variant, and is NOT de-duplicated', () => {
    toast.loading('Processing');
    const a = (custom.mock.calls.at(-1)![1] as Record<string, unknown>).id;
    toast.loading('Processing');
    const b = (custom.mock.calls.at(-1)![1] as Record<string, unknown>).id;
    expect(lastRendered().props).toMatchObject({ variant: 'loading', duration: Infinity });
    // parallel loading toasts must get distinct ids, never collapse into one
    expect(a).not.toBe(b);
    expect(a).not.toMatch(/^loading:/);
  });

  it('an action toast with no explicit duration persists (Infinity)', () => {
    toast.success('Handed off', { action: { label: 'Open', onClick: vi.fn() } });
    expect((custom.mock.calls.at(-1)![1] as Record<string, unknown>).duration).toBe(Infinity);
    expect(lastRendered().props).toMatchObject({ duration: Infinity });
  });

  it('an action toast with an explicit duration uses it (auto-dismiss window)', () => {
    toast.success('Handed off', { action: { label: 'Open', onClick: vi.fn() }, duration: 10000 });
    expect((custom.mock.calls.at(-1)![1] as Record<string, unknown>).duration).toBe(10000);
  });

  it('de-duplicates identical string toasts via a stable id', () => {
    toast.success('Saved');
    expect((custom.mock.calls.at(-1)![1] as Record<string, unknown>).id).toBe('success:Saved');
  });

  it('an explicit id (for morph) overrides the dedupe id', () => {
    toast.loading('Working', { id: 'job-1' });
    expect((custom.mock.calls.at(-1)![1] as Record<string, unknown>).id).toBe('job-1');
    toast.success('Done', { id: 'job-1' });
    expect((custom.mock.calls.at(-1)![1] as Record<string, unknown>).id).toBe('job-1');
  });

  it('non-string messages are not de-duplicated (distinct ids, never a variant:message key)', () => {
    toast.info(<span>hi</span>);
    const a = (custom.mock.calls.at(-1)![1] as Record<string, unknown>).id as string;
    toast.info(<span>hi</span>);
    const b = (custom.mock.calls.at(-1)![1] as Record<string, unknown>).id as string;
    expect(a).not.toBe(b);
    expect(a).not.toMatch(/^info:/);
  });

  it('passes an optional title through to AppToast', () => {
    toast.success('body', { title: 'Heading' });
    expect(lastRendered().props).toMatchObject({ title: 'Heading', message: 'body' });
  });
});
