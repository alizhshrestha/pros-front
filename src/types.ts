export type Master = { _id: string; name: string; isActive?: boolean; sortOrder?: number };
export type Masters = { categories: Master[]; types: Master[]; methods: Master[] };
export type Transaction = {
  _id: string;
  transactionDate: string;
  description: string;
  categoryId: string;
  transactionTypeId: string;
  paymentMethodId: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
export type TransactionInput = Omit<Transaction, '_id' | 'createdAt' | 'updatedAt'>;
export type Page<T> = {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
export type Draft = Omit<TransactionInput, 'amount' | 'notes'> & { amount: string; notes: string };

export type TransactionFilters = {
  from?: string;
  to?: string;
  categoryId?: string;
  transactionTypeId?: string;
  paymentMethodId?: string;
  search?: string;
};
