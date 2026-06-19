import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { Router }            from '@angular/router';
import { AuthService }       from '../services/auth.service';
import { DashboardService }  from '../services/dashboard.service';
import { NotificationService } from '../services/notification.service';
import {
  MonthlyReportDto, CategoryBreakdownDto,
  SummaryCard, NotificationDto
} from '../models/dashboard.models';
import { AccountsComponent }       from '../pages/accounts/accounts.component';
import { SavingsGoalsComponent }   from '../pages/savings-goals/savings-goals.component';
import { BudgetsComponent }        from '../pages/budgets/budgets.component';
import { TransactionsComponent }   from '../pages/transactions/transactions.component';
import { NotificationsComponent }  from '../pages/notifications/notifications.component';
import { ReportsComponent }        from '../pages/reports/reports.component';

interface NavItem { label: string; icon: string; page: string; }

// ── Per-account view model ────────────────────────────────────────────────────
// Holds all dashboard widgets for one linked account so the template can
// *ngFor over accounts and render each independently.
export interface AccountDashboard {
  accountId:    number;
  accountName:  string;
  // Summary numbers
  totalIncome:  number;
  totalExpense: number;
  netAmount:    number;
  // Budget utilisation
  utilPct:      number;
  utilColor:    string;
  // Category charts
  topExpenses:  CategoryBreakdownDto[];
  topIncomes:   CategoryBreakdownDto[];
  maxExpense:   number;
  maxIncome:    number;
}

const USER_NAV: NavItem[] = [
  { label: 'Dashboard',      icon: '📊', page: 'dashboard'      },
  { label: 'Accounts',       icon: '🏦', page: 'accounts'       },
  { label: 'Savings Goals',  icon: '🎯', page: 'savings-goals'  },
  { label: 'Budgets',        icon: '💰', page: 'budgets'        },
  { label: 'Transactions',   icon: '🧾', page: 'transactions'   },
  { label: 'Reports',        icon: '📈', page: 'reports'        },
  { label: 'Data Export',    icon: '📤', page: 'data-export'    },
  { label: 'Notifications',  icon: '🔔', page: 'notifications'  },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard',           icon: '📊', page: 'dashboard'           },
  { label: 'Log Management',      icon: '📋', page: 'log-management'      },
  { label: 'Category Management', icon: '🏷️', page: 'category-management' },
  { label: 'User Management',     icon: '👥', page: 'user-management'     },
];

