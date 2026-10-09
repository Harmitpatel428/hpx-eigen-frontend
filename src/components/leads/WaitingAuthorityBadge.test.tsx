import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WaitingAuthorityBadge, WAITING_AUTHORITY_FULL_LABEL } from './WaitingAuthorityBadge';

describe('WaitingAuthorityBadge', () => {
  it('renders a read-only compact label with the full status as the accessible label', () => {
    const { getByLabelText } = render(<WaitingAuthorityBadge waiting={true} />);
    const el = getByLabelText(WAITING_AUTHORITY_FULL_LABEL);
    expect(el.textContent).toBe('Work Completed');
    expect(el.tagName).toBe('SPAN'); // display-only, not a button
  });

  it('renders nothing when not waiting', () => {
    const { container } = render(<WaitingAuthorityBadge waiting={false} />);
    expect(container.firstChild).toBeNull();
  });
});
