// ── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateTransactionRequestDto {
    accountId:       number;
    amount:          number;
    currency:        string;
    type:            string;       // Income | Expense
    categoryId:      number;
    description:     string | null;
    transactionDate: string;       // ISO 8601
    isRecurring:     boolean;
  }
  
  export interface UpdateTransactionRequestDto {
    transactionId:   number;
    amount:          number;
    description:     string | null;
    transactionDate: string;       // ISO 8601
  }
  
  // ── Response DTO ──────────────────────────────────────────────────────────────
  
  export interface TransactionResponseDto {
    transactionId:   number;
    accountId:       number;
    accountName:     string;
    amount:          number;
    currency:        string;
    type:            string;
    categoryId:      number;
    categoryName:    string;
    description:     string | null;
    transactionDate: string;
    isRecurring:     boolean;
    createdAt:       string;
  }
  
  // ── Filter model ──────────────────────────────────────────────────────────────
  
  export interface TransactionFilter {
    accountId: number | null;
    fromDate:  string;
    toDate:    string;
    search:    string;       // client-side description/category filter
  }
  
  // ── Create/Edit form model ────────────────────────────────────────────────────
  
  export interface TransactionForm {
    transactionId:   number | null;
    accountId:       number | null;
    categoryId:      number | null;
    description:     string;
    type:            string;
    currency:        string;
    amount:          string;
    transactionDate: string;
    isRecurring:     boolean;
  }
  
  export type TxModalMode = 'create' | 'edit' | 'delete' | 'none';
  