import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { WaitingAuthorityBadge, WAITING_AUTHORITY_FULL_LABEL } from './WaitingAuthorityBadge';

describe('WaitingAuthorityBadge', () => {
  it('renders the compact label with the full status as the accessible label', () => {
    const { getByLabelText } = render(<WaitingAuthorityBadge waiting={true} />);
    const el = getByLabelText(WAITING_AUTHORITY_FULL_LABEL);
    expect(el.textContent).toBe('Work Completed');
  });

  it('renders nothing when not waiting', () => {
    const { container } = render(<WaitingAuthorityBadge waiting={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('fires onClick when the badge is activated', () => {
    const onClick = vi.fn();
    const { getByLabelText } = render(<WaitingAuthorityBadge waiting={true} onClick={onClick} />);
    fireEvent.click(getByLabelText(WAITING_AUTHORITY_FULL_LABEL));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
