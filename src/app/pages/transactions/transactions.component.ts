import { Component, OnInit, Input } from '@angular/core';
import { CommonModule }              from '@angular/common';
import { FormsModule }               from '@angular/forms';

import { TransactionService }        from '../../services/transaction.service';
import { AccountService }            from '../../services/account.service';
import { BudgetService }             from '../../services/budget.service';   // reuse for categories
import { AccountResponseDto }        from '../../models/account.models';
import { CategoryDto }               from '../../models/budget.models';
import {
  TransactionResponseDto,
  TransactionFilter,
  TransactionForm,
  TxModalMode
} from '../../models/transaction.models';
import { CatFilterPipe } from '../../pipes/shared.pipes';

@Component({
  selector:    'app-transactions',
  standalone:  true,
  imports:     [CommonModule, FormsModule, CatFilterPipe],
  templateUrl: './transactions.component.html'
})
export class TransactionsComponent implements OnInit {

  @Input() userId = 0;

  // ── Reference data ────────────────────────────────────────────────────
  accounts:      AccountResponseDto[] = [];
  categories:    CategoryDto[]        = [];
  isAcctLoading  = false;
  isCatLoading   = false;

  // ── Filter state ──────────────────────────────────────────────────────
  filter: TransactionFilter = {
    accountId: null,
    fromDate:  this.todayISO(),
    toDate:    this.todayISO(),
    search:    ''
  };

  // ── Raw & filtered/paginated data ─────────────────────────────────────
  allTransactions:      TransactionResponseDto[] = [];
  filteredTransactions: TransactionResponseDto[] = [];
  pageTransactions:     TransactionResponseDto[] = [];

  isListLoading  = false;
  listError      = '';
  hasSearched    = false;   // true once the user hits Search

  // ── Pagination ────────────────────────────────────────────────────────
  currentPage  = 1;
  pageSize     = 10;
  totalPages   = 1;
  pageSizes    = [5, 10, 25, 50];

  get pageNumbers(): number[] {
    const range: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end   = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }

  // ── Modal state ───────────────────────────────────────────────────────
  modalMode:     TxModalMode = 'none';
  isSubmitting   = false;
  modalAlert     = '';
  modalAlertType: 'success' | 'error' = 'success';
  deleteTarget:  TransactionResponseDto | null = null;

  // ── Form model ────────────────────────────────────────────────────────
  form:    TransactionForm = this.emptyForm();
  touched  = false;

  readonly txTypes   = ['Income', 'Expense'];
  readonly currencies = ['INR', 'USD', 'EUR'];
  readonly recurringOpts = [
    { label: 'No',  value: false },
    { label: 'Yes', value: true  }
  ];

  constructor(
    private txSvc:     TransactionService,
    private acctSvc:   AccountService,
    private budgetSvc: BudgetService
  ) {}

