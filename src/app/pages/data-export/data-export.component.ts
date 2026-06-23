import { Component, OnInit, Input } from '@angular/core';
import { CommonModule }              from '@angular/common';
import { FormsModule }               from '@angular/forms';
import { DataExportService }         from '../../services/data-export.service';
import { AccountService }            from '../../services/account.service';
import { AccountResponseDto }        from '../../models/account.models';
import {
  ExportForm,
  DataExportResponseDto,
  DataExportDownloadDto
} from '../../models/data-export.models';

@Component({
  selector:    'app-data-export',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './data-export.component.html'
})
export class DataExportComponent implements OnInit {

  @Input() userId = 0;

  // ── Reference data ────────────────────────────────────────────────────
  accounts:      AccountResponseDto[] = [];
  isAcctLoading  = false;

  readonly reportTypes   = ['Transaction', 'Budget'];
  readonly reportOptions = ['CSV', 'PDF'];

  // ── Form ──────────────────────────────────────────────────────────────
  form: ExportForm = this.emptyForm();
  touched = false;

  isSubmitting = false;
  submitAlert  = '';
  submitAlertType: 'success' | 'error' = 'success';

  // ── Export history list ───────────────────────────────────────────────
  exports:       DataExportResponseDto[] = [];
  isListLoading  = false;
  listError      = '';

  // ── View report modal ─────────────────────────────────────────────────
  viewingExport:    DataExportResponseDto | null = null;
  isPolling         = false;
  pollResult:       DataExportDownloadDto | null = null;
  pollError         = '';

  constructor(
    private svc:     DataExportService,
    private acctSvc: AccountService
  ) {}

  ngOnInit(): void {
    this.loadAccounts();
    this.loadExports();
    this.setDefaultDates();
  }

  // ── Accounts ──────────────────────────────────────────────────────────

  loadAccounts(): void {
    this.isAcctLoading = true;
    this.acctSvc.getAccounts(this.userId).subscribe({
      next:  (d) => { this.accounts = Array.isArray(d) ? d : []; this.isAcctLoading = false; },
      error: () => { this.isAcctLoading = false; }
    });
  }

  // ── Export history ────────────────────────────────────────────────────

  loadExports(): void {
    this.isListLoading = true;
    this.listError     = '';

    this.svc.getUserExports().subscribe({
      next: (data) => {
        // Sort descending by timestamp (most recent first)        
        this.exports = (Array.isArray(data) ? data : [])
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        this.isListLoading = false;
      },
      error: (err: Error) => {
        this.listError     = err.message;
        this.isListLoading = false;
      }
    });
  }

  // ── Form submission ───────────────────────────────────────────────────

  onSubmit(): void {
    this.touched     = true;
    this.submitAlert = '';

    if (!this.isFormValid()) return;

    this.isSubmitting = true;

    const payload = {
      userId:        this.userId,
      accountId:     Number(this.form.accountId),
      reportType:    this.form.reportType as 'Transaction' | 'Budget',
      reportOptions: this.form.reportOptions as 'CSV' | 'PDF',
      fromDate:      new Date(this.form.fromDate + 'T00:00:00').toISOString(),
      toDate:        new Date(this.form.toDate   + 'T23:59:59').toISOString()
    };

    this.svc.createExport(payload).subscribe({
      next: (res) => {
        this.isSubmitting    = false;
        this.submitAlertType = 'success';
        this.submitAlert     = res.message || 'Export request submitted successfully.';
        // Refresh list to show the new entry
        this.loadExports();
        // Reset form after successful submit
        this.onClear();
      },
      error: (err: Error) => {
        this.isSubmitting    = false;
        this.submitAlertType = 'error';
        this.submitAlert     = err.message;
      }
    });
  }

  onClear(): void {
    this.form    = this.emptyForm();
    this.touched = false;
    setTimeout(() => { this.submitAlert = ''; }, 4000);
  }

  // ── Validation ────────────────────────────────────────────────────────

  private isFormValid(): boolean {
    return (
      !!this.form.accountId        &&
      this.form.reportType  !== '' &&
      this.form.reportOptions !== '' &&
      this.form.fromDate !== ''    &&
      this.form.toDate   !== ''    &&
      new Date(this.form.fromDate) < new Date(this.form.toDate)
    );
  }

  get acctInvalid():   boolean { return this.touched && !this.form.accountId; }
  get typeInvalid():   boolean { return this.touched && !this.form.reportType; }
  get optInvalid():    boolean { return this.touched && !this.form.reportOptions; }
  get fromInvalid():   boolean { return this.touched && !this.form.fromDate; }
  get toInvalid():     boolean { return this.touched && !this.form.toDate; }

  get dateRangeInvalid(): boolean {
    if (!this.touched || !this.form.fromDate || !this.form.toDate) return false;
    return new Date(this.form.fromDate) >= new Date(this.form.toDate);
  }

  // ── View Report modal ─────────────────────────────────────────────────

  openViewModal(exp: DataExportResponseDto): void {
    this.viewingExport = exp;
    this.pollResult    = null;
    this.pollError     = '';
    this.isPolling     = true;

    this.svc.getExportDownload(exp.exportId).subscribe({
      next: (res) => {
        this.isPolling  = false;
        this.pollResult = res.data;
      },
      error: (err: Error) => {
        this.isPolling = false;
        this.pollError = err.message;
      }
    });
  }

  closeViewModal(): void {
    this.viewingExport = null;
    this.pollResult    = null;
    this.pollError     = '';
  }

  openReportLink(): void {
    if (this.pollResult?.reportLink) {
      window.open(this.pollResult.reportLink, '_blank', 'noopener,noreferrer');
    }
  }

  // ── "Today" check — only today's exports show the View button ──────────
  isToday(timestamp: string): boolean {
    const d = new Date(timestamp);
    const n = new Date();
    return (
      d.getDate()     === n.getDate()     &&
      d.getMonth()    === n.getMonth()    &&
      d.getFullYear() === n.getFullYear()
    );
  }

  // ── Display helpers ───────────────────────────────────────────────────

  typeChipClass(type: string): string {
    return type.toLowerCase() === 'transaction' ? 'transaction' : 'budget';
  }

  formatChipClass(opt: string): string {
    return opt.toLowerCase();
  }

  typeIcon(type: string): string {
    return type === 'Transaction' ? '🧾' : '💰';
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN',
      { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateTime(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private setDefaultDates(): void {
    const today     = new Date();
    const firstDay  = new Date(today.getFullYear(), today.getMonth(), 1);
    this.form.fromDate = firstDay.toISOString().slice(0, 10);
    this.form.toDate   = today.toISOString().slice(0, 10);
  }

  private emptyForm(): ExportForm {
    return {
      accountId:     null,
      reportType:    '',
      reportOptions: '',
      fromDate:      '',
      toDate:        ''
    };
  }
}
