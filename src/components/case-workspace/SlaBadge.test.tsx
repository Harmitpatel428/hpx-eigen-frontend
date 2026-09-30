import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SlaBadge } from './SlaBadge';

describe('SlaBadge', () => {
  it('renders AT_RISK amber', () => {
    render(<SlaBadge state="AT_RISK" />);
    expect(screen.getByText('At risk')).toHaveStyle({ color: '#92400e' });
  });
  it('renders OVERDUE red', () => {
    render(<SlaBadge state="OVERDUE" />);
    expect(screen.getByText('Overdue')).toHaveStyle({ color: '#991b1b' });
  });
  it('renders nothing for null', () => {
    const { container } = render(<SlaBadge state={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
