import { describe, expect, it, vi, afterEach } from 'vitest';
import { validate, today, dateLabel } from './utils';
import { api, request } from './api';
const valid = {
  transactionDate: '2026-10-16',
  description: 'Milk',
  categoryId: 'cat_food',
  transactionTypeId: 'type_debit',
  paymentMethodId: 'method_cash',
  amount: '120.50',
  notes: '',
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe('transaction rules', () => {
  it('allows past and future dates', () => {
    expect(validate({ ...valid, transactionDate: '2020-01-01' })).toEqual({});
    expect(validate({ ...valid, transactionDate: '2030-01-01' })).toEqual({});
  });
  it('rejects impossible dates and whitespace descriptions', () => {
    expect(validate({ ...valid, transactionDate: '2026-02-30' })).toHaveProperty('transactionDate');
    expect(validate({ ...valid, description: '   ' })).toHaveProperty('description');
  });
  it.each(['0', '-1', '1.001', '1000000000000', '1e2', 'NaN'])(
    'rejects invalid amount %s',
    (amount) => expect(validate({ ...valid, amount })).toHaveProperty('amount'),
  );
  it('requires credit for Income while allowing health credits', () => {
    expect(validate({ ...valid, categoryId: 'cat_income' })).toHaveProperty('transactionTypeId');
    expect(
      validate({ ...valid, categoryId: 'cat_health', transactionTypeId: 'type_credit' }),
    ).toEqual({});
  });
  it('uses the Kathmandu calendar day at UTC boundaries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15T19:00:00Z'));
    expect(today()).toBe('2026-10-16');
    expect(dateLabel('2026-10-16')).toBe('16 Oct 2026');
  });
});
describe('API client', () => {
  it('unwraps success envelopes', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ success: true, data: { _id: 'abc' } }))),
    );
    expect(await request('/transactions/abc')).toEqual({ _id: 'abc' });
  });
  it('preserves server validation messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Amount must be positive.' },
          }),
          { status: 400 },
        ),
      ),
    );
    await expect(request('/transactions')).rejects.toMatchObject({
      message: 'Amount must be positive.',
      status: 400,
    });
  });
  it('handles non-JSON server failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Proxy unavailable', { status: 502 })),
    );
    await expect(request('/transactions')).rejects.toMatchObject({ status: 502 });
  });
  it('handles network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(request('/transactions')).rejects.toMatchObject({ status: 0 });
  });
});

it('encodes filter values and omits blank query parameters', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ success: true, data: { items: [] } })));
  vi.stubGlobal('fetch', fetchMock);
  await api.history(2, 20, {
    search: '  milk & bread + coffee  ',
    categoryId: 'cat_food',
    from: '2026-10-01',
    to: ' ',
    paymentMethodId: '',
  });
  const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost');
  expect(Object.fromEntries(url.searchParams)).toEqual({
    page: '2',
    size: '20',
    search: 'milk & bread + coffee',
    categoryId: 'cat_food',
    from: '2026-10-01',
  });
});
