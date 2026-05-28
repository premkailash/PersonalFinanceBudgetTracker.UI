import { Component, OnInit, Input } from '@angular/core';
import { CommonModule }             from '@angular/common';
import { FormsModule }              from '@angular/forms';

import { BudgetService }            from '../../services/budget.service';
import { AccountService }           from '../../services/account.service';
import { AccountResponseDto }       from '../../models/account.models';
import {
  BudgetResponseDto,
  CategoryDto,
  BudgetForm,
  BudgetModalMode
} from '../../models/budget.models';
import { CatFilterPipe, AccountNamePipe } from '../../pipes/shared.pipes';

@Component({
  selector:    'app-budgets',
  standalone:  true,
  imports:     [CommonModule, FormsModule, CatFilterPipe, AccountNamePipe],
  templateUrl: './budgets.component.html'
})
export class BudgetsComponent implements OnInit {

  @Input() userId = 0;

  // ── Table data ────────────────────────────────────────────────────────
  budgets:       BudgetResponseDto[] = [];
  accounts:      AccountResponseDto[] = [];
  categories:    CategoryDto[]        = [];
  isListLoading  = false;
  isAcctLoading  = false;
  isCatLoading   = false;
  listError      = '';

  // ── Month navigation ──────────────────────────────────────────────────
  currentDate    = new Date();
  get currentMonth(): string {
    const mm = String(this.currentDate.getMonth() + 1).padStart(2, '0');
    return `${this.currentDate.getFullYear()}-${mm}`;
  }
  get currentMonthLabel(): string {
    return this.currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  prevMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() - 1,
      1
    );
    this.loadBudgets();
  }

  nextMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      1
    );
    this.loadBudgets();
  }

  // ── Modal state ───────────────────────────────────────────────────────
  modalMode:      BudgetModalMode = 'none';
  isSubmitting    = false;
  modalAlert      = '';
  modalAlertType: 'success' | 'error' = 'success';

  // ── Form model ────────────────────────────────────────────────────────
  form:           BudgetForm = this.emptyForm();
  touched         = false;
  deleteTarget:   BudgetResponseDto | null = null;

  constructor(
    private budgetSvc: BudgetService,
    private acctSvc:   AccountService
  ) {}

  ngOnInit(): void {
    this.loadAccounts();
    this.loadCategories();
    this.loadBudgets();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════

  loadBudgets(): void {
    this.isListLoading = true;
    this.listError     = '';

    this.budgetSvc.getBudgetsByMonth(this.userId, this.currentMonth).subscribe({
      next: (data) => {
        this.budgets       = Array.isArray(data) ? data : [];
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
      error: () => { this.isAcctLoading = false; }
    });
  }

  loadCategories(): void {
    this.isCatLoading = true;
    this.budgetSvc.getCategories().subscribe({
      next: (data) => {
        this.categories   = Array.isArray(data) ? data : [];
        this.isCatLoading = false;
      },
      error: () => { this.isCatLoading = false; }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CREATE MODAL
  // ═══════════════════════════════════════════════════════════════════════

  openCreateModal(): void {
    this.form       = this.emptyForm();
    this.touched    = false;
    this.modalAlert = '';
    this.modalMode  = 'create';
  }

  onCreateSave(): void {
    this.touched = true;
    if (!this.isFormValid()) return;

    this.isSubmitting = true;
    this.modalAlert   = '';

    const payload = {
      userid:               this.userId,
      accountId:            Number(this.form.accountId),
      categoryId:           Number(this.form.categoryId),
      name:                 this.form.name.trim(),
      targetAmount:         parseFloat(this.form.targetAmount) || 0,
      currentAmount:        parseFloat(this.form.currentAmount) || 0,
      targetDate:           new Date(this.form.targetDate).toISOString(),
      autoContributeAmount: parseFloat(this.form.autoContributeAmount) || 0
    };

    this.budgetSvc.createBudget(payload).subscribe({
      next: (res) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'success';
        this.modalAlert     = res.message || 'Budget created successfully.';
        this.loadBudgets();
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

  openEditModal(budget: BudgetResponseDto): void {
    this.form         = this.emptyForm();
    this.touched      = false;
    this.modalAlert   = '';
    this.modalMode    = 'edit';
    this.isSubmitting = true;   // spinner while fetching

    this.budgetSvc.getBudgetById(budget.budgetId).subscribe({
      next: (data) => {
        this.isSubmitting = false;
        this.form = {
          budgetId:             data.budgetId,
          accountId:            data.accountId,     // read-only
          categoryId:           data.categoryId,    // read-only
          name:                 data.name,
          targetAmount:         data.targetAmount.toString(),
          currentAmount:        data.currentAmount.toString(),
          targetDate:           this.toDateInput(data.targetDate),
          autoContributeAmount: data.autoContributeAmount.toString()
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
    if (!this.isFormValid()) return;

    this.isSubmitting = true;
    this.modalAlert   = '';

    const id      = this.form.budgetId!;
    const payload = {
      budgetId:             id,
      name:                 this.form.name.trim(),
      targetAmount:         parseFloat(this.form.targetAmount) || 0,
      currentAmount:        parseFloat(this.form.currentAmount) || 0,
      targetDate:           new Date(this.form.targetDate).toISOString(),
      autoContributeAmount: parseFloat(this.form.autoContributeAmount) || 0
    };

    this.budgetSvc.updateBudget(id, payload).subscribe({
      next: (res) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'success';
        this.modalAlert     = res.message || 'Budget updated successfully.';
        this.loadBudgets();
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

  openDeleteModal(budget: BudgetResponseDto): void {
    this.deleteTarget = budget;
    this.modalAlert   = '';
    this.isSubmitting = false;
    this.modalMode    = 'delete';
  }

  onDeleteConfirm(): void {
    if (!this.deleteTarget) return;
    this.isSubmitting = true;
    this.modalAlert   = '';

    this.budgetSvc.deleteBudget(this.deleteTarget.budgetId).subscribe({
      next: (res) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'success';
        this.modalAlert     = res.message || 'Budget deleted successfully.';
        this.loadBudgets();
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
    this.modalMode    = 'none';
    this.modalAlert   = '';
    this.touched      = false;
    this.deleteTarget = null;
  }

  private emptyForm(): BudgetForm {
    return {
      budgetId:             null,
      accountId:            null,
      categoryId:           null,
      name:                 '',
      targetAmount:         '',
      currentAmount:        '0',
      targetDate:           this.todayISO(),
      autoContributeAmount: '0'
    };
  }

  private isFormValid(): boolean {
    const isCreateExtras = this.modalMode === 'create'
      ? !!this.form.accountId && !!this.form.categoryId
      : true;

    const ta  = parseFloat(this.form.targetAmount);
    const ca  = parseFloat(this.form.currentAmount);
    const aca = parseFloat(this.form.autoContributeAmount);

    return (
      isCreateExtras &&
      this.form.name.trim().length > 0 &&
      this.form.targetDate.length > 0 &&
      !isNaN(ta) && ta > 0 &&
      !isNaN(ca) && ca >= 0 &&
      !isNaN(aca) && aca >= 0
    );
  }

  // Validation getters for template
  get acctInvalid():      boolean { return this.touched && this.modalMode === 'create' && !this.form.accountId; }
  get catInvalid():       boolean { return this.touched && this.modalMode === 'create' && !this.form.categoryId; }
  get nameInvalid():      boolean { return this.touched && this.form.name.trim().length === 0; }
  get dateInvalid():      boolean { return this.touched && this.form.targetDate.length === 0; }

  get targetAmtInvalid(): boolean {
    if (!this.touched) return false;
    const v = parseFloat(this.form.targetAmount);
    return isNaN(v) || v <= 0;
  }

  get currentAmtInvalid(): boolean {
    if (!this.touched) return false;
    const v = parseFloat(this.form.currentAmount);
    return isNaN(v) || v < 0;
  }

  get autoContribInvalid(): boolean {
    if (!this.touched) return false;
    const v = parseFloat(this.form.autoContributeAmount);
    return isNaN(v) || v < 0;
  }

  // Allow only digits and one decimal point
  onAmountKeydown(e: KeyboardEvent): void {
    const allowed = ['0','1','2','3','4','5','6','7','8','9','.','Backspace',
                     'Delete','ArrowLeft','ArrowRight','Tab'];
    if (!allowed.includes(e.key)) { e.preventDefault(); return; }
    if (e.key === '.' && (e.target as HTMLInputElement).value.includes('.'))
      e.preventDefault();
  }

  // ── Utilisation helpers ───────────────────────────────────────────────
  utilPct(b: BudgetResponseDto): number {
    if (!b.targetAmount || b.targetAmount <= 0) return 0;
    return Math.min(100, Math.round((b.currentAmount / b.targetAmount) * 100));
  }

  utilColor(pct: number): string {
    if (pct >= 100) return 'var(--clr-error)';
    if (pct >= 75)  return 'var(--clr-warning)';
    return 'var(--clr-success)';
  }

  utilStatusClass(pct: number): string {
    if (pct >= 100) return 'over';
    if (pct >= 75)  return 'warning';
    return 'on-track';
  }

  utilStatusLabel(pct: number): string {
    if (pct >= 100) return 'Over budget';
    if (pct >= 75)  return 'Near limit';
    return 'On track';
  }

  // ── Category helpers ──────────────────────────────────────────────────
  catTypeClass(type: string): string {
    return type?.toLowerCase() === 'income' ? 'income' : 'expense';
  }

  categoryById(id: number): CategoryDto | undefined {
    return this.categories.find(c => c.categoryId === id);
  }

  // ── Formatting ────────────────────────────────────────────────────────
  formatCurrency(v: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0
    }).format(v);
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN',
      { day: '2-digit', month: 'short', year: 'numeric' });
  }

  todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toDateInput(iso: string): string {
    if (!iso) return this.todayISO();
    return new Date(iso).toISOString().slice(0, 10);
  }
}
