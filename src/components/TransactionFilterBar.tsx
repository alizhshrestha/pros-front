import type { FormEvent } from 'react';
import type { Master, Masters, TransactionFilters } from '../types';

type Props = {
  draft: TransactionFilters;
  masters: Masters;
  masterDisabled: boolean;
  error: string;
  onChange: (filters: TransactionFilters) => void;
  onApply: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
};

export function TransactionFilterBar({
  draft,
  masters,
  masterDisabled,
  error,
  onChange,
  onApply,
  onClear,
}: Props) {
  function change(key: keyof TransactionFilters, value: string) {
    onChange({ ...draft, [key]: value });
  }

  function masterSelect(key: keyof TransactionFilters, label: string, values: Master[]) {
    return (
      <div className="field">
        <label htmlFor={`filter-${key}`}>{label}</label>
        <select
          id={`filter-${key}`}
          value={draft[key] || ''}
          disabled={masterDisabled}
          onChange={(event) => change(key, event.target.value)}
        >
          <option value="">All</option>
          {values.map((value) => (
            <option key={value._id} value={value._id}>
              {value.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <form className="transaction-filters" aria-label="Transaction filters" onSubmit={onApply}>
      <div className="filter-grid">
        <div className="field filter-search">
          <label htmlFor="filter-search">Search description</label>
          <input
            id="filter-search"
            type="search"
            placeholder="Search your transactions…"
            maxLength={500}
            value={draft.search || ''}
            onChange={(event) => change('search', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="filter-from">From date</label>
          <input
            id="filter-from"
            type="date"
            value={draft.from || ''}
            aria-describedby={error ? 'filter-error' : undefined}
            onChange={(event) => change('from', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="filter-to">To date</label>
          <input
            id="filter-to"
            type="date"
            value={draft.to || ''}
            aria-invalid={!!error}
            aria-describedby={error ? 'filter-error' : undefined}
            onChange={(event) => change('to', event.target.value)}
          />
        </div>
        {masterSelect('categoryId', 'Filter category', masters.categories)}
        {masterSelect('transactionTypeId', 'Filter transaction type', masters.types)}
        {masterSelect('paymentMethodId', 'Filter payment method', masters.methods)}
      </div>
      {error && (
        <p className="field-error" id="filter-error" role="alert">
          {error}
        </p>
      )}
      <div className="filter-actions">
        <span>Combine filters, then apply to search. Dates are inclusive.</span>
        <button className="button secondary compact" type="button" onClick={onClear}>
          Clear
        </button>
        <button className="button primary compact" type="submit">
          Apply filters
        </button>
      </div>
    </form>
  );
}
