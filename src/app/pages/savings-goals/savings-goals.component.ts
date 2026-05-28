import { Component, OnInit, Input } from '@angular/core';
import { CommonModule }             from '@angular/common';
import { FormsModule }              from '@angular/forms';

import { SavingsGoalService }       from '../../services/savings-goal.service';
import { AccountService }           from '../../services/account.service';
import { AccountResponseDto }       from '../../models/account.models';
import {
  SavingsGoalResponseDto,
  GoalForm,
  ContributeForm,
  GoalModalMode
} from '../../models/savings-goal.models';

@Component({
  selector:    'app-savings-goals',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './savings-goals.component.html'
})
export class SavingsGoalsComponent implements OnInit {

  @Input() userId = 0;

  // ── Table data ────────────────────────────────────────────────────────
  goals:          SavingsGoalResponseDto[] = [];
  accounts:       AccountResponseDto[]     = [];
  isListLoading   = false;
  isAcctLoading   = false;
  listError       = '';

  // ── Modal state ───────────────────────────────────────────────────────
  modalMode:      GoalModalMode = 'none';
  isSubmitting    = false;
  modalAlert      = '';
  modalAlertType: 'success' | 'error' = 'success';

  // ── Form models ───────────────────────────────────────────────────────
  goalForm:       GoalForm       = this.emptyGoalForm();
  contributeForm: ContributeForm = { goalId: 0, autoContributeAmount: '' };

  // ── Validation touch flag ─────────────────────────────────────────────
  touched = false;

  // ── Delete / contribute target ────────────────────────────────────────
  deleteTarget: SavingsGoalResponseDto | null = null;
  contributeTarget: SavingsGoalResponseDto | null = null;

  constructor(
    private goalSvc: SavingsGoalService,
    private acctSvc: AccountService
  ) {}

