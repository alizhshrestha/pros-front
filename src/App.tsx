import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LayoutGrid,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
  X,
  Check,
  ArrowRight,
  CalendarDays,
} from 'lucide-react';
import { TransactionFilterBar } from './components/TransactionFilterBar';
import { api } from './api';
import type { TransactionFilters, Draft, Master, Masters, Page, Transaction } from './types';
import { dateLabel, money, today, validate } from './utils';

const emptyMasters: Masters = { categories: [], types: [], methods: [] };
const message = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong. Please try again.';
const nameOf = (values: Master[], id: string) => values.find((v) => v._id === id)?.name || id;
type Overlay = { mode: 'add' } | { mode: 'view' | 'edit' | 'delete'; transaction: Transaction };

function Modal({
  title,
  subtitle,
  children,
  close,
  busy = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  close: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-head">
        <div>
          <span className="eyebrow">DAILY LOG</span>
          <h2 id="dialog-title">{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="icon-button" aria-label="Close dialog" disabled={busy} onClick={close}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function TransactionForm({
  transaction,
  masters,
  close,
  saved,
}: {
  transaction?: Transaction;
  masters: Masters;
  close: () => void;
  saved: () => void;
}) {
  const initial: Draft = transaction
    ? {
        transactionDate: transaction.transactionDate,
        description: transaction.description,
        categoryId: transaction.categoryId,
        transactionTypeId: transaction.transactionTypeId,
        paymentMethodId: transaction.paymentMethodId,
        amount: String(transaction.amount),
        notes: transaction.notes || '',
      }
    : {
        transactionDate: today(),
        description: '',
        categoryId: '',
        transactionTypeId: masters.types.find((t) => t.name === 'Debit')?._id || '',
        paymentMethodId: '',
        amount: '',
        notes: '',
      };
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const baseline = useRef(JSON.stringify(initial));
  const closeSafely = () => {
    if (
      !busy &&
      (baseline.current === JSON.stringify(draft) ||
        window.confirm('Discard your unsaved changes?'))
    )
      close();
  };
  const change = (key: keyof Draft, value: string) => {
    setDraft((d) => ({
      ...d,
      [key]: value,
      ...(key === 'categoryId' && value === 'cat_income'
        ? { transactionTypeId: 'type_credit' }
        : {}),
    }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };
  const options = (values: Master[], selected: string) => (
    <>
      <option value="">Select an option</option>
      {selected && !values.some((v) => v._id === selected) && (
        <option value={selected}>Inactive · {selected} (current)</option>
      )}
      {values.map((v) => (
        <option key={v._id} value={v._id}>
          {v.name}
        </option>
      ))}
    </>
  );
  const field = (key: keyof Draft, label: string, child: ReactNode, className = '') => (
    <div className={`field ${className}`}>
      <label htmlFor={key}>{label}</label>
      {child}
      {errors[key] && (
        <span className="field-error" id={`${key}-error`}>
          {errors[key]}
        </span>
      )}
    </div>
  );
  const attrs = (key: keyof Draft) => ({
    id: key,
    'aria-invalid': !!errors[key],
    'aria-describedby': errors[key] ? `${key}-error` : undefined,
  });
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next = validate(draft);
    setErrors(next);
    setFailure('');
    if (Object.keys(next).length) {
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    setBusy(true);
    try {
      await api.save(
        {
          ...draft,
          description: draft.description.trim(),
          amount: Number(draft.amount),
          notes: draft.notes.trim() || null,
        },
        transaction?._id,
      );
      saved();
    } catch (e) {
      setFailure(message(e));
      setBusy(false);
    }
  }
  return (
    <Modal
      title={transaction ? 'Edit transaction' : 'Add a transaction'}
      subtitle="A small entry. A clearer picture."
      close={closeSafely}
      busy={busy}
    >
      <form onSubmit={submit} noValidate>
        <fieldset disabled={busy}>
          <div className="form-grid">
            {field(
              'transactionTypeId',
              'Transaction type',
              <select
                {...attrs('transactionTypeId')}
                value={draft.transactionTypeId}
                onChange={(e) => change('transactionTypeId', e.target.value)}
              >
                {options(masters.types, draft.transactionTypeId)}
              </select>,
            )}
            {field(
              'transactionDate',
              'Transaction date',
              <input
                {...attrs('transactionDate')}
                type="date"
                value={draft.transactionDate}
                onChange={(e) => change('transactionDate', e.target.value)}
              />,
            )}
            {field(
              'description',
              'Description',
              <input
                {...attrs('description')}
                autoFocus
                placeholder="What was this transaction for?"
                maxLength={500}
                value={draft.description}
                onChange={(e) => change('description', e.target.value)}
              />,
              'full',
            )}
            {field(
              'amount',
              'Amount · NPR',
              <input
                {...attrs('amount')}
                inputMode="decimal"
                placeholder="0.00"
                value={draft.amount}
                onChange={(e) => change('amount', e.target.value)}
              />,
            )}
            {field(
              'paymentMethodId',
              'Payment method',
              <select
                {...attrs('paymentMethodId')}
                value={draft.paymentMethodId}
                onChange={(e) => change('paymentMethodId', e.target.value)}
              >
                {options(masters.methods, draft.paymentMethodId)}
              </select>,
            )}
            {field(
              'categoryId',
              'Category',
              <select
                {...attrs('categoryId')}
                value={draft.categoryId}
                onChange={(e) => change('categoryId', e.target.value)}
              >
                {options(masters.categories, draft.categoryId)}
              </select>,
              'full',
            )}
            {field(
              'notes',
              'Notes (optional)',
              <textarea
                {...attrs('notes')}
                rows={3}
                maxLength={2000}
                placeholder="Any details you’d like to remember…"
                value={draft.notes}
                onChange={(e) => change('notes', e.target.value)}
              />,
              'full',
            )}
          </div>
          <p className="form-hint">
            Past and future dates are welcome. Amounts are always positive; Debit or Credit sets the
            direction.
          </p>
        </fieldset>
        {failure && (
          <div className="error-box" role="alert">
            {failure} Your entries are still here.
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" className="button secondary" disabled={busy} onClick={closeSafely}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? <LoaderCircle size={17} className="spin" /> : <Check size={17} />}{' '}
            {busy ? 'Saving…' : transaction ? 'Save changes' : 'Save transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteDialog({
  transaction,
  close,
  deleted,
}: {
  transaction: Transaction;
  close: () => void;
  deleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function remove() {
    setBusy(true);
    setError('');
    try {
      await api.remove(transaction._id);
      deleted();
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }
  return (
    <Modal title="Delete this transaction?" close={close} busy={busy}>
      <div className="delete-content">
        <div className="delete-icon">
          <Trash2 size={24} />
        </div>
        <h3>{transaction.description}</h3>
        <p>
          {dateLabel(transaction.transactionDate)} <span>·</span> NPR {money(transaction.amount)}
        </p>
        <p>
          This transaction will be removed from your history. Its record will be retained in the
          database.
        </p>
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
      </div>
      <div className="dialog-actions">
        <button className="button secondary" disabled={busy} onClick={close}>
          Keep transaction
        </button>
        <button className="button danger" disabled={busy} onClick={remove}>
          {busy ? 'Deleting…' : 'Delete transaction'}
        </button>
      </div>
    </Modal>
  );
}

export default function App() {
  const [masters, setMasters] = useState<Masters>(emptyMasters);
  const [masterError, setMasterError] = useState('');
  const [mastersLoading, setMastersLoading] = useState(true);
  const [data, setData] = useState<Page<Transaction> | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [revision, setRevision] = useState(0);
  const [filterDraft, setFilterDraft] = useState<TransactionFilters>({});
  const [filterError, setFilterError] = useState('');
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [opening, setOpening] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let ignore = false;
    setMastersLoading(true);
    api
      .masters()
      .then((m) => {
        if (!ignore) {
          setMasters(m);
          setMasterError('');
        }
      })
      .catch((e) => {
        if (!ignore) setMasterError(message(e));
      })
      .finally(() => {
        if (!ignore) setMastersLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [revision]);
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    api
      .history(page, size, filters)
      .then((result) => {
        if (ignore) return;
        if (page > 0 && page >= result.totalPages) {
          setPage(Math.max(0, result.totalPages - 1));
          return;
        }
        setData(result);
      })
      .catch((e) => {
        if (!ignore) {
          setError(message(e));
          setData(null);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [page, size, revision, filters]);
  const editReady = !mastersLoading && !masterError && masters.types.length > 0;
  const ready = editReady && masters.categories.length > 0 && masters.methods.length > 0;
  async function open(transaction: Transaction, mode: 'view' | 'edit' | 'delete') {
    if (opening) return;
    setOpening(true);
    try {
      const fresh = await api.get(transaction._id);
      setOverlay({ mode, transaction: fresh });
    } catch (e) {
      setNotice(message(e));
      setRevision((r) => r + 1);
    } finally {
      setOpening(false);
    }
  }
  const done = (text: string) => {
    setOverlay(null);
    setNotice(text);
    setRevision((r) => r + 1);
  };
  const credit = (t: Transaction) =>
    nameOf(masters.types, t.transactionTypeId) === 'Credit' ||
    t.transactionTypeId === 'type_credit';
  const hasFilters = Object.values(filters).some(Boolean);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (filterDraft.from && filterDraft.to && filterDraft.from > filterDraft.to) {
      setFilterError('From date must be on or before To date.');
      return;
    }
    const normalized = Object.fromEntries(
      Object.entries(filterDraft)
        .map(([key, value]) => [key, value?.trim()])
        .filter(([, value]) => value),
    );
    setFilterError('');
    setPage(0);
    setFilters(normalized);
  }

  function clearFilters() {
    setFilterError('');
    setFilterDraft({});
    setFilters({});
    setPage(0);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#">
          <div className="brand-mark">
            <Wallet size={23} />
          </div>
          <div>
            pfos<span>PERSONAL FINANCE</span>
          </div>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <a className="nav-item selected" href="#">
          <BookOpen size={19} /> Daily Log <span className="nav-dot" />
        </a>
        <div className="sidebar-note">
          <div className="note-art">
            <LayoutGrid size={22} />
          </div>
          <h3>Build a clearer picture.</h3>
          <p>One transaction at a time. Your daily log is where it all begins.</p>
          <span>YOUR MONEY, WITH INTENTION</span>
        </div>
        <div className="profile">
          <div className="avatar">P</div>
          <div>
            Personal workspace<small>Nepal · NPR</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>Daily Log</strong>
          </div>
          <div className="topbar-right">
            <span className="currency-tag">NPR</span>
            <span className="avatar small">P</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">A LITTLE CLARITY, EVERY DAY</div>
              <h1>
                Your daily log<span>.</span>
              </h1>
              <p>Keep the details. See where your money goes.</p>
            </div>
            <button
              className="button primary"
              disabled={!ready}
              onClick={() => setOverlay({ mode: 'add' })}
            >
              <Plus size={19} /> Add transaction
            </button>
          </div>
          <section className="intro-card">
            <div className="intro-icon">
              <BookOpen size={27} />
            </div>
            <div>
              <h2>Every entry tells a story.</h2>
              <p>Record what comes in and what goes out, all in one place.</p>
            </div>
            <div className="intro-date">
              <CalendarDays size={17} />
              {dateLabel(today())}
            </div>
            <div className="intro-lines" aria-hidden="true" />
          </section>
          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button
                className="icon-button"
                aria-label="Dismiss message"
                onClick={() => setNotice('')}
              >
                <X size={17} />
              </button>
            </div>
          )}
          {masterError && (
            <div className="error-box" role="alert">
              Dropdown values could not load. {masterError}{' '}
              <button className="text-button" onClick={() => setRevision((r) => r + 1)}>
                Retry
              </button>
            </div>
          )}
          {!mastersLoading && !masterError && !ready && (
            <div className="error-box">
              Add categories, transaction types, and payment methods in the backend before recording
              transactions.
            </div>
          )}
          <section className="ledger-card" aria-labelledby="history-title">
            <div className="ledger-header">
              <div>
                <h2 id="history-title">
                  Transaction history{' '}
                  <span className="count">
                    {!loading && !error && data ? data.totalElements : '—'}
                  </span>
                </h2>
                <p>Your recorded income and expenses, most recent date first.</p>
              </div>
              <button
                className="button secondary compact"
                disabled={loading || opening}
                onClick={() => setRevision((r) => r + 1)}
              >
                <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
              </button>
            </div>
            <TransactionFilterBar
              draft={filterDraft}
              masters={masters}
              masterDisabled={mastersLoading || !!masterError}
              error={filterError}
              onChange={setFilterDraft}
              onApply={applyFilters}
              onClear={clearFilters}
            />
            {loading ? (
              <div className="state-panel" role="status">
                <LoaderCircle className="spin" size={28} />
                <h3>Loading your transactions</h3>
                <p>Getting your latest entries…</p>
              </div>
            ) : error ? (
              <div className="state-panel" role="alert">
                <CircleHelp size={30} />
                <h3>Let’s get you connected</h3>
                <p>{error}</p>
                <button className="button secondary" onClick={() => setRevision((r) => r + 1)}>
                  Try again <ArrowRight size={16} />
                </button>
              </div>
            ) : !data?.items.length && hasFilters ? (
              <div className="state-panel">
                <BookOpen size={30} />
                <h3>No matching transactions</h3>
                <p>Try a different date range or clear your filters to see all transactions.</p>
                <button className="button secondary" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : !data?.items.length ? (
              <div className="state-panel">
                <div className="empty-illustration">
                  <BookOpen size={38} />
                  <span>+</span>
                </div>
                <h3>A fresh page for your finances</h3>
                <p>
                  Add your first transaction. A coffee, a grocery run,
                  <br /> or your latest payday is a good place to start.
                </p>
                <button
                  className="button primary"
                  disabled={!ready}
                  onClick={() => setOverlay({ mode: 'add' })}
                >
                  <Plus size={17} /> Add your first transaction
                </button>
              </div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Method</th>
                      <th className="align-right">
                        Amount <span>(NPR)</span>
                      </th>
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((t) => (
                      <tr key={t._id}>
                        <td className="date-cell">{dateLabel(t.transactionDate)}</td>
                        <td>
                          <div className="description-cell">
                            <span className={`direction-icon ${credit(t) ? 'credit' : ''}`}>
                              {credit(t) ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                            </span>
                            <div>
                              <button
                                className="description-button"
                                disabled={opening}
                                onClick={() => open(t, 'view')}
                              >
                                {t.description}
                              </button>
                              <small>{credit(t) ? 'Credit · Money in' : 'Debit · Money out'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="category-tag">
                            {nameOf(masters.categories, t.categoryId)}
                          </span>
                        </td>
                        <td className="method-cell">
                          {nameOf(masters.methods, t.paymentMethodId)}
                        </td>
                        <td className={`amount-cell ${credit(t) ? 'positive' : ''}`}>
                          {credit(t) ? '+' : '−'}
                          {money(t.amount)}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-button"
                              aria-label={`Edit ${t.description}`}
                              disabled={opening || !editReady}
                              onClick={() => open(t, 'edit')}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="icon-button delete-button"
                              aria-label={`Delete ${t.description}`}
                              disabled={opening}
                              onClick={() => open(t, 'delete')}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="pagination">
              <div>
                {!loading && !error && data
                  ? `${data.totalElements ? page * size + 1 : 0}–${Math.min((page + 1) * size, data.totalElements)} of ${data.totalElements} transactions`
                  : 'Transaction history'}
                <label>
                  Rows{' '}
                  <select
                    aria-label="Transactions per page"
                    value={size}
                    onChange={(e) => {
                      setSize(Number(e.target.value));
                      setPage(0);
                    }}
                  >
                    <option>10</option>
                    <option>20</option>
                    <option>50</option>
                  </select>
                </label>
              </div>
              <div>
                <button
                  className="icon-button"
                  aria-label="Previous page"
                  disabled={loading || !!error || page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <span>
                  Page {page + 1} of {Math.max(1, data?.totalPages || 0)}
                </span>
                <button
                  className="icon-button"
                  aria-label="Next page"
                  disabled={loading || !!error || !data || page + 1 >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </section>
          <footer className="page-footer">
            <span>
              <span className="little-dot" /> A place for every transaction.
            </span>
            <span>Personal Financial Operating System</span>
          </footer>
        </main>
      </div>
      {overlay?.mode === 'add' && (
        <TransactionForm
          masters={masters}
          close={() => setOverlay(null)}
          saved={() => done('Transaction added to your daily log.')}
        />
      )}
      {overlay?.mode === 'edit' && (
        <TransactionForm
          transaction={overlay.transaction}
          masters={masters}
          close={() => setOverlay(null)}
          saved={() => done('Transaction updated.')}
        />
      )}
      {overlay?.mode === 'delete' && (
        <DeleteDialog
          transaction={overlay.transaction}
          close={() => setOverlay(null)}
          deleted={() => done('Transaction deleted from your history.')}
        />
      )}
      {overlay?.mode === 'view' && (
        <Modal title="Transaction details" close={() => setOverlay(null)}>
          <div className="details">
            <div className="details-amount">
              <span>{credit(overlay.transaction) ? 'Credit · Money in' : 'Debit · Money out'}</span>
              <h3>NPR {money(overlay.transaction.amount)}</h3>
              <p>{overlay.transaction.description}</p>
            </div>
            <dl>
              {[
                ['Date', dateLabel(overlay.transaction.transactionDate)],
                ['Category', nameOf(masters.categories, overlay.transaction.categoryId)],
                ['Payment method', nameOf(masters.methods, overlay.transaction.paymentMethodId)],
                ['Notes', overlay.transaction.notes || 'No notes added'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="dialog-actions">
            <button className="button secondary" onClick={() => setOverlay(null)}>
              Close
            </button>
            <button
              className="button primary"
              disabled={!editReady}
              onClick={() => setOverlay({ mode: 'edit', transaction: overlay.transaction })}
            >
              <Pencil size={16} /> Edit transaction
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
