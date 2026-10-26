import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppToast } from './AppToast';

describe('AppToast', () => {
  it('renders the message text', () => {
    render(<AppToast variant="success" message="Saved successfully" onDismiss={() => {}} />);
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
  });

  it('success and info are polite status regions', () => {
    const { rerender } = render(<AppToast variant="success" message="ok" onDismiss={() => {}} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    rerender(<AppToast variant="info" message="ok" onDismiss={() => {}} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('error and warning are assertive alert regions', () => {
    const { rerender } = render(<AppToast variant="error" message="bad" onDismiss={() => {}} />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    rerender(<AppToast variant="warning" message="warn" onDismiss={() => {}} />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('has a dismiss button with the standard aria-label that fires onDismiss', async () => {
    const onDismiss = vi.fn();
    render(<AppToast variant="success" message="ok" onDismiss={onDismiss} />);
    const btn = screen.getByRole('button', { name: 'Dismiss notification' });
    await userEvent.click(btn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders action and cancel buttons; each runs its handler then dismisses', async () => {
    const onAction = vi.fn(); const onCancel = vi.fn(); const onDismiss = vi.fn();
    render(
      <AppToast variant="success" message="Handed off" onDismiss={onDismiss}
        action={{ label: 'Open case', onClick: onAction }} cancel={{ label: 'Send now', onClick: onCancel }} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open case' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Send now' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it('renders no actions row when none are provided', () => {
    const { container } = render(<AppToast variant="info" message="ok" onDismiss={() => {}} />);
    expect(container.querySelector('.app-toast__actions')).toBeNull();
  });

  it('loading variant: polite status, spinning icon, no progress bar', () => {
    const { container } = render(<AppToast variant="loading" message="Processing…" onDismiss={() => {}} duration={Infinity} />);
    const root = screen.getByRole('status');
    expect(root).toHaveAttribute('aria-live', 'polite');
    expect(root).toHaveAttribute('data-variant', 'loading');
    expect(container.querySelector('.app-toast__icon--spin')).toBeTruthy();
    expect(container.querySelector('.app-toast__progress')).toBeNull();
  });

  it('shows a remaining-time progress bar for a timed, non-action toast', () => {
    const { container } = render(<AppToast variant="success" message="ok" onDismiss={() => {}} duration={4000} />);
    expect(container.querySelector('.app-toast__progress')).toBeTruthy();
  });

  it('a persistent (Infinity) toast shows no progress bar, even with an action', () => {
    const { container } = render(
      <AppToast variant="info" message="ok" onDismiss={() => {}} duration={Infinity} action={{ label: 'Go', onClick: () => {} }} />,
    );
    expect(container.querySelector('.app-toast__progress')).toBeNull();
  });

  it('an action toast with a finite duration still shows the countdown bar', () => {
    const { container } = render(
      <AppToast variant="info" message="ok" onDismiss={() => {}} duration={10000} action={{ label: 'Go', onClick: () => {} }} />,
    );
    expect(container.querySelector('.app-toast__progress')).toBeTruthy();
  });

  it('renders an optional title above the message', () => {
    render(<AppToast variant="success" title="Saved" message="Your changes are live." onDismiss={() => {}} />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Your changes are live.')).toBeInTheDocument();
  });

  it('renders a decorative (aria-hidden) variant icon, and tags the variant', () => {
    const { container } = render(<AppToast variant="warning" message="ok" onDismiss={() => {}} />);
    const root = screen.getByRole('alert');
    expect(root).toHaveAttribute('data-variant', 'warning');
    // the leading status icon is decorative — the role/label already convey meaning
    const icons = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThanOrEqual(1);
  });
});
