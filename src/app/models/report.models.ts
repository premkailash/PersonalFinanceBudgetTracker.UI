import { MonthlyReportDto, CategoryBreakdownDto } from './dashboard.models';

// ── Yearly report ─────────────────────────────────────────────────────────────
export interface YearlyReportDto {
  month:        string;   // "January", "February", etc. or "YYYY-MM"
  totalIncome:  number;
  totalExpense: number;
  netAmount:    number;
}

// ── Report type ───────────────────────────────────────────────────────────────
export type ReportType = 'monthly' | 'yearly' | 'category-breakdown' | '';

// ── Chart type ────────────────────────────────────────────────────────────────
export type ChartType = 'bar' | 'pie' | 'line' | '';

// ── Filter model (bound to form controls) ─────────────────────────────────────
export interface ReportFilter {
  reportType: ReportType;
  month:      string;     // '01'–'12'
  year:       string;     // 'YYYY'
  chartType:  ChartType;
}

// ── Chart data point ──────────────────────────────────────────────────────────
export interface ChartDataPoint {
  label:   string;
  income:  number;
  expense: number;
  net:     number;
  total:   number;   // for category breakdown: total spend/income for the slice
  color:   string;   // for pie segments
}

// Re-export for convenience
export { MonthlyReportDto, CategoryBreakdownDto };
