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

  // ── data ──────────────────────────────────────────────────────────────
  monthlyData:  MonthlyReportDto[]     = [];
  categoryData: CategoryBreakdownDto[] = [];;
  summaryCards: SummaryCard[]          = [];
  topExpenses:  CategoryBreakdownDto[] = [];
  topIncomes:   CategoryBreakdownDto[] = [];
  maxExpense    = 1;
  maxIncome     = 1;

  // ── notifications — now driven by NotificationService BehaviorSubject ─
  // The unreadCount is kept in sync with the Notifications page via the
  // shared NotificationService.unreadCount$ observable.
  notifications:  NotificationDto[] = [];
  unreadCount     = 0;
  showNotifPanel  = false;

  // ── state ─────────────────────────────────────────────────────────────
  isLoading          = false;
  errorMsg           = '';
  currentMonth       = '';
  currentMonthLabel  = '';

  constructor(
    private auth:       AuthService,
    private svc:        DashboardService,
    private notifSvc:   NotificationService,
    private router:     Router
  ) {}

  ngOnInit(): void {
    const session = this.auth.getSession();
    if (!session) { this.router.navigate(['/login']); return; }

    this.role     = session.role;
    this.userId   = session.userId;
    this.userName = localStorage.getItem('fa_username') || ('User #' + session.userId);

    const now         = new Date();
    const mm          = String(now.getMonth() + 1).padStart(2, '0');
    this.currentMonth = now.getFullYear() + '-' + mm;
    this.currentMonthLabel = now.toLocaleDateString('en-IN',
      { month: 'long', year: 'numeric' });

    if (this.role === 'User') {
      this.loadUserDashboard();
      this.loadNotifications();

      // Subscribe to shared unread count so header bell stays in sync
      // with any mark-as-read / delete actions done on the Notifications page
      this.notifSvc.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      });
    }
  }

  // ── navigation ────────────────────────────────────────────────────────
  onPageChange(page: string): void {
    this.activePage = page;
    // Reload notifications when the user navigates to the notifications page
    // so the bell count and the page list are always in sync
    if (page === 'notifications') {
      this.loadNotifications();
    }
  }

  // ── notifications ─────────────────────────────────────────────────────
  loadNotifications(): void {
    this.notifSvc.getNotifications().subscribe({
      next: (data) => {
        this.notifications = Array.isArray(data) ? data : [];
        // unreadCount is updated automatically via the BehaviorSubject tap()
      },
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

  // ── user dashboard ────────────────────────────────────────────────────
  loadUserDashboard(): void {
    this.isLoading = true;
    this.errorMsg  = '';

    this.svc.getMonthlyReport(this.currentMonth).subscribe({
      next: (data) => {
        this.monthlyData = Array.isArray(data) ? data : [];
        this.buildSummaryCards();
        this.isLoading = false;
      },
      error: (err: Error) => {
        this.errorMsg  = err.message || 'Failed to load dashboard data.';
        this.isLoading = false;
      }
    });

    this.svc.getCategoryBreakdown(this.currentMonth).subscribe({
      next: (data) => {
        this.categoryData = Array.isArray(data) ? data : [];
        this.buildCategoryCharts();
      },
      error: () => {}
    });
  }

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

  private buildCategoryCharts(): void {
    const exp = this.categoryData
      .filter(c => c.type === 'Expense').sort((a,b) => b.total - a.total).slice(0, 6);
    const inc = this.categoryData
      .filter(c => c.type === 'Income').sort((a,b) => b.total - a.total).slice(0, 6);

    this.topExpenses = exp;
    this.topIncomes  = inc;
    this.maxExpense  = exp.length ? exp[0].total : 1;
    this.maxIncome   = inc.length ? inc[0].total : 1;
  }

  get budgetUtilizationPct(): number {
    const exp = this.monthlyData.reduce((s, r) => s + r.totalExpense, 0);
    const inc = this.monthlyData.reduce((s, r) => s + r.totalIncome,  0);
    if (inc <= 0) return 0;
    return Math.min(100, Math.round((exp / inc) * 100));
  }

  get utilizationColor(): string {
    const p = this.budgetUtilizationPct;
    if (p >= 90) return 'var(--clr-error)';
    if (p >= 70) return 'var(--clr-warning)';
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
    if (v >= 100000) return '₹' + (v / 100000).toFixed(1) + 'L';
    if (v >= 1000)   return '₹' + (v / 1000).toFixed(1) + 'K';
    return '₹' + v.toFixed(0);
  }

  onLogout(): void {
    this.auth.logout().subscribe({
      next:  () => { this.auth.clearSession(); this.router.navigate(['/login']); },
      error: () => { this.auth.clearSession(); this.router.navigate(['/login']); }
    });
  }
}