@Component({
  selector:    'app-dashboard',
  standalone:  true,
  imports:     [
    CommonModule,
    AccountsComponent,
    SavingsGoalsComponent,
    BudgetsComponent,
    TransactionsComponent,
    NotificationsComponent,
    ReportsComponent
  ],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {

  // ── session ───────────────────────────────────────────────────────────
  role        = '';
  userName    = '';
  userId      = 0;
  currentYear = new Date().getFullYear();

  // ── nav ───────────────────────────────────────────────────────────────
  activePage = 'dashboard';
  get navItems(): NavItem[] { return this.role === 'Admin' ? ADMIN_NAV : USER_NAV; }

  // ── raw API data ──────────────────────────────────────────────────────
  monthlyData:  MonthlyReportDto[]     = [];
  categoryData: CategoryBreakdownDto[] = [];

  // ── per-account dashboard panels (one entry per linked account) ───────
  accountDashboards: AccountDashboard[] = [];

  // ── cross-account totals for the summary cards ────────────────────────
  summaryCards: SummaryCard[] = [];

  // ── notifications ─────────────────────────────────────────────────────
  notifications: NotificationDto[] = [];
  unreadCount    = 0;
  showNotifPanel = false;

  // ── state ─────────────────────────────────────────────────────────────
  isLoading         = false;
  errorMsg          = '';
  currentMonth      = '';
  currentMonthLabel = '';

  constructor(
    private auth:     AuthService,
    private svc:      DashboardService,
    private notifSvc: NotificationService,
    private router:   Router
  ) {}

  ngOnInit(): void {
    const session = this.auth.getSession();
    if (!session) { this.router.navigate(['/login']); return; }

    this.role     = session.role;
    this.userId   = session.userId;
    this.userName = session.userName;

    const now          = new Date();
    const mm           = String(now.getMonth() + 1).padStart(2, '0');
    this.currentMonth  = now.getFullYear() + '-' + mm;
    this.currentMonthLabel = now.toLocaleDateString('en-IN',
      { month: 'long', year: 'numeric' });

    if (this.role === 'User') {
      this.loadUserDashboard();
      this.loadNotifications();
      this.notifSvc.unreadCount$.subscribe(count => { this.unreadCount = count; });
    }
  }

  // ── navigation ────────────────────────────────────────────────────────
  onPageChange(page: string): void {
    this.activePage = page;
    if (page === 'notifications') this.loadNotifications();
  }

  // ── notifications ─────────────────────────────────────────────────────
  loadNotifications(): void {
    this.notifSvc.getNotifications().subscribe({
      next:  (data) => { this.notifications = Array.isArray(data) ? data : []; },
      error: () => {}
    });
  }

  toggleNotifPanel(): void { this.showNotifPanel = !this.showNotifPanel; }
  closeNotifPanel():  void { this.showNotifPanel = false; }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  // ══════════════════════════════════════════════════════════════════════
  //  DASHBOARD LOADING
  // ══════════════════════════════════════════════════════════════════════

  loadUserDashboard(): void {
    this.isLoading = true;
    this.errorMsg  = '';

    // Fetch both in parallel; build panels once both arrive
    let monthlyDone   = false;
    let categoryDone  = false;
    const tryBuild    = () => {
      if (monthlyDone && categoryDone) {
        this.buildAllPanels();
        this.isLoading = false;
      }
    };

    this.svc.getMonthlyReport(this.currentMonth).subscribe({
      next: (data) => {
        this.monthlyData = Array.isArray(data) ? data : [];
        monthlyDone = true;
        tryBuild();
      },
      error: (err: Error) => {
        this.errorMsg  = err.message || 'Failed to load dashboard data.';
        this.isLoading = false;
      }
    });

    this.svc.getCategoryBreakdown(this.currentMonth).subscribe({
      next:  (data) => { this.categoryData = Array.isArray(data) ? data : []; categoryDone = true; tryBuild(); },
      error: () => { categoryDone = true; tryBuild(); }
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  //  PER-ACCOUNT PANEL BUILDER
  // The key change: instead of combining all accounts into one set of
  // charts, we derive one AccountDashboard per account so the template
  // can render them in separate, clearly labelled cards.
  // ══════════════════════════════════════════════════════════════════════

  private buildAllPanels(): void {
    this.buildSummaryCards();

    // Collect unique accounts from monthly data (preserves API ordering)
    const accountIds = [...new Set(this.monthlyData.map(r => r.accountId))];

    this.accountDashboards = accountIds.map(acctId => {
      const monthly = this.monthlyData.filter(r => r.accountId === acctId);

      // There will be one MonthlyReportDto per account from the API
      const row   = monthly[0];
      const inc   = row?.totalIncome  ?? 0;
      const exp   = row?.totalExpense ?? 0;
      const net   = row?.netAmount    ?? (inc - exp);
      const name  = row?.accountName  ?? `Account ${acctId}`;

      // Budget utilisation = expenses as % of income for this account
      const pct   = inc > 0 ? Math.min(100, Math.round((exp / inc) * 100)) : 0;

      // Category data scoped to this account
      const acctCats = this.categoryData.filter(c => c.accountId === acctId);

      const expenses = acctCats
        .filter(c => c.type === 'Expense')
        .sort((a, b) => b.total - a.total)
        .slice(0, 6);

      const incomes = acctCats
        .filter(c => c.type === 'Income')
        .sort((a, b) => b.total - a.total)
        .slice(0, 6);

      return {
        accountId:   acctId,
        accountName: name,
        totalIncome:  inc,
        totalExpense: exp,
        netAmount:    net,
        utilPct:      pct,
        utilColor:    this.pctColor(pct),
        topExpenses:  expenses,
        topIncomes:   incomes,
        maxExpense:   expenses.length ? expenses[0].total : 1,
        maxIncome:    incomes.length  ? incomes[0].total  : 1
      } as AccountDashboard;
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  //  SUMMARY CARDS — cross-account totals (unchanged behaviour)
  // ══════════════════════════════════════════════════════════════════════

  private buildSummaryCards(): void {
    const inc  = this.monthlyData.reduce((s, r) => s + r.totalIncome,  0);
    const exp  = this.monthlyData.reduce((s, r) => s + r.totalExpense, 0);
    const net  = inc - exp;
    const rate = inc > 0 ? Math.round((net / inc) * 100) : 0;

    this.summaryCards = [
      { label: 'Total Income',     value: this.formatCurrency(inc),
        subtext: this.currentMonthLabel, trend: 'up', icon: '💹', color: 'green' },
      { label: 'Total Expenses',   value: this.formatCurrency(exp),
        subtext: this.currentMonthLabel,
        trend: exp > inc ? 'down' : 'neutral', icon: '💸', color: 'red' },
      { label: 'Net Savings',      value: this.formatCurrency(net),
        subtext: rate + '% savings rate',
        trend: net >= 0 ? 'up' : 'down', icon: '🏦',
        color: net >= 0 ? 'gold' : 'red' },
      { label: 'Accounts Tracked', value: String(this.monthlyData.length),
        subtext: 'active this month', icon: '📊', color: 'blue' }
    ];
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private pctColor(pct: number): string {
    if (pct >= 90) return 'var(--clr-error)';
    if (pct >= 70) return 'var(--clr-warning)';
    return 'var(--clr-success)';
  }

  barWidth(amount: number, max: number): string {
    if (max <= 0) return '0%';
    return Math.round((amount / max) * 100) + '%';
  }

  formatCurrency(v: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0
    }).format(v);
  }

  formatAmount(v: number): string {
    const abs  = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 100000) return sign + '₹' + (abs / 100000).toFixed(1) + 'L';
    if (abs >= 1000)   return sign + '₹' + (abs / 1000).toFixed(1) + 'K';
    return sign + '₹' + abs.toFixed(0);
  }

  onLogout(): void {
    this.auth.logout().subscribe({
      next:  () => { this.auth.clearSession(); this.router.navigate(['/login']); },
      error: () => { this.auth.clearSession(); this.router.navigate(['/login']); }
    });
  }
}