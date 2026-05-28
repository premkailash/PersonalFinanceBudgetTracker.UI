// ── Request DTOs ─────────────────────────────────────────────────────────────

export interface CreateSavingsGoalRequestDto {
    userId:               number;
    accountId:            number;
    name:                 string;
    targetAmount:         number;
    currentAmount:        number;
    targetDate:           string;   // ISO 8601
    autoContributeAmount: number;
    createdAt:            string;   // ISO 8601
  }
  
  export interface UpdateSavingsGoalRequestDto {
    goalId:               number;
    targetAmount:         number;
    currentAmount:        number;
    targetDate:           string;
    autoContributeAmount: number;
  }
  
  export interface ContributeRequestDto {
    goalId:               number;
    autoContributeAmount: number;
  }
  
  // ── Response DTO ──────────────────────────────────────────────────────────────
  
  export interface SavingsGoalResponseDto {
    goalId:        number;
    userId:        number;
    accountId:     number;
    name:          string;
    targetAmount:  number;
    currentAmount: number;   // = CurrentAmount + AutoContributeAmount from backend
    targetDate:    string;
    createdAt:     string;
  }
  
  // ── Internal form models ──────────────────────────────────────────────────────
  
  export interface GoalForm {
    goalId:        number | null;
    accountId:     number | null;
    name:          string;
    targetAmount:  string;
    currentAmount: string;
    targetDate:    string;
  }
  
  export interface ContributeForm {
    goalId:               number;
    autoContributeAmount: string;
  }
  
  export type GoalModalMode = 'create' | 'edit' | 'delete' | 'contribute' | 'none';
  