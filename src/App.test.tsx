// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { api } from './api';
import type { Transaction } from './types';
vi.mock('./api', () => ({
  api: { masters: vi.fn(), history: vi.fn(), get: vi.fn(), save: vi.fn(), remove: vi.fn() },
}));
const transaction: Transaction = {
  _id: 'test-id',
  transactionDate: '2026-10-16',
  description: 'Test groceries',
  categoryId: 'cat_food',
  transactionTypeId: 'type_debit',
  paymentMethodId: 'method_cash',
  amount: 120,
  notes: null,
  createdAt: '2026-10-16T00:00:00Z',
  updatedAt: '2026-10-16T00:00:00Z',
};
beforeEach(() => {
  vi.resetAllMocks();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  vi.mocked(api.masters).mockResolvedValue({
    categories: [{ _id: 'cat_food', name: 'Food & Groceries' }],
    types: [
      { _id: 'type_debit', name: 'Debit' },
      { _id: 'type_credit', name: 'Credit' },
    ],
    methods: [{ _id: 'method_cash', name: 'Cash' }],
  });
  vi.mocked(api.history).mockResolvedValue({
    items: [transaction],
    page: 0,
    size: 10,
    totalElements: 1,
    totalPages: 1,
  });
  vi.mocked(api.get).mockResolvedValue(transaction);
  vi.mocked(api.save).mockResolvedValue(transaction);
  vi.mocked(api.remove).mockResolvedValue({ _id: 'test-id', deleted: true });
});
afterEach(cleanup);
async function openCreate() {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('button', { name: 'Test groceries' });
  await user.click(screen.getByRole('button', { name: 'Add transaction' }));
  return user;
}
async function fillCreate(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Description'), '  New groceries  ');
  await user.type(screen.getByLabelText('Amount · NPR'), '250.50');
  await user.selectOptions(screen.getByLabelText('Category'), 'cat_food');
  await user.selectOptions(screen.getByLabelText('Payment method'), 'method_cash');
}
describe('transaction interface', () => {
  it('blocks incomplete submissions', async () => {
    const user = await openCreate();
    await user.click(screen.getByRole('button', { name: 'Save transaction' }));
    expect(screen.getByText('Enter a description.')).toBeTruthy();
    expect(api.save).not.toHaveBeenCalled();
  });
  it('submits the normalized create payload and refreshes history', async () => {
    const user = await openCreate();
    await fillCreate(user);
    await user.click(screen.getByRole('button', { name: 'Save transaction' }));
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'New groceries', amount: 250.5, notes: null }),
        undefined,
      ),
    );
    await screen.findByText('Transaction added to your daily log.');
    expect(api.history).toHaveBeenCalledTimes(2);
  });
  it('preserves input after a failed save', async () => {
    vi.mocked(api.save).mockRejectedValue(new Error('Selected category is inactive.'));
    const user = await openCreate();
    await fillCreate(user);
    await user.click(screen.getByRole('button', { name: 'Save transaction' }));
    await screen.findByText(/Selected category is inactive/);
    expect((screen.getByLabelText('Description') as HTMLInputElement).value).toBe(
      '  New groceries  ',
    );
    expect(screen.getByRole('button', { name: 'Save transaction' }).hasAttribute('disabled')).toBe(
      false,
    );
  });
  it('fetches the latest record and submits updates with its ID', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Edit Test groceries' }));
    const amount = await screen.findByLabelText('Amount · NPR');
    await user.clear(amount);
    await user.type(amount, '180');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith(expect.objectContaining({ amount: 180 }), 'test-id'),
    );
    expect(api.get).toHaveBeenCalledWith('test-id');
  });
  it('requires delete confirmation and refreshes after deletion', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Delete Test groceries' }));
    await screen.findByRole('heading', { name: 'Delete this transaction?' });
    expect(api.remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Keep transaction' }));
    expect(api.remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete Test groceries' }));
    await screen.findByRole('heading', { name: 'Delete this transaction?' });
    await user.click(screen.getByRole('button', { name: 'Delete transaction' }));
    await screen.findByText('Transaction deleted from your history.');
    expect(api.remove).toHaveBeenCalledWith('test-id');
  });
  it('shows an honest server error and allows retry', async () => {
    vi.mocked(api.history).mockRejectedValueOnce(new Error('Backend unavailable'));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Backend unavailable');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('button', { name: 'Test groceries' });
  });
});

describe('history filters', () => {
  it('applies all filters only on submit, resets pagination, and clears inputs', async () => {
    vi.mocked(api.history).mockResolvedValue({
      items: [transaction],
      page: 0,
      size: 10,
      totalElements: 25,
      totalPages: 3,
    });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', { name: 'Test groceries' });
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(api.history).toHaveBeenLastCalledWith(1, 10, {}));
    await user.type(screen.getByLabelText('Search description'), '  milk & bread  ');
    await user.type(screen.getByLabelText('From date'), '2026-10-01');
    await user.type(screen.getByLabelText('To date'), '2026-10-31');
    await user.selectOptions(screen.getByLabelText('Filter category'), 'cat_food');
    await user.selectOptions(screen.getByLabelText('Filter transaction type'), 'type_debit');
    await user.selectOptions(screen.getByLabelText('Filter payment method'), 'method_cash');
    expect(api.history).toHaveBeenCalledTimes(2);
    const applied = {
      search: 'milk & bread',
      from: '2026-10-01',
      to: '2026-10-31',
      categoryId: 'cat_food',
      transactionTypeId: 'type_debit',
      paymentMethodId: 'method_cash',
    };
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));
    await waitFor(() => expect(api.history).toHaveBeenLastCalledWith(0, 10, applied));
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(api.history).toHaveBeenLastCalledWith(1, 10, applied));
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(api.history).toHaveBeenCalledTimes(5));
    expect(api.history).toHaveBeenLastCalledWith(1, 10, applied);
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(api.history).toHaveBeenLastCalledWith(0, 10, {}));
    expect((screen.getByLabelText('Search description') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('From date') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Filter category') as HTMLSelectElement).value).toBe('');
  });

  it('blocks reversed date ranges without requesting history', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', { name: 'Test groceries' });
    await user.type(screen.getByLabelText('From date'), '2026-10-31');
    await user.type(screen.getByLabelText('To date'), '2026-10-01');
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(screen.getByRole('alert').textContent).toContain(
      'From date must be on or before To date.',
    );
    expect(api.history).toHaveBeenCalledTimes(1);
  });

  it('offers a way to clear filters when nothing matches', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('button', { name: 'Test groceries' });
    vi.mocked(api.history).mockResolvedValueOnce({
      items: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
    });
    await user.type(screen.getByLabelText('Search description'), 'missing');
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));
    await screen.findByRole('heading', { name: 'No matching transactions' });
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await screen.findByRole('button', { name: 'Test groceries' });
    expect(api.history).toHaveBeenLastCalledWith(0, 10, {});
  });
});
