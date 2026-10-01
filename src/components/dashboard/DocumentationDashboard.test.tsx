import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DocumentationDashboard } from './DocumentationDashboard';

vi.mock('../../hooks/useDashboardMetrics', () => ({
  useDashboardMetrics: () => ({
    data: {
      activeDrafts: 11,
      reviewTurnaround: 5,
      complianceRate: 92,
      pendingSignatures: 13,
      overdueStages: 7,
      atRiskStages: 3,
      unit: 'hrs',
    },
    isLoading: false,
    error: null,
  }),
}));

describe('DocumentationDashboard stage KPIs', () => {
  it('renders overdue and at-risk stage counts', () => {
    render(<MemoryRouter><DocumentationDashboard /></MemoryRouter>);
    expect(screen.getByText('Overdue stages')).toBeTruthy();
    expect(screen.getByText('At-risk stages')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });
});
