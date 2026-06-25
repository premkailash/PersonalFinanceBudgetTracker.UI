// ── Category entity ───────────────────────────────────────────────────────────
export interface AdminCategoryDto {
    categoryId: number;
    name:       string;
    type:       'Income' | 'Expense';
    icon:       string | null;
    isDefault:  boolean;
  }
  
  // ── Create / update request ───────────────────────────────────────────────────
  export interface SaveCategoryRequestDto {
    name:      string;
    type:      string;
    icon:      string | null;
    isDefault: boolean;
  }
  
  // ── Category form model ───────────────────────────────────────────────────────
  export interface CategoryForm {
    categoryId: number | null;
    name:       string;
    type:       string;
    icon:       string;
    isDefault:  boolean;
  }
  
  export type CategoryModalMode = 'create' | 'edit' | 'delete' | 'none';
  
  // ── Admin user summary (from GET /api/users) ──────────────────────────────────
  export interface AdminUserDto {
    userId:    number;
    username:  string;
    email:     string;
    role:      string;
    createdAt: string;
  }
  
  // ── Admin account count (from GET /api/accounts/admin/count) ─────────────────
export interface AdminAccountCountDto {
  message:          string;
  totalAccounts:    number;
  activeAccounts:   number;
  inactiveAccounts: number;
}
