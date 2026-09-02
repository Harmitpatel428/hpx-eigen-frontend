import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactForm, derivePersonFieldsFromMain } from './LeadModal';

const noop = () => {};

function renderForm(overrides: Partial<Parameters<typeof ContactForm>[0]> = {}) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    <ContactForm onSave={onSave} onCancel={onCancel} isFirst={false} {...overrides} />,
  );
  return { ...utils, onSave, onCancel };
}

describe('ContactForm UX contract', () => {
  // S1: valid add → mutation payload correct
  it('[S1] calls onSave with trimmed payload when names are filled', async () => {
    const user = userEvent.setup();
    const { onSave } = renderForm();
    const [first, last] = screen.getAllByRole('textbox').slice(0, 2);
    await user.type(first, '  Jane  ');
    await user.type(last, '  Doe  ');
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Jane', lastName: 'Doe' }),
    );
  });

  // S2: valid update → onSave called with updated values
  it('[S2] calls onSave with updated values in edit mode', async () => {
    const user = userEvent.setup();
    const { onSave } = renderForm({
      initial: { firstName: 'Old', lastName: 'Name', email: 'old@example.com' },
    });
    const [first] = screen.getAllByRole('textbox');
    await user.clear(first);
    await user.type(first, 'New');
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'New', lastName: 'Name' }),
    );
  });

  // S3: invalid → inline errors rendered, zero API calls
  it('[S3] shows inline error and does NOT call onSave when names are empty', () => {
    const { onSave } = renderForm();
    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByText('First and last name are required.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  // S4: 500 → button re-enabled (isPending goes false after error)
  it('[S4] button is enabled when isPending is false (post-error recovery)', () => {
    renderForm({ isPending: false });
    const btn = screen.getByText('Save');
    expect(btn.hasAttribute('disabled')).toBe(false);
  });

  it('[S4b] button shows Saving… and is disabled when isPending', () => {
    renderForm({ isPending: true });
    const btn = screen.getByText('Saving…');
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  // S5: rapid clicks → exactly one request (button disabled while pending)
  it('[S5] button is disabled while isPending, preventing double submit', () => {
    const { onSave } = renderForm({ isPending: true });
    const btn = screen.getByText('Saving…');
    fireEvent.click(btn);
    expect(onSave).not.toHaveBeenCalled();
  });

  // S6: cancel → no mutation fired
  it('[S6] cancel calls onCancel, never onSave', () => {
    const { onSave, onCancel } = renderForm();
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  // R1a: isMain checkbox controls the payload
  it('[R1] isMain flag is included in payload', async () => {
    const user = userEvent.setup();
    const { onSave } = renderForm();
    const [first, last] = screen.getAllByRole('textbox').slice(0, 2);
    await user.type(first, 'A');
    await user.type(last, 'B');
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    fireEvent.click(screen.getByText('Save'));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ isMain: true }));
  });
});

describe('derivePersonFieldsFromMain', () => {
  it('returns main contact fields when present', () => {
    const contacts = [
      { id: '1', leadId: 'l1', firstName: 'Neel', lastName: 'K', email: 'neel@test.com', phone: '111', company: 'NeelCo', isMain: false, role: null, createdAt: '', updatedAt: '' },
      { id: '2', leadId: 'l1', firstName: 'Harmit', lastName: 'P', email: 'h@test.com', phone: '222', company: 'HCo', isMain: true, role: null, createdAt: '', updatedAt: '' },
    ] as any;
    const result = derivePersonFieldsFromMain(contacts);
    expect(result).toEqual({ firstName: 'Harmit', lastName: 'P', email: 'h@test.com', phone: '222', company: 'HCo' });
  });

  it('returns null when no main contact', () => {
    const contacts = [
      { id: '1', leadId: 'l1', firstName: 'A', lastName: 'B', email: null, phone: null, company: null, isMain: false, role: null, createdAt: '', updatedAt: '' },
    ] as any;
    expect(derivePersonFieldsFromMain(contacts)).toBeNull();
  });

  it('preserves null email/company', () => {
    const contacts = [
      { id: '1', leadId: 'l1', firstName: 'X', lastName: 'Y', email: null, phone: null, company: null, isMain: true, role: null, createdAt: '', updatedAt: '' },
    ] as any;
    const result = derivePersonFieldsFromMain(contacts);
    expect(result).toEqual({ firstName: 'X', lastName: 'Y', email: null, phone: null, company: null });
  });
});
