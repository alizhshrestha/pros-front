import type { Draft } from './types';
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const money = (amount: number) =>
  new Intl.NumberFormat('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    amount,
  );
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
export function validate(draft: Draft): Record<string, string> {
  const errors: Record<string, string> = {};
  const parsed = new Date(`${draft.transactionDate}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(draft.transactionDate) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== draft.transactionDate
  )
    errors.transactionDate = 'Enter a valid date.';
  if (!draft.description.trim()) errors.description = 'Enter a description.';
  else if (draft.description.trim().length > 500)
    errors.description = 'Use 500 characters or fewer.';
  if (!draft.categoryId) errors.categoryId = 'Choose a category.';
  if (!draft.transactionTypeId) errors.transactionTypeId = 'Choose Debit or Credit.';
  if (draft.categoryId === 'cat_income' && draft.transactionTypeId !== 'type_credit')
    errors.transactionTypeId = 'Income transactions must use Credit.';
  if (!draft.paymentMethodId) errors.paymentMethodId = 'Choose a payment method.';
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(draft.amount) || Number(draft.amount) <= 0)
    errors.amount = 'Enter a positive amount with up to 12 whole digits and 2 decimals.';
  if (draft.notes.trim().length > 2000) errors.notes = 'Use 2,000 characters or fewer.';
  return errors;
}
