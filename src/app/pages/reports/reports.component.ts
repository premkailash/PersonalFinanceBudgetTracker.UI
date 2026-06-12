import { Component, OnInit, Input } from '@angular/core';
import { CommonModule }              from '@angular/common';
import { FormsModule }               from '@angular/forms';
import { ReportService }             from '../../services/report.service'
import {
  ReportFilter, ReportType, ChartType,
  ChartDataPoint, YearlyReportDto,
  MonthlyReportDto, CategoryBreakdownDto
} from '../../models/report.models';

// ── Palette for pie/bar category segments ─────────────────────────────────────
const PALETTE = [
  '#C9A84C','#3ECF8E','#F04F59','#4A90D9','#A78BFA',
  '#F59E0B','#10B981','#EF4444','#3B82F6','#8B5CF6',
  '#F97316','#06B6D4','#EC4899','#84CC16','#6366F1'
];

@Component({
  selector:    'app-reports',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './reports.component.html'
})
export class ReportsComponent implements OnInit {

  @Input() userId = 0;

  // ── Filter ────────────────────────────────────────────────────────────────
  filter: ReportFilter = {
    reportType: '',
    month:      '',
    year:       '',
    chartType:  ''
  };

  // ── Reference data for dropdowns ─────────────────────────────────────────
  readonly months = [
    { value: '01', label: 'January'   }, { value: '02', label: 'February'  },
    { value: '03', label: 'March'     }, { value: '04', label: 'April'     },
    { value: '05', label: 'May'       }, { value: '06', label: 'June'      },
    { value: '07', label: 'July'      }, { value: '08', label: 'August'    },
    { value: '09', label: 'September' }, { value: '10', label: 'October'   },
    { value: '11', label: 'November'  }, { value: '12', label: 'December'  }
  ];

  readonly chartTypes = [
    { value: 'bar',  label: '📊 Bar Chart'  },
    { value: 'line', label: '📈 Line Chart'  },
    { value: 'pie',  label: '🥧 Pie Chart'   }
  ];

  years: { value: string; label: string }[] = [];

  // ── State ─────────────────────────────────────────────────────────────────
  isLoading   = false;
  errorMsg    = '';
  hasResult   = false;

  // ── Raw API data ──────────────────────────────────────────────────────────
  monthlyData:   MonthlyReportDto[]    = [];
  yearlyData:    YearlyReportDto[]     = [];
  categoryData:  CategoryBreakdownDto[]= [];

  // ── Computed chart points ─────────────────────────────────────────────────
  chartPoints:   ChartDataPoint[]      = [];
  pieSegments:   { label: string; value: number; pct: number; offset: number; color: string }[] = [];
  maxBarValue    = 1;

  // ── SVG line chart paths ──────────────────────────────────────────────────
  linePathIncome  = '';
  linePathExpense = '';
  linePathNet     = '';
  lineXLabels:    { x: number; label: string }[] = [];
  lineYTicks:     { y: number; value: string  }[] = [];

  // Report display label
  reportLabel = '';

  constructor(private svc: ReportService) {}

  ngOnInit(): void {
    const now  = new Date().getFullYear();
    this.years = [
      { value: String(now - 1), label: String(now - 1) },
      { value: String(now),     label: String(now) + ' (Current)' }
    ];
    // Default year to current
    this.filter.year = String(now);
  }

  // ── Validation ────────────────────────────────────────────────────────────

  get needsMonth(): boolean {
    return this.filter.reportType === 'monthly' ||
           this.filter.reportType === 'category-breakdown';
  }

  get isFilterValid(): boolean {
    if (!this.filter.reportType || !this.filter.year || !this.filter.chartType) return false;
    if (this.needsMonth && !this.filter.month) return false;
    return true;
  }

  get validationMessage(): string {
    if (!this.filter.reportType) return 'Please select a report type.';
    if (!this.filter.year)       return 'Please select a year.';
    if (this.needsMonth && !this.filter.month) return 'Please select a month.';
    if (!this.filter.chartType)  return 'Please select a chart type.';
    return '';
  }

