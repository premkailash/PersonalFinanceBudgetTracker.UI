// ── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateBudgetRequestDto {
    userid:               number;
    accountId:            number;
    categoryId:           number;
    name:                 string;
    targetAmount:         number;
    currentAmount:        number;
    targetDate:           string;    // ISO 8601
    autoContributeAmount: number;
  }
  
  export interface UpdateBudgetRequestDto {
    budgetId:             number;
    name:                 string;
    targetAmount:         number;
    currentAmount:        number;
    targetDate:           string;    // ISO 8601
    autoContributeAmount: number;
  }
  
  // ── Response DTO ──────────────────────────────────────────────────────────────
  
  export interface BudgetResponseDto {
    budgetId:             number;
    userId:               number;
    accountId:            number;
    accountName:          string;
    categoryId:           number;
    categoryName:         string;
    name:                 string;
    targetAmount:         number;
    currentAmount:        number;
    targetDate:           string;
    autoContributeAmount: number;
    createdAt:            string;
  }
  
  // ── Category DTO (from /api/categories) ──────────────────────────────────────
  
  export interface CategoryDto {
    categoryId: number;
    name:       string;
    type:       string;   // Income | Expense
    icon:       string | null;
    isDefault:  boolean;
  }
  
  // ── Internal form model ───────────────────────────────────────────────────────
  
  export interface BudgetForm {
    budgetId:             number | null;
    accountId:            number | null;
    categoryId:           number | null;
    name:                 string;
    targetAmount:         string;
    currentAmount:        string;
    targetDate:           string;
    autoContributeAmount: string;
  }
  
  export type BudgetModalMode = 'create' | 'edit' | 'delete' | 'none';
  