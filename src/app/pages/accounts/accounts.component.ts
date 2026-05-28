import { Component, OnInit, Input } from '@angular/core';
import { CommonModule }             from '@angular/common';
import { FormsModule }              from '@angular/forms';

import { AccountService }           from '../../services/account.service';
import {
  AccountResponseDto,
  AccountForm,
  ModalMode
} from '../../models/account.models';

@Component({
  selector:    'app-accounts',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './accounts.component.html'
})
export class AccountsComponent implements OnInit {

  @Input() userId = 0;

  // ── Table data ────────────────────────────────────────────────────────
  accounts:     AccountResponseDto[] = [];
  isListLoading = false;
  listError     = '';

  // ── Modal state ───────────────────────────────────────────────────────
  modalMode:    ModalMode = 'none';
  isSubmitting  = false;
  modalAlert    = '';
  modalAlertType: 'success' | 'error' = 'success';

  // ── Form model ────────────────────────────────────────────────────────
  form: AccountForm = this.emptyForm();

  // ── Validation flags ──────────────────────────────────────────────────
  touched = false;

  // ── Delete target ─────────────────────────────────────────────────────
  deleteTarget: AccountResponseDto | null = null;

  // ── Dropdown options ──────────────────────────────────────────────────
  readonly accountTypes = ['Bank', 'Wallet', 'Credit', 'Investment'];
  readonly currencies   = ['INR', 'USD', 'EUR'];

  constructor(private svc: AccountService) {}

  ngOnInit(): void {
    this.loadAccounts();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  LIST
  // ═══════════════════════════════════════════════════════════════════════

  loadAccounts(): void {
    this.isListLoading = true;
    this.listError     = '';

    this.svc.getAccounts(this.userId).subscribe({
      next: (data) => {
        this.accounts      = Array.isArray(data) ? data : [];
        this.isListLoading = false;
      },
      error: (err: Error) => {
        this.listError     = err.message;
        this.isListLoading = false;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CREATE MODAL
  // ═══════════════════════════════════════════════════════════════════════

  openCreateModal(): void {
    this.form          = this.emptyForm();
    this.touched       = false;
    this.modalAlert    = '';
    this.modalMode     = 'create';
  }

  onCreateSave(): void {
    this.touched = true;
    if (!this.isFormValid()) return;

    this.isSubmitting = true;
    this.modalAlert   = '';

    const payload = {
      userId:      this.userId,
      accountName: this.form.accountName.trim(),
      accountType: this.form.accountType,
      currency:    this.form.currency,
      balance:     parseFloat(this.form.balance) || 0,
      linkedAt:    new Date().toISOString()
    };

    this.svc.createAccount(payload).subscribe({
      next: (res) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'success';
        this.modalAlert     = res.message || 'Account created successfully.';
        this.loadAccounts(); // Refresh list immediately
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

  openEditModal(account: AccountResponseDto): void {
    this.form          = this.emptyForm();
    this.touched       = false;
    this.modalAlert    = '';
    this.modalMode     = 'edit';
    this.isSubmitting  = true; // show spinner while loading

    this.svc.getAccountById(account.accountId).subscribe({
      next: (data) => {
        this.isSubmitting = false;
        this.form = {
          accountId:   data.accountId,
          accountName: data.accountName,
          accountType: data.accountType,
          currency:    data.currency,
          balance:     data.balance.toString()
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

    const id      = this.form.accountId!;
    const payload = {
      accountId:   id,
      accountName: this.form.accountName.trim(),
      accountType: this.form.accountType,
      currency:    this.form.currency,
      balance:     parseFloat(this.form.balance) || 0
    };

    this.svc.updateAccount(id, payload).subscribe({
      next: (res) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'success';
        this.modalAlert     = res.message || 'Account updated successfully.';
        this.loadAccounts();
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

  openDeleteModal(account: AccountResponseDto): void {
    this.deleteTarget   = account;
    this.modalAlert     = '';
    this.isSubmitting   = false;
    this.modalMode      = 'delete';
  }

  onDeleteConfirm(): void {
    if (!this.deleteTarget) return;
    this.isSubmitting = true;
    this.modalAlert   = '';

    this.svc.deleteAccount(this.deleteTarget.accountId).subscribe({
      next: (res) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'success';
        this.modalAlert     = res.message || 'Account deleted successfully.';
        this.loadAccounts();
      },
      error: (err: Error) => {
        this.isSubmitting   = false;
        this.modalAlertType = 'error';
        this.modalAlert     = err.message;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  COMMON HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  closeModal(): void {
    this.modalMode    = 'none';
    this.modalAlert   = '';
    this.touched      = false;
    this.deleteTarget = null;
  }

  private emptyForm(): AccountForm {
    return { accountId: null, accountName: '', accountType: 'Bank', currency: 'INR', balance: '' };
  }

  private isFormValid(): boolean {
    const b = parseFloat(this.form.balance);
    return (
      this.form.accountName.trim().length > 0 &&
      this.form.accountType.length > 0 &&
      this.form.currency.length > 0 &&
      this.form.balance.trim().length > 0 &&
      !isNaN(b) &&
      b >= 0
    );
  }

  // Validation helpers used in template
  get nameInvalid():    boolean { return this.touched && this.form.accountName.trim().length === 0; }
  get typeInvalid():    boolean { return this.touched && this.form.accountType.length === 0; }
  get currencyInvalid():boolean { return this.touched && this.form.currency.length === 0; }
  get balanceInvalid(): boolean {
    if (!this.touched || this.form.balance.trim().length === 0) return this.touched;
    const v = parseFloat(this.form.balance);
    return isNaN(v) || v < 0;
  }

  // Allow only digits and a single decimal point in balance field
  onBalanceKeydown(e: KeyboardEvent): void {
    const allowed = ['0','1','2','3','4','5','6','7','8','9','.','Backspace',
                     'Delete','ArrowLeft','ArrowRight','Tab'];
    if (!allowed.includes(e.key)) { e.preventDefault(); return; }
    // Prevent second decimal point
    if (e.key === '.' && this.form.balance.includes('.')) e.preventDefault();
  }

  // ── Display helpers ───────────────────────────────────────────────────

  typeBadgeClass(type: string): string {
    const map: Record<string, string> = {
      Bank: 'type-bank', Wallet: 'type-wallet',
      Credit: 'type-credit', Investment: 'type-investment'
    };
    return map[type] ?? '';
  }

  typeIcon(type: string): string {
    const map: Record<string, string> = {
      Bank: '🏦', Wallet: '👛', Credit: '💳', Investment: '📈'
    };
    return map[type] ?? '💰';
  }

  formatBalance(balance: number, currency: string): string {
    const localeMap: Record<string, string> = { INR: 'en-IN', USD: 'en-US', EUR: 'de-DE' };
    return new Intl.NumberFormat(localeMap[currency] ?? 'en-IN', {
      style: 'currency', currency, maximumFractionDigits: 2
    }).format(balance);
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN',
      { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