  ngOnInit(): void {
    this.loadAccounts();
    this.loadCategories();
    this.filter.fromDate = this.todayISO();
    this.filter.toDate   = this.todayISO();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  REFERENCE DATA
  // ═══════════════════════════════════════════════════════════════════════

  loadAccounts(): void {
    this.isAcctLoading = true;
    this.acctSvc.getAccounts(this.userId).subscribe({
      next:  (d) => { this.accounts = Array.isArray(d) ? d : []; this.isAcctLoading = false; },
      error: () => { this.isAcctLoading = false; }
    });
  }

  loadCategories(): void {
    this.isCatLoading = true;
    this.budgetSvc.getCategories().subscribe({
      next:  (d) => { this.categories = Array.isArray(d) ? d : []; this.isCatLoading = false; },
      error: () => { this.isCatLoading = false; }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SEARCH / LIST
  // ═══════════════════════════════════════════════════════════════════════

  onSearch(): void {
    if (!this.filter.accountId) return;

    this.isListLoading = true;
    this.listError     = '';
    this.hasSearched   = true;
    this.currentPage   = 1;
    this.filter.search = '';

    const from = new Date(this.filter.fromDate + 'T00:00:00').toISOString();
    const to   = new Date(this.filter.toDate   + 'T23:59:59').toISOString();

    this.txSvc.getTransactions(this.filter.accountId, from, to).subscribe({
      next: (data) => {
        this.allTransactions = Array.isArray(data) ? data : [];
        this.applyClientFilter();
        this.isListLoading = false;
      },
      error: (err: Error) => {
        this.listError     = err.message;
        this.isListLoading = false;
      }
    });
  }

  onSearchInput(): void {
    this.currentPage = 1;
    this.applyClientFilter();
  }

  clearSearch(): void {
    this.filter.search = '';
    this.currentPage   = 1;
    this.applyClientFilter();
  }

  private applyClientFilter(): void {
    const q = this.filter.search.trim().toLowerCase();

    this.filteredTransactions = q
      ? this.allTransactions.filter(t =>
          (t.description?.toLowerCase().includes(q) ?? false) ||
          t.categoryName.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q)
        )
      : [...this.allTransactions];

    this.buildPage();
  }

  private buildPage(): void {
    const total       = this.filteredTransactions.length;
    this.totalPages   = Math.max(1, Math.ceil(total / this.pageSize));
    this.currentPage  = Math.min(this.currentPage, this.totalPages);
    const start       = (this.currentPage - 1) * this.pageSize;
    this.pageTransactions = this.filteredTransactions.slice(start, start + this.pageSize);
  }

  // ── Pagination actions ────────────────────────────────────────────────
  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.currentPage = p;
    this.buildPage();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.buildPage();
  }

  get startRecord(): number { return (this.currentPage - 1) * this.pageSize + 1; }
  get endRecord():   number { return Math.min(this.currentPage * this.pageSize, this.filteredTransactions.length); }

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
    if (!this.isFormValid('create')) return;

    this.isSubmitting = true;
    this.modalAlert   = '';

    const payload = {
      accountId:       Number(this.form.accountId),
      amount:          parseFloat(this.form.amount),
      currency:        this.form.currency,
      type:            this.form.type,
      categoryId:      Number(this.form.categoryId),
      description:     this.form.description.trim() || null,
      transactionDate: new Date(this.form.transactionDate + 'T00:00:00').toISOString(),
      isRecurring:     this.form.isRecurring
    };

    this.txSvc.createTransaction(payload).subscribe({
      next: (res) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'success';
        this.modalAlert     = res.message || 'Transaction added successfully.';
        if (this.hasSearched) this.onSearch();
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

  openEditModal(tx: TransactionResponseDto): void {
    this.form         = this.emptyForm();
    this.touched      = false;
    this.modalAlert   = '';
    this.modalMode    = 'edit';
    this.isSubmitting = true;

    this.txSvc.getTransactionById(tx.transactionId).subscribe({
      next: (data) => {
        this.isSubmitting = false;
        this.form = {
          transactionId:   data.transactionId,
          accountId:       data.accountId,           // read-only
          categoryId:      data.categoryId,          // read-only
          description:     data.description ?? '',
          type:            data.type,                // read-only
          currency:        data.currency,            // read-only
          amount:          data.amount.toString(),
          transactionDate: this.toDateInput(data.transactionDate),
          isRecurring:     data.isRecurring          // read-only context
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
    if (!this.isFormValid('edit')) return;

    this.isSubmitting = true;
    this.modalAlert   = '';

    const id      = this.form.transactionId!;
    const payload = {
      transactionId:   id,
      amount:          parseFloat(this.form.amount),
      description:     this.form.description.trim() || null,
      transactionDate: new Date(this.form.transactionDate + 'T00:00:00').toISOString()
    };

    this.txSvc.updateTransaction(id, payload).subscribe({
      next: (res) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'success';
        this.modalAlert     = res.message || 'Transaction updated successfully.';
        if (this.hasSearched) this.onSearch();
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

  openDeleteModal(tx: TransactionResponseDto): void {
    this.deleteTarget = tx;
    this.modalAlert   = '';
    this.isSubmitting = false;
    this.modalMode    = 'delete';
  }

  onDeleteConfirm(): void {
    if (!this.deleteTarget) return;
    this.isSubmitting = true;
    this.modalAlert   = '';

    this.txSvc.deleteTransaction(this.deleteTarget.transactionId).subscribe({
      next: (res) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'success';
        this.modalAlert     = res.message || 'Transaction deleted successfully.';
        if (this.hasSearched) this.onSearch();
      },
      error: (err: Error) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'error';
        this.modalAlert     = err.message;
      }
    });
  }

  closeModal(): void {
    this.modalMode    = 'none';
    this.modalAlert   = '';
    this.touched      = false;
    this.deleteTarget = null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  VALIDATION
  // ═══════════════════════════════════════════════════════════════════════

  private isFormValid(mode: 'create' | 'edit'): boolean {
    const amt = parseFloat(this.form.amount);
    const createExtras = mode === 'create'
      ? !!this.form.accountId && !!this.form.categoryId &&
        this.form.type.length > 0 && this.form.currency.length > 0
      : true;

    return (
      createExtras &&
      this.form.transactionDate.length > 0 &&
      !isNaN(amt) && amt > 0
    );
  }

  get acctInvalid():     boolean { return this.touched && this.modalMode === 'create' && !this.form.accountId; }
  get catInvalid():      boolean { return this.touched && this.modalMode === 'create' && !this.form.categoryId; }
  get typeInvalid():     boolean { return this.touched && this.modalMode === 'create' && !this.form.type; }
  get currencyInvalid(): boolean { return this.touched && this.modalMode === 'create' && !this.form.currency; }
  get dateInvalid():     boolean { return this.touched && !this.form.transactionDate; }

  get amountInvalid(): boolean {
    if (!this.touched) return false;
    const v = parseFloat(this.form.amount);
    return isNaN(v) || v <= 0;
  }

  onAmountKeydown(e: KeyboardEvent): void {
    const allowed = ['0','1','2','3','4','5','6','7','8','9','.','Backspace',
                     'Delete','ArrowLeft','ArrowRight','Tab'];
    if (!allowed.includes(e.key)) { e.preventDefault(); return; }
    if (e.key === '.' && (e.target as HTMLInputElement).value.includes('.'))
      e.preventDefault();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  DISPLAY HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  typeClass(type: string): string {
    return type?.toLowerCase() === 'income' ? 'income' : 'expense';
  }

  categoryName(id: number): string {
    return this.categories.find(c => c.categoryId === id)?.name ?? '—';
  }

  accountNameOf(id: number): string {
    return this.accounts.find(a => a.accountId === id)?.accountName ?? '—';
  }

  formatAmount(amount: number, currency: string): string {
    const localeMap: Record<string, string> = { INR: 'en-IN', USD: 'en-US', EUR: 'de-DE' };
    return new Intl.NumberFormat(localeMap[currency] ?? 'en-IN', {
      style: 'currency', currency, maximumFractionDigits: 2
    }).format(amount);
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

  private emptyForm(): TransactionForm {
    return {
      transactionId:   null,
      accountId:       null,
      categoryId:      null,
      description:     '',
      type:            'Expense',
      currency:        'INR',
      amount:          '',
      transactionDate: this.todayISO(),
      isRecurring:     false
    };
  }
}