  // ── Get Report ────────────────────────────────────────────────────────────

  getReport(): void {
    if (!this.isFilterValid) return;

    this.isLoading  = true;
    this.errorMsg   = '';
    this.hasResult  = false;
    this.chartPoints = [];

    const month = `${this.filter.year}-${this.filter.month}`;
    const year  = this.filter.year;

    const monthLabel = this.months.find(m => m.value === this.filter.month)?.label ?? '';
    this.reportLabel =
      this.filter.reportType === 'monthly'            ? `Monthly Report — ${monthLabel} ${year}` :
      this.filter.reportType === 'yearly'             ? `Yearly Report — ${year}` :
      this.filter.reportType === 'category-breakdown' ? `Category Breakdown — ${monthLabel} ${year}` : '';

    if (this.filter.reportType === 'monthly') {
      this.svc.getMonthlyReport(month).subscribe({
        next:  d => this.handleMonthly(d),
        error: e => this.handleError(e)
      });
    } else if (this.filter.reportType === 'yearly') {
      this.svc.getYearlyReport(year).subscribe({
        next:  d => this.handleYearly(d),
        error: e => this.handleError(e)
      });
    } else if (this.filter.reportType === 'category-breakdown') {
      this.svc.getCategoryBreakdown(month).subscribe({
        next:  d => this.handleCategory(d),
        error: e => this.handleError(e)
      });
    }
  }

  // ── Data handlers ─────────────────────────────────────────────────────────

  private handleMonthly(data: MonthlyReportDto[]): void {
    this.monthlyData  = Array.isArray(data) ? data : [];
    this.isLoading    = false;
    this.hasResult    = true;

    this.chartPoints  = this.monthlyData.map((r, i) => ({
      label:   r.accountName,
      income:  r.totalIncome,
      expense: r.totalExpense,
      net:     r.netAmount,
      total:   r.totalIncome + r.totalExpense,
      color:   PALETTE[i % PALETTE.length]
    }));

    this.buildChartVisualisations();
  }

  private handleYearly(data: YearlyReportDto[]): void {
    this.yearlyData   = Array.isArray(data) ? data : [];
    this.isLoading    = false;
    this.hasResult    = true;

    this.chartPoints  = this.yearlyData.map((r, i) => ({
      label:   r.month,
      income:  r.totalIncome,
      expense: r.totalExpense,
      net:     r.netAmount,
      total:   r.totalIncome + r.totalExpense,
      color:   PALETTE[i % PALETTE.length]
    }));

    this.buildChartVisualisations();
  }

  private handleCategory(data: CategoryBreakdownDto[]): void {
    this.categoryData  = Array.isArray(data) ? data : [];
    this.isLoading     = false;
    this.hasResult     = true;

    this.chartPoints = this.categoryData.map((r, i) => ({
      label:   r.categoryName,
      income:  r.type === 'Income'  ? r.total : 0,
      expense: r.type === 'Expense' ? r.total : 0,
      net:     r.total,
      total:   r.total,
      color:   PALETTE[i % PALETTE.length]
    }));

    this.buildChartVisualisations();
  }

  private handleError(err: Error): void {
    this.isLoading = false;
    this.errorMsg  = err.message;
  }

  // ── Chart computation ─────────────────────────────────────────────────────

  private buildChartVisualisations(): void {
    if (!this.chartPoints.length) return;

    this.maxBarValue = Math.max(
      ...this.chartPoints.map(p => Math.max(p.income, p.expense, Math.abs(p.net))),
      1
    );

    if (this.filter.chartType === 'pie') {
      this.buildPieSegments();
    } else if (this.filter.chartType === 'line') {
      this.buildLinePaths();
    }
  }

  // ── Bar height (percentage of maxBarValue) ─────────────────────────────────
  barHeight(value: number, maxPx = 220): string {
    return Math.max(2, Math.round((Math.abs(value) / this.maxBarValue) * maxPx)) + 'px';
  }

