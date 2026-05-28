// ── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateAccountRequestDto {
    userId:      number;
    accountName: string;
    accountType: string;   // Bank | Wallet | Credit | Investment
    currency:    string;   // INR | USD | EUR
    balance:     number;
    linkedAt:    string;   // ISO 8601
  }
  
  export interface UpdateAccountRequestDto {
    accountId:   number;
    accountName: string;
    accountType: string;
    currency:    string;
    balance:     number;
  }
  
  // ── Response DTO ──────────────────────────────────────────────────────────────
  
  export interface AccountResponseDto {
    accountId:   number;
    userId:      number;
    accountName: string;
    accountType: string;
    currency:    string;
    balance:     number;
    linkedAt:    string;
  }
  
  // ── Form model (used inside the component) ────────────────────────────────────
  
  export interface AccountForm {
    accountId:   number | null;
    accountName: string;
    accountType: string;
    currency:    string;
    balance:     string;   // string while editing so decimal input works
  }
  
  // ── UI state enums ────────────────────────────────────────────────────────────
  
  export type ModalMode = 'create' | 'edit' | 'delete' | 'none';
  