  ngOnInit(): void {
    this.loadAccounts();
    this.loadGoals();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════

  loadGoals(): void {
    this.isListLoading = true;
    this.listError     = '';

    this.goalSvc.getGoals(this.userId).subscribe({
      next: (data) => {
        this.goals         = Array.isArray(data) ? data : [];
        this.isListLoading = false;
      },
      error: (err: Error) => {
        this.listError     = err.message;
        this.isListLoading = false;
      }
    });
  }

  loadAccounts(): void {
    this.isAcctLoading = true;
    this.acctSvc.getAccounts(this.userId).subscribe({
      next: (data) => {
        this.accounts      = Array.isArray(data) ? data : [];
        this.isAcctLoading = false;
      },
      error: () => {
        this.isAcctLoading = false;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CREATE MODAL
  // ═══════════════════════════════════════════════════════════════════════

  openCreateModal(): void {
    this.goalForm      = this.emptyGoalForm();
    this.touched       = false;
    this.modalAlert    = '';
    this.modalMode     = 'create';
  }

  onCreateSave(): void {
    this.touched = true;
    if (!this.isGoalFormValid()) return;

    this.isSubmitting = true;
    this.modalAlert   = '';

    const payload = {
      userId:               this.userId,
      accountId:            Number(this.goalForm.accountId),
      name:                 this.goalForm.name.trim(),
      targetAmount:         parseFloat(this.goalForm.targetAmount) || 0,
      currentAmount:        parseFloat(this.goalForm.currentAmount) || 0,
      targetDate:           new Date(this.goalForm.targetDate).toISOString(),
      autoContributeAmount: 0,
      createdAt:            new Date().toISOString()
    };

    this.goalSvc.createGoal(payload).subscribe({
      next: (res) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'success';
        this.modalAlert     = res.message || 'Savings goal created successfully.';
        this.loadGoals();
      },
      error: (err: Error) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'error';
        this.modalAlert     = err.message;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  EDIT MODAL
  // ═══════════════════════════════════════════════════════════════════════

  openEditModal(goal: SavingsGoalResponseDto): void {
    this.goalForm      = this.emptyGoalForm();
    this.touched       = false;
    this.modalAlert    = '';
    this.modalMode     = 'edit';
    this.isSubmitting  = true;

    this.goalSvc.getGoalById(goal.goalId).subscribe({
      next: (data) => {
        this.isSubmitting = false;
        this.goalForm = {
          goalId:        data.goalId,
          accountId:     data.accountId,     // read-only in edit mode
          name:          data.name,
          targetAmount:  data.targetAmount.toString(),
          currentAmount: data.currentAmount.toString(),
          targetDate:    this.toDateInputValue(data.targetDate)
        };
      },
      error: (err: Error) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'error';
        this.modalAlert     = err.message;
      }
    });
  }

  onEditSave(): void {
    this.touched = true;
    if (!this.isGoalFormValid()) return;

    this.isSubmitting = true;
    this.modalAlert   = '';

    const id      = this.goalForm.goalId!;
    const payload = {
      goalId:               id,
      targetAmount:         parseFloat(this.goalForm.targetAmount) || 0,
      currentAmount:        parseFloat(this.goalForm.currentAmount) || 0,
      targetDate:           new Date(this.goalForm.targetDate).toISOString(),
      autoContributeAmount: 0
    };

    this.goalSvc.updateGoal(id, payload).subscribe({
      next: (res) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'success';
        this.modalAlert     = res.message || 'Savings goal updated successfully.';
        this.loadGoals();
      },
      error: (err: Error) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'error';
        this.modalAlert     = err.message;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  DELETE MODAL
  // ═══════════════════════════════════════════════════════════════════════

  openDeleteModal(goal: SavingsGoalResponseDto): void {
    this.deleteTarget = goal;
    this.modalAlert   = '';
    this.isSubmitting = false;
    this.modalMode    = 'delete';
  }

  onDeleteConfirm(): void {
    if (!this.deleteTarget) return;
    this.isSubmitting = true;
    this.modalAlert   = '';

    this.goalSvc.deleteGoal(this.deleteTarget.goalId).subscribe({
      next: (res) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'success';
        this.modalAlert     = res.message || 'Savings goal deleted successfully.';
        this.loadGoals();
      },
      error: (err: Error) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'error';
        this.modalAlert     = err.message;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CONTRIBUTE MODAL
  // ═══════════════════════════════════════════════════════════════════════

  openContributeModal(goal: SavingsGoalResponseDto): void {
    this.contributeTarget = goal;
    this.contributeForm   = { goalId: goal.goalId, autoContributeAmount: '' };
    this.touched          = false;
    this.modalAlert       = '';
    this.isSubmitting     = false;
    this.modalMode        = 'contribute';
  }

  onContributeSave(): void {
    this.touched = true;
    const amt    = parseFloat(this.contributeForm.autoContributeAmount);
    if (isNaN(amt) || amt <= 0) return;

    this.isSubmitting = true;
    this.modalAlert   = '';

    const id      = this.contributeForm.goalId;
    const payload = {
      goalId:               id,
      autoContributeAmount: amt
    };

    this.goalSvc.contribute(id, payload).subscribe({
      next: (res) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'success';
        this.modalAlert     = res.message || 'Contribution added successfully.';
        this.loadGoals();
      },
      error: (err: Error) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'error';
        this.modalAlert     = err.message;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  closeModal(): void {
    this.modalMode        = 'none';
    this.modalAlert       = '';
    this.touched          = false;
    this.deleteTarget     = null;
    this.contributeTarget = null;
  }

  private emptyGoalForm(): GoalForm {
    return {
      goalId: null, accountId: null, name: '',
      targetAmount: '', currentAmount: '',
      targetDate: this.todayISO()
    };
  }

  private isGoalFormValid(): boolean {
    const ta = parseFloat(this.goalForm.targetAmount);
    const ca = parseFloat(this.goalForm.currentAmount);
    const isCreateValid = this.modalMode === 'create'
      ? !!this.goalForm.accountId : true;

    return (
      isCreateValid &&
      this.goalForm.name.trim().length > 0 &&
      this.goalForm.targetDate.length > 0 &&
      !isNaN(ta) && ta > 0 &&
      !isNaN(ca) && ca >= 0
    );
  }

  // Validation getters used in template
  get acctInvalid():   boolean { return this.touched && this.modalMode === 'create' && !this.goalForm.accountId; }
  get nameInvalid():   boolean { return this.touched && this.goalForm.name.trim().length === 0; }
  get dateInvalid():   boolean { return this.touched && this.goalForm.targetDate.length === 0; }

  get targetAmtInvalid(): boolean {
    if (!this.touched || this.goalForm.targetAmount.trim().length === 0) return this.touched && this.goalForm.targetAmount.trim().length === 0;
    const v = parseFloat(this.goalForm.targetAmount);
    return isNaN(v) || v <= 0;
  }

  get currentAmtInvalid(): boolean {
    if (!this.touched) return false;
    if (this.goalForm.currentAmount.trim().length === 0) return false;
    const v = parseFloat(this.goalForm.currentAmount);
    return isNaN(v) || v < 0;
  }

  get contribAmtInvalid(): boolean {
    if (!this.touched) return false;
    const v = parseFloat(this.contributeForm.autoContributeAmount);
    return isNaN(v) || v <= 0;
  }

  // Block non-numeric keys in amount fields
  onAmountKeydown(e: KeyboardEvent): void {
    const allowed = ['0','1','2','3','4','5','6','7','8','9','.','Backspace',
                     'Delete','ArrowLeft','ArrowRight','Tab'];
    if (!allowed.includes(e.key)) { e.preventDefault(); return; }
    const target = e.target as HTMLInputElement;
    if (e.key === '.' && target.value.includes('.')) e.preventDefault();
  }

  // Progress bar helpers
  progressPct(goal: SavingsGoalResponseDto): number {
    if (!goal.targetAmount || goal.targetAmount <= 0) return 0;
    return Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
  }

  progressClass(pct: number): string {
    if (pct >= 100) return 'complete';
    if (pct < 20)   return 'danger';
    return '';
  }

  daysRemaining(targetDate: string): number {
    const diff = new Date(targetDate).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  }

  daysBadgeClass(days: number): string {
    if (days < 0)  return 'overdue';
    if (days < 30) return 'soon';
    return 'ok';
  }

  daysBadgeLabel(days: number): string {
    if (days < 0)  return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Due today';
    return `${days}d left`;
  }

  accountName(accountId: number): string {
    return this.accounts.find(a => a.accountId === accountId)?.accountName ?? '—';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0
    }).format(value);
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN',
      { day: '2-digit', month: 'short', year: 'numeric' });
  }

  todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toDateInputValue(iso: string): string {
    if (!iso) return this.todayISO();
    return new Date(iso).toISOString().slice(0, 10);
  }
}