  // ── Pie segments ───────────────────────────────────────────────────────────
  private buildPieSegments(): void {
    const total = this.chartPoints.reduce((s, p) => s + Math.max(p.total, 0), 0);
    if (total <= 0) { this.pieSegments = []; return; }

    let cumOffset = 0;
    this.pieSegments = this.chartPoints
      .filter(p => p.total > 0)
      .map(p => {
        const pct    = p.total / total;
        const offset = cumOffset;
        cumOffset   += pct * 100;
        return {
          label:  p.label,
          value:  p.total,
          pct:    Math.round(pct * 1000) / 10,
          offset,
          color:  p.color
        };
      });
  }

  // Converts a pie segment (percentage of full circle) to SVG arc path
  pieSlicePath(offset: number, pct: number, r = 80): string {
    const startAngle = (offset / 100) * 2 * Math.PI - Math.PI / 2;
    const endAngle   = ((offset + pct) / 100) * 2 * Math.PI - Math.PI / 2;
    const cx = 110; const cy = 110;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const large = pct > 50 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  // ── Line chart SVG paths ──────────────────────────────────────────────────
  private buildLinePaths(): void {
    const pts    = this.chartPoints;
    const w      = 600; const h = 220;
    const padL   = 60;  const padR = 20;
    const padT   = 20;  const padB = 40;
    const plotW  = w - padL - padR;
    const plotH  = h - padT - padB;

    // Find Y range across all series
    const allValues = pts.flatMap(p => [p.income, p.expense, p.net]);
    const yMax = Math.max(...allValues, 1);
    const yMin = Math.min(...allValues, 0);
    const yRange = yMax - yMin || 1;

    const xStep = pts.length > 1 ? plotW / (pts.length - 1) : plotW;
    const xOf   = (i: number) => padL + i * xStep;
    const yOf   = (v: number) => padT + plotH - ((v - yMin) / yRange) * plotH;

    const toPath = (values: number[]) =>
      values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`).join(' ');

    this.linePathIncome  = toPath(pts.map(p => p.income));
    this.linePathExpense = toPath(pts.map(p => p.expense));
    this.linePathNet     = toPath(pts.map(p => p.net));

    this.lineXLabels = pts.map((p, i) => ({
      x:     xOf(i),
      label: p.label.length > 8 ? p.label.slice(0, 8) + '…' : p.label
    }));

    // 5 Y ticks
    this.lineYTicks = [0, 1, 2, 3, 4].map(i => {
      const val = yMin + (yRange / 4) * i;
      return { y: yOf(val), value: this.formatAmount(val) };
    });
  }

  // ── Formatting ────────────────────────────────────────────────────────────
  formatCurrency(v: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0
    }).format(v);
  }

  formatAmount(v: number): string {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 100000) return sign + '₹' + (abs / 100000).toFixed(1) + 'L';
    if (abs >= 1000)   return sign + '₹' + (abs / 1000).toFixed(0) + 'K';
    return sign + '₹' + abs.toFixed(0);
  }

  // ── Totals for summary table ──────────────────────────────────────────────
  get totalIncome():  number { return this.chartPoints.reduce((s,p) => s + p.income,  0); }
  get totalExpense(): number { return this.chartPoints.reduce((s,p) => s + p.expense, 0); }
  get totalNet():     number { return this.totalIncome - this.totalExpense; }

  // ── Reduce helpers used directly in template expressions ─────────────────
  readonly totalFn    = (s: number, p: ChartDataPoint)          => s + p.total;
  readonly catTotalFn = (s: number, r: CategoryBreakdownDto)    => s + r.total;
  readonly catCountFn = (s: number, r: CategoryBreakdownDto)    => s + r.count;

  // ── Line chart viewport ───────────────────────────────────────────────────
  readonly lineViewBox = '0 0 600 220';
}
